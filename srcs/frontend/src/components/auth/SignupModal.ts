import { show, hide } from '../../lib/dom';
import { fetchJSON } from '../../lib/api';

export function setupSignupModal() {
  const signupBtn = document.getElementById('signup-btn') as HTMLButtonElement | null;
  const signupModal = document.getElementById('signup-modal') as HTMLElement | null;
  const signupForm = document.getElementById('signup-modal-form') as HTMLFormElement | null;
  const signupModalClose = document.getElementById('signup-modal-close') as HTMLButtonElement | null;
  const signupCancelBtn = document.getElementById('signup-cancel-btn') as HTMLButtonElement | null;
  const emailInput = document.getElementById('signup-email') as HTMLInputElement | null;
  const nameInput = document.getElementById('signup-name') as HTMLInputElement | null;
  const passwordInput = document.getElementById('signup-password') as HTMLInputElement | null;
  const confirmInput = document.getElementById('signup-confirm') as HTMLInputElement | null;
  const passFeedback = document.getElementById('signup-pass-feedback') as HTMLDivElement | null;
  const googleSignupBtn = document.getElementById('google-signup-btn') as HTMLButtonElement | null;

  if (!signupBtn || !signupModal || !signupForm || !signupModalClose || !signupCancelBtn ||
      !emailInput || !nameInput || !passwordInput || !confirmInput || !passFeedback || !googleSignupBtn) {
    return;
  }

  signupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    show(signupModal);
  });

  signupModalClose.addEventListener('click', (e) => {
    e.preventDefault();
    hide(signupModal);
  });

  signupCancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hide(signupModal);
  });

  passwordInput.addEventListener('input', () => {
    const pwd = passwordInput.value;
    const lengthOk = pwd.length >= 8;
    const digitOk = /\d/.test(pwd);
    const specialOk = /[!@#$%^&*]/.test(pwd);
    const uppercaseOk = /[A-Z]/.test(pwd);
    passFeedback.textContent =
      `Length: ${pwd.length} (${lengthOk ? '✓' : '✘'}), ` +
      `Digit: ${digitOk ? '✓' : '✘'}, ` +
      `Special: ${specialOk ? '✓' : '✘'}, ` +
      `Uppercase: ${uppercaseOk ? '✓' : '✘'}`;
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const username = nameInput.value;
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    if (password !== confirm) {
      alert('Passwords do not match');
      return;
    }
    try {
      const data = await fetchJSON<{ success: boolean; msg: string }>('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      if (data.success) {
        hide(signupModal);
        alert('Signup successful; please login');
      } else {
        alert(data.msg || 'Signup failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error during signup');
    }
  });

  googleSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/api/auth/login/google';
  });
}