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
import setupTournamentBrackets from './brackets/setup.js'

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
    setupTournamentBrackets();
});

// Initialize 2FA setup and login handlers
setupTwoFASetup();
const { show2faLogin } = setupTwoFALogin();






