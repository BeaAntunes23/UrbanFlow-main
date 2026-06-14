import React from 'react';
import { AlertTriangle, ShieldCheck, Siren, UserRound, CarFront, Bus } from 'lucide-react';

const cardClass = 'bg-[#151518] border border-[#1c1c1f] rounded-3xl p-6 flex flex-col gap-3';

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildAlerts = (metrics) => {
  const alerts = [];

  if (asNumber(metrics.totalCollisions) > 0) {
    alerts.push({
      severity: 'high',
      title: 'Collision risk detected',
      description: `${asNumber(metrics.totalCollisions)} collisions registered in the current run.`,
    });
  }

  if (asNumber(metrics.emergencyResponseTime) > 18) {
    alerts.push({
      severity: 'medium',
      title: 'Emergency response degraded',
      description: `Emergency response time is at ${asNumber(metrics.emergencyResponseTime).toFixed(1)}s.`,
    });
  }

  if (asNumber(metrics.pedestrianAvgWaitTime) > 12) {
    alerts.push({
      severity: 'medium',
      title: 'Pedestrian delay above target',
      description: `Average pedestrian wait reached ${asNumber(metrics.pedestrianAvgWaitTime).toFixed(1)}s.`,
    });
  }

  if (asNumber(metrics.collisionAvoided) >= 1) {
    alerts.push({
      severity: 'low',
      title: 'Preventive interventions active',
      description: `${asNumber(metrics.collisionAvoided)} collision avoidance events handled successfully.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: 'ok',
      title: 'Network stable',
      description: 'No active safety anomalies detected in the current interval.',
    });
  }

  return alerts;
};

export const SafetyView = ({ metrics, config }) => {
  const alerts = React.useMemo(() => buildAlerts(metrics), [metrics]);

  const riskScore = Math.max(
    0,
    Math.min(
      100,
      asNumber(metrics.totalCollisions) * 35 +
        asNumber(metrics.emergencyResponseTime) * 1.8 +
        asNumber(metrics.pedestrianAvgWaitTime) * 1.5 -
        asNumber(metrics.collisionAvoided) * 8,
    ),
  );

  const riskLabel = riskScore >= 70 ? 'Critical' : riskScore >= 40 ? 'Elevated' : 'Controlled';
  const riskColor = riskScore >= 70 ? 'text-red-400' : riskScore >= 40 ? 'text-orange-400' : 'text-emerald-400';

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] p-8 hide-scrollbar">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Safety Analysis</h1>
          <p className="text-sm text-muted-foreground font-medium opacity-70">
            Active safety supervision for scenario {config?.scenario || 'normal'} in mode {config?.mode || 'ai'}.
          </p>
        </div>
        <div className="rounded-3xl border border-[#1c1c1f] bg-[#151518] px-5 py-4 min-w-[220px]">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">Risk Index</div>
          <div className={`text-4xl font-black tracking-tight ${riskColor}`}>{riskScore.toFixed(0)}</div>
          <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${riskColor}`}>{riskLabel}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Total Collisions</span>
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div className="text-4xl font-black text-white">{asNumber(metrics.totalCollisions)}</div>
          <div className="text-xs text-muted-foreground">Registered collision events in current session.</div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Avoided Incidents</span>
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <div className="text-4xl font-black text-white">{asNumber(metrics.collisionAvoided)}</div>
          <div className="text-xs text-muted-foreground">Potential conflicts resolved by the control logic.</div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Emergency Response</span>
            <Siren size={18} className="text-orange-400" />
          </div>
          <div className="text-4xl font-black text-white">{asNumber(metrics.emergencyResponseTime).toFixed(1)}s</div>
          <div className="text-xs text-muted-foreground">Average time to clear emergency movements.</div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Pedestrian Wait</span>
            <UserRound size={18} className="text-sky-400" />
          </div>
          <div className="text-4xl font-black text-white">{asNumber(metrics.pedestrianAvgWaitTime).toFixed(1)}s</div>
          <div className="text-xs text-muted-foreground">Average wait before crossing authorization.</div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Light Vehicles Wait</span>
            <CarFront size={18} className="text-blue-400" />
          </div>
          <div className="text-4xl font-black text-white">{asNumber(metrics.lightAvgWaitTime).toFixed(1)}s</div>
          <div className="text-xs text-muted-foreground">Average delay for light traffic.</div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Heavy Vehicles Wait</span>
            <Bus size={18} className="text-amber-400" />
          </div>
          <div className="text-4xl font-black text-white">{asNumber(metrics.heavyAvgWaitTime).toFixed(1)}s</div>
          <div className="text-xs text-muted-foreground">Average delay for buses and heavy flow.</div>
        </div>
      </div>

      <section className="bg-[#151518] border border-[#1c1c1f] rounded-[2rem] overflow-hidden">
        <div className="px-8 py-6 border-b border-[#1c1c1f]">
          <h2 className="text-lg font-bold text-white">Active Safety Alerts</h2>
          <p className="text-xs text-muted-foreground mt-1">Derived from the current state of the simulation.</p>
        </div>
        <div className="p-8 flex flex-col gap-4">
          {alerts.map((alert, index) => {
            const color = alert.severity === 'high'
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : alert.severity === 'medium'
                ? 'border-orange-500/20 bg-orange-500/10 text-orange-300'
                : alert.severity === 'low'
                  ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';

            return (
              <div key={`${alert.title}-${index}`} className={`rounded-2xl border p-5 ${color}`}>
                <div className="text-xs font-black uppercase tracking-widest mb-1">{alert.title}</div>
                <div className="text-sm opacity-90">{alert.description}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};