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

if (!loginBtn || !playAIBtn || !playPVPBtn || !playTournBtn ||
    !diffSelect || !customToggle || !canvas || !hero || !resultPre) {
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

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp')   sendInput('move_up');
  if (e.key === 'ArrowDown') sendInput('move_down');
}
function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') sendInput('stop');
}

/* -------------------- Polling (target ~60 FPS) -------------------- */
// Poll server every ~16ms (≈60 frames per second)
const POLL_MS = 16;

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

    await fetchAndDraw();
    pollTimer = window.setInterval(fetchAndDraw, POLL_MS);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

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
  loginModal!.classList.remove('hidden');
});

// Close login modal
loginModalCloseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  loginModal!.classList.add('hidden');
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
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ email, password })
    });
    if (res.ok) {
      // Mark as logged in and reload
      localStorage.setItem('loggedIn', 'true');
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

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !loginModal!.classList.contains('hidden')) {
    loginModal!.classList.add('hidden');
  }
});

// Close modal when clicking outside the modal content
loginModal!.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    loginModal!.classList.add('hidden');
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
// Live password validation feedback
signupPasswordInput.addEventListener('input', () => {
  const pwd = signupPasswordInput!.value;
  const lengthOk = pwd.length >= 8;
  const digitOk = /\d/.test(pwd);
  const specialOk = /[!@#$%^&*]/.test(pwd);
  signupPassFeedback!.textContent = `Length: ${pwd.length} (${lengthOk ? '✓' : '✘'}), Digit: ${digitOk ? '✓' : '✘'}, Special: ${specialOk ? '✓' : '✘'}`;
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
// Logout handler
logoutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('loggedIn');
  localStorage.removeItem('username');
  updateAuthView();
});
// Initialize auth view
updateAuthView();

// Open Sign Up modal
signupBtn.addEventListener('click', (e) => {
  e.preventDefault();
  signupModal!.classList.remove('hidden');
});
// Close Sign Up modal via close button or cancel button
signupModalCloseBtn.addEventListener('click', (e) => {
  e.preventDefault();
  signupModal!.classList.add('hidden');
});
signupCancelBtn.addEventListener('click', (e) => {
  e.preventDefault();
  signupModal!.classList.add('hidden');
});
// Close Sign Up modal on Esc key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && signupModal && !signupModal.classList.contains('hidden')) {
    signupModal.classList.add('hidden');
  }
});
// Close Sign Up modal on backdrop click
signupModal.addEventListener('click', (e) => {
  if (e.target === signupModal) {
    signupModal!.classList.add('hidden');
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
  if (!lengthOk || !digitOk || !specialOk) {
    alert('Password must be at least 8 characters and include a number and special character.');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('loggedIn', 'true');
      localStorage.setItem('username', username);
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

playAIBtn.addEventListener('click', () => {
  diffSelect!.classList.toggle('hidden');   // montre / cache le select
  if (!diffSelect!.classList.contains('hidden')) return;

  // On vient de choisir la difficulté → on lance le jeu
  const difficulty = diffSelect!.value; // easy | medium | hard
  canvas.requestFullscreen?.().catch(() => {/* ignore */});
  startGame('ai', difficulty);
});

playPVPBtn.addEventListener('click', () => {
  diffSelect!.classList.add('hidden');
  canvas.requestFullscreen?.().catch(() => {/* ignore */});
  startGame('pvp');
});

playTournBtn.addEventListener('click', () => {
  diffSelect!.classList.add('hidden');
  canvas.requestFullscreen?.().catch(() => {/* ignore */});
  startGame('tournament');
});
