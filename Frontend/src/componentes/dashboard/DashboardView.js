import React from 'react';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Zap,
  Search, 
  Settings,
  MoreVertical
} from 'lucide-react';

const MetricCard = ({ title, value, unit, change, data, color, type = 'line' }) => {
  const isPositive = change > 0;
  
  return (
    <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tighter text-white">{value}{unit}</span>
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-orange-500'}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change)}%
          </div>
        </div>
      </div>
      
      <div className="h-24 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="val" 
                stroke={color} 
                fillOpacity={1} 
                fill={`url(#grad-${color})`} 
                strokeWidth={3}
                dot={false}
              />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <Line 
                type="monotone" 
                dataKey="val" 
                stroke={color} 
                strokeWidth={3} 
                dot={false}
                strokeDasharray={type === 'dashed' ? "5 5" : "0"}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-between text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-1">
        <span>10:00</span>
        <span>10:30</span>
        <span>11:00</span>
      </div>
    </div>
  );
};

const STATUS_STYLES = {
  critical: 'text-red-400',
  warning:  'text-orange-400',
  ok:       'text-emerald-400',
  info:     'text-blue-400',
  active:   'text-blue-400',
};

const LogRow = ({ time, category, message, status }) => {
  const color = STATUS_STYLES[status] || 'text-white/40';
  return (
    <tr className="border-b border-[#1c1c1f] group hover:bg-white/[0.02] transition-colors">
      <td className="py-4 pr-6 text-muted-foreground/60 text-xs font-mono whitespace-nowrap">{time}</td>
      <td className="py-4 pr-6">
        <span className="bg-[#1c1c1f] text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md text-white/40">
          {category}
        </span>
      </td>
      <td className="py-4 pr-6 text-muted-foreground text-xs">{message}</td>
      <td className="py-4">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{status}</span>
        </div>
      </td>
    </tr>
  );
};

export const DashboardView = ({ metrics, metricHistory, eventLog = [] }) => {
  // Generate dummy localized history for visualization if real history is sparse
  const processData = (key) => {
    if (metricHistory.length < 5) {
      return Array.from({ length: 12 }, (_, i) => ({ val: 10 + Math.random() * 20 }));
    }
    return metricHistory.slice(-20).map(m => ({ val: m[key] || 0 }));
  };

  const waitTimeData = processData('avgWaitTime');
  const flowRateData = processData('flowRate');
  const co2Data = processData('co2Emissions');

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] p-8 hide-scrollbar">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Real-time Traffic Metrics</h1>
        <p className="text-muted-foreground text-sm font-medium opacity-60">Advanced AI-driven monitoring of urban mobility and carbon footprint.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard 
          title="Avg Wait Time" 
          value={metrics.avgWaitTime} 
          unit="s" 
          change={-12.5} 
          data={waitTimeData} 
          color="#f97316" 
        />
        <MetricCard 
          title="Flow Rate (VPM)" 
          value={metrics.flowRate} 
          unit="" 
          change={5.2} 
          data={flowRateData} 
          color="#10b981" 
          type="area"
        />
        <MetricCard 
          title="CO2 Emissions (KG)" 
          value={metrics.co2Emissions} 
          unit="" 
          change={-2.1} 
          data={co2Data} 
          color="#f97316" 
          type="dashed"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Total Collisions */}
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Total Collisions (24h)</h3>
            <CheckCircle2 size={24} className="text-emerald-500" />
          </div>
          <div>
            <span className="text-5xl font-black text-white">{metrics.totalCollisions || 0}</span>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2">Operational Safety Perfect</p>
          </div>
        </div>

        {/* Active Vehicles Network */}
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6">
          <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mb-6">Active Vehicles Network</h3>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                <span className="text-orange-500">Autonomous</span>
                <span className="text-white">1,482 (62%)</span>
              </div>
              <div className="h-1.5 w-full bg-[#1c1c1f] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full w-[62%] shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
                <span>Legacy</span>
                <span>894 (38%)</span>
              </div>
              <div className="h-1.5 w-full bg-[#1c1c1f] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500/40 rounded-full w-[38%]" />
              </div>
            </div>
          </div>
        </div>

        {/* AI Processor Load */}
        <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6">
          <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mb-2">AI Processor Load</h3>
          <span className="text-4xl font-black text-white">24.5%</span>
          <div className="flex gap-1 mt-4">
            {[1, 1, 1, 0, 0, 0, 0, 0].map((active, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${active ? 'bg-orange-900' : 'bg-[#1c1c1f]'}`} />
            ))}
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mt-4">Nodes responding: 42/42</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#151518] border border-[#1c1c1f] rounded-[2rem] overflow-hidden">
        <div className="p-8 border-b border-[#1c1c1f] flex items-center gap-3 bg-[#0c0c0e]/30">
          <div className="p-2.5 bg-orange-500/10 rounded-xl">
            <Zap size={20} className="text-orange-500" />
          </div>
          <h3 className="font-bold text-lg">System Event Logs</h3>
        </div>
        
        <div className="p-8 overflow-x-auto">
          {eventLog.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/40 text-sm font-medium">
              Aguardando eventos — inicia a simulação para começar a registar.
            </div>
          ) : (
            <>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 border-b border-[#1c1c1f]">
                    <th className="pb-4 pr-6">Timestamp</th>
                    <th className="pb-4 pr-6">Category</th>
                    <th className="pb-4 pr-6">Message</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {eventLog.slice(0, 4).map((row, i) => (
                    <LogRow key={i} time={row.time} category={row.category} message={row.message} status={row.status} />
                  ))}
                </tbody>
              </table>
              <div className="mt-8 flex justify-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  {eventLog.length} evento{eventLog.length !== 1 ? 's' : ''} registado{eventLog.length !== 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
