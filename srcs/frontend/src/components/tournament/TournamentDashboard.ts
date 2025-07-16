// TournamentDashboard: handles listing, creating, and managing tournaments
import { navigate, onRoute } from '../../lib/router';
export function setupTournamentDashboard() {
  const tournamentModal = document.getElementById('tournament-modal') as HTMLElement | null;
  const tournamentModalClose = document.getElementById('tournament-modal-close') as HTMLButtonElement | null;
  const tournamentTableBody = document.getElementById('tournament-table-body') as HTMLTableSectionElement | null;
  // Close handlers for tournament modal
  const closeModal = () => {
    if (tournamentModal) {
      tournamentModal.classList.add('hidden');
    }
    navigate('home');
  };

  if (tournamentModal && tournamentModalClose) {
    tournamentModalClose.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    tournamentModal.addEventListener('click', (e) => {
      if (e.target === tournamentModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !tournamentModal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  // Hide modal if we navigate away
  onRoute('home', () => {
    if (tournamentModal && !tournamentModal.classList.contains('hidden')) {
      tournamentModal.classList.add('hidden');
    }
  });
    const playTournBtn = document.getElementById('play-tourn-btn') as HTMLButtonElement | null;
  if (playTournBtn && tournamentModal) {
    playTournBtn.addEventListener('click', async () => {
      // Fetch and display tournaments
      try {
        const res = await fetch('/api/tournaments/tournaments', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch tournaments');
        const tournaments = await res.json();
        if (tournamentTableBody) {
          tournamentTableBody.innerHTML = ''; // Clear existing rows
          tournaments.forEach((t: any) => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td class="px-4 py-2">${t.id}</td>
              <td class="px-4 py-2">${t.name}</td>
              <td class="px-4 py-2">${t.state}</td>
              <td class="px-4 py-2">${t.nbr_players}/${t.max_players}</td>
              <td class="px-4 py-2">N/A</td>
              <td class="px-4 py-2">
                <button class="bg-blue-500 text-white px-2 py-1 rounded mr-2">Join</button>
                <button class="bg-gray-500 text-white px-2 py-1 rounded" data-id="${t.id}">Spectate</button>
              </td>
            `;
            tournamentTableBody.appendChild(row);
          });

          // Add event listeners for spectate buttons
          const spectateButtons = tournamentTableBody.querySelectorAll('[data-id]');
          spectateButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
              const tournamentId = (e.target as HTMLElement).dataset.id;
              try {
                const res = await fetch(`/api/tournaments/tournaments/${tournamentId}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch tournament details');
                const tournament = await res.json();
                console.log('Spectating tournament:', tournament);
                // You can now use the tournament data to display the details
              } catch (err) {
                console.error('Error fetching tournament details:', err);
                alert('Failed to load tournament details.');
              }
            });
          });
        }
      } catch (err) {
        console.error('Error fetching tournaments:', err);
        if (tournamentTableBody) {
          tournamentTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500">Failed to load tournaments.</td></tr>';
        }
      }
      // Show the modal
      tournamentModal.classList.remove('hidden');
      history.pushState({ view: 'tournament' }, '', '#tournament');
    });
  }

  // Create Tournament button handler
    const tournamentCreateBtn = document.getElementById('tournament-create-btn') as HTMLButtonElement | null;
    if (tournamentCreateBtn) {
      tournamentCreateBtn.addEventListener('click', async () => {
        const name = prompt('Enter tournament name:');
        if (!name) return;
        // Identify current user by email lookup to get owner_id
        const email = localStorage.getItem('userEmail');
        if (!email) {
          alert('Please log in to create a tournament');
          return;
        }
        let ownerId: number;
        try {
          const lookupRes = await fetch(
            `/api/user/lookup/${encodeURIComponent(email)}`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            }
          );
          if (!lookupRes.ok) {
            const err = await lookupRes.json().catch(() => ({}));
            alert('Failed to identify user: ' + (err.error || err.msg || lookupRes.statusText));
            return;
          }
          const userData = await lookupRes.json();
          ownerId = userData.id;
        } catch (err) {
          console.error('Error looking up user:', err);
          alert('Error identifying user');
          return;
        }
        // Create the tournament with name and owner_id
        try {
          const res = await fetch('/api/tournament', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, owner_id: ownerId }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert('Failed to create tournament: ' + (err.error || err.msg || res.statusText));
            return;
          }
          alert('Tournament created successfully');
          // Refresh the tournament list
        const playTournBtn  = document.getElementById('play-tourn-btn') as HTMLButtonElement | null;
          playTournBtn!.click();
        } catch (error) {
          console.error('Error creating tournament:', error);
          alert('Error creating tournament');
        }
      });
    }
}
