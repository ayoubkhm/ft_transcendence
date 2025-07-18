import renderBrackets from "./render/renderBracket.js";
import type { BracketRound } from "./types/bracketsTypes"

export default async function show_brackets(tournamentId: number, container?: HTMLElement)
{
    const bracketsContainer = container || document.getElementById('brackets-container') as HTMLDivElement | null;
    if (!bracketsContainer)
        return null;

    if (!container) {
        const bracketsPopup = document.getElementById("brackets-popup") as HTMLDivElement | null;
        if (bracketsPopup) {
            bracketsPopup.classList.remove('hidden');
        }
    }

    try
    {  
        bracketsContainer.innerHTML = '';
        bracketsContainer.classList.remove('hidden');
        bracketsContainer.innerHTML = '<p>Loading brackets...</p>';
        
        const res = await fetch(`/api/tournaments/brackets/${tournamentId}`);
        if (!res.ok)
        {
            console.error(`[loadBrackets] HTTP ${res.status}`);
            throw new Error(`Server error ${res.status}`);
        }
        let data:
        {
            success: boolean,
            msg: string,
            tname: string,
            tstate: string,
            twinner: number | null,
            twinner_name: string | null,
            twinner_tag: number | null,
            brackets: BracketRound[]
        };
        try
        {
            bracketsContainer.innerHTML = '';
            data = await res.json();
            const userId = localStorage.getItem('userId');
            bracketsContainer.appendChild(renderBrackets(
                data.tname,
                data.tstate,
                (data.twinner != null) ? ({name : data.twinner_name!, tag : data.twinner_tag!}) : null,
                data.brackets,
                userId ? parseInt(userId, 10) : null
            ));
            return data;
            
        }
        catch (err)
        {
            console.error('[loadBrackets] Invalid JSON:', err);
            throw new Error('Received non-JSON response');
        }
        
    }
    catch (err)
    {
        bracketsContainer.innerHTML = '<p>Failed to load brackets...</p>';
        console.error('[loadBrackets]', err);
        return null;
    }
}
