// UrbanFlow AI - Simulation Engine
// Pure JavaScript class - no React dependencies
import { SeededRandom } from '../../utils/seededRandom.js';

// CO2 emission factors based on real-world EU standards (EURO 6 / EEA data)
// Units: g CO2 per simulation time unit (proxy for g/km driven or idling)
// Car: ~120 g/km (EURO 6 average), Bus: ~820 g/km (EU average), Ambulance: ~250 g/km
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

const VEHICLE_CLASS_BY_TYPE = {
  car: 'light',
  bus: 'heavy',
  ambulance: 'emergency',
};

const SCENARIOS = {
  normal: {
    spawnInterval: 2.2,
    typeWeights: { car: 0.85, bus: 0.10, ambulance: 0.05 },
    blockedIntersections: [],
    name: 'Fluxo Normal'
  },
  rush_hour: {
    spawnInterval: 0.5,
    typeWeights: { car: 0.78, bus: 0.17, ambulance: 0.05 },
    blockedIntersections: [],
    name: 'Hora de Ponta'
  },
  accident: {
    spawnInterval: 1.8,
    typeWeights: { car: 0.80, bus: 0.10, ambulance: 0.10 },
    blockedIntersections: [],
    name: 'Acidente'
  },
  emergency: {
    spawnInterval: 1.8,
    typeWeights: { car: 0.65, bus: 0.10, ambulance: 0.25 },
    blockedIntersections: [],
    name: 'Veículo de Emergência'
  },
  vila_real: {
    spawnInterval: 1.25,
    typeWeights: { car: 0.72, bus: 0.18, ambulance: 0.10 },
    blockedIntersections: [],
    name: 'Mapa Vila Real'
  },
  portugal: {
    spawnInterval: 1.05,
    typeWeights: { car: 0.74, bus: 0.16, ambulance: 0.10 },
    blockedIntersections: [],
    name: 'Mapa Portugal Inteiro'
  },
  portugal_litoral: {
    spawnInterval: 0.95,
    typeWeights: { car: 0.76, bus: 0.17, ambulance: 0.07 },
    blockedIntersections: [],
    name: 'Portugal Litoral'
  },
  portugal_interior: {
    spawnInterval: 1.2,
    typeWeights: { car: 0.70, bus: 0.18, ambulance: 0.12 },
    blockedIntersections: [],
    name: 'Portugal Interior'
  },
  portugal_sul: {
    spawnInterval: 1.1,
    typeWeights: { car: 0.73, bus: 0.17, ambulance: 0.10 },
    blockedIntersections: [],
    name: 'Portugal Sul'
  }
};

export const PORTUGAL_SCENARIOS = new Set(['portugal', 'portugal_litoral', 'portugal_interior', 'portugal_sul']);
const MAP_SCENARIOS = new Set(['vila_real', ...PORTUGAL_SCENARIOS]);

const DEFAULT_TYPE_WEIGHTS = { car: 0.85, bus: 0.10, ambulance: 0.05 };

const COLLISION_RADIUS = {
  car: 0.11,
  bus: 0.14,
  ambulance: 0.12,
};

const SAFE_PROGRESS_GAP = {
  car: 0.16,
  bus: 0.22,
  ambulance: 0.18,
};

const PED_SPEED = 0.38;          // passadeira atravessada em ~2.6s
const PED_SPAWN_INTERVAL = 1.1;  // segundos entre spawn base de peões
const PED_MAX_FACTOR = 3.2;      // max peões = gridSize² × factor
const PED_SCENARIO_MULTIPLIER = {
  normal: 1.0,
  rush_hour: 1.5,
  accident: 0.7,
  emergency: 0.6,
  vila_real: 1.2,
  portugal: 1.1,
  portugal_litoral: 1.2,
  portugal_interior: 0.95,
  portugal_sul: 1.0,
};
const PED_COLORS = ['#d4d4d8', '#e4e4e7', '#a1a1aa', '#f4f4f5'];

const RL_ACTIONS = [8, 12, 16, 20, 24, 28, 32, 36, 40];
const RL_STORAGE_KEY = 'urbanflow_rl_policy_v1';

export class SimulationEngine {
  constructor(gridSize = 4, isShadow = false) {
    this.gridSize = Math.max(2, Math.min(10, gridSize));
    this.speed = 1;
    this.running = false;
    this.mode = 'ai';
    this.scenario = 'normal';
    this.time = 0;
    this.spawnTimer = 0;
    this.nextId = 0;
    this.trafficProfile = null;
    this.gtfsMapData = null;
    this.gtfsShapesData = null;
    this.gtfsRouteCatalogCache = null;

    this.intersections = [];
    this.vehicles = [];
    this.pedestrians = [];
    this.pedSpawnTimer = 0;
    this.rules = [];
    this.lastPolicySaveTime = 0;
    this.shadowTickAccumulator = 0;
    this.shadowTickInterval = 0.3;

    this.rl = {
      qTable: new Map(),
      actions: RL_ACTIONS,
      alpha: 0.2,
      gamma: 0.9,
      epsilon: 0.25,
      epsilonMin: 0.03,
      epsilonDecay: 0.9994,
      training: true,
    };

    this.aiFeatures = {
      adaptiveTiming: true,
      emergencyPreemption: true,
      ruleOverrides: true,
    };

    this.stats = {
      ai: this.createEmptyStats(),
      traditional: this.createEmptyStats()
    };

    this.stats.rl = this.createEmptyStats();

    // Initialize shadow engine if this is the primary engine
    this.isShadow = isShadow;
    this.shadowEngine = null;

    this.loadRLPolicyFromStorage();

    this.initGrid();
  }

  setTrafficProfile(profile = null) {
    this.trafficProfile = profile && typeof profile === 'object' ? profile : null;
    if (!this.isShadow && this.shadowEngine) {
      this.shadowEngine.setTrafficProfile(this.trafficProfile);
    }
  }

  setGtfsMapData(mapData = null) {
    this.gtfsMapData = mapData && typeof mapData === 'object' ? mapData : null;
    this.gtfsRouteCatalogCache = null;
    if (!this.isShadow && this.shadowEngine) {
      this.shadowEngine.setGtfsMapData(this.gtfsMapData);
    }
  }

  setGtfsShapesData(shapesData = null) {
    this.gtfsShapesData = shapesData && typeof shapesData === 'object' ? shapesData : null;
    this.gtfsRouteCatalogCache = null;
    if (!this.isShadow && this.shadowEngine) {
      this.shadowEngine.setGtfsShapesData(this.gtfsShapesData);
    }
  }

  getScenarioConfigForCurrentTime() {
    const base = SCENARIOS[this.scenario];
    if (!base) return null;

    if (!this.trafficProfile || typeof this.trafficProfile !== 'object') {
      return base;
    }

    const tp = this.trafficProfile;
    const hourly = tp.hourly_departures || tp.departures_by_hour;
    const hourlyValues = Object.values(hourly || {})
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v >= 0);

    const averageHourly = hourlyValues.length > 0
      ? hourlyValues.reduce((a, b) => a + b, 0) / hourlyValues.length
      : 0;

    const simSecondsPerHour = Number(tp.sim_seconds_per_hour) > 0
      ? Number(tp.sim_seconds_per_hour)
      : 30;
    const currentHour = Math.floor(this.time / simSecondsPerHour) % 24;
    const hourValue = Number((hourly || {})[String(currentHour)] ?? 0);
    const flowFactorRaw = averageHourly > 0 ? hourValue / averageHourly : 1;
    const minFactor = Number(tp.min_flow_factor) > 0 ? Number(tp.min_flow_factor) : 0.45;
    const maxFactor = Number(tp.max_flow_factor) > 0 ? Number(tp.max_flow_factor) : 2.6;
    const flowFactor = Math.max(minFactor, Math.min(maxFactor, flowFactorRaw || 1));

    const spawnInterval = Math.max(0.2, base.spawnInterval / flowFactor);

    const mix = tp.vehicle_mix || {};
    const ambulanceWeight = Number.isFinite(mix.ambulance)
      ? Math.max(0, Math.min(0.40, Number(mix.ambulance)))
      : base.typeWeights.ambulance;
    const busWeight = Number.isFinite(mix.bus)
      ? Math.max(0, Math.min(0.80, Number(mix.bus)))
      : base.typeWeights.bus;
    const carWeightRaw = 1 - ambulanceWeight - busWeight;
    const carWeight = Math.max(0.01, carWeightRaw);
    const total = carWeight + busWeight + ambulanceWeight;

    return {
      ...base,
      spawnInterval,
      typeWeights: {
        car: carWeight / total,
        bus: busWeight / total,
        ambulance: ambulanceWeight / total,
      },
    };
  }

  createEmptyStats() {
    return {
      totalWait: 0,
      completed: 0,
      totalCO2: 0,
      emergencyTimes: [],
      flowStartTime: 0,
      totalCollisions: 0,
      collisionAvoided: 0,
      vehicleClasses: {
        light: { completed: 0, totalWait: 0 },
        heavy: { completed: 0, totalWait: 0 },
      },
      pedestriansWait: 0,
      pedestriansCompleted: 0,
    };
  }

  initGrid(seed = null) {
    this.intersections = [];
    this.vehicles = [];
    this.pedestrians = [];
    this.pedSpawnTimer = 0;
    this.time = 0;
    this.spawnTimer = 0;
    this.shadowTickAccumulator = 0;
    
    // Set up seeded random
    this.currentSeed = seed ?? Math.floor(Math.random() * 1000000);
    this.rng = new SeededRandom(this.currentSeed);

    this.stats[this.mode] = this.createEmptyStats();

    // If primary engine, spawn and explicitly sync a shadow engine for true comparisons
    if (!this.isShadow) {
      if (this.shadowEngine) this.shadowEngine.running = false;
      this.shadowEngine = new SimulationEngine(this.gridSize, true);
      this.shadowEngine.isShadow = true;
      this.shadowEngine.setTrafficProfile(this.trafficProfile);
      this.shadowEngine.setGtfsMapData(this.gtfsMapData);
      this.shadowEngine.setGtfsShapesData(this.gtfsShapesData);
      this.shadowEngine.setScenario(this.scenario);
      this.shadowEngine.setMode(this.mode === 'traditional' ? 'ai' : (this.mode === 'rl' ? 'traditional' : 'traditional'));
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
            yellowTimer: 0,
            rlLastState: null,
            rlLastAction: null,
            rlLastQueueTotal: null,
          },
          blocked: false,
          queueNS: 0,
          queueEW: 0,
          emergencyApproaching: null,
          sensors: {
            nsCount: 0,  // Contagem de veículos na direção NS
            ewCount: 0,  // Contagem de veículos na direção EW
            nsEmergency: false,  // Se há emergência na NS
            ewEmergency: false,  // Se há emergência na EW
            lastUpdate: 0
          }
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
      return;
    }
  }

  getIntersection(row, col) {
    return this.intersections.find(i => i.row === row && i.col === col);
  }

  setGridSize(size) {
    this.gridSize = Math.max(2, Math.min(10, size));
    this.gtfsRouteCatalogCache = null;
    this.initGrid();
  }

  setMode(mode) {
    this.mode = mode;
    for (const int of this.intersections) {
      int.light.greenDuration = mode === 'traditional' ? 30 : 20;
      int.light.rlLastState = null;
      int.light.rlLastAction = null;
      int.light.rlLastQueueTotal = null;
    }

    if (!this.stats[mode]) {
      this.stats[mode] = this.createEmptyStats();
    }
  }

  setAIFeatures(features = {}) {
    this.aiFeatures = {
      ...this.aiFeatures,
      ...features,
    };
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  setScenario(name) {
    this.scenario = SCENARIOS[name] ? name : 'normal';
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
    this.updateSensors();  // Atualizar sensores com contagens de veículos
    this.resolveCollisions();
    this.spawnVehicles(scaledDt);
    this.updateQueues();
    this.spawnPedestrians(scaledDt);
    this.updatePedestrians(scaledDt);

    if (this.mode === 'rl' && this.time - this.lastPolicySaveTime >= 15) {
      this.saveRLPolicyToStorage();
      this.lastPolicySaveTime = this.time;
    }

    // Tick shadow for comparison metrics
    if (!this.isShadow && this.shadowEngine) {
      this.shadowTickAccumulator += dt;

      if (this.shadowTickAccumulator >= this.shadowTickInterval) {
        // Comparison metrics do not need frame-accurate updates.
        this.shadowEngine.setSpeed(this.speed);
        this.shadowEngine.tick(this.shadowTickAccumulator);
        this.shadowTickAccumulator = 0;
      }
    }
  }

  bucketQueue(value) {
    if (value <= 0) return 0;
    if (value <= 2) return 1;
    if (value <= 4) return 2;
    if (value <= 7) return 3;
    return 4;
  }

  buildRLState(int, phase) {
    const nsBucket = this.bucketQueue(int.sensors.nsCount);  // Usar sensores em vez de queues
    const ewBucket = this.bucketQueue(int.sensors.ewCount);
    const emergencyFlag = int.sensors.nsEmergency || int.sensors.ewEmergency ? 1 : 0;
    return `${phase}|${nsBucket}|${ewBucket}|${emergencyFlag}`;
  }

  getQValues(state) {
    if (!this.rl.qTable.has(state)) {
      this.rl.qTable.set(state, this.rl.actions.map(() => 0));
    }
    return this.rl.qTable.get(state);
  }

  chooseRLActionIndex(state) {
    const qValues = this.getQValues(state);

    if (this.rl.training && this.rng.next() < this.rl.epsilon) {
      return Math.floor(this.rng.next() * this.rl.actions.length);
    }

    let bestValue = Number.NEGATIVE_INFINITY;
    let bestIndexes = [];
    for (let index = 0; index < qValues.length; index++) {
      const value = qValues[index];
      if (value > bestValue) {
        bestValue = value;
        bestIndexes = [index];
      } else if (value === bestValue) {
        bestIndexes.push(index);
      }
    }

    return bestIndexes[Math.floor(this.rng.next() * bestIndexes.length)];
  }

  updateQValue(prevState, actionIndex, reward, nextState) {
    const prevQ = this.getQValues(prevState);
    const nextQ = this.getQValues(nextState);
    const nextBest = Math.max(...nextQ);
    const oldValue = prevQ[actionIndex];
    const target = reward + this.rl.gamma * nextBest;
    prevQ[actionIndex] = oldValue + this.rl.alpha * (target - oldValue);

    if (this.rl.training) {
      this.rl.epsilon = Math.max(this.rl.epsilonMin, this.rl.epsilon * this.rl.epsilonDecay);
    }
  }

  makeRLDecision(int, light) {
    const state = this.buildRLState(int, light.phase);
    const actionIndex = this.chooseRLActionIndex(state);
    const actionSeconds = this.rl.actions[actionIndex];
    light.greenDuration = actionSeconds;
    light.rlLastState = state;
    light.rlLastAction = actionIndex;
    light.rlLastQueueTotal = int.queueNS + int.queueEW;
  }

  updateRLFromTransition(int, light) {
    if (light.rlLastState == null || light.rlLastAction == null) return;

    const currentQueue = int.queueNS + int.queueEW;
    const previousQueue = light.rlLastQueueTotal ?? currentQueue;
    const queueReduction = previousQueue - currentQueue;
    const activeQueue = light.phase === 'ns' ? int.queueNS : int.queueEW;
    const inactiveQueue = light.phase === 'ns' ? int.queueEW : int.queueNS;
    const emergencyBonus = int.emergencyApproaching ? 0.8 : 0;
    const collisionPenalty = this.stats[this.mode].totalCollisions * 0.15;

    const reward = queueReduction * 1.8 - activeQueue * 0.9 - inactiveQueue * 0.35 + emergencyBonus - collisionPenalty;
    const nextState = this.buildRLState(int, light.phase);
    this.updateQValue(light.rlLastState, light.rlLastAction, reward, nextState);
  }

  setRLTraining(enabled) {
    this.rl.training = Boolean(enabled);
    if (!this.rl.training) {
      this.rl.epsilon = this.rl.epsilonMin;
    }
  }

  exportRLPolicy() {
    return {
      version: 1,
      actions: [...this.rl.actions],
      qTable: Object.fromEntries(this.rl.qTable.entries()),
      epsilon: this.rl.epsilon,
      alpha: this.rl.alpha,
      gamma: this.rl.gamma,
    };
  }

  loadRLPolicy(policy) {
    if (!policy || typeof policy !== 'object') return false;
    if (!policy.qTable || typeof policy.qTable !== 'object') return false;

    const actions = Array.isArray(policy.actions) && policy.actions.length > 0 ? policy.actions : RL_ACTIONS;
    this.rl.actions = actions;
    this.rl.qTable = new Map(Object.entries(policy.qTable));
    this.rl.epsilon = typeof policy.epsilon === 'number' ? policy.epsilon : this.rl.epsilon;
    return true;
  }

  saveRLPolicyToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload = this.exportRLPolicy();
      window.localStorage.setItem(RL_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // no-op for environments without storage permissions
    }
  }

  loadRLPolicyFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(RL_STORAGE_KEY);
      if (!raw) return;
      const policy = JSON.parse(raw);
      this.loadRLPolicy(policy);
    } catch (error) {
      // no-op for invalid JSON or restricted storage
    }
  }

  getRLDiagnostics() {
    return {
      qStates: this.rl.qTable.size,
      epsilon: Number(this.rl.epsilon.toFixed(4)),
      training: this.rl.training,
      actions: [...this.rl.actions],
    };
  }

  getVehiclePose(vehicle) {
    const current = vehicle.route[vehicle.routeIndex];
    const next = vehicle.route[vehicle.routeIndex + 1];
    if (!current) {
      return { x: 0, y: 0, dirRow: 0, dirCol: 0 };
    }

    let x = current.col;
    let y = current.row;
    let dirRow = 0;
    let dirCol = 0;

    if (next) {
      dirRow = next.row - current.row;
      dirCol = next.col - current.col;

      if (!vehicle.waiting) {
        x = current.col + dirCol * vehicle.progress;
        y = current.row + dirRow * vehicle.progress;
      }

      const laneOffset = 0.18;
      if (dirRow > 0) x += laneOffset;
      else if (dirRow < 0) x -= laneOffset;
      if (dirCol > 0) y -= laneOffset;
      else if (dirCol < 0) y += laneOffset;
    }

    return { x, y, dirRow, dirCol };
  }

  isTooCloseToLeader(vehicle) {
    const current = vehicle.route[vehicle.routeIndex];
    const next = vehicle.route[vehicle.routeIndex + 1];
    if (!current || !next || vehicle.waiting || vehicle.completed) return false;

    const minGap = SAFE_PROGRESS_GAP[vehicle.type] ?? 0.16;

    for (const other of this.vehicles) {
      if (other.id === vehicle.id || other.completed) continue;
      if (other.waiting) continue;

      const oCurrent = other.route[other.routeIndex];
      const oNext = other.route[other.routeIndex + 1];
      if (!oCurrent || !oNext) continue;

      const sameSegment =
        oCurrent.row === current.row &&
        oCurrent.col === current.col &&
        oNext.row === next.row &&
        oNext.col === next.col;

      if (!sameSegment) continue;

      const gap = other.progress - vehicle.progress;
      if (gap > 0 && gap < minGap) {
        return true;
      }
    }

    return false;
  }

  resolveCollisions() {
    if (this.vehicles.length < 2) return;

    const crashedIds = new Set();
    let collisionsInTick = 0;

    for (let i = 0; i < this.vehicles.length; i++) {
      const vehicleA = this.vehicles[i];
      if (vehicleA.completed || crashedIds.has(vehicleA.id)) continue;
      const poseA = this.getVehiclePose(vehicleA);
      const radiusA = COLLISION_RADIUS[vehicleA.type] ?? 0.11;

      for (let j = i + 1; j < this.vehicles.length; j++) {
        const vehicleB = this.vehicles[j];
        if (vehicleB.completed || crashedIds.has(vehicleB.id)) continue;

        const poseB = this.getVehiclePose(vehicleB);
        const radiusB = COLLISION_RADIUS[vehicleB.type] ?? 0.11;
        const dx = poseA.x - poseB.x;
        const dy = poseA.y - poseB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= (radiusA + radiusB) * 0.9) {
          crashedIds.add(vehicleA.id);
          crashedIds.add(vehicleB.id);
          collisionsInTick += 1;
        }
      }
    }

    if (collisionsInTick > 0) {
      const modeStats = this.stats[this.mode];
      modeStats.totalCollisions += collisionsInTick;
      modeStats.totalCO2 += collisionsInTick * 1.5;
      this.vehicles = this.vehicles.filter((vehicle) => !crashedIds.has(vehicle.id));
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

          if (this.mode === 'ai' && this.aiFeatures.adaptiveTiming) {
            const queue = light.phase === 'ns' ? int.queueNS : int.queueEW;
            let base = Math.max(8, Math.min(40, 15 + queue * 4));
            for (const rule of this.rules) {
              if (rule.type === 'timing' && rule.action?.extend_green_seconds) {
                base = Math.min(45, base + rule.action.extend_green_seconds);
              }
            }
            light.greenDuration = base;
          } else if (this.mode === 'rl') {
            this.updateRLFromTransition(int, light);
            this.makeRLDecision(int, light);
          }
        }
      } else {
        light.timer += dt;

        if (this.mode === 'ai' && this.aiFeatures.emergencyPreemption && int.emergencyApproaching) {
          const dir = int.emergencyApproaching;
          const needPhase = (dir === 'n' || dir === 's') ? 'ns' : 'ew';
          if (light.phase !== needPhase) {
            light.inYellow = true;
            light.yellowTimer = 1.5;
          }
        }

        if (this.mode === 'rl' && light.rlLastState == null) {
          this.makeRLDecision(int, light);
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
        if (this.canPass(vehicle, intersection, next) && !this.isTooCloseToLeader(vehicle)) {
          vehicle.waiting = false;
          vehicle.waitTime = 0;
        }
      } else {
        if (this.isTooCloseToLeader(vehicle)) {
          vehicle.waiting = true;
          vehicle.waitTime += dt;
          vehicle.totalWaitTime += dt;
          if (!vehicle.avoidingCollision) {
            this.stats[this.mode].collisionAvoided += 1;
            vehicle.avoidingCollision = true;
          }
          continue;
        }

        vehicle.avoidingCollision = false;
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

    const hasPriorityRule = this.aiFeatures.ruleOverrides && this.rules.some(
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

    const vehicleClass = VEHICLE_CLASS_BY_TYPE[vehicle.type];
    if (vehicleClass === 'light' || vehicleClass === 'heavy') {
      s.vehicleClasses[vehicleClass].completed += 1;
      s.vehicleClasses[vehicleClass].totalWait += vehicle.totalWaitTime;
    }

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

  updateSensors() {
    // Reset sensors
    for (const int of this.intersections) {
      int.sensors.nsCount = 0;
      int.sensors.ewCount = 0;
      int.sensors.nsEmergency = false;
      int.sensors.ewEmergency = false;
      int.sensors.lastUpdate = this.time;
    }

    // Count vehicles near intersections using their calculated pose
    for (const vehicle of this.vehicles) {
      if (vehicle.completed) continue;
      
      const pose = this.getVehiclePose(vehicle);
      const current = vehicle.route[vehicle.routeIndex];
      const next = vehicle.route[vehicle.routeIndex + 1];
      
      if (!current || !next) continue;

      const dRow = next.row - current.row;
      const dCol = next.col - current.col;

      // Identify which intersection the vehicle is approaching
      // A vehicle is considered "at" an intersection if it's on the segment leading to it
      const int = this.getIntersection(current.row, current.col);
      if (!int) continue;

      // Only count if they are actually in the "queueing" or "approaching" zone (progress < 1)
      // Since they are moving from 'current' towards 'next', they are sensed at 'current' intersection
      if (dRow !== 0) {
        int.sensors.nsCount++;
        if (vehicle.type === 'ambulance') int.sensors.nsEmergency = true;
      } else if (dCol !== 0) {
        int.sensors.ewCount++;
        if (vehicle.type === 'ambulance') int.sensors.ewEmergency = true;
      }
    }
  }

  spawnVehicles(dt) {
    const config = this.getScenarioConfigForCurrentTime();
    if (!config) return;
    this.spawnTimer += dt;
    const maxVehicles = Math.floor(this.gridSize * this.gridSize * 2.5);

    if (this.spawnTimer >= config.spawnInterval && this.vehicles.length < maxVehicles) {
      this.spawnTimer = 0;

      const rand = this.rng.next();
      let type;
      const weights = { ...DEFAULT_TYPE_WEIGHTS, ...(config.typeWeights || {}) };
      if (rand < weights.car) type = 'car';
      else if (rand < weights.car + weights.bus) type = 'bus';
      else type = 'ambulance';

      const route = this.generateRoute(type);
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
        height: cfg.height,
        avoidingCollision: false,
      });
    }
  }

  generateRoute(vehicleType = 'car') {
    if (this.scenario === 'vila_real') {
      const route = this.generateVilaRealRoute(vehicleType);
      if (route.length >= 2) return route;
    }

    if (PORTUGAL_SCENARIOS.has(this.scenario)) {
      const route = this.generatePortugalRoute(vehicleType);
      if (route.length >= 2) return route;
    }

    return this.generateDefaultRoute();
  }

  randomChoice(items = []) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[Math.floor(this.rng.next() * items.length)] || null;
  }

  pointFromNormalized(rowRatio, colRatio) {
    const row = Math.max(0, Math.min(this.gridSize - 1, Math.round((this.gridSize - 1) * rowRatio)));
    const col = Math.max(0, Math.min(this.gridSize - 1, Math.round((this.gridSize - 1) * colRatio)));
    return { row, col };
  }

  getGtfsBounds() {
    const bounds = this.gtfsMapData?.bounds;
    if (!bounds || typeof bounds !== 'object') return null;

    const minLat = Number(bounds.min_lat);
    const maxLat = Number(bounds.max_lat);
    const minLon = Number(bounds.min_lon);
    const maxLon = Number(bounds.max_lon);

    if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) {
      return null;
    }

    return { minLat, maxLat, minLon, maxLon };
  }

  pointFromLatLon(lat, lon) {
    const bounds = this.getGtfsBounds();
    if (!bounds || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const latRange = Math.max(1e-9, bounds.maxLat - bounds.minLat);
    const lonRange = Math.max(1e-9, bounds.maxLon - bounds.minLon);
    const rowRatio = (bounds.maxLat - lat) / latRange;
    const colRatio = (lon - bounds.minLon) / lonRange;
    return this.pointFromNormalized(rowRatio, colRatio);
  }

  getGtfsRouteCatalog(limit = 96) {
    if (this.gtfsRouteCatalogCache) {
      return this.gtfsRouteCatalogCache;
    }

    const shapeRoutes = Array.isArray(this.gtfsShapesData?.routes) ? this.gtfsShapesData.routes : [];
    if (shapeRoutes.length === 0) {
      this.gtfsRouteCatalogCache = [];
      return this.gtfsRouteCatalogCache;
    }

    const routeMeta = new Map(
      (Array.isArray(this.gtfsMapData?.routes) ? this.gtfsMapData.routes : []).map((route) => [route.route_id, route])
    );

    const catalog = shapeRoutes
      .map((shapeRoute) => {
        const coords = Array.isArray(shapeRoute.coordinates) ? shapeRoute.coordinates : [];
        if (coords.length < 2) return null;

        const gridPoints = [];
        for (const coord of coords) {
          if (!Array.isArray(coord) || coord.length < 2) continue;
          const point = this.pointFromLatLon(Number(coord[0]), Number(coord[1]));
          if (!point) continue;

          const last = gridPoints[gridPoints.length - 1];
          if (last && last.row === point.row && last.col === point.col) continue;
          gridPoints.push(point);
        }

        if (gridPoints.length < 2) return null;

        const meta = routeMeta.get(shapeRoute.route_id) || {};
        const rows = gridPoints.map((point) => point.row);
        const cols = gridPoints.map((point) => point.col);
        const demand = Number(meta.active_stop_times) || gridPoints.length;

        return {
          routeId: shapeRoute.route_id,
          shortName: shapeRoute.short_name || meta.short_name || '',
          longName: shapeRoute.long_name || meta.long_name || '',
          operator: shapeRoute.operator || meta.operator || 'unknown',
          demand,
          gridPoints,
          avgRow: rows.reduce((sum, value) => sum + value, 0) / rows.length,
          avgCol: cols.reduce((sum, value) => sum + value, 0) / cols.length,
          minRow: Math.min(...rows),
          maxRow: Math.max(...rows),
          minCol: Math.min(...cols),
          maxCol: Math.max(...cols),
        };
      })
      .filter((route) => route && route.gridPoints.length >= 2)
      .sort((a, b) => b.demand - a.demand)
      .slice(0, limit);

    this.gtfsRouteCatalogCache = catalog;
    return catalog;
  }

  matchesPortugalScenarioGtfsRoute(route) {
    if (!route) return false;

    const maxIndex = Math.max(1, this.gridSize - 1);
    const litoralThreshold = maxIndex * 0.42;
    const interiorThreshold = maxIndex * 0.38;
    const southThreshold = maxIndex * 0.52;

    if (this.scenario === 'portugal_litoral') {
      return route.avgCol <= litoralThreshold || route.minCol <= 1;
    }

    if (this.scenario === 'portugal_interior') {
      return route.avgCol >= interiorThreshold || route.maxCol >= maxIndex - 1;
    }

    if (this.scenario === 'portugal_sul') {
      return route.avgRow >= southThreshold || route.maxRow >= maxIndex - 1;
    }

    return true;
  }

  pickGtfsRouteSegment(points, minLen = 3, maxLen = null) {
    if (!Array.isArray(points) || points.length < 2) return [];

    const effectiveMax = Math.max(minLen, Math.min(points.length, maxLen ?? points.length));
    if (points.length <= minLen) {
      return [...points];
    }

    const segmentLength = Math.min(
      effectiveMax,
      minLen + Math.floor(this.rng.next() * Math.max(1, effectiveMax - minLen + 1))
    );
    const maxStart = Math.max(0, points.length - segmentLength);
    const startIndex = Math.floor(this.rng.next() * (maxStart + 1));
    return points.slice(startIndex, startIndex + segmentLength);
  }

  sanitizeGtfsWaypoints(points) {
    if (!Array.isArray(points) || points.length < 2) return [];

    const cleaned = [];
    for (const point of points) {
      if (!point || !Number.isInteger(point.row) || !Number.isInteger(point.col)) continue;
      const last = cleaned[cleaned.length - 1];
      if (last && last.row === point.row && last.col === point.col) continue;
      cleaned.push(point);
    }

    if (cleaned.length < 2) return [];

    const start = cleaned[0];
    const end = cleaned[cleaned.length - 1];
    if (start.row !== end.row || start.col !== end.col) {
      return cleaned;
    }

    for (let index = cleaned.length - 2; index > 0; index--) {
      const candidate = cleaned[index];
      if (candidate.row !== start.row || candidate.col !== start.col) {
        return cleaned.slice(0, index + 1);
      }
    }

    return [];
  }

  generateGtfsDrivenPortugalRoute(vehicleType = 'car') {
    const catalog = this.getGtfsRouteCatalog();
    if (catalog.length === 0) return [];

    const scenarioRoutes = catalog.filter((route) => this.matchesPortugalScenarioGtfsRoute(route));
    const candidates = scenarioRoutes.length > 0 ? scenarioRoutes : catalog;
    const preferred = candidates.slice(0, Math.min(candidates.length, vehicleType === 'bus' ? 20 : 28));
    const selected = this.randomChoice(preferred) || candidates[0];
    if (!selected) return [];

    let waypoints;
    if (vehicleType === 'bus') {
      waypoints = [...selected.gridPoints];
    } else if (vehicleType === 'ambulance') {
      const maxLen = Math.max(4, Math.ceil(selected.gridPoints.length * 0.5));
      waypoints = this.pickGtfsRouteSegment(selected.gridPoints, 3, maxLen);
    } else {
      const maxLen = Math.max(4, Math.ceil(selected.gridPoints.length * 0.75));
      waypoints = this.pickGtfsRouteSegment(selected.gridPoints, 3, maxLen);
    }

    if (waypoints.length >= 2 && this.rng.next() < 0.5) {
      waypoints = [...waypoints].reverse();
    }

    waypoints = this.sanitizeGtfsWaypoints(waypoints);

    const route = this.buildRouteFromWaypoints(waypoints);
    return route.length >= 2 ? route : [];
  }

  buildRouteFromWaypoints(waypoints) {
    if (!Array.isArray(waypoints) || waypoints.length < 2) return [];

    const route = [];
    for (let index = 0; index < waypoints.length - 1; index++) {
      const start = waypoints[index];
      const end = waypoints[index + 1];
      const segment = this.findPathAvoidingBlocks(start, end);
      if (segment.length < 2) return [];

      const joinStart = index === 0 ? 0 : 1;
      for (let i = joinStart; i < segment.length; i++) {
        route.push(segment[i]);
      }
    }

    return route;
  }

  getScenarioLandmarks() {
    if (this.scenario === 'vila_real') {
      return {
        utad: this.pointFromNormalized(0.12, 0.22),
        centro: this.pointFromNormalized(0.45, 0.48),
        hospital: this.pointFromNormalized(0.18, 0.78),
        mateus: this.pointFromNormalized(0.66, 0.28),
        borbela: this.pointFromNormalized(0.78, 0.76),
      };
    }

    if (PORTUGAL_SCENARIOS.has(this.scenario)) {
      const gtfsLandmarks = this.getGtfsLandmarks();
      if (gtfsLandmarks) return gtfsLandmarks;

      return {
        viana_castelo: this.pointFromNormalized(0.03, 0.13),
        braga: this.pointFromNormalized(0.06, 0.18),
        porto: this.pointFromNormalized(0.16, 0.24),
        vila_real: this.pointFromNormalized(0.17, 0.38),
        viseu: this.pointFromNormalized(0.26, 0.41),
        aveiro: this.pointFromNormalized(0.30, 0.32),
        coimbra: this.pointFromNormalized(0.42, 0.36),
        castelo_branco: this.pointFromNormalized(0.42, 0.58),
        leiria: this.pointFromNormalized(0.50, 0.35),
        santarem: this.pointFromNormalized(0.56, 0.42),
        lisboa: this.pointFromNormalized(0.60, 0.44),
        setubal: this.pointFromNormalized(0.68, 0.50),
        evora: this.pointFromNormalized(0.70, 0.64),
        beja: this.pointFromNormalized(0.80, 0.62),
        faro: this.pointFromNormalized(0.86, 0.60),
      };
    }

    return null;
  }

  getGtfsLandmarks() {
    const points = this.getGtfsCityPoints();
    if (!points || points.length < 8) return null;

    const pickByRegion = (predicate, fallbackIndex) => {
      const filtered = points.filter(predicate);
      if (filtered.length > 0) return filtered[0];
      return points[Math.min(points.length - 1, fallbackIndex)] || null;
    };

    const northWest = pickByRegion((p) => p.row <= 1 && p.col <= 2, 0);
    const north = pickByRegion((p) => p.row <= 1, 1);
    const northInterior = pickByRegion((p) => p.row <= 2 && p.col >= 3, 2);
    const centerNorth = pickByRegion((p) => p.row >= 2 && p.row <= 3 && p.col <= 3, 3);
    const center = pickByRegion((p) => p.row >= 3 && p.row <= 4, 4);
    const centerEast = pickByRegion((p) => p.row >= 3 && p.col >= 4, 5);
    const lisbonArea = pickByRegion((p) => p.row >= 4 && p.row <= 6 && p.col <= 5, 6);
    const setubalArea = pickByRegion((p) => p.row >= 5 && p.row <= 7 && p.col <= 6, 7);
    const alentejo = pickByRegion((p) => p.row >= 6 && p.col >= 5, 8);
    const south = pickByRegion((p) => p.row >= 7, points.length - 1);

    const pointToNode = (point, fallbackPoint) => {
      const p = point || fallbackPoint;
      return { row: p.row, col: p.col, label: p.label };
    };

    const fallback = points[0];
    return {
      viana_castelo: pointToNode(northWest, fallback),
      braga: pointToNode(north, fallback),
      porto: pointToNode(north, fallback),
      vila_real: pointToNode(northInterior, fallback),
      viseu: pointToNode(centerNorth, fallback),
      aveiro: pointToNode(centerNorth, fallback),
      coimbra: pointToNode(center, fallback),
      castelo_branco: pointToNode(centerEast, fallback),
      leiria: pointToNode(center, fallback),
      santarem: pointToNode(centerEast, fallback),
      lisboa: pointToNode(lisbonArea, fallback),
      setubal: pointToNode(setubalArea, fallback),
      evora: pointToNode(alentejo, fallback),
      beja: pointToNode(alentejo, fallback),
      faro: pointToNode(south, fallback),
    };
  }

  getGtfsCityPoints(limit = 18) {
    const stops = Array.isArray(this.gtfsMapData?.stops) ? this.gtfsMapData.stops : [];
    if (stops.length === 0) return [];

    const valid = stops
      .map((stop) => ({
        lat: Number(stop.lat),
        lon: Number(stop.lon),
        activity: Number(stop.activity) || 0,
        label: String(stop.name || stop.stop_id || 'Stop').slice(0, 18),
      }))
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon));

    if (valid.length === 0) return [];

    const top = valid
      .sort((a, b) => b.activity - a.activity)
      .slice(0, Math.max(8, limit));

    const minLat = Math.min(...top.map((s) => s.lat));
    const maxLat = Math.max(...top.map((s) => s.lat));
    const minLon = Math.min(...top.map((s) => s.lon));
    const maxLon = Math.max(...top.map((s) => s.lon));

    const latRange = Math.max(1e-9, maxLat - minLat);
    const lonRange = Math.max(1e-9, maxLon - minLon);

    const normalized = top.map((stop) => {
      const rowRatio = (maxLat - stop.lat) / latRange;
      const colRatio = (stop.lon - minLon) / lonRange;
      const point = this.pointFromNormalized(rowRatio, colRatio);
      return {
        ...point,
        label: stop.label,
        activity: stop.activity,
      };
    });

    // remove duplicates by grid cell while preserving high-activity stops first
    const dedup = [];
    const seen = new Set();
    for (const item of normalized) {
      const key = `${item.row}:${item.col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dedup.push(item);
      if (dedup.length >= limit) break;
    }

    return dedup;
  }

  getPortugalScenarioProfile() {
    const balanced = {
      label: 'Portugal Inteiro',
      carBias: [
        'viana_castelo', 'braga', 'porto', 'vila_real', 'viseu',
        'aveiro', 'coimbra', 'castelo_branco', 'leiria', 'santarem',
        'lisboa', 'setubal', 'evora', 'beja', 'faro',
      ],
      busNorth: ['viana_castelo', 'braga', 'porto', 'vila_real', 'viseu', 'aveiro'],
      busSouth: ['coimbra', 'santarem', 'lisboa', 'setubal', 'evora', 'beja', 'faro'],
      ambulanceHospitals: ['porto', 'coimbra', 'lisboa', 'faro'],
      scenicStops: ['porto', 'coimbra', 'lisboa', 'evora'],
    };

    if (this.scenario === 'portugal_litoral') {
      return {
        label: 'Portugal Litoral',
        carBias: ['viana_castelo', 'porto', 'aveiro', 'coimbra', 'leiria', 'lisboa', 'setubal', 'faro'],
        busNorth: ['viana_castelo', 'porto', 'aveiro'],
        busSouth: ['coimbra', 'leiria', 'lisboa', 'setubal', 'faro'],
        ambulanceHospitals: ['porto', 'coimbra', 'lisboa', 'faro'],
        scenicStops: ['porto', 'aveiro', 'coimbra', 'lisboa'],
      };
    }

    if (this.scenario === 'portugal_interior') {
      return {
        label: 'Portugal Interior',
        carBias: ['vila_real', 'viseu', 'castelo_branco', 'evora', 'beja', 'coimbra', 'santarem'],
        busNorth: ['vila_real', 'viseu', 'castelo_branco'],
        busSouth: ['santarem', 'evora', 'beja', 'faro'],
        ambulanceHospitals: ['coimbra', 'lisboa', 'faro'],
        scenicStops: ['viseu', 'castelo_branco', 'evora'],
      };
    }

    if (this.scenario === 'portugal_sul') {
      return {
        label: 'Portugal Sul',
        carBias: ['coimbra', 'santarem', 'lisboa', 'setubal', 'evora', 'beja', 'faro'],
        busNorth: ['coimbra', 'santarem', 'lisboa'],
        busSouth: ['setubal', 'evora', 'beja', 'faro'],
        ambulanceHospitals: ['lisboa', 'faro', 'coimbra'],
        scenicStops: ['lisboa', 'evora', 'faro'],
      };
    }

    return balanced;
  }

  generateVilaRealRoute(vehicleType = 'car') {
    const marks = this.getScenarioLandmarks();
    if (!marks) return [];

    let plan;

    if (vehicleType === 'ambulance') {
      const emergencyTargets = [marks.centro, marks.utad, marks.borbela];
      plan = [marks.hospital, this.randomChoice(emergencyTargets), marks.hospital];
    } else if (vehicleType === 'bus') {
      const busOrigins = [marks.borbela, marks.mateus, marks.utad];
      plan = [this.randomChoice(busOrigins), marks.centro, this.randomChoice(busOrigins)];
    } else {
      const origins = [marks.utad, marks.borbela, marks.mateus];
      const destinations = [marks.centro, marks.hospital, marks.mateus, marks.borbela];
      const start = this.randomChoice(origins);
      let end = this.randomChoice(destinations);
      if (end && start && end.row === start.row && end.col === start.col) {
        end = marks.centro;
      }
      plan = [start, marks.centro, end];
    }

    return this.buildRouteFromWaypoints(plan.filter(Boolean));
  }

  getPortugalCityGraph() {
    return {
      viana_castelo: ['braga', 'porto'],
      braga: ['viana_castelo', 'porto', 'vila_real'],
      porto: ['viana_castelo', 'braga', 'aveiro', 'vila_real'],
      vila_real: ['braga', 'porto', 'viseu'],
      viseu: ['vila_real', 'aveiro', 'coimbra', 'castelo_branco'],
      aveiro: ['porto', 'viseu', 'coimbra', 'leiria'],
      coimbra: ['aveiro', 'viseu', 'castelo_branco', 'leiria', 'santarem'],
      castelo_branco: ['viseu', 'coimbra', 'santarem', 'evora'],
      leiria: ['aveiro', 'coimbra', 'santarem', 'lisboa'],
      santarem: ['coimbra', 'castelo_branco', 'leiria', 'lisboa', 'evora'],
      lisboa: ['leiria', 'santarem', 'setubal', 'evora'],
      setubal: ['lisboa', 'evora', 'beja'],
      evora: ['castelo_branco', 'santarem', 'lisboa', 'setubal', 'beja'],
      beja: ['setubal', 'evora', 'faro'],
      faro: ['beja'],
    };
  }

  findShortestCityPath(graph, start, end) {
    if (!graph || !start || !end || !graph[start] || !graph[end]) return [];
    if (start === end) return [start];

    const queue = [start];
    const visited = new Set([start]);
    const parent = new Map();

    while (queue.length > 0) {
      const node = queue.shift();
      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        parent.set(neighbor, node);
        if (neighbor === end) {
          const path = [end];
          let cursor = end;
          while (parent.has(cursor)) {
            cursor = parent.get(cursor);
            path.push(cursor);
          }
          return path.reverse();
        }
        queue.push(neighbor);
      }
    }

    return [];
  }

  buildPortugalWaypointsFromCities(cityNames, marks) {
    return cityNames
      .map((name) => marks[name])
      .filter((point) => point && Number.isInteger(point.row) && Number.isInteger(point.col));
  }

  generatePortugalRoute(vehicleType = 'car') {
    const gtfsRoute = this.generateGtfsDrivenPortugalRoute(vehicleType);
    if (gtfsRoute.length >= 2) return gtfsRoute;

    const marks = this.getScenarioLandmarks();
    if (!marks) return [];

    const graph = this.getPortugalCityGraph();
    const profile = this.getPortugalScenarioProfile();
    const allCities = profile.carBias.filter((city) => graph[city]);

    let startCity;
    let endCity;

    if (vehicleType === 'ambulance') {
      const hospitals = profile.ambulanceHospitals.filter((city) => graph[city]);
      startCity = this.randomChoice(hospitals);
      endCity = this.randomChoice(hospitals.filter((city) => city !== startCity));
    } else if (vehicleType === 'bus') {
      const northTerminals = profile.busNorth.filter((city) => graph[city]);
      const southTerminals = profile.busSouth.filter((city) => graph[city]);
      if (this.rng.next() < 0.65) {
        startCity = this.randomChoice(northTerminals);
        endCity = this.randomChoice(southTerminals);
      } else {
        startCity = this.randomChoice(southTerminals);
        endCity = this.randomChoice(northTerminals);
      }
    } else {
      startCity = this.randomChoice(allCities);
      endCity = this.randomChoice(allCities.filter((city) => city !== startCity));
    }

    const cityPath = this.findShortestCityPath(graph, startCity, endCity);
    if (cityPath.length < 2) return this.generateDefaultRoute();

    let enrichedPath = cityPath;
    if (vehicleType === 'car' && cityPath.length >= 2 && this.rng.next() < 0.45) {
      const scenicStops = profile.scenicStops.filter((city) => graph[city]);
      const scenic = this.randomChoice(scenicStops.filter((city) => city !== startCity && city !== endCity));
      if (scenic) {
        const legA = this.findShortestCityPath(graph, startCity, scenic);
        const legB = this.findShortestCityPath(graph, scenic, endCity);
        if (legA.length > 1 && legB.length > 1) {
          enrichedPath = [...legA, ...legB.slice(1)];
        }
      }
    }

    const waypoints = this.buildPortugalWaypointsFromCities(enrichedPath, marks);
    const route = this.buildRouteFromWaypoints(waypoints);
    return route.length >= 2 ? route : this.generateDefaultRoute();
  }

  getMapOverlayData() {
    if (!MAP_SCENARIOS.has(this.scenario)) return null;

    const marks = this.getScenarioLandmarks();
    if (!marks) return null;

    if (this.scenario === 'vila_real') {
      return {
        title: 'Vila Real',
        subtitle: 'UTAD, Centro, Hospital, Mateus, Borbela',
        points: [
          { label: 'UTAD', ...marks.utad },
          { label: 'Centro', ...marks.centro },
          { label: 'Hospital', ...marks.hospital },
          { label: 'Mateus', ...marks.mateus },
          { label: 'Borbela', ...marks.borbela },
        ],
      };
    }

    const profile = this.getPortugalScenarioProfile();
    const gtfsPoints = this.getGtfsCityPoints(16);
    if (gtfsPoints.length >= 8) {
      return {
        title: `${profile.label} (GTFS)`,
        subtitle: `${this.gtfsMapData?.agency || 'Transit feed'} · pontos de maior atividade`,
        points: gtfsPoints.map((p) => ({ label: p.label, row: p.row, col: p.col })),
      };
    }

    return {
      title: profile.label,
      subtitle: 'Cobertura nacional Norte-Centro-Sul',
      points: [
        { label: 'Viana', ...marks.viana_castelo },
        { label: 'Braga', ...marks.braga },
        { label: 'Porto', ...marks.porto },
        { label: 'Vila Real', ...marks.vila_real },
        { label: 'Viseu', ...marks.viseu },
        { label: 'Aveiro', ...marks.aveiro },
        { label: 'Coimbra', ...marks.coimbra },
        { label: 'C Branco', ...marks.castelo_branco },
        { label: 'Leiria', ...marks.leiria },
        { label: 'Santarem', ...marks.santarem },
        { label: 'Lisboa', ...marks.lisboa },
        { label: 'Setubal', ...marks.setubal },
        { label: 'Evora', ...marks.evora },
        { label: 'Beja', ...marks.beja },
        { label: 'Faro', ...marks.faro },
      ],
    };
  }

  generateDefaultRoute() {
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

  findPathAvoidingBlocks(start, end) {
    const gs = this.gridSize;
    const toKey = (row, col) => `${row}:${col}`;
    const fromKey = (key) => {
      const [row, col] = key.split(':').map(Number);
      return { row, col };
    };

    const startKey = toKey(start.row, start.col);
    const endKey = toKey(end.row, end.col);
    const queue = [startKey];
    const visited = new Set([startKey]);
    const parent = new Map();

    while (queue.length > 0) {
      const currentKey = queue.shift();
      if (currentKey === endKey) break;

      const { row, col } = fromKey(currentKey);
      const directions = [
        { dr: 1, dc: 0 },
        { dr: -1, dc: 0 },
        { dr: 0, dc: 1 },
        { dr: 0, dc: -1 },
      ].sort(() => this.rng.next() - 0.5);

      for (const { dr, dc } of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= gs || nc < 0 || nc >= gs) continue;

        const int = this.getIntersection(nr, nc);
        if (int && int.blocked) continue;

        const nextKey = toKey(nr, nc);
        if (visited.has(nextKey)) continue;
        visited.add(nextKey);
        parent.set(nextKey, currentKey);
        queue.push(nextKey);
      }
    }

    if (!visited.has(endKey)) return [];

    const reversed = [];
    let key = endKey;
    while (key) {
      reversed.push(fromKey(key));
      key = parent.get(key);
    }

    return reversed.reverse();
  }

  spawnPedestrians(dt) {
    this.pedSpawnTimer += dt;
    const scenarioMult = PED_SCENARIO_MULTIPLIER[this.scenario] ?? 1;
    const spawnInterval = PED_SPAWN_INTERVAL / scenarioMult;
    const maxPeds = Math.floor(this.gridSize * this.gridSize * PED_MAX_FACTOR * scenarioMult);
    if (this.pedSpawnTimer < spawnInterval || this.pedestrians.length >= maxPeds) return;
    this.pedSpawnTimer = 0;

    const candidates = this.intersections.filter(i => !i.blocked);
    if (candidates.length === 0) return;

    const int = candidates[Math.floor(this.rng.next() * candidates.length)];
    const crossDir = this.rng.next() < 0.5 ? 'ns' : 'ew';

    this.pedestrians.push({
      id: this.nextId++,
      intRow: int.row,
      intCol: int.col,
      crossDir,
      side: this.rng.next() < 0.5 ? 0 : 1,
      progress: 0,
      waiting: true,
      waitTime: 0,
      totalWaitTime: 0,
      spawnTime: this.time,
      completed: false,
      color: PED_COLORS[Math.floor(this.rng.next() * PED_COLORS.length)],
    });
  }

  updatePedestrians(dt) {
    const toRemove = [];

    for (const ped of this.pedestrians) {
      if (ped.completed) { toRemove.push(ped.id); continue; }

      const int = this.getIntersection(ped.intRow, ped.intCol);
      if (!int) { toRemove.push(ped.id); continue; }

      if (ped.waiting) {
        ped.waitTime += dt;
        ped.totalWaitTime += dt;
        // Peão pode atravessar quando o tráfego perpendicular está parado
        // crossDir 'ns' → atravessa a via NS → seguro quando phase='ew' (NS parado)
        // crossDir 'ew' → atravessa a via EW → seguro quando phase='ns' (EW parado)
        const safePhase = ped.crossDir === 'ns' ? 'ew' : 'ns';
        if (!int.light.inYellow && int.light.phase === safePhase) {
          ped.waiting = false;
          ped.waitTime = 0;
        }
      } else {
        ped.progress += PED_SPEED * dt;
        if (ped.progress >= 1) {
          ped.completed = true;
          this.recordPedestrianCompletion(ped);
          toRemove.push(ped.id);
        }
      }
    }

    this.pedestrians = this.pedestrians.filter(p => !toRemove.includes(p.id));
  }

  recordPedestrianCompletion(ped) {
    const s = this.stats[this.mode];
    s.pedestriansWait += ped.totalWaitTime;
    s.pedestriansCompleted += 1;
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
    const lightCompleted = s.vehicleClasses.light.completed;
    const heavyCompleted = s.vehicleClasses.heavy.completed;

    return {
      avgWaitTime: s.completed > 0 ? Math.round(s.totalWait / s.completed * 10) / 10 : 0,
      flowRate: Math.round(s.completed / Math.max(elapsedMin, 0.01) * 10) / 10,
      co2Emissions: Math.round(s.totalCO2 * 100) / 100,
      emergencyResponseTime: s.emergencyTimes.length > 0
        ? Math.round(s.emergencyTimes.reduce((a, b) => a + b, 0) / s.emergencyTimes.length * 10) / 10
        : 0,
      totalCollisions: s.totalCollisions,
      collisionAvoided: s.collisionAvoided,
      lightAvgWaitTime: lightCompleted > 0 ? Math.round((s.vehicleClasses.light.totalWait / lightCompleted) * 10) / 10 : 0,
      heavyAvgWaitTime: heavyCompleted > 0 ? Math.round((s.vehicleClasses.heavy.totalWait / heavyCompleted) * 10) / 10 : 0,
      lightVehiclesCompleted: lightCompleted,
      heavyVehiclesCompleted: heavyCompleted,
      vehiclesActive: this.vehicles.length,
      vehiclesCompleted: s.completed,
      simulationTime: Math.round(this.time * 10) / 10,
      mode: this.mode,
      pedestrianAvgWaitTime: s.pedestriansCompleted > 0
        ? Math.round(s.pedestriansWait / s.pedestriansCompleted * 10) / 10
        : 0,
      pedestriansCompleted: s.pedestriansCompleted,
      pedestriansActive: this.pedestrians.length,
    };
  }

  getComparisonMetrics() {
    if (!this.shadowEngine) {
      return this.getMetrics();
    }
    return this.shadowEngine.getMetrics();
  }
}
