"// UrbanFlow AI - Simulation Engine"
// Pure JavaScript class - no React dependencies
import { SeededRandom } from './src/utils/seededRandom.js';

// CO2 emission factors based on real EU standards (EURO 6 / EEA):
// Car: 120 g/km (EURO 6 average) | Bus: 820 g/km (EU urban bus) | Ambulance: 250 g/km (heavy van)
const VEHICLE_CONFIGS = {
  car:       { speed: 1.8, width: 10, height: 6, co2: 0.120 },  // 120 g CO2/km (EURO 6)
  bus:       { speed: 1.2, width: 16, height: 8, co2: 0.820 },  // 820 g CO2/km (EU bus average)
  ambulance: { speed: 2.8, width: 12, height: 7, co2: 0.250 },  // 250 g CO2/km (heavy van)
};

const VEHICLE_COLORS = {
  car: ['#60a5fa', '#818cf8', '#a78bfa', '#67e8f9', '#86efac', '#c084fc'],
  bus: ['#fbbf24', '#f59e0b', '#d97706'],
  ambulance: ['#ef4444']
};

const PED_COLORS = ['#f472b6', '#fb923c', '#a3e635', '#22d3ee', '#e879f9', '#d4d4d8'];
const PED_SPEED = 0.18;  // progress units per second (crossing takes ~5.5s)

const SCENARIOS = {
  normal: {
    spawnInterval: 2.2,
    typeWeights: { car: 0.85, bus: 0.10, ambulance: 0.05 },
    blockedIntersections: [],
    pedSpawnInterval: 4.0,
    name: 'Fluxo Normal'
  },
  rush_hour: {
    spawnInterval: 0.5,
    typeWeights: { car: 0.78, bus: 0.17, ambulance: 0.05 },
    blockedIntersections: [],
    pedSpawnInterval: 1.5,
    name: 'Hora de Ponta'
  },
  accident: {
    spawnInterval: 1.8,
    typeWeights: { car: 0.80, bus: 0.10, ambulance: 0.10 },
    blockedIntersections: [],
    pedSpawnInterval: 6.0,
    name: 'Acidente'
  },
  emergency: {
    spawnInterval: 1.8,
    typeWeights: { car: 0.65, bus: 0.10, ambulance: 0.25 },
    blockedIntersections: [],
    pedSpawnInterval: 4.0,
    name: 'Veículo de Emergência'
  }
};

export class SimulationEngine {
  constructor(gridSize = 4) {
    this.gridSize = Math.max(2, Math.min(10, gridSize));
    this.speed = 1;
    this.running = false;
    this.mode = 'ai';
    this.scenario = 'normal';
    this.time = 0;
    this.spawnTimer = 0;
    this.nextId = 0;

    this.intersections = [];
    this.vehicles = [];
    this.pedestrians = [];
    this.rules = [];
    this.pedNextId = 0;
    this.pedSpawnTimer = 0;

    this.stats = {
      ai: { totalWait: 0, completed: 0, totalCO2: 0, emergencyTimes: [], flowStartTime: 0, pedCompleted: 0, pedTotalWait: 0 },
      traditional: { totalWait: 0, completed: 0, totalCO2: 0, emergencyTimes: [], flowStartTime: 0, pedCompleted: 0, pedTotalWait: 0 },
      rl: { totalWait: 0, completed: 0, totalCO2: 0, emergencyTimes: [], flowStartTime: 0, pedCompleted: 0, pedTotalWait: 0 }
    };

    // Initialize shadow engine if this is the primary engine
    this.isShadow = false;
    this.shadowEngine = null;

    this.initGrid();
  }

  initGrid(seed = null) {
    this.intersections = [];
    this.vehicles = [];
    this.pedestrians = [];
    this.time = 0;
    this.spawnTimer = 0;
    this.pedSpawnTimer = 0;
    
    // Set up seeded random
    this.currentSeed = seed ?? Math.floor(Math.random() * 1000000);
    this.rng = new SeededRandom(this.currentSeed);

    this.stats[this.mode] = {
      totalWait: 0, completed: 0, totalCO2: 0, emergencyTimes: [], flowStartTime: 0,
      pedCompleted: 0, pedTotalWait: 0
    };

    // If primary engine, spawn and explicitly sync a shadow engine for true comparisons
    if (!this.isShadow) {
      if (this.shadowEngine) this.shadowEngine.running = false;
      this.shadowEngine = new SimulationEngine(this.gridSize);
      this.shadowEngine.isShadow = true;
      this.shadowEngine.setScenario(this.scenario);
      this.shadowEngine.setMode(this.mode === 'traditional' ? 'ai' : 'traditional');
      this.shadowEngine.initGrid(this.currentSeed); // MUST share exact same seed as primary
    }

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        this.intersections.push({
          row,
          col,
          light: {
            phase: (row + col) % 2 === 0 ? 'ns' : 'ew',
            timer: this.rng.next() * 8,
            greenDuration: this.mode === 'traditional' ? 30 : 20,
            inYellow: false,
            yellowTimer: 0
          },
          blocked: false,
          queueNS: 0,
          queueEW: 0,
          emergencyApproaching: null
        });
      }
    }

    this.applyScenarioBlocks();
  }

  applyScenarioBlocks() {
    if (this.scenario === 'accident') {
      const mid = Math.floor(this.gridSize / 2);
      const targets = [[mid, mid]];
      if (this.gridSize > 3) targets.push([mid - 1, mid]);
      for (const [r, c] of targets) {
        const int = this.getIntersection(r, c);
        if (int) int.blocked = true;
      }
    }
  }

  getIntersection(row, col) {
    return this.intersections.find(i => i.row === row && i.col === col);
  }

  setGridSize(size) {
    this.gridSize = Math.max(2, Math.min(10, size));
    this.initGrid();
  }

  setMode(mode) {
    this.mode = mode;
    for (const int of this.intersections) {
      int.light.greenDuration = mode === 'traditional' ? 30 : 20;
    }
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  setScenario(name) {
    this.scenario = name;
    this.initGrid();
  }

  start() {
    this.running = true;
    if (this.stats[this.mode].flowStartTime === 0) {
      this.stats[this.mode].flowStartTime = this.time;
    }
    if (!this.isShadow && this.shadowEngine) {
      this.shadowEngine.start();
    }
  }

  pause() {
    this.running = false;
    if (!this.isShadow && this.shadowEngine) {
      this.shadowEngine.pause();
    }
  }

  tick(dt) {
    if (!this.running || this.speed === 0) return;
    const scaledDt = dt * this.speed;
    
    // Tick primary
    this.time += scaledDt;
    this.updateLights(scaledDt);
    this.updateVehicles(scaledDt);
    this.updatePedestrians(scaledDt);
    this.spawnVehicles(scaledDt);
    this.spawnPedestrians(scaledDt);
    this.updateQueues();

    // Tick shadow for comparison metrics
    if (!this.isShadow && this.shadowEngine) {
      // Keep shadows in same time frame/speed setting intentionally
      this.shadowEngine.setSpeed(this.speed);
      this.shadowEngine.tick(dt); 
    }
  }

  updateLights(dt) {
    for (const int of this.intersections) {
      if (int.blocked) continue;
      const light = int.light;

      if (light.inYellow) {
        light.yellowTimer += dt;
        if (light.yellowTimer >= 3) {
          light.phase = light.phase === 'ns' ? 'ew' : 'ns';
          light.inYellow = false;
          light.yellowTimer = 0;
          light.timer = 0;

          if (this.mode === 'ai') {
            const queue = light.phase === 'ns' ? int.queueNS : int.queueEW;
            light.greenDuration = Math.max(8, Math.min(40, 15 + queue * 4));
          }
        }
      } else {
        light.timer += dt;

        if (this.mode === 'ai' && int.emergencyApproaching) {
          const dir = int.emergencyApproaching;
          const needPhase = (dir === 'n' || dir === 's') ? 'ns' : 'ew';
          if (light.phase !== needPhase) {
            light.inYellow = true;
            light.yellowTimer = 1.5;
          }
        }

        if (this.mode === 'ai') {
          for (const rule of this.rules) {
            if (rule.type === 'timing' && rule.action && rule.action.extend_green_seconds) {
              light.greenDuration = Math.min(45, light.greenDuration + 0.005);
            }
          }
        }

        if (light.timer >= light.greenDuration) {
          light.inYellow = true;
          light.yellowTimer = 0;
        }
      }
    }
  }

  updateVehicles(dt) {
    const toRemove = [];

    for (const vehicle of this.vehicles) {
      if (vehicle.completed) {
        toRemove.push(vehicle.id);
        continue;
      }

      const current = vehicle.route[vehicle.routeIndex];
      const next = vehicle.route[vehicle.routeIndex + 1];

      if (!next) {
        vehicle.completed = true;
        this.recordCompletion(vehicle);
        toRemove.push(vehicle.id);
        continue;
      }

      if (vehicle.waiting) {
        vehicle.waitTime += dt;
        vehicle.totalWaitTime += dt;

        const intersection = this.getIntersection(current.row, current.col);
        if (this.canPass(vehicle, intersection, next)) {
          vehicle.waiting = false;
          vehicle.waitTime = 0;
        }
      } else {
        vehicle.progress += (vehicle.speed * dt);

        if (vehicle.progress >= 1) {
          vehicle.routeIndex++;
          vehicle.progress = 0;

          if (vehicle.routeIndex >= vehicle.route.length - 1) {
            vehicle.completed = true;
            this.recordCompletion(vehicle);
            toRemove.push(vehicle.id);
          } else {
            vehicle.waiting = true;
            const int = this.getIntersection(
              vehicle.route[vehicle.routeIndex].row,
              vehicle.route[vehicle.routeIndex].col
            );
            if (int && !int.blocked) {
              const nextWP = vehicle.route[vehicle.routeIndex + 1];
              if (nextWP && this.canPass(vehicle, int, nextWP)) {
                vehicle.waiting = false;
              }
            }
          }
        }
      }
    }

    this.vehicles = this.vehicles.filter(v => !toRemove.includes(v.id));
  }

  canPass(vehicle, intersection, nextWaypoint) {
    if (!intersection) return true;
    if (intersection.blocked && vehicle.type !== 'ambulance') return false;

    const current = vehicle.route[vehicle.routeIndex];
    const dRow = nextWaypoint.row - current.row;
    const needPhase = dRow !== 0 ? 'ns' : 'ew';

    if (vehicle.type === 'ambulance' && this.mode === 'ai') {
      return true;
    }

    const hasPriorityRule = this.rules.some(
      r => r.type === 'priority' && r.target === vehicle.type
    );
    if (hasPriorityRule && this.mode === 'ai') {
      return true;
    }

    if (intersection.light.phase !== needPhase || intersection.light.inYellow) return false;

    // Vehicles yield to pedestrians actively crossing their path
    const pedCrossDir = dRow !== 0 ? 'ns' : 'ew';
    const pedBlocking = this.pedestrians.some(
      p => p.intRow === intersection.row && p.intCol === intersection.col
        && p.crossDir === pedCrossDir && !p.waiting && p.progress > 0.05 && p.progress < 0.95
    );
    if (pedBlocking && vehicle.type !== 'ambulance') return false;

    return true;
  }

  recordCompletion(vehicle) {
    const s = this.stats[this.mode];
    s.totalWait += vehicle.totalWaitTime;
    s.completed++;
    const cfg = VEHICLE_CONFIGS[vehicle.type];
    s.totalCO2 += vehicle.totalWaitTime * cfg.co2 + vehicle.route.length * cfg.co2 * 0.5;

    if (vehicle.type === 'ambulance') {
      s.emergencyTimes.push(this.time - vehicle.spawnTime);
    }
  }

  updateQueues() {
    for (const int of this.intersections) {
      int.queueNS = 0;
      int.queueEW = 0;
      int.emergencyApproaching = null;
    }

    for (const vehicle of this.vehicles) {
      if (!vehicle.waiting) continue;
      const current = vehicle.route[vehicle.routeIndex];
      const next = vehicle.route[vehicle.routeIndex + 1];
      if (!next) continue;

      const int = this.getIntersection(current.row, current.col);
      if (!int) continue;

      const dRow = next.row - current.row;
      const dCol = next.col - current.col;
      if (dRow !== 0) int.queueNS++;
      else int.queueEW++;

      if (vehicle.type === 'ambulance') {
        if (dRow > 0) int.emergencyApproaching = 's';
        else if (dRow < 0) int.emergencyApproaching = 'n';
        else if (dCol > 0) int.emergencyApproaching = 'e';
        else int.emergencyApproaching = 'w';
      }
    }
  }

  spawnVehicles(dt) {
    const config = SCENARIOS[this.scenario];
    if (!config) return;
    this.spawnTimer += dt;
    const maxVehicles = Math.floor(this.gridSize * this.gridSize * 2.5);

    if (this.spawnTimer >= config.spawnInterval && this.vehicles.length < maxVehicles) {
      this.spawnTimer = 0;

      const rand = this.rng.next();
      let type;
      if (rand < config.typeWeights.car) type = 'car';
      else if (rand < config.typeWeights.car + config.typeWeights.bus) type = 'bus';
      else type = 'ambulance';

      const route = this.generateRoute();
      if (route.length < 2) return;

      const cfg = VEHICLE_CONFIGS[type];
      const colors = VEHICLE_COLORS[type];

      this.vehicles.push({
        id: this.nextId++,
        type,
        route,
        routeIndex: 0,
        progress: 0,
        speed: cfg.speed * (0.85 + this.rng.next() * 0.3),
        waiting: false,
        waitTime: 0,
        totalWaitTime: 0,
        spawnTime: this.time,
        completed: false,
        color: colors[Math.floor(this.rng.next() * colors.length)],
        width: cfg.width,
        height: cfg.height
      });
    }
  }

  /* ── Pedestrian agents ── */

  spawnPedestrians(dt) {
    const config = SCENARIOS[this.scenario];
    if (!config || !config.pedSpawnInterval) return;
    this.pedSpawnTimer += dt;

    const maxPeds = Math.floor(this.gridSize * this.gridSize * 1.2);
    if (this.pedSpawnTimer >= config.pedSpawnInterval && this.pedestrians.length < maxPeds) {
      this.pedSpawnTimer = 0;

      // Pick a random non-blocked intersection
      const valid = this.intersections.filter(i => !i.blocked);
      if (valid.length === 0) return;
      const int = valid[Math.floor(this.rng.next() * valid.length)];

      // Choose which road to cross (ns or ew)
      const crossDir = this.rng.next() < 0.5 ? 'ns' : 'ew';
      const side = this.rng.next() < 0.5 ? 0 : 1;

      this.pedestrians.push({
        id: this.pedNextId++,
        intRow: int.row,
        intCol: int.col,
        crossDir,
        side,
        progress: 0,
        waiting: true,
        waitTime: 0,
        totalWaitTime: 0,
        speed: PED_SPEED * (0.8 + this.rng.next() * 0.4),
        spawnTime: this.time,
        completed: false,
        color: PED_COLORS[Math.floor(this.rng.next() * PED_COLORS.length)]
      });
    }
  }

  updatePedestrians(dt) {
    const toRemove = [];

    for (const ped of this.pedestrians) {
      if (ped.completed) {
        toRemove.push(ped.id);
        continue;
      }

      const int = this.getIntersection(ped.intRow, ped.intCol);
      if (!int) { toRemove.push(ped.id); continue; }

      if (ped.waiting) {
        ped.waitTime += dt;
        ped.totalWaitTime += dt;

        // Pedestrian crossing NS road can go when light phase is EW (NS traffic stopped)
        // Pedestrian crossing EW road can go when light phase is NS (EW traffic stopped)
        const canCross = ped.crossDir === 'ns'
          ? int.light.phase === 'ew' && !int.light.inYellow
          : int.light.phase === 'ns' && !int.light.inYellow;

        if (canCross) {
          ped.waiting = false;
          ped.waitTime = 0;
        }
      } else {
        ped.progress += ped.speed * dt;

        if (ped.progress >= 1) {
          ped.completed = true;
          const s = this.stats[this.mode];
          s.pedCompleted++;
          s.pedTotalWait += ped.totalWaitTime;
          toRemove.push(ped.id);
        }
      }
    }

    this.pedestrians = this.pedestrians.filter(p => !toRemove.includes(p.id));
  }

  generateRoute() {
    const gs = this.gridSize;
    const edges = ['top', 'bottom', 'left', 'right'];
    const startEdge = edges[Math.floor(this.rng.next() * edges.length)];

    let startRow, startCol, endRow, endCol;
    switch (startEdge) {
      case 'top':
        startRow = 0; startCol = Math.floor(this.rng.next() * gs);
        endRow = gs - 1; endCol = Math.floor(this.rng.next() * gs);
        break;
      case 'bottom':
        startRow = gs - 1; startCol = Math.floor(this.rng.next() * gs);
        endRow = 0; endCol = Math.floor(this.rng.next() * gs);
        break;
      case 'left':
        startRow = Math.floor(this.rng.next() * gs); startCol = 0;
        endRow = Math.floor(this.rng.next() * gs); endCol = gs - 1;
        break;
      default:
        startRow = Math.floor(this.rng.next() * gs); startCol = gs - 1;
        endRow = Math.floor(this.rng.next() * gs); endCol = 0;
        break;
    }

    const route = [{ row: startRow, col: startCol }];
    let r = startRow, c = startCol;
    let iterations = 0;
    const maxIter = gs * gs * 3;

    while ((r !== endRow || c !== endCol) && iterations < maxIter) {
      iterations++;
      const canR = r !== endRow;
      const canC = c !== endCol;
      let newR = r, newC = c;

      if (canR && canC) {
        if (this.rng.next() < 0.55) newR += r < endRow ? 1 : -1;
        else newC += c < endCol ? 1 : -1;
      } else if (canR) {
        newR += r < endRow ? 1 : -1;
      } else if (canC) {
        newC += c < endCol ? 1 : -1;
      }

      if (newR < 0 || newR >= gs || newC < 0 || newC >= gs) continue;

      const int = this.getIntersection(newR, newC);
      if (int && int.blocked) {
        const alts = [
          { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
          { dr: 0, dc: 1 }, { dr: 0, dc: -1 }
        ];
        let found = false;
        for (const alt of alts) {
          const ar = r + alt.dr, ac = c + alt.dc;
          if (ar >= 0 && ar < gs && ac >= 0 && ac < gs) {
            const ai = this.getIntersection(ar, ac);
            if (!ai || !ai.blocked) {
              r = ar; c = ac;
              route.push({ row: r, col: c });
              found = true;
              break;
            }
          }
        }
        if (!found) break;
        continue;
      }

      r = newR; c = newC;
      route.push({ row: r, col: c });
    }

    return route;
  }

  applyRule(rule) {
    rule.id = this.nextId++;
    this.rules.push(rule);

    if (rule.type === 'block' && rule.action && rule.action.block_intersection) {
      const mid = Math.floor(this.gridSize / 2);
      const int = this.getIntersection(mid, mid);
      if (int) int.blocked = true;
    }

    if (rule.type === 'priority' && rule.target === 'ambulance') {
      // Priority already handled in canPass
    }

    return rule;
  }

  removeRule(ruleId) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  getMetrics() {
    const s = this.stats[this.mode];
    const elapsed = Math.max(this.time - s.flowStartTime, 0.01);
    const elapsedMin = elapsed / 60;

    return {
      avgWaitTime: s.completed > 0 ? Math.round(s.totalWait / s.completed * 10) / 10 : 0,
      flowRate: Math.round(s.completed / Math.max(elapsedMin, 0.01) * 10) / 10,
      co2Emissions: Math.round(s.totalCO2 * 100) / 100,
      emergencyResponseTime: s.emergencyTimes.length > 0
        ? Math.round(s.emergencyTimes.reduce((a, b) => a + b, 0) / s.emergencyTimes.length * 10) / 10
        : 0,
      vehiclesActive: this.vehicles.length,
      vehiclesCompleted: s.completed,
      pedestriansActive: this.pedestrians.length,
      pedestriansCompleted: s.pedCompleted,
      avgPedWaitTime: s.pedCompleted > 0 ? Math.round(s.pedTotalWait / s.pedCompleted * 10) / 10 : 0,
      simulationTime: Math.round(this.time * 10) / 10,
      mode: this.mode
    };
  }

  getComparisonMetrics() {
    if (!this.shadowEngine) {
      return this.getMetrics();
    }
    return this.shadowEngine.getMetrics();
  }
}
