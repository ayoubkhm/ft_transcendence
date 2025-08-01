// FriendsModal: handles displaying friends list and friend requests
import { show, hide } from '../../lib/dom';
import { fetchJSON } from '../../lib/api';
import { showPublicProfile } from '../profile/PublicProfileModal';
import { navigate, onRoute } from '../../lib/router';

export function setupFriendsModal() {
  const friendsBtn = document.getElementById('friends-btn') as HTMLButtonElement | null;
  const friendsModal = document.getElementById('friends-modal') as HTMLElement | null;
  const friendsModalClose = document.getElementById('friends-modal-close') as HTMLButtonElement | null;
  const friendsList = document.getElementById('friends-list') as HTMLUListElement | null;
  const friendRequestsList = document.getElementById('friend-requests-list') as HTMLUListElement | null;
  const friendsBadge = document.getElementById('friends-badge') as HTMLElement | null;

  if (!friendsBtn || !friendsModal || !friendsModalClose || !friendsList || !friendRequestsList || !friendsBadge) {
    return;
  }

  // Open and load the Friends modal
  async function openFriends() {
    friendsList.innerHTML = '';
    friendRequestsList.innerHTML = '';
    try {
      // Load friends list
      const friends = await fetchJSON<{ id: number; name: string, status: 'online' | 'offline' }[]>('/api/user/friends', { credentials: 'include' });
      friends.forEach((f) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between px-2 py-1 bg-gray-700 rounded cursor-pointer';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = f.name;

        const statusIndicator = document.createElement('span');
        statusIndicator.className = `w-3 h-3 rounded-full ${f.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`;
        
        const container = document.createElement('div');
        container.className = 'flex items-center gap-2';
        container.appendChild(statusIndicator);
        container.appendChild(nameSpan);

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'px-2 py-1 bg-red-500 rounded text-white text-sm';
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const res = await fetch(`/api/user/friends/${f.id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (res.ok) {
                    li.remove();
                } else {
                    const resp = await res.json();
                    alert(resp.error || 'Failed to remove friend');
                }
            } catch (err) {
                console.error(err);
                alert('Error removing friend');
            }
        });

        li.appendChild(container);
        li.appendChild(removeBtn);
        // Click to view friend profile
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            navigate('publicProfile', { id: f.id });
        });
        friendsList.appendChild(li);
      });
      // Load friend requests
      const requests = await fetchJSON<{ id: number; name: string }[]>('/api/user/receivedFriendRequests', { credentials: 'include' });
      requests.forEach((r) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between px-2 py-1 bg-gray-700 rounded';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = r.name;
        nameSpan.className = 'cursor-pointer';
        nameSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            navigate('publicProfile', { id: r.id });
        });
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.className = 'px-2 py-1 bg-green-500 rounded text-white text-sm';
        acceptBtn.addEventListener('click', async () => {
          try {
            const res = await fetch(`/api/user/friends/requests/${r.id}`, {
              method: 'PUT', credentials: 'include'
            });
            const resp = await res.json();
            if (res.ok && resp.success) {
              openFriends();
            } else {
              alert(resp.error || resp.msg || 'Failed to accept friend request');
            }
          } catch (err) {
            console.error(err);
            alert('Error accepting request');
          }
        });
        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = 'Reject';
        rejectBtn.className = 'px-2 py-1 bg-red-500 rounded text-white text-sm';
        rejectBtn.addEventListener('click', async () => {
          try {
            const res = await fetch(`/api/user/friends/requests/${r.id}`, {
              method: 'DELETE', credentials: 'include'
            });
            const resp = await res.json();
            if (res.ok && resp.success) { li.remove(); updateFriendsBadge(); }
            else alert(resp.error || resp.msg || 'Failed to reject friend request');
          } catch (err) { console.error(err); alert('Error rejecting request'); }
        });
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'flex gap-2'; actionsDiv.append(acceptBtn, rejectBtn);
        li.append(nameSpan, actionsDiv);
        friendRequestsList.appendChild(li);
      });
      // Update badge
      updateFriendsBadge();
    } catch (err) {
      console.error('Error loading friends data', err);
    }
  }

  friendsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('friends');
  });

  onRoute('friends', () => {
    openFriends();
    if (friendsModal) {
      show(friendsModal);
    }
  });

  friendsModalClose.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('home');
  });
  // Close on backdrop click
  friendsModal.addEventListener('click', (e) => {
    if (e.target === friendsModal) {
      navigate('home');
    }
  });
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !friendsModal.classList.contains('hidden')) {
      navigate('home');
    }
  });

  // Hide modal on home navigation
  onRoute('home', () => {
    if (friendsModal && !friendsModal.classList.contains('hidden')) {
      hide(friendsModal);
    }
  });
}

// Update the notification badge for incoming friend requests
export async function updateFriendsBadge() {
  const friendsBadge = document.getElementById('friends-badge') as HTMLElement | null;
  if (!friendsBadge) return;
  try {
    const data = await fetchJSON<{ id: number; name: string }[]>(
      '/api/user/receivedFriendRequests',
      { credentials: 'include' }
    );
    const count = data.length;
    if (count > 0) {
      friendsBadge.textContent = count.toString();
      friendsBadge.classList.remove('hidden');
    } else {
      friendsBadge.classList.add('hidden');
    }
  } catch (err) {
    console.error('Failed to update friends badge', err);
  }
}
