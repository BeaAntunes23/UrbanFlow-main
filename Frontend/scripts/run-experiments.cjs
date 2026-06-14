const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.resolve(FRONTEND_ROOT, 'experiments', 'results');

const DEFAULTS = {
  repetitions: 30,
  duration: 300,
  dt: 0.2,
  speed: 1,
  gridSize: 6,
  seedBase: 20260301,
  gtfsProfilePath: '',
};

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
const MODES = ['traditional', 'ai'];

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
    } else if (token === '--speed' && next) {
      args.speed = Number(next);
      i += 1;
    } else if (token === '--grid' && next) {
      args.gridSize = Number(next);
      i += 1;
    } else if (token === '--seed-base' && next) {
      args.seedBase = Number(next);
      i += 1;
    } else if (token === '--gtfs-profile' && next) {
      args.gtfsProfilePath = next;
      i += 1;
    }
  }
  return args;
}

function loadGtfsProfile(profilePath) {
  if (!profilePath) return null;
  const absolutePath = path.isAbsolute(profilePath)
    ? profilePath
    : path.resolve(FRONTEND_ROOT, profilePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Ficheiro GTFS profile não encontrado: ${absolutePath}`);
  }

  const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  if (!payload || typeof payload !== 'object') {
    throw new Error('GTFS profile inválido: esperado objeto JSON');
  }
  return payload;
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

function toCsv(rows, columns) {
  const lines = [columns.join(',')];
  for (const row of rows) {
    const line = columns
      .map((column) => {
        const value = row[column] ?? '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

function runSingleExperiment(SimulationEngine, params) {
  const { scenario, mode, duration, dt, speed, gridSize, seed, gtfsProfile } = params;
  const random = mulberry32(seed);
  const originalRandom = Math.random;
  Math.random = random;

  try {
    const engine = new SimulationEngine(gridSize);
    if (gtfsProfile) {
      engine.setTrafficProfile(gtfsProfile);
    }
    engine.setScenario(scenario);
    engine.setMode(mode);
    engine.setSpeed(speed);
    engine.start();

    const steps = Math.floor(duration / dt);
    for (let i = 0; i < steps; i++) {
      engine.tick(dt);
    }

    const metrics = engine.getMetrics();
    return {
      timestamp: new Date().toISOString(),
      scenario,
      mode,
      seed,
      repetitions_duration_seconds: duration,
      dt,
      speed,
      grid_size: gridSize,
      avg_wait_time: metrics.avgWaitTime,
      flow_rate: metrics.flowRate,
      co2_emissions: metrics.co2Emissions,
      emergency_response_time: metrics.emergencyResponseTime,
      total_collisions: metrics.totalCollisions,
      collision_avoided: metrics.collisionAvoided,
      light_avg_wait_time: metrics.lightAvgWaitTime,
      heavy_avg_wait_time: metrics.heavyAvgWaitTime,
      light_completed: metrics.lightVehiclesCompleted,
      heavy_completed: metrics.heavyVehiclesCompleted,
      vehicles_active: metrics.vehiclesActive,
      vehicles_completed: metrics.vehiclesCompleted,
      simulation_time: metrics.simulationTime,
    };
  } finally {
    Math.random = originalRandom;
  }
}

async function runCampaign(config) {
  const SimulationEngine = await loadSimulationEngine();
  const rows = [];
  const gtfsProfile = loadGtfsProfile(config.gtfsProfilePath);

  SCENARIOS.forEach((scenario, scenarioIndex) => {
    for (let repetition = 1; repetition <= config.repetitions; repetition++) {
      const pairedSeed = config.seedBase + scenarioIndex * 100000 + repetition * 97;
      const pairId = `${scenario}_rep_${repetition}`;

      for (const mode of MODES) {
        const result = runSingleExperiment(SimulationEngine, {
          scenario,
          mode,
          duration: config.duration,
          dt: config.dt,
          speed: config.speed,
          gridSize: config.gridSize,
          seed: pairedSeed,
          gtfsProfile,
        });

        rows.push({
          campaign_id: '',
          pair_id: pairId,
          repetition,
          ...result,
        });
      }
    }
  });

  return rows;
}

function ensureDirectories() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function writeOutputs(rows, config) {
  ensureDirectories();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const campaignId = `campaign_${stamp}`;
  const csvFile = path.resolve(RESULTS_DIR, `campaign_${stamp}.csv`);
  const jsonFile = path.resolve(RESULTS_DIR, `campaign_${stamp}.json`);
  const latestCsv = path.resolve(RESULTS_DIR, 'latest.csv');
  const latestJson = path.resolve(RESULTS_DIR, 'latest.json');

  const rowsWithCampaign = rows.map((row) => ({
    ...row,
    campaign_id: campaignId,
  }));

  const columns = [
    'campaign_id',
    'pair_id',
    'repetition',
    'timestamp',
    'scenario',
    'mode',
    'seed',
    'repetitions_duration_seconds',
    'dt',
    'speed',
    'grid_size',
    'avg_wait_time',
    'flow_rate',
    'co2_emissions',
    'emergency_response_time',
    'total_collisions',
    'collision_avoided',
    'light_avg_wait_time',
    'heavy_avg_wait_time',
    'light_completed',
    'heavy_completed',
    'vehicles_active',
    'vehicles_completed',
    'simulation_time',
  ];

  const csvText = toCsv(rowsWithCampaign, columns);
  const totalPairs = SCENARIOS.length * config.repetitions;
  const payload = {
    campaign_id: campaignId,
    generated_at: new Date().toISOString(),
    config,
    gtfs_profile_applied: Boolean(config.gtfsProfilePath),
    experiment_design: {
      paired_comparison: true,
      pair_definition: 'same scenario + same repetition + same seed for both modes',
      random_generator: 'mulberry32',
      total_pairs: totalPairs,
      total_runs: rowsWithCampaign.length,
      expected_runs_per_mode: totalPairs,
    },
    scenarios: SCENARIOS,
    modes: MODES,
    rows: rowsWithCampaign,
  };

  fs.writeFileSync(csvFile, csvText, 'utf8');
  fs.writeFileSync(jsonFile, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(latestCsv, csvText, 'utf8');
  fs.writeFileSync(latestJson, JSON.stringify(payload, null, 2), 'utf8');

  return { csvFile, jsonFile, latestCsv, latestJson, campaignId, totalPairs };
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  if (
    config.repetitions <= 0 ||
    config.duration <= 0 ||
    config.dt <= 0 ||
    config.gridSize < 2 ||
    !Number.isFinite(config.seedBase)
  ) {
    throw new Error('Parâmetros inválidos. Verifica --repetitions, --duration, --dt, --grid e --seed-base.');
  }

  console.log('[experiment] Configuração:', config);
  const rows = await runCampaign(config);
  const files = writeOutputs(rows, config);

  console.log(`[experiment] Campanha: ${files.campaignId}`);
  console.log(`[experiment] Pares cenário-repetição: ${files.totalPairs}`);
  console.log(`[experiment] Corridas executadas: ${rows.length}`);
  console.log(`[experiment] CSV: ${files.csvFile}`);
  console.log(`[experiment] JSON: ${files.jsonFile}`);
  console.log(`[experiment] latest.csv: ${files.latestCsv}`);
}

main().catch(err => {
  console.error('[experiment] Erro:', err);
  process.exit(1);
});
