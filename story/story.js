(function () {
  const list = document.querySelector('#story-list');
  const postRoot = document.querySelector('#story-post');
  if (!list && !postRoot) return;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const formatDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value || '';
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  };

  const hrefFor = (post) => post.url || `post.html?id=${encodeURIComponent(post.id || '')}`;

  const renderList = (posts) => {
    const cards = posts.map((post) => {
      const card = element('article', 'story-card');
      const link = element('a');
      link.href = hrefFor(post);
      const time = element('time', null, formatDate(post.date));
      time.dateTime = post.date || '';
      const copy = element('div', 'story-card-copy');
      copy.append(element('h2', null, post.title || '(제목 없음)'));
      if (post.summary) copy.append(element('p', null, post.summary));
      if (Array.isArray(post.tags) && post.tags.length) {
        const tags = element('div', 'story-tags');
        post.tags.forEach((tag) => tags.append(element('span', 'story-tag', tag)));
        copy.append(tags);
      }
      link.append(time, copy, element('span', 'story-card-arrow', '↗'));
      card.append(link);
      return card;
    });
    list.replaceChildren(...cards);
  };

  const renderBody = (source) => {
    const root = element('div', 'post-body');
    String(source || '').replace(/\r\n/g, '\n').split(/\n\s*\n/).forEach((block) => {
      const value = block.trim();
      if (!value) return;
      const lines = value.split('\n');
      if (lines.every((line) => /^- /.test(line.trim()))) {
        const listNode = element('ul');
        lines.forEach((line) => listNode.append(element('li', null, line.trim().slice(2))));
        root.append(listNode);
      } else if (/^## /.test(value)) {
        root.append(element('h2', null, value.slice(3).trim()));
      } else {
        root.append(element('p', null, value));
      }
    });
    return root;
  };

  const setMeta = (post) => {
    const title = post.title || '이야기';
    const description = String(post.description || post.summary || '').slice(0, 160);
    const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(post.id || '')}`;
    document.title = `${title} | Katin`;
    const values = {
      'meta[name="description"]': description,
      'meta[name="author"]': post.author || '',
      'meta[property="og:title"]': title,
      'meta[property="og:description"]': description,
      'meta[property="og:url"]': url
    };
    Object.entries(values).forEach(([selector, value]) => document.querySelector(selector)?.setAttribute('content', value));
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
  };

  const renderPost = (posts) => {
    const id = new URLSearchParams(location.search).get('id');
    const index = posts.findIndex((post) => String(post.id) === id);
    if (index < 0) {
      const missing = element('div', 'post-not-found');
      missing.append(element('h1', null, '글을 찾을 수 없습니다'), element('p', null, '주소를 확인하거나 이야기 목록으로 돌아가 주세요.'));
      postRoot.replaceChildren(missing);
      return;
    }

    const post = posts[index];
    setMeta(post);
    const article = element('article', 'story-article');
    const header = element('header');
    const time = element('time', null, formatDate(post.date));
    time.dateTime = post.date || '';
    header.append(time, element('h1', null, post.title || '(제목 없음)'));
    if (post.author) header.append(element('p', 'post-meta', post.author));
    if (Array.isArray(post.tags) && post.tags.length) {
      const tags = element('div', 'story-tags');
      post.tags.forEach((tag) => tags.append(element('span', 'story-tag', tag)));
      header.append(tags);
    }
    article.append(header, element('hr', 'post-rule'), renderBody(post.body));

    if (Array.isArray(post.faq) && post.faq.length) {
      const faq = element('section', 'post-faq');
      faq.append(element('h2', null, '자주 묻는 질문'));
      post.faq.forEach((item) => {
        const details = element('details');
        details.append(element('summary', null, item.q), element('p', null, item.a));
        faq.append(details);
      });
      article.append(faq);
    }

    const older = posts[index + 1];
    const newer = posts[index - 1];
    if (older || newer) {
      const nav = element('nav', 'post-pagination');
      [['Older story', older], ['Newer story', newer]].forEach(([label, item]) => {
        if (!item) { nav.append(element('span')); return; }
        const link = element('a');
        link.href = hrefFor(item);
        link.append(element('p', 'post-direction', label), element('p', 'post-pagination-title', item.title));
        nav.append(link);
      });
      article.append(nav);
    }
    postRoot.replaceChildren(article);
  };

  fetch('posts.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((posts) => {
      const sorted = (Array.isArray(posts) ? posts : []).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      if (list) renderList(sorted);
      if (postRoot) renderPost(sorted);
    })
    .catch(() => {
      const status = element('p', 'story-status', '이야기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      if (list) list.replaceChildren(status);
      if (postRoot) postRoot.replaceChildren(status);
    });
})();
