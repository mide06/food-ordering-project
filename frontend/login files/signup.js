/**
 * signup.js — Sign-up page logic
 *
 * Flow:
 *  1. User fills first name, last name, email, password, confirm password
 *  2. Real-time + on-blur validation for all fields
 *  3. Password strength meter updates as user types
 *  4. On submit: POST /api/auth/register { firstName, lastName, email, password }
 *  5. On success: save session → redirect to menu.html
 *  6. On failure: show inline alert
 */

'use strict';

// ─── DOM refs ──────────────────────────────────────────────────
const form          = document.getElementById('signup-form');
const firstInput    = document.getElementById('first-name');
const lastInput     = document.getElementById('last-name');
const emailInput    = document.getElementById('email');
const passInput     = document.getElementById('password');
const confirmInput  = document.getElementById('confirm-password');
const submitBtn     = document.getElementById('signup-btn');
const passToggle    = document.getElementById('pass-toggle');
const confirmToggle = document.getElementById('confirm-toggle');
const termsCheck    = document.getElementById('agree-terms');
const strengthWrap  = document.getElementById('strength-wrap');

// Field group wrappers
const firstGroup    = document.getElementById('first-group');
const lastGroup     = document.getElementById('last-group');
const emailGroup    = document.getElementById('email-group');
const passGroup     = document.getElementById('pass-group');
const confirmGroup  = document.getElementById('confirm-group');
const termsGroup    = document.getElementById('terms-group');

// ─── Individual Validators ────────────────────────────────────

function validateFirstName() {
  const v = firstInput?.value.trim();
  if (!v) { setFieldError(firstGroup, 'First name is required.'); return false; }
  if (v.length < 2) { setFieldError(firstGroup, 'Must be at least 2 characters.'); return false; }
  setFieldSuccess(firstGroup);
  return true;
}

function validateLastName() {
  const v = lastInput?.value.trim();
  if (!v) { setFieldError(lastGroup, 'Last name is required.'); return false; }
  if (v.length < 2) { setFieldError(lastGroup, 'Must be at least 2 characters.'); return false; }
  setFieldSuccess(lastGroup);
  return true;
}

function validateEmail() {
  const v = emailInput?.value.trim();
  if (!v) { setFieldError(emailGroup, 'Email is required.'); return false; }
  if (!isValidEmail(v)) { setFieldError(emailGroup, 'Please enter a valid email address.'); return false; }
  setFieldSuccess(emailGroup);
  return true;
}

function validatePassword() {
  const v = passInput?.value;
  if (!v) { setFieldError(passGroup, 'Password is required.'); return false; }
  if (v.length < 8) { setFieldError(passGroup, 'Must be at least 8 characters.'); return false; }

  const { score } = getPasswordStrength(v);
  if (score < 2) {
    setFieldError(passGroup, 'Password is too weak. Add uppercase, numbers or symbols.');
    return false;
  }

  setFieldSuccess(passGroup);
  return true;
}

function validateConfirm() {
  const v = confirmInput?.value;
  if (!v) { setFieldError(confirmGroup, 'Please confirm your password.'); return false; }
  if (v !== passInput?.value) { setFieldError(confirmGroup, 'Passwords do not match.'); return false; }
  setFieldSuccess(confirmGroup);
  return true;
}

function validateTerms() {
  if (!termsCheck?.checked) {
    setFieldError(termsGroup, 'You must agree to the Terms & Privacy Policy.');
    return false;
  }
  clearFieldState(termsGroup);
  return true;
}

// ─── Blur Listeners (validate on leave) ──────────────────────
firstInput?.addEventListener('blur',   validateFirstName);
lastInput?.addEventListener('blur',    validateLastName);
emailInput?.addEventListener('blur',   validateEmail);
passInput?.addEventListener('blur',    validatePassword);
confirmInput?.addEventListener('blur', validateConfirm);

// ─── Input Listeners (clear error while typing) ───────────────
firstInput?.addEventListener('input',   () => clearFieldState(firstGroup));
lastInput?.addEventListener('input',    () => clearFieldState(lastGroup));
emailInput?.addEventListener('input',   () => clearFieldState(emailGroup));
confirmInput?.addEventListener('input', () => {
  clearFieldState(confirmGroup);
  // Live match check
  if (confirmInput.value && passInput?.value && confirmInput.value !== passInput.value) {
    setFieldError(confirmGroup, 'Passwords do not match.');
  } else if (confirmInput.value && confirmInput.value === passInput?.value) {
    setFieldSuccess(confirmGroup);
  }
});

// ─── Password Strength Meter ──────────────────────────────────

passInput?.addEventListener('input', () => {
  clearFieldState(passGroup);
  updateStrengthBar(passInput.value, strengthWrap);

  // Also re-validate confirm if it already has a value
  if (confirmInput?.value) {
    if (confirmInput.value === passInput.value) setFieldSuccess(confirmGroup);
    else setFieldError(confirmGroup, 'Passwords do not match.');
  }
});

// ─── Password Toggles ─────────────────────────────────────────
initPasswordToggle(passToggle,    passInput);
initPasswordToggle(confirmToggle, confirmInput);

// ─── Terms Checkbox ───────────────────────────────────────────
termsCheck?.addEventListener('change', () => clearFieldState(termsGroup));

// ─── Form Submit ──────────────────────────────────────────────

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear any existing alert
  setAlert('', '');

  // Run all validators and collect results
  const ok = [
    validateFirstName(),
    validateLastName(),
    validateEmail(),
    validatePassword(),
    validateConfirm(),
    validateTerms(),
  ].every(Boolean);  // every() stops early, so we use array.every after collecting all

  if (!ok) {
    // Scroll to first error field
    const firstError = form.querySelector('.has-error input, .has-error [type="checkbox"]');
    firstError?.focus();
    return;
  }

  setSubmitLoading(submitBtn, true);

  try {
    /**
     * POST /api/auth/register
     * Request body: {
     *   firstName: string,
     *   lastName:  string,
     *   email:     string,
     *   password:  string
     * }
     * Expected response: { token: string, user: { id, name, email } }
     */
    const result = await apiRegister({
      name: `${firstInput.value.trim()} ${lastInput.value.trim()}`,
      email: emailInput.value.trim(),
      password: passInput.value,
    });

    // Persist session
    saveSession(result.token, result.user);

    // Show success then redirect
    setAlert('Account created! Welcome to MAISON.', 'success');

      setTimeout(() => {
        window.location.href = '../menu.html';
      }, 1100);

  } catch (err) {
    setAlert(err.message || 'Registration failed. Please try again.', 'error');
    setSubmitLoading(submitBtn, false);

    // If it's an email conflict, highlight that field
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('email') && (msg.includes('taken') || msg.includes('exists') || msg.includes('already'))) {
      setFieldError(emailGroup, 'This email is already registered. Try logging in.');
      emailInput?.focus();
    }
  }
});
