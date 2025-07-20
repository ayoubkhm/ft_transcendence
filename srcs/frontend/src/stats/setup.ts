import { navigate } from "../lib/router";

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
    const statsPopup = document.getElementById('stats-popup');
    const closeButton = document.getElementById('stats-close');

    if (closeButton && statsPopup) {
        closeButton.addEventListener('click', () => navigate('profile'));

        // Close modal on click outside
        statsPopup.addEventListener('click', (e) => {
            if (e.target === statsPopup) {
                navigate('profile');
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && statsPopup && !statsPopup.classList.contains('hidden')) {
            navigate('profile');
        }
    });
}