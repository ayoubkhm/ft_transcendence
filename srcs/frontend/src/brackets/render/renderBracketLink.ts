export function renderBracketLink(height: number): HTMLDivElement
{
	var container = document.createElement('div');
	container.className = `relative`;
	container.style.height = `${height}px`;

	const thickness = 3.5;
	const thicknessPx = `${thickness}px`;
	const longeur: number = 12;
	const longeurPx:string = `${longeur}px`;

	// ligne principale
	// --
	// 	 | 	 	<-
	// 	 	-
	// 	 | 	 	<-
	// --	 
	var rightLine = document.createElement('div');
	rightLine.className = `absolute top-0 bg-zinc-300`;
	rightLine.style.width = thicknessPx;
	rightLine.style.height = '100%';
	rightLine.style.left = longeurPx;

	// Trait horizontal central// --
	// 	 |
	// 	 	-	 <-
	// 	 | 	 	
	// -- 
	var verticalLine = document.createElement('div');
	verticalLine.className = `absolute bg-zinc-300`;
	verticalLine.style.height = thicknessPx;
	verticalLine.style.width = longeurPx;
	verticalLine.style.top = '50%';
	verticalLine.style.left = `${longeur + thickness}px`;
	verticalLine.style.transform = 'translateY(-50%)';

	// Trait horizontal en haut à gauche
	var topLine = document.createElement('div');
	topLine.className = `absolute bg-zinc-300`;
	topLine.style.height = thicknessPx;
	topLine.style.width = longeurPx;
	topLine.style.top = '0';
	topLine.style.left = "0px";

	// Trait horizontal en bas à gauche
	var bottomLine = document.createElement('div');
	bottomLine.className = `absolute bg-zinc-300`;
	bottomLine.style.height = thicknessPx;
	bottomLine.style.width = longeurPx;
	bottomLine.style.bottom = '0';
	bottomLine.style.left = "0px";

	container.appendChild(rightLine);
	container.appendChild(verticalLine);
	container.appendChild(topLine);
	container.appendChild(bottomLine);

	return (container);
}

export function renderDemiBracketLink(height: number): HTMLDivElement {
	var container = document.createElement('div');
	container.className = `relative`;
	container.style.height = `${height}px`;

	const thickness = 3.5;
	const thicknessPx = `${thickness}px`;
	const longeur: number = 12;
	const longeurPx:string = `${longeur}px`;

	var rightLine = document.createElement('div');
	rightLine.className = `absolute bg-zinc-300`;
	rightLine.style.top = `calc(50% - ${thickness / 2}px)`;
	rightLine.style.width = thicknessPx;
	rightLine.style.height = `calc(50% + ${thickness / 2}px)`;
	rightLine.style.left = longeurPx;

	var verticalLine = document.createElement('div');
	verticalLine.className = `absolute bg-zinc-300`;
	verticalLine.style.height = thicknessPx;
	verticalLine.style.width = longeurPx;
	verticalLine.style.top = '50%';
	verticalLine.style.left = `${longeur + thickness}px`;
	verticalLine.style.transform = 'translateY(-50%)';

	var bottomLine = document.createElement('div');
	bottomLine.className = `absolute bg-zinc-300`;
	bottomLine.style.height = thicknessPx;
	bottomLine.style.width = longeurPx;
	bottomLine.style.bottom = '0';
	bottomLine.style.left = "0px";

	container.appendChild(rightLine);
	container.appendChild(verticalLine);
	container.appendChild(bottomLine);

	return (container);
}
