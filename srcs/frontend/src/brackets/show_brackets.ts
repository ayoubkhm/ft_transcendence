import renderBrackets from "./render/renderBracket.js";
import type { BracketRound } from "./types/bracketsTypes"

export default async function show_brackets(tournamentId: number)
{
    var bracketsPopup: HTMLDivElement | null = document.getElementById("brackets-popup") as HTMLDivElement | null;
    if (!bracketsPopup)
        return ;

    bracketsPopup.classList.add('hidden');
    
    var bracketsContainer: HTMLDivElement | null = document.getElementById('brackets-container') as HTMLDivElement | null;
    if (!bracketsContainer)
        return ;
    bracketsPopup.classList.remove('hidden');

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
            bracketsContainer.appendChild(renderBrackets(
                data.tname,
                data.tstate,
                (data.twinner != null) ? ({name : data.twinner_name!, tag : data.twinner_tag!}) : null,
                data.brackets));
            
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
    }
}
