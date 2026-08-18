import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, Pool


# ============================================================
# GLOBAL MODEL EXPLANATION
# ============================================================

def get_global_feature_importance(
    model: CatBoostClassifier,
    feature_columns: list[str],
    top_n: int = 15
):

    importance = model.get_feature_importance(
        type="FeatureImportance"
    )

    result = pd.DataFrame({
        "feature": feature_columns,
        "importance": importance
    })

    result = result.sort_values(
        "importance",
        ascending=False
    ).head(top_n)

    total = result["importance"].sum()

    if total > 0:
        result["importance_percentage"] = (
            result["importance"] / total
        ) * 100
    else:
        result["importance_percentage"] = 0

    return [
        {
            "feature": row["feature"],
            "importance": round(
                float(row["importance"]),
                6
            ),
            "importance_percentage": round(
                float(row["importance_percentage"]),
                2
            )
        }
        for _, row in result.iterrows()
    ]


# ============================================================
# PROVIDER-LEVEL SHAP EXPLANATION
# ============================================================

def get_provider_explanation(
    model: CatBoostClassifier,
    X_prediction: pd.DataFrame,
    provider_mapping: pd.DataFrame,
    provider_id: str,
    feature_columns: list[str],
    top_n: int = 10
):

    provider_mask = (
        provider_mapping["Provider"]
        .astype(str)
        == str(provider_id)
    )

    if not provider_mask.any():
        raise ValueError(
            f"Provider {provider_id} was not found."
        )

    provider_indices = np.where(
        provider_mask.values
    )[0]

    provider_X = X_prediction.iloc[
        provider_indices
    ].copy()

    # Exact training feature order
    provider_X = provider_X[
        feature_columns
    ]

    # CatBoost Pool
    pool = Pool(provider_X)

    # --------------------------------------------------------
    # SHAP VALUES
    #
    # Last column is the expected/base value.
    # Remaining columns correspond to model features.
    # --------------------------------------------------------

    shap_values = model.get_feature_importance(
        pool,
        type="ShapValues"
    )

    feature_shap = shap_values[:, :-1]

    base_values = shap_values[:, -1]

    # --------------------------------------------------------
    # Provider-level aggregation
    # --------------------------------------------------------

    mean_shap = np.mean(
        feature_shap,
        axis=0
    )

    mean_abs_shap = np.mean(
        np.abs(feature_shap),
        axis=0
    )

    # --------------------------------------------------------
    # Feature values
    # --------------------------------------------------------

    rows = []

    for i, feature in enumerate(
        feature_columns
    ):

        values = provider_X[feature]

        numeric_values = pd.to_numeric(
            values,
            errors="coerce"
        )

        if numeric_values.notna().any():

            provider_value = float(
                numeric_values.mean()
            )

        else:

            provider_value = None

        shap_value = float(
            mean_shap[i]
        )

        if shap_value > 0:
            direction = "toward_fraud"

        elif shap_value < 0:
            direction = "toward_not_fraud"

        else:
            direction = "neutral"

        rows.append({
            "feature": feature,

            "provider_value": provider_value,

            "shap_value": shap_value,

            "absolute_impact": float(
                mean_abs_shap[i]
            ),

            "direction": direction
        })

    explanation_df = pd.DataFrame(rows)

    # --------------------------------------------------------
    # Features supporting FRAUD
    # --------------------------------------------------------

    fraud_features = (
        explanation_df[
            explanation_df["shap_value"] > 0
        ]
        .sort_values(
            "shap_value",
            ascending=False
        )
        .head(top_n)
    )

    # --------------------------------------------------------
    # Features supporting NOT FRAUD
    # --------------------------------------------------------

    non_fraud_features = (
        explanation_df[
            explanation_df["shap_value"] < 0
        ]
        .sort_values(
            "shap_value",
            ascending=True
        )
        .head(top_n)
    )

    # --------------------------------------------------------
    # Strongest features regardless of direction
    # --------------------------------------------------------

    strongest_features = (
        explanation_df
        .sort_values(
            "absolute_impact",
            ascending=False
        )
        .head(top_n)
    )

    def format_features(df):

        result = []

        for _, row in df.iterrows():

            value = row["provider_value"]

            if pd.isna(value):
                value = None

            result.append({
                "feature": row["feature"],

                "provider_value": (
                    None
                    if value is None
                    else round(
                        float(value),
                        4
                    )
                ),

                "shap_value": round(
                    float(
                        row["shap_value"]
                    ),
                    6
                ),

                "absolute_impact": round(
                    float(
                        row["absolute_impact"]
                    ),
                    6
                ),

                "direction": row[
                    "direction"
                ]
            })

        return result

    # --------------------------------------------------------
    # Overall explanation
    # --------------------------------------------------------

    total_positive = float(
        np.abs(
            feature_shap[
                feature_shap > 0
            ]
        ).sum()
    )

    total_negative = float(
        np.abs(
            feature_shap[
                feature_shap < 0
            ]
        ).sum()
    )

    if total_positive > total_negative:

        explanation = (
            "The provider's claim patterns contain "
            "stronger model contributions toward the "
            "fraud class. The features listed under "
            "fraud-supporting factors are the strongest "
            "contributors increasing the model's fraud "
            "prediction."
        )

    elif total_negative > total_positive:

        explanation = (
            "The provider's claim patterns contain "
            "stronger model contributions toward the "
            "non-fraud class. The features listed under "
            "non-fraud-supporting factors are the strongest "
            "contributors reducing the fraud prediction."
        )

    else:

        explanation = (
            "The provider has both fraud-supporting and "
            "non-fraud-supporting feature contributions. "
            "The final prediction results from their combined "
            "effect in the trained CatBoost model."
        )

    return {

        "provider": str(
            provider_id
        ),

        "claim_count": int(
            len(provider_indices)
        ),

        "explanation": explanation,

        "fraud_supporting_features":
            format_features(
                fraud_features
            ),

        "non_fraud_supporting_features":
            format_features(
                non_fraud_features
            ),

        "strongest_features":
            format_features(
                strongest_features
            ),

        "base_value": round(
            float(
                np.mean(base_values)
            ),
            6
        )
    }