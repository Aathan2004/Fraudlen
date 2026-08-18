import zipfile
import tempfile
from pathlib import Path

import pandas as pd


# ============================================================
# REQUIRED COLUMNS
# Used to identify datasets by CONTENT, not filename
# ============================================================

BENEFICIARY_REQUIRED = {
    "BeneID",
    "DOB",
    "Gender",
    "Race",
}

INPATIENT_REQUIRED = {
    "ClaimID",
    "BeneID",
    "Provider",
    "AdmissionDt",
    "DischargeDt",
}

OUTPATIENT_REQUIRED = {
    "ClaimID",
    "BeneID",
    "Provider",
}

PROVIDER_REQUIRED = {
    "Provider",
    "PotentialFraud",
}


# ============================================================
# READ CSV
# ============================================================

def _read_csv(file_path):
    return pd.read_csv(
        file_path,
        low_memory=False
    )


# ============================================================
# IDENTIFY DATASET BY CONTENT
# ============================================================

def _identify_dataset(df):

    columns = set(df.columns)

    # --------------------------------------------------------
    # Provider
    # --------------------------------------------------------

    if PROVIDER_REQUIRED.issubset(columns):
        return "provider"

    # --------------------------------------------------------
    # Beneficiary
    # --------------------------------------------------------

    if BENEFICIARY_REQUIRED.issubset(columns):

        # ClaimID should not normally exist
        if "ClaimID" not in columns:
            return "beneficiary"

    # --------------------------------------------------------
    # Inpatient
    # --------------------------------------------------------

    if INPATIENT_REQUIRED.issubset(columns):

        # Inpatient has admission/discharge information
        return "inpatient"

    # --------------------------------------------------------
    # Outpatient
    # --------------------------------------------------------

    if OUTPATIENT_REQUIRED.issubset(columns):

        return "outpatient"

    return None


# ============================================================
# FIND CSV FILES
# ============================================================

def _find_csv_files(folder):

    folder = Path(folder)

    return list(
        folder.rglob("*.csv")
    )


# ============================================================
# IDENTIFY ALL DATASETS
# ============================================================

def identify_datasets(folder):

    csv_files = _find_csv_files(folder)

    if not csv_files:
        raise ValueError(
            "No CSV files were found in the uploaded input."
        )

    datasets = {}

    for csv_file in csv_files:

        try:

            df = _read_csv(csv_file)

        except Exception as error:

            print(
                f"Could not read {csv_file.name}: {error}"
            )

            continue

        dataset_type = _identify_dataset(df)

        if dataset_type is None:
            continue

        # Prevent accidental duplicate dataset types
        if dataset_type in datasets:

            raise ValueError(
                f"More than one {dataset_type} dataset "
                "was found."
            )

        datasets[dataset_type] = df

        print(
            f"Identified {dataset_type}: "
            f"{csv_file.name} "
            f"{df.shape}"
        )

    # --------------------------------------------------------
    # Required prediction datasets
    # --------------------------------------------------------

    required = [
        "beneficiary",
        "inpatient",
        "outpatient",
    ]

    missing = [
        name
        for name in required
        if name not in datasets
    ]

    if missing:

        raise ValueError(
            "Could not identify the required datasets: "
            + ", ".join(missing)
        )

    return datasets


# ============================================================
# PROCESS FOLDER
# ============================================================

def load_from_folder(folder):

    folder = Path(folder)

    if not folder.exists():

        raise FileNotFoundError(
            f"Input folder does not exist: {folder}"
        )

    return identify_datasets(folder)


# ============================================================
# PROCESS ZIP
# ============================================================

def load_from_zip(zip_path):

    zip_path = Path(zip_path)

    if not zip_path.exists():

        raise FileNotFoundError(
            f"ZIP file does not exist: {zip_path}"
        )

    temp_directory = tempfile.TemporaryDirectory()

    extraction_path = Path(
        temp_directory.name
    )

    try:

        with zipfile.ZipFile(
            zip_path,
            "r"
        ) as zip_file:

            zip_file.extractall(
                extraction_path
            )

        datasets = identify_datasets(
            extraction_path
        )

        # Keep temporary directory alive
        datasets["_temp_directory"] = temp_directory

        return datasets

    except Exception:

        temp_directory.cleanup()

        raise