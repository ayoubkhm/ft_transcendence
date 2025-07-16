
import { setupTwoFALogin } from '../twofa/TwoFASetup';
import { updateFriendsBadge } from '../friends/FriendsModal';

const { show2faLogin } = setupTwoFALogin();

// Setup auth view toggles
const authUser = document.getElementById('auth-user') as HTMLElement | null;
const authGuest = document.getElementById('auth-guest') as HTMLElement | null;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement | null;
const userGreeting = document.getElementById('user-greeting') as HTMLElement | null;

// Update auth UI based on login state
export function updateAuthView() {
    if (!authUser || !authGuest || !userGreeting) return;
    const loggedIn = localStorage.getItem('loggedIn') === 'true';
    if (loggedIn) {
        authUser.classList.remove('hidden');
        authGuest.classList.add('hidden');
        userGreeting.textContent = localStorage.getItem('username') || 'Player';
    } else {
        authUser.classList.add('hidden');
        authGuest.classList.remove('hidden');
    }
}

// Initialize authentication state, or trigger 2FA when required
export async function initializeAuth() {
    try {
        const res = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            // Authenticated: set flags
            localStorage.setItem('loggedIn', 'true');
            if (data.name) localStorage.setItem('username', data.name);
            // Store email for profile lookup
            if (data.email) localStorage.setItem('userEmail', data.email);
            // twofaEnabled: server indicates 2FA status
            localStorage.setItem('twofaEnabled', data.twofaEnabled === true ? 'true' : 'false');
        } else {
            // Not authenticated or 2FA required
            if (res.status === 403 && data.error === 'Two-factor authentication required') {
                show2faLogin();
            }
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('twofaEnabled');
        }
    } catch (err) {
        console.error('Auth status check failed', err);
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('twofaEnabled');
    }
    updateAuthView();
    // Fetch public profile for greeting
    if (localStorage.getItem('loggedIn') === 'true') {
        const email = localStorage.getItem('userEmail');
        if (email) {
            try {
                const res = await fetch(`/api/user/search/${encodeURIComponent(email)}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json() as { success: boolean; msg: string; profile: { name: string; tag: number; } | null };
                    if (data.success && data.profile) {
                        if(userGreeting) userGreeting.textContent = `${data.profile.name}`;
                    }
                }
            } catch (err) {
                console.error('Greeting profile fetch failed:', err);
            }
        }
    }
    // Initialize authentication and then update friends badge
    updateFriendsBadge().catch(console.error);
}

// Logout handler: call server to clear cookie, then update UI
if(logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/auth/logout', {
                method: 'DELETE',
                credentials: 'include',
            });
        } catch (err) {
            console.error('Logout request failed', err);
        }
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('username');
        // Clear stored email for profile lookup
        localStorage.removeItem('userEmail');
        // Clear stored authentication method
        localStorage.removeItem('authMethod');
        updateAuthView();
    });
}
