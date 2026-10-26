"""Training-only transformations; portable JSON, never pickle."""
import warnings

import numpy as np
from scipy.special import expit
from sklearn.exceptions import ConvergenceWarning
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .data import FEATURE_NAMES


def fit_model(x, y):
    if not np.isfinite(x[:, ::3]).any(axis=0).all():
        raise ValueError("Training needs at least one observed value for every vital")
    pipe = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(),
                         LogisticRegression(C=1, solver="lbfgs", max_iter=2000, random_state=2026))
    with warnings.catch_warnings():
        warnings.simplefilter("error", ConvergenceWarning)
        pipe.fit(x, y)
    imputer, scaler, model = pipe.steps[0][1], pipe.steps[1][1], pipe.steps[2][1]
    return pipe, {"schemaVersion": 1, "algorithm": "Logistic regression (L2, C=1)",
                  "featureNames": FEATURE_NAMES, "imputation": imputer.statistics_.tolist(),
                  "mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist(),
                  "coefficients": model.coef_[0].tolist(), "intercept": float(model.intercept_[0])}


def predict_export(model, x):
    filled = np.where(np.isnan(x), np.asarray(model["imputation"]), x)
    standardized = (filled - np.asarray(model["mean"])) / np.asarray(model["scale"])
    return expit(standardized @ np.asarray(model["coefficients"]) + model["intercept"])
