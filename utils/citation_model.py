import numpy as np 
from scipy.optimize import curve_fit
from scipy.special import erf
import pandas as pd

# Parameters
#m = 50   Average number of references each new paper contains
def normalize_list_with_nan(data):
    # Convert to numpy array
    data = np.array(data, dtype=np.float64)
    
    # Mask for non-NaN values
    mask = ~np.isnan(data)
    
    # Normalize non-NaN values
    if np.any(mask):  # Ensure at least one non-NaN value exists
        min_val = np.min(data[mask])
        max_val = np.max(data[mask])
        
        if max_val != 0:#max_val != min_val:  # Avoid division by zero
            data[mask] = data[mask] /max_val #(data[mask] - min_val) / (max_val - min_val)
        else:
            data[mask] = 0  # If all values are the same, normalize to 0

    return data
# Cumulative normal distribution function (Φ(x))
def Phi(x):
    return 0.5 * (1 + erf(x / np.sqrt(2)))

# Equation 3 model function
def citation_model(t, lambda_i, mu_i, sigma_i, m):
    return m * (np.exp(lambda_i * Phi((np.log(t) - mu_i) / sigma_i)) - 1)

# Fitting function for each paper
def fit_citation_data(t_values, c_values, m, max_iter=None):
    # Initial guess for the parameters: lambda_i, mu_i, sigma_i
    initial_guess = [0.5, 2.0, 0.5]
    # Perform the curve fit
    def citation_model_t(t,  lambda_i, mu_i, sigma_i):
        return ( m * (np.exp(lambda_i * Phi((np.log(t) - mu_i) / sigma_i)) - 1))
    popt, pcov = curve_fit(citation_model_t, t_values, c_values, p0=initial_guess, bounds=(0, np.inf), maxfev=max_iter)
    return popt

def get_download_since_created(row):
    download = []
    created_date = pd.to_datetime(row["created_at"], utc=True).date() 
    for date in row.index:
        if date == "created_at" or date == "model":
            continue
        date_ts = pd.to_datetime(date, utc=True).date() 
        if created_date <  date_ts:
            download.append(row[date])
    original_length = len(download)
    while download and download[0] == 0:
        download.pop(0)
    return  [{"time_value": time, "actual_value": value} for time, value in enumerate(download[1:])]

def get_finetune_since_created(row):
    timeframe= ['0-month','1-month', '2-month', '3-month', '4-month', '5-month', '6-month', '7-month', '8-month', '9-month', '10-month', '11-month', '12-month', '13-month', '14-month', '15-month', '16-month', '17-month', '18-month', '19-month', '20-month', '21-month', '22-month', '23-month', '24-month', '25-month', '26-month', '27-month', '28-month', '29-month', '30-month', '31-month', '32-month', '33-month', '34-month']
    c_values_init = row[timeframe].values
    c_values_org = [float(x)  for x in c_values_init if pd.notna(x)]
    return  [{"time_value": time, "actual_value": value} for time, value in enumerate(c_values_org)] 