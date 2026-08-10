import joblib
import numpy as np
import pandas as pd
import onnxruntime as ort
import math
from pathlib import Path

# Paths
MODEL_DIR = Path(__file__).resolve().parent / "models"
PKL_MODEL_PATH = MODEL_DIR / "best_model.pkl"
ONNX_MODEL_PATH = MODEL_DIR / "best_model.onnx"
FEATURE_COLUMNS_PATH = MODEL_DIR / "feature_columns.pkl"

def main():
    if not PKL_MODEL_PATH.exists():
        raise FileNotFoundError(f"Pickle model not found: {PKL_MODEL_PATH}")
    if not ONNX_MODEL_PATH.exists():
        raise FileNotFoundError(f"ONNX model not found: {ONNX_MODEL_PATH}")
    if not FEATURE_COLUMNS_PATH.exists():
        raise FileNotFoundError(f"Feature columns not found: {FEATURE_COLUMNS_PATH}")

    # Load feature columns
    feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
    
    # Load pickle model
    pkl_model = joblib.load(PKL_MODEL_PATH)
    
    # Load ONNX session
    onnx_session = ort.InferenceSession(str(ONNX_MODEL_PATH))
    
    # Define some sample prediction payloads (using representative fields)
    test_inputs = [
        {"temperature_c": 29.0, "humidity_percent": 68.0, "soil_moisture_percent": 54.0, "ldr_value": 500.0, "crop_type": "Maize"},
        {"temperature_c": 33.5, "humidity_percent": 64.4, "soil_moisture_percent": 65.8, "ldr_value": 494.0, "crop_type": "Groundnut"},
        {"temperature_c": 38.5, "humidity_percent": 56.9, "soil_moisture_percent": 40.5, "ldr_value": 602.0, "crop_type": "Bajra"},
        {"temperature_c": 23.9, "humidity_percent": 68.4, "soil_moisture_percent": 78.8, "ldr_value": 252.0, "crop_type": "Rice"},
        {"temperature_c": 26.0, "humidity_percent": 60.0, "soil_moisture_percent": 50.0, "ldr_value": 400.0, "crop_type": "Wheat"},
    ]
    
    print(f"{'Crop':<12} | {'Pickle Log':<12} | {'ONNX Log':<12} | {'Pickle Yield':<14} | {'ONNX Yield':<14} | {'Diff'}")
    print("-" * 85)
    
    differences = []
    
    for payload in test_inputs:
        # Preprocessing: convert to row and aligned dataframe
        row = {
            "temperature_c": float(payload["temperature_c"]),
            "humidity_percent": float(payload["humidity_percent"]),
            "soil_moisture_percent": float(payload["soil_moisture_percent"]),
            "ldr_value": float(payload["ldr_value"]),
            "crop_type": str(payload["crop_type"]).strip(),
        }
        
        dataframe = pd.DataFrame([row])
        # Categorical columns
        CATEGORICAL_COLUMNS = ["crop_type"]
        encoded = pd.get_dummies(dataframe, columns=CATEGORICAL_COLUMNS, drop_first=False)
        aligned = encoded.reindex(columns=feature_columns, fill_value=0)
        
        # 1. Prediction using pickle model
        pkl_log_value = float(pkl_model.predict(aligned)[0])
        pkl_yield = math.expm1(pkl_log_value)
        
        # 2. Prediction using ONNX model
        # convert aligned dataframe to float32 numpy array
        onnx_input = aligned.to_numpy().astype(np.float32)
        onnx_outputs = onnx_session.run(None, {"input": onnx_input})
        onnx_log_value = float(onnx_outputs[0][0])
        onnx_yield = math.expm1(onnx_log_value)
        
        # Compare
        diff = abs(pkl_yield - onnx_yield)
        differences.append(diff)
        
        print(f"{payload['crop_type']:<12} | {pkl_log_value:<12.5f} | {onnx_log_value:<12.5f} | {pkl_yield:<14.5f} | {onnx_yield:<14.5f} | {diff:.5f}")
        
    max_diff = max(differences)
    print("-" * 85)
    print(f"Max prediction difference: {max_diff:.8f}")
    if max_diff < 1e-4:
        print("Success: Pickle and ONNX predictions are nearly identical!")
    else:
        print("Warning: Prediction difference is higher than expected.")

if __name__ == "__main__":
    main()
