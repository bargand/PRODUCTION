// Data visualization module with pagination
const DataVisualizer = {
    currentPage: 1,
    rowsPerPage: 20,
    totalPages: 1,
    
    init: function() {
        // Initialize event listeners
        document.getElementById('rowsPerPage').addEventListener('change', (e) => {
            this.rowsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderTable(currentData);
        });
        
        document.getElementById('firstPage').addEventListener('click', () => {
            this.currentPage = 1;
            this.renderTable(currentData);
        });
        
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable(currentData);
            }
        });
        
        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.renderTable(currentData);
            }
        });
        
        document.getElementById('lastPage').addEventListener('click', () => {
            this.currentPage = this.totalPages;
            this.renderTable(currentData);
        });
    },
    
    renderTable: function(data) {
        if (!data || data.length === 0) {
            document.getElementById('dataPreview').innerHTML = '<p>No data to display</p>';
            this.updatePageInfo(0, 0);
            return;
        }
        
        // Calculate pagination
        const totalRows = data.length;
        this.rowsPerPage = parseInt(document.getElementById('rowsPerPage').value) || totalRows;
        
        this.totalPages = this.rowsPerPage > 0 ? 
            Math.ceil(totalRows / this.rowsPerPage) : 1;
        
        // Ensure current page is within bounds
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
        
        // Get rows for current page
        const startIdx = this.rowsPerPage > 0 ? 
            (this.currentPage - 1) * this.rowsPerPage : 0;
        const endIdx = this.rowsPerPage > 0 ? 
            startIdx + this.rowsPerPage : totalRows;
        
        const pageRows = data.slice(startIdx, endIdx);
        const columns = Object.keys(data[0]);
        
        let html = '<table><thead><tr>';
        
        // Header row
        columns.forEach(col => {
            html += `<th>${col}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Data rows for current page
        pageRows.forEach((row, rowIndex) => {
            html += '<tr>';
            columns.forEach(col => {
                const value = row[col];
                let displayValue = value === undefined || value === null ? '' : value;
                
                // Truncate long text
                if (typeof displayValue === 'string' && displayValue.length > 50) {
                    displayValue = displayValue.substring(0, 50) + '...';
                }
                
                html += `<td data-row="${startIdx + rowIndex}" data-col="${col}">${displayValue}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        document.getElementById('dataPreview').innerHTML = html;
        
        // Update pagination info and controls
        this.updatePageInfo(totalRows, startIdx);
    },
    
    updatePageInfo: function(totalRows, startIdx) {
        const rowsPerPage = this.rowsPerPage > 0 ? this.rowsPerPage : totalRows;
        const endIdx = Math.min(startIdx + rowsPerPage, totalRows);
        
        document.getElementById('pageInfo').textContent = 
            `Page ${this.currentPage} of ${this.totalPages} | ` +
            `Showing ${startIdx + 1}-${endIdx} of ${totalRows} rows`;
            
        // Enable/disable navigation buttons
        document.getElementById('firstPage').disabled = this.currentPage === 1;
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === this.totalPages;
        document.getElementById('lastPage').disabled = this.currentPage === this.totalPages;
    },
    
highlightDuplicates: function(duplicateIndices) {
    const table = document.querySelector('#dataPreview table');
    if (!table) return;
    
    // Reset previous highlights
    table.querySelectorAll('tr').forEach(row => {
        row.classList.remove('duplicate-row');
    });
    
    // Highlight duplicates
    duplicateIndices.forEach(idx => {
        const row = table.querySelector(`tbody tr:nth-child(${idx + 1})`);
        if (row) {
            row.classList.add('duplicate-row');
        }
    });
}
};

// Initialize the visualizer when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    DataVisualizer.init();
});