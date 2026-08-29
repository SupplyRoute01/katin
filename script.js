const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const closeMenu = () => {
  menuButton.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
  document.body.classList.remove('menu-open');
};

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  nav.classList.toggle('open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

if (reduceMotion) {
  document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
}

document.querySelector('[data-year]').textContent = new Date().getFullYear();

const formatPrice = (price) => `${new Intl.NumberFormat('ko-KR').format(price)}원`;

const createProductCard = (product) => {
  const card = document.createElement('article');
  card.className = 'product-card';

  const imageLink = document.createElement('a');
  imageLink.className = 'product-image-link';
  imageLink.href = product.url;
  imageLink.target = '_blank';
  imageLink.rel = 'noopener noreferrer';
  imageLink.setAttribute('aria-label', `${product.name} 구매 페이지 열기`);

  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.name;
  image.loading = 'lazy';
  image.width = 900;
  image.height = 1080;
  imageLink.append(image);

  const body = document.createElement('div');
  body.className = 'product-card-body';

  const label = document.createElement('p');
  label.className = 'product-label';
  label.textContent = 'Katin · Corduroy';

  const title = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = product.url;
  titleLink.target = '_blank';
  titleLink.rel = 'noopener noreferrer';
  titleLink.textContent = product.name;
  title.append(titleLink);

  const tagline = document.createElement('p');
  tagline.className = 'product-tagline';
  tagline.textContent = product.tagline || '';

  const purchaseRow = document.createElement('div');
  purchaseRow.className = 'product-purchase-row';

  const price = document.createElement('p');
  price.className = 'product-price';
  price.textContent = formatPrice(product.price);

  const buyLink = document.createElement('a');
  buyLink.className = 'buy-button';
  buyLink.href = product.url;
  buyLink.target = '_blank';
  buyLink.rel = 'noopener noreferrer';
  buyLink.textContent = '구매하기 ↗';

  purchaseRow.append(price, buyLink);
  body.append(label, title, tagline, purchaseRow);
  card.append(imageLink, body);
  return card;
};

const createFeaturedProduct = (product) => {
  const feature = document.createElement('article');
  feature.className = 'featured-product';

  const imageLink = document.createElement('a');
  imageLink.className = 'featured-product-image';
  imageLink.href = product.url;
  imageLink.target = '_blank';
  imageLink.rel = 'noopener noreferrer';
  imageLink.setAttribute('aria-label', `${product.name} 구매 페이지 열기`);

  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.name;
  image.width = 1200;
  image.height = 1440;
  imageLink.append(image);

  const content = document.createElement('div');
  content.className = 'featured-product-content';

  const label = document.createElement('p');
  label.className = 'product-label';
  label.textContent = 'Featured · Corduroy Local Shorts';

  const title = document.createElement('h3');
  title.textContent = product.name;

  const tagline = document.createElement('p');
  tagline.className = 'featured-product-tagline';
  tagline.textContent = product.tagline || '';

  const price = document.createElement('p');
  price.className = 'product-price';
  price.textContent = formatPrice(product.price);

  const buyLink = document.createElement('a');
  buyLink.className = 'button featured-buy-button';
  buyLink.href = product.url;
  buyLink.target = '_blank';
  buyLink.rel = 'noopener noreferrer';
  buyLink.textContent = '구매하기 ↗';

  content.append(label, title, tagline, price, buyLink);
  feature.append(imageLink, content);
  return feature;
};

const renderProductGrids = async () => {
  const grids = document.querySelectorAll('[data-product-grid]');
  if (!grids.length) return;

  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error('Product data request failed');
    const data = await response.json();

    grids.forEach((grid) => {
      const limit = Number(grid.dataset.limit) || data.products.length;
      const products = data.products.slice(0, limit);
      grid.replaceChildren(...products.map(createProductCard));
      grid.setAttribute('aria-label', `케이튼 코듀로이 로컬 반바지 ${products.length}개`);
    });
  } catch (error) {
    grids.forEach((grid) => {
      const message = document.createElement('p');
      message.className = 'product-loading';
      message.textContent = '제품을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      grid.replaceChildren(message);
    });
  }
};

renderProductGrids();

const renderProductCurations = async () => {
  const curations = document.querySelectorAll('[data-product-curation]');
  if (!curations.length) return;

  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error('Product data request failed');
    const data = await response.json();

    curations.forEach((curation) => {
      const featured = data.products[0];
      const limit = Number(curation.dataset.gridLimit) || 5;
      const remaining = data.products.slice(1, 1 + Math.min(limit, 5));
      const grid = document.createElement('div');
      grid.className = 'product-grid curated-product-grid';
      grid.append(...remaining.map(createProductCard));
      curation.replaceChildren(createFeaturedProduct(featured), grid);
      curation.setAttribute('aria-label', `대표 제품 1개와 큐레이션 제품 ${remaining.length}개`);
    });
  } catch (error) {
    curations.forEach((curation) => {
      const message = document.createElement('p');
      message.className = 'product-loading';
      message.textContent = '제품을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      curation.replaceChildren(message);
    });
  }
};

renderProductCurations();

const renderLatestStories = async () => {
  const container = document.querySelector('[data-latest-posts]');
  if (!container) return;

  try {
    const response = await fetch(container.dataset.postsSrc, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const posts = await response.json();
    const storyBase = container.dataset.storyBase || '';
    const latest = posts.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 3);

    const cards = latest.map((post) => {
      const link = document.createElement('a');
      link.className = 'journal-item';
      link.href = post.url ? `${storyBase}${post.url}` : `${storyBase}post.html?id=${encodeURIComponent(post.id || '')}`;

      const date = document.createElement('time');
      date.className = 'journal-date';
      date.dateTime = post.date || '';
      date.textContent = String(post.date || '').replaceAll('-', '.');

      const copy = document.createElement('div');
      copy.className = 'journal-card-copy';
      const title = document.createElement('h3');
      title.textContent = post.title || '(제목 없음)';
      const summary = document.createElement('p');
      summary.textContent = post.summary || '';
      copy.append(title, summary);

      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(date, copy, arrow);
      return link;
    });
    container.replaceChildren(...cards);
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'journal-status';
    message.textContent = '최신 이야기를 불러오지 못했습니다.';
    container.replaceChildren(message);
  }
};

renderLatestStories();
