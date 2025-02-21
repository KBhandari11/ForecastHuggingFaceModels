from flask import Flask, request, jsonify, render_template
from json import JSONEncoder
from utils.citation_model import fit_citation_data, citation_model, get_download_since_created, get_finetune_since_created
import pandas as pd
import os

import numpy as np
np.seterr(divide='ignore')

class NpEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.int64):
            return float(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)


app = Flask(__name__, template_folder="templates", static_folder="static")
app.json_encoder = NpEncoder


DATA_DIR = "data/2025-02-18"
loaded_data = {} 
cached_time_series = {}  

def load_data(company, metric):
    """Loads the dataset into memory if not already loaded."""
    key = f"{company}_{metric}"
    if key not in loaded_data:
        file_path = os.path.join(DATA_DIR, metric, f"{company}.csv")
        if not os.path.exists(file_path):
            return None
        loaded_data[key] = pd.read_csv(file_path)
    return loaded_data[key]


@app.route("/")
def home():
    return render_template("index.html")

@app.route("/get_model_names", methods=["GET"])
def get_model_names():
    """Retrieve only model names based on selected company and metric"""
    company = request.args.get("company")
    metric = request.args.get("metric")

    if not company or not metric:
        return jsonify({"error": "Missing parameters"}), 400

    df = load_data(company, metric)

    if 'model' not in df.columns:
        return jsonify({"error": "Invalid CSV format"}), 400

    models = df['model'].unique().tolist()
    
    return jsonify(models)

@app.route("/get_time_series", methods=["GET"])
def get_time_series():
    """Retrieve time series data and generate predictions for a selected model"""
    company = request.args.get("company")
    metric = request.args.get("metric")
    model = request.args.get("model")
    
    if not company or not metric or not model:
        return jsonify({"error": "Missing parameters"}), 400

    df = load_data(company, metric)

    row = df[df['model'] == model].iloc[0,:]
    if metric == "finetune":
        timeseries = get_finetune_since_created(row)
    else:
        timeseries = get_download_since_created(row)
    key = f"{company}_{metric}_{model}"
    if key in cached_time_series:
        return jsonify({"time_series": cached_time_series[key][0], "created_date":cached_time_series[key][1]})
    cached_time_series[key] = timeseries, pd.to_datetime(row["created_at"]).strftime('%Y-%m-%d')  # Cache time series data
    return jsonify({"time_series": timeseries, "created_date":pd.to_datetime(row["created_at"]).strftime('%Y-%m-%d')})

@app.route("/get_predictions", methods=["GET"])
def get_predictions():
    company = request.args.get("company")
    metric = request.args.get("metric")
    model = request.args.get("model")
    points = request.args.get("points")
    future_range =  int(request.args.get("future_range")) 
    
    if not company or not metric or not model or not points:
        return jsonify({"error": "Missing parameters"}), 400
    
    key = f"{company}_{metric}_{model}"
    if key not in cached_time_series:
        return jsonify({"error": "Time series data not found. Please plot first."}), 400
    
    data, created_date = cached_time_series[key]
    df = pd.DataFrame(data)
    actual_t_values = df["time_value"].tolist()
    actual_c_values = df["actual_value"].tolist()
    points = len(actual_t_values) if points =="All" else int(points)
    t_values = actual_t_values[:points]
    c_values = actual_c_values[:points]
    try:
        try:
            lambda_i, mu_i, sigma_i = fit_citation_data(t_values, c_values, m =100)
        except RuntimeError:
            lambda_i, mu_i, sigma_i = fit_citation_data(t_values, c_values, m =100, max_iter=10000)

        future_dates = [d+1 for d in range(t_values[-1]+future_range+1)]
        predictions = citation_model(future_dates, lambda_i, mu_i, sigma_i, m=100).tolist()
    except:
        predictions = []
        future_dates = []
    #c_values = c_values + [0]*(len(future_dates)-len(c_values)) 
    return jsonify({
        "predicted_values": [{"time_value": time, "value": float(value)} for time, value in zip(future_dates, predictions)],
        "used_values": [{"time_value": time, "value": float(value)} for time, value in zip(t_values, c_values)],
        "actual_values": [{"time_value": time, "value": float(value)} for time, value in zip(actual_t_values, actual_c_values)],
        "created_date":created_date,
    })





if __name__ == "__main__":
    app.run(debug=True)
