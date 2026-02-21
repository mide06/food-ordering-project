/**
 * auth.js — Shared utilities for login.html and signup.html
 *
 * Covers:
 *  - API calls for auth (POST /api/auth/login, POST /api/auth/register)
 *  - Form field validation helpers
 *  - Password strength meter
 *  - Show/hide password toggle
 *  - Alert banner management
 *  - Session token storage
 */

'use strict';

// ─── API Configuration ────────────────────────────────────────
const API_BASE = 'http://localhost:3000/api';

/**
 * POST request wrapper for auth endpoints.
 * Always sends JSON, returns parsed response or throws with a message.
 *
 * @param {string} endpoint  e.g. '/auth/login'
 * @param {Object} payload   request body
 * @returns {Promise<Object>}
 */
async function authPost(endpoint, payload) {
  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch (netErr) {
    throw new Error('Cannot reach the server. Please check your connection.');
  }

  let body = {};
  try { body = await response.json(); } catch { /* empty body */ }

  if (!response.ok) {
    // Use server-supplied message if available
    throw new Error(body.message || body.error || `Request failed (${response.status})`);
  }

  return body;
}

// ─── Convenience auth helpers ─────────────────────────────────

/**
 * POST /api/auth/login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}  e.g. { token, user }
 */
function apiLogin(email, password) {
  return authPost('/auth/login', { email, password });
}

/**
 * POST /api/auth/register
 * @param {Object} data  { firstName, lastName, email, password }
 * @returns {Promise<Object>}
 */
function apiRegister(data) {
  return authPost('/auth/register', data);
}

// ─── Session helpers ──────────────────────────────────────────

/**
 * Store auth token and basic user info in localStorage.
 * @param {string} token
 * @param {Object} user
 */
function saveSession(token, user) {
  if (token) localStorage.setItem('maison_token', token);
  if (user)  localStorage.setItem('maison_user', JSON.stringify(user));
}

/** Remove auth session data. */
function clearSession() {
  localStorage.removeItem('maison_token');
  localStorage.removeItem('maison_user');
}

/** @returns {string|null} */
function getToken() {
  return localStorage.getItem('maison_token');
}

/** Check if token exists and is not obviously invalid */
function isTokenValid(token) {
  if (!token) return false;
  // Basic validation - check if it looks like a JWT
  if (token.split('.').length !== 3) return false;
  return true;
}

/** Redirect to home if already logged in */
function redirectIfLoggedIn() {
  // Check for bypass parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('noredirect') === 'true') {
      // Redirect bypassed via URL parameter
    return;
  }

  const token = getToken();
    // Token found in localStorage
  
  if (token && isTokenValid(token)) {
      // User already logged in, redirecting to menu
    window.location.href = '../menu.html';
  } else if (token) {
    // Invalid token, clear it
      // Invalid token found, clearing session
    clearSession();
  } else {
      // No token found, showing login form
  }
}

// ─── Alert Banner ─────────────────────────────────────────────

/**
 * Show or hide the in-form alert banner.
 * @param {string}                  msg
 * @param {'success'|'error'|''}    type   — empty string to hide
 */
function setAlert(msg, type) {
  const el = document.getElementById('auth-alert');
  if (!el) return;

  if (!type) {
    el.classList.remove('show', 'auth-alert-success', 'auth-alert-error');
    return;
  }

  const ICONS = { success: '✓', error: '✕' };
  el.innerHTML = `<span class="auth-alert-icon">${ICONS[type] || '·'}</span><span>${escHtml(msg)}</span>`;
  el.className = `auth-alert auth-alert-${type} show`;

  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => el.classList.remove('show'), 4000);
  }
}

// ─── Field State Helpers ──────────────────────────────────────

/**
 * Mark a field group as having an error.
 * @param {HTMLElement} fieldGroup  — the .field-group wrapper
 * @param {string}      msg         — message shown in .field-error
 */
function setFieldError(fieldGroup, msg) {
  if (!fieldGroup) return;
  fieldGroup.classList.remove('has-success');
  fieldGroup.classList.add('has-error');
  const errEl = fieldGroup.querySelector('.field-error');
  if (errEl) errEl.textContent = msg;
}

/**
 * Mark a field group as valid (green ring).
 * @param {HTMLElement} fieldGroup
 */
function setFieldSuccess(fieldGroup) {
  if (!fieldGroup) return;
  fieldGroup.classList.remove('has-error');
  fieldGroup.classList.add('has-success');
  const errEl = fieldGroup.querySelector('.field-error');
  if (errEl) errEl.textContent = '';
}

/**
 * Clear any error/success state from a field group.
 * @param {HTMLElement} fieldGroup
 */
function clearFieldState(fieldGroup) {
  if (!fieldGroup) return;
  fieldGroup.classList.remove('has-error', 'has-success');
  const errEl = fieldGroup.querySelector('.field-error');
  if (errEl) errEl.textContent = '';
}

// ─── Validators ───────────────────────────────────────────────

/** @returns {boolean} */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}

/** Minimum 8 chars */
function isValidPassword(password) {
  return String(password).length >= 8;
}

/** Non-empty after trim */
function isNonEmpty(val) {
  return String(val).trim().length > 0;
}

// ─── Password Strength ────────────────────────────────────────

/**
 * Calculate password strength score 0–4.
 * 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong
 *
 * Criteria (each adds 1 point):
 *  - Length ≥ 8
 *  - Contains uppercase + lowercase
 *  - Contains a digit
 *  - Contains a special character
 *
 * @param {string} password
 * @returns {{ score: number, label: string }}
 */
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '' };

  let score = 0;
  if (password.length >= 8)                  score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password))                   score++;
  if (/[^a-zA-Z0-9]/.test(password))         score++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] || '' };
}

/**
 * Update the password strength bar UI.
 * Targets elements inside a given container.
 *
 * @param {string} password
 * @param {HTMLElement} container  — element with .strength-seg and .strength-label children
 */
function updateStrengthBar(password, container) {
  if (!container) return;
  const { score, label } = getPasswordStrength(password);
  const segs = container.querySelectorAll('.strength-seg');
  const labelEl = container.querySelector('.strength-label');

  const classes = ['', 'active-weak', 'active-fair', 'active-good', 'active-strong'];

  segs.forEach((seg, i) => {
    // Remove all state classes first
    seg.classList.remove('active-weak', 'active-fair', 'active-good', 'active-strong');
    // Activate segments up to the current score
    if (i < score) seg.classList.add(classes[score]);
  });

  if (labelEl) {
    labelEl.textContent = label;
    labelEl.style.color = ['', '#dc2626', '#d97706', '#c9a96e', '#8a9e8c'][score] || '';
  }
}

// ─── Show / Hide Password Toggle ─────────────────────────────

/**
 * Wire up a show/hide toggle button for a password field.
 * The toggle button should be .field-toggle inside the same .field-input-wrap.
 *
 * @param {HTMLButtonElement} toggleBtn
 * @param {HTMLInputElement}  inputEl
 */
function initPasswordToggle(toggleBtn, inputEl) {
  if (!toggleBtn || !inputEl) return;

  toggleBtn.addEventListener('click', () => {
    const isHidden = inputEl.type === 'password';
    inputEl.type = isHidden ? 'text' : 'password';
    toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
    toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });
}

// ─── Submit Button Loading State ──────────────────────────────

/**
 * Put the submit button into / out of loading state.
 * @param {HTMLButtonElement} btn
 * @param {boolean}           isLoading
 */
function setSubmitLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) {
    btn.classList.add('loading');
  } else {
    btn.classList.remove('loading');
  }
}

// ─── Utility ─────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Animate the visual-panel dish card to cycle through featured dishes.
 * Targets elements by ID — safe to call if the visual panel isn't present.
 */
function initDishCycler() {
  const dishes = [
    { emoji: '🥩', name: 'Dry-Aged Ribeye',       price: '₦68', tag: "Chef's Pick" },
    { emoji: '🐟', name: 'Pan-Roasted Halibut',   price: '₦42', tag: 'Seasonal'    },
    { emoji: '🍝', name: 'Truffle Tagliolini',     price: '₦36', tag: 'Signature'   },
    { emoji: '🍮', name: 'Crème Brûlée',           price: '₦12', tag: 'Classic'     },
    { emoji: '🥗', name: 'Burrata & Tomato',       price: '₦16', tag: 'Popular'     },
  ];

  const emojiEl = document.getElementById('dish-emoji');
  const nameEl  = document.getElementById('dish-name');
  const priceEl = document.getElementById('dish-price');
  const tagEl   = document.getElementById('dish-tag');
  const card    = document.getElementById('dish-card');

  if (!emojiEl) return; // visual panel not present

  let idx = 0;

  setInterval(() => {
    idx = (idx + 1) % dishes.length;
    const d = dishes[idx];

    if (card) card.style.opacity = '0.7';
    setTimeout(() => {
      emojiEl.textContent = d.emoji;
      nameEl.textContent  = d.name;
      priceEl.textContent = d.price;
      tagEl.textContent   = d.tag;
      if (card) card.style.opacity = '1';
    }, 280);
  }, 3800);
}

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  redirectIfLoggedIn();
  initDishCycler();

  // Add transition to dish card
  const card = document.getElementById('dish-card');
  if (card) card.style.transition = 'opacity 0.28s ease';

  // Global function for testing - can be called from browser console
  window.clearAuthForTesting = function() {
    // Clear all possible auth-related localStorage items
    localStorage.removeItem('maison_token');
    localStorage.removeItem('maison_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear all localStorage items that start with 'maison'
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('maison')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('All authentication data cleared. Reload the page to see login form.');
      // All authentication data cleared. Reload the page to see login form.
    
    // Also reload the page immediately
    setTimeout(() => window.location.reload(), 100);
  };

  window.forceShowLogin = function() {
    window.location.href = window.location.pathname + '?noredirect=true';
  };

  console.log('Auth page loaded.');
    // Auth page loaded.
  console.log('Commands available:');
    // Commands available.
  console.log('- clearAuthForTesting() - Clear all auth data and reload');
    // clearAuthForTesting() - Clear all auth data and reload
  console.log('- forceShowLogin() - Show login form without redirect');
    // forceShowLogin() - Show login form without redirect
});
