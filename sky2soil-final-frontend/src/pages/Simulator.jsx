import { useEffect, useMemo, useState } from "react";
import { Droplets, Leaf, SlidersHorizontal, Thermometer, Waves, Sun } from "lucide-react";
import { Gauge, MiniStat, PageHeader, StatusBadge } from "../components/ui";
import { createPrediction } from "../lib/api";
import { getTranslator } from "../lib/translations";

const sliders = [
  { key: "temperature_c", label: "Temperature", min: 10, max: 45, icon: Thermometer, unit: "C" },
  { key: "humidity_percent", label: "Humidity", min: 20, max: 95, icon: Waves, unit: "%" },
  { key: "soil_moisture_percent", label: "Soil Moisture", min: 10, max: 95, icon: Droplets, unit: "%" },
  { key: "ldr_value", label: "Light (LDR Raw)", min: 0, max: 4095, icon: Sun, unit: "" }
];

const cropOptions = ["Groundnut", "Maize", "Bajra", "Rice", "Wheat", "Chickpea", "Cotton", "Sugarcane", "Soybean", "Jowar"];

export default function Simulator({ appData }) {
  const language = appData?.language || "en";
  const t = getTranslator(language);

  const [values, setValues] = useState({
    temperature_c: 29,
    humidity_percent: 68,
    soil_moisture_percent: 54,
    ldr_value: 500
  });
  const [cropType, setCropType] = useState("Maize");
  const [yieldVal, setYieldVal] = useState(0.0);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-Prediction trigger on slider / crop change
  useEffect(() => {
    let active = true;

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const payload = await createPrediction({
          input: {
            temperature_c: Number(values.temperature_c),
            humidity_percent: Number(values.humidity_percent),
            soil_moisture_percent: Number(values.soil_moisture_percent),
            ldr_value: Number(values.ldr_value),
            crop_type: cropType
          }
        });
        if (active && payload?.data) {
          setYieldVal(payload.data.predicted_yield_ton_per_hectare);
        }
      } catch (err) {
        console.error("Simulation model prediction failed:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [values, cropType]);

  // Simulated health score calculation
  const healthScore = useMemo(() => {
    let score = 92;
    // Temp penalty: deviation from 29°C
    const tempDev = Math.abs(values.temperature_c - 29);
    score -= tempDev * 1.4;
    // Soil moisture penalty: below 48%
    if (values.soil_moisture_percent < 48) {
      score -= (48 - values.soil_moisture_percent) * 1.1;
    }
    // Humidity penalty: deviation from 68%
    const humDev = Math.abs(values.humidity_percent - 68);
    score -= humDev * 0.15;
    // Yield outlook bonus
    if (yieldVal > 3.0) {
      score += Math.min(4, yieldVal - 3.0);
    }
    return Math.max(48, Math.min(98, Math.round(score)));
  }, [values, yieldVal]);

  // Simulated water requirement calculation
  const waterRequirement = useMemo(() => {
    return Math.max(200, Math.round(1200 - values.soil_moisture_percent * 9.5 + Math.max(0, values.temperature_c - 30) * 35));
  }, [values]);

  return (
    <section className="page simulator-page">
      <PageHeader
        eyebrow="Interactive Model"
        title={t("simulator")}
        description="Move the environmental sliders and select a crop to forecast simulated yield and health in real-time."
      />
      <div className="simulator-layout">
        {/* Scenario Sliders Form */}
        <article className="panel simulator-controls">
          <div className="panel-title">
            <h3>Scenario Inputs</h3>
            <SlidersHorizontal size={20} />
          </div>

          <div style={{ display: "grid", gap: "10px", margin: "10px 0 20px" }}>
            <label className="form-field">
              <span>{t("select_crop")}</span>
              <select 
                value={cropType} 
                onChange={(e) => setCropType(e.target.value)}
                style={{
                  minHeight: "44px",
                  padding: "0 10px",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  background: "var(--surface-soft)",
                  color: "var(--text)"
                }}
              >
                {cropOptions.map((crop) => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
            </label>
          </div>

          {sliders.map((slider) => {
            const Icon = slider.icon;
            // Translate slider labels
            let label = slider.label;
            if (slider.key === "temperature_c") label = t("temp");
            else if (slider.key === "humidity_percent") label = t("humidity");
            else if (slider.key === "soil_moisture_percent") label = t("soil_moisture");
            else if (slider.key === "ldr_value") label = t("light_intensity");

            return (
              <label className="slider-row" key={slider.key}>
                <span><Icon size={18} /> {label}</span>
                <strong>{values[slider.key]} {slider.unit}</strong>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  value={values[slider.key]}
                  onChange={(event) => setValues((current) => ({ ...current, [slider.key]: Number(event.target.value) }))}
                />
              </label>
            );
          })}
        </article>

        {/* Prediction Results Gauge & Cards */}
        <div className="simulator-preview">
          <Gauge value={healthScore} label="Simulated Farm Health Score" />
          
          <div className="stats-grid">
            <MiniStat 
              label="Simulated Crop Yield" 
              value={isLoading ? "Predicting..." : `${yieldVal.toFixed(2)} Ton/Ha`} 
              icon={Leaf} 
            />
            <MiniStat 
              label="Selected Crop fit" 
              value={cropType} 
              icon={Leaf} 
            />
          </div>
        </div>
      </div>
    </section>
  );
}
