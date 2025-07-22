// src/lib/socket/game.ts

import { send } from './connection';

export function startTournamentGame(tournamentId: number) {
    send({
        type: 'start_game',
        tournament_id: tournamentId
    });
}

export function endTournamentGame(tournamentId: number) {
    send({
        type: 'end_game',
        tournament_id: tournamentId
    });
}

export function updateTournamentGameScore(tournamentId: number, score: any) {
    send({
        type: 'update_score',
        tournament_id: tournamentId,
        score: score
    });
}

export function pauseTournamentGame(tournamentId: number) {
    send({
        type: 'pause_game',
        tournament_id: tournamentId
    });
}

export function resumeTournamentGame(tournamentId: number) {
    send({
        type: 'resume_game',
        tournament_id: tournamentId
    });
}

export function getTournamentGameState(tournamentId: number) {
    send({
        type: 'get_game_state',
        tournament_id: tournamentId
    });
}
