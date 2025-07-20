export function close_stats()
{
	const statsContainer = document.getElementById("stats-container") as HTMLButtonElement | null;
	const statsPopup = document.getElementById("stats-popup") as HTMLButtonElement | null;

	if (statsPopup)
		statsPopup.classList.add('hidden');
	if (statsContainer)
		statsContainer.innerHTML = '';
}

export default function setupUserStats(): void
{
    const closeButton = document.getElementById('stats-close');
    if (closeButton)
        closeButton.addEventListener('click', close_stats);
}