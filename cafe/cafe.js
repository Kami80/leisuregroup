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
  const mobileStatus = document.getElementById('cafeMobileStatus');
  const menuContextText = document.getElementById('cafeMenuContextText');
  const menuReset = document.getElementById('cafeMenuReset');
  const emptyReset = document.getElementById('cafeEmptyReset');
  const undoToast = document.getElementById('cafeUndoToast');
  const undoText = document.getElementById('cafeUndoText');
  const undoButton = document.getElementById('cafeUndoButton');

  let category = 'all';
  let currentItem = null;
  let currentQty = 1;
  let currentLine = '';
  const cart = new Map();
  let categorySpy = null;
  let lastUndo = null;
  let undoTimer = null;
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
    if (item.coffeeBase && line && item.linePrices?.[line]) return Number(item.linePrices[line]);
    return Number(item.price || 0);
  };
  const normalize = s => (s || '').toString().toLowerCase().replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').replace(/\s+/g,' ').trim();
  const categoryInfo = id => data.categories.find(c => c.id === id) || {title:'کافه', icon:'✦'};
  const cartKey = (id, line='') => `${id}::${line || ''}`;
  const itemCartQty = id => [...cart.values()]
    .filter(entry => entry.id === id)
    .reduce((sum, entry) => sum + Number(entry.qty || 0), 0);

  const setActiveTabVisual = id => {
    const buttons = [...tabsWrap.querySelectorAll('[data-cafe-category]')];
    buttons.forEach(btn => {
      const active = btn.dataset.cafeCategory === id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const activeBtn = tabsWrap.querySelector(`[data-cafe-category="${id}"]`);
    activeBtn?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  };

  const updateMenuContext = list => {
    const q = normalize(search?.value);
    const cat = categoryInfo(category);
    const label = category === 'all' ? 'همه منو' : cat.title;
    if (menuContextText) {
      menuContextText.textContent = q
        ? `${label} · ${faNum(list.length)} نتیجه برای «${search.value.trim()}»`
        : `${label} · ${faNum(list.length)} آیتم`;
    }
    if (menuReset) menuReset.hidden = category === 'all' && !q;
  };

  const resetMenuFilters = () => {
    category = 'all';
    if (search) search.value = '';
    document.querySelectorAll('[data-quick-query]').forEach(x => x.classList.remove('is-active'));
    renderTabs();
    render();
  };

  const showUndo = (message, action) => {
    if (!undoToast) return;
    lastUndo = action;
    undoText.textContent = message;
    undoToast.hidden = false;
    requestAnimationFrame(() => undoToast.classList.add('is-visible'));
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
      undoToast.classList.remove('is-visible');
      setTimeout(() => { undoToast.hidden = true; }, 220);
      lastUndo = null;
    }, 4200);
  };

  function renderTabs() {
    const countFor = id => id === 'all'
      ? data.items.length
      : data.items.filter(item => item.category === id).length;

    tabsWrap.innerHTML = data.categories.map(c => {
      const active = c.id === category;
      return `
        <button
          type="button"
          data-cafe-category="${c.id}"
          class="${active ? 'is-active' : ''}"
          aria-pressed="${active}"
          aria-label="${c.title}، ${countFor(c.id)} آیتم">
          <span class="cafe-category-tabs__icon" aria-hidden="true">${c.icon}</span>
          <span class="cafe-category-tabs__label">${c.short}</span>
          <em class="cafe-category-tabs__count" aria-hidden="true">${faNum(countFor(c.id))}</em>
        </button>
      `;
    }).join('');

    const buttons = [...tabsWrap.querySelectorAll('[data-cafe-category]')];

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        category = btn.dataset.cafeCategory;
        renderTabs();
        render();

        requestAnimationFrame(() => {
          setActiveTabVisual(category);
          if (matchMedia('(max-width:760px)').matches) {
            document.getElementById('cafeMenuGrid')?.scrollIntoView({
              behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
              block: 'start'
            });
          }
        });
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
        requestAnimationFrame(() => {
          tabsWrap.querySelector('[aria-pressed="true"]')?.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        });
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
    const inCart = itemCartQty(item.id);
    const control = item.coffeeBase
      ? `<button class="cafe-menu-card__choose-line" type="button" data-open-coffee="${item.id}">
           <span>${inCart ? `${faNum(inCart)} در سفارش` : 'انتخاب لاین'}</span><b>←</b>
         </button>`
      : inCart
        ? `<div class="cafe-card-stepper" aria-label="تعداد ${item.name} در سفارش">
             <button type="button" data-card-minus="${item.id}" aria-label="کم کردن ${item.name}">−</button>
             <b>${faNum(inCart)}</b>
             <button type="button" data-card-plus="${item.id}" aria-label="اضافه کردن ${item.name}">＋</button>
           </div>`
        : `<button class="cafe-menu-card__quickadd" type="button" data-card-plus="${item.id}" aria-label="افزودن ${item.name}">＋</button>`;

    return `
      <article class="cafe-menu-card ${inCart ? 'has-cart-item' : ''}" data-menu-open="${item.id}" data-category="${item.category}" tabindex="0" data-reveal style="--d:${idx}">
        <div class="cafe-menu-card__image">
          <img src="../${item.imageThumb || item.image}" alt="${item.name}" loading="lazy" decoding="async">
          <span class="cafe-menu-card__price">${item.coffeeBase ? `از ${money(item.price)}` : money(item.price)}</span>
          <span class="cafe-menu-card__category"><b>${cat.icon}</b>${cat.title}</span>
          ${inCart ? `<span class="cafe-menu-card__cartbadge">✓ ${faNum(inCart)}</span>` : ''}
        </div>
        <div class="cafe-menu-card__body">
          <div class="cafe-menu-card__title">
            <h3>${item.name}</h3>
            ${item.coffeeBase ? '<span class="cafe-menu-card__lineflag">لاین قهوه</span>' : ''}
          </div>
          <p>${item.desc}</p>
          <div class="cafe-menu-card__tags">
            ${(item.tags || []).map(t => `<span>${t}</span>`).join('')}
            ${item.coffeeBase ? '<span>۷۰/۳۰</span><span>۱۰۰٪ عربیکا</span>' : ''}
          </div>
          <div class="cafe-menu-card__foot">
            <button class="cafe-menu-card__details" type="button" data-card-details="${item.id}">جزئیات</button>
            <div class="cafe-menu-card__actions">${control}</div>
          </div>
        </div>
      </article>
    `;
  }

  function bindCards() {
    grid.querySelectorAll('[data-card-plus]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const item = byId[btn.dataset.cardPlus];
        if (!item) return;
        const key = cartKey(item.id, '');
        const existing = cart.get(key) || {id:item.id, qty:0, line:''};
        existing.qty += 1;
        cart.set(key, existing);
        saveCart();
        tinyHaptic();
        showUndo(`${item.name} به سفارش اضافه شد`, {type:'minus', key, qty:1});
        updateOrderUI();
        render();
      });
    });

    grid.querySelectorAll('[data-card-minus]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const item = byId[btn.dataset.cardMinus];
        if (!item) return;
        const key = cartKey(item.id, '');
        const existing = cart.get(key);
        if (!existing) return;
        existing.qty -= 1;
        if (existing.qty <= 0) cart.delete(key);
        else cart.set(key, existing);
        saveCart();
        tinyHaptic();
        updateOrderUI();
        render();
      });
    });

    grid.querySelectorAll('[data-open-coffee],[data-card-details]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        openItem(btn.dataset.openCoffee || btn.dataset.cardDetails);
      });
    });

    grid.querySelectorAll('[data-menu-open]').forEach(node => {
      const open = e => {
        if (e?.target?.closest('button')) return;
        openItem(node.dataset.menuOpen);
      };
      node.addEventListener('click', open);
      node.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) {
          e.preventDefault();
          openItem(node.dataset.menuOpen);
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
    updateMenuContext(list);
    bindCards();

    categorySpy?.disconnect();
    categorySpy = null;
    if (category === 'all' && !normalize(search?.value) && 'IntersectionObserver' in window) {
      const dividers = [...grid.querySelectorAll('[data-menu-divider]')];
      categorySpy = new IntersectionObserver(entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a,b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        if (visible.length) setActiveTabVisual(visible[0].target.dataset.menuDivider);
      }, {rootMargin:'-22% 0px -68% 0px', threshold:[0,.01,.2]});
      dividers.forEach(divider => categorySpy.observe(divider));
    } else {
      setActiveTabVisual(category);
    }

    window.LeisureMotion?.refresh?.();
  }

  function openItem(id) {
    const item = byId[id];
    if (!item) return;
    currentItem = item;
    currentQty = 1;
    currentLine = item.coffeeBase ? (item.lines?.[0] || '') : '';
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
      currentItem.coffeeBase ? '<span>لاین قهوه قابل انتخاب</span>' : ''
    ].join('');
    itemQty.textContent = faNum(currentQty);
    if (itemAdd) {
      const unit = itemUnitPrice(currentItem, currentLine);
      itemAdd.textContent = `افزودن · ${money(unit * currentQty)}`;
    }

    if (currentItem.coffeeBase && currentItem.lines?.length) {
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
    setTimeout(() => itemSheet.hidden = true, 220);
  }

  function addCurrentItem() {
    if (!currentItem) return;
    const key = cartKey(currentItem.id, currentLine);
    const existing = cart.get(key) || {id: currentItem.id, qty: 0, line: currentLine};
    existing.qty += currentQty;
    existing.line = currentLine;
    cart.set(key, existing);
    saveCart();
    showUndo(`${currentItem.name} × ${faNum(currentQty)} به سفارش اضافه شد`, {type:'minus', key, qty:currentQty});
    updateOrderUI();
    tinyHaptic();
    closeItem();
    render();
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
            <div class="cafe-order-row__price">${entry.qty > 1 ? `${faNum(entry.qty)} × ${money(itemUnitPrice(item, entry.line))} = ` : ""}${money(itemUnitPrice(item, entry.line) * entry.qty)}</div>
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
      render();
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
      render();
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
    setTimeout(() => sheet.hidden = true, 220);
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
      const wasActive = btn.classList.contains('is-active');
      document.querySelectorAll('[data-quick-query]').forEach(x => x.classList.remove('is-active'));
      if (wasActive) {
        search.value = '';
      } else {
        btn.classList.add('is-active');
        search.value = btn.dataset.quickQuery || '';
        category = 'all';
        renderTabs();
      }
      render();
      document.getElementById('cafeMenuGrid')?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });

  let searchTimer = null;
  search?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 70);
  });
  search?.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      search.value = '';
      render();
      search.blur();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      grid.querySelector('[data-menu-open]')?.focus();
    }
  });
  clearSearch?.addEventListener('click', () => {
    search.value = '';
    document.querySelectorAll('[data-quick-query]').forEach(x => x.classList.remove('is-active'));
    search.focus();
    render();
  });

  itemMinus?.addEventListener('click', () => {
    currentQty = Math.max(1, currentQty - 1);
    paintItem();
  });
  itemPlus?.addEventListener('click', () => {
    currentQty += 1;
    paintItem();
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
    render();
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

  /* App-like scroll behavior:
     - top app bar hides while scrolling down
     - returns while scrolling up
     - category dock moves upward when the app bar hides
     - floating class engages once the category rail reaches the viewport */
  if (mobileAppBar && categoryFloatShell) {
    let lastY = window.scrollY;
    let ticking = false;
    const menuTop = () => document.getElementById('cafeMenu')?.offsetTop || 0;

    const paintScrollUI = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      const mobile = matchMedia('(max-width:760px)').matches;
      const nearTop = y < 28;

      if (!mobile) {
        mobileAppBar.classList.remove('is-hidden');
        categoryFloatShell.classList.remove('is-appbar-hidden','is-floating','is-compact');
        lastY = y;
        return;
      }

      const hideBar = !nearTop && delta > 5;
      const showBar = delta < -4 || nearTop;
      if (hideBar) mobileAppBar.classList.add('is-hidden');
      if (showBar) mobileAppBar.classList.remove('is-hidden');

      const barHidden = mobileAppBar.classList.contains('is-hidden');
      categoryFloatShell.classList.toggle('is-appbar-hidden', barHidden);

      const rect = categoryFloatShell.getBoundingClientRect();
      const floatThreshold = barHidden ? 8 : 68;
      const floating = y > menuTop() - 90 && rect.top <= floatThreshold + 5;
      categoryFloatShell.classList.toggle('is-floating', floating);
      categoryFloatShell.classList.toggle('is-compact', floating && y > menuTop() + 180);

      lastY = y;
    };

    const requestScrollPaint = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paintScrollUI);
    };

    paintScrollUI();
    window.addEventListener('scroll', requestScrollPaint, {passive:true});
    window.addEventListener('resize', requestScrollPaint, {passive:true});
  }

  menuReset?.addEventListener('click', resetMenuFilters);
  emptyReset?.addEventListener('click', resetMenuFilters);

  undoButton?.addEventListener('click', () => {
    if (!lastUndo) return;
    if (lastUndo.type === 'minus') {
      const entry = cart.get(lastUndo.key);
      if (entry) {
        entry.qty -= Number(lastUndo.qty || 1);
        if (entry.qty <= 0) cart.delete(lastUndo.key);
        else cart.set(lastUndo.key, entry);
      }
    }
    saveCart();
    updateOrderUI();
    render();
    undoToast.classList.remove('is-visible');
    setTimeout(() => { undoToast.hidden = true; }, 180);
    lastUndo = null;
    clearTimeout(undoTimer);
    tinyHaptic();
  });

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