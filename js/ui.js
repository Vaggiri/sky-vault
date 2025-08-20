// DOM Elements
const uploadModal = document.getElementById('upload-modal');
const closeUploadModal = document.getElementById('close-upload-modal');
const uploadBtn = document.getElementById('upload-btn');
const uploadEmptyBtn = document.getElementById('upload-empty-btn');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const uploadProgress = document.getElementById('upload-progress');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadPercentage = document.getElementById('upload-percentage');
const uploadSuccess = document.getElementById('upload-success');
const loadingScreen = document.getElementById('loading-screen');

// Initialize UI components
function initUI() {
    // Hide loading screen after 1.5 seconds (simulate loading)
    setTimeout(() => {
        loadingScreen.classList.add('opacity-0');
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500);
    }, 1500);
    
    // Set up upload modal
    setupUploadModal();
    
    // Set up drag and drop
    setupDragAndDrop();
}

// Set up upload modal
function setupUploadModal() {
    uploadBtn.addEventListener('click', toggleUploadModal);
    uploadEmptyBtn.addEventListener('click', toggleUploadModal);
    closeUploadModal.addEventListener('click', toggleUploadModal);
    
    fileInput.addEventListener('change', handleFileSelection);
}

// Toggle upload modal
function toggleUploadModal() {
    uploadModal.classList.toggle('hidden');
    const modalContent = uploadModal.querySelector('div > div');
    
    if (uploadModal.classList.contains('hidden')) {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        
        // Reset upload state when closing
        resetUploadState();
    } else {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }
}

// Set up drag and drop
function setupDragAndDrop() {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);
    
    // Also handle click on upload area
    uploadArea.addEventListener('click', () => fileInput.click());
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    uploadArea.classList.add('border-blue-500', 'bg-blue-50');
}

function unhighlight() {
    uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length) {
        handleFiles(files);
    }
}

function handleFileSelection() {
    if (fileInput.files.length) {
        handleFiles(fileInput.files);
    }
}

// Handle selected/dropped files
async function handleFiles(files) {
    // Show upload progress
    uploadArea.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Upload each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = currentPath ? `${currentPath}${file.name}` : file.name;
            
            // Check if file already exists
            const { data: existingFiles } = await supabase.storage
                .from('user-files')
                .list(currentPath || '');
                
            if (existingFiles?.some(f => f.name === file.name)) {
                const overwrite = confirm(`"${file.name}" already exists. Overwrite?`);
                if (!overwrite) continue;
            }
            
            // Upload file with progress tracking
            const { error } = await supabase.storage
                .from('user-files')
                .upload(filePath, file, {
                    upsert: true,
                    cacheControl: '3600',
                    contentType: file.type,
                    onProgress: (progress) => {
                        const percentage = Math.round((progress.loaded / progress.total) * 100);
                        updateProgress(percentage);
                    }
                });
            
            if (error) throw error;
        }
        
        // Show success state
        uploadProgress.classList.add('hidden');
        uploadSuccess.classList.remove('hidden');
        
        // Reload files after a short delay
        setTimeout(() => {
            loadFiles(currentPath);
            resetUploadState();
            toggleUploadModal();
        }, 1500);
    } catch (error) {
        console.error('Error uploading files:', error);
        showNotification('Failed to upload files. Please try again.', 'error');
        resetUploadState();
    }
}

// Update upload progress
function updateProgress(percentage) {
    uploadProgressBar.style.width = `${percentage}%`;
    uploadPercentage.textContent = `${percentage}%`;
}

// Reset upload state
function resetUploadState() {
    uploadArea.classList.remove('hidden');
    uploadProgress.classList.add('hidden');
    uploadSuccess.classList.add('hidden');
    uploadProgressBar.style.width = '0%';
    uploadPercentage.textContent = '0%';
    fileInput.value = '';
}

// Show notification
function showNotification(message, type = 'info') {
    // In a real app, you'd use a proper notification system
    console.log(`${type}: ${message}`);
    alert(`${type}: ${message}`); // Temporary solution
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI);

// Export for use in main module
export { toggleUploadModal };