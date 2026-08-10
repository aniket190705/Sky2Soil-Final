import { useEffect, useState, useMemo } from "react";
import { Download, Calendar, Database, CloudRain, ShieldAlert, BarChart3 } from "lucide-react";
import { ChartPanel, MiniStat, PageHeader, StatusBadge } from "../components/ui";
import { analyticsCards } from "../data/mockData";
import { getSensorHistory } from "../lib/api";
import { getTranslator } from "../lib/translations";
import { formatDateTime } from "../lib/liveData";

const ranges = ["Daily", "Weekly", "Monthly"];

export default function Analytics({ appData }) {
  const language = appData?.language || "en";
  const t = getTranslator(language);

  const [range, setRange] = useState("Daily");
  const [historyData, setHistoryData] = useState([]);
  const [rawHistory, setRawHistory] = useState([]);

  // Calculate Sensor Range Extremes (Min, Max, Average) from rawHistory logs
  const sensorExtremes = useMemo(() => {
    if (!rawHistory || rawHistory.length === 0) {
      return [];
    }

    let tempMin = Infinity, tempMax = -Infinity, tempSum = 0;
    let humMin = Infinity, humMax = -Infinity, humSum = 0;
    let moistMin = Infinity, moistMax = -Infinity, moistSum = 0;
    let lightMin = Infinity, lightMax = -Infinity, lightSum = 0;
    let rainCount = 0;

    rawHistory.forEach((log) => {
      const tempVal = log.normalized?.temperature_c ?? 29.0;
      const moistVal = log.normalized?.soil_moisture_percent ?? 54.0;
      const humVal = log.normalized?.humidity_percent ?? 68.0;
      const ldrVal = log.normalized?.ldr_raw ?? 500.0;
      const rainStatusVal = log.normalized?.rain_status;

      if (tempVal < tempMin) tempMin = tempVal;
      if (tempVal > tempMax) tempMax = tempVal;
      tempSum += tempVal;

      if (humVal < humMin) humMin = humVal;
      if (humVal > humMax) humMax = humVal;
      humSum += humVal;

      if (moistVal < moistMin) moistMin = moistVal;
      if (moistVal > moistMax) moistMax = moistVal;
      moistSum += moistVal;

      if (ldrVal < lightMin) lightMin = ldrVal;
      if (ldrVal > lightMax) lightMax = ldrVal;
      lightSum += ldrVal;

      if (rainStatusVal === "Rain") {
        rainCount++;
      }
    });

    const count = rawHistory.length;

    return [
      {
        parameter: t("temp"),
        min: `${tempMin.toFixed(1)} C`,
        max: `${tempMax.toFixed(1)} C`,
        avg: `${(tempSum / count).toFixed(1)} C`,
        status: "Stable"
      },
      {
        parameter: t("humidity"),
        min: `${humMin.toFixed(0)}%`,
        max: `${humMax.toFixed(0)}%`,
        avg: `${(humSum / count).toFixed(0)}%`,
        status: "Stable"
      },
      {
        parameter: t("soil_moisture"),
        min: `${moistMin.toFixed(0)}%`,
        max: `${moistMax.toFixed(0)}%`,
        avg: `${(moistSum / count).toFixed(0)}%`,
        status: (moistMin < 45) ? "Action Reqd" : "Comfort"
      },
      {
        parameter: t("light_intensity"),
        min: `${lightMin.toFixed(0)}`,
        max: `${lightMax.toFixed(0)}`,
        avg: `${(lightSum / count).toFixed(0)}`,
        status: "Active"
      },
      {
        parameter: t("rain_status"),
        min: "N/A",
        max: "N/A",
        avg: `${((rainCount / count) * 100).toFixed(0)}% Rain`,
        status: "Active"
      }
    ];
  }, [rawHistory, language]);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const data = await getSensorHistory();
        if (!active) return;
        
        // Expose raw list for calculations
        setRawHistory(data || []);

        // Filter data based on selected range and map for Recharts
        const cutoff = Date.now() - (range === "Daily" ? 24 : range === "Weekly" ? 168 : 720) * 60 * 60 * 1000;
        const filtered = (data || []).filter((item) => new Date(item.receivedAt).getTime() >= cutoff);
        
        // Reverse so it plots oldest to newest
        const mapped = [...filtered].reverse().map((item) => {
          const dateObj = new Date(item.receivedAt);
          const timeLabel = dateObj.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
          });

          return {
            time: timeLabel,
            temp: item.normalized?.temperature_c ?? 29,
            humidity: item.normalized?.humidity_percent ?? 68,
            moisture: item.normalized?.soil_moisture_percent ?? 54,
            light: item.normalized?.light_percent ?? 50,
            rain: item.normalized?.rain_status === "Rain" ? 1 : 0
          };
        });

        setHistoryData(mapped);
      } catch (error) {
        console.error("Failed to load historical sensor readings:", error);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [range, appData?.latestSensor]);

  // Export report to CSV
  const handleExport = () => {
    if (rawHistory.length === 0) {
      alert("No sensor data logs cached yet to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Temperature (C),Humidity (%),Soil Moisture (%),LDR Value,Light (%),Rain Status\n";

    rawHistory.forEach((log) => {
      const timestamp = new Date(log.receivedAt).toISOString();
      const temp = log.normalized?.temperature_c ?? "";
      const hum = log.normalized?.humidity_percent ?? "";
      const moisture = log.normalized?.soil_moisture_percent ?? "";
      const ldr = log.normalized?.ldr_raw ?? "";
      const lightPct = log.normalized?.light_percent ?? "";
      const rain = log.normalized?.rain_status ?? "Dry";

      csvContent += `${timestamp},${temp},${hum},${moisture},${ldr},${lightPct},${rain}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sky2soil_report_${range.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="page">
      <PageHeader
        eyebrow="Historical Intelligence"
        title={t("analytics")}
        description="Trend analysis for crop climate, soil behavior, light exposure, and water use."
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div className="segmented">
          {ranges.map((item) => (
            <button 
              className={range === item ? "active" : ""} 
              onClick={() => setRange(item)} 
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        
        {/* Export CSV Button */}
        <button 
          className="primary-button" 
          onClick={handleExport}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Download size={18} />
          {t("export_data")}
        </button>
      </div>

      {/* Sensor Chart Grid */}
      <div className="chart-grid">
        <ChartPanel title={`${range} ${t("temp")} Trend`} dataKey="temp" color="#f97316" data={historyData.length > 0 ? historyData : undefined} />
        <ChartPanel title={`${range} ${t("humidity")} Trend`} dataKey="humidity" color="#0284c7" area data={historyData.length > 0 ? historyData : undefined} />
        <ChartPanel title={`${range} ${t("soil_moisture")} Trend`} dataKey="moisture" color="#16a34a" data={historyData.length > 0 ? historyData : undefined} />
        <ChartPanel title={`${range} ${t("light_intensity")} Trend`} dataKey="light" color="#eab308" data={historyData.length > 0 ? historyData : undefined} />
        <ChartPanel title={`${range} ${t("rain_status")} (1 = Yes, 0 = No)`} dataKey="rain" color="#0f766e" area data={historyData.length > 0 ? historyData : undefined} />
      </div>

      <div className="stats-grid">
        {analyticsCards.map((item) => <MiniStat key={item.label} {...item} />)}
      </div>

      {/* Range Extremes Analysis Table (Replaces Timeline of redundant Events) */}
      <article className="panel">
        <div className="panel-title">
          <h3>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><BarChart3 size={18} /> Sensor Range Extremes Analysis</span>
          </h3>
          <StatusBadge tone="green">Calculated</StatusBadge>
        </div>
        <div style={{ marginTop: "15px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "10px" }}>Sensor Parameter</th>
                <th style={{ padding: "10px" }}>Minimum Reading</th>
                <th style={{ padding: "10px" }}>Maximum Reading</th>
                <th style={{ padding: "10px" }}>Average Reading</th>
                <th style={{ padding: "10px" }}>System State</th>
              </tr>
            </thead>
            <tbody>
              {sensorExtremes.length > 0 ? (
                sensorExtremes.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "750" }}>{item.parameter}</td>
                    <td style={{ padding: "10px", color: "var(--orange)" }}>{item.min}</td>
                    <td style={{ padding: "10px", color: "var(--red)" }}>{item.max}</td>
                    <td style={{ padding: "10px", color: "var(--green-deep)", fontWeight: "650" }}>{item.avg}</td>
                    <td style={{ padding: "10px" }}>
                      <StatusBadge tone={item.status === "Action Reqd" ? "red" : item.status === "Comfort" ? "green" : "blue"}>
                        {item.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                    No cached telemetry log data available to compute range statistics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
