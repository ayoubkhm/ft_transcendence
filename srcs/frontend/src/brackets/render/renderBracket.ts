import renderLinksColumn from "./renderLinksColumn.js";
import renderRoundColumn from "./renderRoundColumn.js"
import type { BracketRound } from '../types/bracketsTypes.js';


export default function renderBrackets(tname: string, tstate: string, twinner: {name: string, tag: number} | null, rounds: BracketRound[])
{

	const tournamentName = document.getElementById("brackets-tournament-name") as HTMLHeadingElement | null;
	if (tournamentName)
		tournamentName.textContent = tname;
	
	const infoWrapper = document.getElementById("brackets-info-wrapper") as HTMLDivElement | null;
	if (infoWrapper)
	{
		var tournamentStateColor: string;
		if (tstate === 'RUNNING')
			tournamentStateColor = "bg-yellow-400";
		else if (tstate === 'LOBBY')
			tournamentStateColor = "bg-green-500";
		else
			tournamentStateColor = "bg-red-500";
  
		const span = document.createElement("span");
		span.id = "brackets-tournament-state";
		span.className = `w-5 h-5 rounded-full ${tournamentStateColor}`;

		infoWrapper.appendChild(span);

		if (twinner != null)
		{
			const winnerDiv = document.createElement("h2");
			winnerDiv.textContent = `🏆 Winner : ${twinner.name}#${twinner.tag.toString().padStart(4, '0')}`;
			winnerDiv.className = "ml-auto mr-10 text-xl font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded";

			infoWrapper.appendChild(winnerDiv);
		}

	}

	const nbrMatchsRound1:number = rounds.find(r => r.round === 1)!.matchs.length;
	
	var wrapper = document.createElement('div');
	wrapper.className = 'flex items-start';
	
	let i = 0;
	while (i < rounds.length)
	{
		const { round, matchs } = rounds[i];
		
		const roundColumn = renderRoundColumn(matchs, round, nbrMatchsRound1);
		wrapper.appendChild(roundColumn);

		if (i < rounds.length - 1)
		{
			const linkColumn = renderLinksColumn(round, rounds[i].matchs.length, rounds[i + 1].matchs.length);
			wrapper.appendChild(linkColumn);
		}
		i ++;
	}

	return (wrapper);
}

