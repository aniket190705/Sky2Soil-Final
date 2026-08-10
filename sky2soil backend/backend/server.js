const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const PYTHON_COMMAND = process.env.PYTHON_COMMAND || "python";
const PREDICTION_SCRIPT = path.join(__dirname, "predict_model.py");

const REQUIRED_PREDICTION_FIELDS = [
    "temperature_c",
    "humidity_percent",
    "soil_moisture_percent",
    "ldr_value",
    "crop_type"
];

const CROP_OPTIONS = [
    "Groundnut",
    "Maize",
    "Bajra",
    "Rice",
    "Wheat",
    "Chickpea",
    "Cotton",
    "Sugarcane",
    "Soybean",
    "Jowar"
];

const FORM_DEFAULTS = {
    temperature_c: 29,
    humidity_percent: 68,
    soil_moisture_percent: 54,
    ldr_value: 500,
    crop_type: "Maize"
};

let latestSensorReading = null;
let latestPrediction = null;

app.use(cors());
app.use(express.json());

function toNumber(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSensorPayload(payload = {}) {
    return {
        temperature_c: toNumber(payload.temperature_c ?? payload.temperature),
        humidity_percent: toNumber(payload.humidity_percent ?? payload.humidity),
        soil_moisture_percent: toNumber(
            payload.soil_moisture_percent ?? payload.soil_moisture
        ),
        rain_raw: toNumber(payload.rain_raw),
        soil_raw: toNumber(payload.soil_raw),
        rain_status: payload.rain_status || null,
        ldr_raw: toNumber(payload.ldr_raw ?? payload.ldr),
        light_percent: toNumber(payload.light_percent),
        light_status: payload.light_status || null
    };
}

function buildPredictionInput(body = {}, sensorSnapshot) {
    const requestInput = body.input && typeof body.input === "object" ? body.input : body;
    const requestSensor = body.sensorData && typeof body.sensorData === "object"
        ? body.sensorData
        : null;

    const normalizedSensor = normalizeSensorPayload(
        requestSensor || sensorSnapshot?.raw || {}
    );

    const predictionInput = {
        temperature_c: toNumber(
            requestInput.temperature_c ?? normalizedSensor.temperature_c
        ),
        humidity_percent: toNumber(
            requestInput.humidity_percent ?? normalizedSensor.humidity_percent
        ),
        soil_moisture_percent: toNumber(
            requestInput.soil_moisture_percent ?? normalizedSensor.soil_moisture_percent
        ),
        ldr_value: toNumber(
            requestInput.ldr_value ?? normalizedSensor.ldr_raw
        ),
        crop_type: typeof requestInput.crop_type === "string"
            ? requestInput.crop_type.trim()
            : ""
    };

    const missingFields = REQUIRED_PREDICTION_FIELDS.filter((field) => {
        const value = predictionInput[field];
        return value === null || value === "";
    });

    return { predictionInput, missingFields, normalizedSensor };
}

function runPrediction(input) {
    return new Promise((resolve, reject) => {
        const child = spawn(PYTHON_COMMAND, [PREDICTION_SCRIPT], {
            cwd: __dirname,
            stdio: ["pipe", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", (error) => {
            reject(error);
        });

        child.on("close", (code) => {
            if (code !== 0) {
                reject(
                    new Error(
                        stderr.trim() || `Prediction script exited with code ${code}`
                    )
                );
                return;
            }

            try {
                resolve(JSON.parse(stdout));
            } catch (error) {
                reject(
                    new Error(
                        `Prediction script returned invalid JSON: ${stdout || error.message}`
                    )
                );
            }
        });

        child.stdin.write(JSON.stringify(input));
        child.stdin.end();
    });
}

app.get("/", (req, res) => {
    res.json({
        service: "Sky2Soil Backend",
        status: "running",
        endpoints: [
            "GET /api/model/schema",
            "GET /api/sensor/latest",
            "POST /api/sensor",
            "GET /api/prediction/latest",
            "POST /api/predict"
        ]
    });
});

app.get("/api/model/schema", (req, res) => {
    res.json({
        requiredFields: REQUIRED_PREDICTION_FIELDS,
        cropOptions: CROP_OPTIONS,
        defaults: FORM_DEFAULTS
    });
});

app.get("/api/sensor/latest", (req, res) => {
    res.json({
        status: latestSensorReading ? "ok" : "empty",
        data: latestSensorReading
    });
});

app.post("/api/sensor", (req, res) => {
    const normalized = normalizeSensorPayload(req.body);

    latestSensorReading = {
        raw: req.body,
        normalized,
        receivedAt: new Date().toISOString()
    };

    console.log("========== Sensor Data ==========");
    console.log(latestSensorReading);
    console.log("=================================");

    res.status(200).json({
        status: "received",
        message: "Sensor data received successfully",
        data: latestSensorReading
    });
});

app.get("/api/prediction/latest", (req, res) => {
    res.json({
        status: latestPrediction ? "ok" : "empty",
        data: latestPrediction
    });
});

app.post("/api/predict", async (req, res) => {
    const { predictionInput, missingFields, normalizedSensor } = buildPredictionInput(
        req.body,
        latestSensorReading
    );

    if (missingFields.length > 0) {
        res.status(400).json({
            status: "error",
            message: "Missing required prediction fields.",
            missingFields
        });
        return;
    }

    try {
        const predictionResult = await runPrediction(predictionInput);

        latestPrediction = {
            ...predictionResult,
            input: predictionInput,
            sensorSnapshot: normalizedSensor,
            predictedAt: new Date().toISOString()
        };

        res.json({
            status: "ok",
            data: latestPrediction
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Prediction failed.",
            detail: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
