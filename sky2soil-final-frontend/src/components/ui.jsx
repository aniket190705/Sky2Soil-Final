import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { chartData } from "../data/mockData";

export function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {description && <p>{description}</p>}
    </header>
  );
}

export function MetricCard({ item }) {
  const Icon = item.icon;
  const rising = !String(item.trend).startsWith("-");
  return (
    <article className={`metric-card tone-${item.tone}`}>
      <div className="metric-top">
        <span className="metric-icon"><Icon size={21} /></span>
        <span className="status-pill">{item.status}</span>
      </div>
      <div className="metric-value">
        {item.value}<small>{item.unit}</small>
      </div>
      <div className="metric-bottom">
        <span>{item.label}</span>
        <span className={rising ? "trend up" : "trend down"}>
          {rising ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
          {item.trend}
        </span>
      </div>
    </article>
  );
}

export function Gauge({ value = 92, label = "Farm Health Score" }) {
  return (
    <article className="panel gauge-panel">
      <div className="gauge" style={{ "--value": value }}>
        <div>
          <strong>{value}</strong>
          <span>/100</span>
        </div>
      </div>
      <div>
        <span className="eyebrow">AI Assessment</span>
        <h2>{label}</h2>
        <p>Excellent crop vitality with stable moisture and strong light exposure.</p>
      </div>
    </article>
  );
}

export function MiniStat({ label, value, icon: Icon }) {
  return (
    <article className="mini-stat">
      {Icon && <Icon size={19} />}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function ChartPanel({ title, dataKey, color = "#1f9d55", area = false, data = chartData }) {
  const Chart = area ? AreaChart : LineChart;
  return (
    <article className="panel chart-panel">
      <div className="panel-title">
        <h3>{title}</h3>
        <span className="status-pill">Live</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <Chart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`${dataKey}-gradient`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.24} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#d8e4dc" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#60736a" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#60736a" }} />
          <Tooltip contentStyle={{ border: "0", borderRadius: 12, boxShadow: "0 16px 40px rgba(29, 55, 42, .14)" }} />
          {area ? (
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fill={`url(#${dataKey}-gradient)`} />
          ) : (
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          )}
        </Chart>
      </ResponsiveContainer>
    </article>
  );
}

export function StatusBadge({ children, tone = "green" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ConnectedRow({ name }) {
  return (
    <div className="health-row">
      <div><CheckCircle2 size={18} /><span>{name}</span></div>
      <StatusBadge>Connected</StatusBadge>
    </div>
  );
}
