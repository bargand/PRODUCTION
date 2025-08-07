// Main Application Script
class DataManager {
    constructor() {
        this.data = [];
        this.headers = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.history = [];
        this.historyIndex = -1;
        this.filters = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.worker = new Worker('dataWorker.js');
        
        this.initEventListeners();
        this.initWorker();
    }
    
    initEventListeners() {
        // File upload
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag and drop
        const dropZone = document.getElementById('dropZone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('highlight');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('highlight');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('highlight');
            if (e.dataTransfer.files.length) {
                document.getElementById('fileInput').files = e.dataTransfer.files;
                this.handleFileUpload({ target: document.getElementById('fileInput') });
            }
        });
        
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Data cleaning
        document.getElementById('emptyCellsAction').addEventListener('change', () => this.toggleFillOptions());
        document.getElementById('applyFill').addEventListener('click', () => this.handleEmptyCells());
        document.getElementById('removeDuplicates').addEventListener('click', () => this.removeDuplicateRows());
        document.getElementById('duplicateScope').addEventListener('change', () => this.toggleDuplicateColumns());
        
        // Data correction
        document.getElementById('issueType').addEventListener('change', () => this.toggleFixOptions());
        document.getElementById('fixData').addEventListener('click', () => this.fixWrongData());
        document.getElementById('outlierAction').addEventListener('change', () => this.toggleOutlierReplaceValue());
        document.getElementById('handleOutliers').addEventListener('click', () => this.handleOutliersFunc());
        
        // Data transformation
        document.getElementById('transformOperation').addEventListener('change', () => this.toggleTransformOptions());
        document.getElementById('applyTransform').addEventListener('click', () => this.applyTransform());
        document.getElementById('columnAction').addEventListener('change', () => this.toggleColumnActionOptions());
        document.getElementById('applyColumnAction').addEventListener('click', () => this.applyColumnAction());
        
        // Filter and sort
        document.getElementById('filterOperator').addEventListener('change', () => this.toggleFilterValue());
        document.getElementById('applyFilter').addEventListener('click', () => this.applyFilter());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());
        document.getElementById('applySort').addEventListener('click', () => this.applySort());
        document.getElementById('clearSort').addEventListener('click', () => this.clearSort());
        
        // Analysis
        document.getElementById('calculateStats').addEventListener('click', () => this.calculateColumnStats());
        document.getElementById('calculateCorrelation').addEventListener('click', () => this.calculateCorrelationMatrix());
        document.getElementById('calculateFrequency').addEventListener('click', () => this.calculateFrequency());
        
        // Visualization
        document.getElementById('chartType').addEventListener('change', () => this.toggleChartOptions());
        document.getElementById('generateChart').addEventListener('click', () => this.generateChart());
        
        // Data preview
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
        document.getElementById('pageSize').addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.updateDataPreview();
        });
        
        // Export
        document.getElementById('exportCSV').addEventListener('click', () => this.exportData('csv'));
        document.getElementById('exportExcel').addEventListener('click', () => this.exportData('excel'));
        document.getElementById('exportJSON').addEventListener('click', () => this.exportData('json'));
        document.getElementById('exportHTML').addEventListener('click', () => this.exportData('html'));
        
        // History
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());
        
        // Language
        document.getElementById('languageSelect').addEventListener('change', (e) => this.changeLanguage(e.target.value));
    }
    
    initWorker() {
        this.worker.onmessage = (e) => {
            const { action, result } = e.data;
            
            switch (action) {
                case 'calculateStats':
                    this.displayStats(result);
                    break;
                case 'calculateCorrelation':
                    this.displayCorrelation(result);
                    break;
                case 'calculateFrequency':
                    this.displayFrequency(result);
                    break;
                case 'processData':
                    this.handleProcessedData(result);
                    break;
            }
        };
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        const fileType = file.name.split('.').pop().toLowerCase();
        const fileName = file.name;
        
        document.getElementById('fileInfo').textContent = `${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        
        reader.onload = (e) => {
            const content = e.target.result;
            
            try {
                if (fileType === 'csv') {
                    this.parseCSV(content);
                } else if (fileType === 'json') {
                    this.parseJSON(content);
                } else if (fileType === 'xlsx' || fileType === 'xls') {
                    this.parseExcel(content);
                } else {
                    alert(i18next.t('unsupported_file'));
                }
            } catch (error) {
                alert(`${i18next.t('error_parsing')}: ${error.message}`);
            }
        };
        
        if (fileType === 'csv' || fileType === 'json') {
            reader.readAsText(file);
        } else if (fileType === 'xlsx' || fileType === 'xls') {
            reader.readAsArrayBuffer(file);
        }
    }
    
    parseCSV(content) {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                this.saveState();
                this.data = results.data;
                this.headers = results.meta.fields || [];
                this.applyCurrentFiltersAndSort();
                this.updateUI();
            },
            error: (error) => {
                alert(`CSV ${i18next.t('parsing_error')}: ${error.message}`);
            }
        });
    }
    
    parseJSON(content) {
        try {
            this.saveState();
            this.data = JSON.parse(content);
            if (this.data.length > 0) {
                this.headers = Object.keys(this.data[0]);
            } else {
                this.headers = [];
            }
            this.applyCurrentFiltersAndSort();
            this.updateUI();
        } catch (error) {
            alert(`JSON ${i18next.t('parsing_error')}: ${error.message}`);
        }
    }
    
    parseExcel(content) {
        try {
            this.saveState();
            const workbook = XLSX.read(content, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
            
            this.data = jsonData;
            if (this.data.length > 0) {
                this.headers = Object.keys(this.data[0]);
            } else {
                this.headers = [];
            }
            this.applyCurrentFiltersAndSort();
            this.updateUI();
        } catch (error) {
            alert(`Excel ${i18next.t('parsing_error')}: ${error.message}`);
        }
    }
    
    saveState() {
        // Truncate any undone states if we're not at the end of history
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Save current state
        const state = {
            data: JSON.parse(JSON.stringify(this.data)),
            headers: [...this.headers],
            filters: [...this.filters],
            sortColumn: this.sortColumn,
            sortDirection: this.sortDirection
        };
        
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        
        this.updateHistoryControls();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState();
        }
    }
    
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.updateHistoryControls();
    }
    
    restoreState() {
        const state = this.history[this.historyIndex];
        this.data = JSON.parse(JSON.stringify(state.data));
        this.headers = [...state.headers];
        this.filters = [...state.filters];
        this.sortColumn = state.sortColumn;
        this.sortDirection = state.sortDirection;
        
        this.applyCurrentFiltersAndSort();
        this.updateUI();
        this.updateHistoryControls();
    }
    
    updateHistoryControls() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
        
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        this.history.forEach((state, index) => {
            const item = document.createElement('div');
            item.className = `history-item ${index === this.historyIndex ? 'active' : ''}`;
            item.textContent = `${index + 1}. ${state.data.length} rows, ${state.headers.length} cols`;
            item.addEventListener('click', () => {
                this.historyIndex = index;
                this.restoreState();
            });
            historyList.appendChild(item);
        });
    }
    
    applyCurrentFiltersAndSort() {
        // Apply filters
        let filteredData = [...this.data];
        
        this.filters.forEach(filter => {
            const { column, operator, value, value2 } = filter;
            
            filteredData = filteredData.filter(row => {
                const cellValue = row[column];
                
                switch (operator) {
                    case 'equals':
                        return String(cellValue) === value;
                    case 'notEquals':
                        return String(cellValue) !== value;
                    case 'contains':
                        return String(cellValue).toLowerCase().includes(value.toLowerCase());
                    case 'greater':
                        return parseFloat(cellValue) > parseFloat(value);
                    case 'less':
                        return parseFloat(cellValue) < parseFloat(value);
                    case 'between':
                        const numValue = parseFloat(cellValue);
                        return numValue >= parseFloat(value) && numValue <= parseFloat(value2);
                    default:
                        return true;
                }
            });
        });
        
        // Apply sorting
        if (this.sortColumn) {
            filteredData.sort((a, b) => {
                const valA = a[this.sortColumn];
                const valB = b[this.sortColumn];
                
                if (valA === valB) return 0;
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                
                if (!isNaN(valA) && !isNaN(valB)) {
                    return this.sortDirection === 'asc' 
                        ? parseFloat(valA) - parseFloat(valB)
                        : parseFloat(valB) - parseFloat(valA);
                } else {
                    return this.sortDirection === 'asc'
                        ? String(valA).localeCompare(String(valB))
                        : String(valB).localeCompare(String(valA));
                }
            });
        }
        
        this.filteredData = filteredData;
    }
    
    updateUI() {
        this.updateColumnDropdowns();
        this.updateDataPreview();
        this.updateSystemInfo();
    }
    
    updateColumnDropdowns() {
        const dropdowns = [
            'columnSelect', 'outlierColumn', 'statsColumn', 'frequencyColumn',
            'xAxisColumn', 'yAxisColumn', 'groupByColumn', 'fillColumnSelect',
            'duplicateColumnsSelect', 'transformColumn', 'renameColumnSelect',
            'deleteColumnSelect', 'sortColumn', 'filterColumn'
        ];
        
        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) return;
            
            const isMultiple = dropdown.multiple;
            const selectedValues = isMultiple 
                ? Array.from(dropdown.selectedOptions).map(opt => opt.value)
                : dropdown.value;
            
            dropdown.innerHTML = '';
            
            if (dropdownId === 'groupByColumn') {
                const noneOption = document.createElement('option');
                noneOption.value = '';
                noneOption.textContent = i18next.t('none');
                dropdown.appendChild(noneOption);
            }
            
            this.headers.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                
                if (isMultiple && selectedValues.includes(header)) {
                    option.selected = true;
                } else if (!isMultiple && selectedValues === header) {
                    option.selected = true;
                }
                
                dropdown.appendChild(option);
            });
        });
        
        // Update column order list
        const columnOrderList = document.getElementById('columnOrderList');
        columnOrderList.innerHTML = '';
        
        this.headers.forEach(header => {
            const li = document.createElement('li');
            li.className = 'column-order-item';
            li.draggable = true;
            li.dataset.column = header;
            li.textContent = header;
            
            li.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', header);
            });
            
            li.addEventListener('dragover', (e) => {
                e.preventDefault();
                li.classList.add('drag-over');
            });
            
            li.addEventListener('dragleave', () => {
                li.classList.remove('drag-over');
            });
            
            li.addEventListener('drop', (e) => {
                e.preventDefault();
                li.classList.remove('drag-over');
                
                const draggedColumn = e.dataTransfer.getData('text/plain');
                if (draggedColumn !== header) {
                    const draggedIndex = this.headers.indexOf(draggedColumn);
                    const targetIndex = this.headers.indexOf(header);
                    
                    // Swap columns
                    [this.headers[draggedIndex], this.headers[targetIndex]] = 
                        [this.headers[targetIndex], this.headers[draggedIndex]];
                    
                    this.updateColumnDropdowns();
                }
            });
            
            columnOrderList.appendChild(li);
        });
    }
    
    updateDataPreview() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredData.length);
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        const table = document.getElementById('dataTable');
        table.innerHTML = '';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Add row number column
        const rowNumHeader = document.createElement('th');
        rowNumHeader.textContent = '#';
        headerRow.appendChild(rowNumHeader);
        
        // Add data columns
        this.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        if (pageData.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = this.headers.length + 1;
            cell.textContent = i18next.t('no_data');
            row.appendChild(cell);
            tbody.appendChild(row);
        } else {
            pageData.forEach((rowData, index) => {
                const row = document.createElement('tr');
                
                // Row number
                const rowNumCell = document.createElement('td');
                rowNumCell.textContent = startIndex + index + 1;
                row.appendChild(rowNumCell);
                
                // Data cells
                this.headers.forEach(header => {
                    const cell = document.createElement('td');
                    const value = rowData[header];
                    cell.textContent = value === null || value === undefined ? '' : value;
                    
                    // Highlight outliers or special values
                    if (!isNaN(value)) {
                        const numValue = parseFloat(value);
                        if (numValue < 0) {
                            cell.style.color = 'red';
                        } else if (numValue > 1000) {
                            cell.style.fontWeight = 'bold';
                        }
                    }
                    
                    row.appendChild(cell);
                });
                
                tbody.appendChild(row);
            });
        }
        
        table.appendChild(tbody);
        
        // Update pagination info
        document.getElementById('rowCount').textContent = 
            i18next.t('rows_shown', { from: startIndex + 1, to: endIndex, total: this.filteredData.length });
        
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = endIndex >= this.filteredData.length;
    }
    
    updateSystemInfo() {
        const memory = Math.round(JSON.stringify(this.data).length / 1024 / 1024);
        document.getElementById('memoryUsage').textContent = 
            i18next.t('memory_usage', { memory: memory.toFixed(2) });
        document.getElementById('rowCountFooter').textContent = 
            i18next.t('total_rows', { count: this.data.length });
        document.getElementById('columnCount').textContent = 
            i18next.t('columns', { count: this.headers.length });
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateDataPreview();
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.updateDataPreview();
        }
    }
    
    // Data cleaning operations
    toggleFillOptions() {
        const action = document.getElementById('emptyCellsAction').value;
        document.getElementById('fillOptions').style.display = action === 'fill' ? 'flex' : 'none';
        document.getElementById('fillColumnOptions').style.display = action === 'fill-column' ? 'flex' : 'none';
    }
    
    handleEmptyCells() {
        const action = document.getElementById('emptyCellsAction').value;
        
        this.saveState();
        
        if (action === 'delete') {
            this.data = this.data.filter(row => {
                return this.headers.every(header => {
                    const value = row[header];
                    return value !== null && value !== undefined && value !== '';
                });
            });
        } else if (action === 'fill') {
            const fillVal = document.getElementById('fillValue').value;
            if (fillVal) {
                this.data.forEach(row => {
                    this.headers.forEach(header => {
                        if (row[header] === null || row[header] === undefined || row[header] === '') {
                            row[header] = fillVal;
                        }
                    });
                });
            }
        } else if (action === 'fill-column') {
            const column = document.getElementById('fillColumnSelect').value;
            const fillVal = document.getElementById('fillColumnValue').value;
            
            if (column && fillVal) {
                this.data.forEach(row => {
                    if (row[column] === null || row[column] === undefined || row[column] === '') {
                        row[column] = fillVal;
                    }
                });
            }
        }
        
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    toggleDuplicateColumns() {
        const scope = document.getElementById('duplicateScope').value;
        document.getElementById('duplicateColumns').style.display = scope === 'selected' ? 'block' : 'none';
    }
    
    removeDuplicateRows() {
        const scope = document.getElementById('duplicateScope').value;
        const columns = scope === 'selected' 
            ? Array.from(document.getElementById('duplicateColumnsSelect').selectedOptions).map(opt => opt.value)
            : this.headers;
        
        this.saveState();
        
        const uniqueRows = [];
        const seen = new Set();
        
        this.data.forEach(row => {
            const rowKey = columns.map(col => String(row[col])).join('|');
            if (!seen.has(rowKey)) {
                seen.add(rowKey);
                uniqueRows.push(row);
            }
        });
        
        this.data = uniqueRows;
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    toggleFixOptions() {
        const issueType = document.getElementById('issueType').value;
        document.getElementById('replaceValueGroup').style.display = issueType === 'replace' ? 'flex' : 'none';
        document.getElementById('regexGroup').style.display = issueType === 'regex' ? 'flex' : 'none';
    }
    
    fixWrongData() {
        const column = document.getElementById('columnSelect').value;
        const issueType = document.getElementById('issueType').value;
        
        if (!column) return;
        
        this.saveState();
        
        if (issueType === 'replace') {
            const wrongVal = document.getElementById('wrongValue').value;
            const correctVal = document.getElementById('correctValue').value;
            
            this.data.forEach(row => {
                if (String(row[column]) === wrongVal) {
                    row[column] = correctVal;
                }
            });
        } else if (issueType === 'regex') {
            const pattern = document.getElementById('regexPattern').value;
            const replacement = document.getElementById('regexReplace').value;
            
            try {
                const regex = new RegExp(pattern, 'g');
                this.data.forEach(row => {
                    if (row[column] !== null && row[column] !== undefined) {
                        row[column] = String(row[column]).replace(regex, replacement);
                    }
                });
            } catch (e) {
                alert(i18next.t('invalid_regex'));
                return;
            }
        } else if (issueType === 'trim') {
            this.data.forEach(row => {
                if (typeof row[column] === 'string') {
                    row[column] = row[column].trim();
                }
            });
        }
        
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    toggleOutlierReplaceValue() {
        const action = document.getElementById('outlierAction').value;
        document.getElementById('replaceValueGroupOutlier').style.display = action === 'replace' ? 'flex' : 'none';
    }
    
    handleOutliersFunc() {
        const column = document.getElementById('outlierColumn').value;
        const method = document.getElementById('outlierMethod').value;
        const action = document.getElementById('outlierAction').value;
        
        if (!column) return;
        
        this.saveState();
        
        // Get numeric values
        const values = this.data
            .map(row => parseFloat(row[column]))
            .filter(v => !isNaN(v));
        
        if (values.length === 0) {
            alert(i18next.t('no_numeric_data'));
            return;
        }
        
        // Calculate threshold based on method
        let threshold;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / values.length);
        
        if (method === 'zscore') {
            const zScore = parseFloat(document.getElementById('outlierThreshold').value);
            threshold = mean + zScore * stdDev;
        } else if (method === 'iqr') {
            const sorted = [...values].sort((a, b) => a - b);
            const q1 = sorted[Math.floor(sorted.length * 0.25)];
            const q3 = sorted[Math.floor(sorted.length * 0.75)];
            const iqr = q3 - q1;
            const iqrFactor = parseFloat(document.getElementById('outlierThreshold').value);
            threshold = q3 + iqrFactor * iqr;
        } else {
            threshold = parseFloat(document.getElementById('outlierThreshold').value);
        }
        
        // Apply action
        if (action === 'remove') {
            this.data = this.data.filter(row => {
                const value = parseFloat(row[column]);
                return isNaN(value) || Math.abs(value) <= threshold;
            });
        } else if (action === 'replace') {
            const replaceValue = document.getElementById('outlierReplaceValue').value;
            this.data.forEach(row => {
                const value = parseFloat(row[column]);
                if (!isNaN(value) && Math.abs(value) > threshold) {
                    row[column] = replaceValue;
                }
            });
        } else if (action === 'winsorize') {
            const sorted = [...values].sort((a, b) => a - b);
            const lowerThreshold = -threshold; // For negative threshold if using z-score
            
            this.data.forEach(row => {
                const value = parseFloat(row[column]);
                if (!isNaN(value)) {
                    if (value > threshold) {
                        row[column] = threshold;
                    } else if (value < lowerThreshold) {
                        row[column] = lowerThreshold;
                    }
                }
            });
        }
        
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    // Data transformation operations
    toggleTransformOptions() {
        const operation = document.getElementById('transformOperation').value;
        document.getElementById('typeOptions').style.display = operation === 'type' ? 'flex' : 'none';
        document.getElementById('formulaOptions').style.display = operation === 'formula' ? 'flex' : 'none';
    }
    
    applyTransform() {
        const column = document.getElementById('transformColumn').value;
        const operation = document.getElementById('transformOperation').value;
        
        if (!column) return;
        
        this.saveState();
        
        if (operation === 'type') {
            const newType = document.getElementById('newType').value;
            
            this.data.forEach(row => {
                const value = row[column];
                if (value === null || value === undefined) return;
                
                try {
                    switch (newType) {
                        case 'string':
                            row[column] = String(value);
                            break;
                        case 'number':
                            row[column] = isNaN(value) ? null : parseFloat(value);
                            break;
                        case 'boolean':
                            if (typeof value === 'string') {
                                const lowerVal = value.toLowerCase();
                                row[column] = lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1';
                            } else {
                                row[column] = Boolean(value);
                            }
                            break;
                        case 'date':
                            const date = new Date(value);
                            row[column] = isNaN(date.getTime()) ? null : date.toISOString();
                            break;
                    }
                } catch (e) {
                    console.error(`Error converting ${value} to ${newType}`, e);
                }
            });
        } else if (operation === 'formula') {
            const formula = document.getElementById('formulaExpression').value;
            const newColumn = document.getElementById('newColumnName').value || `new_column_${Date.now()}`;
            
            if (!formula) return;
            
            // Add new column if it doesn't exist
            if (!this.headers.includes(newColumn)) {
                this.headers.push(newColumn);
            }
            
            // Simple formula evaluation (in a real app, use a proper parser)
            this.data.forEach(row => {
                try {
                    // Replace column references with their values
                    let expression = formula;
                    this.headers.forEach(col => {
                        const value = row[col] !== null && row[col] !== undefined ? row[col] : 0;
                        expression = expression.replace(new RegExp(col, 'g'), value);
                    });
                    
                    // Evaluate the expression
                    row[newColumn] = eval(expression); // Note: Using eval is dangerous in real apps
                } catch (e) {
                    row[newColumn] = null;
                }
            });
        }
        
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    toggleColumnActionOptions() {
        const action = document.getElementById('columnAction').value;
        document.getElementById('renameOptions').style.display = action === 'rename' ? 'flex' : 'none';
        document.getElementById('deleteOptions').style.display = action === 'delete' ? 'flex' : 'none';
        document.getElementById('reorderOptions').style.display = action === 'reorder' ? 'block' : 'none';
    }
    
    applyColumnAction() {
        const action = document.getElementById('columnAction').value;
        
        this.saveState();
        
        if (action === 'rename') {
            const oldName = document.getElementById('renameColumnSelect').value;
            const newName = document.getElementById('newColumnNameInput').value;
            
            if (!oldName || !newName) return;
            
            if (this.headers.includes(newName)) {
                alert(i18next.t('column_exists'));
                return;
            }
            
            this.headers = this.headers.map(h => h === oldName ? newName : h);
            
            this.data.forEach(row => {
                if (oldName in row) {
                    row[newName] = row[oldName];
                    delete row[oldName];
                }
            });
            
            // Update filters and sort if they reference this column
            if (this.sortColumn === oldName) {
                this.sortColumn = newName;
            }
            
            this.filters = this.filters.map(filter => {
                if (filter.column === oldName) {
                    return { ...filter, column: newName };
                }
                return filter;
            });
        } else if (action === 'delete') {
            const columnsToDelete = Array.from(document.getElementById('deleteColumnSelect').selectedOptions)
                .map(opt => opt.value);
            
            this.headers = this.headers.filter(h => !columnsToDelete.includes(h));
            
            this.data.forEach(row => {
                columnsToDelete.forEach(col => {
                    delete row[col];
                });
            });
            
            // Update filters and sort if they reference deleted columns
            if (columnsToDelete.includes(this.sortColumn)) {
                this.sortColumn = null;
            }
            
            this.filters = this.filters.filter(filter => !columnsToDelete.includes(filter.column));
        }
        // Reorder is handled in the drag-and-drop UI
        
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    // Filter and sort operations
    toggleFilterValue() {
        const operator = document.getElementById('filterOperator').value;
        document.getElementById('filterValue2').style.display = operator === 'between' ? 'inline-block' : 'none';
    }
    
    applyFilter() {
        const column = document.getElementById('filterColumn').value;
        const operator = document.getElementById('filterOperator').value;
        const value = document.getElementById('filterValue').value;
        const value2 = document.getElementById('filterValue2').value;
        
        if (!column || !value) return;
        
        this.saveState();
        
        // Remove any existing filter for this column
        this.filters = this.filters.filter(f => f.column !== column);
        
        // Add new filter
        this.filters.push({ column, operator, value, value2 });
        
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    clearFilters() {
        this.saveState();
        this.filters = [];
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    applySort() {
        const column = document.getElementById('sortColumn').value;
        const direction = document.getElementById('sortDirection').value;
        
        this.saveState();
        
        this.sortColumn = column;
        this.sortDirection = direction;
        
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    clearSort() {
        this.saveState();
        this.sortColumn = null;
        this.applyCurrentFiltersAndSort();
        this.updateUI();
    }
    
    // Analysis operations
    calculateColumnStats() {
        const column = document.getElementById('statsColumn').value;
        
        if (!column) return;
        
        this.worker.postMessage({
            action: 'calculateStats',
            data: this.data,
            column
        });
    }
    
    displayStats(results) {
        document.getElementById('statMean').textContent = results.mean.toFixed(2);
        document.getElementById('statMedian').textContent = results.median.toFixed(2);
        document.getElementById('statMode').textContent = results.mode.join(', ');
        document.getElementById('statStdDev').textContent = results.stdDev.toFixed(2);
        document.getElementById('statVariance').textContent = results.variance.toFixed(2);
        document.getElementById('statMin').textContent = results.min.toFixed(2);
        document.getElementById('statMax').textContent = results.max.toFixed(2);
        document.getElementById('statRange').textContent = (results.max - results.min).toFixed(2);
        document.getElementById('statQuartiles').textContent = `Q1: ${results.quartiles.q1.toFixed(2)}, Q3: ${results.quartiles.q3.toFixed(2)}`;
        document.getElementById('statCount').textContent = results.count;
        document.getElementById('statMissing').textContent = results.missing;
        document.getElementById('statUnique').textContent = results.unique;
    }
    
    calculateCorrelationMatrix() {
        this.worker.postMessage({
            action: 'calculateCorrelation',
            data: this.data,
            headers: this.headers
        });
    }
    
    displayCorrelation(matrix) {
        const resultsDiv = document.getElementById('correlationResults');
        resultsDiv.innerHTML = `
            <div class="matrix-container">
                <table class="correlation-table">
                    <thead>
                        <tr>
                            <th>${i18next.t('variable')}</th>
                            ${matrix.map(col => `<th>${col.column}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${matrix.map(row => `
                            <tr>
                                <th>${row.column}</th>
                                ${row.correlations.map(corr => {
                                    let color = '';
                                    if (corr >= 0.7) color = 'background-color: rgba(0, 128, 0, 0.3);';
                                    else if (corr <= -0.7) color = 'background-color: rgba(255, 0, 0, 0.3);';
                                    else if (Math.abs(corr) >= 0.3) color = 'background-color: rgba(255, 255, 0, 0.3);';
                                    return `<td style="${color}">${corr.toFixed(2)}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="correlation-help">
                <p><strong>${i18next.t('correlation_guide')}</strong></p>
                <p>1.0: ${i18next.t('perfect_correlation')}</p>
                <p>0.7-0.9: ${i18next.t('strong_correlation')}</p>
                <p>0.4-0.6: ${i18next.t('moderate_correlation')}</p>
                <p>0.1-0.3: ${i18next.t('weak_correlation')}</p>
                <p>0: ${i18next.t('no_correlation')}</p>
                <p>-0.3--0.1: ${i18next.t('weak_negative')}</p>
                <p>-0.6--0.4: ${i18next.t('moderate_negative')}</p>
                <p>-0.9--0.7: ${i18next.t('strong_negative')}</p>
                <p>-1.0: ${i18next.t('perfect_negative')}</p>
            </div>
        `;
    }
    
    calculateFrequency() {
        const column = document.getElementById('frequencyColumn').value;
        
        if (!column) return;
        
        this.worker.postMessage({
            action: 'calculateFrequency',
            data: this.data,
            column
        });
    }
    
    displayFrequency(results) {
        // Display chart
        const chartOptions = {
            series: [{
                name: i18next.t('frequency'),
                data: results.map(item => item.count)
            }],
            chart: {
                type: 'bar',
                height: 350
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '60%',
                    endingShape: 'rounded'
                },
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            xaxis: {
                categories: results.map(item => item.value),
                labels: {
                    rotate: -45
                }
            },
            yaxis: {
                title: {
                    text: i18next.t('count')
                }
            },
            fill: {
                opacity: 1
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val;
                    }
                }
            }
        };
        
        const chart = new ApexCharts(document.querySelector("#frequencyChart"), chartOptions);
        chart.render();
        
        // Display table
        const tableHtml = `
            <table class="frequency-table">
                <thead>
                    <tr>
                        <th>${i18next.t('value')}</th>
                        <th>${i18next.t('count')}</th>
                        <th>${i18next.t('percentage')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(item => `
                        <tr>
                            <td>${item.value}</td>
                            <td>${item.count}</td>
                            <td>${item.percentage.toFixed(2)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.querySelector('.frequency-table-container').innerHTML = tableHtml;
    }
    
    // Visualization operations
    toggleChartOptions() {
        const chartType = document.getElementById('chartType').value;
        document.getElementById('yAxisColumn').disabled = chartType === 'pie';
        document.getElementById('groupByColumn').disabled = chartType !== 'bar' && chartType !== 'line';
    }
    
    generateChart() {
        const chartType = document.getElementById('chartType').value;
        const xColumn = document.getElementById('xAxisColumn').value;
        const yColumn = document.getElementById('yAxisColumn').value;
        const groupByColumn = document.getElementById('groupByColumn').value;
        
        if (!xColumn || (!yColumn && chartType !== 'pie')) return;
        
        // Prepare data based on chart type
        let series = [];
        let categories = [];
        
        if (chartType === 'pie') {
            // Pie chart - frequency of xColumn
            const frequencyMap = {};
            this.data.forEach(row => {
                const key = String(row[xColumn]);
                frequencyMap[key] = (frequencyMap[key] || 0) + 1;
            });
            
            categories = Object.keys(frequencyMap);
            series = categories.map(cat => frequencyMap[cat]);
            
            const options = {
                series: series,
                chart: {
                    width: '100%',
                    type: 'pie',
                },
                labels: categories,
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }]
            };
            
            const chart = new ApexCharts(document.querySelector("#mainChart"), options);
            chart.render();
            
        } else if (chartType === 'bar' || chartType === 'line') {
            if (groupByColumn) {
                // Grouped bar/line chart
                const groups = {};
                this.data.forEach(row => {
                    const groupKey = String(row[groupByColumn]);
                    if (!groups[groupKey]) {
                        groups[groupKey] = {
                            name: groupKey,
                            data: []
                        };
                    }
                    
                    const xValue = String(row[xColumn]);
                    const yValue = parseFloat(row[yColumn]) || 0;
                    
                    if (!categories.includes(xValue)) {
                        categories.push(xValue);
                    }
                    
                    groups[groupKey].data.push(yValue);
                });
                
                // Ensure all series have data for all categories
                series = Object.values(groups);
                
                const options = {
                    series: series,
                    chart: {
                        type: chartType,
                        height: 350,
                        stacked: false
                    },
                    dataLabels: {
                        enabled: false
                    },
                    stroke: {
                        width: [2, 2, 2],
                        curve: 'smooth'
                    },
                    xaxis: {
                        categories: categories
                    },
                    yaxis: {
                        title: {
                            text: yColumn
                        }
                    },
                    tooltip: {
                        shared: true,
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                        horizontalAlign: 'left',
                        offsetX: 40
                    }
                };
                
                const chart = new ApexCharts(document.querySelector("#mainChart"), options);
                chart.render();
                
            } else {
                // Simple bar/line chart
                const dataMap = {};
                this.data.forEach(row => {
                    const xValue = String(row[xColumn]);
                    const yValue = parseFloat(row[yColumn]) || 0;
                    
                    dataMap[xValue] = yValue;
                });
                
                categories = Object.keys(dataMap);
                series = categories.map(cat => dataMap[cat]);
                
                const options = {
                    series: [{
                        name: yColumn,
                        data: series
                    }],
                    chart: {
                        type: chartType,
                        height: 350
                    },
                    plotOptions: {
                        bar: {
                            horizontal: false,
                            columnWidth: '55%',
                            endingShape: 'rounded'
                        },
                    },
                    dataLabels: {
                        enabled: false
                    },
                    stroke: {
                        show: true,
                        width: 2,
                        colors: ['transparent']
                    },
                    xaxis: {
                        categories: categories
                    },
                    yaxis: {
                        title: {
                            text: yColumn
                        }
                    },
                    fill: {
                        opacity: 1
                    },
                    tooltip: {
                        y: {
                            formatter: function (val) {
                                return val;
                            }
                        }
                    }
                };
                
                const chart = new ApexCharts(document.querySelector("#mainChart"), options);
                chart.render();
            }
        } else if (chartType === 'scatter') {
            // Scatter plot
            const seriesData = this.data.map(row => ({
                x: parseFloat(row[xColumn]) || 0,
                y: parseFloat(row[yColumn]) || 0
            }));
            
            const options = {
                series: [{
                    name: `${yColumn} vs ${xColumn}`,
                    data: seriesData
                }],
                chart: {
                    height: 350,
                    type: 'scatter',
                    zoom: {
                        enabled: true,
                        type: 'xy'
                    }
                },
                xaxis: {
                    title: {
                        text: xColumn
                    }
                },
                yaxis: {
                    title: {
                        text: yColumn
                    }
                }
            };
            
            const chart = new ApexCharts(document.querySelector("#mainChart"), options);
            chart.render();
        } else if (chartType === 'histogram') {
            // Histogram
            const values = this.data
                .map(row => parseFloat(row[yColumn]))
                .filter(v => !isNaN(v));
            
            const options = {
                series: [{
                    name: 'Frequency',
                    data: values
                }],
                chart: {
                    type: 'histogram',
                    height: 350
                },
                plotOptions: {
                    bar: {
                        borderRadius: 0,
                        horizontal: false,
                        distributed: true,
                        columnWidth: '80%',
                    }
                },
                dataLabels: {
                    enabled: false
                },
                xaxis: {
                    title: {
                        text: yColumn
                    }
                },
                yaxis: {
                    title: {
                        text: 'Frequency'
                    }
                }
            };
            
            const chart = new ApexCharts(document.querySelector("#mainChart"), options);
            chart.render();
        } else if (chartType === 'boxplot') {
            // Box plot
            const groups = {};
            this.data.forEach(row => {
                const groupKey = String(row[xColumn]);
                const value = parseFloat(row[yColumn]);
                
                if (!isNaN(value)) {
                    if (!groups[groupKey]) {
                        groups[groupKey] = [];
                    }
                    groups[groupKey].push(value);
                }
            });
            
            const series = Object.keys(groups).map(group => ({
                name: group,
                data: [
                    {
                        x: group,
                        y: this.calculateBoxPlotStats(groups[group])
                    }
                ]
            }));
            
            const options = {
                series: series,
                chart: {
                    type: 'boxPlot',
                    height: 350
                },
                plotOptions: {
                    boxPlot: {
                        colors: {
                            upper: '#5C4742',
                            lower: '#A5978B'
                        }
                    }
                },
                stroke: {
                    colors: ['#6C757D']
                },
                xaxis: {
                    title: {
                        text: xColumn
                    }
                },
                yaxis: {
                    title: {
                        text: yColumn
                    }
                }
            };
            
            const chart = new ApexCharts(document.querySelector("#mainChart"), options);
            chart.render();
        }
    }
    
    calculateBoxPlotStats(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const median = sorted[Math.floor(sorted.length * 0.5)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const min = Math.max(sorted[0], q1 - 1.5 * iqr);
        const max = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);
        
        return {
            low: min,
            q1: q1,
            median: median,
            q3: q3,
            high: max
        };
    }
    
    // Export operations
    exportData(format) {
        if (this.data.length === 0) {
            alert(i18next.t('no_data_export'));
            return;
        }
        
        let blob;
        let filename = `data_export_${new Date().toISOString().slice(0, 10)}.${format}`;
        
        if (format === 'csv') {
            const csv = Papa.unparse(this.data);
            blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(this.data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
            XLSX.writeFile(workbook, filename);
            return;
        } else if (format === 'json') {
            const json = JSON.stringify(this.data, null, 2);
            blob = new Blob([json], { type: 'application/json' });
        } else if (format === 'html') {
            const html = this.generateHtmlExport();
            blob = new Blob([html], { type: 'text/html' });
        }
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    generateHtmlExport() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Data Export</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .stats { margin-top: 30px; }
                    .stat-card { display: inline-block; margin: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>Data Export - ${new Date().toLocaleString()}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            ${this.headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.map((row, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                ${this.headers.map(h => `<td>${row[h] === null || row[h] === undefined ? '' : row[h]}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="stats">
                    <h2>Dataset Information</h2>
                    <div class="stat-card">Total Rows: ${this.data.length}</div>
                    <div class="stat-card">Total Columns: ${this.headers.length}</div>
                </div>
            </body>
            </html>
        `;
    }
    
    // UI Helpers
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activate selected tab
        document.getElementById(`${tabName}-tab`).classList.add('active');
        document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    }
    
    changeLanguage(lang) {
        i18next.changeLanguage(lang, () => {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                el.textContent = i18next.t(el.dataset.i18n);
            });
            
            document.querySelectorAll('[data-i18n-ph]').forEach(el => {
                el.placeholder = i18next.t(el.dataset.i18nPh);
            });
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n
    i18next.init({
        lng: 'en',
        resources: {
            en: {
                translation: {
                    file_upload: "File Upload",
                    drag_drop: "Drag & drop your file here or",
                    browse: "Browse",
                    operation_history: "Operation History",
                    undo: "Undo",
                    redo: "Redo",
                    clear: "Clear",
                    clean: "Clean",
                    transform: "Transform",
                    analyze: "Analyze",
                    visualize: "Visualize",
                    handle_empty: "Handle Empty Cells",
                    delete_rows: "Delete Rows with Empty Cells",
                    fill_cells: "Fill Empty Cells",
                    fill_column: "Fill by Column",
                    fill_value: "Value to fill",
                    apply: "Apply",
                    remove_duplicates: "Remove Duplicates",
                    all_columns: "All Columns",
                    selected_columns: "Selected Columns",
                    remove: "Remove",
                    fix_data: "Fix Data Issues",
                    replace_value: "Replace Value",
                    regex_replace: "Regex Replace",
                    trim_whitespace: "Trim Whitespace",
                    wrong_value: "Wrong value",
                    correct_value: "Correct value",
                    fix: "Fix",
                    handle_outliers: "Handle Outliers",
                    z_score: "Z-Score",
                    iqr: "IQR",
                    custom_threshold: "Custom Threshold",
                    remove_rows: "Remove Rows",
                    replace_values: "Replace Values",
                    winsorize: "Winsorize",
                    replacement_value: "Replacement value",
                    column_operations: "Column Operations",
                    change_type: "Change Type",
                    apply_formula: "Apply Formula",
                    extract_text: "Extract Text",
                    bin_numeric: "Bin Numeric",
                    date_operations: "Date Operations",
                    string: "String",
                    number: "Number",
                    boolean: "Boolean",
                    date: "Date",
                    formula_expression: "Formula (e.g., col1 + col2)",
                    new_column_name: "New column name",
                    manage_columns: "Manage Columns",
                    rename_column: "Rename Column",
                    delete_column: "Delete Column",
                    reorder_columns: "Reorder Columns",
                    new_name: "New name",
                    filter_sort: "Filter & Sort",
                    equals: "Equals",
                    not_equals: "Not Equals",
                    contains: "Contains",
                    greater: "Greater Than",
                    less: "Less Than",
                    between: "Between",
                    value: "Value",
                    max_value: "Max value",
                    filter: "Filter",
                    ascending: "Ascending",
                    descending: "Descending",
                    sort: "Sort",
                    column_stats: "Column Statistics",
                    calculate: "Calculate",
                    mean: "Mean",
                    median: "Median",
                    mode: "Mode",
                    std_dev: "Std Dev",
                    variance: "Variance",
                    min: "Min",
                    max: "Max",
                    range: "Range",
                    quartiles: "Quartiles",
                    count: "Count",
                    missing: "Missing",
                    unique: "Unique",
                    correlation: "Correlation Matrix",
                    frequency: "Frequency Distribution",
                    create_chart: "Create Chart",
                    line_chart: "Line Chart",
                    bar_chart: "Bar Chart",
                    pie_chart: "Pie Chart",
                    scatter_plot: "Scatter Plot",
                    histogram: "Histogram",
                    box_plot: "Box Plot",
                    none: "None",
                    generate: "Generate",
                    data_preview: "Data Preview",
                    rows_shown: "Rows {{from}}-{{to}} of {{total}}",
                    export_data: "Export Data",
                    memory_usage: "Memory: {{memory}} MB",
                    total_rows: "Total Rows: {{count}}",
                    columns: "Columns: {{count}}",
                    variable: "Variable",
                    no_data: "No data available",
                    percentage: "Percentage",
                    correlation_guide: "Correlation Guide",
                    perfect_correlation: "Perfect positive correlation",
                    strong_correlation: "Strong positive correlation",
                    moderate_correlation: "Moderate positive correlation",
                    weak_correlation: "Weak positive correlation",
                    no_correlation: "No correlation",
                    weak_negative: "Weak negative correlation",
                    moderate_negative: "Moderate negative correlation",
                    strong_negative: "Strong negative correlation",
                    perfect_negative: "Perfect negative correlation",
                    row: "#",
                    unsupported_file: "Unsupported file type",
                    error_parsing: "Error parsing file",
                    parsing_error: "parsing error",
                    invalid_regex: "Invalid regular expression",
                    no_numeric_data: "No numeric data in selected column",
                    column_exists: "Column with this name already exists",
                    no_data_export: "No data to export"
                }
            },
            es: {
                translation: {
                    file_upload: "Subir Archivo",
                    drag_drop: "Arrastra y suelta tu archivo aquí o",
                    browse: "Explorar",
                    operation_history: "Historial de Operaciones",
                    undo: "Deshacer",
                    redo: "Rehacer",
                    clear: "Limpiar",
                    clean: "Limpiar",
                    transform: "Transformar",
                    analyze: "Analizar",
                    visualize: "Visualizar",
                    handle_empty: "Manejar Celdas Vacías",
                    delete_rows: "Eliminar Filas con Celdas Vacías",
                    fill_cells: "Llenar Celdas Vacías",
                    fill_column: "Llenar por Columna",
                    fill_value: "Valor para llenar",
                    apply: "Aplicar",
                    remove_duplicates: "Eliminar Duplicados",
                    all_columns: "Todas las Columnas",
                    selected_columns: "Columnas Seleccionadas",
                    remove: "Eliminar",
                    fix_data: "Corregir Datos",
                    replace_value: "Reemplazar Valor",
                    regex_replace: "Reemplazo con Regex",
                    trim_whitespace: "Recortar Espacios",
                    wrong_value: "Valor incorrecto",
                    correct_value: "Valor correcto",
                    fix: "Corregir",
                    handle_outliers: "Manejar Valores Atípicos",
                    z_score: "Puntuación Z",
                    iqr: "Rango Intercuartílico",
                    custom_threshold: "Umbral Personalizado",
                    remove_rows: "Eliminar Filas",
                    replace_values: "Reemplazar Valores",
                    winsorize: "Winsorizar",
                    replacement_value: "Valor de reemplazo",
                    column_operations: "Operaciones de Columna",
                    change_type: "Cambiar Tipo",
                    apply_formula: "Aplicar Fórmula",
                    extract_text: "Extraer Texto",
                    bin_numeric: "Agrupar Numéricos",
                    date_operations: "Operaciones de Fecha",
                    string: "Texto",
                    number: "Número",
                    boolean: "Booleano",
                    date: "Fecha",
                    formula_expression: "Fórmula (ej., col1 + col2)",
                    new_column_name: "Nombre de nueva columna",
                    manage_columns: "Gestionar Columnas",
                    rename_column: "Renombrar Columna",
                    delete_column: "Eliminar Columna",
                    reorder_columns: "Reordenar Columnas",
                    new_name: "Nuevo nombre",
                    filter_sort: "Filtrar y Ordenar",
                    equals: "Igual a",
                    not_equals: "No igual a",
                    contains: "Contiene",
                    greater: "Mayor que",
                    less: "Menor que",
                    between: "Entre",
                    value: "Valor",
                    max_value: "Valor máximo",
                    filter: "Filtrar",
                    ascending: "Ascendente",
                    descending: "Descendente",
                    sort: "Ordenar",
                    column_stats: "Estadísticas de Columna",
                    calculate: "Calcular",
                    mean: "Media",
                    median: "Mediana",
                    mode: "Moda",
                    std_dev: "Desv. Estándar",
                    variance: "Varianza",
                    min: "Mínimo",
                    max: "Máximo",
                    range: "Rango",
                    quartiles: "Cuartiles",
                    count: "Conteo",
                    missing: "Faltantes",
                    unique: "Únicos",
                    correlation: "Matriz de Correlación",
                    frequency: "Distribución de Frecuencia",
                    create_chart: "Crear Gráfico",
                    line_chart: "Gráfico de Líneas",
                    bar_chart: "Gráfico de Barras",
                    pie_chart: "Gráfico de Pastel",
                    scatter_plot: "Gráfico de Dispersión",
                    histogram: "Histograma",
                    box_plot: "Diagrama de Caja",
                    none: "Ninguno",
                    generate: "Generar",
                    data_preview: "Vista Previa de Datos",
                    rows_shown: "Filas {{from}}-{{to}} de {{total}}",
                    export_data: "Exportar Datos",
                    memory_usage: "Memoria: {{memory}} MB",
                    total_rows: "Total Filas: {{count}}",
                    columns: "Columnas: {{count}}",
                    variable: "Variable",
                    no_data: "Sin datos disponibles",
                    percentage: "Porcentaje",
                    correlation_guide: "Guía de Correlación",
                    perfect_correlation: "Correlación positiva perfecta",
                    strong_correlation: "Correlación positiva fuerte",
                    moderate_correlation: "Correlación positiva moderada",
                    weak_correlation: "Correlación positiva débil",
                    no_correlation: "Sin correlación",
                    weak_negative: "Correlación negativa débil",
                    moderate_negative: "Correlación negativa moderada",
                    strong_negative: "Correlación negativa fuerte",
                    perfect_negative: "Correlación negativa perfecta",
                    row: "#",
                    unsupported_file: "Tipo de archivo no soportado",
                    error_parsing: "Error al analizar archivo",
                    parsing_error: "error de análisis",
                    invalid_regex: "Expresión regular inválida",
                    no_numeric_data: "No hay datos numéricos en la columna seleccionada",
                    column_exists: "Ya existe una columna con este nombre",
                    no_data_export: "No hay datos para exportar"
                }
            },
            fr: {
                translation: {
                    file_upload: "Téléverser un fichier",
                    drag_drop: "Glissez-déposez votre fichier ici ou",
                    browse: "Parcourir",
                    operation_history: "Historique des opérations",
                    undo: "Annuler",
                    redo: "Rétablir",
                    clear: "Effacer",
                    clean: "Nettoyer",
                    transform: "Transformer",
                    analyze: "Analyser",
                    visualize: "Visualiser",
                    handle_empty: "Gérer les cellules vides",
                    delete_rows: "Supprimer les lignes avec cellules vides",
                    fill_cells: "Remplir les cellules vides",
                    fill_column: "Remplir par colonne",
                    fill_value: "Valeur de remplissage",
                    apply: "Appliquer",
                    remove_duplicates: "Supprimer les doublons",
                    all_columns: "Toutes les colonnes",
                    selected_columns: "Colonnes sélectionnées",
                    remove: "Supprimer",
                    fix_data: "Corriger les données",
                    replace_value: "Remplacer la valeur",
                    regex_replace: "Remplacer par regex",
                    trim_whitespace: "Supprimer les espaces",
                    wrong_value: "Valeur incorrecte",
                    correct_value: "Valeur correcte",
                    fix: "Corriger",
                    handle_outliers: "Gérer les valeurs aberrantes",
                    z_score: "Score Z",
                    iqr: "Écart interquartile",
                    custom_threshold: "Seuil personnalisé",
                    remove_rows: "Supprimer les lignes",
                    replace_values: "Remplacer les valeurs",
                    winsorize: "Winsoriser",
                    replacement_value: "Valeur de remplacement",
                    column_operations: "Opérations sur les colonnes",
                    change_type: "Changer le type",
                    apply_formula: "Appliquer une formule",
                    extract_text: "Extraire du texte",
                    bin_numeric: "Regrouper les numériques",
                    date_operations: "Opérations sur les dates",
                    string: "Chaîne",
                    number: "Nombre",
                    boolean: "Booléen",
                    date: "Date",
                    formula_expression: "Formule (ex., col1 + col2)",
                    new_column_name: "Nom de la nouvelle colonne",
                    manage_columns: "Gérer les colonnes",
                    rename_column: "Renommer la colonne",
                    delete_column: "Supprimer la colonne",
                    reorder_columns: "Réorganiser les colonnes",
                    new_name: "Nouveau nom",
                    filter_sort: "Filtrer et Trier",
                    equals: "Égal à",
                    not_equals: "Différent de",
                    contains: "Contient",
                    greater: "Supérieur à",
                    less: "Inférieur à",
                    between: "Entre",
                    value: "Valeur",
                    max_value: "Valeur maximale",
                    filter: "Filtrer",
                    ascending: "Croissant",
                    descending: "Décroissant",
                    sort: "Trier",
                    column_stats: "Statistiques des colonnes",
                    calculate: "Calculer",
                    mean: "Moyenne",
                    median: "Médiane",
                    mode: "Mode",
                    std_dev: "Écart-type",
                    variance: "Variance",
                    min: "Minimum",
                    max: "Maximum",
                    range: "Plage",
                    quartiles: "Quartiles",
                    count: "Nombre",
                    missing: "Manquants",
                    unique: "Uniques",
                    correlation: "Matrice de corrélation",
                    frequency: "Distribution des fréquences",
                    create_chart: "Créer un graphique",
                    line_chart: "Graphique en ligne",
                    bar_chart: "Graphique à barres",
                    pie_chart: "Graphique circulaire",
                    scatter_plot: "Nuage de points",
                    histogram: "Histogramme",
                    box_plot: "Boîte à moustaches",
                    none: "Aucun",
                    generate: "Générer",
                    data_preview: "Aperçu des données",
                    rows_shown: "Lignes {{from}}-{{to}} sur {{total}}",
                    export_data: "Exporter les données",
                    memory_usage: "Mémoire: {{memory}} Mo",
                    total_rows: "Total des lignes: {{count}}",
                    columns: "Colonnes: {{count}}",
                    variable: "Variable",
                    no_data: "Aucune donnée disponible",
                    percentage: "Pourcentage",
                    correlation_guide: "Guide de corrélation",
                    perfect_correlation: "Corrélation positive parfaite",
                    strong_correlation: "Corrélation positive forte",
                    moderate_correlation: "Corrélation positive modérée",
                    weak_correlation: "Corrélation positive faible",
                    no_correlation: "Pas de corrélation",
                    weak_negative: "Corrélation négative faible",
                    moderate_negative: "Corrélation négative modérée",
                    strong_negative: "Corrélation négative forte",
                    perfect_negative: "Corrélation négative parfaite",
                    row: "#",
                    unsupported_file: "Type de fichier non pris en charge",
                    error_parsing: "Erreur lors de l'analyse du fichier",
                    parsing_error: "erreur d'analyse",
                    invalid_regex: "Expression régulière invalide",
                    no_numeric_data: "Aucune donnée numérique dans la colonne sélectionnée",
                    column_exists: "Une colonne avec ce nom existe déjà",
                    no_data_export: "Aucune donnée à exporter"
                }
            }
        }
    }, () => {
        // Initialize the data manager after i18n is ready
        const dataManager = new DataManager();
        window.dataManager = dataManager; // Make it available globally for debugging
        
        // Apply translations
        dataManager.changeLanguage('en');
    });
});