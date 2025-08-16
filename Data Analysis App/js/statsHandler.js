// Statistics calculation module
function initStatsHandler() {
    // Initialize column dropdown when data loads
    document.addEventListener('dataLoaded', updateStatsColumnSelect);
    
    // Setup calculate button
    document.getElementById('calculateStatsBtn').addEventListener('click', calculateStatistics);
}

function updateStatsColumnSelect() {
    const select = document.getElementById('statsCalcColumn');
    if (!select) return;
    
    // Store current selection
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select a column</option>';
    
    // Only proceed if we have data with columns
    if (currentData.length > 0 && currentData[0]) {
        const columns = Object.keys(currentData[0]);
        
        columns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            select.appendChild(option);
        });
        
        // Restore previous selection if still valid
        if (currentValue && columns.includes(currentValue)) {
            select.value = currentValue;
        }
    }
}

function calculateStatistics() {
    const resultsContainer = document.getElementById('statsResults');
    resultsContainer.innerHTML = '<div class="loading">Calculating statistics...</div>';
    
    try {
        if (currentData.length === 0) {
            throw new Error('Please load data first');
        }

        const column = document.getElementById('statsCalcColumn').value;
        if (!column) {
            throw new Error('Please select a column');
        }

        const selectedStats = Array.from(document.querySelectorAll('input[name="stats"]:checked'))
                                 .map(checkbox => checkbox.value);

        if (selectedStats.length === 0) {
            throw new Error('Please select at least one statistic to calculate');
        }

        // Get numeric values from column
        const values = currentData
            .map(row => {
                const val = row[column];
                // Handle both string and number values
                return typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : Number(val);
            })
            .filter(val => !isNaN(val))
            .sort((a, b) => a - b);

        if (values.length === 0) {
            throw new Error(`No numeric values found in column "${column}"`);
        }

        const results = {};
        
        if (selectedStats.includes('mean')) {
            results.mean = calculateMean(values);
        }
        
        if (selectedStats.includes('median')) {
            results.median = calculateMedian(values);
        }
        
        if (selectedStats.includes('mode')) {
            results.mode = calculateMode(values);
        }
        
        if (selectedStats.includes('stddev')) {
            const mean = results.mean !== undefined ? results.mean : calculateMean(values);
            results.stddev = calculateStandardDeviation(values, mean);
        }
        
        if (selectedStats.includes('percentiles')) {
            results.percentiles = {
                '25%': calculatePercentile(values, 25),
                '50%': calculatePercentile(values, 50),
                '75%': calculatePercentile(values, 75),
                '100%': calculatePercentile(values, 100)
            };
        }

        displayStatsResults(column, results, values.length);
    } catch (error) {
        resultsContainer.innerHTML = `
            <div class="error">
                <p>Error: ${error.message}</p>
            </div>
        `;
        console.error('Statistics calculation error:', error);
    }
}

function calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values) {
    const mid = Math.floor(values.length / 2);
    return values.length % 2 !== 0 ? 
        values[mid] : 
        (values[mid - 1] + values[mid]) / 2;
}

function calculateMode(values) {
    const frequency = {};
    let maxFreq = 0;
    let modes = [];

    values.forEach(val => {
        frequency[val] = (frequency[val] || 0) + 1;
        
        if (frequency[val] > maxFreq) {
            maxFreq = frequency[val];
            modes = [val];
        } else if (frequency[val] === maxFreq) {
            modes.push(val);
        }
    });

    return modes.length === values.length ? null : modes;
}

function calculateStandardDeviation(values, mean) {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
}

function calculatePercentile(values, percentile) {
    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
        return values[lower];
    }
    
    return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

function displayStatsResults(column, results, count) {
    let html = `
        <div class="stats-header">
            <h4>Statistics for "${column}"</h4>
            <p class="count">(${count} numeric values)</p>
        </div>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Statistic</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    if (results.mean !== undefined) {
        html += `
            <tr>
                <td>Mean (Average)</td>
                <td>${results.mean.toFixed(4)}</td>
            </tr>
        `;
    }
    
    if (results.median !== undefined) {
        html += `
            <tr>
                <td>Median</td>
                <td>${results.median.toFixed(4)}</td>
            </tr>
        `;
    }
    
    if (results.mode !== undefined) {
        const modeDisplay = results.mode === null ? 
            'No mode (all values unique)' : 
            results.mode.map(m => m.toFixed(4)).join(', ');
        html += `
            <tr>
                <td>Mode</td>
                <td>${modeDisplay}</td>
            </tr>
        `;
    }
    
    if (results.stddev !== undefined) {
        html += `
            <tr>
                <td>Standard Deviation</td>
                <td>${results.stddev.toFixed(4)}</td>
            </tr>
        `;
    }
    
    if (results.percentiles !== undefined) {
        for (const [key, value] of Object.entries(results.percentiles)) {
            html += `
                <tr>
                    <td>${key} Percentile</td>
                    <td>${value.toFixed(4)}</td>
                </tr>
            `;
        }
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    document.getElementById('statsResults').innerHTML = html;
}