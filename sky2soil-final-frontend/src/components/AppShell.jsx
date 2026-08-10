import { Bell, CloudSun, Leaf, Menu, UserRound, X, CloudRain, Sun, Moon, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { navItems } from "../data/mockData";
import { getSensorSnapshot } from "../lib/liveData";
import { getTranslator } from "../lib/translations";

export default function AppShell({ activePage, setActivePage, appData, children }) {
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);
  
  const language = appData?.language || "en";
  const setLanguage = appData?.setLanguage || (() => {});
  const darkMode = appData?.darkMode || false;
  const setDarkMode = appData?.setDarkMode || (() => {});

  const t = getTranslator(language);
  const liveSensor = getSensorSnapshot(appData?.latestSensor);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(now);

  const weatherLabel = liveSensor
    ? `${liveSensor.temperature_c?.toFixed(1)} C, ${liveSensor.rain_status === "Rain" ? t("wet") : t("dry")}`
    : t("waiting");

  const navTranslationKeys = {
    dashboard: "dashboard",
    monitoring: "live_monitoring",
    analytics: "analytics",
    prediction: "ai_prediction",
    recommendations: "recommendations",
    alerts: "alerts",
    calendar: "calendar",
    settings: "settings",
    simulator: "simulator"
  };

  const filteredNavItems = navItems.filter((item) => item.id !== "calendar" && item.id !== "settings");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <span><Leaf size={24} /></span>
          <strong>Sky2Soil</strong>
        </div>
        <nav>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const labelKey = navTranslationKeys[item.id] || item.id;
            const label = t(labelKey);
            return (
              <button
                key={item.id}
                className={activePage === item.id ? "active" : ""}
                onClick={() => {
                  setActivePage(item.id);
                  setOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="content-frame">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setOpen((value) => !value)} title="Menu">
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
          
          <div className="topbar-date">{formattedDate}</div>
          <div className="weather-chip"><CloudSun size={18} /> {weatherLabel}</div>

          {/* Connection Status Badge */}
          {appData?.isOfflineMode ? (
            <div className="weather-chip" style={{ background: "rgba(249, 115, 22, 0.15)", color: "#f97316", borderColor: "rgba(249, 115, 22, 0.3)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f97316", display: "inline-block" }}></span>
              <strong>{t("offline_mode")}</strong>
            </div>
          ) : (
            <div className="weather-chip" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", borderColor: "rgba(34, 197, 94, 0.3)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
              <strong>{t("online_mode")}</strong>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button 
            className="icon-button" 
            title="Toggle Dark Mode"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Language Switcher */}
          <div className="profile-chip" style={{ padding: "0 8px", cursor: "pointer" }}>
            <Globe size={18} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                fontSize: "inherit",
                fontWeight: "inherit",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="en" style={{ background: "var(--surface)", color: "var(--text)" }}>EN</option>
              <option value="hi" style={{ background: "var(--surface)", color: "var(--text)" }}>HI</option>
              <option value="kn" style={{ background: "var(--surface)", color: "var(--text)" }}>KN</option>
            </select>
          </div>

          <button className="icon-button" title="Notifications"><Bell size={19} /></button>
          <div className="profile-chip"><UserRound size={18} /> Aman</div>
        </header>
        <main>
          {liveSensor?.rain_status === "Rain" && (
            <div className="info-banner warning" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
              <CloudRain size={20} />
              <span><strong>Live Weather Alert:</strong> It is currently raining in the field! Pause manual irrigation.</span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
