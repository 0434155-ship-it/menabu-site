(() => {
  'use strict';
  const canonical = 'https://menabu-catalog-four.verak-cosmo.chatgpt.site';
  if (location.hostname === '0434155-ship-it.github.io') {
    location.replace(canonical + '/wholesale.html' + location.hash);
    return;
  }
  const byId = id => document.getElementById(id);
  const storageKey = 'menabu-partner-session';
  const initialNote = byId('gateNote').textContent;
  let token;
  let book;
  const rub = new Intl.NumberFormat('ru-RU');
  const normalize = text => text.toLocaleLowerCase('ru').replace(/ё/g, 'е');
  function node(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function lock(message = initialNote) {
    token = null;
    book = null;
    try { sessionStorage.removeItem(storageKey); } catch {}
    byId('list').replaceChildren();
    byId('category').length = 1;
    byId('findProduct').value = '';
    byId('pricebook').hidden = true;
    byId('gate').hidden = false;
    byId('retry').hidden = true;
    byId('gateNote').textContent = message;
  }
  function render() {
    if (!book) return;
    const query = normalize(byId('findProduct').value.trim());
    const category = byId('category').value;
    const fragment = document.createDocumentFragment();
    let shown = 0;
    for (const group of book.groups) {
      if (category && group.name !== category) continue;
      const items = group.items.filter(item => normalize([item.name, item.pack, item.grams].filter(Boolean).join(' ')).includes(query));
      if (!items.length) continue;
      shown += items.length;
      const section = document.createElement('section');
      section.className = 'collection';
      section.append(node('h2', group.name));
      const table = document.createElement('table');
      table.setAttribute('aria-label', group.name);
      const headings = table.createTHead().insertRow();
      for (const text of ['Изделие и фасовка', 'Вес', 'Опт, ₽/шт.']) {
        const th = node('th', text); th.scope = 'col'; headings.append(th);
      }
      const body = table.createTBody();
      for (const item of items) {
        const row = body.insertRow();
        const name = node('th', item.name); name.scope = 'row';
        if (item.pack) name.append(node('span', item.pack, 'detail'));
        if (item.note) name.append(node('span', item.note, 'detail'));
        row.append(name, node('td', item.grams == null ? '—' : rub.format(item.grams) + ' г'), node('td', rub.format(item.price) + ' ₽'));
      }
      section.append(table); fragment.append(section);
    }
    byId('list').replaceChildren(fragment);
    byId('resultCount').textContent = shown ? 'Позиций в каталоге · ' + shown : 'По вашему запросу ничего не найдено.';
  }
  async function open() {
    if (!token) return;
    const requestedToken = token;
    byId('gateNote').textContent = 'Открываем каталог…';
    byId('retry').hidden = true;
    try {
      const response = await fetch('/api/wholesale-catalog', {method: 'POST', headers: {Authorization: 'Bearer ' + token}, cache: 'no-store', credentials: 'same-origin'});
      if (token !== requestedToken) return;
      if (response.status === 403 || response.status === 401) {
        lock('Эта ссылка больше не действует. Напишите Вере, чтобы получить новую.');
        return;
      }
      if (!response.ok) throw new Error('catalog unavailable');
      const result = await response.json();
      if (token !== requestedToken) return;
      book = result;
      try { sessionStorage.setItem(storageKey, token); } catch {}
      for (const group of book.groups) byId('category').add(new Option(group.name, group.name));
      render();
      byId('pricebook').hidden = false;
      byId('gate').hidden = true;
    } catch {
      if (token !== requestedToken) return;
      byId('gateNote').textContent = 'Не удалось загрузить каталог. Проверьте соединение и попробуйте ещё раз.';
      byId('retry').hidden = false;
    }
  }
  function useInvitation() {
    const invitation = new URLSearchParams(location.hash.slice(1)).get('invite');
    if (invitation !== null) {
      history.replaceState(history.state, '', location.pathname + location.search);
      lock();
      token = invitation;
    } else {
      try { token = sessionStorage.getItem(storageKey); } catch {}
    }
    void open();
  }
  byId('findProduct').addEventListener('input', render);
  byId('category').addEventListener('change', render);
  byId('retry').addEventListener('click', open);
  byId('lockBook').addEventListener('click', () => { lock(); scrollTo(0, 0); });
  addEventListener('hashchange', useInvitation);
  useInvitation();
})();
