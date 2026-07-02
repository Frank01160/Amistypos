// Utility Functions
function formatCurrency(amount) {
    const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
    const currency = settings.currency || 'KSh';
    return `${currency} ${Number(amount).toLocaleString('en-KE')}`;
}

function formatDate(dateString) {
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function generateProductCode(category, index) {
    const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
    const prefix = settings.productCodePrefix || 'AMY-';
    const catPrefix = category.substring(0, 3).toUpperCase();
    return `${prefix}${catPrefix}-${String(index).padStart(3, '0')}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-right`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span>${icons[type] || ''}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showModal(content, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal-content animate-scale-in';
    
    if (options.title) {
        const title = document.createElement('h3');
        title.style.marginBottom = '1rem';
        title.textContent = options.title;
        modal.appendChild(title);
    }
    
    if (typeof content === 'string') {
        modal.innerHTML += content;
    } else {
        modal.appendChild(content);
    }
    
    if (options.showClose !== false) {
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.className = 'btn-secondary';
        closeBtn.style.marginTop = '1rem';
        closeBtn.onclick = () => overlay.remove();
        modal.appendChild(closeBtn);
    }
    
    overlay.appendChild(modal);
    overlay.onclick = (e) => {
        if (e.target === overlay && options.closeOnOverlay !== false) {
            overlay.remove();
        }
    };
    
    document.body.appendChild(overlay);
    
    return {
        close: () => overlay.remove(),
        element: modal
    };
}

function confirmDialog(message) {
    return new Promise((resolve) => {
        const content = document.createElement('div');
        content.innerHTML = `
            <p style="margin-bottom: 1.5rem;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="btn-secondary" id="confirmNo">No</button>
                <button class="btn-primary" id="confirmYes">Yes</button>
            </div>
        `;
        
        const modal = showModal(content, { showClose: false, closeOnOverlay: false });
        
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

function exportToCSV(data, filename) {
    let csv = '';
    
    if (data.length > 0) {
        // Headers
        csv += Object.keys(data[0]).join(',') + '\n';
        
        // Rows
        data.forEach(row => {
            csv += Object.values(row).map(value => {
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }).join(',') + '\n';
        });
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function exportToWord(data, filename) {
    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #87CEEB; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h2>${filename}</h2>
            <table>
                <thead>
                    <tr>
                        ${Object.keys(data[0] || {}).map(key => `<th>${key}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    a.click();
    window.URL.revokeObjectURL(url);
}

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

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Check for logout message
document.addEventListener('DOMContentLoaded', () => {
    const message = sessionStorage.getItem('logoutMessage');
    if (message) {
        showToast(message, 'warning');
        sessionStorage.removeItem('logoutMessage');
    }
});