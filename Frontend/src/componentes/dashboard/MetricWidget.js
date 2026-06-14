import React from 'react';

const cardStyle = "border border-border rounded-xl p-4 bg-background text-foreground shadow-sm flex flex-col gap-1";

const legendItems = [
  { label: 'Ligeiro', color: '#60a5fa' },
  { label: 'Pesado', color: '#f59e0b' },
  { label: 'Emergência', color: '#ef4444' },
  { label: 'Peão', color: '#d4d4d8' },
];

const Sparkline = ({ data, color, height = 46 }) => {
  const width = 248;
  if (!data || data.length < 2) {
    return (
      <div style={{ height }} className="text-muted-foreground text-xs flex items-center justify-center">
        A recolher dados...
      </div>
    );
  }

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = Math.max(maxValue - minValue, 1);

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const baselineY = height - ((0 - minValue) / range) * (height - 4) - 2;
  const hasBaseline = minValue <= 0 && maxValue >= 0;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {hasBaseline && (
        <line
          x1="0"
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke="rgba(113,113,122,0.35)"
          strokeWidth="1"
        />
      )}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const MetricsWidget = ({
  metrics,
  comparison,
  config,
  metricHistory = [],
  sidebar = false,
}) => {
  const comparisonLabel = config.mode === 'traditional' ? 'IA/RL' : 'Tradicional';
  const modeLabel = config.mode === 'ai' ? 'IA' : config.mode === 'rl' ? 'RL' : 'Trad.';

  const cards = [
    {
      title: 'AVG WAIT TIME',
      value: `${metrics.avgWaitTime}s`,
      comparisonValue: comparison ? `${comparison.avgWaitTime}s` : '-',
    },
    {
      title: 'VEHICLE FLOW RATE',
      value: `${metrics.flowRate}`,
      sub: 'veic/min',
      comparisonValue: comparison ? `${comparison.flowRate}` : '-',
    },
    {
      title: 'CO2 EMISSIONS',
      value: `${metrics.co2Emissions}`,
      sub: 'kg',
      comparisonValue: comparison ? `${comparison.co2Emissions}kg` : '-',
    },
    {
      title: 'EMERGENCY RESPONSE',
      value: `${metrics.emergencyResponseTime}s`,
      comparisonValue: comparison ? `${comparison.emergencyResponseTime}s` : '-',
    },
    {
      title: 'TOTAL COLLISIONS',
      value: `${metrics.totalCollisions ?? 0}`,
      comparisonValue: comparison ? `${comparison.totalCollisions ?? 0}` : '-',
    },
    {
      title: 'PEDESTRIAN WAIT',
      value: `${metrics.pedestrianAvgWaitTime ?? 0}s`,
      sub: 'avg',
      comparisonValue: comparison ? `${comparison.pedestrianAvgWaitTime ?? 0}s` : '-',
    },
  ];

  const dynamicCharts = [
    {
      title: 'AVG WAIT TIME',
      color: '#f97316',
      values: metricHistory.map((item) => item.avgWaitTime),
      currentValue: `${metrics.avgWaitTime}s`,
    },
    {
      title: 'TRAFFIC FLOW',
      color: '#10b981',
      values: metricHistory.map((item) => item.flowRate),
      currentValue: `${metrics.flowRate}`,
    },
  ];

  const containerClass = sidebar
    ? "w-full h-full border-l border-[#1c1c1f] bg-[#0c0c0e] flex flex-col gap-5 p-6 overflow-y-auto hide-scrollbar shadow-2xl z-10"
    : "absolute right-6 bottom-6 w-[280px] flex flex-col gap-4 z-20"

  const premiumCardStyle = "bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5 flex flex-col gap-2 group hover:border-primary/20 transition-all shadow-lg";

  return (
    <div
      data-testid="metrics-widget"
      className={containerClass}
    >
      {sidebar && (
        <div className={premiumCardStyle}>
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-50">Vehicle Distribution</div>
          <div className="flex flex-col gap-3">
            {legendItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between group/item"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-lg"
                    style={{ background: item.color }}
                  />
                  <span className="text-xs font-bold text-white/70 group-hover/item:text-white transition-colors">{item.label}</span>
                </div>
                <span className="text-[10px] font-black text-muted-foreground/30">LATEST</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sidebar && (
        <div className={premiumCardStyle}>
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-50">Real-time Performance</div>
          <div className="flex flex-col gap-5">
            {dynamicCharts.map((chart) => (
              <div key={chart.title} className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-white/50">{chart.title}</span>
                  <span className="text-sm font-black text-white">{chart.currentValue}</span>
                </div>
                <div className="bg-[#0c0c0e]/50 rounded-xl p-2 border border-white/5">
                  <Sparkline data={chart.values} color={chart.color} height={40} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {cards.map((item) => (
          <div key={item.title} className={premiumCardStyle}>
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">{item.title}</span>
              <div className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black uppercase">VS {comparisonLabel}</div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-white tracking-tight leading-none">{item.value}</span>
              {item.sub && <span className="text-[10px] font-black text-muted-foreground/40">{item.sub}</span>}
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] font-bold">
              <span className="text-muted-foreground/40">Baseline</span>
              <span className="text-primary">{item.comparisonValue}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`${premiumCardStyle} flex-row justify-between items-center bg-[#151518]/50 mt-2`}>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-white leading-none">{metrics.vehiclesActive}</span>
          <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">VEÍC.</span>
        </div>
        <div className="w-px h-6 bg-white/5" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-zinc-400 leading-none">{metrics.pedestriansActive ?? 0}</span>
          <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">PEÕES</span>
        </div>
        <div className="w-px h-6 bg-white/5" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-primary leading-none">{modeLabel}</span>
          <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">SYSTEM</span>
        </div>
      </div>
    </div>
  );
};
