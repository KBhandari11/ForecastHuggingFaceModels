document.addEventListener("DOMContentLoaded", function () {
    const companySelect = document.getElementById("company");
    const metricSelect = document.getElementById("metric");
    const modelSelect = document.getElementById("model");
    const resetButton = document.getElementById("resetData");
    const plotButton = document.getElementById("plotData");
    const predictButton = document.getElementById("predictData");
    const chartCanvasId = "plotCanvas"; 
    
    const companies = ["Microsoft", "Google", "Meta", "OpenAI", "AMAZON", "BAAI", "Allen_AI", "DeepSeek", "MistralAI", "StabilityAI", "Salesforce", "IBM", "Qwen", "Apple", "Nvidia", "HuggingFace", "CohereAI"];
    
    companies.forEach(company => {
        let option = document.createElement("option");
        option.value = company;
        option.textContent = company;
        companySelect.appendChild(option);
    });
    // Set default values
    companySelect.value = "DeepSeek";
    metricSelect.value = "download";

    updateModelDropdown().then(() => {
        if (modelSelect.options.length > 0) {
            modelSelect.value = modelSelect.options[0].value; // Set first model as default
        }
    });
    
    companySelect.addEventListener("change", updateModelDropdown);
    metricSelect.addEventListener("change", updateModelDropdown);
    resetButton.addEventListener("click", resetSelections);
    predictButton.addEventListener("click", predictData);
});

let chartInstance = null; // Store chart instance

async function updateModelDropdown() {
    const company = document.getElementById("company").value;
    const metric = document.getElementById("metric").value;
    const modelSelect = document.getElementById("model");

    if (!modelSelect) return;

    modelSelect.innerHTML = "";
    resetPredictionOptions();

    if (!company || !metric) return;

    const modelNames = await fetchModelNames(company, metric);
    if (!modelNames) return;

    modelNames.forEach(model => {
        let option = document.createElement("option");
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });

    // Select first model by default
    if (modelSelect.options.length > 0) {
        modelSelect.value = modelSelect.options[0].value;
    }
}



async function fetchModelNames(company, metric) {
    try {
        const response = await fetch(`/get_model_names?company=${company}&metric=${metric}`);
        const data = await response.json();
        if (data.error) {
            console.error("Error:", data.error);
            return null;
        }
        return data;
    } catch (error) {
        console.error("Fetch error:", error);
        return null;
    }
}



function resetPredictionOptions() {
    document.getElementById("predictionContainer").style.display = "none";
    document.getElementById("futureContainer").style.display = "none";
    document.getElementById("predictData").style.display = "none";
}


document.getElementById("plotData").addEventListener("click", async function () {
    const company = document.getElementById("company").value;
    const metric = document.getElementById("metric").value;
    const model = document.getElementById("model").value;
    
    if (!company || !metric || !model) return;
    

    // Disable dropdowns to prevent changes
    document.getElementById("company").disabled = true;
    document.getElementById("metric").disabled = true;
    document.getElementById("model").disabled = true;
    document.getElementById("plotData").disabled = true;

    const response = await fetch(`/get_time_series?company=${company}&metric=${metric}&model=${model}`);
    const data = await response.json();
    if (!data || data.error) return;
    
    const labels =  data.time_series.map(entry => entry.time_value);
    const actualValues = data.time_series.map(entry => entry.actual_value);
    const created_date = data.created_date

    const ctx = document.getElementById("plotCanvas").getContext("2d");
    let x_label = metric === "finetune" ? "Month after release" : "Days after release";
    // Destroy previous chart instance if it exists
    if (chartInstance !== null) {
        chartInstance.destroy();
        chartInstance = null;
    }
    chartInstance =new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: `Cummulative Number of ${metric}`,
                data: actualValues,
                borderColor: "blue",
                fill: false,
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                  display: true,
                  title: {
                    display: true,
                    text:  `${x_label}`,
                    font:{size:16},
                  }
                },
                y: {
                  display: true,
                  type: 'logarithmic',
                  title: {
                    display: true,
                    text:  `Cummulative Number of ${metric}`,
                    font:{size:16},
                  },
                },
            },
            plugins: {
                title: {
                    display: true,
                    text: `Model: ${model}`,
                    align: 'start',
                    font:{size:22, weight:'bold'},
                    padding: {
                        top: 30,
                    },
                },
                subtitle: {
                    display: true,
                    text: `Created Date: ${created_date}`,
                    align: 'start',
                    font:{size:18},
                }
            }
        }
    });

    // Populate prediction dropdowns
    populatePredictionDropdowns(metric);
});

function populatePredictionDropdowns(metric) {
    const predictionSelect = document.getElementById("predictionPoints");
    const futureSelect = document.getElementById("futureRange");

    if (!predictionSelect || !futureSelect) return;

    predictionSelect.innerHTML = "";
    let predictionOptions = metric === "finetune" ? [5, 10, 15, 20, "All"] : [5, 10, 50, 100, 200, "All"];
    predictionOptions.forEach(value => {
        let option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        predictionSelect.appendChild(option);
    });

    document.getElementById("predictionContainer").style.display = "block";

    futureSelect.innerHTML = "";
    let futureOptions = [10, 20, 30, 60, 90, 180, 365, 600];
    let time_val = metric === "finetune" ? "months" : "days"; 
    futureOptions.forEach(value => {
        let option = document.createElement("option");
        option.value = value;
        option.textContent = value + ` ${time_val}`;
        futureSelect.appendChild(option);
    });

    document.getElementById("futureContainer").style.display = "block";
    document.getElementById("predictData").style.display = "block";
}

document.getElementById("resetData").addEventListener("click", resetSelections);


function resetSelections() {
    document.getElementById("company").disabled = false;
    document.getElementById("metric").disabled = false;
    document.getElementById("model").disabled = false;
    document.getElementById("plotData").disabled = false;

    document.getElementById("company").value = "DeepSeek";
    document.getElementById("metric").value = "download";

    updateModelDropdown().then(() => {
        const modelSelect = document.getElementById("model");
        if (modelSelect.options.length > 0) {
            modelSelect.value = modelSelect.options[0].value;
        }
    });

    // Destroy the chart instance before clearing the canvas
    if (chartInstance !== null) {
        chartInstance.destroy();
        chartInstance = null;
    }

    const ctx = document.getElementById("plotCanvas").getContext("2d");
    ctx.clearRect(0, 0, document.getElementById("plotCanvas").width, document.getElementById("plotCanvas").height);
    
    document.getElementById("predictionContainer").style.display = "none";
    document.getElementById("futureContainer").style.display = "none";
    document.getElementById("predictData").style.display = "none";
}

document.getElementById("predictData").addEventListener("click", async function () {
    const company = document.getElementById("company").value;
    const metric = document.getElementById("metric").value;
    const model = document.getElementById("model").value;
    const predictionPoints = document.getElementById("predictionPoints").value;
    const futureRange = document.getElementById("futureRange").value;

    if (!company || !metric || !model || !predictionPoints || !futureRange) return;

    const response = await fetch(`/get_predictions?company=${company}&metric=${metric}&model=${model}&points=${predictionPoints}&future_range=${futureRange}`);
    const data = await response.json();
    if (!data || data.error) return;

    const labels = data.predicted_values.map(entry => entry.time_value);
    const predictedValues = data.predicted_values.map(entry => entry.value);
    const usedLabels = data.used_values.map(entry => entry.time_value);
    const usedValues = data.used_values.map(entry => entry.value);
    const actualValues = data.actual_values.map(entry => entry.value);
    const created_date = data.created_date
    let x_label = metric === "finetune" ? "Month after release" : "Days after release";
    const ctx = document.getElementById("plotCanvas").getContext("2d");
    // Destroy previous chart instance if it exists
    if (chartInstance !== null) {
        chartInstance.destroy();
        chartInstance = null;
    }
    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Used Data for Prediction`,
                    data: usedValues,
                    borderColor: "blue",
                    fill: false,
                    pointStyle: 'circle',
                    pointRadius: 4,
                    pointBackgroundColor: "blue",
                },
                {
                    label: `Actual Data for Prediction`,
                    data: actualValues,
                    borderColor: "green",
                    fill: false,
                    pointStyle: 'square',
                    pointRadius: 3,
                    pointBackgroundColor: "green",
                },
                {
                    label: `Predicted Cumulative Number of ${metric}`,
                    data: predictedValues,
                    borderColor: "red",
                    fill: false,
                    borderDash: [5, 5],
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                  display: true,
                  title: {
                    display: true,
                    text:  `${x_label}`,
                    font:{size:16},
                  }
                },
                y: {
                  display: true,
                  type: 'logarithmic',
                  title: {
                    display: true,
                    text:  `Cummulative Number of ${metric}`,
                    font:{size:16},
                  },
                },
            },
            plugins: {
                title: {
                    display: true,
                    text: `Model: ${model}`,
                    align: 'start',
                    font:{size:22, weight:'bold'},
                    padding: {
                        top: 30,
                    },
                },
                subtitle: {
                    display: true,
                    text: `Created Date: ${created_date}`,
                    align: 'start',
                    font:{size:18},
                }
            }
        }
    });
});

function clearPredictionPlot() {
    if (chartInstance !== null) {
        chartInstance.destroy();
        chartInstance = null;
    }
}
