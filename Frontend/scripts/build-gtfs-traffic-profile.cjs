const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(FRONTEND_ROOT, '..');

const DEFAULT_SUMMARY_PATH = path.resolve(
  PROJECT_ROOT,
  'Backend',
  'experiments',
  'results',
  'gtfs_summary_latest.json'
);
const DEFAULT_OUT_PATH = path.resolve(
  FRONTEND_ROOT,
  'experiments',
  'results',
  'gtfs_traffic_profile_latest.json'
);
const DEFAULT_PUBLIC_OUT_PATH = path.resolve(
  FRONTEND_ROOT,
  'public',
  'data',
  'gtfs_traffic_profile_latest.json'
);

function parseArgs(argv) {
  const args = {
    summary: DEFAULT_SUMMARY_PATH,
    out: DEFAULT_OUT_PATH,
    publicOut: DEFAULT_PUBLIC_OUT_PATH,
    simSecondsPerHour: 30,
    ambulanceWeight: 0.05,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === '--summary' && next) {
      args.summary = path.isAbsolute(next) ? next : path.resolve(PROJECT_ROOT, next);
      i += 1;
    } else if (token === '--out' && next) {
      args.out = path.isAbsolute(next) ? next : path.resolve(PROJECT_ROOT, next);
      i += 1;
    } else if (token === '--public-out' && next) {
      args.publicOut = path.isAbsolute(next) ? next : path.resolve(PROJECT_ROOT, next);
      i += 1;
    } else if (token === '--sim-seconds-per-hour' && next) {
      args.simSecondsPerHour = Number(next);
      i += 1;
    } else if (token === '--ambulance-weight' && next) {
      args.ambulanceWeight = Number(next);
      i += 1;
    }
  }

  return args;
}

function normalizeDeparturesByHour(rawMap) {
  const result = {};
  for (let h = 0; h < 24; h++) {
    const value = Number(rawMap?.[String(h)] ?? 0);
    result[String(h)] = Number.isFinite(value) && value >= 0 ? value : 0;
  }
  return result;
}

function inferBusWeight(summary) {
  const routeTypes = summary?.route_types || {};
  const totalRoutes = Object.values(routeTypes).reduce((acc, value) => {
    const n = Number(value);
    return acc + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  if (totalRoutes <= 0) {
    return 0.15;
  }

  const busRoutes = Number(routeTypes['3'] || 0);
  const busRatio = busRoutes / totalRoutes;

  // Clamp to keep simulation stable and realistic in this mixed traffic model.
  return Math.max(0.08, Math.min(0.35, 0.08 + busRatio * 0.27));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.summary)) {
    throw new Error(`Resumo GTFS não encontrado: ${args.summary}`);
  }

  const summary = JSON.parse(fs.readFileSync(args.summary, 'utf8'));
  if (!summary?.ok) {
    throw new Error('Resumo GTFS inválido ou com ok=false. Gere primeiro com o validador GTFS.');
  }

  const departuresByHour = normalizeDeparturesByHour(summary.departures_by_hour);
  const busWeight = inferBusWeight(summary);
  const ambulanceWeight = Number.isFinite(args.ambulanceWeight)
    ? Math.max(0.01, Math.min(0.20, args.ambulanceWeight))
    : 0.05;
  const carWeight = Math.max(0.01, 1 - busWeight - ambulanceWeight);
  const totalWeight = carWeight + busWeight + ambulanceWeight;

  const profile = {
    generated_at: new Date().toISOString(),
    source: {
      type: 'gtfs_summary',
      path: args.summary,
      service_date: summary.date || null,
    },
    sim_seconds_per_hour: Number.isFinite(args.simSecondsPerHour) && args.simSecondsPerHour > 0
      ? args.simSecondsPerHour
      : 30,
    min_flow_factor: 0.45,
    max_flow_factor: 2.6,
    departures_by_hour: departuresByHour,
    vehicle_mix: {
      car: carWeight / totalWeight,
      bus: busWeight / totalWeight,
      ambulance: ambulanceWeight / totalWeight,
    },
    notes: [
      'departures_by_hour vem de stop_times no stop_sequence=1 para serviços ativos',
      'vehicle_mix é inferido por route_type e normalizado para o simulador UrbanFlow',
    ],
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(profile, null, 2), 'utf8');

  if (args.publicOut) {
    fs.mkdirSync(path.dirname(args.publicOut), { recursive: true });
    fs.writeFileSync(args.publicOut, JSON.stringify(profile, null, 2), 'utf8');
  }

  console.log('[gtfs-profile] Perfil criado:', args.out);
  if (args.publicOut) {
    console.log('[gtfs-profile] Cópia pública:', args.publicOut);
  }
  console.log('[gtfs-profile] vehicle_mix:', profile.vehicle_mix);
}

main();
