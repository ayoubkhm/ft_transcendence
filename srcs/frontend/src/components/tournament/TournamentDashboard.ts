// TournamentDashboard: handles listing, creating, and managing tournaments
import show_brackets from '../../brackets/show_brackets.js';

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
          for (const t of tournaments) {
            const row = document.createElement('tr');

            // Sanitize and create cells
            const idCell = document.createElement('td');
            idCell.className = 'px-4 py-2';
            idCell.textContent = t.id;
            row.appendChild(idCell);

            const nameCell = document.createElement('td');
            nameCell.className = 'px-4 py-2';
            nameCell.textContent = t.name;
            row.appendChild(nameCell);

            const ownerCell = document.createElement('td');
            ownerCell.className = 'px-4 py-2';
            ownerCell.textContent = 'Loading...';
            row.appendChild(ownerCell);

            // Fetch owner name
            try {
              const userRes = await fetch(`/api/user/search/${t.owner_id}`, { credentials: 'include' });
              if (userRes.ok) {
                const userData = await userRes.json();
                ownerCell.textContent = userData.profile.name;
              } else {
                ownerCell.textContent = 'Unknown';
              }
            } catch (err) {
              ownerCell.textContent = 'Unknown';
            }

            const stateCell = document.createElement('td');
            stateCell.className = 'px-4 py-2';
            stateCell.textContent = t.state;
            row.appendChild(stateCell);

            const playersCell = document.createElement('td');
            playersCell.className = 'px-4 py-2';
            playersCell.textContent = `${t.nbr_players}/${t.max_players}`;
            row.appendChild(playersCell);

            const winnerCell = document.createElement('td');
            winnerCell.className = 'px-4 py-2';
            winnerCell.textContent = 'N/A'; // Placeholder
            row.appendChild(winnerCell);

            const actionsCell = document.createElement('td');
            actionsCell.className = 'px-4 py-2';

            const currentUserId = localStorage.getItem('userId');
            if (currentUserId && parseInt(currentUserId, 10) === t.owner_id) {
                const startBtn = document.createElement('button');
                startBtn.className = 'bg-green-500 text-white px-2 py-1 rounded mr-2';
                startBtn.textContent = 'Start';
                startBtn.addEventListener('click', async () => {
                    try {
                        const res = await fetch(`/api/tournament/${t.name}/start`, {
                            method: 'POST',
                            credentials: 'include',
                        });
                        if (res.ok) {
                            alert('Tournament started successfully');
                            playTournBtn!.click();
                        } else {
                            const err = await res.json().catch(() => ({}));
                            alert('Failed to start tournament: ' + (err.error || err.msg || res.statusText));
                        }
                    } catch (err) {
                        console.error('Error starting tournament:', err);
                        alert('Failed to start tournament.');
                    }
                });
                actionsCell.appendChild(startBtn);
            }
            
            const joinBtn = document.createElement('button');
            joinBtn.className = 'bg-blue-500 text-white px-2 py-1 rounded mr-2';
            joinBtn.textContent = 'Join';
            joinBtn.dataset.tournamentId = t.id;
            actionsCell.appendChild(joinBtn);

            const spectateBtn = document.createElement('button');
            spectateBtn.className = 'bg-gray-500 text-white px-2 py-1 rounded';
            spectateBtn.dataset.id = t.id;
            spectateBtn.textContent = 'Spectate';
            actionsCell.appendChild(spectateBtn);

            const bracketsBtn = document.createElement('button');
            bracketsBtn.className = 'bg-gray-500 text-white px-2 py-1 rounded';
            bracketsBtn.dataset.bracketsId = t.id;
            bracketsBtn.textContent = 'Brackets';
            actionsCell.appendChild(bracketsBtn);

            row.appendChild(actionsCell);
            tournamentTableBody.appendChild(row);
          }

          // Add event listeners for join buttons
          const joinButtons = tournamentTableBody.querySelectorAll('[data-tournament-id]');
          joinButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
              const tournamentId = (e.target as HTMLElement).dataset.tournamentId;
              const email = localStorage.getItem('userEmail');
              if (!email) {
                alert('Please log in to join a tournament');
                return;
              }
              let userId: number;
              try {
                const lookupRes = await fetch(`/api/user/lookup/${encodeURIComponent(email)}`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                });
                if (!lookupRes.ok) {
                  const err = await lookupRes.json().catch(() => ({}));
                  alert('Failed to identify user: ' + (err.error || err.msg || lookupRes.statusText));
                  return;
                }
                const userData = await lookupRes.json();
                userId = userData.id;
              } catch (err) {
                console.error('Error looking up user:', err);
                alert('Error identifying user');
                return;
              }

              try {
                const res = await fetch(`/api/tournament/${tournamentId}/join`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: userId }),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  alert('Failed to join tournament: ' + (err.error || err.msg || res.statusText));
                  return;
                }
                alert('Successfully joined tournament');
                // Refresh the tournament list
                const playTournBtn = document.getElementById('play-tourn-btn') as HTMLButtonElement | null;
                playTournBtn!.click();
              } catch (err) {
                console.error('Error joining tournament:', err);
                alert('Failed to join tournament.');
              }
            });
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

          const bracketsButtons = tournamentTableBody.querySelectorAll('[data-brackets-id]');
          bracketsButtons.forEach(button => {
            button.addEventListener('click', async (e) =>
            {
              const tournamentId = Number((e.target as HTMLElement).dataset.bracketsId);;
              if (!tournamentId)
              {
                alert('Failed to load tournament id.');
                return ;
              }
              show_brackets(tournamentId!);
              
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
      navigate('tournament');
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
