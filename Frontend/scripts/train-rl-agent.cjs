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

const DEFAULTS = {
  episodes: 120,
  duration: 240,
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
    if (token === '--episodes' && next) {
      args.episodes = Number(next);
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

async function train(config) {
  const SimulationEngine = await loadSimulationEngine();
  const engine = new SimulationEngine(config.gridSize);
  engine.setMode('rl');
  engine.setRLTraining(true);
  engine.setSpeed(config.speed);

  const history = [];
  const steps = Math.floor(config.duration / config.dt);

  for (let episode = 1; episode <= config.episodes; episode++) {
    const scenario = SCENARIOS[(episode - 1) % SCENARIOS.length];
    const seed = config.seedBase + episode * 137;
    const originalRandom = Math.random;
    Math.random = mulberry32(seed);

    try {
      engine.setScenario(scenario);
      engine.setMode('rl');
      engine.setSpeed(config.speed);
      engine.start();

      for (let i = 0; i < steps; i++) {
        engine.tick(config.dt);
      }

      const metrics = engine.getMetrics();
      const diag = engine.getRLDiagnostics();
      history.push({
        episode,
        scenario,
        seed,
        avg_wait_time: metrics.avgWaitTime,
        flow_rate: metrics.flowRate,
        co2_emissions: metrics.co2Emissions,
        emergency_response_time: metrics.emergencyResponseTime,
        total_collisions: metrics.totalCollisions,
        collision_avoided: metrics.collisionAvoided,
        q_states: diag.qStates,
        epsilon: diag.epsilon,
      });
    } finally {
      Math.random = originalRandom;
    }
  }

  engine.setRLTraining(false);
  return { policy: engine.exportRLPolicy(), history };
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

async function main() {
  const config = parseArgs(process.argv.slice(2));
  if (config.episodes <= 0 || config.duration <= 0 || config.dt <= 0 || config.gridSize < 2) {
    throw new Error('Parâmetros inválidos para treino RL.');
  }

  ensureDir(RESULTS_DIR);
  const startedAt = Date.now();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const policyFile = path.resolve(RESULTS_DIR, 'rl_policy_latest.json');
  const policyArchive = path.resolve(RESULTS_DIR, `rl_policy_${stamp}.json`);
  const historyCsv = path.resolve(RESULTS_DIR, 'rl_training_history_latest.csv');

  const { policy, history } = await train(config);
  const endedAt = Date.now();
  const runtimeSeconds = Number(((endedAt - startedAt) / 1000).toFixed(3));
  const avgEpisodeSeconds = Number((runtimeSeconds / Math.max(config.episodes, 1)).toFixed(4));

  const payload = {
    generated_at: new Date().toISOString(),
    config,
    compute_cost: {
      runtime_seconds: runtimeSeconds,
      episodes: config.episodes,
      average_seconds_per_episode: avgEpisodeSeconds,
    },
    diagnostics: {
      q_states: Object.keys(policy.qTable || {}).length,
      actions: policy.actions,
      epsilon: policy.epsilon,
    },
    policy,
  };

  fs.writeFileSync(policyFile, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(policyArchive, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(historyCsv, toCsv(history), 'utf8');

  console.log(`[rl-train] episódios: ${config.episodes}`);
  console.log(`[rl-train] runtime(s): ${runtimeSeconds}`);
  console.log(`[rl-train] q_states: ${payload.diagnostics.q_states}`);
  console.log(`[rl-train] policy: ${policyFile}`);
  console.log(`[rl-train] history: ${historyCsv}`);
}

main().catch(err => {
  console.error('[rl:train] Erro:', err);
  process.exit(1);
});
