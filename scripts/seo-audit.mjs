import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = 'https://katin-ashen.vercel.app';
const posts = JSON.parse(await readFile(resolve(root, 'story/posts.json'), 'utf8'));
const publicFiles = [
  'index.html', 'about.html', 'products.html', 'contact.html', 'story/index.html',
  ...posts.map((post) => `story/${post.url}`)
];
const results = [];
const fail = (item, detail) => results.push({ item, status: '실패', detail });
const pass = (item, detail) => results.push({ item, status: '통과', detail });
const textFor = async (file) => readFile(resolve(root, file), 'utf8');
const attr = (html, pattern) => html.match(pattern)?.[1]?.trim() || '';

const pages = await Promise.all(publicFiles.map(async (file) => ({ file, html: await textFor(file) })));

const titleData = pages.map(({ file, html }) => ({
  file,
  title: attr(html, /<title>([^<]+)<\/title>/i),
  description: attr(html, /<meta\s+name="description"\s+content="([^"]+)"/i)
}));
const duplicateTitles = titleData.filter((page, index, all) => all.findIndex((item) => item.title === page.title) !== index);
const badTitles = titleData.filter((page) => !page.title || Array.from(page.title).length > 60 || !page.description);
badTitles.length || duplicateTitles.length
  ? fail(1, `제목/설명 오류 ${badTitles.length}, 중복 제목 ${duplicateTitles.length}`)
  : pass(1, `공개 페이지 ${pages.length}개의 고유 title과 description 확인`);

const badCanonicals = pages.filter(({ html }) => {
  const canonical = attr(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return !canonical.startsWith(`${baseUrl}/`) && canonical !== `${baseUrl}/`;
});
badCanonicals.length ? fail(2, badCanonicals.map((page) => page.file).join(', ')) : pass(2, '모든 공개 페이지 canonical 도메인 일치');

const badOg = pages.filter(({ html }) => {
  const title = attr(html, /<meta\s+property="og:title"\s+content="([^"]+)"/i);
  const description = attr(html, /<meta\s+property="og:description"\s+content="([^"]+)"/i);
  const url = attr(html, /<meta\s+property="og:url"\s+content="([^"]+)"/i);
  const image = attr(html, /<meta\s+property="og:image"\s+content="([^"]+)"/i);
  return !title || !description || !url.startsWith(baseUrl) || (image && !image.startsWith('https://'));
});
badOg.length ? fail(3, badOg.map((page) => page.file).join(', ')) : pass(3, 'OG 필수 값과 이미지 절대 URL 확인');

const badHeadings = pages.filter(({ html }) => {
  const headings = [...html.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  if (headings.filter((level) => level === 1).length !== 1) return true;
  return headings.some((level, index) => index > 0 && level > headings[index - 1] + 1);
});
badHeadings.length ? fail(4, badHeadings.map((page) => page.file).join(', ')) : pass(4, '페이지당 H1 1개 및 제목 단계 확인');

const badImages = pages.flatMap(({ file, html }) => [...html.matchAll(/<img\b[^>]*>/gi)]
  .filter((match) => !/\salt="[^"]*"/i.test(match[0])).map(() => file));
badImages.length ? fail(5, [...new Set(badImages)].join(', ')) : pass(5, '모든 img alt 속성 확인');

const jsonLdErrors = [];
const schemaTypes = new Map();
for (const { file, html } of pages) {
  const types = [];
  for (const match of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const collect = (value) => {
        if (!value || typeof value !== 'object') return;
        if (typeof value['@type'] === 'string') types.push(value['@type']);
        Object.values(value).forEach(collect);
      };
      collect(data);
      if (/aggregateRating|reviewCount|availability/i.test(match[1])) jsonLdErrors.push(`${file}: 화면에 없는 속성`);
    } catch { jsonLdErrors.push(`${file}: JSON 파싱`); }
  }
  schemaTypes.set(file, types);
}
const requiredSchemaMissing = [
  !['Organization', 'WebSite'].every((type) => schemaTypes.get('index.html')?.includes(type)) && 'index.html',
  !schemaTypes.get('products.html')?.includes('Product') && 'products.html',
  ...posts.filter((post) => !['BlogPosting', 'FAQPage', 'BreadcrumbList'].every((type) => schemaTypes.get(`story/${post.url}`)?.includes(type))).map((post) => post.url)
].filter(Boolean);
jsonLdErrors.length || requiredSchemaMissing.length
  ? fail(6, [...jsonLdErrors, ...requiredSchemaMissing].join(', '))
  : pass(6, '홈·제품·글 JSON-LD 파싱 및 필수 유형 확인');

const sitemap = await textFor('sitemap.xml');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedUrls = pages.map(({ file }) => file === 'index.html' ? `${baseUrl}/` : file === 'story/index.html' ? `${baseUrl}/story/` : `${baseUrl}/${file}`);
const sitemapBad = expectedUrls.filter((url) => !sitemapUrls.includes(url));
if (sitemapUrls.some((url) => /admin|\?id=/.test(url))) sitemapBad.push('admin 또는 ?id= URL 포함');
sitemapBad.length ? fail(7, sitemapBad.join(', ')) : pass(7, `sitemap 공개 URL ${expectedUrls.length}개 확인`);

const robots = await textFor('robots.txt');
const blockedPaths = [...robots.matchAll(/^Disallow:\s*(.+)$/gm)].map((match) => match[1].trim());
blockedPaths.length === 1 && blockedPaths[0] === '/story/admin.html' && robots.includes(`${baseUrl}/sitemap.xml`)
  ? pass(8, 'admin만 차단하고 sitemap 위치 표시') : fail(8, 'robots 규칙 확인 필요');

const llms = await textFor('llms.txt');
const llmsOk = llms.indexOf('# Katin') < llms.indexOf('## 파는 것') && llms.indexOf('## 파는 것') < llms.indexOf('## 주요 페이지') && llms.indexOf('## 주요 페이지') < llms.indexOf('## 이야기(블로그)') && !/\]\((?!https:\/\/)/.test(llms);
llmsOk ? pass(9, '브랜드→제품→페이지→블로그 순서와 절대 URL 확인') : fail(9, 'llms.txt 순서 또는 URL 형식 확인 필요');

const brokenLinks = [];
const unsafeExternalLinks = [];
for (const { file, html } of pages) {
  for (const match of html.matchAll(/<a\b([^>]*?)href="([^"]+)"([^>]*)>/gi)) {
    const tag = `${match[1]} ${match[3]}`;
    const href = match[2];
    if (/^https?:\/\//.test(href)) {
      if (!/rel="[^"]*noopener[^"]*"/i.test(tag)) unsafeExternalLinks.push(`${file}: ${href}`);
      continue;
    }
    if (/^(mailto:|tel:|#)/.test(href)) continue;
    const clean = href.split(/[?#]/)[0];
    const target = resolve(root, dirname(file), clean || '.');
    try {
      const info = await stat(target);
      if (info.isDirectory()) await stat(resolve(target, 'index.html'));
    } catch { brokenLinks.push(`${file}: ${href}`); }
  }
}
brokenLinks.length || unsafeExternalLinks.length
  ? fail(10, [...brokenLinks, ...unsafeExternalLinks].join(', '))
  : pass(10, '내부 링크 파일 존재 및 외부 링크 noopener 확인');

const postIssues = posts.filter((post) => !post.author || !post.date || !post.url || !post.faq || post.faq.length !== 3 || !post.sources?.length);
postIssues.length ? fail(11, postIssues.map((post) => post.id).join(', ')) : pass(11, `글 ${posts.length}편의 작성자·날짜·URL·FAQ·출처 확인`);

const contentFiles = ['story/posts.json', ...posts.map((post) => `story/${post.url}`)];
const unsupported = [];
for (const file of contentFiles) {
  const source = await textFor(file);
  if (/국내\s*1위|말하지 않은 열 분|패키지 하나를 바꾸는 데 석 달/.test(source)) unsupported.push(file);
}
unsupported.length ? fail(12, unsupported.join(', ')) : pass(12, '금지·미검증 샘플 표현 없음');

const missingViewport = pages.filter(({ html }) => !/<meta\s+name="viewport"/i.test(html)).map(({ file }) => file);
missingViewport.length ? fail(13, missingViewport.join(', ')) : pass(13, '모든 공개 페이지 viewport 확인; 가로 스크롤은 브라우저 점검 필요');

console.log(JSON.stringify({ publicFiles, results }, null, 2));
if (results.some((result) => result.status === '실패')) process.exitCode = 1;
