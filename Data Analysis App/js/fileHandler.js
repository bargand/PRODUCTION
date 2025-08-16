// File handling module
let currentData = [];
let currentFile = null;

function initFileHandler() {
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const fileInfo = document.getElementById('fileInfo');
    
    // Click event for file input
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Change event for file input
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        fileInput.files = e.dataTransfer.files;
        handleFileSelect({ target: fileInput });
    });
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    currentFile = files[0];
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileInfo').textContent = `Selected file: ${currentFile.name}`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const fileType = currentFile.name.split('.').pop().toLowerCase();
            
            switch(fileType) {
                case 'csv':
                    parseCSV(e.target.result);
                    break;
                case 'xlsx':
                case 'xls':
                    parseExcel(e.target.result);
                    break;
                case 'json':
                    parseJSON(e.target.result);
                    break;
                default:
                    throw new Error('Unsupported file format');
            }
        } catch (error) {
            alert(`Error loading file: ${error.message}`);
            console.error(error);
        }
    };
    
    if (currentFile.name.endsWith('.xlsx') || currentFile.name.endsWith('.xls')) {
        reader.readAsBinaryString(currentFile);
    } else {
        reader.readAsText(currentFile);
    }
}

function parseCSV(data) {
    const result = Papa.parse(data, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
    });
    
    if (result.errors.length > 0) {
        console.warn('CSV parsing warnings:', result.errors);
    }
    
    currentData = result.data;
    displayDataPreview();
}

function parseExcel(data) {
    const workbook = XLSX.read(data, { type: 'binary' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    currentData = XLSX.utils.sheet_to_json(firstSheet, { defval: null });
    displayDataPreview();
}

function parseJSON(data) {
    currentData = JSON.parse(data);
    if (!Array.isArray(currentData)) {
        throw new Error('JSON file should contain an array of objects');
    }
    displayDataPreview();
}

function displayDataPreview() {
    const previewElement = document.getElementById('dataPreview');
    
    try {
        // Clear previous content and show loading state
        previewElement.innerHTML = '<div class="loading">Loading data preview...</div>';
        
        // Check if data exists
        if (!currentData || currentData.length === 0) {
            previewElement.innerHTML = '<div class="no-data">No data available for preview</div>';
            return;
        }

        // Validate data structure
        if (typeof currentData[0] !== 'object' || currentData[0] === null) {
            throw new Error('Invalid data format: Expected array of objects');
        }

        // Render the data table
        DataVisualizer.renderTable(currentData);
        
        // Update all column selection dropdowns
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

    } catch (error) {
        console.error('Error displaying data preview:', error);
        previewElement.innerHTML = `
            <div class="error-message">
                <p>Failed to display data preview</p>
                <p class="error-detail">${error.message}</p>
            </div>
        `;
    }
}