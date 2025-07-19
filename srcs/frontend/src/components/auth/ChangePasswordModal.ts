export function setupChangePasswordModal() {
    const profileModal = document.getElementById('profile-modal') as HTMLElement | null;
    const profileChangePasswordBtn = document.getElementById('profile-change-password-btn') as HTMLButtonElement | null;
    const changePasswordModal = document.getElementById('change-password-modal') as HTMLElement | null;
    const changePasswordClose = document.getElementById('change-password-close') as HTMLButtonElement | null;
    const changePasswordForm = document.getElementById('change-password-form') as HTMLFormElement | null;
    const currentPasswordInput = document.getElementById('current-password') as HTMLInputElement | null;
    const newPasswordInput = document.getElementById('new-password') as HTMLInputElement | null;
    const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement | null;

    if (!changePasswordModal || !changePasswordClose || !changePasswordForm || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput || !profileChangePasswordBtn) {
        console.warn('Missing change-password modal elements. Skipping setup.');
        return;
    }

    profileChangePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(profileModal) profileModal.classList.add('hidden');
        changePasswordModal.classList.remove('hidden');
    });

    // Close change-password modal
    changePasswordClose.addEventListener('click', (e) => {
        e.preventDefault();
        changePasswordModal.classList.add('hidden');
    });

    changePasswordModal.addEventListener('click', (e) => {
        if (e.target === changePasswordModal) {
            changePasswordModal.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !changePasswordModal.classList.contains('hidden')) {
            changePasswordModal.classList.add('hidden');
        }
    });

    // Handle change-password form submit
    changePasswordForm.addEventListener('submit', async (e) => {
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

        if (current === npass) {
            alert('Old and new password has to be different');
            return;
        }

        try {
            const res = await fetch('/api/auth/password', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: current, newPassword: npass, confirmPassword: cpass })
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message || 'Password changed successfully');
                changePasswordModal.classList.add('hidden');
            } else {
                alert(data.error || 'Failed to change password');
            }
        } catch (err) {
            console.error('Change password error:', err);
            alert('Error changing password');
        }
    });
}
