// TournamentDashboard: handles listing, creating, and managing tournaments
import { on, joinTournament, createTournament } from '../../lib/socket';
import { loginAsGuest, getCurrentUserId } from '../auth/Auth';
import { navigate, onRoute, getCurrentRoute } from '../../lib/router';
import show_brackets from '../../brackets/show_brackets';

// Store the last received tournament list
let currentTournaments: any[] = [];

/**
 * Renders the list of tournaments into the table.
 * @param tournaments The array of tournament objects.
 */
async function renderTournamentList(tournaments: any[]) {
  currentTournaments = tournaments; // Cache the latest list
  const tournamentTableBody = document.getElementById('tournament-table-body') as HTMLTableSectionElement | null;
  if (!tournamentTableBody) return;

  tournamentTableBody.innerHTML = ''; // Clear existing rows

  for (const t of tournaments) {
    const row = document.createElement('tr');
    row.dataset.tournamentId = t.id;

    // Cells for ID, Name, State, Players
    row.innerHTML = `
      <td class="px-4 py-2">${t.id}</td>
      <td class="px-4 py-2">${t.name}</td>
      <td class="px-4 py-2">${t.owner_name}</td>
      <td class="px-4 py-2">${t.state}</td>
      <td class="px-4 py-2">${t.nbr_players}/${t.max_players}</td>
      <td class="px-4 py-2">${t.winner_name || ''}</td>
      <td class="px-4 py-2 actions"></td>
    `;
    tournamentTableBody.appendChild(row);

    // Create and append buttons to the actions cell
    const actionsCell = row.querySelector('.actions')!;
    
    // Only show the Join button if the tournament is in the LOBBY state
    if (t.state === 'LOBBY') {
      const joinBtn = document.createElement('button');
      joinBtn.className = 'bg-blue-500 text-white px-2 py-1 rounded mr-2 join-btn';
      joinBtn.textContent = 'Join';
      actionsCell.appendChild(joinBtn);
    }

    const bracketsBtn = document.createElement('button');
    bracketsBtn.className = 'bg-gray-500 text-white px-2 py-1 rounded ml-2 brackets-btn';
    bracketsBtn.textContent = 'Brackets';
    actionsCell.appendChild(bracketsBtn);

    tournamentTableBody.appendChild(row);
  }
}

export function setupTournamentDashboard() {
  const tournamentModal = document.getElementById('tournament-modal') as HTMLElement | null;
  const tournamentModalClose = document.getElementById('tournament-modal-close') as HTMLButtonElement | null;
  const tournamentTableBody = document.getElementById('tournament-table-body') as HTMLTableSectionElement | null;
  const playTournBtn = document.getElementById('play-tourn-btn') as HTMLButtonElement | null;

  if (!tournamentModal || !tournamentModalClose || !tournamentTableBody || !playTournBtn) {
      return;
  }

  // --- ROUTE HANDLING ---
  onRoute('tournament', (params) => {
    // Only show the dashboard modal if we are on the main tournament list view
    if(!params || !params.id) {
      tournamentModal.classList.remove('hidden');
    }
  });

  onRoute('home', () => {
    tournamentModal.classList.add('hidden');
  });

  // --- MODAL HANDLING ---
  const closeModal = () => {
    if (getCurrentRoute && getCurrentRoute() === 'tournament') {
        history.back();
    } else {
        tournamentModal.classList.add('hidden');
    }
  };

  tournamentModalClose.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
  tournamentModal.addEventListener('click', (e) => { if (e.target === tournamentModal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tournamentModal.classList.contains('hidden')) closeModal(); });

  // --- WebSocket Event Handling ---
  on('dashboard-update', (data) => {
    renderTournamentList(data);
  });

  on('tournament-update', (data) => {
    const index = currentTournaments.findIndex(t => t.id === data.id);
    if (index !== -1) {
      currentTournaments[index] = data;
      renderTournamentList(currentTournaments);
    }
  });

  on('tournament-created', async (data) => {
    if (data && data.id && data.name) {
      const { showTournamentLobby } = await import('./TournamentLobby');
      if (tournamentModal) tournamentModal.classList.add('hidden'); // Directly hide the modal
      showTournamentLobby(data.id, data.name);
    }
  });

  // --- Button Event Delegation ---
  tournamentTableBody.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest('tr');
    if (!row) return;
    
    const tournamentId = Number(row.dataset.tournamentId);
    const tournament = currentTournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    if (target.classList.contains('join-btn')) {
      const userId = await getCurrentUserId() || await loginAsGuest().then(getCurrentUserId);
      if (userId) {
        if (tournamentModal) tournamentModal.classList.add('hidden'); // Directly hide the modal
        const { showTournamentLobby } = await import('./TournamentLobby');
        showTournamentLobby(tournamentId, tournament.name);
        joinTournament(tournamentId, userId); // Send join request in the background
      } else {
        alert("Failed to login as guest. Cannot join tournament.");
      }
    }

    if (target.classList.contains('brackets-btn')) {
      await show_brackets(tournamentId);
    }
  });

  // --- Main Button to Show Dashboard ---
  playTournBtn.addEventListener('click', () => {
    navigate('tournament');
  });

  // --- Create Tournament Button ---
  const tournamentCreateBtn = document.getElementById('tournament-create-btn') as HTMLButtonElement | null;
  if (tournamentCreateBtn) {
    tournamentCreateBtn.addEventListener('click', async () => {
      let ownerId = await getCurrentUserId();
      
      // If not logged in, try to log in as a guest
      if (!ownerId) {
        await loginAsGuest();
        ownerId = await getCurrentUserId();
      }

      // If still no ownerId, the guest login failed, so we abort.
      if (!ownerId) {
        alert("Failed to log in as a guest. Cannot create a tournament.");
        return;
      }

      let name = prompt('Enter tournament name (max 20 characters):');
      if (name && name.length > 20) {
        name = prompt('Tournament name is too long. Please enter a name with a maximum of 20 characters:');
      }
      if (!name) return;

      // The 'tournament-created' event will handle closing the modal and showing the lobby
      createTournament(name, ownerId);
    });
  }
}
