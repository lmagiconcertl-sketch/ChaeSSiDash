// 간단 버전: localStorage만 사용 (파일 연동은 다음 단계)
document.addEventListener('DOMContentLoaded', () => {
  const USD_TO_KRW = 1380;

  // 탭 전환
  const tabs = document.querySelectorAll('.tab-btn');
  const pages = document.querySelectorAll('.tab-content');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  }));

  // 저장/로드 유틸
  const load = (k, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; }
  };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // 상태
  const state = {
    sites: load('sites_v1', []),
    subs : load('subs_v1',  [])
  };

  // ========== SITES ==========
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
        const card = document.createElement('div'); card.className = 'site-card';
        card.innerHTML = `
          ${icon ? `<img src="${icon}" alt="">` : `<div style="width:18px;height:18px;border-radius:4px;background:#1a2030"></div>`}
          <div class="meta">
            <div class="name">${item.name}</div>
            <div class="url"><a href="${item.url}" target="_blank" rel="noopener">${item.url}</a></div>
          </div>
          <div class="actions">
            <button data-act="del-site" data-i="${item._i}">삭제</button>
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
    const url  = siteUrl.value.trim();
    const cat  = siteCat.value;
    if (!name || !url) return;
    state.sites.push({ name, url, category: cat });
    save('sites_v1', state.sites);
    siteForm.reset();
    renderSites();
  });

  document.body.addEventListener('click', e => {
    const act = e.target && e.target.dataset && e.target.dataset.act;
    if (act === 'del-site') {
      const i = Number(e.target.dataset.i);
      if (Number.isNaN(i)) return;
      if (!confirm('삭제할까요?')) return;
      state.sites.splice(i, 1);
      save('sites_v1', state.sites);
      renderSites();
    }
  });

  // ========== SUBSCRIPTIONS ==========
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

      // 갱신일
      const last = new Date((s.date || '') + 'T00:00:00');
      const next = new Date(last);
      if (s.type === 'monthly') next.setMonth(last.getMonth() + 1);
      else next.setFullYear(last.getFullYear() + 1);

      const today = new Date(); today.setHours(0,0,0,0);
      const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
      const badge = (diffDays >= 0 && diffDays <= 7) ? ` <span class="badge">${diffDays}일 후 갱신 임박!</span>` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.name}<div style="color:#9bb0d4">${s.type==='monthly'?'월간':'연간'} / ${s.currency}</div></td>
        <td>${KRW(monthlyKRW)}<div style="color:#a7b4cc">${USD(monthlyKRW / USD_TO_KRW)}</div></td>
        <td>${next.toLocaleDateString('ko-KR')}${badge}</td>
        <td><button data-act="del-sub" data-i="${i}">삭제</button></td>`;
      subList.appendChild(tr);
    });

    const totalMonthlyUSD = totalMonthlyKRW / USD_TO_KRW;
    subTotals.innerHTML = `
      <div class="total-box"><h4>월간 총 구독료</h4><div class="price-krw">${KRW(totalMonthlyKRW)}</div><div class="price-usd">${USD(totalMonthlyUSD)}</div></div>
      <div class="total-box"><h4>연간 총 구독료</h4><div class="price-krw">${KRW(totalMonthlyKRW*12)}</div><div class="price-usd">${USD(totalMonthlyUSD*12)}</div></div>`;
  }

  subForm.addEventListener('submit', e => {
    e.preventDefault();
    state.subs.push({
      name: subName.value.trim(),
      cost: parseFloat(subCost.value),
      currency: subCurrency.value,
      type: subType.value,
      date: subDate.value
    });
    save('subs_v1', state.subs);
    subForm.reset();
    renderSubs();
  });

  document.body.addEventListener('click', e => {
    const act = e.target && e.target.dataset && e.target.dataset.act;
    if (act === 'del-sub') {
      const i = Number(e.target.dataset.i);
      if (Number.isNaN(i)) return;
      if (!confirm('삭제할까요?')) return;
      state.subs.splice(i, 1);
      save('subs_v1', state.subs);
      renderSubs();
    }
  });

  // 초기 렌더
  renderSites();
  renderSubs();
});
