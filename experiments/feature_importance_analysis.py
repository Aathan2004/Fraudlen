# ============================================================
# FEATURE IMPORTANCE ANALYSIS
# Existing 300-feature CatBoost model
#
# IMPORTANT:
# This file DOES NOT retrain the model.
# It only analyzes the already trained model.
# ============================================================

import pickle
from pathlib import Path

import pandas as pd
from catboost import CatBoostClassifier


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_PATH = PROJECT_ROOT / "models" / "catboost_model.cbm"
FEATURE_COLUMNS_PATH = PROJECT_ROOT / "models" / "feature_columns.pkl"


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 70)
print("LOADING EXISTING CATBOOST MODEL")
print("=" * 70)

model = CatBoostClassifier()

model.load_model(
    str(MODEL_PATH)
)

print("CatBoost model loaded successfully.")


# ============================================================
# LOAD FEATURE NAMES
# ============================================================

with open(FEATURE_COLUMNS_PATH, "rb") as file:

    feature_columns = pickle.load(file)


print(
    "Number of saved features:",
    len(feature_columns)
)


# ============================================================
# GET CATBOOST FEATURE IMPORTANCE
# ============================================================

importance_values = model.get_feature_importance()


# ============================================================
# CREATE FEATURE IMPORTANCE TABLE
# ============================================================

importance_df = pd.DataFrame(
    {
        "Feature": feature_columns,
        "Importance": importance_values
    }
)


# ============================================================
# SORT BY IMPORTANCE
# ============================================================

importance_df = importance_df.sort_values(
    by="Importance",
    ascending=False
).reset_index(drop=True)


# ============================================================
# ADD RANK
# ============================================================

importance_df.insert(
    0,
    "Rank",
    range(1, len(importance_df) + 1)
)


# ============================================================
# DISPLAY TOP 50
# ============================================================

print()
print("=" * 70)
print("TOP 50 FEATURES")
print("=" * 70)

print(
    importance_df.head(50).to_string(
        index=False
    )
)


# ============================================================
# SAVE COMPLETE IMPORTANCE TABLE
# ============================================================

OUTPUT_DIR = PROJECT_ROOT / "experiments" / "outputs"

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


importance_df.to_csv(
    OUTPUT_DIR / "feature_importance_300.csv",
    index=False
)


# ============================================================
# SAVE TOP 50 FEATURES
# ============================================================

top_50_features = importance_df.head(
    50
)


top_50_features.to_csv(
    OUTPUT_DIR / "top_50_features.csv",
    index=False
)


# ============================================================
# DISPLAY SUMMARY
# ============================================================

print()
print("=" * 70)
print("SUMMARY")
print("=" * 70)

print(
    "Total features analyzed:",
    len(importance_df)
)

print(
    "Top features selected:",
    len(top_50_features)
)

print()
print(
    "Saved:",
    OUTPUT_DIR / "feature_importance_300.csv"
)

print(
    "Saved:",
    OUTPUT_DIR / "top_50_features.csv"
)

print()
print("Feature importance analysis completed.")