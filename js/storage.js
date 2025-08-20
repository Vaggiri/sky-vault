import { supabase } from './auth.js';

// DOM Elements
const filesList = document.getElementById('files-list');
const gridView = document.getElementById('grid-view');
const emptyState = document.getElementById('empty-state');
const breadcrumbs = document.getElementById('breadcrumbs');
const searchFiles = document.getElementById('search-files');
const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const listView = document.getElementById('list-view');

// Current path state
let currentPath = '';

// Load files from Supabase Storage
async function loadFiles(path = '') {
    try {
        currentPath = path;
        updateBreadcrumbs(path);
        
        // Get files from the current path
        const { data: files, error } = await supabase.storage
            .from('user-files')
            .list(path);
        
        if (error) throw error;
        
        // Filter out folders (if any) and empty files
        const validFiles = files.filter(file => file.name && !file.name.endsWith('/'));
        
        // Display files or empty state
        if (validFiles.length > 0) {
            displayFiles(validFiles, path);
            emptyState.classList.add('hidden');
            filesList.classList.remove('hidden');
            gridView.classList.remove('hidden');
        } else {
            emptyState.classList.remove('hidden');
            filesList.classList.add('hidden');
            gridView.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        showNotification('Failed to load files. Please try again.', 'error');
    }
}

// Display files in list and grid views
function displayFiles(files, path) {
    // Clear existing files
    filesList.innerHTML = '';
    gridView.innerHTML = '';
    
    files.forEach(file => {
        // Create list view item
        const listItem = createFileListItem(file, path);
        filesList.appendChild(listItem);
        
        // Create grid view item
        const gridItem = createFileGridItem(file, path);
        gridView.appendChild(gridItem);
    });
}

// Create file item for list view
function createFileListItem(file, path) {
    const fileExt = getFileExtension(file.name);
    const fileType = getFileType(fileExt);
    const fileSize = formatFileSize(file.metadata?.size || 0);
    const modifiedDate = new Date(file.created_at).toLocaleString();
    
    const item = document.createElement('div');
    item.className = 'grid grid-cols-12 gap-4 p-4 items-center file-item transition-colors';
    item.dataset.fileId = file.id;
    item.dataset.fileName = file.name;
    item.dataset.filePath = path;
    
    item.innerHTML = `
        <div class="col-span-6 flex items-center">
            <div class="file-icon ${fileExt}">
                <i class="${getFileIcon(fileExt)}"></i>
            </div>
            <div>
                <p class="font-medium text-gray-800 truncate">${file.name}</p>
                <p class="text-xs text-gray-500">${fileType}</p>
            </div>
        </div>
        <div class="col-span-2 text-sm text-gray-600">${fileSize}</div>
        <div class="col-span-3 text-sm text-gray-600">${modifiedDate}</div>
        <div class="col-span-1 flex justify-end">
            <button class="file-action-btn p-2 text-gray-500 hover:text-blue-500 transition" data-file-id="${file.id}" data-file-name="${file.name}">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        </div>
    `;
    
    // Add click event to open file
    item.addEventListener('dblclick', () => handleFileAction(file, 'open'));
    
    return item;
}

// Create file item for grid view
function createFileGridItem(file, path) {
    const fileExt = getFileExtension(file.name);
    const fileType = getFileType(fileExt);
    
    const item = document.createElement('div');
    item.className = 'bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 hover-grow';
    item.dataset.fileId = file.id;
    item.dataset.fileName = file.name;
    item.dataset.filePath = path;
    
    item.innerHTML = `
        <div class="p-4 flex flex-col items-center text-center">
            <div class="file-icon ${fileExt} mb-3 w-16 h-16">
                <i class="${getFileIcon(fileExt)} text-2xl"></i>
            </div>
            <p class="font-medium text-gray-800 mb-1 truncate w-full">${file.name}</p>
            <p class="text-xs text-gray-500 mb-3">${fileType}</p>
            <button class="file-action-btn px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition" data-file-id="${file.id}" data-file-name="${file.name}">
                <i class="fas fa-ellipsis-h"></i> Actions
            </button>
        </div>
    `;
    
    // Add click event to open file
    item.addEventListener('dblclick', () => handleFileAction(file, 'open'));
    
    return item;
}

// Update breadcrumbs based on current path
function updateBreadcrumbs(path) {
    breadcrumbs.innerHTML = '';
    
    // Add root breadcrumb
    const rootCrumb = document.createElement('a');
    rootCrumb.href = '#';
    rootCrumb.className = 'text-blue-500 hover:underline';
    rootCrumb.textContent = 'SkyVault';
    rootCrumb.dataset.path = '';
    rootCrumb.addEventListener('click', (e) => {
        e.preventDefault();
        loadFiles('');
    });
    breadcrumbs.appendChild(rootCrumb);
    
    // Add path breadcrumbs if path exists
    if (path) {
        const parts = path.split('/').filter(part => part !== '');
        let currentPath = '';
        
        parts.forEach((part, index) => {
            const separator = document.createElement('span');
            separator.className = 'mx-2 text-gray-400';
            separator.textContent = '/';
            breadcrumbs.appendChild(separator);
            
            currentPath += `${part}/`;
            
            const crumb = document.createElement('a');
            crumb.href = '#';
            crumb.className = 'text-blue-500 hover:underline';
            crumb.textContent = part;
            crumb.dataset.path = currentPath;
            crumb.addEventListener('click', (e) => {
                e.preventDefault();
                loadFiles(currentPath);
            });
            
            breadcrumbs.appendChild(crumb);
        });
    }
}

// Handle file actions (open, download, delete, etc.)
async function handleFileAction(file, action) {
    try {
        const filePath = currentPath ? `${currentPath}${file.name}` : file.name;
        
        switch (action) {
            case 'open':
                // For images, PDFs, etc., we might want to preview them
                if (isPreviewable(file.name)) {
                    previewFile(filePath);
                } else {
                    downloadFile(filePath, file.name);
                }
                break;
                
            case 'download':
                downloadFile(filePath, file.name);
                break;
                
            case 'delete':
                if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
                    const { error } = await supabase.storage
                        .from('user-files')
                        .remove([filePath]);
                    
                    if (error) throw error;
                    
                    showNotification('File deleted successfully!', 'success');
                    loadFiles(currentPath);
                }
                break;
                
            case 'rename':
                const newName = prompt('Enter new file name:', file.name);
                if (newName && newName !== file.name) {
                    await renameFile(filePath, newName);
                }
                break;
                
            case 'share':
                shareFile(filePath, file.name);
                break;
        }
    } catch (error) {
        console.error('Error handling file action:', error);
        showNotification(`Failed to ${action} file. Please try again.`, 'error');
    }
}

// Download file
async function downloadFile(filePath, fileName) {
    try {
        const { data, error } = await supabase.storage
            .from('user-files')
            .download(filePath);
        
        if (error) throw error;
        
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Download started!', 'success');
    } catch (error) {
        throw error;
    }
}

// Rename file
async function renameFile(oldPath, newName) {
    try {
        const newPath = currentPath ? `${currentPath}${newName}` : newName;
        
        const { data, error } = await supabase.storage
            .from('user-files')
            .move(oldPath, newPath);
        
        if (error) throw error;
        
        showNotification('File renamed successfully!', 'success');
        loadFiles(currentPath);
    } catch (error) {
        throw error;
    }
}

// Share file (generate public URL)
async function shareFile(filePath, fileName) {
    try {
        const { data } = supabase.storage
            .from('user-files')
            .getPublicUrl(filePath);
        
        if (data) {
            const publicUrl = data.publicUrl;
            prompt(`Share link for ${fileName}:`, publicUrl);
            showNotification('Share link copied to clipboard!', 'success');
        }
    } catch (error) {
        throw error;
    }
}

// Preview file (for supported formats)
function previewFile(filePath) {
    // This would open a modal with the file preview
    // Implementation depends on the file type
    alert(`Previewing ${filePath}`);
}

// Check if file is previewable
function isPreviewable(fileName) {
    const ext = getFileExtension(fileName).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(ext);
}

// Get file extension
function getFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
}

// Get file type from extension
function getFileType(ext) {
    const types = {
        'jpg': 'JPEG Image',
        'jpeg': 'JPEG Image',
        'png': 'PNG Image',
        'gif': 'GIF Image',
        'pdf': 'PDF Document',
        'doc': 'Word Document',
        'docx': 'Word Document',
        'xls': 'Excel Spreadsheet',
        'xlsx': 'Excel Spreadsheet',
        'ppt': 'PowerPoint',
        'pptx': 'PowerPoint',
        'txt': 'Text File',
        'zip': 'ZIP Archive',
        'rar': 'RAR Archive',
        'mp3': 'Audio File',
        'wav': 'Audio File',
        'mp4': 'Video File',
        'mov': 'Video File'
    };
    
    return types[ext] || `${ext.toUpperCase()} File`;
}

// Get Font Awesome icon for file type
function getFileIcon(ext) {
    const icons = {
        'jpg': 'far fa-file-image',
        'jpeg': 'far fa-file-image',
        'png': 'far fa-file-image',
        'gif': 'far fa-file-image',
        'pdf': 'far fa-file-pdf',
        'doc': 'far fa-file-word',
        'docx': 'far fa-file-word',
        'xls': 'far fa-file-excel',
        'xlsx': 'far fa-file-excel',
        'ppt': 'far fa-file-powerpoint',
        'pptx': 'far fa-file-powerpoint',
        'txt': 'far fa-file-alt',
        'zip': 'far fa-file-archive',
        'rar': 'far fa-file-archive',
        'mp3': 'far fa-file-audio',
        'wav': 'far fa-file-audio',
        'mp4': 'far fa-file-video',
        'mov': 'far fa-file-video'
    };
    
    return icons[ext] || 'far fa-file';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Event listeners for view toggle
gridViewBtn.addEventListener('click', () => {
    gridViewBtn.classList.add('text-blue-500');
    listViewBtn.classList.remove('text-blue-500');
    gridView.classList.remove('hidden');
    listView.classList.add('hidden');
});

listViewBtn.addEventListener('click', () => {
    listViewBtn.classList.add('text-blue-500');
    gridViewBtn.classList.remove('text-blue-500');
    listView.classList.remove('hidden');
    gridView.classList.add('hidden');
});

// Event delegation for file action buttons
document.addEventListener('click', (e) => {
    if (e.target.closest('.file-action-btn')) {
        const btn = e.target.closest('.file-action-btn');
        const fileId = btn.dataset.fileId;
        const fileName = btn.dataset.fileName;
        
        // Show context menu
        showFileContextMenu(btn, fileId, fileName);
    }
});

// Show file context menu
function showFileContextMenu(button, fileId, fileName) {
    const contextMenu = document.getElementById('file-context-menu');
    const rect = button.getBoundingClientRect();
    
    // Position the menu
    contextMenu.style.top = `${rect.bottom + window.scrollY}px`;
    contextMenu.style.left = `${rect.left + window.scrollX}px`;
    
    // Set file ID and name for menu actions
    contextMenu.dataset.fileId = fileId;
    contextMenu.dataset.fileName = fileName;
    
    // Show menu
    contextMenu.classList.remove('hidden');
    
    // Close menu when clicking elsewhere
    const closeMenu = (e) => {
        if (!contextMenu.contains(e.target) && e.target !== button) {
            contextMenu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
        }
    };
    
    document.addEventListener('click', closeMenu);
}

// Handle context menu actions
document.getElementById('file-context-menu').addEventListener('click', (e) => {
    e.preventDefault();
    const menuItem = e.target.closest('.context-menu-item');
    if (!menuItem) return;
    
    const action = menuItem.dataset.action;
    const fileId = e.currentTarget.dataset.fileId;
    const fileName = e.currentTarget.dataset.fileName;
    
    // Find the file in the DOM to get its path
    const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
    const filePath = fileElement.dataset.filePath;
    
    // Create a file object to pass to handleFileAction
    const file = {
        id: fileId,
        name: fileName,
        metadata: { size: 0 }, // Placeholder, actual size would be from the file data
        created_at: new Date().toISOString()
    };
    
    handleFileAction(file, action);
});

// Search files
searchFiles.addEventListener('input', debounce(() => {
    const searchTerm = searchFiles.value.toLowerCase();
    const fileItems = document.querySelectorAll('.file-item, #grid-view > div');
    
    if (searchTerm === '') {
        fileItems.forEach(item => item.style.display = '');
        return;
    }
    
    fileItems.forEach(item => {
        const fileName = item.dataset.fileName.toLowerCase();
        if (fileName.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}, 300));

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Export loadFiles for use in auth module
export { loadFiles };