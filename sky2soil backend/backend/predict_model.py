import json
import math
import sys
from pathlib import Path

import joblib
import pandas as pd


MODEL_DIR = Path(__file__).resolve().parents[2] / "Ml_model" / "models"
MODEL_PATH = MODEL_DIR / "best_model.pkl"
FEATURE_COLUMNS_PATH = MODEL_DIR / "feature_columns.pkl"
CATEGORICAL_COLUMNS = ["crop_type"]
REQUIRED_FIELDS = [
    "temperature_c",
    "humidity_percent",
    "soil_moisture_percent",
    "ldr_value",
    "crop_type",
]


def load_input():
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        raise ValueError("No prediction input was provided.")
    return json.loads(raw_input)


def build_dataframe(payload):
    missing_fields = [
        field for field in REQUIRED_FIELDS
        if payload.get(field) in (None, "")
    ]
    if missing_fields:
        raise ValueError(
            "Missing required fields: " + ", ".join(missing_fields)
        )

    row = {
        "temperature_c": float(payload["temperature_c"]),
        "humidity_percent": float(payload["humidity_percent"]),
        "soil_moisture_percent": float(payload["soil_moisture_percent"]),
        "ldr_value": float(payload["ldr_value"]),
        "crop_type": str(payload["crop_type"]).strip(),
    }

    dataframe = pd.DataFrame([row])
    encoded = pd.get_dummies(
        dataframe,
        columns=CATEGORICAL_COLUMNS,
        drop_first=False
    )

    feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
    aligned = encoded.reindex(columns=feature_columns, fill_value=0)

    return row, aligned


def main():
    payload = load_input()
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    if not FEATURE_COLUMNS_PATH.exists():
        raise FileNotFoundError(
            f"Feature columns file not found: {FEATURE_COLUMNS_PATH}"
        )

    model = joblib.load(MODEL_PATH)
    row, aligned = build_dataframe(payload)
    predicted_log_value = float(model.predict(aligned)[0])
    predicted_yield = math.expm1(predicted_log_value)

    print(
        json.dumps(
            {
                "predicted_yield_ton_per_hectare": round(predicted_yield, 3),
                "predicted_log_value": predicted_log_value,
                "model_file": MODEL_PATH.name,
                "input": row,
            }
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
