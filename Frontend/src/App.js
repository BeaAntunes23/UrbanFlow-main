import * as React from "react";
import "@/App.css";
import { Toaster, toast } from "sonner";
import { SimulationEngine, PORTUGAL_SCENARIOS } from "@/componentes/simulation/engine";
import { SimulationCanvas } from "@/componentes/simulation/SimulationCanvas";
import { ControlPanel } from "@/componentes/dashboard/ControlPanel";
import { MetricsWidget } from "@/componentes/dashboard/MetricWidget";
import { DashboardView } from "@/componentes/dashboard/DashboardView";
import { EnvironmentalView } from "@/componentes/dashboard/EnvironmentalView";
import { ReportsView } from "@/componentes/dashboard/ReportsView";
import { SafetyView } from "@/componentes/dashboard/SafetyView";
import { SystemLogsView } from "@/componentes/dashboard/SystemLogsView";
import { GtfsMapView } from "@/componentes/dashboard/GtfsMapView";
import { HistoryView } from "@/componentes/dashboard/HistoryView";
import { LogoIcon } from "@/componentes/LogoIcon";
import {
  LayoutDashboard,
  Navigation,
  BarChart3,
  History as HistoryIcon,
  BookOpen,
  Activity,
  Leaf,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  Square,
} from 'lucide-react';

const INITIAL_CONFIG = {
  scenario: "normal",
  mode: "ai",
  speed: 1,
  gridSize: 4,
  running: true,
};

const INITIAL_METRICS = {
  avgWaitTime: 0,
  flowRate: 0,
  co2Emissions: 0,
  emergencyResponseTime: 0,
  totalCollisions: 0,
  collisionAvoided: 0,
  lightAvgWaitTime: 0,
  heavyAvgWaitTime: 0,
  lightVehiclesCompleted: 0,
  heavyVehiclesCompleted: 0,
  vehiclesActive: 0,
  vehiclesCompleted: 0,
  simulationTime: 0,
  mode: "ai",
};

const SIM_PANELS_STORAGE_KEY = 'trafficai_sim_panels_v1';
const HISTORICO_STORAGE_KEY = 'trafficai_historico_v1';

const saveSimulacao = (metrics, comparison, mode, scenario) => {
  try {
    const historico = JSON.parse(window.localStorage.getItem(HISTORICO_STORAGE_KEY) || '[]');
    historico.unshift({
      id: `sim_${Date.now()}`,
      data: new Date().toISOString(),
      modo: mode,
      cenario: scenario,
      co2: Number(metrics.co2Emissions) || 0,
      co2_ai: Number(comparison?.ai?.co2Emissions) || 0,
      co2_tradicional: Number(comparison?.traditional?.co2Emissions) || 0,
      veiculos_completados: Number(metrics.vehiclesCompleted) || 0,
      colisoes: Number(metrics.totalCollisions) || 0,
      tempo_medio_espera: Number(metrics.avgWaitTime) || 0,
    });
    window.localStorage.setItem(HISTORICO_STORAGE_KEY, JSON.stringify(historico.slice(0, 50)));
  } catch { /* localStorage cheio ou indisponível */ }
};
const DISTRICT_SCENARIO_MAP = {
  lisboa: 'portugal_litoral', porto: 'portugal_litoral', coimbra: 'portugal_litoral',
  braga: 'portugal_litoral', setubal: 'portugal_litoral', leiria: 'portugal_litoral',
  aveiro: 'portugal_litoral', viana_do_castelo: 'portugal_litoral',
  vila_real: 'portugal_interior', braganca: 'portugal_interior', guarda: 'portugal_interior',
  viseu: 'portugal_interior', castelo_branco: 'portugal_interior',
  faro: 'portugal_sul', beja: 'portugal_sul', evora: 'portugal_sul',
  portalegre: 'portugal_interior', santarem: 'portugal_litoral',
};

const loadSimPanelsPreference = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SIM_PANELS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};


const MIN_APP_SIDEBAR_WIDTH = 88;
const MAX_APP_SIDEBAR_WIDTH = 380;
const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 460;

const NavItem = ({ icon: Icon, label, active = false, onClick, compact = false }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
    >
      <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      </div>
      {!compact && <span className="text-sm font-semibold tracking-tight">{label}</span>}
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(24.6,95,53.1,0.5)]" />}
    </button>
  );
};

function App() {
  const simPanelsPref = React.useMemo(() => loadSimPanelsPreference(), []);

  const [currentTab, setCurrentTab] = React.useState('dashboard');
  const [config, setConfig] = React.useState(INITIAL_CONFIG);
  const [activeRules, setActiveRules] = React.useState([]);
  const [metrics, setMetrics] = React.useState(INITIAL_METRICS);
  const [comparison, setComparison] = React.useState(INITIAL_METRICS);
  const [metricHistory, setMetricHistory] = React.useState([]);
  const [eventLog, setEventLog] = React.useState([]);
  const [gtfsMapData, setGtfsMapData] = React.useState(null);
  const [gtfsShapesData, setGtfsShapesData] = React.useState(null);
  const [gtfsTrafficProfile, setGtfsTrafficProfile] = React.useState(null);
  const [appSidebarOpen, setAppSidebarOpen] = React.useState(
    simPanelsPref?.appSidebarOpen !== undefined ? Boolean(simPanelsPref.appSidebarOpen) : true
  );
  const [appSidebarWidth, setAppSidebarWidth] = React.useState(
    Number.isFinite(simPanelsPref?.appSidebarWidth) ? Number(simPanelsPref.appSidebarWidth) : 256
  );
  const [leftPanelOpen, setLeftPanelOpen] = React.useState(
    simPanelsPref?.leftPanelOpen !== undefined ? Boolean(simPanelsPref.leftPanelOpen) : true
  );
  const [rightPanelOpen, setRightPanelOpen] = React.useState(
    simPanelsPref?.rightPanelOpen !== undefined ? Boolean(simPanelsPref.rightPanelOpen) : true
  );
  const [leftPanelWidth, setLeftPanelWidth] = React.useState(
    Number.isFinite(simPanelsPref?.leftPanelWidth) ? Number(simPanelsPref.leftPanelWidth) : 310
  );
  const [rightPanelWidth, setRightPanelWidth] = React.useState(
    Number.isFinite(simPanelsPref?.rightPanelWidth) ? Number(simPanelsPref.rightPanelWidth) : 300
  );
  const engineRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const configRef = React.useRef(config);
  const prevMetricsRef = React.useRef(INITIAL_METRICS);
  const peakFlowRef = React.useRef(0);
  React.useEffect(() => { configRef.current = config; }, [config]);

  const handleSimulateDistrict = React.useCallback((districtKey) => {
    const scenario = DISTRICT_SCENARIO_MAP[districtKey] || 'portugal';
    setConfig((prev) => ({ ...prev, scenario }));
    if (engineRef.current) {
      engineRef.current.setScenario(scenario);
    }
    setCurrentTab('simulation');
  }, []);

  const clampAppSidebarWidth = React.useCallback((width) => {
    return Math.max(MIN_APP_SIDEBAR_WIDTH, Math.min(MAX_APP_SIDEBAR_WIDTH, width));
  }, [MIN_APP_SIDEBAR_WIDTH, MAX_APP_SIDEBAR_WIDTH]);

  const clampPanelWidth = React.useCallback((width) => {
    return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, width));
  }, [MIN_PANEL_WIDTH, MAX_PANEL_WIDTH]);

  const handleResizeMove = React.useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;

    const deltaX = event.clientX - drag.startX;
    if (drag.side === 'main') {
      setAppSidebarWidth(clampAppSidebarWidth(drag.startWidth + deltaX));
    } else if (drag.side === 'left') {
      setLeftPanelWidth(clampPanelWidth(drag.startWidth + deltaX));
    } else {
      setRightPanelWidth(clampPanelWidth(drag.startWidth - deltaX));
    }
  }, [clampAppSidebarWidth, clampPanelWidth]);

  const stopResize = React.useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResize);
  }, [handleResizeMove]);

  const startResize = React.useCallback((side, event) => {
    event.preventDefault();
    dragRef.current = {
      side,
      startX: event.clientX,
      startWidth: side === 'main' ? appSidebarWidth : (side === 'left' ? leftPanelWidth : rightPanelWidth),
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResize);
  }, [appSidebarWidth, leftPanelWidth, rightPanelWidth, handleResizeMove, stopResize]);

  const isAppSidebarCompact = appSidebarWidth < 190;

  React.useEffect(() => {
    const { scenario, mode, speed } = configRef.current;
    const engine = new SimulationEngine(config.gridSize || INITIAL_CONFIG.gridSize);
    engine.setScenario(scenario);
    engine.setMode(mode);
    engine.setSpeed(speed);
    if (gtfsMapData) {
      engine.setGtfsMapData(gtfsMapData);
    }
    if (gtfsShapesData) {
      engine.setGtfsShapesData(gtfsShapesData);
    }
    engine.start();
    engineRef.current = engine;

    return () => {
      if (engineRef.current) {
        engineRef.current.pause();
      }
    };
  }, [config.gridSize, gtfsMapData, gtfsShapesData]);

  React.useEffect(() => {
    let cancelled = false;
    const loadGtfs = async () => {
      try {
        const [mapResponse, shapesResponse] = await Promise.all([
          fetch('/data/gtfs_map_latest.json', { cache: 'no-store' }),
          fetch('/data/gtfs_shapes_latest.json', { cache: 'no-store' }),
        ]);

        if (!cancelled && mapResponse.ok) {
          const mapPayload = await mapResponse.json();
          if (mapPayload && typeof mapPayload === 'object') {
            setGtfsMapData(mapPayload);
          }
        }

        if (!cancelled && shapesResponse.ok) {
          const shapesPayload = await shapesResponse.json();
          if (shapesPayload && typeof shapesPayload === 'object') {
            setGtfsShapesData(shapesPayload);
          }
        }
      } catch {
        // GTFS data is optional for simulation fallback scenarios.
      }
    };
    loadGtfs();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !gtfsMapData) return;
    engine.setGtfsMapData(gtfsMapData);
  }, [gtfsMapData]);

  React.useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !gtfsShapesData) return;
    engine.setGtfsShapesData(gtfsShapesData);
  }, [gtfsShapesData]);

  React.useEffect(() => {
    let cancelled = false;
    const loadTrafficProfile = async () => {
      try {
        const candidates = [
          '/data/gtfs_traffic_profile_latest.json',
          '/experiments/results/gtfs_traffic_profile_latest.json',
        ];

        for (const url of candidates) {
          const response = await fetch(url, { cache: 'no-store' });
          if (!response.ok) continue;
          const payload = await response.json();
          if (!cancelled && payload && typeof payload === 'object') {
            setGtfsTrafficProfile(payload);
            break;
          }
        }
      } catch {
        // Optional file; simulation keeps default profile if absent.
      }
    };

    loadTrafficProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (PORTUGAL_SCENARIOS.has(config.scenario) && gtfsTrafficProfile) {
      engine.setTrafficProfile(gtfsTrafficProfile);
    } else {
      engine.setTrafficProfile(null);
    }
  }, [config.scenario, gtfsTrafficProfile]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const currentMetrics = engine.getMetrics();
      setMetrics(currentMetrics);
      setComparison(engine.getComparisonMetrics());
      setMetricHistory((prev) => {
        const nextPoint = {
          t: Date.now(),
          avgWaitTime: Number(currentMetrics.avgWaitTime) || 0,
          flowRate: Number(currentMetrics.flowRate) || 0,
          totalCollisions: Number(currentMetrics.totalCollisions) || 0,
          co2Emissions: Number(currentMetrics.co2Emissions) || 0,
        };
        const next = [...prev, nextPoint];
        return next.length > 120 ? next.slice(next.length - 120) : next;
      });

      const prev = prevMetricsRef.current;
      const now = new Date().toLocaleTimeString('pt-PT', { hour12: false });
      const newEvents = [];

      if (currentMetrics.totalCollisions > prev.totalCollisions) {
        const n = currentMetrics.totalCollisions - prev.totalCollisions;
        newEvents.push({ time: now, category: 'collision', status: 'critical', message: `${n} colisão${n > 1 ? 'ões' : ''} detetada${n > 1 ? 's' : ''} — veículos removidos da simulação.` });
      }

      const prevEmg = prev.vehiclesCompleted - prev.lightVehiclesCompleted - prev.heavyVehiclesCompleted;
      const currEmg = currentMetrics.vehiclesCompleted - currentMetrics.lightVehiclesCompleted - currentMetrics.heavyVehiclesCompleted;
      if (currEmg > prevEmg && currentMetrics.emergencyResponseTime > 0) {
        newEvents.push({ time: now, category: 'emergency', status: 'ok', message: `Veículo de emergência completou percurso em ${currentMetrics.emergencyResponseTime.toFixed(1)}s.` });
      }

      const prevAvoidedMilestone = Math.floor(prev.collisionAvoided / 10);
      const currAvoidedMilestone = Math.floor(currentMetrics.collisionAvoided / 10);
      if (currAvoidedMilestone > prevAvoidedMilestone && currAvoidedMilestone > 0) {
        newEvents.push({ time: now, category: 'safety', status: 'ok', message: `Marco: ${currentMetrics.collisionAvoided} colisões evitadas pelo sistema IA.` });
      }

      const prevCompletedMilestone = Math.floor(prev.vehiclesCompleted / 25);
      const currCompletedMilestone = Math.floor(currentMetrics.vehiclesCompleted / 25);
      if (currCompletedMilestone > prevCompletedMilestone && currCompletedMilestone > 0) {
        newEvents.push({ time: now, category: 'flow', status: 'info', message: `${currentMetrics.vehiclesCompleted} veículos completaram percurso.` });
      }

      const prevCO2Milestone = Math.floor(prev.co2Emissions / 100);
      const currCO2Milestone = Math.floor(currentMetrics.co2Emissions / 100);
      if (currCO2Milestone > prevCO2Milestone && currCO2Milestone > 0) {
        newEvents.push({ time: now, category: 'environment', status: currCO2Milestone >= 5 ? 'warning' : 'info', message: `Emissões CO₂ ultrapassaram ${currCO2Milestone * 100}g.` });
      }

      if (currentMetrics.avgWaitTime > 15 && prev.avgWaitTime <= 15) {
        newEvents.push({ time: now, category: 'optimization', status: 'warning', message: `Tempo de espera elevado: ${currentMetrics.avgWaitTime.toFixed(1)}s.` });
      } else if (currentMetrics.avgWaitTime <= 10 && prev.avgWaitTime > 10 && prev.avgWaitTime > 0) {
        newEvents.push({ time: now, category: 'optimization', status: 'ok', message: `Tempo de espera normalizado: ${currentMetrics.avgWaitTime.toFixed(1)}s.` });
      }

      if (currentMetrics.flowRate > peakFlowRef.current) peakFlowRef.current = currentMetrics.flowRate;
      if (peakFlowRef.current > 3 && currentMetrics.flowRate < peakFlowRef.current * 0.5 && prev.flowRate >= peakFlowRef.current * 0.5) {
        newEvents.push({ time: now, category: 'network', status: 'warning', message: `Queda de tráfego: ${currentMetrics.flowRate.toFixed(1)} veic/min (pico: ${peakFlowRef.current.toFixed(1)}).` });
      }

      if (newEvents.length > 0) {
        setEventLog((prevLog) => [...newEvents, ...prevLog].slice(0, 200));
      }
      prevMetricsRef.current = currentMetrics;
    }, 300);

    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const now = new Date().toLocaleTimeString('pt-PT', { hour12: false });
    setEventLog((prev) => [{ time: now, category: 'system', status: 'info', message: `Modo operacional alterado para "${config.mode === 'ai' ? 'IA-Driven' : 'Manual'}".` }, ...prev].slice(0, 200));
  }, [config.mode]);

  React.useEffect(() => {
    const now = new Date().toLocaleTimeString('pt-PT', { hour12: false });
    setEventLog((prev) => [{ time: now, category: 'system', status: 'info', message: `Cenário alterado para "${config.scenario}".` }, ...prev].slice(0, 200));
  }, [config.scenario]);

  React.useEffect(() => {
    prevMetricsRef.current = INITIAL_METRICS;
    peakFlowRef.current = 0;
    setEventLog([]);
  }, [config.gridSize]);

  React.useEffect(() => {
    return () => {
      stopResize();
    };
  }, [stopResize]);

  // Guardar simulação automaticamente quando para (running -> false)
  const prevRunning = React.useRef(config.running);
  React.useEffect(() => {
    if (prevRunning.current && !config.running) {
      saveSimulacao(metrics, comparison, config.mode, config.scenario);
    }
    prevRunning.current = config.running;
  }, [config.running, config.mode, config.scenario, metrics, comparison]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      appSidebarOpen,
      appSidebarWidth: clampAppSidebarWidth(appSidebarWidth),
      leftPanelOpen,
      rightPanelOpen,
      leftPanelWidth: clampPanelWidth(leftPanelWidth),
      rightPanelWidth: clampPanelWidth(rightPanelWidth),
    };
    window.localStorage.setItem(SIM_PANELS_STORAGE_KEY, JSON.stringify(payload));
  }, [appSidebarOpen, appSidebarWidth, leftPanelOpen, rightPanelOpen, leftPanelWidth, rightPanelWidth, clampAppSidebarWidth, clampPanelWidth]);

  return (
    <div className="App dark flex h-screen w-screen bg-[#09090b] text-foreground overflow-hidden font-sans flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-[#1c1c1f] bg-[#0c0c0e] flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={32} />
            <span className="font-black text-lg tracking-tighter text-white">UrbanFlow</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-8 h-full">
            <button className={`text-sm font-bold border-b-2 h-full transition-colors ${currentTab === 'dashboard' ? 'border-primary text-white' : 'border-transparent text-muted-foreground/60 hover:text-white'}`} onClick={() => setCurrentTab('dashboard')}>Overview</button>
            <button className={`text-sm font-bold border-b-2 h-full transition-colors ${currentTab === 'simulation' ? 'border-primary text-white' : 'border-transparent text-muted-foreground/60 hover:text-white'}`} onClick={() => setCurrentTab('simulation')}>Live Maps</button>
            <button className={`text-sm font-bold border-b-2 h-full transition-colors ${currentTab === 'gtfs_map' ? 'border-primary text-white' : 'border-transparent text-muted-foreground/60 hover:text-white'}`} onClick={() => setCurrentTab('gtfs_map')}>GTFS Map</button>
            <button className={`text-sm font-bold border-b-2 h-full transition-colors ${currentTab === 'analytics' ? 'border-primary text-white' : 'border-transparent text-muted-foreground/60 hover:text-white'}`} onClick={() => setCurrentTab('analytics')}>Analytics</button>
            <button className={`text-sm font-bold border-b-2 h-full transition-colors ${currentTab === 'reports' ? 'border-primary text-white' : 'border-transparent text-muted-foreground/60 hover:text-white'}`} onClick={() => setCurrentTab('reports')}>Reports</button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setAppSidebarOpen((prev) => !prev)}
            className="p-2.5 rounded-xl bg-[#151518] border border-[#1c1c1f] text-muted-foreground hover:text-white transition-all"
            title={appSidebarOpen ? 'Minimizar menu lateral' : 'Expandir menu lateral'}
          >
            {appSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>


              <div className="w-10 h-10 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden cursor-pointer hover:border-primary transition-all">
            <div className="w-full h-full rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-black shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              BA
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Premium Sidebar */}
        {appSidebarOpen && (
        <div
          className="h-full flex-shrink-0"
          style={{ width: `${appSidebarWidth}px`, minWidth: `${MIN_APP_SIDEBAR_WIDTH}px`, maxWidth: `${MAX_APP_SIDEBAR_WIDTH}px` }}
        >
        <aside className="w-full h-full border-r border-[#1c1c1f] bg-[#0c0c0e] flex flex-col justify-between py-6 flex-shrink-0 z-10">
          <div className="flex flex-col w-full">
            {!isAppSidebarCompact && (
            <div className="px-6 mb-4">
               <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-30">Network Status</span>
               <div className="flex items-center gap-2 mt-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[10px] font-bold text-white tracking-tight">City Grid v4.2.0-Alpha</span>
               </div>
            </div>
            )}

            {/* Navigation Section */}
            <nav className={`flex flex-col gap-2 ${isAppSidebarCompact ? 'px-2 mt-2' : 'px-3 mt-8'}`}>
              <NavItem compact={isAppSidebarCompact} icon={LayoutDashboard} label="Dashboard" active={currentTab === 'dashboard'} onClick={() => setCurrentTab('dashboard')} />
              <NavItem compact={isAppSidebarCompact} icon={Navigation} label="Traffic Flow" active={currentTab === 'simulation'} onClick={() => setCurrentTab('simulation')} />
              <NavItem compact={isAppSidebarCompact} icon={MapPinned} label="GTFS Map" active={currentTab === 'gtfs_map'} onClick={() => setCurrentTab('gtfs_map')} />
              <NavItem compact={isAppSidebarCompact} icon={Leaf} label="Environmental" active={currentTab === 'analytics'} onClick={() => setCurrentTab('analytics')} />
              <NavItem compact={isAppSidebarCompact} icon={BarChart3} label="Reports" active={currentTab === 'reports'} onClick={() => setCurrentTab('reports')} />
              <NavItem compact={isAppSidebarCompact} icon={Activity} label="Safety Analysis" active={currentTab === 'safety'} onClick={() => setCurrentTab('safety')} />
              <NavItem compact={isAppSidebarCompact} icon={HistoryIcon} label="System Logs" active={currentTab === 'history'} onClick={() => setCurrentTab('history')} />
              <NavItem compact={isAppSidebarCompact} icon={BookOpen} label="Histórico" active={currentTab === 'sim_history'} onClick={() => setCurrentTab('sim_history')} />
            </nav>
          </div>

          {/* Bottom Sidebar Sections */}
          <div className="flex flex-col gap-4 px-3">
            {/* User Profile Info */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-full bg-orange-500 font-black flex items-center justify-center text-white text-xs border border-white/10 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
                BA
              </div>
              {!isAppSidebarCompact && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate tracking-tight text-white group-hover:text-primary transition-colors">Beatriz Antunes</span>
                <span className="text-[10px] text-muted-foreground truncate opacity-40 font-bold uppercase tracking-widest">System Operator</span>
              </div>
              )}
            </div>

          </div>
        </aside>
        </div>
        )}

        {appSidebarOpen && (
          <div
            onMouseDown={(event) => startResize('main', event)}
            className="w-1.5 h-full flex-shrink-0 cursor-col-resize bg-[#1c1c1f] hover:bg-primary/50 transition-colors"
            title="Redimensionar coluna principal"
          />
        )}

        {/* Dynamic Main View */}
        <main className="flex flex-1 overflow-hidden relative">
          {currentTab === 'dashboard' && (
            <DashboardView metrics={metrics} metricHistory={metricHistory} eventLog={eventLog} />
          )}

          {currentTab === 'analytics' && (
            <EnvironmentalView metrics={metrics} co2History={metricHistory} />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              metrics={metrics}
              comparison={comparison}
              metricHistory={metricHistory}
              config={config}
            />
          )}

          {currentTab === 'safety' && (
            <SafetyView
              metrics={metrics}
              config={config}
            />
          )}

          {currentTab === 'history' && (
            <SystemLogsView
              metrics={metrics}
              metricHistory={metricHistory}
              config={config}
              eventLog={eventLog}
            />
          )}

          {currentTab === 'sim_history' && (
            <HistoryView />
          )}

          {currentTab === 'gtfs_map' && (
            <GtfsMapView onSimulateDistrict={handleSimulateDistrict} />
          )}
          
          {currentTab === 'simulation' && (
            <div className="flex flex-col flex-1 min-w-0 bg-[#09090b]">
              <header className="h-20 border-b border-[#1c1c1f] flex items-center justify-between px-8 bg-[#0c0c0e]/50 backdrop-blur-xl">
                <div className="flex flex-col">
                  <h2 className="font-bold text-xl tracking-tight text-white">Simulation Environment</h2>
                  <div className="flex items-center gap-3 text-muted-foreground/60">
                    <span className="text-xs font-medium">Node: <span className="text-white">Local-Host-01</span></span>
                    <span className="w-1 h-1 rounded-full bg-[#3f3f46]" />
                    <span className="text-xs font-medium">Latency: <span className="text-white">12ms</span></span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLeftPanelOpen((prev) => !prev)}
                      className="h-9 w-9 rounded-xl border border-[#1c1c1f] bg-[#151518] text-muted-foreground hover:text-white hover:bg-[#1c1c1f] transition-all flex items-center justify-center"
                      title={leftPanelOpen ? 'Fechar painel esquerdo' : 'Abrir painel esquerdo'}
                    >
                      {leftPanelOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                    </button>
                    <button
                      onClick={() => setRightPanelOpen((prev) => !prev)}
                      className="h-9 w-9 rounded-xl border border-[#1c1c1f] bg-[#151518] text-muted-foreground hover:text-white hover:bg-[#1c1c1f] transition-all flex items-center justify-center"
                      title={rightPanelOpen ? 'Fechar painel direito' : 'Abrir painel direito'}
                    >
                      {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">System Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { engineRef.current?.start(); setConfig((prev) => ({ ...prev, running: true })); }}
                      className="bg-primary text-white px-5 py-2.5 rounded-xl font-black text-xs tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 uppercase"
                    >
                      <Play size={14} fill="white" />
                      Start
                    </button>
                    <button
                      onClick={() => engineRef.current?.pause()}
                      className="border border-[#1c1c1f] bg-[#151518] text-white px-5 py-2.5 rounded-xl font-black text-xs tracking-widest hover:bg-[#1c1c1f] transition-all flex items-center gap-2 active:scale-95 uppercase"
                    >
                      <Pause size={14} />
                      Pause
                    </button>
                    <button
                      onClick={() => { engineRef.current?.pause(); setConfig((prev) => ({ ...prev, running: false })); }}
                      className="border border-red-500/30 bg-red-500/10 text-red-400 px-5 py-2.5 rounded-xl font-black text-xs tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2 active:scale-95 uppercase"
                    >
                      <Square size={14} fill="currentColor" />
                      Stop
                    </button>
                  </div>
                </div>
              </header>

              <div className="flex flex-1 overflow-hidden">
                {leftPanelOpen && (
                  <div
                    className="h-full flex-shrink-0"
                    style={{ width: `${leftPanelWidth}px`, minWidth: `${MIN_PANEL_WIDTH}px`, maxWidth: `${MAX_PANEL_WIDTH}px` }}
                  >
                    <ControlPanel
                      config={config}
                      setConfig={setConfig}
                      engineRef={engineRef}
                      activeRules={activeRules}
                      setActiveRules={setActiveRules}
                    />
                  </div>
                )}

                {leftPanelOpen && (
                  <div
                    onMouseDown={(event) => startResize('left', event)}
                    className="w-1.5 h-full flex-shrink-0 cursor-col-resize bg-[#1c1c1f] hover:bg-primary/50 transition-colors"
                    title="Redimensionar painel esquerdo"
                  />
                )}

                <div className="flex flex-1 min-w-0 relative bg-[#09090b]">
                  <section className="relative flex-1 min-w-0">
                    <SimulationCanvas key={config.gridSize} engineRef={engineRef} />
                  </section>
                </div>

                {rightPanelOpen && (
                  <div
                    onMouseDown={(event) => startResize('right', event)}
                    className="w-1.5 h-full flex-shrink-0 cursor-col-resize bg-[#1c1c1f] hover:bg-primary/50 transition-colors"
                    title="Redimensionar painel direito"
                  />
                )}

                {rightPanelOpen && (
                  <div
                    className="h-full flex-shrink-0"
                    style={{ width: `${rightPanelWidth}px`, minWidth: `${MIN_PANEL_WIDTH}px`, maxWidth: `${MAX_PANEL_WIDTH}px` }}
                  >
                    <MetricsWidget
                      metrics={metrics}
                      comparison={comparison}
                      config={config}
                      metricHistory={metricHistory}
                      sidebar
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}


export default App;
