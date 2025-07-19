
import { navigate } from '../../lib/router';

// ─── User Search Suggestions ─────────────────────────────────
export function setupUserSearch() {
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
            const data = await res.json() as { success: boolean; msg: string; suggestions: { id: number; name: string; tag: number }[] };
            suggestionsList.innerHTML = '';
            if (data.success && Array.isArray(data.suggestions)) {
              data.suggestions.forEach(u => {
                const li = document.createElement('li');
                li.className = 'px-2 py-1 hover:bg-gray-600 cursor-pointer flex items-center';
                // Username text
                li.appendChild(document.createTextNode(u.name));
                // Inline tag in smaller grey font
                const tagSpan = document.createElement('span');
                tagSpan.className = 'text-gray-400 text-sm ml-1';
                tagSpan.textContent = `#${u.tag}`;
                li.appendChild(tagSpan);
                li.addEventListener('click', () => {
                    suggestionsList.classList.add('hidden');
                    searchInput.value = u.name;
                    navigate('publicProfile', { id: u.id });
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
}
