(function () {
  const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const ROUNDS = [
    { id: 'R32', name: '16avos', count: 16 },
    { id: 'R16', name: 'Octavos', count: 8 },
    { id: 'QF', name: 'Cuartos', count: 4 },
    { id: 'SF', name: 'Semis', count: 2 },
    { id: 'F', name: 'Final', count: 1 }
  ];

  const state = {
    user: null,
    loaded: false,
    results: {},
    estados: {},
    bonusOficial: {},
    configEstado: {},
    usuarios: [],
    standings: {},
    bracketBase: [],
    knockout: {},
    logs: [],
    unsubs: []
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asDate = (value) => {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    if (typeof value === 'number') return new Date(value);
    return new Date(value);
  };
  const fmtDate = (value) => {
    const d = asDate(value);
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('es-AR') : '-';
  };
  const teamFlag = (team) => team ? `<img src="${getBanderaUrl(team, 40)}" alt="">` : '';
  const setStatus = (text) => { const el = $('admin-worldcup-status'); if (el) el.textContent = text; };
  const log = (text) => {
    const row = `[${new Date().toLocaleString('es-AR')}] ${text}`;
    state.logs.unshift(row);
    renderLogs();
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindShell();
    bindAuth();
  });

  function bindShell() {
    $('admin-worldcup-login-form')?.addEventListener('submit', login);
    $('admin-worldcup-logout')?.addEventListener('click', () => firebase.auth().signOut());
    $('admin-worldcup-menu')?.addEventListener('click', () => $('admin-worldcup-sidebar')?.classList.toggle('open'));
    $('admin-worldcup-modal-close')?.addEventListener('click', closeModal);
    $('admin-worldcup-refresh')?.addEventListener('click', loadOnce);
    $('admin-worldcup-recalc')?.addEventListener('click', recalculateRanking);
    $('admin-worldcup-rebuild-standings')?.addEventListener('click', () => { rebuildStandings(); renderStandings(); });
    $('admin-worldcup-generate-bracket')?.addEventListener('click', generateOfficialBracket);
    $('admin-worldcup-publish-bracket')?.addEventListener('click', publishBracket);
    $('admin-save-bonus')?.addEventListener('click', saveOfficialBonus);
    $('admin-mundial-ignore-time')?.addEventListener('change', saveIgnoreTime);
    $('admin-worldcup-filter-group')?.addEventListener('change', renderMatches);
    $('admin-worldcup-filter-state')?.addEventListener('change', renderMatches);
    $('admin-worldcup-user-search')?.addEventListener('input', renderPredictions);
    $('admin-worldcup-user-sort')?.addEventListener('change', renderPredictions);
    $('admin-worldcup-export-json')?.addEventListener('click', () => exportData('json'));
    $('admin-worldcup-export-csv')?.addEventListener('click', () => exportData('csv'));
    document.querySelectorAll('.admin-worldcup-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.view));
    });
    const groupSelect = $('admin-worldcup-filter-group');
    if (groupSelect) groupSelect.innerHTML = '<option value="todos">Todos los grupos</option>' + GROUPS.map(g => `<option value="${g}">Grupo ${g}</option>`).join('');
  }

  function bindAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
      state.user = user || null;
      if (!user) {
        cleanupListeners();
        $('admin-worldcup-login').hidden = false;
        $('admin-worldcup-app').hidden = true;
        setStatus('Sin sesion');
        return;
      }
      try {
        if (!user.email) throw new Error('El usuario no tiene email.');
        const adminDoc = await db.collection('admins').doc(user.email).get();
        if (!adminDoc.exists) throw new Error('Cuenta sin permisos de admin.');
        $('admin-worldcup-login').hidden = true;
        $('admin-worldcup-app').hidden = false;
        setStatus('Conectado');
        console.log('[Firebase] Conectado');
        await loadOnce();
        startRealtime();
      } catch (error) {
        console.error('[Firebase Error]', error);
        setLoginError(error.message);
        firebase.auth().signOut();
      }
    });
  }

  async function login(event) {
    event.preventDefault();
    const btn = $('admin-worldcup-login-btn');
    const email = $('admin-worldcup-email')?.value.trim();
    const password = $('admin-worldcup-password')?.value;
    setLoginError('');
    btn.disabled = true;
    btn.textContent = 'Ingresando...';
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error('[Firebase Error]', error);
      setLoginError(error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ingresar';
    }
  }

  function setLoginError(message) {
    const el = $('admin-worldcup-login-error');
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || '';
  }

  async function loadOnce() {
    setStatus('Cargando...');
    try {
      const [matchesDoc, usersSnap, bracketDoc, bonusDoc, configDoc] = await Promise.all([
        db.collection('mundial_matches').doc('oficial').get(),
        db.collection('predicciones_mundial').get(),
        db.collection('mundial_bracket').doc('oficial').get(),
        db.collection('mundial_bonus').doc('oficial').get(),
        db.collection('config').doc('estado_mundial').get()
      ]);
      if (matchesDoc.exists) {
        state.results = matchesDoc.data().resultados || {};
        state.estados = matchesDoc.data().estados || {};
      }
      state.usuarios = [];
      usersSnap.forEach(doc => state.usuarios.push({ id: doc.id, ...doc.data() }));
      if (bracketDoc.exists) {
        state.knockout = bracketDoc.data().knockout || {};
        state.bracketBase = bracketDoc.data().base || [];
      }
      if (bonusDoc.exists) {
        state.bonusOficial = bonusDoc.data() || {};
        const bG = $('admin-bonus-goleador');
        const bGA = $('admin-bonus-goleador-arg');
        const bV = $('admin-bonus-valla');
        if (bG) bG.value = state.bonusOficial.goleador || '';
        if (bGA) bGA.value = state.bonusOficial.goleadorArg || '';
        if (bV) bV.value = state.bonusOficial.valla || '';
      }
      state.configEstado = configDoc.exists ? configDoc.data() : {};
      const chk = $('admin-mundial-ignore-time');
      if (chk) chk.checked = Boolean(state.configEstado.ignorarHorario);
      rebuildStandings();
      renderAll();
      console.log('[Admin Mundial] Predicciones:', state.usuarios.length);
      setStatus('Conectado');
    } catch (error) {
      console.error('[Firebase Error]', error);
      setStatus('Error de conexion');
      showSoftError('No se pudieron cargar los datos. Reintenta en unos segundos.', loadOnce);
    }
  }

  function startRealtime() {
    cleanupListeners();
    state.unsubs.push(db.collection('predicciones_mundial').onSnapshot(snap => {
      state.usuarios = [];
      snap.forEach(doc => state.usuarios.push({ id: doc.id, ...doc.data() }));
      console.log('[Admin Mundial] Predicciones:', state.usuarios.length);
      renderDashboard();
      renderPredictions();
      renderRanking();
    }, onRealtimeError));
    state.unsubs.push(db.collection('mundial_matches').doc('oficial').onSnapshot(doc => {
      if (doc.exists) {
        state.results = doc.data().resultados || {};
        state.estados = doc.data().estados || {};
        rebuildStandings();
        renderDashboard();
        renderMatches();
        renderStandings();
      }
    }, onRealtimeError));
    state.unsubs.push(db.collection('mundial_bracket').doc('oficial').onSnapshot(doc => {
      if (doc.exists) {
        state.knockout = doc.data().knockout || {};
        state.bracketBase = doc.data().base || [];
        renderBracket();
      }
    }, onRealtimeError));
    state.unsubs.push(db.collection('mundial_bonus').doc('oficial').onSnapshot(doc => {
      if (doc.exists) {
        state.bonusOficial = doc.data() || {};
        const bG = $('admin-bonus-goleador');
        const bGA = $('admin-bonus-goleador-arg');
        const bV = $('admin-bonus-valla');
        if (bG && bG.value !== state.bonusOficial.goleador) bG.value = state.bonusOficial.goleador || '';
        if (bGA && bGA.value !== state.bonusOficial.goleadorArg) bGA.value = state.bonusOficial.goleadorArg || '';
        if (bV && bV.value !== state.bonusOficial.valla) bV.value = state.bonusOficial.valla || '';
      }
    }, onRealtimeError));
  }

  function cleanupListeners() {
    state.unsubs.forEach(unsub => { try { unsub(); } catch (_) {} });
    state.unsubs = [];
  }

  function onRealtimeError(error) {
    console.error('[Firebase Error]', error);
    setStatus('Realtime pausado');
  }

  function showView(view) {
    document.querySelectorAll('.admin-worldcup-nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    document.querySelectorAll('.admin-worldcup-view').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    const title = document.querySelector(`.admin-worldcup-nav-btn[data-view="${view}"]`)?.textContent || 'Dashboard';
    $('admin-worldcup-title').textContent = title;
    $('admin-worldcup-sidebar')?.classList.remove('open');
    if (view === 'partidos') renderMatches();
    if (view === 'posiciones') renderStandings();
    if (view === 'bracket') renderBracket();
    if (view === 'predicciones') renderPredictions();
    if (view === 'ranking') renderRanking();
    if (view === 'logs') renderLogs();
  }

  function renderAll() {
    renderDashboard();
    renderMatches();
    renderStandings();
    renderBracket();
    renderPredictions();
    renderRanking();
    renderLogs();
  }

  function renderDashboard() {
    const completed = state.usuarios.filter(isPredictionComplete).length;
    const finalizados = Object.values(state.estados).filter(v => v === 'finalizado').length;
    const champions = countBy(state.usuarios.map(u => u.knockout?.CHAMPION).filter(Boolean));
    const scorers = countBy(state.usuarios.map(u => u.bonus?.goleador).filter(Boolean));
    const argScorers = countBy(state.usuarios.map(u => u.bonus?.goleadorArg).filter(Boolean));
    $('admin-worldcup-total-users').textContent = state.usuarios.length;
    $('admin-worldcup-completed-users').textContent = completed;
    $('admin-worldcup-final-matches').textContent = finalizados;
    $('admin-worldcup-fav-champion').textContent = topKey(champions) || '-';
    $('admin-worldcup-favorites').innerHTML = `
      ${renderCountList('Campeones mas elegidos', champions)}
      ${renderCountList('Goleadores mas elegidos', scorers)}
      ${renderCountList('Goleador argentino', argScorers)}
    `;
  }

  function renderCountList(title, map) {
    const rows = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 8);
    return `<h3>${esc(title)}</h3>${rows.length ? rows.map(([name, count]) => `<div class="admin-worldcup-rowline"><strong>${esc(name)}</strong><span>${count}</span></div>`).join('') : '<p class="admin-worldcup-help">Sin datos todavia.</p>'}`;
  }

  function countBy(items) {
    return items.reduce((acc, item) => {
      const key = String(item || '').trim();
      if (key) acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function topKey(map) {
    return Object.entries(map).sort((a,b) => b[1] - a[1])[0]?.[0];
  }

  function isPredictionComplete(u) {
    return Object.keys(u.partidos || {}).length >= MUNDIAL_PARTIDOS.length && Boolean(u.knockout?.CHAMPION);
  }

  function renderMatches() {
    const container = $('admin-worldcup-matches');
    if (!container) return;
    const groupFilter = $('admin-worldcup-filter-group')?.value || 'todos';
    const stateFilter = $('admin-worldcup-filter-state')?.value || 'todos';
    const groups = groupFilter === 'todos' ? GROUPS : [groupFilter];
    container.innerHTML = groups.map(group => {
      const matches = MUNDIAL_PARTIDOS.filter(p => p.grupo === group).filter(p => stateFilter === 'todos' || (state.estados[p.id] || 'pendiente') === stateFilter);
      if (!matches.length) return '';
      return `<div class="admin-worldcup-match-group">
        <h3>Grupo ${group}</h3>
        ${matches.map(renderMatchRow).join('')}
      </div>`;
    }).join('') || '<p class="admin-worldcup-help">No hay partidos para ese filtro.</p>';
  }

  function renderMatchRow(p) {
    const res = state.results[p.id] || {};
    const estado = state.estados[p.id] || 'pendiente';
    return `<div class="admin-worldcup-match-row">
      <small>${esc(new Date(p.fecha).toLocaleDateString('es-AR'))}</small>
      <div class="admin-worldcup-team">${teamFlag(p.local)}<span>${esc(p.local)}</span></div>
      <input class="admin-worldcup-score" id="admin-worldcup-${p.id}-gl" type="number" min="0" value="${res.gl ?? ''}">
      <strong>-</strong>
      <input class="admin-worldcup-score" id="admin-worldcup-${p.id}-gv" type="number" min="0" value="${res.gv ?? ''}">
      <div class="admin-worldcup-team">${teamFlag(p.visitante)}<span>${esc(p.visitante)}</span></div>
      <select class="admin-worldcup-select" id="admin-worldcup-${p.id}-estado">
        <option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="vivo" ${estado === 'vivo' ? 'selected' : ''}>En vivo</option>
        <option value="finalizado" ${estado === 'finalizado' ? 'selected' : ''}>Finalizado</option>
      </select>
      <button class="admin-worldcup-btn admin-worldcup-btn-secondary" onclick="AdminMundial.saveMatch('${p.id}')">Guardar</button>
    </div>`;
  }

  async function saveMatch(id) {
    const glRaw = $(`admin-worldcup-${id}-gl`)?.value;
    const gvRaw = $(`admin-worldcup-${id}-gv`)?.value;
    const estado = $(`admin-worldcup-${id}-estado`)?.value || 'pendiente';
    if (estado === 'finalizado' && (glRaw === '' || gvRaw === '')) {
      alert('Para finalizar un partido carga ambos goles.');
      return;
    }
    const nextResults = { ...state.results };
    const nextStates = { ...state.estados, [id]: estado };
    if (glRaw !== '' && gvRaw !== '') nextResults[id] = { gl: Number(glRaw), gv: Number(gvRaw) };
    else delete nextResults[id];
    try {
      await db.collection('mundial_matches').doc('oficial').set({
        resultados: nextResults,
        estados: nextStates,
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      state.results = nextResults;
      state.estados = nextStates;
      rebuildStandings();
      await publishStandings();
      log(`Partido ${id} guardado como ${estado}`);
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo guardar el partido.');
    }
  }

  function rebuildStandings() {
    const finalResults = {};
    Object.keys(state.results).forEach(id => {
      if (state.estados[id] === 'finalizado') finalResults[id] = state.results[id];
    });
    state.standings = MundialBracketEngine.calcularTablas(finalResults);
    console.log('[Bracket] Clasificados:', MundialBracketEngine.resolverClasificados(state.standings).clasificados);
  }

  async function publishStandings() {
    try {
      await db.collection('mundial_standings').doc('oficial').set({
        grupos: state.standings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: state.user?.email || ''
      }, { merge: true });
    } catch (error) {
      console.error('[Firebase Error]', error);
    }
  }

  function renderStandings() {
    const container = $('admin-worldcup-standings');
    if (!container) return;
    const clasificacion = MundialBracketEngine.resolverClasificados(state.standings);
    const thirdNames = new Set(clasificacion.terceros.map(t => `${t.grupo}:${t.nombre}`));
    container.innerHTML = `<div class="admin-worldcup-standings-grid">${GROUPS.map(group => {
      const teams = state.standings[group] || [];
      return `<div class="admin-worldcup-match-group">
        <h3>Grupo ${group}</h3>
        <div class="admin-worldcup-table-wrap">
          <table class="admin-worldcup-table" style="min-width:420px">
            <thead><tr><th>Equipo</th><th>Pts</th><th>DG</th><th>GF</th><th>PJ</th></tr></thead>
            <tbody>${teams.map((t, idx) => `<tr>
              <td>${idx < 2 ? '<span class="admin-worldcup-pill admin-worldcup-pill-ok">Clasifica</span> ' : thirdNames.has(`${group}:${t.nombre}`) ? '<span class="admin-worldcup-pill admin-worldcup-pill-warn">3ro</span> ' : ''}${esc(t.nombre)}</td>
              <td><strong>${t.pts}</strong></td><td>${t.dg}</td><td>${t.gf}</td><td>${t.pj}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
    }).join('')}</div>
    <section class="admin-worldcup-panel" style="margin-top:16px">
      <h2>Mejores terceros</h2>
      <div class="admin-worldcup-table-wrap"><table class="admin-worldcup-table" style="min-width:520px">
        <thead><tr><th>#</th><th>Grupo</th><th>Equipo</th><th>Pts</th><th>DG</th><th>GF</th></tr></thead>
        <tbody>${clasificacion.terceros.map(t => `<tr><td>${t.thirdRank}</td><td>${t.grupo}</td><td>${esc(t.nombre)}</td><td>${t.pts}</td><td>${t.dg}</td><td>${t.gf}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  }

  function generateOfficialBracket() {
    rebuildStandings();
    const clasificacion = MundialBracketEngine.resolverClasificados(state.standings);
    if (!clasificacion.completo) {
      alert('Todavia faltan grupos con partidos finalizados para generar los 16avos.');
      return;
    }
    const bracket = MundialBracketEngine.generarCrucesR32(clasificacion);
    if (!bracket.ok) {
      alert('No se pudieron asignar los mejores terceros automaticamente.');
      return;
    }
    state.bracketBase = bracket.matches;
    state.knockout = {};
    publishStandings();
    renderBracket();
    log('Bracket generado desde grupos');
  }

  // ── Instalar rueda del mouse → scroll horizontal (una sola vez) ──
  function _installBracketWheel() {
    const scroller = $('admin-worldcup-bracket-scroll');
    if (!scroller || scroller._wheelBound) return;
    scroller._wheelBound = true;
    scroller.addEventListener('wheel', function(e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        scroller.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  function renderBracket() {
    const container = $('admin-worldcup-bracket');
    const scroller  = $('admin-worldcup-bracket-scroll');
    if (!container) return;

    // ── Preservar posición de scroll bidireccional ────────────────
    const savedLeft = scroller ? scroller.scrollLeft : 0;
    const savedTop  = scroller ? scroller.scrollTop  : 0;

    if (!state.bracketBase.length) {
      container.innerHTML = '<p class="admin-worldcup-help">Genera el bracket desde grupos o carga uno publicado.</p>';
      return;
    }
    let html = '';
    ROUNDS.forEach(round => {
      html += `<div class="admin-worldcup-round"><div class="admin-worldcup-round-title">${round.name}</div>`;
      for (let i = 0; i < round.count; i++) {
        html += `<div class="admin-worldcup-bracket-match" id="awc-match-${round.id}-${i}">${renderBracketMatch(round.id, i)}</div>`;
      }
      html += '</div>';
    });
    const champ = state.knockout.CHAMPION;
    html += `<div class="admin-worldcup-round"><div class="admin-worldcup-round-title">Campeon</div><div class="admin-worldcup-bracket-match">${champ ? renderTeamButton(champ, 'CHAMPION', 0, true) : '<button class="admin-worldcup-team-btn empty" disabled>Esperando campeon</button>'}</div></div>`;
    container.innerHTML = html;

    // ── Restaurar posición exacta después del paint ───────────────
    if (scroller) {
      requestAnimationFrame(() => {
        scroller.scrollLeft = savedLeft;
        scroller.scrollTop  = savedTop;
      });
    }

    // ── Rueda del mouse → scroll horizontal ───────────────────────
    _installBracketWheel();
  }

  function renderBracketMatch(roundId, index) {
    const teams = getMatchTeams(roundId, index);
    const selected = state.knockout[`${roundId}_${index}`];
    const code = roundId === 'R32' ? state.bracketBase[index]?.label || '' : '';
    return `<div class="admin-worldcup-match-code">${esc(code)}</div>${teams.map(team => renderTeamButton(team, roundId, index, selected === team)).join('')}`;
  }

  function getMatchTeams(roundId, index) {
    if (roundId === 'R32') {
      const base = state.bracketBase[index] || {};
      return [base.eq1?.nombre || base.eq1, base.eq2?.nombre || base.eq2].filter(Boolean);
    }
    const currentMatchKey = `${roundId}_${index}`;
    const feederKeys = MundialBracketEngine.getFeederKeys(currentMatchKey);
    const pMatch1 = feederKeys[0];
    const pMatch2 = feederKeys[1];
    return [state.knockout[pMatch1], state.knockout[pMatch2]].filter(Boolean);
  }

  function renderTeamButton(team, roundId, index, selected) {
    if (!team) return '<button class="admin-worldcup-team-btn empty" disabled>Sin definir</button>';
    const current = state.knockout[`${roundId}_${index}`];
    const defeated = current && current !== team;
    if (roundId === 'CHAMPION') return `<button class="admin-worldcup-team-btn selected" disabled>${teamFlag(team)}<span>${esc(team)}</span></button>`;
    return `<button class="admin-worldcup-team-btn ${selected ? 'selected' : ''} ${defeated ? 'defeated' : ''}" onclick="AdminMundial.advance('${roundId}', ${index}, '${esc(String(team)).replace(/'/g, "\\'")}')">${teamFlag(team)}<span>${esc(team)}</span></button>`;
  }

  function advance(roundId, index, team) {
    const key = `${roundId}_${index}`;
    state.knockout[key] = team;
    
    // Limpiar ramas futuras usando el mapa compartido
    let currentKey = key;
    while (currentKey && currentKey !== 'CHAMPION') {
      const nextKey = MundialBracketEngine.BRACKET_PROGRESSION[currentKey];
      if (nextKey) {
        delete state.knockout[nextKey];
      }
      currentKey = nextKey;
    }
    delete state.knockout.CHAMPION;
    if (roundId === 'F') state.knockout.CHAMPION = team;

    // ── Actualizar solo las tarjetas afectadas (sin re-render completo) ──
    const scroller = $('admin-worldcup-bracket-scroll');
    const savedLeft = scroller ? scroller.scrollLeft : 0;
    const savedTop  = scroller ? scroller.scrollTop  : 0;

    let needFullRender = false;

    // Partido actual
    const matchEl = document.getElementById(`awc-match-${roundId}-${index}`);
    if (matchEl) {
      matchEl.innerHTML = renderBracketMatch(roundId, index);
    } else {
      needFullRender = true;
    }

    if (!needFullRender) {
      // Partidos siguientes en la rama
      let currentKey = key;
      while (currentKey) {
        const nextKey = MundialBracketEngine.BRACKET_PROGRESSION[currentKey];
        if (!nextKey || nextKey === 'CHAMPION') break;
        const [nextRound, nextIndex] = nextKey.split('_');
        const nextEl = document.getElementById(`awc-match-${nextRound}-${nextIndex}`);
        if (nextEl) {
          nextEl.innerHTML = renderBracketMatch(nextRound, parseInt(nextIndex));
        } else {
          needFullRender = true;
          break;
        }
        currentKey = nextKey;
      }
      // Actualizar campeón
      const champRound = document.querySelector('.admin-worldcup-round:last-child .admin-worldcup-bracket-match');
      if (champRound) {
        const champ = state.knockout.CHAMPION;
        champRound.innerHTML = champ ? renderTeamButton(champ, 'CHAMPION', 0, true) : '<button class="admin-worldcup-team-btn empty" disabled>Esperando campeon</button>';
      }
    }

    if (needFullRender) {
      renderBracket();
    } else if (scroller) {
      requestAnimationFrame(() => {
        scroller.scrollLeft = savedLeft;
        scroller.scrollTop  = savedTop;
      });
    }
  }

  async function publishBracket() {
    if (!state.bracketBase.length) {
      alert('Primero genera el bracket.');
      return;
    }
    try {
      await db.collection('mundial_bracket').doc('oficial').set({
        base: state.bracketBase,
        knockout: state.knockout,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: state.user?.email || ''
      });
      await db.collection('admin_logs').add({
        action: 'Publico bracket Mundial',
        adminEmail: state.user?.email || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      log('Bracket oficial publicado');
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo publicar el bracket.');
    }
  }

  function renderPredictions() {
    const tbody = $('admin-worldcup-users-tbody');
    if (!tbody) return;
    const users = filteredUsers();
    renderDuplicateAlert();
    tbody.innerHTML = users.map(u => {
      const md = u.metadata || {};
      return `<tr>
        <td><strong>${esc(u.nombre || '-')}</strong></td>
        <td>${esc(u.whatsapp || '-')}</td>
        <td>${fmtDate(u.fechaRegistro || u.fechaActualizacion || md.timestamp)}</td>
        <td>${esc(md.ip || '-')}</td>
        <td>${isPredictionComplete(u) ? '<span class="admin-worldcup-pill admin-worldcup-pill-ok">Enviado completo</span>' : '<span class="admin-worldcup-pill admin-worldcup-pill-warn">Parcial</span>'}</td>
        <td><strong>${u.puntos || 0}</strong></td>
        <td>
          <button class="admin-worldcup-btn admin-worldcup-btn-secondary" onclick="AdminMundial.viewUser('${u.id}')">Ver</button>
          <button class="admin-worldcup-btn admin-worldcup-btn-danger" onclick="AdminMundial.deleteUser('${u.id}')">Eliminar</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">Sin predicciones.</td></tr>';
  }

  function filteredUsers() {
    const q = ($('admin-worldcup-user-search')?.value || '').trim().toLowerCase();
    const sort = $('admin-worldcup-user-sort')?.value || 'fecha';
    let users = state.usuarios.filter(u => {
      const md = u.metadata || {};
      const haystack = [u.nombre, u.whatsapp, md.ip, md.userAgent, u.knockout?.CHAMPION, u.bonus?.goleador, u.bonus?.goleadorArg].join(' ').toLowerCase();
      return !q || haystack.includes(q);
    });
    users.sort((a,b) => {
      if (sort === 'puntos') return (b.puntos || 0) - (a.puntos || 0);
      if (sort === 'nombre') return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
      if (sort === 'completos') return Number(isPredictionComplete(b)) - Number(isPredictionComplete(a));
      return (asDate(b.fechaActualizacion || b.fechaRegistro || b.metadata?.timestamp)?.getTime() || 0) - (asDate(a.fechaActualizacion || a.fechaRegistro || a.metadata?.timestamp)?.getTime() || 0);
    });
    return users;
  }

  function renderDuplicateAlert() {
    const target = $('admin-worldcup-duplicate-alert');
    if (!target) return;
    const byWa = {};
    state.usuarios.forEach(u => {
      const key = String(u.whatsapp || '').replace(/\D/g, '') || 'sin-whatsapp';
      byWa[key] = byWa[key] || [];
      byWa[key].push(u);
    });
    const duplicates = Object.entries(byWa).filter(([, items]) => items.length > 1);
    target.innerHTML = duplicates.length
      ? `<div class="admin-worldcup-alert"><strong>${duplicates.length} posible(s) duplicado(s)</strong>: ${duplicates.map(([wa, items]) => `${esc(wa)} (${items.length})`).join(', ')}</div>`
      : '';
  }

  function viewUser(id) {
    const u = state.usuarios.find(item => item.id === id);
    if (!u) return;
    const md = u.metadata || {};
    $('admin-worldcup-modal-content').innerHTML = `<h2>${esc(u.nombre || 'Usuario')}</h2>
      <p><strong>WhatsApp:</strong> ${esc(u.whatsapp || '-')} | <strong>Puntos:</strong> ${u.puntos || 0}</p>
      <p><strong>Timestamp:</strong> ${fmtDate(u.fechaRegistro || u.fechaActualizacion || md.timestamp)}</p>
      <p><strong>IP:</strong> ${esc(md.ip || '-')}</p>
      <p><strong>Dispositivo:</strong> ${esc(md.dispositivo || md.userAgent || '-')}</p>
      <h3>Picks grupos</h3>
      ${renderUserMatches(u)}
      <h3>Bracket usuario</h3>
      ${renderUserKnockout(u.knockout || {})}
      <h3>Bonus (Corrección Manual)</h3>
      <div class="admin-worldcup-form" style="margin-bottom:20px;">
        <label>Goleador Mundial</label>
        <input id="edit-bonus-goleador-${u.id}" class="admin-worldcup-input" value="${esc(u.bonus?.goleador || '')}">
        <label>Goleador Argentina</label>
        <input id="edit-bonus-goleador-arg-${u.id}" class="admin-worldcup-input" value="${esc(u.bonus?.goleadorArg || '')}">
        <label>Valla Invicta</label>
        <input id="edit-bonus-valla-${u.id}" class="admin-worldcup-input" value="${esc(u.bonus?.valla || '')}">
        <button class="admin-worldcup-btn admin-worldcup-btn-secondary" style="margin-top:10px" onclick="AdminMundial.saveUserBonus('${u.id}')">Guardar Bonus Usuario</button>
      </div>
      <h3>Documento completo</h3>
      <pre class="admin-worldcup-json">${esc(JSON.stringify(u, null, 2))}</pre>`;
    $('admin-worldcup-modal').hidden = false;
  }

  function renderUserMatches(u) {
    const preds = u.partidos || {};
    return `<div class="admin-worldcup-table-wrap"><table class="admin-worldcup-table">
      <thead><tr><th>Partido</th><th>Pick</th><th>Real</th></tr></thead>
      <tbody>${MUNDIAL_PARTIDOS.map(p => {
        const pr = preds[p.id];
        const real = state.results[p.id];
        return `<tr><td>${p.id} - ${esc(p.local)} vs ${esc(p.visitante)}</td><td>${pr ? `${pr.gl}-${pr.gv}` : '-'}</td><td>${real ? `${real.gl}-${real.gv}` : '-'}</td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function renderUserKnockout(knockout) {
    const keys = ['R32','R16','QF','SF','F'].flatMap(r => Array.from({ length: ROUNDS.find(x => x.id === r).count }, (_, i) => `${r}_${i}`)).concat('CHAMPION');
    return `<div class="admin-worldcup-table-wrap"><table class="admin-worldcup-table"><tbody>${keys.map(k => `<tr><td>${k}</td><td>${esc(knockout[k] || '-')}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function closeModal() {
    $('admin-worldcup-modal').hidden = true;
    $('admin-worldcup-modal-content').innerHTML = '';
  }

  async function deleteUser(id) {
    const u = state.usuarios.find(item => item.id === id);
    if (!confirm(`Eliminar prediccion de ${u?.nombre || id}?`)) return;
    try {
      await db.collection('predicciones_mundial').doc(id).delete();
      log(`Prediccion eliminada: ${id}`);
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo eliminar la prediccion.');
    }
  }

  function renderRanking() {
    const target = $('admin-worldcup-ranking');
    if (!target) return;
    const users = [...state.usuarios].sort((a,b) => (b.puntos || 0) - (a.puntos || 0));
    target.innerHTML = `<div class="admin-worldcup-table-wrap"><table class="admin-worldcup-table">
      <thead><tr><th>#</th><th>Usuario</th><th>WhatsApp</th><th>Puntos</th><th>Campeon</th></tr></thead>
      <tbody>${users.map((u, idx) => `<tr><td>${idx + 1}</td><td>${esc(u.nombre || '-')}</td><td>${esc(u.whatsapp || '-')}</td><td><strong>${u.puntos || 0}</strong></td><td>${esc(u.knockout?.CHAMPION || '-')}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  async function recalculateRanking() {
    if (!confirm('Recalcular puntos de todos los usuarios Mundial?')) return;
    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < state.usuarios.length; i += CHUNK_SIZE) {
        const batch = db.batch();
        const chunk = state.usuarios.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(u => {
          const puntos = calculateUserPoints(u);
          batch.update(db.collection('predicciones_mundial').doc(u.id), { 
            puntos, 
            recalculadoAt: firebase.firestore.FieldValue.serverTimestamp() 
          });
          u.puntos = puntos;
        });
        
        await batch.commit();
      }
      
      console.log('[Ranking] Recalculado');
      log('Ranking Mundial recalculado');
      renderDashboard();
      renderPredictions();
      renderRanking();
    } catch (error) {
      console.error('[Firebase Error]', error);
      alert('No se pudo recalcular el ranking.');
    }
  }

  function isValidScore(value) {
    return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
  }

  function calculateUserPoints(u) {
    let pts = 0;
    Object.keys(state.results).forEach(id => {
      if (state.estados[id] !== 'finalizado') return;
      const real = state.results[id];
      const pred = (u.partidos || {})[id];
      if (!real || !pred) return;
      if (!isValidScore(pred.gl) || !isValidScore(pred.gv) || !isValidScore(real.gl) || !isValidScore(real.gv)) return;
      if (Number(pred.gl) === Number(real.gl) && Number(pred.gv) === Number(real.gv)) pts += 4;
      else if (sign(pred.gl, pred.gv) === sign(real.gl, real.gv)) pts += 1;
    });

    // === FASES ELIMINATORIAS ===
    // Puntaje por EQUIPO ACERTADO en la ronda, sin importar el slot/posicion del bracket.
    const values = { R32: 10, R16: 20, QF: 30, SF: 50 };
    Object.keys(values).forEach(round => {
      const count = ROUNDS.find(r => r.id === round).count;
      
      const realTeams = new Set();
      for (let i = 0; i < count; i++) {
        const team = state.knockout[`${round}_${i}`];
        if (team) realTeams.add(teamKey(team));
      }

      const userTeams = new Set();
      for (let i = 0; i < count; i++) {
        const team = u.knockout?.[`${round}_${i}`];
        if (team) userTeams.add(teamKey(team));
      }

      userTeams.forEach(team => {
        if (realTeams.has(team)) pts += values[round];
      });
    });

    if (u.knockout?.CHAMPION && state.knockout?.CHAMPION &&
        teamKey(u.knockout.CHAMPION) === teamKey(state.knockout.CHAMPION)) {
      pts += 100;
    }

    // === BONUS ===
    const BONUS_GOLEADOR = 35;
    const BONUS_GOLEADOR_ARG = 25;
    const BONUS_VALLA = 25;
    
    if (state.bonusOficial) {
        const uBonus = u.bonus || {};
        if (uBonus.goleador && state.bonusOficial.goleador && normalizePlayer(uBonus.goleador) === normalizePlayer(state.bonusOficial.goleador)) {
            pts += BONUS_GOLEADOR;
        }
        if (uBonus.goleadorArg && state.bonusOficial.goleadorArg && normalizePlayer(uBonus.goleadorArg) === normalizePlayer(state.bonusOficial.goleadorArg)) {
            pts += BONUS_GOLEADOR_ARG;
        }
        if (uBonus.valla && state.bonusOficial.valla && normalizePlayer(uBonus.valla) === normalizePlayer(state.bonusOficial.valla)) {
            pts += BONUS_VALLA;
        }
    }

    return pts;
  }

  function sign(gl, gv) {
    return Number(gl) > Number(gv) ? 'L' : Number(gl) < Number(gv) ? 'V' : 'E';
  }

  function teamKey(team) {
    return String(team ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function exportData(type) {
    const users = filteredUsers();
    if (type === 'json') {
      download(`predicciones_mundial_${Date.now()}.json`, JSON.stringify(users, null, 2), 'application/json');
      return;
    }
    const rows = [['nombre','whatsapp','timestamp','ip','dispositivo','puntos','estado','campeon','goleador','goleador_arg']];
    users.forEach(u => rows.push([
      u.nombre || '', u.whatsapp || '', fmtDate(u.fechaRegistro || u.fechaActualizacion || u.metadata?.timestamp),
      u.metadata?.ip || '', u.metadata?.dispositivo || u.metadata?.userAgent || '', u.puntos || 0,
      isPredictionComplete(u) ? 'completo' : 'parcial', u.knockout?.CHAMPION || '', u.bonus?.goleador || '', u.bonus?.goleadorArg || ''
    ]));
    download(`predicciones_mundial_${Date.now()}.csv`, rows.map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv');
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

  function renderLogs() {
    const box = $('admin-worldcup-logs');
    if (box) box.innerHTML = state.logs.length ? state.logs.map(esc).join('<br>') : 'Sin acciones recientes.';
  }

  function showSoftError(message, retry) {
    const active = document.querySelector('.admin-worldcup-view.active');
    if (!active) return;
    active.insertAdjacentHTML('afterbegin', `<div class="admin-worldcup-alert">${esc(message)} <button class="admin-worldcup-btn admin-worldcup-btn-secondary" id="admin-worldcup-soft-retry">Reintentar</button></div>`);
    $('admin-worldcup-soft-retry')?.addEventListener('click', retry);
  }

  async function saveOfficialBonus() {
    const btn = $('admin-save-bonus');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    try {
      const goleador = $('admin-bonus-goleador')?.value.trim() || '';
      const goleadorArg = $('admin-bonus-goleador-arg')?.value.trim() || '';
      const valla = $('admin-bonus-valla')?.value.trim() || '';
      await db.collection('mundial_bonus').doc('oficial').set({
        goleador,
        goleadorArg,
        valla,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: state.user?.email || ''
      }, { merge: true });
      log('Resultados Oficiales Bonus guardados');
      alert('Bonus guardados correctamente');
    } catch (e) {
      console.error('[Firebase Error]', e);
      alert('Error guardando bonus');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Oficiales';
    }
  }

  async function saveIgnoreTime(event) {
    const active = event.target.checked;
    try {
      await db.collection('config').doc('estado_mundial').set(
        { ignorarHorario: active },
        { merge: true }
      );
      state.configEstado = { ...state.configEstado, ignorarHorario: active };
      log(`Ventana de carga manual: ${active ? 'ACTIVADA' : 'desactivada'}`);
    } catch (e) {
      console.error('[Firebase Error]', e);
      alert('No se pudo guardar la configuracion.');
      event.target.checked = !active; // revertir en caso de error
    }
  }

  async function saveUserBonus(id) {
    const u = state.usuarios.find(item => item.id === id);
    if (!u) return;
    const goleador = $(`edit-bonus-goleador-${id}`)?.value.trim() || '';
    const goleadorArg = $(`edit-bonus-goleador-arg-${id}`)?.value.trim() || '';
    const valla = $(`edit-bonus-valla-${id}`)?.value.trim() || '';
    if (!confirm(`¿Actualizar bonus de ${u.nombre || id}?`)) return;
    
    try {
      await db.collection('predicciones_mundial').doc(id).update({
        bonus: { goleador, goleadorArg, valla }
      });
      u.bonus = { goleador, goleadorArg, valla };
      log(`Bonus modificados manualmente para: ${u.nombre || id}`);
      alert('Bonus actualizados');
      // Recalcular puntos del usuario automáticamente
      recalculateSingleUser(u);
    } catch(e) {
      console.error(e);
      alert('Error actualizando bonus');
    }
  }

  async function recalculateSingleUser(u) {
    try {
      const puntos = calculateUserPoints(u);
      await db.collection('predicciones_mundial').doc(u.id).update({ puntos });
      u.puntos = puntos;
      renderPredictions();
      renderRanking();
    } catch(e) {
      console.error(e);
    }
  }

  function normalizePlayer(name) {
    if (!name) return "";
    let n = String(name).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    
    const aliases = {
        "lionelmessi": "messi",
        "leomessi": "messi",
        "kylianmbappe": "mbappe",
        "kilianmbappe": "mbappe",
        "dibumartinez": "emilianomartinez",
        "emimartinez": "emilianomartinez",
        "julianalvarez": "alvarez",
        "lautaromartinez": "lautaro"
    };
    
    for (const [alias, std] of Object.entries(aliases)) {
        if (n.includes(alias) || n === std) {
            return std;
        }
    }
    
    if (n.includes("messi")) return "messi";
    if (n.includes("mbappe")) return "mbappe";
    if (n.includes("dibu") || n.includes("emilianomartinez")) return "emilianomartinez";
    if (n.includes("julian") && n.includes("alvarez")) return "alvarez";
    if (n.includes("lautaro")) return "lautaro";
    
    return n;
  }

  window.AdminMundial = { saveMatch, advance, viewUser, deleteUser, saveUserBonus };
})();
