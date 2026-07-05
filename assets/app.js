/* ============================================================
   الإخوة ستور — دوال وبيانات مشتركة
   ملاحظة: هذه المرحلة (الواجهة فقط) تعمل بذاكرة المتصفح داخل كل صفحة.
   عند بناء الخادم (Google Apps Script) سيتم استبدال saveToBackend()
   واستدعاءات fetchFromBackend() بربط فعلي، دون تغيير في تصميم الواجهة.
   ============================================================ */

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

// -------- نقطة الاتصال بالخادم لاحقًا (Google Apps Script) --------
// عند بناء الخادم، تُستبدل هذه الدالة بنداء fetch فعلي على رابط GAS
// (بنفس نمط lavndr120-proxy عبر Cloudflare Worker) دون تعديل واجهات النماذج.
async function saveToBackend(sheetName, payload){
  console.info(`[معلق] سيتم إرسال البيانات إلى شيت "${sheetName}" بعد ربط الخادم:`, payload);
  return { ok: true, pending: true };
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
  return new URLSearchParams(window.location.search).get("email") || "";
}

function withEmail(href, email){
  return email ? `${href}?email=${encodeURIComponent(email)}` : href;
}

function renderShell(activeKey, userEmail){
  const sidebarMount = document.getElementById("sidebar-mount");
  const bottomMount = document.getElementById("bottomnav-mount");
  const email = userEmail || getEmailParam();

  if(sidebarMount){
    const links = NAV_ITEMS.map(item => `
      <a class="nav-link ${item.key === activeKey ? "active" : ""}" href="${withEmail(item.href, email)}">
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
        <a class="logout-link" href="index.html">تسجيل الخروج</a>
      </div>
    `;
  }

  if(bottomMount){
    const links = NAV_ITEMS.map(item => `
      <a class="${item.key === activeKey ? "active" : ""}" href="${withEmail(item.href, email)}">
        <span class="ic">${item.icon}</span><span>${item.label}</span>
      </a>`).join("");
    bottomMount.innerHTML = links;
  }
}

