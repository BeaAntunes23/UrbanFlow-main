import React from 'react';
import {
  FileText,
  Download,
  Clock3,
  ArrowUp,
  ArrowDown,
  Leaf,
  Shield,
  Ambulance,
  Footprints,
  CheckCircle2,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;
const LOCAL_API = 'http://localhost:8000/api';

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pctDiff = (a, b) => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return ((a - b) / Math.abs(b)) * 100;
};

const formatSignedPct = (value) => {
  const abs = Math.abs(value).toFixed(1);
  return `${value >= 0 ? '+' : '-'}${abs}%`;
};

const getTrend = (history, key) => {
  if (!history || history.length < 2) return 0;
  const recent = history.slice(-10);
  const mid = Math.floor(recent.length / 2);
  const early = recent.slice(0, mid);
  const late = recent.slice(mid);

  const avg = (arr) => {
    if (!arr.length) return 0;
    return arr.reduce((sum, item) => sum + asNumber(item[key]), 0) / arr.length;
  };

  const earlyAvg = avg(early);
  const lateAvg = avg(late);
  if (earlyAvg === 0) return 0;
  return pctDiff(lateAvg, earlyAvg);
};

const getContextualRecommendation = (metrics, scenario, mode) => {
  const wait = asNumber(metrics?.avgWaitTime);
  const emerg = asNumber(metrics?.emergencyResponseTime);
  const co2 = asNumber(metrics?.co2Emissions);
  const collisions = asNumber(metrics?.totalCollisions);

  // Emergência crítica
  if (scenario === 'emergency') {
    if (emerg > 8) {
      return '🚑 Cenário de emergência: Reduzir ciclo semafórico máximo para <30s e aumentar pré-emção para ambulâncias.';
    }
    return '🚑 Gestão de emergência otimizada. Manter configuração atual.';
  }

  // Hora de ponta
  if (scenario === 'rush_hour') {
    if (wait > 30) {
      return '⚠️ Hora de ponta detectada: Aumentar janela de pré-emção AI de 22→28s e reduzir amarelo para 2s.';
    }
    if (wait > 20) {
      return '⚠️ Hora de ponta: Aplicar AI heurístico com sensibilidade de fila aumentada (+20%).';
    }
    return '✓ Gestão de hora de ponta eficiente. Manter modo AI.';
  }

  // Acidente/bloqueio
  if (scenario === 'accident') {
    if (collisions > 5) {
      return '⚠️ Cenário de acidente: Implementar rerouting automático e aumentar ciclos alternativos.';
    }
    return '✓ Recuperação de acidente em progresso. Continuar com modo AI.';
  }

  // Modo RL
  if (mode === 'rl') {
    if (wait > 35) {
      return '🤖 RL subótimo neste cenário. Recomenda-se: (1) Aumentar episódios de treino de 150→300, (2) Ajustar taxa de aprendizagem α de 0.2→0.3.';
    }
    if (wait > 25) {
      return '🤖 RL em convergência. Continuar treino com epsilon decay atual (0.9994).';
    }
    return '🤖 RL convergindo bem. Política estável neste cenário.';
  }

  // Normal/padrão
  if (wait > 25) {
    return '💡 Tempo de espera elevado. Ativar AI heurístico com threshold de fila <15s para verde mais curto.';
  }
  if (co2 > 50) {
    return '🌱 Emissões elevadas: Priorizar fluxo contínuo sobre ciclos curtos (aumentar verde de 20→25s).';
  }

  return '✓ Setup estável. Manter configuração atual como baseline para próxima execução.';
};

const getModeLabel = (mode) => {
  if (mode === 'ai') return 'AI';
  if (mode === 'rl') return 'RL';
  return 'Traditional';
};

const ReportCard = ({ title, value, subtitle, icon: Icon, tone = 'orange' }) => {
  const toneClass = tone === 'emerald' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
    tone === 'red' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
    'text-orange-500 bg-orange-500/10 border-orange-500/20';

  return (
    <article className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{title}</span>
        <div className={`p-2.5 rounded-xl border ${toneClass}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-black text-white tracking-tight">{value}</span>
        <span className="text-xs text-muted-foreground/70 font-medium">{subtitle}</span>
      </div>
    </article>
  );
};

const ComparisonRow = ({ label, current, baseline, betterWhenLower = false, unit = '' }) => {
  const hasBaseline = Number.isFinite(baseline) && baseline !== 0;
  const diff = hasBaseline ? pctDiff(current, baseline) : null;
  const isBetter = betterWhenLower ? current <= baseline : current >= baseline;

  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-3 py-3 border-b border-[#1c1c1f] last:border-b-0">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <span className="text-xs font-black text-white">{asNumber(current).toFixed(1)}{unit}</span>
      <span className="text-xs font-bold text-muted-foreground/70">{asNumber(baseline).toFixed(1)}{unit}</span>
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${diff === null ? 'text-muted-foreground/40 bg-[#1c1c1f]' : isBetter ? 'text-emerald-500 bg-emerald-500/10' : 'text-orange-500 bg-orange-500/10'}`}>
        {diff === null ? '—' : formatSignedPct(diff)}
      </span>
    </div>
  );
};

const buildSnapshot = ({ metrics, comparison, config, metricHistory }) => {
  const now = new Date();
  return {
    generated_at: now.toISOString(),
    scenario: config?.scenario || 'normal',
    mode: config?.mode || 'ai',
    grid_size: config?.gridSize || 4,
    summary: {
      avg_wait_time: asNumber(metrics?.avgWaitTime),
      flow_rate: asNumber(metrics?.flowRate),
      co2_emissions: asNumber(metrics?.co2Emissions),
      emergency_response_time: asNumber(metrics?.emergencyResponseTime),
      total_collisions: asNumber(metrics?.totalCollisions),
      collision_avoided: asNumber(metrics?.collisionAvoided),
      pedestrian_avg_wait: asNumber(metrics?.pedestrianAvgWaitTime),
      pedestrians_active: asNumber(metrics?.pedestriansActive),
      pedestrians_completed: asNumber(metrics?.pedestriansCompleted),
      vehicles_active: asNumber(metrics?.vehiclesActive),
      vehicles_completed: asNumber(metrics?.vehiclesCompleted),
      simulation_time: asNumber(metrics?.simulationTime),
    },
    baseline: {
      avg_wait_time: asNumber(comparison?.avgWaitTime),
      flow_rate: asNumber(comparison?.flowRate),
      co2_emissions: asNumber(comparison?.co2Emissions),
      emergency_response_time: asNumber(comparison?.emergencyResponseTime),
      total_collisions: asNumber(comparison?.totalCollisions),
    },
    trends: {
      wait_time_pct: getTrend(metricHistory, 'avgWaitTime'),
      flow_rate_pct: getTrend(metricHistory, 'flowRate'),
      co2_pct: getTrend(metricHistory, 'co2Emissions'),
      collisions_pct: getTrend(metricHistory, 'totalCollisions'),
    },
  };
};

const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(asNumber(value) * factor) / factor;
};

const RL_SCENARIO_ORDER = [
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

const metricIsLowerBetter = (metric) => (
  metric === 'avg_wait_time_mean' ||
  metric === 'co2_emissions_mean' ||
  metric === 'emergency_response_time_mean' ||
  metric === 'total_collisions_mean'
);

const metricLabel = (metric) => {
  if (metric === 'avg_wait_time_mean') return 'Avg Wait';
  if (metric === 'flow_rate_mean') return 'Flow';
  if (metric === 'co2_emissions_mean') return 'CO2';
  if (metric === 'emergency_response_time_mean') return 'Emergency';
  return 'Collisions';
};

const pickWinnerMode = (rows, metric) => {
  if (!rows || rows.length === 0) return '-';
  const sorted = [...rows].sort((a, b) => {
    const av = asNumber(a[metric]);
    const bv = asNumber(b[metric]);
    return metricIsLowerBetter(metric) ? av - bv : bv - av;
  });
  return getModeLabel(sorted[0].mode);
};

const getWinnerStrength = (rows, metric) => {
  if (!rows || rows.length < 2) return { label: 'only', icon: '—', class: 'text-muted-foreground/50' };
  
  const sorted = [...rows].sort((a, b) => {
    const av = asNumber(a[metric]);
    const bv = asNumber(b[metric]);
    return metricIsLowerBetter(metric) ? av - bv : bv - av;
  });
  
  const margin = Math.abs(
    asNumber(sorted[0][metric]) - asNumber(sorted[1][metric])
  );
  
  // Limiar de vitória "forte" por métrica
  const thresholds = {
    'avg_wait_time_mean': 3,
    'flow_rate_mean': 1.0,
    'co2_emissions_mean': 15,
    'emergency_response_time_mean': 5,
    'total_collisions_mean': 2,
    'collision_avoided_mean': 5,
  };
  
  const threshold = thresholds[metric] || 5;
  const isStrong = margin > threshold;
  
  return {
    label: isStrong ? 'strong' : 'marginal',
    margin: margin.toFixed(1),
    icon: isStrong ? '✓' : '≈',
    class: isStrong ? 'text-emerald-500 bg-emerald-500/10' : 'text-orange-500 bg-orange-500/10',
  };
};

const buildRlBenchmarkCsv = (summary) => {
  const headers = [
    'scenario',
    'mode',
    'n',
    'avg_wait_time_mean',
    'flow_rate_mean',
    'co2_emissions_mean',
    'emergency_response_time_mean',
    'total_collisions_mean',
    'collision_avoided_mean',
    'vehicles_completed_mean',
  ];
  const lines = [headers.join(',')];
  for (const row of summary || []) {
    const line = headers.map((h) => String(row[h] ?? '')).join(',');
    lines.push(line);
  }
  return lines.join('\n');
};

const aggregateRows = (rows) => {
  const map = new Map();
  for (const row of rows || []) {
    const scenario = row.scenario || 'unknown';
    const mode = row.mode || 'unknown';
    const key = `${scenario}|${mode}`;
    if (!map.has(key)) {
      map.set(key, {
        scenario,
        mode,
        n: 0,
        avg_wait_time_mean: 0,
        flow_rate_mean: 0,
        co2_emissions_mean: 0,
        emergency_response_time_mean: 0,
        total_collisions_mean: 0,
        collision_avoided_mean: 0,
        vehicles_completed_mean: 0,
      });
    }

    const item = map.get(key);
    item.n += 1;
    item.avg_wait_time_mean += asNumber(row.avg_wait_time);
    item.flow_rate_mean += asNumber(row.flow_rate);
    item.co2_emissions_mean += asNumber(row.co2_emissions);
    item.emergency_response_time_mean += asNumber(row.emergency_response_time);
    item.total_collisions_mean += asNumber(row.total_collisions);
    item.collision_avoided_mean += asNumber(row.collision_avoided);
    item.vehicles_completed_mean += asNumber(row.vehicles_completed);
  }

  return Array.from(map.values()).map((item) => ({
    ...item,
    avg_wait_time_mean: round(item.avg_wait_time_mean / Math.max(item.n, 1), 2),
    flow_rate_mean: round(item.flow_rate_mean / Math.max(item.n, 1), 2),
    co2_emissions_mean: round(item.co2_emissions_mean / Math.max(item.n, 1), 3),
    emergency_response_time_mean: round(item.emergency_response_time_mean / Math.max(item.n, 1), 2),
    total_collisions_mean: round(item.total_collisions_mean / Math.max(item.n, 1), 2),
    collision_avoided_mean: round(item.collision_avoided_mean / Math.max(item.n, 1), 2),
    vehicles_completed_mean: round(item.vehicles_completed_mean / Math.max(item.n, 1), 2),
  }));
};

const toMetricsFromSummary = (summaryItem) => {
  if (!summaryItem) return null;
  return {
    avgWaitTime: asNumber(summaryItem.avg_wait_time_mean),
    flowRate: asNumber(summaryItem.flow_rate_mean),
    co2Emissions: asNumber(summaryItem.co2_emissions_mean),
    emergencyResponseTime: asNumber(summaryItem.emergency_response_time_mean),
    totalCollisions: asNumber(summaryItem.total_collisions_mean),
    collisionAvoided: asNumber(summaryItem.collision_avoided_mean),
    vehiclesCompleted: asNumber(summaryItem.vehicles_completed_mean),
  };
};

export const ReportsView = ({ metrics, comparison, metricHistory, config }) => {
  const [campaignData, setCampaignData] = React.useState({
    loading: true,
    source: 'live',
    generatedAt: null,
    campaignId: null,
    summary: [],
  });
  const [rlData, setRlData] = React.useState({
    loading: true,
    source: 'none',
    generatedAt: null,
    summary: [],
    config: null,
  });

  React.useEffect(() => {
    let cancelled = false;

    const tryBackendCampaigns = async () => {
      const tryUrls = [`${API}/campaigns?limit=1`, `${LOCAL_API}/campaigns?limit=1`];
      for (const url of tryUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const campaigns = await response.json();
          if (!Array.isArray(campaigns) || campaigns.length === 0) continue;

          const latest = campaigns[0];
          const summaryRaw = latest?.results_summary?.summary;
          if (!Array.isArray(summaryRaw) || summaryRaw.length === 0) continue;

          return {
            source: 'backend',
            generatedAt: latest.timestamp || null,
            campaignId: latest.campaign_id || latest.id || null,
            summary: summaryRaw,
          };
        } catch {
          // Try next URL
        }
      }
      return null;
    };

    const tryLocalCampaignJson = async () => {
      const urls = [
        '/experiments/results/latest.json',
        '/results/latest.json',
        '/latest.json',
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const payload = await response.json();
          if (!payload || !Array.isArray(payload.rows)) continue;

          return {
            source: 'local-latest.json',
            generatedAt: payload.generated_at || null,
            campaignId: payload.campaign_id || null,
            summary: aggregateRows(payload.rows),
          };
        } catch {
          // Try next URL
        }
      }

      return null;
    };

    const load = async () => {
      const backend = await tryBackendCampaigns();
      if (!cancelled && backend) {
        setCampaignData({ loading: false, ...backend });
        return;
      }

      const local = await tryLocalCampaignJson();
      if (!cancelled && local) {
        setCampaignData({ loading: false, ...local });
        return;
      }

      if (!cancelled) {
        setCampaignData({
          loading: false,
          source: 'live',
          generatedAt: null,
          campaignId: null,
          summary: [],
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const tryLocalRlSummary = async () => {
      const urls = [
        '/experiments/results/rl_evaluation_summary_latest.json',
        '/results/rl_evaluation_summary_latest.json',
        '/rl_evaluation_summary_latest.json',
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const payload = await response.json();
          if (!payload || !Array.isArray(payload.summary) || payload.summary.length === 0) continue;

          return {
            source: 'local-rl-summary',
            generatedAt: payload.generated_at || null,
            summary: payload.summary,
            config: payload.config || null,
          };
        } catch {
          // try next
        }
      }

      return null;
    };

    const load = async () => {
      const local = await tryLocalRlSummary();
      if (!cancelled && local) {
        setRlData({ loading: false, ...local });
        return;
      }

      if (!cancelled) {
        setRlData({
          loading: false,
          source: 'none',
          generatedAt: null,
          summary: [],
          config: null,
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedScenario = config?.scenario || 'normal';
  const selectedMode = config?.mode || 'ai';

  const rlByScenario = React.useMemo(() => {
    const map = new Map();
    for (const row of rlData.summary || []) {
      const key = row.scenario || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  }, [rlData.summary]);

  const summaryCurrent = campaignData.summary.find(
    (row) => row.scenario === selectedScenario && row.mode === selectedMode
  );
  const summaryBaseline = campaignData.summary.find(
    (row) => row.scenario === selectedScenario && row.mode === (selectedMode === 'traditional' ? 'ai' : 'traditional')
  );

  const effectiveMetrics = summaryCurrent ? { ...metrics, ...toMetricsFromSummary(summaryCurrent) } : metrics;
  const effectiveComparison = summaryBaseline ? { ...comparison, ...toMetricsFromSummary(summaryBaseline) } : comparison;

  const snapshot = React.useMemo(
    () => buildSnapshot({ metrics: effectiveMetrics, comparison: effectiveComparison, config, metricHistory }),
    [effectiveMetrics, effectiveComparison, config, metricHistory]
  );

  const modeLabel = getModeLabel(config?.mode);
  const baselineLabel = config?.mode === 'traditional' ? 'AI/RL baseline' : 'Traditional baseline';

  const operationalScore = Math.max(0,
    100
    - asNumber(effectiveMetrics?.avgWaitTime) * 1.6
    - asNumber(effectiveMetrics?.totalCollisions) * 6
    - asNumber(effectiveMetrics?.emergencyResponseTime) * 0.8
  );

  const sustainabilityScore = Math.max(0,
    100
    - asNumber(effectiveMetrics?.co2Emissions) * 1.2
    - asNumber(effectiveMetrics?.totalCollisions) * 2
  );

  const safetyScore = Math.max(0,
    100
    - asNumber(effectiveMetrics?.totalCollisions) * 10
    + asNumber(effectiveMetrics?.collisionAvoided) * 0.6
  );

  const recommendation = getContextualRecommendation(effectiveMetrics, selectedScenario, selectedMode);

  const handleExportJson = () => {
    downloadFile('trafficai_report_snapshot.json', JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8;');
  };

  const handleExportCsv = () => {
    const rows = [
      ['metric', 'current', 'baseline'],
      ['avg_wait_time', asNumber(effectiveMetrics?.avgWaitTime), asNumber(effectiveComparison?.avgWaitTime)],
      ['flow_rate', asNumber(effectiveMetrics?.flowRate), asNumber(effectiveComparison?.flowRate)],
      ['co2_emissions', asNumber(effectiveMetrics?.co2Emissions), asNumber(effectiveComparison?.co2Emissions)],
      ['emergency_response_time', asNumber(effectiveMetrics?.emergencyResponseTime), asNumber(effectiveComparison?.emergencyResponseTime)],
      ['total_collisions', asNumber(effectiveMetrics?.totalCollisions), asNumber(effectiveComparison?.totalCollisions)],
      ['collision_avoided', asNumber(effectiveMetrics?.collisionAvoided), ''],
      ['pedestrian_avg_wait', asNumber(effectiveMetrics?.pedestrianAvgWaitTime), ''],
      ['pedestrians_completed', asNumber(effectiveMetrics?.pedestriansCompleted), ''],
      ['vehicles_completed', asNumber(effectiveMetrics?.vehiclesCompleted), ''],
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    downloadFile('trafficai_report_snapshot.csv', csv, 'text/csv;charset=utf-8;');
  };

  const handleExportRlJson = () => {
    const payload = {
      generated_at: rlData.generatedAt,
      source: rlData.source,
      config: rlData.config,
      summary: rlData.summary,
    };
    downloadFile('trafficai_rl_benchmark.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;');
  };

  const handleExportRlCsv = () => {
    const csv = buildRlBenchmarkCsv(rlData.summary);
    downloadFile('trafficai_rl_benchmark.csv', csv, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] p-8 hide-scrollbar">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-white">Reports Center</h1>
          <p className="text-sm font-medium text-muted-foreground/60">
            Structured operational reports for scenario {config?.scenario || 'normal'} in {modeLabel} mode.
          </p>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
            Source: {campaignData.loading ? 'Loading...' : campaignData.source}
            {campaignData.generatedAt ? ` • ${new Date(campaignData.generatedAt).toLocaleString()}` : ''}
            {campaignData.campaignId ? ` • ${campaignData.campaignId}` : ''}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl border border-[#1c1c1f] bg-[#151518] text-white text-xs font-black uppercase tracking-widest hover:bg-[#1c1c1f] transition-all flex items-center gap-2"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={handleExportJson}
            className="px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2"
          >
            <FileText size={14} />
            JSON
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <ReportCard
          title="Operational Score"
          value={`${operationalScore.toFixed(1)}/100`}
          subtitle="Wait + safety + emergency response"
          icon={Trophy}
          tone="orange"
        />
        <ReportCard
          title="Sustainability Score"
          value={`${sustainabilityScore.toFixed(1)}/100`}
          subtitle="Based on CO2 and flow stability"
          icon={Leaf}
          tone="emerald"
        />
        <ReportCard
          title="Safety Score"
          value={`${safetyScore.toFixed(1)}/100`}
          subtitle="Collisions and preventive events"
          icon={Shield}
          tone={asNumber(effectiveMetrics?.totalCollisions) > 0 ? 'red' : 'emerald'}
        />
        <ReportCard
          title="Pedestrian Throughput"
          value={`${asNumber(effectiveMetrics?.pedestriansCompleted)}`}
          subtitle={`Avg wait ${asNumber(effectiveMetrics?.pedestrianAvgWaitTime).toFixed(1)}s`}
          icon={Footprints}
          tone="orange"
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
        <article className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground/60">Current vs Baseline</h2>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{baselineLabel}</span>
          </div>

          <ComparisonRow label="Average Wait Time" current={effectiveMetrics?.avgWaitTime} baseline={effectiveComparison?.avgWaitTime} betterWhenLower unit="s" />
          <ComparisonRow label="Flow Rate" current={effectiveMetrics?.flowRate} baseline={effectiveComparison?.flowRate} unit="" />
          <ComparisonRow label="CO2 Emissions" current={effectiveMetrics?.co2Emissions} baseline={effectiveComparison?.co2Emissions} betterWhenLower unit="kg" />
          <ComparisonRow label="Emergency Response" current={effectiveMetrics?.emergencyResponseTime} baseline={effectiveComparison?.emergencyResponseTime} betterWhenLower unit="s" />
          <ComparisonRow label="Total Collisions" current={effectiveMetrics?.totalCollisions} baseline={effectiveComparison?.totalCollisions} betterWhenLower unit="" />
        </article>

        <article className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground/60">Trend Signals (recent)</h2>

          <div className="flex items-center justify-between rounded-2xl border border-[#1c1c1f] bg-[#0c0c0e]/60 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Clock3 size={14} /> Wait Time
            </div>
            <div className={`flex items-center gap-1 text-xs font-black ${getTrend(metricHistory, 'avgWaitTime') <= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
              {getTrend(metricHistory, 'avgWaitTime') <= 0 ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
              {formatSignedPct(getTrend(metricHistory, 'avgWaitTime'))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#1c1c1f] bg-[#0c0c0e]/60 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Ambulance size={14} /> Emergency RT
            </div>
            <span className="text-xs font-black text-white">{asNumber(effectiveMetrics?.emergencyResponseTime).toFixed(1)}s</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#1c1c1f] bg-[#0c0c0e]/60 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Shield size={14} /> Collisions
            </div>
            <span className={`text-xs font-black ${asNumber(effectiveMetrics?.totalCollisions) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {asNumber(effectiveMetrics?.totalCollisions) > 0 ? 'Attention required' : 'Stable'}
            </span>
          </div>

          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-xs text-white/80 leading-relaxed font-medium">
            {recommendation}
          </div>
        </article>
      </section>

      {campaignData.summary.length > 0 && (
        <section className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground/60">Scenario Summary (Real Data)</h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              {campaignData.summary.length} rows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/40 border-b border-[#1c1c1f]">
                  <th className="pb-3 pr-4">Scenario</th>
                  <th className="pb-3 pr-4">Mode</th>
                  <th className="pb-3 pr-4">Avg Wait</th>
                  <th className="pb-3 pr-4">Flow</th>
                  <th className="pb-3 pr-4">CO2</th>
                  <th className="pb-3 pr-4">Emergency</th>
                  <th className="pb-3 pr-4">Collisions</th>
                </tr>
              </thead>
              <tbody>
                {campaignData.summary.map((row) => (
                  <tr key={`${row.scenario}-${row.mode}`} className="border-b border-[#1c1c1f] last:border-b-0">
                    <td className="py-3 pr-4 text-xs text-white font-bold">{row.scenario}</td>
                    <td className="py-3 pr-4 text-xs text-primary font-black uppercase">{row.mode}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.avg_wait_time_mean).toFixed(2)}s</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.flow_rate_mean).toFixed(2)}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.co2_emissions_mean).toFixed(2)}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.emergency_response_time_mean).toFixed(2)}s</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.total_collisions_mean).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground/60">RL Benchmark</h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Source: {rlData.loading ? 'Loading...' : rlData.source}
              {rlData.generatedAt ? ` • ${new Date(rlData.generatedAt).toLocaleString()}` : ''}
            </span>
          </div>

          {rlData.summary.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportRlCsv}
                className="px-3 py-2 rounded-xl border border-[#1c1c1f] bg-[#0c0c0e] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#1c1c1f] transition-all"
              >
                Export RL CSV
              </button>
              <button
                onClick={handleExportRlJson}
                className="px-3 py-2 rounded-xl border border-primary/20 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
              >
                Export RL JSON
              </button>
            </div>
          )}
        </div>

        {rlData.summary.length === 0 ? (
          <div className="rounded-2xl border border-[#1c1c1f] bg-[#0c0c0e]/60 p-4 text-xs text-muted-foreground">
            RL evaluation summary not found yet. Run `evaluate-rl-agent.cjs` to generate `rl_evaluation_summary_latest.json`.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/40 border-b border-[#1c1c1f]">
                  <th className="pb-3 pr-4">Scenario</th>
                  <th className="pb-3 pr-4">Mode</th>
                  <th className="pb-3 pr-4">Avg Wait</th>
                  <th className="pb-3 pr-4">Flow</th>
                  <th className="pb-3 pr-4">CO2</th>
                  <th className="pb-3 pr-4">Emergency</th>
                  <th className="pb-3 pr-4">Collisions</th>
                  <th className="pb-3 pr-4">Winners</th>
                </tr>
              </thead>
              <tbody>
                {RL_SCENARIO_ORDER.flatMap((scenario) => {
                  const rows = (rlByScenario.get(scenario) || []).sort((a, b) => String(a.mode).localeCompare(String(b.mode)));
                  if (rows.length === 0) return [];

                  const strengthWait = getWinnerStrength(rows, 'avg_wait_time_mean');
                  const strengthFlow = getWinnerStrength(rows, 'flow_rate_mean');
                  const strengthCo2 = getWinnerStrength(rows, 'co2_emissions_mean');
                  const strengthEmer = getWinnerStrength(rows, 'emergency_response_time_mean');
                  const strengthCollisions = getWinnerStrength(rows, 'total_collisions_mean');

                  const winnerWait = pickWinnerMode(rows, 'avg_wait_time_mean');
                  const winnerFlow = pickWinnerMode(rows, 'flow_rate_mean');
                  const winnerCo2 = pickWinnerMode(rows, 'co2_emissions_mean');
                  const winnerEmer = pickWinnerMode(rows, 'emergency_response_time_mean');
                  const winnerCollisions = pickWinnerMode(rows, 'total_collisions_mean');

                  return rows.map((row, idx) => {
                    const isRl = row.mode === 'rl';
                    return (
                      <tr key={`${scenario}-${row.mode}`} className="border-b border-[#1c1c1f] last:border-b-0">
                        <td className="py-3 pr-4 text-xs text-white font-bold">{idx === 0 ? scenario : ''}</td>
                        <td className={`py-3 pr-4 text-xs font-black uppercase ${isRl ? 'text-primary' : 'text-white/80'}`}>{row.mode}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.avg_wait_time_mean).toFixed(2)}s</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.flow_rate_mean).toFixed(2)}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.co2_emissions_mean).toFixed(2)}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.emergency_response_time_mean).toFixed(2)}s</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{asNumber(row.total_collisions_mean).toFixed(2)}</td>
                        <td className="py-3 pr-4 text-xs">
                          {idx === 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {[['avg_wait_time_mean', winnerWait, strengthWait], ['flow_rate_mean', winnerFlow, strengthFlow], ['co2_emissions_mean', winnerCo2, strengthCo2], ['emergency_response_time_mean', winnerEmer, strengthEmer], ['total_collisions_mean', winnerCollisions, strengthCollisions]].map(([m, winner, strength]) => (
                                <span key={m} title={`${strength.label}: margin ${strength.margin}`} className={`px-1.5 py-0.5 rounded-full border ${strength.class} text-[9px] font-black uppercase tracking-widest`}>
                                  {metricLabel(m)}: {winner} {strength.icon}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground/60">Report Checklist</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
            Auto-generated at {new Date(snapshot.generated_at).toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[#1c1c1f] bg-[#0c0c0e]/60 p-4 flex items-center gap-2 text-xs font-bold text-white">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Executive summary
          </div>
          <div className="rounded-2xl border border-[#1c1c1f] bg-[#0c0c0e]/60 p-4 flex items-center gap-2 text-xs font-bold text-white">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Scenario comparison
          </div>
          <div className="rounded-2xl border border-[#1c1c1f] bg-[#0c0c0e]/60 p-4 flex items-center gap-2 text-xs font-bold text-white">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Pedestrian and safety metrics
          </div>
          <div className="rounded-2xl border border-[#1c1c1f] bg-[#0c0c0e]/60 p-4 flex items-center gap-2 text-xs font-bold text-white">
            {asNumber(effectiveMetrics?.totalCollisions) > 0 ? (
              <AlertTriangle size={14} className="text-orange-500" />
            ) : (
              <CheckCircle2 size={14} className="text-emerald-500" />
            )}
            Incident status and recommendation
          </div>
        </div>
      </section>
    </div>
  );
};
