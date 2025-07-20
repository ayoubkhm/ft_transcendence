import { show, hide } from '../../lib/dom';
import { navigate, onRoute } from '../../lib/router';

export function setupLoginModal() {
  const loginBtn = document.getElementById('login-btn') as HTMLButtonElement | null;
  const loginModal = document.getElementById('login-modal') as HTMLElement | null;
  const loginModalForm = document.getElementById('login-modal-form') as HTMLFormElement | null;
  const loginModalClose = document.getElementById('login-modal-close') as HTMLButtonElement | null;
  const loginEmailInput = document.getElementById('login-email') as HTMLInputElement | null;
  const loginPasswordInput = document.getElementById('login-password') as HTMLInputElement | null;
  const googleLoginBtn = document.getElementById('google-login-btn') as HTMLButtonElement | null;
  const guestLoginBtn = document.getElementById('guest-login-btn') as HTMLButtonElement | null;

  if (!loginBtn || !loginModal || !loginModalForm || !loginModalClose || !loginEmailInput || !loginPasswordInput || !googleLoginBtn || !guestLoginBtn) {
    return;
  }

  const closeModal = () => {
    if (loginModal) {
      hide(loginModal);
    }
    navigate('home');
  };

  loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('login');
  });

  loginModalClose.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });

  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginModal && !loginModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  onRoute('login', () => {
    if (loginModal) {
      show(loginModal);
    }
  });

  // Hide modal if we navigate away
  onRoute('home', () => {
    if (loginModal && !loginModal.classList.contains('hidden')) {
      hide(loginModal);
    }
  });

  loginModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        hide(loginModal);
        window.location.reload();
      } else {
        alert('Login failed');
      }
    } catch (err) {
      console.error(err);
      alert('Login error');
    }
  });

  googleLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/api/auth/login/google';
  });

  guestLoginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        hide(loginModal);
        window.location.reload();
      } else {
        alert('Guest login failed');
      }
    } catch (err) {
      console.error(err);
      alert('Guest login error');
    }
  });
}