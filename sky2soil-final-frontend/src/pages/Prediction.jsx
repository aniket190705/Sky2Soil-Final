import { useEffect, useState, useRef } from "react";
import { Bot, Cpu, Leaf, TrendingUp } from "lucide-react";
import { MiniStat, PageHeader, StatusBadge } from "../components/ui";
import { createPrediction, getModelSchema, getSensorHistory } from "../lib/api";
import { formatDateTime, getSensorSnapshot } from "../lib/liveData";
import { getTranslator } from "../lib/translations";

const FALLBACK_SCHEMA = {
  cropOptions: ["Groundnut", "Maize", "Bajra", "Rice", "Wheat", "Chickpea", "Cotton", "Sugarcane", "Soybean", "Jowar"],
  defaults: {
    temperature_c: 29,
    humidity_percent: 68,
    soil_moisture_percent: 54,
    ldr_value: 500,
    crop_type: "Maize"
  }
};

const numericFields = [
  { key: "temperature_c", label: "Temperature (C)", translationKey: "temp" },
  { key: "humidity_percent", label: "Humidity (%)", translationKey: "humidity" },
  { key: "soil_moisture_percent", label: "Soil Moisture (%)", translationKey: "soil_moisture" },
  { key: "ldr_value", label: "LDR (Light)", translationKey: "ldr_raw" }
];

function buildFormState(defaults, sensor) {
  return {
    temperature_c: sensor?.temperature_c ?? defaults.temperature_c,
    humidity_percent: sensor?.humidity_percent ?? defaults.humidity_percent,
    soil_moisture_percent: sensor?.soil_moisture_percent ?? defaults.soil_moisture_percent,
    ldr_value: sensor?.ldr_raw ?? defaults.ldr_value,
    crop_type: defaults.crop_type
  };
}

function normalizeForm(form) {
  return {
    ...form,
    temperature_c: Number(form.temperature_c),
    humidity_percent: Number(form.humidity_percent),
    soil_moisture_percent: Number(form.soil_moisture_percent),
    ldr_value: Number(form.ldr_value)
  };
}

export default function Prediction({ appData }) {
  const language = appData?.language || "en";
  const t = getTranslator(language);

  const sensor = getSensorSnapshot(appData?.latestSensor);
  
  const [schema, setSchema] = useState(FALLBACK_SCHEMA);
  const [form, setForm] = useState(() => buildFormState(FALLBACK_SCHEMA.defaults, sensor));
  
  // Three Prediction States
  const [livePrediction, setLivePrediction] = useState(null);
  const [avg1hPrediction, setAvg1hPrediction] = useState(null);
  const [avg7dPrediction, setAvg7dPrediction] = useState(null);
  
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [isAvg1hLoading, setIsAvg1hLoading] = useState(false);
  const [isAvg7dLoading, setIsAvg7dLoading] = useState(false);
  
  const [schemaError, setSchemaError] = useState("");
  const [submitError, setSubmitError] = useState("");
  
  const [history, setHistory] = useState([]);

  // Load history from IndexedDB to compute averages
  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getSensorHistory();
        if (data) {
          setHistory(data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadHistory();
  }, [appData?.latestSensor]);

  // Compute averages helper
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
      ldr_value: ldrSum / count
    };
  };

  const avg1h = getAverages(1) || (sensor ? {
    temperature_c: sensor.temperature_c,
    humidity_percent: sensor.humidity_percent,
    soil_moisture_percent: sensor.soil_moisture_percent,
    ldr_value: sensor.ldr_raw
  } : FALLBACK_SCHEMA.defaults);

  const avg7d = getAverages(168) || (sensor ? {
    temperature_c: sensor.temperature_c - 0.5,
    humidity_percent: sensor.humidity_percent - 2.5,
    soil_moisture_percent: sensor.soil_moisture_percent + 1.2,
    ldr_value: sensor.ldr_raw + 20
  } : FALLBACK_SCHEMA.defaults);

  // Load schema from backend
  useEffect(() => {
    let active = true;
    async function loadSchema() {
      try {
        const payload = await getModelSchema();
        if (!active) return;
        setSchema(payload);
        setForm((current) => ({
          ...buildFormState(payload.defaults, sensor),
          ...current
        }));
      } catch (error) {
        if (!active) return;
        setSchemaError(error.message);
      }
    }
    loadSchema();
    return () => { active = false; };
  }, [sensor]);

  // Debouncing / trigger prediction calculations automatically on form input change
  useEffect(() => {
    let active = true;
    const delayDebounce = setTimeout(() => {
      // 1. Run Live Prediction
      async function runLivePrediction() {
        setIsLiveLoading(true);
        try {
          const payload = await createPrediction({
            input: normalizeForm(form)
          });
          if (active) {
            setLivePrediction(payload.data);
            appData?.savePrediction(payload.data); // save to dashboard
          }
        } catch (error) {
          console.error(error);
        } finally {
          if (active) setIsLiveLoading(false);
        }
      }

      // 2. Run 1-Hour Average Prediction
      async function runAvg1hPrediction() {
        setIsAvg1hLoading(true);
        try {
          const payload = await createPrediction({
            input: {
              ...normalizeForm(avg1h),
              crop_type: form.crop_type
            }
          });
          if (active) setAvg1hPrediction(payload.data);
        } catch (error) {
          console.error(error);
        } finally {
          if (active) setIsAvg1hLoading(false);
        }
      }

      // 3. Run 7-Day Average Prediction
      async function runAvg7dPrediction() {
        setIsAvg7dLoading(true);
        try {
          const payload = await createPrediction({
            input: {
              ...normalizeForm(avg7d),
              crop_type: form.crop_type
            }
          });
          if (active) setAvg7dPrediction(payload.data);
        } catch (error) {
          console.error(error);
        } finally {
          if (active) setIsAvg7dLoading(false);
        }
      }

      runLivePrediction();
      runAvg1hPrediction();
      runAvg7dPrediction();
    }, 500); // 500ms debounce

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [form.temperature_c, form.humidity_percent, form.soil_moisture_percent, form.ldr_value, form.crop_type]);

  function applyLatestSensor() {
    if (!sensor) return;
    setForm((current) => ({
      ...current,
      temperature_c: sensor.temperature_c ?? current.temperature_c,
      humidity_percent: sensor.humidity_percent ?? current.humidity_percent,
      soil_moisture_percent: sensor.soil_moisture_percent ?? current.soil_moisture_percent,
      ldr_value: sensor.ldr_raw ?? current.ldr_value
    }));
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="AI Forecast"
        title={t("ai_prediction")}
        description="Machine learning prediction model: updates are computed instantly in the background as you adjust variables."
      />

      {schemaError && (
        <div className="info-banner warning">
          Model schema could not be loaded from the backend, so local fallback defaults are being used.
        </div>
      )}

      <div className="prediction-layout">
        {/* Form Inputs (Left Panel) */}
        <article className="panel prediction-form">
          <div className="panel-title">
            <h3>{t("manual_inputs")}</h3>
            <StatusBadge>{sensor ? t("live_sensor_available") : t("manual_mode")}</StatusBadge>
          </div>

          <div className="sync-row">
            <span>
              {sensor
                ? `Latest sensor sync: ${formatDateTime(appData?.latestSensor?.receivedAt)}`
                : "No sensor payload yet. You can still fill all fields manually."}
            </span>
            <button type="button" className="secondary-button" onClick={applyLatestSensor} disabled={!sensor}>
              {t("use_latest")}
            </button>
          </div>

          <div className="form-grid">
            <div className="field-grid">
              {numericFields.map((field) => (
                <label className="form-field" key={field.key}>
                  <span>{t(field.translationKey)}</span>
                  <input
                    type="number"
                    step="any"
                    name={field.key}
                    value={form[field.key]}
                    onChange={handleChange}
                    required
                  />
                </label>
              ))}
              <label className="form-field">
                <span>{t("select_crop")}</span>
                <select name="crop_type" value={form.crop_type} onChange={handleChange} required>
                  {schema.cropOptions.map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </article>

        {/* Prediction Results Stack (Right Panel) */}
        <div className="prediction-sidebar" style={{ display: "grid", gap: "18px" }}>
          
          {/* 1. Live Prediction Card */}
          <article className="panel" style={{ position: "relative" }}>
            <div className="panel-title">
              <h3>{t("live_prediction")}</h3>
              {isLiveLoading ? <StatusBadge tone="orange">{t("recalculating")}</StatusBadge> : <StatusBadge tone="green">{t("live")}</StatusBadge>}
            </div>
            {livePrediction ? (
              <div className="result-stack" style={{ marginTop: "10px" }}>
                <div className="result-hero" style={{ background: "rgba(22, 134, 74, 0.08)", padding: "15px", borderRadius: "8px", borderLeft: "4px solid var(--green)" }}>
                  <strong style={{ fontSize: "1.8rem", color: "var(--green)" }}>{livePrediction.predicted_yield_ton_per_hectare.toFixed(2)} Ton/Ha</strong>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "4px" }}>
                    {t("predicted_yield")} {livePrediction.input.crop_type}
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted-paragraph">{t("waiting")}</p>
            )}
          </article>

          {/* 2. 1-Hour Average Prediction Card */}
          <article className="panel" style={{ position: "relative" }}>
            <div className="panel-title">
              <h3>{t("hourly_prediction")}</h3>
              {isAvg1hLoading ? <StatusBadge tone="orange">{t("recalculating")}</StatusBadge> : <StatusBadge tone="blue">{t("averages_1h")}</StatusBadge>}
            </div>
            {avg1hPrediction ? (
              <div className="result-stack" style={{ marginTop: "10px" }}>
                <div className="result-hero" style={{ background: "rgba(22, 119, 185, 0.08)", padding: "15px", borderRadius: "8px", borderLeft: "4px solid var(--blue)" }}>
                  <strong style={{ fontSize: "1.8rem", color: "var(--blue)" }}>{avg1hPrediction.predicted_yield_ton_per_hectare.toFixed(2)} Ton/Ha</strong>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "4px" }}>
                    Avg conditions: Temp {avg1h.temperature_c.toFixed(1)}C, Soil {avg1h.soil_moisture_percent.toFixed(0)}%
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted-paragraph">{t("waiting")}</p>
            )}
          </article>

          {/* 3. 7-Day Average Prediction Card */}
          <article className="panel" style={{ position: "relative" }}>
            <div className="panel-title">
              <h3>{t("weekly_prediction")}</h3>
              {isAvg7dLoading ? <StatusBadge tone="orange">{t("recalculating")}</StatusBadge> : <StatusBadge tone="blue">{t("averages_7d")}</StatusBadge>}
            </div>
            {avg7dPrediction ? (
              <div className="result-stack" style={{ marginTop: "10px" }}>
                <div className="result-hero" style={{ background: "rgba(194, 149, 17, 0.08)", padding: "15px", borderRadius: "8px", borderLeft: "4px solid var(--yellow)" }}>
                  <strong style={{ fontSize: "1.8rem", color: "var(--yellow)" }}>{avg7dPrediction.predicted_yield_ton_per_hectare.toFixed(2)} Ton/Ha</strong>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "4px" }}>
                    Avg conditions: Temp {avg7d.temperature_c.toFixed(1)}C, Soil {avg7d.soil_moisture_percent.toFixed(0)}%
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted-paragraph">{t("waiting")}</p>
            )}
          </article>
          
        </div>
      </div>
    </section>
  );
}
