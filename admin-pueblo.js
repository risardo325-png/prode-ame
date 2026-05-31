(function () {
  const state = {
    user: null,
    partidos: [],
    usuarios: [],
    predicciones: [],
    resultados: [],
    configEstado: {},
    configGol: {},
    unsubs: []
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isPueblo = (d) => !d.torneo || d.torneo === 'pueblo';
  const setStatus = (text) => { const el = $('admin-pueblo-status'); if (el) el.textContent = text; };
  const fmt = (date) => date ? new Date(date).toLocaleString('es-AR') : '-';

  document.addEventListener('DOMContentLoaded', () => {
    bindShell();
    bindAuth();
    fillTeamControls();
  });

  function bindShell() {
    $('admin-pueblo-login-form')?.addEventListener('submit', login);
    $('admin-pueblo-logout')?.addEventListener('click', () => firebase.auth().signOut());
    $('admin-pueblo-menu')?.addEventListener('click', () => $('admin-pueblo-sidebar')?.classList.toggle('open'));
    $('admin-pueblo-refresh')?.addEventListener('click', loadOnce);
    $('admin-pueblo-recalc')?.addEventListener('click', recalculatePoints);
    $('admin-pueblo-match-form')?.addEventListener('submit', saveMatch);
    $('admin-pueblo-cancel-edit')?.addEventListener('click', resetMatchForm);
    $('admin-pueblo-save-all-results')?.addEventListener('click', saveVisibleResults);
    $('admin-pueblo-filter-category')?.addEventListener('change', renderMatches);
    $('admin-pueblo-user-search')?.addEventListener('input', renderUsers);
    $('admin-pueblo-user-filter')?.addEventListener('change', renderUsers);
    $('admin-pueblo-pred-search')?.addEventListener('input', renderPredictions);
    $('admin-pueblo-export-csv')?.addEventListener('click', () => exportPredictions('csv'));
    $('admin-pueblo-export-json')?.addEventListener('click', () => exportPredictions('json'));
    $('admin-pueblo-config-form')?.addEventListener('submit', saveConfig);
    $('admin-pueblo-modal-close')?.addEventListener('click', closeModal);
    document.querySelectorAll('.admin-pueblo-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.view));
    });
  }

  function fillTeamControls() {
    const categories = getCategorias('pueblo');
    const categoryOptions = categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    ['admin-pueblo-category', 'admin-pueblo-filter-category'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.innerHTML = id.includes('filter') ? `<option value="todas">Todas las categorias</option>${categoryOptions}` : categoryOptions;
    });
    fillTeamsForCategory();
    $('admin-pueblo-category')?.addEventListener('change', fillTeamsForCategory);
  }

  function fillTeamsForCategory() {
    const category = $('admin-pueblo-category')?.value || getCategorias('pueblo')[0];
    const teamsByCategory = getEquiposPorCategoria('pueblo');
    const teams = teamsByCategory[category] || [];
    const options = '<option value="">Seleccionar</option>' + teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    if ($('admin-pueblo-local')) $('admin-pueblo-local').innerHTML = options;
    if ($('admin-pueblo-visitor')) $('admin-pueblo-visitor').innerHTML = options;
  }

  function bindAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
      state.user = user || null;
      if (!user) {
        cleanup();
        $('admin-pueblo-login').hidden = false;
        $('admin-pueblo-app').hidden = true;
        setStatus('Sin sesion');
        return;
      }
      try {
        if (!user.email) throw new Error('El usuario no tiene email.');
        const doc = await db.collection('admins').doc(user.email).get();
        if (!doc.exists) throw new Error('Cuenta sin permisos de admin.');
        $('admin-pueblo-login').hidden = true;
        $('admin-pueblo-app').hidden = false;
        console.log('[Firebase] Conectado');
        await loadOnce();
        startRealtime();
      } catch (error) {
        console.error('[Firebase Error]', error);
        showLoginError(error.message);
        firebase.auth().signOut();
      }
    });
  }

  async function login(event) {
    event.preventDefault();
    const btn = $('admin-pueblo-login-btn');
    btn.disabled = true;
    btn.textContent = 'Ingresando...';
    showLoginError('');
    try {
      await firebase.auth().signInWithEmailAndPassword($('admin-pueblo-email').value.trim(), $('admin-pueblo-password').value);
    } catch (error) {
      console.error('[Firebase Error]', error);
      showLoginError(error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ingresar';
    }
  }

  function showLoginError(message) {
    const el = $('admin-pueblo-login-error');
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || '';
  }

  async function loadOnce() {
    setStatus('Cargando...');
    try {
      const [partidosSnap, usuariosSnap, predsSnap, resultadosSnap, estadoDoc, golDoc] = await Promise.all([
        db.collection('partidos').get(),
        db.collection('usuarios').get(),
        db.collection('predicciones').get(),
        db.collection('resultados').get(),
        db.collection('config').doc('estado_pueblo').get(),
        db.collection('config').doc('gol_pueblo').get()
      ]);
      state.partidos = docs(partidosSnap).filter(isPueblo);
      state.usuarios = docs(usuariosSnap).filter(isPueblo);
      state.predicciones = docs(predsSnap).filter(isPueblo);
      state.resultados = docs(resultadosSnap).filter(isPueblo);
      state.configEstado = estadoDoc.exists ? estadoDoc.data() : {};
      state.configGol = golDoc.exists ? golDoc.data() : {};
      renderAll();
      setStatus('Conectado');
    } catch (error) {
      console.error('[Firebase Error]', error);
      setStatus('Error de conexion');
      alert('No se pudieron cargar los datos. La pantalla sigue estable; reintenta.');
    }
  }

  function docs(snapshot) {
    const out = [];
    snapshot.forEach(doc => out.push({ id: doc.id, ...doc.data() }));
    return out;
  }

  function startRealtime() {
    cleanup();
    state.unsubs.push(db.collection('usuarios').onSnapshot(s => { state.usuarios = docs(s).filter(isPueblo); renderDashboard(); renderUsers(); renderRanking(); }, realtimeError));
    state.unsubs.push(db.collection('predicciones').onSnapshot(s => { state.predicciones = docs(s).filter(isPueblo); renderDashboard(); renderPredictions(); }, realtimeError));
    state.unsubs.push(db.collection('partidos').onSnapshot(s => { state.partidos = docs(s).filter(isPueblo); renderDashboard(); renderMatches(); }, realtimeError));
    state.unsubs.push(db.collection('resultados').onSnapshot(s => { state.resultados = docs(s).filter(isPueblo); renderMatches(); renderPredictions(); }, realtimeError));
  }

  function cleanup() {
    state.unsubs.forEach(unsub => { try { unsub(); } catch (_) {} });
    state.unsubs = [];
  }

  function realtimeError(error) {
    console.error('[Firebase Error]', error);
    setStatus('Realtime pausado');
  }

  function showView(view) {
    document.querySelectorAll('.admin-pueblo-nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    document.querySelectorAll('.admin-pueblo-view').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    $('admin-pueblo-title').textContent = document.querySelector(`.admin-pueblo-nav-btn[data-view="${view}"]`)?.textContent || 'Dashboard';
    $('admin-pueblo-sidebar')?.classList.remove('open');
    if (view === 'partidos') renderMatches();
    if (view === 'usuarios') renderUsers();
    if (view === 'predicciones') renderPredictions();
    if (view === 'ranking') renderRanking();
    if (view === 'config') renderConfig();
  }

  function renderAll() {
    renderDashboard();
    renderMatches();
    renderUsers();
    renderPredictions();
    renderRanking();
    renderConfig();
  }

  function renderDashboard() {
    $('admin-pueblo-total-users').textContent = state.usuarios.length;
    $('admin-pueblo-paid-users').textContent = state.usuarios.filter(u => u.pagoConfirmado).length;
    $('admin-pueblo-total-matches').textContent = state.partidos.length;
    $('admin-pueblo-total-predictions').textContent = state.predicciones.length;
    $('admin-pueblo-state-card').innerHTML = `
      <p><strong>Fecha:</strong> ${state.configEstado.numeroFecha || 1}</p>
      <p><strong>Estado:</strong> ${state.configEstado.fechaCerrada ? '<span class="admin-pueblo-pill admin-pueblo-pill-warn">Cerrada</span>' : '<span class="admin-pueblo-pill admin-pueblo-pill-ok">Abierta</span>'}</p>
      <p><strong>Ranking:</strong> ${state.configEstado.fechaCalculada ? 'calculado' : 'pendiente'}</p>
      <p><strong>Gol de la fecha:</strong> ${esc(state.configGol.jugador || '-')}</p>`;
  }

  function renderMatches() {
    const container = $('admin-pueblo-matches');
    if (!container) return;
    const category = $('admin-pueblo-filter-category')?.value || 'todas';
    const resultMap = Object.fromEntries(state.resultados.map(r => [r.partidoId, r]));
    const partidos = state.partidos
      .filter(p => category === 'todas' || p.categoria === category)
      .sort((a,b) => Number(a.jornada || 0) - Number(b.jornada || 0) || String(a.categoria || '').localeCompare(String(b.categoria || ''), 'es') || new Date(a.fecha) - new Date(b.fecha));
    container.innerHTML = partidos.map(p => {
      const res = resultMap[p.id]?.resultado || '';
      return `<div class="admin-pueblo-match-row">
        <strong>J${esc(p.jornada || '?')}</strong>
        <span>${esc(p.categoria || 'Primera')}</span>
        <span class="admin-pueblo-team">${esc(p.local)}</span>
        <span class="admin-pueblo-team">${esc(p.visitante)}</span>
        <select class="admin-pueblo-select" id="admin-pueblo-result-${p.id}">
          <option value="">Sin resultado</option>
          <option value="local" ${res === 'local' ? 'selected' : ''}>Gana local</option>
          <option value="empate" ${res === 'empate' ? 'selected' : ''}>Empate</option>
          <option value="visitante" ${res === 'visitante' ? 'selected' : ''}>Gana visitante</option>
        </select>
        <button class="admin-pueblo-btn admin-pueblo-btn-secondary" onclick="AdminPueblo.editMatch('${p.id}')">Editar</button>
        <button class="admin-pueblo-btn admin-pueblo-btn-danger" onclick="AdminPueblo.deleteMatch('${p.id}')">Eliminar</button>
      </div>`;
    }).join('') || '<p>No hay partidos cargados.</p>';
  }

  async function saveMatch(event) {
    event.preventDefault();
    const id = $('admin-pueblo-edit-id').value;
    const payload = {
      categoria: $('admin-pueblo-category').value,
      jornada: $('admin-pueblo-round').value.trim(),
      local: $('admin-pueblo-local').value,
      visitante: $('admin-pueblo-visitor').value,
      fecha: $('admin-pueblo-date').value,
      torneo: 'pueblo'
    };
    if (!payload.local || !payload.visitante || payload.local === payload.visitante) {
      alert('Local y visitante deben ser distintos.');
      return;
    }
    try {
      if (id) await db.collection('partidos').doc(id).set(payload, { merge: true });
      else await db.collection('partidos').add(payload);
      resetMatchForm();
      await loadOnce();
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo guardar el partido.');
    }
  }

  function editMatch(id) {
    const p = state.partidos.find(item => item.id === id);
    if (!p) return;
    $('admin-pueblo-edit-id').value = id;
    $('admin-pueblo-category').value = p.categoria || 'Primera';
    fillTeamsForCategory();
    $('admin-pueblo-round').value = p.jornada || '';
    $('admin-pueblo-local').value = p.local || '';
    $('admin-pueblo-visitor').value = p.visitante || '';
    $('admin-pueblo-date').value = p.fecha || '';
    showView('partidos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetMatchForm() {
    $('admin-pueblo-match-form')?.reset();
    $('admin-pueblo-edit-id').value = '';
    fillTeamsForCategory();
  }

  async function deleteMatch(id) {
    if (!confirm('Eliminar este partido y su resultado?')) return;
    try {
      await db.collection('partidos').doc(id).delete();
      const resultDocs = state.resultados.filter(r => r.partidoId === id);
      const batch = db.batch();
      resultDocs.forEach(r => batch.delete(db.collection('resultados').doc(r.id)));
      await batch.commit();
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo eliminar.');
    }
  }

  async function saveVisibleResults() {
    const visibleIds = state.partidos.filter(p => {
      const category = $('admin-pueblo-filter-category')?.value || 'todas';
      return category === 'todas' || p.categoria === category;
    }).map(p => p.id);
    const existing = Object.fromEntries(state.resultados.map(r => [r.partidoId, r.id]));
    const batch = db.batch();
    let count = 0;
    visibleIds.forEach(id => {
      const val = $(`admin-pueblo-result-${id}`)?.value;
      if (!val) return;
      const docId = existing[id] || db.collection('resultados').doc().id;
      batch.set(db.collection('resultados').doc(docId), { partidoId: id, resultado: val, torneo: 'pueblo' }, { merge: true });
      count++;
    });
    if (!count) return alert('No hay resultados visibles para guardar.');
    try {
      await batch.commit();
      console.log('[Ranking] Resultados Pueblo guardados');
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudieron guardar resultados.');
    }
  }

  function renderUsers() {
    const tbody = $('admin-pueblo-users-tbody');
    if (!tbody) return;
    const q = ($('admin-pueblo-user-search')?.value || '').toLowerCase();
    const filter = $('admin-pueblo-user-filter')?.value || 'todos';
    const users = state.usuarios.filter(u => {
      const text = `${u.nombre || ''} ${u.whatsapp || ''}`.toLowerCase();
      const okFilter = filter === 'todos' || (filter === 'pagados' && u.pagoConfirmado) || (filter === 'sin-pago' && !u.pagoConfirmado) || (filter === 'avisaron' && u.intentoPago);
      return okFilter && (!q || text.includes(q));
    }).sort((a,b) => (b.puntos || 0) - (a.puntos || 0));
    renderDuplicateAlert();
    tbody.innerHTML = users.map(u => `<tr>
      <td><strong>${esc(u.nombre || '-')}</strong></td>
      <td>${esc(u.whatsapp || '-')}</td>
      <td><strong>${u.puntos || 0}</strong></td>
      <td><input type="checkbox" ${u.pagoConfirmado ? 'checked' : ''} onchange="AdminPueblo.togglePago('${u.id}', this.checked)"></td>
      <td>${u.intentoPago ? '<span class="admin-pueblo-pill admin-pueblo-pill-warn">Aviso</span>' : '-'}</td>
      <td>
        <button class="admin-pueblo-btn admin-pueblo-btn-secondary" onclick="AdminPueblo.viewUser('${u.id}')">Ver</button>
        <button class="admin-pueblo-btn admin-pueblo-btn-danger" onclick="AdminPueblo.clearPredictions('${u.id}')">Limpiar picks</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6">Sin usuarios.</td></tr>';
  }

  function renderDuplicateAlert() {
    const target = $('admin-pueblo-duplicate-alert');
    if (!target) return;
    const byWa = {};
    state.usuarios.forEach(u => {
      const key = String(u.whatsapp || '').replace(/\D/g, '') || 'sin-whatsapp';
      byWa[key] = byWa[key] || [];
      byWa[key].push(u);
    });
    const dups = Object.entries(byWa).filter(([, users]) => users.length > 1);
    target.innerHTML = dups.length ? `<div class="admin-pueblo-alert"><strong>${dups.length} posible(s) duplicado(s)</strong>: ${dups.map(([wa, users]) => `${esc(wa)} (${users.length})`).join(', ')}</div>` : '';
  }

  async function togglePago(id, checked) {
    try {
      await db.collection('usuarios').doc(id).update({ pagoConfirmado: checked });
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo actualizar el pago.');
    }
  }

  function renderPredictions() {
    const target = $('admin-pueblo-predictions');
    if (!target) return;
    const q = ($('admin-pueblo-pred-search')?.value || '').toLowerCase();
    const users = Object.fromEntries(state.usuarios.map(u => [u.id, u]));
    const matches = Object.fromEntries(state.partidos.map(p => [p.id, p]));
    const results = Object.fromEntries(state.resultados.map(r => [r.partidoId, r]));
    const preds = state.predicciones.filter(p => {
      const u = users[p.userId] || {};
      const match = matches[p.partidoId] || {};
      const text = `${u.nombre || ''} ${u.whatsapp || ''} ${match.local || ''} ${match.visitante || ''}`.toLowerCase();
      return !q || text.includes(q);
    });
    target.innerHTML = `<div class="admin-pueblo-table-wrap"><table class="admin-pueblo-table">
      <thead><tr><th>Usuario</th><th>Partido</th><th>Pick</th><th>Real</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${preds.map(p => {
        const u = users[p.userId] || {};
        const match = matches[p.partidoId] || {};
        const real = results[p.partidoId]?.resultado || '-';
        return `<tr>
          <td>${esc(u.nombre || p.userId || '-')}</td>
          <td>${esc(match.local || '-')} vs ${esc(match.visitante || '-')}</td>
          <td>${esc(labelResult(p.resultado))}</td>
          <td>${esc(labelResult(real))}</td>
          <td>${real !== '-' && real === p.resultado ? '<span class="admin-pueblo-pill admin-pueblo-pill-ok">Acierto</span>' : real !== '-' ? '<span class="admin-pueblo-pill">No</span>' : '-'}</td>
          <td><button class="admin-pueblo-btn admin-pueblo-btn-danger" onclick="AdminPueblo.deletePrediction('${p.id}')">Eliminar</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function labelResult(value) {
    return { local: 'Local', empate: 'Empate', visitante: 'Visitante' }[value] || value || '-';
  }

  function renderRanking() {
    const target = $('admin-pueblo-ranking');
    if (!target) return;
    const users = [...state.usuarios].filter(u => u.pagoConfirmado || (u.puntos || 0) > 0).sort((a,b) => (b.puntos || 0) - (a.puntos || 0));
    target.innerHTML = `<div class="admin-pueblo-table-wrap"><table class="admin-pueblo-table">
      <thead><tr><th>#</th><th>Nombre</th><th>WhatsApp</th><th>Puntos</th><th>Pago</th></tr></thead>
      <tbody>${users.map((u, i) => `<tr><td>${i + 1}</td><td>${esc(u.nombre || '-')}</td><td>${esc(u.whatsapp || '-')}</td><td><strong>${u.puntos || 0}</strong></td><td>${u.pagoConfirmado ? 'Si' : 'No'}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  async function recalculatePoints() {
    if (!confirm('Recalcular puntos de Prode Pueblo?')) return;
    const results = Object.fromEntries(state.resultados.map(r => [r.partidoId, r]));
    const matches = Object.fromEntries(state.partidos.map(p => [p.id, p]));
    const predsByUser = {};
    state.predicciones.forEach(p => {
      predsByUser[p.userId] = predsByUser[p.userId] || [];
      predsByUser[p.userId].push(p);
    });
    try {
      const batch = db.batch();
      state.usuarios.forEach(u => {
        let points = 0;
        (predsByUser[u.id] || []).forEach(pred => {
          const real = results[pred.partidoId]?.resultado;
          const match = matches[pred.partidoId];
          if (real && pred.resultado === real) {
            const doble = match && (match.local === 'Independiente (America)' || match.local === 'Independiente (América)' || match.visitante === 'Independiente (America)' || match.visitante === 'Independiente (América)');
            points += doble ? 6 : 3;
          }
        });
        if (state.configGol.hizoGol === 'si' || state.configGol.hizoGol === 'no') {
          const made = state.configGol.hizoGol === 'si';
          if (typeof u.prediccionGol === 'boolean' && u.prediccionGol === made) points += 1;
        }
        const total = (u.puntosHistoricos || 0) + points;
        batch.update(db.collection('usuarios').doc(u.id), { puntos: total, puntosEsteFecha: points });
        u.puntos = total;
      });
      await batch.commit();
      await db.collection('config').doc('estado_pueblo').set({ fechaCalculada: true, resultadosDesactualizados: false }, { merge: true });
      console.log('[Ranking] Recalculado');
      renderUsers();
      renderRanking();
      renderDashboard();
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo recalcular.');
    }
  }

  function renderConfig() {
    $('admin-pueblo-goal-player').value = state.configGol.jugador || '';
    $('admin-pueblo-goal-made').value = state.configGol.hizoGol || 'pendiente';
    $('admin-pueblo-goal-closed').checked = Boolean(state.configGol.cerrado);
    $('admin-pueblo-date-closed').checked = Boolean(state.configEstado.fechaCerrada);
    $('admin-pueblo-ignore-time').checked = Boolean(state.configEstado.ignorarCierreHorario);
  }

  async function saveConfig(event) {
    event.preventDefault();
    try {
      await Promise.all([
        db.collection('config').doc('gol_pueblo').set({
          jugador: $('admin-pueblo-goal-player').value.trim(),
          hizoGol: $('admin-pueblo-goal-made').value,
          cerrado: $('admin-pueblo-goal-closed').checked
        }, { merge: true }),
        db.collection('config').doc('estado_pueblo').set({
          fechaCerrada: $('admin-pueblo-date-closed').checked,
          ignorarCierreHorario: $('admin-pueblo-ignore-time').checked
        }, { merge: true })
      ]);
      state.configGol = { ...state.configGol, jugador: $('admin-pueblo-goal-player').value.trim(), hizoGol: $('admin-pueblo-goal-made').value, cerrado: $('admin-pueblo-goal-closed').checked };
      state.configEstado = { ...state.configEstado, fechaCerrada: $('admin-pueblo-date-closed').checked, ignorarCierreHorario: $('admin-pueblo-ignore-time').checked };
      renderDashboard();
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo guardar configuracion.');
    }
  }

  function viewUser(id) {
    const u = state.usuarios.find(item => item.id === id);
    if (!u) return;
    const userPreds = state.predicciones.filter(p => p.userId === id);
    $('admin-pueblo-modal-content').innerHTML = `<h2>${esc(u.nombre || 'Usuario')}</h2>
      <p><strong>WhatsApp:</strong> ${esc(u.whatsapp || '-')} | <strong>Puntos:</strong> ${u.puntos || 0}</p>
      <h3>Predicciones</h3>
      <pre class="admin-pueblo-json">${esc(JSON.stringify(userPreds, null, 2))}</pre>
      <h3>Usuario completo</h3>
      <pre class="admin-pueblo-json">${esc(JSON.stringify(u, null, 2))}</pre>`;
    $('admin-pueblo-modal').hidden = false;
  }

  function closeModal() {
    $('admin-pueblo-modal').hidden = true;
    $('admin-pueblo-modal-content').innerHTML = '';
  }

  async function clearPredictions(userId) {
    if (!confirm('Borrar predicciones de este usuario para permitir recarga?')) return;
    try {
      const batch = db.batch();
      state.predicciones.filter(p => p.userId === userId).forEach(p => batch.delete(db.collection('predicciones').doc(p.id)));
      await batch.commit();
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudieron borrar predicciones.');
    }
  }

  async function deletePrediction(id) {
    if (!confirm('Eliminar esta prediccion?')) return;
    try {
      await db.collection('predicciones').doc(id).delete();
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo eliminar.');
    }
  }

  function exportPredictions(type) {
    const users = Object.fromEntries(state.usuarios.map(u => [u.id, u]));
    const data = state.predicciones.map(p => ({ ...p, usuario: users[p.userId]?.nombre || '', whatsapp: users[p.userId]?.whatsapp || '' }));
    if (type === 'json') return download(`predicciones_pueblo_${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
    const rows = [['usuario','whatsapp','partidoId','resultado','torneo'], ...data.map(p => [p.usuario, p.whatsapp, p.partidoId, p.resultado, p.torneo || 'pueblo'])];
    download(`predicciones_pueblo_${Date.now()}.csv`, rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.AdminPueblo = { editMatch, deleteMatch, togglePago, viewUser, clearPredictions, deletePrediction };
})();
