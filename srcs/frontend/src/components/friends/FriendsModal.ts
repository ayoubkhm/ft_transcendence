// FriendsModal: handles displaying friends list and friend requests
import { show, hide } from '../../lib/dom';
import { fetchJSON } from '../../lib/api';

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

  friendsBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    friendsList.innerHTML = '';
    friendRequestsList.innerHTML = '';
    try {
      const friends = await fetchJSON<{ id: number; name: string }[]>('/api/user/friends', { credentials: 'include' });
      friends.forEach((f) => {
        const li = document.createElement('li');
        li.textContent = f.name;
        li.className = 'px-2 py-1 bg-gray-700 rounded cursor-pointer';
        friendsList.appendChild(li);
      });
      const requests = await fetchJSON<{ id: number; name: string }[]>('/api/user/receivedFriendRequests', { credentials: 'include' });
      requests.forEach((r) => {
        const li = document.createElement('li');
        li.textContent = r.name;
        li.className = 'px-2 py-1 bg-gray-700 rounded cursor-pointer';
        friendRequestsList.appendChild(li);
      });
      show(friendsModal);
      // Update badge count
      const count = requests.length;
      if (count > 0) {
        friendsBadge.textContent = count.toString();
        show(friendsBadge);
      } else {
        hide(friendsBadge);
      }
    } catch (err) {
      console.error('Error loading friends data', err);
    }
  });

  friendsModalClose.addEventListener('click', (e) => {
    e.preventDefault();
    hide(friendsModal);
  });
}