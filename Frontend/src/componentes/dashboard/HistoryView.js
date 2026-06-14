import * as React from "react";
import { History, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";

const HISTORICO_STORAGE_KEY = 'trafficai_historico_v1';

const classificarCo2 = (valor) => {
  if (valor <= 50)  return { label: 'Bom',       style: 'bg-emerald-500/10 text-emerald-400' };
  if (valor <= 200) return { label: 'Aceitável',  style: 'bg-orange-500/10 text-orange-400'  };
  return               { label: 'Elevado',     style: 'bg-red-500/10 text-red-400'        };
};

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

const ModoTag = ({ modo }) => {
  const style = modo === 'ai'
    ? 'bg-primary/10 text-primary'
    : modo === 'rl'
    ? 'bg-purple-500/10 text-purple-400'
    : 'bg-zinc-500/10 text-zinc-400';
  const label = modo === 'ai' ? 'IA' : modo === 'rl' ? 'RL' : 'Trad.';
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${style}`}>{label}</span>
  );
};

export function HistoryView({ empresa }) {
  const [historico, setHistorico] = React.useState([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORICO_STORAGE_KEY);
      const parsed = JSON.parse(raw || '[]');
      // Filtrar por empresa se fornecida
      const filtrado = empresa
        ? parsed.filter(s => s.empresa === empresa)
        : parsed;
      setHistorico(filtrado);
    } catch {
      setHistorico([]);
    }
  }, [empresa]);

  const limparHistorico = () => {
    try {
      if (empresa) {
        // Apagar só as da empresa atual
        const raw = window.localStorage.getItem(HISTORICO_STORAGE_KEY);
        const todas = JSON.parse(raw || '[]');
        const restantes = todas.filter(s => s.empresa !== empresa);
        window.localStorage.setItem(HISTORICO_STORAGE_KEY, JSON.stringify(restantes));
      } else {
        window.localStorage.removeItem(HISTORICO_STORAGE_KEY);
      }
      setHistorico([]);
    } catch { /* ignore */ }
  };

  // Estatísticas resumo
  const totalSims = historico.length;
  const mediaCo2 = totalSims > 0
    ? (historico.reduce((s, h) => s + (h.co2 || 0), 0) / totalSims).toFixed(1)
    : 0;
  const totalVeiculos = historico.reduce((s, h) => s + (h.veiculos_completados || 0), 0);
  const melhorCo2 = totalSims > 0 ? Math.min(...historico.map(h => h.co2 || 0)).toFixed(1) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History size={18} className="text-primary" />
            <h2 className="text-lg font-black tracking-tight text-white">
              Histórico de Simulações
              {empresa && <span className="text-muted-foreground font-medium ml-2 text-sm">— {empresa}</span>}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Simulações guardadas automaticamente ao pausar
          </p>
        </div>
        {totalSims > 0 && (
          <button
            onClick={limparHistorico}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-black transition-all border border-red-500/10"
          >
            <Trash2 size={14} />
            Limpar histórico
          </button>
        )}
      </div>

      {/* Resumo estatísticas */}
      {totalSims > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Simulações', value: totalSims, unit: '' },
            { label: 'CO₂ Médio', value: mediaCo2, unit: ' kg' },
            { label: 'Melhor CO₂', value: melhorCo2, unit: ' kg' },
            { label: 'Veículos Completados', value: totalVeiculos.toLocaleString('pt-PT'), unit: '' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0c0c0e] border border-[#1c1c1f] rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-white tracking-tight">
                {stat.value}<span className="text-sm text-muted-foreground">{stat.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela / lista */}
      {totalSims === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <History size={40} className="text-muted-foreground/20 mb-4" />
          <p className="text-sm font-bold text-muted-foreground">Nenhuma simulação guardada ainda</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            As simulações são guardadas automaticamente quando pausas a simulação
          </p>
        </div>
      ) : (
        <div className="bg-[#0c0c0e] border border-[#1c1c1f] rounded-2xl overflow-hidden">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-[1fr_80px_90px_90px_90px_80px_70px] gap-4 px-6 py-3 border-b border-[#1c1c1f] bg-[#0f0f12]">
            {['Data', 'Modo', 'Cenário', 'CO₂ Total', 'CO₂ IA', 'Veículos', 'Colisões'].map(h => (
              <span key={h} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{h}</span>
            ))}
          </div>

          {/* Linhas */}
          <div className="divide-y divide-[#1c1c1f]">
            {historico.map((sim, i) => {
              const co2Class = classificarCo2(sim.co2 || 0);
              const prev = historico[i + 1];
              const tendencia = prev
                ? sim.co2 < prev.co2 ? 'down' : sim.co2 > prev.co2 ? 'up' : 'same'
                : 'same';
              return (
                <div
                  key={sim.id}
                  className="grid grid-cols-[1fr_80px_90px_90px_90px_80px_70px] gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-xs font-semibold text-muted-foreground">{formatDate(sim.data)}</span>
                  <span><ModoTag modo={sim.modo} /></span>
                  <span className="text-xs font-semibold text-muted-foreground truncate">{sim.cenario || '—'}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${co2Class.style}`}>
                      {co2Class.label}
                    </span>
                    <span className="text-xs font-bold text-white">{(sim.co2 || 0).toFixed(1)}</span>
                    {tendencia === 'down' && <TrendingDown size={12} className="text-emerald-400" />}
                    {tendencia === 'up'   && <TrendingUp   size={12} className="text-red-400"     />}
                    {tendencia === 'same' && <Minus         size={12} className="text-muted-foreground/30" />}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {sim.co2_ai ? `${sim.co2_ai.toFixed(1)} kg` : '—'}
                  </span>
                  <span className="text-xs font-bold text-white">{sim.veiculos_completados ?? '—'}</span>
                  <span className="text-xs font-bold text-white">{sim.colisoes ?? '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
