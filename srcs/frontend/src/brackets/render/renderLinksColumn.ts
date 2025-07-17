import { renderBracketLink, renderDemiBracketLink } from "./renderBracketLink.js";

export default function renderLinksColumn(round: number, roundNbrMatchs:number, nextRoundNbrMatchs: number): HTMLDivElement
{
	const linkColumn = document.createElement('div');
	linkColumn.className = 'flex flex-col top-0';
	const missingMatchLink : number = Math.floor((2 * nextRoundNbrMatchs - roundNbrMatchs) / 2);
	if (round === 0)
		linkColumn.style.marginTop = `${missingMatchLink * 148 + 37}px`;
	else
		linkColumn.style.marginTop = `${74 * Math.pow(2, round - 1)}px`;

	const numberOfLinks = Math.floor(roundNbrMatchs / 2);
	const linkHeight = 74 * Math.pow(2, round);
	const spacing = 74 * Math.pow(2, round);

	if (roundNbrMatchs % 2)
	{
		const linkWrapper = document.createElement('div');
		
		const linkDiv = renderDemiBracketLink(linkHeight);
		linkWrapper.appendChild(linkDiv);
		linkColumn.appendChild(linkWrapper);
	}
	let j:number = 0;
	while (j < numberOfLinks)
	{
		const linkWrapper = document.createElement('div');
		if ((j !== 0) || (roundNbrMatchs % 2)) linkWrapper.style.marginTop = `${spacing}px`;

		const linkDiv = renderBracketLink(linkHeight);
		linkWrapper.appendChild(linkDiv);
		linkColumn.appendChild(linkWrapper);
		j ++;
	}
	return (linkColumn);
}
