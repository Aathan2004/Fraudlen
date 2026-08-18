from pathlib import Path

import pandas as pd
from catboost import CatBoostClassifier

from data_ingestion import load_from_folder, load_from_zip
from prediction_processing import preprocess_for_prediction


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "v2_62_features"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "outputs"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():

    model = CatBoostClassifier()

    model.load_model(
        MODEL_DIR / "catboost_model.cbm"
    )

    return model


# ============================================================
# RUN PREDICTION
# ============================================================

def run_prediction(datasets):

    # --------------------------------------------------------
    # Get required datasets
    # --------------------------------------------------------

    beneficiary_df = datasets["beneficiary"]

    inpatient_df = datasets["inpatient"]

    outpatient_df = datasets["outpatient"]

    # --------------------------------------------------------
    # Create exact 62 production features
    # --------------------------------------------------------

    X_prediction, provider_mapping, model_config = (
        preprocess_for_prediction(
            beneficiary_df,
            inpatient_df,
            outpatient_df
        )
    )

    # --------------------------------------------------------
    # Load exact trained model
    # --------------------------------------------------------

    model = load_model()

    # --------------------------------------------------------
    # Claim-level probabilities
    # --------------------------------------------------------

    fraud_probability = model.predict_proba(
        X_prediction
    )[:, 1]

    # --------------------------------------------------------
    # Claim-level results
    # --------------------------------------------------------

    claim_results = pd.DataFrame({
        "Provider":
            provider_mapping["Provider"].values,

        "Fraud_Probability":
            fraud_probability
    })

    threshold = model_config.get(
        "threshold",
        0.4
    )

    claim_results["Fraud_Prediction"] = (
        claim_results["Fraud_Probability"]
        >= threshold
    ).astype(int)

    claim_results["Fraud_Status"] = (
        claim_results["Fraud_Prediction"]
        .map({
            0: "Not Fraud",
            1: "Fraud"
        })
    )

    # --------------------------------------------------------
    # Provider-level aggregation
    # --------------------------------------------------------

    provider_results = (
        claim_results
        .groupby(
            "Provider",
            as_index=False
        )
        .agg(
            Claim_Count=(
                "Fraud_Probability",
                "size"
            ),

            Fraud_Probability=(
                "Fraud_Probability",
                "mean"
            ),

            Fraud_Claims=(
                "Fraud_Prediction",
                "sum"
            )
        )
    )

    # --------------------------------------------------------
    # Provider prediction
    # --------------------------------------------------------

    provider_results["Fraud_Prediction"] = (
        provider_results["Fraud_Probability"]
        >= threshold
    ).astype(int)

    provider_results["Fraud_Status"] = (
        provider_results["Fraud_Prediction"]
        .map({
            0: "Not Fraud",
            1: "Fraud"
        })
    )

    # --------------------------------------------------------
    # Save results
    # --------------------------------------------------------

    claim_output = (
        OUTPUT_DIR
        / "claim_predictions.csv"
    )

    provider_output = (
        OUTPUT_DIR
        / "provider_predictions.csv"
    )

    claim_results.to_csv(
        claim_output,
        index=False
    )

    provider_results.to_csv(
        provider_output,
        index=False
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("=" * 70)
    print("PREDICTION COMPLETED")
    print("=" * 70)

    print(
        "Total claims:",
        len(claim_results)
    )

    print(
        "Total providers:",
        len(provider_results)
    )

    print(
        "Predicted fraud providers:",
        provider_results[
            "Fraud_Prediction"
        ].sum()
    )

    print(
        "Predicted not-fraud providers:",
        (
            provider_results[
                "Fraud_Prediction"
            ] == 0
        ).sum()
    )

    print(
        "Fraud provider percentage:",
        round(
            provider_results[
                "Fraud_Prediction"
            ].mean() * 100,
            2
        ),
        "%"
    )

    print("=" * 70)

    return (
        claim_results,
        provider_results
    )


# ============================================================
# FOLDER INPUT
# ============================================================

def predict_from_folder(folder_path):

    datasets = load_from_folder(
        folder_path
    )

    return run_prediction(
        datasets
    )


# ============================================================
# ZIP INPUT
# ============================================================

def predict_from_zip(zip_path):

    datasets = load_from_zip(
        zip_path
    )

    try:

        return run_prediction(
            datasets
        )

    finally:

        temp_directory = datasets.get(
            "_temp_directory"
        )

        if temp_directory is not None:
            temp_directory.cleanup()