/* ============================================================
   الإخوة ستور — دوال وبيانات مشتركة
   مرتبط فعليًا بالخادم (Google Apps Script) عبر Cloudflare Worker.
   ============================================================ */

// رابط الوسيط (Cloudflare Worker) الذي يمرّر الطلبات لخادم GAS
// ملاحظة: رابط GAS نفسه لم يعد مكتوبًا هنا — هو مكتوب داخل كود الـ Worker
// على Cloudflare (وتم تحديثه هناك بعد نشر نسخة GAS الجديدة).
const PROXY_URL = "https://ikhwastore-proxy.isgrop2026.workers.dev/";

// نفس المفتاح المكتوب في كود GAS (SECRET_KEY) — يجب أن يتطابقا دائمًا
const SECRET_KEY = "IKHWA_SECRET_2026";

// تحويل اسم الشيت إلى اسم الإجراء المتوقع في GAS
const ACTION_MAP = {
  "Sales": "addSale",
  "Purchases": "addPurchase",
  "Expenses": "addExpense",
  "Withdrawals": "addWithdrawal",
  "GeneralFinance": "addFinance"
};

// المجالات الثلاثة وأصنافها — مرجع مركزي واحد لكل النماذج
const CATEGORIES = {
  "الإكسسوارات": ["جراب", "ستيكر", "شاحن", "وصلة", "سماعة", "باوربانك"],
  "التلفونات": ["جهاز"],
  "الصيانة والسكند": ["صيانة", "سكند"]
};

const DOMAIN_TAG_CLASS = {
  "الإكسسوارات": "tag-domain-acc",
  "التلفونات": "tag-domain-phone",
  "الصيانة والسكند": "tag-domain-service"
};

// -------- تنسيق الأرقام والتاريخ --------
function formatMoney(value){
  const n = Number(value) || 0;
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function todayISO(){
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function todayReadable(){
  const d = new Date();
  return d.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// -------- تعبئة القوائم المنسدلة للمجال والصنف --------
function populateDomainSelect(selectEl){
  selectEl.innerHTML = '<option value="" disabled selected>اختر المجال</option>';
  Object.keys(CATEGORIES).forEach(domain => {
    const opt = document.createElement("option");
    opt.value = domain;
    opt.textContent = domain;
    selectEl.appendChild(opt);
  });
}

function populateItemSelect(selectEl, domain){
  selectEl.innerHTML = "";
  if(!domain || !CATEGORIES[domain]){
    selectEl.innerHTML = '<option value="" disabled selected>اختر المجال أولًا</option>';
    selectEl.disabled = true;
    return;
  }
  selectEl.disabled = false;
  selectEl.innerHTML = '<option value="" disabled selected>اختر الصنف</option>';
  CATEGORIES[domain].forEach(item => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    selectEl.appendChild(opt);
  });
}

// -------- زر اختيار طريقة الدفع (كاش / بنك) --------
function initPayToggle(container){
  const options = container.querySelectorAll(".pay-option");
  options.forEach(opt => {
    opt.addEventListener("click", () => {
      options.forEach(o => o.classList.remove("checked"));
      opt.classList.add("checked");
      opt.querySelector("input").checked = true;
    });
  });
}

// -------- بطاقة تنبيه بحالة الربط بالخادم --------
function renderSyncNote(mountEl, message){
  const note = document.createElement("div");
  note.className = "sync-note";
  note.innerHTML = `<span class="dot"></span><span>${message}</span>`;
  mountEl.prepend(note);
}

// -------- رسالة حالة سريعة أسفل النموذج (نجاح / فشل الحفظ) --------
function showFormStatus(mountEl, ok, message){
  let el = mountEl.querySelector(".form-status");
  if(!el){
    el = document.createElement("p");
    el.className = "form-status";
    el.style.fontSize = "13px";
    el.style.marginTop = "10px";
    el.style.textAlign = "left";
    mountEl.appendChild(el);
  }
  el.style.color = ok ? "var(--income)" : "var(--expense)";
  el.textContent = message;
}

// -------- الاتصال الفعلي بالخادم عبر الوسيط --------
const SESSION_ERROR_TEXT = "الجلسة غير صالحة أو انتهت، سجّل الدخول من جديد";

async function callServer(action, payload){
  try{
    const body = { key: SECRET_KEY, action, ...payload };
    if(action !== "googleLogin"){
      body.token = getTokenParam();
    }
    const res = await fetch(PROXY_URL, {
      method: "POST",
      body: JSON.stringify(body)
    });
    const result = await res.json();

    if(!result.ok && result.error === SESSION_ERROR_TEXT){
      clearSession();
      window.location.replace("index.html");
      return result;
    }

    return result;
  }catch(err){
    console.error("فشل الاتصال بالخادم:", err);
    return { ok: false, error: "تعذّر الوصول للخادم — تحقق من الاتصال بالإنترنت" };
  }
}

async function saveToBackend(sheetName, payload){
  const action = ACTION_MAP[sheetName];
  return callServer(action, payload);
}

async function checkSessionOnServer(){
  return callServer("checkSession", {});
}

// -------- حارس الجلسة: يطرد أي زائر بدون جلسة سارية فورًا --------
async function enforceSession(){
  const token = getTokenParam();
  if(!token){
    window.location.replace("index.html");
    return false;
  }
  const result = await checkSessionOnServer();
  if(!result.ok || !result.valid){
    clearSession();
    window.location.replace("index.html");
    return false;
  }
  return true;
}

// -------- عناصر التنقل الأساسية --------
const NAV_ITEMS = [
  { key: "dashboard",  href: "dashboard.html",  icon: "▤", label: "الرئيسية" },
  { key: "sales",      href: "sales.html",      icon: "▾", label: "المبيعات" },
  { key: "purchases",  href: "purchases.html",  icon: "▴", label: "المشتريات" },
  { key: "summary",    href: "summary.html",    icon: "Σ", label: "الملخص اليومي" },
  { key: "finance",    href: "finance.html",    icon: "◈", label: "المالي العام" }
];

function getEmailParam(){
  return localStorage.getItem("ikhwa_email") || "";
}

function getTokenParam(){
  return localStorage.getItem("ikhwa_token") || "";
}

function saveSession(email, token){
  localStorage.setItem("ikhwa_email", email);
  localStorage.setItem("ikhwa_token", token);
}

function clearSession(){
  localStorage.removeItem("ikhwa_email");
  localStorage.removeItem("ikhwa_token");
}

function logout(){
  clearSession();
  window.location.href = "index.html";
}

function renderShell(activeKey, userEmail){
  const sidebarMount = document.getElementById("sidebar-mount");
  const bottomMount = document.getElementById("bottomnav-mount");
  const email = userEmail || getEmailParam();

  if(!document.getElementById("apkBadge")){
    const badge = document.createElement("a");
    badge.id = "apkBadge";
    badge.className = "apk-badge";
    badge.href = "https://github.com/ikhwa-store/alekhwa-store-dashboard/releases/latest/download/ikhwa-store.apk";
    badge.target = "_blank";
    badge.rel = "noopener";
    badge.innerHTML = "⬇ تحميل التطبيق";
    document.body.appendChild(badge);
  }

  if(sidebarMount){
    const links = NAV_ITEMS.map(item => `
      <a class="nav-link ${item.key === activeKey ? "active" : ""}" href="${item.href}">
        <span class="ic">${item.icon}</span><span>${item.label}</span>
      </a>`).join("");

    sidebarMount.innerHTML = `
      <div class="brand">
        <div class="brand-mark">إ</div>
        <div class="brand-text">
          <strong>الإخوة ستور</strong>
          <span>حسابات المحل</span>
        </div>
      </div>
      <div class="nav-group">
        <span class="nav-label">القوائم</span>
        ${links}
      </div>
      <div class="sidebar-footer">
        <div class="user-chip"><span class="user-dot"></span><span>${email || "غير مسجّل"}</span></div>
        <a class="logout-link" href="#" onclick="logout(); return false;">تسجيل الخروج</a>
      </div>
    `;
  }

  if(bottomMount){
    const links = NAV_ITEMS.map(item => `
      <a class="${item.key === activeKey ? "active" : ""}" href="${item.href}">
        <span class="ic">${item.icon}</span><span>${item.label}</span>
      </a>`).join("");
    bottomMount.innerHTML = links + `
      <a href="#" onclick="logout(); return false;">
        <span class="ic">⏻</span><span>خروج</span>
      </a>`;
  }
}

