/* ==========================================================
   main.js — logika utama undangan pernikahan
   Bergantung pada: wedding.js (weddingData), countdown.js,
   gallery.js, music.js, calendar.js
   ========================================================== */

/* ---------- Konstanta ---------- */
const OPENING_FADE_MS = 1200;      // samakan dengan transisi .opening-section di CSS
const SLIDE_INTERVAL_MS = 4500;
const TOAST_DURATION_MS = 3000;
const COMMENTS_KEY = "wedding_comments";

const DEFAULT_COMMENTS = [
    {
        name: "Budi Santoso",
        message: "Selamat berbahagia Maman & Dinceu! Semoga menjadi keluarga sakinah, mawaddah, warahmah.",
        date: "21 November 2026"
    },
    {
        name: "Rina & Keluarga",
        message: "Barakallahlakuma wa baraka 'alaikuma wa jama' bainakuma fi khair. Lancar sampai hari H!",
        date: "20 November 2026"
    }
];

/* ---------- Helper DOM ---------- */
const $ = (id) => document.getElementById(id);

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

function setAttr(id, attr, value) {
    const el = $(id);
    if (el) el.setAttribute(attr, value);
}

function escapeHTML(str = "") {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

/* ---------- Toast & Clipboard ---------- */
let toastTimer;

function showToast(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), TOAST_DURATION_MS);
}

async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback untuk http / browser lama
            const temp = document.createElement("textarea");
            temp.value = text;
            temp.style.position = "fixed";
            temp.style.opacity = "0";
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            temp.remove();
        }
        showToast("Berhasil disalin ke clipboard!");
    } catch (err) {
        console.error("Gagal menyalin:", err);
        showToast("Gagal menyalin, silakan salin manual.");
    }
}

/* ==========================================================
   RENDER DATA DARI wedding.js
   ========================================================== */
function renderSeo() {
    setText("meta-title", weddingData.seo.title);
    setAttr("meta-desc", "content", weddingData.seo.description);
}

function renderCouple() {
    const { groom, bride, dateFormatted } = weddingData;
    const coupleNames = `${groom.nickname} & ${bride.nickname}`;

    setText("couple-names-cover", coupleNames);
    setText("couple-names-closing", coupleNames);
    setText("wedding-date-cover", dateFormatted.replace(/,/g, "•"));
    setText("hero-date", dateFormatted);

    [["groom", groom], ["bride", bride]].forEach(([key, person]) => {
        setText(`${key}-name`, person.name);
        setText(`${key}-parents`, `${person.father} & ${person.mother}`);
        setAttr(`${key}-photo`, "src", person.photo);
        setAttr(`${key}-ig`, "href", person.instagram);
    });
}

function renderEvents() {
    [["akad", weddingData.akad], ["reception", weddingData.reception]].forEach(([key, event]) => {
        setText(`${key}-date`, event.date);
        setText(`${key}-time`, event.time);
        setText(`${key}-venue`, event.venue);
        setText(`${key}-address`, event.address);
        setAttr(`${key}-maps`, "href", event.mapsUrl);
    });
}

function renderLoveStory() {
    const container = $("timeline-container");
    const stories = weddingData.loveStory;

    if (!stories || stories.length === 0) {
        $("lovestory-section").style.display = "none";
        return;
    }

    container.innerHTML = stories.map((story) => `
        <div class="timeline-item reveal">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <span class="timeline-year">${escapeHTML(story.year)}</span>
                <h4>${escapeHTML(story.title)}</h4>
                <p>${escapeHTML(story.description)}</p>
            </div>
        </div>
    `).join("");
}

function renderGifts() {
    const container = $("gifts-container");
    const gifts = weddingData.gifts;

    if (gifts && gifts.length > 0) {
        container.innerHTML = gifts.map((gift) => `
            <div class="gift-card">
                <h4>${escapeHTML(gift.bankName)}</h4>
                <p class="account-number">${escapeHTML(gift.accountNumber)}</p>
                <p class="account-name">a.n. ${escapeHTML(gift.accountName)}</p>
                <button type="button" class="btn-outline small" data-copy="${escapeHTML(gift.accountNumber)}">
                    Salin No. Rekening
                </button>
            </div>
        `).join("");

        // Event delegation: tidak perlu onclick inline
        container.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-copy]");
            if (btn) copyToClipboard(btn.dataset.copy);
        });
    }

    setText("gift-recipient-name", `Penerima: ${weddingData.giftAddress.recipient}`);
    setText("gift-address-text", weddingData.giftAddress.address);
}

function loadWeddingData() {
    renderSeo();
    renderCouple();
    renderEvents();
    renderLoveStory();
    renderGifts();
}

/* ==========================================================
   FITUR INTERAKTIF
   ========================================================== */
function initGuestName() {
    // URLSearchParams sudah men-decode otomatis, jadi tidak perlu decodeURIComponent lagi
    const guest = new URLSearchParams(window.location.search).get("to");
    if (guest) setText("guest-name", guest);
}

function initOpening() {
    const opening = $("opening");
    const main = $("main-container");
    const openBtn = $("open-invitation-btn");
    if (!opening || !main || !openBtn) return;

    document.body.classList.add("locked");

    openBtn.addEventListener("click", () => {
        main.classList.remove("hidden");           // tampil di bawah cover
        document.body.classList.remove("locked");
        opening.classList.add("closed");           // cover meluncur ke atas
        setTimeout(() => opening.classList.add("hidden"), OPENING_FADE_MS);

        try {
            if (typeof window.startWeddingMusic === "function") window.startWeddingMusic();
        } catch (err) {
            console.warn("Musik dilewati:", err);
        }
    });
}

function initOpeningSlideshow() {
    const slides = document.querySelectorAll(".opening-slideshow .slide");
    if (slides.length < 2) return;

    let current = 0;
    setInterval(() => {
        slides[current].classList.remove("active");
        current = (current + 1) % slides.length;
        slides[current].classList.add("active");
    }, SLIDE_INTERVAL_MS);
}

function initRsvp() {
    const form = $("rsvp-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = $("rsvp-name").value.trim();
        const status = $("rsvp-status").value;
        const note = $("rsvp-message").value.trim();

        let text = `Halo, saya ${name}. Saya mengonfirmasi status kehadiran: *${status}*.`;
        if (note) text += `\nCatatan: ${note}`;

        const url = `https://wa.me/${weddingData.whatsapp.phoneNumber}?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank", "noopener");
    });
}

function initCopyAddress() {
    const btn = $("copy-address-btn");
    if (!btn) return;
    btn.addEventListener("click", () => copyToClipboard($("gift-address-text").textContent));
}

function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
        targets.forEach((el) => el.classList.add("active"));
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("active");
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.15 });

    targets.forEach((el) => observer.observe(el));
}

/* ---------- Buku Tamu ---------- */
function loadComments() {
    try {
        const saved = JSON.parse(localStorage.getItem(COMMENTS_KEY));
        if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch (err) {
        console.warn("localStorage tidak tersedia:", err);
    }
    return [...DEFAULT_COMMENTS];
}

function saveComments(comments) {
    try {
        localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    } catch (err) {
        console.warn("Gagal menyimpan ucapan:", err);
    }
}

function initGuestbook() {
    const form = $("guestbook-form");
    const list = $("comments-list");
    if (!list) return;

    let comments = loadComments();

    const render = () => {
        list.innerHTML = comments.map((c) => `
            <div class="comment-item">
                <h4 class="comment-author">${escapeHTML(c.name)}</h4>
                <p class="comment-text">${escapeHTML(c.message)}</p>
                <span class="comment-date">${escapeHTML(c.date)}</span>
            </div>
        `).join("");
    };

    render();
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nameInput = $("guest-book-name");
        const msgInput = $("guest-book-msg");
        const name = nameInput.value.trim();
        const message = msgInput.value.trim();
        if (!name || !message) return;

        comments.unshift({
            name,
            message,
            date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        });

        saveComments(comments);
        render();
        form.reset();
        showToast("Ucapan berhasil dikirim!");
    });
}

/* ==========================================================
   INIT
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
    loadWeddingData();

    initCountdown(weddingData.weddingDateISO);
    initGallery(weddingData.gallery);
    musicPlayer.init(weddingData.music.audioSource);
    initCalendarEvents(weddingData);

    initGuestName();
    initOpening();
    initOpeningSlideshow();
    initRsvp();
    initCopyAddress();
    initGuestbook();
    initScrollReveal();   // paling akhir, setelah semua elemen .reveal dibuat
});
