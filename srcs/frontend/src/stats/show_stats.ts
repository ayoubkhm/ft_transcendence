import renderStats from './render/renderStats.js';
import { getCurrentUserId } from '../components/auth/Auth';

export const statsState = {
	isMyOwnStats: false,
};

export default async function show_stats(userId: number)
{
    const myId = getCurrentUserId();
	statsState.isMyOwnStats = (userId === myId);

    const statsGames = document.getElementById('stats-container') as HTMLDivElement | null;
    if (!statsGames)
        return null;
	
    const statsPopup = document.getElementById("stats-popup") as HTMLDivElement | null;
	if (!statsPopup)
		return null;
    statsPopup.classList.remove('hidden');

    const statsMatchs = document.getElementById("stats-matchs") as HTMLDivElement | null;
	if (!statsMatchs)
		return null;

    try
    {  
        statsMatchs.innerHTML = '';
        statsMatchs.innerHTML = '<p>Loading Game History...</p>';
        
        const res = await fetch(`/api/user/lookup/stats/${userId}`);
        const data = await res.json();
        console.log(data);
        const stats = data.get_stats;

        if (!stats)
        {
            statsGames.innerHTML = '<p>Failed to fetch user stats...</p>';
            console.error("[loadStats: no query return]");
            throw new Error(`Server error ${res.status}`);
        }
        statsMatchs.innerHTML = '';
        renderStats(userId, stats);
    }
    catch (err)
    {
        statsGames.innerHTML = '<p>Failed to load user stats...</p>';
        console.error('[loadStats]', err);
        return null;
    }
}
