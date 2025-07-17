// TEMPORARY: TODO rm
window.addEventListener('load', () => {
  const hash = location.hash;
  if (hash.startsWith('#brackets/')) {
    const id = hash.split('/')[1];
    loadBrackets(id);
  }
});

const bracketsContainer = document.getElementById('brackets-container') as HTMLElement;


async function loadBrackets(tournamentId: string)
{
    try
    {  
        bracketsContainer.innerHTML = '';
        bracketsContainer.classList.remove('hidden');
        bracketsContainer.innerHTML = '<p>Loading brackets...</p>';
        
        const res = await fetch(`/api/tournaments/brackets/${tournamentId}`);
        if (!res.ok)
        {
            console.error(`[loadBrackets] HTTP ${res.status}`);
            throw new Error(`Server error ${res.status}`);
        }
        let data;
        try { data = await res.json(); }
        catch (err)
        {
            const text = await res.text();
            console.error('[loadBrackets] Invalid JSON:', text);
            throw new Error('Received non-JSON response');
        }


        bracketsContainer.innerHTML = ''; // Clear previous

        const title = document.createElement('h2');
        title.className = 'text-xl font-bold mb-4';
        title.textContent = `Brackets – ${data.tournament}`;
        bracketsContainer.appendChild(title);

        data.rounds.forEach((round: any[], roundIdx: number) =>
        {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'mb-6 p-4 border rounded bg-gray-900';
            
            const roundTitle = document.createElement('h3');
            roundTitle.textContent = `Round ${roundIdx + 1}`;
            roundTitle.className = 'font-semibold mb-2 text-blue-400';
            roundDiv.appendChild(roundTitle);

            round.forEach((match: any) =>
            {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'flex justify-between items-center mb-1 bg-gray-800 px-4 py-2 rounded';

                const player1 = document.createElement('span');
                player1.textContent = match.player1;

                const vs = document.createElement('span');
                vs.textContent = 'vs';

                const player2 = document.createElement('span');
                player2.textContent = match.player2;

                const score = document.createElement('span');
                score.className = 'ml-4 text-sm text-gray-300';
                score.textContent = match.score1 != null && match.score2 != null
                    ? `${match.score1} – ${match.score2}`
                    : 'Pending';

                matchDiv.appendChild(player1);
                matchDiv.appendChild(vs);
                matchDiv.appendChild(player2);
                matchDiv.appendChild(score);

                roundDiv.appendChild(matchDiv);
            });

            bracketsContainer.appendChild(roundDiv);
        });
    }
    catch (err)
    {
        console.error('[loadBrackets]', err);
        bracketsContainer.innerHTML = `<p class="text-red-500">Failed to load brackets</p>`;
    }
}
