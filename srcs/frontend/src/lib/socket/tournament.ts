// src/lib/socket/tournament.ts

import { send } from './connection';

export function createTournament(name: string, ownerId: number) {
  send({
    type: 'create_tournament',
    name: name,
    owner_id: ownerId,
  });
}

export function deleteTournament(name: string, owner_id: number) {
  send({ type: 'delete_tournament', name, owner_id });
}

export function toggleReadyStatus(tournament_id: number, user_id: number) {
  send({ type: 'toggle_ready_status', tournament_id, user_id });
}

export function getTournamentDetails(tournamentId: number) {
  send({
    type: 'get_tournament_details',
    tournament_id: tournamentId,
  });
}

export function joinTournament(tournamentId: number, userId: number) {
  send({
    type: 'join_tournament',
    tournament_id: tournamentId,
    user_id: userId,
  });
}

export function leaveTournament(tournamentId: number, userId: number, name: string) {
  send({
    type: 'leave_tournament',
    tournament_id: tournamentId,
    user_id: userId,
    name: name,
  });
}

export function startTournament(name: string) {
  send({
    type: 'start_tournament',
    name: name,
  });
}

export function subscribeToTournaments(tournamentIds: number[]) {
    send({
        type: 'subscribe_to_tournaments',
        tournament_ids: tournamentIds
    });
}

export function unsubscribeFromTournaments(tournamentIds: number[]) {
    send({
        type: 'unsubscribe_from_tournaments',
        tournament_ids: tournamentIds
    });
}

export function getTournamentState(tournamentId: number) {
    send({
        type: 'get_tournament_state',
        tournament_id: tournamentId
    });
}

export function getTournamentLobbyState(tournamentId: number) {
    send({
        type: 'get_tournament_lobby_state',
        tournament_id: tournamentId
    });
}

export function getTournamentBracketState(tournamentId: number) {
    send({
        type: 'get_tournament_bracket_state',
        tournament_id: tournamentId
    });
}

export function getTournamentChatState(tournamentId: number) {
    send({
        type: 'get_tournament_chat_state',
        tournament_id: tournamentId
    });
}

export function getTournamentLeaderboardState(tournamentId: number) {
    send({
        type: 'get_tournament_leaderboard_state',
        tournament_id: tournamentId
    });
}

export function getTournamentSettingsState(tournamentId: number) {
    send({
        type: 'get_tournament_settings_state',
        tournament_id: tournamentId
    });
}

export function getTournamentPlayersState(tournamentId: number) {
    send({
        type: 'get_tournament_players_state',
        tournament_id: tournamentId
    });
}

export function getTournamentPlayerState(tournamentId: number, playerId: number) {
    send({
        type: 'get_tournament_player_state',
        tournament_id: tournamentId,
        player_id: playerId
    });
}

export function getTournamentPlayerReadyState(tournamentId: number, playerId: number) {
    send({
        type: 'get_tournament_player_ready_state',
        tournament_id: tournamentId,
        player_id: playerId
    });
}
