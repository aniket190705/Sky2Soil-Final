import joblib
import onnx
from onnxmltools import convert_xgboost
from onnxmltools.convert.common.data_types import FloatTensorType
from pathlib import Path

# Paths
MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "best_model.pkl"
FEATURE_COLUMNS_PATH = MODEL_DIR / "feature_columns.pkl"
ONNX_OUTPUT_PATH = MODEL_DIR / "best_model.onnx"

def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Pickle model not found: {MODEL_PATH}")
    if not FEATURE_COLUMNS_PATH.exists():
        raise FileNotFoundError(f"Feature columns not found: {FEATURE_COLUMNS_PATH}")

    # Load feature columns
    features = joblib.load(FEATURE_COLUMNS_PATH)
    num_features = len(features)
    print(f"Loaded {num_features} features: {features}")

    # Load XGBoost model
    model = joblib.load(MODEL_PATH)
    print("Loaded model type:", type(model))

    # Define input format (FloatTensorType with dynamic batch size [None, num_features])
    initial_type = [('input', FloatTensorType([None, num_features]))]

    # Clear feature names in the booster to prevent onnxmltools conversion error
    booster = model.get_booster()
    booster.feature_names = None

    # Patch get_dump to add missing split_condition keys in JSON representation
    original_get_dump = booster.get_dump

    def patched_get_dump(self, *args, **kwargs):
        # Determine format from args or kwargs
        dump_format = kwargs.get('dump_format')
        if not dump_format and len(args) > 1:
            dump_format = args[1]
        
        dumps = original_get_dump(*args, **kwargs)
        
        if dump_format == 'json':
            import json
            patched_dumps = []
            for d in dumps:
                data = json.loads(d)
                def fix_node(node):
                    if 'split' in node and 'split_condition' not in node:
                        node['split_condition'] = 0.5
                    if 'children' in node:
                        for child in node['children']:
                            fix_node(child)
                fix_node(data)
                patched_dumps.append(json.dumps(data))
            return patched_dumps
        return dumps

    import types
    booster.get_dump = types.MethodType(patched_get_dump, booster)

    # Convert model
    print("Converting XGBoost to ONNX...")
    # target_opset=12 is widely supported by ONNX Runtime Web
    onnx_model = convert_xgboost(model, initial_types=initial_type, target_opset=12)

    # Save to disk
    print(f"Saving ONNX model to: {ONNX_OUTPUT_PATH}")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    onnx.save_model(onnx_model, str(ONNX_OUTPUT_PATH))
    print("XGBoost model successfully converted to ONNX!")

if __name__ == "__main__":
    main()
