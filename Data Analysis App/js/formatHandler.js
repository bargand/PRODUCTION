// Format handling module
function initFormatHandler() {
    // Show/hide date format options when target format changes
    document.getElementById('targetFormat').addEventListener('change', function() {
        document.getElementById('dateFormatOptions').style.display = 
            this.value === 'date' ? 'block' : 'none';
    });
    
    // Apply format conversion
    document.getElementById('applyFormatBtn').addEventListener('click', convertDataFormat);
}

function convertDataFormat() {
    if (currentData.length === 0) {
        alert('Please load data first');
        return;
    }

    const column = document.getElementById('formatColumn').value;
    const targetFormat = document.getElementById('targetFormat').value;
    let successCount = 0;
    let failCount = 0;

    currentData.forEach(row => {
        const value = row[column];
        if (value === null || value === undefined || value === '') {
            return; // Skip empty values
        }

        try {
            switch(targetFormat) {
                case 'string':
                    row[column] = String(value);
                    successCount++;
                    break;
                    
                case 'number':
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                        row[column] = num;
                        successCount++;
                    } else {
                        failCount++;
                    }
                    break;
                    
                case 'date':
                    let date;
                    const dateFormat = document.getElementById('dateFormat').value;
                    
                    // Try parsing as ISO date first
                    date = new Date(value);
                    
                    // If invalid, try parsing based on selected format
                    if (isNaN(date.getTime())) {
                        const parts = String(value).split(/[\/\-]/);
                        if (parts.length === 3) {
                            if (dateFormat === 'us') { // MM/DD/YYYY
                                date = new Date(parts[2], parts[0]-1, parts[1]);
                            } else if (dateFormat === 'european') { // DD/MM/YYYY
                                date = new Date(parts[2], parts[1]-1, parts[0]);
                            } else { // ISO (YYYY-MM-DD)
                                date = new Date(parts[0], parts[1]-1, parts[2]);
                            }
                        }
                    }
                    
                    if (!isNaN(date.getTime())) {
                        row[column] = date.toISOString().split('T')[0];
                        successCount++;
                    } else {
                        failCount++;
                    }
                    break;
                    
                case 'boolean':
                    const strVal = String(value).toLowerCase().trim();
                    if (strVal === 'true' || strVal === '1' || strVal === 'yes') {
                        row[column] = true;
                        successCount++;
                    } else if (strVal === 'false' || strVal === '0' || strVal === 'no') {
                        row[column] = false;
                        successCount++;
                    } else {
                        failCount++;
                    }
                    break;
            }
        } catch (error) {
            failCount++;
            console.error(`Error converting value ${value} in column ${column}:`, error);
        }
    });

    displayDataPreview();
    
    let resultMessage = `Converted ${successCount} values to ${targetFormat}`;
    if (failCount > 0) {
        resultMessage += ` (${failCount} values couldn't be converted)`;
    }
    document.getElementById('formatResult').innerHTML = `<p>${resultMessage}</p>`;
}

// Update format column dropdown when new data is loaded
function updateFormatColumnSelect() {
    const formatColumn = document.getElementById('formatColumn');
    formatColumn.innerHTML = '';
    
    if (currentData.length > 0) {
        Object.keys(currentData[0]).forEach(col => {
            formatColumn.innerHTML += `<option value="${col}">${col}</option>`;
        });
    }
}