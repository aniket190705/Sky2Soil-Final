#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <LiquidCrystal.h>
#include <WebServer.h>

// Include modular helper headers
#include "SensorReading.h"
#include "RamBuffer.h"
#include "SpiffsStorage.h"
#include "PredictionData.h"

//======================
// WiFi Credentials
//======================
const char *ssid = "LAPTOP-8F9H50RR 7887";
const char *password = "3)P440c2";

//======================
// Backend URL
//======================
const char *serverURL = "http://192.168.137.1:5000/api/sensor";

//======================
// LCD Configuration
// RS, E, D4, D5, D6, D7
//======================
LiquidCrystal lcd(14, 27, 26, 25, 33, 32);

//======================
// DHT22 Configuration
//======================
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

//======================
// Pin Mappings & Constants
//======================
#define SOIL_PIN 34
#define RAIN_PIN 35
#define LDR_PIN 36
#define RAIN_THRESHOLD 3400

//======================
// System Modules Instances
//======================
SensorReading sensorReader(dht, SOIL_PIN, RAIN_PIN, LDR_PIN, RAIN_THRESHOLD);
RamBuffer ramBuf;
SpiffsStorage storage;
WebServer server(80);

// Non-blocking timer variables
unsigned long lastSensorRead = 0;
const unsigned long readInterval = 1000; // Sample physical sensors every 1 second (live)

unsigned long lastRamBufferAdd = 0;
const unsigned long ramBufferInterval = 10000; // Save to RAM buffer every 10 seconds

unsigned long lastLcdSwitch = 0;
int lcdScreen = 0;

unsigned long lastWifiRetry = 0;
const unsigned long wifiRetryInterval = 30000; // Retry connection every 30 seconds

// Global sensor state for continuous LCD rendering
float globalTemp = 29.0f;
float globalHum = 68.0f;
float globalSoilPercent = 54.0f;
float globalLightPercent = 50.0f;
String globalRainStatus = "Dry";
int globalRainRaw = 4095;

//======================
// WebServer HTTP Handlers
//======================

// Serves the latest real-time sensor measurements
void handleGetSensor() {
  float temp = sensorReader.getTemperature();
  float hum = sensorReader.getHumidity();
  int soilRaw = sensorReader.getSoilRaw();
  float soilPercent = sensorReader.getSoilMoisture();
  int rainRaw = sensorReader.getRainRaw();
  String rainStatus = sensorReader.getRainStatus(rainRaw);
  float ldrRaw = sensorReader.getLdrValue();
  
  int lightPercent = map((int)ldrRaw, 0, 4095, 0, 100);
  lightPercent = constrain(lightPercent, 0, 100);
  String lightStatus = sensorReader.getLightStatus(lightPercent);

  String json = "{";
  json += "\"temperature\":" + String(temp, 1) + ",";
  json += "\"humidity\":" + String(hum, 1) + ",";
  json += "\"soil_raw\":" + String(soilRaw) + ",";
  json += "\"soil_moisture\":" + String((int)soilPercent) + ",";
  json += "\"rain_raw\":" + String(rainRaw) + ",";
  json += "\"rain_status\":\"" + rainStatus + "\",";
  json += "\"ldr_raw\":" + String((int)ldrRaw) + ",";
  json += "\"light_percent\":" + String(lightPercent) + ",";
  json += "\"light_status\":\"" + lightStatus + "\"";
  json += "}";

  // Enable CORS so the browser PWA can read the response directly
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// Serves the last 7 days of hourly average records stored in SPIFFS
void handleGetHistory() {
  String json = storage.getRawHistoryJson();
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// Computes and serves the 7-day average values used for predictions
void handleGetAverages() {
  float avgT, avgH, avgS, avgL;
  PredictionData::calculate7DayAverages(storage, avgT, avgH, avgS, avgL);

  String json = "{";
  json += "\"temperature_c\":" + String(avgT, 2) + ",";
  json += "\"humidity_percent\":" + String(avgH, 2) + ",";
  json += "\"soil_moisture_percent\":" + String(avgS, 2) + ",";
  json += "\"ldr_value\":" + String(avgL, 2);
  json += "}";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// Handles pre-flight CORS precheck requests from browsers
void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "text/plain", "");
}

//======================
// Non-blocking LCD Display
//======================
void updateLCDNonBlocking() {
  if (millis() - lastLcdSwitch >= 3000) { // Toggle display every 3 seconds (increased from 2s)
    lastLcdSwitch = millis();
    lcdScreen = (lcdScreen + 1) % 2;
    lcd.clear();
    
    if (lcdScreen == 0) {
      // First Screen: Temp, Humid, Soil, Light
      lcd.setCursor(0, 0);
      lcd.print("T:");
      lcd.print(globalTemp, 1);
      lcd.print((char)223);
      lcd.print("C");

      lcd.setCursor(9, 0);
      lcd.print("H:");
      lcd.print((int)globalHum);
      lcd.print("%");

      lcd.setCursor(0, 1);
      lcd.print("S:");
      lcd.print((int)globalSoilPercent);
      lcd.print("%");

      lcd.setCursor(8, 1);
      lcd.print("L:");
      lcd.print((int)globalLightPercent);
      lcd.print("%");
    } else {
      // Second Screen: Rain status & WiFi connection status (No raw rain displayed)
      lcd.setCursor(0, 0);
      lcd.print("Rain: ");
      lcd.print(globalRainStatus);

      lcd.setCursor(0, 1);
      lcd.print("WiFi: ");
      if (WiFi.status() == WL_CONNECTED) {
        lcd.print("Connected");
      } else {
        lcd.print("Offline (AP)");
      }
    }
  }
}

//======================
// Non-blocking background WiFi Reconnect
//======================
void handleWifiReconnection() {
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWifiRetry >= wifiRetryInterval) {
      lastWifiRetry = millis();
      Serial.println("WiFi disconnected! Retrying background connection...");
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
  }
}

//======================
// Arduino Setup
//======================
void setup() {
  Serial.begin(115200);

  // 1. Initialize LCD immediately to display status
  lcd.begin(16, 2);
  lcd.clear();
  lcd.print("Sky2Soil");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(1000);

  // Initialize DHT22
  dht.begin();

  // Set ADC bit resolution (12-bit, range 0 - 4095)
  analogReadResolution(12);

  // 2. Mount SPIFFS and display status
  lcd.clear();
  lcd.print("Mounting FS...");
  Serial.println("Mounting SPIFFS...");
  storage.begin();
  delay(500);

  // 3. Initialize dual Wi-Fi modes (AP + STA)
  lcd.clear();
  lcd.print("WiFi Config...");
  WiFi.mode(WIFI_AP_STA);
  
  // Set up Access Point (local IP: 192.168.4.1)
  WiFi.softAP("Sky2Soil_AP", "12345678");
  Serial.println("Access Point Started. SSID: Sky2Soil_AP");

  // Begin connecting to hotspot asynchronously
  WiFi.begin(ssid, password);
  Serial.println("Wi-Fi init requested. Proceeding to main loop non-blockingly.");
  
  // Boot straight into main loop to prevent LCD startup delays
  lcd.clear();
  lcd.print("System Active");
  lcd.setCursor(0, 1);
  lcd.print("Sky2Soil Live");
  delay(1000);

  // Setup WebServer API Routes
  server.on("/sensor", HTTP_GET, handleGetSensor);
  server.on("/sensor/history", HTTP_GET, handleGetHistory);
  server.on("/sensor/averages", HTTP_GET, handleGetAverages);
  
  // CORS handles options pre-flights
  server.on("/sensor", HTTP_OPTIONS, handleOptions);
  server.on("/sensor/history", HTTP_OPTIONS, handleOptions);
  server.on("/sensor/averages", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("HTTP Server started on port 80");
}

//======================
// Arduino Main Loop
//======================
void loop() {
  // Handle client requests on the WebServer instantly (non-blocking)
  server.handleClient();

  // Switch LCD panels every 3 seconds (non-blocking)
  updateLCDNonBlocking();

  // Retry WiFi in the background if disconnected (non-blocking)
  handleWifiReconnection();

  // Every 1 second: read sensors, update globals, and post online
  if (millis() - lastSensorRead >= readInterval) {
    lastSensorRead = millis();

    // 1. Read Sensor Values
    float temperature = sensorReader.getTemperature();
    float humidity = sensorReader.getHumidity();
    float soilPercent = sensorReader.getSoilMoisture();
    float ldrVal = sensorReader.getLdrValue();

    int soilRaw = sensorReader.getSoilRaw();
    int rainRaw = sensorReader.getRainRaw();
    String rainStatus = sensorReader.getRainStatus(rainRaw);

    int lightPercent = map((int)ldrVal, 0, 4095, 0, 100);
    lightPercent = constrain(lightPercent, 0, 100);
    String lightStatus = sensorReader.getLightStatus(lightPercent);

    // Save values to globals for immediate LCD rendering and /sensor HTTP GET
    globalTemp = temperature;
    globalHum = humidity;
    globalSoilPercent = soilPercent;
    globalLightPercent = (float)lightPercent;
    globalRainStatus = rainStatus;
    globalRainRaw = rainRaw;

    // 2. POST live data to backend immediately if connected (Online Mode)
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverURL);
      http.addHeader("Content-Type", "application/json");

      String json = "{";
      json += "\"temperature\":" + String(temperature, 1) + ",";
      json += "\"humidity\":" + String(humidity, 1) + ",";
      json += "\"soil_raw\":" + String(soilRaw) + ",";
      json += "\"soil_moisture\":" + String((int)soilPercent) + ",";
      json += "\"rain_raw\":" + String(rainRaw) + ",";
      json += "\"rain_status\":\"" + rainStatus + "\",";
      json += "\"ldr_raw\":" + String(ldrVal) + ",";
      json += "\"light_percent\":" + String(lightPercent) + ",";
      json += "\"light_status\":\"" + lightStatus + "\"";
      json += "}";

      int httpCode = http.POST(json);
      if (httpCode > 0) {
        String response = http.getString();
        Serial.printf("Live 1s POST Success. HTTP Code: %d. Response: %s\n", httpCode, response.c_str());
      } else {
        Serial.printf("Live 1s POST Failed. Error: %s\n", http.errorToString(httpCode).c_str());
      }
      http.end();
    }

    // 3. Add to RAM buffer only on the 10-second interval
    if (millis() - lastRamBufferAdd >= ramBufferInterval) {
      lastRamBufferAdd = millis();

      if (ramBuf.addReading(temperature, humidity, soilPercent, ldrVal)) {
        Serial.print("Data added to RAM Buffer (10s sample). Total readings: ");
        Serial.println(ramBuf.getCount());
      }

      // 4. Check for Hourly Aggregation
      if (ramBuf.isFull()) {
        float avgTemp = ramBuf.getAverageTemp();
        float avgHum = ramBuf.getAverageHum();
        float avgSoil = ramBuf.getAverageSoil();
        float avgLdr = ramBuf.getAverageLdr();

        Serial.println("RAM Buffer Full (1 Hour). Aggregating averages...");
        Serial.printf("Averages -> Temp: %.2f, Hum: %.2f, Soil: %.2f, LDR: %.2f\n", avgTemp, avgHum, avgSoil, avgLdr);

        // Save averages to SPIFFS (JSON list)
        storage.appendRecord(avgTemp, avgHum, avgSoil, avgLdr);
        Serial.println("Hourly average saved to SPIFFS. Oldest record removed if limit (168) exceeded.");

        // Clear the buffer to free RAM
        ramBuf.clear();
      }
    }

    // Print Log to Serial
    Serial.println("--------------------------------------");
    Serial.printf("Temp: %.1f C, Hum: %.1f %%\n", temperature, humidity);
    Serial.printf("Soil Moisture: %.1f %% (Raw: %d)\n", soilPercent, soilRaw);
    Serial.printf("Rain: %s (Raw: %d)\n", rainStatus.c_str(), rainRaw);
    Serial.printf("LDR Raw: %.1f (Light: %d %% - %s)\n", ldrVal, lightPercent, lightStatus.c_str());
    Serial.println("--------------------------------------");
  }
}
