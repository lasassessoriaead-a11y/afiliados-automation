(() => {
  const REFRESH_MS = 60 * 60 * 1000;
  const SNAPSHOT_KEY = 'ibidropMiningTrendSnapshotV1';
  const LAST_REFRESH_KEY = 'ibidropMiningTrendLastRefreshV1';

  function productId(p) {
    return String(p?.id || p?.product_id || '');
  }

  function readSnapshot() {
    try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]'); }
    catch { return []; }
  }

  function saveSnapshot(products) {
    const snapshot = (products || []).map((p, index) => ({ id: productId(p), rank: index + 1 }));
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
  }

  function decorateMovement(products, previous) {
    const oldRanks = new Map((previous || []).map(x => [String(x.id), Number(x.rank)]));
    const rows = document.querySelectorAll('#hotProducts tr');
    (products || []).forEach((p, index) => {
      const row = rows[index];
      if (!row || row.children.length < 7) return;
      const currentRank = index + 1;
      const oldRank = oldRanks.get(productId(p));
      let label = 'Novo 🔥';
      let cls = 'green';
      if (oldRank != null) {
        if (currentRank < oldRank) { label = `Subindo ↑ ${oldRank - currentRank}`; cls = 'green'; }
        else if (currentRank > oldRank) { label = `Caindo ↓ ${currentRank - oldRank}`; cls = 'orange'; }
        else { label = 'Estável'; cls = ''; }
      }
      const signalCell = row.children[4];
      const badge = document.createElement('div');
      badge.style.marginTop = '6px';
      badge.innerHTML = `<span class="pill ${cls}">${label}</span>`;
      signalCell.appendChild(badge);
    });
  }

  function updateAutoStatus() {
    const el = document.getElementById('hotTime');
    if (!el) return;
    const last = Number(localStorage.getItem(LAST_REFRESH_KEY) || 0);
    if (last) el.title = 'A mineração se atualiza automaticamente a cada 1 hora enquanto o painel estiver aberto.';
  }

  function install() {
    if (typeof window.loadHotProducts !== 'function' || window.__autoTrendInstalled) return;
    window.__autoTrendInstalled = true;
    const originalLoad = window.loadHotProducts;

    window.loadHotProducts = async function(useQuery = false) {
      const previous = readSnapshot();
      await originalLoad(useQuery);
      const products = window.lastHotProducts || [];
      if (!useQuery && products.length) {
        decorateMovement(products, previous);
        saveSnapshot(products);
        updateAutoStatus();
      }
    };

    const refreshIfDue = () => {
      const last = Number(localStorage.getItem(LAST_REFRESH_KEY) || 0);
      if (Date.now() - last >= REFRESH_MS && document.getElementById('loginGate')?.style.display === 'none') {
        window.loadHotProducts(false);
      }
    };

    setInterval(refreshIfDue, REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshIfDue();
    });
    setTimeout(refreshIfDue, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();