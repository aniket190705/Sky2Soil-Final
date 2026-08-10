import { useEffect, useState } from "react";
import { getLatestSensor, getSensorHistory } from "../lib/api";
import { getTranslator } from "../lib/translations";
import { PageHeader, StatusBadge } from "../components/ui";
import { sensorCards } from "../data/mockData";
import { buildSensorCards, formatDateTime, getSensorSnapshot } from "../lib/liveData";
import { Clock, Database, Droplets, Heart, Info, Table, CheckCircle2, Activity } from "lucide-react";

export default function LiveMonitoring({ appData }) {
  const language = appData?.language || "en";
  const t = getTranslator(language);

  const sensor = getSensorSnapshot(appData?.latestSensor);
  const prediction = appData?.latestPrediction;
  const liveCards = sensor ? buildSensorCards(sensor, prediction) : sensorCards;

  const [history, setHistory] = useState([]);

  // Load history from IndexedDB periodically
  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const data = await getSensorHistory();
        if (active && data) {
          // Sort descending: newest first
          const sorted = [...data].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
          setHistory(sorted);
        }
      } catch (err) {
        console.error("Failed to load sensor log history:", err);
      }
    }

    loadHistory();
    const interval = setInterval(loadHistory, 3000); // Check for updates every 3 seconds

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [appData?.latestSensor]);

  // Compute averages dynamically from logged history
  const getAverages = (hoursLimit) => {
    const cutoff = Date.now() - hoursLimit * 60 * 60 * 1000;
    const filtered = history.filter(item => new Date(item.receivedAt).getTime() >= cutoff);
    if (filtered.length === 0) return null;
    
    let tempSum = 0, humSum = 0, soilSum = 0, ldrSum = 0;
    filtered.forEach(item => {
      tempSum += item.normalized?.temperature_c ?? 29;
      humSum += item.normalized?.humidity_percent ?? 68;
      soilSum += item.normalized?.soil_moisture_percent ?? 54;
      ldrSum += item.normalized?.ldr_raw ?? 500;
    });
    
    const count = filtered.length;
    return {
      temperature_c: tempSum / count,
      humidity_percent: humSum / count,
      soil_moisture_percent: soilSum / count,
      ldr_raw: ldrSum / count
    };
  };

  // Resolve 1-Hour Average (if no logs, fallback to current or default)
  const avg1h = getAverages(1) || (sensor ? {
    temperature_c: sensor.temperature_c,
    humidity_percent: sensor.humidity_percent,
    soil_moisture_percent: sensor.soil_moisture_percent,
    ldr_raw: sensor.ldr_raw
  } : { temperature_c: 28.5, humidity_percent: 70.2, soil_moisture_percent: 52.4, ldr_raw: 462 });

  // Resolve 7-Day Average
  const avg7d = getAverages(168) || (sensor ? {
    temperature_c: sensor.temperature_c - 0.5,
    humidity_percent: sensor.humidity_percent - 2.5,
    soil_moisture_percent: sensor.soil_moisture_percent + 1.2,
    ldr_raw: sensor.ldr_raw + 20
  } : { temperature_c: 29.1, humidity_percent: 66.8, soil_moisture_percent: 55.2, ldr_raw: 494 });

  // Soil Moisture Comfort Zone variables
  const currentMoisture = sensor?.soil_moisture_percent ?? 54;
  const inComfortZone = currentMoisture >= 45 && currentMoisture <= 70;

  // Real-Time Hardware & Network Diagnostics Status Configuration
  const healthDiagnostics = [
    {
      name: "ESP32 Controller Module",
      status: sensor ? "Connected" : "Waiting for Data",
      tone: sensor ? "green" : "orange",
      detail: sensor ? "Receiving live telemetry packets" : "Awaiting initial serial handshake"
    },
    {
      name: "DHT22 Climate Sensor (Temp/Humidity)",
      status: sensor?.temperature_c != null ? "Healthy" : "Offline",
      tone: sensor?.temperature_c != null ? "green" : "red",
      detail: sensor?.temperature_c != null ? `Operational (Temp: ${sensor.temperature_c.toFixed(1)} C, Hum: ${sensor.humidity_percent.toFixed(0)}%)` : "No signal from DHT pins"
    },
    {
      name: "Soil Moisture Probe",
      status: sensor?.soil_moisture_percent != null ? "Active" : "Offline",
      tone: sensor?.soil_moisture_percent != null ? "green" : "red",
      detail: sensor?.soil_moisture_percent != null ? `Operational (Moisture: ${sensor.soil_moisture_percent.toFixed(0)}%)` : "No analog signal read"
    },
    {
      name: "Precipitation (Rain) Sensor",
      status: sensor?.rain_status != null ? "Active" : "Offline",
      tone: sensor?.rain_status != null ? "green" : "red",
      detail: sensor?.rain_status != null ? `Operational (Current: ${sensor.rain_status})` : "Sensor plate dry or disconnected"
    },
    {
      name: "Light Sensor (LDR)",
      status: sensor?.ldr_raw != null ? "Active" : "Offline",
      tone: sensor?.ldr_raw != null ? "green" : "red",
      detail: sensor?.ldr_raw != null ? `Operational (LDR value: ${sensor.ldr_raw.toFixed(0)})` : "Ambient sensor offline"
    },
    {
      name: "AI Inference Server Bridge",
      status: appData?.isOfflineMode ? "Local ONNX Fallback" : "Online Backend",
      tone: appData?.isOfflineMode ? "orange" : "green",
      detail: appData?.isOfflineMode ? "Running in-browser WebAssembly models" : "Querying Python XGBoost API"
    }
  ];

  return (
    <section className="page">
      <PageHeader
        eyebrow="Live Sensors"
        title={t("live_monitoring")}
        description="Real-time sensor cards from the backend plus the current system connection state."
      />
      
      {appData?.sensorError ? (
        <div className="info-banner warning">
          {t("sensor_error")}
        </div>
      ) : (
        <div className="info-banner">
          {sensor
            ? `Latest sensor reading received at ${formatDateTime(appData?.latestSensor?.receivedAt)}.`
            : t("waiting")}
        </div>
      )}

      {/* Main Grid: Telemetry Cards */}
      <div className="sensor-grid">
        {liveCards.slice(0, 5).map((item) => { // Limit to 5 sensor cards (excluding health status list duplicate)
          const Icon = item.icon;
          // Dynamically translate names
          let translatedName = item.name;
          if (item.name === "Temperature") translatedName = t("temp");
          else if (item.name === "Humidity") translatedName = t("humidity");
          else if (item.name === "Soil Moisture") translatedName = t("soil_moisture");
          else if (item.name === "Rain Sensor") translatedName = t("rain_status");
          else if (item.name === "Light Sensor") translatedName = t("light_intensity");

          return (
            <article className={`sensor-card tone-${item.tone}`} key={item.name}>
              <div className="metric-top">
                <span className="metric-icon"><Icon size={22} /></span>
                <StatusBadge>{item.status}</StatusBadge>
              </div>
              <h3>{translatedName}</h3>
              <strong>{item.value}</strong>
              <small>Last updated {item.updated}</small>
            </article>
          );
        })}
      </div>

      <div className="two-column">
        {/* Visual Soil Moisture Comfort Zone Card */}
        <article className="panel">
          <div className="panel-title">
            <h3>{t("comfort_zone")}</h3>
            <StatusBadge tone={inComfortZone ? "green" : "orange"}>
              {inComfortZone ? t("normal") : t("low")}
            </StatusBadge>
          </div>
          <div className="comfort-zone-box" style={{ marginTop: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontWeight: "700" }}>
              <span>Current Moisture level: <span style={{ color: "var(--green)" }}>{currentMoisture}%</span></span>
              <span>Range: 45% - 70%</span>
            </div>
            
            {/* ProgressBar */}
            <div style={{ height: "16px", background: "var(--line)", borderRadius: "8px", position: "relative", overflow: "hidden" }}>
              {/* Comfort zone region backdrop */}
              <div style={{ position: "absolute", left: "45%", width: "25%", height: "100%", background: "rgba(22, 134, 74, 0.25)" }} />
              {/* Current value indicator fill */}
              <div style={{
                position: "absolute",
                left: "0",
                width: `${currentMoisture}%`,
                height: "100%",
                background: inComfortZone ? "var(--green)" : "var(--orange)",
                transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted)", marginTop: "6px" }}>
              <span>0%</span>
              <span>45% (Dry Limit)</span>
              <span>70% (Wet Limit)</span>
              <span>100%</span>
            </div>
          </div>
        </article>

        {/* Dynamic Averages Comparison Cards */}
        <article className="panel">
          <div className="panel-title">
            <h3>Climatic Averages</h3>
            <StatusBadge tone="blue">Averages</StatusBadge>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "15px" }}>
            <div className="recommendation-card tone-green" style={{ display: "grid", gap: "5px", padding: "12px" }}>
              <strong>{t("averages_1h")}</strong>
              <div style={{ fontSize: "0.88rem" }}>
                <div>Temp: <strong>{avg1h.temperature_c.toFixed(1)} C</strong></div>
                <div>Hum: <strong>{avg1h.humidity_percent.toFixed(0)}%</strong></div>
                <div>Soil: <strong>{avg1h.soil_moisture_percent.toFixed(0)}%</strong></div>
                <div>LDR: <strong>{avg1h.ldr_raw.toFixed(0)}</strong></div>
              </div>
            </div>

            <div className="recommendation-card tone-blue" style={{ display: "grid", gap: "5px", padding: "12px" }}>
              <strong>{t("averages_7d")}</strong>
              <div style={{ fontSize: "0.88rem" }}>
                <div>Temp: <strong>{avg7d.temperature_c.toFixed(1)} C</strong></div>
                <div>Hum: <strong>{avg7d.humidity_percent.toFixed(0)}%</strong></div>
                <div>Soil: <strong>{avg7d.soil_moisture_percent.toFixed(0)}%</strong></div>
                <div>LDR: <strong>{avg7d.ldr_raw.toFixed(0)}</strong></div>
              </div>
            </div>
          </div>
        </article>
      </div>

      {/* Scrollable 10s Raw Logs History List */}
      <article className="panel">
        <div className="panel-title">
          <h3>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><Table size={18} /> Raw Sensor Logs (10s Intervals)</span>
          </h3>
          <StatusBadge tone="blue">{history.length} Logs</StatusBadge>
        </div>
        <div style={{ maxHeight: "250px", overflowY: "auto", marginTop: "15px", border: "1px solid var(--line)", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "10px" }}>Timestamp</th>
                <th style={{ padding: "10px" }}>Temp (C)</th>
                <th style={{ padding: "10px" }}>Humidity (%)</th>
                <th style={{ padding: "10px" }}>Soil Moisture (%)</th>
                <th style={{ padding: "10px" }}>Light (LDR)</th>
                <th style={{ padding: "10px" }}>Rain</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((log, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", color: "var(--muted)" }}>{formatDateTime(log.receivedAt)}</td>
                    <td style={{ padding: "10px", fontWeight: "600" }}>{log.normalized?.temperature_c?.toFixed(1) || "--"}</td>
                    <td style={{ padding: "10px" }}>{log.normalized?.humidity_percent?.toFixed(0) || "--"}%</td>
                    <td style={{ padding: "10px" }}>{log.normalized?.soil_moisture_percent?.toFixed(0) || "--"}%</td>
                    <td style={{ padding: "10px" }}>{log.normalized?.ldr_raw || "--"} ({log.normalized?.light_status || "--"})</td>
                    <td style={{ padding: "10px" }}>
                      <span className={`badge ${log.normalized?.rain_status === "Rain" ? "badge-blue" : "badge-green"}`}>
                        {log.normalized?.rain_status || "Dry"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                    No sensor readings stored in local cache yet. Connecting the ESP32 will populate logs here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Visual Diagnostic Panel */}
      <article className="panel">
        <div className="panel-title">
          <h3>Hardware & Network Diagnostics</h3>
          <StatusBadge tone={sensor ? "green" : "orange"}>{sensor ? "Live Link OK" : "Awaiting Packets"}</StatusBadge>
        </div>
        <div style={{ display: "grid", gap: "12px", marginTop: "15px" }}>
          {healthDiagnostics.map((item, idx) => (
            <div key={idx} style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              padding: "12px", 
              background: "var(--surface-soft)", 
              border: "1px solid var(--line)", 
              borderRadius: "8px" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: `var(--${item.tone === "green" ? "green" : item.tone === "orange" ? "orange" : "red"})` }}>
                  {item.tone === "green" ? <CheckCircle2 size={18} /> : <Info size={18} />}
                </span>
                <div>
                  <strong style={{ display: "block", fontSize: "0.95rem" }}>{item.name}</strong>
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{item.detail}</span>
                </div>
              </div>
              <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
