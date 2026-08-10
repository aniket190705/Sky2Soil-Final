import {
  Activity,
  AlertTriangle,
  Bot,
  CloudRain,
  Droplets,
  Leaf,
  Thermometer,
  Waves,
  Sun
} from "lucide-react";

const DEFAULT_TIME_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value, digits = 1) {
  return Number(value).toFixed(digits);
}

export function getSensorSnapshot(latestSensor) {
  return latestSensor?.normalized || null;
}

export function formatDateTime(isoString) {
  if (!isoString) {
    return "Not available";
  }

  return DEFAULT_TIME_FORMAT.format(new Date(isoString));
}

export function calculateHealthScore(sensor, prediction) {
  if (!sensor) {
    return 92;
  }

  const temperaturePenalty = Math.abs((sensor.temperature_c ?? 29) - 29) * 1.4;
  const moisturePenalty = Math.max(0, 48 - (sensor.soil_moisture_percent ?? 54)) * 1.1;
  const humidityPenalty = Math.abs((sensor.humidity_percent ?? 68) - 68) * 0.15;
  const rainBonus = sensor.rain_status === "Rain" ? 3 : 0;
  const predictionBonus = prediction?.predicted_yield_ton_per_hectare
    ? Math.min(4, prediction.predicted_yield_ton_per_hectare - 3)
    : 0;

  return clamp(
    Math.round(92 - temperaturePenalty - moisturePenalty - humidityPenalty + rainBonus + predictionBonus),
    48,
    98
  );
}

export function buildDashboardMetrics(sensor, prediction) {
  if (!sensor) {
    return [];
  }

  return [
    {
      label: "Temperature",
      value: formatNumber(sensor.temperature_c ?? 0),
      unit: "C",
      status: (sensor.temperature_c ?? 0) > 35 ? "Warm" : "Stable",
      trend: `${formatNumber((sensor.temperature_c ?? 0) - 29)}`,
      tone: "orange",
      icon: Thermometer
    },
    {
      label: "Humidity",
      value: formatNumber(sensor.humidity_percent ?? 0, 0),
      unit: "%",
      status: "Live",
      trend: `${formatNumber((sensor.humidity_percent ?? 0) - 68, 0)}`,
      tone: "blue",
      icon: Waves
    },
    {
      label: "Soil Moisture",
      value: formatNumber(sensor.soil_moisture_percent ?? 0, 0),
      unit: "%",
      status: (sensor.soil_moisture_percent ?? 0) < 45 ? "Low" : "Healthy",
      trend: `${formatNumber((sensor.soil_moisture_percent ?? 0) - 54, 0)}`,
      tone: "green",
      icon: Droplets
    },
    {
      label: "Rain Status",
      value: sensor.rain_status === "Rain" ? "Rain" : "Dry",
      unit: "",
      status: "Live",
      trend: sensor.rain_raw != null ? `${formatNumber(sensor.rain_raw, 0)}` : "N/A",
      tone: "blue",
      icon: CloudRain
    },
    {
      label: "Light Intensity",
      value: sensor.light_percent != null ? formatNumber(sensor.light_percent, 0) : "0",
      unit: "%",
      status: sensor.light_status || "Live",
      trend: sensor.ldr_raw != null ? `${formatNumber(sensor.ldr_raw, 0)}` : "N/A",
      tone: "yellow",
      icon: Sun
    },
    {
      label: "Predicted Yield",
      value: prediction?.predicted_yield_ton_per_hectare
        ? formatNumber(prediction.predicted_yield_ton_per_hectare, 2)
        : "--",
      unit: "Ton/Ha",
      status: prediction ? "Model Ready" : "Pending",
      trend: prediction?.predicted_log_value ? formatNumber(prediction.predicted_log_value, 2) : "N/A",
      tone: "green",
      icon: Bot
    },
    {
      label: "Crop Type",
      value: prediction?.input?.crop_type || "Select",
      unit: "",
      status: prediction ? "From Model Input" : "Awaiting Input",
      trend: prediction ? "Model Active" : "N/A",
      tone: "yellow",
      icon: Leaf
    }
  ];
}

export function buildSensorCards(sensor, prediction) {
  if (!sensor) {
    return [];
  }

  return [
    {
      name: "Temperature",
      value: `${formatNumber(sensor.temperature_c ?? 0)} C`,
      range: "22 - 32 C",
      status: (sensor.temperature_c ?? 0) > 35 ? "High" : "Normal",
      updated: "Live API",
      icon: Thermometer,
      tone: "orange"
    },
    {
      name: "Humidity",
      value: `${formatNumber(sensor.humidity_percent ?? 0, 0)}%`,
      range: "55 - 75%",
      status: "Normal",
      updated: "Live API",
      icon: Waves,
      tone: "blue"
    },
    {
      name: "Soil Moisture",
      value: `${formatNumber(sensor.soil_moisture_percent ?? 0, 0)}%`,
      range: "45 - 70%",
      status: (sensor.soil_moisture_percent ?? 0) < 45 ? "Low" : "Normal",
      updated: "Live API",
      icon: Droplets,
      tone: "green"
    },
    {
      name: "Rain Sensor",
      value: sensor.rain_status || "Unknown",
      range: "ESP32 input",
      status: sensor.rain_status === "Rain" ? "Wet" : "Dry",
      updated: "Live API",
      icon: CloudRain,
      tone: "blue"
    },
    {
      name: "Light Sensor",
      value: sensor.light_percent != null ? `${formatNumber(sensor.light_percent, 0)}%` : "0%",
      range: "0 - 100%",
      status: sensor.light_status || "Normal",
      updated: "Live API",
      icon: Sun,
      tone: "yellow"
    },
    {
      name: "Farm Health",
      value: `${calculateHealthScore(sensor, prediction)}/100`,
      range: "Model-assisted",
      status: "Calculated",
      updated: "Frontend",
      icon: Activity,
      tone: "green"
    },
    {
      name: "Prediction Status",
      value: prediction ? "Ready" : "Waiting",
      range: "Backend bridge",
      status: prediction ? "Online" : "Idle",
      updated: "Backend API",
      icon: Bot,
      tone: "yellow"
    }
  ];
}

export function buildAlerts(sensor, prediction) {
  if (!sensor) {
    return [];
  }

  const alerts = [];

  if ((sensor.soil_moisture_percent ?? 0) < 45) {
    alerts.push({
      title: "Low Soil Moisture",
      priority: "Critical",
      time: "Live",
      action: "Irrigate soon or confirm the drip line is working normally.",
      tone: "red"
    });
  }

  if ((sensor.temperature_c ?? 0) > 35) {
    alerts.push({
      title: "High Temperature",
      priority: "Warning",
      time: "Live",
      action: "Inspect crop heat stress and avoid midday irrigation.",
      tone: "orange"
    });
  }

  if (sensor.rain_status === "Rain") {
    alerts.push({
      title: "Rain Detected",
      priority: "Information",
      time: "Live",
      action: "Pause manual irrigation and check drainage after rainfall.",
      tone: "blue"
    });
  }

  if (prediction?.predicted_yield_ton_per_hectare && prediction.predicted_yield_ton_per_hectare < 3) {
    alerts.push({
      title: "Low Predicted Yield",
      priority: "Warning",
      time: "Model",
      action: "Review crop selection and nutrient values used for the prediction.",
      tone: "orange"
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "System Stable",
      priority: "Information",
      time: "Live",
      action: "No immediate field risk detected from the latest sensor reading.",
      tone: "blue"
    });
  }

  return alerts;
}

export function buildRecommendations(sensor, prediction) {
  if (!sensor) {
    return [
      "Connect the backend and send one ESP32 payload to replace demo guidance.",
      "Use the prediction form to generate a real crop-yield forecast.",
      "Keep rainfall, N/P/K, and crop type updated before trusting recommendations."
    ];
  }

  const items = [];

  if ((sensor.soil_moisture_percent ?? 0) < 45) {
    items.push("Irrigate in the next cycle because soil moisture is below the comfort range.");
  } else {
    items.push("Soil moisture is acceptable, so irrigation can stay on the current schedule.");
  }

  if (sensor.rain_status === "Rain") {
    items.push("Rain is being detected, so pause manual irrigation and validate drainage.");
  } else {
    items.push("No rain is being detected right now, so irrigation decisions can follow the moisture level.");
  }

  if (prediction?.predicted_yield_ton_per_hectare) {
    items.push(
      `The current prediction is ${formatNumber(prediction.predicted_yield_ton_per_hectare, 2)} ton/ha for ${prediction.input.crop_type}.`
    );
  } else {
    items.push("Generate a prediction after entering crop and nutrient inputs to unlock model-backed guidance.");
  }

  return items;
}

export function buildHealthItems(sensor, prediction) {
  return [
    sensor ? "ESP32 Data Received" : "ESP32 Waiting",
    "Backend API Ready",
    prediction ? "Prediction Available" : "Prediction Pending",
    "Frontend Connected"
  ];
}

export function buildWeatherSummary(sensor, latestSensor) {
  if (!sensor) {
    return [];
  }

  return [
    { label: "Temperature", value: `${formatNumber(sensor.temperature_c ?? 0)} C` },
    { label: "Humidity", value: `${formatNumber(sensor.humidity_percent ?? 0, 0)}%` },
    { label: "Rain Status", value: sensor.rain_status || "Unknown" },
    { label: "Last Sync", value: formatDateTime(latestSensor?.receivedAt) }
  ];
}

export function buildPredictionHighlights(prediction) {
  if (!prediction) {
    return [];
  }

  return [
    {
      label: "Predicted Yield",
      value: `${formatNumber(prediction.predicted_yield_ton_per_hectare, 2)} Ton/Ha`,
      icon: Leaf
    },
    {
      label: "Selected Crop",
      value: prediction.input.crop_type,
      icon: Bot
    },
    {
      label: "Prediction Time",
      value: formatDateTime(prediction.predictedAt),
      icon: AlertTriangle
    }
  ];
}
