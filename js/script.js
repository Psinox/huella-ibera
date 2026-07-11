(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HD = window.huellaData;
  if (!HD) return;

  /* -----------------------------------------------------------------------
     Año automático en el footer
     ----------------------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------------------------------------------------------
     NAV: fondo sólido al hacer scroll + menú mobile
     ----------------------------------------------------------------------- */
  var nav = document.getElementById("siteNav");
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");

  function onScrollNav() {
    if (!nav) return;
    if (window.scrollY > 40) {
      nav.classList.add("is-scrolled");
    } else {
      nav.classList.remove("is-scrolled");
    }
  }
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.innerHTML = isOpen
        ? '<svg aria-hidden="true"><use href="#icon-close"/></svg>'
        : '<svg aria-hidden="true"><use href="#icon-menu"/></svg>';
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.innerHTML = '<svg aria-hidden="true"><use href="#icon-menu"/></svg>';
        document.body.style.overflow = "";
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navLinks.classList.contains("is-open")) {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.innerHTML = '<svg aria-hidden="true"><use href="#icon-menu"/></svg>';
        document.body.style.overflow = "";
      }
    });
  }

  /* -----------------------------------------------------------------------
     REVEAL al hacer scroll (IntersectionObserver)
     ----------------------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* -----------------------------------------------------------------------
     ACORDEONES
     ----------------------------------------------------------------------- */
  document.querySelectorAll(".accordion-item").forEach(function (item) {
    var trigger = item.querySelector(".accordion-trigger");
    var panel = item.querySelector(".accordion-panel");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");

      var parentAccordion = item.parentElement;
      parentAccordion.querySelectorAll(".accordion-item.is-open").forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove("is-open");
          openItem.querySelector(".accordion-trigger").setAttribute("aria-expanded", "false");
          openItem.querySelector(".accordion-panel").style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        panel.style.maxHeight = null;
      } else {
        item.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });

  window.addEventListener("resize", function () {
    document.querySelectorAll(".accordion-item.is-open .accordion-panel").forEach(function (panel) {
      panel.style.maxHeight = panel.scrollHeight + "px";
    });
  });

  /* -----------------------------------------------------------------------
     CARRUSEL DE EXPEDICIONES
     ----------------------------------------------------------------------- */
  var scroller = document.getElementById("expScroller");
  var prevBtn = document.getElementById("expPrev");
  var nextBtn = document.getElementById("expNext");

  function scrollByCard(dir) {
    if (!scroller) return;
    var card = scroller.querySelector(".exp-card");
    var step = card ? card.getBoundingClientRect().width + 22 : 320;
    scroller.scrollBy({ left: dir * step, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }
  if (prevBtn) prevBtn.addEventListener("click", function () { scrollByCard(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { scrollByCard(1); });

  /* -----------------------------------------------------------------------
     GALERÍA — lightbox (delegación de eventos: sigue funcionando aunque
     el marquee duplique las imágenes para el loop infinito)
     ----------------------------------------------------------------------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxClose = document.getElementById("lightboxClose");

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".gallery-infinite button[data-full]") : null;
    if (!btn) return;
    var full = btn.getAttribute("data-full");
    var img = btn.querySelector("img");
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = full;
    lightboxImg.alt = img ? img.alt : "";
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  });

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  /* -----------------------------------------------------------------------
     GALERÍA — scroll infinito (marquee de dos filas, sentidos opuestos)
     ----------------------------------------------------------------------- */
  function initMarquee(marquee) {
    var track = marquee.querySelector(".marquee__track");
    if (!track) return;
    var isRight = track.classList.contains("marquee__track--right");

    if (prefersReducedMotion) return; // deja el scroll horizontal nativo, sin animación

    // duplica el contenido una vez para que el loop sea perfecto (seamless)
    track.innerHTML += track.innerHTML;
    track.querySelectorAll("img").forEach(function (img) {
      img.setAttribute("draggable", "false"); // evita el "fantasma" de arrastre nativo del navegador
    });

    var speed = 0.5; // px por frame — automático, siempre corriendo
    var half = track.scrollWidth / 2;
    var pos = isRight ? -half : 0;
    var paused = false;
    var dragging = false;
    var dragStartX = 0;
    var dragStartPos = 0;
    var dragMoved = 0;
    var activePointerId = null;

    marquee.addEventListener("mouseenter", function () { paused = true; });
    marquee.addEventListener("mouseleave", function () { paused = false; });

    // arrastre con el puntero — funciona igual con mouse (PC) y con el dedo (mobile)
    marquee.addEventListener("pointerdown", function (e) {
      dragging = true;
      paused = true;
      dragMoved = 0;
      dragStartX = e.clientX;
      dragStartPos = pos;
      activePointerId = e.pointerId;
      marquee.classList.add("is-dragging");
      try { marquee.setPointerCapture(e.pointerId); } catch (err) {}
    });
    marquee.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== activePointerId) return;
      var delta = e.clientX - dragStartX;
      dragMoved = Math.max(dragMoved, Math.abs(delta));
      pos = dragStartPos + delta;
      e.preventDefault();
    }, { passive: false });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      paused = false;
      activePointerId = null;
      marquee.classList.remove("is-dragging");
    }
    marquee.addEventListener("pointerup", endDrag);
    marquee.addEventListener("pointercancel", endDrag);
    marquee.addEventListener("pointerleave", endDrag);

    // si hubo arrastre real, cancela el click para que no abra el lightbox sin querer
    marquee.addEventListener("click", function (e) {
      if (dragMoved > 6) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);

    function tick() {
      half = track.scrollWidth / 2; // por si las imágenes lazy cambian el ancho
      if (!paused) {
        if (isRight) {
          pos += speed;
          if (pos >= 0) pos -= half;
        } else {
          pos -= speed;
          if (pos <= -half) pos += half;
        }
      } else if (dragging) {
        // mantiene el valor arrastrado dentro del rango del loop
        if (pos >= 0) pos -= half;
        if (pos <= -half) pos += half;
      }
      track.style.transform = "translateX(" + pos + "px)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* -----------------------------------------------------------------------
     WHATSAPP
     ----------------------------------------------------------------------- */
  var WHATSAPP_NUMBER = "5491150204031";

  function buildWaLink(message) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  }

  function setupWaButtons() {
    document.querySelectorAll(".reservar-pkg").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var pkg = btn.getAttribute("data-pkg") || "uno de los paquetes";
        var msg = "¡Hola! Quiero consultar disponibilidad para el paquete " + pkg + " en Huella Iberá.";
        window.open(buildWaLink(msg), "_blank", "noopener");
      });
    });
  }

  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var nombre = (document.getElementById("cf-name") || {}).value || "";
      var personas = (document.getElementById("cf-people") || {}).value || "";
      var paqueteSelect = document.getElementById("cf-pkg");
      var paquete = paqueteSelect ? paqueteSelect.value : "";
      var fechas = (document.getElementById("cf-dates") || {}).value || "";
      var mensaje = (document.getElementById("cf-msg") || {}).value || "";

      var partes = ["¡Hola! Soy " + (nombre || "un/a viajero/a") + "."];
      if (personas) partes.push("Somos " + personas + " persona(s).");
      if (paquete) partes.push("Nos interesa el paquete " + paquete + ".");
      if (fechas) partes.push("Fechas aproximadas: " + fechas + ".");
      if (mensaje) partes.push(mensaje);

      window.open(buildWaLink(partes.join(" ")), "_blank", "noopener");
    });
  }

  /* ===================================================================
     RENDERIZACIÓN DINÁMICA
     =================================================================== */

  function renderSeasonBanner() {
    var season = HD.getCurrentSeason();
    var label = document.getElementById("seasonLabel");
    if (label) label.textContent = HD.SEASONS[season] || "Primavera";
  }

  function renderPackages() {
    var grid = document.getElementById("packagesGrid");
    if (!grid) return;

    var season = HD.getCurrentSeason();
    var pkgs = HD.getPackages().filter(function (p) { return p.season === season && p.active; });

    grid.innerHTML = "";
    if (pkgs.length === 0) {
      grid.innerHTML = '<p class="lede" style="grid-column:1/-1;text-align:center;padding:2rem 0;">No hay paquetes disponibles para esta temporada. Consultanos por WhatsApp.</p>';
      return;
    }

    pkgs.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "pkg-card reveal" + (p.featured ? " is-featured" : "");
      card.setAttribute("data-pkg", p.name + " (" + p.nights + " noches)");

      var html = "";
      if (p.featured) {
        html += '<span class="pkg-featured-flag">El más elegido</span>';
      }
      html += '<div class="pkg-head">';
      html += '  <span class="script-tag">' + p.name + '</span>';
      html += '  <p class="nights"><em>' + p.nights + '</em> noche' + (p.nights !== 1 ? "s" : "") + '</p>';
      html += '  <p class="meal">' + (p.mealLabel || 'Desayuno y cena') + '</p>';
      html += '</div>';
      html += '<div class="pkg-body">';
      html += '  <ul class="pkg-acts">';
      (p.activities || []).forEach(function (act) {
        html += '    <li><svg aria-hidden="true"><use href="#icon-check"/></svg>' + act + '</li>';
      });
      html += '  </ul>';
      html += '  <table class="rate-table"><tbody>';
      var rateKeys = [
        { key: "single", label: "Base single" },
        { key: "doble", label: "Base doble" },
        { key: "triple", label: "Base triple" },
        { key: "cuadruple", label: "Base cuádruple" },
        { key: "quintuple", label: "Base quíntuple" },
        { key: "menores", label: "Menores 3 a 8 años", minor: true }
      ];
      rateKeys.forEach(function (rk) {
        var val = p.rates[rk.key];
        if (val > 0) {
          html += '<tr' + (rk.minor ? ' class="minor"' : "") + '><td>' + rk.label + '</td><td>' + HD.formatCurrency(val) + '</td></tr>';
        }
      });
      html += '  </tbody></table>';
      if (p.mealNote) {
        html += '  <p class="pkg-note">' + p.mealNote + '</p>';
      }
      html += '</div>';
      html += '<div class="pkg-foot">';
      html += '  <a class="btn ' + (p.featured ? "btn--primary" : "btn--ink") + ' btn--block reservar-pkg" href="#" data-pkg="' + p.name + ' (' + p.nights + ' noches, desayuno y cena)">Consultar disponibilidad</a>';
      html += '</div>';

      card.innerHTML = html;
      grid.appendChild(card);
    });

    setupWaButtons();

    grid.querySelectorAll(".reveal").forEach(function (el) {
      if (io) { io.observe(el); } else { el.classList.add("is-visible"); }
    });
  }

  function renderCustomPackage() {
    var params = new URLSearchParams(window.location.search);
    var customData = params.get("custom");
    if (!customData) return;

    var container = document.getElementById("customPackageContainer");
    if (!container) return;

    var data;
    try {
      data = JSON.parse(decodeURIComponent(customData));
    } catch (e) {
      return;
    }

    if (!data.activities || data.activities.length === 0) return;

    container.style.display = "block";

    var html = '<div class="season-banner reveal" style="border-color:var(--clay);background:var(--paper-deep);margin-bottom:1.5rem;">';
    html += '  <span><strong style="color:var(--clay);">✏️ Paquete personalizado</strong> · ' + (data.name || "Paquete a medida") + '</span>';
    if (data.client) html += '  <span>Preparado para <strong>' + data.client + '</strong></span>';
    html += '</div>';

    html += '<article class="pkg-card reveal is-featured" style="margin-bottom:2rem;" id="customPkgCard">';
    html += '  <span class="pkg-featured-flag">Tu paquete</span>';
    html += '  <div class="pkg-head">';
    html += '    <span class="script-tag">' + (data.name || "Paquete a medida") + '</span>';
    html += '    <p class="nights"><em>' + (data.nights || 3) + '</em> noche' + (data.nights !== 1 ? "s" : "") + '</p>';
    html += '    <p class="meal">Desayuno y cena</p>';
    html += '  </div>';
    html += '  <div class="pkg-body">';
    html += '    <ul class="pkg-acts">';
    (data.activities || []).forEach(function (act) {
      html += '      <li><svg aria-hidden="true"><use href="#icon-check"/></svg>' + act + '</li>';
    });
    html += '    </ul>';
    html += '    <table class="rate-table"><tbody>';
    var rateKeys = [
      { key: "single", label: "Base single" },
      { key: "doble", label: "Base doble" },
      { key: "triple", label: "Base triple" },
      { key: "cuadruple", label: "Base cuádruple" },
      { key: "quintuple", label: "Base quíntuple" },
      { key: "menores", label: "Menores 3 a 8 años", minor: true }
    ];
    rateKeys.forEach(function (rk) {
      var val = data.rates[rk.key];
      if (val > 0) {
        html += '<tr' + (rk.minor ? ' class="minor"' : "") + '><td>' + rk.label + '</td><td>' + HD.formatCurrency(val) + '</td></tr>';
      }
    });
    html += '  </tbody></table>';
    if (data.note) html += '  <p class="pkg-note">' + data.note + '</p>';
    html += '</div>';
    html += '<div class="pkg-foot">';
    html += '  <a class="btn btn--primary btn--block reservar-pkg" href="#" data-pkg="' + (data.name || "Paquete personalizado") + '">Consultar disponibilidad</a>';
    html += '</div>';
    html += '</article>';

    container.innerHTML = html;

    setupWaButtons();
    container.querySelectorAll(".reveal").forEach(function (el) {
      if (io) { io.observe(el); } else { el.classList.add("is-visible"); }
    });
  }

  function renderActivities() {
    var scroller = document.getElementById("expScroller");
    if (!scroller) return;

    var acts = HD.getActivities().filter(function (a) { return a.active; });

    scroller.innerHTML = "";
    if (acts.length === 0) return;

    acts.forEach(function (a) {
      var card = document.createElement("article");
      card.className = "exp-card";
      card.innerHTML = '<figure class="ph"><img src="' + (a.image || "") + '" alt="' + (a.title || "") + '" onerror="this.parentElement.style.display=\'none\'"></figure>' +
        '<div class="exp-card-body">' +
        '  <span class="tag">' + ((a.tagIcon || "").indexOf("icon-") === 0 ? '<svg aria-hidden="true" style="width:12px;height:12px;display:inline;vertical-align:-1px;"><use href="#' + a.tagIcon + '"/></svg>' : '<img src="' + (a.tagIcon || "") + '" alt="" style="width:14px;height:14px;display:inline;vertical-align:-2px;border-radius:2px;">') + ' ' + (a.tag || "") + '</span>' +
        '  <h3>' + a.title + '</h3>' +
        '  <p>' + (a.description || "") + '</p>' +
        '</div>';
      scroller.appendChild(card);
    });
  }

  function renderContactFormPkgs() {
    var select = document.getElementById("cf-pkg");
    if (!select) return;
    var pkgs = HD.getPackages().filter(function (p) { return p.active; });
    select.innerHTML = "";
    pkgs.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.name + " (" + p.nights + " noches)";
      opt.textContent = p.name + " — " + p.nights + " noches";
      select.appendChild(opt);
    });
    var noneOpt = document.createElement("option");
    noneOpt.value = "Todavía no sé";
    noneOpt.textContent = "Todavía no sé";
    select.appendChild(noneOpt);
    if (pkgs.length > 0) {
      var firstVal = pkgs[0].name + " (" + pkgs[0].nights + " noches)";
      select.value = firstVal;
    }
  }

  function renderBooks() {
    var container = document.getElementById("booksContainer");
    if (!container) return;
    var books = HD.getBooks();
    container.innerHTML = "";
    if (books.length === 0) return;
    var html = "";
    books.forEach(function (b) {
      var hasBadge = b.featured;
      html += '<article class="book-card reveal">';
      if (hasBadge) html += '<span class="book-badge">Nuevo</span>';
      html += '<a href="' + b.pdf + '" target="_blank" rel="noopener" class="book-cover">';
      html += '  <img src="' + b.cover + '" alt="' + (b.title || "") + '" loading="lazy">';
      html += '</a>';
      html += '<div class="book-body">';
      html += '  <h3>' + b.title + '</h3>';
      if (b.author) html += '  <p class="book-author">' + b.author + '</p>';
      if (b.subtitle) html += '  <p class="book-sub">' + b.subtitle + '</p>';
      html += '  <a href="' + b.pdf + '" target="_blank" rel="noopener" class="btn btn--sm btn--ink">Descargar PDF</a>';
      html += '</div>';
      html += '</article>';
    });
    container.innerHTML = html;
    container.querySelectorAll(".reveal").forEach(function (el) {
      if (io) { io.observe(el); } else { el.classList.add("is-visible"); }
    });
  }

  function renderFindesLargos() {
    var grid = document.getElementById("findesGrid");
    if (!grid) return;

    var list = HD.getUpcomingFindesLargos().slice(0, 3);
    grid.innerHTML = "";

    if (list.length === 0) {
      grid.innerHTML = '<p class="lede" style="grid-column:1/-1;text-align:center;padding:1rem 0;">Muy pronto vamos a publicar acá los próximos findes largos. Mientras tanto, escribinos y te contamos las fechas disponibles.</p>';
      return;
    }

    var monthsShort = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

    function fmt(iso) {
      var parts = iso.split("-");
      return { day: parseInt(parts[2], 10), month: monthsShort[parseInt(parts[1], 10) - 1] };
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    list.forEach(function (f, idx) {
      var start = fmt(f.startDate);
      var end = fmt(f.endDate);
      var startDateObj = new Date(f.startDate + "T00:00:00");
      var daysUntil = Math.round((startDateObj - today) / 86400000);
      var soon = daysUntil >= 0 && daysUntil <= 21;

      var card = document.createElement("article");
      card.className = "finde-card reveal" + (idx === 0 ? " is-next" : "");

      var html = "";
      if (idx === 0) html += '<span class="finde-flag">Próximo</span>';
      html += '<div class="finde-dates">';
      html += '  <span class="finde-day"><span class="num">' + start.day + '</span><em>' + start.month + '</em></span>';
      html += '  <span class="finde-sep">→</span>';
      html += '  <span class="finde-day"><span class="num">' + end.day + '</span><em>' + end.month + '</em></span>';
      html += '</div>';
      html += '<h3 class="finde-label">' + f.label + '</h3>';
      if (soon && daysUntil > 0) html += '<p class="finde-countdown">Faltan ' + daysUntil + ' día' + (daysUntil !== 1 ? "s" : "") + '</p>';
      if (soon && daysUntil === 0) html += '<p class="finde-countdown">¡Empieza hoy!</p>';
      if (f.note) html += '<p class="finde-note">' + f.note + '</p>';
      html += '<a class="btn btn--sm btn--ink finde-cta" href="#" data-finde="' + f.label + ' (' + start.day + ' ' + start.month + ' al ' + end.day + ' ' + end.month + ')">Reservar estas fechas</a>';
      html += '<p class="finde-disclaimer">No aplican promociones ni descuentos en estas fechas.</p>';

      card.innerHTML = html;
      grid.appendChild(card);
    });

    grid.querySelectorAll(".finde-cta").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var finde = btn.getAttribute("data-finde") || "un finde largo";
        var msg = "¡Hola! Quiero consultar disponibilidad para " + finde + " en Huella Iberá.";
        window.open(buildWaLink(msg), "_blank", "noopener");
      });
    });

    grid.querySelectorAll(".reveal").forEach(function (el) {
      if (io) { io.observe(el); } else { el.classList.add("is-visible"); }
    });
  }

  function galleryItemHtml(g) {
    return '<figure class="g-item"><button type="button" data-full="' + g.url + '"><img src="' + g.url + '" alt="' + (g.alt || g.caption || "") + '" loading="lazy"></button>' +
      (g.caption ? '<span class="cap">' + g.caption + '</span>' : "") + '</figure>';
  }

  function renderGallery() {
    var row1 = document.getElementById("galleryRow1");
    var row2 = document.getElementById("galleryRow2");
    if (!row1 || !row2) return;

    var items = HD.getGallery().filter(function (g) { return g.active; });
    if (items.length === 0) return;

    var track1 = row1.querySelector(".marquee__track");
    var track2 = row2.querySelector(".marquee__track");
    if (!track1 || !track2) return;

    // fila 2: mismo set, orden invertido, para que las dos filas no luzcan idénticas
    var reversed = items.slice().reverse();

    track1.innerHTML = items.map(galleryItemHtml).join("");
    track2.innerHTML = reversed.map(galleryItemHtml).join("");

    initMarquee(row1);
    initMarquee(row2);
  }

  /* -----------------------------------------------------------------------
     HERO — banner principal, completamente editable desde el panel
     ----------------------------------------------------------------------- */
  function renderHero() {
    var hero = HD.getHero();
    if (!hero) return;

    var mediaWrap = document.getElementById("heroMedia");
    var content = document.getElementById("heroContent");
    if (!mediaWrap || !content) return;

    // fondo: imagen o video
    mediaWrap.innerHTML = "";
    if (hero.mediaType === "video" && hero.mediaUrl) {
      var video = document.createElement("video");
      video.src = hero.mediaUrl;
      video.setAttribute("muted", "");
      video.setAttribute("loop", "");
      video.setAttribute("autoplay", "");
      video.setAttribute("playsinline", "");
      video.muted = true;
      mediaWrap.appendChild(video);
    } else if (hero.mediaUrl) {
      var img = document.createElement("img");
      img.src = hero.mediaUrl;
      img.alt = hero.mediaAlt || "";
      mediaWrap.appendChild(img);
    }

    // textos
    content.style.display = hero.showText === false ? "none" : "";
    document.getElementById("heroEyebrowText").textContent = hero.eyebrow || "";
    var titleEl = document.getElementById("heroTitleText");
    titleEl.innerHTML = (hero.title || "") + (hero.titleEm ? "<em>" + hero.titleEm + "</em>" : "");
    document.getElementById("heroSubText").textContent = hero.subtitle || "";

    // botones
    var actionsEl = document.getElementById("heroActionsText");
    actionsEl.innerHTML = "";
    actionsEl.style.display = hero.showButtons === false ? "none" : "";
    if (hero.showButtons !== false) {
      if (hero.btnPrimaryLabel) {
        var a1 = document.createElement("a");
        a1.href = hero.btnPrimaryLink || "#paquetes";
        a1.className = "btn btn--primary";
        a1.innerHTML = '<svg aria-hidden="true"><use href="#icon-track"/></svg>' + hero.btnPrimaryLabel;
        actionsEl.appendChild(a1);
      }
      if (hero.btnSecondaryLabel) {
        var a2 = document.createElement("a");
        a2.href = hero.btnSecondaryLink || "#expediciones";
        a2.className = "btn btn--ghost";
        a2.textContent = hero.btnSecondaryLabel;
        actionsEl.appendChild(a2);
      }
    }

    // posición del bloque de texto
    var heroSection = document.getElementById("inicio");
    heroSection.classList.remove(
      "hero--v-top", "hero--v-center", "hero--v-bottom",
      "hero--h-left", "hero--h-center", "hero--h-right"
    );
    heroSection.classList.add("hero--v-" + (hero.posV || "bottom"));
    heroSection.classList.add("hero--h-" + (hero.posH || "left"));

    // oscurecido de fondo
    var overlay = hero.overlay != null ? hero.overlay : 55;
    mediaWrap.style.setProperty("--hero-overlay", (overlay / 100).toFixed(2));
  }

  /* ===================================================================
     INIT
     =================================================================== */
  HD.ready.then(function () {
    renderHero();
    renderSeasonBanner();
    renderPackages();
    renderActivities();
    renderContactFormPkgs();
    renderBooks();
    renderGallery();
    renderFindesLargos();
    renderCustomPackage();
  });

})();
