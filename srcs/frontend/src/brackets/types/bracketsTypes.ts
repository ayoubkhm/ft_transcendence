export type BracketMatch =
{
    id: number;
    state: string;
    p1_id: number | null;
    p1_name: string | null;
    p1_tag: number | null;
    p1_winnerof: number | null;
    p2_id: number | null;
    p2_name: string | null;
    p2_tag: number | null;
    p2_winnerof: number | null;
    winner: boolean | null;
};

export type BracketRound =
{
    round: number;
    matchs: BracketMatch[];
};