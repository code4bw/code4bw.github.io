(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('[data-theme-toggle]');
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  if (themeButton) themeButton.hidden = false;
  let savedTheme;
  try { savedTheme = localStorage.getItem('theme'); } catch { /* Storage is optional. */ }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeButton?.setAttribute('aria-pressed', String(theme === 'dark'));
    themeButton?.setAttribute('aria-label', theme === 'dark' ? '밝은 화면으로 전환' : '어두운 화면으로 전환');
  }
  applyTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : preference.matches ? 'dark' : 'light');
  themeButton?.addEventListener('click', () => {
    savedTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(savedTheme);
    try { localStorage.setItem('theme', savedTheme); } catch { /* Keep the session preference. */ }
  });
  preference.addEventListener('change', () => {
    if (savedTheme !== 'light' && savedTheme !== 'dark') applyTheme(preference.matches ? 'dark' : 'light');
  });

  const archive = document.querySelector('[data-archive]');
  if (!archive) return;
  const search = archive.querySelector('input[type="search"]');
  const entries = [...archive.querySelectorAll('[data-entry]')];
  const filters = [...archive.querySelectorAll('[data-filter]')];
  const status = archive.querySelector('[data-result-count]');
  const empty = archive.querySelector('[data-empty]');
  const featured = archive.querySelector('.featured');
  const params = new URLSearchParams(location.search);
  let category = params.get('category') || 'all';
  if (!filters.some(button => button.dataset.filter === category)) category = 'all';
  search.value = params.get('q') || '';
  archive.querySelector('[data-search-controls]').hidden = false;

  function update() {
    const words = search.value.trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
    if (featured) featured.hidden = words.length > 0 || category !== 'all';
    let count = 0;
    for (const entry of entries) {
      const text = entry.textContent.toLocaleLowerCase('ko');
      entry.hidden = !(category === 'all' || entry.dataset.category === category) || !words.every(word => text.includes(word));
      if (!entry.hidden) count++;
    }
    for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.filter === category));
    status.textContent = `${count}개의 기록`;
    empty.hidden = count > 0;
  }
  search.addEventListener('input', update);
  for (const filter of filters) filter.addEventListener('click', () => {
    category = filter.dataset.filter;
    update();
  });
  archive.querySelector('[data-reset]')?.addEventListener('click', () => {
    search.value = '';
    category = 'all';
    update();
    search.focus();
  });
  update();
})();
