// ProfileModal: handles user profile viewing and settings modal
import { navigate, onRoute } from '../../lib/router';
import show_stats from '../../stats/show_stats';
import { getCurrentUserId } from '../auth/Auth';

export async function loadProfileData() {
  const profileUsername = document.getElementById('profile-username') as HTMLElement | null;
  const profileEmail = document.getElementById('profile-email') as HTMLElement | null;
  const profileAvatar = document.getElementById('profile-avatar') as HTMLImageElement | null;
  const profileId = document.getElementById('profile-id') as HTMLElement | null;
  const profileOnlineStatus = document.getElementById('profile-online-status') as HTMLElement | null;
  const profile2FAStatus = document.getElementById('profile-2fa-status') as HTMLElement | null;
  const profileSetup2FABtn = document.getElementById('profile-setup-2fa-btn') as HTMLButtonElement | null;
  const profileDisable2FABtn = document.getElementById('profile-disable-2fa-btn') as HTMLButtonElement | null;
  const profileNa2FABtn = document.getElementById('profile-na-2fa-btn') as HTMLButtonElement | null;

  if (!profileUsername || !profileEmail || !profileAvatar || !profileId || !profileOnlineStatus || !profile2FAStatus || !profileSetup2FABtn || !profileDisable2FABtn || !profileNa2FABtn) {
    console.error('Missing profile modal elements for data loading');
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
    if (user.type === 'oauth') {
      profileSetup2FABtn.classList.add('hidden');
      profileDisable2FABtn.classList.add('hidden');
      profileNa2FABtn.classList.remove('hidden');
    } else if (user.twofa_secret && user.twofa_validated) {
      profile2FAStatus.textContent = 'true';
      profileSetup2FABtn.classList.add('hidden');
      profileDisable2FABtn.classList.remove('hidden');
      profileNa2FABtn.classList.add('hidden');
    } else {
      profile2FAStatus.textContent = 'false';
      profileSetup2FABtn.classList.remove('hidden');
      profileDisable2FABtn.classList.add('hidden');
      profileNa2FABtn.classList.add('hidden');
    }
    // Display avatar if present
    if (profileAvatar) {
      if (user.avatar) {
        profileAvatar.src = user.avatar;
        profileAvatar.classList.remove('hidden');
      } else {
        profileAvatar.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Profile lookup error:', err);
  }
}

export function setupProfileModal(): void {
  // Elements
  const profileBtn = document.getElementById('profile-btn') as HTMLButtonElement | null;
  const profileModal = document.getElementById('profile-modal') as HTMLElement | null;

  if (!profileBtn || !profileModal) {
    console.error('Missing profile modal elements');
    return;
  }

  // Listen for profile updates
  document.addEventListener('profileUpdated', () => {
    loadProfileData();
  });

  // Open Profile modal and load data
  profileBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const loggedIn = localStorage.getItem('loggedIn') === 'true';
    if (!loggedIn) {
        window.location.hash = '#login';
        return;
    }
    await loadProfileData();
    navigate('profile');
  });

  // Use event delegation for all buttons within the modal
  profileModal.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (!button) return;

    switch (button.id) {
      case 'profile-modal-close':
        e.preventDefault();
        navigate('home');
        break;
      
      case 'profile-show-stats-btn':
        const userId = getCurrentUserId();
        if (userId) {
          show_stats(userId);
          navigate('stats');
        }
        break;

      case 'profile-change-password-btn':
        e.preventDefault();
        profileModal.classList.add('hidden');
        navigate('change-password');
        break;

      case 'profile-setup-2fa-btn':
        e.preventDefault();
        profileModal.classList.add('hidden');
        navigate('setup-2fa');
        break;

      case 'profile-disable-2fa-btn':
        e.preventDefault();
        try {
          const res = await fetch('/api/auth/2fa/delete', { method: 'DELETE', credentials: 'include' });
          const data = await res.json();
          if (res.ok) {
            alert(data.message || '2FA disabled. You will now be logged out.');
            window.location.replace('/login');
          } else {
            alert(data.error || 'Disable 2FA failed');
          }
        } catch (err) {
          console.error('Disable 2FA error:', err);
          alert('Error disabling 2FA');
        }
        break;
      
      case 'profile-delete-btn':
        const email = localStorage.getItem('userEmail');
        if (!email) {
          alert('Cannot delete profile without user email.');
          return;
        }
        if (confirm('Are you sure you want to delete your profile? This action is irreversible.')) {
          try {
            const res = await fetch(`/api/user/delete/${encodeURIComponent(email)}`, {
              method: 'DELETE',
              credentials: 'include',
            });
            const data = await res.json();
            if (res.ok && data.success) {
              alert(data.message || 'Profile deleted successfully. You will be logged out.');
              localStorage.clear();
              window.location.reload();
            } else {
              alert(data.error || 'Failed to delete profile.');
            }
          } catch (err) {
            console.error('Delete profile error:', err);
            alert('An error occurred while deleting your profile.');
          }
        }
        break;
    }
  });

  // Close handlers
  profileModal.addEventListener('click', e => { if (e.target === profileModal) navigate('home'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !profileModal.classList.contains('hidden')) navigate('home'); });

  // Hide modal on home navigation
  onRoute('home', () => {
    if (profileModal && !profileModal.classList.contains('hidden')) {
      profileModal.classList.add('hidden');
    }
  });

  onRoute('profile', () => {
    if (profileModal) {
      profileModal.classList.remove('hidden');
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
    previewImg.style.display = 'none'; // Initially hidden
    uploadBtn.parentElement?.appendChild(previewImg);

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.className = 'px-4 py-2 bg-green-700 rounded text-white mt-2';
    confirmBtn.style.display = 'none'; // Initially hidden
    uploadBtn.parentElement?.appendChild(confirmBtn);

    uploadBtn.addEventListener('click', () => fileInput.click());

    let selectedFile: File | null = null;

    fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        selectedFile = target.files[0];
        const reader = new FileReader();
        reader.onload = ev => {
          if (ev.target?.result) {
            previewImg.src = ev.target.result as string;
            previewImg.style.display = 'block';
            confirmBtn.style.display = 'block';
          }
        };
        reader.readAsDataURL(selectedFile);
      }
    });

    confirmBtn.addEventListener('click', async () => {
      if (!selectedFile) return;

      try {
        const formData = new FormData();
        formData.append('avatar', selectedFile);
        const res = await fetch('/api/user/upload_avatar', { method: 'POST', credentials: 'include', body: formData });
        const data = await res.json();

        if (res.ok && data.avatar) {
          const profileAvatar = document.getElementById('profile-avatar') as HTMLImageElement | null;
          if (profileAvatar) {
            profileAvatar.src = data.avatar;
            profileAvatar.classList.remove('hidden');
          }
          alert('Avatar uploaded successfully');
          previewImg.style.display = 'none';
          confirmBtn.style.display = 'none';
          selectedFile = null;
        } else {
          alert(data.error || 'Upload failed');
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
        alert('Error uploading avatar');
      }
    });
  }
}
