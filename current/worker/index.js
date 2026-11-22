const channel = 'menabu_bakery';
const feedKey = 'journal/telegram.json';
const freshFor = 10 * 60 * 1000;
const messageSelector = '.tgme_widget_message[data-post]';
const dateFormat = new Intl.DateTimeFormat('ru-RU', {day: 'numeric', month: 'long', timeZone: 'Europe/Moscow'});

function headline(message) {
  const entities = {amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' '};
  const text = message.caption.replace(/&(amp|quot|apos|lt|gt|nbsp|#\d+|#x[\da-f]+);/gi, (entity, name) => {
    if (name[0] !== '#') return entities[name.toLowerCase()];
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
  const line = text.split(/\r?\n/).map(part => part.replace(/\s+/g, ' ').trim()).find(part => /[\p{L}\p{N}]/u.test(part));
  if (line && line.length <= 76) return line;
  if (line) return (line.slice(0, 73).replace(/\s+\S*$/, '') || line.slice(0, 73)) + '…';
  const date = Date.parse(message.date);
  return Number.isFinite(date) ? 'Публикация от ' + dateFormat.format(date) : 'Публикация в Telegram';
}

async function telegramPosts() {
  const page = await fetch('https://t.me/s/' + channel, {
    headers: {Accept: 'text/html', 'Accept-Language': 'ru'},
    signal: AbortSignal.timeout(8000)
  });
  if (!page.ok) throw new Error('Telegram status ' + page.status);
  const messages = new Map();
  let current;
  const caption = {
    text(chunk) { if (current && current.caption.length < 2000) current.caption += chunk.text; }
  };
  const newline = {element() { if (current) current.caption += '\n'; }};
  const parser = new HTMLRewriter().on(messageSelector, {
    element(element) {
      const [name, number] = (element.getAttribute('data-post') || '').split('/');
      const id = Number(number);
      current = null;
      if (name === channel && Number.isSafeInteger(id) && id > 0) {
        current = {id, caption: '', date: ''};
        messages.set(id, current);
      }
      element.onEndTag(() => { current = null; });
    }
  });
  for (const selector of ['.tgme_widget_message_text', '.tgme_widget_message_poll_question']) {
    parser.on(messageSelector + ' ' + selector, caption);
    parser.on(messageSelector + ' ' + selector + ' br', newline);
  }
  parser.on(messageSelector + ' .tgme_widget_message_date time[datetime]', {
    element(element) { if (current) current.date = element.getAttribute('datetime'); }
  });
  await parser.transform(page).arrayBuffer();
  if (!messages.size) throw new Error('Telegram returned no channel messages');
  return [...messages.values()].sort((a, b) => b.id - a.id).slice(0, 2)
    .map(message => ({id: message.id, title: headline(message)}));
}

function feedResponse(data, stale = false) {
  return Response.json({...data, stale}, {headers: {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': stale ? 'public, max-age=30' : 'public, max-age=60'
  }});
}

async function publications(bucket) {
  const previous = await bucket.get(feedKey);
  const cached = previous ? await previous.json() : null;
  if (cached && Date.now() - Date.parse(cached.checkedAt) < freshFor) return feedResponse(cached);

  let posts;
  try {
    posts = await telegramPosts();
  } catch (error) {
    console.warn('Journal refresh:', error.message);
    if (cached) return feedResponse(cached, true);
    return Response.json({posts: [], stale: true}, {status: 503, headers: {
      'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Retry-After': '60'
    }});
  }

  const snapshot = {posts, checkedAt: new Date().toISOString()};
  const written = await bucket.put(feedKey, JSON.stringify(snapshot), {
    onlyIf: new Headers(previous ? {'If-Match': previous.httpEtag} : {'If-None-Match': '*'}),
    httpMetadata: {contentType: 'application/json'}
  });
  if (!written) {
    const newer = await bucket.get(feedKey);
    if (newer) return feedResponse(await newer.json());
  }
  return feedResponse(snapshot);
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/publications') return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return new Response(null, {status: 405, headers: {Allow: 'GET'}});
    return publications(env.BUCKET);
  }
};
