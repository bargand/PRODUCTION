// Text processing module
function initTextHandler() {
    // Apply text processing
    document.getElementById('applyTextProcessingBtn').addEventListener('click', processText);
}

function processText() {
    if (currentData.length === 0) {
        alert('Please load data first');
        return;
    }

    const column = document.getElementById('textColumn').value;
    const removeSpaces = document.getElementById('removeSpaces').checked;
    const removeSpecialChars = document.getElementById('removeSpecialChars').checked;
    const textCase = document.getElementById('textCase').value;
    let processedCount = 0;

    currentData.forEach(row => {
        if (row[column] === null || row[column] === undefined) {
            return;
        }

        let text = String(row[column]);
        let originalText = text;

        // Remove extra spaces
        if (removeSpaces) {
            text = text.replace(/\s+/g, ' ').trim();
        }

        // Remove special characters (keeps letters, numbers, and basic punctuation)
        if (removeSpecialChars) {
            text = text.replace(/[^\w\s.,!?;:'"-]/g, '');
        }

        // Apply text case
        switch(textCase) {
            case 'lower':
                text = text.toLowerCase();
                break;
            case 'upper':
                text = text.toUpperCase();
                break;
            case 'title':
                text = text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
                break;
            case 'sentence':
                text = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, char => char.toUpperCase());
                break;
        }

        if (text !== originalText) {
            row[column] = text;
            processedCount++;
        }
    });

    displayDataPreview();
    document.getElementById('textProcessingResult').innerHTML = 
        `<p>Processed ${processedCount} values in column "${column}"</p>`;
}

// Update text column dropdown when new data is loaded
function updateTextColumnSelect() {
    const textColumn = document.getElementById('textColumn');
    textColumn.innerHTML = '';
    
    if (currentData.length > 0) {
        Object.keys(currentData[0]).forEach(col => {
            textColumn.innerHTML += `<option value="${col}">${col}</option>`;
        });
    }
}