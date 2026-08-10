// aiEngine.js
// Completely offline AI Engine using Cascading Regex Keyword Matching for Sky2Soil

// 1. Keyword Definitions for Auto-Language Detection and Modifiers
const hinglishKeywords = /\b(kya|kaise|abhi|khet|paani|kitna|kal|hai|ki|aaj)\b/i;
const kannadaKeywords = /\b(hege|yenu|iga|hola|neeru|eshtu|ninne|ide|ivattu|ಹೇಗೆ|ಏನು|ಈಗ|ಹೊಲ|ನೀರು|ಎಷ್ಟು|ನಿನ್ನೆ|ಇದೆ|ಇವತ್ತು)\b/i;
const historicalKeywords = /\b(yesterday|kal|past|pichle|ninne|hindina|ನಿನ್ನೆ|ಹಿಂದಿನ)\b/i;

// 2. Cascading Regex Intent Matchers
const intentRegex = {
  greeting: /\b(hello|hi|hey|who are you|how are you|namaste|namaskara|ನಮಸ್ಕಾರ|ಹಲೋ|ಹೇಗಿದ್ದೀರಾ)\b/i,
  temperature: /\b(temperature|taapmaan|garmi|cold|tapamana|sheke|ತಾಪಮಾನ|ಸೆಕೆ)\b/i,
  humidity: /\b(humidity|nami|umash|moisture in air|thevamsa|ಆರ್ದ್ರತೆ|ತೇವಾಂಶ)\b/i,
  soilMoisture: /\b(soil moisture|moisture|paani|miti|mitti|mannina|neeru|ಮಣ್ಣಿನ ತೇವಾಂಶ|ಮಣ್ಣು|ನೀರು)\b/i,
  light: /\b(light|sunlight|dhoop|roshni|belaku|ಬೆಳಕು|ಬಿಸಿಲು)\b/i,
  rain: /\b(rain|barish|baarish|raining|male|ಮಳೆ)\b/i,
  farmHealth: /\b(how is my farm|farm today|khet kaisa hai|hola hege ide|ಹೊಲ ಹೇಗಿದೆ|ಹೊಲ)\b/i,
  irrigate: /\b(irrigate|water the plants|sinchai|paani du|neeru hakala|ನೀರು ಹಾಕು|ನೀರಾವರಿ)\b/i,
  yieldLow: /\b(why is my yield low|yield low|kam paadavaar|yield bad|low yield|fasalu kam|ilaveri kadime|ಇಳುವರಿ ಕಡಿಮೆ|ಫಸಲು)\b/i,
  projectInfo: /\b(what is sky2soil|about this project|how does it work|sensors used|about project|kaam kaise|sky to soil|sky 2 soil|project details|about sky2soil|ಸ್ಕೈ2ಸಾಯಿಲ್|ಈ ಪ್ರಾಜೆಕ್ಟ್)\b/i
};

// Localized Responses Knowledge Base
const responses = {
  greetings: {
    'en-US': ["Hello! I am your Farmer's Companion. How can I help you today?", "Hi there! I'm here to assist you with your farm.", "I'm doing great, how is your farm doing today?"],
    'hi-IN': ["Namaste! Main aapka kisan saathi hoon. Main aapki kaise madad kar sakta hoon?", "Hello! Khet ki jankari chahiye?", "Main theek hoon, aapka khet kaisa hai aaj?"],
    'kn-IN': ["ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ರೈತ ಮಿತ್ರ. ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?", "ಹಲೋ! ನಿಮ್ಮ ಹೊಲ ಹೇಗಿದೆ?", "ನಾನು ಚೆನ್ನಾಗಿದ್ದೀನಿ, ನಿಮ್ಮ ಕೆಲಸ ಹೇಗೆ ನಡೆಯುತ್ತಿದೆ?"]
  },
  noData: {
    'en-US': "I cannot access the sensor right now.",
    'hi-IN': "Main abhi sensor data nahi padh sakta.",
    'kn-IN': "ನನಗೆ ಈಗ ಸೆನ್ಸರ್ ಡೇಟಾ ನೋಡಲು ಆಗುತ್ತಿಲ್ಲ."
  },
  noHistory: {
    'en-US': "I don't have enough historical data to compare right now.",
    'hi-IN': "Pichla data abhi uplabdh nahi hai.",
    'kn-IN': "ಹಿಂದಿನ ಡೇಟಾ ಈಗ ಲಭ್ಯವಿಲ್ಲ."
  },
  notUnderstood: {
    'en-US': "I'm sorry, I didn't understand which metric you are asking for.",
    'hi-IN': "Maaf kijiye, main yeh nahi samajh paya.",
    'kn-IN': "ಕ್ಷಮಿಸಬೇಕು, ನಿಮಗೆ ಯಾವ ಡೇಟಾ ಬೇಕು ಅಂತ ನನಗೆ ಅರ್ಥ ಆಗಿಲ್ಲ."
  },
  projectInfo: {
    'en-US': "Sky2Soil is an IoT agricultural platform. It uses ESP32 with sensors to read temperature, humidity, and soil moisture, and uses Machine Learning to predict crop yields.",
    'hi-IN': "Sky2Soil ek IoT agriculture platform hai. Yeh ESP32 aur sensors ka use karta hai taapmaan aur nami napne ke liye, aur Machine Learning se fasal ki paadavaar ka anuman lagata hai.",
    'kn-IN': "Sky2Soil ಒಂದು IoT ಕೃಷಿ ವೇದಿಕೆ. ಇದು ESP32 ಮತ್ತು ಸೆನ್ಸಾರ್‌ಗಳನ್ನು ಬಳಸಿ ತಾಪಮಾನ, ತೇವಾಂಶ ಅಳೆಯುತ್ತದೆ, ಮತ್ತು Machine Learning ಮೂಲಕ ಇಳುವರಿಯನ್ನು ಊಹಿಸುತ್ತದೆ."
  }
};

const getRandomResponse = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Main Engine Processor
 * @param {string} text - Transcribed voice text
 * @param {object} appData - Global state containing latestSensor, sensorHistory, latestPrediction
 * @param {string} currentLang - Default language (e.g. 'en-US')
 * @returns {string} Response text to be spoken
 */
export const processVoiceInput = (text, appData, currentLang = 'en-US') => {
  if (!text) return "";
  
  let lang = currentLang;

  // Auto-Detect Language (Overrides default if Hinglish or Kannada romanized is detected)
  if (hinglishKeywords.test(text)) {
    lang = 'hi-IN';
  } else if (kannadaKeywords.test(text)) {
    lang = 'kn-IN';
  }

  // 1. Check Greetings / Identity
  if (intentRegex.greeting.test(text)) {
    return getRandomResponse(responses.greetings[lang] || responses.greetings['en-US']);
  }

  // 1.5 Check Project Info
  if (intentRegex.projectInfo.test(text)) {
    return responses.projectInfo[lang] || responses.projectInfo['en-US'];
  }

  // 2. Check Analytical/Hypothetical Intents (More complex, match these before simple metrics)
  if (intentRegex.farmHealth.test(text)) {
    return handleFarmHealth(appData, lang);
  }
  if (intentRegex.irrigate.test(text)) {
    return handleIrrigate(appData, lang);
  }
  if (intentRegex.yieldLow.test(text)) {
    return handleYieldLow(appData, lang);
  }

  // 3. Check Modifiers (Historical vs Real-time)
  const isHistorical = historicalKeywords.test(text);

  if (isHistorical) {
    return handleHistorical(text, appData, lang);
  } else {
    return handleRealTime(text, appData, lang);
  }
};

const getLocalizedNoData = (lang) => responses.noData[lang] || responses.noData['en-US'];

const handleFarmHealth = (appData, lang) => {
  const latest = appData?.latestSensor;
  if (!latest) return getLocalizedNoData(lang);
  
  // Assume a calculated health score exists or we infer it
  let score = latest.healthScore || "good";
  let moisture = latest.soilMoisture;
  
  if (lang === 'hi-IN') {
    return `Aapke khet ki sthiti aaj ${score} lag rahi hai. Mitti ki nami ${moisture} pratishat hai.`;
  } else if (lang === 'kn-IN') {
    return `ನಿಮ್ಮ ಹೊಲ ಇವತ್ತು ${score} ಆಗಿದೆ. ಮಣ್ಣಿನ ತೇವಾಂಶ ${moisture} ಪ್ರತಿಶತ ಇದೆ.`;
  }
  return `Your farm is looking ${score} today. The soil moisture is at ${moisture}%.`;
}

const handleIrrigate = (appData, lang) => {
  const latest = appData?.latestSensor;
  if (!latest) return getLocalizedNoData(lang);
  
  const isRaining = latest.rainStatus === 'Raining' || latest.rain > 0;
  const moisture = latest.soilMoisture;

  if (isRaining) {
    if (lang === 'hi-IN') return "Abhi barish ho rahi hai, kripya paani mat dijiye.";
    if (lang === 'kn-IN') return "ಈಗ ಮಳೆ ಬರುತ್ತಿದೆ, ನೀರು ಹಾಕಬೇಡಿ.";
    return "It is raining right now, I advise against irrigating today.";
  }
  if (moisture > 60) {
    if (lang === 'hi-IN') return `Mitti mein kafi nami hai, jo ki ${moisture} pratishat hai. Paani ki zaroorat nahi hai.`;
    if (lang === 'kn-IN') return `ಮಣ್ಣಿನಲ್ಲಿ ಸಾಕು ತೇವಾಂಶ ಇದೆ, ಸುಮಾರು ${moisture} ಪ್ರತಿಶತ. ನೀರು ಹಾಕುವುದು ಬೇಡ.`;
    return `Soil moisture is already high at ${moisture}%. You don't need to irrigate today.`;
  }
  
  if (lang === 'hi-IN') return `Mitti thodi sookhi hai, ${moisture} pratishat nami ke sath. Paani dena theek rahega.`;
  if (lang === 'kn-IN') return `ಮಣ್ಣು ಸ್ವಲ್ಪ ಒಣಗಿದೆ, ${moisture} ಪ್ರತಿಶತ ತೇವಾಂಶ ಇದೆ. ನೀರು ಹಾಕುವುದು ಒಳ್ಳೆಯದು.`;
  return `Soil moisture is at ${moisture}%. It would be a good idea to irrigate today.`;
}

const handleYieldLow = (appData, lang) => {
  const prediction = appData?.latestPrediction;
  const latest = appData?.latestSensor;
  
  if (!latest) return getLocalizedNoData(lang);
  
  let explanation = "";
  if (lang === 'hi-IN') {
    explanation = "Aapki paadavaar kam hone ke kuch kaaran ho sakte hain. ";
    if (latest.soilMoisture < 30) explanation += "Mitti mein nami bahut kam hai. ";
    if (latest.temperature > 35) explanation += "Taapmaan kafi zyada hai. ";
    if (prediction) explanation += `Hamara ML anumaan hai ki aapki yield ${prediction} rahegi.`;
  } else if (lang === 'kn-IN') {
    explanation = "ನಿಮ್ಮ ಇಳುವರಿ ಕಡಿಮೆ ಆಗಲು ಕೆಲವು ಕಾರಣಗಳು ಇರಬಹುದು. ";
    if (latest.soilMoisture < 30) explanation += "ಮಣ್ಣಿನಲ್ಲಿ ತೇವಾಂಶ ತುಂಬಾ ಕಡಿಮೆ ಇದೆ. ";
    if (latest.temperature > 35) explanation += "ತಾಪಮಾನ ತುಂಬಾ ಜಾಸ್ತಿ ಇದೆ. ";
    if (prediction) explanation += `ನಮ್ಮ ML ಅನುಮಾನದ ಪ್ರಕಾರ ನಿಮ್ಮ ಇಳುವರಿ ${prediction} ಇರುತ್ತದೆ.`;
  } else {
    explanation = "There could be a few reasons for a lower yield. ";
    if (latest.soilMoisture < 30) explanation += "Soil moisture is critically low. ";
    if (latest.temperature > 35) explanation += "The temperature is quite high. ";
    if (prediction) explanation += `Our latest ML prediction indicates a yield of ${prediction}.`;
  }
  return explanation;
}

const handleRealTime = (text, appData, lang) => {
  const latest = appData?.latestSensor;
  // Strictly refuse to answer with fake data
  if (!latest) return getLocalizedNoData(lang);

  if (intentRegex.temperature.test(text)) {
    if (lang === 'hi-IN') return `Abhi ka taapmaan ${latest.temperature} degree hai.`;
    if (lang === 'kn-IN') return `ಈಗಿನ ತಾಪಮಾನ ${latest.temperature} ಡಿಗ್ರಿ ಇದೆ.`;
    return `The current temperature is ${latest.temperature} degrees.`;
  }
  if (intentRegex.humidity.test(text)) {
    if (lang === 'hi-IN') return `Abhi ki nami ${latest.humidity} pratishat hai.`;
    if (lang === 'kn-IN') return `ಈಗಿನ ಆರ್ದ್ರತೆ ${latest.humidity} ಪ್ರತಿಶತ ಇದೆ.`;
    return `The current humidity is ${latest.humidity} percent.`;
  }
  if (intentRegex.soilMoisture.test(text)) {
    if (lang === 'hi-IN') return `Mitti ki nami ${latest.soilMoisture} pratishat hai.`;
    if (lang === 'kn-IN') return `ಮಣ್ಣಿನ ತೇವಾಂಶ ${latest.soilMoisture} ಪ್ರತಿಶತ ಇದೆ.`;
    return `The soil moisture is at ${latest.soilMoisture} percent.`;
  }
  if (intentRegex.light.test(text)) {
    if (lang === 'hi-IN') return `Khet mein roshni ka star ${latest.lightIntensity} hai.`;
    if (lang === 'kn-IN') return `ಹೊಲದಲ್ಲಿ ಬೆಳಕಿನ ಪ್ರಮಾಣ ${latest.lightIntensity} ಇದೆ.`;
    return `The light intensity is currently at ${latest.lightIntensity}.`;
  }
  if (intentRegex.rain.test(text)) {
    const isRaining = latest.rainStatus === 'Raining' || latest.rain > 0;
    if (isRaining) {
      if (lang === 'hi-IN') return "Haan, abhi khet mein barish ho rahi hai.";
      if (lang === 'kn-IN') return "ಹೌದು, ಈಗ ಮಳೆ ಬರುತ್ತಿದೆ.";
      return "Yes, it is raining right now.";
    }
    if (lang === 'hi-IN') return "Nahi, abhi barish nahi ho rahi hai.";
    if (lang === 'kn-IN') return "ಇಲ್ಲ, ಈಗ ಮಳೆ ಬರುತ್ತಿಲ್ಲ.";
    return "No, it is not raining currently.";
  }

  return responses.notUnderstood[lang] || responses.notUnderstood['en-US'];
}

const handleHistorical = (text, appData, lang) => {
  const history = appData?.sensorHistory;
  if (!history || !Array.isArray(history) || history.length === 0) {
    return responses.noHistory[lang] || responses.noHistory['en-US'];
  }
  
  // Compare oldest available history with latest reading
  const past = history[0];
  const latest = appData?.latestSensor || history[history.length - 1];
  
  if (!latest || !past) {
    return responses.noHistory[lang] || responses.noHistory['en-US'];
  }

  if (intentRegex.temperature.test(text)) {
    const diff = latest.temperature - past.temperature;
    const trendEn = diff > 0 ? "increased" : "decreased";
    const trendHi = diff > 0 ? "badha hai" : "ghata hai";
    const trendKn = diff > 0 ? "ಜಾಸ್ತಿ ಆಗಿದೆ" : "ಕಡಿಮೆ ಆಗಿದೆ";
    
    if (lang === 'hi-IN') return `Kal ke mukable taapmaan ${Math.abs(diff).toFixed(1)} degree ${trendHi}.`;
    if (lang === 'kn-IN') return `ನಿನ್ನೆಗೆ ಹೋಲಿಸಿದರೆ ತಾಪಮಾನ ${Math.abs(diff).toFixed(1)} ಡಿಗ್ರಿ ${trendKn}.`;
    return `Compared to the past, the temperature has ${trendEn} by ${Math.abs(diff).toFixed(1)} degrees.`;
  }
  
  if (intentRegex.humidity.test(text)) {
    const diff = latest.humidity - past.humidity;
    const trendEn = diff > 0 ? "increased" : "decreased";
    const trendHi = diff > 0 ? "badhi hai" : "ghati hai";
    const trendKn = diff > 0 ? "ಜಾಸ್ತಿ ಆಗಿದೆ" : "ಕಡಿಮೆ ಆಗಿದೆ";
    
    if (lang === 'hi-IN') return `Kal ke mukable nami ${Math.abs(diff).toFixed(1)} pratishat ${trendHi}.`;
    if (lang === 'kn-IN') return `ನಿನ್ನೆಗೆ ಹೋಲಿಸಿದರೆ ಆರ್ದ್ರತೆ ${Math.abs(diff).toFixed(1)} ಪ್ರತಿಶತ ${trendKn}.`;
    return `Compared to the past, the humidity has ${trendEn} by ${Math.abs(diff).toFixed(1)} percent.`;
  }
  
  if (intentRegex.soilMoisture.test(text)) {
    const diff = latest.soilMoisture - past.soilMoisture;
    const trendEn = diff > 0 ? "increased" : "decreased";
    const trendHi = diff > 0 ? "badhi hai" : "ghati hai";
    const trendKn = diff > 0 ? "ಜಾಸ್ತಿ ಆಗಿದೆ" : "ಕಡಿಮೆ ಆಗಿದೆ";
    
    if (lang === 'hi-IN') return `Pichle data ke mukable mitti ki nami ${Math.abs(diff).toFixed(1)} pratishat ${trendHi}.`;
    if (lang === 'kn-IN') return `ಹಳೆಯ ಡೇಟಾಗೆ ಹೋಲಿಸಿದರೆ ಮಣ್ಣಿನ ತೇವಾಂಶ ${Math.abs(diff).toFixed(1)} ಪ್ರತಿಶತ ${trendKn}.`;
    return `Compared to the past, the soil moisture has ${trendEn} by ${Math.abs(diff).toFixed(1)} percent.`;
  }
  
  if (lang === 'hi-IN') return "Main iska pichla data nahi dhoondh paya.";
  if (lang === 'kn-IN') return "ಈ ವಿಷಯದಲ್ಲಿ ಹಳೆಯ ಡೇಟಾ ಸಿಕ್ಕಿಲ್ಲ.";
  return "I couldn't find historical data for that specific metric.";
}
