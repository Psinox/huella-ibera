(function () {
  "use strict";

  /* =====================================================================
     CONFIGURACIÓN — completar antes de publicar
     ===================================================================== */
  var API_BASE = "https://huella-ibera-api.kivaro-dev.workers.dev"; // ⚠️ verificar que sea la URL real del Worker
  var FETCH_TIMEOUT_MS = 6000;

  var CACHE_KEY = "huellaDataCache";   // copia local de {packages, activities, findesLargos, season, _v}
  var TOKEN_KEY = "huellaAuthToken";   // token de sesión del panel (sessionStorage)

  var SEASONS = {
    primavera: "Primavera",
    verano: "Verano",
    otono: "Otoño",
    invierno: "Invierno"
  };

  /* Se usan solo si el Worker no responde y tampoco hay nada en caché local
     (primer uso, sin conexión) — evita que el sitio quede vacío. */
  var DEFAULT_DATA = { packages: [], activities: [], findesLargos: [], season: "primavera", _v: 0 };

  var DEFAULT_BOOKS = [
    { id: 'inteligencia-animales', title: 'Inteligencia y Cultura de los Animales', author: 'Roberto Ares', subtitle: 'Modelo de Capas aplicado a la inteligencia de todos los organismos', cover: 'images/libros/inteligencia-animales.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_5962766f24dd43439b95520def143c7e.pdf', featured: true },
    { id: 'conducta-plantas', title: 'La Conducta de las Plantas', author: 'Roberto Ares', subtitle: 'Avances del siglo XXI sobre el comportamiento vegetal', cover: 'images/libros/conducta-plantas.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_3977cffb0a444d9e9ed6a8a463c15e8c.pdf', featured: true },
    { id: 'aves-vida-conducta', title: 'Aves, Vida y Conducta', author: 'Roberto Ares', subtitle: 'Segunda edición actualizada y ampliada', cover: 'images/libros/aves-vida-conducta.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_4c23bfc2292242e08004db65b99d4514.pdf' },
    { id: 'vida-evolucion', title: 'Vida en Evolución', author: 'Roberto Ares', subtitle: 'Actualización de conocimientos en secuencia didáctica', cover: 'images/libros/vida-evolucion.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_10d45ef52bf44ceba2b930f0f0a093ed.pdf' },
    { id: 'unico-planeta', title: 'Un Único Planeta', author: 'Roberto Ares', subtitle: 'Visión científica interdisciplinaria de los problemas del planeta', cover: 'images/libros/unico-planeta.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_d22d7e40f8a64181943d5850838c373e.pdf' },
    { id: 'birds-pampa', title: 'Birds of the Pampa', author: 'Roberto Ares', subtitle: 'Understanding the behavior and biology of birds', cover: 'images/libros/birds-pampa.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_0b7fda795264426492043575ace1f743.pdf' },
    { id: 'revista-ecoposada-1', title: 'Revista Ecoposada N°1', author: 'Roberto Ares', subtitle: 'Reserva Natural Privada en el estero de Cambá Trapo', cover: 'images/libros/revista-ecoposada-1.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_2dde31fb6737447d8a4c066df5a69b58.pdf' },
    { id: 'revista-ecoposada-2', title: 'Revista Ecoposada N°2', author: 'Roberto Ares', subtitle: 'Reserva Natural Privada en el estero de Cambá Trapo', cover: 'images/libros/revista-ecoposada-2.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_f8a32b98088c4f15a8dcf2228824bd60.pdf' },
    { id: 'camba-trapo', title: 'Novedades sobre la Reserva Natural Privada Cambá Trapo', author: '', subtitle: '', cover: 'images/libros/camba-trapo.jpg', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_6c4ce5e6dc2143e09d4afc7e5b2b10ed.pdf' }
  ];

  var DEFAULT_ACTIVITIES = [
    { id: 'act-nocturna', title: 'Caminatas o 4x4 nocturnas', tag: 'Noche', tagIcon: 'icon-moon',
      description: 'A pie o en camioneta con reflectores, salimos a escuchar el estero despertarse: zorros, vizcachas, tatú negro, gato montés, carpinchos, yacarés y aves nocturnas. Suele ser la primera salida del viaje.',
      image: 'images/expediciones/nocturna.jpg', active: true },
    { id: 'act-lancha', title: 'Lancha, kayak o canoa', tag: 'Agua', tagIcon: 'icon-boat',
      description: 'Recorremos los arroyos Corriente y Miriñay, donde carpinchos, yacarés, lobitos de río, boas curiyú y cientos de aves aparecen al alcance de la mano. Algunos días, salida nocturna por el arroyo Corriente.',
      image: 'images/expediciones/lancha.jpg', active: true },
    { id: 'act-sendero', title: 'Centro de interpretación y Sendero Monos', tag: 'Día', tagIcon: 'icon-binoculars',
      description: 'Ideal para fotógrafos y observadores de aves: safaris fotográficos por el Sendero de los Cerritos, los esteros de Camba Trapo, del Yuquí y del Aguará, y los alrededores de la Colonia.',
      image: 'images/expediciones/sendero-monos.jpg', active: true },
    { id: 'act-cabalgata', title: 'Cabalgatas por esteros y palmares', tag: 'A caballo', tagIcon: 'icon-horse',
      description: 'Tropilla de caballos mansos, aperos correntinos y guías naturalistas para cruzar el corazón de los esteros y llegar al atardecer entre los palmares, con las aves volviendo a sus nidos.',
      image: 'images/expediciones/cabalgata.jpg', active: true },
    { id: 'act-camba-natural', title: 'Esteros de Camba Trapo', tag: 'Reserva', tagIcon: 'icon-compass',
      description: 'A 15 km, donde se mezclan el monte chaqueño, la selva misionera y el espinal entrerriano. Caminamos sobre los embalsados del estero — una experiencia inolvidable, sobre todo para los más chicos.',
      image: 'images/expediciones/camba-trapo-natural.jpg', active: true },
    { id: 'act-camba-cultural', title: 'Día de campo en Camba Trapo', tag: 'Cultura', tagIcon: 'icon-fire',
      description: 'Un día — y si quieren, una noche — compartiendo el trabajo de un gaucho correntino: ordeñe, quesos caseros, arreos y destrezas criollas, con cabalgata y noche en un rancho típico.',
      image: 'images/expediciones/camba-trapo-cultural.jpg', active: true }
  ];

  var DEFAULT_PACKAGES = [
    { id: 'pkg-yetapa', name: 'Yetapá', season: 'primavera', nights: 2, featured: false, active: true,
      activities: ['1 lancha por la laguna Iberá', '1 safari nocturno en camioneta', '1 caminata diurna, parque provincial'],
      rates: { single: 765600, doble: 592000, triple: 530000, cuadruple: 460000, quintuple: 400000, menores: 275000 },
      mealNote: 'Almuerzos opcionales: $19.000 por persona, por comida.' },
    { id: 'pkg-carpincho', name: 'Carpincho', season: 'primavera', nights: 3, featured: true, active: true,
      activities: ['2 lanchas por la laguna Iberá', '1 safari nocturno en camioneta', '1 caminata diurna, parque provincial'],
      rates: { single: 945000, doble: 740000, triple: 610000, cuadruple: 580000, quintuple: 550000, menores: 300000 },
      mealNote: 'Almuerzos opcionales: $19.000 por persona, por comida.' },
    { id: 'pkg-yacare', name: 'Yacaré', season: 'verano', nights: 4, featured: false, active: true,
      activities: ['2 lanchas por la laguna Iberá', '1 safari nocturno en camioneta', '1 caminata diurna, parque provincial', '1 caminata diurna, parque nacional'],
      rates: { single: 1037000, doble: 850000, triple: 720000, cuadruple: 650000, quintuple: 600000, menores: 330000 },
      mealNote: 'Almuerzos opcionales: $19.000 por persona, por comida.' },
    { id: 'pkg-jabiru', name: 'Jabirú', season: 'verano', nights: 5, featured: false, active: true,
      activities: ['2 lanchas por la laguna Iberá', '1 safari nocturno en camioneta', '1 caminata diurna, parque provincial', '1 caminata diurna, parque nacional'],
      rates: { single: 1200000, doble: 940000, triple: 890000, cuadruple: 790000, quintuple: 550000, menores: 400000 },
      mealNote: 'Almuerzos opcionales: $19.000 por persona, por comida.' }
  ];

  /* Findes largos 2026 — según flyer oficial (se puede editar todo desde el panel) */
  var DEFAULT_FINDES_LARGOS = [
    { id: 'fl-feb', label: 'Carnaval', startDate: '2026-02-14', endDate: '2026-02-17', active: true, note: '' },
    { id: 'fl-mar', label: 'Día de la Memoria', startDate: '2026-03-21', endDate: '2026-03-24', active: true, note: '' },
    { id: 'fl-abr', label: 'Semana Santa', startDate: '2026-04-02', endDate: '2026-04-05', active: true, note: '' },
    { id: 'fl-may1', label: 'Día del Trabajador', startDate: '2026-05-01', endDate: '2026-05-03', active: true, note: '' },
    { id: 'fl-may2', label: 'Fin de semana largo', startDate: '2026-05-23', endDate: '2026-05-25', active: true, note: '' },
    { id: 'fl-jun', label: 'Paso a la Inmortalidad Güemes', startDate: '2026-06-13', endDate: '2026-06-15', active: true, note: '' },
    { id: 'fl-jul', label: 'Día de la Independencia', startDate: '2026-07-09', endDate: '2026-07-12', active: true, note: '' },
    { id: 'fl-ago', label: 'Paso a la Inmortalidad San Martín', startDate: '2026-08-15', endDate: '2026-08-17', active: true, note: '' },
    { id: 'fl-oct', label: 'Día del Respeto a la Diversidad Cultural', startDate: '2026-10-10', endDate: '2026-10-12', active: true, note: '' },
    { id: 'fl-nov', label: 'Día de la Soberanía Nacional', startDate: '2026-11-21', endDate: '2026-11-23', active: true, note: '' },
    { id: 'fl-dic1', label: 'Día de la Constitución Nacional', startDate: '2026-12-05', endDate: '2026-12-08', active: true, note: '' },
    { id: 'fl-dic2', label: 'Fin de semana largo de fin de año', startDate: '2026-12-25', endDate: '2026-12-27', active: true, note: '' }
  ];

  /* =====================================================================
     HELPERS
     ===================================================================== */
  function generateId(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
  }

  function formatCurrency(n) {
    return "$ " + (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function fetchWithTimeout(url, options, ms) {
    var controller = ("AbortController" in window) ? new AbortController() : null;
    var opts = Object.assign({}, options || {});
    if (controller) opts.signal = controller.signal;
    var timer = controller ? setTimeout(function () { controller.abort(); }, ms) : null;
    return fetch(url, opts).finally(function () { if (timer) clearTimeout(timer); });
  }

  function readCacheFromStorage() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function writeCacheToStorage(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function authHeaders() {
    return { "Authorization": "Bearer " + getToken(), "Content-Type": "application/json" };
  }

  /* =====================================================================
     ESTADO EN MEMORIA
     ===================================================================== */
  var cache = null; // { packages, activities, findesLargos, season, _v }

  function seedDefaults() {
    return {
      packages: DEFAULT_PACKAGES,
      activities: DEFAULT_ACTIVITIES,
      findesLargos: DEFAULT_FINDES_LARGOS,
      season: "primavera",
      _v: 0
    };
  }

  var readyResolve;
  var ready = new Promise(function (resolve) { readyResolve = resolve; });
  var readyFromNetwork = false;

  function loadInitial() {
    fetchWithTimeout(API_BASE + "/data", { method: "GET" }, FETCH_TIMEOUT_MS)
      .then(function (res) {
        if (!res.ok) throw new Error("bad status " + res.status);
        return res.json();
      })
      .then(function (data) {
        cache = data;
        readyFromNetwork = true;
        writeCacheToStorage(data);
        readyResolve(cache);
      })
      .catch(function () {
        // sin conexión / worker no configurado todavía → usamos caché local o defaults
        var stored = readCacheFromStorage();
        cache = stored || seedDefaults();
        readyResolve(cache);
      });
  }
  loadInitial();

  /* =====================================================================
     LECTURA (síncrona, sobre la caché en memoria — usar tras HD.ready)
     ===================================================================== */
  function getPackages() { return (cache && cache.packages) || []; }
  function getActivities() { return (cache && cache.activities) || []; }
  function getFindesLargos() { return (cache && cache.findesLargos) || []; }
  function getCurrentSeason() { return (cache && cache.season) || "primavera"; }
  function getBooks() { return DEFAULT_BOOKS; }

  /* =====================================================================
     ESCRITURA (async — requieren estar logueado en el panel)
     ===================================================================== */
  function pushData(partial) {
    var body = Object.assign({}, cache, partial, { _v: cache._v });
    return fetchWithTimeout(API_BASE + "/data", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body)
    }, FETCH_TIMEOUT_MS).then(function (res) {
      return res.json().then(function (payload) {
        if (!res.ok) {
          if (res.status === 409 && payload.current) {
            // otro dispositivo guardó antes — traemos lo último y avisamos
            cache = payload.current;
            writeCacheToStorage(cache);
          }
          throw new Error(payload.message || payload.error || "Error al guardar");
        }
        cache = payload.data;
        writeCacheToStorage(cache);
        return cache;
      });
    });
  }

  function savePackages(pkgs) { return pushData({ packages: pkgs }); }
  function saveActivities(acts) { return pushData({ activities: acts }); }
  function saveFindesLargos(list) { return pushData({ findesLargos: list }); }
  function setCurrentSeason(s) { return pushData({ season: s }); }

  /* =====================================================================
     LOGIN / SESIÓN DEL PANEL
     ===================================================================== */
  function login(username, password) {
    return fetchWithTimeout(API_BASE + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password })
    }, FETCH_TIMEOUT_MS).then(function (res) {
      return res.json().then(function (payload) {
        if (!res.ok || !payload.ok) throw new Error(payload.error || "Usuario o contraseña incorrectos");
        sessionStorage.setItem(TOKEN_KEY, payload.token);
        return true;
      });
    });
  }

  function logout() { sessionStorage.removeItem(TOKEN_KEY); }
  function isLoggedIn() { return !!getToken(); }

  function setCredentials(creds) {
    return fetchWithTimeout(API_BASE + "/creds", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(creds)
    }, FETCH_TIMEOUT_MS).then(function (res) {
      return res.json().then(function (payload) {
        if (!res.ok) throw new Error(payload.error || "No se pudo guardar");
        return true;
      });
    });
  }

  /* =====================================================================
     PAQUETES A MEDIDA — historial (solo panel)
     ===================================================================== */
  function getCustomPackages() {
    return fetchWithTimeout(API_BASE + "/custom-pkgs", { method: "GET", headers: authHeaders() }, FETCH_TIMEOUT_MS)
      .then(function (res) {
        if (!res.ok) throw new Error("No se pudo obtener el historial");
        return res.json();
      });
  }

  function saveCustomPackages(list) {
    return fetchWithTimeout(API_BASE + "/custom-pkgs", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(list)
    }, FETCH_TIMEOUT_MS).then(function (res) {
      if (!res.ok) throw new Error("No se pudo guardar el historial");
      return true;
    });
  }

  /* =====================================================================
     FINDES LARGOS — utilidades de fecha
     ===================================================================== */
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /** Findes largos activos que todavía no terminaron, ordenados por fecha. */
  function getUpcomingFindesLargos() {
    var today = todayISO();
    return getFindesLargos()
      .filter(function (f) { return f.active && f.endDate >= today; })
      .sort(function (a, b) { return a.startDate < b.startDate ? -1 : 1; });
  }

  /** true si la fecha (YYYY-MM-DD) cae dentro de algún finde largo activo. */
  function isLongWeekendDate(dateStr) {
    return getFindesLargos().some(function (f) {
      return f.active && dateStr >= f.startDate && dateStr <= f.endDate;
    });
  }

  window.huellaData = {
    ready: ready,
    isReadyFromNetwork: function () { return readyFromNetwork; },

    SEASONS: SEASONS,
    DEFAULT_PACKAGES: DEFAULT_PACKAGES,
    DEFAULT_BOOKS: DEFAULT_BOOKS,
    DEFAULT_ACTIVITIES: DEFAULT_ACTIVITIES,
    DEFAULT_FINDES_LARGOS: DEFAULT_FINDES_LARGOS,

    getPackages: getPackages,
    savePackages: savePackages,
    getActivities: getActivities,
    saveActivities: saveActivities,
    getFindesLargos: getFindesLargos,
    saveFindesLargos: saveFindesLargos,
    getUpcomingFindesLargos: getUpcomingFindesLargos,
    isLongWeekendDate: isLongWeekendDate,
    getBooks: getBooks,
    getCurrentSeason: getCurrentSeason,
    setCurrentSeason: setCurrentSeason,

    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    setCredentials: setCredentials,

    getCustomPackages: getCustomPackages,
    saveCustomPackages: saveCustomPackages,

    generateId: generateId,
    formatCurrency: formatCurrency
  };
})();
