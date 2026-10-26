/* ================================================================
   ADITY Admin Panel – script.js
   Full CMS implementation: Homepage, Biography/About, Products,
   Collections, Gallery, Journal, Legal, Media, SEO, Notifications.
   ================================================================ */

// ── Config ────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',     label: 'Overview' },
  { key: 'homepage',     label: 'Homepage' },
  { key: 'biography',    label: 'Biography' },
  { key: 'products',     label: 'Products' },
  { key: 'collections',  label: 'Collections' },
  { key: 'gallery',      label: 'Gallery' },
  { key: 'articles',     label: 'Journal' },
  { key: 'events',       label: 'Events' },
  { key: 'commissions',  label: 'Commissions' },
  { key: 'legal',        label: 'Legal' },
  { key: 'media',        label: 'Media' },
  { key: 'analytics',    label: 'Analytics' },
  { key: 'orders',       label: 'Orders' },
  { key: 'seo',          label: 'SEO' },
  { key: 'notifications',label: 'Notifications' },
  { key: 'health',       label: 'Health' },
];

// ── State ─────────────────────────────────────────────────────
const S = {
  token: localStorage.getItem('aripan-admin-token') || '',
  collections: [],   // cached for product form
};

// ── Auth ──────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('aripan-admin-token') || '';
const setToken = (t) => { S.token = t; localStorage.setItem('aripan-admin-token', t); };
const clearToken = () => { S.token = ''; localStorage.removeItem('aripan-admin-token'); };

// ── Status ────────────────────────────────────────────────────
function status(msg, err = false) {
  const el = document.getElementById('adminStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'admin-status ' + (err ? 'is-error' : 'is-ok');
  if (!err) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4000);
}

// ── Real-time synchronization broadcast ───────────────────────
function notifyMainSite(type = 'catalog', key = null) {
  try {
    const bc = new BroadcastChannel('aripan_catalog');
    bc.postMessage({ type, key, timestamp: Date.now() });
    setTimeout(() => bc.close(), 100);
  } catch {}
}

// ── API ───────────────────────────────────────────────────────
function getApiBase() {
  const custom = localStorage.getItem('aripan-admin-api-base');
  if (custom) return custom.replace(/\/$/, '');
  return '';
}

async function api(path, opts = {}) {
  const tok = getToken();
  const isFormData = opts.body instanceof FormData;
  const headers = {};
  if (tok) headers['Authorization'] = 'Bearer ' + tok;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const base = getApiBase();
  const targetUrl = path.startsWith('http') ? path : `${base}${path}`;
  const r = await fetch(targetUrl, { ...opts, headers });
  const contentType = r.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('API server returned HTML instead of JSON. Ensure your Node.js backend is running as a Web Service.');
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && tok) {
      clearToken();
      showLogin();
      const loginErr = document.getElementById('loginErr');
      if (loginErr) {
        loginErr.textContent = 'Session expired or token invalid. Please sign in again.';
      }
      throw new Error('Session expired. Please sign in again.');
    }
    let msg = 'HTTP ' + r.status;
    if (typeof body.error === 'string') {
      msg = body.error;
    } else if (Array.isArray(body.error)) {
      msg = body.error.map(e => `${e.path?.join('.') || 'field'}: ${e.message}`).join(', ');
    } else if (body.message) {
      msg = body.message;
    }
    throw new Error(msg);
  }
  return body;
}

// ── HTML helpers ──────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = (s) => { try { return s ? new Date(s).toLocaleString() : '—'; } catch { return s; } };

// ── YouTube detector ──────────────────────────────────────────
function getYouTubeId(url) {
  if (!url) return null;
  try {
    const raw = url.trim();
    const str = raw.startsWith('http') ? raw : 'https://' + raw;
    const u = new URL(str);
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'v' || parts[0] === 'shorts') return parts[1];
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.replace(/^\//, '').split('?')[0];
    }
  } catch {}
  return null;
}

// ── Single image uploader & preview binder ─────────────────────
function setupSingleImageUpload({ inputId, fileId, previewContainerId }) {
  const input = document.getElementById(inputId);
  const fileInput = document.getElementById(fileId);
  const container = document.getElementById(previewContainerId);
  if (!input || !container) return;

  const updatePreview = () => {
    const val = input.value.trim();
    if (!val) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = `
      <div class="single-preview-wrap">
        <img src="${esc(val)}" class="single-img-preview" alt="Preview"
             onerror="this.onerror=null;this.classList.add('is-broken');this.title='Image could not be loaded'" />
        <div class="single-preview-info">
          <span class="single-preview-url" title="${esc(val)}">${esc(val)}</span>
          <button type="button" class="btn-xs btn-xs-del" data-action="clear-img" style="align-self:flex-start">Remove image</button>
        </div>
      </div>
    `;
    const clearBtn = container.querySelector('[data-action="clear-img"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        updatePreview();
      });
    }
  };

  input.addEventListener('input', updatePreview);
  input.addEventListener('change', updatePreview);
  updatePreview();

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      status('Uploading image from device…');
      try {
        const fd = new FormData();
        fd.append('file', file);
        const tok = getToken();
        const r = await fetch('/api/media/upload', {
          method: 'POST',
          headers: tok ? { 'Authorization': 'Bearer ' + tok } : {},
          body: fd,
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Upload failed');
        input.value = data.url;
        updatePreview();
        status('Image uploaded from device successfully.');
      } catch (err) {
        status('Upload failed: ' + err.message, true);
      }
      e.target.value = '';
    });
  }
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    location.reload();
  });
  if (getToken()) {
    showApp();
    loadSection('overview');
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById('adminTabs').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('adminMain').innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <h2>Sign in</h2>
        <div id="loginErr" class="form-error"></div>
        <form id="loginForm" method="dialog">
          <div class="fg"><label>Email</label><input id="loginEmail" type="email" placeholder="admin@aripan.art" required autocomplete="username" /></div>
          <div class="fg"><label>Password</label><input id="loginPass" type="password" placeholder="Enter password" required autocomplete="current-password" /></div>
          <button type="submit" class="btn-primary" style="width:100%;margin-top:.5rem">Sign in</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('loginErr');
    errEl.textContent = '';
    try {
      const r = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('loginEmail').value,
          password: document.getElementById('loginPass').value,
        }),
      });
      setToken(r.token);
      showApp();
      loadSection('overview');
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}

function showApp() {
  document.getElementById('logoutBtn').style.display = 'block';
  const nav = document.getElementById('adminTabs');
  nav.style.display = 'flex';
  nav.innerHTML = '';
  TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = tab.label;
    btn.dataset.key = tab.key;
    btn.addEventListener('click', () => {
      nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSection(tab.key);
    });
    nav.appendChild(btn);
  });
  nav.querySelector('[data-key="overview"]').classList.add('active');
}

// ── Section router ────────────────────────────────────────────
async function loadSection(key) {
  const m = document.getElementById('adminMain');
  m.innerHTML = '<p class="loading">Loading…</p>';
  try {
    if (key === 'overview')     return await secOverview();
    if (key === 'homepage')     return await secHomepage();
    if (key === 'biography')    return await secBiography();
    if (key === 'products')     return await secProducts();
    if (key === 'collections')  return await secCollections();
    if (key === 'gallery')      return await secGallery();
    if (key === 'articles')     return await secArticles();
    if (key === 'events')       return await secEvents();
    if (key === 'commissions')  return await secCommissions();
    if (key === 'legal')        return await secLegal();
    if (key === 'media')        return await secMedia();
    if (key === 'analytics')    return await secAnalytics();
    if (key === 'orders')       return await secOrders();
    if (key === 'seo')          return await secSeo();
    if (key === 'notifications')return await secNotifications();
    if (key === 'health')       return await secHealth();
    m.innerHTML = '<p>Unknown section.</p>';
  } catch (err) {
    m.innerHTML = `<p class="err-msg">Failed to load: ${esc(err.message)}</p>`;
  }
}


// ── Overview ──────────────────────────────────────────────────
async function secOverview() {
  const [counts, events, commissions] = await Promise.all([
    api('/api/admin/overview'),
    api('/api/events').catch(() => []),
    api('/api/admin/commissions').catch(() => []),
  ]);
  const m = document.getElementById('adminMain');
  const newCommissions = commissions.filter(c => c.status === 'new').length;
  m.innerHTML = `
    <div class="sec-header"><h2>Overview</h2></div>
    <div class="stats-grid">
      <div class="stat-card" data-goto="homepage"><div class="stat-n">CMS</div><div class="stat-l">Homepage</div></div>
      <div class="stat-card" data-goto="biography"><div class="stat-n">CMS</div><div class="stat-l">Biography</div></div>
      <div class="stat-card" data-goto="products"><div class="stat-n">${counts.products}</div><div class="stat-l">Products</div></div>
      <div class="stat-card" data-goto="collections"><div class="stat-n">${counts.collections}</div><div class="stat-l">Collections</div></div>
      <div class="stat-card" data-goto="gallery"><div class="stat-n">${counts.galleryWorks}</div><div class="stat-l">Gallery</div></div>
      <div class="stat-card" data-goto="articles"><div class="stat-n">${counts.articles}</div><div class="stat-l">Articles</div></div>
      <div class="stat-card" data-goto="events"><div class="stat-n">${events.length}</div><div class="stat-l">Events</div></div>
      <div class="stat-card" data-goto="commissions" style="${newCommissions > 0 ? 'border:2px solid #1d3557' : ''}">
        <div class="stat-n">${commissions.length}</div>
        <div class="stat-l">Commissions${newCommissions > 0 ? ` <span style="font-size:.6rem;background:#1d3557;color:#fff;padding:.1rem .4rem;border-radius:.8rem;vertical-align:middle">${newCommissions} new</span>` : ''}</div>
      </div>
      <div class="stat-card" data-goto="legal"><div class="stat-n">${counts.legalPages}</div><div class="stat-l">Legal pages</div></div>
    </div>
  `;
  m.querySelectorAll('.stat-card[data-goto]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const key = card.dataset.goto;
      document.querySelector(`[data-key="${key}"]`)?.click();
    });
  });
}


// ── Products ──────────────────────────────────────────────────
async function secProducts() {
  const products = await api('/api/products');
  S.collections = await api('/api/collections').catch(() => []);
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header">
      <h2>Products</h2>
      <button type="button" class="btn-primary" id="addProductBtn">+ Add product</button>
    </div>
    <div id="productList"></div>
  `;
  document.getElementById('addProductBtn').addEventListener('click', () => showProductForm(null));
  renderProductCards(products);
}

function renderProductCards(products) {
  const list = document.getElementById('productList');
  if (!list) return;
  if (!products.length) { list.innerHTML = '<p class="empty">No products yet.</p>'; return; }
  list.innerHTML = products.map((p, i) => `
    <div class="card">
      <div class="card-header">
        <div>
          <h3>${esc(p.name)}</h3>
          <p class="meta">${esc(p.slug)} &middot; NRs. ${p.price} &middot; ${esc(p.availability || '')}</p>
          <p class="meta">Collections: ${(p.collections || []).join(', ') || '—'}</p>
        </div>
        <div class="card-actions">
          ${p.images && p.images[0] ? `<img src="${esc(p.images[0])}" class="thumb" onerror="this.onerror=null;this.classList.add('is-broken')" />` : ''}
          <button type="button" class="btn-edit" data-idx="${i}">Edit</button>
          <button type="button" class="btn-del" data-id="${esc(p.id)}">Delete</button>
        </div>
      </div>
    </div>
  `).join('');

  list.__products = products;
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const p = list.__products[idx];
      showProductForm(p);
    });
  });
  list.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this product? This cannot be undone.')) return;
      try {
        await api('/api/admin/products/' + btn.dataset.id, { method: 'DELETE' });
        status('Product deleted.');
        notifyMainSite('catalog');
        secProducts();
      } catch (e) { status(e.message, true); }
    });
  });
}

// ── Product Form ──────────────────────────────────────────────
function showProductForm(item) {
  const m = document.getElementById('adminMain');
  const cols = S.collections || [];
  const selCols = item?.collections || [];
  const imgList = item?.images ? [...item.images] : [];

  m.innerHTML = `
    <div class="sec-header">
      <h2>${item ? 'Edit product' : 'Add product'}</h2>
      <button type="button" class="btn-ghost" id="cancelProductBtn">Back</button>
    </div>
    <form id="productForm" method="dialog" novalidate>
      <div class="form-grid">
        <div class="fg">
          <label>Name <span class="req">*</span></label>
          <input id="pName" type="text" value="${esc(item?.name || '')}" required />
        </div>
        <div class="fg">
          <label>Slug <span class="req">*</span></label>
          <input id="pSlug" type="text" value="${esc(item?.slug || '')}" placeholder="url-slug" required />
        </div>
        <div class="fg">
          <label>SKU</label>
          <input id="pSku" type="text" value="${esc(item?.sku || '')}" />
        </div>
        <div class="fg">
          <label>Price (NRS)</label>
          <input id="pPrice" type="number" step="0.01" value="${item?.price ?? 0}" />
        </div>
        <div class="fg">
          <label>Availability</label>
          <select id="pAvail">
            <option value="available" ${item?.availability === 'available' || !item ? 'selected' : ''}>Available</option>
            <option value="reserved" ${item?.availability === 'reserved' ? 'selected' : ''}>Reserved</option>
            <option value="sold" ${item?.availability === 'sold' ? 'selected' : ''}>Sold</option>
          </select>
        </div>
        <div class="fg">
          <label>Medium</label>
          <input id="pMedium" type="text" value="${esc(item?.medium || '')}" />
        </div>
        <div class="fg">
          <label>Dimensions</label>
          <input id="pDimensions" type="text" value="${esc(item?.dimensions || '')}" />
        </div>
        <div class="fg">
          <label>Year</label>
          <input id="pYear" type="number" value="${item?.year || new Date().getFullYear()}" />
        </div>
        <div class="fg full">
          <label>Shipping info</label>
          <textarea id="pShipping" rows="2">${esc(item?.shipping || '')}</textarea>
        </div>
        <div class="fg full">
          <label>Returns policy</label>
          <textarea id="pReturns" rows="2">${esc(item?.returns || '')}</textarea>
        </div>
        <div class="fg full">
          <label>Details (one per line)</label>
          <textarea id="pDetails" rows="3">${esc((item?.details || []).join('\n'))}</textarea>
        </div>
        <div class="fg full">
          <label>Motifs (comma-separated: flora, fauna, ritual, portrait, cosmos, village)</label>
          <input id="pMotifs" type="text" value="${esc((item?.motifs || []).join(', '))}" />
        </div>
        <div class="fg">
          <label class="check-label"><input type="checkbox" id="pFeatured" ${item?.featured ? 'checked' : ''} /> Featured</label>
          <label class="check-label" style="margin-top:.4rem"><input type="checkbox" id="pBestSeller" ${item?.bestSeller ? 'checked' : ''} /> Best seller</label>
        </div>
        <div class="fg full">
          <label>Collections</label>
          <div class="check-group">
            ${cols.length ? cols.map(c => `
              <label class="check-label">
                <input type="checkbox" class="col-check" value="${esc(c.slug)}" ${selCols.includes(c.slug) ? 'checked' : ''} />
                ${esc(c.name)}
              </label>`).join('') : '<p class="meta">No collections yet.</p>'}
          </div>
        </div>

        <div class="fg full">
          <label>Images</label>
          <div class="img-upload-wrap">
            <div class="img-upload-row">
              <label class="btn-upload">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload from device
                <input type="file" id="pImgFile" accept="image/*" />
              </label>
              <span class="or">or</span>
              <input type="text" id="pImgUrl" placeholder="Paste image URL (https://...)" style="flex:1" />
              <button type="button" class="btn-primary" id="addImgUrlBtn">Add</button>
            </div>
            <div id="imgListEl"></div>
          </div>
        </div>

        <div class="fg full">
          <label>Description <span class="hint">(bold, italic, lists — click to type)</span></label>
          <div class="rte-toolbar" data-target="pDesc">
            <button type="button" data-cmd="bold"><b>B</b></button>
            <button type="button" data-cmd="italic"><i>I</i></button>
            <button type="button" data-cmd="underline"><u>U</u></button>
            <button type="button" data-cmd="insertUnorderedList">&#9679; List</button>
            <button type="button" data-cmd="insertOrderedList">1. List</button>
            <button type="button" data-cmd="removeFormat">Clear</button>
          </div>
          <div id="pDesc" class="rte" contenteditable="true" placeholder="Enter product description…" spellcheck="true">${item?.description || ''}</div>
        </div>
        <div class="fg full">
          <label>Story <span class="hint">(cultural narrative, process, artist perspective)</span></label>
          <div class="rte-toolbar" data-target="pStory">
            <button type="button" data-cmd="bold"><b>B</b></button>
            <button type="button" data-cmd="italic"><i>I</i></button>
            <button type="button" data-cmd="underline"><u>U</u></button>
            <button type="button" data-cmd="insertUnorderedList">&#9679; List</button>
            <button type="button" data-cmd="insertOrderedList">1. List</button>
            <button type="button" data-cmd="removeFormat">Clear</button>
          </div>
          <div id="pStory" class="rte" contenteditable="true" placeholder="Enter artwork story and cultural significance…" spellcheck="true">${item?.story || ''}</div>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary" id="saveProductBtn">Save product</button>
        <button type="button" class="btn-ghost" id="cancelProductBtn2">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById('cancelProductBtn').addEventListener('click', () => secProducts());
  document.getElementById('cancelProductBtn2').addEventListener('click', () => secProducts());

  // RTE toolbar click handlers
  document.querySelectorAll('.rte-toolbar').forEach(toolbar => {
    const targetId = toolbar.dataset.target;
    toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.getElementById(targetId).focus();
        document.execCommand(btn.dataset.cmd, false, null);
      });
    });
  });

  // Image list renderer
  const renderImgList = () => {
    const el = document.getElementById('imgListEl');
    if (!el) return;
    el.innerHTML = imgList.map((url, i) => `
      <div class="img-row">
        <img src="${esc(url)}" class="img-preview" alt="Thumbnail" onerror="this.onerror=null;this.classList.add('is-broken');" />
        <span class="img-url-text" title="${esc(url)}">${esc(url)}</span>
        <button type="button" class="btn-xs" data-action="up" data-i="${i}" title="Move up">↑</button>
        <button type="button" class="btn-xs" data-action="dn" data-i="${i}" title="Move down">↓</button>
        <button type="button" class="btn-xs btn-xs-del" data-action="del" data-i="${i}" title="Delete">×</button>
      </div>
    `).join('') || '<p class="meta" style="margin:.5rem 0">No images yet.</p>';

    el.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.i;
        const act = btn.dataset.action;
        if (act === 'del') { imgList.splice(i, 1); renderImgList(); }
        else if (act === 'up' && i > 0) { [imgList[i-1], imgList[i]] = [imgList[i], imgList[i-1]]; renderImgList(); }
        else if (act === 'dn' && i < imgList.length - 1) { [imgList[i+1], imgList[i]] = [imgList[i], imgList[i+1]]; renderImgList(); }
      });
    });
  };
  renderImgList();

  // Add image by URL
  document.getElementById('addImgUrlBtn').addEventListener('click', () => {
    const v = document.getElementById('pImgUrl').value.trim();
    if (!v) return;
    imgList.push(v);
    renderImgList();
    document.getElementById('pImgUrl').value = '';
  });

  // Upload image file
  document.getElementById('pImgFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    status('Uploading image…');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const tok = getToken();
      const r = await fetch('/api/media/upload', {
        method: 'POST',
        headers: tok ? { 'Authorization': 'Bearer ' + tok } : {},
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Upload failed');
      imgList.push(data.url);
      renderImgList();
      status('Image uploaded.');
    } catch (err) {
      status('Upload failed: ' + err.message, true);
    }
    e.target.value = '';
  });

  // Form submit
  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const name = document.getElementById('pName').value.trim();
    const slug = document.getElementById('pSlug').value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const sku  = document.getElementById('pSku').value.trim() || slug;

    if (!name || !slug) { status('Name and Slug are required.', true); return; }

    const collections = Array.from(document.querySelectorAll('.col-check:checked')).map(c => c.value);
    const motifsRaw = document.getElementById('pMotifs').value;
    const motifs = motifsRaw ? motifsRaw.split(',').map(m => m.trim()).filter(Boolean) : [];
    const detailsRaw = document.getElementById('pDetails').value;
    const details = detailsRaw ? detailsRaw.split('\n').map(d => d.trim()).filter(Boolean) : [];

    const descEl = document.getElementById('pDesc');
    const storyEl = document.getElementById('pStory');
    let description = descEl ? descEl.innerHTML.trim() : '';
    let story = storyEl ? storyEl.innerHTML.trim() : '';
    if (description === '<p><br></p>') description = '';
    if (story === '<p><br></p>') story = '';

    const payload = {
      id: item?.id || 'p-' + Date.now(),
      slug,
      name,
      sku,
      collections,
      images: imgList,
      createdAt: item?.createdAt || new Date().toISOString(),
      price: parseFloat(document.getElementById('pPrice').value) || 0,
      currency: 'NRS',
      availability: document.getElementById('pAvail').value,
      medium: document.getElementById('pMedium').value.trim(),
      dimensions: document.getElementById('pDimensions').value.trim(),
      year: parseInt(document.getElementById('pYear').value) || new Date().getFullYear(),
      description,
      story,
      details,
      shipping: document.getElementById('pShipping').value.trim(),
      returns: document.getElementById('pReturns').value.trim(),
      featured: document.getElementById('pFeatured').checked,
      bestSeller: document.getElementById('pBestSeller').checked,
      motifs,
    };

    const btn = document.getElementById('saveProductBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      if (item?.id) {
        await api('/api/admin/products/' + item.id, { method: 'PUT', body: JSON.stringify(payload) });
        status('Product updated.');
      } else {
        await api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        status('Product created.');
      }
      notifyMainSite('catalog');
      secProducts();
    } catch (err) {
      status('Save failed: ' + err.message, true);
      btn.disabled = false;
      btn.textContent = 'Save product';
    }
  });
}

// ── Collections ───────────────────────────────────────────────
async function secCollections() {
  const cols = await api('/api/collections');
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header">
      <h2>Collections</h2>
      <button type="button" class="btn-primary" id="addColBtn">+ Add collection</button>
    </div>
    <div id="colList"></div>
  `;
  document.getElementById('addColBtn').addEventListener('click', () => showCollectionForm(null));
  renderCollectionCards(cols);
}

function renderCollectionCards(cols) {
  const list = document.getElementById('colList');
  if (!list) return;
  if (!cols.length) { list.innerHTML = '<p class="empty">No collections yet.</p>'; return; }
  list.innerHTML = cols.map((c, i) => `
    <div class="card">
      <div class="card-header">
        <div>
          <h3>${esc(c.name)}</h3>
          <p class="meta">${esc(c.slug)} &mdash; ${esc(c.short || c.description || '')}</p>
        </div>
        <div class="card-actions">
          ${c.image ? `<img src="${esc(c.image)}" class="thumb" onerror="this.onerror=null;this.classList.add('is-broken')" />` : ''}
          <button type="button" class="btn-edit" data-idx="${i}">Edit</button>
        </div>
      </div>
    </div>
  `).join('');
  list.__cols = cols;
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => showCollectionForm(list.__cols[parseInt(btn.dataset.idx)]));
  });
}

function showCollectionForm(item) {
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header">
      <h2>${item ? 'Edit collection' : 'Add collection'}</h2>
      <button type="button" class="btn-ghost" id="cancelColBtn">Back</button>
    </div>
    <form id="colForm" method="dialog" novalidate>
      <div class="form-grid">
        <div class="fg"><label>Name <span class="req">*</span></label><input id="cName" type="text" value="${esc(item?.name||'')}" required /></div>
        <div class="fg"><label>Slug <span class="req">*</span></label><input id="cSlug" type="text" value="${esc(item?.slug||'')}" placeholder="url-slug" ${item?'readonly':''} required /></div>
        <div class="fg full"><label>Short label</label><input id="cShort" type="text" value="${esc(item?.short||'')}" /></div>
        <div class="fg full"><label>Description</label><textarea id="cDesc" rows="3">${esc(item?.description||'')}</textarea></div>
        <div class="fg full">
          <label>Collection card image</label>
          <div class="img-upload-row">
            <label class="btn-upload">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload from device
              <input type="file" id="cImageFile" accept="image/*" />
            </label>
            <span class="or">or</span>
            <input id="cImage" type="text" value="${esc(item?.image||'')}" placeholder="Paste image URL (https://...)" style="flex:1" />
          </div>
          <div id="cImagePreview"></div>
        </div>
        <div class="fg full">
          <label>Hero banner image</label>
          <div class="img-upload-row">
            <label class="btn-upload">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload from device
              <input type="file" id="cHeroFile" accept="image/*" />
            </label>
            <span class="or">or</span>
            <input id="cHero" type="text" value="${esc(item?.hero||'')}" placeholder="Paste hero image URL (https://...)" style="flex:1" />
          </div>
          <div id="cHeroPreview"></div>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Save collection</button>
        <button type="button" class="btn-ghost" id="cancelColBtn2">Cancel</button>
      </div>
    </form>
  `;

  setupSingleImageUpload({ inputId: 'cImage', fileId: 'cImageFile', previewContainerId: 'cImagePreview' });
  setupSingleImageUpload({ inputId: 'cHero', fileId: 'cHeroFile', previewContainerId: 'cHeroPreview' });

  document.getElementById('cancelColBtn').addEventListener('click', () => secCollections());
  document.getElementById('cancelColBtn2').addEventListener('click', () => secCollections());
  document.getElementById('colForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cName').value.trim();
    const slug = document.getElementById('cSlug').value.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    if (!name || !slug) { status('Name and Slug required.', true); return; }
    const payload = {
      name,
      slug,
      short: document.getElementById('cShort').value.trim(),
      description: document.getElementById('cDesc').value.trim(),
      image: document.getElementById('cImage').value.trim(),
      hero: document.getElementById('cHero').value.trim(),
    };
    try {
      if (item?.slug) {
        await api('/api/admin/collections/' + item.slug, { method: 'PUT', body: JSON.stringify(payload) });
        status('Collection updated.');
      } else {
        await api('/api/admin/collections', { method: 'POST', body: JSON.stringify(payload) });
        status('Collection created.');
      }
      notifyMainSite('catalog');
      secCollections();
    } catch (err) { status('Save failed: ' + err.message, true); }
  });
}

// ── Gallery ───────────────────────────────────────────────────
async function secGallery() {
  const works = await api('/api/gallery');
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>Gallery</h2><button type="button" class="btn-primary" id="addGallBtn">+ Add work</button></div>
    <div id="gallList"></div>
  `;
  document.getElementById('addGallBtn').addEventListener('click', () => showGalleryForm(null));
  const list = document.getElementById('gallList');
  if (!works.length) { list.innerHTML = '<p class="empty">No gallery works yet.</p>'; return; }
  list.innerHTML = works.map((w, i) => `
    <div class="card">
      <div class="card-header">
        <div><h3>${esc(w.title)}</h3><p class="meta">${esc(w.slug)} &middot; ${w.year || ''} &middot; ${esc(w.medium || '')}</p></div>
        <div class="card-actions">
          ${w.image ? `<img src="${esc(w.image)}" class="thumb" onerror="this.onerror=null;this.classList.add('is-broken')" />` : ''}
          <button type="button" class="btn-edit" data-idx="${i}">Edit</button>
        </div>
      </div>
    </div>
  `).join('');
  list.__works = works;
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => showGalleryForm(list.__works[parseInt(btn.dataset.idx)]));
  });
}

function showGalleryForm(item) {
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>${item ? 'Edit' : 'Add'} gallery work</h2><button type="button" class="btn-ghost" id="cancelGallBtn">Back</button></div>
    <form id="gallForm" method="dialog" novalidate>
      <div class="form-grid">
        <div class="fg"><label>Title <span class="req">*</span></label><input id="gTitle" type="text" value="${esc(item?.title||'')}" required /></div>
        <div class="fg"><label>Slug <span class="req">*</span></label><input id="gSlug" type="text" value="${esc(item?.slug||'')}" required /></div>
        <div class="fg"><label>Year</label><input id="gYear" type="number" value="${item?.year||new Date().getFullYear()}" /></div>
        <div class="fg"><label>Medium</label><input id="gMedium" type="text" value="${esc(item?.medium||'')}" /></div>
        <div class="fg">
          <label>Size</label>
          <select id="gSize">
            ${['small','medium','large','tall'].map(v=>`<option value="${v}" ${item?.size===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="fg"><label>Motifs (comma-separated)</label><input id="gMotifs" type="text" value="${esc((item?.motifs||[]).join(', '))}" /></div>
        <div class="fg full">
          <label>Image URL</label>
          <div class="img-upload-row">
            <label class="btn-upload">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload from device
              <input type="file" id="gImageFile" accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif,.tif,.tiff,.avif,.bmp" />
            </label>
            <span class="or">or</span>
            <input id="gImage" type="text" value="${esc(item?.image||'')}" placeholder="Paste image URL (https://...)" style="flex:1" />
          </div>
          <div id="gImagePreview"></div>
        </div>
        <div class="fg full"><label>Story</label><textarea id="gStory" rows="4">${esc(item?.story||'')}</textarea></div>
        <div class="fg full"><label>Linked product slug (optional)</label><input id="gProduct" type="text" value="${esc(item?.productSlug||'')}" /></div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Save work</button>
        <button type="button" class="btn-ghost" id="cancelGallBtn2">Cancel</button>
      </div>
    </form>
  `;

  setupSingleImageUpload({ inputId: 'gImage', fileId: 'gImageFile', previewContainerId: 'gImagePreview' });

  document.getElementById('cancelGallBtn').addEventListener('click', () => secGallery());
  document.getElementById('cancelGallBtn2').addEventListener('click', () => secGallery());
  document.getElementById('gallForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('gTitle').value.trim();
    const slug = document.getElementById('gSlug').value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const mRaw = document.getElementById('gMotifs').value;
    const payload = {
      id: item?.id || 'gw-' + Date.now(),
      title,
      slug,
      year: parseInt(document.getElementById('gYear').value) || new Date().getFullYear(),
      medium: document.getElementById('gMedium').value.trim(),
      size: document.getElementById('gSize').value,
      motifs: mRaw ? mRaw.split(',').map(m=>m.trim()).filter(Boolean) : [],
      image: document.getElementById('gImage').value.trim(),
      story: document.getElementById('gStory').value.trim(),
      productSlug: document.getElementById('gProduct').value.trim() || undefined,
    };
    try {
      await api('/api/admin/gallery', { method: 'POST', body: JSON.stringify(payload) });
      status('Gallery work saved.');
      notifyMainSite('catalog');
      secGallery();
    } catch (err) { status('Save failed: ' + err.message, true); }
  });
}

// ── Journal ───────────────────────────────────────────────────
async function secArticles() {
  const articles = await api('/api/articles');
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>Journal</h2><button type="button" class="btn-primary" id="addArtBtn">+ Add article</button></div>
    <div id="artList"></div>
  `;
  document.getElementById('addArtBtn').addEventListener('click', () => showArticleForm(null));
  const list = document.getElementById('artList');
  if (!articles.length) { list.innerHTML = '<p class="empty">No articles yet.</p>'; return; }
  list.innerHTML = articles.map((a, i) => `
    <div class="card">
      <div class="card-header">
        <div><h3>${esc(a.title)}</h3><p class="meta">${esc(a.slug)} &middot; ${esc(a.date||'')}</p></div>
        <div class="card-actions">
          ${a.image ? `<img src="${esc(a.image)}" class="thumb" onerror="this.onerror=null;this.classList.add('is-broken')" />` : ''}
          <button type="button" class="btn-edit" data-idx="${i}">Edit</button>
        </div>
      </div>
    </div>
  `).join('');
  list.__arts = articles;
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => showArticleForm(list.__arts[parseInt(btn.dataset.idx)]));
  });
}

function showArticleForm(item) {
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>${item?'Edit':'Add'} article</h2><button type="button" class="btn-ghost" id="cancelArtBtn">Back</button></div>
    <form id="artForm" method="dialog" novalidate>
      <div class="form-grid">
        <div class="fg"><label>Title <span class="req">*</span></label><input id="aTitle" type="text" value="${esc(item?.title||'')}" required /></div>
        <div class="fg"><label>Slug <span class="req">*</span></label><input id="aSlug" type="text" value="${esc(item?.slug||'')}" required /></div>
        <div class="fg"><label>Date</label><input id="aDate" type="date" value="${esc(item?.date||new Date().toISOString().slice(0,10))}" /></div>
        <div class="fg"><label>Read time (min)</label><input id="aReadMin" type="number" value="${item?.readMinutes||5}" /></div>
        <div class="fg full">
          <label>Cover image URL</label>
          <div class="img-upload-row">
            <label class="btn-upload">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload from device
              <input type="file" id="aImageFile" accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif,.tif,.tiff,.avif,.bmp" />
            </label>
            <span class="or">or</span>
            <input id="aImage" type="text" value="${esc(item?.image||'')}" placeholder="Paste image URL (https://...)" style="flex:1" />
          </div>
          <div id="aImagePreview"></div>
        </div>
        <div class="fg full"><label>Tags (comma-separated)</label><input id="aTags" type="text" value="${esc((item?.tags||[]).join(', '))}" /></div>
        <div class="fg full"><label>Excerpt</label><textarea id="aExcerpt" rows="2">${esc(item?.excerpt||'')}</textarea></div>
        <div class="fg full"><label>Body (one paragraph per line)</label><textarea id="aBody" rows="8">${esc((item?.body||[]).join('\n'))}</textarea></div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Save article</button>
        <button type="button" class="btn-ghost" id="cancelArtBtn2">Cancel</button>
      </div>
    </form>
  `;

  setupSingleImageUpload({ inputId: 'aImage', fileId: 'aImageFile', previewContainerId: 'aImagePreview' });

  document.getElementById('cancelArtBtn').addEventListener('click', () => secArticles());
  document.getElementById('cancelArtBtn2').addEventListener('click', () => secArticles());
  document.getElementById('artForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('aTitle').value.trim();
    const slug = document.getElementById('aSlug').value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const tagsRaw = document.getElementById('aTags').value;
    const bodyRaw = document.getElementById('aBody').value;
    const payload = {
      title,
      slug,
      excerpt: document.getElementById('aExcerpt').value.trim(),
      date: document.getElementById('aDate').value || new Date().toISOString().slice(0,10),
      readMinutes: parseInt(document.getElementById('aReadMin').value) || 5,
      image: document.getElementById('aImage').value.trim(),
      tags: tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [],
      body: bodyRaw ? bodyRaw.split('\n').map(l=>l.trim()).filter(Boolean) : [],
    };
    try {
      await api('/api/admin/articles', { method: 'POST', body: JSON.stringify(payload) });
      status('Article saved.');
      notifyMainSite('catalog');
      secArticles();
    } catch (err) { status('Save failed: ' + err.message, true); }
  });
}

// ── Legal ─────────────────────────────────────────────────────
async function secLegal() {
  const pages = await api('/api/legal');
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>Legal pages</h2></div>
    <div id="legalList"></div>
  `;
  const list = document.getElementById('legalList');
  if (!pages.length) { list.innerHTML = '<p class="empty">No legal pages.</p>'; return; }
  list.innerHTML = pages.map((p, i) => `
    <div class="card">
      <div class="card-header">
        <div><h3>${esc(p.title)}</h3><p class="meta">Slug: ${esc(p.slug)} &middot; Updated: ${esc(p.updated||'—')}</p></div>
        <div class="card-actions"><button type="button" class="btn-edit" data-idx="${i}">Edit</button></div>
      </div>
    </div>
  `).join('');
  list.__pages = pages;
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => showLegalForm(list.__pages[parseInt(btn.dataset.idx)]));
  });
}

function showLegalForm(item) {
  const m = document.getElementById('adminMain');
  const secs = item?.sections || [];
  m.innerHTML = `
    <div class="sec-header"><h2>Edit legal page: ${esc(item.title)}</h2><button type="button" class="btn-ghost" id="cancelLegalBtn">Back</button></div>
    <form id="legalForm" method="dialog" novalidate>
      <div class="form-grid">
        <div class="fg"><label>Title</label><input id="lTitle" type="text" value="${esc(item.title)}" required /></div>
        <div class="fg"><label>Slug</label><input id="lSlug" type="text" value="${esc(item.slug)}" readonly /></div>
        <div class="fg"><label>Last updated date</label><input id="lUpdated" type="text" value="${esc(item.updated||new Date().toISOString().slice(0,10))}" /></div>
      </div>
      <h3 style="margin:1.25rem 0 .5rem;font-size:.95rem">Sections</h3>
      <div id="legalSections">
        ${secs.map((s,i)=>`
          <div class="legal-sec">
            <input type="text" value="${esc(s.heading)}" placeholder="Section heading" name="sh" style="font-weight:600" />
            <textarea rows="4" placeholder="Section body" name="sb">${esc(s.body)}</textarea>
            <button type="button" class="btn-xs btn-xs-del" data-del="${i}" style="align-self:flex-start">Remove</button>
          </div>
        `).join('')}
      </div>
      <button type="button" class="btn-ghost" id="addLegalSecBtn" style="margin:.5rem 0 1.25rem">+ Add section</button>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Save legal page</button>
        <button type="button" class="btn-ghost" id="cancelLegalBtn2">Cancel</button>
      </div>
    </form>
  `;
  document.getElementById('cancelLegalBtn').addEventListener('click', () => secLegal());
  document.getElementById('cancelLegalBtn2').addEventListener('click', () => secLegal());
  document.getElementById('legalSections').querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.legal-sec').remove());
  });
  document.getElementById('addLegalSecBtn').addEventListener('click', () => {
    const d = document.createElement('div');
    d.className = 'legal-sec';
    d.innerHTML = `
      <input type="text" placeholder="Section heading" name="sh" style="font-weight:600" />
      <textarea rows="4" placeholder="Section body" name="sb"></textarea>
      <button type="button" class="btn-xs btn-xs-del" style="align-self:flex-start">Remove</button>
    `;
    d.querySelector('button').addEventListener('click', () => d.remove());
    document.getElementById('legalSections').appendChild(d);
  });
  document.getElementById('legalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('lTitle').value.trim();
    const slug = document.getElementById('lSlug').value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const heads = Array.from(document.querySelectorAll('[name="sh"]')).map(el=>el.value.trim());
    const bodies = Array.from(document.querySelectorAll('[name="sb"]')).map(el=>el.value.trim());
    const sections = heads.map((h,i)=>({heading:h,body:bodies[i]||''})).filter(s=>s.heading||s.body);
    const payload = { title, updated: document.getElementById('lUpdated').value, sections };
    try {
      await api('/api/admin/legal/' + slug, { method: 'POST', body: JSON.stringify(payload) });
      status('Legal page saved.');
      notifyMainSite('catalog');
      secLegal();
    } catch (err) { status('Save failed: ' + err.message, true); }
  });
}

// ── Media ─────────────────────────────────────────────────────
async function secMedia() {
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>Media library</h2></div>
    <div class="fg" style="max-width:400px;margin-bottom:1.5rem">
      <label>Upload image file</label>
      <input type="file" id="mediaFile" accept="image/*" />
    </div>
    <div id="mediaGrid" class="media-grid"></div>
  `;
  document.getElementById('mediaFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    status('Uploading…');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const tok = getToken();
      const r = await fetch('/api/media/upload', {
        method: 'POST',
        headers: tok ? { 'Authorization': 'Bearer ' + tok } : {},
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Upload failed');
      addMediaItem(data.url);
      status('Uploaded: ' + data.url);
    } catch (err) { status('Upload failed: ' + err.message, true); }
    e.target.value = '';
  });
}

function addMediaItem(url) {
  const grid = document.getElementById('mediaGrid');
  if (!grid) return;
  const div = document.createElement('div');
  div.className = 'media-card';
  div.innerHTML = `
    <img src="${esc(url)}" alt="" onerror="this.onerror=null;this.classList.add('is-broken')" />
    <div class="media-url">${esc(url)}</div>
    <button type="button" class="btn-xs">Copy URL</button>
  `;
  div.querySelector('button').addEventListener('click', () => {
    navigator.clipboard.writeText(url).then(() => status('URL copied.'));
  });
  grid.insertBefore(div, grid.firstChild);
}

// ── Analytics ─────────────────────────────────────────────────
async function secAnalytics() {
  const summary = await api('/api/admin/analytics/summary');
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>Analytics</h2></div>
    <pre class="code-view">${esc(JSON.stringify(summary, null, 2))}</pre>
  `;
}

async function secOrders() {
  const rows = await api('/api/admin/orders');
  const m = document.getElementById('adminMain');
  if (!rows.length) {
    m.innerHTML = '<div class="sec-header"><h2>Orders & Enquiries</h2></div><p class="empty">No orders or enquiries recorded yet.</p>';
    return;
  }

  m.innerHTML = `
    <div class="sec-header">
      <h2>Orders & Enquiries (${rows.length})</h2>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="min-width:140px">Customer</th>
          <th style="min-width:180px">Artworks / Items</th>
          <th style="min-width:150px">Delivery & Notes</th>
          <th style="min-width:160px">Location & GPS</th>
          <th style="min-width:100px">Total</th>
          <th style="min-width:110px">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => {
          const metadata = row.metadata || {};
          const phone = metadata.phone || '—';
          const address = metadata.address || metadata.location || '—';
          const locationUrl = row.locationUrl || metadata.location_url || (metadata.latitude && metadata.longitude ? `https://www.google.com/maps?q=${metadata.latitude},${metadata.longitude}` : (row.latitude && row.longitude ? `https://www.google.com/maps?q=${row.latitude},${row.longitude}` : ''));
          const accuracyVal = row.locationAccuracy || metadata.location_accuracy;
          const accuracy = accuracyVal ? ` (±${Math.round(Number(accuracyVal))}m)` : '';
          const delivery = [metadata.deliveryDate, metadata.deliveryTime].filter(Boolean).join(' at ') || '—';
          const age = metadata.age ? `Age: ${metadata.age}` : '';
          const notes = metadata.notes ? String(metadata.notes).trim() : '';
          const items = Array.isArray(row.items) ? row.items : [];

          return `
            <tr>
              <td>
                <strong>${esc(metadata.name || row.customerName || 'Customer')}</strong>
                <div style="font-size:0.8em;color:#555;margin-top:2px;">${esc(row.customerEmail || metadata.email || '')}</div>
                <div style="font-size:0.8em;color:#444;margin-top:2px;">📞 ${esc(phone)}</div>
                ${age ? `<div style="font-size:0.75em;color:#777;margin-top:2px;">${esc(age)}</div>` : ''}
                <div style="font-size:0.72rem;color:#888;margin-top:4px;">ID: #${esc(row.id.slice(0, 8))}</div>
                <div style="font-size:0.72rem;color:#888;">${esc(fmtDate(row.createdAt))}</div>
              </td>
              <td>
                ${items.length ? `
                  <ul class="order-items-list">
                    ${items.map(it => `
                      <li class="order-item-card">
                        <img src="${esc(it.image || '/logo.png')}" class="order-item-thumb" alt="" onerror="this.onerror=null;this.src='/logo.png'" />
                        <div class="order-item-info">
                          <span class="order-item-name" title="${esc(it.name || it.slug)}">${esc(it.name || it.slug)}</span>
                          <span class="order-item-meta">Qty: ${esc(it.quantity || 1)} · NRS ${Number(it.price || 0).toLocaleString()}</span>
                        </div>
                      </li>
                    `).join('')}
                  </ul>
                ` : '<span style="color:#999;font-size:0.82rem">No items listed</span>'}
              </td>
              <td>
                <div style="font-weight:600;font-size:0.82rem;margin-bottom:3px;">📅 ${esc(delivery)}</div>
                <div style="font-size:0.82rem;color:#444;word-break:break-word;">🏠 ${esc(address)}</div>
                ${notes ? `<div style="font-size:0.78rem;color:#666;font-style:italic;margin-top:5px;background:#f9f9f9;padding:4px 6px;border-radius:4px;border:1px solid #eee;">📝 "${esc(notes)}"</div>` : ''}
              </td>
              <td>
                ${locationUrl ? `
                  <div>
                    <a href="${esc(locationUrl)}" target="_blank" rel="noopener noreferrer" style="background:#1d4ed8;color:#ffffff;padding:0.35rem 0.65rem;border-radius:5px;text-decoration:none;display:inline-flex;align-items:center;gap:0.35rem;font-size:0.8rem;font-weight:600;">
                      📍 View Customer Location
                    </a>
                  </div>
                  <div style="font-size:0.75rem;color:#555;margin-top:4px;">
                    ${metadata.latitude && metadata.longitude ? `${Number(metadata.latitude).toFixed(5)}, ${Number(metadata.longitude).toFixed(5)}` : (row.latitude && row.longitude ? `${Number(row.latitude).toFixed(5)}, ${Number(row.longitude).toFixed(5)}` : '')}
                    ${esc(accuracy)}
                  </div>
                ` : `<span style="font-size:0.8em;color:#999">No GPS coordinates</span>`}
              </td>
              <td>
                <strong style="font-size:0.95rem;color:#111;">
                  ${esc(row.total != null ? 'NRS ' + Number(row.total).toLocaleString() : '—')}
                </strong>
                <div style="font-size:0.75rem;color:#777;">${esc(row.paymentProvider || 'manual')}</div>
              </td>
              <td>
                <select class="order-status-select" data-id="${esc(row.id)}" style="font-size:0.78rem;padding:0.25rem 0.4rem;border-radius:4px;border:1px solid var(--border);background:var(--surface);">
                  ${['pending', 'confirmed', 'processing', 'completed', 'paid', 'cancelled'].map(st => `
                    <option value="${st}" ${row.status === st ? 'selected' : ''}>${st.charAt(0).toUpperCase() + st.slice(1)}</option>
                  `).join('')}
                </select>
                <div style="margin-top:4px;"><span class="badge badge-${esc(row.status || 'pending')}">${esc(row.status || 'pending')}</span></div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  m.querySelectorAll('.order-status-select').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.value;
      status(`Updating order #${orderId.slice(0, 8)} to ${newStatus}…`);
      try {
        await api(`/api/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        });
        status(`Order status updated to "${newStatus}".`);
        secOrders();
      } catch (err) {
        status(`Failed to update status: ${err.message}`, true);
      }
    });
  });
}

// ── SEO ───────────────────────────────────────────────────────
async function secSeo() {
  const pages = ['home','shop','collections','gallery','journal','about','contact','commissions'];
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>SEO settings</h2></div>
    <div class="seg-tabs" id="seoPageTabs">
      ${pages.map(p=>`<button type="button" class="seg-btn" data-page="${p}">${p}</button>`).join('')}
    </div>
    <div id="seoEditor"></div>
  `;
  const loadSeoPage = async (pageKey) => {
    m.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.page===pageKey));
    let meta = {};
    try { meta = await api('/api/admin/seo/' + pageKey); } catch {}
    document.getElementById('seoEditor').innerHTML = `
      <form id="seoForm" method="dialog" novalidate style="margin-top:1.5rem">
        <div class="form-grid">
          <div class="fg full"><label>Page title</label><input id="sTitle" type="text" value="${esc(meta.title||'')}" /></div>
          <div class="fg full"><label>Meta description</label><textarea id="sDesc" rows="3">${esc(meta.description||'')}</textarea></div>
          <div class="fg full"><label>Canonical URL</label><input id="sCanonical" type="text" value="${esc(meta.canonical||'')}" /></div>
          <div class="fg full"><label>OG image URL</label><input id="sOgImage" type="text" value="${esc(meta.ogImage||'')}" /></div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Save SEO for "${esc(pageKey)}"</button>
        </div>
      </form>
    `;
    document.getElementById('seoForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/admin/seo/' + pageKey, { method: 'PUT', body: JSON.stringify({
          title: document.getElementById('sTitle').value || null,
          description: document.getElementById('sDesc').value || null,
          canonical: document.getElementById('sCanonical').value || null,
          ogImage: document.getElementById('sOgImage').value || null,
        })});
        status('SEO saved for "' + pageKey + '".');
      } catch (err) { status('Save failed: ' + err.message, true); }
    });
  };
  m.querySelectorAll('.seg-btn').forEach(btn => btn.addEventListener('click', () => loadSeoPage(btn.dataset.page)));
  loadSeoPage(pages[0]);
}

// ── Notifications ─────────────────────────────────────────────
async function secNotifications() {
  const data = await api('/api/admin/notifications');
  const rows = Array.isArray(data) ? data : (data?.items || []);
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>Notifications</h2></div>
    ${rows.length ? `
      <table class="data-table">
        <thead><tr><th>Type</th><th>Message</th><th>Date</th></tr></thead>
        <tbody>${rows.map(n=>`<tr><td>${esc(n.type||'')}</td><td>${esc(n.message||'')}</td><td>${esc(fmtDate(n.createdAt))}</td></tr>`).join('')}</tbody>
      </table>` : '<p class="empty">No notifications.</p>'}
  `;
}

// ── Health ────────────────────────────────────────────────────
async function secHealth() {
  const health = await api('/api/admin/health');
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header"><h2>System health</h2></div>
    <pre class="code-view">${esc(JSON.stringify(health, null, 2))}</pre>
  `;
}

// ── Homepage editor ───────────────────────────────────────────
async function secHomepage() {
  const m = document.getElementById('adminMain');

  let hero = {}, statement = {};
  try {
    const hRes = await api('/api/admin/content/blocks/hero');
    hero = hRes?.data || hRes || {};
  } catch {}
  try {
    const sRes = await api('/api/admin/content/blocks/statement');
    statement = sRes?.data || sRes || {};
  } catch {}

  const heroMedia = Array.isArray(hero.media) && hero.media.length
    ? [...hero.media]
    : [{ type: 'image', url: '/artworks/tree-of-life.png' }];
  const stmtParagraphs = Array.isArray(statement.paragraphs) ? statement.paragraphs : [];

  m.innerHTML = `
    <div class="sec-header"><h2>Homepage content</h2></div>
    <p class="meta" style="margin-bottom:1.5rem">
      Edit top hero media, titles, and artist statement. Changes synchronize live to the main website.
    </p>

    <!-- ── Hero ── -->
    <div class="card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem;font-size:1rem;font-weight:700">Hero section</h3>

      <div class="form-grid">
        <div class="fg">
          <label>Eyebrow text</label>
          <input id="hEyebrow" type="text" value="${esc(hero.eyebrow || 'Mithila · Nepal')}" />
        </div>
        <div class="fg">
          <label>Heading</label>
          <input id="hHeading" type="text" value="${esc(hero.heading || 'ARIPAN')}" />
        </div>
        <div class="fg full">
          <label>Sub-text (displayed under heading)</label>
          <textarea id="hSubtext" rows="2">${esc(hero.subtext || 'Painting that still thinks like a wall — earth pigment, double line, and the living grammar of Mithila.')}</textarea>
        </div>
      </div>

      <div class="fg full" style="margin-top:1.25rem">
        <label style="margin-bottom:.4rem;display:block"><strong>Background media</strong> — images and/or background videos</label>
        <p class="meta" style="margin-bottom:.75rem">
          Enter an image URL, paste a YouTube link (e.g. youtube.com/watch?v=... or youtu.be/...), direct video file (.mp4), or upload a file.
          Videos play silently in a loop in the background with no audio or controls.
        </p>

        <div class="img-upload-row" style="margin-bottom:.75rem">
          <label class="btn-upload">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload from device
            <input type="file" id="heroMediaFile" accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.svg,.gif,.tif,.tiff,.avif,.bmp,.mp4,.webm,.mov,.ogg" />
          </label>
          <span class="or">or</span>
          <input type="text" id="heroMediaUrl" placeholder="Paste image URL, video URL, or YouTube link" style="flex:1" />
          <select id="heroMediaType" style="width:110px">
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <button type="button" class="btn-primary" id="addHeroMediaBtn">Add</button>
        </div>
        <div id="heroMediaList"></div>
      </div>

      <div class="form-actions" style="margin-top:1.25rem">
        <button type="button" class="btn-primary" id="saveHeroBtn">Save hero section</button>
      </div>
    </div>

    <!-- ── Artist Statement ── -->
    <div class="card">
      <h3 style="margin-bottom:1rem;font-size:1rem;font-weight:700">Artist statement section</h3>

      <div class="form-grid">
        <div class="fg">
          <label>Eyebrow</label>
          <input id="sEyebrow" type="text" value="${esc(statement.eyebrow || 'Artist statement')}" />
        </div>
        <div class="fg">
          <label>Heading</label>
          <input id="sHeading" type="text" value="${esc(statement.heading || 'A language, not a look')}" />
        </div>
        <div class="fg full">
          <label>Statement artwork / portrait image</label>
          <div class="img-upload-row">
            <label class="btn-upload">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload from device
              <input type="file" id="sImageFile" accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif,.tif,.tiff,.avif,.bmp" />
            </label>
            <span class="or">or</span>
            <input id="sImage" type="text" value="${esc(statement.image || '/artworks/artist-at-work.png')}" placeholder="Paste image URL (https://...)" style="flex:1" />
          </div>
          <div id="sImagePreview"></div>
        </div>
        <div class="fg full">
          <label>Statement text (one paragraph per line)</label>
          <textarea id="sParagraphs" rows="6">${esc(stmtParagraphs.join('\n'))}</textarea>
        </div>
      </div>

      <div class="form-actions" style="margin-top:1rem">
        <button type="button" class="btn-primary" id="saveStatementBtn">Save statement section</button>
      </div>
    </div>
  `;

  // Hero media list rendering
  const renderHeroMedia = () => {
    const el = document.getElementById('heroMediaList');
    if (!el) return;
    if (!heroMedia.length) {
      el.innerHTML = '<p class="meta">No media yet — add images or videos above.</p>';
      return;
    }
    el.innerHTML = heroMedia.map((item, i) => {
      const ytId = getYouTubeId(item.url);
      let preview;
      if (ytId) {
        preview = `<img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" class="img-preview" alt="YouTube thumbnail" />`;
      } else if (item.type === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(item.url)) {
        preview = `<video src="${esc(item.url)}" class="img-preview" muted playsinline style="object-fit:cover"></video>`;
      } else {
        preview = `<img src="${esc(item.url)}" class="img-preview" alt="Preview" onerror="this.onerror=null;this.classList.add('is-broken');" />`;
      }
      return `
      <div class="img-row">
        ${preview}
        <span class="type-badge" style="font-size:.7rem;padding:.15rem .45rem;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--muted);white-space:nowrap;font-weight:600">
          ${ytId ? 'YouTube video' : item.type}
        </span>
        <span class="img-url-text" title="${esc(item.url)}">${esc(item.url)}</span>
        <button type="button" class="btn-xs" data-action="up" data-i="${i}" title="Move up">↑</button>
        <button type="button" class="btn-xs" data-action="dn" data-i="${i}" title="Move down">↓</button>
        <button type="button" class="btn-xs btn-xs-del" data-action="del" data-i="${i}" title="Delete">×</button>
      </div>`;
    }).join('');

    el.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.i;
        const act = btn.dataset.action;
        if (act === 'del') { heroMedia.splice(i, 1); renderHeroMedia(); }
        else if (act === 'up' && i > 0) { [heroMedia[i-1], heroMedia[i]] = [heroMedia[i], heroMedia[i-1]]; renderHeroMedia(); }
        else if (act === 'dn' && i < heroMedia.length - 1) { [heroMedia[i+1], heroMedia[i]] = [heroMedia[i], heroMedia[i+1]]; renderHeroMedia(); }
      });
    });
  };
  renderHeroMedia();

  // Add hero media by URL
  document.getElementById('addHeroMediaBtn').addEventListener('click', () => {
    const rawUrl = document.getElementById('heroMediaUrl').value.trim();
    let type = document.getElementById('heroMediaType').value;
    if (!rawUrl) return;

    if (getYouTubeId(rawUrl) || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(rawUrl)) {
      type = 'video';
    }

    heroMedia.push({ type, url: rawUrl });
    renderHeroMedia();
    document.getElementById('heroMediaUrl').value = '';
  });

  // Upload hero media file
  document.getElementById('heroMediaFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    status('Uploading media file…');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const tok = getToken();
      const r = await fetch('/api/media/upload', {
        method: 'POST',
        headers: tok ? { 'Authorization': 'Bearer ' + tok } : {},
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Upload failed');
      heroMedia.push({ type: isVideo ? 'video' : 'image', url: data.url });
      renderHeroMedia();
      status('Media file uploaded.');
    } catch (err) { status('Upload failed: ' + err.message, true); }
    e.target.value = '';
  });

  // Save hero block
  document.getElementById('saveHeroBtn').addEventListener('click', async () => {
    const payload = {
      eyebrow: document.getElementById('hEyebrow').value.trim(),
      heading: document.getElementById('hHeading').value.trim(),
      subtext: document.getElementById('hSubtext').value.trim(),
      media: heroMedia,
    };
    try {
      await api('/api/admin/content/blocks/hero', { method: 'PUT', body: JSON.stringify(payload) });
      notifyMainSite('content', 'hero');
      status('Hero section saved — live on the website.');
    } catch (err) { status('Save failed: ' + err.message, true); }
  });

  // Setup statement image upload & preview
  setupSingleImageUpload({ inputId: 'sImage', fileId: 'sImageFile', previewContainerId: 'sImagePreview' });

  // Save statement block
  document.getElementById('saveStatementBtn').addEventListener('click', async () => {
    const rawParas = document.getElementById('sParagraphs').value;
    const payload = {
      eyebrow: document.getElementById('sEyebrow').value.trim(),
      heading: document.getElementById('sHeading').value.trim(),
      image: document.getElementById('sImage').value.trim(),
      paragraphs: rawParas.split('\n').map(l => l.trim()).filter(Boolean),
    };
    try {
      await api('/api/admin/content/blocks/statement', { method: 'PUT', body: JSON.stringify(payload) });
      notifyMainSite('content', 'statement');
      status('Artist statement saved — live on the website.');
    } catch (err) { status('Save failed: ' + err.message, true); }
  });
}

// ── Biography / About Page CMS ────────────────────────────────
async function secBiography() {
  const m = document.getElementById('adminMain');

  let blockData = {};
  try {
    const res = await api('/api/admin/content/blocks/biography');
    blockData = res?.data || res || {};
  } catch {}

  const defaultBio = {
    eyebrow: 'The artist',
    name: 'ARIPAN',
    role: 'Mithila painter · Nepal',
    image: '/artworks/artist-at-work.png',
    biography: [
      'ARIPAN is a Mithila artist working in Nepal, within the living tradition of painting that takes its name from the wider Mithila cultural region. Trained first by watching courtyard walls and then by sustained studio practice, the artist treats the double-line contour as both craft and ethic.',
      'The studio’s attention is split between unique works on handmade paper and a carefully limited set of impressions and textile pieces. The aim is not to scale a motif until it is everywhere, but to let a few compositions travel with their density intact.',
      'International collectors encounter the work through exhibitions, private viewings, and this site — which is designed as a gallery rather than a storefront. Commissions are accepted when a project can honour the tradition’s grammar rather than merely borrow its look.'
    ],
    processEyebrow: 'Process',
    processHeading: 'How a painting arrives',
    process: [
      'Drawings begin as wall studies or as small ink maps. Only when a composition can be read slowly — water, earth, canopy, companions — is it taken to handmade paper.',
      'Pigments are mixed in short palettes: lampblack, ochre, muted vermillion, the ivory of the sheet. Filling is meditative and strict; a peacock’s neck is a problem of triangles, not of prettiness.',
      'Finished works rest, are photographed in even light, and are documented before they leave. Nothing is varnished into gloss. The paper remains paper.'
    ],
    inspirationsEyebrow: 'Companions',
    inspirationsHeading: 'Inspirations',
    inspirations: [
      'Courtyard Kohbar paintings and the women who kept them literate',
      'River fish, monsoon birds, and the mango tree as a domestic cosmology',
      'Museum rooms that allow a folk painting the same silence as any other serious work',
      'The refusal of neon — earth, soot, and the warmth of handmade sheet'
    ],
    timelineEyebrow: 'Years',
    timelineHeading: 'A studio timeline',
    timeline: [
      { year: '2016', title: 'Studio established', text: 'A dedicated painting room in Nepal, shifting work from courtyard practice to paper with museum patience.' },
      { year: '2018', title: 'First city exhibition', text: 'A small hanging in a cultural centre, arranged as a wall rather than a stall — the beginning of ARIPAN’s exhibition manners.' },
      { year: '2021', title: 'Print discipline', text: 'The first archival impressions, colour-managed so the double line survives reproduction.' },
      { year: '2023', title: 'International dialogue', text: 'Works shown in conversation with diaspora collectors and university South Asia programmes.' },
      { year: '2025', title: 'Limited editions', text: 'Hand-finished numbered sheets, released only when a composition is considered complete.' },
      { year: '2026', title: 'This house', text: 'The present digital gallery — a room built to the same standard as the paper.' }
    ],
    exhibitionsEyebrow: 'Rooms',
    exhibitionsHeading: 'Exhibitions',
    exhibitions: [
      { place: 'Patna cultural rooms', note: 'Group presentations of Mithila painting with an emphasis on living practitioners.' },
      { place: 'Delhi private viewing', note: 'A quiet hanging for collectors, no opening-night theatre.' },
      { place: 'Diaspora salon, London', note: 'Conversation hanging with writers and textile historians.' },
      { place: 'University vitrine, North America', note: 'Works placed beside texts on Mithila’s women’s painting traditions.' }
    ],
    mediaEyebrow: 'Press',
    mediaHeading: 'Media appearances',
    media: [
      { title: 'Studio visit, regional arts journal', note: 'A conversation on pigment, weather, and the problem of “folk” as a label.' },
      { title: 'Podcast excerpt, craft & culture', note: 'On why the online shop must not look like a shop.' }
    ]
  };

  const bio = { ...defaultBio, ...blockData };
  const bioParas = Array.isArray(bio.biography) ? bio.biography : defaultBio.biography;
  const procParas = Array.isArray(bio.process) ? bio.process : defaultBio.process;
  const inspParas = Array.isArray(bio.inspirations) ? bio.inspirations : defaultBio.inspirations;
  let timelineItems = Array.isArray(bio.timeline) ? [...bio.timeline] : [...defaultBio.timeline];
  let exhibitionItems = Array.isArray(bio.exhibitions) ? [...bio.exhibitions] : [...defaultBio.exhibitions];
  let mediaItems = Array.isArray(bio.media) ? [...bio.media] : [...defaultBio.media];

  m.innerHTML = `
    <div class="sec-header">
      <h2>Biography &amp; About Page CMS</h2>
      <button type="button" class="btn-primary" id="saveBioTopBtn">Save changes</button>
    </div>
    <p class="meta" style="margin-bottom:1.5rem">
      Manage all content shown when visitors click "Read the biography" (/about). All changes sync live.
    </p>

    <!-- ── Artist Profile ── -->
    <div class="card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem;font-size:1rem;font-weight:700">Artist Profile &amp; Hero</h3>
      <div class="form-grid">
        <div class="fg">
          <label>Eyebrow</label>
          <input id="bEyebrow" type="text" value="${esc(bio.eyebrow || 'The artist')}" />
        </div>
        <div class="fg">
          <label>Artist Name</label>
          <input id="bName" type="text" value="${esc(bio.name || 'ARIPAN')}" />
        </div>
        <div class="fg full">
          <label>Role &amp; Location (lede line)</label>
          <input id="bRole" type="text" value="${esc(bio.role || 'Mithila painter · Nepal')}" />
        </div>
        <div class="fg full">
          <label>Biography Portrait Image</label>
          <div class="img-upload-row">
            <label class="btn-upload">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload from device
              <input type="file" id="bImageFile" accept="image/*,.jpg,.jpeg,.png,.webp,.svg,.gif,.tif,.tiff,.avif,.bmp" />
            </label>
            <span class="or">or</span>
            <input id="bImage" type="text" value="${esc(bio.image || '/artworks/artist-at-work.png')}" placeholder="Paste image URL (https://...)" style="flex:1" />
          </div>
          <div id="bImagePreview"></div>
        </div>
        <div class="fg full">
          <label>Biography text (one paragraph per line)</label>
          <textarea id="bBiography" rows="6">${esc(bioParas.join('\n'))}</textarea>
        </div>
      </div>
    </div>

    <!-- ── Process Section ── -->
    <div class="card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem;font-size:1rem;font-weight:700">Process Section</h3>
      <div class="form-grid">
        <div class="fg">
          <label>Eyebrow</label>
          <input id="bProcEyebrow" type="text" value="${esc(bio.processEyebrow || 'Process')}" />
        </div>
        <div class="fg">
          <label>Heading</label>
          <input id="bProcHeading" type="text" value="${esc(bio.processHeading || 'How a painting arrives')}" />
        </div>
        <div class="fg full">
          <label>Process steps (one step per line)</label>
          <textarea id="bProcess" rows="5">${esc(procParas.join('\n'))}</textarea>
        </div>
      </div>
    </div>

    <!-- ── Inspirations Section ── -->
    <div class="card" style="margin-bottom:1.5rem">
      <h3 style="margin-bottom:1rem;font-size:1rem;font-weight:700">Companions &amp; Inspirations</h3>
      <div class="form-grid">
        <div class="fg">
          <label>Eyebrow</label>
          <input id="bInspEyebrow" type="text" value="${esc(bio.inspirationsEyebrow || 'Companions')}" />
        </div>
        <div class="fg">
          <label>Heading</label>
          <input id="bInspHeading" type="text" value="${esc(bio.inspirationsHeading || 'Inspirations')}" />
        </div>
        <div class="fg full">
          <label>Inspirations list (one item per line)</label>
          <textarea id="bInspirations" rows="5">${esc(inspParas.join('\n'))}</textarea>
        </div>
      </div>
    </div>

    <!-- ── Studio Timeline ── -->
    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header" style="margin-bottom:1rem">
        <h3 style="font-size:1rem;font-weight:700">Studio Timeline ("Years")</h3>
        <button type="button" class="btn-primary" id="addTimelineBtn">+ Add year</button>
      </div>
      <div class="form-grid" style="margin-bottom:1rem">
        <div class="fg">
          <label>Section Eyebrow</label>
          <input id="bTimeEyebrow" type="text" value="${esc(bio.timelineEyebrow || 'Years')}" />
        </div>
        <div class="fg">
          <label>Section Heading</label>
          <input id="bTimeHeading" type="text" value="${esc(bio.timelineHeading || 'A studio timeline')}" />
        </div>
      </div>
      <div id="timelineContainer"></div>
    </div>

    <!-- ── Exhibitions ── -->
    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header" style="margin-bottom:1rem">
        <h3 style="font-size:1rem;font-weight:700">Exhibitions ("Rooms")</h3>
        <button type="button" class="btn-primary" id="addExhBtn">+ Add exhibition</button>
      </div>
      <div class="form-grid" style="margin-bottom:1rem">
        <div class="fg">
          <label>Section Eyebrow</label>
          <input id="bExhEyebrow" type="text" value="${esc(bio.exhibitionsEyebrow || 'Rooms')}" />
        </div>
        <div class="fg">
          <label>Section Heading</label>
          <input id="bExhHeading" type="text" value="${esc(bio.exhibitionsHeading || 'Exhibitions')}" />
        </div>
      </div>
      <div id="exhibitionsContainer"></div>
    </div>

    <!-- ── Press / Media ── -->
    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header" style="margin-bottom:1rem">
        <h3 style="font-size:1rem;font-weight:700">Press &amp; Media appearances</h3>
        <button type="button" class="btn-primary" id="addMediaItemBtn">+ Add appearance</button>
      </div>
      <div class="form-grid" style="margin-bottom:1rem">
        <div class="fg">
          <label>Section Eyebrow</label>
          <input id="bMediaEyebrow" type="text" value="${esc(bio.mediaEyebrow || 'Press')}" />
        </div>
        <div class="fg">
          <label>Section Heading</label>
          <input id="bMediaHeading" type="text" value="${esc(bio.mediaHeading || 'Media appearances')}" />
        </div>
      </div>
      <div id="mediaContainer"></div>
    </div>

    <div class="form-actions" style="margin-top:1.5rem">
      <button type="button" class="btn-primary" id="saveBioBtn" style="padding:.6rem 1.5rem;font-size:.9rem">Save all biography changes</button>
    </div>
  `;

  // Bind portrait image preview
  setupSingleImageUpload({ inputId: 'bImage', fileId: 'bImageFile', previewContainerId: 'bImagePreview' });

  // Render Timeline Items
  const renderTimeline = () => {
    const el = document.getElementById('timelineContainer');
    if (!el) return;
    el.innerHTML = timelineItems.map((item, i) => `
      <div class="item-subcard">
        <div class="item-subcard-header">
          <strong style="font-size:.85rem">Item #${i+1}</strong>
          <button type="button" class="btn-xs btn-xs-del" data-del-t="${i}">Remove</button>
        </div>
        <div class="form-grid">
          <div class="fg" style="max-width:140px">
            <label>Year</label>
            <input type="text" class="t-year" data-i="${i}" value="${esc(item.year || '')}" />
          </div>
          <div class="fg" style="flex:1">
            <label>Title</label>
            <input type="text" class="t-title" data-i="${i}" value="${esc(item.title || '')}" />
          </div>
          <div class="fg full">
            <label>Text</label>
            <textarea rows="2" class="t-text" data-i="${i}">${esc(item.text || '')}</textarea>
          </div>
        </div>
      </div>
    `).join('') || '<p class="meta">No timeline items yet.</p>';

    el.querySelectorAll('button[data-del-t]').forEach(btn => {
      btn.addEventListener('click', () => {
        timelineItems.splice(+btn.dataset.delT, 1);
        renderTimeline();
      });
    });
  };
  renderTimeline();

  document.getElementById('addTimelineBtn').addEventListener('click', () => {
    timelineItems.push({ year: String(new Date().getFullYear()), title: 'Milestone title', text: 'Milestone description' });
    renderTimeline();
  });

  // Render Exhibitions
  const renderExhibitions = () => {
    const el = document.getElementById('exhibitionsContainer');
    if (!el) return;
    el.innerHTML = exhibitionItems.map((item, i) => `
      <div class="item-subcard">
        <div class="item-subcard-header">
          <strong style="font-size:.85rem">Exhibition #${i+1}</strong>
          <button type="button" class="btn-xs btn-xs-del" data-del-e="${i}">Remove</button>
        </div>
        <div class="form-grid">
          <div class="fg">
            <label>Place / Gallery</label>
            <input type="text" class="e-place" data-i="${i}" value="${esc(item.place || '')}" />
          </div>
          <div class="fg full">
            <label>Note / Description</label>
            <input type="text" class="e-note" data-i="${i}" value="${esc(item.note || '')}" />
          </div>
        </div>
      </div>
    `).join('') || '<p class="meta">No exhibitions yet.</p>';

    el.querySelectorAll('button[data-del-e]').forEach(btn => {
      btn.addEventListener('click', () => {
        exhibitionItems.splice(+btn.dataset.delE, 1);
        renderExhibitions();
      });
    });
  };
  renderExhibitions();

  document.getElementById('addExhBtn').addEventListener('click', () => {
    exhibitionItems.push({ place: 'Exhibition hall', note: 'Solo presentation' });
    renderExhibitions();
  });

  // Render Media Appearances
  const renderMedia = () => {
    const el = document.getElementById('mediaContainer');
    if (!el) return;
    el.innerHTML = mediaItems.map((item, i) => `
      <div class="item-subcard">
        <div class="item-subcard-header">
          <strong style="font-size:.85rem">Appearance #${i+1}</strong>
          <button type="button" class="btn-xs btn-xs-del" data-del-m="${i}">Remove</button>
        </div>
        <div class="form-grid">
          <div class="fg">
            <label>Title / Publication</label>
            <input type="text" class="m-title" data-i="${i}" value="${esc(item.title || '')}" />
          </div>
          <div class="fg full">
            <label>Note</label>
            <input type="text" class="m-note" data-i="${i}" value="${esc(item.note || '')}" />
          </div>
        </div>
      </div>
    `).join('') || '<p class="meta">No media appearances yet.</p>';

    el.querySelectorAll('button[data-del-m]').forEach(btn => {
      btn.addEventListener('click', () => {
        mediaItems.splice(+btn.dataset.delM, 1);
        renderMedia();
      });
    });
  };
  renderMedia();

  document.getElementById('addMediaItemBtn').addEventListener('click', () => {
    mediaItems.push({ title: 'Feature publication', note: 'In-depth review and studio interview' });
    renderMedia();
  });

  // Collect and Save
  const saveBiography = async () => {
    // Read current values from dynamic inputs
    document.querySelectorAll('.t-year').forEach(el => { timelineItems[+el.dataset.i].year = el.value.trim(); });
    document.querySelectorAll('.t-title').forEach(el => { timelineItems[+el.dataset.i].title = el.value.trim(); });
    document.querySelectorAll('.t-text').forEach(el => { timelineItems[+el.dataset.i].text = el.value.trim(); });

    document.querySelectorAll('.e-place').forEach(el => { exhibitionItems[+el.dataset.i].place = el.value.trim(); });
    document.querySelectorAll('.e-note').forEach(el => { exhibitionItems[+el.dataset.i].note = el.value.trim(); });

    document.querySelectorAll('.m-title').forEach(el => { mediaItems[+el.dataset.i].title = el.value.trim(); });
    document.querySelectorAll('.m-note').forEach(el => { mediaItems[+el.dataset.i].note = el.value.trim(); });

    const payload = {
      eyebrow: document.getElementById('bEyebrow').value.trim(),
      name: document.getElementById('bName').value.trim(),
      role: document.getElementById('bRole').value.trim(),
      image: document.getElementById('bImage').value.trim(),
      biography: document.getElementById('bBiography').value.split('\n').map(l => l.trim()).filter(Boolean),
      processEyebrow: document.getElementById('bProcEyebrow').value.trim(),
      processHeading: document.getElementById('bProcHeading').value.trim(),
      process: document.getElementById('bProcess').value.split('\n').map(l => l.trim()).filter(Boolean),
      inspirationsEyebrow: document.getElementById('bInspEyebrow').value.trim(),
      inspirationsHeading: document.getElementById('bInspHeading').value.trim(),
      inspirations: document.getElementById('bInspirations').value.split('\n').map(l => l.trim()).filter(Boolean),
      timelineEyebrow: document.getElementById('bTimeEyebrow').value.trim(),
      timelineHeading: document.getElementById('bTimeHeading').value.trim(),
      timeline: timelineItems.filter(t => t.title || t.text),
      exhibitionsEyebrow: document.getElementById('bExhEyebrow').value.trim(),
      exhibitionsHeading: document.getElementById('bExhHeading').value.trim(),
      exhibitions: exhibitionItems.filter(e => e.place || e.note),
      mediaEyebrow: document.getElementById('bMediaEyebrow').value.trim(),
      mediaHeading: document.getElementById('bMediaHeading').value.trim(),
      media: mediaItems.filter(m => m.title || m.note),
    };

    status('Saving biography…');
    try {
      await api('/api/admin/content/blocks/biography', { method: 'PUT', body: JSON.stringify(payload) });
      notifyMainSite('content', 'biography');
      status('Biography saved — changes are live on the website.');
    } catch (err) {
      status('Save failed: ' + err.message, true);
    }
  };

  document.getElementById('saveBioBtn').addEventListener('click', saveBiography);
  document.getElementById('saveBioTopBtn').addEventListener('click', saveBiography);
}

// ── Commissions ───────────────────────────────────────────────
async function secCommissions() {
  const enquiries = await api('/api/admin/commissions');
  const m = document.getElementById('adminMain');
  const statusColors = {
    new: '#1d3557',
    reviewing: '#457b9d',
    accepted: '#2d6a4f',
    declined: '#c0392b',
    completed: '#555',
  };

  m.innerHTML = `
    <div class="sec-header">
      <h2>Commission Enquiries</h2>
      <span class="meta" style="align-self:center">${enquiries.length} total</span>
    </div>
    <p class="meta" style="margin-bottom:1.5rem">
      All commission requests submitted through the website. Update status and add notes for each.
    </p>
    <div id="commissionList"></div>
  `;

  const renderList = (items) => {
    const list = document.getElementById('commissionList');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<p class="empty">No commission enquiries yet.</p>';
      return;
    }
    list.innerHTML = items.map((en, i) => `
      <div class="card" id="comm-card-${i}">
        <div class="card-header">
          <div>
            <h3 style="margin-bottom:.25rem">${esc(en.name)}</h3>
            <p class="meta">${esc(en.email)} &middot; ${esc(en.country)}</p>
            <p class="meta">Budget: <strong>${esc(en.budget)}</strong> &middot; Submitted: ${fmtDate(en.created_at)}</p>
          </div>
          <div class="card-actions" style="flex-direction:column;align-items:flex-end;gap:.4rem">
            <span style="font-size:.7rem;padding:.2rem .6rem;border-radius:2rem;background:${statusColors[en.status] || '#888'};color:#fff;font-family:var(--sans,sans-serif);text-transform:capitalize">
              ${esc(en.status)}
            </span>
          </div>
        </div>
        <div style="margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--border)">
          <p style="font-size:.85rem;line-height:1.6;white-space:pre-wrap">${esc(en.description)}</p>
          ${en.notes ? `<p class="meta" style="margin-top:.5rem;font-style:italic">Notes: ${esc(en.notes)}</p>` : ''}
        </div>
        <div class="form-grid" style="margin-top:1rem">
          <div class="fg" style="max-width:180px">
            <label>Status</label>
            <select class="comm-status" data-id="${esc(en.id)}">
              <option value="new" ${en.status==='new'?'selected':''}>New</option>
              <option value="reviewing" ${en.status==='reviewing'?'selected':''}>Reviewing</option>
              <option value="accepted" ${en.status==='accepted'?'selected':''}>Accepted</option>
              <option value="declined" ${en.status==='declined'?'selected':''}>Declined</option>
              <option value="completed" ${en.status==='completed'?'selected':''}>Completed</option>
            </select>
          </div>
          <div class="fg" style="flex:1">
            <label>Admin notes</label>
            <input type="text" class="comm-notes" data-id="${esc(en.id)}" value="${esc(en.notes || '')}" placeholder="Internal notes…" />
          </div>
          <div class="fg" style="align-self:flex-end">
            <button type="button" class="btn-primary comm-save" data-id="${esc(en.id)}" data-idx="${i}">Save</button>
          </div>
        </div>
      </div>
    `).join('');

    list.__items = items;

    list.querySelectorAll('.comm-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const idx = parseInt(btn.dataset.idx);
        const statusEl = list.querySelector(`.comm-status[data-id="${id}"]`);
        const notesEl = list.querySelector(`.comm-notes[data-id="${id}"]`);
        try {
          await api(`/api/admin/commissions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: statusEl.value, notes: notesEl.value }),
          });
          list.__items[idx].status = statusEl.value;
          list.__items[idx].notes = notesEl.value;
          status('Commission updated.');
          renderList(list.__items);
        } catch (e) { status(e.message, true); }
      });
    });
  };

  renderList(enquiries);
}

// ── Events ────────────────────────────────────────────────────
async function secEvents() {
  const events = await api('/api/events');
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header">
      <h2>Events</h2>
      <button type="button" class="btn-primary" id="addEventBtn">+ Add event</button>
    </div>
    <div id="eventList"></div>
  `;
  document.getElementById('addEventBtn').addEventListener('click', () => showEventForm(null));
  renderEventCards(events);
}

function renderEventCards(events) {
  const list = document.getElementById('eventList');
  if (!list) return;
  if (!events.length) { list.innerHTML = '<p class="empty">No events yet. Click "+ Add event" to create one.</p>'; return; }
  const statusBadge = (s) => {
    const c = { upcoming: '#2d6a4f', ongoing: '#1d3557', past: '#888', cancelled: '#c0392b' };
    return `<span style="font-size:.7rem;padding:.2rem .6rem;border-radius:2rem;background:${c[s]||'#888'};color:#fff;text-transform:capitalize;font-family:var(--sans,sans-serif)">${esc(s)}</span>`;
  };
  list.innerHTML = events.map((ev, i) => `
    <div class="card">
      <div class="card-header">
        <div>
          ${statusBadge(ev.status)}
          <h3 style="margin:.35rem 0 .2rem">${esc(ev.title)}</h3>
          <p class="meta">
            📅 ${esc(ev.date)}${ev.time ? ' · ' + esc(ev.time) : ''}
            ${ev.location ? ' · 📍 ' + esc(ev.location) : ''}
            ${ev.entry_fee ? ' · 🎟️ ' + esc(ev.entry_fee) : ''}
          </p>
        </div>
        <div class="card-actions">
          ${ev.image ? `<img src="${esc(ev.image)}" class="thumb" onerror="this.onerror=null;this.classList.add('is-broken')" alt="" />` : ''}
          <button type="button" class="btn-edit" data-idx="${i}">Edit</button>
          <button type="button" class="btn-del" data-id="${esc(ev.id)}">Delete</button>
        </div>
      </div>
      <p style="margin-top:.5rem;font-size:.85rem;line-height:1.6">${esc(ev.description).substring(0,200)}${ev.description.length>200?'…':''}</p>
    </div>
  `).join('');

  list.__events = events;
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const ev = list.__events[parseInt(btn.dataset.idx)];
      showEventForm(ev);
    });
  });
  list.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this event? This cannot be undone.')) return;
      try {
        await api('/api/admin/events/' + btn.dataset.id, { method: 'DELETE' });
        status('Event deleted.');
        secEvents();
      } catch (e) { status(e.message, true); }
    });
  });
}

function showEventForm(item) {
  const m = document.getElementById('adminMain');
  m.innerHTML = `
    <div class="sec-header">
      <h2>${item ? 'Edit event' : 'Add event'}</h2>
      <button type="button" class="btn-ghost" id="cancelEvBtn">Back</button>
    </div>
    <form id="eventForm" method="dialog" novalidate>
      <div class="form-grid">
        <div class="fg">
          <label>Title <span class="req">*</span></label>
          <input id="evTitle" type="text" value="${esc(item?.title || '')}" required />
        </div>
        <div class="fg">
          <label>Slug <span class="req">*</span></label>
          <input id="evSlug" type="text" value="${esc(item?.slug || '')}" placeholder="url-friendly-slug" required />
        </div>
        <div class="fg">
          <label>Date <span class="req">*</span></label>
          <input id="evDate" type="date" value="${esc(item?.date || '')}" required />
        </div>
        <div class="fg">
          <label>Time</label>
          <input id="evTime" type="time" value="${esc(item?.time || '')}" />
        </div>
        <div class="fg">
          <label>Location</label>
          <input id="evLocation" type="text" value="${esc(item?.location || '')}" placeholder="Venue, City" />
        </div>
        <div class="fg">
          <label>Entry Fee</label>
          <input id="evEntryFee" type="text" value="${esc(item?.entry_fee || '')}" placeholder="e.g. Free, NRs. 500" />
        </div>
        <div class="fg">
          <label>Status</label>
          <select id="evStatus">
            <option value="upcoming" ${(!item||item.status==='upcoming')?'selected':''}>Upcoming</option>
            <option value="ongoing" ${item?.status==='ongoing'?'selected':''}>Ongoing</option>
            <option value="past" ${item?.status==='past'?'selected':''}>Past</option>
            <option value="cancelled" ${item?.status==='cancelled'?'selected':''}>Cancelled</option>
          </select>
        </div>
        <div class="fg full">
          <label>Event Image</label>
          <div class="img-upload-row">
            <label class="btn-upload">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload from device
              <input type="file" id="evImageFile" accept="image/*" />
            </label>
            <span class="or">or</span>
            <input type="text" id="evImage" value="${esc(item?.image || '')}" placeholder="Paste image URL (https://...)" style="flex:1" />
          </div>
          <div id="evImagePreview"></div>
        </div>
        <div class="fg full">
          <label>Description <span class="req">*</span></label>
          <textarea id="evDescription" rows="6" required placeholder="Full event description, what to expect, schedule…">${esc(item?.description || '')}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary" id="saveEvBtn">Save event</button>
        <button type="button" class="btn-ghost" id="cancelEvBtn2">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById('cancelEvBtn').addEventListener('click', () => secEvents());
  document.getElementById('cancelEvBtn2').addEventListener('click', () => secEvents());

  // Auto-slug from title
  const titleInput = document.getElementById('evTitle');
  const slugInput = document.getElementById('evSlug');
  if (!item) {
    titleInput.addEventListener('input', () => {
      slugInput.value = titleInput.value.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    });
  }

  // Image preview
  setupSingleImageUpload({ inputId: 'evImage', fileId: 'evImageFile', previewContainerId: 'evImagePreview' });

  // Save
  document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('evTitle').value.trim();
    const slug = document.getElementById('evSlug').value.trim();
    const date = document.getElementById('evDate').value;
    const description = document.getElementById('evDescription').value.trim();
    if (!title || !slug || !date || !description) {
      status('Title, slug, date and description are required.', true);
      return;
    }
    const payload = {
      title,
      slug,
      date,
      time: document.getElementById('evTime').value || undefined,
      location: document.getElementById('evLocation').value.trim() || undefined,
      entryFee: document.getElementById('evEntryFee').value.trim() || undefined,
      status: document.getElementById('evStatus').value,
      image: document.getElementById('evImage').value.trim() || undefined,
      description,
    };
    try {
      if (item?.id) {
        await api('/api/admin/events/' + item.id, { method: 'PUT', body: JSON.stringify(payload) });
        status('Event updated.');
      } else {
        await api('/api/admin/events', { method: 'POST', body: JSON.stringify(payload) });
        status('Event created.');
      }
      secEvents();
    } catch (err) { status(err.message, true); }
  });
}
