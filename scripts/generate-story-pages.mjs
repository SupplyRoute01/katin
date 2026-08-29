import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const storyDir = resolve(root, 'story');
const posts = JSON.parse(await readFile(resolve(storyDir, 'posts.json'), 'utf8'));
const baseUrl = 'https://katin-ashen.vercel.app';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const safeJson = (value) => JSON.stringify(value, null, 2).replaceAll('</script', '<\\/script');

const renderInline = (value) => {
  const source = String(value);
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let output = '';
  let cursor = 0;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    output += escapeHtml(source.slice(cursor, match.index));
    const label = escapeHtml(match[1]);
    const href = match[2].trim();
    const allowed = /^(https?:\/\/|\.\.\/|\.\/|#)/i.test(href);
    if (!allowed) {
      output += escapeHtml(match[0]);
    } else {
      const external = /^https?:\/\//i.test(href);
      output += `<a class="inline-link" href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    }
    cursor = pattern.lastIndex;
  }
  return output + escapeHtml(source.slice(cursor));
};

const renderBody = (source = '') => String(source).replace(/\r\n/g, '\n').split(/\n\s*\n/).map((block) => {
  const value = block.trim();
  if (!value) return '';
  const lines = value.split('\n');
  if (lines.every((line) => /^- /.test(line.trim()))) {
    return `<ul>\n${lines.map((line) => `  <li>${renderInline(line.trim().slice(2))}</li>`).join('\n')}\n</ul>`;
  }
  if (/^## /.test(value)) return `<h2>${escapeHtml(value.slice(3).trim())}</h2>`;
  if (/^\[스마트스토어에서 제품 보기\]\(/.test(value)) return `<p class="post-cta">${renderInline(value)}</p>`;
  return `<p>${renderInline(value)}</p>`;
}).filter(Boolean).join('\n        ');

const formatDate = (value) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul'
}).format(new Date(`${value}T00:00:00+09:00`));

for (let index = 0; index < posts.length; index += 1) {
  const post = posts[index];
  if (!post.url || !post.url.endsWith('.html')) continue;
  const title = post.title || '케이튼 이야기';
  const description = post.description || post.summary || '케이튼의 제품과 로컬 이야기를 기록합니다.';
  const canonical = `${baseUrl}/story/${post.url}`;
  const author = post.author || '케이튼';
  const faq = Array.isArray(post.faq) ? post.faq : [];
  const sources = Array.isArray(post.sources) ? post.sources : [];
  const older = posts[index + 1];
  const newer = posts[index - 1];
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: { '@type': 'Person', name: author },
    publisher: { '@type': 'Organization', name: 'Katin', url: baseUrl },
    mainEntityOfPage: canonical,
    keywords: (post.tags || []).join(', ')
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: '이야기', item: `${baseUrl}/story/` },
      { '@type': 'ListItem', position: 3, name: title, item: canonical }
    ]
  };
  const faqSchema = faq.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  } : null;
  const tags = (post.tags || []).map((tag) => `<span class="story-tag">${escapeHtml(tag)}</span>`).join('');
  const faqHtml = faq.length ? `
        <section class="post-faq" aria-labelledby="faq-title">
          <h2 id="faq-title">자주 묻는 질문</h2>
${faq.map((item) => `          <details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join('\n')}
        </section>` : '';
  const sourcesHtml = sources.length ? `
        <section class="post-sources" aria-labelledby="sources-title">
          <h2 id="sources-title">출처</h2>
          <ul>
${sources.map((item) => `            <li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`).join('\n')}
          </ul>
        </section>` : '';
  const pageLink = (label, item) => item?.url
    ? `<a href="${escapeHtml(item.url)}"><p class="post-direction">${label}</p><p class="post-pagination-title">${escapeHtml(item.title)}</p></a>`
    : '<span></span>';
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="google-site-verification" content="zzJp-2D-Cv7RySWVmcCNSb8piRdfxjgsX2Pdq09TwC0">
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="${escapeHtml(author)}">
    <meta name="theme-color" content="#f9e8d4">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="Katin">
    <title>${escapeHtml(title)} | Katin</title>
    <link rel="stylesheet" href="../styles.css">
    <link rel="stylesheet" href="story.css">
    <script type="application/ld+json">${safeJson(articleSchema)}</script>
    <script type="application/ld+json">${safeJson(breadcrumbSchema)}</script>${faqSchema ? `
    <script type="application/ld+json">${safeJson(faqSchema)}</script>` : ''}
    <script src="../script.js" defer></script>
  </head>
  <body class="story-page post-page">
    <a class="skip-link" href="#main">본문으로 바로가기</a>
    <header class="site-header solid" data-header>
      <a class="brand" href="../index.html" aria-label="Katin 홈"><span class="logo-mark" aria-hidden="true"></span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="sr-only">메뉴 열기</span><span></span><span></span></button>
      <nav id="site-nav" class="site-nav" aria-label="주요 메뉴"><a href="../about.html">내 소개</a><a href="../products.html">제품</a><a href="index.html" aria-current="page">이야기</a><a href="../contact.html">연락하기</a></nav>
    </header>
    <main id="main" class="post-shell">
      <div class="post-top"><a class="line-link dark" href="index.html">← 이야기 목록</a></div>
      <article class="story-article">
        <header>
          <time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
          <h1>${escapeHtml(title)}</h1>
          <p class="post-meta">${escapeHtml(author)}</p>
          <div class="story-tags">${tags}</div>
        </header>
        <hr class="post-rule">
        <div class="post-body">
        ${renderBody(post.body)}
        </div>${faqHtml}${sourcesHtml}
        <nav class="post-pagination" aria-label="다른 이야기">${pageLink('Older story', older)}${pageLink('Newer story', newer)}</nav>
      </article>
    </main>
    <footer>
      <div class="footer-brand" role="img" aria-label="Katin"><span class="logo-mark" aria-hidden="true"></span></div>
      <p class="copy">파도 밖의 시간을 위해 만든<br>코듀로이 로컬 반바지.</p>
      <nav aria-label="푸터 메뉴"><a href="../about.html">내 소개</a><a href="../products.html">제품</a><a href="index.html">이야기</a><a href="../contact.html">연락하기</a><a href="mailto:design6@gmail.com" target="_blank" rel="noopener noreferrer">design6@gmail.com</a><a href="https://www.instagram.com/supplyroute/" target="_blank" rel="noopener noreferrer">Instagram</a></nav>
      <div class="footer-bottom"><p>© <span data-year></span> Katin</p><p>Local Journal</p><a href="#main">Back to top ↑</a></div>
    </footer>
  </body>
</html>
`;
  await writeFile(resolve(storyDir, post.url), html, 'utf8');
}

const xmlEscape = (value = '') => escapeHtml(value).replaceAll('&#39;', '&apos;');
const sitePages = [
  { loc: `${baseUrl}/`, lastmod: '2026-08-29' },
  { loc: `${baseUrl}/about.html`, lastmod: '2026-08-29' },
  { loc: `${baseUrl}/products.html`, lastmod: '2026-08-29' },
  { loc: `${baseUrl}/contact.html`, lastmod: '2026-08-29' },
  { loc: `${baseUrl}/story/`, lastmod: '2026-08-29' },
  ...posts.filter((post) => post.url).map((post) => ({ loc: `${baseUrl}/story/${post.url}`, lastmod: post.updated || post.date }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitePages.map((page) => `  <url><loc>${xmlEscape(page.loc)}</loc><lastmod>${xmlEscape(page.lastmod)}</lastmod></url>`).join('\n')}
</urlset>
`;
await writeFile(resolve(root, 'sitemap.xml'), sitemap, 'utf8');

const stripMarkdown = (value = '') => String(value)
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/^##\s+/gm, '')
  .replace(/^-\s+/gm, '')
  .replace(/\s+/g, ' ')
  .trim();
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Katin Local Journal</title>
    <link>${baseUrl}/story/</link>
    <description>케이튼의 제품과 사람, 로컬의 이야기</description>
    <language>ko</language>
${posts.map((post) => `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${baseUrl}/story/${xmlEscape(post.url)}</link>
      <guid isPermaLink="true">${baseUrl}/story/${xmlEscape(post.url)}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00+09:00`).toUTCString()}</pubDate>
      <description>${xmlEscape(post.description || post.summary || stripMarkdown(post.body).slice(0, 150))}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`;
await writeFile(resolve(root, 'feed.xml'), feed, 'utf8');

const llms = `# Katin

> 서퍼들이 사랑하는 캘리포니아 브랜드 케이튼과 코듀로이 로컬 반바지를 소개하는 한국어 사이트입니다.

## 파는 것

- 케이튼 코듀로이 로컬 반바지

## 주요 페이지

- [홈](${baseUrl}/)
- [내 소개](${baseUrl}/about.html)
- [제품](${baseUrl}/products.html)
- [연락하기](${baseUrl}/contact.html)
- [이야기](${baseUrl}/story/)

## 이야기(블로그)

${posts.map((post) => `- [${post.title}](${baseUrl}/story/${post.url}): ${post.description || post.summary || ''}`).join('\n')}

## 작성 기준

- 작성자: 이밀 대표
- 제품: 케이튼 코듀로이 로컬 반바지
- 과장된 순위, 출처 없는 수치·효능, 지어낸 후기를 사용하지 않습니다.
`;
await writeFile(resolve(root, 'llms.txt'), llms, 'utf8');

await writeFile(resolve(root, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /story/admin.html\n\nSitemap: ${baseUrl}/sitemap.xml\n`, 'utf8');

console.log(`Generated ${posts.filter((post) => post.url?.endsWith('.html')).length} story pages.`);
