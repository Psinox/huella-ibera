(function () {
  "use strict";

  var DATA_KEY = 'huellaData';
  var SEASON_KEY = 'huellaSeason';
  var CUSTOM_KEY = 'huellaCustomPkgs';
  var CREDS_KEY = 'huellaCreds';

  var SEASONS = {
    primavera: 'Primavera',
    verano: 'Verano',
    otono: 'Otoño',
    invierno: 'Invierno'
  };

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

  var DEFAULT_BOOKS = [
    { id: 'inteligencia-animales', title: 'Inteligencia y Cultura de los Animales', author: 'Roberto Ares', subtitle: 'Modelo de Capas aplicado a la inteligencia de todos los organismos', cover: 'https://static.wixstatic.com/media/5c1156_ecd3bc21f7194817af7f840462d43903~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_5962766f24dd43439b95520def143c7e.pdf', featured: true },
    { id: 'conducta-plantas', title: 'La Conducta de las Plantas', author: 'Roberto Ares', subtitle: 'Avances del siglo XXI sobre el comportamiento vegetal', cover: 'https://static.wixstatic.com/media/5c1156_972f847dfc36421682ebe360cf62c463~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_3977cffb0a444d9e9ed6a8a463c15e8c.pdf', featured: true },
    { id: 'aves-vida-conducta', title: 'Aves, Vida y Conducta', author: 'Roberto Ares', subtitle: 'Segunda edición actualizada y ampliada', cover: 'https://static.wixstatic.com/media/5c1156_99fa7b6678214e598abd80c6fa7e1b9a~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_4c23bfc2292242e08004db65b99d4514.pdf' },
    { id: 'vida-evolucion', title: 'Vida en Evolución', author: 'Roberto Ares', subtitle: 'Actualización de conocimientos en secuencia didáctica', cover: 'https://static.wixstatic.com/media/5c1156_8dcd5b259497438283be09f706654513~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_10d45ef52bf44ceba2b930f0f0a093ed.pdf' },
    { id: 'unico-planeta', title: 'Un Único Planeta', author: 'Roberto Ares', subtitle: 'Visión científica interdisciplinaria de los problemas del planeta', cover: 'https://static.wixstatic.com/media/5c1156_43b3daa3f6b847a99d6c7b0698d6255e~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_d22d7e40f8a64181943d5850838c373e.pdf' },
    { id: 'birds-pampa', title: 'Birds of the Pampa', author: 'Roberto Ares', subtitle: 'Understanding the behavior and biology of birds', cover: 'https://static.wixstatic.com/media/5c1156_814bc12f21264ef7ac668e4472de5035~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_0b7fda795264426492043575ace1f743.pdf' },
    { id: 'revista-ecoposada-1', title: 'Revista Ecoposada N°1', author: 'Roberto Ares', subtitle: 'Reserva Natural Privada en el estero de Cambá Trapo', cover: 'https://static.wixstatic.com/media/5c1156_7006c231e3de41569389e9a9ca551f13~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_2dde31fb6737447d8a4c066df5a69b58.pdf' },
    { id: 'revista-ecoposada-2', title: 'Revista Ecoposada N°2', author: 'Roberto Ares', subtitle: 'Reserva Natural Privada en el estero de Cambá Trapo', cover: 'https://static.wixstatic.com/media/5c1156_3d10437e27634ce8879354499c6e6bac~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_f8a32b98088c4f15a8dcf2228824bd60.pdf' },
    { id: 'camba-trapo', title: 'Novedades sobre la Reserva Natural Privada Cambá Trapo', author: '', subtitle: '', cover: 'https://static.wixstatic.com/media/5c1156_01fab1fd7767497fac7728af0f2027f2~mv2.png', pdf: 'https://www.huellaibera.com.ar/_files/ugd/5c1156_6c4ce5e6dc2143e09d4afc7e5b2b10ed.pdf' }
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

  function getDefaultCredentials() {
    return { username: 'admin', password: 'admin123' };
  }

  function initData() {
    if (!localStorage.getItem(DATA_KEY)) {
      localStorage.setItem(DATA_KEY, JSON.stringify({
        packages: DEFAULT_PACKAGES,
        activities: DEFAULT_ACTIVITIES
      }));
    }
    if (!localStorage.getItem(SEASON_KEY)) {
      localStorage.setItem(SEASON_KEY, 'primavera');
    }
  }

  function getData() {
    initData();
    try {
      return JSON.parse(localStorage.getItem(DATA_KEY)) || { packages: [], activities: [] };
    } catch (e) {
      return { packages: [], activities: [] };
    }
  }

  function saveData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }

  function getPackages() {
    return getData().packages || [];
  }

  function savePackages(pkgs) {
    var data = getData();
    data.packages = pkgs;
    saveData(data);
  }

  function getActivities() {
    return getData().activities || [];
  }

  function saveActivities(acts) {
    var data = getData();
    data.activities = acts;
    saveData(data);
  }

  function getCurrentSeason() {
    return localStorage.getItem(SEASON_KEY) || 'primavera';
  }

  function setCurrentSeason(s) {
    localStorage.setItem(SEASON_KEY, s);
  }

  function getCredentials() {
    var stored = localStorage.getItem(CREDS_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return getDefaultCredentials();
  }

  function setCredentials(c) {
    localStorage.setItem(CREDS_KEY, JSON.stringify(c));
  }

  function getCustomPackages() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomPackages(pkgs) {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(pkgs));
  }

  function getBooks() {
    return DEFAULT_BOOKS;
  }

  function generateId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  }

  function formatCurrency(n) {
    return '$ ' + (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  window.huellaData = {
    SEASONS: SEASONS,
    DEFAULT_PACKAGES: DEFAULT_PACKAGES,
    DEFAULT_BOOKS: DEFAULT_BOOKS,
    DEFAULT_ACTIVITIES: DEFAULT_ACTIVITIES,
    initData: initData,
    getPackages: getPackages,
    savePackages: savePackages,
    getActivities: getActivities,
    saveActivities: saveActivities,
    getBooks: getBooks,
    getCurrentSeason: getCurrentSeason,
    setCurrentSeason: setCurrentSeason,
    getCredentials: getCredentials,
    setCredentials: setCredentials,
    getCustomPackages: getCustomPackages,
    saveCustomPackages: saveCustomPackages,
    generateId: generateId,
    formatCurrency: formatCurrency
  };

})();
