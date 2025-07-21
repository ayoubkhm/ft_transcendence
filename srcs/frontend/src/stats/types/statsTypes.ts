
export type MatchStats = {
    type: string;
    state: string;
    p1_bot: boolean;
    p2_bot: boolean;
    p1_name: string | null;
    p1_tag: number | null;
    p2_name: string | null;
    p2_tag: number | null;
    p1_score: number;
    p2_score: number;
    winner: boolean | null;
    date?: string; //MODIFIED: Par mehdi pour afficher la date
};

export type UserStats = {
	won_count: number | null;
	lost_count: number | null;
	block_count: number | null;
	missed_count: number | null;
	bonus_count: number | null;
	matches: MatchStats[] | null;
};
