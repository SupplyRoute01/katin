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
  body.append(label, title, purchaseRow);
  card.append(imageLink, body);
  return card;
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
