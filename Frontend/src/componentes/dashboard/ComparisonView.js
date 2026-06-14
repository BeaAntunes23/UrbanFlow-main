import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { Zap, Timer, Wind, ShieldAlert, TrendingUp, TrendingDown, Activity, Car, Leaf } from 'lucide-react';

// CO2 classification thresholds based on real vehicle emission factors (EURO 6 / EEA)
// Units: kg CO2 total emitted during simulation
// Bom: fleet below ~50 kg (low traffic / short simulation)
// Aceitável: 50–200 kg (moderate urban traffic)
// Elevado: above 200 kg (heavy traffic, long simulation)
const CO2_THRESHOLDS = [
  { label: 'Bom',       max: 50,       color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { label: 'Aceitável', max: 200,      color: '#f97316', bg: 'bg-orange-500/10',  text: 'text-orange-400' },
  { label: 'Elevado',   max: Infinity, color: '#ef4444', bg: 'bg-red-500/10',     text: 'text-red-400'    },
];

const classificarCo2 = (valor) => {
  if (valor <= 50)  return CO2_THRESHOLDS[0];
  if (valor <= 200) return CO2_THRESHOLDS[1];
  return CO2_THRESHOLDS[2];
};

const ComparisonCard = ({ label, aiValue, tradValue, unit, icon: Icon, lowerIsBetter = true }) => {
  const aiNum = Number(aiValue) || 0;
  const tradNum = Number(tradValue) || 0;
  const diff = tradNum === 0 ? 0 : ((aiNum - tradNum) / tradNum * 100);
  const aiWins = lowerIsBetter ? aiNum <= tradNum : aiNum >= tradNum;

  return (
    <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-muted-foreground" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl p-3 border ${aiWins ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#0f0f12] border-[#1c1c1f]'}`}>
          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">AI</div>
          <div className="text-2xl font-black text-white tracking-tight">{aiNum.toFixed(1)}<span className="text-xs text-muted-foreground ml-1">{unit}</span></div>
        </div>
        <div className={`rounded-xl p-3 border ${!aiWins ? 'bg-blue-500/5 border-blue-500/20' : 'bg-[#0f0f12] border-[#1c1c1f]'}`}>
          <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Tradicional</div>
          <div className="text-2xl font-black text-white tracking-tight">{tradNum.toFixed(1)}<span className="text-xs text-muted-foreground ml-1">{unit}</span></div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {diff !== 0 && (
          <>
            {(lowerIsBetter ? diff < 0 : diff > 0) ? (
              <TrendingDown size={12} className="text-emerald-400" />
            ) : (
              <TrendingUp size={12} className="text-red-400" />
            )}
            <span className={`text-[10px] font-bold ${(lowerIsBetter ? diff < 0 : diff > 0) ? 'text-emerald-400' : 'text-red-400'}`}>
              {Math.abs(diff).toFixed(1)}% {(lowerIsBetter ? diff < 0 : diff > 0) ? 'melhor' : 'pior'} com AI
            </span>
          </>
        )}
        {diff === 0 && <span className="text-[10px] text-muted-foreground">Sem diferença</span>}
      </div>
    </div>
  );
};

export const ComparisonView = ({ metrics, comparison, config, metricHistory }) => {
  const barData = [
    { name: 'Tempo Espera', ai: Number(metrics.avgWaitTime) || 0, trad: Number(comparison.avgWaitTime) || 0 },
    { name: 'Fluxo', ai: Number(metrics.flowRate) || 0, trad: Number(comparison.flowRate) || 0 },
    { name: 'CO2', ai: Number(metrics.co2Emissions) || 0, trad: Number(comparison.co2Emissions) || 0 },
    { name: 'Emergência', ai: Number(metrics.emergencyResponseTime) || 0, trad: Number(comparison.emergencyResponseTime) || 0 },
  ];

  const maxWait = Math.max(barData[0].ai, barData[0].trad, 1);
  const maxFlow = Math.max(barData[1].ai, barData[1].trad, 1);
  const maxCO2 = Math.max(barData[2].ai, barData[2].trad, 1);
  const maxEmerg = Math.max(barData[3].ai, barData[3].trad, 1);

  const radarData = [
    { metric: 'Espera', ai: 100 - Math.min(100, (barData[0].ai / maxWait) * 100), trad: 100 - Math.min(100, (barData[0].trad / maxWait) * 100) },
    { metric: 'Fluxo', ai: Math.min(100, (barData[1].ai / maxFlow) * 100), trad: Math.min(100, (barData[1].trad / maxFlow) * 100) },
    { metric: 'Emissões', ai: 100 - Math.min(100, (barData[2].ai / maxCO2) * 100), trad: 100 - Math.min(100, (barData[2].trad / maxCO2) * 100) },
    { metric: 'Emergência', ai: 100 - Math.min(100, (barData[3].ai / maxEmerg) * 100), trad: 100 - Math.min(100, (barData[3].trad / maxEmerg) * 100) },
    { metric: 'Veículos', ai: Math.min(100, ((Number(metrics.vehiclesCompleted) || 0) / Math.max(Number(comparison.vehiclesCompleted) || 1, 1)) * 100), trad: 100 },
  ];

  const aiMode = config.mode === 'ai' ? 'ai' : config.mode;
  const shadowMode = config.mode === 'ai' ? 'traditional' : 'ai';

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] p-8 hide-scrollbar">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-white">AI vs Tradicional</h1>
        <p className="text-muted-foreground text-sm font-medium opacity-70 mt-1">
          Comparação em tempo real · Modo principal: <span className="text-emerald-400 font-bold uppercase">{aiMode}</span> · Sombra: <span className="text-blue-400 font-bold uppercase">{shadowMode}</span>
        </p>
      </header>

      {/* Top metrics comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <ComparisonCard label="Tempo de Espera" aiValue={metrics.avgWaitTime} tradValue={comparison.avgWaitTime} unit="s" icon={Timer} lowerIsBetter />
        <ComparisonCard label="Taxa de Fluxo" aiValue={metrics.flowRate} tradValue={comparison.flowRate} unit="/min" icon={Activity} lowerIsBetter={false} />
        <ComparisonCard label="Emissões CO2" aiValue={metrics.co2Emissions} tradValue={comparison.co2Emissions} unit="kg" icon={Wind} lowerIsBetter />
        <ComparisonCard label="Resp. Emergência" aiValue={metrics.emergencyResponseTime} tradValue={comparison.emergencyResponseTime} unit="s" icon={ShieldAlert} lowerIsBetter />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Bar chart */}
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-4">Métricas Comparativas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1f" />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151518', border: '1px solid #1c1c1f', borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: '#fff', fontWeight: 800 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, fontWeight: 700 }}
                  formatter={(value) => value === 'ai' ? 'AI' : 'Tradicional'}
                />
                <Bar dataKey="ai" fill="#10b981" radius={[6, 6, 0, 0]} name="ai" />
                <Bar dataKey="trad" fill="#3b82f6" radius={[6, 6, 0, 0]} name="trad" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar chart */}
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-4">Perfil de Desempenho</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#1c1c1f" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#71717a', fontSize: 10 }} />
                <PolarRadiusAxis tick={false} domain={[0, 100]} />
                <Radar name="AI" dataKey="ai" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Tradicional" dataKey="trad" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4 text-center">
          <Car size={16} className="text-emerald-400 mx-auto mb-2" />
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Veículos AI</div>
          <div className="text-xl font-black text-white">{metrics.vehiclesActive || 0}</div>
          <div className="text-[9px] text-emerald-400 font-bold">{metrics.vehiclesCompleted || 0} concluídos</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4 text-center">
          <Car size={16} className="text-blue-400 mx-auto mb-2" />
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Veículos Trad.</div>
          <div className="text-xl font-black text-white">{comparison.vehiclesActive || 0}</div>
          <div className="text-[9px] text-blue-400 font-bold">{comparison.vehiclesCompleted || 0} concluídos</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4 text-center">
          <Zap size={16} className="text-orange-400 mx-auto mb-2" />
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Tempo Simulação</div>
          <div className="text-xl font-black text-white">{(Number(metrics.simulationTime) || 0).toFixed(0)}s</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4 text-center">
          <Activity size={16} className="text-purple-400 mx-auto mb-2" />
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Cenário</div>
          <div className="text-lg font-black text-white capitalize">{config.scenario?.replace(/_/g, ' ') || 'Normal'}</div>
        </div>
      </div>

      {/* CO2 Classification Comparison Panel */}
      <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Leaf size={16} className="text-emerald-400" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Classificação CO₂ — ASHRAE / OSHA</h3>
        </div>

        {/* Threshold legend */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {CO2_THRESHOLDS.map((t, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${t.bg}`}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${t.text}`}>{t.label}</span>
              <span className="text-[10px] text-muted-foreground font-bold">
                {i === 0 ? '≤ 50 kg' : i === 1 ? '51–200 kg' : '> 200 kg'}
              </span>
            </div>
          ))}
        </div>

        {/* Side by side classification */}
        <div className="grid grid-cols-2 gap-4">
          {[{ label: 'AI', val: Number(metrics.co2Emissions) || 0, colorClass: 'text-emerald-400', dot: 'bg-emerald-500' },
            { label: 'Tradicional', val: Number(comparison.co2Emissions) || 0, colorClass: 'text-blue-400', dot: 'bg-blue-500' }]
            .map(({ label, val, colorClass, dot }) => {
              const cls = classificarCo2(val);
              const pct = Math.min(100, (val / 200) * 100);
              return (
                <div key={label} className="bg-[#0f0f12] border border-[#1c1c1f] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${colorClass}`}>{label}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-black text-white">{val.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">ppm</span>
                    <span className={`ml-1 text-[10px] font-black px-2 py-0.5 rounded-full ${cls.bg} ${cls.text}`}>{cls.label}</span>
                  </div>
                  {/* Progress bar up to 5000 ppm */}
                  <div className="w-full h-2 bg-[#1c1c1f] rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: cls.color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground">0</span>
                    <span className="text-[9px] text-muted-foreground">50 kg</span>
                    <span className="text-[9px] text-muted-foreground">200 kg</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-3">Resumo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-white font-bold">Motor AI</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Ajusta semáforos dinamicamente com base em filas e veículos de emergência.
              Reduz tempos de espera e prioriza ambulâncias automaticamente.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-white font-bold">Motor Tradicional</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Semáforos com ciclos fixos de 30s. Sem adaptação a filas nem prioridade
              para veículos de emergência.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
