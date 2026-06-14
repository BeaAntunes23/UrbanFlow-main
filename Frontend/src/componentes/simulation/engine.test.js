import { SimulationEngine } from './engine';

// jsdom provides localStorage, but we reset it between tests
beforeEach(() => {
  window.localStorage.clear();
});

describe('SimulationEngine — constructor', () => {
  it('creates engine with the given grid size', () => {
    const engine = new SimulationEngine(4);
    expect(engine.gridSize).toBe(4);
  });

  it('defaults to ai mode', () => {
    const engine = new SimulationEngine(4);
    expect(engine.mode).toBe('ai');
  });

  it('starts paused', () => {
    const engine = new SimulationEngine(4);
    expect(engine.running).toBe(false);
  });

  it('starts at time 0', () => {
    const engine = new SimulationEngine(4);
    expect(engine.time).toBe(0);
  });

  it('starts with no rules', () => {
    const engine = new SimulationEngine(4);
    expect(engine.rules).toHaveLength(0);
  });
});

describe('SimulationEngine — gridSize clamping', () => {
  it('clamps minimum to 2', () => {
    expect(new SimulationEngine(1).gridSize).toBe(2);
    expect(new SimulationEngine(0).gridSize).toBe(2);
  });

  it('clamps maximum to 10', () => {
    expect(new SimulationEngine(11).gridSize).toBe(10);
    expect(new SimulationEngine(100).gridSize).toBe(10);
  });

  it('accepts values within range', () => {
    expect(new SimulationEngine(6).gridSize).toBe(6);
  });
});

describe('SimulationEngine — initGrid', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('creates gridSize² intersections', () => {
    expect(engine.intersections).toHaveLength(16);
  });

  it('creates correct intersections for a 3×3 grid', () => {
    expect(new SimulationEngine(3).intersections).toHaveLength(9);
  });

  it('starts with no vehicles', () => {
    expect(engine.vehicles).toHaveLength(0);
  });

  it('starts with no pedestrians', () => {
    expect(engine.pedestrians).toHaveLength(0);
  });

  it('resets time to 0 on reinit', () => {
    engine.time = 99;
    engine.initGrid();
    expect(engine.time).toBe(0);
  });

  it('clears vehicles on reinit', () => {
    engine.vehicles.push({ id: 'fake' });
    engine.initGrid();
    expect(engine.vehicles).toHaveLength(0);
  });

  it('each intersection has the expected sensor shape', () => {
    const int = engine.intersections[0];
    expect(int.sensors).toMatchObject({
      nsCount: 0,
      ewCount: 0,
      nsEmergency: false,
      ewEmergency: false,
    });
  });
});

describe('SimulationEngine — getIntersection', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('finds intersection at (0,0)', () => {
    const int = engine.getIntersection(0, 0);
    expect(int).toBeDefined();
    expect(int.row).toBe(0);
    expect(int.col).toBe(0);
  });

  it('finds intersection at (2,3)', () => {
    const int = engine.getIntersection(2, 3);
    expect(int).toBeDefined();
    expect(int.row).toBe(2);
    expect(int.col).toBe(3);
  });

  it('returns undefined for out-of-bounds coordinates', () => {
    expect(engine.getIntersection(99, 99)).toBeUndefined();
  });
});

describe('SimulationEngine — setMode', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('changes mode to traditional', () => {
    engine.setMode('traditional');
    expect(engine.mode).toBe('traditional');
  });

  it('sets greenDuration to 30 for traditional', () => {
    engine.setMode('traditional');
    engine.intersections.forEach(int => {
      expect(int.light.greenDuration).toBe(30);
    });
  });

  it('sets greenDuration to 20 for ai', () => {
    engine.setMode('ai');
    engine.intersections.forEach(int => {
      expect(int.light.greenDuration).toBe(20);
    });
  });

  it('initializes stats object for a new mode key', () => {
    engine.setMode('rl');
    expect(engine.stats.rl).toBeDefined();
    expect(engine.stats.rl.completed).toBe(0);
  });
});

describe('SimulationEngine — setScenario', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('changes scenario to rush_hour', () => {
    engine.setScenario('rush_hour');
    expect(engine.scenario).toBe('rush_hour');
  });

  it('falls back to normal for unknown scenario', () => {
    engine.setScenario('nonexistent');
    expect(engine.scenario).toBe('normal');
  });

  it('reinitializes grid (clears vehicles) on scenario change', () => {
    engine.vehicles.push({ id: 'fake' });
    engine.setScenario('rush_hour');
    expect(engine.vehicles).toHaveLength(0);
  });
});

describe('SimulationEngine — start / pause', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('sets running to true on start', () => {
    engine.start();
    expect(engine.running).toBe(true);
  });

  it('sets running to false on pause', () => {
    engine.start();
    engine.pause();
    expect(engine.running).toBe(false);
  });
});

describe('SimulationEngine — tick', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('does not advance time when paused', () => {
    engine.tick(0.016);
    expect(engine.time).toBe(0);
  });

  it('advances time when running', () => {
    engine.start();
    engine.tick(0.1);
    expect(engine.time).toBeGreaterThan(0);
  });

  it('scales time advancement by speed', () => {
    engine.setSpeed(2);
    engine.start();
    engine.tick(0.1);
    expect(engine.time).toBeCloseTo(0.2, 5);
  });

  it('does not advance time when speed is 0', () => {
    engine.setSpeed(0);
    engine.start();
    engine.tick(0.1);
    expect(engine.time).toBe(0);
  });
});

describe('SimulationEngine — bucketQueue', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('returns 0 for 0 vehicles', () => expect(engine.bucketQueue(0)).toBe(0));
  it('returns 0 for negative values', () => expect(engine.bucketQueue(-5)).toBe(0));
  it('returns 1 for 1 vehicle', () => expect(engine.bucketQueue(1)).toBe(1));
  it('returns 1 for 2 vehicles', () => expect(engine.bucketQueue(2)).toBe(1));
  it('returns 2 for 3 vehicles', () => expect(engine.bucketQueue(3)).toBe(2));
  it('returns 2 for 4 vehicles', () => expect(engine.bucketQueue(4)).toBe(2));
  it('returns 3 for 5 vehicles', () => expect(engine.bucketQueue(5)).toBe(3));
  it('returns 3 for 7 vehicles', () => expect(engine.bucketQueue(7)).toBe(3));
  it('returns 4 for 8 vehicles', () => expect(engine.bucketQueue(8)).toBe(4));
  it('returns 4 for large values', () => expect(engine.bucketQueue(999)).toBe(4));
});

describe('SimulationEngine — buildRLState', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('returns a pipe-delimited string with phase, ns bucket, ew bucket, emergency', () => {
    const int = engine.getIntersection(0, 0);
    int.sensors.nsCount = 3; // bucket 2
    int.sensors.ewCount = 1; // bucket 1
    int.sensors.nsEmergency = false;
    int.sensors.ewEmergency = false;
    expect(engine.buildRLState(int, 'ns')).toBe('ns|2|1|0');
  });

  it('sets emergency flag to 1 when nsEmergency is true', () => {
    const int = engine.getIntersection(0, 0);
    int.sensors.nsCount = 0;
    int.sensors.ewCount = 0;
    int.sensors.nsEmergency = true;
    int.sensors.ewEmergency = false;
    expect(engine.buildRLState(int, 'ew')).toBe('ew|0|0|1');
  });

  it('sets emergency flag to 1 when ewEmergency is true', () => {
    const int = engine.getIntersection(0, 0);
    int.sensors.nsCount = 0;
    int.sensors.ewCount = 0;
    int.sensors.nsEmergency = false;
    int.sensors.ewEmergency = true;
    expect(engine.buildRLState(int, 'ns')).toBe('ns|0|0|1');
  });
});

describe('SimulationEngine — Q-Learning internals', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('initializes Q-values to zero for an unseen state', () => {
    const q = engine.getQValues('unseen|state');
    expect(q).toHaveLength(engine.rl.actions.length);
    expect(q.every(v => v === 0)).toBe(true);
  });

  it('returns the same array reference on repeated calls', () => {
    const q1 = engine.getQValues('my|state');
    const q2 = engine.getQValues('my|state');
    expect(q1).toBe(q2);
  });

  it('chooseRLActionIndex returns a valid index', () => {
    const idx = engine.chooseRLActionIndex('some|state');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(engine.rl.actions.length);
  });

  it('updateQValue moves Q away from zero with positive reward', () => {
    engine.getQValues('prev|s');
    engine.updateQValue('prev|s', 0, 10.0, 'next|s');
    expect(engine.getQValues('prev|s')[0]).toBeGreaterThan(0);
  });

  it('updateQValue applies Bellman equation: Q(s,a) += alpha*(r + gamma*maxQ(s\') - Q(s,a))', () => {
    // All Q-values start at 0; reward = 5
    engine.updateQValue('s0', 0, 5.0, 's1');
    // Expected: 0 + 0.2 * (5 + 0.9 * 0 - 0) = 1.0
    expect(engine.getQValues('s0')[0]).toBeCloseTo(1.0, 5);
  });

  it('decays epsilon during training after updateQValue', () => {
    const epsBefore = engine.rl.epsilon;
    engine.updateQValue('s', 0, 1.0, 's2');
    expect(engine.rl.epsilon).toBeLessThan(epsBefore);
  });

  it('does not decay epsilon below epsilonMin', () => {
    engine.rl.epsilon = engine.rl.epsilonMin;
    engine.updateQValue('s', 0, 1.0, 's2');
    expect(engine.rl.epsilon).toBeGreaterThanOrEqual(engine.rl.epsilonMin);
  });
});

describe('SimulationEngine — applyRule / removeRule', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('adds a rule to the rules array', () => {
    engine.applyRule({ type: 'priority', target: 'ambulance', action: {} });
    expect(engine.rules).toHaveLength(1);
  });

  it('assigns an auto-incrementing id', () => {
    const r1 = engine.applyRule({ type: 'priority', action: {} });
    const r2 = engine.applyRule({ type: 'timing', action: {} });
    expect(r2.id).toBeGreaterThan(r1.id);
  });

  it('blocks the central intersection for a block rule', () => {
    const mid = Math.floor(engine.gridSize / 2);
    engine.applyRule({ type: 'block', action: { block_intersection: true } });
    expect(engine.getIntersection(mid, mid).blocked).toBe(true);
  });

  it('removeRule removes the rule by id', () => {
    const rule = engine.applyRule({ type: 'priority', action: {} });
    engine.removeRule(rule.id);
    expect(engine.rules).toHaveLength(0);
  });

  it('removeRule leaves other rules intact', () => {
    const r1 = engine.applyRule({ type: 'priority', action: {} });
    engine.applyRule({ type: 'timing', action: {} });
    engine.removeRule(r1.id);
    expect(engine.rules).toHaveLength(1);
    expect(engine.rules[0].type).toBe('timing');
  });
});

describe('SimulationEngine — getMetrics', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('returns an object with all expected keys', () => {
    const m = engine.getMetrics();
    const required = [
      'avgWaitTime', 'flowRate', 'co2Emissions', 'emergencyResponseTime',
      'totalCollisions', 'collisionAvoided', 'vehiclesActive', 'vehiclesCompleted',
      'simulationTime', 'mode', 'pedestriansActive', 'pedestriansCompleted',
    ];
    required.forEach(key => expect(m).toHaveProperty(key));
  });

  it('returns 0 for avgWaitTime when no vehicles have completed', () => {
    expect(engine.getMetrics().avgWaitTime).toBe(0);
  });

  it('reflects the current mode', () => {
    engine.setMode('traditional');
    expect(engine.getMetrics().mode).toBe('traditional');
  });

  it('returns 0 collisions at start', () => {
    expect(engine.getMetrics().totalCollisions).toBe(0);
  });
});

describe('SimulationEngine — exportRLPolicy / loadRLPolicy', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('exported policy has correct structure', () => {
    const policy = engine.exportRLPolicy();
    expect(policy).toMatchObject({
      version: 1,
      actions: expect.any(Array),
      qTable: expect.any(Object),
      epsilon: expect.any(Number),
      alpha: expect.any(Number),
      gamma: expect.any(Number),
    });
  });

  it('loads a valid policy and returns true', () => {
    const policy = engine.exportRLPolicy();
    expect(engine.loadRLPolicy(policy)).toBe(true);
  });

  it('rejects null', () => {
    expect(engine.loadRLPolicy(null)).toBe(false);
  });

  it('rejects a policy without qTable', () => {
    expect(engine.loadRLPolicy({ version: 1, actions: [] })).toBe(false);
  });

  it('round-trips Q-table values correctly', () => {
    engine.getQValues('test|state')[0] = 42;
    const policy = engine.exportRLPolicy();

    const fresh = new SimulationEngine(4);
    fresh.loadRLPolicy(policy);
    expect(fresh.getQValues('test|state')[0]).toBe(42);
  });

  it('round-trips custom epsilon value', () => {
    engine.rl.epsilon = 0.123;
    const fresh = new SimulationEngine(4);
    fresh.loadRLPolicy(engine.exportRLPolicy());
    expect(fresh.rl.epsilon).toBeCloseTo(0.123, 5);
  });
});

describe('SimulationEngine — scenario-specific behaviour', () => {
  it('accident scenario blocks the central intersection', () => {
    const engine = new SimulationEngine(4);
    engine.setScenario('accident');
    const mid = Math.floor(4 / 2);
    expect(engine.getIntersection(mid, mid).blocked).toBe(true);
  });

  it('normal scenario does not block any intersection', () => {
    const engine = new SimulationEngine(4);
    engine.setScenario('normal');
    const blocked = engine.intersections.filter(i => i.blocked);
    expect(blocked).toHaveLength(0);
  });
});

describe('SimulationEngine — shadow engine', () => {
  it('primary engine creates a shadow engine', () => {
    const engine = new SimulationEngine(4);
    expect(engine.shadowEngine).not.toBeNull();
  });

  it('shadow engine is marked as shadow', () => {
    const engine = new SimulationEngine(4);
    expect(engine.shadowEngine.isShadow).toBe(true);
  });

  it('shadow engine itself has no shadow', () => {
    const engine = new SimulationEngine(4);
    expect(engine.shadowEngine.shadowEngine).toBeNull();
  });
});

describe('SimulationEngine — spawnVehicles', () => {
  it('spawns at least one vehicle after enough time (normal scenario, 3s simulated)', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    for (let i = 0; i < 35; i++) engine.tick(0.1);
    expect(engine.vehicles.length).toBeGreaterThan(0);
  });

  it('spawned vehicle has all required properties', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    for (let i = 0; i < 35; i++) engine.tick(0.1);
    const v = engine.vehicles[0];
    expect(v).toBeDefined();
    expect(v).toHaveProperty('id');
    expect(v).toHaveProperty('type');
    expect(v).toHaveProperty('route');
    expect(v).toHaveProperty('speed');
    expect(v).toHaveProperty('waiting');
    expect(v).toHaveProperty('avoidingCollision', false);
    expect(['car', 'bus', 'ambulance']).toContain(v.type);
  });

  it('spawned vehicle route has at least 2 waypoints', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    for (let i = 0; i < 35; i++) engine.tick(0.1);
    for (const v of engine.vehicles) {
      expect(v.route.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('respects the max vehicle cap', () => {
    const engine = new SimulationEngine(2);
    engine.setScenario('rush_hour');
    engine.start();
    const maxVehicles = Math.floor(2 * 2 * 2.5);
    for (let i = 0; i < 500; i++) engine.tick(0.1);
    expect(engine.vehicles.length).toBeLessThanOrEqual(maxVehicles);
  });
});

describe('SimulationEngine — findPathAvoidingBlocks (BFS)', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('finds a path from (0,0) to (3,3)', () => {
    const path = engine.findPathAvoidingBlocks({ row: 0, col: 0 }, { row: 3, col: 3 });
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toMatchObject({ row: 0, col: 0 });
    expect(path[path.length - 1]).toMatchObject({ row: 3, col: 3 });
  });

  it('all nodes in path are within grid bounds', () => {
    const path = engine.findPathAvoidingBlocks({ row: 0, col: 0 }, { row: 3, col: 3 });
    for (const node of path) {
      expect(node.row).toBeGreaterThanOrEqual(0);
      expect(node.row).toBeLessThan(engine.gridSize);
      expect(node.col).toBeGreaterThanOrEqual(0);
      expect(node.col).toBeLessThan(engine.gridSize);
    }
  });

  it('finds a direct path between adjacent nodes', () => {
    const path = engine.findPathAvoidingBlocks({ row: 0, col: 0 }, { row: 0, col: 1 });
    expect(path).toHaveLength(2);
    expect(path[0]).toMatchObject({ row: 0, col: 0 });
    expect(path[1]).toMatchObject({ row: 0, col: 1 });
  });

  it('avoids blocked intersections', () => {
    engine.getIntersection(1, 1).blocked = true;
    const path = engine.findPathAvoidingBlocks({ row: 0, col: 0 }, { row: 2, col: 2 });
    const passesThrough = path.some(n => n.row === 1 && n.col === 1);
    expect(passesThrough).toBe(false);
  });

  it('returns empty array when destination is completely unreachable', () => {
    // Block all 4 neighbours of (0,0) — trapping the start
    engine.getIntersection(0, 1).blocked = true;
    engine.getIntersection(1, 0).blocked = true;
    const path = engine.findPathAvoidingBlocks({ row: 0, col: 0 }, { row: 3, col: 3 });
    expect(path).toHaveLength(0);
  });
});

describe('SimulationEngine — generateDefaultRoute', () => {
  let engine;
  beforeEach(() => { engine = new SimulationEngine(4); });

  it('returns at least 2 waypoints', () => {
    expect(engine.generateDefaultRoute().length).toBeGreaterThanOrEqual(2);
  });

  it('all waypoints are within grid bounds', () => {
    const route = engine.generateDefaultRoute();
    for (const wp of route) {
      expect(wp.row).toBeGreaterThanOrEqual(0);
      expect(wp.row).toBeLessThan(engine.gridSize);
      expect(wp.col).toBeGreaterThanOrEqual(0);
      expect(wp.col).toBeLessThan(engine.gridSize);
    }
  });

  it('consecutive waypoints differ by at most 1 step (Manhattan distance ≤ 1)', () => {
    const route = engine.generateDefaultRoute();
    for (let i = 1; i < route.length; i++) {
      const dr = Math.abs(route[i].row - route[i - 1].row);
      const dc = Math.abs(route[i].col - route[i - 1].col);
      expect(dr + dc).toBeLessThanOrEqual(1);
    }
  });
});

describe('SimulationEngine — findShortestCityPath (BFS sobre grafo Portugal)', () => {
  let engine;
  let graph;
  beforeEach(() => {
    engine = new SimulationEngine(4);
    graph = engine.getPortugalCityGraph();
  });

  it('finds a path between two connected cities', () => {
    const path = engine.findShortestCityPath(graph, 'porto', 'faro');
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toBe('porto');
    expect(path[path.length - 1]).toBe('faro');
  });

  it('returns single-element array when start equals end', () => {
    expect(engine.findShortestCityPath(graph, 'porto', 'porto')).toEqual(['porto']);
  });

  it('returns empty array for unknown city', () => {
    expect(engine.findShortestCityPath(graph, 'atlantida', 'faro')).toHaveLength(0);
  });

  it('every city in path exists in the graph', () => {
    const path = engine.findShortestCityPath(graph, 'braga', 'evora');
    for (const city of path) {
      expect(graph).toHaveProperty(city);
    }
  });

  it('each consecutive pair are neighbours in the graph', () => {
    const path = engine.findShortestCityPath(graph, 'viana_castelo', 'faro');
    for (let i = 0; i < path.length - 1; i++) {
      expect(graph[path[i]]).toContain(path[i + 1]);
    }
  });
});

describe('SimulationEngine — pedestrian spawning e movimento', () => {
  it('spawns pedestrians after enough time', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    for (let i = 0; i < 15; i++) engine.tick(0.1);
    expect(engine.pedestrians.length).toBeGreaterThan(0);
  });

  it('spawned pedestrian has required properties', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    for (let i = 0; i < 15; i++) engine.tick(0.1);
    const ped = engine.pedestrians[0];
    expect(ped).toBeDefined();
    expect(ped).toHaveProperty('intRow');
    expect(ped).toHaveProperty('intCol');
    expect(ped).toHaveProperty('crossDir');
    expect(ped).toHaveProperty('progress');
    expect(typeof ped.progress).toBe('number');
    expect(ped.progress).toBeGreaterThanOrEqual(0);
    expect(ped.progress).toBeLessThanOrEqual(1);
    expect(ped).toHaveProperty('waiting');
    expect(['ns', 'ew']).toContain(ped.crossDir);
  });

  it('pedestrian never spawns at a blocked intersection', () => {
    const engine = new SimulationEngine(4);
    engine.setScenario('accident');
    engine.start();
    for (let i = 0; i < 15; i++) engine.tick(0.1);
    for (const ped of engine.pedestrians) {
      expect(engine.getIntersection(ped.intRow, ped.intCol).blocked).toBe(false);
    }
  });

  const makePed = (overrides = {}) => ({
    id: 9999,
    intRow: 0, intCol: 0,
    crossDir: 'ns',
    side: 0,
    progress: 0,
    waiting: true,
    waitTime: 0,
    totalWaitTime: 0,
    spawnTime: 0,
    completed: false,
    color: '#fff',
    ...overrides,
  });

  it('pedestrian starts crossing when light is in safe phase', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    engine.pedestrians.push(makePed({ crossDir: 'ns' }));
    const int = engine.getIntersection(0, 0);
    int.light.phase = 'ew';    // safe for 'ns' crossDir
    int.light.inYellow = false;
    engine.updatePedestrians(0.1);
    expect(engine.pedestrians.find(p => p.id === 9999).waiting).toBe(false);
  });

  it('pedestrian does not cross during yellow phase', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    engine.pedestrians.push(makePed({ crossDir: 'ns' }));
    const int = engine.getIntersection(0, 0);
    int.light.phase = 'ew';
    int.light.inYellow = true;  // yellow — unsafe
    engine.updatePedestrians(0.1);
    expect(engine.pedestrians.find(p => p.id === 9999).waiting).toBe(true);
  });

  it('pedestrian is removed after crossing completes', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    engine.pedestrians.push(makePed({ progress: 0.95, waiting: false }));
    engine.updatePedestrians(0.2);
    expect(engine.pedestrians.find(p => p.id === 9999)).toBeUndefined();
  });

  it('completion updates pedestriansCompleted and pedestriansWait stats', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    engine.pedestrians.push(makePed({ progress: 0.99, waiting: false, totalWaitTime: 5 }));
    engine.updatePedestrians(0.1);
    expect(engine.stats[engine.mode].pedestriansCompleted).toBe(1);
    expect(engine.stats[engine.mode].pedestriansWait).toBe(5);
  });
});

describe('SimulationEngine — collisionAvoided conta apenas uma vez por evento', () => {
  it('incrementa collisionAvoided só na transição, não em cada tick', () => {
    const engine = new SimulationEngine(4);
    engine.start();
    const route = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
    const base = {
      type: 'car', route, routeIndex: 0, speed: 1.8,
      waiting: false, waitTime: 0, totalWaitTime: 0,
      spawnTime: 0, completed: false, color: '#fff',
      width: 10, height: 6, avoidingCollision: false,
    };
    engine.vehicles.push({ ...base, id: 100, progress: 0.5 });
    engine.vehicles.push({ ...base, id: 101, progress: 0.6 }); // 0.1 gap < 0.16 mínimo

    engine.updateVehicles(0.016);
    engine.updateVehicles(0.016);
    engine.updateVehicles(0.016);

    expect(engine.stats[engine.mode].collisionAvoided).toBe(1);
  });
});
