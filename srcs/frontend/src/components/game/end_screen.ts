import { fetchJSON } from '../../lib/api';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;

async function getUser(username: string) {
  if (username === 'AI' || username === 'Player 1' || username === 'Player 2') {
    return null;
  }
  try {
    const data = await fetchJSON<{ success: boolean; profile: any }>(`/api/user/search/${username}`);
    if (data.success) {
      return data.profile;
    }
  } catch (error) {
    console.error(`Failed to get user ${username}`, error);
  }
  return null;
}

export async function drawEndScreen(ctx: CanvasRenderingContext2D, state: any) {
  // Draw a semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const playerLeftName = state.players[0].id;
  const playerRightName = state.players[1].id;
  const playerLeftScore = state.players[0].score;
  const playerRightScore = state.players[1].score;

  const userLeft = await getUser(playerLeftName);
  const userRight = await getUser(playerRightName);

  const avatarLeft = userLeft ? userLeft.avatar : '/default_avatar.jpg';
  const avatarRight = userRight ? userRight.avatar : '/default_avatar.jpg';

  const imageLeft = new Image();
  imageLeft.src = avatarLeft;

  const imageRight = new Image();
  imageRight.src = avatarRight;

  const draw = () => {
    // Clear canvas before drawing
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const centerY = GAME_HEIGHT / 2 - 60; // Adjust vertical center to move content up

    // Draw avatars
    if (imageLeft.complete) {
      ctx.drawImage(imageLeft, GAME_WIDTH / 4 - 50, centerY - 100, 100, 100);
    }
    if (imageRight.complete) {
      ctx.drawImage(imageRight, (GAME_WIDTH * 3) / 4 - 50, centerY - 100, 100, 100);
    }

    // Draw scores
    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${playerLeftScore} - ${playerRightScore}`, GAME_WIDTH / 2, centerY - 25);

    // Draw names
    ctx.font = '24px sans-serif';
    ctx.fillText(playerLeftName, GAME_WIDTH / 4, centerY + 20);
    ctx.fillText(playerRightName, (GAME_WIDTH * 3) / 4, centerY + 20);
  };

  imageLeft.onload = draw;
  imageRight.onload = draw;

  // Initial draw in case images are already cached
  draw();
}