export default function updateWinrate(win_count: number, lose_count: number)
{
	const circle = document.querySelector<SVGCircleElement>("#stats-winrate");
	if (!circle)
	{
		console.error("Winrate circle not found");
		return ;	
	}

	const winrateText = document.getElementById("stats-winrate-text");
  	if (!winrateText)
	{
		console.error("Winrate text not found");
		return;
	}
	
	const r = parseFloat(circle.getAttribute("r") || "40");
	const circumference = 2 * Math.PI * r;
	var filled: number;
	if (lose_count + win_count === 0)
	{
		filled = 0;
		winrateText.textContent = 'N/A';
	}
	else
	{
		const percent = win_count / (win_count + lose_count);
		filled = circumference * (percent);
		winrateText.textContent = `${Math.round(percent * 100)}%`;
	}
	const empty = circumference - filled;
	circle.setAttribute("stroke-dasharray", `${filled} ${empty}`);
}
