// ======================== DATA STORE ========================
const KEYS = { products: 'mw_products', inventory: 'mw_inventory', promotions: 'mw_promotions', orders: 'mw_orders', settings: 'mw_settings', rebate: 'mw_rebate' };

function load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); updateStatus(); }
function loadObj(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; } }

let DB = {
  products: load(KEYS.products),
  inventory: load(KEYS.inventory),
  promotions: load(KEYS.promotions),
  orders: loadObj(KEYS.orders, { elec: [], hand: [], pack: [] }),
  settings: loadObj(KEYS.settings, { quarterDC: 0.04, yearDC: 0.018, vat: 0.1, naverFee: 0.059, openElecFee: 0.13, openHandFee: 0.176, domaeFee: 0.01, mkDomae: 1, mkRetail: 15, mkNaver: 17, mkOpen: 27, promoFee1: 5.8, promoFee2: 3.6, arPromos: [{name:'',rate:0},{name:'',rate:0},{name:'',rate:0},{name:'',rate:0}], volPromos: [{name:'',rate:0},{name:'',rate:0},{name:'',rate:0},{name:'',rate:0}] }),
  rebate: load(KEYS.rebate)
};

// Default rebate tiers
if (!DB.rebate.length) {
  DB.rebate = [
    { min: 6000000, rate: 0.02 }, { min: 15000000, rate: 0.023 }, { min: 30000000, rate: 0.025 },
    { min: 60000000, rate: 0.027 }, { min: 100000000, rate: 0.029 }, { min: 200000000, rate: 0.031 },
    { min: 300000000, rate: 0.034 }, { min: 500000000, rate: 0.037 }, { min: 700000000, rate: 0.038 },
    { min: 1000000000, rate: 0.04 }
  ];
  save(KEYS.rebate, DB.rebate);
}

function saveAll() {
  save(KEYS.products, DB.products);
  save(KEYS.inventory, DB.inventory);
  save(KEYS.promotions, DB.promotions);
  save(KEYS.orders, DB.orders);
  save(KEYS.settings, DB.settings);
}

// ======================== UTILITY ========================
const comma = n => { const s = String(Math.round(n)); return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
const fmt = n => n == null || isNaN(n) || n === 0 ? '-' : comma(n);
const fmtN = n => n == null || isNaN(n) || n === 0 ? '-' : comma(n);
const fmtPrice = n => n == null || isNaN(n) ? '-' : '' + comma(n);
const pct = n => n == null || isNaN(n) ? '-' : (n * 100).toFixed(1) + '%';

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function updateStatus() {
  document.getElementById('status-products').textContent = `제품: ${DB.products.length}건 | 재고: ${DB.inventory.length}건 | 프로모션: ${DB.promotions.length}건`;
  document.getElementById('status-save').textContent = `마지막 저장: ${new Date().toLocaleTimeString('ko')}`;
}

function findProduct(code) { return DB.products.find(p => String(p.code) === String(code)); }
function findStock(code) { const inv = DB.inventory.find(i => String(i.code) === String(code)); return inv ? inv.stock : null; }
function findPromo(code) { return DB.promotions.find(p => String(p.code) === String(code)); }

let currentPromoPop = null;

function showPromoPop(e, code) {
  e.stopPropagation();

  if (currentPromoPop) {
    currentPromoPop.remove();
    currentPromoPop = null;
  }

  var product = findProduct(code);
  if (!product) return;

  var now = Date.now();
  var weekMs = 7 * 24 * 60 * 60 * 1000;
  var results = [];

  (orderHistory || []).forEach(function(record) {
    if ((now - new Date(record.date).getTime()) < weekMs) {
      (record.items || []).forEach(function(it) {
        if (String(it.code) === String(code)) {
          results.push({
            type: '일반',
            date: new Date(record.date).toLocaleDateString('ko'),
            qty: it.qty,
            price: it.supplyPrice || product.supplyPrice,
            cost: it.cost,
            promoNo: '-'
          });
        }
      });
    }
  });

  (poHistory || []).forEach(function(record) {
    if ((now - new Date(record.date).getTime()) < weekMs) {
      (record.items || []).forEach(function(it) {
        if (String(it.code) === String(code)) {
          results.push({
            type: '프로모션',
            date: new Date(record.date).toLocaleDateString('ko'),
            qty: it.qty,
            price: it.promoPrice || 0,
            cost: it.cost,
            promoNo: it.promoNo || '-'
          });
        }
      });
    }
  });

  if (!results.length) return;

  var baseCost = product.cost || 0;
  var latest = results[results.length - 1];
  var diff = latest.cost - baseCost;
  var diffPct = baseCost > 0 ? Math.round((diff / baseCost) * 100) : 0;

  var pop = document.createElement('div');
  pop.style.cssText = 'position:fixed;z-index:9999;width:450px;background:white;border:1px solid #DDE1EB;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:14px 16px;font-size:12px;font-family:Pretendard,sans-serif';

  var rows = results.map(function(r) {
    var typeBadge = r.type === '프로모션'
      ? '<span style="background:#FCEBEB;color:#CC2222;font-size:10px;font-weight:600;padding:2px 6px;border-radius:3px">' + r.promoNo + '</span>'
      : '<span style="background:#E6F1FB;color:#185FA5;font-size:10px;font-weight:600;padding:2px 6px;border-radius:3px">일반발주</span>';
    return '<tr style="border-bottom:1px solid #F0F2F7">' +
      '<td style="padding:5px 8px;text-align:center">' + typeBadge + '</td>' +
      '<td style="padding:5px 8px;text-align:center;color:#5A6070">' + r.date + '</td>' +
      '<td style="padding:5px 8px;text-align:center;font-weight:500">' + r.qty + '개</td>' +
      '<td style="padding:5px 8px;text-align:right">' + fmt(r.price) + '</td>' +
      '<td style="padding:5px 8px;text-align:right;color:#CC2222;font-weight:700">' + fmt(r.cost) + '</td>' +
      '</tr>';
  }).join('');

  pop.innerHTML = '<div style="font-size:13px;font-weight:600;color:#1A1D23;margin-bottom:10px">' + code + ' · ' + (product.model || '') + ' 발주 이력</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<thead><tr style="background:#F4F6FA">' +
    '<th style="padding:5px 8px;text-align:center;font-weight:600;color:#5A6070">구분</th>' +
    '<th style="padding:5px 8px;text-align:center;font-weight:600;color:#5A6070">발주일</th>' +
    '<th style="padding:5px 8px;text-align:center;font-weight:600;color:#5A6070">수량</th>' +
    '<th style="padding:5px 8px;text-align:right;font-weight:600;color:#5A6070">단가</th>' +
    '<th style="padding:5px 8px;text-align:right;font-weight:600;color:#CC2222">매입원가</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div style="margin-top:8px;padding-top:6px;border-top:1px solid #F0F2F7;display:flex;gap:16px;font-size:11px;color:#5A6070">' +
    '<span>기본 원가: <span style="color:#1D9E75;font-weight:600">' + fmt(baseCost) + '</span></span>' +
    '<span>최근 발주 원가: <span style="color:#CC2222;font-weight:600">' + fmt(latest.cost) + '</span></span>' +
    '<span>차이: <span style="color:#CC2222;font-weight:600">' + fmt(diff) + ' (' + diffPct + '%)</span></span>' +
    '</div>';

  document.body.appendChild(pop);
  currentPromoPop = pop;

  var rect = e.target.getBoundingClientRect();
  var top = rect.bottom + 8;
  var left = rect.right - pop.offsetWidth;
  if (left < 8) left = 8;
  if (top + pop.offsetHeight > window.innerHeight - 8) {
    top = rect.top - pop.offsetHeight - 8;
  }
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';
}

document.addEventListener('click', function(e) {
  if (currentPromoPop && !currentPromoPop.contains(e.target)) {
    currentPromoPop.remove();
    currentPromoPop = null;
  }
});

// Calculate cost from supply price (엑셀 원가 공식)
function calcCost(supplyPrice, productDC) {
  if (!supplyPrice) return 0;
  const s = DB.settings;
  const sp = supplyPrice;
  // AR차감: 분기 + 년간 + AR커머셜들
  let arTotal = sp * s.quarterDC + sp * s.yearDC;
  (s.arPromos || []).forEach(ap => { if (ap.rate > 0) arTotal += sp * (ap.rate / 100); });
  // 물량지원: 커머셜들 + 제품DC
  let volPct = 0;
  (s.volPromos || []).forEach(vp => { if (vp.rate > 0) volPct += vp.rate; });
  volPct += (productDC || 0) * 100;
  // 최종 매입원가
  return (sp - arTotal) / (1 + volPct / 100);
}

// ======================== AUTOCOMPLETE ========================
let acActive = null; // { input, callback }
const acEl = document.createElement('div');
acEl.className = 'ac-list';
document.body.appendChild(acEl);

function searchProducts(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return DB.products.filter(p => {
    return String(p.code).includes(q) || (p.model || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  }).slice(0, 15);
}

function showAC(inputEl, callback) {
  const val = inputEl.value.trim();
  const results = searchProducts(val);
  if (!results.length) { hideAC(); return; }
  
  acActive = { input: inputEl, callback };
  acEl.innerHTML = results.map(p => {
    const stock = findStock(p.code);
    const stockTxt = stock != null ? `[${stock}]` : '';
    return `<div class="ac-item" data-code="${p.code}">
      <span class="ac-code">${p.code}</span>
      <span class="ac-model">${p.model || ''}</span>
      <span class="ac-desc">${(p.description || '').slice(0, 30)}</span>
      <span class="ac-price">${fmt(p.supplyPrice)} ${stockTxt}</span>
    </div>`;
  }).join('');
  
  const rect = inputEl.getBoundingClientRect();
  acEl.style.position = 'fixed';
  acEl.style.top = (rect.bottom + 2) + 'px';
  acEl.style.left = rect.left + 'px';
  acEl.classList.add('show');
}

function hideAC() { acEl.classList.remove('show'); acActive = null; }

acEl.addEventListener('mousedown', function(e) {
  const item = e.target.closest('.ac-item');
  if (item && acActive) {
    const code = item.dataset.code;
    acActive.input.value = code;
    acActive.callback(code);
    hideAC();
  }
});

document.addEventListener('click', function(e) {
  if (!acEl.contains(e.target) && e.target !== acActive?.input) hideAC();
});

// Helper: get effective cost considering promo
function getEffectiveCost(code) {
  const promo = findPromo(code);
  if (promo && promo.cost > 0) return { cost: promo.cost, isPromo: true, promoName: promo.promoName };
  const p = findProduct(code);
  if (p) return { cost: p.cost, isPromo: false, promoName: '' };
  return { cost: 0, isPromo: false, promoName: '' };
}

// ======================== TAB SWITCHING ========================
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.target.classList.add('active');
  if (tab === 'catalog') renderCatalog();
  if (tab === 'order') renderAllOrders();
  if (tab === 'sales') renderSales();
  if (tab === 'promo') { renderPromo(); renderAllPromosV2(); }
  if (tab === 'setbun') renderSetbun();
  if (tab === 'estimate') renderEstimateList();
  if (tab === 'general') renderGenProducts();
  if (tab === 'manage') switchManageSub('fee');
}

function switchOrderMain(type) {
  document.querySelectorAll('.order-tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('#order-main-tabs .sub-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  const normalWrap = document.getElementById('order-normal-wrap');
  const promoWrap = document.getElementById('order-promo-wrap');

  if (type === 'normal') {
    normalWrap.style.display = 'block';
    promoWrap.style.display = 'none';
    switchOrderSub('elec');
  } else if (type === 'promo') {
    normalWrap.style.display = 'none';
    promoWrap.style.display = 'block';
    switchPromoSub('po');
  }
}

function switchPromoSub(type) {
  document.querySelectorAll('.order-tab-content').forEach(t => t.style.display = 'none');
  document.getElementById('order-' + type).style.display = 'block';

  ['po', 'spot'].forEach(t => {
    const btn = document.getElementById('order-sub-' + t);
    if (btn) { btn.className = t === type ? 'btn-action' : 'btn-sub-inactive'; }
  });
  const sheetBtn = document.getElementById('order-sub-po-sheet');
  if (sheetBtn) { sheetBtn.className = type === 'po-sheet' ? 'btn-header-accent' : 'btn-header-accent'; }

  if (type === 'po') renderPoOrder();
  if (type === 'spot') renderSpotOrder();
  if (type === 'po-sheet') renderPromoOrderSheet();
}

function switchOrderSub(type) {
  document.querySelectorAll('.order-tab-content').forEach(t => t.style.display = 'none');
  document.getElementById('order-' + type).style.display = 'block';

  ['elec', 'hand', 'pack'].forEach(t => {
    const btn = document.getElementById('order-sub-' + t);
    if (btn) { btn.className = t === type ? 'btn-action' : 'btn-sub-inactive'; }
  });
  const sheetBtn = document.getElementById('order-sub-sheet');
  if (sheetBtn) { sheetBtn.className = 'btn-header-accent'; }
  if (type === 'sheet') renderOrderSheet();
}

// ======================== 발주서 빠른 추가 ========================
function showSheetAC(input, type) {
  var val = input.value.trim();
  var acDiv = document.getElementById('sheet-ac-' + type);
  if (!val || val.length < 1) { acDiv.style.display = 'none'; return; }

  var q = val.toLowerCase();
  var results = DB.products.filter(function(p) {
    if (p.discontinued) return false;
    return String(p.orderNum || '').includes(q) ||
           String(p.code).includes(q) ||
           (p.model || '').toLowerCase().includes(q);
  }).slice(0, 10);

  if (!results.length) { acDiv.style.display = 'none'; return; }

  acDiv.innerHTML = results.map(function(p) {
    var stock = findStock(p.code);
    var stockTxt = stock != null ? stock : '-';
    return '<div onclick="selectSheetAC(\'' + type + '\',' + p.code + ')" style="padding:6px 8px;cursor:pointer;border-bottom:1px solid #F0F2F7;display:flex;gap:8px;align-items:center" onmouseover="this.style.background=\'#F4F6FA\'" onmouseout="this.style.background=\'white\'">' +
      '<span style="color:#5A6070;min-width:40px">' + (p.orderNum || '-') + '</span>' +
      '<span style="font-weight:500;min-width:50px">' + p.code + '</span>' +
      '<span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + (p.model || '') + '</span>' +
      '<span style="color:#1D9E75;font-weight:500">' + fmt(p.supplyPrice) + '</span>' +
      '<span style="color:#5A6070;font-size:10px">[' + stockTxt + ']</span>' +
      '</div>';
  }).join('');
  acDiv.style.display = 'block';
}

function selectSheetAC(type, code) {
  var p = findProduct(code);
  if (!p) return;
  document.getElementById('sheet-add-' + type + '-ordernum').value = p.orderNum || p.code;
  document.getElementById('sheet-add-' + type + '-ordernum').dataset.code = code;
  document.getElementById('sheet-ac-' + type).style.display = 'none';
  document.getElementById('sheet-add-' + type + '-qty').focus();
}

function addSheetItem(type) {
  var input = document.getElementById('sheet-add-' + type + '-ordernum');
  var qtyInput = document.getElementById('sheet-add-' + type + '-qty');
  var code = input.dataset.code;

  if (!code) {
    var val = input.value.trim();
    if (!val) { toast('순번 또는 코드를 입력하세요'); return; }
    var found = DB.products.find(function(p) {
      return String(p.orderNum) === val || String(p.code) === val;
    });
    if (!found) { toast('제품을 찾을 수 없습니다: ' + val); return; }
    code = found.code;
  }

  var qty = parseInt(qtyInput.value) || 1;

  var existing = DB.orders[type].find(function(item) { return String(item.code) === String(code); });
  if (existing) {
    existing.qty = (existing.qty || 0) + qty;
  } else {
    DB.orders[type].push({ code: String(code), qty: qty, memo: '' });
  }

  save(KEYS.orders, DB.orders);
  renderOrderSheet();
  calcOrderTotals();

  input.value = '';
  input.dataset.code = '';
  qtyInput.value = '';
  input.focus();

  var p = findProduct(code);
  toast((p ? p.model : code) + ' ' + qty + '개 추가');
}

document.addEventListener('click', function(e) {
  ['elec', 'hand', 'pack'].forEach(function(type) {
    var ac = document.getElementById('sheet-ac-' + type);
    if (ac && !ac.contains(e.target) && e.target.id !== 'sheet-add-' + type + '-ordernum') {
      ac.style.display = 'none';
    }
    var oac = document.getElementById('order-ac-' + type);
    if (oac && !oac.contains(e.target) && e.target.id !== 'order-search-' + type) {
      oac.style.display = 'none';
    }
  });
});

// ======================== 발주 탭 인라인 검색 ========================
function showOrderSearchAC(input, type) {
  var val = input.value.trim();
  var acDiv = document.getElementById('order-ac-' + type);
  if (!val || val.length < 1) { acDiv.style.display = 'none'; return; }

  var q = val.toLowerCase();
  var results = DB.products.filter(function(p) {
    if (p.discontinued) return false;
    return String(p.code).includes(q) ||
           String(p.orderNum || '').includes(q) ||
           (p.model || '').toLowerCase().includes(q) ||
           (p.description || '').toLowerCase().includes(q);
  }).slice(0, 15);

  if (!results.length) {
    acDiv.innerHTML = '<div style="padding:10px;color:#9BA3B2;text-align:center">검색 결과 없음</div>';
    acDiv.style.display = 'block';
    return;
  }

  acDiv.innerHTML = results.map(function(p) {
    var stock = findStock(p.code);
    var stockTxt = stock != null ? stock : '-';
    var alreadyAdded = DB.orders[type].some(function(item) { return String(item.code) === String(p.code) && item.qty > 0; });
    var addedBadge = alreadyAdded ? '<span style="background:#E6F1FB;color:#185FA5;font-size:9px;padding:1px 4px;border-radius:3px;margin-left:4px">추가됨</span>' : '';
    return '<div onclick="selectOrderSearchAC(\'' + type + '\',\'' + p.code + '\')" style="padding:8px 10px;cursor:pointer;border-bottom:1px solid #F0F2F7;display:flex;gap:8px;align-items:center" onmouseover="this.style.background=\'#F4F6FA\'" onmouseout="this.style.background=\'white\'">' +
      '<span style="color:#5A6070;min-width:35px;font-size:11px">' + (p.orderNum || '-') + '</span>' +
      '<span style="font-weight:600;min-width:50px">' + p.code + '</span>' +
      '<span style="font-weight:500;min-width:120px">' + (p.model || '') + '</span>' +
      '<span style="flex:1;color:#5A6070;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11px">' + (p.description || '') + '</span>' +
      '<span style="color:#1D9E75;font-weight:500;min-width:60px;text-align:right">' + fmt(p.supplyPrice) + '</span>' +
      '<span style="color:#5A6070;font-size:10px;min-width:30px;text-align:right">[' + stockTxt + ']</span>' +
      addedBadge +
      '</div>';
  }).join('');
  acDiv.style.display = 'block';
}

function selectOrderSearchAC(type, code) {
  var p = findProduct(code);
  if (!p) return;
  var input = document.getElementById('order-search-' + type);
  input.value = p.code + ' ' + (p.model || '');
  input.dataset.code = code;
  document.getElementById('order-ac-' + type).style.display = 'none';

  // 바로 수량 1로 추가
  var existing = DB.orders[type].find(function(item) { return String(item.code) === String(code); });
  if (existing) {
    existing.qty = (existing.qty || 0) + 1;
  } else {
    DB.orders[type].push({ code: String(code), qty: 1, memo: '' });
  }
  save(KEYS.orders, DB.orders);

  var renderFn = type === 'elec' || type === 'hand' || type === 'pack' ? 'renderOrderTab' : null;
  if (typeof renderOrderTab === 'function') renderOrderTab(type);
  calcOrderTotals();

  input.value = '';
  input.dataset.code = '';
  toast((p.model || code) + ' 1개 추가');
}

function addOrderSearchItem(type) {
  var input = document.getElementById('order-search-' + type);
  var code = input.dataset.code;

  if (!code) {
    var val = input.value.trim();
    if (!val) { toast('코드 또는 모델명을 입력하세요'); return; }
    var found = DB.products.find(function(p) {
      return String(p.orderNum) === val || String(p.code) === val;
    });
    if (!found) { toast('제품을 찾을 수 없습니다: ' + val); return; }
    code = found.code;
  }

  var existing = DB.orders[type].find(function(item) { return String(item.code) === String(code); });
  if (existing) {
    existing.qty = (existing.qty || 0) + 1;
  } else {
    DB.orders[type].push({ code: String(code), qty: 1, memo: '' });
  }
  save(KEYS.orders, DB.orders);
  if (typeof renderOrderTab === 'function') renderOrderTab(type);
  calcOrderTotals();

  var p = findProduct(code);
  input.value = '';
  input.dataset.code = '';
  document.getElementById('order-ac-' + type).style.display = 'none';
  toast((p ? p.model : code) + ' 1개 추가');
}

function renderOrderSheet() {
  const now = new Date();
  document.getElementById('order-sheet-date').textContent = now.toLocaleDateString('ko') + ' ' + now.toLocaleTimeString('ko', {hour:'2-digit',minute:'2-digit'});

  ['elec', 'hand', 'pack'].forEach(type => {
    const items = DB.orders[type].filter(item => item.code && item.qty > 0);
    const body = document.getElementById(`sheet-${type}-body`);
    let totalCost = 0;
    let totalSupply = 0;

    body.innerHTML = items.map(item => {
      const p = findProduct(item.code);
      const supply = p ? p.supplyPrice : 0;
      const cost = p ? Math.round(calcOrderCost(p.supplyPrice, p.productDC || 0)) : 0;
      const amountSupply = supply * item.qty;
      const amountCost = cost * item.qty;
      totalSupply += amountSupply;
      totalCost += amountCost;
      return `<tr>
        <td>${item.code}</td>
        <td style="font-weight:500;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p ? p.model : '-'}</td>
        <td class="num">${item.qty}</td>
        <td class="num" style="font-weight:600">${fmtN(amountSupply)}</td>
        <td class="num" style="font-weight:600;color:#1D9E75">${fmtN(amountCost)}</td>
      </tr>`;
    }).join('');

    if (items.length) {
      body.innerHTML += '<tr style="background:#FAEEDA;border-top:2px solid var(--tl-border)"><td></td><td></td><td></td><td class="num" style="font-weight:700;font-size:14px;padding:8px 10px">' + fmt(totalSupply) + '</td><td class="num" style="font-weight:700;font-size:14px;padding:8px 10px;color:#1D9E75">' + fmt(totalCost) + '</td></tr>';
    }

    if (!items.length) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9BA3B2;padding:20px">발주없음</td></tr>';
    }

    document.getElementById(`sheet-${type}-count`).textContent = items.length ? `(${items.length}건)` : '';
    document.getElementById(`sheet-${type}-sum`).innerHTML = `${fmt(totalSupply)} <span style="color:#1D9E75;margin-left:4px">${fmt(totalCost)}</span>`;
    document.getElementById(`sheet-gt-${type}`).textContent = fmt(totalCost);
  });

  const grandTotal = ['elec', 'hand', 'pack'].reduce((sum, type) => {
    return sum + DB.orders[type].filter(i => i.code && i.qty > 0).reduce((s, item) => {
      const p = findProduct(item.code);
      return s + (p ? (p.cost || 0) * item.qty : 0);
    }, 0);
  }, 0);
  document.getElementById('sheet-gt-total').textContent = fmt(grandTotal);
}

function switchPromoTab(type) {
  const tabs = ['newprod', 'package', 'monthly', 'cumul', 'quarter', 'spot', 'commercial'];
  tabs.forEach(t => {
    const el = document.getElementById('promo-tab-' + t);
    if (el) el.style.display = t === type ? 'block' : 'none';
  });
  document.querySelectorAll('#tab-promo .sub-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

// ======================== TAB 1: CATALOG ========================
let catalogFilterMode = 'all';

function setCatalogFilter(mode) {
  catalogFilterMode = mode;
  document.querySelectorAll('#catalog-filter-tabs .sub-tab').forEach(function(btn) {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  renderCatalog();
}

function renderCatalog() {
  const search = document.getElementById('catalog-search').value.toLowerCase();
  const cat = document.getElementById('catalog-cat').value;
  const sub = document.getElementById('catalog-sub').value;

  let filtered = DB.products.filter(p => {
    if (cat && p.category !== cat) return false;
    if (sub && p.subcategory !== sub) return false;
    if (search) {
      const s = `${p.code} ${p.manageCode || ''} ${p.model} ${p.description} ${p.subcategory} ${p.detail} ${p.ttiNum}`.toLowerCase();
      return s.includes(search);
    }
    return true;
  });

  // 서브탭 필터 적용
  if (catalogFilterMode === 'instock') {
    filtered = filtered.filter(function(p) {
      var stock = findStock(p.code);
      return stock != null && stock > 0;
    });
  } else if (catalogFilterMode === 'outstock') {
    filtered = filtered.filter(function(p) {
      var stock = findStock(p.code);
      return stock != null && stock <= 0;
    });
  } else if (catalogFilterMode === 'discontinued') {
    filtered = filtered.filter(function(p) { return !!p.discontinued; });
  } else if (catalogFilterMode === 'nocode') {
    filtered = filtered.filter(function(p) { return !p.manageCode || p.manageCode.trim() === '' || p.manageCode === '-'; });
  }

  // Sort: active items first (by subcategory), discontinued at bottom
  const active = sortProducts(filtered.filter(p => !p.discontinued));
  const discontinued = sortProducts(filtered.filter(p => p.discontinued));

  function buildRow(p) {
    const idx = DB.products.indexOf(p);
    const stock = findStock(p.code);
    const stockBadge = stock == null ? '<span class="badge badge-gray">-</span>' :
      stock > 0 ? `<span class="badge badge-green">${stock}</span>` :
      stock === 0 ? '<span class="badge badge-amber">0</span>' :
      `<span class="badge badge-red">${stock}</span>`;
    const dcDisplay = p.productDC ? pct(p.productDC) : '-';
    const isD = !!p.discontinued;
    return `<tr class="${isD ? 'row-discontinued' : ''}">
      <td style="font-weight:500">${p.code}</td>
      <td>${p.manageCode || '-'}</td>
      <td><span class="badge badge-blue">${p.category || '-'}</span></td>
      <td>${p.subcategory || '-'}</td>
      <td>${p.detail || '-'}</td>
      <td class="center">${p.orderNum || '-'}</td>
      <td>${p.ttiNum || '-'}</td>
      <td style="font-weight:500">${p.model || '-'}</td>
      <td title="${p.description || ''}">${p.description || '-'}</td>
      <td class="num">${fmt(p.supplyPrice)}</td>
      <td class="center">${dcDisplay}</td>
      <td class="num">${fmt(p.cost)}</td>
      ${(function() {
  const code = String(p.code);
  const results = [];
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  (orderHistory || []).forEach(function(record) {
    if ((now - new Date(record.date).getTime()) < weekMs) {
      (record.items || []).forEach(function(it) {
        if (String(it.code) === code) {
          results.push({ cost: it.cost });
        }
      });
    }
  });
  (poHistory || []).forEach(function(record) {
    if ((now - new Date(record.date).getTime()) < weekMs) {
      (record.items || []).forEach(function(it) {
        if (String(it.code) === code) {
          results.push({ cost: it.cost });
        }
      });
    }
  });
  if (!results.length) {
    return '<td class="num" style="background:#FEFAFA;color:#9BA3B2">-</td>';
  }
  var latest = results[results.length - 1];
  return '<td class="num" style="background:#FEFAFA"><span style="color:#CC2222;font-weight:700">' + fmt(latest.cost) + '</span> <span onclick="showPromoPop(event,\'' + code + '\')" style="display:inline-block;background:#CC2222;color:white;font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;cursor:pointer;vertical-align:middle">P</span></td>';
      })()}
      <td class="num">${fmt(p.priceA)}</td>
      <td class="num">${fmt(p.priceRetail)}</td>
      <td class="num" style="background:${isD ? 'transparent' : '#F8FBFF'}">${fmt(p.priceNaver)}</td>
      <td class="num" style="background:${isD ? 'transparent' : '#FEFCF5'}">${fmt(p.priceOpen)}</td>
      <td class="center">${stockBadge}</td>
      <td style="text-align:left;font-size:12px;cursor:pointer;white-space:nowrap;padding-left:8px" onclick="editInDate(${idx})" title="클릭하여 입고날짜 메모 편집">${p.inDate ? '<span style="color:#CC2222;margin-right:4px">●</span>' + p.inDate : '-'}</td>
      <td class="center" style="white-space:nowrap"><button class="btn-edit" onclick="showProductModal(${idx})">수정</button> <button class="btn-danger btn-sm" onclick="deleteProduct(${idx})" style="padding:2px 6px;font-size:11px">삭제</button> <button class="btn-edit" onclick="toggleDiscontinued(${idx},${!isD})" style="padding:2px 6px;font-size:11px;${isD ? 'background:#CC2222' : 'background:#9BA3B2'}">${isD ? '단종됨' : '단종'}</button></td>
    </tr>`;
  }

  const body = document.getElementById('catalog-body');
  let html = '';
  active.slice(0, 500).forEach(p => { html += buildRow(p); });
  if (discontinued.length > 0) {
    html += `<tr class="discontinued-divider"><td colspan="20">단종 품목 (${discontinued.length}건)</td></tr>`;
    html += discontinued.slice(0, 200).map(buildRow).join('');
  }
  body.innerHTML = html;

  const activeCount = active.length;
  const disconCount = discontinued.length;
  document.getElementById('catalog-count').textContent = `${filtered.length}건 (단종 ${disconCount}건)`;

  // KPI
  const totalProducts = DB.products.length;
  const totalDiscon = DB.products.filter(p => p.discontinued).length;
  const inStock = DB.inventory.filter(i => i.stock > 0).length;
  const outStock = DB.inventory.filter(i => i.stock <= 0).length;
  document.getElementById('catalog-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">전체 제품</div><div class="kpi-value">${totalProducts.toLocaleString()}건</div></div>
    <div class="kpi-card-light"><div class="kpi-label">재고 있음</div><div class="kpi-value">${inStock.toLocaleString()}건</div></div>
    <div class="kpi-card-light"><div class="kpi-label">재고없음</div><div class="kpi-value">${outStock.toLocaleString()}건</div></div>
    <div class="kpi-card-light"><div class="kpi-label">단종</div><div class="kpi-value" style="color:#CC2222">${totalDiscon.toLocaleString()}건</div></div>
    <div class="kpi-card-light"><div class="kpi-label">관리코드없음</div><div class="kpi-value" style="color:#EF9F27">${DB.products.filter(p => !p.manageCode || p.manageCode.trim() === '' || p.manageCode === '-').length.toLocaleString()}건</div></div>
  `;

  if (!filtered.length && !DB.products.length) {
    body.innerHTML = '<tr><td colspan="20"><div class="empty-state"><p>제품 데이터가 없습니다</p><button class="btn-primary" onclick="showImportModal()">📥 엑셀 가져오기</button> <button class="btn-primary" style="margin-left:8px" onclick="showProductModal()">+ 제품 추가</button></div></td></tr>';
  }

  initColumnResize('catalog-table');
  initStickyHeader('catalog-table');

  // 서브탭 건수 업데이트
  (function updateFilterCounts() {
    var all = DB.products;
    var instock = all.filter(function(p) { var s = findStock(p.code); return s != null && s > 0; });
    var outstock = all.filter(function(p) { var s = findStock(p.code); return s != null && s <= 0; });
    var disc = all.filter(function(p) { return !!p.discontinued; });
    var nocode = all.filter(function(p) { return !p.manageCode || p.manageCode.trim() === '' || p.manageCode === '-'; });

    var tabs = document.querySelectorAll('#catalog-filter-tabs .sub-tab');
    if (tabs[0]) tabs[0].textContent = '전체제품(' + all.length + ')';
    if (tabs[1]) tabs[1].textContent = '재고있음(' + instock.length + ')';
    if (tabs[2]) tabs[2].textContent = '재고없음(' + outstock.length + ')';
    if (tabs[3]) tabs[3].textContent = '단종(' + disc.length + ')';
    if (tabs[4]) tabs[4].textContent = '관리코드없음(' + nocode.length + ')';
  })();
}

function toggleDiscontinued(idx, checked) {
  DB.products[idx].discontinued = checked ? '단종' : '';
  save(KEYS.products, DB.products);
  renderCatalog();
}

function toggleAllDiscontinued(checked) {
  // Only affect currently filtered/visible items
  const search = document.getElementById('catalog-search').value.toLowerCase();
  const cat = document.getElementById('catalog-cat').value;
  const sub = document.getElementById('catalog-sub').value;

  DB.products.forEach(p => {
    let match = true;
    if (cat && p.category !== cat) match = false;
    if (sub && p.subcategory !== sub) match = false;
    if (search) {
      const s = `${p.code} ${p.manageCode || ''} ${p.model} ${p.description} ${p.subcategory} ${p.detail} ${p.ttiNum}`.toLowerCase();
      if (!s.includes(search)) match = false;
    }
    if (match) p.discontinued = checked ? '단종' : '';
  });
  save(KEYS.products, DB.products);
  renderCatalog();
  toast(checked ? '필터된 제품 전체 단종 처리' : '필터된 제품 전체 단종 해제');
}

// Sort order: 대분류 first, then 중분류
// User's exact 16-step sort order (numbered 1-16)
const SUBCAT_ORDER = [
  '12V FUEL',         // 1
  '12V 브러쉬리스',    // 2
  '12V 브러쉬',       // 3
  '12V 기타',         // 4
  '18V FUEL',         // 5
  '18V 브러쉬리스',    // 6
  '18V 브러쉬',       // 7
  '18V 기타',         // 8
  'MX FUEL',          // 9 (also matches 'MX' via fuzzy)
  'MX',               // 9.5
  '측정공구',          // 10
  '작업공구',          // 11
  '안전장비',          // 11.5
  '비트',             // 12
  '드릴비트 SDS +',    // 13
  '드릴비트 SDS MAX',  // 13.5
  '블레이드',          // 14
  '소켓',             // 14.5
  '파워툴 전용 액세서리', // 14.6
  '엠파이어',          // 14.7
  '툴박스',           // 15 (팩아웃)
  '스토리지',          // 15.1
  '벽걸이',           // 15.2
  '소프트 백',         // 15.3
  'L4',              // 15.5
  '유선',             // 15.6
  'IR',              // 15.7
  '기타'              // 16
];

function getSubcatOrder(subcat) {
  if (!subcat) return 999;
  const idx = SUBCAT_ORDER.indexOf(subcat);
  if (idx >= 0) return idx;
  let best = -1, bestLen = 0;
  for (let i = 0; i < SUBCAT_ORDER.length; i++) {
    if (subcat.includes(SUBCAT_ORDER[i]) && SUBCAT_ORDER[i].length > bestLen) {
      best = i; bestLen = SUBCAT_ORDER[i].length;
    }
    if (SUBCAT_ORDER[i].includes(subcat) && subcat.length > bestLen) {
      best = i; bestLen = subcat.length;
    }
  }
  return best >= 0 ? best : 998;
}

function sortProducts(list) {
  return [...list].sort((a, b) => {
    const oa = getSubcatOrder(a.subcategory);
    const ob = getSubcatOrder(b.subcategory);
    if (oa !== ob) return oa - ob;
    return (a.model || '').localeCompare(b.model || '');
  });
}

function populateCatalogFilters() {
  const cats = [...new Set(DB.products.map(p => p.category).filter(Boolean))].sort();
  const subs = [...new Set(DB.products.map(p => p.subcategory).filter(Boolean))].sort();
  document.getElementById('catalog-cat').innerHTML = '<option value="">전체 대분류</option>' + cats.map(c => `<option>${c}</option>`).join('');
  document.getElementById('catalog-sub').innerHTML = '<option value="">전체 중분류</option>' + subs.map(s => `<option>${s}</option>`).join('');
}

// ======================== TAB 2: ORDER MANAGEMENT ========================
// ======================== PRODUCT PICKER FOR ORDERS ========================
let pickerOrderType = '';
let pickerSelected = new Set();

function showProductPicker(type) {
  pickerOrderType = type;
  pickerSelected = new Set();
  document.getElementById('product-picker-modal').classList.add('show');
  document.getElementById('picker-search').value = '';
  document.getElementById('picker-select-all').checked = false;

  // Populate filters
  const cats = [...new Set(DB.products.map(p => p.category).filter(Boolean))];
  const catSel = document.getElementById('picker-cat');
  catSel.innerHTML = '<option value="">전체 대분류</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('picker-sub').innerHTML = '<option value="">전체 중분류</option>';

  renderPickerList();
}

function closeProductPicker() {
  document.getElementById('product-picker-modal').classList.remove('show');
}

function renderPickerList() {
  const search = document.getElementById('picker-search').value.toLowerCase();
  const cat = document.getElementById('picker-cat').value;
  const sub = document.getElementById('picker-sub').value;

  // Update subcategory filter
  if (cat) {
    const subs = [...new Set(DB.products.filter(p => p.category === cat).map(p => p.subcategory).filter(Boolean))];
    const subSel = document.getElementById('picker-sub');
    const curSub = subSel.value;
    subSel.innerHTML = '<option value="">전체 중분류</option>' + subs.map(s => `<option value="${s}" ${s === curSub ? 'selected' : ''}>${s}</option>`).join('');
  }

  let filtered = DB.products.filter(p => !p.discontinued);
  if (cat) filtered = filtered.filter(p => p.category === cat);
  if (sub) filtered = filtered.filter(p => p.subcategory === sub);
  if (search) filtered = filtered.filter(p => {
    const s = `${p.code} ${p.model} ${p.description} ${p.subcategory}`.toLowerCase();
    return s.includes(search);
  });

  const body = document.getElementById('picker-body');
  body.innerHTML = filtered.slice(0, 200).map(p => {
    const idx = DB.products.indexOf(p);
    const stock = findStock(p.code);
    const stockTxt = stock == null ? '-' : stock;
    const checked = pickerSelected.has(idx);
    return `<tr style="${checked ? 'background:#E6F1FB' : ''}">
      <td class="center"><input type="checkbox" ${checked ? 'checked' : ''} onchange="togglePickerItem(${idx},this.checked)"></td>
      <td>${p.code}</td>
      <td><span class="badge badge-blue">${p.category || '-'}</span></td>
      <td>${p.subcategory || '-'}</td>
      <td style="font-weight:500">${p.model || '-'}</td>
      <td style="max-width:200px;overflow:hidden;white-space:nowrap" title="${p.description || ''}">${p.description || '-'}</td>
      <td class="num">${fmt(p.supplyPrice)}</td>
      <td class="num" style="color:#1D9E75;font-weight:600">${fmt(p.cost)}</td>
      <td class="center">${stockTxt}</td>
    </tr>`;
  }).join('');

  updatePickerCount();
}

function togglePickerItem(idx, checked) {
  if (checked) pickerSelected.add(idx);
  else pickerSelected.delete(idx);
  updatePickerCount();
}

function togglePickerAll(checked) {
  const search = document.getElementById('picker-search').value.toLowerCase();
  const cat = document.getElementById('picker-cat').value;
  const sub = document.getElementById('picker-sub').value;

  let filtered = DB.products.filter(p => !p.discontinued);
  if (cat) filtered = filtered.filter(p => p.category === cat);
  if (sub) filtered = filtered.filter(p => p.subcategory === sub);
  if (search) filtered = filtered.filter(p => `${p.code} ${p.model} ${p.description}`.toLowerCase().includes(search));

  if (checked) {
    filtered.slice(0, 200).forEach(p => pickerSelected.add(DB.products.indexOf(p)));
  } else {
    filtered.forEach(p => pickerSelected.delete(DB.products.indexOf(p)));
  }
  renderPickerList();
}

function updatePickerCount() {
  document.getElementById('picker-selected-count').textContent = `${pickerSelected.size}건 선택`;
}

function confirmProductPicker() {
  if (!pickerSelected.size) { toast('제품을 선택해주세요'); return; }

  const type = pickerOrderType;
  let addedCount = 0;

  pickerSelected.forEach(idx => {
    const p = DB.products[idx];
    if (!p) return;
    const codeStr = String(p.code);
    // Skip if already in order list
    if (DB.orders[type].some(o => String(o.code) === codeStr)) return;
    DB.orders[type].push({
      code: codeStr,
      qty: 0
    });
    addedCount++;
  });

  save(KEYS.orders, DB.orders);
  closeProductPicker();
  setTimeout(() => {
    renderOrderTab(type);
    calcOrderTotals();
    toast(`${addedCount}건 제품 추가 완료 (중복 ${pickerSelected.size - addedCount}건 제외)`);
  }, 100);
}

function addOrderRow(type) {
  DB.orders[type].push({ code: '', qty: 0 });
  save(KEYS.orders, DB.orders);
  renderOrderTab(type);
}

function removeOrderRow(type, idx) {
  DB.orders[type].splice(idx, 1);
  save(KEYS.orders, DB.orders);
  renderOrderTab(type);
  calcOrderTotals();
}

function clearOrderTab(type) {
  if (!confirm('이 카테고리의 발주 항목을 모두 삭제하시겠습니까?')) return;
  DB.orders[type] = [];
  save(KEYS.orders, DB.orders);
  renderOrderTab(type);
  calcOrderTotals();
}

function resetOrderQty(type) {
  if (!DB.orders[type].length) { toast('초기화할 항목이 없습니다'); return; }
  DB.orders[type].forEach(item => { item.qty = 0; });
  save(KEYS.orders, DB.orders);
  renderOrderTab(type);
  calcOrderTotals();
  toast('수량 초기화 완료');
}

function onOrderCodeChange(type, idx, val) {
  DB.orders[type][idx].code = val;
  save(KEYS.orders, DB.orders);
  renderOrderTab(type);
}

function onOrderQtyChange(type, idx, val) {
  DB.orders[type][idx].qty = parseInt(val) || 0;
  save(KEYS.orders, DB.orders);
  calcOrderTotals();
}

function onOrderMemoChange(type, idx, val) {
  DB.orders[type][idx].memo = val;
  save(KEYS.orders, DB.orders);
}

function renderOrderTab(type) {
  const body = document.getElementById(`order-${type}-body`);
  body.innerHTML = DB.orders[type].map((item, i) => {
    const p = findProduct(item.code);
    const stock = findStock(item.code);
    const supplyPrice = p ? p.supplyPrice : 0;
    const cost = p ? Math.round(calcOrderCost(p.supplyPrice, p.productDC || 0)) : 0;
    const qty = item.qty || 0;
    const stockBadge = stock == null ? '-' : stock > 0 ? `<span class="badge badge-green">${stock}</span>` : `<span class="badge badge-red">${stock}</span>`;
    return `<tr>
      <td><button class="btn-danger btn-sm" onclick="removeOrderRow('${type}',${i})" style="padding:2px 6px">✕</button></td>
      <td>${item.code || '-'}</td>
      <td style="font-weight:500;white-space:nowrap">${p ? p.model : '-'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p ? p.description : '-'}</td>
      <td class="center">${stockBadge}</td>
      <td style="text-align:left;font-size:12px;white-space:nowrap;padding-left:8px">${p && p.inDate ? '<span style="color:#CC2222;margin-right:4px">●</span>' + p.inDate : '-'}</td>
      <td><input type="number" value="${item.qty || ''}" onchange="onOrderQtyChange('${type}',${i},this.value)" min="0" style="width:70px"></td>
      <td class="num">${fmt(supplyPrice)}</td>
      <td class="num" style="font-weight:600">${qty > 0 ? fmt(supplyPrice * qty) : '-'}</td>
      <td class="num" style="color:#1D9E75">${fmt(cost)}</td>
      <td class="num" style="color:#1D9E75;font-weight:600">${qty > 0 ? fmt(cost * qty) : '-'}</td>
      <td><input value="${item.memo || ''}" onchange="onOrderMemoChange('${type}',${i},this.value)" placeholder="" style="width:100%;font-size:12px"></td>
    </tr>`;
  }).join('');
  if (!DB.orders[type].length) {
    body.innerHTML = '<tr><td colspan="12"><div class="empty-state"><p>발주 항목이 없습니다</p><button class="btn-action-sub" onclick="showProductPicker(\'' + type + '\')">📋 제품 불러오기</button></div></td></tr>';
  }
  const orderTableId = 'order-' + type + '-table';
  initColumnResize(orderTableId);
  initStickyHeader(orderTableId);
  calcOrderTotals();
}

function calcOrderTotals() {
  const calc = type => DB.orders[type].reduce((sum, item) => {
    const p = findProduct(item.code);
    return sum + (p ? Math.round(calcOrderCost(p.supplyPrice, p.productDC || 0)) * (item.qty || 0) : 0);
  }, 0);
  const elec = calc('elec'), hand = calc('hand'), pack = calc('pack');
  document.getElementById('order-elec-total').textContent = fmt(elec);
  document.getElementById('order-hand-total').textContent = fmt(hand);
  document.getElementById('order-pack-total').textContent = fmt(pack);
  document.getElementById('order-grand-total').textContent = fmt(elec + hand + pack);
  // Auto-refresh 발주서 if visible
  if (document.getElementById('order-sheet').style.display !== 'none') renderOrderSheet();
}

function renderAllOrders() {
  ['elec', 'hand', 'pack'].forEach(renderOrderTab);
  if (document.getElementById('order-sheet').style.display !== 'none') renderOrderSheet();
}

// ======================== 발주 확정/이력 ========================
const ORDER_HISTORY_KEY = 'mw_order_history';
let orderHistory = loadObj(ORDER_HISTORY_KEY, []);

function confirmOrder() {
  const items = [];
  let totalCost = 0;
  ['elec', 'hand', 'pack'].forEach(type => {
    DB.orders[type].forEach(item => {
      const p = findProduct(item.code);
      if (p && item.qty > 0) {
        const cost = Math.round(calcOrderCost(p.supplyPrice, p.productDC || 0));
        items.push({
          code: item.code,
          model: p.model,
          type: type,
          qty: item.qty,
          supplyPrice: p.supplyPrice,
          cost: cost,
          costTotal: cost * item.qty,
          memo: item.memo || ''
        });
        totalCost += cost * item.qty;
      }
    });
  });

  if (!items.length) {
    toast('발주 수량이 입력된 제품이 없습니다');
    return;
  }

  if (!confirm('일반 발주를 확정하시겠습니까?\n\n총 ' + items.length + '건, 매입합계 ' + fmt(totalCost) + '원')) return;

  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    items: items,
    totalCost: totalCost,
    totalItems: items.length
  };
  orderHistory.push(record);
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orderHistory));

  // 수량 즉시 초기화
  ['elec', 'hand', 'pack'].forEach(type => {
    DB.orders[type].forEach(item => { item.qty = 0; });
  });
  save(KEYS.orders, DB.orders);
  // 발주서 화면 즉시 갱신
  ['elec', 'hand', 'pack'].forEach(type => {
    document.getElementById('sheet-' + type + '-body').innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9BA3B2;padding:20px">발주없음</td></tr>';
    document.getElementById('sheet-' + type + '-count').textContent = '';
  });
  document.getElementById('sheet-gt-elec').textContent = '-';
  document.getElementById('sheet-gt-hand').textContent = '-';
  document.getElementById('sheet-gt-pack').textContent = '-';
  document.getElementById('sheet-gt-total').textContent = '-';
  // KPI도 초기화
  document.getElementById('order-elec-total').textContent = '-';
  document.getElementById('order-hand-total').textContent = '-';
  document.getElementById('order-pack-total').textContent = '-';
  document.getElementById('order-grand-total').textContent = '-';

  updateOrderSheetButtons(true);
  renderCatalog();
  toast('일반 발주 확정 완료 (' + items.length + '건, ' + fmt(totalCost) + '원)');
}

function updateOrderSheetButtons(confirmed) {
  const confirmBtn = document.getElementById('order-confirm-btn');
  if (confirmed) {
    confirmBtn.textContent = '✅ 발주 확정';
    confirmBtn.onclick = function() { resetOrderConfirm(); };
    confirmBtn.style.background = '#1D9E75';
  } else {
    confirmBtn.textContent = '✅ 발주 확정';
    confirmBtn.onclick = function() { confirmOrder(); };
    confirmBtn.style.background = '';
  }
}

function resetOrderConfirm() {
  if (!confirm('발주 확정을 해제하고 수량을 초기화하시겠습니까?')) return;
  ['elec', 'hand', 'pack'].forEach(type => {
    DB.orders[type].forEach(item => { item.qty = 0; });
  });
  save(KEYS.orders, DB.orders);
  renderAllOrders();
  updateOrderSheetButtons(false);
  toast('발주 확정 해제 및 수량 초기화 완료');
}

function resetAllOrderQty() {
  if (!confirm('전동공구/수공구/팩아웃 전체 수량을 초기화하시겠습니까?')) return;
  ['elec', 'hand', 'pack'].forEach(type => {
    DB.orders[type].forEach(item => { item.qty = 0; });
  });
  save(KEYS.orders, DB.orders);
  renderAllOrders();
  toast('전체 수량 초기화 완료');
}

function showOrderHistory() {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const recent = orderHistory.filter(r => (now - new Date(r.date).getTime()) < weekMs);
  const list = document.getElementById('order-history-list');

  if (!recent.length) {
    list.innerHTML = '<div class="empty-state"><p>최근 1주일 내 발주 이력이 없습니다</p></div>';
  } else {
    list.innerHTML = recent.sort((a, b) => b.id - a.id).map((r, i) => {
      const d = new Date(r.date);
      const dateStr = d.toLocaleDateString('ko') + ' ' + d.toLocaleTimeString('ko', {hour:'2-digit', minute:'2-digit'});
      return '<div style="border:1px solid var(--tl-border);border-radius:6px;padding:12px 16px;margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<div><span style="font-weight:600;font-size:14px">#' + (recent.length - i) + '</span> <span style="color:#5A6070;font-size:12px">' + dateStr + '</span></div>' +
        '<button class="btn-danger btn-sm" onclick="cancelOrderHistory(' + r.id + ')" style="padding:3px 10px;font-size:11px">취소</button>' +
        '</div>' +
        '<div style="display:flex;gap:16px;font-size:12px;color:#5A6070">' +
        '<span>품목: <span style="color:#1A1D23;font-weight:600">' + r.totalItems + '건</span></span>' +
        '<span>매입합계: <span style="color:#1D9E75;font-weight:600">' + fmt(r.totalCost) + '원</span></span>' +
        '</div>' +
        '<div style="margin-top:8px;max-height:120px;overflow-y:auto">' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
        '<thead><tr style="background:#F4F6FA"><th style="padding:3px 6px;text-align:left">코드</th><th style="padding:3px 6px;text-align:left">모델명</th><th style="padding:3px 6px;text-align:center">수량</th><th style="padding:3px 6px;text-align:right">매입원가</th></tr></thead>' +
        '<tbody>' + r.items.map(it =>
          '<tr style="border-bottom:1px solid #F0F2F7"><td style="padding:3px 6px">' + it.code + '</td><td style="padding:3px 6px">' + it.model + '</td><td style="padding:3px 6px;text-align:center">' + it.qty + '</td><td style="padding:3px 6px;text-align:right;color:#1D9E75">' + fmt(it.costTotal) + '</td></tr>'
        ).join('') + '</tbody></table></div></div>';
    }).join('');
  }

  document.getElementById('order-history-modal').classList.add('show');
}

function closeOrderHistoryModal() {
  document.getElementById('order-history-modal').classList.remove('show');
}

function cancelOrderHistory(id) {
  const record = orderHistory.find(r => r.id === id);
  if (!record) return;
  const d = new Date(record.date);
  const dateStr = d.toLocaleDateString('ko') + ' ' + d.toLocaleTimeString('ko', {hour:'2-digit', minute:'2-digit'});
  if (!confirm(dateStr + ' 발주를 취소하시겠습니까?\n(' + record.totalItems + '건, ' + fmt(record.totalCost) + '원)')) return;

  orderHistory = orderHistory.filter(r => r.id !== id);
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orderHistory));

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const recent = orderHistory.filter(r => (now - new Date(r.date).getTime()) < weekMs);
  if (!recent.length) {
    updateOrderSheetButtons(false);
  }

  showOrderHistory();
  toast('발주 취소 완료');
}

// ======================== 프로모션 발주 확정/이력 ========================
const PO_HISTORY_KEY = 'mw_promo_order_history';
let poHistory = loadObj(PO_HISTORY_KEY, []);

function confirmPromoOrder() {
  const items = [];
  let totalCost = 0;

  poOrderData.forEach(item => {
    if (item.orderQty > 0) {
      const prod = item.code ? findProduct(item.code) : null;
      const pdc = prod ? (prod.productDC || 0) : 0;
      const unitCost = Math.round(calcOrderCost(item.promoPrice || 0, pdc));
      items.push({
        code: item.code || '',
        model: item.model || '',
        promoNo: item.promoNo || '',
        promoName: item.promoName || '',
        qty: item.orderQty,
        promoPrice: item.promoPrice || 0,
        cost: unitCost,
        costTotal: unitCost * item.orderQty,
        type: 'promo'
      });
      totalCost += unitCost * item.orderQty;
    }
  });

  spotOrderData.forEach(item => {
    if (item.orderQty > 0) {
      const prod = item.code ? findProduct(item.code) : null;
      const pdc = prod ? (prod.productDC || 0) : 0;
      const unitCost = Math.round(calcOrderCost(item.promoPrice || 0, pdc));
      items.push({
        code: item.code || '',
        model: item.model || '',
        promoNo: item.promoNo || '',
        promoName: item.promoName || '스팟',
        qty: item.orderQty,
        promoPrice: item.promoPrice || 0,
        cost: unitCost,
        costTotal: unitCost * item.orderQty,
        type: 'spot'
      });
      totalCost += unitCost * item.orderQty;
    }
  });

  if (!items.length) {
    toast('발주 수량이 입력된 프로모션 제품이 없습니다');
    return;
  }

  if (!confirm('프로모션 발주를 확정하시겠습니까?\n\n총 ' + items.length + '건, 매입합계 ' + fmt(totalCost) + '원')) return;

  items.forEach(it => {
    if (it.code) {
      const existing = DB.promotions.find(p => String(p.code) === String(it.code) && p.promoCode === it.promoNo);
      if (!existing) {
        DB.promotions.push({
          code: it.code,
          promoCode: it.promoNo,
          promoName: it.promoName,
          model: it.model,
          promoPrice: it.promoPrice,
          cost: it.cost,
          qty: it.qty,
          orderDate: new Date().toISOString(),
          month: new Date().toISOString().slice(0, 7)
        });
      }
    }
  });
  save(KEYS.promotions, DB.promotions);

  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    items: items,
    totalCost: totalCost,
    totalItems: items.length
  };
  poHistory.push(record);
  localStorage.setItem(PO_HISTORY_KEY, JSON.stringify(poHistory));

  // 수량 즉시 초기화
  poOrderData.forEach(item => { item.orderQty = 0; });
  spotOrderData.forEach(item => { item.orderQty = 0; });
  savePoOrders();
  saveSpotOrders();
  // 발주서 화면 즉시 갱신
  document.getElementById('po-sheet-body').innerHTML = '<tr><td colspan="10" style="text-align:center;color:#9BA3B2;padding:30px">발주 수량이 입력된 프로모션이 없습니다</td></tr>';
  document.getElementById('po-sheet-promo-cost-total').textContent = '-';
  document.getElementById('po-sheet-spot-cost-total').textContent = '-';
  document.getElementById('po-sheet-grand-cost-total').textContent = '-';

  updatePoSheetButtons(true);
  renderCatalog();
  toast('프로모션 발주 확정 완료 (' + items.length + '건, ' + fmt(totalCost) + '원)');
}

function updatePoSheetButtons(confirmed) {
  const confirmBtn = document.getElementById('po-confirm-btn');
  if (confirmed) {
    confirmBtn.textContent = '✅ 발주 확정';
    confirmBtn.onclick = function() { resetPoConfirm(); };
    confirmBtn.style.background = '#1D9E75';
  } else {
    confirmBtn.textContent = '✅ 발주 확정';
    confirmBtn.onclick = function() { confirmPromoOrder(); };
    confirmBtn.style.background = '';
  }
}

function resetPoConfirm() {
  if (!confirm('프로모션 발주 확정을 해제하고 수량을 초기화하시겠습니까?')) return;
  poOrderData.forEach(item => { item.orderQty = 0; });
  spotOrderData.forEach(item => { item.orderQty = 0; });
  savePoOrders();
  saveSpotOrders();
  renderPoOrder();
  renderSpotOrder();
  updatePoSheetButtons(false);
  toast('프로모션 발주 확정 해제 및 수량 초기화 완료');
}

function resetAllPromoQty() {
  if (!confirm('프로모션/스팟 전체 수량을 초기화하시겠습니까?')) return;
  poOrderData.forEach(item => { item.orderQty = 0; });
  spotOrderData.forEach(item => { item.orderQty = 0; });
  savePoOrders();
  saveSpotOrders();
  renderPoOrder();
  renderSpotOrder();
  toast('프로모션 전체 수량 초기화 완료');
}

function showPromoOrderHistory() {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const recent = poHistory.filter(r => (now - new Date(r.date).getTime()) < weekMs);
  const list = document.getElementById('po-history-list');

  if (!recent.length) {
    list.innerHTML = '<div class="empty-state"><p>최근 1주일 내 프로모션 발주 이력이 없습니다</p></div>';
  } else {
    list.innerHTML = recent.sort((a, b) => b.id - a.id).map((r, i) => {
      const d = new Date(r.date);
      const dateStr = d.toLocaleDateString('ko') + ' ' + d.toLocaleTimeString('ko', {hour:'2-digit', minute:'2-digit'});
      return '<div style="border:1px solid var(--tl-border);border-radius:6px;padding:12px 16px;margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<div><span style="font-weight:600;font-size:14px">#' + (recent.length - i) + '</span> <span style="color:#5A6070;font-size:12px">' + dateStr + '</span></div>' +
        '<button class="btn-danger btn-sm" onclick="cancelPoHistory(' + r.id + ')" style="padding:3px 10px;font-size:11px">취소</button>' +
        '</div>' +
        '<div style="display:flex;gap:16px;font-size:12px;color:#5A6070">' +
        '<span>품목: <span style="color:#1A1D23;font-weight:600">' + r.totalItems + '건</span></span>' +
        '<span>매입합계: <span style="color:#1D9E75;font-weight:600">' + fmt(r.totalCost) + '원</span></span>' +
        '</div>' +
        '<div style="margin-top:8px;max-height:120px;overflow-y:auto">' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
        '<thead><tr style="background:#F4F6FA"><th style="padding:3px 6px;text-align:left">코드</th><th style="padding:3px 6px;text-align:left">모델명</th><th style="padding:3px 6px;text-align:center">프로모션</th><th style="padding:3px 6px;text-align:center">수량</th><th style="padding:3px 6px;text-align:right">매입원가</th></tr></thead>' +
        '<tbody>' + r.items.map(it =>
          '<tr style="border-bottom:1px solid #F0F2F7"><td style="padding:3px 6px">' + it.code + '</td><td style="padding:3px 6px">' + it.model + '</td><td style="padding:3px 6px;text-align:center"><span style="background:#E6F1FB;color:#185FA5;font-size:10px;font-weight:600;padding:1px 4px;border-radius:3px">' + it.promoNo + '</span></td><td style="padding:3px 6px;text-align:center">' + it.qty + '</td><td style="padding:3px 6px;text-align:right;color:#1D9E75">' + fmt(it.costTotal) + '</td></tr>'
        ).join('') + '</tbody></table></div></div>';
    }).join('');
  }

  document.getElementById('po-history-modal').classList.add('show');
}

function closePoHistoryModal() {
  document.getElementById('po-history-modal').classList.remove('show');
}

function cancelPoHistory(id) {
  const record = poHistory.find(r => r.id === id);
  if (!record) return;
  const d = new Date(record.date);
  const dateStr = d.toLocaleDateString('ko') + ' ' + d.toLocaleTimeString('ko', {hour:'2-digit', minute:'2-digit'});
  if (!confirm(dateStr + ' 프로모션 발주를 취소하시겠습니까?\n(' + record.totalItems + '건, ' + fmt(record.totalCost) + '원)')) return;

  record.items.forEach(it => {
    if (it.code) {
      const idx = DB.promotions.findIndex(p => String(p.code) === String(it.code) && p.promoCode === it.promoNo && p.orderDate);
      if (idx >= 0) DB.promotions.splice(idx, 1);
    }
  });
  save(KEYS.promotions, DB.promotions);

  poHistory = poHistory.filter(r => r.id !== id);
  localStorage.setItem(PO_HISTORY_KEY, JSON.stringify(poHistory));

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const recent = poHistory.filter(r => (now - new Date(r.date).getTime()) < weekMs);
  if (!recent.length) {
    updatePoSheetButtons(false);
  }

  showPromoOrderHistory();
  renderCatalog();
  toast('프로모션 발주 취소 완료');
}

function exportOrder() {
  // 확정 상태면 최신 이력에서 엑셀 생성
  const now2 = Date.now();
  const weekMs2 = 7 * 24 * 60 * 60 * 1000;
  const recentOrd = orderHistory.filter(r => (now2 - new Date(r.date).getTime()) < weekMs2);
  if (recentOrd.length > 0) {
    const latest = recentOrd.sort((a, b) => b.id - a.id)[0];
    if (!window.XLSX) { toast('SheetJS 라이브러리 로딩 중입니다'); return; }
    try {
      const data = [['내부코드', '수량', '매입원가', '적요']];
      latest.items.forEach(it => {
        data.push([it.code, it.qty, it.costTotal, it.memo || '']);
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{wch:12},{wch:8},{wch:14},{wch:40}];
      XLSX.utils.book_append_sheet(wb, ws, '발주서');
      XLSX.writeFile(wb, '밀워키_발주서_' + new Date().toISOString().slice(0, 10) + '.xlsx');
      toast('발주서 다운로드 완료 (' + latest.totalItems + '건)');
    } catch (err) {
      toast('다운로드 실패: ' + err.message);
    }
    return;
  }
  if (!window.XLSX) { toast('SheetJS 라이브러리 로딩 중입니다. 잠시 후 다시 시도하세요.'); return; }
  try {
    const data = [['내부코드', '수량', '원가', '적요']];
    let totalItems = 0;

    // 일반 발주 (전동/수공/팩아웃)
    ['elec', 'hand', 'pack'].forEach(type => {
      DB.orders[type].forEach(item => {
        const p = findProduct(item.code);
        if (p && item.qty > 0) {
          const oc = Math.round(calcOrderCost(p.supplyPrice, p.productDC || 0));
          data.push([item.code, item.qty, oc * item.qty, item.memo || '']);
          totalItems++;
        }
      });
    });

    if (totalItems === 0) { toast('발주 수량이 입력된 제품이 없습니다'); return; }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, '발주서');

    XLSX.writeFile(wb, `밀워키_발주서_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast(`발주서 다운로드 완료 (${totalItems}건)`);
  } catch (err) {
    console.error('발주서 다운로드 오류:', err);
    toast('발주서 다운로드 실패: ' + err.message);
  }
}

// ======================== PROMO ORDERS (통합) ========================
let poOrderData = loadObj('mw_po_orders', []);
let spotOrderData = loadObj('mw_spot_orders', []);

function findCodeByModel(model, ttiNum) {
  if (!model && !ttiNum) return '';
  const p = DB.products.find(pr => {
    if (ttiNum && String(pr.ttiNum) === String(ttiNum)) return true;
    if (model && pr.model && pr.model.toLowerCase() === model.toLowerCase()) return true;
    return false;
  });
  return p ? String(p.code) : '';
}

function renderPoOrder() {
  const body = document.getElementById('po-order-body');
  body.innerHTML = poOrderData.map((item, i) => {
    const code = item.code || findCodeByModel(item.model, item.ttiNum);
    return `<tr>
      <td class="center"><button class="btn-danger btn-sm" onclick="removePoRow(${i})" style="padding:2px 6px">✕</button></td>
      <td class="center">${code || '-'}</td>
      <td class="center" style="font-weight:600;color:#185FA5">${item.promoNo || '-'}</td>
      <td class="center" style="font-size:11px">${item.promoName || '-'}</td>
      <td class="center">${item.discountRate ? item.discountRate + (String(item.discountRate).includes('%') ? '' : '%') : '-'}</td>
      <td class="center">${item.orderNum || '-'}</td>
      <td class="center" style="font-weight:500">${item.model || '-'}</td>
      <td class="center" style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.description || '-'}</td>
      <td class="center">${item.baseQty || '-'}</td>
      <td class="center"><input type="number" value="${item.orderQty || ''}" onchange="poOrderData[${i}].orderQty=parseInt(this.value)||0;savePoOrders()" min="0" style="width:60px;text-align:center"></td>
      <td class="num">${item.basePrice ? fmt(item.basePrice) : '-'}</td>
      <td class="num" style="color:#CC2222;font-weight:600">${item.promoPrice ? fmt(item.promoPrice) : '-'}</td>
      <td class="center" style="font-size:11px">${item.promoName || '-'}</td>
    </tr>`;
  }).join('');

  if (!poOrderData.length) {
    body.innerHTML = '<tr><td colspan="13"><div class="empty-state"><p>프로모션 발주 항목이 없습니다</p><p style="font-size:12px;color:#9BA3B2">엑셀 업로드 또는 + 추가로 등록하세요</p></div></td></tr>';
  }
  document.getElementById('po-order-count').textContent = `${poOrderData.length}건`;
  initColumnResize('order-po-table');
  initStickyHeader('order-po-table');
}

function savePoOrders() { localStorage.setItem('mw_po_orders', JSON.stringify(poOrderData)); }

function downloadPoTemplate() {
  if (!window.XLSX) { toast('SheetJS 로딩 중'); return; }
  const data = [['프로모션번호','프로모션명','구분','시작','종료','할인율','페이지','순번','TTI#','모델명','제품설명','기본수량','기본단가','프로모션단가','세트당총액','업체당세트제한','오더최대수량','일반주문가능여부','비고']];
  data.push(['M101','M18 BLCV2 신제품 20%','신제품','3/3','3/30','20%','1','2561','016401004','M18 BLCV2-0','18V 브러쉬리스 콤팩트 진공청소기II 베어툴',1,140000,112000,112000,'업체당1세트',5,'N','']);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:12},{wch:35},{wch:8},{wch:8},{wch:8},{wch:8},{wch:6},{wch:6},{wch:12},{wch:22},{wch:35},{wch:8},{wch:12},{wch:12},{wch:12},{wch:14},{wch:12},{wch:14},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws, '프로모션발주양식');
  XLSX.writeFile(wb, '프로모션_발주양식.xlsx');
  toast('엑셀 양식 다운로드 완료');
}

function uploadPoExcel(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) { toast('데이터가 없습니다'); return; }

      let added = 0;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[0]) continue;
        const model = String(r[9] || '');
        const ttiNum = String(r[8] || '');
        const code = findCodeByModel(model, ttiNum);

        poOrderData.push({
          promoNo: String(r[0] || ''),
          promoName: String(r[1] || ''),
          category: String(r[2] || ''),
          startDate: String(r[3] || ''),
          endDate: String(r[4] || ''),
          discountRate: String(r[5] || ''),
          page: String(r[6] || ''),
          orderNum: String(r[7] || ''),
          ttiNum: ttiNum,
          model: model,
          description: String(r[10] || ''),
          baseQty: parseInt(r[11]) || 0,
          orderQty: 0,
          basePrice: parseInt(r[12]) || 0,
          promoPrice: parseInt(r[13]) || 0,
          setTotal: parseInt(r[14]) || 0,
          setLimit: String(r[15] || ''),
          maxOrderQty: parseInt(r[16]) || 0,
          normalOrderOk: String(r[17] || ''),
          memo: String(r[18] || ''),
          code: code
        });
        added++;
      }
      savePoOrders();
      renderPoOrder();
      input.value = '';
      toast(`${added}건 프로모션 발주 업로드 완료`);
    } catch (err) {
      toast('엑셀 읽기 오류: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function addPoRow() {
  poOrderData.push({ promoNo:'', promoName:'', category:'', discountRate:'', orderNum:'', ttiNum:'', model:'', description:'', baseQty:0, orderQty:0, basePrice:0, promoPrice:0, code:'', memo:'' });
  savePoOrders();
  renderPoOrder();
}

function removePoRow(idx) {
  poOrderData.splice(idx, 1);
  savePoOrders();
  renderPoOrder();
}

function resetPoQty() {
  poOrderData.forEach(item => item.orderQty = 0);
  savePoOrders();
  renderPoOrder();
  toast('수량 초기화 완료');
}

function clearPoAll() {
  if (!confirm('프로모션 발주를 전체 초기화하시겠습니까?')) return;
  poOrderData = [];
  savePoOrders();
  renderPoOrder();
  toast('전체 초기화 완료');
}

// ======================== 스팟 발주 ========================
function renderSpotOrder() {
  const body = document.getElementById('spot-order-body');
  body.innerHTML = spotOrderData.map((item, i) => {
    const code = item.code || findCodeByModel(item.model, item.ttiNum);
    return `<tr>
      <td class="center"><button class="btn-danger btn-sm" onclick="removeSpotRow(${i})" style="padding:2px 6px">✕</button></td>
      <td class="center">${code || '-'}</td>
      <td class="center" style="font-weight:600;color:#185FA5">${item.promoNo || '-'}</td>
      <td class="center" style="font-size:11px">${item.promoName || '-'}</td>
      <td class="center">${item.discountRate ? item.discountRate + (String(item.discountRate).includes('%') ? '' : '%') : '-'}</td>
      <td class="center">${item.orderNum || '-'}</td>
      <td class="center" style="font-weight:500">${item.model || '-'}</td>
      <td class="center" style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.description || '-'}</td>
      <td class="center">${item.baseQty || '-'}</td>
      <td class="center"><input type="number" value="${item.orderQty || ''}" onchange="spotOrderData[${i}].orderQty=parseInt(this.value)||0;saveSpotOrders()" min="0" style="width:60px;text-align:center"></td>
      <td class="num">${item.basePrice ? fmt(item.basePrice) : '-'}</td>
      <td class="num" style="color:#CC2222;font-weight:600">${item.promoPrice ? fmt(item.promoPrice) : '-'}</td>
      <td class="center" style="font-size:11px">${item.promoName || '-'}</td>
    </tr>`;
  }).join('');

  if (!spotOrderData.length) {
    body.innerHTML = '<tr><td colspan="13"><div class="empty-state"><p>스팟 발주 항목이 없습니다</p><p style="font-size:12px;color:#9BA3B2">+ 추가로 수동 등록하세요</p></div></td></tr>';
  }
  document.getElementById('spot-order-count').textContent = `${spotOrderData.length}건`;
  initColumnResize('order-spot-table');
  initStickyHeader('order-spot-table');
}

function saveSpotOrders() { localStorage.setItem('mw_spot_orders', JSON.stringify(spotOrderData)); }

function addSpotRow() {
  const model = prompt('모델명을 입력하세요');
  if (!model) return;
  const promoNo = prompt('프로모션 번호') || '';
  const promoName = prompt('프로모션명') || '';
  const description = prompt('제품설명') || '';
  const basePrice = parseInt(prompt('기본단가') || '0') || 0;
  const promoPrice = parseInt(prompt('프로모션단가') || '0') || 0;
  const code = findCodeByModel(model, '');

  spotOrderData.push({ promoNo, promoName, discountRate:'', orderNum:'', ttiNum:'', model, description, baseQty:1, orderQty:0, basePrice, promoPrice, code, memo:'' });
  saveSpotOrders();
  renderSpotOrder();
  toast('스팟 발주 추가 완료');
}

function removeSpotRow(idx) {
  spotOrderData.splice(idx, 1);
  saveSpotOrders();
  renderSpotOrder();
}

function resetSpotQty() {
  spotOrderData.forEach(item => item.orderQty = 0);
  saveSpotOrders();
  renderSpotOrder();
  toast('수량 초기화 완료');
}

function clearSpotAll() {
  if (!confirm('스팟 발주를 전체 초기화하시겠습니까?')) return;
  spotOrderData = [];
  saveSpotOrders();
  renderSpotOrder();
  toast('전체 초기화 완료');
}

// ======================== 프로모션 발주서 ========================
function renderPromoOrderSheet() {
  const now = new Date();
  document.getElementById('po-sheet-date').textContent = now.toLocaleDateString('ko') + ' ' + now.toLocaleTimeString('ko', {hour:'2-digit',minute:'2-digit'});

  const body = document.getElementById('po-sheet-body');
  let promoSupplyTotal = 0, spotSupplyTotal = 0;
  let promoCostTotal = 0, spotCostTotal = 0;
  let rows = '';

  // 프로모션 발주
  poOrderData.filter(item => item.orderQty > 0).forEach(item => {
    const code = item.code || findCodeByModel(item.model, item.ttiNum);
    const supplyAmt = (item.promoPrice || 0) * item.orderQty;
    promoSupplyTotal += supplyAmt;
    const prod = code ? findProduct(code) : null;
    const pdc = prod ? (prod.productDC || 0) : 0;
    const unitCost = Math.round(calcOrderCost(item.promoPrice || 0, pdc));
    const costAmt = unitCost * item.orderQty;
    promoCostTotal += costAmt;
    rows += `<tr>
      <td class="center">${code || '-'}</td>
      <td class="center" style="color:#185FA5;font-weight:600">${item.promoNo || '-'}</td>
      <td class="center" style="font-size:11px">${item.promoName || '-'}</td>
      <td class="center" style="font-weight:500">${item.model || '-'}</td>
      <td class="center" style="font-size:11px">${item.description || '-'}</td>
      <td class="center">${item.orderQty}</td>
      <td class="num">${fmt(item.promoPrice || 0)}</td>
      <td class="num" style="color:#1D9E75">${fmt(unitCost)}</td>
      <td class="num" style="color:#1D9E75;font-weight:700">${fmt(costAmt)}</td>
      <td class="center" style="font-size:11px">${item.promoName || '-'}</td>
    </tr>`;
  });

  // 스팟 발주
  spotOrderData.filter(item => item.orderQty > 0).forEach(item => {
    const code = item.code || findCodeByModel(item.model, item.ttiNum);
    const supplyAmt = (item.promoPrice || 0) * item.orderQty;
    spotSupplyTotal += supplyAmt;
    const prod = code ? findProduct(code) : null;
    const pdc = prod ? (prod.productDC || 0) : 0;
    const unitCost = Math.round(calcOrderCost(item.promoPrice || 0, pdc));
    const costAmt = unitCost * item.orderQty;
    spotCostTotal += costAmt;
    rows += `<tr style="background:#FFF8F0">
      <td class="center">${code || '-'}</td>
      <td class="center" style="color:#EF9F27;font-weight:600">${item.promoNo || '스팟'}</td>
      <td class="center" style="font-size:11px">${item.promoName || '스팟'}</td>
      <td class="center" style="font-weight:500">${item.model || '-'}</td>
      <td class="center" style="font-size:11px">${item.description || '-'}</td>
      <td class="center">${item.orderQty}</td>
      <td class="num">${fmt(item.promoPrice || 0)}</td>
      <td class="num" style="color:#1D9E75">${fmt(unitCost)}</td>
      <td class="num" style="color:#1D9E75;font-weight:700">${fmt(costAmt)}</td>
      <td class="center" style="font-size:11px">${item.promoName || '스팟'}</td>
    </tr>`;
  });

  if (!rows) {
    rows = '<tr><td colspan="10"><div class="empty-state"><p>발주 수량이 입력된 프로모션이 없습니다</p></div></td></tr>';
  }
  body.innerHTML = rows;
  document.getElementById('po-sheet-promo-total').textContent = fmt(promoSupplyTotal);
  document.getElementById('po-sheet-spot-total').textContent = fmt(spotSupplyTotal);
  document.getElementById('po-sheet-grand-total').textContent = fmt(promoSupplyTotal + spotSupplyTotal);
  document.getElementById('po-sheet-promo-cost-total').textContent = fmt(promoCostTotal);
  document.getElementById('po-sheet-spot-cost-total').textContent = fmt(spotCostTotal);
  document.getElementById('po-sheet-grand-cost-total').textContent = fmt(promoCostTotal + spotCostTotal);
}

function exportPromoOrder() {
  // 확정 상태면 최신 이력에서 엑셀 생성
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const recentPo = poHistory.filter(r => (now - new Date(r.date).getTime()) < weekMs);
  if (recentPo.length > 0) {
    const latest = recentPo.sort((a, b) => b.id - a.id)[0];
    if (!window.XLSX) { toast('SheetJS 라이브러리 로딩 중입니다'); return; }
    try {
      const data = [['내부코드', '수량', '매입원가', '적요']];
      latest.items.forEach(it => {
        data.push([it.code || '', it.qty, it.costTotal, it.promoName || '']);
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{wch:12},{wch:8},{wch:14},{wch:40}];
      XLSX.utils.book_append_sheet(wb, ws, '프로모션발주서');
      XLSX.writeFile(wb, '프로모션_발주서_' + new Date().toISOString().slice(0, 10) + '.xlsx');
      toast('프로모션 발주서 다운로드 완료 (' + latest.totalItems + '건)');
    } catch (err) {
      toast('다운로드 실패: ' + err.message);
    }
    return;
  }
  if (!window.XLSX) { toast('SheetJS 로딩 중'); return; }
  try {
    const data = [['내부코드', '수량', '프로모션단가', '공급합계', '매입원가(개당)', '매입원가합계', '적요']];
    let totalItems = 0;

    poOrderData.forEach(item => {
      if (item.orderQty > 0) {
        const code = item.code || findCodeByModel(item.model, item.ttiNum);
        const supplyAmt = (item.promoPrice || 0) * item.orderQty;
        const prod = code ? findProduct(code) : null;
        const pdc = prod ? (prod.productDC || 0) : 0;
        const unitCost = Math.round(calcOrderCost(item.promoPrice || 0, pdc));
        data.push([code || item.orderNum || '', item.orderQty, item.promoPrice || 0, supplyAmt, unitCost, unitCost * item.orderQty, item.promoName || '']);
        totalItems++;
      }
    });

    spotOrderData.forEach(item => {
      if (item.orderQty > 0) {
        const code = item.code || findCodeByModel(item.model, item.ttiNum);
        const supplyAmt = (item.promoPrice || 0) * item.orderQty;
        const prod = code ? findProduct(code) : null;
        const pdc = prod ? (prod.productDC || 0) : 0;
        const unitCost = Math.round(calcOrderCost(item.promoPrice || 0, pdc));
        data.push([code || '', item.orderQty, item.promoPrice || 0, supplyAmt, unitCost, unitCost * item.orderQty, item.promoName || '스팟']);
        totalItems++;
      }
    });

    if (totalItems === 0) { toast('발주 수량이 입력된 프로모션이 없습니다'); return; }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, '프로모션발주서');
    XLSX.writeFile(wb, `프로모션_발주서_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast(`프로모션 발주서 다운로드 완료 (${totalItems}건)`);
  } catch (err) {
    toast('다운로드 실패: ' + err.message);
  }
}

// ======================== TAB 3: ONLINE SALES ========================
let salesItems = loadObj('mw_sales_items', []);

function addSalesRow() {
  salesItems.push({ code: '', naverPrice: 0, openPrice: 0 });
  localStorage.setItem('mw_sales_items', JSON.stringify(salesItems));
  renderSales();
}

function clearSales() {
  if (!confirm('온라인 판매 항목을 모두 삭제하시겠습니까?')) return;
  salesItems = [];
  localStorage.setItem('mw_sales_items', JSON.stringify(salesItems));
  renderSales();
}

function onSalesCodeChange(idx, val) {
  salesItems[idx].code = val;
  localStorage.setItem('mw_sales_items', JSON.stringify(salesItems));
  renderSales();
}

function onSalesPriceChange(idx, field, val) {
  salesItems[idx][field] = parseInt(val) || 0;
  localStorage.setItem('mw_sales_items', JSON.stringify(salesItems));
  calcSalesRow(idx);
}

function removeSalesRow(idx) {
  salesItems.splice(idx, 1);
  localStorage.setItem('mw_sales_items', JSON.stringify(salesItems));
  renderSales();
}

function calcSalesProfit(sellPrice, feeRate, cost) {
  const vat = parseFloat(document.getElementById('sales-vat').value) / 100 || 0.1;
  const fee = feeRate;
  // 판매원가 = (판매가 * (1 - 수수료율)) / (1 + 부가세율)
  const revenue = (sellPrice * (1 - fee)) / (1 + vat);
  const profit = revenue - cost;
  const margin = sellPrice > 0 ? profit / sellPrice : 0;
  return { revenue, profit, margin };
}

function renderSales() {
  const naverFee = parseFloat(document.getElementById('sales-naver-fee').value) / 100 || 0.059;
  const openElecFee = parseFloat(document.getElementById('sales-open-elec-fee').value) / 100 || 0.13;

  const body = document.getElementById('sales-body');
  body.innerHTML = salesItems.map((item, i) => {
    const p = findProduct(item.code);
    const stock = findStock(item.code);
    const ec = getEffectiveCost(item.code);
    const cost = ec.cost;
    const costLabel = ec.isPromo ? `<span class="badge badge-amber" title="${ec.promoName}">프로모션</span>` : (p ? '<span class="badge badge-gray">정상</span>' : '');

    const naver = calcSalesProfit(item.naverPrice || 0, naverFee, cost);
    const open = calcSalesProfit(item.openPrice || 0, openElecFee, cost);

    const profitClass = v => v > 0 ? 'profit-pos' : v < 0 ? 'profit-neg' : '';

    return `<tr>
      <td><button class="btn-danger btn-sm" onclick="removeSalesRow(${i})" style="padding:2px 6px">✕</button></td>
      <td><input value="${item.code}" 
        oninput="showAC(this, c => onSalesCodeChange(${i},c))"
        onchange="onSalesCodeChange(${i},this.value)"
        onfocus="if(this.value) showAC(this, c => onSalesCodeChange(${i},c))"
        placeholder="코드/모델 검색" style="width:120px"></td>
      <td style="font-weight:500;white-space:nowrap">${p ? p.model : '-'}</td>
      <td class="center">${stock != null ? stock : '-'}</td>
      <td class="num">${fmt(cost)} ${costLabel}</td>
      <td><input type="number" value="${item.naverPrice || ''}" onchange="onSalesPriceChange(${i},'naverPrice',this.value)" placeholder="판매가" style="width:100px"></td>
      <td class="num ${profitClass(naver.profit)}">${item.naverPrice ? fmt(naver.profit) : '-'}</td>
      <td class="num ${profitClass(naver.margin)}">${item.naverPrice ? pct(naver.margin) : '-'}</td>
      <td><input type="number" value="${item.openPrice || ''}" onchange="onSalesPriceChange(${i},'openPrice',this.value)" placeholder="판매가" style="width:100px"></td>
      <td class="num ${profitClass(open.profit)}">${item.openPrice ? fmt(open.profit) : '-'}</td>
      <td class="num ${profitClass(open.margin)}">${item.openPrice ? pct(open.margin) : '-'}</td>
    </tr>`;
  }).join('');

  if (!salesItems.length) {
    body.innerHTML = '<tr><td colspan="11"><div class="empty-state"><p>판매 항목을 추가하세요</p><button class="btn-action" onclick="addSalesRow()">+ 추가</button></div></td></tr>';
  }
}

function calcAllSales() { renderSales(); }
function calcSalesRow(idx) { renderSales(); }

// ======================== TAB 4: PROMOTIONS ========================
function renderPromo() {
  const search = document.getElementById('promo-search').value.toLowerCase();
  let filtered = DB.promotions;
  if (search) {
    filtered = filtered.filter(p => {
      const s = `${p.promoName} ${p.model} ${p.code} ${p.promoCode}`.toLowerCase();
      return s.includes(search);
    });
  }

  const body = document.getElementById('promo-body');
  body.innerHTML = filtered.map((p, i) => {
    const realIdx = DB.promotions.indexOf(p);
    const promoPrice = p.promoPrice || 0;
    const costDisplay = fmt(p.cost);
    return `<tr>
    <td style="white-space:nowrap">
      <button class="btn-edit" onclick="editPromo(${realIdx})">수정</button>
      <button class="btn-danger btn-sm" onclick="deletePromo(${realIdx})" style="padding:2px 6px;font-size:11px">삭제</button>
    </td>
    <td>${p.promoName || '-'}</td>
    <td><span class="badge badge-blue">${p.promoCode || '-'}</span></td>
    <td style="font-weight:500">${p.model || '-'}</td>
    <td class="center">${p.orderNum || '-'}</td>
    <td class="center">${p.qty || 1}</td>
    <td class="num">${fmt(p.dealerPrice)}</td>
    <td class="num">${promoPrice === 0 ? '무상' : fmt(promoPrice)}</td>
    <td class="num" style="color:#1D9E75;font-weight:600">${costDisplay}</td>
    <td class="center">${p.discountDisplay || (p.discountRate ? pct(p.discountRate) : '-')}</td>
    <td>${p.period || '-'}</td>
  </tr>`;
  }).join('');

  document.getElementById('promo-count').textContent = `${filtered.length}건`;
  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="11"><div class="empty-state"><p>프로모션 데이터가 없습니다</p><button class="btn-action" onclick="showPromoAddModal()">+ 추가</button></div></td></tr>';
  }

  initColumnResize('promo-table');
}

function renderRebateTable() {
  const body = document.getElementById('rebate-body');
  body.innerHTML = DB.rebate.map(r => `<tr>
    <td>${fmtN(r.min)}원 이상</td>
    <td>${fmtN(r.min)}원</td>
    <td class="center" style="font-weight:600">${pct(r.rate)}</td>
    <td class="num">-</td>
  </tr>`).join('');
}

function calcRebate(el) {
  // Format input
  const raw = el.value.replace(/[^0-9]/g, '');
  el.value = raw ? parseInt(raw).toLocaleString() : '';
  const amount = parseInt(raw) || 0;

  // Find applicable tier
  let tier = null;
  for (let i = DB.rebate.length - 1; i >= 0; i--) {
    if (amount >= DB.rebate[i].min) { tier = DB.rebate[i]; break; }
  }

  const result = document.getElementById('rebate-result');
  if (tier) {
    const rebateAmount = amount * tier.rate;
    result.innerHTML = `
      <div class="kpi-card"><div class="kpi-label">적용 요율</div><div class="kpi-value">${pct(tier.rate)}</div></div>
      <div class="kpi-card"><div class="kpi-label">리베이트 금액</div><div class="kpi-value">${fmt(rebateAmount)}</div><div class="kpi-sub">매출 ${fmtN(amount)}원 기준</div></div>
    `;
  } else {
    result.innerHTML = `<div class="kpi-card-light"><div class="kpi-label">적용 구간</div><div class="kpi-value">해당 없음</div><div class="kpi-sub" style="color:#5A6070">최소 ${fmtN(DB.rebate[0]?.min || 0)}원 이상</div></div>`;
  }

  // Highlight applicable tier
  const tbody = document.getElementById('rebate-body');
  tbody.innerHTML = DB.rebate.map(r => {
    const active = tier && r.min === tier.min;
    const rebAmt = amount >= r.min ? amount * r.rate : 0;
    return `<tr style="${active ? 'background:#E6F1FB;font-weight:600' : ''}">
      <td>${fmtN(r.min)}원 이상</td>
      <td>${fmtN(r.min)}원</td>
      <td class="center" style="font-weight:600">${pct(r.rate)}</td>
      <td class="num">${active ? fmt(rebAmt) : '-'}</td>
    </tr>`;
  }).join('');
}

// ======================== TEMPLATE DOWNLOAD ========================
function downloadTemplate() {
  if (!window.XLSX) { toast('SheetJS 라이브러리 로딩 중...'); return; }
  const wb = XLSX.utils.book_new();

  // 1. 전체가격표 시트 (원본 엑셀과 동일 구조: A열 비우고 B열부터 시작)
  const priceHeaders = [
    [null, '코드', '관리코드', '대분류', '중분류', '소분류', '순번', 'TTI#', '모델명', '제품설명', '공급가', '제품DC', '원가', '원가P', 'A(도매)', '소매', '스토어팜', '오픈마켓', '재고', '입고날짜'],
    [null, '', '', '', '', '', '', '', '', '', '', '', '← 자동계산', '← 자동계산', '← 자동계산', '← 자동계산', '← 자동계산', '← 자동계산', '', '← 메모용'],
    [null, 21815, '', '파워툴', '12V FUEL', '드릴 드라이버', 1093, 1093, 'M12 FDD2-0X', '12V FUEL 드릴 드라이버(GEN3) 베어툴', 139000, 0, '', '', '', '', '', '', 5, '4월 중순 입고예정'],
    [null, 21817, '', '파워툴', '12V FUEL', '해머드릴 드라이버', 1126, 18622019, 'M12 FPD2-0X', '12V FUEL 해머드릴 드라이버(GEN3) 베어툴', 153000, 0.13, '', '', '', '', '', '', 3, '']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(priceHeaders);
  ws1['!cols'] = [{wch:2},{wch:10},{wch:10},{wch:10},{wch:15},{wch:15},{wch:8},{wch:12},{wch:25},{wch:40},{wch:12},{wch:8},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:8},{wch:15}];
  XLSX.utils.book_append_sheet(wb, ws1, '전체가격표(25)');

  // 2. 재고 시트
  const stockHeaders = [
    ['', '코드', '재고', '비고1', '비고2'],
    ['', '', '', '', '', '← 코드와 재고 수량을 입력하세요'],
    ['', '21815', 5, '', ''],
    ['', '21817', 3, '', '']
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(stockHeaders);
  ws2['!cols'] = [{wch:4},{wch:10},{wch:8},{wch:15},{wch:15}];
  XLSX.utils.book_append_sheet(wb, ws2, '재고');

  // 3. 프로모션 시트
  const promoHeaders = [
    ['', 0.058, 0.036, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '← B1:수수료1, C1:수수료2'],
    ['', '코드', '원가', '날짜', '구분', '프로모션 명', '모델명', '순번', '대리점가격', '프로모션금액', '수량', '할인율', '세트제한수량', '기간', '비고', '', '', '적요'],
    ['', '6808', '', '3월', 'M202', 'M12 IR-202B 7% DC 프로모션', 'M12 IR-202B', 1026, 189000, 175000, '', 0.07, '', '', '', '', '', '']
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(promoHeaders);
  ws3['!cols'] = [{wch:4},{wch:10},{wch:12},{wch:8},{wch:8},{wch:40},{wch:20},{wch:8},{wch:12},{wch:12},{wch:6},{wch:8},{wch:10},{wch:10},{wch:10},{wch:4},{wch:4},{wch:30}];
  XLSX.utils.book_append_sheet(wb, ws3, '프로모션');

  // 4. R (리베이트) 시트
  const rebateHeaders = [
    ['', '2026년'],
    ['', '기간', '매출 달성 금액', '요율'],
    ['', '분기', 6000000, 0.02],
    ['', '', 15000000, 0.023],
    ['', '', 30000000, 0.025],
    ['', '', 60000000, 0.027],
    ['', '', 100000000, 0.029],
    ['', '', 200000000, 0.031],
    ['', '', 300000000, 0.034],
    ['', '', 500000000, 0.037],
    ['', '', 700000000, 0.038],
    ['', '', 1000000000, 0.04]
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(rebateHeaders);
  ws4['!cols'] = [{wch:4},{wch:8},{wch:18},{wch:8}];
  XLSX.utils.book_append_sheet(wb, ws4, 'R');

  XLSX.writeFile(wb, `밀워키_입력양식_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('입력 양식 다운로드 완료');
}

// ======================== PRODUCT CRUD ========================
function showProductModal(idx) {
  const isEdit = idx !== undefined && idx >= 0;
  document.getElementById('product-modal-title').textContent = isEdit ? '제품 수정' : '제품 추가';
  document.getElementById('prod-edit-idx').value = isEdit ? idx : -1;

  if (isEdit) {
    const p = DB.products[idx];
    document.getElementById('prod-code').value = p.code || '';
    document.getElementById('prod-manageCode').value = p.manageCode || '';
    document.getElementById('prod-category').value = p.category || '';
    document.getElementById('prod-subcategory').value = p.subcategory || '';
    document.getElementById('prod-detail').value = p.detail || '';
    document.getElementById('prod-orderNum').value = p.orderNum || '';
    document.getElementById('prod-ttiNum').value = p.ttiNum || '';
    document.getElementById('prod-model').value = p.model || '';
    document.getElementById('prod-supplyPrice').value = p.supplyPrice || '';
    document.getElementById('prod-description').value = p.description || '';
    document.getElementById('prod-productDC').value = p.productDC || '';
    document.getElementById('prod-discontinued').value = p.discontinued || '';
    document.getElementById('prod-inDate').value = p.inDate || '';
  } else {
    ['prod-code','prod-manageCode','prod-category','prod-subcategory','prod-detail','prod-orderNum','prod-ttiNum','prod-model','prod-supplyPrice','prod-description','prod-productDC','prod-inDate'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('prod-discontinued').value = '';
  }
  document.getElementById('product-modal').classList.add('show');
}

function closeProductModal() { document.getElementById('product-modal').classList.remove('show'); }

function editInDate(idx) {
  const p = DB.products[idx];
  const current = p.inDate || '';
  const val = prompt('입고날짜 메모 (삭제하려면 비워두세요):', current);
  if (val === null) return;
  DB.products[idx].inDate = val.trim();
  save(KEYS.products, DB.products);
  renderCatalog();
  toast(val.trim() ? '입고날짜 메모 저장' : '입고날짜 메모 삭제');
}

function saveProduct() {
  const code = document.getElementById('prod-code').value.trim();
  const model = document.getElementById('prod-model').value.trim();
  const supplyPrice = parseInt(document.getElementById('prod-supplyPrice').value) || 0;

  if (!code) { toast('코드를 입력해주세요'); return; }
  if (!model) { toast('모델명을 입력해주세요'); return; }
  if (!supplyPrice) { toast('공급가를 입력해주세요'); return; }

  const idx = parseInt(document.getElementById('prod-edit-idx').value);
  const productDC = parseFloat(document.getElementById('prod-productDC').value) || 0;

  // Calculate cost and prices using current settings (same as recalcAll)
  const s = DB.settings;
  const cost = calcCost(supplyPrice, productDC);

  const item = {
    code: code,
    manageCode: document.getElementById('prod-manageCode').value.trim(),
    category: document.getElementById('prod-category').value.trim(),
    subcategory: document.getElementById('prod-subcategory').value.trim(),
    detail: document.getElementById('prod-detail').value.trim(),
    orderNum: document.getElementById('prod-orderNum').value.trim(),
    ttiNum: document.getElementById('prod-ttiNum').value.trim(),
    model: model,
    description: document.getElementById('prod-description').value.trim(),
    supplyPrice: supplyPrice,
    productDC: productDC,
    discontinued: document.getElementById('prod-discontinued').value,
    inDate: document.getElementById('prod-inDate').value.trim(),
    cost: Math.round(cost),
    priceA: Math.ceil((cost * (1 + (s.mkDomae || 1) / 100)) / 100) * 100,
    priceRetail: Math.ceil((cost * (1 + (s.mkRetail || 15) / 100)) / 100) * 100,
    priceNaver: Math.ceil((cost * (1 + (s.mkNaver || 17) / 100)) / 100) * 100,
    priceOpen: Math.ceil((cost * (1 + (s.mkOpen || 27) / 100)) / 100) * 100,
    raisedPrice: 0,
    raiseRate: 0
  };

  if (idx >= 0) {
    DB.products[idx] = { ...DB.products[idx], ...item };
    toast(`"${model}" 제품 수정 완료`);
  } else {
    // Check duplicate code
    if (DB.products.some(p => String(p.code) === String(code))) {
      if (!confirm(`코드 "${code}"가 이미 존재합니다. 그래도 추가하시겠습니까?`)) return;
    }
    DB.products.push(item);
    toast(`"${model}" 제품 추가 완료`);
  }

  save(KEYS.products, DB.products);
  populateCatalogFilters();
  renderCatalog();
  closeProductModal();
}

function deleteProduct(idx) {
  const p = DB.products[idx];
  if (!confirm(`"${p.model || p.code}" 제품을 삭제하시겠습니까?`)) return;
  DB.products.splice(idx, 1);
  save(KEYS.products, DB.products);
  renderCatalog();
  toast('제품 삭제 완료');
}

function toggleSelectAll(checked) {
  document.querySelectorAll('#catalog-body .chk-select').forEach(cb => { cb.checked = checked; });
  updateDeleteBtn();
}

function updateDeleteBtn() {
  const selected = document.querySelectorAll('#catalog-body .chk-select:checked');
  const btn = document.getElementById('btn-delete-selected');
  if (selected.length > 0) {
    btn.style.display = '';
    btn.textContent = `선택 삭제 (${selected.length})`;
  } else {
    btn.style.display = 'none';
  }
}

function deleteSelectedProducts() {
  const selected = document.querySelectorAll('#catalog-body .chk-select:checked');
  if (!selected.length) return;
  if (!confirm(`선택한 ${selected.length}개의 제품을 삭제하시겠습니까?`)) return;
  const indices = Array.from(selected).map(cb => parseInt(cb.dataset.idx)).sort((a, b) => b - a);
  indices.forEach(idx => { DB.products.splice(idx, 1); });
  save(KEYS.products, DB.products);
  renderCatalog();
  document.getElementById('chk-select-all').checked = false;
  toast(`${indices.length}개 제품 삭제 완료`);
}

// ======================== PDF PROMO IMPORT ========================
let pdfExtracted = [];

function showPromoPdfModal() {
  document.getElementById('promo-pdf-modal').classList.add('show');
  document.getElementById('pdf-status').textContent = '';
  document.getElementById('pdf-preview').style.display = 'none';
  document.getElementById('btn-pdf-import').style.display = 'none';
  document.getElementById('btn-pdf-parse').style.display = '';
  document.getElementById('promo-pdf-file').value = '';
  pdfExtracted = [];
}

function closePromoPdfModal() { document.getElementById('promo-pdf-modal').classList.remove('show'); }

async function parsePdf() {
  const file = document.getElementById('promo-pdf-file').files[0];
  if (!file) { toast('파일을 선택해주세요'); return; }
  const month = DB.currentPromoMonth || (new Date().getMonth() + 1) + '월';
  const status = document.getElementById('pdf-status');
  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
  const isImage = file.type.startsWith('image/');

  if (isPdf) {
    status.innerHTML = '<span style="color:#185FA5">⏳ PDF 파일 읽는 중...</span>';
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (typeof pdfjsLib === 'undefined') { status.innerHTML = '<span style="color:#CC2222">PDF.js 라이브러리 로딩 중입니다. 잠시 후 다시 시도하세요.</span>'; return; }
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      status.innerHTML = `<span style="color:#185FA5">⏳ ${pdf.numPages}페이지 분석 중...</span>`;

      let allLines = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items;
        const lineMap = {};
        items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!lineMap[y]) lineMap[y] = [];
          lineMap[y].push({ x: item.transform[4], text: item.str });
        });
        Object.keys(lineMap).sort((a, b) => b - a).forEach(y => {
          const line = lineMap[y].sort((a, b) => a.x - b.x).map(t => t.text).join(' ').trim();
          if (line) allLines.push({ page: i, text: line });
        });
      }

      pdfExtracted = extractPromosFromLines(allLines, month);
      showPdfResult(allLines);
    } catch (err) {
      status.innerHTML = `<span style="color:#CC2222">❌ PDF 읽기 오류: ${err.message}</span>`;
    }
  } else if (isImage) {
    status.innerHTML = '<span style="color:#EF9F27">⚠ 이미지 파일은 자동 텍스트 추출이 불가합니다. 이미지를 미리보기로 표시합니다. 내용을 보면서 직접 추가해주세요.</span>';
    const reader = new FileReader();
    reader.onload = function(e) {
      const imgHtml = `<div style="margin-top:12px;max-height:400px;overflow-y:auto;border:1px solid var(--tl-border);border-radius:6px;padding:8px">
        <img src="${e.target.result}" style="max-width:100%;display:block">
      </div>
      <div style="margin-top:8px;font-size:12px;color:#5A6070">이미지를 참고하여 "+" 버튼으로 프로모션을 직접 추가하세요.</div>`;
      document.getElementById('pdf-status').innerHTML += imgHtml;
    };
    reader.readAsDataURL(file);
    return;
  } else {
    status.innerHTML = '<span style="color:#CC2222">❌ PDF 또는 이미지 파일만 업로드 가능합니다.</span>';
  }
}

function showPdfResult(allLines) {
  const status = document.getElementById('pdf-status');
  if (pdfExtracted.length > 0) {
    renderPdfPreview();
    document.getElementById('pdf-preview').style.display = 'block';
    document.getElementById('btn-pdf-import').style.display = '';
    document.getElementById('btn-pdf-parse').style.display = 'none';
    status.innerHTML = `<span style="color:#1D9E75">✅ ${pdfExtracted.length}건 추출 완료. 가격을 확인/수정한 뒤 추가하세요.</span>`;
  } else {
    const preview = allLines.slice(0, 30).map(l => `<div style="font-size:11px;color:#5A6070;border-bottom:1px solid #F0F2F7;padding:2px 0">P${l.page}: ${l.text}</div>`).join('');
    status.innerHTML = `<span style="color:#EF9F27">⚠ 자동 추출된 프로모션이 없습니다.</span>
      <div style="margin-top:8px;font-size:12px;color:#5A6070">PDF에서 읽은 텍스트 (처음 30줄):</div>
      <div style="max-height:200px;overflow-y:auto;margin-top:4px;border:1px solid var(--tl-border);border-radius:6px;padding:8px">${preview}</div>`;
  }
}

function calcDiscountDisplay(textDiscount, dealerPrice, promoPrice, isFree) {
  // 1. PDF 텍스트에서 읽은 할인율이 있으면 그대로 사용
  if (textDiscount) return textDiscount;
  // 2. 무상제공이면 표시 안함
  if (isFree || !promoPrice) return '';
  // 3. 대리점가격과 프로모션금액 비교해서 자동 계산
  if (dealerPrice > 0 && promoPrice > 0 && dealerPrice > promoPrice) {
    const rate = Math.round((1 - promoPrice / dealerPrice) * 100);
    if (rate > 0 && rate < 100) return rate + '%';
  }
  return '';
}

function calcDiscountRate(textRate, dealerPrice, promoPrice) {
  if (textRate > 0) return textRate;
  if (dealerPrice > 0 && promoPrice > 0 && dealerPrice > promoPrice) {
    return parseFloat(((1 - promoPrice / dealerPrice)).toFixed(4));
  }
  return 0;
}

function extractPromosFromLines(lines, month) {
  const promos = [];
  let currentPromoCode = '';
  let currentPromoName = '';
  let currentPeriod = '';

  const modelRe = /\b(M12|M18|C12|C18|MX|PH|IR|L4|PACKOUT|SHOCKWAVE)\s*[A-Z0-9\-]+/i;
  const promoCodeRe = /\b([MTN]\d{1,4})\b/;
  const pctRe = /(\d{1,2})\s*%/;
  const plusRe = /(\d{1,2})\s*\+\s*(\d{1,2})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].text;

    // Skip header/footer lines
    if (line.includes('오더 합계') || line.includes('제한사항') || line.includes('재고 소진') || line.includes('발신:') || line.includes('수신:') || line.includes('TTI Korea')) continue;

    // Detect promo title lines
    const codeMatch = line.match(promoCodeRe);
    if (codeMatch && (line.includes('프로모션') || line.includes('DC') || line.includes('할인') || line.includes('패키지') || line.includes('특가') || line.includes('신제품') || line.includes('누적') || line.includes('FOC'))) {
      currentPromoCode = codeMatch[1];
      currentPromoName = line.replace(/<[^>]*>/g, '').trim();
      continue;
    }

    // Detect period lines
    if (line.includes('기간') && line.includes('~')) {
      const periodMatch = line.match(/기간\s*[:：]\s*(.+)/);
      if (periodMatch) currentPeriod = periodMatch[1].trim();
      continue;
    }

    // Detect product lines with model numbers
    const modelMatch = line.match(modelRe);
    if (!modelMatch) continue;
    const model = modelMatch[0].trim();

    // ONLY extract comma-formatted prices (e.g., 140,000) - NOT raw digit sequences
    // This prevents TTI# (016401004) from being treated as prices
    const commaPrice = /\b(\d{1,3}(?:,\d{3})+)\b/g;
    const prices = [];
    let cm;
    while ((cm = commaPrice.exec(line)) !== null) {
      const v = parseInt(cm[1].replace(/,/g, ''));
      // Filter: real prices are 1,000 ~ 3,000,000. Skip TTI#-like numbers
      if (v >= 1000 && v <= 3000000 && !prices.includes(v)) prices.push(v);
    }

    // Extract 4-digit order number (순번) - first 4-digit number before model or TTI
    const beforeModel = line.substring(0, line.indexOf(model));
    const orderMatch = beforeModel.match(/\b(\d{4})\b/);

    // Extract quantity - look for standalone small numbers (1-99) after model
    const afterModel = line.substring(line.indexOf(model) + model.length);
    const qtyMatch = afterModel.match(/\b(\d{1,2})\b/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    // Extract discount
    const pctMatch = line.match(pctRe);
    const plusMatch = line.match(plusRe);
    let discountDisplay = '', discountRate = 0;
    if (plusMatch) {
      discountDisplay = `${plusMatch[1]}+${plusMatch[2]}`;
      discountRate = parseInt(plusMatch[1]) / 100;
    } else if (pctMatch) {
      discountDisplay = `${pctMatch[1]}%`;
      discountRate = parseInt(pctMatch[1]) / 100;
    }

    // Determine dealer price and promo price from comma-formatted prices
    let dealerPrice = 0, promoPrice = 0;
    const isFree = line.includes('무상') || line.includes('증정') || line.includes('FOC');

    if (isFree) {
      // For free items, first price is dealer price, promo = 0
      dealerPrice = prices.length > 0 ? prices[0] : 0;
      promoPrice = 0;
    } else if (prices.length >= 3) {
      // 단가, 프로모션금액, 총액 -> take first two
      dealerPrice = prices[0];
      promoPrice = prices[1];
    } else if (prices.length === 2) {
      dealerPrice = prices[0];
      promoPrice = prices[1];
    } else if (prices.length === 1) {
      dealerPrice = prices[0];
    }

    promos.push({
      promoCode: currentPromoCode,
      promoName: currentPromoName,
      model: model,
      orderNum: orderMatch ? orderMatch[1] : '',
      qty: qty > 0 && qty <= 99 ? qty : 1,
      dealerPrice: dealerPrice,
      promoPrice: isFree ? 0 : promoPrice,
      discountDisplay: calcDiscountDisplay(discountDisplay, dealerPrice, isFree ? 0 : promoPrice, isFree),
      discountRate: calcDiscountRate(discountRate, dealerPrice, isFree ? 0 : promoPrice),
      period: currentPeriod || month,
      selected: true
    });
  }
  return promos;
}

function renderPdfPreview() {
  const body = document.getElementById('pdf-extract-body');
  body.innerHTML = pdfExtracted.map((p, i) => `<tr>
    <td class="center"><input type="checkbox" class="pdf-chk" data-idx="${i}" ${p.selected ? 'checked' : ''} onchange="pdfExtracted[${i}].selected=this.checked"></td>
    <td style="max-width:160px;overflow:hidden;white-space:nowrap" title="${p.promoName || ''}">${p.promoName || '-'}</td>
    <td><span class="badge badge-blue">${p.promoCode || '-'}</span></td>
    <td style="font-weight:500">${p.model || '-'}</td>
    <td class="center">${p.orderNum || '-'}</td>
    <td class="center"><input type="number" value="${p.qty || 1}" onchange="pdfExtracted[${i}].qty=parseInt(this.value)||1" style="width:40px;text-align:center;font-size:12px;border:1px solid #DDE1EB;border-radius:4px;padding:2px"></td>
    <td style="background:#FCEBEB"><input type="number" value="${p.dealerPrice || 0}" onchange="pdfExtracted[${i}].dealerPrice=parseInt(this.value)||0" style="width:80px;text-align:right;font-size:12px;border:1px solid #CC2222;border-radius:4px;padding:2px"></td>
    <td style="background:#FCEBEB"><input type="number" value="${p.promoPrice || 0}" onchange="pdfExtracted[${i}].promoPrice=parseInt(this.value)||0" style="width:80px;text-align:right;font-size:12px;border:1px solid #CC2222;border-radius:4px;padding:2px"></td>
    <td class="center"><input type="text" value="${p.discountDisplay || ''}" onchange="pdfExtracted[${i}].discountDisplay=this.value" style="width:50px;text-align:center;font-size:12px;border:1px solid #DDE1EB;border-radius:4px;padding:2px"></td>
    <td>${p.period || '-'}</td>
  </tr>`).join('');
  document.getElementById('pdf-extract-count').textContent = pdfExtracted.length;
}

function togglePdfSelectAll(checked) {
  pdfExtracted.forEach(p => p.selected = checked);
  document.querySelectorAll('.pdf-chk').forEach(cb => cb.checked = checked);
}

function importPdfPromos() {
  const selected = pdfExtracted.filter(p => p.selected);
  if (!selected.length) { toast('추가할 프로모션을 선택해주세요'); return; }
  if (!confirm(`선택한 ${selected.length}건의 프로모션을 추가하시겠습니까?`)) return;

  // Group by promoCode
  const grouped = {};
  selected.forEach(p => {
    const code = p.promoCode || 'UNKNOWN';
    if (!grouped[code]) {
      grouped[code] = {
        promoNo: code,
        title: p.promoName || '',
        discount: p.discountDisplay || '',
        period: p.period || '',
        restriction: '',
        items: []
      };
    }
    grouped[code].items.push({
      orderNum: p.orderNum || '',
      ttiNum: '',
      model: p.model || '',
      description: '',
      qty: p.qty || 1,
      price: p.dealerPrice || 0,
      promoPrice: p.promoPrice || 0,
      total: (p.promoPrice || 0) * (p.qty || 1),
      group: '',
      maxQty: ''
    });
  });

  // Categorize and save
  let counts = { newprod: 0, package: 0, monthly: 0, spot: 0 };
  Object.values(grouped).forEach(promo => {
    const no = promo.promoNo.toUpperCase();
    let cat = 'spot';
    if (/^M1\d{2}$/.test(no)) cat = 'newprod';
    else if (/^M2\d{2}$/.test(no)) cat = 'package';
    else if (/^T\d{1,2}$/.test(no)) cat = 'monthly';

    // Check if already exists (avoid duplicates)
    const exists = promosV2[cat].some(p => p.promoNo === promo.promoNo);
    if (!exists) {
      promosV2[cat].push(promo);
      counts[cat]++;
    } else {
      // Merge items into existing
      const existing = promosV2[cat].find(p => p.promoNo === promo.promoNo);
      promo.items.forEach(item => {
        if (!existing.items.some(ei => ei.model === item.model)) {
          existing.items.push(item);
        }
      });
      counts[cat]++;
    }
  });

  savePromosV2();
  renderAllPromosV2();
  closePromoPdfModal();

  const summary = Object.entries(counts).filter(([,v]) => v > 0)
    .map(([k,v]) => `${k === 'newprod' ? '신제품' : k === 'package' ? '패키지' : k === 'monthly' ? '이달의특가' : '스팟'} ${v}건`).join(', ');
  toast(`프로모션 추가 완료: ${summary}`);
}

// ======================== EXCEL IMPORT ========================
function showImportModal() { document.getElementById('import-modal').classList.add('show'); }
function closeModal() { document.getElementById('import-modal').classList.remove('show'); }

// ======================== SETTINGS ========================
function showSettingsModal() {
  const s = DB.settings;
  // 섹션1: 밀워키 리베이트
  document.getElementById('set-quarter').value = ((s.quarterDC || 0.04) * 100).toFixed(1);
  document.getElementById('set-year').value = ((s.yearDC || 0.018) * 100).toFixed(1);
  // 섹션2: 채널별 마크업 + 부가세
  document.getElementById('set-mk-domae').value = (s.mkDomae || 1);
  document.getElementById('set-mk-retail').value = (s.mkRetail || 15);
  document.getElementById('set-mk-naver').value = (s.mkNaver || 17);
  document.getElementById('set-mk-open').value = (s.mkOpen || 27);
  document.getElementById('set-vat').value = ((s.vat || 0.1) * 100).toFixed(1);
  // 섹션4: 온라인 판매채널 수수료
  document.getElementById('set-naver').value = ((s.naverFee || 0.059) * 100).toFixed(1);
  document.getElementById('set-open-elec').value = ((s.openElecFee || 0.13) * 100).toFixed(1);
  document.getElementById('set-open-hand').value = ((s.openHandFee || 0.176) * 100).toFixed(1);
  document.getElementById('set-domae').value = ((s.domaeFee || 0.01) * 100).toFixed(1);
  document.getElementById('settings-modal').classList.add('show');
}
function closeSettingsModal() { document.getElementById('settings-modal').classList.remove('show'); }

// ======================== 커머셜 프로모션 설정 ========================
const ORDER_SETTINGS_KEY = 'mw_order_settings';
let orderSettings = loadObj(ORDER_SETTINGS_KEY, {
  arPromos: [{name:'',rate:0},{name:'',rate:0},{name:'',rate:0},{name:'',rate:0}],
  volPromos: [{name:'',rate:0},{name:'',rate:0},{name:'',rate:0},{name:'',rate:0}]
});

function showOrderSettingsModal() {
  const s = orderSettings;
  const arP = s.arPromos || [{name:'',rate:0},{name:'',rate:0},{name:'',rate:0},{name:'',rate:0}];
  const volP = s.volPromos || [{name:'',rate:0},{name:'',rate:0},{name:'',rate:0},{name:'',rate:0}];
  for (let i = 0; i < 4; i++) {
    document.getElementById('os-ar-name-' + i).value = (arP[i] && arP[i].name) || '';
    document.getElementById('os-ar-rate-' + i).value = (arP[i] && arP[i].rate) || '';
    document.getElementById('os-vol-name-' + i).value = (volP[i] && volP[i].name) || '';
    document.getElementById('os-vol-rate-' + i).value = (volP[i] && volP[i].rate) || '';
  }
  document.getElementById('order-settings-modal').classList.add('show');
}

function closeOrderSettingsModal() {
  document.getElementById('order-settings-modal').classList.remove('show');
}

function applyOrderSettings() {
  orderSettings.arPromos = [];
  orderSettings.volPromos = [];
  for (let i = 0; i < 4; i++) {
    const arRate = parseFloat(document.getElementById('os-ar-rate-' + i).value);
    const volRate = parseFloat(document.getElementById('os-vol-rate-' + i).value);
    orderSettings.arPromos.push({
      name: document.getElementById('os-ar-name-' + i).value.trim(),
      rate: isNaN(arRate) ? 0 : arRate
    });
    orderSettings.volPromos.push({
      name: document.getElementById('os-vol-name-' + i).value.trim(),
      rate: isNaN(volRate) ? 0 : volRate
    });
  }
  localStorage.setItem(ORDER_SETTINGS_KEY, JSON.stringify(orderSettings));
  closeOrderSettingsModal();
  renderCatalog();
  toast('커머셜 프로모션 설정 적용 완료');
}

// 발주용 매입원가 계산 (분기+년간+커머셜 모두 적용)
function calcOrderCost(price, productDC) {
  if (!price) return 0;
  const s = DB.settings;
  // 분기+년간 리베이트 (단가표 설정에서)
  let arTotal = price * (s.quarterDC || 0) + price * (s.yearDC || 0);
  // 단가표 커머셜 AR (기존 — 호환 유지)
  (s.arPromos || []).forEach(ap => { if (ap.rate > 0) arTotal += price * (ap.rate / 100); });
  // 발주 커머셜 AR 추가
  (orderSettings.arPromos || []).forEach(ap => { if (ap.rate > 0) arTotal += price * (ap.rate / 100); });
  // 물량지원: 단가표 커머셜 + 발주 커머셜 + 제품DC
  let volPct = 0;
  (s.volPromos || []).forEach(vp => { if (vp.rate > 0) volPct += vp.rate; });
  (orderSettings.volPromos || []).forEach(vp => { if (vp.rate > 0) volPct += vp.rate; });
  volPct += (productDC || 0) * 100;
  return (price - arTotal) / (1 + volPct / 100);
}

function applySettings() {
  // NaN만 기본값 폴백 (0은 유효한 값)
  function pv(id, def) { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? def : v; }
  // 섹션1: 밀워키 리베이트 (입력: %, 저장: 소수)
  DB.settings.quarterDC = pv('set-quarter', 4) / 100;
  DB.settings.yearDC = pv('set-year', 1.8) / 100;
  // 섹션2: 채널별 마크업 + 부가세 (마크업: 저장값=%, 부가세: 입력% → 저장소수)
  DB.settings.mkDomae = pv('set-mk-domae', 1);
  DB.settings.mkRetail = pv('set-mk-retail', 15);
  DB.settings.mkNaver = pv('set-mk-naver', 17);
  DB.settings.mkOpen = pv('set-mk-open', 27);
  DB.settings.vat = pv('set-vat', 10) / 100;
  // 섹션4: 온라인 판매채널 수수료 (입력: %, 저장: 소수)
  DB.settings.naverFee = pv('set-naver', 5.9) / 100;
  DB.settings.openElecFee = pv('set-open-elec', 13) / 100;
  DB.settings.openHandFee = pv('set-open-hand', 17.6) / 100;
  DB.settings.domaeFee = pv('set-domae', 1) / 100;
  save(KEYS.settings, DB.settings);
  recalcAll();
  closeSettingsModal();
  toast(`설정 적용 완료 — ${DB.products.length}건 재계산됨`);
}

function recalcAll() {
  const s = DB.settings;
  // AR차감 합산율 (분기 + 년간)
  const arRates = [s.quarterDC, s.yearDC];
  // 물량지원 합산율 (제품DC는 제품별이므로 여기서는 0)
  let volRateSum = 0;

  DB.products.forEach(p => {
    if (!p.supplyPrice) return;
    const sp = p.supplyPrice;
    // Step 2: AR차감총액 = 공급가 × (분기% + 년간% + AR커머셜1% + AR커머셜2% + ...)
    let arTotal = 0;
    arRates.forEach(r => { arTotal += sp * r; });
    // Step 3: 물량지원총률 = 물량지원커머셜% + 제품DC%
    const productDCpct = (p.productDC || 0) * 100; // productDC는 소수(0.07=7%)로 저장되어 있음
    const totalVolPct = volRateSum + productDCpct;
    // Step 4: 최종 매입원가
    const arApplied = sp - arTotal;
    const qtyRatio = 1 + (totalVolPct / 100);
    const cost = arApplied / qtyRatio;
    p.cost = Math.round(cost);

    // 채널별 판매가 = ROUNDUP(원가 × (1 + 마크업%), -2)
    p.priceA = Math.ceil((cost * (1 + s.mkDomae / 100)) / 100) * 100;
    p.priceRetail = Math.ceil((cost * (1 + s.mkRetail / 100)) / 100) * 100;
    p.priceNaver = Math.ceil((cost * (1 + s.mkNaver / 100)) / 100) * 100;
    p.priceOpen = Math.ceil((cost * (1 + s.mkOpen / 100)) / 100) * 100;
  });

  // 프로모션 원가 재계산 — 동일 설정값(리베이트+커머셜) 적용
  DB.promotions.forEach(pr => {
    if (pr.promoPrice > 0) {
      // 해당 제품의 제품DC를 찾아서 적용
      const prod = pr.code ? findProduct(pr.code) : null;
      const pdc = prod ? (prod.productDC || 0) : 0;
      pr.cost = Math.round(calcCost(pr.promoPrice, pdc));
    }
  });

  save(KEYS.products, DB.products);
  save(KEYS.promotions, DB.promotions);

  // Update all visible UI
  renderCatalog();
  document.getElementById('sales-vat').value = (s.vat * 100).toFixed(1);
  document.getElementById('sales-naver-fee').value = (s.naverFee * 100).toFixed(1);
  document.getElementById('sales-open-elec-fee').value = (s.openElecFee * 100).toFixed(1);
  document.getElementById('sales-open-hand-fee').value = (s.openHandFee * 100).toFixed(1);
}

// ======================== PROMO CRUD ========================
function showPromoAddModal() {
  document.getElementById('promo-edit-title').textContent = '프로모션 추가';
  document.getElementById('promo-edit-idx').value = -1;
  ['pe-promoCode','pe-promoName','pe-model','pe-orderNum','pe-dealerPrice','pe-promoPrice','pe-discountRate','pe-period'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pe-qty').value = '1';
  document.getElementById('promo-edit-modal').classList.add('show');
}
function closePromoModal() { document.getElementById('promo-edit-modal').classList.remove('show'); }

function editPromo(idx) {
  const p = DB.promotions[idx];
  if (!p) return;
  document.getElementById('promo-edit-title').textContent = '프로모션 수정';
  document.getElementById('promo-edit-idx').value = idx;
  document.getElementById('pe-promoCode').value = p.promoCode || '';
  document.getElementById('pe-promoName').value = p.promoName || '';
  document.getElementById('pe-model').value = p.model || '';
  document.getElementById('pe-orderNum').value = p.orderNum || '';
  document.getElementById('pe-qty').value = p.qty || 1;
  document.getElementById('pe-dealerPrice').value = p.dealerPrice || '';
  document.getElementById('pe-promoPrice').value = p.promoPrice ?? '';
  document.getElementById('pe-discountRate').value = p.discountDisplay || p.discountRate || '';
  document.getElementById('pe-period').value = p.period || '';
  document.getElementById('promo-edit-modal').classList.add('show');
}

function calcPromoCost(promoPrice, productDC) {
  // 프로모션 공급가에 동일한 설정값(리베이트+커머셜) 적용
  if (!promoPrice || promoPrice <= 0) return 0;
  return calcCost(promoPrice, productDC || 0);
}

function savePromo() {
  const idx = parseInt(document.getElementById('promo-edit-idx').value);
  const promoPrice = parseInt(document.getElementById('pe-promoPrice').value) || 0;
  // 기존 프로모션에 code가 있으면 제품DC 참조
  const existingCode = idx >= 0 ? (DB.promotions[idx]?.code || '') : '';
  const linkedProd = existingCode ? findProduct(existingCode) : null;
  const cost = calcPromoCost(promoPrice, linkedProd ? linkedProd.productDC : 0);
  const discountRaw = document.getElementById('pe-discountRate').value.trim();

  const dealerPrice = parseInt(document.getElementById('pe-dealerPrice').value) || 0;
  const isFree = promoPrice === 0;
  const autoDisplay = calcDiscountDisplay(discountRaw, dealerPrice, promoPrice, isFree);
  const autoRate = discountRaw ? (parseFloat(discountRaw) / 100 || calcDiscountRate(0, dealerPrice, promoPrice)) : calcDiscountRate(0, dealerPrice, promoPrice);

  const item = {
    promoCode: document.getElementById('pe-promoCode').value,
    promoName: document.getElementById('pe-promoName').value,
    model: document.getElementById('pe-model').value,
    orderNum: document.getElementById('pe-orderNum').value,
    qty: parseInt(document.getElementById('pe-qty').value) || 1,
    dealerPrice: dealerPrice,
    promoPrice: promoPrice,
    discountDisplay: autoDisplay,
    discountRate: autoRate,
    period: document.getElementById('pe-period').value,
    cost: Math.round(cost),
    month: DB.currentPromoMonth
  };

  if (idx >= 0) {
    DB.promotions[idx] = { ...DB.promotions[idx], ...item };
  } else {
    DB.promotions.push(item);
  }
  save(KEYS.promotions, DB.promotions);
  closePromoModal();
  renderPromo();
  toast(idx >= 0 ? '프로모션 수정 완료' : '프로모션 추가 완료');
}

function deletePromo(idx) {
  if (!confirm(`"${DB.promotions[idx]?.promoName || ''}" 프로모션을 삭제하시겠습니까?`)) return;
  DB.promotions.splice(idx, 1);
  save(KEYS.promotions, DB.promotions);
  renderPromo();
  toast('프로모션 삭제 완료');
}

// ======================== PROMO MONTHLY MANAGEMENT ========================
function initPromoMonths() {
  const now = new Date();
  const curMonth = (now.getMonth() + 1) + '월';
  DB.currentPromoMonth = loadObj('mw_promo_current_month', curMonth);
  const archive = loadObj('mw_promo_archive', {});

  // Build month selector
  const sel = document.getElementById('promo-month-select');
  const months = Object.keys(archive);
  if (!months.includes(DB.currentPromoMonth)) months.push(DB.currentPromoMonth);
  months.sort((a, b) => parseInt(a) - parseInt(b));

  sel.innerHTML = months.map(m => `<option value="${m}" ${m === DB.currentPromoMonth ? 'selected' : ''}>${m}</option>`).join('');
  document.getElementById('promo-month-label').textContent = DB.currentPromoMonth;
}

function switchPromoMonth(month) {
  // Save current month's data to archive
  const archive = loadObj('mw_promo_archive', {});
  archive[DB.currentPromoMonth] = DB.promotions;
  localStorage.setItem('mw_promo_archive', JSON.stringify(archive));

  // Load target month
  DB.currentPromoMonth = month;
  localStorage.setItem('mw_promo_current_month', JSON.stringify(month));
  DB.promotions = archive[month] || [];
  save(KEYS.promotions, DB.promotions);

  document.getElementById('promo-month-label').textContent = month;
  renderPromo();
  toast(`${month} 프로모션 로드 (${DB.promotions.length}건)`);
}

function archiveAndNewMonth() {
  const curNum = parseInt(DB.currentPromoMonth);
  const nextMonth = (curNum >= 12 ? 1 : curNum + 1) + '월';

  if (!confirm(`현재 ${DB.currentPromoMonth} 프로모션(${DB.promotions.length}건)을 저장하고, ${nextMonth}로 새로 시작하시겠습니까?`)) return;

  const archive = loadObj('mw_promo_archive', {});
  archive[DB.currentPromoMonth] = [...DB.promotions];
  localStorage.setItem('mw_promo_archive', JSON.stringify(archive));

  DB.currentPromoMonth = nextMonth;
  localStorage.setItem('mw_promo_current_month', JSON.stringify(nextMonth));
  DB.promotions = [];
  save(KEYS.promotions, DB.promotions);

  initPromoMonths();
  renderPromo();
  toast(`${nextMonth} 프로모션 시작 (이전 ${archive[Object.keys(archive).pop()]?.length || 0}건 저장됨)`);
}

function clearAllPromos() {
  if (!DB.promotions.length) { toast('삭제할 프로모션이 없습니다'); return; }
  if (!confirm(`현재 ${DB.currentPromoMonth} 프로모션 ${DB.promotions.length}건을 전부 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
  DB.promotions = [];
  save(KEYS.promotions, DB.promotions);
  renderPromo();
  toast('프로모션 일괄 삭제 완료');
}

function importExcel() {
  const file = document.getElementById('excel-file').files[0];
  if (!file) { toast('파일을 선택해주세요'); return; }

  const status = document.getElementById('import-status');
  status.textContent = '📂 파일 읽는 중...';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      let imported = { products: 0, inventory: 0, promotions: 0, rebate: 0 };

      // Show detected sheets
      const sheets = wb.SheetNames;
      status.innerHTML = `<div style="margin-bottom:8px"><b>📋 감지된 시트 (${sheets.length}개):</b></div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${sheets.map(s => `<span class="badge badge-blue">${s}</span>`).join('')}</div>
        <div>⏳ 데이터 파싱 중...</div>`;

      // 1. 재고 시트 — fuzzy match
      const stockSheet = sheets.find(s => s === '재고') || sheets.find(s => s.includes('재고'));
      if (stockSheet) {
        const data = XLSX.utils.sheet_to_json(wb.Sheets[stockSheet], { header: 1 });
        DB.inventory = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row && row[1]) {
            DB.inventory.push({ code: String(row[1]), stock: row[2] || 0, note1: row[3] || '', note2: row[4] || '' });
          }
        }
        imported.inventory = DB.inventory.length;
      }

      // 2. 전체가격표 시트 — fuzzy match
      const priceSheet = sheets.find(s => s === '전체가격표(26.04 인상)') ||
        sheets.find(s => s === '전체가격표(25)') ||
        sheets.find(s => s.includes('가격표') && s.includes('26')) ||
        sheets.find(s => s.includes('가격표') && s.includes('25')) ||
        sheets.find(s => s.includes('가격표')) ||
        null;

      if (priceSheet) {
        const ws = wb.Sheets[priceSheet];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const is26 = priceSheet.includes('26');
        
        // Auto-detect header row and column positions
        let headerRow = -1;
        let col = {};
        for (let r = 0; r < Math.min(10, data.length); r++) {
          const row = data[r];
          if (!row) continue;
          const cells = row.map(v => String(v || '').trim());
          if (cells.includes('코드') && cells.includes('모델명')) {
            headerRow = r;
            cells.forEach((v, i) => {
              if (v === '단종') col.단종 = i;
              if (v === '코드') col.코드 = i;
              if (v === '관리코드') col.관리코드 = i;
              if (v === '대분류') col.대분류 = i;
              if (v === '중분류') col.중분류 = i;
              if (v === '소분류') col.소분류 = i;
              if (v === '순번') col.순번 = i;
              if (v.includes('TTI')) col.TTI = i;
              if (v === '모델명') col.모델명 = i;
              if (v === '제품설명') col.제품설명 = i;
              if (v === '공급가') col.공급가 = i;
              if (v === '제품DC') col.제품DC = i;
              if (v === '원가') col.원가 = i;
              if (v === '인상가') col.인상가 = i;
              if (v === '인상률') col.인상률 = i;
              if (v === '재고') col.재고 = i;
              if (v === '입고날짜' || v === '입고일') col.입고날짜 = i;
            });
            break;
          }
        }

        // Read discount rates from the row before header (typically row 3, index 2)
        if (headerRow >= 2) {
          const rateRow = data[headerRow - 1];
          if (rateRow) {
            // Find first numeric values in sequence (분기, 년간, 부가세, 네이버...)
            const nums = [];
            for (let c = 0; c < 15; c++) {
              if (typeof rateRow[c] === 'number' && rateRow[c] > 0 && rateRow[c] < 1) nums.push({ c, v: rateRow[c] });
            }
            if (nums.length >= 4) {
              DB.settings.quarterDC = nums[0].v;
              DB.settings.yearDC = nums[1].v;
              DB.settings.vat = nums[2].v;
              DB.settings.naverFee = nums[3].v;
              if (nums[4]) DB.settings.openElecFee = nums[4].v;
              if (nums[5]) DB.settings.openHandFee = nums[5].v;
              if (nums[6]) DB.settings.domaeFee = nums[6].v;
            }
          }
        }

        DB.products = [];
        const dataStart = headerRow + 2; // skip header + sub-header
        for (let i = dataStart; i < data.length; i++) {
          const row = data[i];
          const code = row && row[col.코드 ?? 2];
          if (!code) continue;

          const supplyPrice = row[col.공급가 ?? 10] || 0;
          const productDC = is26 ? (row[col.제품DC ?? 13] || 0) : (row[col.제품DC ?? 11] || 0);
          const costVal = row[col.원가 ?? (is26 ? 14 : 12)] || 0;
          const cost = costVal || calcCost(supplyPrice, productDC);

          DB.products.push({
            discontinued: (String(row[col.단종 ?? 1] || '').trim() === '단종') ? '단종' : '',
            code: String(code),
            manageCode: col.관리코드 != null ? String(row[col.관리코드] || '') : '',
            category: row[col.대분류 ?? 3] || '',
            subcategory: row[col.중분류 ?? 4] || '',
            detail: row[col.소분류 ?? 5] || '',
            orderNum: row[col.순번 ?? 6] || '',
            ttiNum: String(row[col.TTI ?? 7] || ''),
            model: row[col.모델명 ?? 8] || '',
            description: row[col.제품설명 ?? 9] || '',
            supplyPrice: supplyPrice,
            productDC: productDC,
            cost: Math.round(cost || 0),
            priceA: 0, priceRetail: 0, priceNaver: 0, priceOpen: 0,
            raisedPrice: is26 ? (row[col.인상가 ?? 11] || 0) : 0,
            raiseRate: is26 ? (row[col.인상률 ?? 12] || 0) : 0,
            inDate: col.입고날짜 != null ? String(row[col.입고날짜] || '') : ''
          });

          if (col.재고 != null && row[col.재고] != null) {
            const stockCode = String(code);
            const existingStock = DB.inventory.find(s => String(s.code) === stockCode);
            if (existingStock) {
              existingStock.stock = parseInt(row[col.재고]) || 0;
            } else {
              DB.inventory.push({ code: stockCode, stock: parseInt(row[col.재고]) || 0, note1: '', note2: '' });
            }
          }
        }
        imported.products = DB.products.length;
        imported.priceSheet = priceSheet;
        imported.headerInfo = `헤더 Row${headerRow+1}, 컬럼 ${Object.keys(col).length}개 감지`;
        save(KEYS.settings, DB.settings);
      }

      // 3. 프로모션 시트 — fuzzy match
      const promoSheet = sheets.find(s => s === '프로모션') || sheets.find(s => s.includes('프로모션'));
      if (promoSheet) {
        const data = XLSX.utils.sheet_to_json(wb.Sheets[promoSheet], { header: 1 });
        // Row 1: B1=프로모션 수수료1 (0.058), C1=프로모션 수수료2 (0.036)
        if (data[0]) {
          DB.settings.promoFee1 = parseFloat(((data[0][1] || 0.058) * 100).toFixed(2));
          DB.settings.promoFee2 = parseFloat(((data[0][2] || 0.036) * 100).toFixed(2));
        }
        DB.promotions = [];
        for (let i = 2; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[1]) continue;
          DB.promotions.push({
            code: String(row[1]),
            cost: row[2] || 0,
            period: row[3] || '',
            promoCode: row[4] || '',
            promoName: row[5] || '',
            model: row[6] || '',
            orderNum: row[7] || '',
            dealerPrice: row[8] || 0,
            promoPrice: row[9] || 0,
            qty: row[10] || 0,
            discountRate: row[11] || 0,
            limitQty: row[12] || '',
            periodDetail: row[13] || '',
            note: row[14] || '',
            memo: row[17] || ''
          });
        }
        imported.promotions = DB.promotions.length;
      }

      // 4. R (리베이트) 시트 — fuzzy match
      const rebateSheet = sheets.find(s => s === 'R') || sheets.find(s => s.includes('리베이트'));
      if (rebateSheet) {
        const data = XLSX.utils.sheet_to_json(wb.Sheets[rebateSheet], { header: 1 });
        DB.rebate = [];
        for (let i = 2; i < 12; i++) {
          const row = data[i];
          if (row && row[2] && row[3]) {
            DB.rebate.push({ min: row[2], rate: row[3] });
          }
        }
        if (DB.rebate.length) {
          save(KEYS.rebate, DB.rebate);
          imported.rebate = DB.rebate.length;
        }
      }

      saveAll();
      recalcAll();
      populateCatalogFilters();

      // Detailed result with match info
      const matchInfo = [
        { name: '가격표', sheet: priceSheet, count: imported.products },
        { name: '재고', sheet: stockSheet, count: imported.inventory },
        { name: '프로모션', sheet: promoSheet, count: imported.promotions },
        { name: '리베이트', sheet: rebateSheet, count: imported.rebate }
      ];
      const totalImported = imported.products + imported.inventory + imported.promotions;

      if (totalImported === 0) {
        status.innerHTML = `<div style="margin-bottom:8px"><b>📋 감지된 시트 (${sheets.length}개):</b></div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${sheets.map(s => `<span class="badge badge-gray">${s}</span>`).join('')}</div>
          <div style="color:#CC2222;font-weight:600;margin-bottom:8px">⚠ 데이터를 가져올 수 없습니다</div>
          <div style="font-size:12px;color:#5A6070">
            이 파일에서 인식 가능한 시트를 찾지 못했습니다.<br>
            원본 <b>밀워키.xlsx</b> 파일에는 아래 시트가 있어야 합니다:<br>
            <span class="badge badge-blue" style="margin:2px">재고</span>
            <span class="badge badge-blue" style="margin:2px">전체가격표(25)</span>
            <span class="badge badge-blue" style="margin:2px">전체가격표(26.04 인상)</span>
            <span class="badge badge-blue" style="margin:2px">프로모션</span>
            <span class="badge badge-blue" style="margin:2px">R</span>
          </div>`;
      } else {
        status.innerHTML = `<div style="color:#1D9E75;font-weight:600;margin-bottom:8px">✅ 가져오기 완료!</div>
          <table style="font-size:12px;width:100%;border-collapse:collapse">
            ${matchInfo.map(m => `<tr style="border-bottom:1px solid #F0F2F7">
              <td style="padding:4px 8px;font-weight:600">${m.name}</td>
              <td style="padding:4px 8px;color:#5A6070">${m.sheet ? `→ "${m.sheet}"` : '<span style="color:#CC2222">시트 없음</span>'}</td>
              <td style="padding:4px 8px;text-align:right;font-weight:600;${m.count > 0 ? 'color:#1D9E75' : 'color:#9BA3B2'}">${m.count > 0 ? m.count + (m.name === '리베이트' ? '구간' : '건') : '-'}</td>
            </tr>`).join('')}
          </table>
          <div style="margin-top:8px;font-size:11px;color:#5A6070">${imported.headerInfo ? '📊 ' + imported.headerInfo + ' | ' : ''}⚙ 분기 ${(DB.settings.quarterDC*100).toFixed(1)}% | 년간 ${(DB.settings.yearDC*100).toFixed(1)}% | 네이버 ${(DB.settings.naverFee*100).toFixed(1)}% | 오픈전동 ${(DB.settings.openElecFee*100).toFixed(1)}%</div>`;
      }

      toast(totalImported > 0 ? `가져오기 완료 (제품 ${imported.products}건)` : '⚠ 인식 가능한 시트가 없습니다');
      if (totalImported > 0) setTimeout(closeModal, 2500);
    } catch (err) {
      status.innerHTML = `<div style="color:#CC2222;font-weight:600">❌ 파일 읽기 오류</div><div style="font-size:12px;margin-top:4px">${err.message}</div>`;
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ======================== EXPORT ALL ========================
function exportAll() {
  if (!window.XLSX) { toast('SheetJS 라이브러리 로딩 중...'); return; }
  const wb = XLSX.utils.book_new();

  // Products
  if (DB.products.length) {
    const pData = [['단종', '코드', '관리코드', '대분류', '중분류', '소분류', '순번', 'TTI#', '모델명', '제품설명', '공급가', '제품DC', '원가', 'A(도매)', '소매', '스토어팜', '오픈마켓']];
    DB.products.forEach(p => pData.push([p.discontinued, p.code, p.manageCode || '', p.category, p.subcategory, p.detail, p.orderNum, p.ttiNum, p.model, p.description, p.supplyPrice, p.productDC, p.cost, p.priceA, p.priceRetail, p.priceNaver, p.priceOpen]));
    const ws = XLSX.utils.aoa_to_sheet(pData);
    ws['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 25 }, { wch: 40 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, '전체가격표');
  }

  // Inventory
  if (DB.inventory.length) {
    const iData = [['코드', '재고', '비고1', '비고2']];
    DB.inventory.forEach(i => iData.push([i.code, i.stock, i.note1, i.note2]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(iData), '재고');
  }

  // Promotions
  if (DB.promotions.length) {
    const prData = [['코드', '구분', '프로모션명', '모델명', '순번', '대리점가격', '프로모션금액', '할인율', '기간']];
    DB.promotions.forEach(p => prData.push([p.code, p.promoCode, p.promoName, p.model, p.orderNum, p.dealerPrice, p.promoPrice, p.discountRate, p.period]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prData), '프로모션');
  }

  XLSX.writeFile(wb, `밀워키_전체데이터_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast('전체 데이터 엑셀 파일 다운로드 완료');
}

// ======================== STICKY HEADER (JS) ========================
function initStickyHeader(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const scrollContainer = table.closest('.table-scroll');
  if (!scrollContainer) return;
  const thead = table.querySelector('thead');
  if (!thead) return;

  scrollContainer.addEventListener('scroll', function() {
    const scrollTop = this.scrollTop;
    thead.style.transform = 'translateY(' + scrollTop + 'px)';
    thead.style.zIndex = '5';
  });

  thead.querySelectorAll('th').forEach(th => {
    if (!th.style.background) {
      th.style.background = '#EAECF2';
    }
  });
}

// ======================== COLUMN RESIZE ========================
function initColumnResize(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const ths = table.querySelectorAll('thead th');
  const storageKey = 'mw_colwidths_' + tableId;

  // JS 배열로 컬럼 너비 추적 (offsetWidth 의존 제거)
  let W = null; // 컬럼 너비 배열

  // colgroup 생성 및 너비 적용
  function initCols() {
    if (W) return;
    W = Array.from(ths).map(t => t.offsetWidth);
    applyCols();
  }
  function applyCols() {
    // fixed layout + 정확한 합산 너비 → 각 컬럼 독립, 콘텐츠보다 좁게 축소 가능
    table.style.tableLayout = 'fixed';
    let cg = table.querySelector('colgroup.resize-cg');
    if (!cg) { cg = document.createElement('colgroup'); cg.className = 'resize-cg'; table.insertBefore(cg, table.firstChild); }
    cg.innerHTML = W.map(w => '<col style="width:' + w + 'px">').join('');
    table.style.width = W.reduce((a, b) => a + b, 0) + 'px';
  }

  // 저장된 컬럼 너비 복원
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && saved.length === ths.length) {
      W = saved;
      applyCols();
    }
  } catch(e) {}

  // 컬럼 자동맞춤: 헤더+모든 행의 셀 중 가장 넓은 텍스트에 맞춤
  function autoFitColumn(colIdx) {
    initCols();
    const PAD = 24;
    const measurer = document.createElement('span');
    measurer.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit;';
    document.body.appendChild(measurer);

    let maxW = 0;
    const thEl = ths[colIdx];
    measurer.style.font = getComputedStyle(thEl).font;
    measurer.textContent = thEl.textContent.trim();
    maxW = Math.max(maxW, measurer.offsetWidth);

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cell = row.cells[colIdx];
      if (!cell) return;
      const input = cell.querySelector('input');
      if (input) {
        measurer.style.font = getComputedStyle(input).font;
        measurer.textContent = input.value || input.placeholder || '';
      } else {
        measurer.style.font = getComputedStyle(cell).font;
        measurer.textContent = cell.textContent.trim();
      }
      maxW = Math.max(maxW, measurer.offsetWidth);
    });
    measurer.remove();

    W[colIdx] = Math.max(30, maxW + PAD);
    applyCols();
    localStorage.setItem(storageKey, JSON.stringify(W));
  }

  ths.forEach((th, thIdx) => {
    if (th.querySelector('.col-resize')) return;
    th.classList.add('resizable');
    const handle = document.createElement('div');
    handle.className = 'col-resize';
    th.appendChild(handle);

    let startX, startW, clickTimer = null, clickCount = 0;

    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // 더블클릭 감지
      clickCount++;
      if (clickCount === 1) {
        clickTimer = setTimeout(() => { clickCount = 0; }, 300);
      }
      if (clickCount >= 2) {
        clearTimeout(clickTimer);
        clickCount = 0;
        autoFitColumn(thIdx);
        return;
      }

      initCols();
      startX = e.pageX;
      startW = W[thIdx];
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      // 가이드 라인 생성
      const tableRect = table.getBoundingClientRect();
      const guideLine = document.createElement('div');
      guideLine.style.cssText = 'position:fixed;top:' + tableRect.top + 'px;width:1px;height:' + tableRect.height + 'px;background:var(--tl-primary, #185FA5);z-index:9999;pointer-events:none;';
      guideLine.style.left = th.getBoundingClientRect().right + 'px';
      document.body.appendChild(guideLine);

      function onMove(e2) {
        const newW = Math.max(30, startW + e2.pageX - startX);
        guideLine.style.left = (th.getBoundingClientRect().left + newW) + 'px';
      }
      function onUp(e2) {
        guideLine.remove();
        W[thIdx] = Math.max(30, startW + e2.pageX - startX);
        applyCols();
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        localStorage.setItem(storageKey, JSON.stringify(W));
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}


// ======================== PROMO V2 (신제품/패키지/이달의특가) ========================
let promosV2 = loadObj('mw_promos_v2', { newprod: [], package: [], monthly: [], cumul: [], quarter: [], spot: [], commercial: [] });
let pv2EditItems = [];

function savePromosV2() { localStorage.setItem('mw_promos_v2', JSON.stringify(promosV2)); }

function renderPromoV2(cat) {
  const data = promosV2[cat] || [];
  const body = document.getElementById(`promo-${cat}-tbody`);
  if (!body) return;
  let rows = '';
  data.forEach((promo, pi) => {
    const items = promo.items || [];
    if (!items.length) {
      rows += `<tr>
        <td class="center" style="white-space:nowrap">
          <button class="btn-edit" onclick="editPromoV2('${cat}',${pi})">수정</button>
          <button class="btn-danger btn-sm" style="padding:2px 6px;font-size:11px" onclick="deletePromoV2('${cat}',${pi})">삭제</button>
        </td>
        <td class="center" style="font-weight:600;color:#185FA5">${promo.promoNo || '-'}</td>
        <td class="center">${promo.title || '-'}</td>
        ${cat === 'monthly' ? '<td class="center">-</td>' : ''}
        <td class="center">-</td><td class="center">-</td><td class="center">-</td>
        <td class="num">-</td><td class="num">-</td>
        ${cat === 'monthly' ? '' : '<td class="num">-</td>'}
        <td class="center">${promo.discount || '-'}</td>
        ${cat === 'monthly' ? '<td class="center">-</td>' : ''}
        <td class="center" style="font-size:11px">${promo.period || '-'}</td>
        <td class="center" style="font-size:11px">${promo.restriction || '-'}</td>
      </tr>`;
    } else {
      items.forEach((item, ii) => {
        const discRate = item.price > 0 && item.promoPrice > 0 ? ((1 - item.promoPrice / item.price) * 100).toFixed(1) + '%' : (item.promoPrice === 0 ? '무상' : '-');
        rows += `<tr>
          ${ii === 0 ? `<td class="center" rowspan="${items.length}" style="white-space:nowrap;vertical-align:top">
            <button class="btn-edit" onclick="editPromoV2('${cat}',${pi})">수정</button>
            <button class="btn-danger btn-sm" style="padding:2px 6px;font-size:11px" onclick="deletePromoV2('${cat}',${pi})">삭제</button>
          </td>` : ''}
          ${ii === 0 ? `<td class="center" rowspan="${items.length}" style="font-weight:600;color:#185FA5;vertical-align:top">${promo.promoNo || '-'}</td>` : ''}
          ${ii === 0 ? `<td class="center" rowspan="${items.length}" style="vertical-align:top;font-size:12px">${promo.title || '-'}</td>` : ''}
          ${cat === 'monthly' ? `<td class="center" style="font-size:11px">${item.group || '-'}</td>` : ''}
          <td class="center">${item.orderNum || '-'}</td>
          <td class="center" style="font-weight:500">${item.model || '-'}</td>
          <td class="center" style="font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.description || '-'}</td>
          <td class="center">${item.qty || '-'}</td>
          <td class="num">${item.price ? fmt(item.price) : '-'}</td>
          <td class="num" style="color:#CC2222;font-weight:600">${item.promoPrice != null ? (item.promoPrice === 0 ? '무상 제공' : fmt(item.promoPrice)) : '-'}</td>
          ${cat !== 'monthly' ? `<td class="num" style="font-weight:600">${item.total ? fmt(item.total) : '-'}</td>` : ''}
          <td class="center">${discRate}</td>
          ${cat === 'monthly' ? `<td class="center">${item.maxQty || '-'}</td>` : ''}
          ${ii === 0 ? `<td class="center" rowspan="${items.length}" style="font-size:11px;vertical-align:top">${promo.period || '-'}</td>` : ''}
          ${ii === 0 ? `<td class="center" rowspan="${items.length}" style="font-size:11px;vertical-align:top">${promo.restriction || '-'}</td>` : ''}
        </tr>`;
      });
    }
  });

  if (!data.length) {
    const cols = cat === 'monthly' ? 13 : 13;
    rows = `<tr><td colspan="${cols}"><div class="empty-state"><p>프로모션이 없습니다</p><p style="font-size:12px;color:#9BA3B2">PDF 업로드 또는 수동 추가로 등록하세요</p></div></td></tr>`;
  }
  body.innerHTML = rows;
  const countEl = document.getElementById(`promo-${cat}-count`);
  if (countEl) countEl.textContent = `${data.length}건`;
}

function showPromoEditModal(cat, idx) {
  document.getElementById('pv2-category').value = cat;
  document.getElementById('pv2-edit-idx').value = idx != null ? idx : -1;

  if (idx != null && idx >= 0) {
    const promo = promosV2[cat][idx];
    document.getElementById('pv2-edit-title').textContent = '프로모션 수정';
    document.getElementById('pv2-no').value = promo.promoNo || '';
    document.getElementById('pv2-title').value = promo.title || '';
    document.getElementById('pv2-discount').value = promo.discount || '';
    document.getElementById('pv2-period').value = promo.period || '';
    document.getElementById('pv2-restriction').value = promo.restriction || '';
    pv2EditItems = JSON.parse(JSON.stringify(promo.items || []));
  } else {
    const catNames = { newprod: '신제품', package: '패키지', monthly: '이달의특가', cumul: '누적', quarter: '분기/월별', spot: '스팟' };
    document.getElementById('pv2-edit-title').textContent = (catNames[cat] || '') + ' 프로모션 추가';
    document.getElementById('pv2-no').value = '';
    document.getElementById('pv2-title').value = '';
    document.getElementById('pv2-discount').value = '';
    document.getElementById('pv2-period').value = '';
    document.getElementById('pv2-restriction').value = '';
    pv2EditItems = [];
  }
  renderPv2Items();
  document.getElementById('promo-v2-edit-modal').classList.add('show');
}

function editPromoV2(cat, idx) { showPromoEditModal(cat, idx); }

function deletePromoV2(cat, idx) {
  if (!confirm('이 프로모션을 삭제하시겠습니까?')) return;
  promosV2[cat].splice(idx, 1);
  savePromosV2();
  renderPromoV2(cat);
  toast('프로모션 삭제 완료');
}

function pv2AddItemByCode(code) {
  const p = findProduct(code);
  if (!p) return;
  pv2EditItems.push({
    orderNum: String(p.orderNum || ''),
    ttiNum: String(p.ttiNum || ''),
    model: p.model || '',
    description: p.description || '',
    qty: 1,
    price: p.supplyPrice || 0,
    promoPrice: 0,
    total: 0,
    group: '',
    maxQty: ''
  });
  document.getElementById('pv2-item-search').value = '';
  renderPv2Items();
}

function pv2AddEmptyItem() {
  pv2EditItems.push({ orderNum: '', ttiNum: '', model: '', description: '', qty: 1, price: 0, promoPrice: 0, total: 0, group: '', maxQty: '' });
  renderPv2Items();
}

function pv2RemoveItem(idx) {
  pv2EditItems.splice(idx, 1);
  renderPv2Items();
}

function pv2UpdateItem(idx, field, val) {
  if (['qty', 'price', 'promoPrice', 'total'].includes(field)) {
    pv2EditItems[idx][field] = parseInt(String(val).replace(/,/g, '')) || 0;
    if (field !== 'total') {
      pv2EditItems[idx].total = pv2EditItems[idx].promoPrice * pv2EditItems[idx].qty;
    }
  } else {
    pv2EditItems[idx][field] = val;
  }
}

function renderPv2Items() {
  const body = document.getElementById('pv2-items-body');
  body.innerHTML = pv2EditItems.map((item, i) => `<tr>
    <td class="center"><button class="btn-danger btn-sm" onclick="pv2RemoveItem(${i})" style="padding:1px 5px;font-size:10px">✕</button></td>
    <td><input value="${item.orderNum}" onchange="pv2UpdateItem(${i},'orderNum',this.value)" style="width:50px;font-size:11px;text-align:center"></td>
    <td><input value="${item.ttiNum}" onchange="pv2UpdateItem(${i},'ttiNum',this.value)" style="width:80px;font-size:11px;text-align:center"></td>
    <td><input value="${item.model}" onchange="pv2UpdateItem(${i},'model',this.value)" style="width:120px;font-size:11px"></td>
    <td><input value="${item.description}" onchange="pv2UpdateItem(${i},'description',this.value)" style="width:180px;font-size:11px"></td>
    <td><input type="number" value="${item.qty}" onchange="pv2UpdateItem(${i},'qty',this.value)" style="width:40px;font-size:11px;text-align:center" min="0"></td>
    <td><input type="number" value="${item.price}" onchange="pv2UpdateItem(${i},'price',this.value)" style="width:75px;font-size:11px;text-align:right" min="0"></td>
    <td><input type="number" value="${item.promoPrice}" onchange="pv2UpdateItem(${i},'promoPrice',this.value)" style="width:75px;font-size:11px;text-align:right" min="0"></td>
    <td class="num" style="font-size:11px">${item.promoPrice && item.qty ? fmt(item.promoPrice * item.qty) : '-'}</td>
  </tr>`).join('');
  if (!pv2EditItems.length) {
    body.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#9BA3B2;padding:12px;font-size:12px">제품을 검색하거나 빈 행을 추가하세요</td></tr>';
  }
}

function savePromoV2() {
  const cat = document.getElementById('pv2-category').value;
  const idx = parseInt(document.getElementById('pv2-edit-idx').value);
  const promoNo = document.getElementById('pv2-no').value.trim();
  const title = document.getElementById('pv2-title').value.trim();

  if (!promoNo) { toast('프로모션 번호를 입력해주세요'); return; }

  // Recalculate totals
  pv2EditItems.forEach(item => {
    item.total = (item.promoPrice || 0) * (item.qty || 0);
  });

  const promo = {
    promoNo,
    title,
    discount: document.getElementById('pv2-discount').value.trim(),
    period: document.getElementById('pv2-period').value.trim(),
    restriction: document.getElementById('pv2-restriction').value.trim(),
    items: JSON.parse(JSON.stringify(pv2EditItems))
  };

  if (idx >= 0) {
    promosV2[cat][idx] = promo;
  } else {
    promosV2[cat].push(promo);
  }
  savePromosV2();
  document.getElementById('promo-v2-edit-modal').classList.remove('show');
  renderPromoV2(cat);
  toast(idx >= 0 ? '프로모션 수정 완료' : '프로모션 추가 완료');
}

function renderAllPromosV2() {
  ['newprod', 'package', 'monthly', 'spot'].forEach(renderPromoV2);
  renderCumulPromos();
  renderQuarterPromos();
}

// ======================== 누적 프로모션 ========================
let cumulEditItems = [];

function renderCumulPromos() {
  const data = promosV2.cumul || [];
  const container = document.getElementById('promo-cumul-cards');
  if (!container) return;

  if (!data.length) {
    container.innerHTML = '<div class="empty-state"><p>누적 프로모션이 없습니다</p><p style="font-size:12px;color:#9BA3B2">+ 누적 추가로 등록하세요</p></div>';
  } else {
    container.innerHTML = data.map((p, i) => {
      const itemRows = (p.items || []).map(it => `<tr>
        <td class="center" style="font-size:11px">${it.group || '-'}</td>
        <td class="center" style="font-size:11px">${it.ttiNum || '-'}</td>
        <td class="center" style="font-size:11px">${it.orderNum || '-'}</td>
        <td class="center" style="font-size:11px;font-weight:500">${it.model || '-'}</td>
        <td class="center" style="font-size:11px">${it.description || '-'}</td>
        <td class="num" style="font-size:11px">${it.price ? fmt(it.price) : '-'}</td>
      </tr>`).join('');

      return `<div style="border:1px solid var(--tl-border);border-radius:8px;margin-bottom:12px;overflow:hidden">
        <div style="background:#185FA5;color:white;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700">[No.${i+1}] ${p.group || '-'}</span>
          <div style="display:flex;gap:6px">
            <button class="btn-ghost" style="padding:2px 8px;font-size:11px" onclick="showCumulEditModal(${i})">수정</button>
            <button class="btn-danger btn-sm" style="padding:2px 8px;font-size:11px" onclick="deleteCumulPromo(${i})">삭제</button>
          </div>
        </div>
        <div style="padding:10px 14px;display:flex;gap:24px;font-size:13px;background:#F8F9FB;border-bottom:1px solid var(--tl-border)">
          <div><strong>기간:</strong> ${p.period || '-'}</div>
          <div><strong>기준금액:</strong> <span style="color:#CC2222;font-weight:700">${p.threshold || '-'}</span></div>
          <div><strong>FOC:</strong> <span style="color:#1D9E75;font-weight:700">${p.foc || '-'}</span></div>
          <div><strong>비고:</strong> ${p.note || '-'}</div>
        </div>
        ${(p.items || []).length ? `<div style="max-height:200px;overflow-y:auto">
          <table class="data-table" style="font-size:12px">
            <thead><tr><th>구분</th><th>TTI#</th><th>순번</th><th>모델명</th><th>제품설명</th><th>대리점공급가</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>` : '<div style="padding:12px;text-align:center;color:#9BA3B2;font-size:12px">적용 제품 리스트 없음</div>'}
      </div>`;
    }).join('');
  }
  const countEl = document.getElementById('promo-cumul-count');
  if (countEl) countEl.textContent = `${data.length}건`;
}

function showCumulEditModal(idx) {
  const isEdit = idx != null && idx >= 0;
  document.getElementById('cumul-edit-title').textContent = isEdit ? '누적 프로모션 수정' : '누적 프로모션 추가';
  document.getElementById('cumul-edit-idx').value = isEdit ? idx : -1;

  if (isEdit) {
    const p = promosV2.cumul[idx];
    document.getElementById('cumul-group').value = p.group || '';
    document.getElementById('cumul-period').value = p.period || '';
    document.getElementById('cumul-threshold').value = p.threshold || '';
    document.getElementById('cumul-foc').value = p.foc || '';
    document.getElementById('cumul-note').value = p.note || '';
    cumulEditItems = JSON.parse(JSON.stringify(p.items || []));
  } else {
    document.getElementById('cumul-group').value = '';
    document.getElementById('cumul-period').value = '';
    document.getElementById('cumul-threshold').value = '';
    document.getElementById('cumul-foc').value = '';
    document.getElementById('cumul-note').value = '';
    cumulEditItems = [];
  }
  renderCumulEditItems();
  document.getElementById('cumul-edit-modal').classList.add('show');
}

function cumulAddItem(code) {
  const p = findProduct(code);
  if (!p) return;
  cumulEditItems.push({ group: '', ttiNum: String(p.ttiNum || ''), orderNum: String(p.orderNum || ''), model: p.model || '', description: p.description || '', price: p.supplyPrice || 0 });
  document.getElementById('cumul-item-search').value = '';
  renderCumulEditItems();
}

function cumulAddEmpty() {
  cumulEditItems.push({ group: '', ttiNum: '', orderNum: '', model: '', description: '', price: 0 });
  renderCumulEditItems();
}

function renderCumulEditItems() {
  const body = document.getElementById('cumul-items-body');
  body.innerHTML = cumulEditItems.map((it, i) => `<tr>
    <td class="center"><button class="btn-danger btn-sm" onclick="cumulEditItems.splice(${i},1);renderCumulEditItems()" style="padding:1px 5px;font-size:10px">✕</button></td>
    <td><input value="${it.group || ''}" onchange="cumulEditItems[${i}].group=this.value" style="width:60px;font-size:11px;text-align:center"></td>
    <td><input value="${it.ttiNum || ''}" onchange="cumulEditItems[${i}].ttiNum=this.value" style="width:80px;font-size:11px;text-align:center"></td>
    <td><input value="${it.orderNum || ''}" onchange="cumulEditItems[${i}].orderNum=this.value" style="width:50px;font-size:11px;text-align:center"></td>
    <td><input value="${it.model || ''}" onchange="cumulEditItems[${i}].model=this.value" style="width:120px;font-size:11px"></td>
    <td><input value="${it.description || ''}" onchange="cumulEditItems[${i}].description=this.value" style="width:160px;font-size:11px"></td>
    <td><input type="number" value="${it.price || 0}" onchange="cumulEditItems[${i}].price=parseInt(this.value)||0" style="width:80px;font-size:11px;text-align:right"></td>
  </tr>`).join('');
  if (!cumulEditItems.length) body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#9BA3B2;padding:12px;font-size:12px">제품을 추가하세요</td></tr>';
}

function saveCumulPromo() {
  const idx = parseInt(document.getElementById('cumul-edit-idx').value);
  const promo = {
    group: document.getElementById('cumul-group').value.trim(),
    period: document.getElementById('cumul-period').value.trim(),
    threshold: document.getElementById('cumul-threshold').value.trim(),
    foc: document.getElementById('cumul-foc').value.trim(),
    note: document.getElementById('cumul-note').value.trim(),
    items: JSON.parse(JSON.stringify(cumulEditItems))
  };
  if (!promo.group) { toast('품목군을 입력해주세요'); return; }
  if (idx >= 0) { promosV2.cumul[idx] = promo; } else { promosV2.cumul.push(promo); }
  savePromosV2();
  document.getElementById('cumul-edit-modal').classList.remove('show');
  renderCumulPromos();
  toast(idx >= 0 ? '누적 프로모션 수정 완료' : '누적 프로모션 추가 완료');
}

function deleteCumulPromo(idx) {
  if (!confirm('이 누적 프로모션을 삭제하시겠습니까?')) return;
  promosV2.cumul.splice(idx, 1);
  savePromosV2();
  renderCumulPromos();
  toast('삭제 완료');
}

// ======================== 분기/월별 프로모션 ========================
function renderQuarterPromos() {
  const data = promosV2.quarter || [];
  const container = document.getElementById('promo-quarter-cards');
  if (!container) return;

  if (!data.length) {
    container.innerHTML = '<div class="empty-state"><p>분기/월별 프로모션이 없습니다</p><p style="font-size:12px;color:#9BA3B2">+ 분기/월별 추가로 등록하세요</p></div>';
  } else {
    container.innerHTML = data.map((p, i) => {
      const tierRows = (p.tiers || []).filter(t => t.amount).map(t =>
        `<tr><td class="center" style="font-size:12px">${p.unit} 누적 ${t.amount} 이상</td><td class="center" style="font-weight:700;color:#1D9E75;font-size:14px">${t.rate}</td></tr>`
      ).join('');

      return `<div style="border:1px solid var(--tl-border);border-radius:8px;margin-bottom:12px;overflow:hidden">
        <div style="background:#1D9E75;color:white;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700">${p.group || '-'} (${p.unit})</span>
          <div style="display:flex;gap:6px">
            <button class="btn-ghost" style="padding:2px 8px;font-size:11px" onclick="showQuarterEditModal(${i})">수정</button>
            <button class="btn-danger btn-sm" style="padding:2px 8px;font-size:11px" onclick="deleteQuarterPromo(${i})">삭제</button>
          </div>
        </div>
        <div style="padding:10px 14px;display:flex;gap:24px;font-size:13px;background:#F8F9FB;border-bottom:1px solid var(--tl-border)">
          <div><strong>대상:</strong> ${p.target || '-'}</div>
          <div><strong>기간:</strong> ${p.period || '-'}</div>
          <div><strong>비고:</strong> ${p.note || '-'}</div>
        </div>
        <div style="padding:8px 14px">
          <table class="data-table" style="font-size:12px;max-width:400px">
            <thead><tr><th>주문 금액 구간</th><th>물량 지원율</th></tr></thead>
            <tbody>${tierRows || '<tr><td colspan="2" style="text-align:center;color:#9BA3B2">구간 없음</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');
  }
  const countEl = document.getElementById('promo-quarter-count');
  if (countEl) countEl.textContent = `${data.length}건`;
}

function showQuarterEditModal(idx) {
  const isEdit = idx != null && idx >= 0;
  document.getElementById('quarter-edit-title').textContent = isEdit ? '분기/월별 수정' : '분기/월별 추가';
  document.getElementById('quarter-edit-idx').value = isEdit ? idx : -1;

  if (isEdit) {
    const p = promosV2.quarter[idx];
    document.getElementById('quarter-group').value = p.group || '';
    document.getElementById('quarter-target').value = p.target || '';
    document.getElementById('quarter-unit').value = p.unit || '월별';
    document.getElementById('quarter-period').value = p.period || '';
    document.getElementById('quarter-note').value = p.note || '';
    (p.tiers || []).forEach((t, i) => {
      const a = document.getElementById('qt-amt-' + i);
      const r = document.getElementById('qt-rate-' + i);
      if (a) a.value = t.amount || '';
      if (r) r.value = t.rate || '';
    });
  } else {
    ['quarter-group','quarter-target','quarter-period','quarter-note'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('quarter-unit').value = '월별';
    for (let i = 0; i < 4; i++) {
      const a = document.getElementById('qt-amt-' + i);
      const r = document.getElementById('qt-rate-' + i);
      if (a) a.value = '';
      if (r) r.value = '';
    }
  }
  document.getElementById('quarter-edit-modal').classList.add('show');
}

function saveQuarterPromo() {
  const idx = parseInt(document.getElementById('quarter-edit-idx').value);
  const tiers = [];
  for (let i = 0; i < 4; i++) {
    const a = document.getElementById('qt-amt-' + i);
    const r = document.getElementById('qt-rate-' + i);
    if (a && a.value) tiers.push({ amount: a.value.trim(), rate: (r ? r.value.trim() : '') });
  }
  const promo = {
    group: document.getElementById('quarter-group').value.trim(),
    target: document.getElementById('quarter-target').value.trim(),
    unit: document.getElementById('quarter-unit').value,
    period: document.getElementById('quarter-period').value.trim(),
    note: document.getElementById('quarter-note').value.trim(),
    tiers
  };
  if (!promo.group) { toast('제품군을 입력해주세요'); return; }
  if (idx >= 0) { promosV2.quarter[idx] = promo; } else { promosV2.quarter.push(promo); }
  savePromosV2();
  document.getElementById('quarter-edit-modal').classList.remove('show');
  renderQuarterPromos();
  toast(idx >= 0 ? '수정 완료' : '추가 완료');
}

function deleteQuarterPromo(idx) {
  if (!confirm('삭제하시겠습니까?')) return;
  promosV2.quarter.splice(idx, 1);
  savePromosV2();
  renderQuarterPromos();
  toast('삭제 완료');
}

// ======================== TAB 7: 일반제품 단가표 ========================
let genProducts = loadObj('mw_gen_products', []);

function renderGenProducts() {
  const search = (document.getElementById('gen-search').value || '').toLowerCase();
  let filtered = genProducts;
  if (search) filtered = filtered.filter(p => `${p.code} ${p.manageCode || ''} ${p.model} ${p.description}`.toLowerCase().includes(search));

  const body = document.getElementById('gen-body');
  body.innerHTML = filtered.map((p, i) => {
    const idx = genProducts.indexOf(p);
    return `<tr>
      <td class="center"><button class="btn-danger btn-sm" onclick="removeGenProduct(${idx})" style="padding:2px 6px">✕</button></td>
      <td>${p.code || '-'}</td>
      <td>${p.manageCode || '-'}</td>
      <td>${p.category || '-'}</td>
      <td style="font-weight:500">${p.model || '-'}</td>
      <td>${p.description || '-'}</td>
      <td class="num" style="color:#1D9E75">${fmt(p.cost || 0)}</td>
      <td class="num">${fmt(p.priceA || 0)}</td>
      <td class="num">${fmt(p.priceNaver || 0)}</td>
      <td class="num">${fmt(p.priceOpen || 0)}</td>
      <td><input value="${(p.memo || '').replace(/"/g,'&quot;')}" onchange="updateGenMemo(${idx},this.value)" placeholder="" style="width:100%;font-size:12px;border:1px solid #DDE1EB;border-radius:4px;padding:2px 6px;background:#fff;color:#1A1D23;text-align:left"></td>
      <td style="text-align:left;font-size:12px;cursor:pointer;white-space:nowrap;padding-left:8px" onclick="editGenInDate(${idx})">${p.inDate ? '<span style="color:#CC2222;margin-right:4px">●</span>' + p.inDate : '-'}</td>
    </tr>`;
  }).join('');
  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="12"><div class="empty-state"><p>일반제품이 없습니다</p><p style="font-size:12px;color:#9BA3B2">양식을 다운로드하여 업로드하거나, + 제품 추가를 이용하세요</p></div></td></tr>';
  }
  document.getElementById('gen-count').textContent = `${genProducts.length}건`;
  initColumnResize('gen-table');
}

function addGenProduct() {
  const code = prompt('코드를 입력하세요');
  if (!code) return;
  const manageCode = prompt('관리코드(바코드)를 입력하세요') || '';
  const category = prompt('대분류를 입력하세요') || '';
  const model = prompt('모델명을 입력하세요') || '';
  const description = prompt('제품설명을 입력하세요') || '';
  const cost = parseInt(prompt('원가를 입력하세요') || '0') || 0;
  const priceA = parseInt(prompt('판매가를 입력하세요') || '0') || 0;
  const priceNaver = parseInt(prompt('스토어팜 가격을 입력하세요') || '0') || 0;
  const priceOpen = parseInt(prompt('오픈마켓 가격을 입력하세요') || '0') || 0;
  const memo = prompt('비고를 입력하세요') || '';
  genProducts.push({ code, manageCode, category, model, description, supplyPrice: 0, cost, priceA, priceNaver, priceOpen, memo, source: 'general' });
  localStorage.setItem('mw_gen_products', JSON.stringify(genProducts));
  renderGenProducts();
  toast('일반제품 추가 완료');
}

function removeGenProduct(idx) {
  if (!confirm('이 제품을 삭제하시겠습니까?')) return;
  genProducts.splice(idx, 1);
  localStorage.setItem('mw_gen_products', JSON.stringify(genProducts));
  renderGenProducts();
}

function updateGenMemo(idx, val) {
  genProducts[idx].memo = val.trim();
  localStorage.setItem('mw_gen_products', JSON.stringify(genProducts));
}

function editGenInDate(idx) {
  const p = genProducts[idx];
  const current = p.inDate || '';
  const val = prompt('입고날짜 메모 (삭제하려면 비워두세요):', current);
  if (val === null) return;
  genProducts[idx].inDate = val.trim();
  localStorage.setItem('mw_gen_products', JSON.stringify(genProducts));
  renderGenProducts();
  toast(val.trim() ? '입고날짜 메모 저장' : '입고날짜 메모 삭제');
}

function downloadGenTemplate() {
  if (!window.XLSX) { toast('SheetJS 로딩 중...'); return; }
  const data = [['코드', '관리코드', '대분류', '모델 및 규격', '제품설명 및 품명', '원가', '판매가', '스토어팜', '오픈마켓', '비고', '입고날짜']];
  data.push(['SAMPLE-001', '8801234567890', '전동공구', '샘플 제품', '샘플 설명', 90000, 95000, 97000, 105000, '', '']);
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:12},{wch:16},{wch:12},{wch:25},{wch:40},{wch:12},{wch:12},{wch:12},{wch:12},{wch:20},{wch:15}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '일반제품');
  XLSX.writeFile(wb, '일반제품_양식.xlsx');
  toast('양식 다운로드 완료');
}

function uploadGenProducts(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[0]) continue;
        genProducts.push({
          code: String(r[0] || ''),
          manageCode: String(r[1] || ''),
          category: String(r[2] || ''),
          model: String(r[3] || ''),
          description: String(r[4] || ''),
          supplyPrice: 0,
          cost: parseInt(r[5]) || 0,
          priceA: parseInt(r[6]) || 0,
          priceNaver: parseInt(r[7]) || 0,
          priceOpen: parseInt(r[8]) || 0,
          memo: String(r[9] || ''),
          inDate: String(r[10] || ''),
          source: 'general'
        });
        count++;
      }
      localStorage.setItem('mw_gen_products', JSON.stringify(genProducts));
      renderGenProducts();
      toast(`${count}건 업로드 완료`);
    } catch (err) {
      toast('업로드 실패: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsArrayBuffer(file);
}

// ======================== TAB 6: 견적서 ========================
let estimates = loadObj('mw_estimates', []);
let currentEstIdx = -1;
let currentEstItems = [];

function genEstNo() {
  const d = new Date();
  const prefix = 'DH-' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0');
  const existing = estimates.filter(e => e.no && e.no.startsWith(prefix));
  const nextNum = existing.length + 1;
  return prefix + '-' + String(nextNum).padStart(4,'0');
}

// Helper: find product from both 밀워키 + 일반제품
function findAnyProduct(code) {
  const mw = findProduct(code);
  if (mw) return { ...mw, _source: 'milwaukee' };
  const gen = genProducts.find(p => String(p.code) === String(code));
  if (gen) return { ...gen, _source: 'general' };
  return null;
}

function searchEstProducts(val) {
  const body = document.getElementById('est-search-body');
  if (!val || val.length < 1) { body.innerHTML = ''; return; }
  const q = val.toLowerCase();

  // Search 밀워키
  const mwResults = searchProducts(val).slice(0, 20).map(p => ({ ...p, _source: 'milwaukee' }));

  // Search 일반제품
  const genResults = genProducts.filter(p => {
    return `${p.code} ${p.model} ${p.description}`.toLowerCase().includes(q);
  }).slice(0, 20).map(p => ({ ...p, _source: 'general' }));

  const combined = [...mwResults, ...genResults].slice(0, 30);

  body.innerHTML = combined.map(p => {
    const srcBadge = p._source === 'milwaukee'
      ? '<span class="badge badge-blue" style="font-size:10px">밀워키</span>'
      : '<span class="badge badge-green" style="font-size:10px">일반</span>';
    const aPrice = p.priceA || 0;
    const naverPrice = p.priceNaver || 0;
    const openPrice = p.priceOpen || 0;
    const cost = p.cost || 0;
    const margin = aPrice > 0 && cost > 0 ? aPrice - cost : 0;
    const marginRate = aPrice > 0 && cost > 0 ? ((margin / aPrice) * 100).toFixed(1) : '-';
    const marginDisplay = margin > 0 ? `${fmt(margin)} (${marginRate}%)` : (margin < 0 ? `<span style="color:#CC2222">${fmt(margin)} (${marginRate}%)</span>` : '-');
    return `<tr>
      <td class="center"><button class="btn-edit" onclick="addEstimateProduct('${p.code}')">견적서 추가</button></td>
      <td class="center">${p.code} ${srcBadge}</td>
      <td class="center" style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.description || '-'}</td>
      <td class="center" style="font-weight:500">${p.model || '-'}</td>
      <td class="num" style="color:#185FA5;font-weight:700">${fmt(aPrice)}</td>
      <td class="num">${naverPrice ? fmt(naverPrice) : '-'}</td>
      <td class="num">${openPrice ? fmt(openPrice) : '-'}</td>
      <td class="num" style="color:#1D9E75">${cost ? fmt(cost) : '-'}</td>
      <td class="num" style="font-size:11px">${marginDisplay}</td>
      <td class="center">-</td>
      <td style="text-align:left;font-size:12px;white-space:nowrap;padding-left:8px">${p.inDate ? '<span style="color:#CC2222;margin-right:4px">●</span>' + p.inDate : '-'}</td>
    </tr>`;
  }).join('');
}

function showEstimateList() {
  renderEstimateList();
  document.getElementById('est-list-modal').classList.add('show');
}

function renderEstimateList() {
  const body = document.getElementById('est-list-body');
  body.innerHTML = estimates.map((e, i) => {
    return `<tr>
      <td class="center" style="font-weight:600">${e.no}</td>
      <td class="center">${e.client || '-'}</td>
      <td class="num" style="font-weight:600">${fmt(e.total || 0)}</td>
      <td class="center">${e.date || '-'}</td>
      <td class="center" style="white-space:nowrap">
        <button class="btn-edit" onclick="openEstimate(${i})">열기</button>
        <button class="btn-danger btn-sm" onclick="deleteEstimate(${i})" style="padding:2px 8px;font-size:11px">삭제</button>
      </td>
    </tr>`;
  }).join('');
  if (!estimates.length) {
    body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>저장된 견적서가 없습니다</p></div></td></tr>';
  }
  document.getElementById('est-list-count').textContent = `${estimates.length}건`;
}

function newEstimate() {
  currentEstIdx = -1;
  currentEstItems = [];
  document.getElementById('est-client').value = '';
  document.getElementById('est-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('est-current-no').textContent = genEstNo();
  renderEstimateItems();
}

function openEstimate(idx) {
  const e = estimates[idx];
  if (!e) return;
  currentEstIdx = idx;
  currentEstItems = JSON.parse(JSON.stringify(e.items || []));
  document.getElementById('est-client').value = e.client || '';
  document.getElementById('est-date').value = e.date || '';
  document.getElementById('est-current-no').textContent = e.no || '';
  document.getElementById('est-list-modal').classList.remove('show');
  renderEstimateItems();
}

function deleteEstimate(idx) {
  if (!confirm('이 견적서를 삭제하시겠습니까?')) return;
  estimates.splice(idx, 1);
  localStorage.setItem('mw_estimates', JSON.stringify(estimates));
  if (currentEstIdx === idx) { currentEstIdx = -1; currentEstItems = []; renderEstimateItems(); }
  renderEstimateList();
  toast('견적서 삭제 완료');
}

function addEstimateProduct(code) {
  const p = findAnyProduct(code);
  if (!p) return;
  if (currentEstItems.some(it => String(it.code) === String(code))) {
    toast('이미 추가된 제품입니다');
    return;
  }
  currentEstItems.push({
    code: String(p.code),
    model: p.model || '',
    description: p.description || '',
    priceA: p.priceA || 0,
    qty: 1,
    memo: ''
  });
  renderEstimateItems();
  toast(`${p.model} 추가 완료`);
}

function removeEstimateItem(idx) {
  currentEstItems.splice(idx, 1);
  renderEstimateItems();
}

function onEstQtyChange(idx, val) {
  currentEstItems[idx].qty = parseInt(val) || 0;
  renderEstimateItems();
}

function onEstMemoChange(idx, val) {
  currentEstItems[idx].memo = val;
}

function renderEstimateItems() {
  const body = document.getElementById('est-body');
  let total = 0;
  body.innerHTML = currentEstItems.map((item, i) => {
    const p = findAnyProduct(item.code);
    const aPrice = item.customPrice != null ? item.customPrice : (p ? p.priceA : (item.priceA || 0));
    const stock = findStock(item.code);
    const qty = item.qty || 0;
    const amount = aPrice * qty;
    const vat = Math.round(amount * 0.1);
    total += amount;
    const stockTxt = stock == null ? '-' : `<span style="color:#CC2222;font-weight:700">${stock}</span>`;
    return `<tr>
      <td class="center"><button class="btn-danger btn-sm" onclick="removeEstimateItem(${i})" style="padding:2px 6px">✕</button></td>
      <td class="center">${item.code}</td>
      <td class="center" style="font-weight:500">${p ? p.model : item.model}</td>
      <td class="center" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p ? p.description : item.description}</td>
      <td class="center"><input type="number" value="${qty || ''}" onchange="onEstQtyChange(${i},this.value)" min="0" style="width:60px;text-align:center"></td>
      <td class="num"><input type="number" value="${aPrice || ''}" onchange="onEstPriceChange(${i},this.value)" min="0" style="width:80px;text-align:right;font-size:12px"></td>
      <td class="num" style="font-weight:600">${amount ? fmt(amount) : '-'}</td>
      <td class="num" style="color:#5A6070">${amount ? fmt(vat) : '-'}</td>
      <td class="center"><input value="${item.memo || ''}" onchange="onEstMemoChange(${i},this.value)" style="width:60px;font-size:12px;text-align:center"></td>
      <td class="center"><input value="${item.shipCompany || ''}" onchange="currentEstItems[${i}].shipCompany=this.value" style="width:70px;font-size:12px;text-align:center" placeholder=""></td>
      <td class="num"><input type="number" value="${item.shipCost || ''}" onchange="currentEstItems[${i}].shipCost=parseInt(this.value)||0" min="0" style="width:70px;text-align:right;font-size:12px" placeholder=""></td>
      <td class="center">${stockTxt}</td>
    </tr>`;
  }).join('');
  if (!currentEstItems.length) {
    body.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#9BA3B2;padding:20px">제품을 검색하여 추가하세요</td></tr>';
  }
  const totalVat = Math.round(total * 0.1);
  document.getElementById('est-total').innerHTML = `${fmt(total)} <span style="font-size:13px;color:#5A6070;font-weight:400">+</span> <span style="font-size:14px;color:#5A6070">부가세 ${fmt(totalVat)}</span> <span style="font-size:13px;color:#5A6070;font-weight:400">=</span> <span style="font-size:18px;color:#CC2222">토탈 ${fmt(total + totalVat)}</span>`;
}

function onEstPriceChange(idx, val) {
  currentEstItems[idx].customPrice = parseInt(val) || 0;
  renderEstimateItems();
}

function saveEstimate() {
  const no = document.getElementById('est-current-no').textContent;
  const client = document.getElementById('est-client').value.trim();
  const date = document.getElementById('est-date').value;
  if (!client) { toast('거래처를 입력해주세요'); return; }

  let total = 0;
  currentEstItems.forEach(item => {
    const p = findAnyProduct(item.code);
    const aPrice = p ? p.priceA : (item.priceA || 0);
    total += aPrice * (item.qty || 0);
  });

  const estData = { no, client, date, total, items: JSON.parse(JSON.stringify(currentEstItems)) };

  if (currentEstIdx >= 0) {
    estimates[currentEstIdx] = estData;
  } else {
    estimates.push(estData);
    currentEstIdx = estimates.length - 1;
  }
  localStorage.setItem('mw_estimates', JSON.stringify(estimates));
  renderEstimateList();
  toast('견적서 저장 완료');
}

function previewEstimatePdf() {
  const no = document.getElementById('est-current-no').textContent;
  const client = document.getElementById('est-client').value.trim();
  const date = document.getElementById('est-date').value;
  if (!client) { toast('거래처를 입력해주세요'); return; }

  let total = 0;
  let hasShipping = false;
  let shippingRows = '';
  const rows = currentEstItems.filter(it => it.qty > 0).map((item, i) => {
    const p = findAnyProduct(item.code);
    const aPrice = item.customPrice != null ? item.customPrice : (p ? p.priceA : (item.priceA || 0));
    const amount = aPrice * item.qty;
    const vat = Math.round(amount * 0.1);
    total += amount;
    if (item.shipCost > 0) {
      hasShipping = true;
      shippingRows += `<tr>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center" colspan="4">택배비 (${item.shipCompany || '-'})</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">1</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:right">${fmt(item.shipCost)}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:right;font-weight:600">${fmt(item.shipCost)}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:right;color:#5A6070">${fmt(Math.round(item.shipCost * 0.1))}</td>
      </tr>`;
      total += item.shipCost;
    }
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">${i+1}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">${item.code}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;font-weight:500">${p ? p.model : item.model}</td>
      <td style="padding:6px 8px;border:1px solid #ccc">${p ? p.description : item.description}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">${item.qty}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:right">${fmt(aPrice)}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:right;font-weight:600">${fmt(amount)}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:right;color:#5A6070">${fmt(vat)}</td>
    </tr>`;
  }).join('');

  const totalVat = Math.round(total * 0.1);
  const shippingMessage = hasShipping ? '' : `<div style="background:#FFF8E8;border:1px solid #EF9F27;border-radius:4px;padding:10px 14px;margin-bottom:20px;font-size:13px;font-weight:600;color:#8B6914;text-align:center">※ 모든 제품은 택배비가 별도입니다.</div>`;

  const html = `
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="font-size:24px;margin:0 0 4px">견 적 서</h1>
      <p style="font-size:12px;color:#888">본 견적서는 발행일로부터 10일 이내 유효합니다.</p>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px">
      <div>
        <table style="border-collapse:collapse">
          <tr><td style="padding:4px 12px;font-weight:600;background:#f5f5f5;border:1px solid #ccc">견적번호</td><td style="padding:4px 12px;border:1px solid #ccc">${no}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:600;background:#f5f5f5;border:1px solid #ccc">공급받는자</td><td style="padding:4px 12px;border:1px solid #ccc;font-weight:700">${client}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:600;background:#f5f5f5;border:1px solid #ccc">견적일자</td><td style="padding:4px 12px;border:1px solid #ccc">${date}</td></tr>
        </table>
      </div>
      <div style="text-align:right">
        <table style="border-collapse:collapse">
          <tr><td style="padding:4px 12px;font-weight:600;background:#f5f5f5;border:1px solid #ccc">합계금액</td><td style="padding:4px 12px;border:1px solid #ccc;font-weight:700;font-size:16px;color:#185FA5">${fmt(total)}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:600;background:#f5f5f5;border:1px solid #ccc">부가세(10%)</td><td style="padding:4px 12px;border:1px solid #ccc">${fmt(totalVat)}</td></tr>
          <tr><td style="padding:4px 12px;font-weight:600;background:#f5f5f5;border:1px solid #ccc">총계(VAT포함)</td><td style="padding:4px 12px;border:1px solid #ccc;font-weight:700">${fmt(total + totalVat)}</td></tr>
        </table>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px">
      <thead>
        <tr style="background:#1A1D23;color:white">
          <th style="padding:8px;border:1px solid #ccc">No</th>
          <th style="padding:8px;border:1px solid #ccc">코드</th>
          <th style="padding:8px;border:1px solid #ccc">모델 및 품명</th>
          <th style="padding:8px;border:1px solid #ccc">제품설명 및 규격</th>
          <th style="padding:8px;border:1px solid #ccc">수량</th>
          <th style="padding:8px;border:1px solid #ccc">단가</th>
          <th style="padding:8px;border:1px solid #ccc">합계금액</th>
          <th style="padding:8px;border:1px solid #ccc">부가세</th>
        </tr>
      </thead>
      <tbody>${rows}${shippingRows}</tbody>
      <tfoot>
        <tr style="background:#f5f5f5;font-weight:700">
          <td colspan="6" style="padding:8px;border:1px solid #ccc;text-align:right">합 계</td>
          <td style="padding:8px;border:1px solid #ccc;text-align:right">${fmt(total)}</td>
          <td style="padding:8px;border:1px solid #ccc;text-align:right">${fmt(totalVat)}</td>
        </tr>
      </tfoot>
    </table>
    ${shippingMessage}
    <div style="border-top:2px solid #1A1D23;padding-top:14px;font-size:12px;color:#555">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#222">공급자</div>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:3px 10px;width:100px;font-weight:600;background:#f9f9f9;border:1px solid #ddd">업체명</td><td style="padding:3px 10px;border:1px solid #ddd;font-weight:700">(주)대한종합상사</td><td style="padding:3px 10px;width:80px;font-weight:600;background:#f9f9f9;border:1px solid #ddd">대표</td><td style="padding:3px 10px;border:1px solid #ddd">최병우</td></tr>
        <tr><td style="padding:3px 10px;font-weight:600;background:#f9f9f9;border:1px solid #ddd">소재지</td><td colspan="3" style="padding:3px 10px;border:1px solid #ddd">경기도 양주시 백석읍 부흥로 1110</td></tr>
        <tr><td style="padding:3px 10px;font-weight:600;background:#f9f9f9;border:1px solid #ddd">업태</td><td style="padding:3px 10px;border:1px solid #ddd">도소매</td><td style="padding:3px 10px;font-weight:600;background:#f9f9f9;border:1px solid #ddd">종목</td><td style="padding:3px 10px;border:1px solid #ddd">공구 및 철물</td></tr>
        <tr><td style="padding:3px 10px;font-weight:600;background:#f9f9f9;border:1px solid #ddd">TEL</td><td style="padding:3px 10px;border:1px solid #ddd">031-871-0945</td><td style="padding:3px 10px;font-weight:600;background:#f9f9f9;border:1px solid #ddd">FAX</td><td style="padding:3px 10px;border:1px solid #ddd">031-871-0944</td></tr>
        <tr><td style="padding:3px 10px;font-weight:600;background:#f9f9f9;border:1px solid #ddd">이메일</td><td colspan="3" style="padding:3px 10px;border:1px solid #ddd">0945Daehan@naver.com</td></tr>
      </table>
    </div>
  `;

  document.getElementById('est-pdf-content').innerHTML = html;
  document.getElementById('est-pdf-modal').classList.add('show');
}

function downloadEstimatePdf() {
  const content = document.getElementById('est-pdf-content');
  const no = document.getElementById('est-current-no').textContent;
  const client = document.getElementById('est-client').value.trim();

  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>견적서_${no}_${client}</title>
    <style>
      body { font-family: Pretendard, 'Malgun Gothic', sans-serif; margin: 30px; color: #222; }
      @media print { body { margin: 15px; } }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    </style></head><body>${content.innerHTML}</body></html>`);
  printWin.document.close();
  setTimeout(() => { printWin.print(); }, 500);
}

// ======================== TAB 5: 세트및분해 ========================
const PARTS_KEYS = ['M12B2','M12HB25','M12B4','M12HB5','M18B2','M18HB3','M18B5','M18FB6','M18FB8','M18FB12','C12C','M1218C','M1218FC'];
const PARTS_LABELS = {'M12B2':'M12 B2','M12HB25':'M12 HB2.5','M12B4':'M12 B4','M12HB5':'M12 HB5','M18B2':'M18 B2','M18HB3':'M18 HB3','M18B5':'M18 B5','M18FB6':'M18 FB6','M18FB8':'M18 FB8','M18FB12':'M18 FB12','C12C':'C12C','M1218C':'M12-18C','M1218FC':'M12-18FC'};

let partsPrices = loadObj('mw_parts_prices', {});
let setbunItems = loadObj('mw_setbun_items', []);

function formatPartsInput(el) {
  const raw = el.value.replace(/[^0-9]/g, '');
  el.value = raw ? parseInt(raw).toLocaleString() : '';
}

function loadPartsPricesUI() {
  PARTS_KEYS.forEach(k => {
    const el = document.getElementById('pp-' + k);
    if (el && partsPrices[k]) el.value = partsPrices[k].toLocaleString();
  });
}

function savePartsPrices() {
  PARTS_KEYS.forEach(k => {
    const el = document.getElementById('pp-' + k);
    if (el) partsPrices[k] = parseInt(el.value.replace(/,/g, '')) || 0;
  });
  localStorage.setItem('mw_parts_prices', JSON.stringify(partsPrices));
  renderSetbun();
  toast('배터리/충전기 시세 저장 완료');
}

function getPartPrice(key) { return partsPrices[key] || 0; }

function addSetbunItem() {
  document.getElementById('setbun-edit-title').textContent = '세트 분해 분석 추가';
  document.getElementById('sb-edit-idx').value = -1;
  document.getElementById('sb-set-code').value = '';
  document.getElementById('sb-bare-code').value = '';
  document.getElementById('sb-set-model-input').value = '';
  document.getElementById('sb-set-info').textContent = '-';
  document.getElementById('sb-bare-info').textContent = '베어툴: 세트 제품을 먼저 선택하세요';
  document.getElementById('sb-bare-candidates').style.display = 'none';
  document.getElementById('sb-promo').value = '';
  document.getElementById('sb-promo-cost').value = '';
  sbUpdateBatteryOptions('');
  document.getElementById('setbun-edit-modal').classList.add('show');
}

function closeSetbunModal() { document.getElementById('setbun-edit-modal').classList.remove('show'); }

function sbSelectSet(code) {
  const p = findProduct(code);
  if (!p) return;
  document.getElementById('sb-set-code').value = code;
  document.getElementById('sb-set-model-input').value = p.model || '';
  document.getElementById('sb-set-info').innerHTML = `<span style="font-weight:600">${p.model}</span> — ${p.description || ''}<br><span style="color:#1D9E75">원가: ${fmt(p.cost)}</span> / 공급가: ${fmt(p.supplyPrice)} / 코드: ${code}`;

  // Detect M12 or M18
  const series = (p.model || '').startsWith('M18') || (p.model || '').startsWith('C18') ? 'M18' : 'M12';
  sbUpdateBatteryOptions(series);

  // Auto-recommend bare tools
  const baseModel = (p.model || '').replace(/[-]\S*$/, ''); // M12 FID2
  if (baseModel) {
    const bareSuffixes = ['-0', '-0X', '-0X0', '-0B', '-0C', '-0C0'];
    const candidates = DB.products.filter(bp => {
      if (!bp.model) return false;
      const bpBase = bp.model.replace(/[-]\S*$/, '');
      if (bpBase !== baseModel) return false;
      return bareSuffixes.some(s => bp.model.endsWith(s)) || bp.model.includes('-0');
    });

    const listEl = document.getElementById('sb-bare-list');
    if (candidates.length > 0) {
      document.getElementById('sb-bare-candidates').style.display = 'block';
      listEl.innerHTML = candidates.map(bp => {
        return `<button class="btn-action" onclick="sbSelectBare('${bp.code}')" style="padding:4px 10px;font-size:12px">${bp.model} <span style="color:#1D9E75;font-size:11px">${fmt(bp.cost)}</span></button>`;
      }).join('');
    } else {
      document.getElementById('sb-bare-candidates').style.display = 'block';
      listEl.innerHTML = '<span style="color:#9BA3B2;font-size:12px">추천 베어툴 없음 — 아래에서 직접 검색하세요</span>';
    }
  }
}

function sbSelectBare(code) {
  const p = findProduct(code);
  if (!p) return;
  document.getElementById('sb-bare-code').value = code;
  document.getElementById('sb-bare-info').innerHTML = `<span style="font-weight:600">${p.model}</span> — ${p.description || ''}<br><span style="color:#1D9E75">원가: ${fmt(p.cost)}</span> / 공급가: ${fmt(p.supplyPrice)} / 코드: ${code}`;
  // Highlight selected button
  document.querySelectorAll('#sb-bare-list button').forEach(btn => {
    btn.style.background = btn.textContent.includes(p.model) ? '#E6F1FB' : '';
    btn.style.borderColor = btn.textContent.includes(p.model) ? '#185FA5' : '';
  });
}

function sbUpdateBatteryOptions(series) {
  const bat1 = document.getElementById('sb-bat1');
  const bat2 = document.getElementById('sb-bat2');
  const charger = document.getElementById('sb-charger');
  const prevBat1 = bat1.value, prevBat2 = bat2.value, prevCharger = charger.value;

  let batOptions = '<option value="">없음</option>';
  let chargerOptions = '<option value="">없음</option>';

  if (series === 'M12') {
    batOptions += '<option value="M12B2">M12 B2 (2.0Ah)</option><option value="M12HB25">M12 HB2.5 (2.5Ah)</option><option value="M12B4">M12 B4 (4.0Ah)</option><option value="M12HB5">M12 HB5 (5.0Ah)</option>';
    chargerOptions += '<option value="C12C">C12C (12V 전용)</option>';
  } else if (series === 'M18') {
    batOptions += '<option value="M18B2">M18 B2 (2.0Ah)</option><option value="M18HB3">M18 HB3 (3.0Ah)</option><option value="M18B5">M18 B5 (5.0Ah)</option><option value="M18FB6">M18 FB6 (FORGE 6Ah)</option><option value="M18FB8">M18 FB8 (FORGE 8Ah)</option><option value="M18FB12">M18 FB12 (FORGE 12Ah)</option>';
    chargerOptions += '<option value="M1218C">M12-18C (멀티)</option><option value="M1218FC">M12-18FC (급속)</option>';
  } else {
    // Show all if no series detected
    batOptions += '<option value="M12B2">M12 B2 (2.0Ah)</option><option value="M12HB25">M12 HB2.5 (2.5Ah)</option><option value="M12B4">M12 B4 (4.0Ah)</option><option value="M12HB5">M12 HB5 (5.0Ah)</option>';
    batOptions += '<option value="M18B2">M18 B2 (2.0Ah)</option><option value="M18HB3">M18 HB3 (3.0Ah)</option><option value="M18B5">M18 B5 (5.0Ah)</option><option value="M18FB6">M18 FB6 (FORGE 6Ah)</option><option value="M18FB8">M18 FB8 (FORGE 8Ah)</option><option value="M18FB12">M18 FB12 (FORGE 12Ah)</option>';
    chargerOptions += '<option value="C12C">C12C (12V 전용)</option><option value="M1218C">M12-18C (멀티)</option><option value="M1218FC">M12-18FC (급속)</option>';
  }

  bat1.innerHTML = batOptions;
  bat2.innerHTML = batOptions;
  charger.innerHTML = chargerOptions;
  // Restore previous values if still valid
  bat1.value = prevBat1; bat2.value = prevBat2; charger.value = prevCharger;
}

function editSetbunItem(idx) {
  const item = setbunItems[idx];
  if (!item) return;
  document.getElementById('setbun-edit-title').textContent = '세트 분해 분석 수정';
  document.getElementById('sb-edit-idx').value = idx;
  document.getElementById('sb-set-code').value = item.setCode || '';
  document.getElementById('sb-bare-code').value = item.bareCode || '';
  document.getElementById('sb-promo').value = item.promo || '';
  document.getElementById('sb-promo-cost').value = item.promoCost || '';

  // Fill set info
  const setP = findProduct(item.setCode);
  if (setP) {
    document.getElementById('sb-set-model-input').value = setP.model || '';
    document.getElementById('sb-set-info').innerHTML = `<span style="font-weight:600">${setP.model}</span> — ${setP.description || ''}<br><span style="color:#1D9E75">원가: ${fmt(setP.cost)}</span> / 공급가: ${fmt(setP.supplyPrice)} / 코드: ${item.setCode}`;
    const series = (setP.model || '').startsWith('M18') ? 'M18' : 'M12';
    sbUpdateBatteryOptions(series);
  } else {
    document.getElementById('sb-set-model-input').value = '';
    sbUpdateBatteryOptions('');
  }

  // Fill bare info
  const bareP = findProduct(item.bareCode);
  if (bareP) {
    document.getElementById('sb-bare-info').innerHTML = `<span style="font-weight:600">${bareP.model}</span> — ${bareP.description || ''}<br><span style="color:#1D9E75">원가: ${fmt(bareP.cost)}</span> / 공급가: ${fmt(bareP.supplyPrice)} / 코드: ${item.bareCode}`;
  }
  document.getElementById('sb-bare-candidates').style.display = 'none';

  document.getElementById('sb-bat1').value = item.bat1 || '';
  document.getElementById('sb-bat2').value = item.bat2 || '';
  document.getElementById('sb-charger').value = item.charger || '';
  document.getElementById('setbun-edit-modal').classList.add('show');
}

function saveSetbunItem() {
  const idx = parseInt(document.getElementById('sb-edit-idx').value);
  const item = {
    setCode: document.getElementById('sb-set-code').value.trim(),
    bareCode: document.getElementById('sb-bare-code').value.trim(),
    bat1: document.getElementById('sb-bat1').value,
    bat2: document.getElementById('sb-bat2').value,
    charger: document.getElementById('sb-charger').value,
    promo: document.getElementById('sb-promo').value.trim(),
    promoCost: parseInt(document.getElementById('sb-promo-cost').value) || 0
  };

  if (!item.setCode) { toast('세트 제품을 선택해주세요'); return; }
  if (!item.bareCode) { toast('베어툴을 선택해주세요'); return; }

  if (idx >= 0) {
    setbunItems[idx] = item;
  } else {
    setbunItems.push(item);
  }
  localStorage.setItem('mw_setbun_items', JSON.stringify(setbunItems));
  closeSetbunModal();
  renderSetbun();
  toast(idx >= 0 ? '분석 수정 완료' : '분석 추가 완료');
}

function deleteSetbunItem(idx) {
  if (!confirm('이 분석 항목을 삭제하시겠습니까?')) return;
  setbunItems.splice(idx, 1);
  localStorage.setItem('mw_setbun_items', JSON.stringify(setbunItems));
  renderSetbun();
  toast('삭제 완료');
}

function calcSetbun(item) {
  const setP = findProduct(item.setCode);
  const bareP = findProduct(item.bareCode);
  const setCost = item.promoCost > 0 ? item.promoCost : (setP ? setP.cost : 0);
  const bareCost = bareP ? bareP.cost : 0;

  const bat1Price = getPartPrice(item.bat1);
  const bat2Price = getPartPrice(item.bat2);
  const chargerPrice = getPartPrice(item.charger);
  const partsTotal = bat1Price + bat2Price + chargerPrice;

  const disassembledCost = setCost - partsTotal;
  const diff = bareCost - disassembledCost;
  const verdict = diff > 0 ? '세트발주' : '베어툴발주';

  return { setP, bareP, setCost, bareCost, bat1Price, bat2Price, chargerPrice, partsTotal, disassembledCost, diff, verdict };
}

function renderSetbun() {
  const body = document.getElementById('setbun-body');
  body.innerHTML = setbunItems.map((item, i) => {
    const r = calcSetbun(item);
    const isSet = r.diff > 0;
    const verdictStyle = isSet ? 'background:#E6F9F1;color:#1D9E75;font-weight:700' : 'background:#FCEBEB;color:#CC2222;font-weight:700';
    const bat1Label = item.bat1 ? PARTS_LABELS[item.bat1] : '-';
    const bat2Label = item.bat2 ? PARTS_LABELS[item.bat2] : '-';
    const chargerLabel = item.charger ? PARTS_LABELS[item.charger] : '-';

    return `<tr>
      <td style="white-space:nowrap;text-align:center">
        <button class="btn-edit" onclick="editSetbunItem(${i})">수정</button>
        <button class="btn-danger btn-sm" onclick="deleteSetbunItem(${i})" style="padding:2px 6px;font-size:11px">삭제</button>
      </td>
      <td class="center">${item.setCode}</td>
      <td class="center" style="font-weight:500">${r.setP ? r.setP.model : '-'}</td>
      <td class="num" style="color:#1D9E75">${fmt(r.setCost)}</td>
      <td class="center">${item.bareCode}</td>
      <td class="center" style="font-weight:500">${r.bareP ? r.bareP.model : '-'}</td>
      <td class="num" style="color:#1D9E75">${fmt(r.bareCost)}</td>
      <td class="center" style="font-size:11px">${bat1Label}<br><span style="color:#5A6070">${r.bat1Price ? fmt(r.bat1Price) : '-'}</span></td>
      <td class="center" style="font-size:11px">${bat2Label}<br><span style="color:#5A6070">${r.bat2Price ? fmt(r.bat2Price) : '-'}</span></td>
      <td class="center" style="font-size:11px">${chargerLabel}<br><span style="color:#5A6070">${r.chargerPrice ? fmt(r.chargerPrice) : '-'}</span></td>
      <td class="num" style="font-weight:600">${fmt(r.partsTotal)}</td>
      <td class="num" style="font-weight:600">${fmt(r.disassembledCost)}</td>
      <td class="num" style="font-weight:700;${isSet ? 'color:#1D9E75' : 'color:#CC2222'}">${r.diff > 0 ? '+' : ''}${fmt(r.diff)}</td>
      <td class="center" style="font-size:11px">${item.promo || '-'}</td>
      <td style="${verdictStyle};text-align:center">${r.verdict}</td>
    </tr>`;
  }).join('');

  if (!setbunItems.length) {
    body.innerHTML = '<tr><td colspan="15"><div class="empty-state"><p>분석 항목이 없습니다</p><button class="btn-action" onclick="addSetbunItem()">+ 분석 추가</button></div></td></tr>';
  }
  document.getElementById('setbun-count').textContent = `${setbunItems.length}건`;
}

// ======================== MODAL DRAG ========================
function makeModalDraggable(modalBgId) {
  const modalBg = document.getElementById(modalBgId);
  if (!modalBg) return;
  const modal = modalBg.querySelector('.modal');
  const header = modalBg.querySelector('.modal-header');
  if (!modal || !header) return;

  header.style.cursor = 'move';
  header.style.userSelect = 'none';

  let isDragging = false, startX, startY, initialX, initialY;

  header.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('modal-close')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = modal.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    modal.style.position = 'fixed';
    modal.style.margin = '0';
    modal.style.left = initialX + 'px';
    modal.style.top = initialY + 'px';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    modal.style.left = (initialX + dx) + 'px';
    modal.style.top = (initialY + dy) + 'px';
  });

  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';
    }
  });

  const observer = new MutationObserver(function() {
    if (!modalBg.classList.contains('show')) {
      modal.style.position = '';
      modal.style.left = '';
      modal.style.top = '';
      modal.style.margin = '';
    }
  });
  observer.observe(modalBg, { attributes: true, attributeFilter: ['class'] });
}

// ======================== INIT ========================
function init() {
  populateCatalogFilters();
  renderCatalog();
  updateStatus();
  // Populate sales fee rates from stored settings
  document.getElementById('sales-vat').value = ((DB.settings.vat || 0.1) * 100).toFixed(1);
  document.getElementById('sales-naver-fee').value = ((DB.settings.naverFee || 0.059) * 100).toFixed(1);
  document.getElementById('sales-open-elec-fee').value = ((DB.settings.openElecFee || 0.13) * 100).toFixed(1);
  document.getElementById('sales-open-hand-fee').value = ((DB.settings.openHandFee || 0.176) * 100).toFixed(1);
  initPromoMonths();
  loadPartsPricesUI();
  renderSetbun();
  renderEstimateList();
  renderGenProducts();
  renderAllPromosV2();
  initStickyHeader('catalog-table');
  makeModalDraggable('settings-modal');
  makeModalDraggable('order-settings-modal');
  makeModalDraggable('order-history-modal');
  makeModalDraggable('po-history-modal');
  (function() {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const recent = orderHistory.filter(r => (now - new Date(r.date).getTime()) < weekMs);
    if (recent.length) updateOrderSheetButtons(true);
    const recentPo = poHistory.filter(r => (now - new Date(r.date).getTime()) < weekMs);
    if (recentPo.length) updatePoSheetButtons(true);
  })();
}

// ======================== 관리: 서브탭 전환 ========================
function switchManageSub(type) {
  document.querySelectorAll('.manage-tab-content').forEach(function(el) { el.style.display = 'none'; });
  document.querySelectorAll('#manage-sub-tabs .sub-tab').forEach(function(btn) { btn.classList.remove('active'); });
  document.getElementById('manage-' + type).style.display = 'block';
  event.target.classList.add('active');
  if (type === 'fee') loadFeeSettings();
}

// ======================== 관리: 수수료 설정 ========================
function loadFeeSettings() {
  var s = DB.settings;
  // 부가세
  var vatMode = s.feeVatMode || 'incl';
  document.getElementById('fee-vat-incl').className = vatMode === 'incl' ? 'btn-action' : 'btn-sub-inactive';
  document.getElementById('fee-vat-excl').className = vatMode === 'excl' ? 'btn-action' : 'btn-sub-inactive';
  // 네이버
  document.getElementById('fee-naver-sale').value = s.naverSaleRate || 3.0;
  document.getElementById('fee-naver-pay').value = s.naverPayRate || 3.63;
  updateNaverTotal();
  // 쿠팡
  document.getElementById('fee-coupang-sale').value = s.coupangFee || 10.8;
  document.getElementById('fee-coupang-logi').value = s.coupangLogi || 2800;
  // 오픈마켓
  document.getElementById('fee-open-elec').value = ((s.openElecFee || 0.13) * 100).toFixed(1);
  document.getElementById('fee-open-hand').value = ((s.openHandFee || 0.176) * 100).toFixed(1);
}

function updateNaverTotal() {
  var sale = parseFloat(document.getElementById('fee-naver-sale').value) || 0;
  var pay = parseFloat(document.getElementById('fee-naver-pay').value) || 0;
  document.getElementById('fee-naver-total').textContent = (sale + pay).toFixed(2) + '%';
}

function applyCoupangPreset(val) {
  if (!val) return;
  document.getElementById('fee-coupang-sale').value = val;
}

function setFeeVat(mode) {
  document.getElementById('fee-vat-incl').className = mode === 'incl' ? 'btn-action' : 'btn-sub-inactive';
  document.getElementById('fee-vat-excl').className = mode === 'excl' ? 'btn-action' : 'btn-sub-inactive';
}

function saveFeeSettings() {
  // 부가세
  DB.settings.feeVatMode = document.getElementById('fee-vat-incl').className.includes('btn-action') ? 'incl' : 'excl';
  // 네이버
  var sale = parseFloat(document.getElementById('fee-naver-sale').value) || 3.0;
  var pay = parseFloat(document.getElementById('fee-naver-pay').value) || 3.63;
  DB.settings.naverSaleRate = sale;
  DB.settings.naverPayRate = pay;
  DB.settings.naverFee = (sale + pay) / 100;
  // 쿠팡
  DB.settings.coupangFee = parseFloat(document.getElementById('fee-coupang-sale').value) || 10.8;
  DB.settings.coupangLogi = parseInt(document.getElementById('fee-coupang-logi').value) || 2800;
  // 오픈마켓
  DB.settings.openElecFee = (parseFloat(document.getElementById('fee-open-elec').value) || 13) / 100;
  DB.settings.openHandFee = (parseFloat(document.getElementById('fee-open-hand').value) || 17.6) / 100;
  save(KEYS.settings, DB.settings);
  toast('수수료 설정 저장 완료');
}

init();
