(function () {
  "use strict";

  var HD = window.huellaData;
  var CLD = window.huellaCloudinary;
  if (!HD) return;

  /* ===================================================================
     STATE
     =================================================================== */
  var editingPkgId = null;
  var editingActId = null;
  var editingFlId = null;

  /* ===================================================================
     DOM refs
     =================================================================== */
  var $ = function (id) { return document.getElementById(id); };

  var loginPage = $('loginPage');
  var dashboard = $('dashboard');
  var loginUser = $('loginUser');
  var loginPass = $('loginPass');
  var loginBtn = $('loginBtn');
  var loginError = $('loginError');
  var logoutBtn = $('logoutBtn');
  var menuToggle = $('menuToggle');
  var dashSidebar = $('dashSidebar');
  var modalOverlay = $('modalOverlay');
  var modalTitle = $('modalTitle');
  var modalBody = $('modalBody');
  var modalConfirm = $('modalConfirm');
  var modalCancel = $('modalCancel');
  var offlineBanner = $('offlineBanner');

  /* ===================================================================
     UTIL — feedback de guardado / errores de red
     =================================================================== */
  function withSaving(promise, btn) {
    var prevText = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    return promise
      .then(function (r) {
        if (btn) { btn.disabled = false; btn.textContent = prevText; }
        return r;
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = prevText; }
        alert('No se pudo guardar: ' + err.message + '\n\nRevisá tu conexión e intentá de nuevo.');
        throw err;
      });
  }

  function updateOfflineBanner() {
    if (!offlineBanner) return;
    offlineBanner.style.display = HD.isReadyFromNetwork() ? 'none' : 'block';
  }

  /* ===================================================================
     LOGIN
     =================================================================== */
  function checkAuth() {
    var authed = HD.isLoggedIn();
    if (authed) {
      loginPage.style.display = 'none';
      dashboard.classList.add('is-authed');
    } else {
      loginPage.style.display = 'flex';
      dashboard.classList.remove('is-authed');
    }
  }

  function doLogin() {
    var u = loginUser.value.trim();
    var p = loginPass.value.trim();
    loginBtn.disabled = true;
    loginBtn.textContent = 'Ingresando…';
    HD.login(u, p)
      .then(function () {
        loginError.style.display = 'none';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Ingresar';
        checkAuth();
        renderAll();
      })
      .catch(function (err) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Ingresar';
        loginError.textContent = err.message || 'Usuario o contraseña incorrectos';
        loginError.style.display = 'block';
      });
  }

  function doLogout() {
    HD.logout();
    checkAuth();
  }

  /* ===================================================================
      TAB NAVIGATION
      =================================================================== */
  var tabs = {
    paquetes: $('tabPaquetes'),
    actividades: $('tabActividades'),
    findes: $('tabFindes'),
    medida: $('tabMedida'),
    temporada: $('tabTemporada'),
    credenciales: $('tabCredenciales')
  };
  var sidebarTabs = document.querySelectorAll('.dash-nav li[data-tab]');
  var mobileTabs = document.querySelectorAll('.dash-mtab');

  function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(function (t) { t.classList.remove('active'); });
    sidebarTabs.forEach(function (li) { li.classList.remove('active'); });
    mobileTabs.forEach(function (btn) { btn.classList.remove('active'); });
    if (tabs[tabId]) tabs[tabId].classList.add('active');
    document.querySelector('.dash-nav li[data-tab="' + tabId + '"]')?.classList.add('active');
    document.querySelector('.dash-mtab[data-tab="' + tabId + '"]')?.classList.add('active');
    if (tabId === 'medida') renderCustomPkgForm();
    if (tabId === 'temporada') renderSeasonSelector();
    if (tabId === 'credenciales') renderCredsForm();
    if (tabId === 'findes') renderFindesLargos();
    if (window.innerWidth <= 768) dashSidebar.classList.remove('is-open');
    var activeMtab = document.querySelector('.dash-mtab.active');
    if (activeMtab) activeMtab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  /* ===================================================================
     MODAL
     =================================================================== */
  function openModal(title, bodyHtml, onConfirm) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalOverlay.classList.add('is-open');
    modalConfirm.style.display = '';
    modalConfirm.disabled = false;
    modalConfirm.textContent = 'Guardar';
    modalCancel.textContent = 'Cancelar';
    modalConfirm.onclick = function () {
      onConfirm();
    };
    modalCancel.onclick = closeModal;
  }

  function closeModal() {
    modalOverlay.classList.remove('is-open');
    editingPkgId = null;
    editingActId = null;
    editingFlId = null;
  }

  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  /* ===================================================================
     IMAGEN — botón reutilizable de subida a Cloudinary
     =================================================================== */
  function wireImageUploadButton(btnId, fileId, urlInputId, previewId, refId) {
    var btn = $(btnId), file = $(fileId), urlInput = $(urlInputId), preview = $(previewId);
    if (!btn || !file) return;
    btn.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f || !CLD) return;
      btn.disabled = true;
      var origText = btn.textContent;
      var refEl = refId ? $(refId) : null;
      if (refEl) refEl.innerHTML = '';
      btn.textContent = 'Subiendo... 0%';
      CLD.uploadImage(f, function (pct) { btn.textContent = 'Subiendo... ' + pct + '%'; })
        .then(function (url) {
          urlInput.value = url;
          if (preview) { preview.src = url; preview.style.display = 'block'; }
          btn.disabled = false;
          btn.textContent = origText;
          if (refEl) refEl.innerHTML = '<span style="font-size:0.75rem;color:var(--accent);">✓ ' + f.name + ' subido</span>';
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = origText;
          alert('No se pudo subir la imagen: ' + err.message);
        });
    });
  }

  /* ===================================================================
     PACKAGES
     =================================================================== */
  function renderPackages() {
    var container = $('packagesContainer');
    var pkgs = HD.getPackages();
    var season = HD.getCurrentSeason();

    if (pkgs.length === 0) {
      container.innerHTML = '<p style="color:var(--text-soft);">No hay paquetes todavía. Creá el primero.</p>';
      return;
    }

    var html = '<div class="admin-grid">';
    pkgs.forEach(function (p) {
      var seasonLabel = HD.SEASONS[p.season] || p.season;
      var isCurrentSeason = p.season === season;
      html += '<div class="admin-card">';
      html += '  <div class="card-head">';
      html += '    <div>';
      html += '      <div class="card-title">' + p.name + '</div>';
      html += '      <div class="card-season"><span>' + seasonLabel + '</span> · ' + p.nights + ' noche' + (p.nights !== 1 ? 's' : '') + '</div>';
      html += '    </div>';
      html += '    <div style="display:flex;gap:0.3rem;flex-wrap:wrap;justify-content:flex-end;">';
      if (p.featured) html += '      <span class="badge badge--featured">Destacado</span>';
      if (!p.active) html += '      <span class="badge badge--inactive">Inactivo</span>';
      if (isCurrentSeason) html += '      <span class="badge badge--active">Temporada actual</span>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="card-body">';
      html += '    <p>' + p.activities.length + ' actividad(es) incluida(s)</p>';
      html += '    <p>Desde ' + HD.formatCurrency(p.rates.single || 0) + '</p>';
      html += '  </div>';
      html += '  <div class="card-actions">';
      html += '    <button class="toggle ' + (p.active ? 'is-on' : '') + '" data-action="toggle-pkg" data-id="' + p.id + '"></button>';
      html += '    <button class="btn-admin btn-admin--sm" data-action="edit-pkg" data-id="' + p.id + '">Editar</button>';
      html += '    <button class="btn-admin btn-admin--sm btn-admin--danger" data-action="delete-pkg" data-id="' + p.id + '">Eliminar</button>';
      html += '  </div>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-action="toggle-pkg"]').forEach(function (btn) {
      btn.addEventListener('click', function () { togglePackage(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="edit-pkg"]').forEach(function (btn) {
      btn.addEventListener('click', function () { editPackage(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="delete-pkg"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deletePackage(btn.getAttribute('data-id')); });
    });
  }

  function togglePackage(id) {
    var pkgs = HD.getPackages();
    var found = false;
    pkgs.forEach(function (p) { if (p.id === id) { p.active = !p.active; found = true; } });
    if (found) withSaving(HD.savePackages(pkgs)).then(renderPackages);
  }

  function deletePackage(id) {
    if (!confirm('¿Eliminar este paquete?')) return;
    var pkgs = HD.getPackages().filter(function (p) { return p.id !== id; });
    withSaving(HD.savePackages(pkgs)).then(renderPackages);
  }

  function showPkgForm(pkg) {
    var isEdit = !!pkg;
    var s = isEdit ? pkg : { name: '', season: HD.getCurrentSeason(), nights: 2, featured: false, active: true,
      activities: [], rates: { single: '', doble: '', triple: '', cuadruple: '', quintuple: '', menores: '' },
      mealNote: '' };
    var actsHtml = '';
    var allActs = HD.getActivities().filter(function (a) { return a.active; });
    if (allActs.length === 0) {
      actsHtml = '<p style="font-size:0.8rem;color:var(--text-soft);">No hay actividades activas. Creá algunas primero.</p>';
    } else {
      actsHtml = '<div class="checkbox-grid">';
      allActs.forEach(function (a) {
        var checked = isEdit && (s.activities || []).indexOf(a.title) !== -1 ? 'checked' : '';
        actsHtml += '<label><input type="checkbox" class="pkg-act-cb" value="' + a.title + '" ' + checked + '> ' + a.title + '</label>';
      });
      actsHtml += '</div>';
    }

    var seasonsOpts = '';
    Object.keys(HD.SEASONS).forEach(function (k) {
      seasonsOpts += '<option value="' + k + '"' + (s.season === k ? ' selected' : '') + '>' + HD.SEASONS[k] + '</option>';
    });

    var html = '<div class="admin-form-group">';
    html += '<label>Nombre del paquete</label>';
    html += '<input id="fPkgName" type="text" value="' + (s.name || '') + '" placeholder="Ej: Yetapá">';
    html += '</div>';

    html += '<div class="form-row">';
    html += '<div class="admin-form-group">';
    html += '<label>Temporada</label><select id="fPkgSeason">' + seasonsOpts + '</select>';
    html += '</div>';
    html += '<div class="admin-form-group">';
    html += '<label>Noches</label><input id="fPkgNights" type="number" min="1" value="' + s.nights + '">';
    html += '</div>';
    html += '</div>';

    html += '<div class="admin-form-group">';
    html += '<label>Actividades incluidas</label>' + actsHtml;
    html += '</div>';

    html += '<h4 style="margin:1rem 0 0.5rem;font-size:0.9rem;">Tarifas</h4>';
    html += '<div class="form-row" style="grid-template-columns:repeat(3,1fr);">';
    ['single','doble','triple','cuadruple','quintuple','menores'].forEach(function (k) {
      html += '<div class="admin-form-group"><label>' + k.charAt(0).toUpperCase() + k.slice(1) + '</label>';
      html += '<input id="fRate' + k.charAt(0).toUpperCase() + k.slice(1) + '" type="number" min="0" value="' + (s.rates[k] || '') + '"></div>';
    });
    html += '</div>';

    html += '<div class="admin-form-group">';
    html += '<label>Texto de comidas (breve)</label>';
    html += '<input id="fPkgMeal" type="text" value="' + (s.mealLabel || 'Desayuno y cena') + '" placeholder="Ej: Desayuno y cena">';
    html += '</div>';

    html += '<div class="admin-form-group">';
    html += '<label>Nota de comidas</label>';
    html += '<textarea id="fPkgNote">' + (s.mealNote || '') + '</textarea>';
    html += '</div>';

    html += '<div style="display:flex;gap:1rem;align-items:center;">';
    html += '<label style="display:flex;align-items:center;gap:0.5em;font-size:0.85rem;"><input type="checkbox" id="fPkgFeatured" ' + (s.featured ? 'checked' : '') + '> Destacado</label>';
    html += '</div>';

    openModal(isEdit ? 'Editar paquete' : 'Nuevo paquete', html, function () {
      var name = $('fPkgName').value.trim();
      if (!name) { alert('El nombre es obligatorio'); return; }
      var season = $('fPkgSeason').value;
      var nights = parseInt($('fPkgNights').value) || 2;
      var rates = {
        single: parseInt($('fRateSingle').value) || 0,
        doble: parseInt($('fRateDoble').value) || 0,
        triple: parseInt($('fRateTriple').value) || 0,
        cuadruple: parseInt($('fRateCuadruple').value) || 0,
        quintuple: parseInt($('fRateQuintuple').value) || 0,
        menores: parseInt($('fRateMenores').value) || 0
      };
      var activities = [];
      document.querySelectorAll('.pkg-act-cb:checked').forEach(function (cb) { activities.push(cb.value); });
      var mealLabel = ($('fPkgMeal').value || 'Desayuno y cena').trim();
      var mealNote = $('fPkgNote').value.trim();
      var featured = $('fPkgFeatured').checked;

      var pkgs = HD.getPackages();
      if (isEdit) {
        for (var i = 0; i < pkgs.length; i++) {
          if (pkgs[i].id === pkg.id) {
            pkgs[i].name = name; pkgs[i].season = season; pkgs[i].nights = nights;
            pkgs[i].rates = rates; pkgs[i].activities = activities;
            pkgs[i].mealLabel = mealLabel; pkgs[i].mealNote = mealNote; pkgs[i].featured = featured;
            break;
          }
        }
      } else {
        pkgs.push({
          id: HD.generateId('pkg'), name: name, season: season, nights: nights, featured: featured, active: true,
          activities: activities, rates: rates, mealLabel: mealLabel, mealNote: mealNote
        });
      }
      modalConfirm.disabled = true;
      modalConfirm.textContent = 'Guardando…';
      withSaving(HD.savePackages(pkgs), modalConfirm).then(function () {
        closeModal();
        renderPackages();
      }).catch(function () {});
    });
  }

  function editPackage(id) {
    var pkgs = HD.getPackages();
    var pkg = null;
    for (var i = 0; i < pkgs.length; i++) { if (pkgs[i].id === id) { pkg = pkgs[i]; break; } }
    if (!pkg) return;
    showPkgForm(pkg);
  }

  /* ===================================================================
     ACTIVITIES
     =================================================================== */
  function renderActivities() {
    var container = $('activitiesContainer');
    var acts = HD.getActivities();

    if (acts.length === 0) {
      container.innerHTML = '<p style="color:var(--text-soft);">No hay actividades todavía.</p>';
      return;
    }

    var html = '';
    acts.forEach(function (a) {
      html += '<div class="activity-item">';
      html += '  <img class="act-img" src="' + (a.image || '') + '" alt="" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect fill=%22%233d473b%22 width=%2260%22 height=%2260%22/></svg>\'">';
      html += '  <div class="act-info">';
      html += '    <div class="act-tag">' + ((a.tagIcon || '').indexOf('icon-') === 0 ? '' : '<img src="' + (a.tagIcon || '') + '" alt="" style="width:12px;height:12px;display:inline;vertical-align:-2px;border-radius:2px;margin-right:3px;">') + (a.tag || '') + '</div>';
      html += '    <h4>' + a.title + '</h4>';
      html += '    <p>' + (a.description || '').substring(0, 100) + (a.description && a.description.length > 100 ? '...' : '') + '</p>';
      html += '  </div>';
      html += '  <div class="act-actions">';
      html += '    <button class="toggle ' + (a.active ? 'is-on' : '') + '" data-action="toggle-act" data-id="' + a.id + '"></button>';
      html += '    <button class="btn-admin btn-admin--sm" data-action="edit-act" data-id="' + a.id + '">Editar</button>';
      html += '    <button class="btn-admin btn-admin--sm btn-admin--danger" data-action="delete-act" data-id="' + a.id + '">Eliminar</button>';
      html += '  </div>';
      html += '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('[data-action="toggle-act"]').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleActivity(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="edit-act"]').forEach(function (btn) {
      btn.addEventListener('click', function () { editActivity(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="delete-act"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteActivity(btn.getAttribute('data-id')); });
    });
  }

  function toggleActivity(id) {
    var acts = HD.getActivities();
    var found = false;
    acts.forEach(function (a) { if (a.id === id) { a.active = !a.active; found = true; } });
    if (found) withSaving(HD.saveActivities(acts)).then(renderActivities);
  }

  function deleteActivity(id) {
    if (!confirm('¿Eliminar esta actividad?')) return;
    var acts = HD.getActivities().filter(function (a) { return a.id !== id; });
    withSaving(HD.saveActivities(acts)).then(renderActivities);
  }

  function showActForm(act) {
    var isEdit = !!act;
    var s = isEdit ? act : { title: '', tag: '', tagIcon: 'icon-binoculars', description: '', image: '', active: true };

    var tagIcons = ['icon-moon','icon-boat','icon-binoculars','icon-horse','icon-compass','icon-fire','icon-leaf','icon-sun','icon-bug'];
    var iconOpts = '';
    tagIcons.forEach(function (ic) {
      iconOpts += '<option value="' + ic + '"' + (s.tagIcon === ic ? ' selected' : '') + '>' + ic + '</option>';
    });

    var html = '<div class="admin-form-group">';
    html += '<label>Título</label>';
    html += '<input id="fActTitle" type="text" value="' + (s.title || '') + '" placeholder="Ej: Caminatas nocturnas">';
    html += '</div>';

    html += '<div class="form-row">';
    html += '<div class="admin-form-group">';
    html += '<label>Tag / categoría</label>';
    html += '<input id="fActTag" type="text" value="' + (s.tag || '') + '" placeholder="Ej: Noche">';
    html += '</div>';
    html += '<div class="admin-form-group">';
    html += '<label>Ícono SVG</label>';
    html += '<select id="fActIcon">' + iconOpts + '</select>';
    html += '</div>';
    html += '</div>';

    var isCustomIcon = s.tagIcon && s.tagIcon.indexOf('icon-') !== 0;
    html += '<div class="admin-form-group">';
    html += '<label>O subí un ícono personalizado</label>';
    html += '  <img id="fActIconPreview" src="' + (isCustomIcon ? s.tagIcon : '') + '" style="width:48px;height:48px;object-fit:contain;border-radius:4px;margin-bottom:0.5rem;background:rgba(255,255,255,.05);padding:4px;' + (isCustomIcon ? '' : 'display:none;') + '" onerror="this.style.display=\'none\'">';
    html += '  <div style="display:flex;gap:0.5rem;">';
    html += '    <input id="fActIconUrl" type="text" value="' + (isCustomIcon ? s.tagIcon : '') + '" placeholder="URL del ícono (Cloudinary)" style="flex:1;">';
    html += '    <button type="button" class="btn-admin btn-admin--sm" id="fActIconUploadBtn">📷 Subir</button>';
    html += '    <input type="file" id="fActIconFile" accept="image/*" style="display:none;">';
    html += '  </div>';
    html += '  <div id="fActIconRef"></div>';
    html += '  <small style="display:block;font-size:0.7rem;color:var(--text-soft);margin-top:0.3rem;">Dejá vacío si usás el ícono SVG de arriba.</small>';
    html += '</div>';

    html += '<div class="admin-form-group">';
    html += '<label>Descripción</label>';
    html += '<textarea id="fActDesc" rows="3">' + (s.description || '') + '</textarea>';
    html += '</div>';

    html += '<div class="admin-form-group">';
    html += '<label>Foto</label>';
    html += '  <img id="fActImgPreview" src="' + (s.image || '') + '" style="width:100%;max-height:160px;object-fit:cover;border-radius:4px;margin-bottom:0.5rem;' + (s.image ? '' : 'display:none;') + '" onerror="this.style.display=\'none\'">';
    html += '  <div style="display:flex;gap:0.5rem;">';
    html += '    <input id="fActImage" type="text" value="' + (s.image || '') + '" placeholder="URL de la imagen (Cloudinary)" style="flex:1;">';
    html += '    <button type="button" class="btn-admin btn-admin--sm" id="fActImageUploadBtn">📷 Subir</button>';
    html += '    <input type="file" id="fActImageFile" accept="image/*" style="display:none;">';
    html += '  </div>';
    html += '  <div id="fActImgRef"></div>';
    html += '</div>';

    openModal(isEdit ? 'Editar actividad' : 'Nueva actividad', html, function () {
      var title = $('fActTitle').value.trim();
      if (!title) { alert('El título es obligatorio'); return; }
      var tag = $('fActTag').value.trim();
      var tagIcon = ($('fActIconUrl').value.trim() || $('fActIcon').value);
      var desc = $('fActDesc').value.trim();
      var image = $('fActImage').value.trim();

      var acts = HD.getActivities();
      if (isEdit) {
        for (var i = 0; i < acts.length; i++) {
          if (acts[i].id === act.id) {
            acts[i].title = title; acts[i].tag = tag; acts[i].tagIcon = tagIcon;
            acts[i].description = desc; acts[i].image = image;
            break;
          }
        }
      } else {
        acts.push({ id: HD.generateId('act'), title: title, tag: tag, tagIcon: tagIcon, description: desc, image: image, active: true });
      }
      modalConfirm.disabled = true;
      modalConfirm.textContent = 'Guardando…';
      withSaving(HD.saveActivities(acts), modalConfirm).then(function () {
        closeModal();
        renderActivities();
      }).catch(function () {});
    });

    wireImageUploadButton('fActImageUploadBtn', 'fActImageFile', 'fActImage', 'fActImgPreview', 'fActImgRef');
    wireImageUploadButton('fActIconUploadBtn', 'fActIconFile', 'fActIconUrl', 'fActIconPreview', 'fActIconRef');
  }

  function editActivity(id) {
    var acts = HD.getActivities();
    var act = null;
    for (var i = 0; i < acts.length; i++) { if (acts[i].id === id) { act = acts[i]; break; } }
    if (!act) return;
    showActForm(act);
  }

  /* ===================================================================
     FINDES LARGOS
     =================================================================== */
  function fmtDateShort(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

  function renderFindesLargos() {
    var container = $('findesContainer');
    if (!container) return;
    var list = HD.getFindesLargos().slice().sort(function (a, b) { return a.startDate < b.startDate ? -1 : 1; });

    if (list.length === 0) {
      container.innerHTML = '<p style="color:var(--text-soft);">No hay findes largos cargados todavía.</p>';
      return;
    }

    var today = new Date().toISOString().slice(0, 10);
    var html = '';
    list.forEach(function (f) {
      var past = f.endDate < today;
      html += '<div class="activity-item" style="' + (past ? 'opacity:.55;' : '') + '">';
      html += '  <div class="act-info">';
      html += '    <div class="act-tag">' + fmtDateShort(f.startDate) + ' — ' + fmtDateShort(f.endDate) + (past ? ' · pasado' : '') + '</div>';
      html += '    <h4>' + f.label + '</h4>';
      if (f.note) html += '    <p>' + f.note + '</p>';
      html += '  </div>';
      html += '  <div class="act-actions">';
      html += '    <button class="toggle ' + (f.active ? 'is-on' : '') + '" data-action="toggle-fl" data-id="' + f.id + '"></button>';
      html += '    <button class="btn-admin btn-admin--sm" data-action="edit-fl" data-id="' + f.id + '">Editar</button>';
      html += '    <button class="btn-admin btn-admin--sm btn-admin--danger" data-action="delete-fl" data-id="' + f.id + '">Eliminar</button>';
      html += '  </div>';
      html += '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('[data-action="toggle-fl"]').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleFindeLargo(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="edit-fl"]').forEach(function (btn) {
      btn.addEventListener('click', function () { editFindeLargo(btn.getAttribute('data-id')); });
    });
    container.querySelectorAll('[data-action="delete-fl"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteFindeLargo(btn.getAttribute('data-id')); });
    });
  }

  function toggleFindeLargo(id) {
    var list = HD.getFindesLargos();
    var found = false;
    list.forEach(function (f) { if (f.id === id) { f.active = !f.active; found = true; } });
    if (found) withSaving(HD.saveFindesLargos(list)).then(renderFindesLargos);
  }

  function deleteFindeLargo(id) {
    if (!confirm('¿Eliminar este finde largo?')) return;
    var list = HD.getFindesLargos().filter(function (f) { return f.id !== id; });
    withSaving(HD.saveFindesLargos(list)).then(renderFindesLargos);
  }

  function showFlForm(fl) {
    var isEdit = !!fl;
    var s = isEdit ? fl : { label: '', startDate: '', endDate: '', note: '', active: true };

    var html = '<div class="admin-form-group">';
    html += '<label>Nombre del finde largo</label>';
    html += '<input id="fFlLabel" type="text" value="' + (s.label || '') + '" placeholder="Ej: Día de la Independencia">';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="admin-form-group"><label>Desde</label><input id="fFlStart" type="date" value="' + (s.startDate || '') + '"></div>';
    html += '<div class="admin-form-group"><label>Hasta</label><input id="fFlEnd" type="date" value="' + (s.endDate || '') + '"></div>';
    html += '</div>';
    html += '<div class="admin-form-group">';
    html += '<label>Nota (opcional, ej. condiciones especiales)</label>';
    html += '<textarea id="fFlNote" rows="2">' + (s.note || '') + '</textarea>';
    html += '</div>';
    html += '<p style="font-size:0.78rem;color:var(--text-soft);">Recordá: durante los findes largos y fechas de vacaciones no se aplican descuentos ni promociones.</p>';

    openModal(isEdit ? 'Editar finde largo' : 'Nuevo finde largo', html, function () {
      var label = $('fFlLabel').value.trim();
      var start = $('fFlStart').value;
      var end = $('fFlEnd').value;
      if (!label || !start || !end) { alert('Completá nombre, fecha desde y fecha hasta'); return; }
      if (end < start) { alert('La fecha "hasta" no puede ser anterior a "desde"'); return; }
      var note = $('fFlNote').value.trim();

      var list = HD.getFindesLargos();
      if (isEdit) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === fl.id) {
            list[i].label = label; list[i].startDate = start; list[i].endDate = end; list[i].note = note;
            break;
          }
        }
      } else {
        list.push({ id: HD.generateId('fl'), label: label, startDate: start, endDate: end, note: note, active: true });
      }
      modalConfirm.disabled = true;
      modalConfirm.textContent = 'Guardando…';
      withSaving(HD.saveFindesLargos(list), modalConfirm).then(function () {
        closeModal();
        renderFindesLargos();
      }).catch(function () {});
    });
  }

  function editFindeLargo(id) {
    var list = HD.getFindesLargos();
    var fl = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { fl = list[i]; break; } }
    if (!fl) return;
    showFlForm(fl);
  }

  /* ===================================================================
     CUSTOM PACKAGE
     =================================================================== */
  function renderCustomPkgForm() {
    var container = $('cpActivities');
    var acts = HD.getActivities().filter(function (a) { return a.active; });
    if (acts.length === 0) {
      container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-soft);">No hay actividades activas.</p>';
    } else {
      var html = '';
      acts.forEach(function (a) {
        html += '<label><input type="checkbox" class="cp-act-cb" value="' + a.title + '"> ' + a.title + '</label>';
      });
      container.innerHTML = html;
    }
    renderCustomHistory();
  }

  function getCustomPkgData() {
    var client = $('cpClient').value.trim();
    var contact = $('cpContact').value.trim();
    var nights = parseInt($('cpNights').value) || 3;
    var name = $('cpName').value.trim() || ('Paquete para ' + (client || 'cliente'));
    var activities = [];
    document.querySelectorAll('.cp-act-cb:checked').forEach(function (cb) { activities.push(cb.value); });
    var rates = {
      single: parseInt($('cpRateSingle').value) || 0,
      doble: parseInt($('cpRateDoble').value) || 0,
      triple: parseInt($('cpRateTriple').value) || 0,
      cuadruple: parseInt($('cpRateCuadruple').value) || 0,
      quintuple: parseInt($('cpRateQuintuple').value) || 0,
      menores: parseInt($('cpRateMenores').value) || 0
    };
    var note = $('cpNote').value.trim();
    return { client: client, contact: contact, nights: nights, name: name, activities: activities, rates: rates, note: note };
  }

  function generateLink() {
    var data = getCustomPkgData();
    if (data.activities.length === 0) { alert('Seleccioná al menos una actividad'); return; }
    var encoded = encodeURIComponent(JSON.stringify(data));
    // Tomamos la carpeta donde vive la página actual (sin depender de que el
    // nombre de archivo sea literalmente "admin.html" — funciona igual si se
    // entra como /admin, /admin.html o /admin/).
    var path = window.location.pathname;
    var basePath = path.substring(0, path.lastIndexOf('/') + 1);
    var link = window.location.origin + basePath + 'paquete.html' + '?custom=' + encoded;
    $('generatedLink').value = link;
    $('linkResult').style.display = 'block';
  }

  function copyLink() {
    var input = $('generatedLink');
    if (!input.value) return;
    input.select();
    document.execCommand('copy');
    alert('Link copiado al portapapeles');
  }

  function generatePdf() {
    var data = getCustomPkgData();
    if (data.activities.length === 0) { alert('Seleccioná al menos una actividad'); return; }

    var date = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

    var html = '<!doctype html><html><head><meta charset="UTF-8"><title>Presupuesto - Huella Iberá</title>';
    html += '<style>';
    html += 'body{font-family:Georgia,serif;color:#2a2018;max-width:700px;margin:2em auto;padding:0 2em;line-height:1.5;}';
    html += 'h1{font-size:1.6rem;margin-bottom:0.2rem;}';
    html += 'h1 small{display:block;font-size:0.8rem;color:#5b4e3d;font-weight:normal;}';
    html += '.header{border-bottom:2px solid #9c4a30;padding-bottom:1rem;margin-bottom:1.5rem;}';
    html += '.client-info{background:#f1e8d3;padding:1rem;border-radius:4px;margin-bottom:1.5rem;}';
    html += 'table{width:100%;border-collapse:collapse;margin:1rem 0;}';
    html += 'th,td{text-align:left;padding:0.5rem 0;border-bottom:1px solid #d8c79e;}';
    html += 'th{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#5b4e3d;}';
    html += 'td:last-child{text-align:right;font-weight:bold;}';
    html += '.total{font-size:1.2rem;font-weight:bold;border-top:2px solid #9c4a30;padding-top:0.5rem;}';
    html += '.total td:last-child{color:#9c4a30;}';
    html += '.note{margin-top:1.5rem;font-style:italic;color:#5b4e3d;padding-top:1rem;border-top:1px dashed #d8c79e;}';
    html += '.footer{margin-top:2rem;font-size:0.8rem;color:#5b4e3d;text-align:center;}';
    html += '.tag{display:inline-block;background:#9c4a30;color:#fff;font-size:0.7rem;padding:0.2em 0.6em;border-radius:2px;text-transform:uppercase;letter-spacing:0.05em;}';
    html += '@media print{body{margin:0;padding:1in;}}';
    html += '</style></head><body>';

    html += '<div class="header">';
    html += '<h1>Huella Iberá <small>Hotel de Esteros · Colonia Carlos Pellegrini, Corrientes</small></h1>';
    html += '</div>';

    html += '<div class="client-info">';
    if (data.client) html += '<strong>Cliente:</strong> ' + data.client + '<br>';
    if (data.contact) html += '<strong>Contacto:</strong> ' + data.contact + '<br>';
    html += '<strong>Fecha:</strong> ' + date + '<br>';
    html += '<strong>Paquete:</strong> ' + data.name + ' · ' + data.nights + ' noche' + (data.nights !== 1 ? 's' : '');
    html += '</div>';

    html += '<h2 style="font-size:1.1rem;">Actividades incluidas</h2><ul>';
    data.activities.forEach(function (a) { html += '<li style="margin-bottom:0.3rem;">✓ ' + a + '</li>'; });
    html += '</ul>';

    html += '<h2 style="font-size:1.1rem;">Tarifas</h2>';
    html += '<table>';
    html += '<tr><th>Alojamiento</th><th>Por persona</th></tr>';

    var rateKeys = [
      { key: 'single', label: 'Base single' }, { key: 'doble', label: 'Base doble' },
      { key: 'triple', label: 'Base triple' }, { key: 'cuadruple', label: 'Base cuádruple' },
      { key: 'quintuple', label: 'Base quíntuple' }, { key: 'menores', label: 'Menores 3 a 8 años' }
    ];
    rateKeys.forEach(function (rk) {
      var price = data.rates[rk.key];
      if (price > 0) html += '<tr><td>' + rk.label + '</td><td>' + HD.formatCurrency(price) + '</td></tr>';
    });
    html += '</table>';

    if (data.note) html += '<div class="note">' + data.note + '</div>';

    html += '<div class="footer">';
    html += '<p>Huella Iberá — Hotel de Esteros · Colonia Carlos Pellegrini, Corrientes</p>';
    html += '<p>WhatsApp: +54 9 11 5020-4031 · Email: huellaibera@gmail.com</p>';
    html += '<p style="margin-top:0.5rem;font-size:0.7rem;">Este es un presupuesto preliminar. Los valores pueden variar según disponibilidad y temporada.</p>';
    html += '</div>';
    html += '</body></html>';

    var win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function saveCustomPkg() {
    var data = getCustomPkgData();
    if (data.activities.length === 0) { alert('Seleccioná al menos una actividad'); return; }
    var btn = $('saveCustomPkgBtn');
    HD.getCustomPackages().then(function (history) {
      history.push({ id: HD.generateId('custom'), createdAt: new Date().toISOString(), data: data });
      return withSaving(HD.saveCustomPackages(history), btn);
    }).then(renderCustomHistory).catch(function () {});
  }

  function renderCustomHistory() {
    var container = $('customHistory');
    container.innerHTML = '<p style="color:var(--text-soft);font-size:0.85rem;">Cargando historial…</p>';
    HD.getCustomPackages().then(function (history) {
      if (history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-soft);font-size:0.85rem;">No hay paquetes a medida guardados.</p>';
        return;
      }
      var html = '';
      var reversed = history.slice().reverse();
      reversed.forEach(function (h) {
        var d = h.data;
        var date = new Date(h.createdAt).toLocaleDateString('es-AR');
        html += '<div class="history-item">';
        html += '  <div class="hi-info">';
        html += '    <strong>' + (d.client || 'Cliente sin nombre') + '</strong>';
        html += '    <small>' + d.name + ' · ' + d.nights + ' noche' + (d.nights !== 1 ? 's' : '') + ' · ' + date + '</small>';
        html += '  </div>';
        html += '  <div class="hi-actions">';
        html += '    <button class="btn-admin btn-admin--sm" data-action="view-history-pkg" data-id="' + h.id + '">Ver</button>';
        html += '    <button class="btn-admin btn-admin--sm btn-admin--danger" data-action="delete-history" data-id="' + h.id + '">Eliminar</button>';
        html += '  </div>';
        html += '</div>';
      });
      container.innerHTML = html;

      container.querySelectorAll('[data-action="view-history-pkg"]').forEach(function (btn) {
        btn.addEventListener('click', function () { viewHistoryPkg(btn.getAttribute('data-id'), history); });
      });
      container.querySelectorAll('[data-action="delete-history"]').forEach(function (btn) {
        btn.addEventListener('click', function () { deleteHistory(btn.getAttribute('data-id'), history); });
      });
    }).catch(function () {
      container.innerHTML = '<p style="color:var(--red);font-size:0.85rem;">No se pudo cargar el historial. Revisá tu conexión.</p>';
    });
  }

  function viewHistoryPkg(id, history) {
    var item = null;
    for (var i = 0; i < history.length; i++) { if (history[i].id === id) { item = history[i]; break; } }
    if (!item) return;
    var d = item.data;

    var html = '<div style="font-size:0.9rem;">';
    html += '<p><strong>Cliente:</strong> ' + (d.client || '-') + '</p>';
    html += '<p><strong>Contacto:</strong> ' + (d.contact || '-') + '</p>';
    html += '<p><strong>Paquete:</strong> ' + d.name + '</p>';
    html += '<p><strong>Noches:</strong> ' + d.nights + '</p>';
    html += '<p><strong>Actividades:</strong></p><ul>';
    d.activities.forEach(function (a) { html += '<li>✓ ' + a + '</li>'; });
    html += '</ul>';
    html += '<p><strong>Tarifas:</strong></p>';
    html += '<table style="width:100%;font-size:0.82rem;"><tbody>';
    var rateKeys = [
      { key: 'single', label: 'Single' }, { key: 'doble', label: 'Doble' }, { key: 'triple', label: 'Triple' },
      { key: 'cuadruple', label: 'Cuádruple' }, { key: 'quintuple', label: 'Quíntuple' }, { key: 'menores', label: 'Menores 3-8' }
    ];
    rateKeys.forEach(function (rk) {
      if (d.rates[rk.key]) {
        html += '<tr><td style="padding:0.2rem 0;color:var(--text-soft);">' + rk.label + '</td><td style="padding:0.2rem 0;text-align:right;">' + HD.formatCurrency(d.rates[rk.key]) + '/noche</td></tr>';
      }
    });
    html += '</tbody></table>';
    if (d.note) html += '<p><strong>Nota:</strong> ' + d.note + '</p>';
    html += '<p style="margin-top:0.5rem;font-size:0.78rem;color:var(--text-soft);">Creado: ' + new Date(item.createdAt).toLocaleString('es-AR') + '</p>';
    html += '</div>';

    openModal('Paquete: ' + d.name, html, function () {});
    modalConfirm.style.display = 'none';
    modalCancel.textContent = 'Cerrar';
    modalCancel.onclick = function () {
      closeModal();
      modalConfirm.style.display = '';
      modalCancel.textContent = 'Cancelar';
    };
  }

  function deleteHistory(id, history) {
    if (!confirm('¿Eliminar este paquete del historial?')) return;
    var next = history.filter(function (h) { return h.id !== id; });
    withSaving(HD.saveCustomPackages(next)).then(renderCustomHistory);
  }

  /* ===================================================================
     SEASON
     =================================================================== */
  function renderSeasonSelector() {
    var container = $('seasonSelectorMain');
    var current = HD.getCurrentSeason();
    container.querySelectorAll('.season-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-season') === current);
    });
    updateSeasonPreview();
  }

  function updateSeasonPreview() {
    var season = HD.getCurrentSeason();
    var pkgs = HD.getPackages().filter(function (p) { return p.season === season && p.active; });
    $('seasonPreview').textContent = 'Temporada activa: ' + HD.SEASONS[season] + ' · ' + pkgs.length + ' paquete(s) activo(s) en esta temporada.';
  }

  function setSeason(s) {
    withSaving(HD.setCurrentSeason(s)).then(renderSeasonSelector);
  }

  /* ===================================================================
     CREDENTIALS
     =================================================================== */
  function renderCredsForm() {
    $('credsUser').value = '';
    $('credsPass').value = '';
    $('credsMsg').textContent = '';
  }

  function saveCreds() {
    var u = $('credsUser').value.trim();
    var p = $('credsPass').value.trim();
    if (!u || !p) { $('credsMsg').textContent = 'Completá ambos campos.'; return; }
    var btn = $('saveCredsBtn');
    withSaving(HD.setCredentials({ username: u, password: p }), btn).then(function () {
      $('credsMsg').textContent = 'Credenciales guardadas correctamente. Usalas la próxima vez que inicies sesión.';
      $('credsPass').value = '';
    }).catch(function () {});
  }

  /* ===================================================================
     RENDER ALL
     =================================================================== */
  function renderAll() {
    updateOfflineBanner();
    renderPackages();
    renderActivities();
    renderFindesLargos();
    renderCustomPkgForm();
    renderSeasonSelector();
    renderCredsForm();
  }

  /* ===================================================================
     EVENTS
     =================================================================== */
  loginBtn.addEventListener('click', doLogin);
  loginPass.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  logoutBtn.addEventListener('click', doLogout);

  sidebarTabs.forEach(function (li) {
    li.addEventListener('click', function () { switchTab(li.getAttribute('data-tab')); });
  });

  mobileTabs.forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
  });

  var logoutBtnMobile = $('logoutBtnMobile');
  if (logoutBtnMobile) {
    logoutBtnMobile.addEventListener('click', doLogout);
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () { dashSidebar.classList.toggle('is-open'); });
  }
  var closeSidebarBtn = document.getElementById('closeSidebar');
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', function () { dashSidebar.classList.remove('is-open'); });
  }

  $('addPkgBtn').addEventListener('click', function () { showPkgForm(null); });
  $('addActBtn').addEventListener('click', function () { showActForm(null); });
  var addFlBtn = $('addFlBtn');
  if (addFlBtn) addFlBtn.addEventListener('click', function () { showFlForm(null); });

  $('generateLinkBtn').addEventListener('click', generateLink);
  $('copyLinkBtn').addEventListener('click', copyLink);
  $('generatePdfBtn').addEventListener('click', generatePdf);
  $('saveCustomPkgBtn').addEventListener('click', saveCustomPkg);

  $('seasonSelectorMain').addEventListener('click', function (e) {
    var btn = e.target.closest('.season-btn');
    if (btn) setSeason(btn.getAttribute('data-season'));
  });

  $('saveCredsBtn').addEventListener('click', saveCreds);

  /* ===================================================================
     INIT
     =================================================================== */
  HD.ready.then(function () {
    checkAuth();
    if (HD.isLoggedIn()) renderAll();
  });
})();
