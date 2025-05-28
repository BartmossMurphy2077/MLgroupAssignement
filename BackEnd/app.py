from flask import Flask, request, jsonify
import pandas as pd
import joblib
import numpy as np
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')

BASE_DIR       = os.path.dirname(__file__)
PIPELINE_DIR   = os.path.join(BASE_DIR, 'pipeline_components')

# Load preprocessing and classifiers
pipeline = joblib.load(os.path.join(PIPELINE_DIR, 'complete_pipeline.pkl'))
classifier = joblib.load(os.path.join(PIPELINE_DIR, 'classifier.pkl'))
means_classifier = joblib.load(os.path.join(PIPELINE_DIR, 'means_classifier.pkl'))

numerical_imputer = pipeline['numerical_imputer']
categorical_encoders = pipeline['categorical_encoders']
pca_scaler = pipeline['pca_scaler']
pca_model = pipeline['pca_model']
feature_names = pipeline['feature_names']

# Labels predicted by classifier
target_labels = ['isDomesticServitude', 'isForcedMarriage', 'isSexualExploit', 
                 'isForcedLabour', 'isForcedMilitary', 'isOrganRemoval','isProstitution', 
                 'isSlaveryAndPractices', 'isAbduction']

# Defaults
defaults = {col: 0.0 for col in numerical_imputer.feature_names_in_}
for col in categorical_encoders:
    defaults[col] = 'missing'

@app.route('/')
def root():
    return app.send_static_file('index.html')

@app.route('/features', methods=['GET'])
def features():
    groups = {'meansOfControl': [], 'typeOfLabour': [], 'is': []}
    numeric, categorical = [], []

    for col in feature_names:
        if col.startswith('meansOfControl'):
            groups['meansOfControl'].append(col)
        elif col.startswith('typeOfLabour'):
            groups['typeOfLabour'].append(col)
        elif col.startswith('is'):
            groups['is'].append(col)
        elif col in categorical_encoders:
            categorical.append(col)
        else:
            numeric.append(col)

    return jsonify({
        'groups': groups,
        'numeric': numeric,
        'categorical': categorical,
        'defaults': defaults
    })

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    # Prepare input row
    row = {}
    for col in feature_names:
        raw_val = data.get(col, '')
        if col in categorical_encoders:
            val = str(raw_val).strip() if raw_val not in ['', None] else 'missing'
            known = categorical_encoders[col].classes_
            if val not in known:
                val = 'missing'
            if 'missing' not in known:
                categorical_encoders[col].classes_ = np.append(known, 'missing')
        else:
            try:
                val = float(raw_val)
            except (ValueError, TypeError):
                val = 0.0
        row[col] = val

    X_df = pd.DataFrame([row])

    for col in numerical_imputer.feature_names_in_:
        if col not in X_df.columns:
            X_df[col] = 0.0
    X_df[numerical_imputer.feature_names_in_] = numerical_imputer.transform(
        X_df[numerical_imputer.feature_names_in_])

    for col, enc in categorical_encoders.items():
        if col not in X_df.columns:
            X_df[col] = 'missing'
        X_df[col] = X_df[col].astype(str).apply(lambda x: x if x in enc.classes_ else 'missing')
        if 'missing' not in enc.classes_:
            enc.classes_ = np.append(enc.classes_, 'missing')
        X_df[col] = enc.transform(X_df[col])

    for col in pca_scaler.feature_names_in_:
        if col not in X_df.columns:
            X_df[col] = 0.0
    X_scaled = pca_scaler.transform(X_df[pca_scaler.feature_names_in_])
    X_pca = pca_model.transform(X_scaled)

    # Predict exploitation types - take top 2 classes only
    y_proba = classifier.predict_proba(X_pca)
    top_preds = []
    for i, probs in enumerate(y_proba):
        top_preds.append((target_labels[i], probs[0][1]))  # probability of class 1
    top_preds_sorted = sorted(top_preds, key=lambda x: x[1], reverse=True)
    predicted_labels = [label for label, prob in top_preds_sorted[:3]]

    # Predict means of control with robust fallback
    means_pred_label = means_classifier.predict(X_pca)[0]
    if str(means_pred_label).strip().lower() in ['-99', 'not specified', 'unspecified']:
        proba = means_classifier.predict_proba(X_pca)[0]
        class_labels = means_classifier.classes_
        sorted_indices = np.argsort(proba)[::-1]
        for idx in sorted_indices:
            clean_label = str(class_labels[idx]).strip().lower()
            if clean_label not in ['-99', 'not specified', 'unspecified']:
                means_pred_label = class_labels[idx] 
                break

    return jsonify({
        'predicted_exploitation_types': predicted_labels,
        'predicted_means_of_control': means_pred_label
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
