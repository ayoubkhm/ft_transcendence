import { MatchStats } from "./../types/statsTypes"

function renderPlayer(name: string | null, tag: number | null, isBot: boolean, isWinner: boolean): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "w-32 flex items-center space-x-1 truncate font-bold";
	console.log("is winner: ", isWinner);
  if (isBot) {
    div.textContent = "IA";
	if (isWinner)
		div.classList.add("text-yellow-400");
    return div;
  }

  const nameSpan = document.createElement("span");
  nameSpan.className = "truncate";
  nameSpan.textContent = name ?? "??";
  
  const tagSpan = document.createElement("span");
  tagSpan.className = "text-xs text-gray-400 whitespace-nowrap";
  tagSpan.textContent = `#${String(tag ?? 0).padStart(4, "0")}`;

  if (isWinner)
	div.classList.add("text-yellow-400");

  div.appendChild(nameSpan);
  div.appendChild(tagSpan);
  return div;
}


export default function renderMatchHistory(userId: number, matches: MatchStats[]) {
	const container = document.getElementById("stats-matchs");
	if (!container)
	{
		console.error("Match history: no container");
		return ;
	}

	container.innerHTML = ""; // reset

	for (const match of matches)
	{
		const matchDiv = document.createElement("div");
		matchDiv.className ="bg-zinc-800 rounded-lg shadow px-4 py-2 min-w-[500px] text-sm text-white flex items-center gap-4";

		const typeCol = document.createElement("div");
		typeCol.className = "w-20 font-semibold";
		typeCol.textContent = match.type;

		const stateDot = document.createElement("div");
		stateDot.className ="w-3 h-3 rounded-full " +
		(match.state === "RUNNING" ? "bg-green-500" : "bg-red-400");

		const p1 = renderPlayer(match.p1_name, match.p1_tag, match.p1_bot, match.winner === true);
		const p2 = renderPlayer(match.p2_name, match.p2_tag, match.p2_bot, match.winner === false);

		const score = document.createElement("div");
		score.className = "w-20 font-mono";
		score.textContent = `${match.p1_score} - ${match.p2_score}`;

		const dateDiv = document.createElement("div"); //MODIFIED: Par mehdi pour afficher la date
    	dateDiv.className = "w-32 text-xs text-gray-300"; //MODIFIED: Par mehdi pour afficher la date
    	dateDiv.textContent = match.date ? new Date(match.date).toLocaleString() : "Date inconnue"; //MODIFIED: Par mehdi pour afficher la date

		matchDiv.appendChild(dateDiv); //MODIFIED: Par mehdi pour afficher la date
		matchDiv.appendChild(typeCol);
		matchDiv.appendChild(stateDot);
		matchDiv.appendChild(p1);
		matchDiv.appendChild(p2);
		matchDiv.appendChild(score);
		container.appendChild(matchDiv);
	}
}
