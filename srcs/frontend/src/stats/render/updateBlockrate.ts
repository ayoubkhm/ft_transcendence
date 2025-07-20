export default function updateBlockrate(blocked_count: number, missed_count: number)
{
	console.log("block: ", blocked_count, missed_count);
	const circle = document.querySelector<SVGCircleElement>("#stats-blockrate");
	if (!circle)
	{
		console.error("Blockrate circle not found");
		return ;	
	}

	const blockrateText = document.getElementById("stats-blockrate-text");
  	if (!blockrateText)
	{
		console.error("Blockrate text not found");
		return;
	}
	
	const r = parseFloat(circle.getAttribute("r") || "40");
	const circumference = 2 * Math.PI * r;
	var filled: number;
	if ((missed_count + blocked_count) === 0)
	{
		filled = 0;
		blockrateText.textContent = 'N/A';
	}
	else
	{
		const percent = blocked_count / (blocked_count + missed_count);
		filled = circumference * (percent);
		blockrateText.textContent = `${Math.round(percent * 100)}%`;
		console.log("block text: ", `${Math.round(percent * 100)}%`);
	}
	const empty = circumference - filled;
	circle.setAttribute("stroke-dasharray", `${filled} ${empty}`);
}
