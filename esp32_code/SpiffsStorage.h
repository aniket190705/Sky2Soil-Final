#ifndef SPIFFS_STORAGE_H
#define SPIFFS_STORAGE_H

#include <FS.h>
#include <SPIFFS.h>

class SpiffsStorage {
private:
    const char* filePath = "/history.json";
    static const int MAX_RECORDS = 168; // 24 hours * 7 days = 168 records

public:
    bool begin() {
        // Mount SPIFFS, formatting if mounting fails on first start
        if (!SPIFFS.begin(true)) {
            Serial.println("SPIFFS Mount Failed");
            return false;
        }
        Serial.println("SPIFFS Mounted Successfully");
        return true;
    }

    // Direct stream parsing of the JSON file to compute averages without using arrays
    int loadAverages(float& avgTemp, float& avgHum, float& avgSoil, float& avgLdr) {
        if (!SPIFFS.exists(filePath)) {
            avgTemp = 29.0f;
            avgHum = 68.0f;
            avgSoil = 54.0f;
            avgLdr = 500.0f;
            return 0;
        }

        File file = SPIFFS.open(filePath, "r");
        if (!file) {
            Serial.println("Failed to open history file for reading");
            return 0;
        }

        double tempSum = 0;
        double humSum = 0;
        double soilSum = 0;
        double ldrSum = 0;
        int count = 0;

        // Parse records stream-by-stream (low memory footprint)
        while (file.available()) {
            String line = file.readStringUntil('}');
            int start = line.indexOf('{');
            if (start == -1) continue;
            String obj = line.substring(start + 1);

            float t = 0.0f, h = 0.0f, s = 0.0f, l = 0.0f;
            
            int tIndex = obj.indexOf("\"t\":");
            if (tIndex != -1) {
                int commaIndex = obj.indexOf(',', tIndex);
                if (commaIndex == -1) commaIndex = obj.length();
                t = obj.substring(tIndex + 4, commaIndex).toFloat();
            }
            
            int hIndex = obj.indexOf("\"h\":");
            if (hIndex != -1) {
                int commaIndex = obj.indexOf(',', hIndex);
                if (commaIndex == -1) commaIndex = obj.length();
                h = obj.substring(hIndex + 4, commaIndex).toFloat();
            }
            
            int sIndex = obj.indexOf("\"s\":");
            if (sIndex != -1) {
                int commaIndex = obj.indexOf(',', sIndex);
                if (commaIndex == -1) commaIndex = obj.length();
                s = obj.substring(sIndex + 4, commaIndex).toFloat();
            }
            
            int lIndex = obj.indexOf("\"l\":");
            if (lIndex != -1) {
                int commaIndex = obj.indexOf(',', lIndex);
                if (commaIndex == -1) commaIndex = obj.length();
                l = obj.substring(lIndex + 4, commaIndex).toFloat();
            }

            tempSum += t;
            humSum += h;
            soilSum += s;
            ldrSum += l;
            count++;
        }
        file.close();

        if (count > 0) {
            avgTemp = (float)(tempSum / count);
            avgHum = (float)(humSum / count);
            avgSoil = (float)(soilSum / count);
            avgLdr = (float)(ldrSum / count);
        } else {
            avgTemp = 29.0f;
            avgHum = 68.0f;
            avgSoil = 54.0f;
            avgLdr = 500.0f;
        }

        return count;
    }

    // Appends a new hourly average to the JSON file using dynamic string slicing (FIFO)
    bool appendRecord(float temp, float hum, float soil, float ldr) {
        String content = "[]";
        if (SPIFFS.exists(filePath)) {
            File file = SPIFFS.open(filePath, "r");
            if (file) {
                content = file.readString();
                file.close();
            }
        }

        // Count existing records by counting opening brackets '{'
        int count = 0;
        int searchPos = 0;
        while ((searchPos = content.indexOf('{', searchPos)) != -1) {
            count++;
            searchPos++;
        }

        String newRecord = "{\"t\":" + String(temp, 2) + 
                          ",\"h\":" + String(hum, 2) + 
                          ",\"s\":" + String(soil, 2) + 
                          ",\"l\":" + String(ldr, 2) + "}";

        String finalContent;
        if (count == 0) {
            // First record
            finalContent = "[" + newRecord + "]";
        } else if (count >= MAX_RECORDS) {
            // FIFO: Discard the oldest record
            int firstComma = content.indexOf("},");
            if (firstComma != -1) {
                // Slice from the start of the 2nd record to the end, removing trailing ']'
                String remaining = content.substring(firstComma + 2, content.length() - 1);
                finalContent = "[" + remaining + "," + newRecord + "]";
            } else {
                finalContent = "[" + newRecord + "]";
            }
        } else {
            // Append normally
            String currentRecords = content.substring(1, content.length() - 1);
            finalContent = "[" + currentRecords + "," + newRecord + "]";
        }

        // Write the updated JSON content back to disk
        File file = SPIFFS.open(filePath, "w");
        if (!file) {
            Serial.println("Failed to write to SPIFFS");
            return false;
        }
        file.print(finalContent);
        file.close();
        return true;
    }

    String getRawHistoryJson() {
        if (!SPIFFS.exists(filePath)) {
            return "[]";
        }
        File file = SPIFFS.open(filePath, "r");
        if (!file) return "[]";
        String content = file.readString();
        file.close();
        return content;
    }
};

#endif
