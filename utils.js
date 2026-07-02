
## **29. js/utils.js (Complete Full Version)**

```javascript
// Utility Functions for AMISTY POS

// Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = 
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
    
    // Add hover pause
    toast.addEventListener('mouseenter', () => {
        toast.style.animationPlayState = 'paused';
    });
    
    toast.addEventListener('mouseleave', () => {
        toast.style.animationPlayState = 'running';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 1000);
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Modal System
function showModal(content, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal-content animate-scale-in';
    
    if (options.title) {
        const titleBar = document.createElement('div');
        titleBar.className = 'modal-title';
        titleBar.innerHTML = `
            <h3>${options.title}</h3>
            ${options.showClose !== false ? '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">×</button>' : ''}
        `;
        modal.appendChild(titleBar);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'modal-body';
    
    if (typeof content === 'string') {
        contentDiv.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        contentDiv.appendChild(content);
    }
    
    modal.appendChild(contentDiv);
    overlay.appendChild(modal);
    
    if (options.closeOnOverlay !== false) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }
    
    // Add escape key listener
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    overlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', escapeHandler);
    });
    
    document.body.appendChild(overlay);
    
    return {
        close: () => overlay.remove(),
        element: modal,
        overlay: overlay
    };
}

// Confirm Dialog
function confirmDialog(message) {
    return new Promise((resolve) => {
        const content = document.createElement('div');
        content.className = 'confirm-dialog';
        content.innerHTML = `
            <div class="confirm-icon">⚠️</div>
            <p class="confirm-message">${message}</p>
            <div class="confirm-actions">
                <button class="btn btn-secondary" id="confirmNo">Cancel</button>
                <button class="btn btn-primary" id="confirmYes">Confirm</button>
            </div>
        `;
        
        const modal = showModal(content, { 
            title: 'Confirm Action',
            showClose: false,
            closeOnOverlay: false
        });
        
        modal.element.querySelector('#confirmYes').onclick = () => {
            modal.close();
            resolve(true);
        };
        
        modal.element.querySelector('#confirmNo').onclick = () => {
            modal.close();
            resolve(false);
        };
    });
}

// Prompt Dialog
function promptDialog(message, defaultValue = '') {
    return new Promise((resolve) => {
        const content = document.createElement('div');
        content.className = 'prompt-dialog';
        content.innerHTML = `
            <p class="prompt-message">${message}</p>
            <input type="text" class="prompt-input" value="${defaultValue}" autofocus>
            <div class="prompt-actions">
                <button class="btn btn-secondary" id="promptCancel">Cancel</button>
                <button class="btn btn-primary" id="promptOk">OK</button>
            </div>
        `;
        
        const modal = showModal(content, { 
            title: 'Input Required',
            showClose: false,
            closeOnOverlay: false
        });
        
        const input = modal.element.querySelector('.prompt-input');
        input.focus();
        input.select();
        
        modal.element.querySelector('#promptOk').onclick = () => {
            modal.close();
            resolve(input.value);
        };
        
        modal.element.querySelector('#promptCancel').onclick = () => {
            modal.close();
            resolve(null);
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                modal.close();
                resolve(input.value);
            }
        });
    });
}

// Currency Formatting
function formatCurrency(amount) {
    const settings = StorageHelper.get('amisty_pos_settings', {});
    const currency = settings.currency || 'KSh';
    return `${currency} ${Number(amount).toLocaleString('en-KE')}`;
}

function parseCurrency(currencyString) {
    return parseFloat(currencyString.replace(/[^0-9.-]/g, '')) || 0;
}

// Date Formatting
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateShort(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-KE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Generate Product Code
function generateProductCode(category, index) {
    const settings = StorageHelper.get('amisty_pos_settings', {});
    const prefix = settings.productCodePrefix || 'AMY-';
    const catPrefix = category.substring(0, 3).toUpperCase();
    const number = String(index).padStart(3, '0');
    return `${prefix}${catPrefix}-${number}`;
}

// Export Functions
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        csv += headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    DataManager.downloadBlob(blob, `${filename}.csv`);
    showToast('CSV exported successfully!', 'success');
}

function exportToWord(data, filename) {
    if (!data || data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]);
    
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:w="urn:schemas-microsoft-com:office:word" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #87CEEB; color: white; padding: 8px; text-align: left; }
                td { border: 1px solid #ddd; padding: 8px; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                h2 { color: #2D3436; }
            </style>
        </head>
        <body>
            <h2>${filename}</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    const blob = new Blob(['\ufeff' + html], { 
        type: 'application/msword' 
    });
    DataManager.downloadBlob(blob, `${filename}.doc`);
    showToast('Word document exported successfully!', 'success');
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle Function
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Get URL Parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Set URL Parameters without reload
function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

// Copy to Clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            showToast('Failed to copy', 'error');
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

// Generate Unique ID
function generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Truncate Text
function truncateText(text, maxLength = 50) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Check if Online
function isOnline() {
    return navigator.onLine;
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Escape HTML
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Parse HTML entities
function unescapeHTML(str) {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent;
}

// Local Storage Helpers
const StorageHelper = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
};

// Check for logout message on page load
document.addEventListener('DOMContentLoaded', () => {
    const message = sessionStorage.getItem('logoutMessage');
    if (message) {
        showToast(message, 'warning');
        sessionStorage.removeItem('logoutMessage');
    }
});

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show toast for every error to avoid spam
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An error occurred. Please try again.', 'error');
});