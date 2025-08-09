// Global variables
let currentData = [];
let columns = [];
let correlationChart = null;
let uploadedFiles = [];
let selectedColumnsForExport = [];

// DOM elements
const fileInput = document.getElementById("fileInput");
const fileFormat = document.getElementById("fileFormat");
const loadDataBtn = document.getElementById("loadDataBtn");
const dataPreview = document.getElementById("dataPreview");
const formatColumn = document.getElementById("formatColumn");
const wrongDataColumn = document.getElementById("wrongDataColumn");
const downloadFormat = document.getElementById("downloadFormat");

// Initialize Dropzone
Dropzone.autoDiscover = false;
const dropzone = new Dropzone("#dropzone", {
  url: "/fake-url",
  autoProcessQueue: false,
  addRemoveLinks: true,
  maxFiles: 10,
  acceptedFiles: ".csv,.xlsx,.json",
  dictDefaultMessage: "Drop files here or click to upload",
  dictRemoveFile: "Remove file",
  init: function () {
    this.on("addedfile", function (file) {
      uploadedFiles.push(file);
      updateFileList();
    });
    this.on("removedfile", function (file) {
      uploadedFiles = uploadedFiles.filter((f) => f.name !== file.name);
      updateFileList();
    });
  },
});

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
  // File handling
  fileFormat.addEventListener("change", function () {
    document.querySelector(".csv-options").style.display =
      this.value === "csv" ? "block" : "none";
  });

  downloadFormat.addEventListener("change", function () {
    const showColumns = this.value !== "json";
    document.getElementById("columnSelection").style.display = showColumns
      ? "block"
      : "none";
    if (showColumns) {
      updateExportColumnList();
    }
  });

  loadDataBtn.addEventListener("click", loadData);

  // Basic cleaning operations
  document.querySelectorAll('input[name="emptyCells"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      document.getElementById("fillOptions").style.display =
        this.value === "fill" ? "block" : "none";
    });
  });

  document
    .getElementById("fillSpecificBtn")
    .addEventListener("click", function () {
      document.getElementById("specificFillOptions").style.display = "block";
    });

  document
    .getElementById("applySpecificFill")
    .addEventListener("click", applySpecificFill);
  document
    .getElementById("applyEmptyCells")
    .addEventListener("click", handleEmptyCells);

  // Statistics
  document
    .getElementById("calculateStats")
    .addEventListener("click", calculateStatistics);

  // Format conversion
  document
    .getElementById("applyFormat")
    .addEventListener("click", fixWrongFormat);

  // Wrong data
  document
    .getElementById("applyWrongDataFix")
    .addEventListener("click", fixWrongData);

  // Duplicates
  document
    .getElementById("removeDuplicates")
    .addEventListener("click", removeDuplicates);

  // Correlations
  document
    .getElementById("calculateCorrelations")
    .addEventListener("click", calculateCorrelations);

  // Download
  document
    .getElementById("downloadBtn")
    .addEventListener("click", downloadData);

  // Advanced cleaning operations
  document
    .getElementById("applyNAHandling")
    .addEventListener("click", handleNAValues);
  document
    .getElementById("applyScaling")
    .addEventListener("click", applyScaling);
  document
    .getElementById("applyTextProcessing")
    .addEventListener("click", processText);
  document
    .getElementById("applyDateProcessing")
    .addEventListener("click", processDates);
  document
    .getElementById("columnOperation")
    .addEventListener("change", toggleColumnOperation);
  document
    .getElementById("applyColumnOperation")
    .addEventListener("click", executeColumnOperation);
  document
    .getElementById("applyRegex")
    .addEventListener("click", applyRegexCleaning);
});

// Update the file list display
function updateFileList() {
  const fileList = document.createElement("div");
  fileList.className = "file-list";
  uploadedFiles.forEach((file) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.innerHTML = `
            <span>${file.name}</span>
            <small>${(file.size / 1024).toFixed(2)} KB</small>
        `;
    fileList.appendChild(fileItem);
  });

  const existingList = document.querySelector(".file-list");
  if (existingList) {
    existingList.replaceWith(fileList);
  } else {
    document.querySelector(".upload-options").appendChild(fileList);
  }
}

// Load data from files
async function loadData() {
  if (uploadedFiles.length === 0) {
    alert("Please select at least one file first");
    return;
  }

  const format =
    fileFormat.value === "auto"
      ? uploadedFiles[0].name.split(".").pop().toLowerCase()
      : fileFormat.value;

  const mergeFiles = document.getElementById("mergeFiles").checked;
  const delimiter = document.getElementById("csvDelimiter").value;

  try {
    let allData = [];

    for (const file of uploadedFiles) {
      const fileData = await readFile(file, format, delimiter);
      if (mergeFiles) {
        allData = allData.concat(fileData);
      } else {
        if (allData.length > 0) {
          alert(
            "Showing data from first file only (merge files option not checked)"
          );
          break;
        }
        allData = fileData;
      }
    }

    currentData = allData;

    if (currentData.length === 0) {
      throw new Error("No data found in the files");
    }

    // Get columns from first row
    columns = Object.keys(currentData[0]);
    updateColumnSelects();
    displayDataPreview();
  } catch (error) {
    alert("Error loading file: " + error.message);
    console.error(error);
  }
}

// Read a single file
function readFile(file, format, delimiter) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        let result;
        switch (format) {
          case "csv":
            const csvConfig = {
              header: true,
              skipEmptyLines: true,
              delimiter: delimiter === "auto" ? undefined : delimiter,
            };

            if (delimiter === "auto") {
              const firstLine = e.target.result.split("\n")[0];
              const possibleDelimiters = [",", "\t", ";", "|"];
              let detectedDelimiter = ",";
              let maxCount = 0;

              for (const delim of possibleDelimiters) {
                const count = firstLine.split(delim).length;
                if (count > maxCount) {
                  maxCount = count;
                  detectedDelimiter = delim;
                }
              }

              csvConfig.delimiter = detectedDelimiter;
              console.log(`Detected delimiter: ${detectedDelimiter}`);
            }

            result = Papa.parse(e.target.result, csvConfig);
            resolve(result.data);
            break;
          case "xlsx":
            const workbook = XLSX.read(e.target.result, { type: "binary" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(firstSheet));
            break;
          case "json":
            resolve(JSON.parse(e.target.result));
            break;
          default:
            reject(new Error("Unsupported file format"));
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = function () {
      reject(new Error("Error reading file"));
    };

    if (format === "xlsx") {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  });
}

// Update all column selects in the UI
function updateColumnSelects() {
  const selects = [
    "formatColumn",
    "wrongDataColumn",
    "naHandlingColumn",
    "scalingColumn",
    "textProcessingColumn",
    "dateColumn",
    "splitColumn",
    "mergeColumns",
    "regexColumn",
  ];

  selects.forEach((selectId) => {
    const select = document.getElementById(selectId);
    if (select) {
      select.innerHTML = "";
      columns.forEach((col) => {
        const option = document.createElement("option");
        option.value = col;
        option.textContent = col;
        select.appendChild(option);
      });

      if (selectId === "mergeColumns") {
        select.multiple = true;
      }
    }
  });
}

// Display data preview
function displayDataPreview() {
  if (currentData.length === 0) {
    dataPreview.innerHTML = "<p>No data to display</p>";
    return;
  }

  let html = "<table><thead><tr>";

  // Header row
  columns.forEach((col) => {
    html += `<th>${col}</th>`;
  });
  html += "</tr></thead><tbody>";

  // Data rows (limit to 20 for preview)
  const previewRows = currentData.slice(0, 20);
  previewRows.forEach((row) => {
    html += "<tr>";
    columns.forEach((col) => {
      const value = row[col];
      let displayValue = value === undefined || value === null ? "" : value;

      // Format numbers to 2 decimal places
      if (typeof value === "number") {
        displayValue = Number.isInteger(value) ? value : value.toFixed(2);
      }

      html += `<td>${displayValue}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";

  if (currentData.length > 20) {
    html += `<p>Showing 20 of ${currentData.length} rows</p>`;
  }

  dataPreview.innerHTML = html;
}

// Handle empty cells operations
function handleEmptyCells() {
  const method = document.querySelector(
    'input[name="emptyCells"]:checked'
  ).value;

  if (method === "delete") {
    // Delete rows with any empty cells
    currentData = currentData.filter((row) => {
      return columns.every((col) => {
        const value = row[col];
        return value !== undefined && value !== null && value !== "";
      });
    });
  } else {
    const fillValue = document.getElementById("fillValue").value;
    if (!fillValue) {
      alert("Please enter a fill value");
      return;
    }

    // Fill all empty cells with the specified value
    currentData.forEach((row) => {
      columns.forEach((col) => {
        if (row[col] === undefined || row[col] === null || row[col] === "") {
          row[col] = fillValue;
        }
      });
    });
  }

  displayDataPreview();
}

// Apply specific fill values to columns
function applySpecificFill() {
  const fillValuesText = document.getElementById("columnFillValues").value;

  try {
    const fillValues = JSON.parse(fillValuesText);

    currentData.forEach((row) => {
      for (const [col, val] of Object.entries(fillValues)) {
        if (
          columns.includes(col) &&
          (row[col] === undefined || row[col] === null || row[col] === "")
        ) {
          row[col] = val;
        }
      }
    });

    displayDataPreview();
  } catch (error) {
    alert(
      'Invalid JSON format for fill values. Example: {"Column1": "Value1", "Column2": 0}'
    );
  }
}

// Calculate statistics for numeric columns
function calculateStatistics() {
  const numericColumns = columns.filter((col) => {
    return currentData.some((row) => {
      const val = row[col];
      return !isNaN(parseFloat(val)) && isFinite(val);
    });
  });

  if (numericColumns.length === 0) {
    document.getElementById("statsResults").innerHTML =
      "<p>No numeric columns found for statistics</p>";
    return;
  }

  let html =
    '<table class="stats-table"><thead><tr><th>Column</th><th>Count</th><th>Mean</th><th>Median</th><th>Mode</th><th>Std Dev</th><th>Min</th><th>Max</th></tr></thead><tbody>';

  numericColumns.forEach((col) => {
    const values = currentData
      .map((row) => parseFloat(row[col]))
      .filter((val) => !isNaN(val));

    if (values.length === 0) return;

    const count = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / count;

    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(count / 2)];

    // Mode
    const frequency = {};
    let maxFreq = 0;
    let mode = values[0];
    values.forEach((val) => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
        mode = val;
      }
    });

    // Standard deviation
    const stdDev = Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count
    );

    const min = Math.min(...values);
    const max = Math.max(...values);

    html += `<tr>
            <td>${col}</td>
            <td>${count}</td>
            <td>${mean.toFixed(2)}</td>
            <td>${median.toFixed(2)}</td>
            <td>${mode.toFixed(2)}</td>
            <td>${stdDev.toFixed(2)}</td>
            <td>${min.toFixed(2)}</td>
            <td>${max.toFixed(2)}</td>
        </tr>`;
  });

  html += "</tbody></table>";
  document.getElementById("statsResults").innerHTML = html;
}

// Fix wrong format data
function fixWrongFormat() {
  const column = formatColumn.value;
  const convertTo = document.getElementById("convertTo").value;

  currentData.forEach((row) => {
    const value = row[column];
    if (value === undefined || value === null || value === "") return;

    try {
      switch (convertTo) {
        case "string":
          row[column] = String(value);
          break;
        case "number":
          row[column] = parseFloat(value);
          break;
        case "date":
          const date = new Date(value);
          row[column] = isNaN(date.getTime()) ? value : date.toISOString();
          break;
        case "boolean":
          row[column] = Boolean(value);
          break;
      }
    } catch (error) {
      console.error(`Error converting ${value} to ${convertTo}`);
    }
  });

  displayDataPreview();
}

// Fix wrong data based on conditions
function fixWrongData() {
  const column = wrongDataColumn.value;
  const condition = document.getElementById("wrongDataCondition").value;
  const conditionValue = document.getElementById("wrongDataValue").value;
  const action = document.getElementById("wrongDataAction").value;
  const replaceValue = document.getElementById("wrongDataReplaceValue").value;

  if (action === "replace" && !replaceValue) {
    alert("Please enter a replacement value");
    return;
  }

  // Convert condition value to number if the column appears numeric
  const isNumeric = currentData.some((row) => {
    const val = row[column];
    return !isNaN(parseFloat(val)) && isFinite(val);
  });

  const compareValue = isNumeric ? parseFloat(conditionValue) : conditionValue;

  if (action === "delete") {
    // Filter out rows that match the condition
    currentData = currentData.filter((row) => {
      const val = isNumeric ? parseFloat(row[column]) : row[column];

      if (isNaN(val)) return true; // Keep if not a number when expected

      switch (condition) {
        case "greater":
          return val <= compareValue;
        case "less":
          return val >= compareValue;
        case "equal":
          return val != compareValue;
        case "contains":
          return typeof val === "string" ? !val.includes(compareValue) : true;
        default:
          return true;
      }
    });
  } else {
    // Replace values that match the condition
    currentData.forEach((row) => {
      let val = isNumeric ? parseFloat(row[column]) : row[column];

      if (isNaN(val)) return; // Skip if not a number when expected

      let shouldReplace = false;

      switch (condition) {
        case "greater":
          shouldReplace = val > compareValue;
          break;
        case "less":
          shouldReplace = val < compareValue;
          break;
        case "equal":
          shouldReplace = val == compareValue;
          break;
        case "contains":
          shouldReplace =
            typeof val === "string" ? val.includes(compareValue) : false;
          break;
      }

      if (shouldReplace) {
        row[column] = replaceValue;
      }
    });
  }

  displayDataPreview();
}

// Remove duplicate rows
function removeDuplicates() {
  const uniqueRows = [];
  const seen = new Set();

  currentData.forEach((row) => {
    const key = columns.map((col) => String(row[col])).join("|");
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  });

  const duplicatesRemoved = currentData.length - uniqueRows.length;
  currentData = uniqueRows;

  document.getElementById(
    "duplicatesInfo"
  ).innerHTML = `<p>Removed ${duplicatesRemoved} duplicate rows</p>`;

  displayDataPreview();
}

// Calculate correlations between numeric columns
function calculateCorrelations() {
  const numericColumns = columns.filter((col) => {
    return currentData.some((row) => {
      const val = row[col];
      return !isNaN(parseFloat(val)) && isFinite(val);
    });
  });

  if (numericColumns.length < 2) {
    document.getElementById("correlationResults").innerHTML =
      "<p>Need at least 2 numeric columns for correlation</p>";
    return;
  }

  // Calculate correlation matrix
  const correlationMatrix = {};
  numericColumns.forEach((col1) => {
    correlationMatrix[col1] = {};
    numericColumns.forEach((col2) => {
      if (col1 === col2) {
        correlationMatrix[col1][col2] = 1;
        return;
      }

      if (correlationMatrix[col2] && correlationMatrix[col2][col1]) {
        correlationMatrix[col1][col2] = correlationMatrix[col2][col1];
        return;
      }

      const values1 = currentData.map((row) => parseFloat(row[col1]));
      const values2 = currentData.map((row) => parseFloat(row[col2]));

      correlationMatrix[col1][col2] = pearsonCorrelation(values1, values2);
    });
  });

  // Display correlation matrix
  let html = '<table class="stats-table"><thead><tr><th>Column</th>';
  numericColumns.forEach((col) => {
    html += `<th>${col}</th>`;
  });
  html += "</tr></thead><tbody>";

  numericColumns.forEach((col1) => {
    html += `<tr><td>${col1}</td>`;
    numericColumns.forEach((col2) => {
      const corr = correlationMatrix[col1][col2];
      const color = corr > 0.7 ? "green" : corr < -0.7 ? "red" : "black";
      html += `<td style="color:${color}">${corr.toFixed(2)}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  document.getElementById("correlationResults").innerHTML = html;

  // Create correlation heatmap chart
  createCorrelationChart(numericColumns, correlationMatrix);
}

// Pearson correlation coefficient
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);

  const sumXSquare = x.reduce((a, b) => a + b * b, 0);
  const sumYSquare = y.reduce((a, b) => a + b * b, 0);

  const sumXY = x.reduce((a, val, i) => a + val * y[i], 0);

  const numerator = sumXY - (sumX * sumY) / n;
  const denominator = Math.sqrt(
    (sumXSquare - (sumX * sumX) / n) * (sumYSquare - (sumY * sumY) / n)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

// Create correlation heatmap chart
function createCorrelationChart(columns, correlationMatrix) {
  const ctx = document.getElementById("correlationChart").getContext("2d");

  // Destroy previous chart if exists
  if (correlationChart) {
    correlationChart.destroy();
  }

  // Prepare data for chart
  const labels = columns;
  const data = columns.map((col1) => {
    return columns.map((col2) => correlationMatrix[col1][col2]);
  });

  correlationChart = new Chart(ctx, {
    type: "heatmap",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Correlation",
          data: data,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.label}: ${context.raw.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Columns",
          },
        },
        y: {
          title: {
            display: true,
            text: "Columns",
          },
        },
      },
    },
  });
}

// Update the export column list
function updateExportColumnList() {
  const container = document.getElementById("exportColumnsList");
  container.innerHTML = "";

  columns.forEach((col) => {
    const checkboxId = `export-col-${col}`;
    const isChecked =
      selectedColumnsForExport.includes(col) ||
      selectedColumnsForExport.length === 0;

    if (isChecked && selectedColumnsForExport.length === 0) {
      selectedColumnsForExport.push(col);
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = checkboxId;
    checkbox.value = col;
    checkbox.checked = isChecked;
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        selectedColumnsForExport.push(col);
      } else {
        selectedColumnsForExport = selectedColumnsForExport.filter(
          (c) => c !== col
        );
      }
    });

    const label = document.createElement("label");
    label.htmlFor = checkboxId;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(col));

    container.appendChild(label);
  });
}

// Download processed data with column selection
function downloadData() {
  if (currentData.length === 0) {
    alert("No data to download");
    return;
  }

  const format = document.getElementById("downloadFormat").value;
  let data, mimeType, extension;

  // Filter data based on selected columns
  let dataToExport;
  if (selectedColumnsForExport.length > 0 && format !== "json") {
    dataToExport = currentData.map((row) => {
      const filteredRow = {};
      selectedColumnsForExport.forEach((col) => {
        filteredRow[col] = row[col];
      });
      return filteredRow;
    });
  } else {
    dataToExport = currentData;
  }

  switch (format) {
    case "csv":
      data = Papa.unparse(dataToExport);
      mimeType = "text/csv";
      extension = "csv";
      break;
    case "xlsx":
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      mimeType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      extension = "xlsx";
      break;
    case "json":
      data = JSON.stringify(dataToExport, null, 2);
      mimeType = "application/json";
      extension = "json";
      break;
  }

  const blob =
    format === "xlsx"
      ? new Blob([data], { type: mimeType })
      : new Blob([data], { type: mimeType + ";charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `processed_data.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Advanced Missing Data Handling
function handleNAValues() {
  const column = document.getElementById("naHandlingColumn").value;
  const method = document.getElementById("naHandlingMethod").value;

  if (!column) {
    alert("Please select a column");
    return;
  }

  // Get all values from the column (excluding NA)
  const values = currentData
    .map((row) => parseFloat(row[column]))
    .filter((val) => !isNaN(val));

  if (
    values.length === 0 &&
    method !== "interpolate" &&
    method !== "timeInterpolate"
  ) {
    alert("No numeric values found in this column");
    return;
  }

  let fillValue;
  switch (method) {
    case "mean":
      fillValue = values.reduce((a, b) => a + b, 0) / values.length;
      break;
    case "median":
      const sorted = [...values].sort((a, b) => a - b);
      fillValue = sorted[Math.floor(sorted.length / 2)];
      break;
    case "mode":
      const frequency = {};
      let maxFreq = 0;
      fillValue = values[0];
      values.forEach((val) => {
        frequency[val] = (frequency[val] || 0) + 1;
        if (frequency[val] > maxFreq) {
          maxFreq = frequency[val];
          fillValue = val;
        }
      });
      break;
    case "interpolate":
    case "timeInterpolate":
      // Linear interpolation will be handled per row
      break;
  }

  if (method === "interpolate" || method === "timeInterpolate") {
    // Implement linear interpolation
    let prevValue = null;
    let nextValue = null;
    let prevIndex = -1;

    // First pass to find next non-NA values
    const indicesToFill = [];
    currentData.forEach((row, index) => {
      const val = parseFloat(row[column]);
      if (!isNaN(val)) {
        if (prevValue === null) {
          // Fill leading NAs with first valid value
          for (let i = 0; i < index; i++) {
            currentData[i][column] = val;
          }
        } else if (indicesToFill.length > 0) {
          // We have a next value, so interpolate
          nextValue = val;
          const steps = index - prevIndex;
          indicesToFill.forEach((fillIndex, i) => {
            const ratio = (i + 1) / steps;
            currentData[fillIndex][column] =
              prevValue + (nextValue - prevValue) * ratio;
          });
          indicesToFill.length = 0;
        }
        prevValue = val;
        prevIndex = index;
      } else {
        indicesToFill.push(index);
      }
    });

    // Fill trailing NAs with last valid value
    if (prevValue !== null && indicesToFill.length > 0) {
      indicesToFill.forEach((index) => {
        currentData[index][column] = prevValue;
      });
    }
  } else {
    // Fill with calculated value
    currentData.forEach((row) => {
      if (isNaN(parseFloat(row[column]))) {
        row[column] = fillValue;
      }
    });
  }

  displayDataPreview();
}

// Data Normalization & Scaling
function applyScaling() {
  const column = document.getElementById("scalingColumn").value;
  const method = document.getElementById("scalingMethod").value;

  if (!column) {
    alert("Please select a column");
    return;
  }

  // Get all values from the column
  const values = currentData
    .map((row) => parseFloat(row[column]))
    .filter((val) => !isNaN(val));

  if (values.length === 0) {
    alert("No numeric values found in this column");
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  );

  currentData.forEach((row) => {
    const val = parseFloat(row[column]);
    if (!isNaN(val)) {
      if (method === "minmax") {
        row[column] = (val - min) / (max - min);
      } else if (method === "zscore") {
        row[column] = stdDev !== 0 ? (val - mean) / stdDev : 0;
      }
    }
  });

  displayDataPreview();
}

// Text Processing
function processText() {
  const column = document.getElementById("textProcessingColumn").value;
  const operation = document.getElementById("textProcessingOperation").value;

  if (!column) {
    alert("Please select a column");
    return;
  }

  currentData.forEach((row) => {
    if (row[column] !== undefined && row[column] !== null) {
      let text = String(row[column]);

      switch (operation) {
        case "trim":
          text = text.trim();
          break;
        case "removeSpecial":
          text = text.replace(/[^\w\s]/gi, "");
          break;
        case "uppercase":
          text = text.toUpperCase();
          break;
        case "lowercase":
          text = text.toLowerCase();
          break;
        case "titlecase":
          text = text.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
          });
          break;
      }

      row[column] = text;
    }
  });

  displayDataPreview();
}

// Date/Time Processing
function processDates() {
  const column = document.getElementById("dateColumn").value;
  const operation = document.getElementById("dateOperation").value;

  if (!column) {
    alert("Please select a column");
    return;
  }

  if (operation === "autoDetect") {
    let detectedFormat = "";
    // Try to parse dates to detect format
    const sampleValue = currentData.find((row) => row[column])?.[column];

    if (sampleValue) {
      const date = new Date(sampleValue);
      if (!isNaN(date.getTime())) {
        detectedFormat = "ISO format detected";
      } else {
        // Try other common formats
        const formats = [
          { regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/, desc: "MM/DD/YYYY" },
          { regex: /^\d{4}-\d{1,2}-\d{1,2}$/, desc: "YYYY-MM-DD" },
          { regex: /^\d{1,2}-\d{1,2}-\d{4}$/, desc: "DD-MM-YYYY" },
        ];

        const matchedFormat = formats.find((f) => f.regex.test(sampleValue));
        if (matchedFormat) {
          detectedFormat = matchedFormat.desc;
        }
      }
    }

    document.getElementById("dateFormatInfo").innerHTML = detectedFormat
      ? `Detected format: ${detectedFormat}`
      : "Could not detect date format";
    return;
  }

  currentData.forEach((row) => {
    if (row[column]) {
      const date = new Date(row[column]);
      if (!isNaN(date.getTime())) {
        switch (operation) {
          case "extractYear":
            row[column] = date.getFullYear();
            break;
          case "extractMonth":
            row[column] = date.getMonth() + 1; // Months are 0-indexed
            break;
          case "extractDay":
            row[column] = date.getDate();
            break;
          case "extractWeekday":
            const weekdays = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            row[column] = weekdays[date.getDay()];
            break;
        }
      }
    }
  });

  displayDataPreview();
}

// Column Operations
function toggleColumnOperation() {
  const operation = document.getElementById("columnOperation").value;
  document.getElementById("splitOptions").style.display =
    operation === "split" ? "block" : "none";
  document.getElementById("mergeOptions").style.display =
    operation === "merge" ? "block" : "none";
}

function executeColumnOperation() {
  const operation = document.getElementById("columnOperation").value;

  if (operation === "split") {
    splitColumn();
  } else if (operation === "merge") {
    mergeColumns();
  }
}

function splitColumn() {
  const column = document.getElementById("splitColumn").value;
  const separator = document.getElementById("splitSeparator").value;
  const newNames = document
    .getElementById("newColumnNames")
    .value.split(",")
    .map((name) => name.trim())
    .filter((name) => name);

  if (!column || !separator || newNames.length < 2) {
    alert("Please provide column, separator, and at least 2 new column names");
    return;
  }

  currentData.forEach((row) => {
    if (row[column]) {
      const parts = String(row[column]).split(separator);
      for (let i = 0; i < Math.min(parts.length, newNames.length); i++) {
        row[newNames[i]] = parts[i].trim();
      }
    }
  });

  // Update columns list
  columns = Object.keys(currentData[0]);
  updateColumnSelects();
  displayDataPreview();
}

function mergeColumns() {
  const selectedOptions = Array.from(
    document.getElementById("mergeColumns").selectedOptions
  );
  const columnsToMerge = selectedOptions.map((option) => option.value);
  const separator = document.getElementById("mergeSeparator").value;
  const newName = document.getElementById("mergedColumnName").value;

  if (columnsToMerge.length < 2 || !separator || !newName) {
    alert(
      "Please select at least 2 columns, provide a separator, and a new column name"
    );
    return;
  }

  currentData.forEach((row) => {
    const values = columnsToMerge.map((col) => row[col] || "");
    row[newName] = values.join(separator);
  });

  // Update columns list
  columns = Object.keys(currentData[0]);
  updateColumnSelects();
  displayDataPreview();
}

// Regex-Based Cleaning
function applyRegexCleaning() {
  const column = document.getElementById("regexColumn").value;
  const pattern = document.getElementById("regexPattern").value;
  const replacement = document.getElementById("regexReplacement").value;

  if (!column || !pattern) {
    alert("Please select a column and provide a regex pattern");
    return;
  }

  let regex;
  try {
    regex = new RegExp(pattern, "g");
  } catch (e) {
    alert("Invalid regular expression: " + e.message);
    return;
  }

  currentData.forEach((row) => {
    if (row[column] !== undefined && row[column] !== null) {
      row[column] = String(row[column]).replace(regex, replacement);
    }
  });

  displayDataPreview();
}
