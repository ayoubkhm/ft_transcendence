import { UserStats } from "../types/statsTypes";
import updateWinrate from "./updateWinrate";
import updateBlockrate from "./updateBlockrate";
import renderMatchHistory from "./renderMatchsHistory";

export default function renderStats(userId:number, data: UserStats): void
{
    updateWinrate(data.won_count??0, data.lost_count??0);
    // updateBlockrate(data.block_count??0, data.missed_count??0);
    if (data.matches)
        renderMatchHistory(userId, data.matches);
}