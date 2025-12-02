// Admin Panel Utilities
// Shared JavaScript functions for admin panel

const API_BASE = window.location.origin;

// ============ Authentication ============

function getAdminToken() {
    return localStorage.getItem('admin_token');
}

function getAdminUser() {
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
}

function isAuthenticated() {
    return !!getAdminToken();
}

function isSuperadmin() {
    const user = getAdminUser();
    return user && user.role === 'superadmin';
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin-login.html';
}

// Check authentication on protected pages
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/admin-login.html';
        return false;
    }
    return true;
}

// ============ API Calls ============

async function apiCall(endpoint, options = {}) {
    const token = getAdminToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
        
        // Handle 401 - token expired
        if (response.status === 401) {
            logout();
            throw new Error('Session expired');
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// ============ UI Helpers ============

function showAlert(message, type = 'error', containerId = 'alert') {
    const alertEl = document.getElementById(containerId);
    if (!alertEl) return;
    
    alertEl.textContent = message;
    alertEl.className = `alert ${type} show`;
    
    setTimeout(() => {
        alertEl.classList.remove('show');
    }, 5000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function setLoading(buttonId, loading, loadingText = 'Chargement...') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    btn.disabled = loading;
    if (loading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<span class="loading-spinner"></span>${loadingText}`;
    } else {
        btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
}

// ============ Formatters ============

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHour < 24) return `Il y a ${diffHour}h`;
    if (diffDay < 7) return `Il y a ${diffDay}j`;
    return formatDate(dateString);
}

function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

// ============ Copy to Clipboard ============

async function copyToClipboard(text, buttonEl) {
    try {
        await navigator.clipboard.writeText(text);
        
        if (buttonEl) {
            const originalText = buttonEl.innerHTML;
            buttonEl.innerHTML = '✓ Copié';
            buttonEl.classList.add('success');
            
            setTimeout(() => {
                buttonEl.innerHTML = originalText;
                buttonEl.classList.remove('success');
            }, 2000);
        }
        
        return true;
    } catch (error) {
        console.error('Copy failed:', error);
        return false;
    }
}

// ============ Table Helpers ============

function createPagination(pagination, onPageChange) {
    const { page, totalPages, total } = pagination;
    
    let html = '<div class="pagination">';
    
    // Previous
    if (page > 1) {
        html += `<button class="page-btn" onclick="${onPageChange}(${page - 1})">← Précédent</button>`;
    }
    
    // Page info
    html += `<span class="page-info">Page ${page} sur ${totalPages} (${total} total)</span>`;
    
    // Next
    if (page < totalPages) {
        html += `<button class="page-btn" onclick="${onPageChange}(${page + 1})">Suivant →</button>`;
    }
    
    html += '</div>';
    return html;
}

// ============ Initialize User Info ============

function initializeUserInfo() {
    const user = getAdminUser();
    if (!user) return;

    const usernameEl = document.getElementById('currentUsername');
    const roleEl = document.getElementById('currentRole');
    
    if (usernameEl) usernameEl.textContent = user.username;
    if (roleEl) {
        roleEl.textContent = user.role === 'superadmin' ? 'Super Admin' : 'Admin';
        roleEl.className = `role-badge ${user.role}`;
    }

    // Hide superadmin-only elements for regular admins
    if (!isSuperadmin()) {
        document.querySelectorAll('.superadmin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// ============ Active Navigation ============

function setActiveNav(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ============ Export ============

window.AdminUtils = {
    // Auth
    getAdminToken,
    getAdminUser,
    isAuthenticated,
    isSuperadmin,
    logout,
    requireAuth,
    
    // API
    apiCall,
    
    // UI
    showAlert,
    showModal,
    hideModal,
    setLoading,
    
    // Formatters
    formatBytes,
    formatDate,
    formatRelativeTime,
    formatNumber,
    
    // Helpers
    copyToClipboard,
    confirm,
    createPagination,
    initializeUserInfo,
    setActiveNav
};
