#ifndef RAM_BUFFER_H
#define RAM_BUFFER_H

class RamBuffer
{
private:
    static const int MAX_SIZE = 360; // 360 readings = 1 hour at 10-second intervals
    float tempBuffer[MAX_SIZE];
    float humBuffer[MAX_SIZE];
    float soilBuffer[MAX_SIZE];
    float ldrBuffer[MAX_SIZE];
    int count = 0;

public:
    void clear()
    {
        count = 0;
    }

    bool addReading(float temp, float hum, float soil, float ldr)
    {
        if (count < MAX_SIZE)
        {
            tempBuffer[count] = temp;
            humBuffer[count] = hum;
            soilBuffer[count] = soil;
            ldrBuffer[count] = ldr;
            count++;
            return true;
        }
        return false;
    }

    int getCount() const { return count; }
    bool isFull() const { return count >= MAX_SIZE; }

    float getAverageTemp()
    {
        if (count == 0)
            return 0.0f;
        double sum = 0;
        for (int i = 0; i < count; i++)
            sum += tempBuffer[i];
        return (float)(sum / count);
    }

    float getAverageHum()
    {
        if (count == 0)
            return 0.0f;
        double sum = 0;
        for (int i = 0; i < count; i++)
            sum += humBuffer[i];
        return (float)(sum / count);
    }

    float getAverageSoil()
    {
        if (count == 0)
            return 0.0f;
        double sum = 0;
        for (int i = 0; i < count; i++)
            sum += soilBuffer[i];
        return (float)(sum / count);
    }

    float getAverageLdr()
    {
        if (count == 0)
            return 0.0f;
        double sum = 0;
        for (int i = 0; i < count; i++)
            sum += ldrBuffer[i];
        return (float)(sum / count);
    }
};

#endif
