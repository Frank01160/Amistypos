// Authentication System
let currentUser = null;
let loginAttempts = 0;
let lockoutUntil = null;
let sessionTimer = null;

// Default credentials
const DEFAULT_MANAGER_PASSWORD = 'admin123';
const DEFAULT_SELLER_PASSWORD = 'seller123';

function selectRole(role) {
    const loginForm = document.getElementById('loginForm');
    const loginTitle = document.getElementById('loginTitle');
    
    loginForm.classList.remove('hidden');
    loginTitle.textContent = role === 'manager' ? 'Manager Login' : 'Seller Login';
    document.getElementById('passwordInput').focus();
    
    // Store selected role
    sessionStorage.setItem('selectedRole', role);
    
    // Add animation
    loginForm.classList.add('animate-scale-in');
    setTimeout(() => loginForm.classList.remove('animate-scale-in'), 500);
}

function goBack() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('errorMessage').textContent = '';
    document.getElementById('passwordInput').value = '';
    sessionStorage.removeItem('selectedRole');
}

function togglePassword() {
    const input = document.getElementById('passwordInput');
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function login() {
    const password = document.getElementById('passwordInput').value;
    const role = sessionStorage.getItem('selectedRole');
    const errorMessage = document.getElementById('errorMessage');
    const attemptsInfo = document.getElementById('attemptsInfo');
    
    // Check if locked out
    if (lockoutUntil && new Date() < lockoutUntil) {
        const minutesLeft = Math.ceil((lockoutUntil - new Date()) / 60000);
        errorMessage.textContent = `Too many attempts. Try again in ${minutesLeft} minutes.`;
        return;
    }
    
    if (!password) {
        errorMessage.textContent = 'Please enter password';
        shakeElement(document.getElementById('passwordInput'));
        return;
    }
    
    // Get stored passwords from settings or use defaults
    let managerPassword = DEFAULT_MANAGER_PASSWORD;
    let sellerPassword = DEFAULT_SELLER_PASSWORD;
    
    try {
        const settings = await getSettings();
        if (settings) {
            managerPassword = settings.managerPassword || DEFAULT_MANAGER_PASSWORD;
            sellerPassword = settings.sellerPassword || DEFAULT_SELLER_PASSWORD;
        }
    } catch (error) {
        console.warn('Using default passwords');
    }
    
    // Validate
    let isValid = false;
    if (role === 'manager' && password === managerPassword) {
        isValid = true;
    } else if (role === 'seller' && password === sellerPassword) {
        isValid = true;
    }
    
    if (isValid) {
        // Successful login
        loginAttempts = 0;
        lockoutUntil = null;
        errorMessage.textContent = '';
        attemptsInfo.textContent = '';
        
        // Set user session
        currentUser = {
            role: role,
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Start session timeout
        startSessionTimer();
        
        // Redirect based on role
        showToast('Login successful!', 'success');
        setTimeout(() => {
            window.location.href = role === 'manager' ? 'pages/manager.html' : 'pages/pos.html';
        }, 500);
    } else {
        // Failed login
        loginAttempts++;
        
        const settings = await getSettings();
        const maxAttempts = settings?.maxLoginAttempts || 5;
        const lockoutDuration = settings?.lockoutDuration || 30;
        
        if (loginAttempts >= maxAttempts) {
            lockoutUntil = new Date(new Date().getTime() + lockoutDuration * 60000);
            errorMessage.textContent = `Account locked for ${lockoutDuration} minutes.`;
            loginAttempts = 0;
        } else {
            const remaining = maxAttempts - loginAttempts;
            errorMessage.textContent = `Invalid password. ${remaining} attempts remaining.`;
        }
        
        attemptsInfo.textContent = `Attempt ${loginAttempts} of ${maxAttempts}`;
        shakeElement(document.getElementById('passwordInput'));
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

function startSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    
    getSettings().then(settings => {
        const timeout = (settings?.sessionTimeout || 15) * 60 * 1000;
        sessionTimer = setTimeout(() => {
            logout(true);
        }, timeout);
    });
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
        window.location.href = '../index.html';
        return false;
    }
    
    const user = JSON.parse(userData);
    if (user.role !== requiredRole) {
        window.location.href = '../index.html';
        return false;
    }
    
    // Reset session timer on activity
    startSessionTimer();
    return true;
}

// Activity listeners to reset session
document.addEventListener('click', () => {
    if (currentUser) startSessionTimer();
});
document.addEventListener('keypress', () => {
    if (currentUser) startSessionTimer();
});

function shakeElement(element) {
    element.style.animation = 'shake 0.5s ease';
    setTimeout(() => element.style.animation = '', 500);
}

async function getSettings() {
    try {
        if (isFirebaseInitialized && db) {
            const doc = await db.collection('settings').doc('app_settings').get();
            return doc.exists ? doc.data() : null;
        } else {
            const settings = localStorage.getItem('amisty_pos_settings');
            return settings ? JSON.parse(settings) : null;
        }
    } catch (error) {
        console.warn('Settings fetch error:', error);
        return null;
    }
}