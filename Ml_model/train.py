import os
import sys
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split, cross_val_score
from xgboost import XGBRegressor


# ------------------------------#
# Project Configuration
# ------------------------------#

# Dataset path can be overridden: python train.py synthetic_crop_yield_dataset.csv
DATASET_FILE = sys.argv[1] if len(sys.argv) > 1 else "dataset.csv"
MODELS_FOLDER = "models"
OUTPUTS_FOLDER = "outputs"
RANDOM_STATE = 42
TEST_SIZE = 0.20
CV_FOLDS = 5

# Only these environmental/categorical features are used, as requested.
# rainfall_mm, nitrogen_kg_ha, phosphorus_kg_ha, potassium_kg_ha, and
# wind_speed_m_s exist in the dataset but are intentionally excluded here.
NUMERICAL_FEATURES = [
    "temperature_c",
    "humidity_percent",
    "soil_moisture_percent",
    "ldr_value",
]

CATEGORICAL_FEATURES = [
    "crop_type",
]

TARGET_COLUMN = "crop_yield_ton_per_hectare"

SELECTED_COLUMNS = (
    NUMERICAL_FEATURES
    + CATEGORICAL_FEATURES
    + [TARGET_COLUMN]
)


# ------------------------------#
# Helper Functions
# ------------------------------#

def create_required_folders():
    """Create folders for saved models and plots."""
    os.makedirs(MODELS_FOLDER, exist_ok=True)
    os.makedirs(OUTPUTS_FOLDER, exist_ok=True)


def load_dataset(file_path):
    """
    Load the dataset and keep only the columns required for this project.
    Rows with missing values are removed to keep preprocessing simple.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"Dataset file not found: {file_path}"
        )

    data = pd.read_csv(file_path)

    missing_columns = [
        column for column in SELECTED_COLUMNS
        if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            "The dataset is missing the following required columns: "
            + ", ".join(missing_columns)
        )

    filtered_data = data[SELECTED_COLUMNS].copy()
    filtered_data = filtered_data.dropna()

    print("=" * 60)
    print("Dataset Information")
    print("=" * 60)
    print(f"Original Shape        : {data.shape}")
    print(f"Filtered Shape        : {filtered_data.shape}")
    print(f"Rows Removed (NaN)    : {len(data) - len(filtered_data)}")
    print()

    return filtered_data


def preprocess_data(dataframe):
    """
    Separate features and target, log-transform the target to correct
    its moderate right skew, then one-hot encode the categorical columns.
    """
    features = dataframe.drop(columns=[TARGET_COLUMN])
    crop_labels = features["crop_type"]  # kept for stratified splitting
    target = np.log1p(dataframe[TARGET_COLUMN])

    encoded_features = pd.get_dummies(
        features,
        columns=CATEGORICAL_FEATURES,
        drop_first=False
    )

    return encoded_features, target, crop_labels


def split_data(features, target, crop_labels):
    """
    Split the data into training and testing sets, stratified by crop
    so every crop type is represented proportionally in both sets.
    """
    return train_test_split(
        features,
        target,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=crop_labels
    )


def build_models():
    """
    Create the regression models used in this project.
    Gradient Boosting is tuned to be comparable to the other two models
    rather than left at sklearn's shallow/small defaults.
    """
    models = {
        "Random Forest": RandomForestRegressor(
            n_estimators=300,
            max_features="sqrt",
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            random_state=RANDOM_STATE
        ),
        "XGBoost": XGBRegressor(
            objective="reg:squarederror",
            n_estimators=300,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
    }

    return models


def evaluate_model(model_name, actual_log, predicted_log):
    """
    Calculate regression metrics on the original (non-log) yield scale,
    since that's what's meaningful to report, and print them clearly.
    """
    actual_values = np.expm1(actual_log)
    predicted_values = np.expm1(predicted_log)

    r2 = r2_score(actual_values, predicted_values)
    mae = mean_absolute_error(actual_values, predicted_values)
    rmse = np.sqrt(mean_squared_error(actual_values, predicted_values))

    print(f"R² Score : {r2:.4f}")
    print(f"MAE      : {mae:.4f}")
    print(f"RMSE     : {rmse:.4f}")
    print()

    return r2, mae, rmse, actual_values, predicted_values


def save_model(model, file_name):
    """Save a trained model using joblib."""
    file_path = os.path.join(MODELS_FOLDER, file_name)
    joblib.dump(model, file_path)


def save_feature_columns(feature_names):
    """
    Save the encoded feature names so the same input format
    can be reused later during prediction or deployment.
    """
    file_path = os.path.join(MODELS_FOLDER, "feature_columns.pkl")
    joblib.dump(list(feature_names), file_path)


def get_feature_importance_table(model, feature_names, top_n=10):
    """Prepare a sorted feature importance table."""
    importance_table = pd.DataFrame(
        {
            "Feature": feature_names,
            "Importance": model.feature_importances_,
        }
    ).sort_values(by="Importance", ascending=False)

    return importance_table.head(top_n)


def plot_feature_importance(model, feature_names, title, output_file):
    """Create and save a feature importance bar chart."""
    top_features = get_feature_importance_table(
        model,
        feature_names,
        top_n=15
    )

    plt.figure(figsize=(10, 6))
    plt.barh(top_features["Feature"], top_features["Importance"], color="teal")
    plt.gca().invert_yaxis()
    plt.title(title)
    plt.xlabel("Importance Score")
    plt.ylabel("Feature")
    plt.tight_layout()
    plt.savefig(
        os.path.join(OUTPUTS_FOLDER, output_file),
        dpi=300,
        bbox_inches="tight"
    )
    plt.close()


def plot_actual_vs_predicted(actual_values, predicted_values, model_name, output_file):
    """Create and save a scatter plot comparing actual and predicted yield."""
    plt.figure(figsize=(8, 6))
    plt.scatter(
        actual_values,
        predicted_values,
        alpha=0.7,
        color="royalblue"
    )

    min_value = min(actual_values.min(), predicted_values.min())
    max_value = max(actual_values.max(), predicted_values.max())

    plt.plot(
        [min_value, max_value],
        [min_value, max_value],
        color="red",
        linestyle="--",
        linewidth=2
    )

    plt.title(f"Actual vs Predicted Yield ({model_name})")
    plt.xlabel("Actual Yield")
    plt.ylabel("Predicted Yield")
    plt.tight_layout()
    plt.savefig(
        os.path.join(OUTPUTS_FOLDER, output_file),
        dpi=300,
        bbox_inches="tight"
    )
    plt.close()


def plot_residuals(actual_values, predicted_values, model_name, output_file):
    """Create and save a residual plot."""
    residuals = actual_values - predicted_values

    plt.figure(figsize=(8, 6))
    plt.scatter(
        predicted_values,
        residuals,
        alpha=0.7,
        color="darkorange"
    )
    plt.axhline(y=0, color="red", linestyle="--", linewidth=2)
    plt.title(f"Residual Plot ({model_name})")
    plt.xlabel("Predicted Yield")
    plt.ylabel("Residuals")
    plt.tight_layout()
    plt.savefig(
        os.path.join(OUTPUTS_FOLDER, output_file),
        dpi=300,
        bbox_inches="tight"
    )
    plt.close()


def main():
    """Run the full crop yield prediction workflow."""
    create_required_folders()

    # Step 1: Load and clean the dataset.
    dataset = load_dataset(DATASET_FILE)

    # Step 2: Separate features and target (log-transformed), encode categories.
    features, target, crop_labels = preprocess_data(dataset)

    # Saving feature names is useful if the model is reused later.
    save_feature_columns(features.columns)

    # Step 3: Split the data into training and testing sets (stratified by crop).
    X_train, X_test, y_train, y_test = split_data(features, target, crop_labels)

    print("=" * 60)
    print("Train-Test Split")
    print("=" * 60)
    print(f"Training Samples      : {X_train.shape[0]}")
    print(f"Testing Samples       : {X_test.shape[0]}")
    print(f"Training Features     : {X_train.shape[1]}")
    print()

    # Step 4: Train and evaluate the required models.
    models = build_models()
    comparison_results = []
    trained_models = {}
    predictions = {}

    for model_name, model in models.items():
        print("=" * 30)
        print(f"Training {model_name} model...")
        print("=" * 30)
        model.fit(X_train, y_train)

        # Cross-validation on the training set to check score stability.
        cv_scores = cross_val_score(
            model, X_train, y_train, cv=CV_FOLDS, scoring="r2", n_jobs=-1
        )
        print(f"CV R² ({CV_FOLDS}-fold): {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

        # Train-set metrics, to check for overfitting against the test metrics below.
        train_pred_log = model.predict(X_train)
        train_r2 = r2_score(np.expm1(y_train), np.expm1(train_pred_log))
        print(f"Train R² : {train_r2:.4f}")

        # Test-set metrics (the ones that matter for reporting).
        predicted_log = model.predict(X_test)
        r2, mae, rmse, actual_values, predicted_values = evaluate_model(
            model_name, y_test, predicted_log
        )

        comparison_results.append(
            {
                "Model": model_name,
                "Train_R2": train_r2,
                "CV_R2_Mean": cv_scores.mean(),
                "R²": r2,
                "MAE": mae,
                "RMSE": rmse,
            }
        )

        trained_models[model_name] = model
        predictions[model_name] = (actual_values, predicted_values)

    # Step 5: Create a comparison table for all models.
    comparison_df = pd.DataFrame(comparison_results)
    comparison_df = comparison_df.sort_values(
        by="R²",
        ascending=False
    ).reset_index(drop=True)

    print("=" * 60)
    print("Model Comparison")
    print("=" * 60)
    print(
        comparison_df.to_string(
            index=False,
            formatters={
                "Train_R2": "{:.4f}".format,
                "CV_R2_Mean": "{:.4f}".format,
                "R²": "{:.4f}".format,
                "MAE": "{:.4f}".format,
                "RMSE": "{:.4f}".format,
            }
        )
    )
    print()

    # Step 6: Determine the best model based on the highest test R² score.
    best_model_name = comparison_df.loc[0, "Model"]
    best_model = trained_models[best_model_name]
    best_actual, best_predicted = predictions[best_model_name]

    print(f"Best Model : {best_model_name}")
    print()

    # Step 7: Save all trained models.
    save_model(trained_models["Random Forest"], "random_forest.pkl")
    save_model(
        trained_models["Gradient Boosting"],
        "gradient_boosting.pkl"
    )
    save_model(trained_models["XGBoost"], "xgboost.pkl")
    save_model(best_model, "best_model.pkl")

    print("Saved models in the 'models' folder.")
    print()

    # Step 8: Save feature importance plots.
    plot_feature_importance(
        trained_models["Random Forest"],
        X_train.columns,
        "Random Forest Feature Importance",
        "random_forest_feature_importance.png"
    )

    plot_feature_importance(
        trained_models["Gradient Boosting"],
        X_train.columns,
        "Gradient Boosting Feature Importance",
        "gradient_boosting_feature_importance.png"
    )

    plot_feature_importance(
        trained_models["XGBoost"],
        X_train.columns,
        "XGBoost Feature Importance",
        "xgboost_feature_importance.png"
    )

    # Step 9: Save prediction plots for the best model (filenames include
    # the model name so re-runs with a different best model don't overwrite).
    safe_name = best_model_name.lower().replace(" ", "_")
    plot_actual_vs_predicted(
        best_actual, best_predicted, best_model_name,
        f"actual_vs_predicted_{safe_name}.png"
    )
    plot_residuals(
        best_actual, best_predicted, best_model_name,
        f"residual_plot_{safe_name}.png"
    )

    print("Saved plots in the 'outputs' folder.")
    print()

    # Step 10: Save the comparison table for easy reference.
    comparison_df.to_csv(
        os.path.join(OUTPUTS_FOLDER, "model_comparison.csv"),
        index=False
    )

    print("Project completed successfully.")


if __name__ == "__main__":
    main()