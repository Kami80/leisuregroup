(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer:fine)').matches;

  document.documentElement.classList.add('js');
  if (!reduced) document.documentElement.classList.add('has-motion');

  /* ---------------------------------------------------------
     Global toast
     --------------------------------------------------------- */
  const toast = document.createElement('div');
  toast.className = 'leisure-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer;
  window.leisureToast = (message, timeout = 2600) => {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), timeout);
  };

  /* ---------------------------------------------------------
     Scroll progress + sticky header + scroll top
     --------------------------------------------------------- */
  const header = $('.site-header');
  const progress = $('.reading-progress') || (() => {
    const el = document.createElement('div');
    el.className = 'site-progress';
    document.body.appendChild(el);
    return el;
  })();
  const scrollTop = document.createElement('button');
  scrollTop.className = 'scroll-top';
  scrollTop.type = 'button';
  scrollTop.setAttribute('aria-label', 'برگشت به بالای صفحه');
  scrollTop.textContent = '↑';
  document.body.appendChild(scrollTop);

  const updateScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    header?.classList.toggle('is-scrolled', y > 26);
    scrollTop.classList.toggle('is-visible', y > 650);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
  };
  updateScroll();
  window.addEventListener('scroll', updateScroll, {passive:true});
  window.addEventListener('resize', updateScroll, {passive:true});
  scrollTop.addEventListener('click', () => window.scrollTo({top:0, behavior:reduced ? 'auto' : 'smooth'}));

  /* ---------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------- */
  const toggle = $('.menu-toggle');
  const nav = $('.main-nav');
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  document.body.appendChild(backdrop);

  const closeNav = () => {
    nav?.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    toggle?.setAttribute('aria-expanded', 'false');
  };
  const openNav = () => {
    nav?.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('nav-open');
    toggle?.setAttribute('aria-expanded', 'true');
  };
  toggle?.addEventListener('click', () => nav?.classList.contains('is-open') ? closeNav() : openNav());
  backdrop.addEventListener('click', closeNav);
  $$('.main-nav a').forEach(a => a.addEventListener('click', closeNav));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeNav();
      closeFilters();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeNav();
  });

  /* ---------------------------------------------------------
     Scroll reveal system
     --------------------------------------------------------- */
  const revealSelector = [
    '.hero__copy','.hero-board','.hero-poster','.section-head','.finder-panel',
    '.category-card','.game-card','.ticket','.feature-story','.story-card',
    '.community-card','.stat-strip > div','.db-card','.article-card','.event-card',
    '.benefit-card','.branch-card','.future-card','.contact-panel','.game-section-grid',
    '.player-match','.discovery-point','.discover-detail-hero__grid > *',
    '.membership-form','.open-table','.registration-card','.flow-grid',
    '.magazine-feature > *','.article-header','.article-cover','.article-layout',
    '.about-story','.timeline__item','.founder-card','.archive-side-note','.discover-city-card','.city-guide-card','.city-guide-section__head',
    '.section-photo-banner','.community-card__photo','.community-hero-photo',
    '.about-photo-panel','.about-hero-photo','.archive-side-note--photo',
    '.game-cover--photo','.real-game-box--photo','.home-game-card','.cafe-gallery-card','.cafe-menu-card','.cafe-hero__copy','.cafe-hero__poster','.home-cafe-callout__copy','.home-cafe-callout__art','.game-db-card','.game-section-v2__head','.game-rule-card','.game-component-card','.game-fit-card','.game-related-card','.game-session-card','.game-final-cta'
  ].join(',');

  let observer;
  const motionRefresh = () => {
    if (reduced) return;
    const elements = $$(revealSelector).filter(el => !el.dataset.revealBound);
    elements.forEach((el, i) => {
      el.dataset.revealBound = '1';
      el.setAttribute('data-reveal', i % 7 === 0 ? 'scale' : 'up');
      el.style.setProperty('--reveal-delay', `${Math.min((i % 5) * 55, 220)}ms`);
      observer?.observe(el);
    });
  };
  if (!reduced && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
        if (entry.target.matches('.stat-strip > div')) animateStat(entry.target);
      });
    }, {threshold:.12, rootMargin:'0px 0px -7% 0px'});
  }
  window.LeisureMotion = { refresh: motionRefresh };
  motionRefresh();

  /* ---------------------------------------------------------
     Numeric stat count-up
     --------------------------------------------------------- */
  function animateStat(box) {
    if (reduced || box.dataset.counted) return;
    const b = $('b', box);
    if (!b) return;
    const raw = b.textContent.trim();
    const match = raw.match(/^(\+)?(\d+)$/);
    if (!match) return;
    box.dataset.counted = '1';
    const plus = !!match[1], target = Number(match[2]);
    const start = performance.now(), duration = 700;
    const frame = now => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      b.textContent = `${plus?'+':''}${Math.round(target * eased)}`;
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------
     Homepage finder
     --------------------------------------------------------- */
  const state = {players:'3-4',time:'60',mood:'strategy',complexity:'medium'};
  $$('.filter-group').forEach(group => {
    const key = group.dataset.filter;
    $$('.choice', group).forEach(btn => btn.addEventListener('click', () => {
      $$('.choice', group).forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (key) state[key] = btn.dataset.value;
    }));
  });
  $$('[data-set-mood]').forEach(card => card.addEventListener('click', () => {
    const value = card.dataset.setMood;
    const target = $(`.filter-group[data-filter="mood"] .choice[data-value="${value}"]`);
    if (target) {
      $$('.filter-group[data-filter="mood"] .choice').forEach(x => x.classList.remove('is-active'));
      target.classList.add('is-active');
      state.mood = value;
      $('#gameFinder')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});
    }
  }));
  const finder = $('#gameFinder'), finderResult = $('#finderResult'), matchCount = $('#matchCount');
  const matchScore = card => ['players','time','mood','complexity'].reduce((score,key)=>score+(card.dataset[key]===state[key]?1:0),0);
  finder?.addEventListener('submit', e => {
    e.preventDefault();
    const cards = $$('.game-card');
    const ranked = cards.map(card => ({card,score:matchScore(card)})).sort((a,b)=>b.score-a.score);
    const best = ranked[0]?.score ?? 0;
    let matches = 0;
    ranked.forEach(({card,score}) => {
      card.classList.remove('is-match','is-dimmed');
      if (score === best && score >= 2) { card.classList.add('is-match'); matches++; }
      else if (score <= 1) card.classList.add('is-dimmed');
    });
    matches = Math.max(matches, Math.min(3,cards.length));
    const token = $('.result-token', finderResult);
    if (token) token.textContent = String(matches);
    const p = $('p', finderResult);
    if (p) p.innerHTML = `<strong>${matches} پیشنهاد نزدیک پیدا شد.</strong> کارت‌های دورخط‌دار بهترین تطابق با انتخاب فعلی هستند.`;
    if (matchCount) matchCount.textContent = String(cards.length);
    $('#featured')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
    window.leisureToast?.(`${matches} بازی نزدیک به انتخابت پیدا شد`);
  });


  /* ---------------------------------------------------------
     Homepage featured-game save controls
     --------------------------------------------------------- */
  const homeSavedKey = 'leisure-saved-games';
  const readHomeSaved = () => {
    try { return JSON.parse(localStorage.getItem(homeSavedKey) || '[]'); }
    catch { return []; }
  };
  const paintHomeSaves = () => {
    const saved = readHomeSaved();
    $$('[data-home-save]').forEach(btn => {
      const on = saved.includes(btn.dataset.homeSave);
      btn.classList.toggle('is-saved', on);
      btn.textContent = on ? '♥' : '♡';
    });
  };
  $$('[data-home-save]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const slug = btn.dataset.homeSave;
      let saved = readHomeSaved();
      saved = saved.includes(slug) ? saved.filter(x => x !== slug) : [...saved, slug];
      localStorage.setItem(homeSavedKey, JSON.stringify(saved));
      paintHomeSaves();
      window.leisureToast?.(saved.includes(slug) ? 'بازی ذخیره شد' : 'از ذخیره‌ها حذف شد');
    });
  });
  paintHomeSaves();

  /* ---------------------------------------------------------
     Carousels
     --------------------------------------------------------- */
  const carousel = $('[data-carousel]');
  if (carousel) {
    let carouselIndex = 0;

    const getCarouselItems = () =>
      [...carousel.children].filter(el => el.matches('.game-card,.game-card--photo,.home-game-card'));

    const nearestCarouselIndex = () => {
      const items = getCarouselItems();
      if (!items.length) return 0;
      const cr = carousel.getBoundingClientRect();
      const center = cr.left + cr.width / 2;
      let best = 0, distance = Infinity;
      items.forEach((item, i) => {
        const r = item.getBoundingClientRect();
        const d = Math.abs((r.left + r.width / 2) - center);
        if (d < distance) { distance = d; best = i; }
      });
      return best;
    };

    const goToCarouselItem = index => {
      const items = getCarouselItems();
      if (!items.length) return;
      carouselIndex = Math.max(0, Math.min(items.length - 1, index));
      items[carouselIndex].scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    };

    $('[data-carousel-prev]')?.addEventListener('click', () => {
      carouselIndex = nearestCarouselIndex();
      goToCarouselItem(carouselIndex - 1);
    });

    $('[data-carousel-next]')?.addEventListener('click', () => {
      carouselIndex = nearestCarouselIndex();
      goToCarouselItem(carouselIndex + 1);
    });
  }

  /* ---------------------------------------------------------
     Home membership bridge
     --------------------------------------------------------- */
  const joinForm = $('#joinForm');
  joinForm?.addEventListener('submit', e => {
    e.preventDefault();
    const input = $('input', joinForm);
    const value = input?.value.trim();
    if (!value) return;
    sessionStorage.setItem('leisure_join_contact', value);
    window.leisureToast?.('عالیه — بریم سراغ عضویت');
    setTimeout(() => { location.href = 'community/index.html#join'; }, reduced ? 0 : 260);
  });
  const savedJoin = sessionStorage.getItem('leisure_join_contact');
  const memberPhone = $('#memberPhone');
  if (savedJoin && memberPhone && !memberPhone.value) {
    memberPhone.value = savedJoin;
    sessionStorage.removeItem('leisure_join_contact');
  }

  /* ---------------------------------------------------------
     Desktop tactile tilt + hero parallax
     --------------------------------------------------------- */
  if (!reduced && finePointer) {
    const tiltCards = () => {
      $$('.game-card,.category-card,.db-card,.article-card').forEach(card => {
        if (card.dataset.tiltBound) return;
        card.dataset.tiltBound = '1';
        card.addEventListener('mousemove', e => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX-r.left)/r.width-.5;
          const y = (e.clientY-r.top)/r.height-.5;
          card.style.transform = `translateY(-5px) rotateX(${(-y*1.7).toFixed(2)}deg) rotateY(${(x*1.7).toFixed(2)}deg)`;
        });
        card.addEventListener('mouseleave', () => card.style.removeProperty('transform'));
      });
    };
    tiltCards();
    const originalRefresh = window.LeisureMotion.refresh;
    window.LeisureMotion.refresh = () => { originalRefresh(); tiltCards(); };

    const heroArt = $('.hero-board');
    heroArt?.addEventListener('pointermove', e => {
      const r = heroArt.getBoundingClientRect();
      const x = ((e.clientX-r.left)/r.width-.5)*10;
      const y = ((e.clientY-r.top)/r.height-.5)*10;
      heroArt.style.setProperty('--parallax-x',`${x}px`);
      heroArt.style.setProperty('--parallax-y',`${y}px`);
    });
    heroArt?.addEventListener('pointerleave', () => {
      heroArt.style.setProperty('--parallax-x','0px');
      heroArt.style.setProperty('--parallax-y','0px');
    });
  }

  /* ---------------------------------------------------------
     Button press micro-interaction
     --------------------------------------------------------- */
  $$('.btn,.icon-action').forEach(btn => {
    btn.addEventListener('pointerdown', () => btn.classList.add('is-pressed'));
    ['pointerup','pointercancel','pointerleave'].forEach(ev => btn.addEventListener(ev, () => btn.classList.remove('is-pressed')));
  });

  /* ---------------------------------------------------------
     Generic copy controls
     --------------------------------------------------------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy || '');
      window.leisureToast?.('کپی شد');
    } catch {}
  }));

  /* ---------------------------------------------------------
     Mobile database filters
     --------------------------------------------------------- */
  let filterBackdrop;
  const filters = $('.filters');
  const closeFilters = () => {
    filters?.classList.remove('is-open');
    filterBackdrop?.classList.remove('is-open');
    document.body.classList.remove('filter-open');
  };
  if (filters && $('.database-layout')) {
    const toggleFilters = document.createElement('button');
    toggleFilters.className = 'mobile-filter-toggle';
    toggleFilters.type = 'button';
    toggleFilters.innerHTML = '<span>☷</span> فیلتر بازی‌ها';
    $('.database-layout').before(toggleFilters);
    filterBackdrop = document.createElement('div');
    filterBackdrop.className = 'filter-backdrop';
    document.body.appendChild(filterBackdrop);
    toggleFilters.addEventListener('click', () => {
      const open = !filters.classList.contains('is-open');
      filters.classList.toggle('is-open', open);
      filterBackdrop.classList.toggle('is-open', open);
      document.body.classList.toggle('filter-open', open);
    });
    filterBackdrop.addEventListener('click', closeFilters);
    $('#clearFilters')?.addEventListener('click', () => setTimeout(closeFilters,120));
  }

  /* ---------------------------------------------------------
     Search shortcut: "/" or Ctrl/Cmd+K
     --------------------------------------------------------- */
  document.addEventListener('keydown', e => {
    const target = e.target;
    const typing = /INPUT|TEXTAREA|SELECT/.test(target?.tagName) || target?.isContentEditable;
    const shortcut = (!typing && e.key === '/') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k');
    if (!shortcut) return;
    e.preventDefault();
    const input = $('#searchInput') || $('#gameSearch');
    if (input) { input.focus(); input.select?.(); return; }
    const searchLink = $('.main-nav a[href*="search/index.html"]');
    if (searchLink) location.href = searchLink.href;
  });

  /* ---------------------------------------------------------
     Generated-photo parallax
     - transform/opacity only
     - requestAnimationFrame throttled
     - disabled for reduced motion
     --------------------------------------------------------- */
  if (!reduced) {
    const mediaBlocks = $$('.section-photo-banner,.community-card__photo,.community-hero-photo,.about-photo-panel,.about-hero-photo,.archive-side-note--photo,.magazine-feature__art,.feature-story__art');
    mediaBlocks.forEach(el => el.classList.add('motion-media'));
    let mediaTick = false;
    const paintMedia = () => {
      mediaTick = false;
      const vh = window.innerHeight || 800;
      mediaBlocks.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        const center = r.top + r.height / 2;
        const normalized = (center - vh / 2) / vh;
        const y = Math.max(-16, Math.min(16, normalized * -18));
        el.style.setProperty('--media-y', `${y.toFixed(1)}px`);
      });
    };
    const requestMediaPaint = () => {
      if (mediaTick) return;
      mediaTick = true;
      requestAnimationFrame(paintMedia);
    };
    paintMedia();
    window.addEventListener('scroll', requestMediaPaint, {passive:true});
    window.addEventListener('resize', requestMediaPaint, {passive:true});
  }

  /* ---------------------------------------------------------
     Sticky game-page navigation scroll-spy
     --------------------------------------------------------- */
  const gamePageNav = $('.game-page-nav');
  if (gamePageNav && 'IntersectionObserver' in window) {
    const navLinks = $$('a[href^="#"]', gamePageNav);
    const sectionMap = new Map(
      navLinks
        .map(link => {
          const id = link.getAttribute('href')?.slice(1);
          return id ? [id, link] : null;
        })
        .filter(Boolean)
    );

    const setActiveGameNav = id => {
      navLinks.forEach(link => {
        const active = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    const spyObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a,b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
      if (!visible.length) return;
      const id = visible[0].target.id;
      if (sectionMap.has(id)) {
        setActiveGameNav(id);
        sectionMap.get(id)?.scrollIntoView({
          behavior:'auto',
          block:'nearest',
          inline:'center'
        });
      }
    }, {rootMargin:'-18% 0px -66% 0px', threshold:[0,.01,.25]});

    sectionMap.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) spyObserver.observe(section);
    });
  }

  /* ---------------------------------------------------------
     Same-site page transitions
     --------------------------------------------------------- */
  if (!reduced) {
    window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || /^(mailto:|tel:|sms:|javascript:)/i.test(href)) return;
      let url;
      try { url = new URL(href, location.href); } catch { return; }
      if (!['http:','https:','file:'].includes(url.protocol)) return;
      if (url.protocol !== 'file:' && url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      if (url.protocol !== location.protocol) return;
      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(() => { location.href = url.href; }, 145);
    });
  }
})();