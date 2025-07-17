// Simple SPA router based on history API and hash
export type View = 'home' | 'login' | 'game' | 'tournament' | 'friends' | 'profile' | 'play-ai' | 'play-pvp' | 'change-password' | 'publicProfile' | 'signup' | 'setup-2fa';

type RouteHandler = (params?: any) => void;

const routes: Record<View, RouteHandler[]> = {
  home: [],
  login: [],
  game: [],
  tournament: [],
  friends: [],
  profile: [],
  'play-ai': [],
  'play-pvp': [],
  'change-password': [],
  publicProfile: [],
  signup: [],
  'setup-2fa': [],
};

export function onRoute(view: View, handler: RouteHandler) {
  routes[view].push(handler);
}

export function navigate(view: View, params?: any) {
  const url = params && params.id ? `#${view}/${params.id}` : `#${view}`;
  history.pushState({ view, params }, '', url);
  dispatch(view, params);
}

function dispatch(view: View, params?: any) {
  const handlers = routes[view] || [];
  handlers.forEach((h) => h(params));
}

window.addEventListener('popstate', (e) => {
  const state = e.state as { view: View; params?: any } | null;
  if (state) dispatch(state.view, state.params);
});