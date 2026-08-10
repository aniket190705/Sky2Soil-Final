import { useState, useEffect } from "react";
import { CheckCircle2, Droplets, Leaf, Lightbulb, TrendingUp, Volume2, VolumeX, BookOpen } from "lucide-react";
import { PageHeader, StatusBadge } from "../components/ui";
import { getSensorSnapshot } from "../lib/liveData";
import { getTranslator } from "../lib/translations";
import { getSensorHistory } from "../lib/api";

export default function Recommendations({ appData }) {
  const language = appData?.language || "en";
  const t = getTranslator(language);

  const sensor = getSensorSnapshot(appData?.latestSensor);
  const prediction = appData?.latestPrediction;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState([]);

  // Stop speech if language changes
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [language]);

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

  // Environmental parameters
  const temp = sensor?.temperature_c ?? 29.0;
  const humidity = sensor?.humidity_percent ?? 68.0;
  const moisture = sensor?.soil_moisture_percent ?? 54.0;
  const ldr = sensor?.ldr_raw ?? 500;
  const rain = sensor?.rain_status ?? "Dry";

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
      ldr_raw: ldrSum / count
    };
  };

  const avg1h = getAverages(1) || { temperature_c: temp, humidity_percent: humidity, soil_moisture_percent: moisture, ldr_value: ldr };
  const avg7d = getAverages(168) || { temperature_c: temp - 0.5, humidity_percent: humidity - 2, soil_moisture_percent: moisture + 1, ldr_value: ldr };

  // 1. Dynamic Morning Summary text generation
  let morningSummaryText = "";
  if (language === "hi") {
    const moistDevText = moisture >= avg7d.soil_moisture_percent ? "अधिक" : "कम";
    morningSummaryText = `शुभ प्रभात! लाइव तापमान ${temp.toFixed(1)}°C और मृदा नमी ${moisture.toFixed(0)}% है। आज की मिट्टी की नमी 7-दिन के औसत (${avg7d.soil_moisture_percent.toFixed(0)}%) से ${moistDevText} है। ${rain === "Rain" ? "खेत में बारिश हो रही है।" : "मौसम वर्तमान में सूखा है।"}`;
    if (prediction?.predicted_yield_ton_per_hectare) {
      morningSummaryText += ` संभावित फसल उपज ${prediction.predicted_yield_ton_per_hectare.toFixed(2)} टन प्रति हेक्टेयर है।`;
    }
  } else if (language === "kn") {
    const moistDevTextKn = moisture >= avg7d.soil_moisture_percent ? "ಹೆಚ್ಚು" : "ಕಡಿಮೆ";
    morningSummaryText = `ಶುಭೋದಯ! ಪ್ರಸ್ತುತ ತಾಪಮಾನ ${temp.toFixed(1)}°C ಮತ್ತು ಮಣ್ಣಿನ ತೇವಾಂಶ ${moisture.toFixed(0)}% ಇದೆ. ಇದು 7-ದಿನದ ಸರಾಸರಿಗಿಂತ (${avg7d.soil_moisture_percent.toFixed(0)}%) ${moistDevTextKn} ಆಗಿದೆ. ${rain === "Rain" ? "ಹೊಲದಲ್ಲಿ ಮಳೆ ಬೀಳುತ್ತಿದೆ." : "ಹವಾಮಾನ ಒಣಗಿದೆ."}`;
    if (prediction?.predicted_yield_ton_per_hectare) {
      morningSummaryText += ` ಅಂದಾಜು ಬೆಳೆ ಇಳುವರಿ ${prediction.predicted_yield_ton_per_hectare.toFixed(2)} ಟನ್ ಆಗಿದೆ.`;
    }
  } else {
    const moistDevText = moisture >= avg7d.soil_moisture_percent ? "above" : "below";
    morningSummaryText = `Good morning! Current temperature is ${temp.toFixed(1)}°C and soil moisture is ${moisture.toFixed(0)}% (which is ${moistDevText} the 7-day average of ${avg7d.soil_moisture_percent.toFixed(0)}%). ${rain === "Rain" ? "Rainfall is active." : "Weather is dry."}`;
    if (prediction?.predicted_yield_ton_per_hectare) {
      morningSummaryText += ` Predicted crop yield for ${prediction.input.crop_type} is stable at ${prediction.predicted_yield_ton_per_hectare.toFixed(2)} Ton/Ha.`;
    }
  }

  // 2. Rule-Based Structured Recommendations
  const rules = [];

  if (moisture < 45) {
    rules.push({
      topic: t("soil_moisture"),
      rec: language === "hi" ? "तुरंत सिंचाई शुरू करें।" : language === "kn" ? "ತಕ್ಷಣವೇ ನೀರು ಹಾಯಿಸಿ." : "Trigger drip irrigation immediately.",
      reason: language === "hi" 
        ? `मिट्टी की नमी (${moisture.toFixed(0)}%) सुरक्षित सीमा (45%) से कम है।` 
        : language === "kn"
        ? `ಮಣ್ಣಿನ ತೇವಾಂಶ (${moisture.toFixed(0)}%) ಸುರಕ್ಷಿತ ಮಟ್ಟಕ್ಕಿಂತ (45%) ಕಡಿಮೆಯಾಗಿದೆ.`
        : `Soil moisture level (${moisture.toFixed(0)}%) is below the healthy threshold of 45%.`
    });
  } else if (moisture > 70) {
    rules.push({
      topic: t("soil_moisture"),
      rec: language === "hi" ? "पानी का छिड़काव रोकें और जल निकासी साफ करें।" : language === "kn" ? "ಹೆಚ್ಚುವರಿ ನೀರನ್ನು ಹೊರಹಾಕಿ." : "Suspend irrigation and inspect drainage.",
      reason: language === "hi" 
        ? `नमी (${moisture.toFixed(0)}%) अत्यधिक है, जिससे जड़ों के सड़ने का खतरा है।` 
        : language === "kn"
        ? `ಮಣ್ಣಿನ ತೇವಾಂಶ (${moisture.toFixed(0)}%) ಹೆಚ್ಚಾಗಿದ್ದು, ಬೇರು ಕೊಳೆಯುವ ಭೀತಿ ಇದೆ.`
        : `Excessive soil moisture (${moisture.toFixed(0)}%) detected. Risk of waterlogging.`
    });
  } else {
    rules.push({
      topic: t("soil_moisture"),
      rec: language === "hi" ? "वर्तमान सिंचाई चक्र बनाए रखें।" : language === "kn" ? "ಸ್ಥಿರ ನೀರಾವರಿ ಕಾಪಾಡಿಕೊಳ್ಳಿ." : "Maintain normal scheduled irrigation.",
      reason: language === "hi" 
        ? `मिट्टी की नमी (${moisture.toFixed(0)}%) आरामदायक सीमा के भीतर है।` 
        : language === "kn"
        ? `ಮಣ್ಣಿನ ತೇವಾಂಶ (${moisture.toFixed(0)}%) ಸೂಕ್ತ ಪ್ರಮಾಣದಲ್ಲಿದೆ.`
        : `Moisture level (${moisture.toFixed(0)}%) is within the optimal comfort zone.`
    });
  }

  if (rain === "Rain") {
    rules.push({
      topic: t("rain_status"),
      rec: language === "hi" ? "सिंचाई पंप बंद कर दें।" : language === "kn" ? "ನೀರಾವರಿ ಪಂಪ್‌ಗಳನ್ನು ಸ್ಥಗಿತಗೊಳಿಸಿ." : "Turn off manual irrigation pumps.",
      reason: language === "hi" ? "सेंसर ने बारिश का पता लगाया है। प्राकृतिक पानी पर्याप्त है।" : language === "kn" ? "ಮಳೆ ಬೀಳುತ್ತಿರುವುದು ದೃಢಪಟ್ಟಿದೆ." : "Active precipitation detected. Natural watering is sufficient."
    });
  }

  if (temp > 35) {
    rules.push({
      topic: t("temp"),
      rec: language === "hi" ? "मल्चिंग या स्प्रिंकलर स्प्रे बढ़ाएं।" : language === "kn" ? "ಮಣ್ಣಿಗೆ ಮಲ್ಚಿಂಗ್ ವ್ಯವಸ್ಥೆ ಮಾಡಿ." : "Apply mulching or increase mist sprayers.",
      reason: language === "hi" 
        ? `उच्च तापमान (${temp.toFixed(1)}°C) से वाष्पीकरण बढ़ सकता है।` 
        : language === "kn"
        ? `ತಾಪಮಾನ (${temp.toFixed(1)}°C) ಹೆಚ್ಚಾಗಿದ್ದು, ಬಾಷ್ಪೀಕರಣ ವೇಗಗೊಳಿಸುತ್ತದೆ.`
        : `High temperature (${temp.toFixed(1)}°C) increases evapotranspiration rates.`
    });
  }

  if (ldr < 200) {
    rules.push({
      topic: t("light_intensity"),
      rec: language === "hi" ? "छाया देने वाले नेट को हटा लें।" : language === "kn" ? "ನೆರಳು ಪರದೆಗಳನ್ನು ತೆಗೆಯಿರಿ." : "Retract shading sheets if covered.",
      reason: language === "hi" ? "कम धूप के कारण प्रकाश संश्लेषण धीमा हो सकता है।" : language === "kn" ? "ಕಡಿಮೆ ಬೆಳಕಿನ ಪ್ರಮಾಣ ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆಗೆ ಅಡ್ಡಿಯಾಗುತ್ತದೆ." : "Low ambient light detected, limiting rate of photosynthesis."
    });
  }

  // Compile full text for Text-to-Speech
  const fullSpeakText = morningSummaryText + " " + rules.map(r => `${r.topic}: ${r.rec} ${r.reason}`).join(" ");

  // Handle TTS playback
  const handleTTS = () => {
    if (!window.speechSynthesis) {
      alert("Text-to-Speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(fullSpeakText);
      
      // Attempt to map selected language to supported local voice
      if (language === "hi") {
        utterance.lang = "hi-IN";
      } else if (language === "kn") {
        utterance.lang = "kn-IN";
      } else {
        utterance.lang = "en-IN";
      }

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const outcomeText = prediction?.predicted_yield_ton_per_hectare
    ? `${prediction.predicted_yield_ton_per_hectare.toFixed(2)} Ton/Ha predicted for ${prediction.input.crop_type}.`
    : "Prediction outcome will appear here after sensor values update.";

  return (
    <section className="page assistant-page">
      <PageHeader
        eyebrow="Smart Assistant"
        title={t("recommendations")}
        description="Rule-based advice combined with live prediction feedback to help with daily field operations."
      />

      {/* Morning Summary Hero Card with TTS Icon */}
      <article className="assistant-hero" style={{ position: "relative", paddingRight: "70px" }}>
        <div>
          <span className="metric-icon"><Lightbulb size={23} /></span>
          <h2>{t("morning_summary")}</h2>
          <p style={{ fontSize: "1.05rem", lineHeight: "1.6", fontWeight: "600" }}>{morningSummaryText}</p>
        </div>
        
        {/* Play/Stop Audio Button */}
        <button 
          onClick={handleTTS}
          className={`primary-button ${isSpeaking ? "danger" : ""}`}
          style={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            padding: "0",
            display: "inline-grid",
            placeItems: "center",
            boxShadow: "0 8px 24px rgba(22, 134, 74, 0.25)"
          }}
          title={isSpeaking ? t("stop_audio") : t("play_audio")}
        >
          {isSpeaking ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </article>

      {/* Grid: Recommended Actions Table + Outcomes */}
      <div className="two-column">
        {/* Rule-Based Recommendations Table */}
        <article className="panel">
          <div className="panel-title">
            <h3>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><BookOpen size={18} /> Structured Advice Rules</span>
            </h3>
            <StatusBadge tone="green">Rules Active</StatusBadge>
          </div>
          <div style={{ marginTop: "15px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "10px", width: "30%" }}>Parameter</th>
                  <th style={{ padding: "10px", width: "40%" }}>{t("recommendation")}</th>
                  <th style={{ padding: "10px", width: "30%" }}>{t("reason")}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "750" }}>{rule.topic}</td>
                    <td style={{ padding: "10px", color: "var(--green-deep)", fontWeight: "650" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
                        {rule.rec}
                      </div>
                    </td>
                    <td style={{ padding: "10px", color: "var(--muted)" }}>{rule.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Expected Outcomes Card */}
        <article className="panel">
          <div className="panel-title">
            <h3>Expected Outcomes</h3>
            <StatusBadge tone="blue">Projected</StatusBadge>
          </div>
          <div className="outcome-grid" style={{ marginTop: "15px", display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "var(--surface-soft)", borderRadius: "8px" }}>
              <Leaf size={24} style={{ color: "var(--green)" }} />
              <div>
                <strong>Healthy Crop Growth</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                  {sensor ? "Driven by real-time environment sync" : "Waiting for sensor readings"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "var(--surface-soft)", borderRadius: "8px" }}>
              <Droplets size={24} style={{ color: "var(--blue)" }} />
              <div>
                <strong>Water Decision</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                  {sensor?.rain_status === "Rain" ? "Natural precipitation active - Delay manual irrigation" : "Irrigate according to moisture comfort zone levels"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "var(--surface-soft)", borderRadius: "8px" }}>
              <TrendingUp size={24} style={{ color: "var(--yellow)" }} />
              <div>
                <strong>Yield Outlook</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>{outcomeText}</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
