import './style.css';
import { portfolioImages } from './portfolio-images.js';
import { webProjects } from './web-projects.js';
import { videoProjects } from './video-projects.js';

// Portfolio carousels populated at init

function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${path}`;
}

const BACKGROUNDS = [
  {
    variable: '--hero-bg-image',
    path: 'images/arriere-plan/background-univers-denis.jpg',
    targets: ['.pv-hero-bg', '.pv-contact-bg'],
    priority: 'high',
  },
  {
    variable: '--explore-bg-image',
    path: 'images/arriere-plan/background-explore.jpg',
    targets: ['.pv-transition-explore .pv-transition-bg'],
  },
  {
    variable: '--web-bg-image',
    path: 'images/arriere-plan/background-appli.jpg',
    targets: ['.pv-transition-web .pv-transition-bg'],
  },
  {
    variable: '--design-bg-image',
    path: 'images/arriere-plan/background-graphic-design.jpg',
    targets: ['.pv-transition-design .pv-transition-bg'],
  },
];

function markBackgroundLoaded(selectors) {
  const apply = () => selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.classList.add('is-loaded'));
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
}

function setupBackgrounds() {
  BACKGROUNDS.forEach(({ variable, path }) => {
    document.documentElement.style.setProperty(variable, `url(${assetUrl(path)})`);
  });
}

function preloadBackgrounds() {
  BACKGROUNDS.forEach(({ path, targets, priority }) => {
    const img = new Image();
    if (priority === 'high' && 'fetchPriority' in img) img.fetchPriority = 'high';
    img.decoding = 'async';
    img.onload = () => markBackgroundLoaded(targets);
    img.onerror = () => markBackgroundLoaded(targets);
    img.src = assetUrl(path);
  });
}

setupBackgrounds();
preloadBackgrounds();

function youtubeId(urlOrId) {
  if (!/[/?]/.test(urlOrId)) return urlOrId;
  const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);
  return match ? match[1] : urlOrId;
}

function youtubeWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function youtubeThumbUrl(id) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function waitForCarouselItem(item, timeoutMs = 5000) {
  ensureCarouselImage(item);
  const img = item.querySelector('img:not(.pv-video-thumb)');
  if (!img) return Promise.resolve();

  if (img.classList.contains('is-ready') || (img.complete && img.naturalWidth > 0)) {
    img.classList.add('is-ready');
    item.classList.remove('is-loading');
    return Promise.resolve();
  }

  item.classList.add('is-loading');

  return new Promise((resolve) => {
    const done = () => {
      img.classList.add('is-ready');
      item.classList.remove('is-loading');
      resolve();
    };
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

function ensureCarouselImage(item) {
  const img = item.querySelector('img:not(.pv-video-thumb)');
  if (!img) return;

  const reveal = () => {
    img.classList.add('is-ready');
    item.classList.remove('is-loading');
  };

  const pendingSrc = img.getAttribute('data-src');
  if (pendingSrc) {
    item.classList.add('is-loading');
    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
    img.src = pendingSrc;
    img.removeAttribute('data-src');
    img.removeAttribute('loading');
    return;
  }

  if (img.complete && img.naturalWidth > 0) reveal();
  else {
    item.classList.add('is-loading');
    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
  }
}

function getCarouselImageSrc(img) {
  if (!img) return '';
  return img.getAttribute('src') || img.getAttribute('data-src') || '';
}

function handleCarouselTap(item, lightbox, lightboxImg) {
  if (!item?.classList.contains('is-active')) return;

  const itemType = item.getAttribute('data-type');
  if (itemType === 'web') {
    const siteUrl = item.getAttribute('data-url');
    if (siteUrl) window.open(siteUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  if (itemType === 'video') return;

  ensureCarouselImage(item);
  const img = item.querySelector('img:not(.pv-video-thumb)');
  const src = getCarouselImageSrc(img);
  if (src && lightbox && lightboxImg) {
    lightboxImg.setAttribute('src', src);
    lightbox.classList.add('is-open');
  }
}

function preloadCarouselNeighbors(items, modIndex) {
  const len = items.length;
  [modIndex, (modIndex + 1) % len, (modIndex - 1 + len) % len].forEach((index) => {
    ensureCarouselImage(items[index]);
  });
}

function preloadCarouselBatch(items, startIndex = 0, batchSize = 6) {
  for (let i = startIndex; i < Math.min(items.length, startIndex + batchSize); i += 1) {
    ensureCarouselImage(items[i]);
  }
}

function setupCarouselSectionPreload(section) {
  const container = section.querySelector('.pv-carousel-container');
  if (!container) return;

  const items = container.querySelectorAll('.pv-carousel-item');
  if (!items.length) return;

  preloadCarouselBatch(items, 0, 8);

  const loadRest = () => {
    let index = 8;
    const step = () => {
      preloadCarouselBatch(items, index, 6);
      index += 6;
      if (index < items.length) {
        if ('requestIdleCallback' in window) requestIdleCallback(step, { timeout: 1500 });
        else setTimeout(step, 120);
      }
    };
    step();
  };

  if (!('IntersectionObserver' in window)) {
    loadRest();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries[0]?.isIntersecting) return;
    observer.disconnect();
    loadRest();
  }, { rootMargin: '500px 0px' });

  observer.observe(section);
}

function buildCarouselItems(container, images, type, { eagerCount = 8 } = {}) {
  container.innerHTML = images.map((src, index) => {
    const fileName = decodeURIComponent(src.split('/').pop().replace(/\.[^.]+$/, ''));
    const alt = `${type} ${fileName}`;
    const url = assetUrl(src);
    const eager = index < eagerCount;
    const imgTag = eager
      ? `<img src="${url}" alt="${alt}" decoding="async" fetchpriority="${index === 0 ? 'high' : 'auto'}">`
      : `<img data-src="${url}" alt="${alt}" decoding="async">`;
    return `<div class="pv-carousel-item" data-type="${type}">${imgTag}</div>`;
  }).join('');
}

function buildWebCarouselItems(container, projects) {
  container.innerHTML = projects.map(({ name, image, url }, index) => {
    const imgUrl = assetUrl(image);
    const imgTag = `<img src="${imgUrl}" alt="${name}" decoding="async" fetchpriority="${index === 0 ? 'high' : 'auto'}">`;
    return (
      `<div class="pv-carousel-item" data-type="web" data-url="${url}">` +
      imgTag +
      `<span class="pv-web-label">${name}</span>` +
      `</div>`
    );
  }).join('');
}

function buildVideoCarouselItems(container, projects) {
  container.innerHTML = projects.map(({ title, url }) => {
    const id = youtubeId(url);
    const watchUrl = youtubeWatchUrl(id);
    return (
      `<div class="pv-carousel-item" data-type="video" data-video-id="${id}" data-url="${watchUrl}">` +
      `<div class="pv-video-media">` +
      `<img class="pv-video-thumb" src="${youtubeThumbUrl(id)}" alt="${title}" decoding="async">` +
      `</div>` +
      `<span class="pv-video-label">${title}</span>` +
      `</div>`
    );
  }).join('');
}

function setActiveVideoPreview(items, activeIndex) {
  items.forEach((item, index) => {
    const media = item.querySelector('.pv-video-media');
    if (!media) return;

    const thumb = media.querySelector('.pv-video-thumb');
    const iframe = media.querySelector('iframe');

    if (index === activeIndex) {
      if (!iframe) {
        const videoId = item.getAttribute('data-video-id');
        const player = document.createElement('iframe');
        player.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1&mute=1`;
        player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        player.allowFullscreen = true;
        player.title = item.querySelector('.pv-video-label')?.textContent || 'Vidéo YouTube';
        media.appendChild(player);
      }
      if (thumb) thumb.classList.add('is-hidden');
      return;
    }

    if (iframe) iframe.remove();
    if (thumb) thumb.classList.remove('is-hidden');
  });
}

function init() {
  document.querySelectorAll('.hand-title').forEach((title) => {
    const revealTitle = () => title.classList.add('is-revealed');
    if (!('IntersectionObserver' in window)) {
      revealTitle();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealTitle();
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    observer.observe(title);
  });

  const categories = ['PHOTOS', 'VIDÉO', 'WEB & APPLI', 'GRAPHISME'];
  const itemHeight = 80;

  const photoCarousel = document.querySelector('#motion-photos .pv-carousel-container');
  const videoCarousel = document.querySelector('#motion-video .pv-carousel-container');
  const webCarousel = document.querySelector('#motion-web .pv-carousel-container');
  const designCarousel = document.querySelector('#motion-design .pv-carousel-container');

  if (photoCarousel && portfolioImages.photos?.length) {
    buildCarouselItems(photoCarousel, portfolioImages.photos, 'image');
  }
  if (videoCarousel && videoProjects.length) {
    buildVideoCarouselItems(videoCarousel, videoProjects);
  }
  if (webCarousel && webProjects.length) {
    buildWebCarouselItems(webCarousel, webProjects);
  }
  if (designCarousel && portfolioImages.graphisme?.length) {
    buildCarouselItems(designCarousel, portfolioImages.graphisme, 'image', { eagerCount: portfolioImages.graphisme.length });
  }

  document.querySelectorAll('.pv-portfolio-section').forEach((section) => {
    setupCarouselSectionPreload(section);
  });

  const cursor = document.querySelector('.custom-cursor');

  document.querySelectorAll('.wheel-reel').forEach((reel) => {
    let htmlContent = '';
    for (let i = 0; i < 15; i++) {
      categories.forEach((cat) => {
        htmlContent += `<div class="reel-item">${cat}</div>`;
      });
    }
    reel.innerHTML = htmlContent;
  });

  window.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  document.querySelectorAll('.wheel-trigger').forEach((el) => {
    el.addEventListener('mouseenter', () => { document.body.className = 'grab-mode'; });
    el.addEventListener('mouseleave', () => { document.body.className = ''; });
  });
  setupCursorZone('.photo-zone', 'camera-mode');
  setupCursorZone('.video-zone', 'video-mode');
  setupCursorZone('.web-zone', 'web-mode');
  setupCursorZone('.design-zone', 'design-mode');

  function setupCursorZone(selector, className) {
    const zone = document.querySelector(selector);
    if (zone) {
      zone.addEventListener('mouseenter', () => { document.body.className = className; });
      zone.addEventListener('mouseleave', () => { document.body.className = ''; });
    }
  }

  document.querySelectorAll('.wheel-trigger').forEach((trigger) => {
    let isSpinningHero = false;
    trigger.addEventListener('click', () => {
      if (isSpinningHero) return;
      isSpinningHero = true;

      const reel = trigger.querySelector('.wheel-reel');
      const targetValue = trigger.getAttribute('data-target-value');
      const targetSectionId = trigger.getAttribute('data-scroll-to');
      const items = reel.querySelectorAll('.reel-item');

      items.forEach((it) => { it.className = 'reel-item'; });

      let targetIndex = 45;
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].textContent === targetValue) {
          targetIndex = i;
          break;
        }
      }

      const finalPosition = -(targetIndex * itemHeight);
      reel.style.filter = 'blur(5px)';

      const anim = reel.animate([
        { transform: 'translateY(0px)' },
        { transform: `translateY(${finalPosition}px)` },
      ], {
        duration: 4800,
        easing: 'cubic-bezier(0.05, 0.9, 0.1, 1)',
        fill: 'forwards',
      });

      setTimeout(() => {
        reel.style.filter = 'blur(0px)';
        items[targetIndex].classList.add('highlight');
      }, 4000);

      anim.onfinish = () => {
        const flash = document.querySelector('.camera-flash');
        flash.style.opacity = '1';
        setTimeout(() => {
          flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).onfinish = () => { flash.style.opacity = '0'; };
          const targetSection = document.getElementById(targetSectionId);
          if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });

          setTimeout(() => {
            const targetCarousel = targetSection.querySelector('.pv-carousel-container');
            if (targetCarousel && targetCarousel.spinFunction) targetCarousel.spinFunction();
          }, 600);
        }, 40);
      };
    });
  });

  function initFlatCarousel(wrap, options = {}) {
    const container = wrap.querySelector('.pv-carousel-container');
    const items = container.querySelectorAll('.pv-carousel-item');
    if (!items.length) return;

    const spinBtn = wrap.closest('.pv-portfolio-section')?.querySelector('.spin-trigger-btn');
    let currentIndex = 0;
    let isSpinning = false;
    let historySeen = [];
    let pointerStartX = 0;
    let hasDragged = false;

    function getActiveItem() {
      const modIndex = ((currentIndex % items.length) + items.length) % items.length;
      return items[modIndex];
    }

    function updateCarousel() {
      const modIndex = ((currentIndex % items.length) + items.length) % items.length;
      items.forEach((item, i) => {
        item.classList.toggle('is-active', i === modIndex);
      });
      preloadCarouselNeighbors(items, modIndex);
      waitForCarouselItem(items[modIndex]);
      if (options.onActiveChange) options.onActiveChange(items, modIndex);
    }

    wrap.addEventListener('pointerdown', (e) => {
      if (isSpinning || e.button !== 0) return;
      pointerStartX = e.clientX;
      hasDragged = false;
      wrap.setPointerCapture(e.pointerId);
    });

    wrap.addEventListener('pointermove', (e) => {
      if (pointerStartX === 0) return;
      if (Math.abs(e.clientX - pointerStartX) > 8) hasDragged = true;
    });

    wrap.addEventListener('pointerup', (e) => {
      if (isSpinning || pointerStartX === 0) return;
      const deltaX = e.clientX - pointerStartX;
      if (hasDragged) {
        if (deltaX > 40) currentIndex--;
        else if (deltaX < -40) currentIndex++;
        updateCarousel();
      } else if (options.onTap) {
        options.onTap(getActiveItem());
      }
      pointerStartX = 0;
      hasDragged = false;
      wrap.releasePointerCapture(e.pointerId);
    });

    wrap.addEventListener('pointercancel', () => {
      pointerStartX = 0;
      hasDragged = false;
    });

    function spinCarouselAleatoire() {
      if (isSpinning) return;
      isSpinning = true;
      wrap.classList.add('is-carousel-busy');

      let pools = [];
      items.forEach((_, i) => { if (!historySeen.includes(i)) pools.push(i); });
      if (pools.length === 0) {
        historySeen = [];
        items.forEach((_, i) => pools.push(i));
      }

      const targetIndex = pools[Math.floor(Math.random() * pools.length)];
      historySeen.push(targetIndex);
      ensureCarouselImage(items[targetIndex]);

      const spinDuration = 2200 + Math.floor(Math.random() * 900);
      window.setTimeout(() => {
        waitForCarouselItem(items[targetIndex]).then(() => {
          currentIndex = targetIndex;
          updateCarousel();
          wrap.classList.remove('is-carousel-busy');
          isSpinning = false;
        });
      }, spinDuration);
    }

    if (spinBtn) spinBtn.addEventListener('click', spinCarouselAleatoire);
    container.spinFunction = spinCarouselAleatoire;
    updateCarousel();
  }

  function initCarousel3D(wrap) {
    const container = wrap.querySelector('.pv-carousel-container');
    const items = container.querySelectorAll('.pv-carousel-item');
    if (!items.length) return;

    const spinBtn = wrap.closest('.pv-portfolio-section')?.querySelector('.spin-trigger-btn');
    const radius = 420;
    let currentIndex = 0;
    let isSpinning = false;
    let startX = 0;
    let historySeen = [];
    const angleStep = 360 / items.length;

    items.forEach((item, i) => {
      const angle = i * angleStep;
      item.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
    });

    function updateCarousel() {
      const angle = currentIndex * -angleStep;
      container.style.transform = `rotateY(${angle}deg)`;
      const modIndex = ((currentIndex % items.length) + items.length) % items.length;
      items.forEach((item, i) => item.classList.toggle('is-active', i === modIndex));
    }

    const onDragStart = (clientX) => { if (!isSpinning) startX = clientX; };
    const onDragEnd = (clientX) => {
      if (isSpinning || startX === 0) return;
      const deltaX = clientX - startX;
      if (deltaX > 40) currentIndex--;
      else if (deltaX < -40) currentIndex++;
      startX = 0;
      updateCarousel();
    };

    wrap.addEventListener('mousedown', (e) => onDragStart(e.clientX));
    wrap.addEventListener('mouseup', (e) => onDragEnd(e.clientX));
    wrap.addEventListener('mouseleave', () => { startX = 0; });
    wrap.addEventListener('touchstart', (e) => onDragStart(e.touches[0].clientX), { passive: true });
    wrap.addEventListener('touchend', (e) => onDragEnd(e.changedTouches[0].clientX));

    function spinCarouselAleatoire() {
      if (isSpinning) return;
      isSpinning = true;

      let pools = [];
      items.forEach((_, i) => { if (!historySeen.includes(i)) pools.push(i); });
      if (pools.length === 0) {
        historySeen = [];
        items.forEach((_, i) => pools.push(i));
      }

      const randomIndex = pools[Math.floor(Math.random() * pools.length)];
      historySeen.push(randomIndex);
      currentIndex = currentIndex + (4 * items.length) + (randomIndex - (currentIndex % items.length));

      container.style.transition = 'transform 3.5s cubic-bezier(0.05, 0.9, 0.1, 1)';
      updateCarousel();

      setTimeout(() => {
        container.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
        isSpinning = false;
      }, 3500);
    }

    if (spinBtn) spinBtn.addEventListener('click', spinCarouselAleatoire);
    container.spinFunction = spinCarouselAleatoire;
    updateCarousel();
  }

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  const onCarouselTap = (item) => handleCarouselTap(item, lightbox, lightboxImg);

  document.querySelectorAll('.pv-carousel-flat:not(.pv-carousel-video)').forEach((wrap) => {
    initFlatCarousel(wrap, { onTap: onCarouselTap });
  });
  document.querySelectorAll('.pv-carousel-video').forEach((wrap) => {
    initFlatCarousel(wrap, { onActiveChange: setActiveVideoPreview });
  });
  document.querySelectorAll('.pv-carousel-3d').forEach(initCarousel3D);

  if (lightboxClose) lightboxClose.addEventListener('click', () => lightbox.classList.remove('is-open'));
  if (lightbox) lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('is-open'); });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
