/* ========= Mobile Nav ========= */
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");
const navOverlay = document.getElementById("navOverlay");

const MOBILE_BREAKPOINT = 860;

function openNav() {
  if (!navMenu || !navToggle) return;
  navMenu.classList.add("is-open");
  document.body.classList.add("nav-open");
  navToggle.setAttribute("aria-expanded", "true");
  navToggle.setAttribute("aria-label", "Close menu");
}

function closeNav() {
  if (!navMenu || !navToggle) return;
  navMenu.classList.remove("is-open");
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open menu");
}

function toggleNav() {
  if (!navMenu) return;
  const isOpen = navMenu.classList.contains("is-open");
  isOpen ? closeNav() : openNav();
}

navToggle?.addEventListener("click", toggleNav);
navOverlay?.addEventListener("click", closeNav);
window.addEventListener("resize", () => {
  if (window.innerWidth > MOBILE_BREAKPOINT) closeNav();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeNav();
});
document.querySelectorAll(".nav__menu .nav__link").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) closeNav();
  });
});

/* ========= Footer year ========= */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ========= News (Ticker + Cards) ========= */
const tickerTrack = document.getElementById("newsTickerTrack");
const newsCards = document.getElementById("newsCards");

const CACHE_KEY = "tag_news_cache_v4";
const CACHE_TTL_MS = 15 * 60 * 1000;

const FALLBACK_ITEMS = [
  { title: "Regional fuel storage expansion signals continued corridor investment momentum", source: "Market Brief", date: "Today", url: "#insights" },
  { title: "Cross-border logistics upgrades support more reliable supply into landlocked markets", source: "Trade & Transport", date: "This week", url: "#insights" },
  { title: "Ports and midstream capacity remain central to lowering delivered cost across Africa", source: "Infrastructure", date: "This week", url: "#insights" },
  { title: "Energy transition enabling assets continue to attract blended finance interest", source: "Finance", date: "This month", url: "#insights" },
];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.items || !parsed.ts) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
  } catch {}
}

function normalizeItems(items) {
  return (items || [])
    .filter(Boolean)
    .map((x) => ({
      title: x.title || "Headline",
      source: x.source || "Source",
      date: x.date || "",
      url: x.url || "#insights",
    }));
}

let CURRENT_NEWS_ITEMS = normalizeItems(readCache() || FALLBACK_ITEMS);

function isMobileTicker() {
  return window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
}

function updateTickerDistance() {
  if (!tickerTrack) return;

  requestAnimationFrame(() => {
    const items = tickerTrack.querySelectorAll(".ticker__item");
    const half = Math.max(1, Math.floor(items.length / 2));
    let width = 0;

    for (let i = 0; i < half; i += 1) {
      width += items[i].offsetWidth;
      if (i < half - 1) width += 18;
    }

    tickerTrack.style.setProperty("--ticker-distance", `${Math.max(width, 240)}px`);

    tickerTrack.style.animation = "none";
    void tickerTrack.offsetHeight;
    tickerTrack.style.animation = "";
  });
}

function renderTicker(items) {
  if (!tickerTrack) return;

  const safe = items && items.length ? items : FALLBACK_ITEMS;
  CURRENT_NEWS_ITEMS = safe;

  const base = isMobileTicker() ? safe.slice(0, 8) : safe.slice(0, 12);
  const trackItems = [...base, ...base];

  tickerTrack.innerHTML = trackItems.map((item) => `
    <span class="ticker__item">
      <span class="ticker__dot" aria-hidden="true"></span>
      <a href="${item.url}" target="${item.url.startsWith("http") ? "_blank" : "_self"}" rel="noopener">
        ${escapeHtml(item.title)}
      </a>
      <span class="ticker__src" aria-hidden="true">• ${escapeHtml(item.source)}</span>
    </span>
  `).join("");

  updateTickerDistance();
}

function renderCards(items) {
  if (!newsCards) return;
  const safe = (items && items.length ? items : FALLBACK_ITEMS).slice(0, 6);

  newsCards.innerHTML = safe.map((item) => `
    <article class="news-card">
      <h3 class="news-card__title">${escapeHtml(item.title)}</h3>
      <div class="news-card__meta">
        <span class="news-card__src">${escapeHtml(item.source)}</span>
        ${item.date ? `<span>${escapeHtml(item.date)}</span>` : ""}
      </div>
      <a class="news-card__link" href="${item.url}" target="${item.url.startsWith("http") ? "_blank" : "_self"}" rel="noopener">
        Read more →
      </a>
    </article>
  `).join("");
}

renderTicker(CURRENT_NEWS_ITEMS);
renderCards(CURRENT_NEWS_ITEMS);

const RSS_SOURCES = [
  "https://www.reutersagency.com/feed/?best-topics=energy&post_type=best",
  "https://www.energyvoice.com/feed/",
  "https://www.offshore-energy.biz/feed/",
  "https://www.engineeringnews.co.za/rss/?section=energy",
];

async function fetchRss(url) {
  const endpoint = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url);
  const res = await fetch(endpoint, { cache: "no-store" });
  if (!res.ok) throw new Error("RSS fetch failed");

  const data = await res.json();
  return (data.items || []).slice(0, 6).map((it) => ({
    title: it.title,
    source: data.feed?.title || "News",
    date: it.pubDate ? new Date(it.pubDate).toLocaleDateString() : "",
    url: it.link,
  }));
}

async function loadNews() {
  try {
    const results = await Promise.allSettled(RSS_SOURCES.map(fetchRss));
    const merged = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const deduped = [];
    const seen = new Set();

    for (const item of normalizeItems(merged.length ? merged : FALLBACK_ITEMS)) {
      const key = `${item.title}`.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    writeCache(deduped);
    renderTicker(deduped);
    renderCards(deduped);
  } catch {
    renderTicker(normalizeItems(FALLBACK_ITEMS));
    renderCards(normalizeItems(FALLBACK_ITEMS));
  }
}

let tickerModeMobile = isMobileTicker();
window.addEventListener("resize", () => {
  const next = isMobileTicker();
  if (next !== tickerModeMobile) {
    tickerModeMobile = next;
    renderTicker(CURRENT_NEWS_ITEMS);
  } else {
    updateTickerDistance();
  }
}, { passive: true });

window.addEventListener("load", updateTickerDistance);
loadNews();

/* ========= LinkedIn ========= */
const LINKEDIN_COMPANY_URL = "https://www.linkedin.com/company/theatacamagroup";

/*
  LIVE FEED: LinkedIn has no public API/RSS for company feeds, so a static site
  needs a feed-widget service (e.g. SociableKIT or Elfsight, free tiers available).
  Create a "LinkedIn Page Posts" widget for /company/theatacamagroup, then paste
  its embed URL below. When set, the section renders the auto-updating live feed;
  when empty, it falls back to the curated embeds in LINKEDIN_EMBEDS.
*/
const LINKEDIN_FEED_IFRAME = ""; // e.g. "https://widgets.sociablekit.com/linkedin-page-posts/iframe/XXXXXX"
const LINKEDIN_EMBEDS = [
  {
    embed: "https://www.linkedin.com/embed/feed/update/urn:li:share:7473816035134136320?collapsed=1",
    height: 666,
  },
  {
    embed: "https://www.linkedin.com/embed/feed/update/urn:li:share:7434209830409723904?collapsed=1",
    height: 563,
  },
];

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function postUrlFromEmbed(embedUrl) {
  const m = String(embedUrl).match(/urn:li:share:(\d+)/);
  if (m && m[0]) return `https://www.linkedin.com/feed/update/${m[0]}/`;
  return LINKEDIN_COMPANY_URL;
}

function liHeightForPost(post) {
  const baseHeight = Number(post?.height) || 520;
  const w = window.innerWidth || 1200;

  if (w <= 560) return Math.max(420, Math.round(baseHeight * 0.92));
  if (w <= 1020) return Math.max(460, Math.round(baseHeight * 0.96));
  return baseHeight;
}

function reloadIframe(frame) {
  try {
    const src = frame.getAttribute("src");
    frame.removeAttribute("src");
    window.requestAnimationFrame(() => {
      frame.setAttribute("src", src || "");
    });
  } catch {}
}

function markEmbedReady(card) {
  if (!card) return;
  card.classList.remove("li__card--loading");
}

function renderLinkedInEmbeds() {
  const mount = document.getElementById("linkedinEmbeds");
  if (!mount) return;

  if (LINKEDIN_FEED_IFRAME) {
    mount.classList.add("li__grid--feed");
    mount.innerHTML = `
      <div class="li__feedWrap">
        <iframe
          class="li__feed"
          src="${escapeAttr(LINKEDIN_FEED_IFRAME)}"
          title="The Atacama Group live LinkedIn feed"
          frameborder="0"
          loading="lazy"
          scrolling="yes"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
    `;
    return;
  }

  const safe = LINKEDIN_EMBEDS.filter((item) => item && item.embed).slice(0, 3);

  mount.innerHTML = safe
    .map((post, idx) => {
      const embedSrc = post.embed;
      const postUrl = postUrlFromEmbed(embedSrc);
      const embedHeight = liHeightForPost(post);

      return `
        <article class="li__card li__card--loading" data-li-index="${idx}" aria-label="LinkedIn post">
          <div class="li__embedWrap" style="height:${embedHeight}px">
            <div class="li__shimmer" aria-hidden="true"></div>

            <iframe
              class="li__embed"
              src="${escapeAttr(embedSrc)}"
              title="Embedded LinkedIn post ${idx + 1}"
              width="504"
              height="${embedHeight}"
              frameborder="0"
              loading="lazy"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>

            <div class="li__footer" aria-label="LinkedIn actions">
              <a class="li__openLink" href="${escapeAttr(postUrl)}" target="_blank" rel="noopener" aria-label="Open post on LinkedIn">
                Open ↗
              </a>

              <button class="li__helpBtn" type="button" aria-label="Having trouble viewing this embed?">
                Having trouble viewing?
              </button>
            </div>

            <div class="li__helpPanel" role="note" aria-label="LinkedIn embed notice">
              <div class="li__helpInner">
                <div class="li__helpTitle">LinkedIn embed may be blocked</div>
                <div class="li__helpText">
                  Some browsers block LinkedIn embeds until privacy consent is granted or third-party content is allowed.
                  Use the buttons below to view the post directly, or reload the embed.
                </div>
                <div class="li__helpActions">
                  <a class="btn btn--li btn--small" href="${escapeAttr(postUrl)}" target="_blank" rel="noopener">View post</a>
                  <a class="btn btn--ghost btn--small" href="${escapeAttr(LINKEDIN_COMPANY_URL)}" target="_blank" rel="noopener">Company page</a>
                  <button class="btn btn--ghost btn--small li__reloadEmbed" type="button">Reload embed</button>
                  <button class="btn btn--ghost btn--small li__closeHelp" type="button">Close</button>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const cards = mount.querySelectorAll(".li__card");

  cards.forEach((card) => {
    const frame = card.querySelector("iframe.li__embed");
    const helpBtn = card.querySelector(".li__helpBtn");
    const closeBtn = card.querySelector(".li__closeHelp");
    const reloadBtn = card.querySelector(".li__reloadEmbed");

    const readyTimer = window.setTimeout(() => markEmbedReady(card), 2200);

    frame?.addEventListener(
      "load",
      () => {
        window.clearTimeout(readyTimer);
        markEmbedReady(card);
      },
      { once: true }
    );

    frame?.addEventListener("error", () => {
      window.clearTimeout(readyTimer);
      markEmbedReady(card);
      card.classList.add("li__card--help");
    });

    helpBtn?.addEventListener("click", () => card.classList.add("li__card--help"));
    closeBtn?.addEventListener("click", () => card.classList.remove("li__card--help"));
    reloadBtn?.addEventListener("click", () => {
      if (frame) {
        card.classList.add("li__card--loading");
        reloadIframe(frame);
        window.setTimeout(() => markEmbedReady(card), 2200);
      }
      card.classList.remove("li__card--help");
    });
  });
}

renderLinkedInEmbeds();
window.addEventListener(
  "resize",
  () => {
    renderLinkedInEmbeds();
  },
  { passive: true }
);

/* ========= Contact Form ========= */
const CONTACT_TO = "media@theatacamagroup.com";
const MIN_FORM_FILL_TIME_MS = 2500;
const MAX_LINK_COUNT = 2;

const contactForm = document.getElementById("contactForm");
const contactName = document.getElementById("name");
const contactEmail = document.getElementById("email");
const contactCompany = document.getElementById("company");
const contactWebsite = document.getElementById("website");
const contactMessage = document.getElementById("msg");
const contactFax = document.getElementById("contactFax");
const contactOffice = document.getElementById("contactOffice");
const formStartedAt = document.getElementById("formStartedAt");
const formStatus = document.getElementById("formStatus");
const contactSubmit = document.getElementById("contactSubmit");

const msgCount = document.getElementById("msgCount");
const fieldErrors = {
  name: document.getElementById("nameError"),
  email: document.getElementById("emailError"),
  company: document.getElementById("companyError"),
  website: document.getElementById("websiteError"),
  message: document.getElementById("msgError"),
};

let formInteracted = false;

if (formStartedAt) {
  formStartedAt.value = String(Date.now());
}

function setFormStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.remove("is-error", "is-success");
  if (type) formStatus.classList.add(type);
}

function setInvalidState(field, invalid) {
  if (!field) return;
  field.classList.toggle("is-invalid", Boolean(invalid));
  if (invalid) {
    field.setAttribute("aria-invalid", "true");
  } else {
    field.removeAttribute("aria-invalid");
  }
}

function sanitizeFormValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toggleFieldError(key, show) {
  const el = fieldErrors[key];
  if (!el) return;
  el.classList.toggle("is-visible", Boolean(show));
}

function clearFieldErrors() {
  Object.keys(fieldErrors).forEach((key) => toggleFieldError(key, false));
}

function updateMessageCount() {
  if (!msgCount || !contactMessage) return;
  const count = contactMessage.value.length;
  msgCount.textContent = `${count} / 2000`;
}


function countLinks(text) {
  const matches = String(text || "").match(/(https?:\/\/|www\.)/gi);
  return matches ? matches.length : 0;
}

function hasRepeatedCharacters(text) {
  return /(.)\1{6,}/i.test(String(text || ""));
}

function hasTooManyCaps(text) {
  const value = String(text || "").replace(/[^a-z]/gi, "");
  if (value.length < 12) return false;
  const upper = value.replace(/[^A-Z]/g, "").length;
  return upper / value.length > 0.75;
}

function looksSpammy(text) {
  const value = sanitizeFormValue(text).toLowerCase();
  if (!value) return false;

  const spamPatterns = [
    /\bseo\b/,
    /\bcrypto\b/,
    /\bcasino\b/,
    /\btelegram\b/,
    /\bwhatsapp\b/,
    /\bviagra\b/,
    /\bbacklinks?\b/,
    /\bmarketing agency\b/,
    /\bguest post\b/,
    /\bbuy now\b/,
    /\bclick here\b/,
    /\b100% free\b/
  ];

  return spamPatterns.some((pattern) => pattern.test(value));
}

function validateWebsite(value) {
  const website = sanitizeFormValue(value);
  if (!website) return true;

  try {
    const normalized = website.startsWith("http://") || website.startsWith("https://")
      ? website
      : `https://${website}`;
    const parsed = new URL(normalized);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

function validateContactForm() {
  const name = sanitizeFormValue(contactName?.value);
  const email = sanitizeFormValue(contactEmail?.value);
  const website = sanitizeFormValue(contactWebsite?.value);
  const message = String(contactMessage?.value || "").trim();
  const honeypot = sanitizeFormValue(contactFax?.value);
  const startedAt = Number(formStartedAt?.value || 0);
  const elapsed = Date.now() - startedAt;

  [contactName, contactEmail, contactCompany, contactWebsite, contactMessage].forEach((field) => setInvalidState(field, false));
  clearFieldErrors();

  if (honeypot || sanitizeFormValue(contactOffice?.value)) {
    setFormStatus("Submission blocked.", "is-error");
    return null;
  }

  if (!name || name.length < 2) {
    setInvalidState(contactName, true);
    toggleFieldError("name", true);
    setFormStatus("Please enter your full name.", "is-error");
    return null;
  }

  const company = sanitizeFormValue(contactCompany?.value);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    setInvalidState(contactEmail, true);
    toggleFieldError("email", true);
    setFormStatus("Please enter a valid email address.", "is-error");
    return null;
  }

  if (!company || company.length < 2) {
    setInvalidState(contactCompany, true);
    toggleFieldError("company", true);
    setFormStatus("Please enter your company name.", "is-error");
    return null;
  }

  if (website && !validateWebsite(website)) {
    setInvalidState(contactWebsite, true);
    toggleFieldError("website", true);
    setFormStatus("Please enter a valid website address, or leave it blank.", "is-error");
    return null;
  }

  if (!message || sanitizeFormValue(message).length < 20) {
    setInvalidState(contactMessage, true);
    toggleFieldError("message", true);
    setFormStatus("Please add a more detailed message.", "is-error");
    return null;
  }

  if (elapsed > 0 && elapsed < MIN_FORM_FILL_TIME_MS && !formInteracted) {
    setFormStatus("Please take a moment to review your message before sending.", "is-error");
    return null;
  }

  if (countLinks(message) > MAX_LINK_COUNT || countLinks(name) > 0 || countLinks(company) > 0) {
    setFormStatus("Please remove unnecessary links and try again.", "is-error");
    return null;
  }

  if (hasRepeatedCharacters(name) || hasRepeatedCharacters(company) || hasRepeatedCharacters(message)) {
    setFormStatus("Please revise the message and try again.", "is-error");
    return null;
  }

  if (hasTooManyCaps(message)) {
    setFormStatus("Please avoid all-caps text and try again.", "is-error");
    return null;
  }

  if (looksSpammy(name) || looksSpammy(email) || looksSpammy(company) || looksSpammy(message) || looksSpammy(website)) {
    setFormStatus("Your message could not be sent. Please remove promotional or spam-like text and try again.", "is-error");
    return null;
  }

  return { name, email, company, website, message };
}

function buildMailtoUrl({ name, email, company, website, message }) {
  const subject = `Website enquiry from ${name}`;
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company}`,
    `Website: ${website || "Not provided"}`,
    "",
    "Message:",
    message
  ].join("\n");

  const params = new URLSearchParams({
    subject,
    body
  });

  return `mailto:${CONTACT_TO}?${params.toString()}`;
}

[contactName, contactEmail, contactCompany, contactWebsite, contactMessage].forEach((field) => {
  field?.addEventListener("input", () => {
    formInteracted = true;
    setInvalidState(field, false);
    if (formStatus?.classList.contains("is-error")) {
      setFormStatus("");
    }
  });
});

contactMessage?.addEventListener("input", updateMessageCount);
updateMessageCount();

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = validateContactForm();
  if (!payload) return;

  if (contactSubmit) {
    contactSubmit.disabled = true;
    contactSubmit.textContent = "Preparing draft…";
  }

  setFormStatus("Preparing your email draft…", "is-success");

  const mailtoUrl = buildMailtoUrl(payload);
  window.location.href = mailtoUrl;

  window.setTimeout(() => {
    if (contactSubmit) {
      contactSubmit.disabled = false;
      contactSubmit.textContent = "Prepare Email Draft";
    }
    setFormStatus("Your email draft to our media team is ready. Just press send.", "is-success");
  }, 1200);
});

/* ========= Interactive Footprint Map ========= */
(() => {
  const map = document.getElementById("footprintMap");
  const tip = document.getElementById("fmapTip");
  if (!map || !tip) return;

  const svg = map.querySelector(".fmap__svg");
  const nodes = Array.from(map.querySelectorAll(".fmap__node"));
  const routes = Array.from(map.querySelectorAll(".fmap__route"));

  const VIEW_W = 640;
  const VIEW_H = 700;

  const COPY = {
    wvb: {
      kind: "ATLANTIC GATEWAY · 22°57′S 14°30′E",
      name: "Walvis Bay, Namibia",
      text: "Deep-water port access with rail-linked bulk storage and metered dispatch into the inland corridor.",
    },
    dji: {
      kind: "RED SEA GATEWAY · 11°35′N 43°09′E",
      name: "Djibouti",
      text: "Corridor platform on the Red Sea, positioned to serve Ethiopia and the wider Horn of Africa.",
    },
    drc: {
      kind: "CORRIDOR MARKET",
      name: "Lubumbashi, DR Congo",
      text: "Copperbelt demand centre reached by rail and road from the Atlantic gateway.",
    },
    zmb: {
      kind: "CORRIDOR MARKET",
      name: "Lusaka, Zambia",
      text: "Inland energy demand served through the Walvis Bay corridor at lower delivered cost.",
    },
    zwe: {
      kind: "CORRIDOR MARKET",
      name: "Harare, Zimbabwe",
      text: "Southern corridor market with growing bulk supply requirements.",
    },
    eth: {
      kind: "CORRIDOR MARKET",
      name: "Addis Ababa, Ethiopia",
      text: "Landlocked demand centre supplied through the Djibouti gateway.",
    },
  };

  const tipKind = tip.querySelector(".fmap__tipKind");
  const tipName = tip.querySelector(".fmap__tipName");
  const tipText = tip.querySelector(".fmap__tipText");

  let pinnedId = null;

  function lightRoutes(id) {
    routes.forEach((route) => {
      const connected = route.dataset.from === id || route.dataset.to === id;
      route.classList.toggle("is-lit", Boolean(id) && connected);
      route.classList.toggle("is-dim", Boolean(id) && !connected);
    });
  }

  function positionTip(node) {
    const x = Number(node.dataset.x);
    const y = Number(node.dataset.y);
    const svgRect = svg.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();

    let px = svgRect.left - mapRect.left + (x / VIEW_W) * svgRect.width;
    const py = svgRect.top - mapRect.top + (y / VIEW_H) * svgRect.height;

    // Flip below the node when it sits near the top of the map
    const below = py < 130;
    tip.classList.toggle("fmap__tip--below", below);

    // Keep the card inside the container horizontally
    tip.hidden = false;
    const half = tip.offsetWidth / 2;
    const min = half + 8;
    const max = mapRect.width - half - 8;
    px = Math.min(Math.max(px, min), max);

    tip.style.left = `${px}px`;
    tip.style.top = `${below ? py : py - 14}px`;
  }

  function showTip(node) {
    const copy = COPY[node.dataset.id];
    if (!copy) return;
    tipKind.textContent = copy.kind;
    tipName.textContent = copy.name;
    tipText.textContent = copy.text;
    positionTip(node);
    tip.classList.add("is-visible");
    nodes.forEach((n) => n.classList.toggle("is-active", n === node));
    lightRoutes(node.dataset.id);
  }

  function hideTip() {
    tip.classList.remove("is-visible");
    tip.hidden = true;
    nodes.forEach((n) => n.classList.remove("is-active"));
    lightRoutes(null);
  }

  nodes.forEach((node) => {
    node.addEventListener("pointerenter", () => {
      if (!pinnedId) showTip(node);
    });
    node.addEventListener("pointerleave", () => {
      if (!pinnedId) hideTip();
    });
    node.addEventListener("focus", () => {
      if (!pinnedId) showTip(node);
    });
    node.addEventListener("blur", () => {
      if (!pinnedId) hideTip();
    });
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      if (pinnedId === node.dataset.id) {
        pinnedId = null;
        hideTip();
      } else {
        pinnedId = node.dataset.id;
        showTip(node);
      }
    });
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        node.click();
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (pinnedId && !map.contains(event.target)) {
      pinnedId = null;
      hideTip();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pinnedId) {
      pinnedId = null;
      hideTip();
    }
  });

  window.addEventListener("resize", () => {
    if (!pinnedId) return;
    const node = nodes.find((n) => n.dataset.id === pinnedId);
    if (node) positionTip(node);
  }, { passive: true });
})();

/* ========= Scroll Reveal ========= */
(() => {
  const revealEls = document.querySelectorAll(".reveal");
  if (!revealEls.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => observer.observe(el));
})();
