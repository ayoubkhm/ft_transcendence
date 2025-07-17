import type { BracketMatch } from '../types/bracketsTypes.js';

export default function renderMatch(match:BracketMatch): HTMLDivElement
{
	const div = document.createElement("div");
	const tag1String: string = match.p1_tag? (match.p1_tag.toString().padStart(4, '0')) : "...";
	const tag2String: string = match.p2_tag? (match.p2_tag.toString().padStart(4, '0')) : "...";
	const player1Name: string = match.p1_name ? match.p1_name : "...";
	const player2Name: string = match.p2_name ? match.p2_name : "...";

	const winnerClass = "border-l-4 border-green-500 pl-1";
	const loserClass = "opacity-60 bg-zinc-400 border-l-4 border-red-600 pl-1";
	const neutralClass = "";

	var player1Class: string;
	var player2Class: string;
	if (match.winner === null)
	{
		player1Class = neutralClass;
		player2Class = neutralClass;
	}
	else if (match.winner === true)
	{
		player1Class = winnerClass;
		player2Class = loserClass;
	}
	else
	{
		player1Class = loserClass;
		player2Class = winnerClass;
	}

	div.innerHTML = `
	<div class="flex h-1/2">
		<div class="${player1Class} text-black truncate flex-1 flex items-center justify-start px-2 font-semibold text-[13.5px]">
		${player1Name}
	  	</div>
		
	${match.winner === true ? ` <div class="text-yellow-400 px-1 flex items-center justify-center text-base">🏆</div>` : ''}

	  	<div class="text-zinc-300 tracking-wide bg-zinc-600 px-1 flex items-center justify-center w-11 text-[12px] font-bold font-mono">
	  		<span>#</span>${tag1String}
		</div>

	</div>
	
	<div class="truncate flex h-1/2 border-t border-gray-200">
	  	<div class="${player2Class} text-black flex-1 flex items-center justify-start px-2 font-semibold text-[13.5px]">
	  		${player2Name}
	  	</div>
	  	<div class="text-zinc-300 tracking-wide bg-zinc-600 px-1 flex items-center justify-center w-11 text-[12px] font-bold font-mono">
	  		<span>#</span>${tag2String}
		</div>
	</div>
	`;

	div.className = "w-56 h-16 bg-white rounded shadow-md border border-gray-300 overflow-hidden transition-shadow duration-150 ease-in-out hover:shadow-lg hover:bg-gray-50 cursor-pointer";

	return (div);
}
