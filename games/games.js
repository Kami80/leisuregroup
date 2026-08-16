(() => {
 const games=[...(window.LEISURE_GAMES||[])];
 const grid=document.getElementById('gamesGrid'),count=document.getElementById('resultCount'),empty=document.getElementById('emptyState'),chips=document.getElementById('activeFilters');
 const q=document.getElementById('gameSearch'),sort=document.getElementById('sortSelect'),minP=document.getElementById('minPlayers'),maxP=document.getElementById('maxPlayers'),leisureOnly=document.getElementById('leisureOnly');
 const checked=name=>[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(x=>x.value);
 const artFor=c=>({strategy:"strategy",tile:"abstract",abstract:"abstract",family:"party",party:"party",hidden:"hidden",cards:"cards",engine:"cards",coop:"coop",push:"motion",racing:"motion",campaign:"rpg"}[c]||"strategy");
 const normalize=s=>(s||'').toString().toLowerCase().replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').replace(/\s+/g,' ').trim();
 const diffLabel=n=>({1:'سبک',2:'متوسط',3:'سنگین'}[n]||'متوسط');
 const getSaved=()=>JSON.parse(localStorage.getItem('leisure-saved-games')||'[]');
 const setSaved=a=>localStorage.setItem('leisure-saved-games',JSON.stringify(a));
 function card(g,i){
   const saved=getSaved().includes(g.slug);
   const cover=g.coverThumb?`../${g.coverThumb}`:`../assets/game-art/${artFor(g.category)}.svg`;
   const diffDots=[1,2,3].map(n=>`<span class="${n<=g.difficulty?'is-on':''}"></span>`).join('');
   return `<article class="game-db-card" data-accent="${g.accent}">
      <div class="game-db-card__media">
        <a class="game-db-card__cover ${g.coverThumb?'has-photo':''}" href="${g.slug}/index.html" aria-label="صفحه ${g.fa}">
          <img src="${cover}" alt="کاور ${g.fa} / ${g.title}" loading="lazy">
          <span class="game-db-card__index">${String(i+1).padStart(2,'0')}</span>
          <span class="game-db-card__category">${g.categoryFa}</span>
          ${g.leisureArticle?'<span class="game-db-card__editorial">JOURNAL</span>':''}
        </a>
        <button class="game-db-card__save ${saved?'is-saved':''}" type="button" data-save-card="${g.slug}" aria-label="ذخیره ${g.fa}">${saved?'♥':'♡'}</button>
        <span class="game-db-card__score"><b>★ ${g.rating.toFixed(1)}</b><small>LEISURE</small></span>
      </div>
      <div class="game-db-card__body">
        <div class="game-db-card__heading">
          <div><small>${g.title}</small><h3><a href="${g.slug}/index.html">${g.fa}</a></h3></div>
          <span class="game-db-card__difficulty" title="پیچیدگی"><i>${diffDots}</i><b>${diffLabel(g.difficulty)}</b></span>
        </div>
        <p class="game-db-card__desc">${g.desc}</p>
        <div class="game-db-card__facts">
          <span><small>بازیکن</small><b>${g.players[0]}–${g.players[1]}</b></span>
          <span><small>زمان</small><b>${g.time[0]}–${g.time[1]}<em>دقیقه</em></b></span>
          <span><small>سن</small><b>${g.age}</b></span>
        </div>
        <div class="game-db-card__tags">${g.mechanics.slice(0,3).map(x=>`<span>${x}</span>`).join('')}</div>
        <div class="game-db-card__footer">
          <a class="game-db-card__primary" href="${g.slug}/index.html"><span>دیدن بازی</span><b>↙</b></a>
          <a class="game-db-card__secondary" href="../contact/index.html">استعلام موجودی</a>
        </div>
      </div>
    </article>`;
 }
 function bindSave(){
   document.querySelectorAll('[data-save-card]').forEach(btn=>{
     if(btn.dataset.bound)return;btn.dataset.bound='1';
     btn.addEventListener('click',e=>{
       e.preventDefault();e.stopPropagation();
       const slug=btn.dataset.saveCard;let saved=getSaved();
       saved=saved.includes(slug)?saved.filter(x=>x!==slug):[...saved,slug];
       setSaved(saved);const on=saved.includes(slug);
       btn.classList.toggle('is-saved',on);btn.textContent=on?'♥':'♡';
       window.leisureToast?.(on?'بازی ذخیره شد':'از ذخیره‌ها حذف شد');
     });
   });
 }
 function render(){
   let out=[...games],term=normalize(q.value),cats=checked('category'),comps=checked('complexity').map(Number),mi=Number(minP.value||0),ma=Number(maxP.value||99);
   out=out.filter(g=>{const hay=normalize([g.title,g.fa,g.categoryFa,g.desc,...g.mechanics].join(' '));return (!term||hay.includes(term))&&(!cats.length||cats.includes(g.category))&&(!comps.length||comps.includes(g.difficulty))&&g.players[1]>=mi&&g.players[0]<=ma&&(!leisureOnly?.checked||g.leisureArticle)});
   if(sort.value==='name')out.sort((a,b)=>a.title.localeCompare(b.title)); else if(sort.value==='time')out.sort((a,b)=>a.time[0]-b.time[0]); else if(sort.value==='players')out.sort((a,b)=>a.players[0]-b.players[0]); else if(sort.value==='rating')out.sort((a,b)=>b.rating-a.rating); else if(sort.value==='complexity')out.sort((a,b)=>b.difficulty-a.difficulty); else out.sort((a,b)=>Number(b.leisureArticle)-Number(a.leisureArticle)||b.rating-a.rating);
   grid.innerHTML=out.map(card).join('');count.textContent=out.length;empty.classList.toggle('is-visible',!out.length);chips.innerHTML='';
   const labels=[];if(term)labels.push(`جستجو: ${q.value}`);cats.forEach(x=>labels.push(`سبک: ${x}`));comps.forEach(x=>labels.push(`پیچیدگی: ${diffLabel(x)}`));if(mi)labels.push(`حداقل ${mi} نفر`);if(ma<99)labels.push(`حداکثر ${ma} نفر`);if(leisureOnly?.checked)labels.push('دارای مقاله');
   labels.forEach(x=>chips.insertAdjacentHTML('beforeend',`<span class="filter-chip">${x}</span>`));
   bindSave();window.LeisureMotion?.refresh?.();
 }
 [q,sort,minP,maxP,leisureOnly,...document.querySelectorAll('.filters input[type="checkbox"]')].filter(Boolean).forEach(el=>el.addEventListener(el===q?'input':'change',render));
 document.getElementById('clearFilters').addEventListener('click',()=>{q.value='';minP.value='';maxP.value='';if(leisureOnly)leisureOnly.checked=false;document.querySelectorAll('.filters input[type="checkbox"]').forEach(x=>x.checked=false);sort.value='featured';render()});
 document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.remove('is-active'));btn.classList.add('is-active');grid.classList.toggle('is-list',btn.dataset.view==='list')}));
 render();
})();