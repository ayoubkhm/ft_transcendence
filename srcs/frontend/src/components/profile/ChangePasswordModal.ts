// ChangePasswordModal: handles change-password modal and form submission
export function setupChangePasswordModal(): void {
  const profileModal = document.getElementById('profile-modal') as HTMLElement | null;
  const changePasswordModal = document.getElementById('change-password-modal') as HTMLElement | null;
  const changePasswordClose = document.getElementById('change-password-close') as HTMLButtonElement | null;
  const changePasswordForm = document.getElementById('change-password-form') as HTMLFormElement | null;
  const currentPasswordInput = document.getElementById('current-password') as HTMLInputElement | null;
  const newPasswordInput = document.getElementById('new-password') as HTMLInputElement | null;
  const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement | null;
  const profileChangePasswordBtn = document.getElementById('profile-change-password-btn') as HTMLButtonElement | null;
  if (!profileModal || !changePasswordModal || !changePasswordClose || !changePasswordForm || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput || !profileChangePasswordBtn) {
    console.error('Missing change-password modal elements');
    return;
  }

  // Open change-password modal
  profileChangePasswordBtn.addEventListener('click', e => {
    e.preventDefault();
    profileModal.classList.add('hidden');
    changePasswordModal.classList.remove('hidden');
    navigate('change-password');
  });

  // Close handlers
  changePasswordClose.addEventListener('click', e => { e.preventDefault(); changePasswordModal.classList.add('hidden'); history.back(); });
  changePasswordModal.addEventListener('click', e => { if (e.target === changePasswordModal) history.back(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !changePasswordModal.classList.contains('hidden')) history.back(); });

  // Handle form submission
  changePasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
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
        changePasswordModal.classList.add('hidden');
        history.back();
      } else {
        alert(data.error || 'Failed to change password');
      }
    } catch (err) {
      console.error('Change password error:', err);
      alert('Error changing password');
    }
  });
}