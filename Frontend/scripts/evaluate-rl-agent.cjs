const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.resolve(FRONTEND_ROOT, 'experiments', 'results');
const POLICY_FILE = path.resolve(RESULTS_DIR, 'rl_policy_latest.json');

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
const MODES = ['traditional', 'ai', 'rl'];

const DEFAULTS = {
  repetitions: 10,
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

function runSingle(SimulationEngine, config, mode, scenario, repetition, seed, policyPayload) {
  const originalRandom = Math.random;
  Math.random = mulberry32(seed);

  try {
    const engine = new SimulationEngine(config.gridSize);
    if (mode === 'rl' && policyPayload?.policy) {
      engine.loadRLPolicy(policyPayload.policy);
      engine.setRLTraining(false);
    }

    engine.setScenario(scenario);
    engine.setMode(mode);
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

  const metrics = [
    'avg_wait_time',
    'flow_rate',
    'co2_emissions',
    'emergency_response_time',
    'total_collisions',
    'collision_avoided',
    'vehicles_completed',
  ];

  const summary = [];
  for (const [key, groupRows] of grouped.entries()) {
    const [scenario, mode] = key.split('|');
    const row = { scenario, mode, n: groupRows.length };
    for (const metric of metrics) {
      const values = groupRows.map((item) => Number(item[metric] || 0));
      const mean = values.reduce((acc, value) => acc + value, 0) / Math.max(values.length, 1);
      row[`${metric}_mean`] = Number(mean.toFixed(4));
    }
    summary.push(row);
  }

  return summary.sort((a, b) => `${a.scenario}${a.mode}`.localeCompare(`${b.scenario}${b.mode}`));
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  if (config.repetitions <= 0 || config.duration <= 0 || config.dt <= 0 || config.gridSize < 2) {
    throw new Error('Parâmetros inválidos para avaliação RL.');
  }

  ensureDir(RESULTS_DIR);
  const startedAt = Date.now();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvFile = path.resolve(RESULTS_DIR, `rl_evaluation_${stamp}.csv`);
  const latestCsv = path.resolve(RESULTS_DIR, 'rl_evaluation_latest.csv');
  const summaryJson = path.resolve(RESULTS_DIR, 'rl_evaluation_summary_latest.json');

  const policyPayload = fs.existsSync(POLICY_FILE)
    ? JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'))
    : null;

  const SimulationEngine = await loadSimulationEngine();
  const rows = [];

  SCENARIOS.forEach((scenario, scenarioIndex) => {
    for (let repetition = 1; repetition <= config.repetitions; repetition++) {
      const pairedSeed = config.seedBase + scenarioIndex * 100000 + repetition * 97;
      for (const mode of MODES) {
        rows.push(
          runSingle(SimulationEngine, config, mode, scenario, repetition, pairedSeed, policyPayload)
        );
      }
    }
  });

  const summary = summarize(rows);
  const endedAt = Date.now();
  const runtimeSeconds = Number(((endedAt - startedAt) / 1000).toFixed(3));
  const csv = toCsv(rows);
  fs.writeFileSync(csvFile, csv, 'utf8');
  fs.writeFileSync(latestCsv, csv, 'utf8');
  fs.writeFileSync(
    summaryJson,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        config,
        compute_cost: {
          runtime_seconds: runtimeSeconds,
          total_runs: rows.length,
          average_seconds_per_run: Number((runtimeSeconds / Math.max(rows.length, 1)).toFixed(6)),
        },
        summary,
      },
      null,
      2,
    ),
    'utf8'
  );

  console.log(`[rl-eval] corridas: ${rows.length}`);
  console.log(`[rl-eval] runtime(s): ${runtimeSeconds}`);
  console.log(`[rl-eval] csv: ${csvFile}`);
  console.log(`[rl-eval] summary: ${summaryJson}`);
}

main().catch(err => {
  console.error('[rl:eval] Erro:', err);
  process.exit(1);
});
