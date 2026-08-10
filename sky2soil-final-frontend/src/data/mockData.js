import {
  Activity,
  AlertTriangle,
  BarChart3,
  BatteryCharging,
  BellRing,
  Bot,
  CalendarDays,
  CloudRain,
  Droplets,
  Home,
  Leaf,
  Lightbulb,
  LineChart,
  Radio,
  Settings,
  Sun,
  Thermometer,
  Waves
} from "lucide-react";

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "monitoring", label: "Live Monitoring", icon: Radio },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "prediction", label: "AI Prediction", icon: Bot },
  { id: "recommendations", label: "Smart Recommendations", icon: Lightbulb },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "calendar", label: "Farming Calendar", icon: CalendarDays },
  { id: "simulator", label: "What-if Simulator", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings }
];

export const summaryCards = [
  { label: "Temperature", value: "29.4", unit: "C", status: "Optimal", trend: "+1.2", tone: "orange", icon: Thermometer },
  { label: "Humidity", value: "68", unit: "%", status: "Healthy", trend: "+4", tone: "blue", icon: Waves },
  { label: "Soil Moisture", value: "54", unit: "%", status: "Stable", trend: "-2", tone: "green", icon: Droplets },
  { label: "Rain Status", value: "Light", unit: "rain", status: "Expected", trend: "18%", tone: "blue", icon: CloudRain },
  { label: "Light Intensity", value: "74", unit: "kLux", status: "Strong", trend: "+9", tone: "yellow", icon: Sun },
  { label: "Solar Battery", value: "88", unit: "%", status: "Charging", trend: "+6", tone: "green", icon: BatteryCharging }
];

export const sensorCards = [
  { name: "Temperature", value: "29.4 C", range: "22 - 32 C", status: "Normal", updated: "12 sec ago", icon: Thermometer, tone: "orange" },
  { name: "Humidity", value: "68%", range: "55 - 75%", status: "Normal", updated: "9 sec ago", icon: Waves, tone: "blue" },
  { name: "Soil Moisture", value: "54%", range: "45 - 70%", status: "Normal", updated: "16 sec ago", icon: Droplets, tone: "green" },
  { name: "Rain Sensor", value: "18%", range: "0 - 30%", status: "Cloudy", updated: "22 sec ago", icon: CloudRain, tone: "blue" },
  { name: "Light Sensor", value: "74 kLux", range: "45 - 85 kLux", status: "Bright", updated: "11 sec ago", icon: Sun, tone: "yellow" },
  { name: "Solar Battery", value: "88%", range: "35 - 100%", status: "Charging", updated: "8 sec ago", icon: BatteryCharging, tone: "green" }
];

export const chartData = [
  { time: "06 AM", temp: 22, humidity: 74, moisture: 62, light: 18, rain: 6, water: 18 },
  { time: "08 AM", temp: 25, humidity: 71, moisture: 60, light: 42, rain: 8, water: 14 },
  { time: "10 AM", temp: 28, humidity: 67, moisture: 57, light: 68, rain: 12, water: 10 },
  { time: "12 PM", temp: 31, humidity: 63, moisture: 54, light: 80, rain: 15, water: 8 },
  { time: "02 PM", temp: 33, humidity: 58, moisture: 50, light: 76, rain: 18, water: 12 },
  { time: "04 PM", temp: 30, humidity: 64, moisture: 52, light: 50, rain: 31, water: 16 },
  { time: "06 PM", temp: 27, humidity: 72, moisture: 56, light: 22, rain: 44, water: 6 }
];

export const analyticsCards = [
  { label: "Average Temperature", value: "28.1 C", icon: Thermometer },
  { label: "Average Moisture", value: "56%", icon: Droplets },
  { label: "Highest Temperature", value: "34.8 C", icon: Sun },
  { label: "Lowest Moisture", value: "43%", icon: Waves }
];

export const events = [
  { title: "Rain Detected", time: "Today, 5:40 PM", detail: "Rain probability crossed 40% in north plot.", tone: "blue" },
  { title: "Irrigation", time: "Yesterday, 6:00 AM", detail: "Drip irrigation ran for 22 minutes.", tone: "green" },
  { title: "High Temperature", time: "Jul 21, 2:15 PM", detail: "Canopy temperature exceeded threshold.", tone: "orange" }
];

export const predictions = [
  { title: "Crop Yield Prediction", prediction: "4.2 Ton/Hectare", confidence: 94, status: "Favorable", reason: "Weather, soil moisture, and light exposure are aligned with the current crop stage." },
  { title: "Recommended Crop", prediction: "Maize", confidence: 91, status: "Best Fit", reason: "Regional weather pattern and field moisture support maize for the next cycle." },
  { title: "Irrigation Prediction", prediction: "Delay 12 Hours", confidence: 88, status: "Water Saving", reason: "Evening rain probability is high enough to postpone irrigation." },
  { title: "Future Soil Moisture", prediction: "58% Tomorrow", confidence: 86, status: "Stable", reason: "Moisture recovery is expected after forecast rainfall." },
  { title: "Water Requirement", prediction: "820 L/Day", confidence: 90, status: "Efficient", reason: "The crop is in vegetative growth with moderate evapotranspiration." },
  { title: "Confidence Score", prediction: "92%", confidence: 92, status: "Reliable", reason: "Sensor coverage is complete and recent values are consistent." }
];

export const recommendations = [
  "Irrigate today at 6 PM only if rainfall is not detected.",
  "Delay irrigation for the west plot until soil moisture falls below 48%.",
  "Monitor soil after 8 hours to validate rainfall absorption.",
  "Apply fertilizer 12 hours after rainfall to reduce runoff."
];

export const alerts = [
  { title: "Low Soil Moisture", priority: "Critical", time: "10:42 AM", action: "Inspect drip line in Zone B and irrigate if moisture remains below 45%.", tone: "red" },
  { title: "Heavy Rain", priority: "Warning", time: "05:30 PM", action: "Pause irrigation schedule and verify drainage channels.", tone: "orange" },
  { title: "Sensor Failure", priority: "Critical", time: "Yesterday", action: "Restart the light sensor node near the east field edge.", tone: "red" },
  { title: "Battery Low", priority: "Warning", time: "Jul 22", action: "Clean solar panel and check charging cable.", tone: "yellow" },
  { title: "High Temperature", priority: "Information", time: "Jul 21", action: "Continue monitoring canopy temperature during peak sunlight.", tone: "blue" }
];

export const calendarDays = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  const types = [];
  if ([3, 8, 14, 21, 28].includes(day)) types.push("Irrigation");
  if ([6, 17].includes(day)) types.push("Fertilizer");
  if ([12, 23].includes(day)) types.push("Weather");
  if (day === 29) types.push("Harvest");
  return { day, types };
});

export const settingGroups = [
  { title: "Crop Selection", options: ["Wheat", "Maize", "Rice", "Tomato"], selected: "Maize" },
  { title: "Language", options: ["English", "Hindi", "Marathi", "Kannada"], selected: "English" },
  { title: "Notification Preferences", options: ["Push alerts", "Email summary", "Critical only"], selected: "Push alerts" }
];

export const healthItems = ["ESP32", "Temperature Sensor", "Humidity Sensor", "Rain Sensor", "Soil Moisture Sensor", "Light Sensor", "Cloud Connection"];

export const smartCards = [
  { text: "No irrigation required today.", icon: Droplets, tone: "green" },
  { text: "Rain expected in evening.", icon: CloudRain, tone: "blue" },
  { text: "Optimal sunlight for crop growth.", icon: Sun, tone: "yellow" }
];

export const activeAlerts = ["Low Moisture Warning", "Heavy Rain Alert", "Sensor Offline", "Battery Low"];

export const weatherToday = [
  { label: "Temperature", value: "29 C" },
  { label: "Humidity", value: "68%" },
  { label: "Rain Probability", value: "44%" },
  { label: "Wind Speed", value: "12 km/h" }
];
