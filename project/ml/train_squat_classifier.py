import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputClassifier

FEATURE_ORDER = [
    "kneeAngle",
    "ankleAngle",
    "torsoAngleFromVertical",
    "depth",
    "heelLift",
]
LABEL_ORDER = ["valgus", "lean", "shallow", "toes"]


def read_dataset(path: Path):
    payload = json.loads(path.read_text(encoding="utf-8"))
    frames = payload.get("frames", [])
    x_rows = []
    y_rows = []
    for frame in frames:
        feats = frame.get("features", {})
        labels = frame.get("labels", {})
        x_rows.append([float(feats.get(k, 0.0)) for k in FEATURE_ORDER])
        y_rows.append([int(bool(labels.get(k, False))) for k in LABEL_ORDER])
    if not x_rows:
        return np.zeros((0, len(FEATURE_ORDER))), np.zeros((0, len(LABEL_ORDER)))
    return np.array(x_rows, dtype=np.float32), np.array(y_rows, dtype=np.int32)


def load_all_json(input_dir: Path):
    files = sorted(input_dir.glob("*.json"))
    if not files:
        raise FileNotFoundError(f"Brak plikow .json w: {input_dir}")
    x_all = []
    y_all = []
    for f in files:
        x, y = read_dataset(f)
        if len(x) == 0:
            continue
        x_all.append(x)
        y_all.append(y)
    if not x_all:
        raise RuntimeError("Wszystkie pliki datasetu sa puste.")
    return np.vstack(x_all), np.vstack(y_all)


def main():
    parser = argparse.ArgumentParser(description="Trenuje klasyfikator bledow przysiadu z eksportow FormCheckAI.")
    parser.add_argument("--input-dir", required=True, help="Folder z plikami JSON wyeksportowanymi z aplikacji.")
    parser.add_argument("--out-model", default="squat_error_model.joblib", help="Sciezka wyjsciowa modelu.")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    out_model = Path(args.out_model)

    x, y = load_all_json(input_dir)
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, shuffle=True
    )

    base = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=8,
        random_state=42,
        n_jobs=-1,
    )
    model = MultiOutputClassifier(base)
    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    print("=== Raport walidacji ===")
    for i, label in enumerate(LABEL_ORDER):
        print(f"\n[{label}]")
        print(classification_report(y_test[:, i], y_pred[:, i], digits=3))

    out_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "feature_order": FEATURE_ORDER,
            "label_order": LABEL_ORDER,
        },
        out_model,
    )
    print(f"\nZapisano model: {out_model}")


if __name__ == "__main__":
    main()
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputClassifier


FEATURE_ORDER = [
    "kneeAngle",
    "ankleAngle",
    "torsoAngleFromVertical",
    "depth",
    "heelLift",
]
LABEL_ORDER = ["valgus", "lean", "shallow", "toes"]


def read_dataset(path: Path):
    payload = json.loads(path.read_text(encoding="utf-8"))
    frames = payload.get("frames", [])
    x_rows = []
    y_rows = []
    for frame in frames:
        feats = frame.get("features", {})
        labels = frame.get("labels", {})
        x_rows.append([float(feats.get(k, 0.0)) for k in FEATURE_ORDER])
        y_rows.append([int(bool(labels.get(k, False))) for k in LABEL_ORDER])
    if not x_rows:
        return np.zeros((0, len(FEATURE_ORDER))), np.zeros((0, len(LABEL_ORDER)))
    return np.array(x_rows, dtype=np.float32), np.array(y_rows, dtype=np.int32)


def load_all_json(input_dir: Path):
    files = sorted(input_dir.glob("*.json"))
    if not files:
        raise FileNotFoundError(f"Brak plikow .json w: {input_dir}")
    x_all = []
    y_all = []
    for f in files:
        x, y = read_dataset(f)
        if len(x) == 0:
            continue
        x_all.append(x)
        y_all.append(y)
    if not x_all:
        raise RuntimeError("Wszystkie pliki datasetu sa puste.")
    return np.vstack(x_all), np.vstack(y_all)


def main():
    parser = argparse.ArgumentParser(description="Trenuje klasyfikator bledow przysiadu z eksportow FormCheckAI.")
    parser.add_argument("--input-dir", required=True, help="Folder z plikami JSON wyeksportowanymi z aplikacji.")
    parser.add_argument("--out-model", default="squat_error_model.joblib", help="Sciezka wyjsciowa modelu.")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    out_model = Path(args.out_model)

    x, y = load_all_json(input_dir)
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, shuffle=True
    )

    base = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=8,
        random_state=42,
        n_jobs=-1,
    )
    model = MultiOutputClassifier(base)
    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    print("=== Raport walidacji ===")
    for i, label in enumerate(LABEL_ORDER):
        print(f"\n[{label}]")
        print(classification_report(y_test[:, i], y_pred[:, i], digits=3))

    out_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "feature_order": FEATURE_ORDER,
            "label_order": LABEL_ORDER,
        },
        out_model,
    )
    print(f"\nZapisano model: {out_model}")


if __name__ == "__main__":
    main()
