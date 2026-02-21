/**
 * login.js — Login page logic
 *
 * Flow:
 *  1. User fills in email + password
 *  2. Client-side validation on each field (blur + submit)
 *  3. On submit: POST /api/auth/login { email, password }
 *  4. On success: save token to localStorage → redirect to menu.html
 *  5. On failure: show inline alert with server error message
 */

'use strict';

// ─── DOM refs ──────────────────────────────────────────────────
const form        = document.getElementById('login-form');
const emailInput  = document.getElementById('email');
const passInput   = document.getElementById('password');
const submitBtn   = document.getElementById('login-btn');
const passToggle  = document.getElementById('pass-toggle');

// Field wrapper groups (for error state classes)
const emailGroup  = document.getElementById('email-group');
const passGroup   = document.getElementById('pass-group');

// ─── Per-field Validation ─────────────────────────────────────

/**
 * Validate the email field.
 * Called on blur and before submit.
 * @returns {boolean}
 */
function validateEmail() {
  const val = emailInput.value.trim();

  if (!val) {
    setFieldError(emailGroup, 'Email is required.');
    return false;
  }
  if (!isValidEmail(val)) {
    setFieldError(emailGroup, 'Please enter a valid email address.');
    return false;
  }

  setFieldSuccess(emailGroup);
  return true;
}

/**
 * Validate the password field.
 * @returns {boolean}
 */
function validatePassword() {
  const val = passInput.value;

  if (!val) {
    setFieldError(passGroup, 'Password is required.');
    return false;
  }
  if (val.length < 8) {
    setFieldError(passGroup, 'Password must be at least 8 characters.');
    return false;
  }

  setFieldSuccess(passGroup);
  return true;
}

// ─── Real-time Blur Validation ────────────────────────────────

// Validate each field when the user leaves it (onblur)
emailInput?.addEventListener('blur',  validateEmail);
passInput?.addEventListener('blur',   validatePassword);

// Clear error state as user types (improve perceived responsiveness)
emailInput?.addEventListener('input', () => clearFieldState(emailGroup));
passInput?.addEventListener('input',  () => clearFieldState(passGroup));

// ─── Password Toggle ──────────────────────────────────────────
initPasswordToggle(passToggle, passInput);

// ─── Form Submit ──────────────────────────────────────────────

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear any existing alert
  setAlert('', '');

  // Run all validations — collect results so all errors show at once
  const emailOk = validateEmail();
  const passOk  = validatePassword();

  if (!emailOk || !passOk) return;

  // --- Show loading state ---
  setSubmitLoading(submitBtn, true);

  try {
    /**
     * POST /api/auth/login
     * Request body:  { email: string, password: string }
     * Expected response: { token: string, user: { id, name, email, role } }
     */
    const result = await apiLogin(
      emailInput.value.trim(),
      passInput.value
    );

    // Store session credentials
    saveSession(result.token, result.user);

    // Success feedback before redirect
    setAlert('Welcome back! Redirecting…', 'success');

    // Small delay so the user sees the success message
      setTimeout(() => {
        window.location.href = '../menu.html';
      }, 900);

  } catch (err) {
    // Show the server's error message (or a friendly fallback)
    setAlert(err.message || 'Login failed. Please try again.', 'error');
    setSubmitLoading(submitBtn, false);

    // Shake the form slightly to signal failure
    form.style.animation = 'none';
    requestAnimationFrame(() => {
      form.style.animation = 'formShake 0.4s ease';
    });
  }
});

// ─── "Remember me" — pre-fill email if remembered ─────────────
document.addEventListener('DOMContentLoaded', () => {
  const remembered = localStorage.getItem('maison_remembered_email');
  if (remembered && emailInput) {
    emailInput.value = remembered;
    const rememberCheck = document.getElementById('remember-me');
    if (rememberCheck) rememberCheck.checked = true;
  }
});

// ─── Inject shake keyframe dynamically ───────────────────────
const style = document.createElement('style');
style.textContent = `
  @keyframes formShake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-5px); }
    80%       { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);
