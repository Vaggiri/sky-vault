import { loadFiles } from './storage.js';
import { toggleUploadModal } from './ui.js';

// Initialize the application
function initApp() {
    // Any additional initialization can go here
    
    // Example: Load files if on file browser page
    if (document.getElementById('file-browser')) {
        loadFiles();
    }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);