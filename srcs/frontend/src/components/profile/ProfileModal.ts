// ProfileModal: handles user profile viewing and settings modal
import { navigate, onRoute } from '../../lib/router';

export function setupProfileModal(): void {
  // Elements
  const profileBtn = document.getElementById('profile-btn') as HTMLButtonElement | null;
  const profileModal = document.getElementById('profile-modal') as HTMLElement | null;
  const profileModalCloseBtn = document.getElementById('profile-modal-close') as HTMLButtonElement | null;
  const profileUsername = document.getElementById('profile-username') as HTMLElement | null;
  const profileEmail = document.getElementById('profile-email') as HTMLElement | null;
  const profileAvatar = document.getElementById('profile-avatar') as HTMLImageElement | null;
  const profileId = document.getElementById('profile-id') as HTMLElement | null;
  const profileOnlineStatus = document.getElementById('profile-online-status') as HTMLElement | null;
  const profile2FAStatus = document.getElementById('profile-2fa-status') as HTMLElement | null;
  const profileSetup2FABtn = document.getElementById('profile-setup-2fa-btn') as HTMLButtonElement | null;
  const profileDisable2FABtn = document.getElementById('profile-disable-2fa-btn') as HTMLButtonElement | null;
  const profileNa2FABtn = document.getElementById('profile-na-2fa-btn') as HTMLButtonElement | null;
  const profileChangePasswordBtn = document.getElementById('profile-change-password-btn') as HTMLButtonElement | null;
  if (!profileBtn || !profileModal || !profileModalCloseBtn || !profileUsername || !profileEmail || !profileAvatar || !profileId || !profileOnlineStatus || !profile2FAStatus || !profileSetup2FABtn || !profileDisable2FABtn || !profileNa2FABtn || !profileChangePasswordBtn) {
    console.error('Missing profile modal elements');
    return;
  }

  // Open Profile modal and load data
  profileBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const loggedIn = localStorage.getItem('loggedIn') === 'true';
    if (!loggedIn) {
        window.location.hash = '#login';
        return;
    }
    const email = localStorage.getItem('userEmail');
    if (!email) {
        alert('Could not find user email. Please log in again.');
        return;
    }
    try {
      const res = await fetch(`/api/user/lookup/${encodeURIComponent(email)}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const user = await res.json() as any;
      profileUsername.textContent = user.name;
      profileEmail.textContent = user.email;
      profileId.textContent = user.id.toString();
      profileOnlineStatus.textContent = user.online ? 'true' : 'false';
      if (user.twofa_secret && user.twofa_validated) {
        profile2FAStatus.textContent = 'true';
        profileSetup2FABtn.classList.add('hidden');
        profileDisable2FABtn.classList.remove('hidden');
      } else {
        profile2FAStatus.textContent = 'false';
        profileSetup2FABtn.classList.remove('hidden');
        profileDisable2FABtn.classList.add('hidden');
      }
      profileNa2FABtn.classList.add('hidden');
      // Display avatar if present
      if (profileAvatar) {
        if (user.avatar) {
          profileAvatar.src = user.avatar;
          profileAvatar.classList.remove('hidden');
        } else {
          profileAvatar.classList.add('hidden');
        }
      }
      profileModal.classList.remove('hidden');
      navigate('profile');
    } catch (err) {
      console.error('Profile lookup error:', err);
    }
  });

  // Close handlers
  profileModalCloseBtn.addEventListener('click', e => { e.preventDefault(); navigate('home'); });
  profileModal.addEventListener('click', e => { if (e.target === profileModal) navigate('home'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !profileModal.classList.contains('hidden')) navigate('home'); });

  // Hide modal on home navigation
  onRoute('home', () => {
    if (profileModal && !profileModal.classList.contains('hidden')) {
      profileModal.classList.add('hidden');
    }
  });

  // 2FA setup button
  profileSetup2FABtn.addEventListener('click', e => {
    e.preventDefault();
    profileModal.classList.add('hidden');
    navigate('setup-2fa');
  });

  // Change Password button
  profileChangePasswordBtn.addEventListener('click', e => {
    e.preventDefault();
    profileModal.classList.add('hidden');
    navigate('change-password');
  });

  // Disable 2FA button
  profileDisable2FABtn.addEventListener('click', async e => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/2fa/delete', { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '2FA disabled. You will now be logged out.');
        // Clear session and refresh
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('twofaEnabled');
        window.location.reload();
      } else {
        alert(data.error || 'Disable 2FA failed');
      }
    } catch (err) {
      console.error('Disable 2FA error:', err);
      alert('Error disabling 2FA');
    }
  });
  // Avatar upload logic
  const uploadBtn = document.getElementById('profile-upload-avatar-btn') as HTMLButtonElement | null;
  const fileInput = document.getElementById('avatar-file-input') as HTMLInputElement | null;
  if (uploadBtn && fileInput) {
    const previewImg = document.createElement('img');
    previewImg.style.maxWidth = '150px';
    previewImg.style.marginTop = '10px';
    previewImg.style.borderRadius = '8px';
    previewImg.style.display = 'block';
    uploadBtn.parentElement?.appendChild(previewImg);
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = ev => {
          if (ev.target?.result) previewImg.src = ev.target.result as string;
        };
        reader.readAsDataURL(file);
        try {
          const formData = new FormData(); formData.append('avatar', file);
          const res = await fetch('/api/user/upload_avatar', { method: 'POST', credentials: 'include', body: formData });
          let data: any;
          try { data = await res.json(); } catch {}
          if (res.ok && data.avatar) { previewImg.src = data.avatar; alert('Avatar uploaded successfully'); }
          else { alert((data && (data.error || data.msg)) || 'Upload failed'); }
        } catch (err) {
          console.error('Avatar upload error:', err);
          alert('Error uploading avatar');
        }
      }
    });
  }
}
