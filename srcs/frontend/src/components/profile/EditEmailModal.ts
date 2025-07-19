import { navigate, onRoute, getCurrentRoute } from '../../lib/router';

export function setupEditEmailModal(): void {
  const editEmailModal = document.getElementById('edit-email-modal') as HTMLElement | null;
  const editEmailClose = document.getElementById('edit-email-close') as HTMLButtonElement | null;
  const editEmailForm = document.getElementById('edit-email-form') as HTMLFormElement | null;
  const newEmailInput = document.getElementById('new-email') as HTMLInputElement | null;
  const profileEditEmailBtn = document.getElementById('profile-edit-email-btn') as HTMLButtonElement | null;
  const profileModal = document.getElementById('profile-modal') as HTMLElement | null;

  if (!editEmailModal || !editEmailClose || !editEmailForm || !newEmailInput || !profileEditEmailBtn) {
    console.error('Missing edit-email modal elements');
    return;
  }

  // --- OPEN ---
  profileEditEmailBtn.addEventListener('click', () => {
    navigate('edit-email');
  });

  // --- ROUTE HANDLERS ---
  onRoute('edit-email', () => {
    profileModal?.classList.add('hidden');
    editEmailModal.classList.remove('hidden');
  });

  onRoute('profile', () => {
    editEmailModal.classList.add('hidden');
    profileModal?.classList.remove('hidden');
  });

  // --- LOGICAL CLOSE ---
  const closeModal = () => {
    if (getCurrentRoute && getCurrentRoute() === 'edit-email') {
      history.back();
    } else {
      editEmailModal.classList.add('hidden');
    }
  };

  editEmailClose.addEventListener('click', closeModal);

  editEmailModal.addEventListener('click', (e) => {
    if (e.target === editEmailModal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !editEmailModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // --- FORM SUBMIT ---
  editEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEmail = newEmailInput.value.trim();
    if (!newEmail) {
      alert('Email is required');
      return;
    }

    try {
      const email = localStorage.getItem('email');
      const res = await fetch(`/api/user/edit/${email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: 'email', email: newEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Email changed successfully');
        closeModal();
      } else {
        alert(data.error || 'Failed to change email');
      }
    } catch (err) {
      console.error('Edit email error:', err);
      alert('Error changing email');
    }
  });
}