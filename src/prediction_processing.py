# -*- coding: utf-8 -*-

"""
FINAL PRODUCTION PREPROCESSING
==============================

This file reproduces the SAME feature-engineering logic used in the
62-feature training experiment.

Important:
- Training used CONCAT of inpatient + outpatient.
- Training used beneficiary merge on BeneID.
- Training calculated Age from ClaimStartDt - DOB.
- Training calculated provider count features as NON-NULL counts
  within each Provider.
- Training calculated Provider+BeneID as number of UNIQUE beneficiaries.
- Training calculated physician/beneficiary/diagnosis/procedure means
  with the exact groupings used in the training notebook.
- Training created the 62 selected features from these claim-level data.
"""

import pickle
from pathlib import Path

import numpy as np
import pandas as pd


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "v2_62_features"
)


# ============================================================
# EXACT 62 FEATURES
# ============================================================

SELECTED_FEATURES = [
    "count_ClaimID_perProvider",
    "count_ClaimID_perProviderClmProcedureCode_4",
    "count_ClaimID_perProviderClmProcedureCode_3",
    "mean_Hospital_Days_perProvider",
    "mean_DeductibleAmtPaid_perProvider",
    "mean_IPAnnualReimbursementAmt_perProvider",
    "count_ClaimID_perProviderClmProcedureCode_5",
    "mean_Claim_Days_perProvider",
    "mean_InscClaimAmtReimbursed_perProvider",
    "mean_Age_perProvider",
    "mean_OPAnnualDeductibleAmt_perProvider",
    "mean_IPAnnualDeductibleAmt_perProvider",
    "count_ClaimID_perProviderClmDiagnosisCode_10",
    "mean_Risk_perProvider",
    "count_ClaimID_perProviderClmProcedureCode_2",
    "mean_OPAnnualReimbursementAmt_perProvider",
    "count_ClaimID_perProviderAttendingPhysician",
    "count_ClaimID_perProviderClmProcedureCode_1",
    "count_ClaimID_perProviderDiagnosisGroupCode",
    "ChronicCond_Alzheimer_1",
    "Age_Category_Old",
    "Gender_1",
    "ChronicCond_Osteoporasis_0",
    "ChronicCond_rheumatoidarthritis_0",
    "Gender_0",
    "ChronicCond_Alzheimer_0",
    "ChronicCond_rheumatoidarthritis_1",
    "ChronicCond_Depression_1",
    "ChronicCond_Heartfailure_0",
    "ChronicCond_Diabetes_1",
    "ChronicCond_Diabetes_0",
    "ChronicCond_Osteoporasis_1",
    "ChronicCond_Heartfailure_1",
    "ChronicCond_KidneyDisease_0",
    "ChronicCond_Depression_0",
    "count_ClaimID_perProviderClmDiagnosisCode_8",
    "count_ClaimID_perProviderBeneID",
    "count_ClaimID_perProviderClmDiagnosisCode_9",
    "ChronicCond_ObstrPulmonary_0",
    "ChronicCond_IschemicHeart_0",
    "ChronicCond_IschemicHeart_1",
    "count_ClaimID_perProviderClmDiagnosisCode_7",
    "count_ClaimID_perProviderClmDiagnosisCode_4",
    "count_ClaimID_perProviderClmDiagnosisCode_5",
    "count_ClaimID_perProviderOtherPhysician",
    "count_ClaimID_perProviderOperatingPhysician",
    "count_ClaimID_perProviderClmDiagnosisCode_6",
    "mean_DeductibleAmtPaid_perAttendingPhysician",
    "mean_IPAnnualDeductibleAmt_perAttendingPhysician",
    "mean_InscClaimAmtReimbursed_perAttendingPhysician",
    "mean_Hospital_Days_perAttendingPhysician",
    "mean_Claim_Days_perBeneID",
    "mean_IPAnnualReimbursementAmt_perAttendingPhysician",
    "mean_Hospital_Days_perClmDiagnosisCode_1",
    "mean_Claim_Days_perAttendingPhysician",
    "mean_Risk_perClmProcedureCode_4",
    "mean_Hospital_Days_perClmProcedureCode_4",
    "mean_Hospital_Days_perClmProcedureCode_5",
    "mean_InscClaimAmtReimbursed_perClmProcedureCode_5",
    "mean_IPAnnualReimbursementAmt_perClmProcedureCode_5",
    "mean_OPAnnualDeductibleAmt_perClmProcedureCode_5",
    "mean_Claim_Days_perClmProcedureCode_5",
]

assert len(SELECTED_FEATURES) == 62


# ============================================================
# LOAD MODEL ARTIFACTS
# ============================================================

def load_artifacts():

    feature_columns_path = (
        MODEL_DIR / "feature_columns.pkl"
    )

    config_path = (
        MODEL_DIR / "model_config.pkl"
    )

    if not feature_columns_path.exists():
        raise FileNotFoundError(
            f"Feature file not found:\n{feature_columns_path}"
        )

    if not config_path.exists():
        raise FileNotFoundError(
            f"Model configuration not found:\n{config_path}"
        )

    with open(feature_columns_path, "rb") as f:
        saved_feature_columns = pickle.load(f)

    with open(config_path, "rb") as f:
        model_config = pickle.load(f)

    return saved_feature_columns, model_config


# ============================================================
# EXACT TRAINING CLAIM CONSTRUCTION
# ============================================================

def create_prediction_dataframe(
    beneficiary_df,
    inpatient_df,
    outpatient_df
):
    """
    EXACTLY reproduce the training notebook:

        train_inout = pd.concat(
            [inpatient_train, outpatient_train],
            ignore_index=True
        )

        train_claims = train_inout.merge(
            beneficiary_train,
            on="BeneID",
            how="left"
        )

    The previous production code incorrectly used an
    inpatient/outpatient OUTER MERGE. That was not what the
    training experiment used.
    """

    inpatient_df = inpatient_df.copy()
    outpatient_df = outpatient_df.copy()
    beneficiary_df = beneficiary_df.copy()

    inpatient_df.columns = (
        inpatient_df.columns.astype(str).str.strip()
    )

    outpatient_df.columns = (
        outpatient_df.columns.astype(str).str.strip()
    )

    beneficiary_df.columns = (
        beneficiary_df.columns.astype(str).str.strip()
    )

    # --------------------------------------------------------
    # EXACT TRAINING LOGIC:
    # concatenate inpatient + outpatient
    # --------------------------------------------------------

    train_style_claims = pd.concat(
        [
            inpatient_df,
            outpatient_df
        ],
        ignore_index=True,
        sort=False
    )

    # --------------------------------------------------------
    # EXACT TRAINING LOGIC:
    # beneficiary merge
    # --------------------------------------------------------

    final_data = train_style_claims.merge(
        beneficiary_df,
        on="BeneID",
        how="left"
    )

    if final_data.empty:
        raise ValueError(
            "No claim rows remained after beneficiary merge."
        )

    return final_data


# ============================================================
# EXACT TRAINING BASIC FEATURES
# ============================================================

def create_basic_features(data):

    data = data.copy()

    # --------------------------------------------------------
    # DATE CONVERSION
    # --------------------------------------------------------

    date_columns = [
        "ClaimStartDt",
        "ClaimEndDt",
        "AdmissionDt",
        "DischargeDt",
        "DOB",
        "DOD"
    ]

    for col in date_columns:

        if col in data.columns:

            data[col] = pd.to_datetime(
                data[col],
                errors="coerce"
            )

    # --------------------------------------------------------
    # CLAIM DURATION
    # --------------------------------------------------------

    data["Claim_Days"] = (
        data["ClaimEndDt"]
        - data["ClaimStartDt"]
    ).dt.days

    # --------------------------------------------------------
    # HOSPITAL STAY
    # --------------------------------------------------------

    data["Hospital_Days"] = (
        data["DischargeDt"]
        - data["AdmissionDt"]
    ).dt.days

    # --------------------------------------------------------
    # AGE
    #
    # EXACT TRAINING FORMULA:
    # ClaimStartDt - DOB
    # --------------------------------------------------------

    data["Age"] = (
        data["ClaimStartDt"]
        - data["DOB"]
    ).dt.days / 365.25

    # --------------------------------------------------------
    # EXACT TRAINING VALUE LIMITS
    # --------------------------------------------------------

    data["Claim_Days"] = (
        data["Claim_Days"]
        .clip(lower=0)
    )

    data["Hospital_Days"] = (
        data["Hospital_Days"]
        .clip(lower=0)
    )

    data["Age"] = (
        data["Age"]
        .clip(lower=0, upper=120)
    )

    # --------------------------------------------------------
    # EXACT TRAINING RISK
    # --------------------------------------------------------

    chronic_columns = [
        "ChronicCond_Alzheimer",
        "ChronicCond_Heartfailure",
        "ChronicCond_KidneyDisease",
        "ChronicCond_Cancer",
        "ChronicCond_ObstrPulmonary",
        "ChronicCond_Depression",
        "ChronicCond_Diabetes",
        "ChronicCond_IschemicHeart",
        "ChronicCond_Osteoporasis",
        "ChronicCond_rheumatoidarthritis",
        "ChronicCond_stroke"
    ]

    available_chronic = [
        col
        for col in chronic_columns
        if col in data.columns
    ]

    for col in available_chronic:

        data[col] = pd.to_numeric(
            data[col],
            errors="coerce"
        )

    data["Risk"] = (
        data[available_chronic]
        .replace(2, 0)
        .sum(axis=1)
    )

    return data


# ============================================================
# CHRONIC CONDITION FEATURES
# ============================================================

CHRONIC_COLUMNS = [
    "ChronicCond_Alzheimer",
    "ChronicCond_Heartfailure",
    "ChronicCond_KidneyDisease",
    "ChronicCond_Cancer",
    "ChronicCond_ObstrPulmonary",
    "ChronicCond_Depression",
    "ChronicCond_Diabetes",
    "ChronicCond_IschemicHeart",
    "ChronicCond_Osteoporasis",
    "ChronicCond_rheumatoidarthritis",
    "ChronicCond_stroke"
]


def create_chronic_features(data):

    data = data.copy()

    for col in CHRONIC_COLUMNS:

        if col not in data.columns:
            data[col] = 0

        data[col] = pd.to_numeric(
            data[col],
            errors="coerce"
        )

        data[col] = (
            data[col]
            .replace({
                1: 1,
                2: 0
            })
            .fillna(0)
        )

    chronic_data = pd.DataFrame(
        index=data.index
    )

    for col in CHRONIC_COLUMNS:

        chronic_data[
            f"{col}_0"
        ] = (
            data[col] == 0
        ).astype(int)

        chronic_data[
            f"{col}_1"
        ] = (
            data[col] == 1
        ).astype(int)

    return chronic_data


# ============================================================
# DEMOGRAPHIC FEATURES
# ============================================================

def create_demographic_features(data):

    demographic = pd.DataFrame(
        index=data.index
    )

    gender = pd.to_numeric(
        data["Gender"],
        errors="coerce"
    )

    demographic["Gender_0"] = (
        gender == 0
    ).astype(int)

    demographic["Gender_1"] = (
        gender == 1
    ).astype(int)

    age = pd.to_numeric(
        data["Age"],
        errors="coerce"
    )

    demographic["Age_Category_Old"] = (
        (age >= 65)
        & (age < 85)
    ).astype(int)

    return demographic


# ============================================================
# GROUP MEAN HELPER
# ============================================================

def create_group_mean_features(
    data,
    group_column,
    feature_columns,
    prefix
):

    result = pd.DataFrame(
        index=data.index
    )

    if group_column not in data.columns:
        return result

    for column in feature_columns:

        if column not in data.columns:
            continue

        result[
            f"mean_{column}_per{prefix}"
        ] = (
            data.groupby(
                group_column
            )[column]
            .transform("mean")
        )

    return result


# ============================================================
# PROVIDER FEATURES
#
# THIS IS THE CRITICAL CORRECTION.
#
# Training used:
#     groupby("Provider")[column].transform(
#         lambda x: x.notna().sum()
#     )
#
# It did NOT use:
#     groupby(["Provider", column]).transform("count")
#
# ============================================================

PROVIDER_MEAN_COLUMNS = [
    "Hospital_Days",
    "DeductibleAmtPaid",
    "IPAnnualReimbursementAmt",
    "Claim_Days",
    "InscClaimAmtReimbursed",
    "Age",
    "OPAnnualDeductibleAmt",
    "IPAnnualDeductibleAmt",
    "Risk",
    "OPAnnualReimbursementAmt"
]


def create_provider_features_claim_level(data):

    result = pd.DataFrame(
        index=data.index
    )

    # --------------------------------------------------------
    # Claim count per provider
    # --------------------------------------------------------

    result[
        "count_ClaimID_perProvider"
    ] = (
        data.groupby(
            "Provider"
        )["ClaimID"]
        .transform("count")
    )

    # --------------------------------------------------------
    # Procedure NON-NULL counts per provider
    # EXACT TRAINING LOGIC
    # --------------------------------------------------------

    for col in [
        "ClmProcedureCode_1",
        "ClmProcedureCode_2",
        "ClmProcedureCode_3",
        "ClmProcedureCode_4",
        "ClmProcedureCode_5"
    ]:

        if col in data.columns:

            result[
                f"count_ClaimID_perProvider{col}"
            ] = (
                data.groupby(
                    "Provider"
                )[col]
                .transform(
                    lambda x: x.notna().sum()
                )
            )

    # --------------------------------------------------------
    # Diagnosis NON-NULL counts per provider
    # EXACT TRAINING LOGIC
    # --------------------------------------------------------

    for col in [
        "ClmDiagnosisCode_1",
        "ClmDiagnosisCode_2",
        "ClmDiagnosisCode_3",
        "ClmDiagnosisCode_4",
        "ClmDiagnosisCode_5",
        "ClmDiagnosisCode_6",
        "ClmDiagnosisCode_7",
        "ClmDiagnosisCode_8",
        "ClmDiagnosisCode_9",
        "ClmDiagnosisCode_10"
    ]:

        if col in data.columns:

            result[
                f"count_ClaimID_perProvider{col}"
            ] = (
                data.groupby(
                    "Provider"
                )[col]
                .transform(
                    lambda x: x.notna().sum()
                )
            )

    # --------------------------------------------------------
    # Diagnosis group NON-NULL count
    # --------------------------------------------------------

    if "DiagnosisGroupCode" in data.columns:

        result[
            "count_ClaimID_perProviderDiagnosisGroupCode"
        ] = (
            data.groupby(
                "Provider"
            )["DiagnosisGroupCode"]
            .transform(
                lambda x: x.notna().sum()
            )
        )

    # --------------------------------------------------------
    # UNIQUE beneficiaries per provider
    # EXACT TRAINING LOGIC
    # --------------------------------------------------------

    result[
        "count_ClaimID_perProviderBeneID"
    ] = (
        data.groupby(
            "Provider"
        )["BeneID"]
        .transform("nunique")
    )

    # --------------------------------------------------------
    # Physician NON-NULL counts per provider
    # EXACT TRAINING LOGIC
    # --------------------------------------------------------

    for col in [
        "AttendingPhysician",
        "OtherPhysician",
        "OperatingPhysician"
    ]:

        if col in data.columns:

            result[
                f"count_ClaimID_perProvider{col}"
            ] = (
                data.groupby(
                    "Provider"
                )[col]
                .transform(
                    lambda x: x.notna().sum()
                )
            )

    # --------------------------------------------------------
    # Provider means
    # EXACT TRAINING LOGIC
    # --------------------------------------------------------

    for col in PROVIDER_MEAN_COLUMNS:

        if col in data.columns:

            result[
                f"mean_{col}_perProvider"
            ] = (
                data.groupby(
                    "Provider"
                )[col]
                .transform("mean")
            )

    return result


# ============================================================
# ATTENDING PHYSICIAN FEATURES
# ============================================================

ATTENDING_MEAN_COLUMNS = [
    "DeductibleAmtPaid",
    "IPAnnualDeductibleAmt",
    "InscClaimAmtReimbursed",
    "Hospital_Days",
    "IPAnnualReimbursementAmt",
    "Claim_Days"
]


def create_attending_features(data):

    return create_group_mean_features(
        data=data,
        group_column="AttendingPhysician",
        feature_columns=ATTENDING_MEAN_COLUMNS,
        prefix="AttendingPhysician"
    )


# ============================================================
# BENEFICIARY FEATURE
# ============================================================

def create_beneficiary_features(data):

    result = pd.DataFrame(
        index=data.index
    )

    result[
        "mean_Claim_Days_perBeneID"
    ] = (
        data.groupby(
            "BeneID"
        )["Claim_Days"]
        .transform("mean")
    )

    return result


# ============================================================
# DIAGNOSIS / PROCEDURE FEATURES
# ============================================================

def create_diagnosis_procedure_features(data):

    result = pd.DataFrame(
        index=data.index
    )

    # --------------------------------------------------------
    # Diagnosis Code 1
    # --------------------------------------------------------

    result[
        "mean_Hospital_Days_perClmDiagnosisCode_1"
    ] = (
        data.groupby(
            "ClmDiagnosisCode_1"
        )["Hospital_Days"]
        .transform("mean")
    )

    # --------------------------------------------------------
    # Procedure Code 4
    # --------------------------------------------------------

    result[
        "mean_Risk_perClmProcedureCode_4"
    ] = (
        data.groupby(
            "ClmProcedureCode_4"
        )["Risk"]
        .transform("mean")
    )

    result[
        "mean_Hospital_Days_perClmProcedureCode_4"
    ] = (
        data.groupby(
            "ClmProcedureCode_4"
        )["Hospital_Days"]
        .transform("mean")
    )

    # --------------------------------------------------------
    # Procedure Code 5
    # --------------------------------------------------------

    result[
        "mean_Hospital_Days_perClmProcedureCode_5"
    ] = (
        data.groupby(
            "ClmProcedureCode_5"
        )["Hospital_Days"]
        .transform("mean")
    )

    result[
        "mean_InscClaimAmtReimbursed_perClmProcedureCode_5"
    ] = (
        data.groupby(
            "ClmProcedureCode_5"
        )["InscClaimAmtReimbursed"]
        .transform("mean")
    )

    result[
        "mean_IPAnnualReimbursementAmt_perClmProcedureCode_5"
    ] = (
        data.groupby(
            "ClmProcedureCode_5"
        )["IPAnnualReimbursementAmt"]
        .transform("mean")
    )

    result[
        "mean_OPAnnualDeductibleAmt_perClmProcedureCode_5"
    ] = (
        data.groupby(
            "ClmProcedureCode_5"
        )["OPAnnualDeductibleAmt"]
        .transform("mean")
    )

    result[
        "mean_Claim_Days_perClmProcedureCode_5"
    ] = (
        data.groupby(
            "ClmProcedureCode_5"
        )["Claim_Days"]
        .transform("mean")
    )

    return result


# ============================================================
# CREATE EXACT 62 FEATURES
# ============================================================

def create_selected_features(data):

    data = data.copy()

    # These were already created by create_basic_features().
    # Keep these fallbacks for safety only.

    if "Claim_Days" not in data.columns:

        data["Claim_Days"] = (
            pd.to_datetime(
                data["ClaimEndDt"],
                errors="coerce"
            )
            -
            pd.to_datetime(
                data["ClaimStartDt"],
                errors="coerce"
            )
        ).dt.days

        data["Claim_Days"] = (
            data["Claim_Days"]
            .clip(lower=0)
        )

    if "Hospital_Days" not in data.columns:

        data["Hospital_Days"] = (
            pd.to_datetime(
                data["DischargeDt"],
                errors="coerce"
            )
            -
            pd.to_datetime(
                data["AdmissionDt"],
                errors="coerce"
            )
        ).dt.days

        data["Hospital_Days"] = (
            data["Hospital_Days"]
            .clip(lower=0)
        )

    # --------------------------------------------------------
    # Feature groups
    # --------------------------------------------------------

    chronic_features = (
        create_chronic_features(data)
    )

    demographic_features = (
        create_demographic_features(data)
    )

    provider_features = (
        create_provider_features_claim_level(data)
    )

    attending_features = (
        create_attending_features(data)
    )

    beneficiary_features = (
        create_beneficiary_features(data)
    )

    diagnosis_procedure_features = (
        create_diagnosis_procedure_features(data)
    )

    # --------------------------------------------------------
    # Combine
    # --------------------------------------------------------

    feature_data = pd.concat(
        [
            provider_features,
            attending_features,
            beneficiary_features,
            diagnosis_procedure_features,
            chronic_features,
            demographic_features
        ],
        axis=1
    )

    # --------------------------------------------------------
    # Verify selected features
    # --------------------------------------------------------

    missing = [
        feature
        for feature in SELECTED_FEATURES
        if feature not in feature_data.columns
    ]

    if missing:

        raise ValueError(
            "The following selected features "
            "could not be generated:\n"
            + "\n".join(missing)
        )

    feature_data = feature_data[
        SELECTED_FEATURES
    ].copy()

    # --------------------------------------------------------
    # Numeric conversion
    # --------------------------------------------------------

    feature_data = feature_data.apply(
        pd.to_numeric,
        errors="coerce"
    )

    # --------------------------------------------------------
    # Missing values
    # --------------------------------------------------------

    feature_data = feature_data.replace(
        [np.inf, -np.inf],
        np.nan
    )

    feature_data = feature_data.fillna(0)

    return feature_data


# ============================================================
# COMPLETE PRODUCTION PREPROCESSING
# ============================================================

def preprocess_for_prediction(
    beneficiary_df,
    inpatient_df,
    outpatient_df
):

    print("=" * 70)
    print("FINAL 62-FEATURE PREDICTION PREPROCESSING")
    print("=" * 70)

    # --------------------------------------------------------
    # LOAD MODEL ARTIFACTS
    # --------------------------------------------------------

    saved_feature_columns, model_config = (
        load_artifacts()
    )

    if len(saved_feature_columns) != 62:

        raise ValueError(
            "Saved model does not contain exactly 62 features. "
            f"Found {len(saved_feature_columns)}."
        )

    print(
        "Saved feature count:",
        len(saved_feature_columns)
    )

    print(
        "Model threshold:",
        model_config.get("threshold")
    )

    # --------------------------------------------------------
    # CREATE CLAIM DATA
    # EXACT TRAINING CONSTRUCTION
    # --------------------------------------------------------

    data = create_prediction_dataframe(
        beneficiary_df,
        inpatient_df,
        outpatient_df
    )

    print(
        "Merged data shape:",
        data.shape
    )

    # --------------------------------------------------------
    # PROVIDER MAPPING
    # --------------------------------------------------------

    if "Provider" not in data.columns:

        raise ValueError(
            "Provider column is missing from production data."
        )

    provider_mapping = data[
        ["Provider"]
    ].copy()

    # --------------------------------------------------------
    # BASIC FEATURES
    # EXACT TRAINING LOGIC
    # --------------------------------------------------------

    data = create_basic_features(
        data
    )

    # --------------------------------------------------------
    # CREATE EXACT 62 FEATURES
    # --------------------------------------------------------

    X_prediction = create_selected_features(
        data
    )

    # --------------------------------------------------------
    # FORCE SAVED MODEL ORDER
    # --------------------------------------------------------

    missing_features = [
        feature
        for feature in saved_feature_columns
        if feature not in X_prediction.columns
    ]

    if missing_features:

        raise ValueError(
            "Missing model features:\n"
            + "\n".join(missing_features)
        )

    X_prediction = X_prediction[
        saved_feature_columns
    ].copy()

    # --------------------------------------------------------
    # RESET INDEX
    # --------------------------------------------------------

    X_prediction.reset_index(
        drop=True,
        inplace=True
    )

    provider_mapping.reset_index(
        drop=True,
        inplace=True
    )

    # --------------------------------------------------------
    # FINAL VALIDATION
    # --------------------------------------------------------

    if X_prediction.shape[1] != 62:

        raise ValueError(
            "Final prediction data does not contain 62 features. "
            f"Found {X_prediction.shape[1]}."
        )

    if list(X_prediction.columns) != list(
        saved_feature_columns
    ):

        raise ValueError(
            "Feature order does not match saved model."
        )

    missing_values = int(
        X_prediction.isna().sum().sum()
    )

    if missing_values != 0:

        raise ValueError(
            f"Prediction data contains {missing_values} missing values."
        )

    print(
        "Final prediction shape:",
        X_prediction.shape
    )

    print(
        "Expected feature count:",
        len(saved_feature_columns)
    )

    print(
        "Missing values:",
        missing_values
    )

    print("=" * 70)
    print("62-FEATURE PREPROCESSING PASSED")
    print("=" * 70)

    return (
        X_prediction,
        provider_mapping,
        model_config
    )