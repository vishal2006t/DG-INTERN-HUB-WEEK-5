/**
 * SecureAuth – Full-Stack Frontend Controller
 * DG Interns Hub Week 5
 * Clean Vanilla JavaScript
 */

// ==========================================
// 1. Storage & Session Management
// ==========================================
const AUTH_TOKEN_KEY = 'secureauth_jwt_token';
const AUTH_USER_KEY = 'secureauth_user_data';

const Auth = {
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getUser() {
    try {
      const user = localStorage.getItem(AUTH_USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    return Boolean(token && user);
  },

  isAdmin() {
    const user = this.getUser();
    return Boolean(user && user.role === 'admin');
  },

  async logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Backend logout notification skipped:', e.message);
    } finally {
      this.clearSession();
      window.location.href = 'login.html?logout=true';
    }
  },
};

// ==========================================
// 2. Global Fetch & API Client
// ==========================================
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = Auth.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({
      success: false,
      message: 'Server returned a non-JSON response.',
    }));

    // Handle token expiration or unauthorized
    if (response.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('login.html') || currentPath.includes('signup.html');
      
      if (!isAuthPage && Auth.getToken()) {
        Auth.clearSession();
        window.location.href = 'login.html?expired=true';
        return;
      }
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// ==========================================
// 3. Toast Notification System
// ==========================================
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-weight: 800; font-size: 1.1rem;">${icons[type] || 'ℹ'}</span>
    <span style="flex: 1;">${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Format Dates nicely
function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ==========================================
// 4. Shared Navbar State
// ==========================================
function updateNavbar() {
  const navAuth = document.getElementById('nav-auth-container');
  if (!navAuth) return;

  if (Auth.isAuthenticated()) {
    const user = Auth.getUser();
    const isAdmin = user.role === 'admin';
    const initials = user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    navAuth.innerHTML = `
      <div class="user-pill">
        <div class="avatar-sm ${user.avatar || 'shield-cyan'}">${initials}</div>
        <span>${escapeHTML(user.name)}</span>
        <span class="badge ${isAdmin ? 'badge-admin' : 'badge-user'}">${user.role}</span>
      </div>
      <a href="${isAdmin ? 'admin.html' : 'dashboard.html'}" class="btn btn-outline btn-sm">
        ${isAdmin ? 'Admin Console' : 'Dashboard'}
      </a>
      <button id="nav-logout-btn" class="btn btn-danger btn-sm">Logout</button>
    `;

    document.getElementById('nav-logout-btn')?.addEventListener('click', () => Auth.logout());
  } else {
    navAuth.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Log In</a>
      <a href="signup.html" class="btn btn-primary btn-sm">Create Account</a>
    `;
  }
}

// ==========================================
// 5. Password Strength Meter Helper
// ==========================================
function calculatePasswordStrength(password) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[@$!%*?&#^()_\-+={}[\]:;"'<>,.|/~`]/.test(password),
  };

  if (checks.length) score++;
  if (checks.hasUpper && checks.hasLower) score++;
  if (checks.hasNumber) score++;
  if (checks.hasSpecial) score++;

  return { score, checks };
}

function setupPasswordMeter(inputId, barsId, textId, reqsContainerId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const bars = document.querySelectorAll(`#${barsId} .strength-bar`);
  const textEl = document.getElementById(textId);

  const colors = ['#f85149', '#f85149', '#fbbf24', '#38bdf8', '#38ef7d'];
  const labels = ['None', 'Weak', 'Fair', 'Good', 'Strong'];

  input.addEventListener('input', () => {
    const val = input.value;
    if (!val) {
      bars.forEach((b) => (b.style.background = 'var(--border-subtle)'));
      if (textEl) textEl.textContent = 'Password strength';
      return;
    }

    const { score, checks } = calculatePasswordStrength(val);

    bars.forEach((bar, idx) => {
      bar.style.background = idx < score ? colors[score] : 'var(--border-subtle)';
    });

    if (textEl) {
      textEl.textContent = labels[score];
      textEl.style.color = colors[score];
    }

    // Update individual requirement badges if present
    if (reqsContainerId) {
      const updateReq = (id, valid) => {
        const el = document.getElementById(id);
        if (el) {
          el.className = `req-item ${valid ? 'valid' : ''}`;
          el.querySelector('.req-icon').textContent = valid ? '✓' : '○';
        }
      };

      updateReq('req-len', checks.length);
      updateReq('req-upper', checks.hasUpper);
      updateReq('req-num', checks.hasNumber);
      updateReq('req-spec', checks.hasSpecial);
    }
  });
}

// Password visibility toggles
function setupPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.innerHTML = '👁️';
        } else {
          input.type = 'password';
          btn.innerHTML = '🔒';
        }
      }
    });
  });
}

// ==========================================
// 6. Page Initializers
// ==========================================

// --- Landing Page ---
function initLandingPage() {
  updateNavbar();
  const ctaBtn = document.getElementById('hero-cta-btn');
  if (ctaBtn && Auth.isAuthenticated()) {
    const user = Auth.getUser();
    ctaBtn.textContent = user.role === 'admin' ? 'Open Admin Console' : 'Go to My Dashboard';
    ctaBtn.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
  }
}

// --- Signup Page ---
function initSignupPage() {
  if (Auth.isAuthenticated()) {
    const user = Auth.getUser();
    window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    return;
  }

  setupPasswordMeter('signup-password', 'password-bars', 'password-strength-label', 'password-reqs');
  setupPasswordToggles();

  const form = document.getElementById('signup-form');
  const alertBox = document.getElementById('signup-alert');
  const submitBtn = document.getElementById('signup-submit-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;

    // Client-side validations
    if (password !== confirmPassword) {
      alertBox.textContent = 'Passwords do not match!';
      alertBox.style.display = 'flex';
      return;
    }

    const { score } = calculatePasswordStrength(password);
    if (score < 3) {
      alertBox.textContent = 'Password is too weak. Please meet all security requirements.';
      alertBox.style.display = 'flex';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Securing Account...';

    try {
      const data = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      Auth.setSession(data.token, data.user);
      showToast('Account created successfully! Welcome aboard.', 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Free Account';
    }
  });
}

// --- Login Page ---
function initLoginPage() {
  if (Auth.isAuthenticated()) {
    const user = Auth.getUser();
    window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
    return;
  }

  setupPasswordToggles();

  const form = document.getElementById('login-form');
  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  // Check URL params for messages
  const params = new URLSearchParams(window.location.search);
  if (params.get('expired')) {
    alertBox.textContent = 'Your session has expired. Please sign in again.';
    alertBox.className = 'alert alert-info';
    alertBox.style.display = 'flex';
  } else if (params.get('logout')) {
    alertBox.textContent = 'You have been safely logged out.';
    alertBox.className = 'alert alert-success';
    alertBox.style.display = 'flex';
  }

  // Quick Demo Buttons Filler
  document.getElementById('demo-admin-btn')?.addEventListener('click', () => {
    document.getElementById('login-email').value = 'admin@secureauth.io';
    document.getElementById('login-password').value = 'Admin@Secure2026!';
    showToast('Admin demo credentials populated!', 'info');
  });

  document.getElementById('demo-user-btn')?.addEventListener('click', () => {
    document.getElementById('login-email').value = 'alex.chen@secureauth.io';
    document.getElementById('login-password').value = 'User@Secure2026!';
    showToast('User demo credentials populated!', 'info');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying Credentials...';

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      Auth.setSession(data.token, data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');

      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 700);
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.className = 'alert alert-danger';
      alertBox.style.display = 'flex';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Authenticate & Sign In';
    }
  });
}

// --- User Dashboard Page ---
async function initDashboardPage() {
  if (!Auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  updateNavbar();
  document.getElementById('dash-logout-btn')?.addEventListener('click', () => Auth.logout());

  try {
    const data = await apiRequest('/api/users/profile');
    const user = data.user;

    // Cache updated user data
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    // Populate user profile elements
    const nameEls = document.querySelectorAll('.user-name-display');
    nameEls.forEach((el) => (el.textContent = user.name));

    const emailEls = document.querySelectorAll('.user-email-display');
    emailEls.forEach((el) => (el.textContent = user.email));

    const roleBadge = document.getElementById('user-role-badge');
    if (roleBadge) {
      roleBadge.textContent = user.role;
      roleBadge.className = `badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'} badge-pulse`;
    }

    const createdEl = document.getElementById('user-created-display');
    if (createdEl) createdEl.textContent = formatDate(user.createdAt);

    const loginEl = document.getElementById('user-lastlogin-display');
    if (loginEl) loginEl.textContent = formatDate(user.lastLogin);

    // If admin, display link to admin dashboard
    const adminBanner = document.getElementById('admin-quicklink-banner');
    if (adminBanner && user.role === 'admin') {
      adminBanner.style.display = 'flex';
    }

    // Render activity timeline
    const timelineList = document.getElementById('activity-timeline');
    if (timelineList && data.activityLog) {
      if (data.activityLog.length === 0) {
        timelineList.innerHTML = `<li style="color: var(--text-muted); font-size: 0.9rem;">No recent activities recorded.</li>`;
      } else {
        timelineList.innerHTML = data.activityLog
          .map(
            (act) => `
          <li class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span>${escapeHTML(act.action)}</span>
                <span style="font-weight: normal; color: var(--text-muted); font-size: 0.75rem;">${formatDate(act.timestamp)}</span>
              </div>
              <div class="timeline-meta">IP: ${escapeHTML(act.ip)} • Client: ${escapeHTML(act.userAgent)}</div>
            </div>
          </li>
        `
          )
          .join('');
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- Admin Dashboard Page ---
let adminUsersCache = [];
let activeFilterRole = 'all';

async function initAdminPage() {
  if (!Auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  if (!Auth.isAdmin()) {
    window.location.href = '404.html?denied=true';
    return;
  }

  updateNavbar();
  document.getElementById('admin-logout-btn')?.addEventListener('click', () => Auth.logout());

  await loadAdminAnalytics();
  await loadAdminUsers();

  // Search input handler
  const searchInput = document.getElementById('admin-search-input');
  searchInput?.addEventListener('input', (e) => {
    filterAndRenderUsers(e.target.value);
  });

  // Filter tabs handler
  document.querySelectorAll('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilterRole = tab.getAttribute('data-role');
      filterAndRenderUsers(searchInput ? searchInput.value : '');
    });
  });

  // Modal event bindings
  setupDeleteModal();
}

async function loadAdminAnalytics() {
  try {
    const data = await apiRequest('/api/admin/analytics');
    const { totalUsers, adminCount, standardUserCount, newUsersLast24h } = data.analytics;

    document.getElementById('stat-total-users').textContent = totalUsers;
    document.getElementById('stat-admin-count').textContent = adminCount;
    document.getElementById('stat-standard-users').textContent = standardUserCount;
    document.getElementById('stat-recent-24h').textContent = newUsersLast24h;
  } catch (err) {
    console.error('Analytics load error:', err);
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading user directory...</td></tr>`;
  }

  try {
    const data = await apiRequest('/api/admin/users');
    adminUsersCache = data.users || [];
    filterAndRenderUsers();
  } catch (err) {
    showToast(`Failed to load users: ${err.message}`, 'error');
  }
}

function filterAndRenderUsers(searchQuery = '') {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  const currentAdmin = Auth.getUser();
  const query = searchQuery.trim().toLowerCase();

  const filtered = adminUsersCache.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    const matchesRole = activeFilterRole === 'all' || u.role === activeFilterRole;
    return matchesSearch && matchesRole;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No users found matching current filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((u) => {
      const isSelf = currentAdmin && currentAdmin._id === u._id;
      const initials = u.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar-badge ${u.avatar || 'shield-cyan'}">${initials}</div>
            <div>
              <div style="font-weight: 600; color: #fff;">${escapeHTML(u.name)} ${isSelf ? '<span style="font-size: 0.75rem; color: var(--accent);">(You)</span>' : ''}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${u._id}</div>
            </div>
          </div>
        </td>
        <td><span style="font-family: var(--font-mono); font-size: 0.85rem;">${escapeHTML(u.email)}</span></td>
        <td>
          <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span>
        </td>
        <td>${formatDate(u.createdAt)}</td>
        <td>${formatDate(u.lastLogin)}</td>
        <td>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            ${
              isSelf
                ? '<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Protected</span>'
                : `
              <button class="btn btn-outline btn-sm role-toggle-btn" 
                      data-id="${u._id}" 
                      data-role="${u.role}" 
                      data-name="${escapeHTML(u.name)}">
                ${u.role === 'admin' ? 'Demote' : 'Promote'}
              </button>
              <button class="btn btn-danger btn-sm user-delete-btn" 
                      data-id="${u._id}" 
                      data-name="${escapeHTML(u.name)}" 
                      data-email="${escapeHTML(u.email)}">
                Delete
              </button>
            `
            }
          </div>
        </td>
      </tr>
    `;
    })
    .join('');

  // Bind role toggles
  document.querySelectorAll('.role-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const currentRole = btn.getAttribute('data-role');
      const name = btn.getAttribute('data-name');
      const newRole = currentRole === 'admin' ? 'user' : 'admin';

      if (!confirm(`Are you sure you want to change ${name}'s role to "${newRole}"?`)) {
        return;
      }

      try {
        await apiRequest(`/api/admin/users/${id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole }),
        });
        showToast(`Role updated to ${newRole}!`, 'success');
        await loadAdminUsers();
        await loadAdminAnalytics();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Bind delete triggers to modal
  document.querySelectorAll('.user-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const email = btn.getAttribute('data-email');
      openDeleteModal(id, name, email);
    });
  });
}

// Modal handling for delete confirmation
let pendingDeleteId = null;

function setupDeleteModal() {
  const modal = document.getElementById('delete-modal');
  const cancelBtn = document.getElementById('cancel-delete-btn');
  const confirmBtn = document.getElementById('confirm-delete-btn');

  cancelBtn?.addEventListener('click', closeDeleteModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeDeleteModal();
  });

  confirmBtn?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';

    try {
      await apiRequest(`/api/admin/users/${pendingDeleteId}`, { method: 'DELETE' });
      showToast('User account deleted successfully.', 'success');
      closeDeleteModal();
      await loadAdminUsers();
      await loadAdminAnalytics();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete User Account';
    }
  });
}

function openDeleteModal(id, name, email) {
  pendingDeleteId = id;
  const modal = document.getElementById('delete-modal');
  const detailsEl = document.getElementById('delete-user-details');
  if (detailsEl) {
    detailsEl.textContent = `${name} (${email})`;
  }
  modal?.classList.add('active');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  const modal = document.getElementById('delete-modal');
  modal?.classList.remove('active');
}

// --- Profile Page ---
async function initProfilePage() {
  if (!Auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  updateNavbar();
  document.getElementById('profile-logout-btn')?.addEventListener('click', () => Auth.logout());
  setupPasswordToggles();
  setupPasswordMeter('new-password', 'change-password-bars', 'change-password-label');

  // Load existing profile
  try {
    const data = await apiRequest('/api/users/profile');
    const user = data.user;

    document.getElementById('profile-name-input').value = user.name;
    document.getElementById('profile-email-display').textContent = user.email;
    document.getElementById('profile-role-badge').textContent = user.role;
    document.getElementById('profile-created-date').textContent = formatDate(user.createdAt);
    document.getElementById('profile-last-login').textContent = formatDate(user.lastLogin);

    // Select avatar radio
    const activeAvatar = user.avatar || 'shield-cyan';
    const radio = document.querySelector(`input[name="avatar-choice"][value="${activeAvatar}"]`);
    if (radio) radio.checked = true;

    // Update avatar preview
    const previewEl = document.getElementById('profile-avatar-preview');
    if (previewEl) {
      previewEl.className = `user-avatar-badge ${activeAvatar}`;
      previewEl.textContent = user.name[0]?.toUpperCase() || 'U';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }

  // Handle avatar radio selection preview
  document.querySelectorAll('input[name="avatar-choice"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const previewEl = document.getElementById('profile-avatar-preview');
      if (previewEl) {
        previewEl.className = `user-avatar-badge ${e.target.value}`;
      }
    });
  });

  // Profile details update form
  const profileForm = document.getElementById('profile-details-form');
  profileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-name-input').value.trim();
    const avatar = document.querySelector('input[name="avatar-choice"]:checked')?.value || 'shield-cyan';

    try {
      const data = await apiRequest('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, avatar }),
      });

      Auth.setSession(Auth.getToken(), data.user);
      updateNavbar();
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Change password form
  const passwordForm = document.getElementById('change-password-form');
  passwordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    const { score } = calculatePasswordStrength(newPassword);
    if (score < 3) {
      showToast('New password does not meet security requirements.', 'warning');
      return;
    }

    try {
      await apiRequest('/api/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      showToast('Password updated successfully!', 'success');
      passwordForm.reset();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// --- 404 / Access Denied Page ---
function init404Page() {
  updateNavbar();
  const params = new URLSearchParams(window.location.search);
  const isDenied = params.get('denied') === 'true';

  const codeEl = document.getElementById('error-code');
  const titleEl = document.getElementById('error-title');
  const descEl = document.getElementById('error-description');

  if (isDenied) {
    if (codeEl) codeEl.textContent = '403';
    if (titleEl) titleEl.textContent = 'Access Restricted: Administrator Privileges Required';
    if (descEl)
      descEl.textContent =
        'Your current role does not grant permission to view this resource. Role-Based Access Control (RBAC) is strictly enforced by the SecureAuth security policy.';
  }
}

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.endsWith('index.html') || path === '/' || path === '') {
    initLandingPage();
  } else if (path.endsWith('signup.html')) {
    initSignupPage();
  } else if (path.endsWith('login.html')) {
    initLoginPage();
  } else if (path.endsWith('dashboard.html')) {
    initDashboardPage();
  } else if (path.endsWith('admin.html')) {
    initAdminPage();
  } else if (path.endsWith('profile.html')) {
    initProfilePage();
  } else if (path.endsWith('404.html')) {
    init404Page();
  }
});
