// TournamentDashboard: handles listing, creating, and managing tournaments
import { on, joinTournament, createTournament } from '../../lib/socket';
import { loginAsGuest, getCurrentUserId } from '../auth/Auth';
import { navigate, onRoute } from '../../lib/router';
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
    
    const joinBtn = document.createElement('button');
    joinBtn.className = 'bg-blue-500 text-white px-2 py-1 rounded mr-2 join-btn';
    joinBtn.textContent = 'Join';
    actionsCell.appendChild(joinBtn);

    const spectateBtn = document.createElement('button');
    spectateBtn.className = 'bg-gray-500 text-white px-2 py-1 rounded spectate-btn';
    spectateBtn.textContent = 'Spectate';
    actionsCell.appendChild(spectateBtn);

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

  // --- Modal Handling ---
  const closeModal = () => {
    if (tournamentModal) tournamentModal.classList.add('hidden');
    navigate('home');
  };

  if (tournamentModal && tournamentModalClose) {
    tournamentModalClose.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    tournamentModal.addEventListener('click', (e) => { if (e.target === tournamentModal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tournamentModal.classList.contains('hidden')) closeModal(); });
  }
  onRoute('home', () => { if (tournamentModal) tournamentModal.classList.add('hidden'); });

  // --- WebSocket Event Handling ---
  on('dashboard-update', (data) => {
    console.log('Received dashboard-update:', data);
    renderTournamentList(data);
  });

  on('tournament-update', (data) => {
    console.log('Received single tournament-update:', data);
    // Find and update the specific tournament in our cached list
    const index = currentTournaments.findIndex(t => t.id === data.id);
    if (index !== -1) {
      currentTournaments[index] = data;
      renderTournamentList(currentTournaments); // Re-render the whole list for simplicity
    }
  });

  // Listen for the specific "created" event to navigate the creator to the lobby
  on('tournament-created', async (data) => {
    if (data && data.id && data.name) {
      const { showTournamentLobby } = await import('./TournamentLobby');
      if (tournamentModal) tournamentModal.classList.add('hidden');
      showTournamentLobby(data.id, data.name);
    }
  });

  // --- Button Event Delegation ---
  if (tournamentTableBody) {
    tournamentTableBody.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const row = target.closest('tr');
      if (!row) return;
      
      const tournamentId = Number(row.dataset.tournamentId);
      const tournament = currentTournaments.find(t => t.id === tournamentId);
      if (!tournament) return;

      // Handle JOIN button clicks
      if (target.classList.contains('join-btn')) {
        const { showTournamentLobby } = await import('./TournamentLobby');
        const userId = await getCurrentUserId();
        if (!userId) {
            console.error("Could not get user ID. Prompting guest login.");
            await loginAsGuest();
            const newUserId = await getCurrentUserId();
            if (!newUserId) {
                alert("Failed to login as guest. Cannot join tournament.");
                return;
            }
            joinTournament(tournamentId, newUserId);
        } else {
            joinTournament(tournamentId, userId);
        }
        if (tournamentModal) tournamentModal.classList.add('hidden');
        showTournamentLobby(tournamentId, tournament.name);
      }

      // Handle SPECTATE button clicks
      if (target.classList.contains('spectate-btn')) {
        const { showTournamentLobby } = await import('./TournamentLobby');
        console.log('Spectating tournament:', tournament);
        // Logic to show tournament details without joining
        showTournamentLobby(tournamentId, tournament.name, true); // Pass a 'spectate' flag
      }

      // Handle BRACKETS button clicks
      if (target.classList.contains('brackets-btn')) {
        await show_brackets(tournamentId);
      }
    });
  }

  // --- Main Button to Show Dashboard ---
  const playTournBtn = document.getElementById('play-tourn-btn') as HTMLButtonElement | null;
  if (playTournBtn && tournamentModal) {
    playTournBtn.addEventListener('click', () => {
      // The dashboard will be populated by the 'dashboard-update' event
      tournamentModal.classList.remove('hidden');
      navigate('tournament');
    });
  }

  // --- Create Tournament Button ---
  const tournamentCreateBtn = document.getElementById('tournament-create-btn') as HTMLButtonElement | null;
  if (tournamentCreateBtn) {
    tournamentCreateBtn.addEventListener('click', async () => {
      const name = prompt('Enter tournament name:');
      if (!name) return;

      const ownerId = await getCurrentUserId();
      if (!ownerId) {
        alert("You must be logged in to create a tournament.");
        return;
      }

      createTournament(name, ownerId);
      // The dashboard will update automatically, and the creator will be navigated to the lobby.
    });
  }
}
