import { AlertCircle, BatteryWarning, CloudRain, Thermometer, WifiOff, CheckCircle2 } from "lucide-react";
import { PageHeader, StatusBadge } from "../components/ui";
import { getSensorSnapshot } from "../lib/liveData";
import { getTranslator } from "../lib/translations";

export default function Alerts({ appData }) {
  const language = appData?.language || "en";
  const t = getTranslator(language);

  const sensor = getSensorSnapshot(appData?.latestSensor);
  const prediction = appData?.latestPrediction;

  // Build dynamic chronological timeline events based on live values
  const timelineEvents = [];

  const temp = sensor?.temperature_c ?? 29;
  const moisture = sensor?.soil_moisture_percent ?? 54;
  const humidity = sensor?.humidity_percent ?? 68;
  const rain = sensor?.rain_status ?? "Dry";

  const timeString = appData?.latestSensor?.receivedAt 
    ? new Date(appData.latestSensor.receivedAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })
    : "Just now";

  // Low Soil Moisture Alert
  if (moisture < 45) {
    timelineEvents.push({
      time: timeString,
      title: language === "hi" ? "गंभीर चेतावनी: कम मिट्टी की नमी" : language === "kn" ? "ಹೆಚ್ಚಿನ ಆತಂಕ: ಮಣ್ಣಿನ ತೇವಾಂಶ ಕಡಿಮೆ" : "Critical Alert: Low Soil Moisture",
      detail: language === "hi"
        ? `मिट्टी की नमी का स्तर ${moisture.toFixed(0)}% है। कृपया फसल को सूखने से बचाने के लिए सिंचाई शुरू करें।`
        : language === "kn"
        ? `ಮಣ್ಣಿನ ತೇವಾಂಶವು ${moisture.toFixed(0)}% ತಲುಪಿದೆ. ಬೆಳೆ ಒಣಗದಂತೆ ತಡೆಯಲು ದಯವಿಟ್ಟು ನೀರಾವರಿ ಪಂಪ್ ಚಾಲೂ ಮಾಡಿ.`
        : `Soil moisture level has dropped to ${moisture.toFixed(0)}%. Trigger manual/drip irrigation immediately.`,
      tone: "orange",
      icon: AlertCircle
    });
  }

  // Rain Suspends Irrigation Alert
  if (rain === "Rain") {
    timelineEvents.push({
      time: timeString,
      title: language === "hi" ? "वर्षा चेतावनी: प्राकृतिक सिंचाई सक्रिय" : language === "kn" ? "ಮಳೆ ಸೂಚನೆ: ನೈಸರ್ಗಿಕ ನೀರಾವರಿ ಸಕ್ರಿಯ" : "Precipitation Alert: Rain Detected",
      detail: language === "hi"
        ? "खेत में बारिश दर्ज की गई है। अति-सिंचाई और पानी के जमाव को रोकने के लिए पंपों को बंद कर दिया गया है।"
        : language === "kn"
        ? "ಮಳೆ ಬಿದ್ದಿರುವುದು ಸೆನ್ಸರ್ ನಲ್ಲಿ ದೃಢಪಟ್ಟಿದೆ. ನೀರಾವರಿ ವ್ಯವಸ್ಥೆಯನ್ನು ಆಫ್ ಮಾಡಲಾಗಿದೆ."
        : "Active rainfall detected by the IoT sensor. Scheduled irrigation has been paused.",
      tone: "blue",
      icon: CloudRain
    });
  }

  // High Temperature thermal alert
  if (temp > 35) {
    timelineEvents.push({
      time: timeString,
      title: language === "hi" ? "थर्मल अलर्ट: अत्यधिक तापमान" : language === "kn" ? "ತಾಪಮಾನ ಏರಿಕೆ: ಅಧಿಕ ಉಷ್ಣಾಂಶ" : "Thermal Stress: High Temperature",
      detail: language === "hi"
        ? `तापमान ${temp.toFixed(1)}°C तक पहुंच गया है। वाष्पोत्सर्जन को कम करने के लिए छाया जाल का उपयोग करें।`
        : language === "kn"
        ? `ಉಷ್ಣಾಂಶವು ${temp.toFixed(1)}°C ತಲುಪಿದೆ. ಗಿಡಗಳು ಬಾಡದಂತೆ ರಕ್ಷಿಸಲು ನೆರಳು ಪರದೆ ಬಳಸಿ.`
        : `Field temperature is high at ${temp.toFixed(1)}°C. Deploy crop shading layers or mist sprinkler.`,
      tone: "orange",
      icon: Thermometer
    });
  }

  // Low humidity alert
  if (humidity < 40) {
    timelineEvents.push({
      time: timeString,
      title: language === "hi" ? "वायुमंडलीय सूखा: कम आर्द्रता" : language === "kn" ? "ಒಣ ಹವೆ: ಕಡಿಮೆ ಆರ್ದ್ರತೆ" : "Dry Atmosphere: Low Humidity",
      detail: language === "hi"
        ? `आर्द्रता ${humidity.toFixed(0)}% है। पत्ती वाष्पीकरण पर नजर रखें।`
        : language === "kn"
        ? `ಗಾಳಿಯ ತೇವಾಂಶವು ${humidity.toFixed(0)}% ಗೆ ಇಳಿದಿದೆ.`
        : `Ambient humidity is low at ${humidity.toFixed(0)}%. Monitor crop leaves for moisture loss.`,
      tone: "yellow",
      icon: AlertCircle
    });
  }

  // Stable event if everything is fine
  if (timelineEvents.length === 0) {
    timelineEvents.push({
      time: timeString,
      title: language === "hi" ? "सिस्टम स्थिर: सुरक्षित स्थिति" : language === "kn" ? "ವ್ಯವಸ್ಥೆ ಸುರಕ್ಷಿತವಾಗಿದೆ" : "System Status: Stable",
      detail: language === "hi"
        ? `सभी सेंसर रीडिंग सामान्य हैं (तापमान: ${temp.toFixed(1)}°C, नमी: ${moisture.toFixed(0)}%)। कोई कार्रवाई आवश्यक नहीं है।`
        : language === "kn"
        ? `ಎಲ್ಲಾ ಸೆನ್ಸರ್‌ಗಳ ವರದಿಗಳು ಸಾಮಾನ್ಯ ಮಟ್ಟದಲ್ಲಿವೆ (ತಾಪಮಾನ: ${temp.toFixed(1)}°C, ತೇವಾಂಶ: ${moisture.toFixed(0)}%).`
        : `All climatic indices are within the comfortable zone (Temp: ${temp.toFixed(1)}°C, Moisture: ${moisture.toFixed(0)}%). No action required.`,
      tone: "green",
      icon: CheckCircle2
    });
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow="Risk Center"
        title={t("active_alerts")}
        description="Real-time alert timeline triggered directly by changes in your field sensor readings."
      />

      {appData?.sensorError && (
        <div className="info-banner warning">
          Live alert generation is currently using default mock datasets.
        </div>
      )}

      {/* Timeline Layout */}
      <article className="panel">
        <div className="panel-title">
          <h3>{t("timeline")}</h3>
          <StatusBadge tone="orange">{timelineEvents.length} Event(s)</StatusBadge>
        </div>
        
        <div className="timeline" style={{ marginTop: "20px" }}>
          {timelineEvents.map((event, idx) => {
            const Icon = event.icon;
            return (
              <div className={`timeline-item tone-${event.tone}`} key={idx} style={{ paddingBottom: "15px", borderBottom: idx < timelineEvents.length - 1 ? "1px dashed var(--line)" : "none" }}>
                <span style={{ 
                  display: "inline-grid", 
                  placeItems: "center", 
                  width: "36px", 
                  height: "36px", 
                  borderRadius: "50%", 
                  background: `var(--surface-soft)`, 
                  color: `var(--${event.tone === "orange" ? "orange" : event.tone === "blue" ? "blue" : event.tone === "red" ? "red" : "green"})`,
                  border: "1px solid var(--line)"
                }}>
                  <Icon size={18} />
                </span>
                <div style={{ marginLeft: "15px" }}>
                  <strong style={{ fontSize: "1.1rem" }}>{event.title}</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "4px 0" }}>{event.time}</div>
                  <p style={{ margin: "5px 0 0 0", color: "var(--text)", lineHeight: "1.5" }}>{event.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
