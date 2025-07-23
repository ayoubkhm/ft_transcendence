import { onRoute, getCurrentRoute, navigate } from '../../lib/router';

// ChangePasswordModal: handles change-password modal and form submission
export function setupChangePasswordModal(): void {
  console.log('[PW_MODAL] Setup initiated.');
  const profileModal = document.getElementById('profile-modal') as HTMLElement | null;
  const changePasswordModal = document.getElementById('change-password-modal') as HTMLElement | null;
  const changePasswordClose = document.getElementById('change-password-close') as HTMLButtonElement | null;
  const changePasswordForm = document.getElementById('change-password-form') as HTMLFormElement | null;
  const currentPasswordInput = document.getElementById('current-password') as HTMLInputElement | null;
  const newPasswordInput = document.getElementById('new-password') as HTMLInputElement | null;
  const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement | null;
  const profileChangePasswordBtn = document.getElementById('profile-change-password-btn') as HTMLButtonElement | null;
  if (!profileModal || !changePasswordModal || !changePasswordClose || !changePasswordForm || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput || !profileChangePasswordBtn) {
    console.error('[PW_MODAL] Missing critical elements.');
    return;
  }

  // --- OPEN ---
  profileChangePasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[PW_MODAL] Open button clicked. Navigating to "change-password".');
    navigate('change-password');
  });

  // --- ROUTE HANDLERS ---
  onRoute('change-password', () => {
    console.log('[PW_MODAL] onRoute("change-password") triggered. Showing modal.');
    profileModal.classList.add('hidden');
    changePasswordModal.classList.remove('hidden');
  });

  onRoute('profile', () => {
    console.log('[PW_MODAL] onRoute("profile") triggered. Hiding modal.');
    changePasswordModal.classList.add('hidden');
    profileModal?.classList.remove('hidden');
  });

  // --- LOGICAL CLOSE ---
  const closeModal = (e?: Event) => {
    if (e) {
      console.log(`[PW_MODAL] closeModal called by event: ${e.type}. Preventing default.`);
      e.preventDefault();
    } else {
      console.log('[PW_MODAL] closeModal called programmatically (e.g., after submit).');
    }
    
    console.log('[PW_MODAL] Navigating to "profile" to close modal.');
    navigate('profile');
  };

  changePasswordClose.addEventListener('click', closeModal);
  changePasswordModal.addEventListener('click', e => { if (e.target === changePasswordModal) closeModal(e); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !changePasswordModal.classList.contains('hidden')) closeModal(e); });

  // Handle form submission
  changePasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    console.log('[PW_MODAL] Form submitted.');
    const current = currentPasswordInput.value.trim();
    const npass = newPasswordInput.value.trim();
    const cpass = confirmPasswordInput.value.trim();
    if (!current || !npass || !cpass) {
      alert('All fields are required');
      return;
    }
    if (npass !== cpass) {
      alert('New passwords do not match');
      return;
    }
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: npass, confirmPassword: cpass }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Password changed successfully');
        console.log('[PW_MODAL] Password change successful. Calling closeModal.');
        closeModal();
      } else {
        alert(data.error || 'Failed to change password');
      }
    } catch (err) {
      console.error('Change password error:', err);
      alert('Error changing password');
    }
  });
}