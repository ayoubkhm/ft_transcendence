// TwoFASetup: handles two-factor authentication setup modal
import { hide, show } from '../../lib/dom';
import { navigate, onRoute } from '../../lib/router';

/**
 * Sets up the 2FA setup modal and handlers.
 * Returns an object with open2faSetupModal() to trigger the setup flow.
 */
export function closeTwoFASetup() {
  const setup2faModal = document.getElementById('2fa-setup-modal') as HTMLElement | null;
  const setup2faTestCodeDiv = document.getElementById('2fa-setup-testcode') as HTMLElement | null;
  if (setup2faModal) {
    hide(setup2faModal);
  }
  if (setup2faTestCodeDiv) {
    hide(setup2faTestCodeDiv);
  }
  // Clear any previous QR code
  const setup2faQr = document.getElementById('2fa-setup-qr') as HTMLImageElement | null;
  if (setup2faQr) {
    setup2faQr.src = '';
  }
}

export function setupTwoFASetup() {
  const setup2faModal = document.getElementById('2fa-setup-modal') as HTMLElement | null;
  const setup2faCloseBtn = document.getElementById('2fa-setup-close') as HTMLButtonElement | null;
  const setup2faQr = document.getElementById('2fa-setup-qr') as HTMLImageElement | null;
  const setup2faTestCodeDiv = document.getElementById('2fa-setup-testcode') as HTMLElement | null;
  const setup2faForm = document.getElementById('2fa-setup-form') as HTMLFormElement | null;
  const setup2faCodeInput = document.getElementById('2fa-setup-code') as HTMLInputElement | null;
  if (!setup2faModal || !setup2faCloseBtn || !setup2faQr || !setup2faForm || !setup2faCodeInput) {
    return;
  }

  async function open2faSetupModal() {
    try {
      const res = await fetch('/api/auth/2fa/setup/ask', { method: 'GET', credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err as any).error || 'Failed to initiate 2FA setup');
        return;
      }
      const data = await res.json();
      setup2faQr.src = data.qrCode;
      if (setup2faTestCodeDiv && data.testCode) {
        setup2faTestCodeDiv.textContent = `Test code: ${data.testCode}`;
        show(setup2faTestCodeDiv);
      }
      show(setup2faModal);
    } catch (err) {
      console.error('2FA setup ask error:', err);
      alert('Error initiating 2FA setup');
    }
  }

  onRoute('setup-2fa', open2faSetupModal);
  onRoute('profile', closeTwoFASetup);

  setup2faCloseBtn.addEventListener('click', e => {
    e.preventDefault();
    navigate('home');
  });
  setup2faModal.addEventListener('click', e => {
    if (e.target === setup2faModal) navigate('home');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !setup2faModal.classList.contains('hidden')) {
      navigate('home');
    }
  });
  onRoute('home', () => {
    if (setup2faModal && !setup2faModal.classList.contains('hidden')) {
      hide(setup2faModal);
    }
  });

  setup2faForm.addEventListener('submit', async e => {
    e.preventDefault();
    const code = setup2faCodeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      alert('Please enter a valid 6-digit code.');
      return;
    }
    try {
      const res = await fetch('/api/auth/2fa/setup/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert('2FA has been successfully enabled. You will now be logged out. Please log in again to continue.');
        window.location.replace('/login');
      } else {
        alert((data as any).error || '2FA setup verification failed');
      }
    } catch (err) {
      console.error('2FA setup submit error:', err);
      alert('Error verifying 2FA code');
    }
  });
}

/**
 * Sets up the 2FA login modal and handlers.
 * Returns an object with show2faLogin() to display the login flow.
 */
export function setupTwoFALogin() {
  const twofaLoginModal = document.getElementById('2fa-login-modal') as HTMLElement | null;
  const twofaLoginClose = document.getElementById('2fa-login-close') as HTMLButtonElement | null;
  const twofaLoginForm = document.getElementById('2fa-login-form') as HTMLFormElement | null;
  const twofaLoginCodeInput = document.getElementById('2fa-login-code') as HTMLInputElement | null;

  function show2faLogin() {
    navigate('login-2fa');
  }

  if (!twofaLoginModal || !twofaLoginClose || !twofaLoginForm || !twofaLoginCodeInput) {
    return {
      show2faLogin: () => {
        /* do nothing */
      },
    };
  }

  onRoute('login-2fa', () => {
    if (twofaLoginModal) {
      show(twofaLoginModal);
    }
  });

  twofaLoginClose.addEventListener('click', e => {
    e.preventDefault();
    navigate('home');
  });
  twofaLoginModal.addEventListener('click', e => {
    if (e.target === twofaLoginModal) navigate('home');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !twofaLoginModal.classList.contains('hidden')) {
      navigate('home');
    }
  });
  onRoute('home', () => {
    if (twofaLoginModal && !twofaLoginModal.classList.contains('hidden')) {
      hide(twofaLoginModal);
    }
  });

  twofaLoginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const code = twofaLoginCodeInput.value.trim();
    try {
      const res = await fetch('/api/auth/2fa/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        hide(twofaLoginModal);
        localStorage.setItem('loggedIn', 'true');
        window.location.replace(`${location.pathname}${location.search}`);
      } else {
        alert((data as any).error || '2FA verification failed');
      }
    } catch (err) {
      console.error('2FA login error:', err);
      alert('Error verifying 2FA login');
    }
  });

  return { show2faLogin };
}