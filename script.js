document.addEventListener('DOMContentLoaded', () => {
  const USD_TO_KRW = 1380;

  // ---- 탭 전환 ----
  const tabs = document.querySelectorAll('.tab-btn');
  const pages = document.querySelectorAll('.tab-content');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  }));

  // ---- 저장/로드 ----
  const load = (k, fb) => { try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; }catch{return fb;} };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const state = {
    sites: load('sites_v1', []),
    subs : load('subs_v1',  [])
  };

  // ================= SITES =================
  const siteForm = document.getElementById('site-form');
  const siteList = document.getElementById('site-list');
  const siteName = document.getElementById('site-name');
  const siteUrl  = document.getElementById('site-url');
  const siteCat  = document.getElementById('site-cat');

  function renderSites() {
    const groups = { conversationalAI: [], generativeAI: [], otherSites: [] };
    state.sites.forEach((s, i) => {
      const cat = s.category || 'otherSites';
      groups[cat].push({ ...s, _i: i });
    });

    siteList.innerHTML = '';
    const titles = { conversationalAI: '대화형 AI', generativeAI: '생성형 AI', otherSites: '그 외 사이트' };

    Object.keys(groups).forEach(key => {
      const arr = groups[key];
      if (!arr.length) return;

      const wrap = document.createElement('div');
      wrap.innerHTML = `<div class="category-title">${titles[key]}</div>`;
      const grid = document.createElement('div'); grid.className = 'site-grid';

      arr.forEach(item => {
        let icon = '';
        try {
          const domain = new URL(item.url).hostname;
          icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {}

        const card = document.createElement('div');
        card.className = 'site-card';
        card.innerHTML = `
          <a class="site-link" href="${item.url}" target="_blank" rel="noopener">
            ${icon ? `<img class="favicon" src="${icon}" alt="">` : `<div class="favicon"></div>`}
            <div class="meta">
              <div class="name">${item.name}</div>
              <div class="url">${item.url}</div>
            </div>
          </a>
          <div class="actions">
            <button data-act="edit-site" data-i="${item._i}" type="button">수정</button>
            <button data-act="del-site"  data-i="${item._i}" type="button">삭제</button>
          </div>`;
        grid.appendChild(card);
      });

      wrap.appendChild(grid);
      siteList.appendChild(wrap);
    });
  }

  siteForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = siteName.value.trim();
    let url  = siteUrl.value.trim();
    const cat  = siteCat.value;
    if (!name || !url) return;
    url = normalizeUrl(url);
    state.sites.push({ name, url, category: cat });
    save('sites_v1', state.sites);
    siteForm.reset();
    renderSites();
  });

  // ================= SUBSCRIPTIONS =================
  const subForm = document.getElementById('sub-form');
  const subList = document.getElementById('sub-list');
  const subTotals = document.getElementById('sub-totals');

  const subName = document.getElementById('sub-name');
  const subCost = document.getElementById('sub-cost');
  const subCurrency = document.getElementById('sub-currency');
  const subType = document.getElementById('sub-type');
  const subDate = document.getElementById('sub-date');

  const KRW = x => `₩${Math.round(x).toLocaleString('ko-KR')}`;
  const USD = x => `$${(+x).toFixed(2)}`;

  function renderSubs() {
    subList.innerHTML = '';
    let totalMonthlyKRW = 0;

    state.subs.forEach((s, i) => {
      const base = (s.currency === 'KRW') ? +s.cost : (+s.cost * USD_TO_KRW);
      const monthlyKRW = (s.type === 'monthly') ? base : base / 12;
      totalMonthlyKRW += monthlyKRW;

      const last = new Date((s.date || '') + 'T00:00:00');
      const next = new Date(last);
      if (s.type === 'monthly') next.setMonth(last.getMonth() + 1);
      else next.setFullYear(last.getFullYear() + 1);

      const today = new Date(); today.setHours(0,0,0,0);
      const diffDays = Math.ceil((next - today) / (1000*60*60*24));
      const badge = (diffDays >= 0 && diffDays <= 7) ? ` <span class="badge">${diffDays}일 후 갱신 임박!</span>` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.name}<div style="color:#9bb0d4">${s.type==='monthly'?'월간':'연간'} / ${s.currency}</div></td>
        <td>${KRW(monthlyKRW)}<div class="price-usd">${USD(monthlyKRW / USD_TO_KRW)}</div></td>
        <td>${next.toLocaleDateString('ko-KR')}${badge}</td>
        <td><button data-act="edit-sub" data-i="${i}" type="button">수정</button> <button data-act="del-sub" data-i="${i}" type="button">삭제</button></td>`;
      subList.appendChild(tr);
    });

    const totalMonthlyUSD = totalMonthlyKRW / USD_TO_KRW;
    subTotals.innerHTML = `
      <div class="total-box"><h4>월간 총 구독료</h4><div class="price-krw">${KRW(totalMonthlyKRW)}</div><div class="price-usd">${USD(totalMonthlyUSD)}</div></div>
      <div class="total-box"><h4>연간 총 구독료</h4><div class="price-krw">${KRW(totalMonthlyKRW*12)}</div><div class="price-usd">${USD(totalMonthlyUSD*12)}</div></div>`;
  }

  // ================= 모달 공용 로직 =================
  const modal = document.getElementById('modal');
  const modalPanel = modal.querySelector('.modal-panel');
  const modalTitle = document.getElementById('modal-title');
  const modalFields = document.getElementById('modal-fields');
  const modalForm = document.getElementById('modal-form');
  const modalHint = document.getElementById('modal-hint');
  const modalClose = document.getElementById('modal-close');
  const modalCancel = document.getElementById('modal-cancel');

  let modalCtx = null; // {type:'site'|'sub', index:number}

  function showModal() {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    trapFocus(modalPanel);
  }
  function hideModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    releaseFocus();
    modalCtx = null;
    modalFields.innerHTML = '';
    modalHint.textContent = '';
  }

  modalClose.addEventListener('click', hideModal);
  modalCancel.addEventListener('click', hideModal);
  modal.addEventListener('click', (e) => { if(e.target === modal) hideModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modal.classList.contains('show')) hideModal(); });

  // 포커스 트랩
  let lastFocus = null;
  function trapFocus(container){
    lastFocus = document.activeElement;
    const focusables = container.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const first = focusables[0], last = focusables[focusables.length-1];
    if(first) first.focus();
    container.addEventListener('keydown', onTrap);
    function onTrap(e){
      if(e.key !== 'Tab') return;
      if(!focusables.length) return;
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    container._trapHandler = onTrap;
  }
  function releaseFocus(){
    if(modalPanel._trapHandler) modalPanel.removeEventListener('keydown', modalPanel._trapHandler);
    if(lastFocus) lastFocus.focus();
  }

  // URL 정규화 + 파비콘
  function normalizeUrl(u){
    u = (u || '').trim();
    if(!u) return u;
    if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }
  function faviconFrom(url){
    try{
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    }catch{ return ''; }
  }

  // 중복 체크
  function isSiteDuplicate({name,url}, skipIdx=-1){
    const urlN = normalizeUrl(url || '');
    const nameN = (name || '').trim().toLowerCase();
    return state.sites.some((s, i) => {
      if(i === skipIdx) return false;
      const sn = (s.name||'').trim().toLowerCase();
      const su = normalizeUrl(s.url||'');
      return (sn === nameN) || (su === urlN);
    });
  }

  // 모달 열기(사이트)
  function openSiteModal(index){
    modalCtx = { type:'site', index };
    const current = index >= 0 ? state.sites[index] : { name:'', url:'', category:'otherSites' };
    modalTitle.textContent = index >= 0 ? '사이트 수정' : '사이트 추가';

    modalFields.innerHTML = `
      <div class="row"><label>이름</label><input id="m-name" required value="${escapeHtml(current.name)}"></div>
      <div class="row">
        <label>주소</label>
        <div class="input-inline" style="flex:1">
          <img id="m-fav" class="favicon" alt="">
          <input id="m-url" required value="${escapeHtml(current.url)}" placeholder="https://...">
        </div>
      </div>
      <div class="row">
        <label>카테고리</label>
        <select id="m-cat">
          <option value="conversationalAI" ${current.category==='conversationalAI'?'selected':''}>대화형 AI</option>
          <option value="generativeAI" ${current.category==='generativeAI'?'selected':''}>생성형 AI</option>
          <option value="otherSites" ${current.category==='otherSites'?'selected':''}>그 외 사이트</option>
        </select>
      </div>
      <div id="m-err" class="error" aria-live="polite"></div>
    `;

    const mUrl = document.getElementById('m-url');
    const mFav = document.getElementById('m-fav');
    const mErr = document.getElementById('m-err');
    const setFav = () => { const u = normalizeUrl(mUrl.value); const f = faviconFrom(u); if(f) mFav.src = f; };
    setFav();
    mUrl.addEventListener('input', setFav);
    modalHint.textContent = '엔터: 저장, ESC: 취소, 링크는 모달 밖에서만 열립니다.';
    showModal();

    modalForm.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('m-name').value.trim();
      let url = document.getElementById('m-url').value.trim();
      const category = document.getElementById('m-cat').value;

      if(!name){ mErr.textContent = '이름을 입력하세요.'; return; }
      if(!url){ mErr.textContent = '주소(URL)를 입력하세요.'; return; }
      url = normalizeUrl(url);
      try{ new URL(url); }catch{ mErr.textContent = '올바른 URL 형식이 아닙니다.'; return; }

      if(isSiteDuplicate({name, url}, index)){ mErr.textContent = '같은 이름 또는 URL이 이미 있습니다.'; return; }

      if(index >= 0){ state.sites[index] = { name, url, category }; }
      else { state.sites.push({ name, url, category }); }
      save('sites_v1', state.sites);
      renderSites();
      hideModal();
    };
  }

  // 모달 열기(구독)
  function openSubModal(index){
    modalCtx = { type:'sub', index };
    const current = index >= 0
      ? state.subs[index]
      : { name:'', cost:'', currency:'KRW', type:'monthly', date:'' };

    modalTitle.textContent = index >= 0 ? '구독 수정' : '구독 추가';

    modalFields.innerHTML = `
      <div class="row"><label>이름</label><input id="ms-name" required value="${escapeHtml(current.name||'')}"></div>
      <div class="row"><label>구독료</label><input id="ms-cost" type="number" min="0" step="any" required value="${escapeAttr(current.cost)}"></div>
      <div class="row"><label>통화</label>
        <select id="ms-cur">
          <option value="KRW" ${current.currency==='KRW'?'selected':''}>KRW</option>
          <option value="USD" ${current.currency==='USD'?'selected':''}>USD</option>
        </select>
      </div>
      <div class="row"><label>구분</label>
        <select id="ms-type">
          <option value="monthly" ${current.type==='monthly'?'selected':''}>월간</option>
          <option value="yearly" ${current.type==='yearly'?'selected':''}>연간</option>
        </select>
      </div>
      <div class="row"><label>마지막 결제일</label><input id="ms-date" type="date" required value="${escapeAttr(current.date)}"></div>
      <div id="ms-err" class="error" aria-live="polite"></div>
    `;

    modalHint.textContent = '엔터: 저장, ESC: 취소';
    showModal();

    modalForm.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('ms-name').value.trim();
      const cost = parseFloat(document.getElementById('ms-cost').value);
      const currency = document.getElementById('ms-cur').value;
      const type = document.getElementById('ms-type').value;
      const date = document.getElementById('ms-date').value;
      const err = document.getElementById('ms-err');

      if(!name){ err.textContent='이름을 입력하세요.'; return; }
      if(!(cost>=0)){ err.textContent='구독료를 올바르게 입력하세요.'; return; }
      if(!date){ err.textContent='마지막 결제일을 입력하세요.'; return; }

      const data = { name, cost, currency, type, date };
      if(index >= 0) state.subs[index] = data;
      else state.subs.push(data);
      save('subs_v1', state.subs);
      renderSubs();
      hideModal();
    };
  }

  function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function escapeAttr(v=''){ return v==null?'':String(v).replace(/"/g,'&quot;'); }

  // ================= 이벤트(수정/삭제/추가) =================
  document.body.addEventListener('click', e => {
    const act = e.target && e.target.dataset && e.target.dataset.act;
    if (!act) return;

    if (act === 'del-site') {
      const i = Number(e.target.dataset.i);
      if (Number.isNaN(i)) return;
      if (!confirm('삭제할까요?')) return;
      state.sites.splice(i, 1);
      save('sites_v1', state.sites);
      renderSites();
      return;
    }

    if (act === 'edit-site') {
      const i = Number(e.target.dataset.i);
      if (!Number.isNaN(i)) openSiteModal(i);
      return;
    }

    if (act === 'del-sub') {
      const i = Number(e.target.dataset.i);
      if (Number.isNaN(i)) return;
      if (!confirm('삭제할까요?')) return;
      state.subs.splice(i, 1);
      save('subs_v1', state.subs);
      renderSubs();
      return;
    }

    if (act === 'edit-sub') {
      const i = Number(e.target.dataset.i);
      if (!Number.isNaN(i)) openSubModal(i);
      return;
    }
  });

  // 기존 폼으로도 "추가" 가능하지만, 모달로 추가하고 싶으면 아래 예시처럼 사용 가능:
  // openSiteModal(-1); openSubModal(-1);

  // ===== 백업 / 복원 =====
  const btnExport = document.getElementById('btn-export');
  const fileImport = document.getElementById('file-import');

  btnExport.addEventListener('click', () => {
    try {
      const payload = { sites: state.sites, subs: state.subs };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const filename = `ai-dashboard-backup_${new Date().toISOString().slice(0,10)}.json`;

      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } catch (e) {
      alert('내보내기 실패');
      console.error(e);
    }
  });

  fileImport.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const data = JSON.parse(text || '{}');
      const sites = Array.isArray(data.sites) ? data.sites : [];
      const subs  = Array.isArray(data.subs)  ? data.subs  : [];
      state.sites = sites;
      state.subs  = subs;
      save('sites_v1', state.sites);
      save('subs_v1',  state.subs);
      renderSites();
      renderSubs();
      alert('가져오기 완료');
    }catch(err){
      alert('가져오기 실패: 올바른 JSON인지 확인해주세요.');
      console.error(err);
    }finally{
      e.target.value = '';
    }
  });

  // ---- 초기 렌더 ----
  renderSites();
  renderSubs();
});
