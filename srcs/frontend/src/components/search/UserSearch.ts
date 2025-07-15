// UserSearch: handles live search suggestions and profile fetch
import { fetchJSON } from '../../lib/api';
import { show, hide } from '../../lib/dom';

export function setupUserSearch() {
  const searchInput = document.getElementById('search-user') as HTMLInputElement | null;
  const suggestionsList = document.getElementById('search-suggestions') as HTMLUListElement | null;
  if (!searchInput || !suggestionsList) return;
  let suggestTimer: number;
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim();
    clearTimeout(suggestTimer);
    if (!term) {
      suggestionsList.innerHTML = '';
      hide(suggestionsList);
      return;
    }
    suggestTimer = window.setTimeout(async () => {
      try {
        const data = await fetchJSON<{ success: boolean; msg: string; suggestions: { id: number; name: string; tag: number }[] }>(
          `/api/user/suggest/${encodeURIComponent(term)}`
        );
        suggestionsList.innerHTML = '';
        if (data.success && Array.isArray(data.suggestions)) {
          data.suggestions.forEach((u) => {
            const li = document.createElement('li');
            li.className = 'px-2 py-1 hover:bg-gray-600 cursor-pointer flex items-center';
            li.appendChild(document.createTextNode(u.name));
            const tagSpan = document.createElement('span');
            tagSpan.className = 'text-gray-400 text-sm ml-1';
            tagSpan.textContent = `#${u.tag}`;
            li.appendChild(tagSpan);
            li.addEventListener('click', async () => {
              hide(suggestionsList);
              searchInput.value = u.name;
              try {
                const data2 = await fetchJSON<{ success: boolean; msg: string; profile: any }>(
                  `/api/user/search/${u.id}`,
                  { credentials: 'include' }
                );
                if (!data2.success || !data2.profile) {
                  alert(data2.msg || 'User not found');
                  return;
                }
                window.dispatchEvent(new CustomEvent('showPublicProfile', { detail: data2.profile }));
              } catch (err) {
                console.error(err);
              }
            });
            suggestionsList.appendChild(li);
          });
          show(suggestionsList);
        } else {
          hide(suggestionsList);
        }
      } catch (err) {
        console.error('[search]', err);
      }
    }, 300);
  });
  document.addEventListener('click', (e) => {
    if (!suggestionsList.contains(e.target as Node) && e.target !== searchInput) {
      hide(suggestionsList);
    }
  });
}