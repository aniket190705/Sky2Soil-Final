import { useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import LiveMonitoring from "./pages/LiveMonitoring";
import Analytics from "./pages/Analytics";
import Prediction from "./pages/Prediction";
import Recommendations from "./pages/Recommendations";
import Alerts from "./pages/Alerts";
import Simulator from "./pages/Simulator";
import FloatingVoiceAssistant from "./components/FloatingVoiceAssistant";
import { getLatestPrediction, getLatestSensor, subscribeToStatus, checkBackendStatus } from "./lib/api";

const pages = {
  dashboard: Dashboard,
  monitoring: LiveMonitoring,
  analytics: Analytics,
  prediction: Prediction,
  recommendations: Recommendations,
  alerts: Alerts,
  simulator: Simulator
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [latestSensor, setLatestSensor] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [sensorLoading, setSensorLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [sensorError, setSensorError] = useState("");
  const [predictionError, setPredictionError] = useState("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Theme & Language State with localStorage persistence
  const [language, setLanguage] = useState(() => localStorage.getItem("lang") || "en");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  const ActivePage = pages[activePage] || Dashboard;

  // React to Theme changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // React to Language changes
  useEffect(() => {
    localStorage.setItem("lang", language);
  }, [language]);

  useEffect(() => {
    let active = true;

    async function loadLatestSensor() {
      try {
        const payload = await getLatestSensor();
        if (!active) return;
        
        setLatestSensor(payload.data);
        setSensorHistory(prev => {
          const newHistory = [...prev, payload.data];
          if (newHistory.length > 100) newHistory.shift(); // Keep only last 100
          return newHistory;
        });
        
        setSensorError("");
      } catch (error) {
        if (!active) return;
        setSensorError(error.message);
      } finally {
        if (active) {
          setSensorLoading(false);
        }
      }
    }

    async function loadLatestPrediction() {
      try {
        const payload = await getLatestPrediction();
        if (!active) return;
        setLatestPrediction(payload.data);
        setPredictionError("");
      } catch (error) {
        if (!active) return;
        setPredictionError(error.message);
      } finally {
        if (active) {
          setPredictionLoading(false);
        }
      }
    }

    const unsubscribe = subscribeToStatus((status) => {
      if (active) {
        setIsOfflineMode(status);
      }
    });

    loadLatestSensor();
    loadLatestPrediction();
    checkBackendStatus();

    const timer = window.setInterval(loadLatestSensor, 2000); // Poll every 2 seconds for live data

    return () => {
      active = false;
      window.clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const appData = {
    latestSensor,
    sensorHistory,
    latestPrediction,
    sensorLoading,
    predictionLoading,
    sensorError,
    predictionError,
    isOfflineMode,
    language,
    setLanguage,
    darkMode,
    setDarkMode,
    savePrediction: (prediction) => {
      setLatestPrediction(prediction);
      setPredictionError("");
    },
    refreshSensor: async () => {
      setSensorLoading(true);
      try {
        const payload = await getLatestSensor();
        setLatestSensor(payload.data);
        setSensorError("");
      } catch (error) {
        setSensorError(error.message);
      } finally {
        setSensorLoading(false);
      }
    }
  };

  return (
    <>
      <AppShell activePage={activePage} setActivePage={setActivePage} appData={appData}>
        <ActivePage appData={appData} />
      </AppShell>
      <FloatingVoiceAssistant appData={appData} />
    </>
  );
}
