import { AlertTriangle, CalendarClock, Droplets, IndianRupee, Leaf, Sprout } from "lucide-react";
import { Gauge, MetricCard, MiniStat, PageHeader, StatusBadge } from "../components/ui";
import { activeAlerts, smartCards, summaryCards, weatherToday } from "../data/mockData";
import {
  buildAlerts,
  buildDashboardMetrics,
  buildRecommendations,
  buildWeatherSummary,
  calculateHealthScore,
  formatDateTime,
  getSensorSnapshot
} from "../lib/liveData";

export default function Dashboard({ appData }) {
  const sensor = getSensorSnapshot(appData?.latestSensor);
  const prediction = appData?.latestPrediction;
  const metrics = sensor ? buildDashboardMetrics(sensor, prediction) : summaryCards;
  const recommendationItems = sensor
    ? buildRecommendations(sensor, prediction).slice(0, 3).map((text, index) => ({
        text,
        tone: ["green", "blue", "yellow"][index] || "green",
        icon: [Droplets, Leaf, AlertTriangle][index] || Leaf
      }))
    : smartCards;
  const alertItems = sensor ? buildAlerts(sensor, prediction) : [];
  const alertLabels = alertItems.length ? alertItems.map((item) => item.title).slice(0, 4) : activeAlerts;
  const weatherItems = sensor ? buildWeatherSummary(sensor, appData?.latestSensor) : weatherToday;
  const healthScore = sensor ? calculateHealthScore(sensor, prediction) : 92;

  return (
    <section className="page">
      <PageHeader
        eyebrow="Command Center"
        title="Farm Dashboard"
        description="A connected overview of live field readings, backend status, and model-assisted guidance."
      />

      {appData?.sensorError && (
        <div className="info-banner warning">
          Live sensor API is unavailable right now, so the dashboard is showing demo fallback data.
        </div>
      )}

      <div className="metric-grid">
        {metrics.map((item) => <MetricCard key={item.label} item={item} />)}
      </div>

      <div className="two-column">
        <Gauge value={healthScore} />
        <article className="panel crop-panel">
          <span className="eyebrow">Current Prediction Context</span>
          <h2>{prediction?.input?.crop_type || "Prediction Pending"}</h2>
          <div className="crop-grid">
            <MiniStat label="Current Crop" value={prediction?.input?.crop_type || "Not set"} icon={Leaf} />
            <MiniStat
              label="Latest Yield"
              value={prediction?.predicted_yield_ton_per_hectare ? `${prediction.predicted_yield_ton_per_hectare.toFixed(2)} Ton/Ha` : "Generate prediction"}
              icon={Sprout}
            />
            <MiniStat
              label="Last Sync"
              value={appData?.latestSensor?.receivedAt ? formatDateTime(appData.latestSensor.receivedAt) : "Waiting for ESP32"}
              icon={CalendarClock}
            />
          </div>
        </article>
      </div>

      <div className="content-grid">
        <article className="panel">
          <div className="panel-title">
            <h3>Latest Field Summary</h3>
            <StatusBadge tone="blue">{sensor ? "Live API" : "Demo Fallback"}</StatusBadge>
          </div>
          <div className="weather-grid">
            {weatherItems.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <h3>Today's Smart Recommendation</h3>
            <StatusBadge>{prediction ? "Model Ready" : "Live Rules"}</StatusBadge>
          </div>
          <div className="recommendation-stack">
            {recommendationItems.map((item) => {
              const Icon = item.icon;
              return (
                <div className={`recommendation-card tone-${item.tone}`} key={item.text}>
                  <Icon size={20} />
                  <span>{item.text}</span>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <div className="content-grid">
        <article className="panel">
          <div className="panel-title">
            <h3>Active Alerts</h3>
            <StatusBadge tone="orange">{alertLabels.length} Active</StatusBadge>
          </div>
          <div className="alert-list compact">
            {alertLabels.map((alert, index) => (
              <div className="alert-row" key={alert}>
                <AlertTriangle size={18} />
                <span>{alert}</span>
                <StatusBadge tone={index < 2 ? "orange" : "blue"}>{index < 2 ? "Warning" : "Info"}</StatusBadge>
              </div>
            ))}
          </div>
        </article>

        <article className="panel water-panel">
          <div className="panel-title">
            <h3>Operations Snapshot</h3>
            <StatusBadge>Efficient</StatusBadge>
          </div>
          <div className="crop-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <MiniStat
              label="Water Decision"
              value={sensor?.rain_status === "Rain" ? "Delay irrigation" : "Check moisture"}
              icon={Droplets}
            />
            <MiniStat
              label="Model Yield"
              value={prediction?.predicted_yield_ton_per_hectare ? `${prediction.predicted_yield_ton_per_hectare.toFixed(2)} Ton/Ha` : "Pending"}
              icon={Droplets}
            />
          </div>
        </article>
      </div>
    </section>
  );
}
