import React from 'react';
import {
  Leaf,
  Wind,
  Zap,
  Wifi,
  TrendingDown,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const DATA_CO2 = [
  { time: '00:00', value: 400 },
  { time: '03:00', value: 350 },
  { time: '06:00', value: 480 },
  { time: '09:00', value: 720 },
  { time: '12:00', value: 850 },
  { time: '15:00', value: 780 },
  { time: '18:00', value: 650 },
  { time: '21:00', value: 500 },
  { time: '23:59', value: 420 },
];

// Thresholds based on real vehicle emission factors (EURO 6 / EEA): kg CO2 total
const classificarCo2 = (valor) => {
  if (valor <= 50)  return 'Bom';
  if (valor <= 200) return 'Aceitável';
  return 'Elevado';
};

const getCo2BadgeStyle = (classificacao) => {
  if (classificacao === 'Bom') return 'bg-emerald-500/10 text-emerald-500';
  if (classificacao === 'Aceitável') return 'bg-orange-500/10 text-orange-500';
  return 'bg-red-500/10 text-red-500';
};

const EnvironmentalCard = ({ title, value, unit, trend, trendValue, icon: Icon, color, subtext, progress, statusDot, badge }) => (
  <div className="bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 flex flex-col gap-4 group hover:border-primary/20 transition-all">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-500`}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${trend === 'down' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
          {trend === 'down' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
          {trendValue}
        </div>
      )}
      {statusDot && (
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      )}
      {subtext && !trend && !statusDot && <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{subtext}</span>}
    </div>
    
    <div className="flex flex-col">
      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">{title}</h3>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-black text-white tracking-tight">{value}</span>
        <span className="text-sm font-bold text-muted-foreground">{unit}</span>
        {badge && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badge.style}`}>
            {badge.label}
          </span>
        )}
      </div>
      {subtext && (trend || statusDot) && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-40">{subtext}</span>}
    </div>

    {progress !== undefined && (
      <div className="w-full h-1.5 bg-[#1c1c1f] rounded-full overflow-hidden mt-1">
        <div 
          className={`h-full bg-${color}-500 rounded-full transition-all duration-1000`} 
          style={{ width: `${progress}%` }}
        />
      </div>
    )}
  </div>
);

// Calcula AQI aproximado a partir do CO2 total da frota (proxy ambiental)
const calcAqi = (co2Val) => {
  if (co2Val <= 0) return 0;
  if (co2Val <= 50)  return Math.round(co2Val * 0.8);              // 0-40 (Bom)
  if (co2Val <= 200) return Math.round(40 + (co2Val - 50) / 150 * 60); // 40-100 (Moderado)
  return Math.min(300, Math.round(100 + (co2Val - 200) * 0.5));         // 100+ (Elevado)
};

const aqiLabel = (aqi) => {
  if (aqi <= 50)  return 'Bom';
  if (aqi <= 100) return 'Moderado';
  return 'Elevado';
};

export const EnvironmentalView = ({ metrics, co2History }) => {
  const co2Val = metrics?.co2Emissions || 0;
  const co2Classification = classificarCo2(co2Val);

  // Percentagens de emissão por tipo de veículo (baseadas em fatores EURO 6)
  const lightVeh     = metrics?.lightVehiclesCompleted || 0;
  const heavyVeh     = metrics?.heavyVehiclesCompleted || 0;
  const busVeh       = heavyVeh * 0.8;   // ~80% dos pesados são autocarros
  const ambVeh       = heavyVeh * 0.2;   // ~20% são ambulâncias
  const lightCo2Est  = lightVeh * 0.120;
  const busCo2Est    = busVeh   * 0.820;
  const ambCo2Est    = ambVeh   * 0.250;
  const totalCo2EstRaw = lightCo2Est + busCo2Est + ambCo2Est;
  const totalCo2Est  = totalCo2EstRaw || 1;
  const lightPct     = totalCo2EstRaw === 0 ? 0 : Math.round(lightCo2Est / totalCo2Est * 100);
  const busPct       = totalCo2EstRaw === 0 ? 0 : Math.round(busCo2Est   / totalCo2Est * 100);
  const ambPct       = totalCo2EstRaw === 0 ? 0 : Math.max(0, 100 - lightPct - busPct);

  // AQI e eficiência energética
  const aqi            = calcAqi(co2Val);
  const aqiLbl         = aqiLabel(aqi);
  const vehiclesTotal  = metrics?.vehiclesCompleted || 0;
  const efficiency     = (co2Val > 0 && vehiclesTotal > 0)
    ? (vehiclesTotal / co2Val).toFixed(1)
    : '—';  // veículos por kg CO2 (maior = melhor)

  const chartData = React.useMemo(() => {
    if (!co2History || co2History.length === 0) return DATA_CO2;
    const startT = co2History[0].t;
    return co2History.map((p) => ({
      time: `${Math.round((p.t - startT) / 1000)}s`,
      value: p.co2Emissions,
    }));
  }, [co2History]);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#09090b] flex flex-col gap-8 hide-scrollbar">
      {/* Header Overlay */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            Environmental Monitoring
          </h1>
          <p className="text-muted-foreground text-sm font-medium opacity-50">Real-time air quality and carbon output telemetry</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnvironmentalCard 
          title="CARBON FOOTPRINT"
          value={co2Val.toLocaleString()}
          unit="Tons"
          trend="down"
          trendValue="12.4%"
          icon={Leaf}
          color="orange"
          badge={{ label: co2Classification, style: getCo2BadgeStyle(co2Classification) }}
        />
        <EnvironmentalCard 
          title="AIR QUALITY INDEX"
          value={aqi}
          unit="AQI"
          subtext={aqiLbl}
          icon={Wind}
          color="sky"
          progress={Math.min(100, aqi / 3)}
        />
        <EnvironmentalCard 
          title="FUEL EFFICIENCY"
          value={efficiency}
          unit="veh/kg CO₂"
          subtext="Veículos por kg CO₂"
          icon={Zap}
          color="orange"
        />
        <EnvironmentalCard 
          title="ACTIVE IOT SENSORS"
          value="892"
          unit=""
          subtext="ACROSS 14 URBAN ZONES"
          icon={Wifi}
          color="indigo"
          statusDot
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Emission Trend */}
        <div className="lg:col-span-2 bg-[#0c0c0e] border border-[#1c1c1f] rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-white tracking-tight">CO2 Emissions Trend</h3>
              <p className="text-xs text-muted-foreground font-medium opacity-50">Real-time fluctuations across urban grid</p>
            </div>
          </div>

          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#71717a', fontWeight: 'bold' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #1c1c1f', borderRadius: '12px' }}
                  itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">00:00</span>
            <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">12:00</span>
            <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">23:59</span>
          </div>
        </div>

        {/* Breakdown & Tips */}
        <div className="flex flex-col gap-8">
          <div className="bg-[#151518] border border-[#1c1c1f] rounded-[2rem] p-8 flex flex-col gap-6">
            <h3 className="text-lg font-black text-white tracking-tight">Vehicle Emissions</h3>
            
            <div className="flex flex-col gap-6">
              {[
                { label: 'Light Vehicles (Car)', val: lightPct, color: 'orange' },
                { label: 'Public Transport (Bus)', val: busPct, color: 'sky' },
                { label: 'Emergency (Ambulance)', val: ambPct, color: 'emerald' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-black text-white">{item.val}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1c1c1f] rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-${item.color}-500 rounded-full`} 
                      style={{ width: `${item.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-5 rounded-3xl bg-orange-500/5 border border-orange-500/10 flex gap-4 items-center">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <Sparkles size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">AI RECOMMENDATION</span>
                <p className="text-[11px] font-bold text-white/80 leading-relaxed">
                  Adjust signal timing in Sector 4 to clear heavy idle clusters before 16:00.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
