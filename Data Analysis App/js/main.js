// Main application module
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modules
    initFileHandler();
    initDuplicateHandler();
    initEmptyCellHandler();
    initFormatHandler();
    initTextHandler();
    initColumnHandler();
    DataVisualizer.init();
});