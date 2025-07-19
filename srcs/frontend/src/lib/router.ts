// Simple SPA router based on history API and hash
import { isTournamentActive } from '../components/tournament/TournamentGame.js';
import { isTournamentLobbyActive, leaveTournamentLobby } from '../components/tournament/TournamentLobby.js';
export type View = '*' | 'home' | 'login' | 'game' | 'tournament' | 'friends' | 'profile' | 'play-ai' | 'play-pvp' | 'change-password' | 'publicProfile' | 'signup' | 'setup-2fa' | 'local-game' | 'login-2fa' | 'edit-username' | 'edit-email';

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
    const userWantsToLeave = confirm("Are you sure you want to leave the tournament lobby?");
    if (userWantsToLeave) {
      leaveTournamentLobby();
      const state = e.state as { view: View; params?: any } | null;
      if (state) dispatch(state.view, state.params);
    } else {
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
  const params = id ? { id } : undefined;
  dispatch(view as View, params);
});
