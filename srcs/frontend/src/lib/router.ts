import { getTournamentDetails, on } from './socket.js';
import { showTournamentGame, isTournamentActive } from '../components/tournament/TournamentGame.js';
import { isTournamentLobbyActive, leaveTournamentLobby } from '../components/tournament/TournamentLobby.js';
import { loadProfileData } from '../components/profile/ProfileModal.js';
export type View = '*' | 'home' | 'login' | 'game' | 'tournament' | 'friends' | 'profile' | 'play-ai' | 'play-pvp' | 'change-password' | 'publicProfile' | 'signup' | 'setup-2fa' | 'local-game' | 'login-2fa' | 'edit-username' | 'edit-email' | 'stats';

type RouteHandler = (params?: any) => void;

const routes: Record<View, RouteHandler[]> = {
  '*': [],
  home: [],
  login: [],
  game: [],
  tournament: [],
  friends: [],
  profile: [],
  'play-ai': [],
  'play-pvp': [],
  'change-password': [],
  publicProfile: [],
  signup: [],
  'setup-2fa': [],
  'local-game': [],
  'login-2fa': [],
  'edit-username': [],
  'edit-email': [],
  stats: [],
};

export function getCurrentRoute(): View {
    const hash = window.location.hash.slice(1);
    const [view] = hash.split('/');
    return view as View || 'home';
}

onRoute('play-ai', () => {
    const aiModal = document.getElementById('ai-modal');
    if (aiModal) aiModal.classList.remove('hidden');
});

onRoute('play-pvp', () => {
    const pvpModal = document.getElementById('pvp-modal');
    if (pvpModal) pvpModal.classList.remove('hidden');
});

onRoute('home', () => {
    const aiModal = document.getElementById('ai-modal');
    if (aiModal) aiModal.classList.add('hidden');
    const pvpModal = document.getElementById('pvp-modal');
    if (pvpModal) pvpModal.classList.add('hidden');
    const changePasswordModal = document.getElementById('change-password-modal');
    if (changePasswordModal) changePasswordModal.classList.add('hidden');
    const editUsernameModal = document.getElementById('edit-username-modal');
    if (editUsernameModal) editUsernameModal.classList.add('hidden');
    const editEmailModal = document.getElementById('edit-email-modal');
    if (editEmailModal) editEmailModal.classList.add('hidden');
    const publicProfileModal = document.getElementById('public-profile-modal');
    if (publicProfileModal) publicProfileModal.classList.add('hidden');
    const tournamentModal = document.getElementById('tournament-modal');
    if (tournamentModal) tournamentModal.classList.add('hidden');
    const statsPopup = document.getElementById('stats-popup');
    if (statsPopup) statsPopup.classList.add('hidden');
});

onRoute('stats', () => {
    const statsPopup = document.getElementById('stats-popup');
    if (statsPopup) statsPopup.classList.remove('hidden');
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) profileModal.classList.add('hidden');
});

onRoute('profile', () => {
  const profileModal = document.getElementById('profile-modal');
  if (profileModal) {
    profileModal.classList.remove('hidden');
  }
  const statsPopup = document.getElementById('stats-popup');
  if (statsPopup) {
    statsPopup.classList.add('hidden');
  }
});

onRoute('tournament', (params) => {
    if (params && params.id) {
        const tournamentId = parseInt(params.id, 10);

        // Set up a one-time listener to wait for the tournament details.
        const unsubscribe = on('tournament-update', (details) => {
            // Ensure this is the correct tournament and it's running.
            if (details && details.id === tournamentId && details.state === 'RUNNING') {
                // Unsubscribe immediately after receiving the data.
                unsubscribe();
                // Now, show the game view with the data we just received.
                showTournamentGame(details);
            }
        });

        // Request the tournament details from the server.
        getTournamentDetails(tournamentId);
    }
});

export function onRoute(view: View, handler: RouteHandler) {
  routes[view].push(handler);
}

export function navigate(view: View, params?: any) {
  const url = params && params.id ? `#${view}/${params.id}` : `#${view}`;
  history.pushState({ view, params }, '', url);
  dispatch(view, params);
}

function dispatch(view: View, params?: any) {
  // First, run the specific handlers for the view
  const handlers = routes[view] || [];
  handlers.forEach((h) => h(params));
  // Then, run all wildcard handlers
  const wildcardHandlers = routes['*'] || [];
  wildcardHandlers.forEach((h) => h(view)); // Pass the view name to the wildcard handler
}

window.addEventListener('popstate', (e) => {
  if (isTournamentActive()) {
    history.forward();
    alert("YOU DECIDED TO PLAY A TOURNAMENT, YOU CANNOT NAVIGATE AWAY. CHEH");
    return;
  }
  if (isTournamentLobbyActive()) {
    // The leaveTournamentLobby function now contains the confirm dialog.
    // It returns true if the user confirms, false otherwise.
    if (leaveTournamentLobby()) {
      const state = e.state as { view: View; params?: any } | null;
      if (state) dispatch(state.view, state.params);
    } else {
      // If the user clicks "Cancel", prevent navigation.
      history.forward();
    }
    return;
  }
  const state = e.state as { view: View; params?: any } | null;
  if (state) dispatch(state.view, state.params);
});

// Handle initial page load
document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    navigate('home');
    return;
  }
  const [view, id] = hash.split('/');
  if (view === 'profile') {
    loadProfileData();
  }
  const params = id ? { id } : undefined;
  dispatch(view as View, params);
});
