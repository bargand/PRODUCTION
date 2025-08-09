// Global variables
let currentData = [];
let columns = [];
let correlationChart = null;

// DOM elements
const fileInput = document.getElementById('fileInput');
const fileFormat = document.getElementById('fileFormat');
const loadDataBtn = document.getElementById('loadDataBtn');
const dataPreview = document.getElementById('dataPreview');
const formatColumn = document.getElementById('formatColumn');
const wrongDataColumn = document.getElementById('wrongDataColumn');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    loadDataBtn.addEventListener('click', loadData);
    
    // Empty cells operations
    document.querySelectorAll('input[name="emptyCells"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('fillOptions').style.display = 
                this.value === 'fill' ? 'block' : 'none';
        });
    });
    
    document.getElementById('fillSpecificBtn').addEventListener('click', function() {
        document.getElementById('specificFillOptions').style.display = 'block';
    });
    
    document.getElementById('applySpecificFill').addEventListener('click', applySpecificFill);
    document.getElementById('applyEmptyCells').addEventListener('click', handleEmptyCells);
    
    // Statistics
    document.getElementById('calculateStats').addEventListener('click', calculateStatistics);
    
    // Format conversion
    document.getElementById('applyFormat').addEventListener('click', fixWrongFormat);
    
    // Wrong data
    document.getElementById('applyWrongDataFix').addEventListener('click', fixWrongData);
    
    // Duplicates
    document.getElementById('removeDuplicates').addEventListener('click', removeDuplicates);
    
    // Correlations
    document.getElementById('calculateCorrelations').addEventListener('click', calculateCorrelations);
    
    // Download
    document.getElementById('downloadBtn').addEventListener('click', downloadData);
});

// Load data from file
function loadData() {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file first');
        return;
    }
    
    const format = fileFormat.value === 'auto' ? 
        file.name.split('.').pop().toLowerCase() : 
        fileFormat.value;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let result;
            switch(format) {
                case 'csv':
                    result = Papa.parse(e.target.result, {
                        header: true,
                        skipEmptyLines: true
                    });
                    currentData = result.data;
                    break;
                case 'xlsx':
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    currentData = XLSX.utils.sheet_to_json(firstSheet);
                    break;
                case 'json':
                    currentData = JSON.parse(e.target.result);
                    break;
                default:
                    throw new Error('Unsupported file format');
            }
            
            if (currentData.length === 0) {
                throw new Error('No data found in the file');
            }
            
            // Get columns from first row
            columns = Object.keys(currentData[0]);
            updateColumnSelects();
            displayDataPreview();
            
        } catch (error) {
            alert('Error loading file: ' + error.message);
            console.error(error);
        }
    };
    
    if (format === 'xlsx') {
        reader.readAsBinaryString(file);
    } else {
        reader.readAsText(file);
    }
}

// Update column selects in the UI
function updateColumnSelects() {
    formatColumn.innerHTML = '';
    wrongDataColumn.innerHTML = '';
    
    columns.forEach(col => {
        formatColumn.innerHTML += `<option value="${col}">${col}</option>`;
        wrongDataColumn.innerHTML += `<option value="${col}">${col}</option>`;
    });
}

// Display data preview
function displayDataPreview() {
    if (currentData.length === 0) {
        dataPreview.innerHTML = '<p>No data to display</p>';
        return;
    }
    
    let html = '<table><thead><tr>';
    
    // Header row
    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Data rows (limit to 20 for preview)
    const previewRows = currentData.slice(0, 20);
    previewRows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            const value = row[col];
            html += `<td>${value === undefined || value === null ? '' : value}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    if (currentData.length > 20) {
        html += `<p>Showing 20 of ${currentData.length} rows</p>`;
    }
    
    dataPreview.innerHTML = html;
}

// Handle empty cells operations
function handleEmptyCells() {
    const method = document.querySelector('input[name="emptyCells"]:checked').value;
    
    if (method === 'delete') {
        // Delete rows with any empty cells
        currentData = currentData.filter(row => {
            return columns.every(col => {
                const value = row[col];
                return value !== undefined && value !== null && value !== '';
            });
        });
    } else {
        const fillValue = document.getElementById('fillValue').value;
        if (!fillValue) {
            alert('Please enter a fill value');
            return;
        }
        
        // Fill all empty cells with the specified value
        currentData.forEach(row => {
            columns.forEach(col => {
                if (row[col] === undefined || row[col] === null || row[col] === '') {
                    row[col] = fillValue;
                }
            });
        });
    }
    
    displayDataPreview();
}

// Apply specific fill values to columns
function applySpecificFill() {
    const fillValuesText = document.getElementById('columnFillValues').value;
    
    try {
        const fillValues = JSON.parse(fillValuesText);
        
        currentData.forEach(row => {
            for (const [col, val] of Object.entries(fillValues)) {
                if (columns.includes(col) && (row[col] === undefined || row[col] === null || row[col] === '')) {
                    row[col] = val;
                }
            }
        });
        
        displayDataPreview();
    } catch (error) {
        alert('Invalid JSON format for fill values. Example: {"Column1": "Value1", "Column2": 0}');
    }
}

// Calculate statistics for numeric columns
function calculateStatistics() {
    const numericColumns = columns.filter(col => {
        return currentData.some(row => {
            const val = row[col];
            return !isNaN(parseFloat(val)) && isFinite(val);
        });
    });
    
    if (numericColumns.length === 0) {
        document.getElementById('statsResults').innerHTML = '<p>No numeric columns found for statistics</p>';
        return;
    }
    
    let html = '<table class="stats-table"><thead><tr><th>Column</th><th>Count</th><th>Mean</th><th>Median</th><th>Mode</th><th>Std Dev</th><th>Min</th><th>Max</th></tr></thead><tbody>';
    
    numericColumns.forEach(col => {
        const values = currentData
            .map(row => parseFloat(row[col]))
            .filter(val => !isNaN(val));
        
        if (values.length === 0) return;
        
        const count = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / count;
        
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(count / 2)];
        
        // Mode
        const frequency = {};
        let maxFreq = 0;
        let mode = values[0];
        values.forEach(val => {
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
    
    html += '</tbody></table>';
    document.getElementById('statsResults').innerHTML = html;
}

// Fix wrong format data
function fixWrongFormat() {
    const column = formatColumn.value;
    const convertTo = document.getElementById('convertTo').value;
    
    currentData.forEach(row => {
        const value = row[column];
        if (value === undefined || value === null || value === '') return;
        
        try {
            switch(convertTo) {
                case 'string':
                    row[column] = String(value);
                    break;
                case 'number':
                    row[column] = parseFloat(value);
                    break;
                case 'date':
                    row[column] = new Date(value).toISOString();
                    break;
                case 'boolean':
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
    const condition = document.getElementById('wrongDataCondition').value;
    const conditionValue = document.getElementById('wrongDataValue').value;
    const action = document.getElementById('wrongDataAction').value;
    const replaceValue = document.getElementById('wrongDataReplaceValue').value;
    
    if (action === 'replace' && !replaceValue) {
        alert('Please enter a replacement value');
        return;
    }
    
    // Convert condition value to number if the column appears numeric
    const isNumeric = currentData.some(row => {
        const val = row[column];
        return !isNaN(parseFloat(val)) && isFinite(val);
    });
    
    const compareValue = isNumeric ? parseFloat(conditionValue) : conditionValue;
    
    if (action === 'delete') {
        // Filter out rows that match the condition
        currentData = currentData.filter(row => {
            const val = isNumeric ? parseFloat(row[column]) : row[column];
            
            if (isNaN(val)) return true; // Keep if not a number when expected
            
            switch(condition) {
                case 'greater': return val <= compareValue;
                case 'less': return val >= compareValue;
                case 'equal': return val != compareValue;
                case 'contains': 
                    return typeof val === 'string' ? 
                        !val.includes(compareValue) : 
                        true;
                default: return true;
            }
        });
    } else {
        // Replace values that match the condition
        currentData.forEach(row => {
            let val = isNumeric ? parseFloat(row[column]) : row[column];
            
            if (isNaN(val)) return; // Skip if not a number when expected
            
            let shouldReplace = false;
            
            switch(condition) {
                case 'greater': 
                    shouldReplace = val > compareValue;
                    break;
                case 'less': 
                    shouldReplace = val < compareValue;
                    break;
                case 'equal': 
                    shouldReplace = val == compareValue;
                    break;
                case 'contains': 
                    shouldReplace = typeof val === 'string' ? 
                        val.includes(compareValue) : 
                        false;
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
    
    currentData.forEach(row => {
        const key = columns.map(col => String(row[col])).join('|');
        if (!seen.has(key)) {
            seen.add(key);
            uniqueRows.push(row);
        }
    });
    
    const duplicatesRemoved = currentData.length - uniqueRows.length;
    currentData = uniqueRows;
    
    document.getElementById('duplicatesInfo').innerHTML = 
        `<p>Removed ${duplicatesRemoved} duplicate rows</p>`;
    
    displayDataPreview();
}

// Calculate correlations between numeric columns
function calculateCorrelations() {
    const numericColumns = columns.filter(col => {
        return currentData.some(row => {
            const val = row[col];
            return !isNaN(parseFloat(val)) && isFinite(val);
        });
    });
    
    if (numericColumns.length < 2) {
        document.getElementById('correlationResults').innerHTML = 
            '<p>Need at least 2 numeric columns for correlation</p>';
        return;
    }
    
    // Calculate correlation matrix
    const correlationMatrix = {};
    numericColumns.forEach(col1 => {
        correlationMatrix[col1] = {};
        numericColumns.forEach(col2 => {
            if (col1 === col2) {
                correlationMatrix[col1][col2] = 1;
                return;
            }
            
            if (correlationMatrix[col2] && correlationMatrix[col2][col1]) {
                correlationMatrix[col1][col2] = correlationMatrix[col2][col1];
                return;
            }
            
            const values1 = currentData.map(row => parseFloat(row[col1]));
            const values2 = currentData.map(row => parseFloat(row[col2]));
            
            correlationMatrix[col1][col2] = pearsonCorrelation(values1, values2);
        });
    });
    
    // Display correlation matrix
    let html = '<table class="stats-table"><thead><tr><th>Column</th>';
    numericColumns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    numericColumns.forEach(col1 => {
        html += `<tr><td>${col1}</td>`;
        numericColumns.forEach(col2 => {
            const corr = correlationMatrix[col1][col2];
            const color = corr > 0.7 ? 'green' : corr < -0.7 ? 'red' : 'black';
            html += `<td style="color:${color}">${corr.toFixed(2)}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    document.getElementById('correlationResults').innerHTML = html;
    
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
    
    const numerator = sumXY - (sumX * sumY / n);
    const denominator = Math.sqrt(
        (sumXSquare - sumX * sumX / n) * 
        (sumYSquare - sumY * sumY / n)
    );
    
    return denominator === 0 ? 0 : numerator / denominator;
}

// Create correlation heatmap chart
function createCorrelationChart(columns, correlationMatrix) {
    const ctx = document.getElementById('correlationChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (correlationChart) {
        correlationChart.destroy();
    }
    
    // Prepare data for chart
    const labels = columns;
    const data = columns.map(col1 => {
        return columns.map(col2 => correlationMatrix[col1][col2]);
    });
    
    correlationChart = new Chart(ctx, {
        type: 'heatmap',
        data: {
            labels: labels,
            datasets: [{
                label: 'Correlation',
                data: data,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Columns'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Columns'
                    }
                }
            }
        }
    });
}

// Download processed data
function downloadData() {
    if (currentData.length === 0) {
        alert('No data to download');
        return;
    }
    
    const format = document.getElementById('downloadFormat').value;
    let data, mimeType, extension;
    
    switch(format) {
        case 'csv':
            data = Papa.unparse(currentData);
            mimeType = 'text/csv';
            extension = 'csv';
            break;
        case 'xlsx':
            // Create worksheet and workbook
            const ws = XLSX.utils.json_to_sheet(currentData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            extension = 'xlsx';
            break;
        case 'json':
            data = JSON.stringify(currentData, null, 2);
            mimeType = 'application/json';
            extension = 'json';
            break;
    }
    
    const blob = format === 'xlsx' ? 
        new Blob([data], { type: mimeType }) :
        new Blob([data], { type: mimeType + ';charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `processed_data.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}