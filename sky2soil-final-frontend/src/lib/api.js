import { saveSensorReading, getLatestSensorReading, getSensorReadingsHistory } from "./db";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

let isOfflineMode = false;
const statusListeners = new Set();

export function subscribeToStatus(listener) {
  statusListeners.add(listener);
  listener(isOfflineMode);
  return () => statusListeners.delete(listener);
}

function setOfflineMode(value) {
  if (isOfflineMode !== value) {
    isOfflineMode = value;
    statusListeners.forEach((listener) => listener(isOfflineMode));
  }
}

export function getOfflineStatus() {
  return isOfflineMode;
}

export async function checkBackendStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(`${API_BASE}/`, { signal: controller.signal });
    clearTimeout(timeoutId);
    setOfflineMode(!response.ok);
    return response.ok;
  } catch (e) {
    setOfflineMode(true);
    return false;
  }
}

function normalizeSensorPayload(payload = {}) {
  const temp = Number(payload.temperature_c ?? payload.temperature ?? 29);
  const hum = Number(payload.humidity_percent ?? payload.humidity ?? 68);
  const moisture = Number(payload.soil_moisture_percent ?? payload.soil_moisture ?? 54);
  const ldr = Number(payload.ldr_raw ?? payload.ldr ?? 500);

  return {
    temperature_c: Number.isFinite(temp) ? temp : null,
    humidity_percent: Number.isFinite(hum) ? hum : null,
    soil_moisture_percent: Number.isFinite(moisture) ? moisture : null,
    rain_raw: Number(payload.rain_raw ?? 0),
    soil_raw: Number(payload.soil_raw ?? 0),
    rain_status: payload.rain_status || "Dry",
    ldr_raw: Number.isFinite(ldr) ? ldr : null,
    light_percent: Number(payload.light_percent ?? 50),
    light_status: payload.light_status || "Medium"
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorMessage = payload?.detail || payload?.message || `Request failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload;
}

export async function getLatestSensor() {
  try {
    // 1. Attempt Online Mode Fetch
    const payload = await request("/api/sensor/latest");
    setOfflineMode(false);
    
    // Save to IndexedDB cache
    if (payload && payload.data) {
      await saveSensorReading(payload.data);
    }
    return payload;
  } catch (error) {
    console.warn("Backend offline, attempting direct ESP32 Access Point fetch...", error);
    
    // 2. Attempt direct ESP32 AP fetch (Offline Mode)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const response = await fetch("http://192.168.4.1/sensor", { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const rawReading = await response.json();
        const normalized = normalizeSensorPayload(rawReading);
        const sensorEntry = {
          raw: rawReading,
          normalized,
          receivedAt: new Date().toISOString()
        };
        await saveSensorReading(sensorEntry);
        setOfflineMode(true);
        return { status: "ok", data: sensorEntry };
      }
    } catch (apError) {
      console.warn("ESP32 Access Point unreachable. Loading latest IndexedDB cache...", apError);
    }

    // 3. Fallback to local IndexedDB Cache
    const cachedReading = await getLatestSensorReading();
    if (cachedReading) {
      setOfflineMode(true);
      return { status: "ok", data: cachedReading };
    }
    
    // No cache available
    throw new Error("Backend server and ESP32 AP are unreachable, and no local cache was found.");
  }
}

export async function getLatestPrediction() {
  try {
    const payload = await request("/api/prediction/latest");
    setOfflineMode(false);
    return payload;
  } catch (error) {
    setOfflineMode(true);
    // Predictions are not cached (recomputed dynamically offline), return empty status
    return { status: "empty", data: null };
  }
}

export async function getModelSchema() {
  try {
    const payload = await request("/api/model/schema");
    setOfflineMode(false);
    return payload;
  } catch (error) {
    setOfflineMode(true);
    // Return Fallback schema locally
    return {
      requiredFields: ["temperature_c", "humidity_percent", "soil_moisture_percent", "ldr_value", "crop_type"],
      cropOptions: ["Groundnut", "Maize", "Bajra", "Rice", "Wheat", "Chickpea", "Cotton", "Sugarcane", "Soybean", "Jowar"],
      defaults: {
        temperature_c: 29,
        humidity_percent: 68,
        soil_moisture_percent: 54,
        ldr_value: 500,
        crop_type: "Maize"
      }
    };
  }
}

// ----------------------------------------------------
// ONNX Runtime Inference & Preprocessing Helper
// ----------------------------------------------------
let onnxSession = null;

const FEATURE_COLUMNS = [
  "temperature_c", "humidity_percent", "soil_moisture_percent", "ldr_value",
  "crop_type_Bajra", "crop_type_Chickpea", "crop_type_Cotton", "crop_type_Groundnut",
  "crop_type_Jowar", "crop_type_Maize", "crop_type_Rice", "crop_type_Soybean",
  "crop_type_Sugarcane", "crop_type_Wheat"
];

async function runOnnxInference(input) {
  if (!window.ort) {
    throw new Error("ONNX Runtime Web is not loaded. Cannot run offline prediction.");
  }

  if (!onnxSession) {
    window.ort.env.wasm.wasmPaths = "/";
    console.log("Initializing ONNX WebAssembly Session...");
    onnxSession = await window.ort.InferenceSession.create("/assets/models/best_model.onnx");
  }

  // Preprocessing: align to 14 feature array exactly matching python
  const row = [];
  for (const col of FEATURE_COLUMNS) {
    if (col === "temperature_c") {
      row.push(Number(input.temperature_c ?? 29));
    } else if (col === "humidity_percent") {
      row.push(Number(input.humidity_percent ?? 68));
    } else if (col === "soil_moisture_percent") {
      row.push(Number(input.soil_moisture_percent ?? 54));
    } else if (col === "ldr_value") {
      row.push(Number(input.ldr_value ?? 500));
    } else {
      // crop_type_* one-hot columns
      const cropSuffix = col.replace("crop_type_", "");
      row.push(input.crop_type === cropSuffix ? 1 : 0);
    }
  }

  const float32Row = new Float32Array(row);
  const tensor = new window.ort.Tensor("float32", float32Row, [1, 14]);
  const feeds = { [onnxSession.inputNames[0]]: tensor };
  const results = await onnxSession.run(feeds);

  const outputName = onnxSession.outputNames[0];
  const logValue = results[outputName].data[0];
  const predictedYield = Math.expm1(logValue);

  return {
    predicted_yield_ton_per_hectare: Number(predictedYield.toFixed(3)),
    predicted_log_value: logValue,
    model_file: "best_model.onnx",
    input: input,
    sensorSnapshot: {
      temperature_c: input.temperature_c,
      humidity_percent: input.humidity_percent,
      soil_moisture_percent: input.soil_moisture_percent,
      ldr_raw: input.ldr_value
    },
    predictedAt: new Date().toISOString()
  };
}

export async function createPrediction(input) {
  try {
    // 1. Attempt Online Backend Inference
    const payload = await request("/api/predict", {
      method: "POST",
      body: JSON.stringify(input)
    });
    setOfflineMode(false);
    return payload;
  } catch (error) {
    console.warn("Backend prediction failed. Falling back to local ONNX Runtime Web...", error);
    
    // 2. Fallback to local ONNX WebAssembly inference
    try {
      const offlineResult = await runOnnxInference(input.input || input);
      setOfflineMode(true);
      return { status: "ok", data: offlineResult };
    } catch (onnxError) {
      console.error("ONNX local inference failed", onnxError);
      throw new Error(`Prediction failed: ${error.message} (ONNX Fallback error: ${onnxError.message})`);
    }
  }
}

export async function getSensorHistory() {
  if (!isOfflineMode) {
    // In online mode, we fetch from IndexedDB cached readings to populate graphs
    return getSensorReadingsHistory();
  } else {
    // Offline Mode: fetch from ESP32 local AP history endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch("http://192.168.4.1/sensor/history", { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const rawHistory = await response.json();
        const normalizedHistory = [];
        for (const item of rawHistory) {
          const normalized = normalizeSensorPayload(item);
          const sensorEntry = {
            raw: item,
            normalized,
            receivedAt: item.receivedAt || new Date(Date.now() - (normalizedHistory.length * 3600 * 1000)).toISOString()
          };
          await saveSensorReading(sensorEntry);
          normalizedHistory.push(sensorEntry);
        }
        return normalizedHistory;
      }
    } catch (e) {
      console.warn("ESP32 AP history endpoint unreachable. Loading cached IndexedDB history...", e);
    }
    
    return getSensorReadingsHistory();
  }
}

export { API_BASE };
