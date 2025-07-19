import { navigate, onRoute, getCurrentRoute } from '../../lib/router';

export function setupEditUsernameModal(): void {
  const editUsernameModal = document.getElementById('edit-username-modal') as HTMLElement | null;
  const editUsernameClose = document.getElementById('edit-username-close') as HTMLButtonElement | null;
  const editUsernameForm = document.getElementById('edit-username-form') as HTMLFormElement | null;
  const newUsernameInput = document.getElementById('new-username') as HTMLInputElement | null;
  const profileEditUsernameBtn = document.getElementById('profile-edit-username-btn') as HTMLButtonElement | null;
  const profileModal = document.getElementById('profile-modal') as HTMLElement | null;

  if (!editUsernameModal || !editUsernameClose || !editUsernameForm || !newUsernameInput || !profileEditUsernameBtn) {
    console.error('Missing edit-username modal elements');
    return;
  }

  // --- OPEN ---
  profileEditUsernameBtn.addEventListener('click', () => {
    navigate('edit-username');
  });

  // --- ROUTE HANDLERS ---
  onRoute('edit-username', () => {
    profileModal?.classList.add('hidden');
    editUsernameModal.classList.remove('hidden');
  });

  onRoute('profile', () => {
    editUsernameModal.classList.add('hidden');
    profileModal?.classList.remove('hidden');
  });

  // --- LOGICAL CLOSE ---
  const closeModal = () => {
    if (getCurrentRoute && getCurrentRoute() === 'edit-username') {
      history.back();
    } else {
      editUsernameModal.classList.add('hidden');
    }
  };

  editUsernameClose.addEventListener('click', closeModal);

  editUsernameModal.addEventListener('click', (e) => {
    if (e.target === editUsernameModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !editUsernameModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // --- FORM SUBMIT ---
  editUsernameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = newUsernameInput.value.trim();
    if (!newUsername) {
      alert('Username is required');
      return;
    }

    try {
      const email = localStorage.getItem('email');
      const res = await fetch(`/api/user/edit/${email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: 'name', name: newUsername }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Username changed successfully');
        closeModal();
      } else {
        alert(data.error || 'Failed to change username');
      }
    } catch (err) {
      console.error('Edit username error:', err);
      alert('Error changing username');
    }
  });
}