// ============================================
// AMISTY POS - General JavaScript Functions
// ============================================

// Theme Management
const ThemeManager = {
    currentTheme: 'theme1',
    
    themes: {
        theme1: {
            name: 'Sky Blue & Light Green',
            bgAnimation: 'particles',
            particles: {
                count: 30,
                colors: ['#87CEEB', '#90EE90', '#5BA3D9', '#6FCF6F'],
                minSize: 5,
                maxSize: 15,
                speed: 15
            }
        },
        theme2: {
            name: 'Gold & Purple',
            bgAnimation: 'stars',
            stars: {
                count: 50,
                colors: ['#FFD700', '#9370DB', '#DAA520', '#7B68EE'],
                minSize: 2,
                maxSize: 6
            }
        },
        theme3: {
            name: 'Deep Blue & Silver',
            bgAnimation: 'grid',
            grid: {
                color: 'rgba(59, 130, 246, 0.1)',
                size: 40
            }
        },
        theme4: {
            name: 'Forest Green & Earth Brown',
            bgAnimation: 'waves',
            waves: {
                colors: ['#228B22', '#8B4513', '#006400'],
                count: 3
            }
        },
        theme5: {
            name: 'Coral & Teal',
            bgAnimation: 'gradient',
            gradient: {
                colors: ['#FF6B6B', '#00BCD4', '#FF6B6B'],
                speed: 10
            }
        }
    },
    
    init() {
        this.loadSavedTheme();
        this.applyBackgroundAnimation();
    },
    
    loadSavedTheme() {
        const saved = localStorage.getItem('amisty_theme');
        if (saved && this.themes[saved]) {
            this.currentTheme = saved;
        }
    },
    
    saveTheme(themeName) {
        localStorage.setItem('amisty_theme', themeName);
        this.currentTheme = themeName;
        location.reload();
    },
    
    applyBackgroundAnimation() {
        const theme = this.themes[this.currentTheme];
        if (!theme) return;
        
        // Remove existing animations
        document.querySelectorAll('.bg-animation').forEach(el => el.remove());
        
        const container = document.createElement('div');
        container.className = `bg-animation bg-animation-${theme.bgAnimation}`;
        
        switch(theme.bgAnimation) {
            case 'particles':
                this.createParticles(container, theme.particles);
                break;
            case 'stars':
                this.createStars(container, theme.stars);
                break;
            case 'waves':
                this.createWaves(container, theme.waves);
                break;
            case 'gradient':
                this.createGradient(container, theme.gradient);
                break;
            case 'grid':
                this.createGrid(container, theme.grid);
                break;
        }
        
        document.body.prepend(container);
    },
    
    createParticles(container, config) {
        for (let i = 0; i < config.count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            const color = config.colors[Math.floor(Math.random() * config.colors.length)];
            const left = Math.random() * 100;
            const duration = config.speed + Math.random() * 10;
            const delay = Math.random() * 5;
            
            Object.assign(particle.style, {
                width: size + 'px',
                height: size + 'px',
                background: color,
                left: left + '%',
                animationDuration: duration + 's',
                animationDelay: delay + 's'
            });
            
            container.appendChild(particle);
        }
    },
    
    createStars(container, config) {
        for (let i = 0; i < config.count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
            const color = config.colors[Math.floor(Math.random() * config.colors.length)];
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const delay = Math.random() * 3;
            
            Object.assign(star.style, {
                width: size + 'px',
                height: size + 'px',
                background: color,
                left: left + '%',
                top: top + '%',
                animationDelay: delay + 's'
            });
            
            container.appendChild(star);
        }
    },
    
    createWaves(container, config) {
        for (let i = 0; i < config.count; i++) {
            const wave = document.createElement('div');
            wave.className = 'wave';
            wave.style.background = `linear-gradient(90deg, transparent, ${config.colors[i]}20, transparent)`;
            container.appendChild(wave);
        }
    },
    
    createGradient(container, config) {
        container.style.background = `linear-gradient(45deg, ${config.colors.map(c => c + '10').join(', ')})`;
        container.style.backgroundSize = '400% 400%';
        container.style.animationDuration = config.speed + 's';
    },
    
    createGrid(container, config) {
        container.style.backgroundImage = `
            linear-gradient(${config.color} 1px, transparent 1px),
            linear-gradient(90deg, ${config.color} 1px, transparent 1px)
        `;
        container.style.backgroundSize = config.size + 'px ' + config.size + 'px';
    }
};

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});

// Sound Effects Manager
const SoundManager = {
    sounds: {},
    enabled: true,
    
    init() {
        this.enabled = localStorage.getItem('amisty_sound') !== 'false';
        this.preloadSounds();
    },
    
    preloadSounds() {
        const soundList = {
            'click': '../sounds/click.mp3',
            'success': '../sounds/success.mp3',
            'error': '../sounds/error.mp3',
            'notification': '../sounds/notification.mp3',
            'sale-complete': '../sounds/sale-complete.mp3',
            'low-stock': '../sounds/low-stock.mp3'
        };
        
        Object.entries(soundList).forEach(([name, path]) => {
            try {
                const audio = new Audio();
                audio.src = path;
                audio.preload = 'auto';
                this.sounds[name] = audio;
            } catch (e) {
                console.warn(`Could not load sound: ${name}`);
            }
        });
    },
    
    play(soundName) {
        if (!this.enabled) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }
    },
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('amisty_sound', this.enabled);
        return this.enabled;
    }
};

// Initialize sound on load
document.addEventListener('DOMContentLoaded', () => {
    SoundManager.init();
});

// Keyboard Shortcuts Manager
const ShortcutManager = {
    shortcuts: {},
    
    register(key, callback, description = '') {
        this.shortcuts[key] = { callback, description };
    },
    
    init() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.tagName === 'SELECT') {
                return;
            }
            
            const shortcut = this.shortcuts[e.key];
            if (shortcut) {
                e.preventDefault();
                shortcut.callback();
            }
        });
    },
    
    showHelp() {
        const helpText = Object.entries(this.shortcuts)
            .filter(([key, data]) => data.description)
            .map(([key, data]) => `${key}: ${data.description}`)
            .join('\n');
        
        showToast('Keyboard Shortcuts:\n' + helpText, 'info');
    }
};

// Initialize shortcuts on load
document.addEventListener('DOMContentLoaded', () => {
    ShortcutManager.init();
});

// Auto Save Manager
const AutoSaveManager = {
    interval: null,
    saveCallback: null,
    
    start(callback, intervalMs = 30000) {
        this.saveCallback = callback;
        this.interval = setInterval(() => {
            if (this.saveCallback) {
                this.saveCallback();
                console.log('Auto-saved at', new Date().toLocaleTimeString());
            }
        }, intervalMs);
    },
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
};

// Idle Detection
const IdleManager = {
    timeout: null,
    idleTime: 15, // minutes
    callback: null,
    
    init(idleMinutes = 15, onIdle = null) {
        this.idleTime = idleMinutes;
        this.callback = onIdle;
        this.resetTimer();
        this.addListeners();
    },
    
    resetTimer() {
        if (this.timeout) clearTimeout(this.timeout);
        
        if (this.callback) {
            this.timeout = setTimeout(() => {
                this.callback();
            }, this.idleTime * 60 * 1000);
        }
    },
    
    addListeners() {
        ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.resetTimer());
        });
    }
};

// Form Validation Helper
const FormValidator = {
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    validatePhone(phone) {
        const re = /^\+?[\d\s-]{10,}$/;
        return re.test(phone);
    },
    
    validateRequired(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },
    
    validateNumber(value, min = null, max = null) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    },
    
    showErrors(errors) {
        const errorMessages = Object.values(errors).join('\n');
        showToast(errorMessages, 'error');
    }
};

// Data Export/Import Helpers
const DataManager = {
    exportToJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, filename + '.json');
    },
    
    exportToCSV(data, filename) {
        if (data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        let csv = headers.join(',') + '\n';
        
        data.forEach(row => {
            csv += headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }).join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadBlob(blob, filename + '.csv');
    },
    
    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },
    
    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid JSON file'));
                }
            };
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }
};

// Print Helper
const PrintHelper = {
    printElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    @media print {
                        body { margin: 0; padding: 20px; }
                    }
                </style>
            </head>
            <body>
                ${element.innerHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },
    
    printHTML(html) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print</title>
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};

// Date Helper Functions
const DateHelper = {
    formatDate(date) {
        if (typeof date === 'string') date = new Date(date);
        return date.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    formatDateTime(date) {
        if (typeof date === 'string') date = new Date(date);
        return date.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatTime(date) {
        if (typeof date === 'string') date = new Date(date);
        return date.toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },
    
    getDateRange(range) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch(range) {
            case 'today':
                return { start: today, end: now };
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return { start: yesterday, end: today };
            case 'thisWeek':
                const weekStart = new Date(today);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                return { start: weekStart, end: now };
            case 'thisMonth':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return { start: monthStart, end: now };
            case 'lastMonth':
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                return { start: lastMonthStart, end: lastMonthEnd };
            default:
                return { start: today, end: now };
        }
    }
};

// Number Formatting Helper
const NumberHelper = {
    formatCurrency(amount, currency = 'KSh') {
        return `${currency} ${Number(amount).toLocaleString('en-KE')}`;
    },
    
    formatNumber(number, decimals = 0) {
        return Number(number).toLocaleString('en-KE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },
    
    formatPercentage(value, decimals = 1) {
        return Number(value).toFixed(decimals) + '%';
    },
    
    roundTo(value, decimals = 2) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }
};

// DOM Helper Functions
const DOMHelper = {
    $(selector, parent = document) {
        return parent.querySelector(selector);
    },
    
    $$(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    },
    
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('on')) {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    },
    
    removeElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },
    
    toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    },
    
    addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    },
    
    removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    }
};

// Storage Helper (for data that's not in Firebase)
const StorageHelper = {
    set(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const serialized = localStorage.getItem(key);
            return serialized ? JSON.parse(serialized) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// Debounce and Throttle
const FunctionHelper = {
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    once(func) {
        let executed = false;
        return function executedFunction(...args) {
            if (!executed) {
                executed = true;
                func(...args);
            }
        };
    }
};

// Initialize all managers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('AMISTY POS - General Scripts Initialized');
    console.log('Active Theme:', ThemeManager.currentTheme);
    console.log('Sound Enabled:', SoundManager.enabled);
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ThemeManager,
        SoundManager,
        ShortcutManager,
        AutoSaveManager,
        IdleManager,
        FormValidator,
        DataManager,
        PrintHelper,
        DateHelper,
        NumberHelper,
        DOMHelper,
        StorageHelper,
        FunctionHelper
    };
}