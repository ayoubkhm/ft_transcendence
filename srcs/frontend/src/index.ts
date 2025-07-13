import './tournament_brackets';

// src/index.ts  – Main SPA logic

/* -------------------- Constants -------------------- */
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const PADDLE_W = 10;
const PADDLE_H = 80;
const BALL_R = 6;
const BBALL_R = BALL_R * 4

// chargement des images

const imagePaths = {
  fake: './fake.png',
  speedUp: './speed.png',
  shield: './shield.png',
  bigger: './bigger.png',
  invert: './invert.png',
};


const images: { [key: string]: HTMLImageElement } = {};

function loadImage(type: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      images[type] = img;
      resolve();
    };
    img.onerror = (err) => {
      console.error(`❌ Erreur de chargement de l'image "${type}" depuis "${src}"`, err);
      reject(new Error(`Impossible de charger l'image "${type}"`));
    };
  });
}
/* -------------------- DOM -------------------- */
const loginBtn      = document.getElementById('login-btn')      as HTMLButtonElement | null;
const playAIBtn     = document.getElementById('play-ai-btn')    as HTMLButtonElement | null;
const playPVPBtn    = document.getElementById('play-pvp-btn')   as HTMLButtonElement | null;
const playTournBtn  = document.getElementById('play-tourn-btn') as HTMLButtonElement | null;
const diffSelect    = document.getElementById('ai-difficulty')  as HTMLSelectElement | null;
// Toggle for enabling custom power-ups/features
const customToggle  = document.getElementById('custom-toggle')  as HTMLInputElement  | null;

const canvas   = document.getElementById('game-canvas')! as HTMLCanvasElement;
const hero     = document.getElementById('hero')        as HTMLElement        | null;
const resultPre= document.getElementById('game-result') as HTMLPreElement     | null;
const forfeitBtn            = document.getElementById('forfeit-btn')            as HTMLButtonElement | null;
// PvP menu controls
const pvpMenu               = document.getElementById('pvp-menu')              as HTMLElement        | null;
const pvpCreateBtn          = document.getElementById('pvp-create-btn')        as HTMLButtonElement  | null;
const pvpJoinBtn            = document.getElementById('pvp-join-btn')          as HTMLButtonElement  | null;
const pvpJoinInput          = document.getElementById('pvp-join-input')        as HTMLInputElement   | null;
const pvpJoinConfirmBtn     = document.getElementById('pvp-join-confirm-btn') as HTMLButtonElement  | null;
// Shareable game ID display for PvP mode
const shareDiv     = document.getElementById('share-id')    as HTMLElement           | null;
const gameIdInput  = document.getElementById('game-id-input') as HTMLInputElement     | null;

if (!loginBtn || !playAIBtn || !playPVPBtn || !playTournBtn ||
    !diffSelect || !customToggle || !canvas || !hero || !resultPre || !forfeitBtn || !shareDiv || !gameIdInput || !pvpMenu || !pvpCreateBtn || !pvpJoinBtn || !pvpJoinInput || !pvpJoinConfirmBtn) {
  document.getElementById('app')!.innerHTML =
    '<div class="text-red-500 p-4">Missing required DOM elements</div>';
  throw new Error('Missing DOM');
}
// Login modal elements
const loginModal         = document.getElementById('login-modal') as HTMLElement | null;
const loginModalForm     = document.getElementById('login-modal-form') as HTMLFormElement | null;
const loginModalCloseBtn = document.getElementById('login-modal-close') as HTMLButtonElement | null;
const loginEmailInput    = document.getElementById('login-email') as HTMLInputElement | null;
const loginPasswordInput = document.getElementById('login-password') as HTMLInputElement | null;
const googleLoginBtn     = document.getElementById('google-login-btn') as HTMLButtonElement | null;
const guestLoginBtn     = document.getElementById('guest-login-btn') as HTMLButtonElement | null;
if (!loginModal || !loginModalForm || !loginModalCloseBtn || !loginEmailInput || !loginPasswordInput || !googleLoginBtn || !guestLoginBtn) {
  throw new Error('Missing login modal elements');
}

/* -------------------- Canvas -------------------- */
canvas.width  = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
const ctx = canvas.getContext('2d')!;

/* -------------------- State -------------------- */
let gameId     = '';
let playerId   = '';
// Auth token to sign client inputs (HMAC of gameId:playerId)
let authToken  = '';
let lastInput: 'move_up' | 'move_down' | 'stop' | null = null;
let pollTimer: number | undefined;

/* -------------------- Rendering -------------------- */
function draw(state: any) {
  if (!ctx || !canvas)
      return;
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  // Show countdown before game starts
  if (state.countdown && state.countdown > 0) {
    const prevAlign = ctx.textAlign;
    const prevBaseline = ctx.textBaseline;
    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Starting in ${state.countdown}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.textAlign = prevAlign;
    ctx.textBaseline = prevBaseline;
    return;
  }
  // Draw ball
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  // Draw paddles

  if (Array.isArray(state.bonusBalls))
    {
      state.bonusBalls.forEach((bonus: any) =>
      {
        const img = images[bonus.type];
        if (img?.complete)
          ctx.drawImage(img, bonus.x - BBALL_R, bonus.y - BBALL_R, BBALL_R * 2, BBALL_R * 2);
      });
    }

  state.players.forEach((player: any) =>
  {
    const x = player.side === 'left' ? 0 : GAME_WIDTH - PADDLE_W;
    if (player.power.includes("s"))
    {
      ctx.fillStyle = 'gold';
      ctx.fillRect(x, 0, player.paddle.w, GAME_HEIGHT);
    }
    ctx.fillStyle = 'white';
    let i = player.power.length - 1;
    while (i >= 0 && (player.power[i] === "s" || player.power[i] === "f"))
      i--;

    if (player.power[i] === "i")
      ctx.fillStyle = 'purple';
    else if (player.power[i] === "v")
      ctx.fillStyle = 'blue';
    else if (player.power[i] === "b")
      ctx.fillStyle = 'red';
    ctx.fillRect(x, player.paddle.y, player.paddle.w, player.paddle.h);
  });

  state.phantomBalls?.forEach((ball: any) =>
  {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  });


  // Draw scores
  ctx.fillStyle = 'white';
  ctx.font = '20px sans-serif';
  ctx.fillText(state.players[0].score, GAME_WIDTH / 4, 20);
  ctx.fillText(state.players[1].score, (GAME_WIDTH * 3) / 4, 20);
  // Draw elapsed time (timer)
  if (state.timer != null) {
    // Display at top center
    ctx.fillStyle = 'white';
    // Use a slightly smaller font for timer
    ctx.font = '16px sans-serif';
    // Center text
    ctx.textAlign = 'center';
    // Convert frame count to total elapsed seconds (step dt=1/60)
    const totalSeconds = Math.floor(state.timer / 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    // Format as MM:SS
    const paddedSeconds = seconds.toString().padStart(2, '0');
    ctx.fillText(`Time: ${minutes}:${paddedSeconds}`, GAME_WIDTH / 2, 40);
    // Restore default alignment
    ctx.textAlign = 'left';
  }
}

/* -------------------- Input handling -------------------- */
function sendInput(type: 'move_up' | 'move_down' | 'stop') {
  if (!gameId || !playerId || type === lastInput) return;
  lastInput = type;
  fetch(`/api/game/${gameId}/input`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ playerId, type, ts: Date.now(), token: authToken })
  }).catch(console.error);
}

/**
 * Send a forfeit input to server to end the game
 */
function sendForfeit() {
  if (!gameId || !playerId) return;
  fetch(`/api/game/${gameId}/input`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ playerId, type: 'forfeit', ts: Date.now(), token: authToken })
  }).catch(console.error);
}

// Handle Forfeit button click
forfeitBtn!.addEventListener('click', (e) => {
  e.preventDefault();
  sendForfeit();
  // disable to prevent double click
  forfeitBtn!.disabled = true;
});

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp')   sendInput('move_up');
  if (e.key === 'ArrowDown') sendInput('move_down');
}
function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') sendInput('stop');
}

/* -------------------- Polling (target ~60 FPS) -------------------- */
// Poll server every ~16ms (≈60 frames per second)
const POLL_MS = 8;

async function fetchAndDraw() {
  try {
    const res = await fetch(`/api/game/${gameId}/state`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const state = await res.json();
    draw(state);

    if (state.isGameOver && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = undefined;
      lastInput = null;

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {/* ignore */});
      }

      resultPre!.classList.remove('hidden');
      resultPre!.textContent = `Game Over — winner: ${state.winner}`;
      hero!.classList.remove('hidden');
      canvas.classList.add('hidden');
      togglePlayButtons(false);
      // Hide Forfeit and share-ID when game ends
      forfeitBtn!.classList.add('hidden');
      shareDiv!.classList.add('hidden');
      // Clear stored reconnect data
      localStorage.removeItem('gameId');
      localStorage.removeItem('playerId');
      localStorage.removeItem('authToken');
      localStorage.removeItem('mode');
      localStorage.removeItem('difficulty');
    }
  } catch (err) {
    console.error('[fetchAndDraw]', err);
  }
}

/* -------------------- Game start -------------------- */
type GameMode = 'ai' | 'pvp' | 'tournament';

async function startGame(mode: GameMode, difficulty?: string) {
  await Promise.all(Object.entries(imagePaths).map(([type, path]) => loadImage(type, path)));
  togglePlayButtons(true);
  hero!.classList.add('hidden');
  resultPre!.classList.add('hidden');
  canvas.classList.remove('hidden');
    // Resize canvas to fit available viewport under header
    const headerElem = document.getElementById('top-bar');
    if (headerElem) {
      const headerHeight = headerElem.clientHeight;
      // Maximum available height below header
      const availH = window.innerHeight - headerHeight;
      // Compute resize scale (only shrink, never enlarge)
      const scaleX = window.innerWidth / GAME_WIDTH;
      const scaleY = availH / GAME_HEIGHT;
      // Allow scaling up or down to fit viewport
      const scale = Math.min(scaleX, scaleY);
      // Clear any previous transform
      canvas.style.transform = '';
      canvas.style.transformOrigin = '';
      // Apply CSS width/height to shrink canvas display
      canvas.style.width = `${GAME_WIDTH * scale}px`;
      canvas.style.height = `${GAME_HEIGHT * scale}px`;
    }
  canvas.focus();
  lastInput = null;

  try {
    // Include custom mode preference
    const body = { mode, difficulty, isCustomOn: customToggle!.checked };
    const res  = await fetch('/api/game', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(body)
    });
    const data = await res.json();
    gameId    = data.gameId;
    playerId  = data.playerId;
    authToken = data.token;
    // persist game session for reconnect and update URL
    localStorage.setItem('gameId', gameId);
    localStorage.setItem('playerId', playerId);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('mode', mode);
    if (difficulty) localStorage.setItem('difficulty', difficulty);
    history.pushState({ view: 'game', gameId }, '', `#game/${gameId}`);
    // Show or hide shareable game ID for PvP games
    if (mode === 'pvp') {
      shareDiv!.classList.remove('hidden');
      gameIdInput!.value = gameId;
    } else {
      shareDiv!.classList.add('hidden');
    }

    await fetchAndDraw();
    pollTimer = window.setInterval(fetchAndDraw, POLL_MS);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    // Show Forfeit button during active game
    forfeitBtn!.classList.remove('hidden');
    forfeitBtn!.disabled = false;

  } catch (err) {
    console.error('[startGame]', err);
    togglePlayButtons(false);
  }
}

/* -------------------- Helpers -------------------- */
function togglePlayButtons(disabled: boolean) {
  playAIBtn!.disabled    = disabled;
  playPVPBtn!.disabled   = disabled;
  playTournBtn!.disabled = disabled;
  loginBtn!.disabled     = disabled;
}

/* -------------------- UI events -------------------- */
// Open login modal
loginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // open login modal and push history entry
  history.pushState({ view: 'login' }, '', '#login');
  loginModal!.classList.remove('hidden');
});

// Close login modal
loginModalCloseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // close login modal via back navigation
  history.back();
});

// Handle login via form
// Handle login via form
loginModalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = loginEmailInput!.value;
  const password = loginPasswordInput!.value;
  try {
    const res = await fetch('/api/auth/login', {
      method : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ email, password })
    });
    if (res.ok) {
      // Mark as logged in and store credentials
      localStorage.setItem('loggedIn', 'true');
      localStorage.setItem('authMethod', 'password');
      localStorage.setItem('userEmail', email);  // store email for profile lookup
      window.location.reload();
    } else {
      alert('Login failed');
    }
  } catch (err) {
    console.error(err);
    alert('Login error');
  }
});

// Handle Google OAuth login
googleLoginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // Mark login method as Google OAuth
  localStorage.setItem('authMethod', 'google');
  window.location.href = '/api/auth/login/google';
});
// Handle guest login button (not submitting form)
guestLoginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // TODO: implement guest login flow (e.g., fetch('/api/login/guest')...)
  console.warn('Guest login not implemented');
  // Treat as guest logged in (no effect on Tournament button)
  localStorage.setItem('loggedIn', 'true');
  localStorage.setItem('username', 'Guest');
  updateAuthView();
});

// Close login modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !loginModal!.classList.contains('hidden')) {
    history.back();
  }
});

// Close login modal on backdrop click
loginModal!.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    history.back();
  }
});
// -------------------- Sign Up Modal Setup --------------------
// Elements
const signupBtn             = document.getElementById('signup-btn') as HTMLButtonElement | null;
const signupModal           = document.getElementById('signup-modal') as HTMLElement | null;
const signupModalForm       = document.getElementById('signup-modal-form') as HTMLFormElement | null;
const signupModalCloseBtn   = document.getElementById('signup-modal-close') as HTMLButtonElement | null;
const signupCancelBtn       = document.getElementById('signup-cancel-btn') as HTMLButtonElement | null;
const signupEmailInput      = document.getElementById('signup-email') as HTMLInputElement | null;
const signupNameInput       = document.getElementById('signup-name') as HTMLInputElement | null;
const signupPasswordInput   = document.getElementById('signup-password') as HTMLInputElement | null;
const signupPassFeedback    = document.getElementById('signup-pass-feedback') as HTMLDivElement | null;
const signupConfirmInput    = document.getElementById('signup-confirm') as HTMLInputElement | null;
if (!signupBtn || !signupModal || !signupModalForm || !signupModalCloseBtn || !signupCancelBtn || !signupEmailInput || !signupNameInput || !signupPasswordInput || !signupPassFeedback || !signupConfirmInput) {
  throw new Error('Missing signup modal elements');
}
// Google OAuth sign-up button
const googleSignupBtn = document.getElementById('google-signup-btn') as HTMLButtonElement | null;
if (!googleSignupBtn) throw new Error('Missing Google signup button');
googleSignupBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // Mark signup/login method as Google OAuth
  localStorage.setItem('authMethod', 'google');
  window.location.href = '/api/auth/login/google';
});
// Live password validation feedback
signupPasswordInput.addEventListener('input', () => {
  const pwd = signupPasswordInput!.value;
  const lengthOk = pwd.length >= 8;
  const digitOk = /\d/.test(pwd);
  const specialOk = /[!@#$%^&*]/.test(pwd);
  const uppercaseOk = /[A-Z]/.test(pwd);
  signupPassFeedback!.textContent =
    `Length: ${pwd.length} (${lengthOk ? '✓' : '✘'}), ` +
    `Digit: ${digitOk ? '✓' : '✘'}, ` +
    `Special: ${specialOk ? '✓' : '✘'}, ` +
    `Uppercase: ${uppercaseOk ? '✓' : '✘'}`;
});
// Setup auth view toggles
const authUser              = document.getElementById('auth-user') as HTMLElement | null;
const authGuest             = document.getElementById('auth-guest') as HTMLElement | null;
const logoutBtn             = document.getElementById('logout-btn') as HTMLButtonElement | null;
const userGreeting          = document.getElementById('user-greeting') as HTMLElement | null;
if (!authUser || !authGuest || !logoutBtn || !userGreeting) throw new Error('Missing auth containers');

// Update auth UI based on login state
function updateAuthView() {
  const loggedIn = localStorage.getItem('loggedIn') === 'true';
  if (loggedIn) {
    authUser!.classList.remove('hidden');
    authGuest!.classList.add('hidden');
    userGreeting!.textContent = localStorage.getItem('username') || 'Player';
  } else {
    authUser!.classList.add('hidden');
    authGuest!.classList.remove('hidden');
  }
}
// Logout handler: call server to clear cookie, then update UI
logoutBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await fetch('/api/auth/logout', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch (err) {
    console.error('Logout request failed', err);
  }
  localStorage.removeItem('loggedIn');
  localStorage.removeItem('username');
  // Clear stored authentication method
  localStorage.removeItem('authMethod');
  updateAuthView();
});
// Initialize auth view by checking server session
// --------------------------------------------------------------------
// Initialize authentication state, or trigger 2FA when required
async function initializeAuth() {
  try {
    const res = await fetch('/api/auth/status', { credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      // Authenticated: set flags
      localStorage.setItem('loggedIn', 'true');
      if (data.name) localStorage.setItem('username', data.name);
      // twofaEnabled: default false for original backend
      localStorage.setItem('twofaEnabled', data.twofaEnabled === true ? 'true' : 'false');
    } else {
      // Not authenticated or 2FA required
      if (res.status === 403 && data.error === 'Two-factor authentication required') {
        show2faLogin();
      }
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('username');
      localStorage.removeItem('twofaEnabled');
    }
  } catch (err) {
    console.error('Auth status check failed', err);
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('twofaEnabled');
  }
  updateAuthView();
  // Fetch public profile for greeting
  if (localStorage.getItem('loggedIn') === 'true') {
    const email = localStorage.getItem('userEmail');
    if (email) {
      try {
        const res = await fetch(`/api/user/search/${encodeURIComponent(email)}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json() as { success: boolean; msg: string; profile: { name: string; tag: number; } | null };
          if (data.success && data.profile) {
            userGreeting!.textContent = `${data.profile.name}`;
          }
        }
      } catch (err) {
        console.error('Greeting profile fetch failed:', err);
      }
    }
  }
}
// Initialize authentication and then update friends badge
initializeAuth().then(() => updateFriendsBadge()).catch(console.error);
// ─── User Search Suggestions ─────────────────────────────────
const searchInput = document.getElementById('search-user') as HTMLInputElement | null;
const suggestionsList = document.getElementById('search-suggestions') as HTMLUListElement | null;
if (searchInput && suggestionsList) {
  let suggestTimer: number;
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim();
    window.clearTimeout(suggestTimer);
    if (!term) {
      suggestionsList.innerHTML = '';
      suggestionsList.classList.add('hidden');
      return;
    }
    suggestTimer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/suggest/${encodeURIComponent(term)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { success: boolean; msg: string; suggestions: { id: number; name: string }[] };
        suggestionsList.innerHTML = '';
        if (data.success && Array.isArray(data.suggestions)) {
          data.suggestions.forEach(u => {
            const li = document.createElement('li');
            li.textContent = u.name;
            li.className = 'px-2 py-1 hover:bg-gray-600 cursor-pointer';
            li.addEventListener('click', async () => {
              suggestionsList.classList.add('hidden');
              searchInput.value = u.name;
              try {
                const res2 = await fetch(`/api/user/search/${u.id}`, { credentials: 'include' });
                const data2 = await res2.json() as { success: boolean; msg: string; profile: { id: number; name: string; tag: number; email: string; avatar: string | null } | null };
                if (!res2.ok || !data2.success || !data2.profile) {
                  alert(data2.msg || 'User not found');
                  return;
                }
                const user = data2.profile;
                if (publicProfileModal && publicProfileName && publicProfileTag && publicProfileEmail && publicProfileAvatar && publicProfileAddBtn) {
                  // Remember which user we're viewing
                  currentProfileId = user.id;
                  publicProfileName.textContent = user.name;
                  publicProfileTag.textContent = user.tag.toString();
                  publicProfileEmail.textContent = user.email;
                  if (user.avatar) {
                    publicProfileAvatar.src = user.avatar;
                    publicProfileAvatar.classList.remove('hidden');
                  } else {
                    publicProfileAvatar.classList.add('hidden');
                  }
                  publicProfileModal.classList.remove('hidden');
                }
              } catch (err) {
                console.error('Fetch public profile failed:', err);
                alert('Failed to load user profile');
              }
            });
            suggestionsList.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.textContent = data.msg || 'No suggestions';
          li.className = 'px-2 py-1 text-gray-400';
          suggestionsList.appendChild(li);
        }
        suggestionsList.classList.remove('hidden');
      } catch (err) {
        console.error('Suggest fetch error:', err);
      }
    }, 300);
  });
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target !== searchInput && !suggestionsList.contains(e.target as Node)) {
      suggestionsList.classList.add('hidden');
    }
  });
} else {
  console.warn('Search input or suggestions list not found');
}
// ─── Public Profile Modal Logic ─────────────────────────────────
// Elements
const publicProfileModal = document.getElementById('public-profile-modal') as HTMLElement | null;
const publicProfileClose = document.getElementById('public-profile-close') as HTMLButtonElement | null;
const publicProfileName = document.getElementById('public-profile-name') as HTMLElement | null;
const publicProfileTag = document.getElementById('public-profile-tag') as HTMLElement | null;
const publicProfileEmail = document.getElementById('public-profile-email') as HTMLElement | null;
const publicProfileAvatar = document.getElementById('public-profile-avatar') as HTMLImageElement | null;
const publicProfileAddBtn = document.getElementById('public-profile-add-btn') as HTMLButtonElement | null;
// Currently viewed user's ID for friend requests
let currentProfileId: number | null = null;
// ─── Tournament Dashboard Modal Logic ─────────────────────────────────
const tournamentModal = document.getElementById('tournament-modal') as HTMLElement | null;
const tournamentModalClose = document.getElementById('tournament-modal-close') as HTMLButtonElement | null;
const tournamentTableBody = document.getElementById('tournament-table-body') as HTMLTableSectionElement | null;
// Close handlers for tournament modal
if (tournamentModal && tournamentModalClose) {
  tournamentModalClose.addEventListener('click', () => tournamentModal.classList.add('hidden'));
  tournamentModal.addEventListener('click', (e) => {
    if (e.target === tournamentModal) tournamentModal.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tournamentModal.classList.contains('hidden')) {
      tournamentModal.classList.add('hidden');
    }
  });
}
// Close handlers
if (publicProfileModal && publicProfileClose) {
  publicProfileClose.addEventListener('click', () => publicProfileModal.classList.add('hidden'));
  publicProfileModal.addEventListener('click', (e) => {
    if (e.target === publicProfileModal) publicProfileModal.classList.add('hidden');
  });
  // Add Friend button handler
  if (publicProfileAddBtn) {
    publicProfileAddBtn.addEventListener('click', async () => {
      if (!currentProfileId) return;
      try {
        const res = await fetch(`/api/user/friends/requests/${currentProfileId}`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok && data.success) {
          publicProfileAddBtn.disabled = true;
          publicProfileAddBtn.textContent = 'Request Sent';
        } else {
          alert(data.error || data.msg || 'Failed to send friend request');
        }
      } catch (err) {
        console.error('Send friend request error:', err);
        alert('Error sending friend request');
      }
    });
  }
}

// ─── Friends Modal Logic ───────────────────────────────────────────
const friendsBtn = document.getElementById('friends-btn') as HTMLButtonElement | null;
const friendsModal = document.getElementById('friends-modal') as HTMLElement | null;
const friendsModalClose = document.getElementById('friends-modal-close') as HTMLButtonElement | null;
const friendsList = document.getElementById('friends-list') as HTMLUListElement | null;
const friendRequestsList = document.getElementById('friend-requests-list') as HTMLUListElement | null;
// Notification badge for pending friend requests
const friendsBadge = document.getElementById('friends-badge') as HTMLElement | null;
// Function to fetch and update pending friend requests count badge
async function updateFriendsBadge() {
  if (!friendsBadge) return;
  try {
    const res = await fetch('/api/user/receivedFriendRequests', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json() as { id: number; name: string }[];
      const count = data.length;
      if (count > 0) {
        friendsBadge.textContent = count.toString();
        friendsBadge.classList.remove('hidden');
      } else {
        friendsBadge.classList.add('hidden');
      }
    } else {
      friendsBadge.classList.add('hidden');
    }
  } catch (err) {
    console.error('Failed to update friends badge', err);
  }
}
if (friendsBtn && friendsModal && friendsModalClose && friendsList && friendRequestsList) {
  friendsBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    friendsList.innerHTML = '';
    friendRequestsList.innerHTML = '';
    try {
      const resFriends = await fetch('/api/user/friends', { credentials: 'include' });
      if (resFriends.ok) {
        const data = await resFriends.json() as { id: number; name: string }[];
        data.forEach(f => {
          const li = document.createElement('li');
          li.textContent = f.name;
          li.className = 'px-2 py-1 bg-gray-700 rounded';
          friendsList.appendChild(li);
        });
      }
    } catch (err) {
      console.error('Fetch friends failed:', err);
    }
    try {
      const resReq = await fetch('/api/user/receivedFriendRequests', { credentials: 'include' });
      if (resReq.ok) {
        const data = await resReq.json() as { id: number; name: string }[];
        data.forEach(r => {
          const li = document.createElement('li');
          li.className = 'flex items-center justify-between px-2 py-1 bg-gray-700 rounded';
          const nameSpan = document.createElement('span');
          nameSpan.textContent = r.name;
          // Accept button
          const acceptBtn = document.createElement('button');
          acceptBtn.textContent = 'Accept';
          acceptBtn.className = 'px-2 py-1 bg-green-500 rounded text-white text-sm';
          acceptBtn.addEventListener('click', async () => {
            try {
              const res = await fetch(`/api/user/friends/requests/${r.id}`, {
                method: 'PUT',
                credentials: 'include'
              });
              const resp = await res.json();
              if (res.ok && resp.success) {
                li.remove();
                updateFriendsBadge();
              } else {
                alert(resp.error || resp.msg || 'Failed to accept friend request');
              }
            } catch (err) {
              console.error('Accept friend request error:', err);
              alert('Error accepting friend request');
            }
          });
          // Reject button
          const rejectBtn = document.createElement('button');
          rejectBtn.textContent = 'Reject';
          rejectBtn.className = 'px-2 py-1 bg-red-500 rounded text-white text-sm';
          rejectBtn.addEventListener('click', async () => {
            try {
              const res = await fetch(`/api/user/friends/requests/${r.id}`, {
                method: 'DELETE',
                credentials: 'include'
              });
              const resp = await res.json();
              if (res.ok && resp.success) {
                li.remove();
                updateFriendsBadge();
              } else {
                alert(resp.error || resp.msg || 'Failed to reject friend request');
              }
            } catch (err) {
              console.error('Reject friend request error:', err);
              alert('Error rejecting friend request');
            }
          });
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'flex gap-2';
          actionsDiv.append(acceptBtn, rejectBtn);
          li.append(nameSpan, actionsDiv);
          friendRequestsList.appendChild(li);
        });
      }
    } catch (err) {
      console.error('Fetch friend requests failed:', err);
    }
    friendsModal.classList.remove('hidden');
  });
  friendsModalClose.addEventListener('click', () => friendsModal.classList.add('hidden'));
  friendsModal.addEventListener('click', (e) => {
    if (e.target === friendsModal) friendsModal.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && friendsModal && !friendsModal.classList.contains('hidden')) {
      friendsModal.classList.add('hidden');
    }
  });
} else {
  console.warn('Friends modal elements not found');
}

// Open Sign Up modal
signupBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // open signup modal and push history entry
  history.pushState({ view: 'signup' }, '', '#signup');
  signupModal!.classList.remove('hidden');
});
// Close Sign Up modal via close button or cancel button
// Close Sign Up modal via close button
signupModalCloseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  history.back();
});
// Close Sign Up modal via cancel button
signupCancelBtn.addEventListener('click', (e) => {
  e.preventDefault();
  history.back();
});
// Close Sign Up modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && signupModal && !signupModal.classList.contains('hidden')) {
    history.back();
  }
});
// Close Sign Up modal on backdrop click
signupModal.addEventListener('click', (e) => {
  if (e.target === signupModal) {
    history.back();
  }
});
// Handle Sign Up form submission (basic validation)
signupModalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = signupEmailInput!.value;
  const username = signupNameInput!.value;
  const password = signupPasswordInput!.value;
  const confirm = signupConfirmInput!.value;
  // Password complexity check
  const lengthOk = password.length >= 8;
  const digitOk = /\d/.test(password);
  const specialOk = /[!@#$%^&*]/.test(password);
  const uppercaseOk = /[A-Z]/.test(password);
  if (!lengthOk || !digitOk || !specialOk || !uppercaseOk) {
    alert('Password must be at least 8 characters and include a number, a special character, and an uppercase letter.');
    return;
  }
  if (password !== confirm) {
    alert('Passwords do not match');
    return;
  }
  // Call backend signup endpoint
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('loggedIn', 'true');
      localStorage.setItem('username', username);
      localStorage.setItem('userEmail', email);  // store email for profile lookup
      localStorage.setItem('authMethod', 'password');
      updateAuthView();
      signupModal!.classList.add('hidden');
    } else {
      alert(data.error || 'Sign up failed');
    }
  } catch (err) {
    console.error('Signup error:', err);
  alert('Sign up error');
  }
});

// ─── User Profile Modal ───────────────────────────────────────────
const profileBtn = document.getElementById('profile-btn') as HTMLButtonElement | null;
const profileModal = document.getElementById('profile-modal') as HTMLElement | null;
const profileModalCloseBtn = document.getElementById('profile-modal-close') as HTMLButtonElement | null;
const profileUsername = document.getElementById('profile-username') as HTMLElement | null;
const profileEmail = document.getElementById('profile-email') as HTMLElement | null;
const profile2FAStatus = document.getElementById('profile-2fa-status') as HTMLElement | null;
const profileSetup2FABtn = document.getElementById('profile-setup-2fa-btn') as HTMLButtonElement | null;
const profileDisable2FABtn = document.getElementById('profile-disable-2fa-btn') as HTMLButtonElement | null;
const profileNa2FABtn = document.getElementById('profile-na-2fa-btn') as HTMLButtonElement | null;
const profileChangePasswordBtn = document.getElementById('profile-change-password-btn') as HTMLButtonElement | null;
const profileId = document.getElementById('profile-id') as HTMLElement | null;
// Removed profileType, profileCreated, profileOnline as not needed
if (!profileBtn || !profileModal || !profileModalCloseBtn || !profileUsername || !profileEmail || !profileId || !profile2FAStatus || !profileSetup2FABtn || !profileDisable2FABtn || !profileNa2FABtn || !profileChangePasswordBtn) {
  throw new Error('Missing profile modal elements');
}
// Open Profile modal
profileBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  // open profile modal and push history entry
  history.pushState({ view: 'profile' }, '', '#profile');
  const email = localStorage.getItem('userEmail');
  if (email) {
    try {
      const res = await fetch(`/api/user/search/${encodeURIComponent(email)}`, { credentials: 'include' });
      const data = await res.json() as { success: boolean; msg: string; profile: { id: number; name: string; tag: number; email: string; avatar: string | null } | null };
      if (res.ok && data.success && data.profile) {
        const user = data.profile;
        profileUsername.textContent = user.name;
        profileEmail.textContent = user.email;
        profileId.textContent = user.id.toString();
        // TODO: add profile.tag and avatar if needed
      } else {
        console.warn('Profile lookup failed:', data.msg);
      }
    } catch (err) {
      console.error('Profile lookup error:', err);
    }
  }
  const authMethod = localStorage.getItem('authMethod');
  if (authMethod === 'google') {
    profile2FAStatus.textContent = 'N/A';
    profileSetup2FABtn.classList.add('hidden');
    profileDisable2FABtn.classList.add('hidden');
    profileNa2FABtn.classList.remove('hidden');
    profileModal.classList.remove('hidden');
    return;
  }
  // For non-Google users, fetch current 2FA enabled status
    try {
      // Fetch current authentication and 2FA enabled status
      const resp = await fetch('/api/auth/status', { credentials: 'include' });
      if (resp.ok) {
        const { twofaEnabled } = await resp.json();
        profile2FAStatus.textContent = twofaEnabled ? 'Enabled' : 'Disabled';
        if (twofaEnabled) {
          profileDisable2FABtn.classList.remove('hidden');
          profileSetup2FABtn.classList.add('hidden');
          profileNa2FABtn.classList.add('hidden');
        } else {
          profileSetup2FABtn.classList.remove('hidden');
          profileDisable2FABtn.classList.add('hidden');
          profileNa2FABtn.classList.add('hidden');
        }
      } else {
        // Fallback: unable to fetch status
        profile2FAStatus.textContent = 'Unknown';
        profileSetup2FABtn.classList.remove('hidden');
        profileDisable2FABtn.classList.add('hidden');
        profileNa2FABtn.classList.add('hidden');
      }
    } catch (err) {
      console.error('Error fetching auth status:', err);
      profile2FAStatus.textContent = 'Error';
      profileSetup2FABtn.classList.remove('hidden');
      profileDisable2FABtn.classList.add('hidden');
      profileNa2FABtn.classList.add('hidden');
    }
  profileModal.classList.remove('hidden');
});
// Close Profile modal via close button
profileModalCloseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  history.back();
});
// Close Profile modal on backdrop click
profileModal.addEventListener('click', (e) => {
  if (e.target === profileModal) {
    history.back();
  }
});
// Close Profile modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !profileModal.classList.contains('hidden')) {
    history.back();
  }
});
profileSetup2FABtn.addEventListener('click', (e) => {
  e.preventDefault();
  profileModal.classList.add('hidden');
  open2faSetupModal();
});
// Disable 2FA handler
profileDisable2FABtn.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch('/api/auth/2fa/delete', {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || '2FA successfully disabled');
      profile2FAStatus.textContent = 'Disabled';
      profileDisable2FABtn.classList.add('hidden');
      profileSetup2FABtn.classList.remove('hidden');
    } else {
      alert(data.error || 'Failed to disable 2FA');
    }
  } catch (err) {
    console.error('Disable 2FA error:', err);
    alert('Error disabling 2FA');
  }
});
// Change password modal controls
const changePasswordModal = document.getElementById('change-password-modal') as HTMLElement | null;
const changePasswordClose = document.getElementById('change-password-close') as HTMLButtonElement | null;
const changePasswordForm = document.getElementById('change-password-form') as HTMLFormElement | null;
const currentPasswordInput = document.getElementById('current-password') as HTMLInputElement | null;
const newPasswordInput = document.getElementById('new-password') as HTMLInputElement | null;
const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement | null;
if (!changePasswordModal || !changePasswordClose || !changePasswordForm || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
  throw new Error('Missing change-password modal elements');
}
profileChangePasswordBtn.addEventListener('click', (e) => {
  e.preventDefault();
  profileModal.classList.add('hidden');
  changePasswordModal.classList.remove('hidden');
});
// Close change-password modal
changePasswordClose.addEventListener('click', (e) => {
  e.preventDefault();
  changePasswordModal.classList.add('hidden');
});
changePasswordModal.addEventListener('click', (e) => {
  if (e.target === changePasswordModal) {
    changePasswordModal.classList.add('hidden');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !changePasswordModal.classList.contains('hidden')) {
    changePasswordModal.classList.add('hidden');
  }
});
// Handle change-password form submit
changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const current = currentPasswordInput.value.trim();
  const npass = newPasswordInput.value.trim();
  const cpass = confirmPasswordInput.value.trim();
  if (!current || !npass || !cpass) {
    alert('All fields are required');
    return;
  }
  if (npass !== cpass) {
    alert('New passwords do not match');
    return;
  }
  try {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: npass, confirmPassword: cpass })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Password changed successfully');
      changePasswordModal.classList.add('hidden');
    } else {
      alert(data.error || 'Failed to change password');
    }
  } catch (err) {
    console.error('Change password error:', err);
    alert('Error changing password');
  }
});

// ─── Two-Factor Authentication (2FA) Setup ───────────────────────────────────
const setup2faModal = document.getElementById('2fa-setup-modal') as HTMLElement | null;
const setup2faCloseBtn = document.getElementById('2fa-setup-close') as HTMLButtonElement | null;
const setup2faQr = document.getElementById('2fa-setup-qr') as HTMLImageElement | null;
const setup2faTestCodeDiv = document.getElementById('2fa-setup-testcode') as HTMLElement | null;
const setup2faForm = document.getElementById('2fa-setup-form') as HTMLFormElement | null;
const setup2faCodeInput = document.getElementById('2fa-setup-code') as HTMLInputElement | null;
if (!setup2faModal || !setup2faCloseBtn || !setup2faQr || !setup2faForm || !setup2faCodeInput) {
  throw new Error('Missing 2FA setup elements');
}
async function open2faSetupModal() {
  try {
    const res = await fetch('/api/auth/2fa/setup/ask', { method: 'GET', credentials: 'include' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to initiate 2FA setup');
      return;
    }
    const data = await res.json();
    setup2faQr.src = data.qrCode;
    // Show test code for easier verification (dev only)
    if (setup2faTestCodeDiv && data.testCode) {
      setup2faTestCodeDiv.textContent = `Test code: ${data.testCode}`;
      setup2faTestCodeDiv.classList.remove('hidden');
    }
    setup2faModal.classList.remove('hidden');
  } catch (err) {
    console.error('2FA setup ask error:', err);
    alert('Error initiating 2FA setup');
  }
}
// Close modal
setup2faCloseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  setup2faModal.classList.add('hidden');
});
// Close on backdrop click
setup2faModal.addEventListener('click', (e) => {
  if (e.target === setup2faModal) {
    setup2faModal.classList.add('hidden');
  }
});
// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !setup2faModal.classList.contains('hidden')) {
    setup2faModal.classList.add('hidden');
  }
});

// Handle 2FA setup verification submit
setup2faForm!.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = setup2faCodeInput!.value.trim();
  try {
    const res = await fetch('/api/auth/2fa/setup/submit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken: code }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || '2FA successfully enabled');
      setup2faModal!.classList.add('hidden');
      if (setup2faTestCodeDiv) {
        setup2faTestCodeDiv.classList.add('hidden');
      }
    } else {
      alert(data.error || '2FA setup verification failed');
    }
  } catch (err) {
    console.error('2FA setup submit error:', err);
    alert('Error verifying 2FA code');
  }
});

// --------------------------------------------------------------------
// Two-Factor Authentication (2FA) Login for existing sessions
const twofaLoginModal = document.getElementById('2fa-login-modal') as HTMLElement | null;
const twofaLoginClose = document.getElementById('2fa-login-close') as HTMLButtonElement | null;
const twofaLoginForm = document.getElementById('2fa-login-form') as HTMLFormElement | null;
const twofaLoginCodeInput = document.getElementById('2fa-login-code') as HTMLInputElement | null;
if (!twofaLoginModal || !twofaLoginClose || !twofaLoginForm || !twofaLoginCodeInput) {
  throw new Error('Missing 2FA login elements');
}
// Show the 2FA login modal
function show2faLogin() {
  twofaLoginModal.classList.remove('hidden');
}
// Close handlers
twofaLoginClose.addEventListener('click', e => { e.preventDefault(); twofaLoginModal.classList.add('hidden'); });
twofaLoginModal.addEventListener('click', e => { if (e.target === twofaLoginModal) twofaLoginModal.classList.add('hidden'); });
// Handle 2FA login submit
twofaLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = twofaLoginCodeInput.value.trim();
  try {
    console.log('2FA login: sending code', code);
    const res = await fetch('/api/auth/2fa/submit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken: code }),
    });
    const data = await res.json();
    console.log('2FA login response:', res.status, data);
    if (res.ok) {
      console.log('2FA login success, reloading');
      localStorage.setItem('loggedIn', 'true');
      window.location.reload();
    } else {
      console.warn('2FA login failed:', data.error);
      alert(data.error || '2FA verification failed');
    }
  } catch (err) {
    console.error('2FA login error:', err);
    alert('Error verifying 2FA login');
  }
});

playAIBtn.addEventListener('click', () => {
  diffSelect!.classList.toggle('hidden');   // montre / cache le select
  if (!diffSelect!.classList.contains('hidden')) return;

  // On vient de choisir la difficulté → on lance le jeu
  const difficulty = diffSelect!.value; // easy | medium | hard
  startGame('ai', difficulty);
});

// Show PvP create/join menu
playPVPBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // Hide difficulty selector
  diffSelect!.classList.add('hidden');
  // Disable other play buttons while choosing
  playAIBtn!.disabled = true;
  playTournBtn!.disabled = true;
  playPVPBtn!.disabled = true;
  // Show PvP menu
  pvpMenu!.classList.remove('hidden');
});

// PvP: Create Game (first player)
pvpCreateBtn!.addEventListener('click', (e) => {
  e.preventDefault();
  pvpMenu!.classList.add('hidden');
  // Start PvP as creator
  startGame('pvp');
});

// PvP: Show join input
pvpJoinBtn!.addEventListener('click', (e) => {
  e.preventDefault();
  pvpJoinInput!.classList.remove('hidden');
  pvpJoinConfirmBtn!.classList.remove('hidden');
});

// PvP: Confirm join existing game
pvpJoinConfirmBtn!.addEventListener('click', async (e) => {
  e.preventDefault();
  const joinId = pvpJoinInput!.value.trim();
  if (!joinId) {
    alert('Please enter a game ID to join');
    return;
  }
  try {
    const res = await fetch(`/api/game/${joinId}/join`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to join game');
      return;
    }
    // Got participant slot
    gameId    = data.gameId;
    playerId  = data.playerId;
    authToken = data.token;
    // persist game session for reconnect and update URL
    localStorage.setItem('gameId', gameId);
    localStorage.setItem('playerId', playerId);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('mode', 'pvp');
    history.pushState({ view: 'game', gameId }, '', `#game/${gameId}`);
    // Hide menu and join inputs
    pvpMenu!.classList.add('hidden');
    pvpJoinInput!.classList.add('hidden');
    pvpJoinConfirmBtn!.classList.add('hidden');
    // Prepare UI for active game
    togglePlayButtons(true);
    hero!.classList.add('hidden');
    resultPre!.classList.add('hidden');
    // Hide share-ID box (only creator needs it)
    shareDiv!.classList.add('hidden');
    // Show game canvas
    canvas.classList.remove('hidden');
    // Resize canvas to fit available viewport under header
    const headerElem = document.getElementById('top-bar');
    if (headerElem) {
      const headerHeight = headerElem.clientHeight;
      const availH = window.innerHeight - headerHeight;
      const scaleX = window.innerWidth / GAME_WIDTH;
      const scaleY = availH / GAME_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      canvas.style.transform = '';
      canvas.style.transformOrigin = '';
      canvas.style.width = `${GAME_WIDTH * scale}px`;
      canvas.style.height = `${GAME_HEIGHT * scale}px`;
    }
    canvas.focus();
    lastInput = null;
    // Show Forfeit button
    forfeitBtn!.classList.remove('hidden');
    forfeitBtn!.disabled = false;
    // Start polling & input
    await fetchAndDraw();
    pollTimer = window.setInterval(fetchAndDraw, POLL_MS);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
  } catch (err) {
    console.error('[joinGame]', err);
    alert('Error joining game');
  }
});

// Open Tournament Dashboard modal on click
playTournBtn!.addEventListener('click', async (e) => {
  e.preventDefault();
  diffSelect!.classList.add('hidden');
  // Fetch tournaments list
  if (tournamentTableBody) {
    tournamentTableBody.innerHTML = '';
    try {
      const res = await fetch('/api/tournaments/tournaments', { credentials: 'include' });
      if (res.ok) {
        // Load tournaments
        const data = await res.json() as Array<{ id:number; name:string; state:string; min_players:number; nbr_players:number; winner:string|null }>;
        data.forEach(t => {
          const tr = document.createElement('tr');
          tr.className = 'border-t border-gray-600';
          tr.innerHTML = `
            <td class="px-2 py-1">${t.id}</td>
            <td class="px-2 py-1">${t.name}</td>
            <td class="px-2 py-1">${t.state}</td>
            <td class="px-2 py-1">${t.min_players}</td>
            <td class="px-2 py-1">${t.nbr_players}</td>
            <td class="px-2 py-1">${t.winner || ''}</td>
          `;
          tournamentTableBody.appendChild(tr);
        });
      } else {
        console.error('Failed to load tournaments', await res.text());
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    }
    tournamentModal!.classList.remove('hidden');
  }
});

// ================== Reconnect on reload ==================
/**
 * Reconnect to an in-progress game if user reloads or reopens the URL
 */
async function reconnectGame(rejoinId: string) {
  const storedGameId = localStorage.getItem('gameId');
  const storedPlayerId = localStorage.getItem('playerId');
  const storedAuthToken = localStorage.getItem('authToken');
  const mode = localStorage.getItem('mode') as GameMode | null;
  if (storedGameId === rejoinId && storedPlayerId && storedAuthToken) {
    gameId = storedGameId;
    playerId = storedPlayerId;
    authToken = storedAuthToken;
    // Set up UI like startGame
    togglePlayButtons(true);
    // Show Forfeit button during active game
    forfeitBtn!.classList.remove('hidden');
    forfeitBtn!.disabled = false;
    hero!.classList.add('hidden');
    resultPre!.classList.add('hidden');
    canvas.classList.remove('hidden');
    // Show shareable ID for PvP
    if (mode === 'pvp') {
      shareDiv!.classList.remove('hidden');
      gameIdInput!.value = gameId;
    } else {
      shareDiv!.classList.add('hidden');
    }
    canvas.focus();
    lastInput = null;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    await fetchAndDraw();
    pollTimer = window.setInterval(fetchAndDraw, POLL_MS);
  }
}

// -----------------------------------
// SPA history routing and initial reconnect
// Initialize SPA state based on URL hash
const currentHash = location.hash;
let initialState: any = { view: 'home' };
if (currentHash === '#login') {
  initialState = { view: 'login' };
} else if (currentHash === '#signup') {
  initialState = { view: 'signup' };
} else if (currentHash === '#profile') {
  initialState = { view: 'profile' };
} else {
  const m = currentHash.match(/^#game\/(.+)$/);
  if (m) {
    initialState = { view: 'game', gameId: m[1] };
  }
}
// Replace history entry so state matches URL (including hash)
history.replaceState(initialState, '', location.pathname + currentHash);
// Route initial UI state (modals or reconnect)
router(initialState);
if (initialState.view === 'game' && initialState.gameId) {
  reconnectGame(initialState.gameId);
}


/**
 * Show or hide modals based on history state
 */
function router(state: any) {
  // hide all top-level modals
  loginModal!.classList.add('hidden');
  signupModal!.classList.add('hidden');
  profileModal!.classList.add('hidden');
  // route
  if (!state || state.view === 'home') {
    // nothing to show
  } else if (state.view === 'login') {
    loginModal!.classList.remove('hidden');
  } else if (state.view === 'signup') {
    signupModal!.classList.remove('hidden');
  } else if (state.view === 'profile') {
    profileModal!.classList.remove('hidden');
  }
}

// Handle back/forward navigation
window.addEventListener('popstate', (e) => {
  router(e.state);
});
