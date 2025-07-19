// PublicProfileModal: handles displaying a user's public profile
import { fetchJSON } from '../../lib/api';
import { navigate, onRoute, getCurrentRoute } from '../../lib/router';

// Elements
const publicProfileModal = document.getElementById('public-profile-modal') as HTMLElement | null;
const publicProfileClose = document.getElementById('public-profile-close') as HTMLButtonElement | null;
const publicProfileName = document.getElementById('public-profile-name') as HTMLElement | null;
const publicProfileEmail = document.getElementById('public-profile-email') as HTMLElement | null;
const publicProfileAvatar = document.getElementById('public-profile-avatar') as HTMLImageElement | null;
const publicProfileAddBtn = document.getElementById('public-profile-add-btn') as HTMLButtonElement | null;

let currentProfileId: number | null = null;

/**
 * Sets up the event listeners for the public profile modal itself.
 */
export function setupPublicProfileModal() {
    if (!publicProfileModal || !publicProfileClose || !publicProfileAddBtn) {
        return;
    }

    onRoute('publicProfile', async (params) => {
        if (!params || !params.id) return;
        const userId = parseInt(params.id, 10);

        if (!publicProfileModal || !publicProfileName || !publicProfileEmail || !publicProfileAvatar || !publicProfileAddBtn) {
            console.error('Public profile modal elements not found');
            return;
        }

        try {
            const data = await fetchJSON<{ success: boolean; msg: string; profile: any }>(`/api/user/search/${userId}`, { credentials: 'include' });

            if (!data.success || !data.profile) {
                alert(data.msg || 'User not found');
                return;
            }

            const user = data.profile;
            currentProfileId = user.id;

            // Populate and show the modal
            publicProfileName.textContent = '';
            const nameNode = document.createTextNode(user.name);
            publicProfileName.appendChild(nameNode);
            const tagSpan = document.createElement('span');
            tagSpan.className = 'text-gray-400 text-sm ml-1';
            tagSpan.textContent = `#${user.tag}`;
            publicProfileName.appendChild(tagSpan);

            publicProfileEmail.textContent = user.email;

            if (user.avatar) {
                publicProfileAvatar.src = user.avatar;
                publicProfileAvatar.classList.remove('hidden');
            } else {
                publicProfileAvatar.classList.add('hidden');
            }

            // Check friendship status
            const res = await fetchJSON<{ status: string }>(`/api/user/friends/status/${user.id}`, { credentials: 'include' });
            if (res.status === 'friends') {
                publicProfileAddBtn.textContent = 'Friends';
                publicProfileAddBtn.disabled = false;
            } else if (res.status === 'pending_sent') {
                publicProfileAddBtn.textContent = 'Cancel Request';
                publicProfileAddBtn.disabled = false;
            } else {
                publicProfileAddBtn.textContent = 'Add Friend';
                publicProfileAddBtn.disabled = false;
            }

            // Hide add friend button for guests or if viewing own profile
            const currentUserId = localStorage.getItem('userId');
            if (!localStorage.getItem('userEmail') || (currentUserId && parseInt(currentUserId, 10) === user.id)) {
                publicProfileAddBtn.classList.add('hidden');
            } else {
                publicProfileAddBtn.classList.remove('hidden');
            }

            document.getElementById('friends-modal')?.classList.add('hidden');
            publicProfileModal.classList.remove('hidden');

        } catch (err) {
            console.error('Fetch public profile failed:', err);
            alert('Failed to load user profile');
        }
    });

    const closeModal = () => {
        if (getCurrentRoute && getCurrentRoute().startsWith('publicProfile')) {
            history.back();
        } else {
            if (publicProfileModal) {
                publicProfileModal.classList.add('hidden');
            }
        }
    };

    // Close handlers
    publicProfileClose.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
    });

    publicProfileModal.addEventListener('click', (e) => {
        if (e.target === publicProfileModal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !publicProfileModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Hide modal if we navigate away
    onRoute('home', () => {
        if (publicProfileModal && !publicProfileModal.classList.contains('hidden')) {
            publicProfileModal.classList.add('hidden');
        }
    });
     onRoute('friends', () => {
        if (publicProfileModal && !publicProfileModal.classList.contains('hidden')) {
            publicProfileModal.classList.add('hidden');
        }
    });

    // Add Friend button handler
    publicProfileAddBtn.addEventListener('click', async () => {
        if (!currentProfileId) return;

        const action = publicProfileAddBtn.textContent;

        if (action === 'Add Friend') {
            try {
                const data = await fetchJSON<{success: boolean, error?: string, msg?: string}>(`/api/user/friends/requests/${currentProfileId}`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (data.success) {
                    publicProfileAddBtn.textContent = 'Cancel Request';
                } else {
                    alert(data.error || data.msg || 'Failed to send friend request');
                }
            } catch (err) {
                console.error('Send friend request error:', err);
                alert('Error sending friend request');
            }
        } else if (action === 'Cancel Request') {
            try {
                const data = await fetchJSON<{success: boolean, error?: string, msg?: string}>(`/api/user/friends/requests/${currentProfileId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (data.success) {
                    publicProfileAddBtn.textContent = 'Add Friend';
                } else {
                    alert(data.error || data.msg || 'Failed to cancel friend request');
                }
            } catch (err) {
                console.error('Cancel friend request error:', err);
                alert('Error canceling friend request');
            }
        } else if (action === 'Friends') {
            closeModal();
            navigate('friends');
        }
    });
}