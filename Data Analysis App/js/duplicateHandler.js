// Simplified duplicate handler (case-insensitive)
function initDuplicateHandler() {
    document.getElementById('removeDuplicatesBtn').addEventListener('click', removeDuplicates);
}

function normalizeValue(value) {
    if (value === null || value === undefined) return '';
    return String(value).toLowerCase().trim();
}

function removeDuplicates() {
    if (currentData.length === 0) {
        alert('Please load data first');
        return;
    }

    const uniqueData = [];
    const seen = new Set();
    let duplicatesRemoved = 0;
    
    currentData.forEach(row => {
        // Create a normalized version of the row for comparison
        const normalizedRow = {};
        for (const key in row) {
            normalizedRow[key] = normalizeValue(row[key]);
        }
        const rowString = JSON.stringify(normalizedRow);
        
        if (!seen.has(rowString)) {
            seen.add(rowString);
            uniqueData.push(row); // Keep the original row (not normalized)
        } else {
            duplicatesRemoved++;
        }
    });
    
    currentData = uniqueData;
    displayDataPreview();
    
    document.getElementById('duplicatesResult').innerHTML = 
        duplicatesRemoved > 0 
            ? `<p>Removed ${duplicatesRemoved} duplicate rows (case-insensitive comparison)</p>`
            : `<p>No duplicates found</p>`;
}