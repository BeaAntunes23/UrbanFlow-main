import React from 'react';
import { Download, Activity, Siren, ShieldCheck, TimerReset, Car, Leaf, Clock, Users } from 'lucide-react';

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildStateEntries = (metrics, metricHistory, config) => {
  const now = new Date();
  const formatTime = (date) => date.toLocaleTimeString('pt-PT', { hour12: false });

  const entries = [
    {
      time: formatTime(now),
      category: 'session',
      status: 'active',
      message: `Simulação ativa — cenário "${config?.scenario || 'normal'}", modo "${config?.mode || 'ai'}".`,
    },
    {
      time: formatTime(new Date(now.getTime() - 20000)),
      category: 'flow',
      status: 'info',
      message: `Taxa de fluxo atual: ${asNumber(metrics.flowRate).toFixed(2)} veículos/min.`,
    },
    {
      time: formatTime(new Date(now.getTime() - 40000)),
      category: 'safety',
      status: asNumber(metrics.totalCollisions) > 0 ? 'warning' : 'ok',
      message: asNumber(metrics.totalCollisions) > 0
        ? `${asNumber(metrics.totalCollisions)} colisão(ões) registada(s) nesta sessão.`
        : 'Sem colisões registadas no intervalo ativo.',
    },
    {
      time: formatTime(new Date(now.getTime() - 60000)),
      category: 'emergency',
      status: asNumber(metrics.emergencyResponseTime) > 18 ? 'warning' : 'ok',
      message: `Resposta de emergência média: ${asNumber(metrics.emergencyResponseTime).toFixed(1)}s.`,
    },
    {
      time: formatTime(new Date(now.getTime() - 80000)),
      category: 'environment',
      status: asNumber(metrics.co2Emissions) > 300 ? 'warning' : 'info',
      message: `Emissões CO₂ acumuladas: ${asNumber(metrics.co2Emissions).toFixed(1)}g.`,
    },
    {
      time: formatTime(new Date(now.getTime() - 100000)),
      category: 'pedestrians',
      status: 'info',
      message: `${asNumber(metrics.pedestriansCompleted)} peões completaram travessia — ${asNumber(metrics.pedestriansActive)} ativos.`,
    },
  ];

  if (metricHistory.length >= 2) {
    const last = metricHistory[metricHistory.length - 1];
    const previous = metricHistory[metricHistory.length - 2];
    const deltaWait = asNumber(last.avgWaitTime) - asNumber(previous.avgWaitTime);
    entries.push({
      time: formatTime(new Date(now.getTime() - 120000)),
      category: 'optimization',
      status: deltaWait > 2 ? 'warning' : 'ok',
      message: `Tempo de espera médio variou ${deltaWait >= 0 ? '+' : ''}${deltaWait.toFixed(2)}s na última janela de amostragem.`,
    });
  }

  return entries;
};

const exportLogs = (stateRows, eventRows) => {
  const headers = ['time', 'category', 'status', 'message'];
  const lines = [headers.join(',')];
  for (const row of [...eventRows, ...stateRows]) {
    lines.push(headers.map((h) => JSON.stringify(String(row[h] ?? ''))).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'trafficai_system_logs.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const STATUS_COLORS = {
  critical: 'text-red-400',
  warning:  'text-orange-400',
  ok:       'text-emerald-400',
  info:     'text-blue-400',
  active:   'text-blue-400',
};

const CATEGORY_COLORS = {
  collision:   'bg-red-500/10 text-red-400 border-red-500/20',
  safety:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  emergency:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  flow:        'bg-blue-500/10 text-blue-400 border-blue-500/20',
  environment: 'bg-green-500/10 text-green-400 border-green-500/20',
  optimization:'bg-purple-500/10 text-purple-400 border-purple-500/20',
  network:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  system:      'bg-white/5 text-white/60 border-white/10',
  session:     'bg-white/5 text-white/60 border-white/10',
  pedestrians: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const categoryClass = (cat) => CATEGORY_COLORS[cat] || 'bg-white/5 text-white/60 border-white/10';
const statusClass = (status) => STATUS_COLORS[status] || 'text-white/60';

export const SystemLogsView = ({ metrics, metricHistory, config, eventLog = [] }) => {
  const stateRows = React.useMemo(
    () => buildStateEntries(metrics, metricHistory, config),
    [metrics, metricHistory, config],
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] p-8 hide-scrollbar">
      <header className="mb-8 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">System Logs</h1>
          <p className="text-sm text-muted-foreground font-medium opacity-70">
            Estado atual da simulação e registo cumulativo de eventos.
          </p>
        </div>
        <button
          onClick={() => exportLogs(stateRows, eventLog)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[#1c1c1f] bg-[#151518] text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#1c1c1f] transition-all"
        >
          <Download size={14} />
          Export Logs CSV
        </button>
      </header>

      {/* Summary cards — 2 rows of 4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">Eventos</div>
          <div className="text-4xl font-black text-white">{eventLog.length}</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Flow</div>
            <Activity size={16} className="text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{asNumber(metrics.flowRate).toFixed(1)}</div>
          <div className="text-[10px] text-muted-foreground/40 mt-1">veic/min</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Emergência</div>
            <Siren size={16} className="text-orange-400" />
          </div>
          <div className="text-3xl font-black text-white">{asNumber(metrics.emergencyResponseTime).toFixed(1)}s</div>
          <div className="text-[10px] text-muted-foreground/40 mt-1">resposta média</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Evitadas</div>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{asNumber(metrics.collisionAvoided)}</div>
          <div className="text-[10px] text-muted-foreground/40 mt-1">colisões evitadas</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">CO₂</div>
            <Leaf size={16} className="text-green-400" />
          </div>
          <div className="text-3xl font-black text-white">{asNumber(metrics.co2Emissions).toFixed(0)}g</div>
          <div className="text-[10px] text-muted-foreground/40 mt-1">emissões acumuladas</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Espera Média</div>
            <Clock size={16} className="text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{asNumber(metrics.avgWaitTime).toFixed(1)}s</div>
          <div className="text-[10px] text-muted-foreground/40 mt-1">todos os veículos</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Completados</div>
            <Car size={16} className="text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{asNumber(metrics.vehiclesCompleted)}</div>
          <div className="text-[10px] text-muted-foreground/40 mt-1">veículos</div>
        </div>
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Ativos</div>
            <Users size={16} className="text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white">{asNumber(metrics.vehiclesActive)}</div>
          <div className="text-[10px] text-muted-foreground/40 mt-1">veículos + {asNumber(metrics.pedestriansActive)} peões</div>
        </div>
      </div>

      {/* Cumulative event log */}
      <section className="bg-[#151518] border border-[#1c1c1f] rounded-[2rem] overflow-hidden mb-6">
        <div className="px-8 py-6 border-b border-[#1c1c1f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TimerReset size={18} className="text-orange-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Registo de Eventos</h2>
              <p className="text-xs text-muted-foreground mt-1">Eventos detetados em tempo real durante a simulação.</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{eventLog.length} / 200</span>
        </div>

        <div className="overflow-x-auto p-8">
          {eventLog.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/40 text-sm font-medium">
              Aguardando eventos — inicia a simulação para começar a registar.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/40 border-b border-[#1c1c1f]">
                  <th className="pb-4 pr-6 whitespace-nowrap">Hora</th>
                  <th className="pb-4 pr-6">Categoria</th>
                  <th className="pb-4 pr-6">Status</th>
                  <th className="pb-4">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {eventLog.map((row, index) => (
                  <tr key={index} className="border-b border-[#1c1c1f] last:border-b-0">
                    <td className="py-3.5 pr-6 text-xs text-white/50 font-mono whitespace-nowrap">{row.time}</td>
                    <td className="py-3.5 pr-6">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${categoryClass(row.category)}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className={`py-3.5 pr-6 text-xs font-black uppercase tracking-widest ${statusClass(row.status)}`}>{row.status}</td>
                    <td className="py-3.5 text-xs text-muted-foreground">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Current state snapshot */}
      <section className="bg-[#151518] border border-[#1c1c1f] rounded-[2rem] overflow-hidden">
        <div className="px-8 py-6 border-b border-[#1c1c1f] flex items-center gap-3">
          <Activity size={18} className="text-blue-400" />
          <div>
            <h2 className="text-lg font-bold text-white">Estado Atual</h2>
            <p className="text-xs text-muted-foreground mt-1">Snapshot das métricas atuais da simulação.</p>
          </div>
        </div>

        <div className="overflow-x-auto p-8">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/40 border-b border-[#1c1c1f]">
                <th className="pb-4 pr-6 whitespace-nowrap">Hora</th>
                <th className="pb-4 pr-6">Categoria</th>
                <th className="pb-4 pr-6">Status</th>
                <th className="pb-4">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map((row, index) => (
                <tr key={`${row.time}-${index}`} className="border-b border-[#1c1c1f] last:border-b-0">
                  <td className="py-3.5 pr-6 text-xs text-white/50 font-mono whitespace-nowrap">{row.time}</td>
                  <td className="py-3.5 pr-6">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${categoryClass(row.category)}`}>
                      {row.category}
                    </span>
                  </td>
                  <td className={`py-3.5 pr-6 text-xs font-black uppercase tracking-widest ${statusClass(row.status)}`}>{row.status}</td>
                  <td className="py-3.5 text-xs text-muted-foreground">{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
