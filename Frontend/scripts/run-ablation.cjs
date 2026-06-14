const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.resolve(FRONTEND_ROOT, 'experiments', 'results');

const SCENARIOS = [
  'normal',
  'rush_hour',
  'accident',
  'emergency',
  'vila_real',
  'portugal',
  'portugal_litoral',
  'portugal_interior',
  'portugal_sul',
];
const MODES = ['traditional', 'ai_full', 'ai_no_adaptive', 'ai_no_preemption', 'ai_no_rules'];

const DEFAULTS = {
  repetitions: 15,
  duration: 180,
  dt: 0.2,
  gridSize: 6,
  speed: 1,
  seedBase: 20260301,
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === '--repetitions' && next) {
      args.repetitions = Number(next);
      i += 1;
    } else if (token === '--duration' && next) {
      args.duration = Number(next);
      i += 1;
    } else if (token === '--dt' && next) {
      args.dt = Number(next);
      i += 1;
    } else if (token === '--grid' && next) {
      args.gridSize = Number(next);
      i += 1;
    } else if (token === '--speed' && next) {
      args.speed = Number(next);
      i += 1;
    } else if (token === '--seed-base' && next) {
      args.seedBase = Number(next);
      i += 1;
    }
  }
  return args;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6D2B79F5;
    let value = Math.imul(t ^ (t >>> 15), 1 | t);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

async function loadSimulationEngine() {
  const { SimulationEngine } = await import('./load-engine.mjs');
  return SimulationEngine;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toCsv(rows) {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => row[column]).join(','));
  }
  return lines.join('\n');
}

function applyModeConfiguration(engine, mode) {
  if (mode === 'traditional') {
    engine.setMode('traditional');
    return;
  }

  engine.setMode('ai');
  if (typeof engine.setAIFeatures === 'function') {
    if (mode === 'ai_full') {
      engine.setAIFeatures({ adaptiveTiming: true, emergencyPreemption: true, ruleOverrides: true });
    } else if (mode === 'ai_no_adaptive') {
      engine.setAIFeatures({ adaptiveTiming: false, emergencyPreemption: true, ruleOverrides: true });
    } else if (mode === 'ai_no_preemption') {
      engine.setAIFeatures({ adaptiveTiming: true, emergencyPreemption: false, ruleOverrides: true });
    } else if (mode === 'ai_no_rules') {
      engine.setAIFeatures({ adaptiveTiming: true, emergencyPreemption: true, ruleOverrides: false });
    }
  }
}

function runSingle(SimulationEngine, config, scenario, mode, repetition, seed) {
  const originalRandom = Math.random;
  Math.random = mulberry32(seed);

  try {
    const engine = new SimulationEngine(config.gridSize);
    engine.setScenario(scenario);
    applyModeConfiguration(engine, mode);
    engine.setSpeed(config.speed);
    engine.start();

    const steps = Math.floor(config.duration / config.dt);
    for (let i = 0; i < steps; i++) {
      engine.tick(config.dt);
    }

    const metrics = engine.getMetrics();
    return {
      timestamp: new Date().toISOString(),
      scenario,
      mode,
      repetition,
      seed,
      avg_wait_time: metrics.avgWaitTime,
      flow_rate: metrics.flowRate,
      co2_emissions: metrics.co2Emissions,
      emergency_response_time: metrics.emergencyResponseTime,
      total_collisions: metrics.totalCollisions,
      collision_avoided: metrics.collisionAvoided,
      vehicles_completed: metrics.vehiclesCompleted,
    };
  } finally {
    Math.random = originalRandom;
  }
}

function summarize(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.scenario}|${row.mode}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  const summary = [];
  for (const [key, bucket] of grouped.entries()) {
    const [scenario, mode] = key.split('|');
    const mean = (field) => bucket.reduce((acc, row) => acc + Number(row[field] || 0), 0) / Math.max(bucket.length, 1);
    summary.push({
      scenario,
      mode,
      n: bucket.length,
      avg_wait_time_mean: Number(mean('avg_wait_time').toFixed(4)),
      flow_rate_mean: Number(mean('flow_rate').toFixed(4)),
      co2_emissions_mean: Number(mean('co2_emissions').toFixed(4)),
      emergency_response_time_mean: Number(mean('emergency_response_time').toFixed(4)),
      total_collisions_mean: Number(mean('total_collisions').toFixed(4)),
      vehicles_completed_mean: Number(mean('vehicles_completed').toFixed(4)),
    });
  }

  return summary.sort((a, b) => `${a.scenario}|${a.mode}`.localeCompare(`${b.scenario}|${b.mode}`));
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  if (config.repetitions <= 0 || config.duration <= 0 || config.dt <= 0 || config.gridSize < 2) {
    throw new Error('Parâmetros inválidos para estudo de ablação.');
  }

  ensureDir(RESULTS_DIR);
  const SimulationEngine = await loadSimulationEngine();
  const rows = [];

  SCENARIOS.forEach((scenario, scenarioIndex) => {
    for (let repetition = 1; repetition <= config.repetitions; repetition++) {
      const baseSeed = config.seedBase + scenarioIndex * 100000 + repetition * 97;
      for (const mode of MODES) {
        rows.push(runSingle(SimulationEngine, config, scenario, mode, repetition, baseSeed));
      }
    }
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvFile = path.resolve(RESULTS_DIR, `ablation_${stamp}.csv`);
  const summaryFile = path.resolve(RESULTS_DIR, 'ablation_summary_latest.json');

  fs.writeFileSync(csvFile, toCsv(rows), 'utf8');
  fs.writeFileSync(summaryFile, JSON.stringify({ generated_at: new Date().toISOString(), config, summary: summarize(rows) }, null, 2), 'utf8');

  console.log(`[ablation] rows: ${rows.length}`);
  console.log(`[ablation] csv: ${csvFile}`);
  console.log(`[ablation] summary: ${summaryFile}`);
}

main().catch((error) => {
  console.error('[ablation] error:', error);
  process.exit(1);
});
