import { UserStats } from "../types/statsTypes";
import updateWinrate from "./updateWinrate";
import renderMatchHistory from "./renderMatchsHistory";

export default function renderStats(userId:number, data: UserStats): void
{
    updateWinrate(data.won_count??0, data.lost_count??0);
    if (data.matches)
        renderMatchHistory(userId, data.matches);
}