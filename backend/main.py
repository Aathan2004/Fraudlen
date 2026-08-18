import io
import pickle
import shutil
import tempfile
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from catboost import CatBoostClassifier


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_DIR = (
    PROJECT_ROOT
    / "models"
    / "v2_62_features"
)

MODEL_PATH = MODEL_DIR / "catboost_model.cbm"

FEATURE_COLUMNS_PATH = (
    MODEL_DIR
    / "feature_columns.pkl"
)

MODEL_CONFIG_PATH = (
    MODEL_DIR
    / "model_config.pkl"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "outputs"
)


# ============================================================
# IMPORT PRODUCTION 62-FEATURE PREPROCESSING
# ============================================================

from src.prediction_processing import (
    preprocess_for_prediction,
    create_prediction_dataframe
)


# ============================================================
# IMPORT MODEL EXPLAINABILITY
# ============================================================

from src.explainability import (
    get_global_feature_importance,
    get_provider_explanation
)

from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import Depends

# ============================================================
# DATABASE & AUTH (Neon DB + JWT)
# ============================================================

from backend.database import init_db, get_db, User as DBUser, AnalysisRecord, IS_NEON, DATABASE_URL
from backend.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_optional
)

# Initialize database tables & seed default users
init_db()


# ============================================================
# AUTH SCHEMAS
# ============================================================

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(...)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: Optional[str] = "Fraud Analyst"


class LoginRequest(BaseModel):
    username: str = Field(..., description="Username or email")
    password: str = Field(...)


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ============================================================
# CONSTANTS
# ============================================================

EXPECTED_FEATURE_COUNT = 62

DEFAULT_THRESHOLD = 0.40


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Healthcare Provider Fraud Detection API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# GLOBAL MODEL OBJECTS
# ============================================================

MODEL = None

FEATURE_COLUMNS = None

MODEL_CONFIG = None

THRESHOLD = DEFAULT_THRESHOLD


# ============================================================
# LOAD FINAL 62-FEATURE MODEL
# ============================================================

def load_final_model():

    global MODEL
    global FEATURE_COLUMNS
    global MODEL_CONFIG
    global THRESHOLD

    print("=" * 70)
    print("LOADING FINAL 62-FEATURE MODEL")
    print("=" * 70)

    # --------------------------------------------------------
    # Check required files
    # --------------------------------------------------------

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"CatBoost model not found:\n{MODEL_PATH}"
        )

    if not FEATURE_COLUMNS_PATH.exists():

        raise FileNotFoundError(
            f"Feature columns file not found:\n"
            f"{FEATURE_COLUMNS_PATH}"
        )

    if not MODEL_CONFIG_PATH.exists():

        raise FileNotFoundError(
            f"Model configuration not found:\n"
            f"{MODEL_CONFIG_PATH}"
        )

    # --------------------------------------------------------
    # Load CatBoost model
    # --------------------------------------------------------

    MODEL = CatBoostClassifier()

    MODEL.load_model(
        str(MODEL_PATH)
    )

    # --------------------------------------------------------
    # Load exact training feature columns
    # --------------------------------------------------------

    with open(
        FEATURE_COLUMNS_PATH,
        "rb"
    ) as f:

        FEATURE_COLUMNS = pickle.load(f)

    # --------------------------------------------------------
    # Load model configuration
    # --------------------------------------------------------

    with open(
        MODEL_CONFIG_PATH,
        "rb"
    ) as f:

        MODEL_CONFIG = pickle.load(f)

    # --------------------------------------------------------
    # Get threshold
    # --------------------------------------------------------

    THRESHOLD = float(
        MODEL_CONFIG.get(
            "threshold",
            DEFAULT_THRESHOLD
        )
    )

    # --------------------------------------------------------
    # Validate feature column count
    # --------------------------------------------------------

    if len(FEATURE_COLUMNS) != EXPECTED_FEATURE_COUNT:

        raise ValueError(
            "Saved feature column count is incorrect. "
            f"Expected {EXPECTED_FEATURE_COUNT}, "
            f"found {len(FEATURE_COLUMNS)}."
        )

    # --------------------------------------------------------
    # Validate CatBoost model feature count
    #
    # CatBoost does NOT have feature_count_.
    # get_feature_importance() gives one value per model feature.
    # --------------------------------------------------------

    model_feature_count = len(
        MODEL.get_feature_importance()
    )

    if model_feature_count != EXPECTED_FEATURE_COUNT:

        raise ValueError(
            "CatBoost model feature count is incorrect. "
            f"Expected {EXPECTED_FEATURE_COUNT}, "
            f"found {model_feature_count}."
        )

    print(
        "Project root :",
        PROJECT_ROOT
    )

    print(
        "Model        :",
        MODEL_PATH
    )

    print(
        "Features     :",
        len(FEATURE_COLUMNS)
    )

    print(
        "Threshold    :",
        THRESHOLD
    )

    print(
        "Model loaded : YES"
    )

    print("=" * 70)


# ============================================================
# LOAD MODEL WHEN API STARTS
# ============================================================

load_final_model()


# ============================================================
# DATASET IDENTIFICATION
# ============================================================

def identify_dataset_files(folder):

    csv_files = list(
        Path(folder).rglob("*.csv")
    )

    if not csv_files:

        raise ValueError(
            "No CSV files found in the uploaded dataset."
        )

    beneficiary_file = None
    inpatient_file = None
    outpatient_file = None
    provider_file = None

    # --------------------------------------------------------
    # Identify files using their COLUMN CONTENT
    # NOT their filenames
    # --------------------------------------------------------

    for file_path in csv_files:

        try:

            sample = pd.read_csv(
                file_path,
                nrows=5,
                low_memory=False
            )

        except Exception:

            continue

        columns = {
            str(column).strip()
            for column in sample.columns
        }

        # ----------------------------------------------------
        # Beneficiary
        # ----------------------------------------------------

        if {
            "BeneID",
            "DOB",
            "Gender",
            "Race"
        }.issubset(columns):

            beneficiary_file = file_path

            continue

        # ----------------------------------------------------
        # Inpatient
        # ----------------------------------------------------

        if {
            "BeneID",
            "ClaimID",
            "Provider",
            "AdmissionDt",
            "DischargeDt"
        }.issubset(columns):

            inpatient_file = file_path

            continue

        # ----------------------------------------------------
        # Outpatient
        # ----------------------------------------------------

        if {
            "BeneID",
            "ClaimID",
            "Provider",
            "ClmDiagnosisCode_1"
        }.issubset(columns):

            outpatient_file = file_path

            continue

        # ----------------------------------------------------
        # Optional provider file
        #
        # Provider file is NOT used to create model features.
        # It can contain the original PotentialFraud label
        # in the training dataset, but production predictions
        # must not depend on it.
        # ----------------------------------------------------

        if "Provider" in columns:

            if (
                "PotentialFraud" in columns
                or len(columns) <= 3
            ):

                provider_file = file_path

    # --------------------------------------------------------
    # Validate required datasets
    # --------------------------------------------------------

    missing = []

    if beneficiary_file is None:

        missing.append("beneficiary")

    if inpatient_file is None:

        missing.append("inpatient")

    if outpatient_file is None:

        missing.append("outpatient")

    if missing:

        raise ValueError(
            "Could not identify required datasets: "
            + ", ".join(missing)
        )

    print("=" * 70)
    print("DATASET IDENTIFICATION RESULT")
    print("=" * 70)

    print(
        "beneficiary :",
        beneficiary_file.name
    )

    print(
        "inpatient   :",
        inpatient_file.name
    )

    print(
        "outpatient  :",
        outpatient_file.name
    )

    if provider_file is not None:

        print(
            "provider    :",
            provider_file.name
        )

    else:

        print(
            "provider    : None"
        )

    print("=" * 70)

    return (
        beneficiary_file,
        inpatient_file,
        outpatient_file,
        provider_file
    )


# ============================================================
# READ DATASETS
# ============================================================

def read_datasets(folder):

    (
        beneficiary_file,
        inpatient_file,
        outpatient_file,
        provider_file
    ) = identify_dataset_files(folder)

    beneficiary_df = pd.read_csv(
        beneficiary_file,
        low_memory=False
    )

    inpatient_df = pd.read_csv(
        inpatient_file,
        low_memory=False
    )

    outpatient_df = pd.read_csv(
        outpatient_file,
        low_memory=False
    )

    provider_df = None

    if provider_file is not None:

        provider_df = pd.read_csv(
            provider_file,
            low_memory=False
        )

    return (
        beneficiary_df,
        inpatient_df,
        outpatient_df,
        provider_df
    )


# ============================================================
# FINAL 62-FEATURE PREPROCESSING
# ============================================================

def prepare_prediction_features(
    beneficiary_df,
    inpatient_df,
    outpatient_df
):

    print("=" * 70)
    print("FINAL 62-FEATURE PREDICTION PREPROCESSING")
    print("=" * 70)

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # All training-compatible feature creation is handled by
    # prediction_processing.py.
    #
    # main.py does NOT recreate feature engineering.
    # --------------------------------------------------------

    result = preprocess_for_prediction(
        beneficiary_df,
        inpatient_df,
        outpatient_df
    )

    if not isinstance(result, tuple):

        raise ValueError(
            "preprocess_for_prediction() did not return "
            "the expected tuple."
        )

    if len(result) < 2:

        raise ValueError(
            "preprocess_for_prediction() returned "
            "insufficient values."
        )

    X_prediction = result[0]

    provider_mapping = result[1]

    preprocessing_config = (
        result[2]
        if len(result) >= 3
        else {}
    )

    # --------------------------------------------------------
    # Convert to DataFrame
    # --------------------------------------------------------

    if not isinstance(
        X_prediction,
        pd.DataFrame
    ):

        X_prediction = pd.DataFrame(
            X_prediction
        )

    # --------------------------------------------------------
    # Validate feature count
    # --------------------------------------------------------

    if X_prediction.shape[1] != EXPECTED_FEATURE_COUNT:

        raise ValueError(
            "Prediction preprocessing produced "
            f"{X_prediction.shape[1]} features. "
            f"Expected exactly {EXPECTED_FEATURE_COUNT}."
        )

    # --------------------------------------------------------
    # Validate exact feature names
    # --------------------------------------------------------

    missing_features = [
        feature
        for feature in FEATURE_COLUMNS
        if feature not in X_prediction.columns
    ]

    extra_features = [
        feature
        for feature in X_prediction.columns
        if feature not in FEATURE_COLUMNS
    ]

    if missing_features:

        raise ValueError(
            "Prediction preprocessing is missing "
            f"{len(missing_features)} model features. "
            f"First missing features: "
            f"{missing_features[:10]}"
        )

    if extra_features:

        raise ValueError(
            "Prediction preprocessing contains "
            f"{len(extra_features)} unexpected features. "
            f"First extra features: "
            f"{extra_features[:10]}"
        )

    # --------------------------------------------------------
    # FORCE EXACT TRAINING COLUMN ORDER
    # --------------------------------------------------------

    X_prediction = X_prediction[
        FEATURE_COLUMNS
    ].copy()

    # --------------------------------------------------------
    # Replace infinity
    # --------------------------------------------------------

    X_prediction = X_prediction.replace(
        [np.inf, -np.inf],
        np.nan
    )

    # --------------------------------------------------------
    # Fill missing values
    # --------------------------------------------------------

    X_prediction = X_prediction.fillna(0)

    # --------------------------------------------------------
    # Final missing check
    # --------------------------------------------------------

    missing_values = int(
        X_prediction.isna().sum().sum()
    )

    if missing_values != 0:

        raise ValueError(
            f"Prediction data contains "
            f"{missing_values} missing values."
        )

    print(
        "Final prediction shape:",
        X_prediction.shape
    )

    print(
        "Expected feature count:",
        EXPECTED_FEATURE_COUNT
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
        preprocessing_config
    )


# ============================================================
# CREATE CLAIM-LEVEL RESULTS
# ============================================================

def create_claim_results(
    beneficiary_df,
    inpatient_df,
    outpatient_df,
    fraud_probability
):

    claim_data = create_prediction_dataframe(
        beneficiary_df,
        inpatient_df,
        outpatient_df
    )

    if not isinstance(
        claim_data,
        pd.DataFrame
    ):

        raise ValueError(
            "create_prediction_dataframe() did not "
            "return a DataFrame."
        )

    claim_data = claim_data.reset_index(
        drop=True
    )

    fraud_probability = np.asarray(
        fraud_probability
    )

    if len(claim_data) != len(
        fraud_probability
    ):

        raise ValueError(
            "Claim rows and prediction rows do not match. "
            f"Claims={len(claim_data)}, "
            f"Predictions={len(fraud_probability)}"
        )

    claim_data[
        "Fraud_Probability"
    ] = fraud_probability

    claim_data[
        "Fraud_Prediction"
    ] = (
        fraud_probability >= THRESHOLD
    ).astype(int)

    claim_data[
        "Fraud_Status"
    ] = np.where(
        claim_data[
            "Fraud_Prediction"
        ] == 1,
        "Fraud",
        "Not Fraud"
    )

    return claim_data


# ============================================================
# PROVIDER-LEVEL RESULTS
# ============================================================

def create_provider_results(
    claim_data
):

    if "Provider" not in claim_data.columns:

        raise ValueError(
            "Provider column is missing from "
            "claim-level prediction data."
        )

    # --------------------------------------------------------
    # Aggregate claims by provider
    # --------------------------------------------------------

    provider_results = (
        claim_data
        .groupby("Provider")
        .agg(
            Claim_Count=(
                "Provider",
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
        .reset_index()
    )

    # --------------------------------------------------------
    # Provider prediction
    # --------------------------------------------------------

    provider_results[
        "Fraud_Prediction"
    ] = (
        provider_results[
            "Fraud_Probability"
        ] >= THRESHOLD
    ).astype(int)

    # --------------------------------------------------------
    # Provider status
    # --------------------------------------------------------

    provider_results[
        "Fraud_Status"
    ] = np.where(
        provider_results[
            "Fraud_Prediction"
        ] == 1,
        "Fraud",
        "Not Fraud"
    )

    # --------------------------------------------------------
    # Percentage of fraudulent claims
    # --------------------------------------------------------

    provider_results[
        "Fraud_Claim_Percentage"
    ] = (
        provider_results[
            "Fraud_Claims"
        ]
        /
        provider_results[
            "Claim_Count"
        ]
        * 100
    )

    # --------------------------------------------------------
    # Highest-risk providers first
    # --------------------------------------------------------

    provider_results = (
        provider_results
        .sort_values(
            "Fraud_Probability",
            ascending=False
        )
        .reset_index(drop=True)
    )

    return provider_results


# ============================================================
# JSON SAFE DATAFRAME
# ============================================================

def dataframe_to_records(df):

    if df is None:

        return []

    if df.empty:

        return []

    result = df.copy()

    result = result.replace(
        [np.inf, -np.inf],
        np.nan
    )

    result = result.astype(
        object
    ).where(
        pd.notna(result),
        None
    )

    return result.to_dict(
        orient="records"
    )


# ============================================================
# DASHBOARD DATA
# ============================================================

def create_dashboard_data(
    claim_data,
    provider_data,
    beneficiary_df,
    inpatient_df,
    outpatient_df
):

    total_claims = len(
        claim_data
    )

    total_providers = (
        claim_data["Provider"]
        .nunique()
    )

    fraud_claims = int(
        claim_data[
            "Fraud_Prediction"
        ].sum()
    )

    fraud_providers = int(
        provider_data[
            "Fraud_Prediction"
        ].sum()
    )

    total_beneficiaries = (
        claim_data["BeneID"].nunique()
        if "BeneID" in claim_data.columns
        else beneficiary_df["BeneID"].nunique()
    )

    inpatient_claims = (
        inpatient_df["ClaimID"].nunique()
        if "ClaimID" in inpatient_df.columns
        else len(inpatient_df)
    )

    outpatient_claims = (
        outpatient_df["ClaimID"].nunique()
        if "ClaimID" in outpatient_df.columns
        else len(outpatient_df)
    )

    return {

        "total_claims":
            int(total_claims),

        "total_providers":
            int(total_providers),

        "total_beneficiaries":
            int(total_beneficiaries),

        "inpatient_claims":
            int(inpatient_claims),

        "outpatient_claims":
            int(outpatient_claims),

        "fraud_claims":
            fraud_claims,

        "normal_claims":
            int(
                total_claims - fraud_claims
            ),

        "fraud_claim_percentage":
            round(
                fraud_claims
                / total_claims
                * 100,
                2
            )
            if total_claims
            else 0,

        "fraud_providers":
            fraud_providers,

        "normal_providers":
            int(
                total_providers
                - fraud_providers
            ),

        "fraud_provider_percentage":
            round(
                fraud_providers
                / total_providers
                * 100,
                2
            )
            if total_providers
            else 0
    }


# ============================================================
# ANALYZE UPLOADED ZIP
# ============================================================

def analyze_uploaded_zip(
    file_bytes
):

    temp_dir = Path(
        tempfile.mkdtemp(
            prefix="fraud_upload_"
        )
    )

    try:

        # ----------------------------------------------------
        # Extract ZIP
        # ----------------------------------------------------

        try:

            with zipfile.ZipFile(
                io.BytesIO(file_bytes)
            ) as zip_file:

                if zip_file.testzip() is not None:

                    raise ValueError(
                        "Uploaded ZIP file is corrupted."
                    )

                zip_file.extractall(
                    temp_dir
                )

        except zipfile.BadZipFile:

            raise ValueError(
                "Uploaded file is not a valid ZIP file."
            )

        # ----------------------------------------------------
        # Read the four CSV datasets
        # ----------------------------------------------------

        (
            beneficiary_df,
            inpatient_df,
            outpatient_df,
            provider_df
        ) = read_datasets(
            temp_dir
        )

        print("=" * 70)
        print("UPLOADED DATASET")
        print("=" * 70)

        print(
            "Beneficiary:",
            beneficiary_df.shape
        )

        print(
            "Inpatient:",
            inpatient_df.shape
        )

        print(
            "Outpatient:",
            outpatient_df.shape
        )

        if provider_df is not None:

            print(
                "Provider:",
                provider_df.shape
            )

        # ----------------------------------------------------
        # FINAL 62-FEATURE PREPROCESSING
        # ----------------------------------------------------

        (
            X_prediction,
            provider_mapping,
            preprocessing_config
        ) = prepare_prediction_features(
            beneficiary_df,
            inpatient_df,
            outpatient_df
        )

        # ----------------------------------------------------
        # MODEL PREDICTION
        # ----------------------------------------------------

        print("=" * 70)
        print("PREDICTION")
        print("=" * 70)

        fraud_probability = (
            MODEL.predict_proba(
                X_prediction
            )[:, 1]
        )

        fraud_prediction = (
            fraud_probability >= THRESHOLD
        ).astype(int)

        print(
            "Total claims:",
            len(fraud_prediction)
        )

        print(
            "Fraud claims:",
            int(
                fraud_prediction.sum()
            )
        )

        print(
            "Not fraud claims:",
            int(
                (fraud_prediction == 0).sum()
            )
        )

        print(
            "Claim fraud percentage:",
            round(
                fraud_prediction.mean() * 100,
                2
            ),
            "%"
        )

        # ----------------------------------------------------
        # CLAIM RESULTS
        # ----------------------------------------------------

        claim_data = create_claim_results(
            beneficiary_df,
            inpatient_df,
            outpatient_df,
            fraud_probability
        )

        # ----------------------------------------------------
        # PROVIDER RESULTS
        # ----------------------------------------------------

        provider_data = create_provider_results(
            claim_data
        )

        # ----------------------------------------------------
        # DASHBOARD
        # ----------------------------------------------------

        dashboard = create_dashboard_data(
            claim_data,
            provider_data,
            beneficiary_df,
            inpatient_df,
            outpatient_df
        )

        # ----------------------------------------------------
        # SAVE OUTPUTS
        # ----------------------------------------------------

        OUTPUT_DIR.mkdir(
            parents=True,
            exist_ok=True
        )

        claim_data.to_csv(
            OUTPUT_DIR / "claim_predictions.csv",
            index=False
        )

        provider_data.to_csv(
            OUTPUT_DIR / "provider_predictions.csv",
            index=False
        )

        print("=" * 70)
        print("PREDICTION COMPLETED")
        print("=" * 70)

        print(
            "Total claims:",
            len(claim_data)
        )

        print(
            "Total providers:",
            len(provider_data)
        )

        print(
            "Predicted fraud providers:",
            int(
                provider_data[
                    "Fraud_Prediction"
                ].sum()
            )
        )

        print(
            "Predicted not-fraud providers:",
            int(
                (
                    provider_data[
                        "Fraud_Prediction"
                    ] == 0
                ).sum()
            )
        )

        print(
            "Fraud provider percentage:",
            round(
                provider_data[
                    "Fraud_Prediction"
                ].mean() * 100,
                2
            ),
            "%"
        )

        print("=" * 70)

        # ----------------------------------------------------
        # RETURN RESULTS
        #
        # NEW:
        # Keep X_prediction and provider_mapping so that
        # /providers/{provider_id} can generate SHAP
        # explanations later.
        # ----------------------------------------------------

        return {
            "dashboard": dashboard,
            "claims": claim_data,
            "providers": provider_data,

            # XAI DATA
            "features": X_prediction,
            "provider_mapping": provider_mapping
        }

    finally:

        shutil.rmtree(
            temp_dir,
            ignore_errors=True
        )


# ============================================================
# STORE LAST ANALYSIS
# ============================================================

LAST_RESULT = {

    "dashboard": None,

    "claims": None,

    "providers": None,

    # ========================================================
    # XAI DATA
    # ========================================================

    "features": None,

    "provider_mapping": None
}


# ============================================================
# AUTHENTICATION ENDPOINTS (Neon DB + JWT)
# ============================================================

@app.post("/auth/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user in Neon Postgres DB and returns a JWT token."""
    clean_username = payload.username.strip().lower()
    clean_email = payload.email.strip().lower()

    # Check for existing username or email
    if db.query(DBUser).filter(DBUser.username == clean_username).first():
        raise HTTPException(
            status_code=400,
            detail="Username is already registered."
        )
    if db.query(DBUser).filter(DBUser.email == clean_email).first():
        raise HTTPException(
            status_code=400,
            detail="Email address is already registered."
        )

    new_user = DBUser(
        username=clean_username,
        email=clean_email,
        full_name=payload.full_name.strip() if payload.full_name else None,
        hashed_password=hash_password(payload.password),
        role=payload.role or "Analyst"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "username": new_user.username, "role": new_user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user.to_dict()
    }


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Logs in an existing user with username/email and password."""
    identifier = payload.username.strip().lower()

    # Match by either username or email
    user = db.query(DBUser).filter(
        (DBUser.username == identifier) | (DBUser.email == identifier)
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Invalid username/email or password."
        )

    token = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: DBUser = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return current_user.to_dict()


@app.get("/auth/status")
def get_db_status(db: Session = Depends(get_db)):
    """Returns the database backend status (Neon PostgreSQL vs SQLite fallback)."""
    user_count = db.query(DBUser).count()
    return {
        "database_type": "Neon PostgreSQL" if IS_NEON else "SQLite (Local Fallback)",
        "is_neon": IS_NEON,
        "connected": True,
        "total_users": user_count
    }


@app.get("/auth/history")
def get_analysis_history(
    current_user: Optional[DBUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Returns previous dataset analysis history."""
    query = db.query(AnalysisRecord)
    if current_user:
        query = query.filter(AnalysisRecord.user_id == current_user.id)
    records = query.order_by(AnalysisRecord.created_at.desc()).limit(10).all()
    return [r.to_dict() for r in records]


# ============================================================
# HOME
# ============================================================


@app.get("/")
def home():

    return {

        "status":
            "running",

        "project":
            "Healthcare Provider Fraud Detection",

        "model":
            "CatBoost",

        "feature_count":
            EXPECTED_FEATURE_COUNT,

        "threshold":
            THRESHOLD,

        "model_path":
            str(MODEL_PATH)
    }


# ============================================================
# ANALYZE
# ============================================================

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    current_user: Optional[DBUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file uploaded."
        )

    # --------------------------------------------------------
    # Current Swagger endpoint accepts ZIP.
    #
    # A normal folder cannot be uploaded directly through
    # a single multipart file field.
    # The frontend can zip the folder before sending it.
    # --------------------------------------------------------

    if not file.filename.lower().endswith(
        ".zip"
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload a ZIP file containing "
                "the beneficiary, inpatient, outpatient "
                "and optional provider CSV files."
            )
        )

    try:

        contents = await file.read()

        if not contents:

            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )

        result = analyze_uploaded_zip(
            contents
        )

        LAST_RESULT[
            "dashboard"
        ] = result["dashboard"]

        LAST_RESULT[
            "claims"
        ] = result["claims"]

        LAST_RESULT[
            "providers"
        ] = result["providers"]

        # ====================================================
        # NEW XAI DATA
        # ====================================================

        LAST_RESULT[
            "features"
        ] = result["features"]

        LAST_RESULT[
            "provider_mapping"
        ] = result["provider_mapping"]

        # Persist to database if available
        try:
            d_summary = result["dashboard"]
            record = AnalysisRecord(
                user_id=current_user.id if current_user else None,
                filename=file.filename,
                total_providers=d_summary.get("total_providers", 0),
                fraud_providers=d_summary.get("fraud_providers", 0),
                total_claims=d_summary.get("total_claims", 0),
                fraud_claims=d_summary.get("fraud_claims", 0),
                fraud_provider_percentage=d_summary.get("fraud_provider_percentage", 0.0)
            )
            db.add(record)
            db.commit()
        except Exception as db_err:
            print(f"[!] Failed to save analysis log to DB: {db_err}")

        return {

            "message":
                "Dataset analyzed successfully",

            **result["dashboard"]
        }

    except HTTPException:

        raise

    except Exception as e:

        print("=" * 70)
        print("ANALYSIS ERROR")
        print("=" * 70)

        print(
            repr(e)
        )

        print("=" * 70)

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/dashboard")
def dashboard():

    if LAST_RESULT[
        "dashboard"
    ] is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "No analysis available. "
                "Upload a dataset using /analyze first."
            )
        )

    return LAST_RESULT[
        "dashboard"
    ]


# ============================================================
# ALL PROVIDERS
# ============================================================

@app.get("/providers")
def get_providers():

    if LAST_RESULT[
        "providers"
    ] is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "No provider results available. "
                "Run /analyze first."
            )
        )

    provider_data = LAST_RESULT[
        "providers"
    ]

    return {

        "total_providers":
            int(len(provider_data)),

        "providers":
            dataframe_to_records(
                provider_data
            )
    }


# ============================================================
# SINGLE PROVIDER
# ============================================================

@app.get(
    "/providers/{provider_id}"
)
def get_provider(
    provider_id: str
):

    if LAST_RESULT[
        "providers"
    ] is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "No provider results available. "
                "Run /analyze first."
            )
        )

    provider_data = LAST_RESULT[
        "providers"
    ]

    claim_data = LAST_RESULT[
        "claims"
    ]

    provider_rows = provider_data[
        provider_data[
            "Provider"
        ].astype(str)
        == str(provider_id)
    ]

    if provider_rows.empty:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Provider {provider_id} "
                "was not found."
            )
        )

    provider = provider_rows.iloc[0]

    provider_claims = claim_data[
        claim_data[
            "Provider"
        ].astype(str)
        == str(provider_id)
    ].copy()

    # --------------------------------------------------------
    # Claim counts
    # --------------------------------------------------------

    total_claims = len(
        provider_claims
    )

    fraud_claims = int(
        provider_claims[
            "Fraud_Prediction"
        ].sum()
    )

    # --------------------------------------------------------
    # Top suspicious claims
    # --------------------------------------------------------

    suspicious_claims = (
        provider_claims
        .sort_values(
            "Fraud_Probability",
            ascending=False
        )
        .head(20)
    )

    # ========================================================
    # NEW: MODEL EXPLAINABILITY
    # ========================================================

    X_prediction = LAST_RESULT[
        "features"
    ]

    provider_mapping = LAST_RESULT[
        "provider_mapping"
    ]

    if (
        X_prediction is None
        or provider_mapping is None
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "Explainability data is not available. "
                "Please run /analyze again."
            )
        )

    try:

        provider_explanation = (
            get_provider_explanation(
                model=MODEL,
                X_prediction=X_prediction,
                provider_mapping=provider_mapping,
                provider_id=provider_id,
                feature_columns=FEATURE_COLUMNS,
                top_n=10
            )
        )

    except ValueError as e:

        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

    except Exception as e:

        print("=" * 70)
        print("EXPLAINABILITY ERROR")
        print("=" * 70)

        print(
            repr(e)
        )

        print("=" * 70)

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not generate provider "
                f"explanation: {str(e)}"
            )
        )

    # ========================================================
    # PROVIDER RESPONSE
    # ========================================================

    return {

        "provider":
            str(provider_id),

        "fraud_probability":
            round(
                float(
                    provider[
                        "Fraud_Probability"
                    ]
                ),
                6
            ),

        "fraud_prediction":
            int(
                provider[
                    "Fraud_Prediction"
                ]
            ),

        "fraud_status":
            str(
                provider[
                    "Fraud_Status"
                ]
            ),

        "claim_count":
            int(total_claims),

        "fraud_claims":
            fraud_claims,

        "normal_claims":
            int(
                total_claims
                - fraud_claims
            ),

        "fraud_claim_percentage":
            round(
                fraud_claims
                / total_claims
                * 100,
                2
            )
            if total_claims
            else 0,

        # ----------------------------------------------------
        # Existing claim information
        # ----------------------------------------------------

        "claims":
            dataframe_to_records(
                suspicious_claims
            ),

        # ====================================================
        # NEW: DETAILED MODEL EXPLANATION
        # ====================================================

        "xai":
            provider_explanation
    }


# ============================================================
# GLOBAL MODEL EXPLAINABILITY
# ============================================================

@app.get(
    "/explainability/global"
)
def global_explainability():

    try:

        explanation = (
            get_global_feature_importance(
                model=MODEL,
                feature_columns=FEATURE_COLUMNS,
                top_n=15
            )
        )

        return {

            "model":
                "CatBoost",

            "feature_count":
                EXPECTED_FEATURE_COUNT,

            "top_features":
                explanation
        }

    except Exception as e:

        print("=" * 70)
        print("GLOBAL EXPLAINABILITY ERROR")
        print("=" * 70)

        print(
            repr(e)
        )

        print("=" * 70)

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not generate global "
                f"model explanation: {str(e)}"
            )
        )


# ============================================================
# RUN DIRECTLY
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )