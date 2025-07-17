// Renders the lobby/waiting room view for a tournament in PREP state

interface Player {
    id: number;
    name: string;
    tag: number;
}

export default function renderLobby(tournamentName: string, players: Player[]): HTMLElement {
    const lobbyContainer = document.createElement('div');
    lobbyContainer.className = 'p-4 bg-gray-800 rounded-lg';

    const title = document.createElement('h2');
    title.className = 'text-2xl font-bold text-white mb-4';
    title.textContent = `${tournamentName} - Lobby`;
    lobbyContainer.appendChild(title);

    if (players && players.length > 0) {
        const playerList = document.createElement('ul');
        playerList.className = 'space-y-2';
        
        players.forEach(player => {
            const playerItem = document.createElement('li');
            playerItem.className = 'p-2 bg-gray-700 rounded text-white';
            playerItem.textContent = `${player.name} #${player.tag}`;
            playerList.appendChild(playerItem);
        });

        lobbyContainer.appendChild(playerList);
    } else {
        const noPlayersText = document.createElement('p');
        noPlayersText.className = 'text-gray-400';
        noPlayersText.textContent = 'No players have joined yet.';
        lobbyContainer.appendChild(noPlayersText);
    }

    return lobbyContainer;
}
