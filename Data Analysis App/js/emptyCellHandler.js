// Empty cell handling module
function initEmptyCellHandler() {
    // Show/hide fill options based on radio selection
    document.querySelectorAll('input[name="emptyAction"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('fillOptions').style.display = 
                this.value === 'fill' ? 'block' : 'none';
        });
    });
    
    // Show/hide specific fill options
    document.getElementById('fillMethod').addEventListener('change', function() {
        document.getElementById('singleValueOption').style.display = 
            this.value === 'single' ? 'block' : 'none';
        document.getElementById('multipleValuesOption').style.display = 
            this.value === 'multiple' ? 'block' : 'none';
        document.getElementById('columnStatsOption').style.display = 
            this.value === 'columnStats' ? 'block' : 'none';
        
        if (this.value === 'multiple') {
            updateColumnDropdowns();
        }
    });
    
    // Setup multiple values UI
    setupMultipleValuesUI();
    
    // Apply cleaning
    document.getElementById('applyCleanBtn').addEventListener('click', handleEmptyCells);
}

function handleEmptyCells() {
    if (currentData.length === 0) {
        alert('Please load data first');
        return;
    }
    
    const action = document.querySelector('input[name="emptyAction"]:checked').value;
    
    if (action === 'delete') {
        deleteEmptyRows();
    } else {
        const method = document.getElementById('fillMethod').value;
        switch(method) {
            case 'single':
                fillWithSingleValue();
                break;
            case 'multiple':
                fillWithMultipleValues();
                break;
            case 'columnStats':
                fillWithColumnStats();
                break;
        }
    }
    
    displayDataPreview();
}

function deleteEmptyRows() {
    const initialCount = currentData.length;
    
    currentData = currentData.filter(row => {
        return Object.values(row).every(value => {
            return value !== null && value !== undefined && value !== '';
        });
    });
    
    const removedCount = initialCount - currentData.length;
    alert(`Removed ${removedCount} rows with empty cells`);
}

function fillWithSingleValue() {
    const fillValue = document.getElementById('fillValue').value;
    
    if (fillValue === '') {
        alert('Please enter a fill value');
        return;
    }
    
    currentData.forEach(row => {
        for (const key in row) {
            if (isEmpty(row[key])) {
                row[key] = isNaN(fillValue) ? fillValue : parseFloat(fillValue);
            }
        }
    });
    
    alert('Filled all empty cells with specified value');
}

function fillWithMultipleValues() {
    const pairs = document.querySelectorAll('.column-value-pair');
    const fillMap = {};
    let hasErrors = false;

    pairs.forEach(pair => {
        const columnSelect = pair.querySelector('.fill-column-select');
        const valueInput = pair.querySelector('.fill-value-input');
        
        if (columnSelect.value && valueInput.value) {
            fillMap[columnSelect.value] = valueInput.value;
        } else if (columnSelect.value || valueInput.value) {
            alert(`Please complete both column and value for each pair`);
            hasErrors = true;
            return;
        }
    });

    if (hasErrors || Object.keys(fillMap).length === 0) {
        if (!hasErrors) alert('Please add at least one column-value pair');
        return;
    }

    currentData.forEach(row => {
        for (const [col, val] of Object.entries(fillMap)) {
            if (isEmpty(row[col])) {
                row[col] = isNaN(val) ? val : parseFloat(val);
            }
        }
    });

    alert(`Filled empty cells in specified columns`);
}

function fillWithColumnStats() {
    const column = document.getElementById('statsColumn').value;
    const statType = document.getElementById('statisticType').value;
    
    // Get all non-empty values from the column
    const values = currentData
        .map(row => parseFloat(row[column]))
        .filter(val => !isNaN(val));
    
    if (values.length === 0) {
        alert(`No numeric values found in column ${column}`);
        return;
    }
    
    let fillValue;
    switch(statType) {
        case 'mean':
            fillValue = values.reduce((a, b) => a + b, 0) / values.length;
            break;
        case 'median':
            const sorted = [...values].sort((a, b) => a - b);
            fillValue = sorted[Math.floor(sorted.length / 2)];
            break;
        case 'mode':
            const frequency = {};
            let maxFreq = 0;
            fillValue = values[0];
            values.forEach(val => {
                frequency[val] = (frequency[val] || 0) + 1;
                if (frequency[val] > maxFreq) {
                    maxFreq = frequency[val];
                    fillValue = val;
                }
            });
            break;
    }
    
    currentData.forEach(row => {
        if (isEmpty(row[column])) {
            row[column] = fillValue;
        }
    });
    
    alert(`Filled empty cells in ${column} with ${statType} value: ${fillValue.toFixed(2)}`);
}

function isEmpty(value) {
    return value === null || value === undefined || value === '';
}

function updateColumnDropdowns() {
    const selects = document.querySelectorAll('.fill-column-select');
    if (currentData.length === 0 || !selects.length) return;

    const columns = Object.keys(currentData[0]);
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Column</option>';
        
        columns.forEach(col => {
            select.innerHTML += `<option value="${col}">${col}</option>`;
        });
        
        if (currentValue && columns.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}

function setupMultipleValuesUI() {
    const container = document.getElementById('columnValuePairs');
    
    // Add new column-value pair
    document.getElementById('addMoreColumnsBtn').addEventListener('click', () => {
        const newPair = document.createElement('div');
        newPair.className = 'column-value-pair';
        newPair.innerHTML = `
            <select class="fill-column-select">
                <option value="">Select Column</option>
                ${currentData.length > 0 ? Object.keys(currentData[0]).map(col => 
                    `<option value="${col}">${col}</option>`).join('') : ''}
            </select>
            <input type="text" class="fill-value-input" placeholder="Value to fill">
            <button class="remove-pair-btn">×</button>
        `;
        container.appendChild(newPair);
        
        // Add remove event
        newPair.querySelector('.remove-pair-btn').addEventListener('click', () => {
            if (container.querySelectorAll('.column-value-pair').length > 1) {
                container.removeChild(newPair);
            }
        });
    });
    
    // Initialize remove button for first pair
    const firstRemoveBtn = container.querySelector('.remove-pair-btn');
    if (firstRemoveBtn) {
        firstRemoveBtn.addEventListener('click', () => {
            if (container.querySelectorAll('.column-value-pair').length > 1) {
                container.removeChild(firstRemoveBtn.parentElement);
            }
        });
    }
}

// Update column selects when new data is loaded
function updateColumnSelects() {
    const statsColumn = document.getElementById('statsColumn');
    statsColumn.innerHTML = '';
    
    if (currentData.length > 0) {
        Object.keys(currentData[0]).forEach(col => {
            statsColumn.innerHTML += `<option value="${col}">${col}</option>`;
        });
    }
}