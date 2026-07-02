// Authentication System
let currentUser = null;
let loginAttempts = 0;
let lockoutUntil = null;
let sessionTimer = null;

// Default credentials
const DEFAULT_MANAGER_PASSWORD = 'admin123';
const DEFAULT_SELLER_PASSWORD = 'seller123';

// Simple toast function (standalone, doesn't depend on other files)
function showToastMessage(message, type = 'info') {
    // Create container if it doesn't exist
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    
    // Set colors based on type
    const colors = {
        success: 'linear-gradient(135deg, #90EE90, #6FCF6F)',
        error: 'linear-gradient(135deg, #FF6B6B, #EE5A24)',
        warning: 'linear-gradient(135deg, #FECA57, #F79F1F)',
        info: 'linear-gradient(135deg, #87CEEB, #5BA3D9)'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.style.cssText = `
        padding: 15px 25px;
        border-radius: 10px;
        color: ${type === 'warning' ? '#2D3436' : 'white'};
        font-weight: 500;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 300px;
        background: ${colors[type] || colors.info};
    `;
    
    toast.innerHTML = `
        <span>${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Simple settings getter that works without Firebase
function getSettingsLocal() {
    try {
        const settings = localStorage.getItem('amisty_pos_settings');
        return settings ? JSON.parse(settings) : null;
    } catch (error) {
        console.warn('Settings fetch error:', error);
        return null;
    }
}

function selectRole(role) {
    const loginForm = document.getElementById('loginForm');
    const loginTitle = document.getElementById('loginTitle');
    
    if (!loginForm || !loginTitle) {
        console.error('Login form elements not found');
        return;
    }
    
    loginForm.classList.remove('hidden');
    loginTitle.textContent = role === 'manager' ? 'Manager Login' : 'Seller Login';
    
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
    
    // Store selected role
    sessionStorage.setItem('selectedRole', role);
    
    // Add animation
    loginForm.classList.add('animate-scale-in');
    setTimeout(() => loginForm.classList.remove('animate-scale-in'), 500);
}

function goBack() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const passwordInput = document.getElementById('passwordInput');
    
    if (loginForm) loginForm.classList.add('hidden');
    if (errorMessage) errorMessage.textContent = '';
    if (passwordInput) passwordInput.value = '';
    
    sessionStorage.removeItem('selectedRole');
}

function togglePassword() {
    const input = document.getElementById('passwordInput');
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

async function login() {
    const passwordInput = document.getElementById('passwordInput');
    const errorMessage = document.getElementById('errorMessage');
    const attemptsInfo = document.getElementById('attemptsInfo');
    const role = sessionStorage.getItem('selectedRole');
    
    if (!passwordInput || !role) {
        console.error('Missing required elements');
        return;
    }
    
    const password = passwordInput.value;
    
    // Check if locked out
    if (lockoutUntil && new Date() < lockoutUntil) {
        const minutesLeft = Math.ceil((lockoutUntil - new Date()) / 60000);
        if (errorMessage) errorMessage.textContent = `Too many attempts. Try again in ${minutesLeft} minutes.`;
        return;
    }
    
    if (!password) {
        if (errorMessage) errorMessage.textContent = 'Please enter password';
        shakeElement(passwordInput);
        return;
    }
    
    // Get stored passwords from settings or use defaults
    let managerPassword = DEFAULT_MANAGER_PASSWORD;
    let sellerPassword = DEFAULT_SELLER_PASSWORD;
    
    try {
        const settings = getSettingsLocal();
        if (settings) {
            managerPassword = settings.managerPassword || DEFAULT_MANAGER_PASSWORD;
            sellerPassword = settings.sellerPassword || DEFAULT_SELLER_PASSWORD;
        }
    } catch (error) {
        console.warn('Using default passwords');
    }
    
    console.log('Attempting login - Role:', role); // Debug log
    
    // Validate
    let isValid = false;
    if (role === 'manager' && password === managerPassword) {
        isValid = true;
    } else if (role === 'seller' && password === sellerPassword) {
        isValid = true;
    }
    
    if (isValid) {
        // Successful login
        console.log('Login successful!'); // Debug log
        loginAttempts = 0;
        lockoutUntil = null;
        
        if (errorMessage) errorMessage.textContent = '';
        if (attemptsInfo) attemptsInfo.textContent = '';
        
        // Set user session
        currentUser = {
            role: role,
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Start session timeout
        startSessionTimer();
        
        // Show success message
        showToastMessage('Login successful! Redirecting...', 'success');
        
        // Redirect based on role
        const redirectUrl = role === 'manager' ? 'pages/manager.html' : 'pages/pos.html';
        console.log('Redirecting to:', redirectUrl); // Debug log
        
        // Short delay then redirect
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 500);
        
    } else {
        // Failed login
        console.log('Login failed - wrong password'); // Debug log
        loginAttempts++;
        
        const settings = getSettingsLocal();
        const maxAttempts = settings?.maxLoginAttempts || 5;
        const lockoutDuration = settings?.lockoutDuration || 30;
        
        if (loginAttempts >= maxAttempts) {
            lockoutUntil = new Date(new Date().getTime() + lockoutDuration * 60000);
            if (errorMessage) errorMessage.textContent = `Account locked for ${lockoutDuration} minutes.`;
            loginAttempts = 0;
        } else {
            const remaining = maxAttempts - loginAttempts;
            if (errorMessage) errorMessage.textContent = `Invalid password. ${remaining} attempts remaining.`;
        }
        
        if (attemptsInfo) attemptsInfo.textContent = `Attempt ${loginAttempts} of ${maxAttempts}`;
        shakeElement(passwordInput);
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function startSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    
    const settings = getSettingsLocal();
    const timeout = (settings?.sessionTimeout || 15) * 60 * 1000;
    
    sessionTimer = setTimeout(() => {
        logout(true);
    }, timeout);
}

function logout(autoLogout = false) {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    if (sessionTimer) clearTimeout(sessionTimer);
    
    if (autoLogout) {
        sessionStorage.setItem('logoutMessage', 'Session expired. Please login again.');
    }
    
    window.location.href = '../index.html';
}

function checkAuth(requiredRole) {
    const userData = sessionStorage.getItem('currentUser');
    
    if (!userData) {
        console.log('No user data found, redirecting to login');
        window.location.href = '../index.html';
        return false;
    }
    
    try {
        const user = JSON.parse(userData);
        if (user.role !== requiredRole) {
            console.log('Wrong role, redirecting to login');
            window.location.href = '../index.html';
            return false;
        }
        
        // Reset session timer on activity
        startSessionTimer();
        return true;
    } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = '../index.html';
        return false;
    }
}

// Activity listeners to reset session
document.addEventListener('click', () => {
    if (currentUser) startSessionTimer();
});

document.addEventListener('keypress', () => {
    if (currentUser) startSessionTimer();
});

function shakeElement(element) {
    if (!element) return;
    element.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
        if (element) element.style.animation = '';
    }, 500);
}

// Add shake animation if not already in CSS
if (!document.querySelector('#shake-animation')) {
    const style = document.createElement('style');
    style.id = 'shake-animation';
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slideOutRight {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100%); }
        }
    `;
    document.head.appendChild(style);
}

// Handle Enter key on password input
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
});
