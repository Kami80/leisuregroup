(() => {
  const data = window.LEISURE_CAFE_MENU || {items:[],categories:[],meta:{}};
  const byId = Object.fromEntries(data.items.map(x => [x.id, x]));
  const grid = document.getElementById('cafeMenuGrid');
  const gallery = document.getElementById('cafeGalleryCards');
  const search = document.getElementById('cafeSearch');
  const clearSearch = document.getElementById('clearCafeSearch');
  const count = document.getElementById('cafeResultCount');
  const empty = document.getElementById('cafeEmpty');
  const tabsWrap = document.getElementById('cafeCategoryTabs');
  const orderBar = document.getElementById('cafeOrderBar');
  const orderCount = document.getElementById('cafeOrderCount');
  const orderSummary = document.getElementById('cafeOrderSummary');
  const openOrder = document.getElementById('openCafeOrder');
  const sheet = document.getElementById('cafeOrderSheet');
  const orderItems = document.getElementById('cafeOrderItems');
  const orderNote = document.getElementById('cafeOrderNote');
  const clearOrder = document.getElementById('clearCafeOrder');
  const sendOrder = document.getElementById('sendCafeOrder');
  const orderTotal = document.getElementById('cafeOrderTotal');

  const itemSheet = document.getElementById('cafeItemSheet');
  const itemImage = document.getElementById('cafeItemImage');
  const itemCategory = document.getElementById('cafeItemCategory');
  const itemPrice = document.getElementById('cafeItemPrice');
  const itemTitle = document.getElementById('cafeItemTitle');
  const itemDesc = document.getElementById('cafeItemDesc');
  const itemTags = document.getElementById('cafeItemTags');
  const itemLines = document.getElementById('cafeItemLines');
  const itemLineChoices = document.getElementById('cafeItemLineChoices');
  const itemQty = document.getElementById('cafeItemQty');
  const itemMinus = document.getElementById('cafeItemMinus');
  const itemPlus = document.getElementById('cafeItemPlus');
  const itemAdd = document.getElementById('cafeItemAdd');

  const mobileAppBar = document.getElementById('cafeMobileAppBar');
  const mobileCartButton = document.getElementById('cafeMobileCartButton');
  const mobileCartBadge = document.getElementById('cafeMobileCartBadge');
  const bottomCartBadge = document.getElementById('cafeBottomCartBadge');
  const floatingCart = document.getElementById('cafeFloatingCart');
  const floatingCartCount = document.getElementById('cafeFloatingCartCount');
  const floatingCartTotal = document.getElementById('cafeFloatingCartTotal');
  const bottomNav = document.getElementById('cafeMobileBottomNav');
  const categoryFloatShell = document.getElementById('cafeCategoryFloatShell');
  const categoryFloatAnchor = document.getElementById('cafeCategoryFloatAnchor');
  const mobileStatus = document.getElementById('cafeMobileStatus');

  let category = 'all';
  let currentItem = null;
  let currentQty = 1;
  let currentLine = '';
  const cart = new Map();
  const cartStorageKey = 'leisure-cafe-cart-v2';

  const saveCart = () => {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify([...cart.entries()]));
    } catch {}
  };

  const restoreCart = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(cartStorageKey) || '[]');
      if (!Array.isArray(raw)) return;
      raw.forEach(([key, entry]) => {
        if (entry && byId[entry.id] && Number(entry.qty) > 0) {
          cart.set(key, {
            id: entry.id,
            qty: Number(entry.qty),
            line: entry.line || ''
          });
        }
      });
    } catch {}
  };

  const tinyHaptic = () => {
    try { navigator.vibrate?.(18); } catch {}
  };

  const faNum = n => new Intl.NumberFormat('fa-IR').format(n);
  const money = n => `${faNum(n)} تومان`;
  const itemUnitPrice = (item, line = '') => {
    if (!item) return 0;
    if (hasCoffeeLine(item) && line && item.linePrices?.[line]) return Number(item.linePrices[line]);
    return Number(item.price || 0);
  };
  const normalize = s => (s || '').toString().toLowerCase().replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').replace(/\s+/g,' ').trim();
  const categoryInfo = id => data.categories.find(c => c.id === id) || {title:'کافه', icon:'✦'};
  const cartKey = (id, line='') => `${id}::${line || ''}`;
  const hasCoffeeLine = item => Boolean(
    item &&
    item.coffeeBase === true &&
    Array.isArray(item.lines) &&
    item.lines.length > 0 &&
    (item.tags || []).some(tag => normalize(tag) === 'قهوه')
  );

  const centerActiveCategoryTab = () => {
    if (!tabsWrap) return;
    const activeBtn = tabsWrap.querySelector('[aria-pressed="true"]');
    if (!activeBtn) return;

    /* Horizontal-only. scrollIntoView() can also alter vertical page
       position on mobile and fight the user's finger scrolling. */
    const target =
      activeBtn.offsetLeft -
      (tabsWrap.clientWidth - activeBtn.offsetWidth) / 2;

    tabsWrap.scrollTo({
      left: target,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  };

  function renderTabs() {
    const countFor = id => id === 'all'
      ? data.items.length
      : data.items.filter(item => item.category === id).length;

    const helperText = {
      all: 'کل منو',
      hot: 'گرم',
      cold: 'خنک',
      snack: 'خوراکی',
      dessert: 'شیرین'
    };

    tabsWrap.innerHTML = data.categories.map(c => {
      const active = c.id === category;
      return `
        <button
          type="button"
          data-cafe-category="${c.id}"
          class="cafe-tab ${active ? 'is-active' : ''}"
          aria-pressed="${active}"
          aria-controls="cafeMenuGrid"
          aria-label="${c.title}، ${countFor(c.id)} آیتم">
          <span class="cafe-tab__icon" aria-hidden="true">${c.icon}</span>
          <span class="cafe-tab__copy">
            <b>${c.short}</b>
            <small>${helperText[c.id] || c.title}</small>
          </span>
          <em class="cafe-tab__count" aria-hidden="true">${faNum(countFor(c.id))}</em>
        </button>
      `;
    }).join('');

    const buttons = [...tabsWrap.querySelectorAll('[data-cafe-category]')];
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        category = btn.dataset.cafeCategory;
        renderTabs();
        render();
        requestAnimationFrame(centerActiveCategoryTab);
      });
    });
  }

  function renderGallery() {
    gallery.innerHTML = (data.meta.hero_images || []).map((item, idx) => `
      <button class="cafe-gallery-card" type="button" data-gallery-target="${item.target}" data-reveal style="--d:${idx}">
        <img src="../${item.image}" alt="${item.title}">
        <span>${item.title}</span>
      </button>
    `).join('');
    gallery.querySelectorAll('[data-gallery-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        category = btn.dataset.galleryTarget || 'all';
        renderTabs();
        render();
        requestAnimationFrame(centerActiveCategoryTab);
        document.getElementById('cafeMenu')?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
      });
    });
  }

  function filtered() {
    const q = normalize(search?.value);
    return data.items.filter(item => {
      const catOk = category === 'all' || item.category === category;
      const hay = normalize([item.name, item.desc, ...(item.tags || []), categoryInfo(item.category).title, ...(item.lines || [])].join(' '));
      return catOk && (!q || hay.includes(q));
    });
  }

  function categoryDivider(categoryId, compact = false) {
    const cat = categoryInfo(categoryId);
    const categoryItems = data.items.filter(item => item.category === categoryId);
    const subtitles = {
      hot: 'قهوه، چای و نوشیدنی‌های گرم',
      cold: 'خنک، تازه و مناسب بین دو دور بازی',
      snack: 'برای اشتراک روی میز و بازی‌های طولانی',
      dessert: 'یک پایان شیرین برای شب بازی'
    };
    return `
      <div class="cafe-menu-divider cafe-menu-divider--${categoryId} ${compact ? 'is-compact' : ''}" data-menu-divider="${categoryId}">
        <div class="cafe-menu-divider__ticket">
          <span class="cafe-menu-divider__icon" aria-hidden="true">${cat.icon}</span>
          <div class="cafe-menu-divider__copy">
            <small>${compact ? 'دسته انتخاب‌شده' : 'بخش بعدی منو'}</small>
            <h2>${cat.title}</h2>
            <p>${subtitles[categoryId] || ''}</p>
          </div>
          <span class="cafe-menu-divider__count">${faNum(categoryItems.length)} آیتم</span>
        </div>
        <div class="cafe-menu-divider__track" aria-hidden="true">
          <span></span><i></i><span></span><i></i><span></span><i></i><span></span>
        </div>
      </div>
    `;
  }

  function card(item, idx) {
    const cat = categoryInfo(item.category);
    return `
      <article class="cafe-menu-card" data-menu-open="${item.id}" data-category="${item.category}" tabindex="0" data-reveal style="--d:${idx}">
        <div class="cafe-menu-card__image">
          <img src="../${item.imageThumb || item.image}" alt="${item.name}" loading="lazy" decoding="async">
          <span class="cafe-menu-card__price">${hasCoffeeLine(item) ? `از ${money(item.price)}` : money(item.price)}</span>
          <span class="cafe-menu-card__category"><b>${cat.icon}</b>${cat.title}</span>
        </div>
        <div class="cafe-menu-card__body">
          <div class="cafe-menu-card__title">
            <h3>${item.name}</h3>
            ${hasCoffeeLine(item) ? '<span class="cafe-menu-card__lineflag">لاین قهوه</span>' : ''}
          </div>
          <p>${item.desc}</p>
          <div class="cafe-menu-card__tags">
            ${(item.tags || []).map(t => `<span>${t}</span>`).join('')}
            ${hasCoffeeLine(item) ? '<span>۷۰/۳۰</span><span>۱۰۰٪ عربیکا</span>' : ''}
          </div>
          <div class="cafe-menu-card__foot">
            <span class="cafe-menu-card__hint">جزئیات و انتخاب${hasCoffeeLine(item) ? ' لاین قهوه' : ''}</span>
            <div class="cafe-menu-card__actions">
              <span class="cafe-menu-card__cta">مشاهده ←</span>
              <button class="cafe-menu-card__quickadd" type="button" data-quick-add="${item.id}" aria-label="افزودن سریع ${item.name}">＋</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function bindCards() {
    grid.querySelectorAll('[data-quick-add]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const item = byId[btn.dataset.quickAdd];
        if (!item) return;
        const line = hasCoffeeLine(item) ? (item.lines?.[0] || '') : '';
        const key = cartKey(item.id, line);
        const existing = cart.get(key) || {id:item.id, qty:0, line};
        existing.qty += 1;
        cart.set(key, existing);
        saveCart();
        updateOrderUI();
        tinyHaptic();
        window.leisureToast?.(`${item.name} به سفارش اضافه شد`);
        btn.classList.add('is-added');
        setTimeout(() => btn.classList.remove('is-added'), 420);
      });
    });

    grid.querySelectorAll('[data-menu-open]').forEach(node => {
      const open = () => openItem(node.dataset.menuOpen);
      node.addEventListener('click', open);
      node.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function render() {
    const list = filtered();
    let html = '';

    if (category === 'all' && !normalize(search?.value)) {
      const order = ['hot','cold','snack','dessert'];
      let runningIndex = 0;
      html = order.map(catId => {
        const group = list.filter(item => item.category === catId);
        if (!group.length) return '';
        const section = categoryDivider(catId, false) +
          group.map(item => card(item, runningIndex++)).join('');
        return section;
      }).join('');
    } else if (category !== 'all' && list.length) {
      html = categoryDivider(category, true) + list.map(card).join('');
    } else {
      html = list.map(card).join('');
    }

    grid.innerHTML = html;
    count.textContent = `${faNum(list.length)} آیتم`;
    empty.classList.toggle('is-visible', !list.length);
    bindCards();
    window.LeisureMotion?.refresh?.();
  }

  function openItem(id) {
    const item = byId[id];
    if (!item) return;
    currentItem = item;
    currentQty = 1;
    currentLine = hasCoffeeLine(item) ? (item.lines?.[0] || '') : '';
    paintItem();
    itemSheet.hidden = false;
    requestAnimationFrame(() => itemSheet.classList.add('is-open'));
    document.body.classList.add('cafe-sheet-open');
  }

  function paintItem() {
    if (!currentItem) return;
    const cat = categoryInfo(currentItem.category);
    itemImage.src = `../${currentItem.image}`;
    itemImage.alt = currentItem.name;
    itemCategory.textContent = `${cat.icon} ${cat.title}`;
    itemPrice.textContent = money(itemUnitPrice(currentItem, currentLine));
    itemTitle.textContent = currentItem.name;
    itemDesc.textContent = currentItem.desc;
    itemTags.innerHTML = [
      ...(currentItem.tags || []).map(t => `<span>${t}</span>`),
      hasCoffeeLine(currentItem) ? '<span>لاین قهوه قابل انتخاب</span>' : ''
    ].join('');
    itemQty.textContent = faNum(currentQty);

    if (hasCoffeeLine(currentItem)) {
      itemLines.hidden = false;
      itemLineChoices.innerHTML = currentItem.lines.map(line => `
        <button type="button" class="${line === currentLine ? 'is-active' : ''}" data-line="${line}">
          <span>${line}</span>
          <small>${money(itemUnitPrice(currentItem, line))}</small>
        </button>
      `).join('');
      itemLineChoices.querySelectorAll('[data-line]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentLine = btn.dataset.line;
          paintItem();
        });
      });
    } else {
      itemLines.hidden = true;
      itemLineChoices.innerHTML = '';
    }
  }

  function closeItem() {
    itemSheet.classList.remove('is-open');
    document.body.classList.remove('cafe-sheet-open');
    setTimeout(() => { itemSheet.hidden = true; syncCafeBodyScrollLock(); }, 220);
  }

  function addCurrentItem() {
    if (!currentItem) return;
    const key = cartKey(currentItem.id, currentLine);
    const existing = cart.get(key) || {id: currentItem.id, qty: 0, line: currentLine};
    existing.qty += currentQty;
    existing.line = currentLine;
    cart.set(key, existing);
    saveCart();
    updateOrderUI();
    tinyHaptic();
    closeItem();
    window.leisureToast?.('به سفارش اضافه شد');
  }

  function totalQty() {
    return [...cart.values()].reduce((a, b) => a + b.qty, 0);
  }

  function totalPrice() {
    return [...cart.values()].reduce((sum, entry) => {
      const item = byId[entry.id];
      return sum + (itemUnitPrice(item, entry.line) * entry.qty);
    }, 0);
  }

  function updateOrderUI() {
    const n = totalQty();
    const total = totalPrice();
    const countText = faNum(n);
    const totalText = money(total);

    orderCount.textContent = countText;
    orderSummary.textContent = `جمع سفارش — ${totalText}`;
    orderBar.classList.toggle('is-visible', n > 0);
    orderTotal.textContent = `جمع سفارش: ${totalText}`;

    if (mobileCartBadge) mobileCartBadge.textContent = countText;
    if (bottomCartBadge) bottomCartBadge.textContent = countText;
    if (floatingCartCount) floatingCartCount.textContent = countText;
    if (floatingCartTotal) floatingCartTotal.textContent = totalText;

    mobileCartButton?.classList.toggle('has-items', n > 0);
    bottomNav?.classList.toggle('has-cart', n > 0);

    if (floatingCart) {
      floatingCart.hidden = n === 0;
      floatingCart.classList.toggle('is-visible', n > 0);
    }

    if (mobileStatus) {
      mobileStatus.textContent = n > 0 ? `${countText} مورد در سفارش` : 'منو · سفارش · بازی';
    }
  }

  function renderOrder() {
    if (!cart.size) {
      orderItems.innerHTML = '<div class="cafe-order-empty">هنوز چیزی انتخاب نکردی.</div>';
      orderTotal.textContent = 'جمع سفارش: ۰ تومان';
      return;
    }
    orderItems.innerHTML = [...cart.entries()].map(([key, entry]) => {
      const item = byId[entry.id];
      return `
        <div class="cafe-order-row">
          <div>
            <strong>${item.name}</strong>
            <small>${categoryInfo(item.category).title}${entry.line ? ` · ${entry.line}` : ''}</small>
            <div class="cafe-order-row__price">${money(itemUnitPrice(item, entry.line))}</div>
          </div>
          <div class="cafe-order-row__qty">
            <button type="button" data-sheet-minus="${key}">−</button>
            <b>${faNum(entry.qty)}</b>
            <button type="button" data-sheet-plus="${key}">＋</button>
          </div>
        </div>
      `;
    }).join('');
    orderTotal.textContent = `جمع سفارش: ${money(totalPrice())}`;
    document.querySelectorAll('[data-sheet-plus]').forEach(b => b.addEventListener('click', () => {
      const obj = cart.get(b.dataset.sheetPlus);
      if (!obj) return;
      obj.qty += 1;
      cart.set(b.dataset.sheetPlus, obj);
      saveCart();
      updateOrderUI();
      renderOrder();
    }));
    document.querySelectorAll('[data-sheet-minus]').forEach(b => b.addEventListener('click', () => {
      const obj = cart.get(b.dataset.sheetMinus);
      if (!obj) return;
      obj.qty -= 1;
      if (obj.qty <= 0) cart.delete(b.dataset.sheetMinus);
      else cart.set(b.dataset.sheetMinus, obj);
      saveCart();
      updateOrderUI();
      renderOrder();
    }));
  }

  function openOrderSheet() {
    renderOrder();
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    document.body.classList.add('cafe-sheet-open');
  }

  function closeOrderSheet() {
    sheet.classList.remove('is-open');
    document.body.classList.remove('cafe-sheet-open');
    setTimeout(() => { sheet.hidden = true; syncCafeBodyScrollLock(); }, 220);
  }

  function sendWhatsapp() {
    if (!cart.size) {
      window.leisureToast?.('اول چند مورد انتخاب کن');
      return;
    }
    const lines = [...cart.values()].map(entry => {
      const item = byId[entry.id];
      const line = entry.line ? ` | لاین: ${entry.line}` : '';
      return `• ${item.name} × ${entry.qty}${line} — ${money(itemUnitPrice(item, entry.line) * entry.qty)}`;
    });
    const note = (orderNote?.value || '').trim();
    const message = `سلام کافه آپادانا 👋
برای این موارد درخواست دارم:

${lines.join('\n')}

جمع سفارش: ${money(totalPrice())}
${note ? `\nیادداشت: ${note}` : ''}

لطفاً سفارش را تأیید کنید.`;
    window.open(`https://wa.me/${data.meta.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  document.querySelectorAll('[data-quick-query]').forEach(btn => {
    btn.addEventListener('click', () => {
      search.value = btn.dataset.quickQuery || '';
      render();
      document.getElementById('cafeMenuGrid')?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
    });
  });

  search?.addEventListener('input', render);
  clearSearch?.addEventListener('click', () => {
    search.value = '';
    search.focus();
    render();
  });

  itemMinus?.addEventListener('click', () => {
    currentQty = Math.max(1, currentQty - 1);
    itemQty.textContent = faNum(currentQty);
  });
  itemPlus?.addEventListener('click', () => {
    currentQty += 1;
    itemQty.textContent = faNum(currentQty);
  });
  itemAdd?.addEventListener('click', addCurrentItem);
  document.querySelectorAll('[data-close-item]').forEach(x => x.addEventListener('click', closeItem));

  openOrder?.addEventListener('click', openOrderSheet);
  document.querySelectorAll('[data-close-cafe-order]').forEach(x => x.addEventListener('click', closeOrderSheet));
  clearOrder?.addEventListener('click', () => {
    cart.clear();
    saveCart();
    updateOrderUI();
    renderOrder();
    window.leisureToast?.('سفارش پاک شد');
  });
  sendOrder?.addEventListener('click', sendWhatsapp);

  /* -------------------------------------------------------
     Mobile app navigation + floating scroll UI
     ------------------------------------------------------- */
  const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  const goMenu = () => {
    document.getElementById('cafeMenu')?.scrollIntoView({behavior:smooth(), block:'start'});
  };

  const goSearch = () => {
    document.getElementById('cafeMenu')?.scrollIntoView({behavior:smooth(), block:'start'});
    setTimeout(() => {
      search?.focus({preventScroll:true});
      search?.closest('.cafe-search')?.classList.add('is-mobile-focus');
      setTimeout(() => search?.closest('.cafe-search')?.classList.remove('is-mobile-focus'), 900);
    }, 340);
  };

  const goCoffee = () => {
    category = 'hot';
    search.value = 'قهوه';
    renderTabs();
    render();
    goMenu();
  };

  const goLocation = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${data.meta.lat},${data.meta.lng}&travelmode=driving`,
      '_blank',
      'noopener'
    );
  };

  mobileCartButton?.addEventListener('click', openOrderSheet);
  floatingCart?.addEventListener('click', openOrderSheet);

  bottomNav?.querySelectorAll('[data-bottom-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      bottomNav.querySelectorAll('[data-bottom-action]').forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      const action = btn.dataset.bottomAction;
      if (action === 'menu') goMenu();
      if (action === 'search') goSearch();
      if (action === 'cart') openOrderSheet();
      if (action === 'location') goLocation();
      tinyHaptic();
    });
  });

  document.querySelector('[data-mobile-search]')?.addEventListener('click', goSearch);
  document.querySelector('[data-mobile-coffee]')?.addEventListener('click', goCoffee);
  document.querySelector('[data-mobile-location]')?.addEventListener('click', goLocation);

  /* -------------------------------------------------------
     True floating category tabs
     ------------------------------------------------------- */
  if (mobileAppBar && categoryFloatShell && categoryFloatAnchor) {
    let lastY = window.scrollY;
    let ticking = false;

    const paintFloatingTabs = () => {
      const mobile = matchMedia('(max-width:760px)').matches;

      if (!mobile) {
        mobileAppBar.classList.remove('is-hidden');
        categoryFloatShell.classList.remove('is-fixed','is-appbar-hidden','is-floating','is-compact');
        categoryFloatShell.style.removeProperty('--float-left');
        categoryFloatShell.style.removeProperty('--float-width');
        categoryFloatAnchor.style.height = '0px';
        lastY = window.scrollY;
        return;
      }

      const y = window.scrollY;
      const delta = y - lastY;
      const nearTop = y < 24;

      if (!nearTop && delta > 5) mobileAppBar.classList.add('is-hidden');
      if (delta < -4 || nearTop) mobileAppBar.classList.remove('is-hidden');

      const appBarHidden = mobileAppBar.classList.contains('is-hidden');
      categoryFloatShell.classList.toggle('is-appbar-hidden', appBarHidden);

      const anchorRect = categoryFloatAnchor.getBoundingClientRect();
      const menu = document.getElementById('cafeMenu');
      const menuRect = menu?.getBoundingClientRect();
      const navHeight = Math.max(54, categoryFloatShell.offsetHeight || 0);
      const viewportOffset = window.visualViewport?.offsetTop || 0;
      const desiredTop = (appBarHidden ? 6 : 62) + viewportOffset;

      const shouldFloat = Boolean(
        menuRect &&
        anchorRect.top <= desiredTop &&
        menuRect.bottom > desiredTop + navHeight + 24
      );

      if (shouldFloat) {
        const contentShell = menu?.querySelector('.shell');
        const contentRect = contentShell?.getBoundingClientRect() || anchorRect;
        const left = Math.max(8, contentRect.left);
        const width = Math.min(window.innerWidth - 16, contentRect.width);

        categoryFloatShell.style.setProperty('--float-left', `${left}px`);
        categoryFloatShell.style.setProperty('--float-width', `${width}px`);
        categoryFloatAnchor.style.height = `${navHeight + 8}px`;

        categoryFloatShell.classList.add('is-fixed','is-floating');
        categoryFloatShell.classList.toggle(
          'is-compact',
          y > (menu?.offsetTop || 0) + 260
        );
      } else {
        categoryFloatShell.classList.remove('is-fixed','is-floating','is-compact');
        categoryFloatShell.style.removeProperty('--float-left');
        categoryFloatShell.style.removeProperty('--float-width');
        categoryFloatAnchor.style.height = '0px';
      }

      lastY = y;
    };

    const requestFloatingTabsPaint = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        paintFloatingTabs();
      });
    };

    paintFloatingTabs();
    window.addEventListener('scroll', requestFloatingTabsPaint, {passive:true});
    window.addEventListener('resize', requestFloatingTabsPaint, {passive:true});
    window.visualViewport?.addEventListener('resize', requestFloatingTabsPaint, {passive:true});
  }

  /* -------------------------------------------------------
     Scroll-lock safety
     ------------------------------------------------------- */
  const syncCafeBodyScrollLock = () => {
    const itemOpen = Boolean(
      itemSheet &&
      !itemSheet.hidden &&
      itemSheet.classList.contains('is-open')
    );
    const orderOpen = Boolean(
      sheet &&
      !sheet.hidden &&
      sheet.classList.contains('is-open')
    );
    document.body.classList.toggle('cafe-sheet-open', itemOpen || orderOpen);
  };

  window.addEventListener('pageshow', syncCafeBodyScrollLock);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncCafeBodyScrollLock();
  });
  requestAnimationFrame(syncCafeBodyScrollLock);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!itemSheet.hidden) closeItem();
      if (!sheet.hidden) closeOrderSheet();
    }
  });

  restoreCart();

  /* -------------------------------------------------------
     Category rail pointer-drag
     Touch uses native scrolling; this enhances mouse/pen.
     ------------------------------------------------------- */
  if (tabsWrap) {
    let dragActive = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let dragMoved = false;

    tabsWrap.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      dragActive = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartScroll = tabsWrap.scrollLeft;
      tabsWrap.classList.add('is-dragging');
      tabsWrap.setPointerCapture?.(e.pointerId);
    });

    tabsWrap.addEventListener('pointermove', e => {
      if (!dragActive || e.pointerType === 'touch') return;
      const dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 4) dragMoved = true;
      tabsWrap.scrollLeft = dragStartScroll - dx;
    });

    const stopCategoryDrag = e => {
      if (!dragActive) return;
      dragActive = false;
      tabsWrap.classList.remove('is-dragging');
      try { tabsWrap.releasePointerCapture?.(e.pointerId); } catch {}
    };

    tabsWrap.addEventListener('pointerup', stopCategoryDrag);
    tabsWrap.addEventListener('pointercancel', stopCategoryDrag);

    tabsWrap.addEventListener('click', e => {
      if (!dragMoved) return;
      e.preventDefault();
      e.stopPropagation();
      dragMoved = false;
    }, true);
  }

  renderTabs();
  renderGallery();
  render();
  updateOrderUI();
})();