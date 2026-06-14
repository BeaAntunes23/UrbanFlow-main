import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Smile,
  Car,
  Activity,
  Zap,
  Crosshair,
  Maximize2,
  ZoomIn,
  Layers,
  ShieldAlert,
  Cpu,
  Gamepad2,
  ChevronRight,
  Building2,
  MapPinned,
  MessageSquareCode,
  Sparkles,
  X,
  Send,
  ShieldCheck,
  Clock,
  Ban,
  TrendingDown,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const SCENARIOS = [
  { value: 'normal', label: 'Normal', icon: Smile },
  { value: 'rush_hour', label: 'Heavy', icon: Car },
  { value: 'accident', label: 'Accident', icon: Activity },
  { value: 'emergency', label: 'Emergency', icon: ShieldAlert },
  { value: 'vila_real', label: 'Vila Real', icon: Building2 },
  { value: 'portugal', label: 'Portugal+', icon: MapPinned },
  { value: 'portugal_litoral', label: 'Litoral', icon: MapPinned },
  { value: 'portugal_interior', label: 'Interior', icon: MapPinned },
  { value: 'portugal_sul', label: 'Sul', icon: MapPinned },
];

const RULE_EXAMPLES = [
  'Priorizar ambulâncias',
  'Reduzir espera na hora de ponta',
  'Bloquear intersecção central',
  'Extender verde 20 segundos para autocarros',
  'Descongestionar fila de carros',
];

const RULE_TYPE_META = {
  priority: { label: 'Prioridade',  icon: ShieldCheck,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  timing:   { label: 'Timing',      icon: Clock,        color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  block:    { label: 'Bloqueio',    icon: Ban,          color: 'text-red-400',     bg: 'bg-red-500/10'     },
  density:  { label: 'Densidade',   icon: TrendingDown, color: 'text-orange-400',  bg: 'bg-orange-500/10'  },
};

const TARGET_LABELS = { ambulance: 'Ambulância', bus: 'Autocarro', car: 'Carro', pedestrian: 'Peão', all: 'Todos' };

// ── Fallback local: replica e expande a lógica de rule_engine.py em JS ────────
// Usado quando o backend não está disponível (ex: demo sem servidor)
const _normalize = (text) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const _extractTarget = (n) => {
  if (/ambulancia|emergencia|socorro|sirene/.test(n))        return 'ambulance';
  if (/autocarro|onibus|bus|transporte publico/.test(n))     return 'bus';
  if (/carro|automovel|veiculo|ligeiro|particular/.test(n))  return 'car';
  if (/peao|pedestre|pessoa|passante/.test(n))               return 'pedestrian';
  return 'all';
};

const _extractScenario = (n) => {
  if (/hora de ponta|rush|pico|congestionamento/.test(n))    return 'rush_hour';
  if (/acidente|colisao|embate/.test(n))                     return 'accident';
  if (/emergencia|ambulancia|socorro/.test(n))               return 'emergency';
  if (/normal|tranquilo|baixo fluxo/.test(n))                return 'normal';
  return null;
};

const _extractTimeWindow = (original) => {
  const m = original.match(/entre\s+(\d{1,2}:\d{2})\s+(?:e|ate)\s+(\d{1,2}:\d{2})/i);
  return m ? [m[1], m[2]] : [null, null];
};

const _extractSeconds = (n) => {
  const sec = n.match(/(\d+)\s*(?:s|seg|segundo|segundos)\b/);
  if (sec) return parseInt(sec[1]);
  const min = n.match(/(\d+)\s*(?:m|min|minuto|minutos)\b/);
  if (min) return parseInt(min[1]) * 60;
  const bare = n.match(/\b(\d{1,3})\b/);
  if (bare && /verde|semaforo|tempo|fase|ciclo/.test(n)) return parseInt(bare[1]);
  return null;
};

const _extractReduceWait = (n) => {
  const pct = n.match(/(\d{1,2}|100)\s*%/);
  if (pct) return Math.max(0.1, Math.min(1.0, +(1.0 - parseInt(pct[1]) / 100).toFixed(2)));
  if (/reduzir espera|diminuir espera|aliviar fila|descongestionar|melhorar fluxo/.test(n)) return 0.8;
  if (/muito congestionado|critico|urgente/.test(n)) return 0.65;
  if (/ligeiramente|pouco|suave/.test(n)) return 0.9;
  return null;
};

const translateRuleLocal = (inputText) => {
  const original = inputText.trim();
  const n = _normalize(original);

  let type = 'timing';
  if (/bloquear|fechar|interditar|cortar|impedir acesso/.test(n))                     type = 'block';
  else if (/prioridade|priorizar|dar prioridade|preferencia|preferir/.test(n))        type = 'priority';
  else if (/densidade|congestion|fila|espera|fluxo|descongestionar|aliviar/.test(n)) type = 'density';

  const target        = _extractTarget(n);
  const scenario      = _extractScenario(n);
  const [ts, te]      = _extractTimeWindow(original);
  const extendSec     = _extractSeconds(n);
  const reduceWait    = _extractReduceWait(n);

  const action = { green_priority: false, extend_green_seconds: null, block_intersection: false, reduce_wait_factor: null };
  if (type === 'priority') action.green_priority = true;
  else if (type === 'block') action.block_intersection = true;
  else if (type === 'timing') action.extend_green_seconds = extendSec ?? 10;
  else if (type === 'density') action.reduce_wait_factor = reduceWait ?? 0.85;

  return {
    type, target,
    conditions: { time_start: ts, time_end: te, scenario, location: 'all' },
    action,
    description_pt: original,
  };
};
// ──────────────────────────────────────────────────────────────────────────────

export const ControlPanel = ({ config, setConfig, engineRef, activeRules, setActiveRules }) => {
  const [ruleInput, setRuleInput] = useState('');
  const [ruleLoading, setRuleLoading] = useState(false);

  const updateConfig = (patch) => {
    setConfig((previous) => {
      const next = { ...previous, ...patch };
      const engine = engineRef.current;
      if (engine) {
        if (patch.scenario) engine.setScenario(patch.scenario);
        if (patch.mode) engine.setMode(patch.mode);
        if (patch.speed !== undefined) engine.setSpeed(patch.speed);
      }
      return next;
    });
  };

  const handleTranslateRule = async (text) => {
    const input = (text || ruleInput).trim();
    if (!input) return;
    setRuleLoading(true);
    let rule = null;
    let usedFallback = false;
    try {
      const { data } = await axios.post(`${API}/rules/translate`, { text: input });
      if (data.ok && data.rule) {
        rule = data.rule;
      }
    } catch {
      // Backend indisponível — usar tradução local
      usedFallback = true;
    } finally {
      setRuleLoading(false);
    }

    if (!rule) {
      rule = translateRuleLocal(input);
      usedFallback = true;
    }

    const engine = engineRef.current;
    if (engine) engine.applyRule(rule);
    setActiveRules(prev => [...prev, { ...rule, inputText: input }]);
    setRuleInput('');
    if (usedFallback) {
      toast.success(`Regra aplicada (local): ${rule.type} → ${TARGET_LABELS[rule.target] || rule.target}`);
    } else {
      toast.success(`Regra aplicada: ${rule.type} → ${TARGET_LABELS[rule.target] || rule.target}`);
    }
  };

  const handleRemoveRule = (ruleId) => {
    const engine = engineRef.current;
    if (engine) engine.removeRule(ruleId);
    setActiveRules(prev => prev.filter(r => r.id !== ruleId));
    toast.info('Regra removida.');
  };

  return (
    <aside className="w-full h-full border-r border-[#1c1c1f] bg-[#0c0c0e] p-6 pt-8 overflow-y-auto flex flex-col gap-9 flex-shrink-0 hide-scrollbar shadow-xl z-10">

      {/* Scenario Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-orange-500">
          <Activity size={18} strokeWidth={2.5} />
          <h3 className="text-xs font-black uppercase tracking-widest">Tipo de Cenário</h3>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateConfig({ scenario: s.value })}
              className={`flex flex-col items-center justify-center gap-2.5 p-3.5 rounded-2xl transition-all border ${config.scenario === s.value
                  ? 'bg-[#1c1c1f] border-primary text-white shadow-lg shadow-primary/10'
                  : 'bg-[#151518] border-transparent text-muted-foreground hover:bg-[#1c1c1f] hover:text-foreground'
                }`}
            >
              <s.icon size={20} strokeWidth={config.scenario === s.value ? 2.5 : 2} />
              <span className="text-[10px] font-bold leading-none">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Operation Mode Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-orange-500">
          <Crosshair size={18} strokeWidth={2.5} />
          <h3 className="text-xs font-black uppercase tracking-widest">Modo de Operação</h3>
        </div>
        <div className="p-1.5 bg-[#151518] rounded-2xl flex gap-1 border border-[#1c1c1f]">
          <button
            onClick={() => updateConfig({ mode: 'ai' })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${config.mode === 'ai' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-white'
              }`}
          >
            <Cpu size={16} />
            IA-Driven
          </button>
          <button
            onClick={() => updateConfig({ mode: 'traditional' })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${config.mode === 'traditional' ? 'bg-[#1c1c1f] text-white shadow-md' : 'text-muted-foreground hover:text-white'
              }`}
          >
            <Gamepad2 size={16} />
            Manual
          </button>
        </div>
      </section>

      {/* Grid Complexity Section */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-500">
            <Layers size={18} strokeWidth={2.5} />
            <h3 className="text-xs font-black uppercase tracking-widest">Complexidade da Grelha</h3>
          </div>
          <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[10px] font-black border border-orange-500/20">
            {config.gridSize}x{config.gridSize}
          </span>
        </div>
        <div className="px-1">
          <input
            type="range"
            min={4}
            max={10}
            step={2}
            value={config.gridSize}
            onChange={(e) => updateConfig({ gridSize: parseInt(e.target.value) })}
            className="w-full h-1 bg-[#1c1c1f] rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between mt-3 px-0.5">
            {[4, 6, 8, 10].map(v => (
              <span key={v} className={`text-[10px] font-bold transition-colors ${config.gridSize === v ? 'text-orange-500' : 'text-muted-foreground/30'}`}>{v}x{v}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Speed Slider Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-500">
            <Zap size={18} strokeWidth={2.5} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Simulation Speed</h3>
          </div>
          <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[10px] font-black border border-orange-500/20">
            {config.speed.toFixed(1)}x
          </span>
        </div>
        <div className="px-2 pt-2">
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={config.speed}
            onChange={(e) => updateConfig({ speed: parseFloat(e.target.value) })}
            className="w-full h-1 bg-[#1c1c1f] rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between mt-3">
            {[0.5, 1.0, 2.0, 3.0, 4.0, 5.0].map(v => (
              <span key={v} className="text-[10px] font-bold text-muted-foreground/40">{v.toFixed(1)}x</span>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <div className="relative group overflow-hidden rounded-3xl aspect-[16/10] bg-[#151518] border border-[#1c1c1f] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-transparent to-black/60 pointer-events-none z-10" />
        <img
          src="https://images.unsplash.com/photo-1543857321-72f1228205f4?q=80&w=800&auto=format&fit=crop"
          alt="Map Preview"
          className="w-full h-full object-cover opacity-30 grayscale transition-transform duration-700 group-hover:scale-110"
        />

        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 bg-[#0c0c0e]/80 backdrop-blur-md rounded-full border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Livestream Feed</span>
        </div>

        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button className="p-2 bg-[#0c0c0e]/80 backdrop-blur-md rounded-xl border border-white/5 text-white/60 hover:text-white transition-colors">
            <ZoomIn size={16} />
          </button>
          <button className="p-2 bg-[#0c0c0e]/80 backdrop-blur-md rounded-xl border border-white/5 text-white/60 hover:text-white transition-colors">
            <Layers size={16} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between">
          <div className="flex flex-col">
            <h4 className="text-sm font-black text-white tracking-tight">Metropolitan Sector 4-A</h4>
            <span className="text-[10px] font-bold text-white/40">Active Agents: 1,428 | Grid Load: 64%</span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-bold text-white transition-all">
            EXPAND VIEW
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* ======== MOTOR DE REGRAS — secção principal ======== */}
      <section className="flex flex-col gap-4">
        {/* Header com destaque */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20">
            <MessageSquareCode size={15} className="text-primary" strokeWidth={2.5} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-primary">Motor de Regras</h3>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
            Vibe Coding
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground/60 font-medium leading-relaxed">
          Escreve uma instrução em português e a IA converte-a em lógica de controlo de tráfego em tempo real.
        </p>

        {/* Input de linguagem natural */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={ruleInput}
              onChange={(e) => setRuleInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTranslateRule()}
              placeholder='Ex: "Priorizar ambulâncias"'
              className="flex-1 bg-[#151518] border border-primary/30 focus:border-primary rounded-xl px-3 py-2.5 text-xs font-semibold text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
            <button
              onClick={() => handleTranslateRule()}
              disabled={ruleLoading || !ruleInput.trim()}
              className="px-3 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all flex items-center gap-1.5"
            >
              {ruleLoading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send size={14} strokeWidth={2.5} />}
            </button>
          </div>

          {/* Exemplos rápidos */}
          <div className="flex flex-wrap gap-1.5">
            {RULE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => handleTranslateRule(ex)}
                disabled={ruleLoading}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#151518] border border-[#1c1c1f] text-muted-foreground hover:text-white hover:border-primary/40 transition-all disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Regras ativas */}
        {activeRules.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
              Regras ativas ({activeRules.length})
            </span>
            {activeRules.map((rule) => {
              const meta = RULE_TYPE_META[rule.type] || RULE_TYPE_META.timing;
              const MetaIcon = meta.icon;
              return (
                <div key={rule.id} className={`flex items-start gap-3 p-3 rounded-xl border border-[#1c1c1f] ${meta.bg}`}>
                  <div className={`mt-0.5 ${meta.color}`}>
                    <MetaIcon size={14} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${meta.color}`}>
                      {meta.label} — {TARGET_LABELS[rule.target] || rule.target}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 font-medium truncate">
                      {rule.inputText || rule.description_pt}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveRule(rule.id)}
                    className="text-muted-foreground/30 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeRules.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0f0f12] border border-dashed border-[#1c1c1f]">
            <Sparkles size={13} className="text-muted-foreground/20" />
            <span className="text-[10px] text-muted-foreground/30 font-medium">Nenhuma regra ativa — experimenta acima</span>
          </div>
        )}
      </section>

    </aside>
  );
};

