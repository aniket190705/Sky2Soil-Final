#ifndef PREDICTION_DATA_H
#define PREDICTION_DATA_H

#include "SpiffsStorage.h"

class PredictionData {
public:
    static bool calculate7DayAverages(SpiffsStorage& storage, float& avgTemp, float& avgHum, float& avgSoil, float& avgLdr) {
        int count = storage.loadAverages(avgTemp, avgHum, avgSoil, avgLdr);
        return count > 0;
    }
};

#endif
