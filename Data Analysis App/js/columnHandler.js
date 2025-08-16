// Column operations module
function initColumnHandler() {
    // Show/hide operation options
    document.getElementById('columnOperation').addEventListener('change', function() {
        document.getElementById('splitOptions').style.display = 
            this.value === 'split' ? 'block' : 'none';
        document.getElementById('mergeOptions').style.display = 
            this.value === 'merge' ? 'block' : 'none';
    });
    
    // Initialize split column UI
    setupSplitColumnUI();
    
    // Apply column operation
    document.getElementById('applyColumnOpBtn').addEventListener('click', performColumnOperation);
}

function setupSplitColumnUI() {
    const container = document.getElementById('newColumnsContainer');
    
    // Add initial two column inputs
    for (let i = 1; i <= 2; i++) {
        addNewColumnInput(container, i);
    }
    
    // Add more columns button
    document.getElementById('addMoreColumnsBtn').addEventListener('click', () => {
        const inputCount = container.querySelectorAll('.new-column-input').length;
        addNewColumnInput(container, inputCount + 1);
    });
}

function addNewColumnInput(container, index) {
    const newInput = document.createElement('div');
    newInput.className = 'new-column-input';
    newInput.innerHTML = `
        <label>New Column ${index} Name: 
            <input type="text" class="new-column-name" placeholder="Column name" 
                   data-index="${index}">
        </label>
    `;
    container.appendChild(newInput);
}

function performColumnOperation() {
    if (currentData.length === 0) {
        alert('Please load data first');
        return;
    }

    const operation = document.getElementById('columnOperation').value;
    
    if (operation === 'split') {
        splitColumn();
    } else {
        mergeColumns();
    }
}

function splitColumn() {
    const column = document.getElementById('splitColumn').value;
    const separator = document.getElementById('splitSeparator').value;
    const nameInputs = document.querySelectorAll('.new-column-name');
    
    // Validate inputs
    if (!validateSplitInputs(column, separator, nameInputs)) {
        return;
    }

    // Get column names and validate
    const newNames = Array.from(nameInputs).map(input => input.value.trim());
    const validation = validateColumnNames(newNames);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    // Perform the split
    performDataSplit(column, separator, newNames);
    
    // Update UI
    updateAfterColumnOperation(`Split column "${column}" into ${newNames.length} new columns: ${newNames.join(', ')}`);
}

function validateSplitInputs(column, separator, nameInputs) {
    if (!column) {
        alert('Please select a column to split');
        return false;
    }
    if (!separator) {
        alert('Please enter a separator');
        return false;
    }
    if (nameInputs.length < 2) {
        alert('Please provide at least 2 column names');
        return false;
    }
    return true;
}

function validateColumnNames(names) {
    // Check for empty names
    if (names.some(name => name === '')) {
        return { valid: false, message: 'All column names must be filled' };
    }
    
    // Check name format
    const nameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (names.some(name => !nameRegex.test(name))) {
        return { 
            valid: false, 
            message: 'Column names must start with a letter and contain only letters, numbers, or underscores' 
        };
    }
    
    // Check for duplicates
    const uniqueNames = [...new Set(names)];
    if (uniqueNames.length !== names.length) {
        return { valid: false, message: 'Column names must be unique' };
    }
    
    return { valid: true };
}

function performDataSplit(column, separator, newNames) {
    currentData.forEach(row => {
        if (row[column] && typeof row[column] === 'string') {
            const parts = row[column].split(separator).map(part => part.trim());
            
            // Add new columns with split values
            newNames.forEach((name, index) => {
                row[name] = index < parts.length ? parts[index] : '';
            });
        } else {
            // Handle non-string or empty values
            newNames.forEach(name => {
                row[name] = '';
            });
        }
    });
}

function mergeColumns() {
    const selectedOptions = Array.from(document.getElementById('mergeColumns').selectedOptions);
    const columnsToMerge = selectedOptions.map(option => option.value);
    const newName = document.getElementById('mergedColumnName').value;
    const separator = document.getElementById('mergeSeparator').value || ' ';
    
    // Validation
    if (columnsToMerge.length < 2) {
        alert('Please select at least 2 columns to merge');
        return;
    }
    if (!newName) {
        alert('Please provide a name for the merged column');
        return;
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
        alert('Column name must start with a letter and contain only letters, numbers, or underscores');
        return;
    }

    // Perform the merge
    currentData.forEach(row => {
        const values = columnsToMerge.map(col => row[col] || '');
        row[newName] = values.join(separator);
        
        // Remove original columns if they exist in the new name
        if (!columnsToMerge.includes(newName)) {
            columnsToMerge.forEach(col => delete row[col]);
        }
    });
    
    updateAfterColumnOperation(`Merged ${columnsToMerge.length} columns into "${newName}"`);
}

function updateAfterColumnOperation(message) {
    // Update columns list
    columns = Object.keys(currentData[0]);
    updateAllColumnSelects();
    displayDataPreview();
    
    // Show result message
    document.getElementById('columnOpResult').innerHTML = `<p>${message}</p>`;
    
    // Reset split column inputs (keep first two)
    const container = document.getElementById('newColumnsContainer');
    container.innerHTML = '';
    for (let i = 1; i <= 2; i++) {
        addNewColumnInput(container, i);
    }
}

function updateAllColumnSelects() {
    const updateFunctions = [
        updateColumnSelects,
        updateColumnDropdowns,
        updateFormatColumnSelect,
        updateTextColumnSelect,
        updateSplitMergeSelects
    ];
    
    updateFunctions.forEach(fn => {
        try {
            fn();
        } catch (error) {
            console.error(`Error updating column selects: ${error.message}`);
        }
    });
}

function updateSplitMergeSelects() {
    const splitColumn = document.getElementById('splitColumn');
    const mergeColumns = document.getElementById('mergeColumns');
    
    // Clear existing options
    splitColumn.innerHTML = '';
    mergeColumns.innerHTML = '';
    
    if (currentData.length > 0) {
        const currentColumns = Object.keys(currentData[0]);
        
        currentColumns.forEach(col => {
            // Add to split column select
            splitColumn.innerHTML += `<option value="${col}">${col}</option>`;
            
            // Add to merge columns multi-select
            mergeColumns.innerHTML += `<option value="${col}">${col}</option>`;
        });
    }
}