import { loadBrackets } from './tournament_brackets';

// TEMPORARY: TODO rm
window.addEventListener('load', () => {
  const hash = location.hash;
  if (hash.startsWith('#brackets/')) {
    const id = hash.split('/')[1];
    loadBrackets(id);
  }
});
(window as any).loadBrackets = loadBrackets;

const bracketsContainer = document.getElementById("brackets-container") as HTMLButtonElement | null;
if (bracketsContainer)
{
	bracketsContainer.addEventListener("click", (e) => {
		if (e.target === bracketsContainer) {
			bracketsContainer.classList.add("hidden");
		}
	});
}


// Initialize feature modules
import './lib/api';
import './lib/dom';
import './lib/router';
import { setupLoginModal } from './components/auth/LoginModal';
import { setupTournamentDashboard } from './components/tournament/TournamentDashboard';
import { setupBracketsView } from './components/tournament/BracketsView';
import { setupFriendsModal } from './components/friends/FriendsModal';
import { setupUserSearch } from './components/search/user-search';
import { setupSignupModal } from './components/auth/SignupModal';
import { setupTwoFASetup, setupTwoFALogin } from './components/twofa/TwoFASetup';
import { setupChangePasswordModal } from './components/auth/ChangePasswordModal';
import { initializeAuth } from './components/auth/Auth';
import { setupGame } from './components/game/GameController';
import { setupProfileModal } from './components/profile/ProfileModal';
import { setupPublicProfileModal } from './components/profile/PublicProfileModal';

document.addEventListener('DOMContentLoaded', () => {
    setupLoginModal();
    setupSignupModal();
    setupChangePasswordModal();
    initializeAuth();
    setupUserSearch();
    setupFriendsModal();
    setupTournamentDashboard();
    setupBracketsView();
    setupGame();
    setupProfileModal();
    setupPublicProfileModal();
});





// Initialize 2FA setup and login handlers
const { open2faSetupModal } = setupTwoFASetup();
const { show2faLogin } = setupTwoFALogin();






