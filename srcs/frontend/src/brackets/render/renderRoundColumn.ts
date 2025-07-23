import renderMatch from "./renderMatch.js";
import type { BracketMatch } from '../types/bracketsTypes.js';

export default function renderRoundColumn(matches: BracketMatch[], round: number, nbrMatchsRound1: number, userId: number | null): HTMLDivElement
{
	const spacing = 74 * Math.pow(2, round) - 64;
	var marginTop:number;

	if (round === 0)
		marginTop = (2 * nbrMatchsRound1 - matches.length) * 74 + 5;
	else
		marginTop = spacing / 2;

	const container = document.createElement('div');
	container.className = 'relative flex flex-col items-center';

	let i:number = 0;
	while (i < matches.length)
	{
		const match = matches[i];

		const wrapper = document.createElement('div');
		wrapper.style.marginTop = (i === 0) ? `${marginTop}px` : `${spacing}px`;

		const matchDiv = renderMatch(match, userId);

		if (match.state !== 'WAITING') {
			matchDiv.addEventListener('click', () => {
				window.location.hash = `#game/${match.id}?type=TOURNAMENT`;
			});
		}

		wrapper.appendChild(matchDiv);
		container.appendChild(wrapper);
		i ++;
	}

	container.style.marginBottom = `${spacing / 2}px`;
	container.style.marginLeft = '30px';
	
	return (container);
}
