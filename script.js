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
            ${icon ? `<img src="${icon}" alt="">` : `<div style="width:22px;height:22px;border-radius:4px;background:#1a2030"></div>`}
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
    const url  = siteUrl.value.trim();
    const cat  = siteCat.value;
    if (!name || !url) return;
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
        <td><button data-act="del-sub" data-i="${i}" type="button">삭제</button></td>`;
      subList.appendChild(tr);
    });

    const totalMonthlyUSD = totalMonthlyKRW / USD_TO_KRW;
    subTotals.innerHTML = `
      <div class="total-box"><h4>월간 총 구독료</h4><div class="price-krw">${KRW(totalMonthlyKRW)}</div><div class="price-usd">${USD(totalMonthlyUSD)}</div></div>
      <div class="total-box"><h4>연간 총 구독료</h4><div class="price-krw">${KRW(totalMonthlyKRW*12)}</div><div class="price-usd">${USD(totalMonthlyUSD*12)}</div></div>`;
  }

  // ---- 공용 클릭(수정/삭제) ----
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
      if (Number.isNaN(i) || !state.sites[i]) return;
      const cur = state.sites[i];

      const newName = prompt('사이트 이름', cur.name ?? '') ?? cur.name;
      const newUrl  = prompt('사이트 주소(URL)', cur.url ?? '') ?? cur.url;
      const newCat  = prompt('카테고리 (conversationalAI / generativeAI / otherSites)', cur.category ?? 'otherSites') ?? cur.category;

      if (!newName.trim() || !newUrl.trim()) return;
      state.sites[i] = { name: newName.trim(), url: newUrl.trim(), category: (newCat || 'otherSites').trim() };
      save('sites_v1', state.sites);
      renderSites();
      return;
    }

    if (act === 'del-sub') {
      const i = Number(e.target.dataset.i);
      if (Number.isNaN(i)) return;
      if (!confirm('삭제할까요?')) return;
      state.subs.splice(i, 1);
      save('subs_v1', state.subs);
      renderSubs();
    }
  });

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
