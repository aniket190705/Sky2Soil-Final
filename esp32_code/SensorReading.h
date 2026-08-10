#ifndef SENSOR_READING_H
#define SENSOR_READING_H

#include <DHT.h>

class SensorReading {
private:
    DHT& dht;
    int soilPin;
    int rainPin;
    int ldrPin;
    int rainThreshold;
    float lastTemp = 29.0f;
    float lastHum = 68.0f;

public:
    SensorReading(DHT& dhtObj, int sPin, int rPin, int lPin, int rThreshold) 
        : dht(dhtObj), soilPin(sPin), rainPin(rPin), ldrPin(lPin), rainThreshold(rThreshold) {}

    float getTemperature() {
        float t = dht.readTemperature();
        if (!isnan(t)) {
            lastTemp = t;
        }
        return lastTemp;
    }

    float getHumidity() {
        float h = dht.readHumidity();
        if (!isnan(h)) {
            lastHum = h;
        }
        return lastHum;
    }

    float getSoilMoisture() {
        int raw = analogRead(soilPin);
        int percent = map(raw, 4095, 1500, 0, 100);
        return (float)constrain(percent, 0, 100);
    }

    float getLdrValue() {
        return (float)analogRead(ldrPin);
    }

    int getRainRaw() {
        return analogRead(rainPin);
    }

    int getSoilRaw() {
        return analogRead(soilPin);
    }

    String getRainStatus(int rainRaw) {
        return (rainRaw < rainThreshold) ? "Rain" : "Dry";
    }

    String getLightStatus(float lightPercent) {
        if (lightPercent > 70.0f) return "Bright";
        if (lightPercent > 30.0f) return "Medium";
        return "Dark";
    }
};

#endif
