// Main application module.
// Renders the whole site into #app and wires up interactions.
// State: language (localStorage 'tpf_lang'), cart (cart.js).

import "./style.css";
import { t } from "./i18n.js";
import { products, offers, galleryImages, business } from "./data.js";
import {
  getState,
  addItem,
  setQty,
  removeItem,
  clearCart,
  subtotal,
  deliveryFee,
  total,
  itemCount,
  subscribe,
  addCustomItem,
  setCustomQty,
  removeCustomItem,
} from "./cart.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let lang = localStorage.getItem("tpf_lang") || null; // "en" | "hi" | null
let deliveryMethod = "pickup"; // pickup | home
let paymentMethod = "cash"; // cash | online
let cartOpen = false;
let checkoutOpen = false;

const root = document.getElementById("app");

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot() {
  // Language gate on first visit
  if (!lang) {
    renderLanguageGate();
    return;
  }
  applyHtmlLang();
  renderApp();
  startHeroRotator();
  observeReveal();
}

// ---------------------------------------------------------------------------
// Language gate
// ---------------------------------------------------------------------------

function renderLanguageGate() {
  root.innerHTML = `
    <div class="lang-overlay" id="langOverlay">
      <div class="lang-card">
        <div class="flex items-center justify-center mb-5">
          <div class="w-14 h-14 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-white text-2xl font-bold">T</div>
        </div>
        <h2 class="text-xl font-bold text-center text-[var(--color-ink)] mb-5" data-i18n="langTitle"></h2>
        <div class="flex flex-col gap-3">
          <button class="btn-primary flex items-center justify-center gap-2" data-lang="en">
            <span class="text-2xl">🇬🇧</span>
            <span data-i18n="langEnglish"></span>
          </button>
          <button class="btn-ghost flex items-center justify-center gap-2" data-lang="hi">
            <span class="text-2xl">🇮🇳</span>
            <span data-i18n="langHindi"></span>
          </button>
        </div>
      </div>
    </div>
    <div aria-hidden="true" class="min-h-screen" style="filter: blur(8px); opacity:0.6;">
      ${heroHtml()}
    </div>
  `;
  applyI18n(root);

  root.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      lang = btn.dataset.lang;
      localStorage.setItem("tpf_lang", lang);
      const overlay = document.getElementById("langOverlay");
      overlay.classList.add("is-hidden");
      setTimeout(() => {
        applyHtmlLang();
        renderApp();
        startHeroRotator();
        observeReveal();
      }, 480);
    });
  });
}

function applyHtmlLang() {
  document.documentElement.lang = lang || "en";
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

function renderApp() {
  root.innerHTML = shell();
  applyI18n(root);
  wireShell();
  renderProducts();
  renderOffers();
  renderGallery();
  renderCart();
  observeReveal();
}

function shell() {
  return `
    ${navHtml()}
    <main>
      ${heroHtml()}
      ${aboutHtml()}
      ${whyHtml()}
      ${productsHtml()}
      ${galleryHtml()}
      ${offersHtml()}
      ${contactHtml()}
      ${footerHtml()}
    </main>
    ${cartDrawerHtml()}
    ${checkoutModalHtml()}
    ${sendModalHtml()}
    ${mobileNavHtml()}
    ${floatingCartHtml()}
  `;
}

function wireShell() {
  // Language switcher
  root.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      lang = btn.dataset.setLang;
      localStorage.setItem("tpf_lang", lang);
      applyHtmlLang();
      renderApp();
      startHeroRotator();
      observeReveal();
    });
  });

  // Smooth scroll nav links
  root.querySelectorAll("[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        closeMobileNav();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Cart open
  document.getElementById("cartBtn")?.addEventListener("click", openCart);
  document.getElementById("cartBtnMobile")?.addEventListener("click", openCart);
  document.getElementById("floatingCartBtn")?.addEventListener("click", openCart);

  // Cart close
  document.getElementById("cartClose")?.addEventListener("click", closeCart);
  document.getElementById("cartBackdrop")?.addEventListener("click", closeCart);

  // Mobile nav
  document.getElementById("menuBtn")?.addEventListener("click", toggleMobileNav);
  document.getElementById("mobileNavClose")?.addEventListener("click", closeMobileNav);

  // Checkout
  document.getElementById("cartCheckout")?.addEventListener("click", openCheckout);
  document.getElementById("cartClear")?.addEventListener("click", () => {
    if (confirm(t("cartClear", lang) + "?")) clearCart();
  });

  document.getElementById("checkoutClose")?.addEventListener("click", closeCheckout);
  document.getElementById("checkoutBackdrop")?.addEventListener("click", closeCheckout);
  document.getElementById("checkoutBack")?.addEventListener("click", () => {
    closeCheckout();
    openCart();
  });

  document.querySelectorAll("input[name='deliveryMethod']").forEach((r) => {
    r.addEventListener("change", () => {
      deliveryMethod = r.value;
      renderCheckout_summary_only();
    });
  });

  document.getElementById("checkoutForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitOrder();
  });

  document.getElementById("sendClose")?.addEventListener("click", closeSend);

  // Hero CTAs
  document.getElementById("heroOrder")?.addEventListener("click", () => {
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("heroProducts")?.addEventListener("click", () => {
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  });

  // Re-render cart badge on cart changes
  subscribe(() => {
    renderCartBadge();
    renderCart();
    if (checkoutOpen) renderCheckout_summary_only();
  });

  wireFooterMap();
}

function wireFooterMap() {
  const showMapBtn = document.getElementById("showMapBtn");
  const closeMapBtn = document.getElementById("closeMapBtn");
  const mapContainer = document.getElementById("footerMapContainer");
  const mapHeader = document.getElementById("footerMapHeader");

  if (!showMapBtn || !mapContainer) return;

  showMapBtn.addEventListener("click", () => {
    mapContainer.classList.remove("hidden");
    showMapBtn.classList.add("hidden");
  });

  closeMapBtn.addEventListener("click", () => {
    mapContainer.classList.add("hidden");
    showMapBtn.classList.remove("hidden");
  });

  // Make map draggable
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  if (mapHeader) {
    mapHeader.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);

    mapHeader.addEventListener("touchstart", dragStart, { passive: true });
    document.addEventListener("touchend", dragEnd);
    document.addEventListener("touchmove", drag, { passive: true });
  }

  function dragStart(e) {
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }
    if (e.target === mapHeader || e.target.parentNode === mapHeader) {
      isDragging = true;
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  function drag(e) {
    if (isDragging) {
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, mapContainer);
    }
  }

  function setTranslate(xPos, yPos, el) {
    const footer = document.getElementById("mainFooter");
    if (footer) {
      const minX = -(footer.offsetWidth - el.offsetWidth - 20);
      const maxX = 20;
      const minY = -(footer.offsetHeight - el.offsetHeight - 64);
      const maxY = 64;
      xPos = Math.max(minX, Math.min(xPos, maxX));
      yPos = Math.max(minY, Math.min(yPos, maxY));

      xOffset = xPos;
      yOffset = yPos;
      currentX = xPos;
      currentY = yPos;
    }
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

function navHtml() {
  return `
    <header class="sticky top-0 z-40 bg-[var(--color-card)]/90 backdrop-blur border-b border-[var(--color-divider)] pt-safe">
      <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#home" data-scroll class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">T</div>
          <span class="font-bold text-[var(--color-ink)] text-base sm:text-lg" data-i18n="brand"></span>
        </a>
        <div class="flex items-center gap-2">
          ${langSwitcherHtml()}
          <button id="cartBtn" class="relative w-11 h-11 rounded-xl border border-[var(--color-divider)] flex items-center justify-center text-[var(--color-primary)]" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
            <span id="cartBadge" class="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--color-accent)] text-white text-[11px] font-bold flex items-center justify-center hidden">0</span>
          </button>
          <button id="menuBtn" class="w-11 h-11 rounded-xl border border-[var(--color-divider)] flex items-center justify-center text-[var(--color-primary)]" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
    </header>
  `;
}

function navLink(key, href) {
  return `<a href="${href}" data-scroll class="px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition" data-i18n="${key}"></a>`;
}

function langSwitcherHtml() {
  return `
    <div class="relative" id="langSwitcher">
      <button id="langSwitcherBtn" class="h-11 px-3 rounded-xl border border-[var(--color-divider)] flex items-center gap-1 text-sm font-semibold text-[var(--color-ink)]">
        <span>🇮🇳</span>
        <span class="hidden sm:inline">${lang === "hi" ? "हिं" : "EN"}</span>
      </button>
      <div id="langMenu" class="hidden absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-[var(--color-divider)] py-1 z-50">
        <button data-set-lang="en" class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg)] flex items-center gap-2">🇮🇳 English</button>
        <button data-set-lang="hi" class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg)] flex items-center gap-2">🇮🇳 हिंदी</button>
      </div>
    </div>
  `;
}

function mobileNavHtml() {
  return `
    <div id="mobileNavBackdrop" class="hidden fixed inset-0 z-50 bg-black/40" onclick="document.getElementById('mobileNav').classList.add('hidden')"></div>
    <div id="mobileNav" class="hidden fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-[var(--color-divider)]">
        <span class="font-bold" data-i18n="menu"></span>
        <button id="mobileNavClose" class="w-10 h-10 rounded-lg border border-[var(--color-divider)] flex items-center justify-center" aria-label="Close">✕</button>
      </div>
      <nav class="flex flex-col p-2">
        ${mobileNavLink("navHome", "#home")}
        ${mobileNavLink("navAbout", "#about")}
        ${mobileNavLink("navWhy", "#why")}
        ${mobileNavLink("navProducts", "#products")}
        ${mobileNavLink("navGallery", "#gallery")}
        ${mobileNavLink("navOffers", "#offers")}
        ${mobileNavLink("navContact", "#contact")}
      </nav>
    </div>
  `;
}

function mobileNavLink(key, href) {
  return `<a href="${href}" data-scroll class="px-3 py-3 rounded-lg text-base font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg)]" data-i18n="${key}"></a>`;
}

function toggleMobileNav() {
  const nav = document.getElementById("mobileNav");
  const back = document.getElementById("mobileNavBackdrop");
  const hidden = nav.classList.contains("hidden");
  nav.classList.toggle("hidden");
  back.classList.toggle("hidden");
  if (hidden) {
    nav.style.transform = "translateX(0)";
  }
}
function closeMobileNav() {
  document.getElementById("mobileNav")?.classList.add("hidden");
  document.getElementById("mobileNavBackdrop")?.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function heroHtml() {
  const rotator = (t("heroRotator", lang) || []).map(
    (s, i) => `<span class="${i === 0 ? "is-active" : ""}">${s}</span>`
  ).join("");
  return `
    <section id="home" class="relative">
      <div class="relative h-[70vh] min-h-[480px] max-h-[640px] overflow-hidden">
        <div class="absolute inset-0 w-full h-full overflow-hidden z-0">
          <div class="hero-slides flex w-full h-full transition-transform duration-300 ease-in-out">
            <img src="/Tiger%20Lairo%20Farm1.webp" alt="Tiger Lairo Farm 1" class="w-full h-full object-cover shrink-0" loading="eager" decoding="async" />
            <img src="/Tiger%20Lairo%20Farm2.webp" alt="Tiger Lairo Farm 2" class="w-full h-full object-cover shrink-0" loading="lazy" decoding="async" />
            <img src="/Tiger%20Lairo%20Farm3.webp" alt="Tiger Lairo Farm 3" class="w-full h-full object-cover shrink-0" loading="lazy" decoding="async" />
            <img src="/Tiger%20Lairo%20Farm4.webp" alt="Tiger Lairo Farm 4" class="w-full h-full object-cover shrink-0" loading="lazy" decoding="async" />
            <img src="/Tiger%20Lairo%20Farm5.webp" alt="Tiger Lairo Farm 5" class="w-full h-full object-cover shrink-0" loading="lazy" decoding="async" />
          </div>
        </div>
        <div class="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/55"></div>
        <div class="relative h-full max-w-5xl mx-auto px-5 flex flex-col justify-center text-white">
          <span class="inline-flex w-fit items-center gap-2 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span class="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse"></span>
            <span data-i18n="tagline"></span>
          </span>
          <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-1 max-w-xl" data-i18n="brand"></h1>
          <h2 class="text-xl sm:text-2xl md:text-3xl font-bold mb-4 max-w-xl text-white/90" data-i18n="subBrand"></h2>
          <div class="hero-rotator text-lg sm:text-xl font-semibold text-white/95 max-w-lg mb-6">${rotator}</div>
          <div class="flex flex-wrap gap-3">
            <button id="heroOrder" class="btn-primary !bg-[var(--color-primary)] !text-white" data-i18n="heroCta"></button>
            <button id="heroProducts" class="btn-ghost !text-white !border-white/40 !bg-white/10" data-i18n="heroSecondary"></button>
          </div>
        </div>
      </div>
    </section>
  `;
}

let rotatorTimer = null;
let sliderTimer = null;
function startHeroRotator() {
  if (rotatorTimer) clearInterval(rotatorTimer);
  if (sliderTimer) clearInterval(sliderTimer);
  const rotator = root.querySelector(".hero-rotator");
  const slidesContainer = root.querySelector(".hero-slides");

  let idx = 0;
  let slideIdx = 0;
  let spans = [];
  if (rotator) spans = Array.from(rotator.querySelectorAll("span"));
  const totalSlides = 5;

  rotatorTimer = setInterval(() => {
    // Text rotate
    if (spans.length >= 2) {
      spans[idx].classList.remove("is-active");
      idx = (idx + 1) % spans.length;
      spans[idx].classList.add("is-active");
    }
  }, 3200);

  // Image slide fast
  sliderTimer = setInterval(() => {
    if (slidesContainer) {
      slideIdx = (slideIdx + 1) % totalSlides;
      slidesContainer.style.transform = `translate3d(-${slideIdx * 100}%, 0, 0)`;
    }
  }, 800); // Fast interval
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

function aboutHtml() {
  return `
    <section id="about" class="max-w-5xl mx-auto px-5 py-14">
      <div class="grid md:grid-cols-2 gap-8 items-center">
        <div class="reveal">
          <h2 class="text-2xl sm:text-3xl mb-4" data-i18n="aboutTitle"></h2>
          <p class="text-[var(--color-muted)] text-base sm:text-lg leading-relaxed" data-i18n="aboutBody"></p>
          <div class="grid grid-cols-3 gap-3 mt-6">
            ${statCard("500+", "aboutStat1")}
            ${statCard("12+", "aboutStat2")}
            ${statCard("365", "aboutStat3")}
          </div>
        </div>
        <div class="reveal grid grid-cols-2 gap-3">
          <img src="/about_image.jpg" loading="lazy" decoding="async" class="rounded-2xl h-56 w-full object-cover" alt="Workers at Tiger Lairo Layer Farm Mau" />
          <img src="/about_2.jpg" loading="lazy" decoding="async" class="rounded-2xl h-56 w-full object-cover mt-6" alt="Healthy layer poultry breeds at Tiger Lairo Farm" />
        </div>
      </div>
    </section>
  `;
}

function statCard(value, key) {
  return `
    <div class="bg-white rounded-2xl p-4 text-center border border-[var(--color-divider)]">
      <div class="text-2xl font-extrabold text-[var(--color-primary)]">${value}</div>
      <div class="text-xs text-[var(--color-muted)] mt-1" data-i18n="${key}"></div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Why choose us
// ---------------------------------------------------------------------------

function whyHtml() {
  const items = [
    ["whyFreshTitle", "whyFreshBody", "🌿"],
    ["whyHealthyTitle", "whyHealthyBody", "💧"],
    ["whyFairTitle", "whyFairBody", "₹"],
    ["whyEasyTitle", "whyEasyBody", "💬"],
  ];
  return `
    <section id="why" class="bg-white border-y border-[var(--color-divider)]">
      <div class="max-w-5xl mx-auto px-5 py-14">
        <h2 class="text-2xl sm:text-3xl mb-8 text-center reveal" data-i18n="whyTitle"></h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${items.map(([title, body, icon]) => `
            <div class="reveal rounded-2xl p-5 bg-[var(--color-bg)] border border-[var(--color-divider)]">
              <div class="w-11 h-11 rounded-xl bg-white border border-[var(--color-divider)] flex items-center justify-center text-xl mb-3">${icon}</div>
              <h3 class="font-bold text-lg mb-1" data-i18n="${title}"></h3>
              <p class="text-sm text-[var(--color-muted)] leading-relaxed" data-i18n="${body}"></p>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function productsHtml() {
  return `
    <section id="products" class="max-w-5xl mx-auto px-5 py-14">
      <div class="mb-8 reveal text-center max-w-2xl mx-auto">
        <h2 class="text-3xl sm:text-4xl font-extrabold mb-3 text-[var(--color-primary)]" data-i18n="productsTitle"></h2>
        <p class="text-[var(--color-muted)] text-base sm:text-lg" data-i18n="productsSubtitle"></p>
      </div>
      <div id="customizerPanel" class="reveal bg-white rounded-3xl border border-[var(--color-divider)] shadow-xl overflow-hidden max-w-4xl mx-auto">
        <!-- Content dynamically rendered -->
      </div>
    </section>
  `;
}

function renderProducts() {
  const panel = document.getElementById("customizerPanel");
  if (!panel) return;
  const p = products[0];
  if (!p) return;

  panel.innerHTML = `
      <div class="grid md:grid-cols-12">
        <!-- Left Side: Image -->
        <div class="md:col-span-5 relative min-h-[280px] md:min-h-[460px] bg-slate-100">
          <img src="${p.image}" alt="${p.name[lang] || p.name.en} - Farm Fresh Layer Chicken" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"></div>
          <span class="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            100% Farm Fresh
          </span>
        </div>
        
        <!-- Right Side: Customize Controls -->
        <div class="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-3 mb-2">
              <h3 class="text-2xl font-bold text-[var(--color-ink)]">${p.name[lang] || p.name.en}</h3>
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--color-success)]/10 text-[var(--color-success)] px-2.5 py-1 rounded-full">
                <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]"></span>
                <span data-i18n="productAvailable"></span>
              </span>
            </div>
            <p class="text-[var(--color-muted)] text-sm leading-relaxed mb-6">${p.desc[lang] || p.desc.en}</p>
            
            <div class="space-y-6">
              <!-- Input Board 1: Weight -->
              <div class="bg-[var(--color-bg)] rounded-2xl p-4 border border-[var(--color-divider)] shadow-inner">
                <label class="block text-xs uppercase tracking-wider font-extrabold text-[var(--color-muted)] mb-2" data-i18n="weightTitle"></label>
                <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div class="flex items-center gap-2 flex-1">
                    <button id="weightMinus" class="shrink-0 w-10 h-10 rounded-xl bg-white border border-[var(--color-divider)] flex items-center justify-center font-bold text-lg text-[var(--color-primary)] active:scale-95 transition" aria-label="Decrease Weight">−</button>
                    <input type="range" id="weightSlider" min="1.0" max="3.0" step="0.1" value="1.5" class="flex-1 min-w-[60px] accent-[var(--color-primary)] cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none" />
                    <button id="weightPlus" class="shrink-0 w-10 h-10 rounded-xl bg-white border border-[var(--color-divider)] flex items-center justify-center font-bold text-lg text-[var(--color-primary)] active:scale-95 transition" aria-label="Increase Weight">+</button>
                  </div>
                  <div class="w-full sm:w-auto text-center sm:text-right font-black text-xl text-[var(--color-primary)] shrink-0"><span id="weightVal">1.5</span> kg</div>
                </div>
              </div>
              
              <!-- Input Board 2: Quantity -->
              <div class="bg-[var(--color-bg)] rounded-2xl p-4 border border-[var(--color-divider)] shadow-inner">
                <label class="block text-xs uppercase tracking-wider font-extrabold text-[var(--color-muted)] mb-2" data-i18n="quantityTitle"></label>
                <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div class="flex items-center gap-2 flex-1">
                    <button id="qtyMinus" class="shrink-0 w-10 h-10 rounded-xl bg-white border border-[var(--color-divider)] flex items-center justify-center font-bold text-lg text-[var(--color-primary)] active:scale-95 transition" aria-label="Decrease Quantity">−</button>
                    <input type="number" id="qtyInput" min="1" step="1" value="1" class="flex-1 min-w-[60px] max-w-[140px] field !px-2 !py-1 !min-h-[40px] text-center font-extrabold text-lg bg-white" />
                    <button id="qtyPlus" class="shrink-0 w-10 h-10 rounded-xl bg-white border border-[var(--color-divider)] flex items-center justify-center font-bold text-lg text-[var(--color-primary)] active:scale-95 transition" aria-label="Increase Quantity">+</button>
                  </div>
                  <div class="w-full sm:w-auto text-center sm:text-left text-sm font-bold text-[var(--color-muted)] shrink-0"><span data-i18n="navProducts">chickens</span></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Price Calculation Panel -->
          <div class="mt-8 border-t border-[var(--color-divider)] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div class="text-xs uppercase tracking-wider font-bold text-[var(--color-muted)]" data-i18n="estimateTitle"></div>
              <div class="text-sm text-[var(--color-ink)] mt-1 font-medium flex items-center flex-wrap gap-1">
                <span id="summaryText">1 pc × 1.5 kg = 1.5 kg</span> @ 
                ${p.originalPricePerKg ? `<span class="line-through text-gray-400">₹${p.originalPricePerKg}</span>` : ""}
                <span class="text-[var(--color-primary)] font-bold">₹${p.pricePerKg}</span>/kg
                ${p.originalPricePerKg ? `<span class="ml-1 bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">-${Math.round(((p.originalPricePerKg - p.pricePerKg) / p.originalPricePerKg) * 100)}%</span>` : ""}
              </div>
              <div class="text-2xl font-black text-[var(--color-accent)] mt-0.5">₹<span id="estimatedCost">330.00</span></div>
            </div>
            <button id="addToCartBtn" class="btn-primary flex-1 sm:flex-none sm:px-8 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition">
              <span>🛒</span>
              <span data-i18n="productAdd"></span>
            </button>
          </div>
        </div>
      </div>
    `;

  applyI18n(panel);
  wireCustomizer(p);
}

function wireCustomizer(product) {
  const slider = document.getElementById("weightSlider");
  const weightVal = document.getElementById("weightVal");
  const qtyInput = document.getElementById("qtyInput");
  const summaryText = document.getElementById("summaryText");
  const estimatedCost = document.getElementById("estimatedCost");

  const weightMinus = document.getElementById("weightMinus");
  const weightPlus = document.getElementById("weightPlus");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");

  const addToCartBtn = document.getElementById("addToCartBtn");
  const pricePerKg = product.pricePerKg;

  function updateCalculations() {
    const weight = parseFloat(slider.value) || 1.5;
    const qty = parseInt(qtyInput.value) || 1;
    const totalWeight = weight * qty;
    const cost = totalWeight * pricePerKg;

    weightVal.textContent = weight.toFixed(1);
    summaryText.textContent = `${qty} ${qty > 1 ? "pcs" : "pc"} × ${weight.toFixed(1)} kg = ${totalWeight.toFixed(1)} kg`;
    estimatedCost.textContent = cost.toFixed(2);
  }

  weightMinus.addEventListener("click", () => {
    let v = parseFloat(slider.value) || 1.5;
    v = Math.max(1.0, v - 0.1);
    slider.value = v;
    updateCalculations();
  });
  weightPlus.addEventListener("click", () => {
    let v = parseFloat(slider.value) || 1.5;
    v = Math.min(3.0, v + 0.1);
    slider.value = v;
    updateCalculations();
  });
  slider.addEventListener("input", updateCalculations);

  qtyMinus.addEventListener("click", () => {
    let v = parseInt(qtyInput.value) || 1;
    v = Math.max(1, v - 1);
    qtyInput.value = v;
    updateCalculations();
  });
  qtyPlus.addEventListener("click", () => {
    let v = parseInt(qtyInput.value) || 1;
    v = v + 1;
    qtyInput.value = v;
    updateCalculations();
  });
  qtyInput.addEventListener("input", () => {
    let v = parseInt(qtyInput.value);
    if (isNaN(v) || v < 1) return;
    updateCalculations();
  });
  qtyInput.addEventListener("change", () => {
    let v = parseInt(qtyInput.value);
    if (isNaN(v) || v < 1) {
      qtyInput.value = 1;
      updateCalculations();
    }
  });

  addToCartBtn.addEventListener("click", () => {
    const weight = parseFloat(slider.value) || 1.5;
    const qty = parseInt(qtyInput.value) || 1;

    addCustomItem(product.id, weight, qty);

    const originalText = addToCartBtn.innerHTML;
    addToCartBtn.innerHTML = `<span>✓</span> <span data-i18n="productAdded"></span>`;
    addToCartBtn.disabled = true;
    applyI18n(addToCartBtn);

    setTimeout(() => {
      addToCartBtn.innerHTML = originalText;
      addToCartBtn.disabled = false;
      applyI18n(addToCartBtn);
    }, 1200);
  });

  updateCalculations();
}

function flashAdded(btn) {
  const original = btn.textContent;
  btn.textContent = t("productAdded", lang);
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
    applyI18n(btn.parentElement);
  }, 1100);
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

function galleryHtml() {
  return `
    <section id="gallery" class="bg-white border-y border-[var(--color-divider)]">
      <div class="max-w-5xl mx-auto px-5 py-14">
        <div class="mb-8 reveal">
          <h2 class="text-2xl sm:text-3xl mb-2" data-i18n="galleryTitle"></h2>
          <p class="text-[var(--color-muted)]" data-i18n="gallerySubtitle"></p>
        </div>
        <div id="galleryGrid" class="grid grid-cols-2 sm:grid-cols-3 gap-3"></div>
      </div>
    </section>
  `;
}

function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;
  grid.innerHTML = galleryImages
    .map(
      (src) => `
      <div class="reveal rounded-2xl overflow-hidden h-40 sm:h-48">
        <img src="${src}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" alt="Tiger Lairo Farm Gallery Image - Poultry in Mau" />
      </div>`
    )
    .join("");
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

function offersHtml() {
  return `
    <section id="offers" class="max-w-5xl mx-auto px-5 py-14">
      <div class="mb-8 reveal">
        <h2 class="text-2xl sm:text-3xl mb-2" data-i18n="offersTitle"></h2>
        <p class="text-[var(--color-muted)]" data-i18n="offersSubtitle"></p>
      </div>
      <div id="offersGrid" class="grid sm:grid-cols-3 gap-4"></div>
    </section>
  `;
}

function renderOffers() {
  const grid = document.getElementById("offersGrid");
  if (!grid) return;
  grid.innerHTML = offers
    .map(
      (o) => `
      <div class="reveal rounded-2xl p-5 bg-white border border-[var(--color-divider)] flex flex-col">
        <span class="inline-flex w-fit items-center px-2.5 py-1 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-xs font-bold mb-3">${o.badge[lang] || o.badge.en}</span>
        <h3 class="font-bold text-lg mb-1">${o.title[lang] || o.title.en}</h3>
        <p class="text-sm text-[var(--color-muted)] leading-relaxed">${o.body[lang] || o.body.en}</p>
      </div>`
    )
    .join("");
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

function contactHtml() {
  return `
    <section id="contact" class="bg-white border-y border-[var(--color-divider)]">
      <div class="max-w-5xl mx-auto px-5 py-14">
        <h2 class="text-2xl sm:text-3xl mb-8 text-center reveal" data-i18n="contactTitle"></h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <a href="tel:${business.phone}" class="reveal rounded-2xl p-5 bg-[var(--color-bg)] border border-[var(--color-divider)] flex items-center gap-4 hover:border-[var(--color-primary)] transition">
            <div class="w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center text-xl">📞</div>
            <div>
              <div class="text-xs text-[var(--color-muted)]" data-i18n="contactPhone"></div>
              <div class="font-bold text-lg">${business.phone}</div>
            </div>
          </a>
          <a href="mailto:${business.email}" class="reveal rounded-2xl p-5 bg-[var(--color-bg)] border border-[var(--color-divider)] flex items-center gap-4 hover:border-[var(--color-primary)] transition">
            <div class="w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center text-xl">✉️</div>
            <div>
              <div class="text-xs text-[var(--color-muted)]" data-i18n="contactEmail"></div>
              <div class="font-bold text-base break-all">${business.email}</div>
            </div>
          </a>
          <div class="reveal rounded-2xl p-5 bg-[var(--color-bg)] border border-[var(--color-divider)] flex items-center gap-4 sm:col-span-2">
            <div class="w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center text-xl">📍</div>
            <div>
              <div class="text-xs text-[var(--color-muted)]" data-i18n="contactAddress"></div>
              <div class="font-bold text-base" data-i18n="contactAddressValue"></div>
            </div>
          </div>

        </div>
        <div class="mt-6 flex justify-center">
          <a href="tel:${business.phone}" class="btn-primary inline-flex items-center gap-2">
            <span>📞</span><span data-i18n="contactCallNow"></span>
          </a>
        </div>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function footerHtml() {
  const year = new Date().getFullYear();
  return `
    <footer id="mainFooter" class="bg-[var(--color-ink)] text-white relative overflow-hidden">
      <div class="max-w-5xl mx-auto px-5 py-12 grid sm:grid-cols-3 gap-8">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center font-bold">T</div>
            <span class="font-bold" data-i18n="brand"></span>
          </div>
          <p class="text-sm text-white/70 leading-relaxed" data-i18n="footerTagline"></p>
        </div>
        <div>
          <h4 class="font-bold mb-3 text-white/90" data-i18n="footerLinks"></h4>
          <ul class="space-y-2 text-sm text-white/70">
            <li><a href="#products" data-scroll class="hover:text-white" data-i18n="navProducts"></a></li>
            <li><a href="#offers" data-scroll class="hover:text-white" data-i18n="navOffers"></a></li>
            <li><a href="#gallery" data-scroll class="hover:text-white" data-i18n="navGallery"></a></li>
            <li><a href="#about" data-scroll class="hover:text-white" data-i18n="navAbout"></a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-3 text-white/90" data-i18n="footerContact"></h4>
          <ul class="space-y-2 text-sm text-white/70">
            <li>📞 ${business.phone}</li>
            <li>✉️ ${business.email}</li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10 relative">
        <div class="max-w-5xl mx-auto px-5 py-4 flex flex-col sm:flex-row justify-between items-center text-xs text-white/60">
          <div class="text-center sm:text-left mb-3 sm:mb-0">
            © ${year} <span data-i18n="brand"></span>. <span data-i18n="footerRights"></span><br>
            Developer: Ayush Singh
          </div>
          <button id="showMapBtn" class="hidden bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-2 shadow">
            <span>📍</span> <span data-i18n="showMap"></span>
          </button>
        </div>
      </div>
      
      <!-- Movable Map Container -->
      <div id="footerMapContainer" class="absolute bottom-16 right-5 w-[200px] h-[150px] bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-40 border border-[var(--color-divider)] flex flex-col">
        <div id="footerMapHeader" class="bg-[var(--color-primary)] text-white px-3 py-2 flex justify-between items-center cursor-move select-none">
          <span class="font-bold text-sm flex items-center gap-2 pointer-events-none">📍 <span data-i18n="mapLocation"></span></span>
          <button id="closeMapBtn" class="text-white hover:text-gray-200 text-lg leading-none" aria-label="Close Map">✕</button>
        </div>
        <div class="flex-1 w-full bg-gray-100 relative pointer-events-auto">
          <iframe 
            src="https://www.google.com/maps?q=25.9417,83.5601&z=14&output=embed" 
            width="100%" 
            height="100%" 
            style="border:0;" 
            allowfullscreen="" 
            loading="lazy" 
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>
      </div>
    </footer>
  `;
}

// ---------------------------------------------------------------------------
// Cart drawer
// ---------------------------------------------------------------------------

function cartDrawerHtml() {
  return `
    <div id="cartBackdrop" class="drawer-backdrop"></div>
    <aside id="cartDrawer" class="drawer" aria-label="Cart">
      <div class="flex items-center justify-between p-4 border-b border-[var(--color-divider)]">
        <h2 class="text-lg font-bold" data-i18n="cartTitle"></h2>
        <button id="cartClose" class="w-10 h-10 rounded-lg border border-[var(--color-divider)] flex items-center justify-center" aria-label="Close">✕</button>
      </div>
      <div id="cartBody" class="flex-1 overflow-y-auto p-4"></div>
      <div id="cartFooter" class="p-4 border-t border-[var(--color-divider)] pb-safe"></div>
    </aside>
  `;
}

function renderCart() {
  const body = document.getElementById("cartBody");
  const footer = document.getElementById("cartFooter");
  if (!body || !footer) return;
  const { items } = getState();
  if (items.length === 0) {
    body.innerHTML = `
      <div class="text-center text-[var(--color-muted)] py-16 px-4">
        <div class="text-5xl mb-3">🛒</div>
        <p data-i18n="cartEmpty"></p>
      </div>`;
    footer.innerHTML = "";
    renderCartBadge();
    return;
  }
  body.innerHTML = items.map(cartLineHtml).join("");
  applyI18n(body);
  wireCartLines(body);

  const sub = subtotal();
  const fee = deliveryFee(deliveryMethod);
  const tot = total(deliveryMethod);
  const freeNote =
    fee === 0 && deliveryMethod === "home" && sub > 0
      ? `<div class="text-sm text-[var(--color-success)] font-semibold mb-2" data-i18n="freeDeliveryBadge"></div>`
      : "";

  footer.innerHTML = `
    ${freeNote}
    <div class="flex justify-between text-sm text-[var(--color-muted)] mb-1">
      <span data-i18n="cartSubtotal"></span><span>₹${sub.toFixed(2)}</span>
    </div>
    <div class="flex justify-between text-sm text-[var(--color-muted)] mb-2">
      <span data-i18n="cartDelivery"></span>
      <span>${fee === 0 ? `<span data-i18n="cartFree"></span>` : `₹${fee}`}</span>
    </div>
    <div class="flex justify-between font-bold text-lg mb-3">
      <span data-i18n="cartTotal"></span><span>₹${tot.toFixed(2)}</span>
    </div>
    <div class="flex gap-2">
      <button id="cartClear" class="btn-ghost flex-1" data-i18n="cartClear"></button>
      <button id="cartCheckout" class="btn-primary flex-1" data-i18n="cartCheckout"></button>
    </div>
  `;
  applyI18n(footer);
  document.getElementById("cartClear")?.addEventListener("click", () => {
    if (confirm(t("cartClear", lang) + "?")) clearCart();
  });
  document.getElementById("cartCheckout")?.addEventListener("click", openCheckout);
  renderCartBadge();
}

function cartLineHtml(item) {
  const product = products.find((p) => p.id === item.id);
  if (!product) return "";
  const price = product.unit === "piece" ? product.pricePerPiece : product.pricePerKg;
  const lt = (price * item.qty).toFixed(2);
  const unitLabel = item.unit === "piece" ? t("productPerPiece", lang) : t("productPerKg", lang);

  const details = item.weightPerPiece
    ? `<span class="font-semibold text-[var(--color-primary)]">${item.pcs} pcs × ${item.weightPerPiece.toFixed(1)} kg</span> (₹${price}/kg)`
    : `₹${price} ${unitLabel}`;

  const displayQty = item.weightPerPiece ? item.pcs : item.qty;
  const step = item.weightPerPiece ? "1" : (item.unit === "piece" ? "1" : "0.25");
  const inputMode = item.weightPerPiece ? "numeric" : (item.unit === "piece" ? "numeric" : "decimal");

  return `
    <div class="flex gap-3 py-3 border-b border-[var(--color-divider)]" data-line="${item.id}" data-unit="${item.unit}" ${item.weightPerPiece ? `data-weight-per-piece="${item.weightPerPiece}"` : ''}>
      <img src="${product.image}" class="w-16 h-16 rounded-xl object-cover" alt="" loading="lazy" />
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm truncate">${product.name[lang] || product.name.en}</div>
        <div class="text-xs text-[var(--color-muted)] mb-2">${details}</div>
        <div class="flex items-center gap-2">
          <button class="line-minus w-9 h-9 rounded-lg border border-[var(--color-divider)] font-bold text-[var(--color-primary)]">−</button>
          <input type="number" inputmode="${inputMode}" step="${step}" min="0" value="${displayQty}" class="field !px-2 !py-1 !min-h-[36px] w-16 text-center font-bold text-sm" />
          <button class="line-plus w-9 h-9 rounded-lg border border-[var(--color-divider)] font-bold text-[var(--color-primary)]">+</button>
          <button class="line-remove ml-auto text-xs text-red-500 font-semibold px-2" data-i18n="cartRemove"></button>
        </div>
      </div>
      <div class="font-bold text-sm self-start">₹${lt}</div>
    </div>
  `;
}

function wireCartLines(scope) {
  scope.querySelectorAll("[data-line]").forEach((line) => {
    const id = line.dataset.line;
    const unit = line.dataset.unit;
    const weightPerPiece = parseFloat(line.getAttribute("data-weight-per-piece")) || null;
    const input = line.querySelector("input");

    if (weightPerPiece) {
      line.querySelector(".line-minus")?.addEventListener("click", () => {
        const currentPcs = parseInt(input.value) || 0;
        setCustomQty(id, weightPerPiece, currentPcs - 1);
      });
      line.querySelector(".line-plus")?.addEventListener("click", () => {
        const currentPcs = parseInt(input.value) || 0;
        setCustomQty(id, weightPerPiece, currentPcs + 1);
      });
      input.addEventListener("change", () => {
        setCustomQty(id, weightPerPiece, parseInt(input.value) || 0);
      });
      line.querySelector(".line-remove")?.addEventListener("click", () => {
        removeCustomItem(id, weightPerPiece);
      });
    } else {
      const step = unit === "piece" ? 1 : 0.25;
      line.querySelector(".line-minus")?.addEventListener("click", () => {
        setQty(id, unit, (parseFloat(input.value) || 0) - step);
      });
      line.querySelector(".line-plus")?.addEventListener("click", () => {
        setQty(id, unit, (parseFloat(input.value) || 0) + step);
      });
      input.addEventListener("change", () => {
        setQty(id, unit, parseFloat(input.value) || 0);
      });
      line.querySelector(".line-remove")?.addEventListener("click", () => {
        removeItem(id, unit);
      });
    }
  });
}

function renderCartBadge() {
  const badge = document.getElementById("cartBadge");
  const floating = document.getElementById("floatingCartBtn");
  const count = itemCount();
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
  if (floating) {
    if (count > 0) floating.classList.remove("hidden");
    else floating.classList.add("hidden");
    const fbadge = document.getElementById("floatingCartBadge");
    if (fbadge) fbadge.textContent = count;
  }
}

function openCart() {
  cartOpen = true;
  document.getElementById("cartDrawer")?.classList.add("is-open");
  document.getElementById("cartBackdrop")?.classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  cartOpen = false;
  document.getElementById("cartDrawer")?.classList.remove("is-open");
  document.getElementById("cartBackdrop")?.classList.remove("is-open");
  if (!checkoutOpen) document.body.style.overflow = "";
}

// ---------------------------------------------------------------------------
// Floating cart button (mobile)
// ---------------------------------------------------------------------------

function floatingCartHtml() {
  return `
    <button id="floatingCartBtn" class="md:hidden hidden fixed bottom-5 right-5 z-30 h-14 px-5 rounded-full bg-[var(--color-primary)] text-white font-bold shadow-2xl flex items-center gap-2 pb-safe">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
      <span data-i18n="cartTitle"></span>
      <span id="floatingCartBadge" class="min-w-[22px] h-[22px] px-1 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold flex items-center justify-center">0</span>
    </button>
  `;
}

// ---------------------------------------------------------------------------
// Checkout modal
// ---------------------------------------------------------------------------

function checkoutModalHtml() {
  return `
    <div id="checkoutBackdrop" class="modal-overlay"></div>
    <div id="checkoutModal" class="modal-overlay" style="pointer-events:none; opacity:0;">
      <div class="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto no-scrollbar pb-safe">
        <div class="sticky top-0 bg-white px-5 py-4 border-b border-[var(--color-divider)] flex items-center justify-between rounded-t-3xl">
          <h2 class="text-lg font-bold" data-i18n="checkoutTitle"></h2>
          <button id="checkoutClose" class="w-10 h-10 rounded-lg border border-[var(--color-divider)] flex items-center justify-center" aria-label="Close">✕</button>
        </div>
        <form id="checkoutForm" class="p-5">
          <label class="block mb-3">
            <span class="block text-sm font-semibold mb-1.5" data-i18n="checkoutName"></span>
            <input type="text" name="name" class="field" required data-i18n-placeholder="checkoutNamePlaceholder" />
          </label>
          <label class="block mb-3">
            <span class="block text-sm font-semibold mb-1.5" data-i18n="checkoutPhone"></span>
            <input type="tel" name="phone" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" class="field" required data-i18n-placeholder="checkoutPhonePlaceholder" />
          </label>

          <fieldset class="mb-5 mt-5">
            <legend class="font-semibold mb-2 text-sm" data-i18n="checkoutPayment"></legend>
            <label class="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-divider)] mb-2 cursor-pointer has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary)]/5">
              <input type="radio" name="paymentMethod" value="cash" ${paymentMethod === "cash" ? "checked" : ""} class="mt-1 w-5 h-5 accent-[var(--color-primary)]" />
              <span>
                <span class="block font-semibold" data-i18n="paymentCash"></span>
                <span class="block text-xs text-[var(--color-muted)] mt-0.5" data-i18n="paymentCashNote"></span>
              </span>
            </label>
            <label class="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-divider)] cursor-pointer has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary)]/5">
              <input type="radio" name="paymentMethod" value="online" ${paymentMethod === "online" ? "checked" : ""} class="mt-1 w-5 h-5 accent-[var(--color-primary)]" />
              <span>
                <span class="block font-semibold" data-i18n="paymentOnline"></span>
                <span class="block text-xs text-[var(--color-muted)] mt-0.5" data-i18n="paymentOnlineNote"></span>
              </span>
            </label>
          </fieldset>

          <div id="qrCodeContainer" class="mb-5 p-4 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg)] flex flex-col items-center justify-center text-center ${paymentMethod === "online" ? "" : "hidden"}">
            <div class="w-48 h-48 bg-white border border-[var(--color-divider)] p-2 rounded-xl flex items-center justify-center shadow-sm overflow-hidden mb-3">
              <img src="/QR.jpeg" alt="QR Code" class="w-full h-full object-cover object-center" />
            </div>
            
            <a href="/QR.jpeg" download="TigerFarm_QRCode.jpeg" class="btn-ghost text-sm mb-4 inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span data-i18n="downloadQR"></span>
            </a>

            <div class="w-full text-left">
              <p class="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-2" data-i18n="payDirectly"></p>
              <div class="grid grid-cols-2 gap-2">
                <a href="#" id="btnPaytm" class="flex items-center justify-center gap-2 p-2 rounded-lg bg-white border border-[var(--color-divider)] shadow-sm font-semibold text-[var(--color-ink)] hover:bg-gray-50 active:scale-95 transition">
                  <span class="text-blue-500 font-black">Paytm</span>
                </a>
                <a href="#" id="btnGpay" class="flex items-center justify-center gap-2 p-2 rounded-lg bg-white border border-[var(--color-divider)] shadow-sm font-semibold text-[var(--color-ink)] hover:bg-gray-50 active:scale-95 transition">
                  <span class="text-gray-700 font-bold">GPay</span>
                </a>
                <a href="#" id="btnPhonepe" class="flex items-center justify-center gap-2 p-2 rounded-lg bg-white border border-[var(--color-divider)] shadow-sm font-semibold text-[var(--color-ink)] hover:bg-gray-50 active:scale-95 transition">
                  <span class="text-purple-600 font-black">PhonePe</span>
                </a>
                <a href="#" id="btnBhim" class="flex items-center justify-center gap-2 p-2 rounded-lg bg-white border border-[var(--color-divider)] shadow-sm font-semibold text-[var(--color-ink)] hover:bg-gray-50 active:scale-95 transition">
                  <span class="text-green-600 font-bold">BHIM</span>
                </a>
              </div>
            </div>
          </div>

          <div id="checkoutSummary" class="rounded-2xl bg-[var(--color-bg)] border border-[var(--color-divider)] p-4 mb-4"></div>

          <div id="checkoutErrors" class="text-sm text-red-600 mb-3 hidden"></div>

          <button type="submit" class="btn-wa">
            <span class="inline-flex items-center justify-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.38c-.24.68-1.42 1.31-1.95 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.37-.15-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.82 2.03.89 2.18.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.39-.44.53-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.71.81 2 .96.3.15.5.22.57.34.07.12.07.69-.17 1.37z"/></svg>
              <span data-i18n="checkoutSend"></span>
            </span>
          </button>
          <button type="button" id="checkoutBack" class="btn-ghost w-full mt-2" data-i18n="checkoutBack"></button>
        </form>
      </div>
    </div>
  `;
}

function openCheckout() {
  if (getState().items.length === 0) return;
  closeCart();
  checkoutOpen = true;
  const modal = document.getElementById("checkoutModal");
  const back = document.getElementById("checkoutBackdrop");
  modal.style.opacity = "1";
  modal.style.pointerEvents = "auto";
  back.style.opacity = "1";
  back.style.pointerEvents = "auto";
  document.body.style.overflow = "hidden";
  renderCheckout_summary_only();
  applyI18n(modal);

  // Show/hide QR code when payment method changes
  document.querySelectorAll("input[name='paymentMethod']").forEach((r) => {
    r.onchange = () => {
      paymentMethod = r.value;
      document.getElementById("qrCodeContainer").classList.toggle("hidden", paymentMethod !== "online");
    };
  });
}

function closeCheckout() {
  checkoutOpen = false;
  const modal = document.getElementById("checkoutModal");
  const back = document.getElementById("checkoutBackdrop");
  if (modal) {
    modal.style.opacity = "0";
    modal.style.pointerEvents = "none";
  }
  if (back) {
    back.style.opacity = "0";
    back.style.pointerEvents = "none";
  }
  document.body.style.overflow = "";
}

function renderCheckout_summary_only() {
  const wrap = document.getElementById("checkoutSummary");
  if (!wrap) return;
  wrap.innerHTML = checkoutSummaryHtml();
  applyI18n(wrap);
  updateUpiLinks();
}

function updateUpiLinks() {
  const tot = total(deliveryMethod).toFixed(2);
  const upiId = business.upiId;
  const name = encodeURIComponent("Tiger's Poultry Farm");

  const elPaytm = document.getElementById("btnPaytm");
  const elGpay = document.getElementById("btnGpay");
  const elPhonepe = document.getElementById("btnPhonepe");
  const elBhim = document.getElementById("btnBhim");

  if (elPaytm) elPaytm.href = `paytmmp://pay?pa=${upiId}&pn=${name}&am=${tot}&cu=INR`;
  if (elGpay) elGpay.href = `tez://upi/pay?pa=${upiId}&pn=${name}&am=${tot}&cu=INR`;
  if (elPhonepe) elPhonepe.href = `phonepe://pay?pa=${upiId}&pn=${name}&am=${tot}&cu=INR`;
  if (elBhim) elBhim.href = `bhim://pay?pa=${upiId}&pn=${name}&am=${tot}&cu=INR`;
}

function checkoutSummaryHtml() {
  const { items } = getState();
  const sub = subtotal();
  const fee = deliveryFee(deliveryMethod);
  const tot = total(deliveryMethod);
  const lines = items
    .map((i) => {
      const p = products.find((p) => p.id === i.id);
      if (!p) return "";
      const price = p.unit === "piece" ? p.pricePerPiece : p.pricePerKg;

      const detailLabel = i.weightPerPiece
        ? `${p.name[lang] || p.name.en} (${i.pcs} pcs × ${i.weightPerPiece.toFixed(1)} kg)`
        : `${p.name[lang] || p.name.en} × ${i.qty}${i.unit === "piece" ? "" : " kg"}`;

      return `
        <div class="flex justify-between text-sm py-1">
          <span class="text-[var(--color-ink)]">${detailLabel}</span>
          <span class="font-semibold">₹${(price * i.qty).toFixed(2)}</span>
        </div>`;
    })
    .join("");
  const freeBadge =
    fee === 0 && deliveryMethod === "home" && sub > 0
      ? `<div class="text-xs text-[var(--color-success)] font-semibold mb-1" data-i18n="freeDeliveryBadge"></div>`
      : "";
  return `
    <div class="font-semibold text-sm mb-2" data-i18n="checkoutSummary"></div>
    ${lines}
    <hr class="divider my-2" />
    <div class="flex justify-between text-sm text-[var(--color-muted)]"><span data-i18n="cartSubtotal"></span><span>₹${sub.toFixed(2)}</span></div>
    ${freeBadge}
    <div class="flex justify-between text-sm text-[var(--color-muted)] mb-1"><span data-i18n="cartDelivery"></span><span>${fee === 0 ? `<span data-i18n="cartFree"></span>` : `₹${fee}`}</span></div>
    <div class="flex justify-between font-bold text-base"><span data-i18n="cartTotal"></span><span>₹${tot.toFixed(2)}</span></div>
  `;
}

// ---------------------------------------------------------------------------
// Submit order -> WhatsApp
// ---------------------------------------------------------------------------

function submitOrder() {
  const errors = [];
  const form = document.getElementById("checkoutForm");
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const address = ""; // Hardcoded empty since we only do pickup now

  if (getState().items.length === 0) errors.push(t("errEmpty", lang));
  if (!name) errors.push(t("errName", lang));
  if (!/^[0-9]{10}$/.test(phone)) errors.push(t("errPhone", lang));

  const errBox = document.getElementById("checkoutErrors");
  if (errors.length) {
    errBox.innerHTML = errors.map((e) => `<div>${e}</div>`).join("");
    errBox.classList.remove("hidden");
    return;
  }
  errBox.classList.add("hidden");

  const message = buildWhatsAppMessage({ name, phone, address });
  showSendModal();
  setTimeout(() => updateSendModal("opening"), 900);
  setTimeout(() => {
    const url = `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    closeSend();
    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 300);
  }, 1700);
}

function buildWhatsAppMessage({ name, phone, address }) {
  const { items } = getState();
  const sub = subtotal();
  const fee = deliveryFee(deliveryMethod);
  const tot = total(deliveryMethod);

  const lines = items
    .map((i, idx) => {
      const p = products.find((p) => p.id === i.id);
      if (!p) return "";
      const price = p.unit === "piece" ? p.pricePerPiece : p.pricePerKg;
      const u = i.unit === "piece" ? "pcs" : "kg";

      if (i.weightPerPiece) {
        return `${idx + 1}. ${p.name[lang] || p.name.en} (${i.pcs} pcs × ${i.weightPerPiece.toFixed(1)} kg) — ${i.qty} kg × ₹${price} = ₹${(price * i.qty).toFixed(2)}`;
      }
      return `${idx + 1}. ${p.name[lang] || p.name.en} — ${i.qty} ${u} × ₹${price} = ₹${(price * i.qty).toFixed(2)}`;
    })
    .join("\n");

  const method = deliveryMethod === "pickup" ? t("checkoutPickup", lang) : t("checkoutHome", lang);
  const payMethod = paymentMethod === "cash" ? t("paymentCash", lang) : t("paymentOnline", lang);

  return [
    `*${t("brand", lang)}* — ${t("cartTitle", lang)}`,
    "",
    `*${t("checkoutName", lang)}:* ${name}`,
    `*${t("checkoutPhone", lang)}:* ${phone}`,
    `*${t("checkoutDelivery", lang)}:* ${method}`,
    `*${t("checkoutPayment", lang)}:* ${payMethod}`,
    "",
    `*${t("checkoutSummary", lang)}:*`,
    lines,
    "",
    `${t("cartSubtotal", lang)}: ₹${sub.toFixed(2)}`,
    `${t("cartDelivery", lang)}: ${fee === 0 ? t("cartFree", lang) : "₹" + fee}`,
    `*${t("cartTotal", lang)}: ₹${tot.toFixed(2)}*`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Send modal
// ---------------------------------------------------------------------------

function sendModalHtml() {
  return `
    <div id="sendModal" class="modal-overlay" style="pointer-events:none; opacity:0;">
      <div class="bg-white rounded-3xl w-full max-w-xs p-8 text-center">
        <div class="w-16 h-16 rounded-full bg-[#25D366]/15 mx-auto flex items-center justify-center mb-4">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2z"/></svg>
        </div>
        <div id="sendText" class="font-semibold text-lg mb-2"></div>
        <div class="w-8 h-8 mx-auto border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  `;
}

function showSendModal() {
  const modal = document.getElementById("sendModal");
  modal.style.opacity = "1";
  modal.style.pointerEvents = "auto";
  document.getElementById("sendText").textContent = t("sendPreparing", lang);
}
function updateSendModal(stage) {
  document.getElementById("sendText").textContent = t("sendOpening", lang);
}
function closeSend() {
  const modal = document.getElementById("sendModal");
  if (!modal) return;
  modal.style.opacity = "0";
  modal.style.pointerEvents = "none";
  clearCart();
  closeCheckout();
}

// ---------------------------------------------------------------------------
// i18n application + scroll reveal
// ---------------------------------------------------------------------------

function applyI18n(scope) {
  scope.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = t(key, lang);
    if (val) el.textContent = val;
  });
  scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const val = t(key, lang);
    if (val) el.placeholder = val;
  });
}

let revealObserver = null;
function observeReveal() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  root.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => {
    revealObserver.observe(el);
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

boot();
