import { drawGame, drawForfeitTimer } from './GameCanvas';
import { navigate, onRoute } from '../../lib/router';
import { loginAsGuest } from '../auth/Auth';
import { Game } from '../../game_logic/algo.js';


// --- Image Preloading ---
const imagePaths = {
  fake: '/fake.png',
  speedUp: '/speed.png',
  shield: '/shield.png',
  bigger: '/bigger.png',
};

const images: { [key: string]: HTMLImageElement } = {};

function loadImages(): Promise<void[]> {
  const promises = Object.entries(imagePaths).map(([type, src]) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        images[type] = img;
        resolve();
      };
      img.onerror = (err) => {
        console.error(`Failed to load image "${type}" from "${src}"`, err);
        reject(new Error(`Failed to load image "${type}"`));
      };
    });
  });
  return Promise.all(promises);
}


// --- DOM Elements ---
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas?.getContext('2d');
const hero = document.getElementById('hero') as HTMLElement;
const resultPre = document.getElementById('game-result') as HTMLPreElement;
const forfeitBtn = document.getElementById('forfeit-btn') as HTMLButtonElement;
const playAIBtn = document.getElementById('play-ai-btn') as HTMLButtonElement;
const playPVPBtn = document.getElementById('play-pvp-btn') as HTMLButtonElement;
const aiModal = document.getElementById('ai-modal') as HTMLElement;
const aiModalClose = document.getElementById('ai-modal-close') as HTMLButtonElement;
const aiModalStartBtn = document.getElementById('ai-modal-start-btn') as HTMLButtonElement;
const aiModalDifficulty = document.getElementById('ai-modal-difficulty') as HTMLSelectElement;
const aiModalCustomToggle = document.getElementById('ai-modal-custom-toggle') as HTMLInputElement;
const pvpModal = document.getElementById('pvp-modal') as HTMLElement;
const pvpModalClose = document.getElementById('pvp-modal-close') as HTMLButtonElement;
const pvpModalCreateBtn = document.getElementById('pvp-modal-create-btn') as HTMLButtonElement;
const pvpModalJoinInput = document.getElementById('pvp-modal-join-input') as HTMLInputElement;
const pvpModalJoinConfirmBtn = document.getElementById('pvp-modal-join-confirm-btn') as HTMLButtonElement;
const pvpModalLocalBtn = document.getElementById('pvp-modal-local-btn') as HTMLButtonElement;
const pvpModalCustomToggle = document.getElementById('pvp-modal-custom-toggle') as HTMLInputElement;
const shareDiv = document.getElementById('share-id') as HTMLElement;
const gameIdInput = document.getElementById('game-id-input') as HTMLInputElement;
const playerLeftControls = document.getElementById('player-left-controls') as HTMLElement;
const playerRightControls = document.getElementById('player-right-controls') as HTMLElement;
const playerAIControls = document.getElementById('player-ai-controls') as HTMLElement;
const playerLeftName = document.getElementById('player-left-name') as HTMLElement;
const playerRightName = document.getElementById('player-right-name') as HTMLElement;




// --- State ---
let gameSocket: WebSocket | null = null;
let gameId: string | null = null;
let playerId: string | null = null;
let authToken: string | null = null;
let lastInput: 'move_up' | 'move_down' | 'stop' | null = null;
let localGame: Game | null = null;
let localGameLoopId: number | null = null;


let forfeitTimerId: number | null = null;

function clearForfeitTimer() {
  if (forfeitTimerId) {
    clearInterval(forfeitTimerId);
    forfeitTimerId = null;
  }
}

// --- WebSocket Communication ---

function connectToGameSocket() {
  if (!gameId) return;

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/api/game/${gameId}/ws`;
  
  gameSocket = new WebSocket(wsUrl);

  gameSocket.onopen = () => {
    console.log(`[WS] Game socket connected for game ${gameId}`);
  };

  gameSocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'game_state_update') {
      const state = message.data;
      if (ctx) {
        drawGame(ctx, state, images);
      }
      if (state.isGameOver) {
        handleGameOver(state);
      }
    }
  };

  gameSocket.onerror = (error) => {
    console.error('[WS] Game socket error:', error);
  };

  gameSocket.onclose = () => {
    console.log('[WS] Game socket closed.');
  };
}

function sendSocketMessage(type: string, payload: any) {
  if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
    gameSocket.send(JSON.stringify({ type, payload }));
  }
}

function sendInput(type: 'move_up' | 'move_down' | 'stop') {
  if (type === lastInput) return;
  lastInput = type;
  sendSocketMessage('game_input', {
    playerId,
    type,
    ts: Date.now(),
    token: authToken,
  });
}

// --- Game Flow & UI Management ---

function showGameUI(isWaiting = false, isLocal = false, isAI = false) {
  hero.classList.add('hidden');
  resultPre.classList.add('hidden');
  canvas.classList.remove('hidden');
  forfeitBtn.classList.remove('hidden');
  playAIBtn.disabled = true;
  playPVPBtn.disabled = true;
  if (isLocal) {
    playerLeftControls.classList.remove('hidden');
    playerRightControls.classList.remove('hidden');
  }
  if (isAI) {
    playerAIControls.classList.remove('hidden');
  }
  canvas.focus();
  attachGameListeners();

  if (isWaiting && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for opponent...', canvas.width / 2, canvas.height / 2);
  }
}

function hideGameUI() {
  detachGameListeners();
  clearForfeitTimer();
  hero.classList.remove('hidden');
  canvas.classList.add('hidden');
  forfeitBtn.classList.add('hidden');
  resultPre.classList.remove('hidden');
  playAIBtn.disabled = false;
  playPVPBtn.disabled = false;
  shareDiv.classList.add('hidden'); // Hide the share div
  playerLeftControls.classList.add('hidden');
  playerRightControls.classList.add('hidden');
  playerAIControls.classList.add('hidden');
  playerLeftName.classList.add('hidden');
  playerRightName.classList.add('hidden');
  if (gameSocket) {
    gameSocket.close();
  }
  if (localGameLoopId) {
    cancelAnimationFrame(localGameLoopId);
    localGameLoopId = null;
  }
  // Clear game state
  localStorage.removeItem('activeGameSession');
  gameId = null;
  playerId = null;
  authToken = null;
  lastInput = null;
  localGame = null;
}

function localGameLoop() {
  if (!localGame) return;

  localGame.step(1 / 60); // 60 FPS
  const state = localGame.getState();

  if (ctx) {
    drawGame(ctx, state, images);
  }

  if (state.isGameOver) {
    handleGameOver(state);
  } else {
    localGameLoopId = requestAnimationFrame(localGameLoop);
  }
}

async function startLocalPvPGame() {
  try {
    await loadImages();
    const isCustomOn = pvpModalCustomToggle.checked;
    localGame = new Game('Player 1', 'Player 2', null, null, 'VS', 'medium', isCustomOn, 0);
    navigate('local-game');
    localGameLoop();
  } catch (err) {
    console.error('[startLocalPvPGame]', err);
    alert(`Error starting local game: ${err.message}`);
    hideGameUI();
  }
}


function handleGameOver(state: any) {
  const winnerSide = state.winner;
  const winner = state.players.find((p: any) => p.side === winnerSide);
  resultPre.textContent = `Game Over — winner: ${winner ? winner.id : 'Unknown'}`;
  hideGameUI();
  // Additional logic for tournament game progression can be added here
}

export async function startGame(mode: 'ai' | 'pvp', isCustomOn: boolean, difficulty?: string) {
  try {
    await loadImages(); // Preload all game images

    let username = localStorage.getItem('username');
    if (!username) {
      await loginAsGuest();
      username = localStorage.getItem('username');
      if (!username) throw new Error("Failed to login as guest.");
    }

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, difficulty, username, isCustomOn }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create game');
    }

    const data = await res.json();
    gameId = data.gameId;
    playerId = data.playerId;
    authToken = data.token;
    localStorage.setItem('activeGameSession', JSON.stringify({ gameId, playerId, authToken }));

    const isWaiting = (mode === 'pvp');
    const isAI = (mode === 'ai');
    showGameUI(isWaiting, false, isAI);

    if (isWaiting) {
      shareDiv.classList.remove('hidden');
      gameIdInput.value = gameId!;
    }

    connectToGameSocket();
    navigate('game', { id: gameId });

  } catch (err) {
    console.error('[startGame]', err);
    alert(`Error starting game: ${err.message}`);
    hideGameUI();
  }
}

export async function joinGame(gameIdToJoin: string, onGameOver?: (state: any) => void) {
  try {
    await loadImages(); // Preload all game images
    let username = localStorage.getItem('username');
    if (!username) {
      await loginAsGuest();
      username = localStorage.getItem('username');
      if (!username) throw new Error("Failed to login as guest.");
    }

    gameId = gameIdToJoin;
    playerId = username; // Tentatively set playerId

    showGameUI();
    
    // Connect to the WebSocket, then send the join message
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/game/${gameId}/ws`;
    gameSocket = new WebSocket(wsUrl);

    gameSocket.onopen = () => {
      console.log(`[WS] Game socket connected for joining game ${gameId}`);
      sendSocketMessage('join_pvp_game', { username });
    };

    gameSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'game_state_update') {
        clearForfeitTimer(); // Game has started, clear any forfeit timer
        const state = message.data;
        if (ctx) {
          drawGame(ctx, state, images);
        }
        if (state.isGameOver) {
          if (onGameOver) {
            onGameOver(state);
          } else {
            handleGameOver(state);
          }
        }
      } else if (message.type === 'join_success') {
        // The backend confirms the join and sends the auth token
        authToken = message.data.token;
        playerId = message.data.playerId;
        localStorage.setItem('activeGameSession', JSON.stringify({ gameId, playerId, authToken }));
        console.log(`[WS] Successfully joined game ${gameId}`);
      } else if (message.type === 'forfeit_timer_started') {
        const { duration } = message.payload;
        let remaining = duration;
        if (ctx) {
          drawForfeitTimer(ctx, remaining);
          forfeitTimerId = window.setInterval(() => {
            remaining--;
            if (remaining >= 0 && ctx) {
              drawForfeitTimer(ctx, remaining);
            } else {
              clearForfeitTimer();
            }
          }, 1000);
        }
      } else if (message.type === 'error') {
        alert(`Error joining game: ${message.message}`);
        hideGameUI();
        navigate('home');
      }
    };

    gameSocket.onerror = (error) => {
      console.error('[WS] Game socket error:', error);
      hideGameUI();
    };

    gameSocket.onclose = () => {
      console.log('[WS] Game socket closed.');
      clearForfeitTimer();
    };

    navigate('game', { id: gameId });

  } catch (err) {
    console.error('[joinGame]', err);
    alert(`Error joining game: ${err.message}`);
    hideGameUI();
  }
}

// --- Event Listeners ---

function onKeyDown(e: KeyboardEvent) {
  if (localGame) {
    if (e.key === 'w') localGame.handleInput('Player 1', { type: 'move_up' });
    if (e.key === 's') localGame.handleInput('Player 1', { type: 'move_down' });
    if (e.key === 'ArrowUp') localGame.handleInput('Player 2', { type: 'move_up' });
    if (e.key === 'ArrowDown') localGame.handleInput('Player 2', { type: 'move_down' });
  } else {
    if (e.key === 'ArrowUp') sendInput('move_up');
    if (e.key === 'ArrowDown') sendInput('move_down');
  }
}
function onKeyUp(e: KeyboardEvent) {
  if (localGame) {
    if (e.key === 'w' || e.key === 's') localGame.handleInput('Player 1', { type: 'stop' });
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') localGame.handleInput('Player 2', { type: 'stop' });
  } else {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') sendInput('stop');
  }
}

export function attachGameListeners() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

export function detachGameListeners() {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
}

export function setupGame() {
  // No longer check for active game session here, the router will handle it.

  forfeitBtn.addEventListener('click', () => {
    if (localGame) {
      localGame.handleInput('Player 1', { type: 'forfeit' });
    } else {
      sendSocketMessage('game_input', {
        playerId,
        type: 'forfeit',
        ts: Date.now(),
        token: authToken,
      });
    }
  });

  playAIBtn.addEventListener('click', () => navigate('play-ai'));
  aiModalClose.addEventListener('click', () => navigate('home'));
  aiModal.addEventListener('click', (e) => {
    if (e.target === aiModal) {
      navigate('home');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !aiModal.classList.contains('hidden')) {
      navigate('home');
    }
  });
  aiModalStartBtn.addEventListener('click', () => {
    navigate('home');
    const isCustomOn = aiModalCustomToggle.checked;
    startGame('ai', isCustomOn, aiModalDifficulty.value);
  });

  // --- PvP Modal Listeners ---
  playPVPBtn.addEventListener('click', () => navigate('play-pvp'));
  pvpModalClose.addEventListener('click', () => navigate('home'));
  pvpModal.addEventListener('click', (e) => {
    if (e.target === pvpModal) {
      navigate('home');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pvpModal.classList.contains('hidden')) {
      navigate('home');
    }
  });
  pvpModalCreateBtn.addEventListener('click', () => {
    navigate('home');
    const isCustomOn = pvpModalCustomToggle.checked;
    startGame('pvp', isCustomOn);
  });
  pvpModalJoinConfirmBtn.addEventListener('click', () => {
    const gameIdToJoin = pvpModalJoinInput.value.trim();
    if (gameIdToJoin) {
      navigate('home');
      joinGame(gameIdToJoin);
    } else {
      alert('Please enter a Game ID to join.');
    }
  });
  pvpModalLocalBtn.addEventListener('click', () => {
    navigate('home');
    startLocalPvPGame();
  });

  // Handle navigating away from the game
  onRoute('game', (params) => {
    const gameIdFromUrl = params?.id;
    if (!gameIdFromUrl) {
      // If we somehow navigate to #game without an ID, go home.
      navigate('home');
      return;
    }

    const sessionData = localStorage.getItem('activeGameSession');
    if (sessionData) {
      const { gameId: storedGameId, playerId: storedPlayerId, authToken: storedAuthToken } = JSON.parse(sessionData);
      
      // Only rejoin if the stored game matches the one in the URL
      if (storedGameId === gameIdFromUrl) {
        gameId = storedGameId;
        playerId = storedPlayerId;
        authToken = storedAuthToken;

        showGameUI();
        connectToGameSocket();
        // Send a join message to ensure the server knows we're back
        gameSocket!.onopen = () => {
          console.log(`[WS] Reconnected to game ${gameId}`);
          sendSocketMessage('join_pvp_game', { username: playerId });
        };
      }
    }
    // If there's no session data, the user might be a spectator or has joined via a link.
    // The joinGame function will handle creating the session.
  });

  onRoute('local-game', () => {
    showGameUI(false, true);
  });

  onRoute('home', () => {
    if (gameId || localGame) {
      hideGameUI();
    }
  });
}

export function attachCanvasTo(element: HTMLElement) {
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    element.appendChild(canvas);
  }
}

export function detachCanvas() {
  const canvas = document.getElementById('game-canvas');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  if (canvas && canvasWrapper) {
    canvasWrapper.appendChild(canvas);
  }
}
