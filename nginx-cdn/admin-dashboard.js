// Admin Dashboard JavaScript
// Main logic for admin panel

// Check authentication on load
AdminUtils.requireAuth();
AdminUtils.initializeUserInfo();

let currentPage = 'dashboard';
let currentFilesPage = 1;
let currentTokensPage = 1;
let currentLogsPage = 1;

// ============ Navigation ============

function navigateTo(page) {
    currentPage = page;
    
    // Hide all sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const pageSection = document.getElementById(`page-${page}`);
    if (pageSection) {
        pageSection.classList.add('active');
    }
    
    // Update nav
    AdminUtils.setActiveNav(page);
    
    // Load page data
    loadPageData(page);
}

async function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'files':
            await loadFiles();
            break;
        case 'tokens':
            await loadTokens();
            await loadFilesForSelect();
            break;
        case 'logs':
            await loadLogs();
            break;
        case 'users':
            await loadUsers();
            break;
    }
}

// ============ Dashboard ============

async function loadDashboard() {
    try {
        const data = await AdminUtils.apiCall('/api/admin/dashboard');
        
        if (data.success) {
            const stats = data.data;
            
            // Update stats
            document.getElementById('stat-files').textContent = AdminUtils.formatNumber(stats.files.total);
            document.getElementById('stat-size').textContent = AdminUtils.formatBytes(stats.files.totalSize);
            document.getElementById('stat-tokens').textContent = AdminUtils.formatNumber(stats.tokens.active);
            document.getElementById('stat-downloads').textContent = AdminUtils.formatNumber(stats.tokens.totalDownloads);
            
            // Update recent activity
            const tbody = document.getElementById('recentActivityBody');
            if (stats.recentActivity && stats.recentActivity.length > 0) {
                tbody.innerHTML = stats.recentActivity.map(log => `
                    <tr>
                        <td><span class="badge badge-info">${log.action}</span></td>
                        <td>${log.fileName || '-'}</td>
                        <td>${log.ipAddress || '-'}</td>
                        <td><span class="badge ${log.statusCode < 400 ? 'badge-success' : 'badge-danger'}">${log.statusCode}</span></td>
                        <td>${AdminUtils.formatRelativeTime(log.createdAt)}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucune activité récente</td></tr>';
            }
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        AdminUtils.showAlert('Erreur lors du chargement du dashboard', 'error');
    }
}

// ============ Files Management ============

async function loadFiles(page = 1) {
    currentFilesPage = page;
    
    try {
        const data = await AdminUtils.apiCall(`/api/admin/files?page=${page}&limit=20`);
        
        if (data.success) {
            const tbody = document.getElementById('filesTableBody');
            
            if (data.data.length > 0) {
                tbody.innerHTML = data.data.map(file => `
                    <tr>
                        <td>
                            <strong>${file.originalName}</strong><br>
                            <small style="color: #999;">${file.id}</small>
                        </td>
                        <td><span class="badge badge-info">${file.mimeType}</span></td>
                        <td>${AdminUtils.formatBytes(file.size)}</td>
                        <td><span class="badge ${file.activeTokens > 0 ? 'badge-success' : 'badge-warning'}">${file.activeTokens} actif(s)</span></td>
                        <td>${AdminUtils.formatDate(file.createdAt)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-small btn-secondary" onclick="viewFileDetails('${file.id}')">👁️ Voir</button>
                                <button class="btn btn-small btn-danger" onclick="deleteFile('${file.id}', '${file.originalName}')">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📁</div><p>Aucun fichier trouvé</p></td></tr>';
            }
            
            // Pagination
            if (data.pagination) {
                document.getElementById('filesPagination').innerHTML = createPagination(data.pagination, 'loadFiles');
            }
        }
    } catch (error) {
        console.error('Failed to load files:', error);
        AdminUtils.showAlert('Erreur lors du chargement des fichiers', 'error');
    }
}

function createPagination(pagination, functionName) {
    const { page, totalPages, total } = pagination;
    
    let html = '<div class="pagination">';
    
    if (page > 1) {
        html += `<button class="page-btn" onclick="${functionName}(${page - 1})">← Précédent</button>`;
    }
    
    html += `<span class="page-info">Page ${page} sur ${totalPages} (${total} total)</span>`;
    
    if (page < totalPages) {
        html += `<button class="page-btn" onclick="${functionName}(${page + 1})">Suivant →</button>`;
    }
    
    html += '</div>';
    return html;
}

async function searchFiles() {
    const search = document.getElementById('filesSearch').value.trim();
    
    // Si la recherche est vide, recharger tous les fichiers
    if (search === '') {
        loadFiles(currentPage);
        return;
    }
    
    try {
        const data = await AdminUtils.apiCall(`/api/admin/files?search=${encodeURIComponent(search)}&page=1&limit=10`);
        
        if (data.success) {
            const tbody = document.getElementById('filesTableBody');
            
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #888;">Aucun fichier trouvé</td></tr>';
                document.getElementById('filesPagination').innerHTML = '';
                return;
            }
            
            tbody.innerHTML = data.data.map(file => `
                <tr>
                    <td><div class="file-name">${file.originalName}</div></td>
                    <td>${file.mimeType}</td>
                    <td>${AdminUtils.formatBytes(file.size)}</td>
                    <td>${file.uploadedBy || 'N/A'}</td>
                    <td><span class="date">${AdminUtils.formatDate(file.createdAt)}</span></td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-secondary" onclick="viewFileDetails('${file.id}')">
                                👁️ Voir
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteFile('${file.id}', '${file.originalName.replace(/'/g, "\\'")}')">
                                🗑️ Supprimer
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
            // Afficher la pagination
            document.getElementById('filesPagination').innerHTML = AdminUtils.createPagination(
                data.pagination.page,
                data.pagination.totalPages,
                (page) => searchFiles() // Garder la recherche active
            );
            
            AdminUtils.showAlert(`${data.pagination.total} fichier(s) trouvé(s)`, 'success');
        }
    } catch (error) {
        AdminUtils.showAlert('Erreur lors de la recherche', 'error');
    }
}

async function viewFileDetails(fileId) {
    try {
        const data = await AdminUtils.apiCall(`/api/admin/files/${fileId}`);
        if (data.success) {
            alert(`Fichier: ${data.data.file.originalName}\nTaille: ${AdminUtils.formatBytes(data.data.file.size)}\nTokens: ${data.data.tokens.length}\nUploadé le: ${AdminUtils.formatDate(data.data.file.createdAt)}`);
        }
    } catch (error) {
        AdminUtils.showAlert('Erreur lors du chargement des détails', 'error');
    }
}

async function deleteFile(fileId, fileName) {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${fileName}" ?\n\nCette action est irréversible et supprimera tous les tokens associés.`)) {
        return;
    }
    
    try {
        await AdminUtils.apiCall(`/api/admin/files/${fileId}`, { method: 'DELETE' });
        AdminUtils.showAlert('Fichier supprimé avec succès', 'success');
        loadFiles(currentFilesPage);
    } catch (error) {
        AdminUtils.showAlert('Erreur lors de la suppression du fichier', 'error');
    }
}

// ============ Tokens Management ============

async function loadTokens(page = 1) {
    currentTokensPage = page;
    
    try {
        const data = await AdminUtils.apiCall(`/api/admin/tokens?page=${page}&limit=20`);
        
        if (data.success) {
            const tbody = document.getElementById('tokensTableBody');
            
            if (data.data.length > 0) {
                tbody.innerHTML = data.data.map(token => {
                    const isValid = token.isValid;
                    const statusBadge = isValid ? 'badge-success' : 
                                       token.isRevoked ? 'badge-danger' : 
                                       token.isExpired ? 'badge-warning' : 'badge-info';
                    const statusText = isValid ? 'Valide' : 
                                      token.isRevoked ? 'Révoqué' : 
                                      token.isExpired ? 'Expiré' : 'Inactif';
                    
                    return `
                        <tr>
                            <td>
                                <code style="font-size: 11px;">${token.token.substring(0, 16)}...</code>
                                <button class="copy-btn" onclick="copyToken('${token.token}', this)">📋</button>
                            </td>
                            <td>${token.fileName || 'N/A'}</td>
                            <td>${AdminUtils.formatDate(token.expiresAt)}</td>
                            <td>${token.downloadCount} / ${token.maxDownloads}</td>
                            <td><span class="badge ${statusBadge}">${statusText}</span></td>
                            <td>
                                <div class="action-buttons">
                                    ${isValid ? `<button class="btn btn-small btn-danger" onclick="revokeToken('${token.id}')">Révoquer</button>` : '-'}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">🔑</div><p>Aucun token trouvé</p></td></tr>';
            }
            
            // Pagination
            if (data.pagination) {
                document.getElementById('tokensPagination').innerHTML = createPagination(data.pagination, 'loadTokens');
            }
        }
    } catch (error) {
        console.error('Failed to load tokens:', error);
        AdminUtils.showAlert('Erreur lors du chargement des tokens', 'error');
    }
}

async function copyToken(token, button) {
    const fullUrl = `${window.location.origin}/download/${token}`;
    await AdminUtils.copyToClipboard(fullUrl, button);
}

async function revokeToken(tokenId) {
    if (!window.confirm('Êtes-vous sûr de vouloir révoquer ce token ?')) {
        return;
    }
    
    try {
        await AdminUtils.apiCall(`/api/admin/tokens/${tokenId}`, { method: 'DELETE' });
        AdminUtils.showAlert('Token révoqué avec succès', 'success');
        loadTokens(currentTokensPage);
    } catch (error) {
        AdminUtils.showAlert('Erreur lors de la révocation du token', 'error');
    }
}

async function loadFilesForSelect() {
    try {
        const data = await AdminUtils.apiCall('/api/admin/files?limit=100');
        const select = document.getElementById('tokenFileId');
        
        if (data.success && data.data.length > 0) {
            select.innerHTML = '<option value="">Sélectionner un fichier...</option>' +
                data.data.map(file => `<option value="${file.id}">${file.originalName}</option>`).join('');
        } else {
            select.innerHTML = '<option value="">Aucun fichier disponible</option>';
        }
    } catch (error) {
        console.error('Failed to load files for select:', error);
    }
}

// Create Token Form
document.getElementById('createTokenForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileId = document.getElementById('tokenFileId').value;
    const expiresInHours = parseInt(document.getElementById('tokenExpiry').value);
    const maxDownloads = parseInt(document.getElementById('tokenMaxDownloads').value);
    
    AdminUtils.setLoading('createTokenBtn', true, 'Création...');
    
    try {
        const data = await AdminUtils.apiCall('/api/admin/tokens/create', {
            method: 'POST',
            body: JSON.stringify({ fileId, expiresInHours, maxDownloads })
        });
        
        if (data.success) {
            AdminUtils.showAlert('Token créé avec succès!', 'success');
            AdminUtils.hideModal('createTokenModal');
            document.getElementById('createTokenForm').reset();
            loadTokens(currentTokensPage);
        }
    } catch (error) {
        AdminUtils.showAlert(error.message || 'Erreur lors de la création du token', 'error');
    } finally {
        AdminUtils.setLoading('createTokenBtn', false);
    }
});

// ============ Logs ============

async function loadLogs(page = 1) {
    currentLogsPage = page;
    
    try {
        const data = await AdminUtils.apiCall(`/api/admin/logs?page=${page}&limit=50`);
        
        if (data.success) {
            const tbody = document.getElementById('logsTableBody');
            
            if (data.data.length > 0) {
                tbody.innerHTML = data.data.map(log => `
                    <tr>
                        <td><span class="badge badge-info">${log.action}</span></td>
                        <td>${log.file_name || '-'}</td>
                        <td>${log.ip_address || '-'}</td>
                        <td><span class="badge ${log.status_code < 400 ? 'badge-success' : 'badge-danger'}">${log.status_code}</span></td>
                        <td>${AdminUtils.formatDate(log.created_at)}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun log trouvé</td></tr>';
            }
            
            // Pagination
            if (data.pagination) {
                document.getElementById('logsPagination').innerHTML = createPagination(data.pagination, 'loadLogs');
            }
        }
    } catch (error) {
        console.error('Failed to load logs:', error);
        AdminUtils.showAlert('Erreur lors du chargement des logs', 'error');
    }
}

// ============ Users Management (Superadmin only) ============

async function loadUsers() {
    if (!AdminUtils.isSuperadmin()) {
        return;
    }
    
    try {
        const data = await AdminUtils.apiCall('/api/admin/users');
        
        if (data.success) {
            const tbody = document.getElementById('usersTableBody');
            
            if (data.data.length > 0) {
                tbody.innerHTML = data.data.map(user => `
                    <tr>
                        <td><strong>${user.username}</strong></td>
                        <td>${user.email}</td>
                        <td><span class="badge ${user.role === 'superadmin' ? 'badge-warning' : 'badge-info'}">${user.role}</span></td>
                        <td><span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">${user.is_active ? 'Actif' : 'Inactif'}</span></td>
                        <td>${user.last_login_at ? AdminUtils.formatDate(user.last_login_at) : 'Jamais'}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-small btn-secondary" onclick="toggleUserStatus('${user.id}', ${!user.is_active})">
                                    ${user.is_active ? 'Désactiver' : 'Activer'}
                                </button>
                                <button class="btn btn-small btn-danger" onclick="deleteUser('${user.id}', '${user.username}')">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Aucun utilisateur trouvé</td></tr>';
            }
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        AdminUtils.showAlert('Erreur lors du chargement des utilisateurs', 'error');
    }
}

async function toggleUserStatus(userId, activate) {
    try {
        await AdminUtils.apiCall(`/api/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: activate })
        });
        
        AdminUtils.showAlert(`Utilisateur ${activate ? 'activé' : 'désactivé'} avec succès`, 'success');
        loadUsers();
    } catch (error) {
        AdminUtils.showAlert('Erreur lors de la modification de l\'utilisateur', 'error');
    }
}

async function deleteUser(userId, username) {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        await AdminUtils.apiCall(`/api/admin/users/${userId}`, { method: 'DELETE' });
        AdminUtils.showAlert('Utilisateur supprimé avec succès', 'success');
        loadUsers();
    } catch (error) {
        AdminUtils.showAlert(error.message || 'Erreur lors de la suppression de l\'utilisateur', 'error');
    }
}

// Create User Form
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('userUsername').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    
    AdminUtils.setLoading('createUserBtn', true, 'Création...');
    
    try {
        const data = await AdminUtils.apiCall('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, role })
        });
        
        if (data.success) {
            AdminUtils.showAlert('Utilisateur créé avec succès!', 'success');
            AdminUtils.hideModal('createUserModal');
            document.getElementById('createUserForm').reset();
            loadUsers();
        }
    } catch (error) {
        AdminUtils.showAlert(error.message || 'Erreur lors de la création de l\'utilisateur', 'error');
    } finally {
        AdminUtils.setLoading('createUserBtn', false);
    }
});

// ============ Initialize ============

// Load dashboard on page load
window.addEventListener('load', () => {
    loadDashboard();
    
    // Add Enter key listener for search
    const filesSearchInput = document.getElementById('filesSearch');
    if (filesSearchInput) {
        filesSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchFiles();
            }
        });
    }
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});
