import { onRoute } from '../lib/router';

export function close_brackets()
{
    var bracketsPopup: HTMLDivElement | null = document.getElementById("brackets-popup") as HTMLDivElement | null;
    if (!bracketsPopup)
        return ;

    bracketsPopup.classList.add('hidden');
    
    var bracketsContainer: HTMLDivElement | null = document.getElementById('brackets-container') as HTMLDivElement | null;
    if (!bracketsContainer)
        return ;

    bracketsContainer.innerHTML = '';

    var stateSpan = document.getElementById("brackets-tournament-state");
    if (stateSpan)
        stateSpan.remove();
}

export default function setupTournamentBrackets(): void
{
    const bracketsPopup: HTMLDivElement | null = document.getElementById("brackets-popup") as HTMLDivElement | null;
    if (!bracketsPopup)
        return ;

    const bracketsContainer: HTMLDivElement | null = document.getElementById('brackets-container') as HTMLDivElement | null;
    if (!bracketsContainer)
        return ;

    const closeButton = document.getElementById('close-brackets');
    if (closeButton)
        closeButton.addEventListener('click', close_brackets);
    
    onRoute('*', close_brackets);
}

