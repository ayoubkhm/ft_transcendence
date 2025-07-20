import { connect as connectWebSocket, on, getTournamentDetails } from './lib/socket';
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
import { setupEditUsernameModal } from './components/profile/EditUsernameModal';
import { setupEditEmailModal } from './components/profile/EditEmailModal';
import setupTournamentBrackets from './brackets/setup';
import setupUserStats from './stats/setup'
import show_stats from './stats/show_stats';
import { showTournamentLobby } from './components/tournament/TournamentLobby';
import { showTournamentGame } from './components/tournament/TournamentGame';

async function main() {
    // First, check for an active tournament game
    const activeTournamentGame = localStorage.getItem('activeTournamentGame');
    console.log('[Tournament Redirection] Page loaded. Active game flag:', activeTournamentGame);

    if (activeTournamentGame) {
        const { id } = JSON.parse(activeTournamentGame);
        console.log(`[Tournament Redirection] Found active tournament ID: ${id}. Verifying with server...`);
        
        try {
            // Establish WebSocket connection and wait for it to be open
            await connectWebSocket();
            console.log('[Tournament Redirection] WebSocket connection established.');

            // Set up one-time listeners for the server's response
        const unregisterUpdate = on('tournament-update', (details) => {
            unregisterUpdate();
            unregisterDeleted();
            console.log('[Tournament Redirection] Received tournament-update from server:', details);

            if (details && details.id === id && details.state === 'RUNNING') {
                console.log('[Tournament Redirection] Verification successful. Tournament is RUNNING. Showing game view.');
                showTournamentGame(details);
            } else {
                console.log('[Tournament Redirection] Verification failed. Tournament is not running or invalid. Clearing flag and loading normally.');
                localStorage.removeItem('activeTournamentGame');
                initializeApp();
            }
        });

        const unregisterDeleted = on('tournament-deleted', (data) => {
            unregisterUpdate();
            unregisterDeleted();
            console.log('[Tournament Redirection] Received tournament-deleted from server:', data);

            if (data && data.tournament_id === id) {
                console.log('[Tournament Redirection] Stale tournament ID confirmed. Clearing flag and loading normally.');
                localStorage.removeItem('activeTournamentGame');
                initializeApp();
            }
        });

        // Request the tournament details to verify the state
        console.log(`[Tournament Redirection] Sending get_tournament_details request for ID: ${id}`);
        getTournamentDetails(id);

        } catch (error) {
            console.error('[Tournament Redirection] WebSocket connection failed. Clearing flag and loading normally.', error);
            localStorage.removeItem('activeTournamentGame');
            initializeApp();
        }
    } else {
        // If there's no active tournament game, initialize the app normally
        console.log('[Tournament Redirection] No active game flag found. Initializing app normally.');
        initializeApp();
    }
}

function initializeApp() {
    const activeTournamentSession = localStorage.getItem('activeTournamentSession');
    if (activeTournamentSession) {
        const { tournamentId, tournamentName } = JSON.parse(activeTournamentSession);
        showTournamentLobby(tournamentId, tournamentName);
    }
    // Set up all UI components and their event listeners first
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
    setupEditUsernameModal();
    setupEditEmailModal();
    setupTournamentBrackets();
    setupUserStats();

    // Establish WebSocket connection only after everything is set up
    if (!localStorage.getItem('activeTournamentGame')) {
        connectWebSocket();
    }
}

document.addEventListener('DOMContentLoaded', main);

// Initialize 2FA setup and login handlers
setupTwoFASetup();
const { show2faLogin } = setupTwoFALogin();

setupTwoFALogin();

// window.addEventListener("load", () => {
//     show_stats(1);
// });
