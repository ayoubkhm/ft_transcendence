import { navigate } from "../lib/router";
import { statsState } from './show_stats'; // si besoin

export function close_stats()
{
	const statsMatchs = document.getElementById("stats-matchs") as HTMLButtonElement | null;
	const statsPopup = document.getElementById("stats-popup") as HTMLButtonElement | null;

	if (statsPopup)
		statsPopup.classList.add('hidden');
	if (statsMatchs)
		statsMatchs.innerHTML = '';
	const winrateText = document.getElementById("stats-winrate-text");
	const winrateCircle = document.getElementById("stats-winrate");
	if (winrateText)
		winrateText.textContent = 'N/A';
	if (winrateCircle)
		winrateCircle.setAttribute('stroke-dasharray', '0 251.2');

	const blockrateText = document.getElementById("stats-blockrate-text");
	const blockrateCircle = document.getElementById("stats-blockrate");
	if (blockrateText)
		blockrateText.textContent = 'N/A';
	if (blockrateCircle)
		blockrateCircle.setAttribute('stroke-dasharray', '0 251.2');
}


export default function setupUserStats(): void
{
	const statsPopup = document.getElementById('stats-popup');
	const closeButton = document.getElementById('stats-close');

	if (closeButton && statsPopup)
	{
		closeButton.addEventListener('click', () => {
			close_stats();
			if (statsState.isMyOwnStats)
				navigate('profile');
		});

		statsPopup.addEventListener('click', (e) => {
			if (e.target === statsPopup)
			{
				close_stats();
				if (statsState.isMyOwnStats)
					navigate('profile');
			}
		});
	}

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && statsPopup && !statsPopup.classList.contains('hidden'))
		{
			close_stats();
			if (statsState.isMyOwnStats)
				navigate('profile');
		}
	});
}
