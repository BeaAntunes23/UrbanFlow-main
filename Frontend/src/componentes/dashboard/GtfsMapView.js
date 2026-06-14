import React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Bus, CalendarDays, Car, Clock3, Eye, EyeOff, Globe, Layers, MapPin, Pause, Play, RotateCcw, Route, Search, TrendingUp, Truck, Activity, Map as MapIcon, Users, Hash } from 'lucide-react';

const FALLBACK_CENTER = [41.5454, -8.4265];
const PORTUGAL_CENTER = [39.6, -8.0];
const PALETTE = ['#f97316','#3b82f6','#10b981','#a855f7','#ec4899','#f59e0b','#06b6d4','#84cc16','#ef4444','#8b5cf6'];

// Portugal's 18 Districts with GTFS operator mapping
const DISTRICTS = {
  aveiro: { name: 'Aveiro', operators: ['agueda_aveiro'], center: [40.6443, -8.6455] },
  beja: { name: 'Beja', operators: ['beja_osm'], center: [38.0151, -7.8632] },
  braga: { name: 'Braga', operators: ['tub_braga', 'mobiave', 'guimabus', 'tuba_barcelos'], center: [41.5454, -8.4265] },
  braganca: { name: 'Bragança', operators: ['braganca_osm'], center: [41.8060, -6.7567] },
  castelo_branco: { name: 'Castelo Branco', operators: ['castelo_branco_osm'], center: [39.8222, -7.4908] },
  coimbra: { name: 'Coimbra', operators: ['smtuc_coimbra'], center: [40.2056, -8.4196] },
  evora: { name: 'Évora', operators: ['evora_osm'], center: [38.5667, -7.9000] },
  faro: { name: 'Faro', operators: ['faro'], center: [37.0194, -7.9304] },
  guarda: { name: 'Guarda', operators: ['guarda_osm'], center: [40.5373, -7.2676] },
  leiria: { name: 'Leiria', operators: ['leiria_osm'], center: [39.7436, -8.8071] },
  lisboa: { name: 'Lisboa', operators: ['carris_lisboa', 'carris_metropolitana', 'metro_lisboa'], center: [38.7223, -9.1393] },
  madeira: { name: 'Madeira', operators: [], center: [32.6669, -16.9241] },
  porto: { name: 'Porto', operators: ['stcp'], center: [41.1496, -8.6109] },
  setubal: { name: 'Setúbal/Cascais', operators: ['cascais'], center: [38.5244, -8.8882] },
  viseu: { name: 'Viseu', operators: ['viseu_osm'], center: [40.6610, -7.9097] },
  vila_real: { name: 'Vila Real', operators: ['vila_real_osm'], center: [41.3006, -7.7461] },
  viana_castelo: { name: 'Viana do Castelo', operators: ['viana_castelo_osm'], center: [41.6918, -8.8344] },
  acores: { name: 'Açores', operators: [], center: [37.7412, -25.6756] },
};

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '\u00a9 OpenStreetMap contributors \u00a9 CARTO',
    label: 'Dark',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '\u00a9 OpenStreetMap contributors',
    label: 'OSM',
  },
  sat: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: 'Tiles \u00a9 Esri',
    label: 'Sat',
  },
};
const MAX_RENDERED_STOPS = 2800;
const MAX_RENDERED_POLYLINES = 700;
const ULTRA_FAST_MODE_STORAGE_KEY = 'trafficai_gtfs_ultra_fast_v1';
const LARGE_DATASET_STOP_THRESHOLD = 6000;
const LARGE_DATASET_POLYLINE_THRESHOLD = 900;

const formatHour = (h) => `${String(h).padStart(2, '0')}:00`;

const simplifyCoordinates = (coordinates = [], maxPoints = 450) => {
  const points = Array.isArray(coordinates) ? coordinates : [];
  if (points.length <= maxPoints) return points;

  const stride = Math.max(2, Math.ceil(points.length / maxPoints));
  const sampled = [points[0]];
  for (let i = stride; i < points.length - 1; i += stride) {
    sampled.push(points[i]);
  }
  sampled.push(points[points.length - 1]);
  return sampled;
};

const buildBoundsFromCoordinates = (coordinates = []) => {
  const points = Array.isArray(coordinates) ? coordinates : [];
  if (points.length < 2) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const point of points) {
    const lat = Number(point?.[0]);
    const lon = Number(point?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }

  if (![minLat, maxLat, minLon, maxLon].every(Number.isFinite)) return null;
  return [[minLat, minLon], [maxLat, maxLon]];
};

const loadUltraFastPreference = () => {
  if (typeof window === 'undefined') return true;

  try {
    const raw = window.localStorage.getItem(ULTRA_FAST_MODE_STORAGE_KEY);
    if (raw === null) return 'auto';
    if (raw === 'on' || raw === 'off' || raw === 'auto') return raw;
    return raw === 'true' ? 'on' : 'auto';
  } catch {
    return 'auto';
  }
};

const getRenderBudget = (zoom, ultraFastMode) => {
  if (!ultraFastMode) {
    return {
      stops: MAX_RENDERED_STOPS,
      polylines: MAX_RENDERED_POLYLINES,
      routePoints: 450,
      minStopZoom: 0,
    };
  }

  if (zoom <= 9) {
    return { stops: 0, polylines: 120, routePoints: 90, minStopZoom: 10 };
  }
  if (zoom <= 10) {
    return { stops: 180, polylines: 180, routePoints: 110, minStopZoom: 10 };
  }
  if (zoom <= 11) {
    return { stops: 500, polylines: 260, routePoints: 150, minStopZoom: 10 };
  }
  if (zoom <= 12) {
    return { stops: 1000, polylines: 380, routePoints: 190, minStopZoom: 10 };
  }
  if (zoom <= 13) {
    return { stops: 1700, polylines: 520, routePoints: 260, minStopZoom: 10 };
  }
  return { stops: 2400, polylines: 650, routePoints: 320, minStopZoom: 10 };
};

const selectBalancedByOperator = (items, limit, getOperator, getScore) => {
  if (!Array.isArray(items) || items.length <= limit) return items || [];

  const groups = new Map();
  for (const item of items) {
    const operator = getOperator(item) || '__unknown__';
    if (!groups.has(operator)) groups.set(operator, []);
    groups.get(operator).push(item);
  }

  const sortedGroups = [...groups.values()].map((group) =>
    group.slice().sort((a, b) => getScore(b) - getScore(a))
  );

  const selected = [];
  const used = new Set();

  // First pass: guarantee representation for each operator when possible.
  for (const group of sortedGroups) {
    if (selected.length >= limit || group.length === 0) break;
    const item = group.shift();
    if (!used.has(item)) {
      selected.push(item);
      used.add(item);
    }
  }

  if (selected.length >= limit) return selected;

  // Second pass: fill remaining slots by global score.
  const rest = sortedGroups.flat().sort((a, b) => getScore(b) - getScore(a));
  for (const item of rest) {
    if (selected.length >= limit) break;
    if (used.has(item)) continue;
    selected.push(item);
    used.add(item);
  }

  return selected;
};

const spreadOverviewMarkers = (items = [], clusterDistance = 0.22, spreadRadius = 0.18) => {
  if (!Array.isArray(items) || items.length <= 1) return items || [];

  const clusters = [];
  for (const item of items) {
    const lat = Number(item?.lat);
    const lon = Number(item?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    let assigned = false;
    for (const cluster of clusters) {
      const dLat = lat - cluster.anchorLat;
      const dLon = lon - cluster.anchorLon;
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist <= clusterDistance) {
        cluster.items.push(item);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.push({ anchorLat: lat, anchorLon: lon, items: [item] });
    }
  }

  const out = [];
  for (const cluster of clusters) {
    const count = cluster.items.length;
    if (count === 1) {
      out.push({ ...cluster.items[0], displayLat: cluster.items[0].lat, displayLon: cluster.items[0].lon });
      continue;
    }

    cluster.items.forEach((item, idx) => {
      const angle = (2 * Math.PI * idx) / count;
      const latOffset = spreadRadius * Math.sin(angle);
      const lonOffset = spreadRadius * Math.cos(angle) * 1.2;
      out.push({
        ...item,
        displayLat: Number(item.lat) + latOffset,
        displayLon: Number(item.lon) + lonOffset,
      });
    });
  }

  return out;
};

const MapAutoResize = () => {
  const map = useMap();

  React.useEffect(() => {
    const invalidate = () => map.invalidateSize({ pan: false, animate: false });
    const container = map.getContainer();

    const rafId = requestAnimationFrame(invalidate);
    const timeoutId = window.setTimeout(invalidate, 140);
    const resizeObserver = new ResizeObserver(invalidate);

    resizeObserver.observe(container);
    window.addEventListener('resize', invalidate);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);

  return null;
};

const MapViewportTracker = ({ onZoomChange }) => {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  React.useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
};

const MapFlyController = ({ target }) => {
  const map = useMap();
  const prevTarget = React.useRef(null);
  React.useEffect(() => {
    if (target && target !== prevTarget.current) {
      prevTarget.current = target;
      map.flyTo(target, Math.max(map.getZoom(), 15), { duration: 0.9, easeLinearity: 0.4 });
    }
  }, [target, map]);
  return null;
};

const MapBoundsController = ({ bounds }) => {
  const map = useMap();
  const prevBounds = React.useRef(null);

  React.useEffect(() => {
    if (!bounds) return;
    if (bounds === prevBounds.current) return;
    prevBounds.current = bounds;
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15, animate: true, duration: 0.85 });
  }, [bounds, map]);

  return null;
};

const markerStyle = (activity, maxActivity, hourFactor = 1) => {
  const ratio = maxActivity <= 0 ? 0 : activity / maxActivity;
  const adj = Math.min(ratio * hourFactor, 1);
  return {
    radius: 3 + adj * 10,
    color: '#f97316',
    fillColor: '#fb923c',
    fillOpacity: Math.min(0.45 + adj * 0.5, 0.95),
    weight: 1,
  };
};

// Pure canvas overlay — bypasses React and Leaflet marker system entirely.
// Draws all stops as pixels on a single <canvas> that is repositioned by Leaflet.
const CanvasStopsOverlay = L.Layer.extend({
  initialize(options) {
    L.Util.setOptions(this, options);
    this._stops = [];
    this._maxActivity = 1;
    this._hourFactor = 1;
    this._highlightedStop = null;
  },
  onAdd(map) {
    this._map = map;
    this._canvas = L.DomUtil.create('canvas', 'leaflet-stops-canvas');
    this._canvas.style.position = 'absolute';
    this._canvas.style.pointerEvents = 'none';
    this._canvas.style.zIndex = '450';
    const pane = map.getPane('overlayPane');
    pane.appendChild(this._canvas);
    map.on('moveend zoomend resize', this._redraw, this);
    this._redraw();
    return this;
  },
  onRemove(map) {
    map.off('moveend zoomend resize', this._redraw, this);
    if (this._canvas.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    return this;
  },
  setData(stops, maxActivity, hourFactor, highlightedStop) {
    this._stops = stops || [];
    this._maxActivity = maxActivity || 1;
    this._hourFactor = hourFactor || 1;
    this._highlightedStop = highlightedStop;
    this._redraw();
  },
  _redraw() {
    if (!this._map || !this._canvas) return;
    const map = this._map;
    const size = map.getSize();
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = size.x * dpr;
    this._canvas.height = size.y * dpr;
    this._canvas.style.width = size.x + 'px';
    this._canvas.style.height = size.y + 'px';
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);
    const ctx = this._canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);
    const bounds = map.getBounds();
    const pad = 0.01;
    const south = bounds.getSouth() - pad;
    const north = bounds.getNorth() + pad;
    const west = bounds.getWest() - pad;
    const east = bounds.getEast() + pad;
    const maxA = this._maxActivity;
    const hf = this._hourFactor;
    // Draw normal stops first, highlighted on top
    let hlStop = null;
    for (const stop of this._stops) {
      if (stop.lat < south || stop.lat > north || stop.lon < west || stop.lon > east) continue;
      if (this._highlightedStop === stop.stop_id) { hlStop = stop; continue; }
      const pt = map.latLngToContainerPoint([stop.lat, stop.lon]);
      const ratio = maxA <= 0 ? 0 : (Number(stop.activity) || 0) / maxA;
      const adj = Math.min(ratio * hf, 1);
      const r = 3 + adj * 10;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251,146,60,${Math.min(0.45 + adj * 0.5, 0.95)})`;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#f97316';
      ctx.stroke();
    }
    if (hlStop) {
      const pt = map.latLngToContainerPoint([hlStop.lat, hlStop.lon]);
      const ratio = maxA <= 0 ? 0 : (Number(hlStop.activity) || 0) / maxA;
      const adj = Math.min(ratio * hf, 1);
      const r = 6 + adj * 10;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(253,230,138,0.95)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();
    }
  },
});

// React wrapper for the pure canvas overlay
const CanvasStopsLayer = ({ stops, maxActivity, hourFactor, highlightedStop }) => {
  const map = useMap();
  const overlayRef = React.useRef(null);
  const popupRef = React.useRef(null);

  React.useEffect(() => {
    const overlay = new CanvasStopsOverlay();
    overlay.addTo(map);
    overlayRef.current = overlay;
    popupRef.current = L.popup({ autoPan: false });

    // Click handler on map to find nearest stop
    const onClick = (e) => {
      const stops = overlay._stops;
      if (!stops.length) return;
      const click = e.containerPoint;
      let best = null;
      let bestDist = 15; // max pixel distance
      for (const stop of stops) {
        const pt = map.latLngToContainerPoint([stop.lat, stop.lon]);
        const dx = pt.x - click.x;
        const dy = pt.y - click.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; best = stop; }
      }
      if (best) {
        popupRef.current
          .setLatLng([best.lat, best.lon])
          .setContent(
            `<div style="font-size:12px"><strong>${best.name}</strong><div>ID: ${best.stop_id}</div><div>Atividade: ${best.activity}</div>${best.routes?.length > 0 ? `<div>Rotas: ${best.routes.join(', ')}</div>` : ''}</div>`
          )
          .openOn(map);
      }
    };
    map.on('click', onClick);

    return () => {
      map.off('click', onClick);
      map.removeLayer(overlay);
      overlayRef.current = null;
    };
    // eslint-disable-next-line
  }, [map]);

  React.useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setData(stops, maxActivity, hourFactor, highlightedStop);
    }
  }, [stops, maxActivity, hourFactor, highlightedStop]);

  return null;
};

const DISTRICT_COLORS = ['#f97316','#3b82f6','#10b981','#a855f7','#ec4899','#f59e0b','#06b6d4','#84cc16','#ef4444','#8b5cf6',
  '#eab308','#0ea5e9','#22d3ee','#f43f5e','#6366f1','#f472b6','#16a34a','#facc15'];

// Native Leaflet layer for district overview circles (zoom < 10)
const CanvasDistrictMarkers = () => {
  const map = useMap();
  const layerRef = React.useRef(null);

  React.useEffect(() => {
    const renderer = L.canvas({ padding: 0.5 });
    const group = L.layerGroup();
    const entries = Object.entries(DISTRICTS);
    entries.forEach(([key, district], idx) => {
      const color = DISTRICT_COLORS[idx % DISTRICT_COLORS.length];
      const marker = L.circleMarker([district.center[0], district.center[1]], {
        radius: 12,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 1.5,
        renderer,
      });
      marker.bindPopup(`<div style="font-size:12px"><strong>${district.name}</strong><div>Aproxima para ver paragens.</div></div>`);
      group.addLayer(marker);
    });
    group.addTo(map);
    layerRef.current = group;
    return () => {
      map.removeLayer(group);
      layerRef.current = null;
    };
    // eslint-disable-next-line
  }, [map]);

  return null;
};

// ─── Operator Distribution Donut ───
const DONUT_COLORS = ['#f97316','#3b82f6','#10b981','#a855f7','#ec4899','#f59e0b','#06b6d4','#84cc16','#ef4444','#8b5cf6'];
const OperatorDonutChart = ({ operators, allPolylines, stops }) => {
  const routeData = React.useMemo(() => {
    const counts = new Map();
    for (const p of allPolylines) {
      counts.set(p.operator, (counts.get(p.operator) || 0) + 1);
    }
    return operators
      .map((op, idx) => ({ name: op.name, value: counts.get(op.key) || 0, color: op.color || DONUT_COLORS[idx % DONUT_COLORS.length] }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [operators, allPolylines]);

  const stopData = React.useMemo(() => {
    const counts = new Map();
    for (const s of stops) {
      counts.set(s.operator, (counts.get(s.operator) || 0) + 1);
    }
    return operators
      .map((op, idx) => ({ name: op.name, value: counts.get(op.key) || 0, color: op.color || DONUT_COLORS[idx % DONUT_COLORS.length] }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [operators, stops]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0];
    return (
      <div className="bg-[#151518] border border-[#2a2a2e] rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="font-bold text-white">{d.name}</p>
        <p className="text-orange-400">{d.value} ({((d.value / (d.payload?.total || 1)) * 100).toFixed(1)}%)</p>
      </div>
    );
  };

  const totalRoutes = routeData.reduce((s, d) => s + d.value, 0);
  const totalStops = stopData.reduce((s, d) => s + d.value, 0);
  const routeDataWithTotal = routeData.map((d) => ({ ...d, total: totalRoutes }));
  const stopDataWithTotal = stopData.map((d) => ({ ...d, total: totalStops }));

  return (
    <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-5">
      <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-4">Distribuição por Operador</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] text-muted-foreground text-center mb-1 font-semibold uppercase tracking-wider">Rotas</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={routeDataWithTotal} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {routeDataWithTotal.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground text-center mb-1 font-semibold uppercase tracking-wider">Paragens</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={stopDataWithTotal} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {stopDataWithTotal.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {routeData.slice(0, 8).map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[9px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground truncate max-w-[100px]">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Top Routes Ranking ───
const TopRoutesRanking = ({ allPolylines, routes }) => {
  const topRoutes = React.useMemo(() => {
    return [...allPolylines]
      .sort((a, b) => (b.stop_count || 0) - (a.stop_count || 0))
      .slice(0, 5)
      .map((p) => {
        const meta = routes.find((r) => r.route_id === p.route_id);
        return { ...p, short_name: meta?.short_name || p.short_name || p.route_id, long_name: meta?.long_name || p.long_name || '' };
      });
  }, [allPolylines, routes]);

  if (topRoutes.length === 0) return null;
  const maxStops = topRoutes[0]?.stop_count || 1;

  return (
    <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-5">
      <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-3">Top 5 Rotas</h3>
      <div className="space-y-2">
        {topRoutes.map((route, idx) => (
          <div key={route.route_id} className="flex items-center gap-3">
            <span className="text-[10px] font-black text-orange-400 w-5 text-right">#{idx + 1}</span>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: route.color || DONUT_COLORS[idx % DONUT_COLORS.length] }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{route.short_name}</span>
                <span className="text-[9px] text-muted-foreground truncate">{route.long_name}</span>
              </div>
              <div className="h-1.5 bg-[#0f0f12] rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400" style={{ width: `${((route.stop_count || 0) / maxStops) * 100}%` }} />
              </div>
            </div>
            <span className="text-[10px] font-bold text-orange-300 flex-shrink-0">{route.stop_count} par.</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Network KPIs ───
const NetworkKPIs = ({ stops, allPolylines, operators, departuresByHour }) => {
  const kpis = React.useMemo(() => {
    const totalRoutes = allPolylines.length;
    const totalStops = stops.length;
    const avgStopsPerRoute = totalRoutes > 0 ? (allPolylines.reduce((s, p) => s + (p.stop_count || 0), 0) / totalRoutes).toFixed(1) : '0';

    const hours = Object.entries(departuresByHour || {});
    let peakHour = '—';
    let peakValue = 0;
    for (const [h, v] of hours) {
      if (Number(v) > peakValue) { peakValue = Number(v); peakHour = `${String(Number(h)).padStart(2, '0')}:00`; }
    }

    return { totalRoutes, totalStops, avgStopsPerRoute, peakHour, peakValue, operatorCount: operators.length };
  }, [stops, allPolylines, operators, departuresByHour]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4 text-center">
        <Hash size={14} className="text-blue-400 mx-auto mb-1" />
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Média Par./Rota</p>
        <p className="text-lg font-black text-white">{kpis.avgStopsPerRoute}</p>
      </div>
      <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4 text-center">
        <Clock3 size={14} className="text-orange-400 mx-auto mb-1" />
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Hora de Pico</p>
        <p className="text-lg font-black text-white">{kpis.peakHour}</p>
        <p className="text-[8px] text-orange-400 font-bold">{kpis.peakValue} partidas</p>
      </div>
      <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4 text-center">
        <Users size={14} className="text-emerald-400 mx-auto mb-1" />
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Operadores</p>
        <p className="text-lg font-black text-white">{kpis.operatorCount}</p>
      </div>
    </div>
  );
};

// ─── District Coverage Badges ───
const DistrictCoverage = ({ operatorKeys }) => {
  const coverage = React.useMemo(() => {
    let withData = 0;
    const total = Object.keys(DISTRICTS).length;
    const details = [];
    for (const [key, district] of Object.entries(DISTRICTS)) {
      const hasData = district.operators.some((op) => operatorKeys.has(op));
      if (hasData) withData++;
      details.push({ key, name: district.name, hasData });
    }
    return { withData, total, details, percent: total > 0 ? Math.round((withData / total) * 100) : 0 };
  }, [operatorKeys]);

  return (
    <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Cobertura GTFS</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-orange-400">{coverage.withData}</span>
          <span className="text-[10px] text-muted-foreground">/ {coverage.total} distritos</span>
          <span className="text-[9px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/25 px-2 py-0.5 rounded-full">{coverage.percent}%</span>
        </div>
      </div>
      <div className="h-2 bg-[#0f0f12] rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all" style={{ width: `${coverage.percent}%` }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {coverage.details.map((d) => (
          <span
            key={d.key}
            className={`text-[8px] font-bold px-2 py-1 rounded-lg border transition-all ${
              d.hasData
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-[#0f0f12] border-[#1c1c1f] text-muted-foreground/40'
            }`}
          >
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4 flex items-center gap-3">
    <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
      <Icon size={18} className="text-orange-400" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">{label}</p>
      <p className="text-xl text-white font-black tracking-tight">{value}</p>
    </div>
  </div>
);

const RouteSearch = ({ routes, allPolylines, selectedRoutes, routeMaxStops, toggleRoute }) => {
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...routes].sort((a, b) => {
      const pa = allPolylines.find((p) => p.route_id === a.route_id);
      const pb = allPolylines.find((p) => p.route_id === b.route_id);
      return (Number(pb?.stop_count) || 0) - (Number(pa?.stop_count) || 0);
    });
    if (!q) return sorted;
    return sorted.filter((r) =>
      (r.short_name || '').toLowerCase().includes(q) ||
      (r.long_name || '').toLowerCase().includes(q) ||
      (r.route_id || '').toLowerCase().includes(q)
    );
  }, [routes, allPolylines, query]);

  return (
    <>
      <div className="relative">
        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar rota..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-[#0f0f12] border border-[#1c1c1f] text-[10px] text-white placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
        />
      </div>
      <div className="space-y-1.5">
        {filtered.map((route, idx) => {
          const isSelected = selectedRoutes.includes(route.route_id);
          const polyRoute = allPolylines.find((p) => p.route_id === route.route_id);
          const color = polyRoute?.color || route.color || PALETTE[idx % PALETTE.length];
          const stopCount = polyRoute?.stop_count || route.stop_count || 0;
          const freqRatio = routeMaxStops > 0 ? Math.min(stopCount / routeMaxStops, 1) : 0;
          return (
            <button
              key={route.route_id}
              onClick={() => toggleRoute(route.route_id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-left ${
                isSelected
                  ? 'bg-orange-500/10 border-orange-500/50'
                  : 'bg-[#0f0f12] border-[#1c1c1f] hover:border-[#2a2a2e]'
              }`}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black truncate ${isSelected ? 'text-orange-300' : 'text-white'}`}>
                    {route.short_name || route.route_id}
                  </span>
                  {isSelected && <span className="text-[8px] text-orange-400 font-bold bg-orange-500/15 px-1 rounded">✓</span>}
                </div>
                {route.long_name && <div className="text-[8px] text-muted-foreground truncate">{route.long_name}</div>}
              </div>
              {stopCount > 0 && (
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-[8px] text-muted-foreground">{stopCount} par.</span>
                  <div className="w-10 h-0.5 bg-[#1c1c1f] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${freqRatio * 100}%`, backgroundColor: color }} />
                  </div>
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-[9px] text-muted-foreground text-center py-3">Sem resultados</p>
        )}
      </div>
    </>
  );
};

const VEHICLE_ICON_MAP = { car: Car, bus: Bus, ambulance: Truck };
const VEHICLE_LABEL_MAP = { car: 'Carro', bus: 'Autocarro', ambulance: 'Ambulância' };
const VEHICLE_COLOR_MAP = { car: '#3b82f6', bus: '#f97316', ambulance: '#ec4899' };

const VehicleMixBar = ({ type, value }) => {
  const Icon = VEHICLE_ICON_MAP[type] || MapPin;
  const label = VEHICLE_LABEL_MAP[type] || type;
  const color = VEHICLE_COLOR_MAP[type] || '#888';
  const pct = Math.min(Math.max(value || 0, 0), 1);
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 text-[9px] text-muted-foreground font-semibold flex items-center gap-1 flex-shrink-0">
        <Icon size={10} style={{ color }} />
        <span>{label}</span>
      </div>
      <div className="flex-1 h-1.5 bg-[#0f0f12] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] text-white font-bold w-9 text-right">{Math.round(pct * 100)}%</span>
    </div>
  );
};

const MiniHourChart = ({ departuresByHour }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const vals = hours.map((h) => Number(departuresByHour?.[String(h)] || 0));
  const maxV = Math.max(1, ...vals);
  const peakThr = maxV * 0.75;
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-[2px] h-12">
        {hours.map((h) => {
          const ratio = vals[h] / maxV;
          const isPeak = vals[h] >= peakThr;
          return (
            <div
              key={h}
              title={`${String(h).padStart(2,'0')}h: ${vals[h]}`}
              style={{
                height: `${Math.max(4, ratio * 100)}%`,
                backgroundColor: isPeak ? '#f97316' : vals[h] > 0 ? '#fb923c44' : '#1c1c1f',
                flex: 1,
              }}
              className="rounded-sm"
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground select-none">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
};

const HourTimeline = ({ departuresByHour, selectedHour, onSelect }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const vals = hours.map((h) => Number(departuresByHour?.[String(h)] || 0));
  const maxVal = Math.max(1, ...vals);
  const peakThreshold = maxVal * 0.75;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-[2px] h-14">
        {hours.map((h) => {
          const ratio = vals[h] / maxVal;
          const selected = selectedHour === h;
          const isPeak = vals[h] >= peakThreshold;
          let bg;
          if (selected) bg = '#f97316';
          else if (isPeak) bg = '#fb923c';
          else if (vals[h] > 0) bg = '#fb923c33';
          else bg = '#1c1c1f';
          return (
            <button
              key={h}
              onClick={() => onSelect(selectedHour === h ? null : h)}
              title={`${formatHour(h)}: ${vals[h]} partidas${isPeak && !selected ? ' · PICO' : ''}`}
              style={{
                height: `${Math.max(6, ratio * 100)}%`,
                backgroundColor: bg,
                outline: selected ? '1px solid #f9731688' : isPeak && !selected ? '1px solid #fb923c44' : 'none',
              }}
              className="flex-1 rounded-sm transition-all hover:opacity-90"
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground px-0.5 select-none">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
};

/* ── Historical Service Profile Panel (estilo simulação) ── */
const SERVICE_LEGEND = [
  { label: 'Autocarros', color: '#f59e0b', key: 'bus' },
  { label: 'Ligeiros (est.)', color: '#60a5fa', key: 'car' },
  { label: 'Emergência (est.)', color: '#ef4444', key: 'ambulance' },
];

const GtfsServiceProfile = ({ trafficProfile, stops, allPolylines, operators, departuresByHour }) => {
  if (!trafficProfile && !stops?.length) return null;

  const totalStops = stops?.length ?? 0;
  const totalRoutes = allPolylines?.length ?? 0;
  const totalOperators = operators?.length ?? 0;
  const deps = departuresByHour || trafficProfile?.departures_by_hour || {};
  const totalDepartures = Object.values(deps).reduce((s, v) => s + Number(v), 0);
  const peakHour = Object.entries(deps).sort(([, a], [, b]) => b - a)[0];
  const vehicleMix = trafficProfile?.vehicle_mix || { car: 0.6, bus: 0.35, ambulance: 0.05 };

  const cardStyle = 'bg-[#151518] border border-[#1c1c1f] rounded-2xl p-4';
  const labelStyle = 'text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Vehicle Distribution */}
      <div className={cardStyle}>
        <div className={`${labelStyle} mb-3`}>Vehicle Distribution</div>
        <div className="flex flex-col gap-3">
          {SERVICE_LEGEND.map((item) => {
            const pct = Math.round((vehicleMix[item.key] || 0) * 100);
            return (
              <div key={item.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ background: item.color }} />
                    <span className="text-xs font-bold text-white/70">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-white">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0c0c0e] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Performance (dados históricos) */}
      <div className={cardStyle}>
        <div className={`${labelStyle} mb-3`}>Service Performance</div>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-white/50">TOTAL PARTIDAS/DIA</span>
            <span className="text-lg font-black text-white">{totalDepartures.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-white/50">HORA DE PICO</span>
            <div className="text-right">
              <span className="text-lg font-black text-orange-400">{peakHour ? formatHour(Number(peakHour[0])) : '--'}</span>
              {peakHour && <div className="text-[9px] font-bold text-emerald-400">{peakHour[1]} partidas</div>}
            </div>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-white/50">MÉD. PARTIDAS/HORA</span>
            <span className="text-lg font-black text-white">{Math.round(totalDepartures / 24)}</span>
          </div>
        </div>
      </div>

      {/* Network Summary */}
      <div className={cardStyle}>
        <div className={`${labelStyle} mb-3`}>Network Summary</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'PARAGENS', value: totalStops.toLocaleString(), color: '#f97316' },
            { label: 'ROTAS', value: totalRoutes.toLocaleString(), color: '#3b82f6' },
            { label: 'OPERADORES', value: totalOperators, color: '#10b981' },
            { label: 'SERVIÇO', value: trafficProfile?.source?.service_date || '--', color: '#a855f7' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1 bg-[#0c0c0e] rounded-xl p-3 border border-white/5">
              <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-wider">{item.label}</span>
              <span className="text-sm font-black text-white">{item.value}</span>
              <div className="h-0.5 rounded-full mt-1" style={{ background: item.color, width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const GtfsMapView = ({ onSimulateDistrict } = {}) => {
  const [data, setData] = React.useState(null);
  const [shapesData, setShapesData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Filtros
  const [selectedHour, setSelectedHour] = React.useState(null);
  const [selectedRoutes, setSelectedRoutes] = React.useState([]);
  const [activityThreshold, setActivityThreshold] = React.useState(0);
  const [showAllRoutes, setShowAllRoutes] = React.useState(true);

  const [selectedOperators, setSelectedOperators] = React.useState(null); // null = todos selecionados

  // UI state
  const [showPolylines, setShowPolylines] = React.useState(true);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [ultraFastPreference, setUltraFastPreference] = React.useState(() => loadUltraFastPreference());
  const [mapZoom, setMapZoom] = React.useState(12);
  const playRef = React.useRef(null);
  const [trafficProfile, setTrafficProfile] = React.useState(null);
  const [stopSearch, setStopSearch] = React.useState('');
  const [sidebarTab, setSidebarTab] = React.useState('filtros');
  const [flyTarget, setFlyTarget] = React.useState(null);
  const [tileStyle, setTileStyle] = React.useState('dark');
  const [highlightedStop, setHighlightedStop] = React.useState(null);
  const [fitBoundsTarget, setFitBoundsTarget] = React.useState(null);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(ULTRA_FAST_MODE_STORAGE_KEY, ultraFastPreference);
    } catch {
      // Ignore storage failures; runtime toggle still works.
    }
  }, [ultraFastPreference]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [mapRes, shapesRes, profileRes] = await Promise.all([
          fetch('/data/gtfs_map_latest.json', { cache: 'no-store' }),
          fetch('/data/gtfs_shapes_latest.json', { cache: 'no-store' }),
          fetch('/data/gtfs_traffic_profile_latest.json', { cache: 'no-store' }),
        ]);
        if (!mapRes.ok) throw new Error(`Erro ao carregar mapa (${mapRes.status})`);
        const mapPayload = await mapRes.json();
        const shapesPayload = shapesRes.ok ? await shapesRes.json() : null;
        const profilePayload = profileRes.ok ? await profileRes.json() : null;
        if (!cancelled) { setData(mapPayload); setShapesData(shapesPayload); setTrafficProfile(profilePayload); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Play animation: cycle hours
  React.useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setSelectedHour((prev) => (prev === null ? 0 : (prev + 1) % 24));
      }, 600);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying]);

  const hasMultipleOperators = Array.isArray(data?.operators) && data.operators.length > 1;
  const center = hasMultipleOperators
    ? PORTUGAL_CENTER
    : (data?.center ? [data.center.lat, data.center.lon] : FALLBACK_CENTER);
  const initialZoom = hasMultipleOperators ? 7 : 12;
  const stops = React.useMemo(() => (Array.isArray(data?.stops) ? data.stops : []), [data?.stops]);
  const routes = React.useMemo(() => (Array.isArray(data?.routes) ? data.routes : []), [data?.routes]);
  const operators = React.useMemo(() => (Array.isArray(data?.operators) ? data.operators : []), [data?.operators]);
  const operatorKeys = React.useMemo(() => new Set(operators.map((o) => o.key)), [operators]);
  const activeOperatorSet = React.useMemo(
    () => selectedOperators || new Set(operators.map((o) => o.key)),
    [selectedOperators, operators]
  );
  const operatorColorMap = React.useMemo(() => {
    const map = new Map();
    operators.forEach((op, idx) => {
      map.set(op.key, PALETTE[idx % PALETTE.length]);
    });
    return map;
  }, [operators]);
  const departuresByHour = React.useMemo(() => (data?.departures_by_hour || {}), [data?.departures_by_hour]);
  const maxActivity = React.useMemo(
    () => Math.max(1, ...stops.map((s) => Number(s.activity) || 0)),
    [stops]
  );

  // Hour factor: scale markers by relative busyness of selected hour
  const totalDep = React.useMemo(
    () => Object.values(departuresByHour).reduce((s, v) => s + Number(v), 0),
    [departuresByHour]
  );
  const avgDep = totalDep / 24 || 1;
  const hourDep = selectedHour !== null ? Number(departuresByHour[String(selectedHour)] || 0) : avgDep;
  const hourFactor = selectedHour !== null ? Math.max(0.25, hourDep / avgDep) : 1;

  // Filtered stops
  const filteredStops = React.useMemo(() => {
    const search = stopSearch.trim().toLowerCase();
    return stops.filter((stop) => {
      if (Number(stop.activity) < activityThreshold) return false;
      if (selectedOperators && !selectedOperators.has(stop.operator)) return false;
      if (search && !stop.name?.toLowerCase().includes(search)) return false;
      if (!showAllRoutes && selectedRoutes.length > 0) {
        return selectedRoutes.some((r) => (stop.routes || []).includes(r));
      }
      return true;
    });
  }, [stops, activityThreshold, selectedOperators, showAllRoutes, selectedRoutes, stopSearch]);

  React.useEffect(() => {
    setMapZoom(initialZoom);
  }, [initialZoom]);

  const overviewStopsByOperator = React.useMemo(() => {
    if (!hasMultipleOperators) return [];

    const byOperator = new Map();
    for (const stop of filteredStops) {
      const op = stop.operator || '__unknown__';
      if (!byOperator.has(op)) {
        byOperator.set(op, {
          operator: op,
          count: 0,
          activity: 0,
          latSum: 0,
          lonSum: 0,
        });
      }
      const acc = byOperator.get(op);
      acc.count += 1;
      acc.activity += Number(stop.activity) || 0;
      acc.latSum += Number(stop.lat) || 0;
      acc.lonSum += Number(stop.lon) || 0;
    }

    const base = [...byOperator.values()]
      .filter((op) => op.count > 0)
      .map((op) => ({
        ...op,
        lat: op.latSum / op.count,
        lon: op.lonSum / op.count,
        name: operators.find((item) => item.key === op.operator)?.name || op.operator,
      }));

    return spreadOverviewMarkers(base);
  }, [filteredStops, hasMultipleOperators, operators]);

  const topStops = React.useMemo(
    () => [...filteredStops].sort((a, b) => (b.activity || 0) - (a.activity || 0)).slice(0, 8),
    [filteredStops]
  );

  // Polylines to render
  const allPolylines = React.useMemo(() => (shapesData?.routes || []), [shapesData]);

  const routeMaxStops = React.useMemo(
    () => Math.max(1, ...allPolylines.map((p) => Number(p.stop_count) || 0)),
    [allPolylines]
  );

  const focusedRoute = React.useMemo(() => {
    if (selectedRoutes.length !== 1) return null;
    return allPolylines.find((p) => p.route_id === selectedRoutes[0]) || null;
  }, [selectedRoutes, allPolylines]);

  const focusedRouteBounds = React.useMemo(
    () => buildBoundsFromCoordinates(focusedRoute?.coordinates),
    [focusedRoute]
  );

  const isLargeDataset = React.useMemo(() => {
    return stops.length >= LARGE_DATASET_STOP_THRESHOLD || allPolylines.length >= LARGE_DATASET_POLYLINE_THRESHOLD;
  }, [stops.length, allPolylines.length]);

  const ultraFastMode = ultraFastPreference === 'on' || (ultraFastPreference === 'auto' && isLargeDataset);

  const renderBudget = React.useMemo(
    () => getRenderBudget(mapZoom, ultraFastMode),
    [mapZoom, ultraFastMode]
  );

  const visibleStopsByZoom = React.useMemo(() => {
    if (mapZoom < renderBudget.minStopZoom) return [];
    if (filteredStops.length <= renderBudget.stops) return filteredStops;

    return selectBalancedByOperator(
      filteredStops,
      renderBudget.stops,
      (stop) => stop.operator,
      (stop) => Number(stop.activity) || 0
    );
  }, [filteredStops, renderBudget, mapZoom]);

  const visiblePolylines = React.useMemo(() => {
    if (!showPolylines) return [];

    const base = !showAllRoutes && selectedRoutes.length > 0
      ? allPolylines.filter((p) => selectedRoutes.includes(p.route_id))
      : allPolylines;

    const byOperator = base.filter((p) => !selectedOperators || selectedOperators.has(p.operator));
    if (byOperator.length <= renderBudget.polylines) return byOperator;

    return selectBalancedByOperator(
      byOperator,
      renderBudget.polylines,
      (polyline) => polyline.operator,
      (polyline) => Number(polyline.stop_count) || 0
    );
  }, [showPolylines, showAllRoutes, selectedRoutes, allPolylines, selectedOperators, renderBudget]);

  const hasFilters = activityThreshold > 0 || selectedRoutes.length > 0 || selectedHour !== null || selectedOperators !== null || stopSearch.trim() !== '';

  const toggleOperator = (key) => {
    setSelectedOperators((prev) => {
      const all = new Set(operators.map((o) => o.key));
      const current = prev || all;
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next.size === all.size ? null : next;
    });
  };

  const resetFilters = () => {
    setSelectedHour(null);
    setSelectedRoutes([]);
    setActivityThreshold(0);
    setShowAllRoutes(true);
    setIsPlaying(false);
    setSelectedOperators(null);
    setStopSearch('');
  };

  const toggleRoute = (routeId) => {
    setShowAllRoutes(false);
    setSelectedRoutes((prev) =>
      prev.includes(routeId) ? prev.filter((r) => r !== routeId) : [...prev, routeId]
    );
  };

  const ultraFastLabel = ultraFastPreference === 'auto'
    ? (ultraFastMode ? 'Automatico' : 'Automatico')
    : ultraFastPreference === 'on'
      ? 'Rapido'
      : 'Detalhado';

  const ultraFastDescription = ultraFastPreference === 'auto'
    ? (isLargeDataset ? 'ajuste automatico para dataset grande' : 'ajuste automatico')
    : ultraFastPreference === 'on'
      ? 'modo leve sempre ativo'
      : 'maximo detalhe sempre ativo';

  if (loading) {
    return (
      <div className="flex-1 bg-[#09090b] p-8">
        <div className="h-full rounded-3xl border border-[#1c1c1f] bg-[#151518] flex items-center justify-center text-muted-foreground">
          A carregar mapa GTFS...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 bg-[#09090b] p-8">
        <div className="h-full rounded-3xl border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-300 px-6 text-center">
          {error || 'Dados GTFS indisponíveis. Corre: python experiments/export_gtfs_map_data.py'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#09090b] p-8 hide-scrollbar">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-white">GTFS Transit Map</h1>
        <p className="text-muted-foreground text-sm font-medium opacity-70 mt-1">
          {data.agency} · Serviço em {data.date}
          {selectedHour !== null && (
            <span className="ml-2 text-orange-400 font-bold">
              · {formatHour(selectedHour)} — {hourDep} partidas
            </span>
          )}
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Bus} label="Paragens" value={data.summary?.stops_exported ?? 0} />
        <StatCard icon={Route} label="Rotas" value={data.summary?.routes_total ?? 0} />
        <StatCard icon={CalendarDays} label="Serviços Ativos" value={data.summary?.active_services ?? 0} />
        <StatCard icon={Clock3} label="Trips Ativas" value={data.summary?.active_trips ?? 0} />
      </div>

      {/* Network KPIs */}
      <NetworkKPIs stops={stops} allPolylines={allPolylines} operators={operators} departuresByHour={departuresByHour} />

      {/* Operator Distribution + Top Routes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6 mb-6">
        <OperatorDonutChart operators={operators} allPolylines={allPolylines} stops={stops} />
        <TopRoutesRanking allPolylines={allPolylines} routes={routes} />
      </div>

      {/* District Coverage */}
      <div className="mb-6">
        <DistrictCoverage operatorKeys={operatorKeys} />
      </div>

      {/* Hour Timeline */}
      <div className="bg-[#151518] border border-[#1c1c1f] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              Timeline · Partidas por Hora
            </h3>
            {selectedHour !== null && (
              <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                {formatHour(selectedHour)} · {hourDep} partidas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center rounded-lg border border-[#1c1c1f] bg-[#0f0f12] p-1">
              {[
                { key: 'auto', label: 'Automatico' },
                { key: 'on', label: 'Rapido' },
                { key: 'off', label: 'Detalhado' },
              ].map((modeOption) => {
                const active = ultraFastPreference === modeOption.key;
                return (
                  <button
                    key={modeOption.key}
                    onClick={() => setUltraFastPreference(modeOption.key)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'text-muted-foreground border border-transparent hover:text-white'
                    }`}
                    title={`Mudar modo do mapa para ${modeOption.label}`}
                  >
                    {modeOption.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                isPlaying
                  ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                  : 'bg-[#0f0f12] border-[#1c1c1f] text-muted-foreground hover:border-orange-500/40'
              }`}
            >
              {isPlaying ? <Pause size={11} /> : <Play size={11} />}
              {isPlaying ? 'Parar' : 'Animar'}
            </button>
            {selectedHour !== null && (
              <button
                onClick={() => { setSelectedHour(null); setIsPlaying(false); }}
                className="text-[10px] font-bold text-muted-foreground hover:text-orange-400 px-2"
              >
                Todas as horas
              </button>
            )}
          </div>
        </div>
        <HourTimeline
          departuresByHour={departuresByHour}
          selectedHour={selectedHour}
          onSelect={setSelectedHour}
        />
      </div>

      {/* Historical Service Profile */}
      <GtfsServiceProfile
        trafficProfile={trafficProfile}
        stops={stops}
        allPolylines={allPolylines}
        operators={operators}
        departuresByHour={departuresByHour}
      />

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 min-h-[620px]">
        {/* Map */}
        <div className="rounded-3xl border border-[#1c1c1f] overflow-hidden bg-[#101013] relative">
          {/* Tile style switcher overlay */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1 bg-[#09090bcc] border border-[#1c1c1f] rounded-xl p-1 backdrop-blur">
            <Layers size={10} className="text-muted-foreground ml-1 mr-0.5" />
            {Object.entries(TILE_LAYERS).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => setTileStyle(key)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                  tileStyle === key
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>

          <div className="absolute top-3 right-3 z-[1000] bg-[#09090bcc] border border-[#1c1c1f] rounded-xl px-3 py-2 backdrop-blur text-[9px] space-y-1 min-w-[180px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Legenda</span>
              {(highlightedStop || fitBoundsTarget) && (
                <button
                  onClick={() => {
                    setHighlightedStop(null);
                    setFlyTarget(null);
                    setFitBoundsTarget(null);
                  }}
                  className="text-[8px] font-bold text-orange-300 hover:text-orange-200"
                >
                  limpar foco
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Paragens visíveis</span>
              <span className="text-orange-300 font-bold">{visibleStopsByZoom.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rotas visíveis</span>
              <span className="text-orange-300 font-bold">{visiblePolylines.length}</span>
            </div>
            <div className="pt-1 border-t border-[#1c1c1f] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#fde68a] border border-[#fbbf24]" />
              <span className="text-muted-foreground">Paragem destacada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#fb923c]" />
              <span className="text-muted-foreground">Atividade até {maxActivity}</span>
            </div>
          </div>

          <MapContainer center={center} zoom={initialZoom} scrollWheelZoom className="h-[620px] w-full" preferCanvas zoomAnimation={false} fadeAnimation={false} markerZoomAnimation={false}>
            <MapAutoResize />
            <MapViewportTracker onZoomChange={setMapZoom} />
            <MapFlyController target={flyTarget} />
            <MapBoundsController bounds={fitBoundsTarget} />
            <TileLayer
              key={tileStyle}
              attribution={TILE_LAYERS[tileStyle].attr}
              url={TILE_LAYERS[tileStyle].url}
              updateWhenIdle
              keepBuffer={1}
            />
            {/* Route polylines — rendered below stops */}
            {visiblePolylines.map((route, idx) => {
              const isHighlighted = selectedRoutes.includes(route.route_id);
              const freqRatio = Math.min((Number(route.stop_count) || 0) / routeMaxStops, 1);
              const polyColor = route.color || PALETTE[idx % PALETTE.length];
              return (
                <Polyline
                  key={route.route_id}
                  positions={simplifyCoordinates(route.coordinates, renderBudget.routePoints)}
                  pathOptions={{
                    color: polyColor,
                    weight: isHighlighted ? 5 : 2 + freqRatio * 2.5,
                    opacity: isHighlighted ? 1 : Math.max(0.45, 0.5 + freqRatio * 0.4),
                  }}
                  eventHandlers={{ click: () => toggleRoute(route.route_id) }}
                >
                  <Popup>
                    <strong>{route.short_name}</strong>
                    {route.long_name && <div style={{ fontSize: 11 }}>{route.long_name}</div>}
                    {route.stop_count > 0 && <div style={{ fontSize: 11 }}>Paragens: {route.stop_count}</div>}
                  </Popup>
                </Polyline>
              );
            })}
            {/* Country overview markers (low zoom) — native Leaflet, not React */}
            {mapZoom < 10 && <CanvasDistrictMarkers />}

            {/* Stop markers — native canvas layer */}
            {mapZoom >= 10 && (
              <CanvasStopsLayer
                stops={visibleStopsByZoom}
                maxActivity={maxActivity}
                hourFactor={hourFactor}
                highlightedStop={highlightedStop}
              />
            )}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="rounded-3xl border border-[#1c1c1f] bg-[#151518] flex flex-col overflow-hidden">

          {/* Tab Header */}
          <div className="flex border-b border-[#1c1c1f] px-2 pt-2 gap-1 flex-shrink-0">
            {[
              { key: 'filtros', label: 'Filtros' },
              { key: 'distritos', label: 'Distritos' },
              { key: 'rotas', label: 'Rotas' },
              { key: 'perfil', label: 'Tráfego' },
              { key: 'metricas', label: 'Métricas' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSidebarTab(tab.key)}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-t-lg border-b-2 transition-all ${
                  sidebarTab === tab.key
                    ? 'text-orange-400 border-orange-500 bg-orange-500/5'
                    : 'text-muted-foreground border-transparent hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* ─── TAB: FILTROS ─── */}
            {sidebarTab === 'filtros' && (
              <div className="flex flex-col gap-5">

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Filtros</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPolylines((p) => !p)}
                      title={showPolylines ? 'Ocultar rotas' : 'Mostrar rotas'}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                        showPolylines
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-[#0f0f12] border-[#1c1c1f] text-muted-foreground'
                      }`}
                    >
                      {showPolylines ? <Eye size={11} /> : <EyeOff size={11} />}
                      Rotas
                    </button>
                    {hasFilters && (
                      <button onClick={resetFilters} className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1">
                        <RotateCcw size={11} /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Stop search */}
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Pesquisar paragem..."
                    value={stopSearch}
                    onChange={(e) => setStopSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-[#0f0f12] border border-[#1c1c1f] text-[10px] text-white placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                {/* Operator filter */}
                {operators.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-muted-foreground font-semibold block">Operadores</label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedOperators(null)}
                          className="text-[8px] font-bold text-muted-foreground hover:text-orange-400 px-1.5 py-0.5 rounded border border-[#1c1c1f] hover:border-orange-500/30 transition-all"
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setSelectedOperators(new Set())}
                          className="text-[8px] font-bold text-muted-foreground hover:text-orange-400 px-1.5 py-0.5 rounded border border-[#1c1c1f] hover:border-orange-500/30 transition-all"
                        >
                          Nenhum
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {operators.map((op) => {
                        const active = !selectedOperators || selectedOperators.has(op.key);
                        return (
                          <button
                            key={op.key}
                            onClick={() => toggleOperator(op.key)}
                            className={`flex items-center gap-2 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all w-full text-left ${
                              active
                                ? 'border-[#2a2a2e] text-white bg-[#0f0f12]'
                                : 'border-[#1c1c1f] text-muted-foreground bg-[#0f0f12] opacity-35'
                            }`}
                          >
                            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: op.color }} />
                            <span className="truncate flex-1">{op.name}</span>
                            <span className="text-muted-foreground font-normal">{op.stop_count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Activity slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-muted-foreground font-semibold">Limiar de Atividade</label>
                    <span className="text-xs text-orange-400 font-bold">{activityThreshold}</span>
                  </div>
                  <input
                    type="range" min="0" max={maxActivity} value={activityThreshold}
                    onChange={(e) => setActivityThreshold(Number(e.target.value))}
                    className="w-full h-2 bg-[#0f0f12] rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                {/* Stats */}
                <div className="border-t border-[#1c1c1f] pt-3 text-[9px] text-muted-foreground space-y-1">
                  <div>Paragens visíveis: <span className="text-orange-400 font-bold">{filteredStops.length}/{stops.length}</span></div>
                  <div>Rotas no mapa: <span className="text-orange-400 font-bold">{visiblePolylines.length}</span></div>
                  <div>Zoom atual: <span className="text-orange-400 font-bold">{mapZoom.toFixed(0)}</span></div>
                  <div>Atividade total: <span className="text-orange-400 font-bold">{filteredStops.reduce((s, st) => s + (st.activity || 0), 0)}</span></div>
                  <div>Render: <span className={`font-bold ${ultraFastMode ? 'text-emerald-300' : 'text-muted-foreground'}`}>{ultraFastLabel}</span></div>
                  <div>Modo: <span className="font-bold text-muted-foreground">{ultraFastDescription}</span></div>
                  {filteredStops.length > visibleStopsByZoom.length && (
                    <div>Renderizadas: <span className="text-orange-400 font-bold">{visibleStopsByZoom.length}</span></div>
                  )}
                  {ultraFastMode && mapZoom < renderBudget.minStopZoom && (
                    <div>Paragens ocultas até zoom <span className="text-orange-400 font-bold">{renderBudget.minStopZoom}</span></div>
                  )}
                </div>

                {/* Top Stops */}
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-3">Paragens Mais Ativas</h3>
                  <div className="space-y-2">
                    {topStops.map((stop, idx) => {
                      const isHL = highlightedStop === stop.stop_id;
                      return (
                        <button
                          key={stop.stop_id}
                          onClick={() => {
                            const t = [stop.lat, stop.lon];
                            setFitBoundsTarget(null);
                            setFlyTarget(isHL ? null : t);
                            setHighlightedStop(isHL ? null : stop.stop_id);
                          }}
                          className={`w-full rounded-xl border px-3 py-2 transition-all text-left ${
                            isHL
                              ? 'bg-yellow-500/10 border-yellow-500/50'
                              : 'bg-[#0f0f12] border-[#1c1c1f] hover:border-[#2a2a2e]'
                          }`}
                        >
                          <div className="flex justify-between gap-3 items-center">
                            <div className="min-w-0">
                              <p className={`text-xs font-black ${isHL ? 'text-yellow-300' : 'text-orange-300'}`}>#{idx + 1}</p>
                              <p className="text-sm text-white font-semibold leading-tight truncate">{stop.name}</p>
                              {stop.routes?.length > 0 && (
                                <p className="text-[8px] text-muted-foreground truncate mt-0.5">{stop.routes.slice(0,5).join(', ')}{stop.routes.length > 5 ? ` +${stop.routes.length - 5}` : ''}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <p className="text-xs text-orange-400 font-black">{stop.activity}</p>
                              {isHL && <Globe size={10} className="text-yellow-400" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: DISTRITOS ─── */}
            {sidebarTab === 'distritos' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">18 Distritos</span>
                  <span className="text-[10px] text-muted-foreground">{Object.keys(DISTRICTS).length}/18 listados</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pr-1">
                  {Object.entries(DISTRICTS).map(([key, district]) => {
                    const availableDistrictOperators = district.operators.filter((op) => operatorKeys.has(op));
                    const activeDistrictOperators = availableDistrictOperators.filter((op) => activeOperatorSet.has(op));
                    const hasActiveOps = availableDistrictOperators.length > 0 && activeDistrictOperators.length > 0;
                    const disabled = availableDistrictOperators.length === 0;
                    
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (disabled) return;
                          const itemsToSelect = availableDistrictOperators;
                          if (itemsToSelect.length === 0) return;
                          
                          const selectedNow = selectedOperators || new Set(operators.map((o) => o.key));
                          const willDeselect = itemsToSelect.every((op) => selectedNow.has(op));
                          if (willDeselect) {
                            const next = new Set(selectedNow);
                            itemsToSelect.forEach((op) => next.delete(op));
                            setSelectedOperators(next.size === operators.length ? null : next);
                          } else {
                            const next = new Set(selectedNow);
                            itemsToSelect.forEach((op) => next.add(op));
                            setSelectedOperators(next.size === operators.length ? null : next);
                          }
                        }}
                        disabled={disabled}
                        className={`px-3 py-2 rounded-lg border transition-all text-sm font-semibold text-center ${
                          disabled
                            ? 'bg-[#0f0f12] border-[#1c1c1f] text-muted-foreground/40 cursor-not-allowed opacity-50'
                            : hasActiveOps
                            ? 'bg-orange-500/15 border-orange-500/50 text-orange-300'
                            : 'bg-[#0f0f12] border-[#1c1c1f] text-white hover:border-[#2a2a2e] hover:bg-[#1a1a1e]'
                        }`}
                      >
                        <div>{district.name}</div>
                        {!disabled && (
                          <div className="text-[8px] text-muted-foreground mt-0.5">
                            {activeDistrictOperators.length}/{availableDistrictOperators.length}
                          </div>
                        )}
                        {disabled && (
                          <div className="text-[8px] text-muted-foreground/60 mt-0.5">sem dados</div>
                        )}
                        {!disabled && onSimulateDistrict && (
                          <div
                            onClick={(e) => { e.stopPropagation(); onSimulateDistrict(key, district); }}
                            className="mt-1 text-[8px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 hover:bg-emerald-500/20 transition-all"
                          >
                            Simular
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="border-t border-[#1c1c1f] pt-3 text-[9px] text-muted-foreground">
                  <p className="font-semibold text-orange-400">Dica:</p>
                  <p>Clique em um distrito para filtrar operadores desse distrito. Zoome no mapa para ver detalhes.</p>
                </div>
              </div>
            )}

            {/* ─── TAB: ROTAS ─── */}
            {sidebarTab === 'rotas' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    {routes.length} Rotas
                  </span>
                  {selectedRoutes.length > 0 && (
                    <button
                      onClick={() => { setSelectedRoutes([]); setShowAllRoutes(true); }}
                      className="text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Limpar
                    </button>
                  )}
                </div>

                {/* Route search */}
                <RouteSearch routes={routes} allPolylines={allPolylines} selectedRoutes={selectedRoutes} routeMaxStops={routeMaxStops} toggleRoute={toggleRoute} />

                {/* Single route detail card */}
                {selectedRoutes.length === 1 && (() => {
                  const rid = selectedRoutes[0];
                  const rMeta = routes.find((r) => r.route_id === rid);
                  const rPoly = allPolylines.find((p) => p.route_id === rid);
                  const rColor = rPoly?.color || rMeta?.color || '#f97316';
                  const stopsOnRoute = stops.filter((s) => (s.routes || []).includes(rid));
                  return (
                    <div className="bg-[#0f0f12] rounded-2xl border border-orange-500/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: rColor }} />
                        <span className="text-sm font-black text-white">{rMeta?.short_name || rid}</span>
                        <span className="text-[9px] text-muted-foreground truncate flex-1">{rMeta?.long_name || ''}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div className="bg-[#151518] rounded-xl p-2 text-center">
                          <p className="text-muted-foreground">Paragens</p>
                          <p className="text-orange-400 font-black text-lg">{rPoly?.stop_count ?? stopsOnRoute.length}</p>
                        </div>
                        <div className="bg-[#151518] rounded-xl p-2 text-center">
                          <p className="text-muted-foreground">Atividade total</p>
                          <p className="text-orange-400 font-black text-lg">{stopsOnRoute.reduce((s, st) => s + (st.activity || 0), 0)}</p>
                        </div>
                      </div>
                      {stopsOnRoute.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[9px] text-muted-foreground">Top paragens desta rota</p>
                            {focusedRouteBounds && (
                              <button
                                onClick={() => {
                                  setHighlightedStop(null);
                                  setFlyTarget(null);
                                  setFitBoundsTarget(focusedRouteBounds);
                                }}
                                className="text-[8px] font-bold uppercase tracking-wide px-2 py-1 rounded-md border border-orange-500/35 text-orange-300 hover:bg-orange-500/10"
                              >
                                Enquadrar
                              </button>
                            )}
                          </div>
                          <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                            {[...stopsOnRoute].sort((a,b)=>(b.activity||0)-(a.activity||0)).slice(0,6).map((s) => (
                              <div key={s.stop_id} className="flex justify-between items-center text-[9px]">
                                <span className="text-white truncate flex-1">{s.name}</span>
                                <span className="text-orange-400 font-bold ml-2 flex-shrink-0">{s.activity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {selectedRoutes.length > 0 && (
                  <div className="border-t border-[#1c1c1f] pt-3 text-[9px] text-muted-foreground">
                    <div>{selectedRoutes.length} rota(s) selecionada(s)</div>
                    <div>Paragens filtradas: <span className="text-orange-400 font-bold">{filteredStops.length}</span></div>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: PERFIL DE TRÁFEGO ─── */}
            {sidebarTab === 'perfil' && (
              <div className="flex flex-col gap-5">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Perfil de Tráfego</span>

                {trafficProfile ? (
                  <>
                    {/* Vehicle Mix */}
                    <div className="bg-[#0f0f12] rounded-2xl border border-[#1c1c1f] p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={12} className="text-orange-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mix de Veículos</span>
                      </div>
                      {Object.entries(trafficProfile.vehicle_mix || {}).map(([type, val]) => (
                        <VehicleMixBar key={type} type={type} value={val} />
                      ))}
                    </div>

                    {/* Flow Factors */}
                    <div className="bg-[#0f0f12] rounded-2xl border border-[#1c1c1f] p-4 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-2">Fatores de Fluxo</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Mínimo</p>
                          <p className="text-2xl font-black text-blue-400">{trafficProfile.min_flow_factor?.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Máximo</p>
                          <p className="text-2xl font-black text-orange-400">{trafficProfile.max_flow_factor?.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#1c1c1f] rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full"
                          style={{
                            marginLeft: `${((trafficProfile.min_flow_factor || 0) / (trafficProfile.max_flow_factor || 1)) * 35}%`,
                            width: `${100 - ((trafficProfile.min_flow_factor || 0) / (trafficProfile.max_flow_factor || 1)) * 35}%`,
                            background: 'linear-gradient(to right, #3b82f6, #f97316)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Hourly departures mini chart */}
                    <div className="bg-[#0f0f12] rounded-2xl border border-[#1c1c1f] p-4 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Partidas por Hora</span>
                        {(() => {
                          const deps = trafficProfile.departures_by_hour || {};
                          const vals = Object.values(deps).map(Number);
                          const maxV = Math.max(1, ...vals);
                          const peakH = Object.entries(deps).filter(([,v]) => Number(v) >= maxV * 0.75);
                          return (
                            <div className="flex flex-wrap gap-1 justify-end">
                              {peakH.map(([h]) => (
                                <span key={h} className="text-[8px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/25 px-1.5 py-0.5 rounded-full">
                                  {String(Number(h)).padStart(2,'0')}h
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <MiniHourChart departuresByHour={trafficProfile.departures_by_hour} />
                    </div>

                    {/* Sim Parameters */}
                    <div className="bg-[#0f0f12] rounded-2xl border border-[#1c1c1f] p-4 space-y-1.5 text-[9px] text-muted-foreground">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-2">Parâmetros Simulação</span>
                      <div>Segundos/hora sim: <span className="text-orange-400 font-bold">{trafficProfile.sim_seconds_per_hour ?? '—'}</span></div>
                      <div>Fonte: <span className="text-white font-semibold">{trafficProfile.source?.type ?? '—'}</span></div>
                      <div>Gerado em: <span className="text-muted-foreground">{trafficProfile.generated_at ? new Date(trafficProfile.generated_at).toLocaleDateString('pt-PT') : '—'}</span></div>
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-muted-foreground bg-[#0f0f12] rounded-2xl border border-[#1c1c1f] p-4 text-center">
                    Perfil de tráfego não disponível.
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: MÉTRICAS (estilo simulação) ─── */}
            {sidebarTab === 'metricas' && (() => {
              const deps = departuresByHour || trafficProfile?.departures_by_hour || {};
              const totalDeps = Object.values(deps).reduce((s, v) => s + Number(v), 0);
              const peakEntry = Object.entries(deps).sort(([, a], [, b]) => b - a)[0];
              const vmix = trafficProfile?.vehicle_mix || { car: 0.6, bus: 0.35, ambulance: 0.05 };
              const depsArr = Array.from({ length: 24 }, (_, i) => Number(deps[i] || 0));
              const depsMax = Math.max(1, ...depsArr);

              const premiumCard = 'bg-[#151518] border border-[#1c1c1f] rounded-3xl p-5 flex flex-col gap-2 group hover:border-primary/20 transition-all shadow-lg';
              const legendItems = [
                { label: 'Autocarros', color: '#f59e0b', key: 'bus' },
                { label: 'Ligeiros', color: '#60a5fa', key: 'car' },
                { label: 'Emergência', color: '#ef4444', key: 'ambulance' },
              ];
              const metricCards = [
                { title: 'PARAGENS', value: stops.length.toLocaleString(), sub: 'total', comp: `${operators.length} operadores` },
                { title: 'ROTAS ATIVAS', value: allPolylines.length.toLocaleString(), sub: 'no mapa', comp: `~${Math.round(stops.length / Math.max(1, allPolylines.length))} par./rota` },
                { title: 'PARTIDAS/DIA', value: totalDeps.toLocaleString(), sub: 'agendadas', comp: `~${Math.round(totalDeps / 24)}/hora` },
                { title: 'HORA DE PICO', value: peakEntry ? `${String(Number(peakEntry[0])).padStart(2, '0')}:00` : '--', sub: peakEntry ? `${peakEntry[1]} partidas` : '', comp: `${Math.round(((peakEntry?.[1] || 0) / Math.max(1, totalDeps)) * 100)}% do total` },
                { title: 'SERVIÇOS ATIVOS', value: (data?.summary?.active_services || 0).toLocaleString(), sub: 'trips', comp: trafficProfile?.source?.service_date || '--' },
                { title: 'COBERTURA', value: `${operators.length}`, sub: 'operadores', comp: '18 distritos rastreados' },
              ];

              return (
                <div className="flex flex-col gap-5">
                  {/* Vehicle Distribution */}
                  <div className={premiumCard}>
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-50">Vehicle Distribution</div>
                    <div className="flex flex-col gap-3">
                      {legendItems.map((item) => {
                        const pct = Math.round((vmix[item.key] || 0) * 100);
                        return (
                          <div key={item.key} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between group/item">
                              <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ background: item.color }} />
                                <span className="text-xs font-bold text-white/70 group-hover/item:text-white transition-colors">{item.label}</span>
                              </div>
                              <span className="text-[10px] font-black text-white">{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#0c0c0e] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Departures Sparkline */}
                  <div className={premiumCard}>
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-50">Partidas por Hora</div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-white/50">DEPARTURES / HOUR</span>
                        <span className="text-sm font-black text-white">{totalDeps.toLocaleString()}/dia</span>
                      </div>
                      <div className="bg-[#0c0c0e]/50 rounded-xl p-2 border border-white/5">
                        <svg width="100%" height={50} viewBox={`0 0 248 50`} preserveAspectRatio="none">
                          <polyline
                            fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            points={depsArr.map((v, i) => `${(i / 23) * 248},${50 - (v / depsMax) * 46 - 2}`).join(' ')}
                          />
                        </svg>
                      </div>
                      <div className="flex justify-between text-[8px] text-muted-foreground/40 font-bold">
                        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric Cards */}
                  <div className="flex flex-col gap-4">
                    {metricCards.map((item) => (
                      <div key={item.title} className={premiumCard}>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">{item.title}</span>
                          <div className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black uppercase">GTFS</div>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-2xl font-black text-white tracking-tight leading-none">{item.value}</span>
                          {item.sub && <span className="text-[10px] font-black text-muted-foreground/40">{item.sub}</span>}
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] font-bold">
                          <span className="text-muted-foreground/40">Info</span>
                          <span className="text-primary">{item.comp}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom summary bar */}
                  <div className={`${premiumCard} flex-row justify-between items-center bg-[#151518]/50 mt-2`}>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white leading-none">{stops.length.toLocaleString()}</span>
                      <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">PARAG.</span>
                    </div>
                    <div className="w-px h-6 bg-white/5" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-zinc-400 leading-none">{allPolylines.length}</span>
                      <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">ROTAS</span>
                    </div>
                    <div className="w-px h-6 bg-white/5" />
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-primary leading-none">{operators.length}</span>
                      <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">OPER.</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>
    </div>
  );
};
