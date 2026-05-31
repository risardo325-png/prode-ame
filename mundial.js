// ============================================================
//  mundial.js — Prode Mundial 2026 v2
//  · 48 partidos precargados con horarios reales (ARG)
//  · Banderas emoji (sin dependencias externas)
//  · Barra de progreso en tiempo real
//  · Guardado automático al perder foco de un input
//  · Toast de confirmación
//  · Ranking con tu posición destacada
// ============================================================

const BANDERAS_MW = {
  'México':'🇲🇽','Sudáfrica':'🇿🇦','Corea del Sur':'🇰🇷','Chequia':'🇨🇿',
  'Canadá':'🇨🇦','Bosnia y Herzegovina':'🇧🇦','Catar':'🇶🇦','Suiza':'🇨🇭',
  'Brasil':'🇧🇷','Marruecos':'🇲🇦','Haití':'🇭🇹','Escocia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Estados Unidos':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺','Turquía':'🇹🇷',
  'Alemania':'🇩🇪','Curazao':'🇨🇼','Costa de Marfil':'🇨🇮','Ecuador':'🇪🇨',
  'Países Bajos':'🇳🇱','Japón':'🇯🇵','Suecia':'🇸🇪','Túnez':'🇹🇳',
  'Bélgica':'🇧🇪','Egipto':'🇪🇬','Irán':'🇮🇷','Nueva Zelanda':'🇳🇿',
  'España':'🇪🇸','Cabo Verde':'🇨🇻','Arabia Saudí':'🇸🇦','Uruguay':'🇺🇾',
  'Francia':'🇫🇷','Senegal':'🇸🇳','Polonia':'🇵🇱','Panamá':'🇵🇦',
  'Argentina':'🇦🇷','Argelia':'🇩🇿','Austria':'🇦🇹','Jordania':'🇯🇴',
  'Portugal':'🇵🇹','Colombia':'🇨🇴','Uzbekistán':'🇺🇿','Irak':'🇮🇶',
  'Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croacia':'🇭🇷','Ghana':'🇬🇭',
};
function bMW(p) { return BANDERAS_MW[p] || '🏳️'; }

// ── FIXTURE 48 PARTIDOS (hora Argentina UTC-3) ──────────────
const MUNDIAL_PARTIDOS = [
  {id:'A1',grupo:'A',jornada:1,local:'México',visitante:'Sudáfrica',fecha:'2026-06-11T16:00',sede:'Ciudad de México'},
  {id:'A2',grupo:'A',jornada:1,local:'Corea del Sur',visitante:'Chequia',fecha:'2026-06-11T23:00',sede:'Guadalajara'},
  {id:'A3',grupo:'A',jornada:2,local:'Chequia',visitante:'Sudáfrica',fecha:'2026-06-18T13:00',sede:'Atlanta'},
  {id:'A4',grupo:'A',jornada:2,local:'México',visitante:'Corea del Sur',fecha:'2026-06-18T22:00',sede:'Guadalajara'},
  {id:'A5',grupo:'A',jornada:3,local:'Chequia',visitante:'México',fecha:'2026-06-24T22:00',sede:'Ciudad de México'},
  {id:'A6',grupo:'A',jornada:3,local:'Sudáfrica',visitante:'Corea del Sur',fecha:'2026-06-24T22:00',sede:'Monterrey'},
  {id:'B1',grupo:'B',jornada:1,local:'Canadá',visitante:'Bosnia y Herzegovina',fecha:'2026-06-12T16:00',sede:'Toronto'},
  {id:'B2',grupo:'B',jornada:1,local:'Catar',visitante:'Suiza',fecha:'2026-06-13T16:00',sede:'San Francisco'},
  {id:'B3',grupo:'B',jornada:2,local:'Suiza',visitante:'Bosnia y Herzegovina',fecha:'2026-06-18T16:00',sede:'Los Ángeles'},
  {id:'B4',grupo:'B',jornada:2,local:'Canadá',visitante:'Catar',fecha:'2026-06-18T19:00',sede:'Vancouver'},
  {id:'B5',grupo:'B',jornada:3,local:'Suiza',visitante:'Canadá',fecha:'2026-06-24T16:00',sede:'Vancouver'},
  {id:'B6',grupo:'B',jornada:3,local:'Bosnia y Herzegovina',visitante:'Catar',fecha:'2026-06-24T16:00',sede:'Seattle'},
  {id:'C1',grupo:'C',jornada:1,local:'Brasil',visitante:'Marruecos',fecha:'2026-06-13T19:00',sede:'Nueva Jersey'},
  {id:'C2',grupo:'C',jornada:1,local:'Haití',visitante:'Escocia',fecha:'2026-06-13T22:00',sede:'Boston'},
  {id:'C3',grupo:'C',jornada:2,local:'Escocia',visitante:'Marruecos',fecha:'2026-06-19T19:00',sede:'Boston'},
  {id:'C4',grupo:'C',jornada:2,local:'Brasil',visitante:'Haití',fecha:'2026-06-19T22:00',sede:'Filadelfia'},
  {id:'C5',grupo:'C',jornada:3,local:'Escocia',visitante:'Brasil',fecha:'2026-06-24T19:00',sede:'Miami'},
  {id:'C6',grupo:'C',jornada:3,local:'Marruecos',visitante:'Haití',fecha:'2026-06-24T19:00',sede:'Atlanta'},
  {id:'D1',grupo:'D',jornada:1,local:'Estados Unidos',visitante:'Paraguay',fecha:'2026-06-12T22:00',sede:'Los Ángeles'},
  {id:'D2',grupo:'D',jornada:1,local:'Australia',visitante:'Turquía',fecha:'2026-06-14T01:00',sede:'Vancouver'},
  {id:'D3',grupo:'D',jornada:2,local:'Turquía',visitante:'Paraguay',fecha:'2026-06-19T01:00',sede:'San Francisco'},
  {id:'D4',grupo:'D',jornada:2,local:'Estados Unidos',visitante:'Australia',fecha:'2026-06-19T16:00',sede:'Seattle'},
  {id:'D5',grupo:'D',jornada:3,local:'Turquía',visitante:'Estados Unidos',fecha:'2026-06-25T23:00',sede:'Los Ángeles'},
  {id:'D6',grupo:'D',jornada:3,local:'Paraguay',visitante:'Australia',fecha:'2026-06-25T23:00',sede:'San Francisco'},
  {id:'E1',grupo:'E',jornada:1,local:'Alemania',visitante:'Curazao',fecha:'2026-06-14T14:00',sede:'Houston'},
  {id:'E2',grupo:'E',jornada:1,local:'Costa de Marfil',visitante:'Ecuador',fecha:'2026-06-14T20:00',sede:'Filadelfia'},
  {id:'E3',grupo:'E',jornada:2,local:'Alemania',visitante:'Costa de Marfil',fecha:'2026-06-20T17:00',sede:'Toronto'},
  {id:'E4',grupo:'E',jornada:2,local:'Ecuador',visitante:'Curazao',fecha:'2026-06-20T21:00',sede:'Kansas City'},
  {id:'E5',grupo:'E',jornada:3,local:'Ecuador',visitante:'Alemania',fecha:'2026-06-25T17:00',sede:'Nueva Jersey'},
  {id:'E6',grupo:'E',jornada:3,local:'Curazao',visitante:'Costa de Marfil',fecha:'2026-06-25T17:00',sede:'Filadelfia'},
  {id:'F1',grupo:'F',jornada:1,local:'Países Bajos',visitante:'Japón',fecha:'2026-06-14T17:00',sede:'Dallas'},
  {id:'F2',grupo:'F',jornada:1,local:'Suecia',visitante:'Túnez',fecha:'2026-06-14T23:00',sede:'Monterrey'},
  {id:'F3',grupo:'F',jornada:2,local:'Japón',visitante:'Suecia',fecha:'2026-06-20T14:00',sede:'Dallas'},
  {id:'F4',grupo:'F',jornada:2,local:'Países Bajos',visitante:'Túnez',fecha:'2026-06-20T20:00',sede:'Atlanta'},
  {id:'F5',grupo:'F',jornada:3,local:'Japón',visitante:'Túnez',fecha:'2026-06-26T20:00',sede:'Houston'},
  {id:'F6',grupo:'F',jornada:3,local:'Suecia',visitante:'Países Bajos',fecha:'2026-06-26T20:00',sede:'Kansas City'},
  {id:'G1',grupo:'G',jornada:1,local:'Bélgica',visitante:'Egipto',fecha:'2026-06-15T16:00',sede:'Seattle'},
  {id:'G2',grupo:'G',jornada:1,local:'Irán',visitante:'Nueva Zelanda',fecha:'2026-06-15T22:00',sede:'Houston'},
  {id:'G3',grupo:'G',jornada:2,local:'Egipto',visitante:'Nueva Zelanda',fecha:'2026-06-21T16:00',sede:'Dallas'},
  {id:'G4',grupo:'G',jornada:2,local:'Bélgica',visitante:'Irán',fecha:'2026-06-21T22:00',sede:'Miami'},
{id:'G5',grupo:'G',jornada:3,local:'Egipto',visitante:'Irán',fecha:'2026-06-26T23:00',sede:'Boston'},
  {id:'G6',grupo:'G',jornada:3,local:'Nueva Zelanda',visitante:'Bélgica',fecha:'2026-06-26T23:00',sede:'Seattle'},
  {id:'H1',grupo:'H',jornada:1,local:'España',visitante:'Cabo Verde',fecha:'2026-06-15T13:00',sede:'Atlanta'},
  {id:'H2',grupo:'H',jornada:1,local:'Arabia Saudí',visitante:'Uruguay',fecha:'2026-06-15T19:00',sede:'Miami'},
  {id:'H3',grupo:'H',jornada:2,local:'Cabo Verde',visitante:'Uruguay',fecha:'2026-06-21T13:00',sede:'Houston'},
  {id:'H4',grupo:'H',jornada:2,local:'España',visitante:'Arabia Saudí',fecha:'2026-06-21T19:00',sede:'Kansas City'},
  {id:'H5',grupo:'H',jornada:3,local:'Uruguay',visitante:'España',fecha:'2026-06-26T17:00',sede:'Dallas'},
  {id:'H6',grupo:'H',jornada:3,local:'Cabo Verde',visitante:'Arabia Saudí',fecha:'2026-06-26T17:00',sede:'Boston'},
  {id:'I1',grupo:'I',jornada:1,local:'Francia',visitante:'Senegal',fecha:'2026-06-16T13:00',sede:'Seattle'},
  {id:'I2',grupo:'I',jornada:1,local:'Polonia',visitante:'Panamá',fecha:'2026-06-16T19:00',sede:'Filadelfia'},
  {id:'I3',grupo:'I',jornada:2,local:'Senegal',visitante:'Polonia',fecha:'2026-06-22T13:00',sede:'Dallas'},
  {id:'I4',grupo:'I',jornada:2,local:'Francia',visitante:'Panamá',fecha:'2026-06-22T19:00',sede:'San Francisco'},
{id:'I5',grupo:'I',jornada:3,local:'Polonia',visitante:'Francia',fecha:'2026-06-27T17:00',sede:'Miami'},
{id:'I6',grupo:'I',jornada:3,local:'Senegal',visitante:'Panamá',fecha:'2026-06-27T17:00',sede:'Vancouver'},
  {id:'J1',grupo:'J',jornada:1,local:'Argentina',visitante:'Argelia',fecha:'2026-06-16T22:00',sede:'Kansas City'},
  {id:'J2',grupo:'J',jornada:1,local:'Austria',visitante:'Jordania',fecha:'2026-06-17T01:00',sede:'San Francisco'},
  {id:'J3',grupo:'J',jornada:2,local:'Argentina',visitante:'Austria',fecha:'2026-06-22T14:00',sede:'Dallas'},
  {id:'J4',grupo:'J',jornada:2,local:'Jordania',visitante:'Argelia',fecha:'2026-06-23T01:00',sede:'San Francisco'},
  {id:'J5',grupo:'J',jornada:3,local:'Argelia',visitante:'Austria',fecha:'2026-06-27T23:00',sede:'Kansas City'},
  {id:'J6',grupo:'J',jornada:3,local:'Jordania',visitante:'Argentina',fecha:'2026-06-27T23:00',sede:'Dallas'},
  {id:'K1',grupo:'K',jornada:1,local:'Portugal',visitante:'Irak',fecha:'2026-06-17T16:00',sede:'Los Ángeles'},
  {id:'K2',grupo:'K',jornada:1,local:'Colombia',visitante:'Uzbekistán',fecha:'2026-06-17T22:00',sede:'Boston'},
  {id:'K3',grupo:'K',jornada:2,local:'Portugal',visitante:'Colombia',fecha:'2026-06-23T16:00',sede:'Seattle'},
  {id:'K4',grupo:'K',jornada:2,local:'Uzbekistán',visitante:'Irak',fecha:'2026-06-23T22:00',sede:'Nueva Jersey'},
  {id:'K5',grupo:'K',jornada:3,local:'Uzbekistán',visitante:'Portugal',fecha:'2026-06-28T20:00',sede:'Ciudad de México'},
  {id:'K6',grupo:'K',jornada:3,local:'Irak',visitante:'Colombia',fecha:'2026-06-28T20:00',sede:'Houston'},
  {id:'L1',grupo:'L',jornada:1,local:'Inglaterra',visitante:'Croacia',fecha:'2026-06-17T19:00',sede:'Nueva Jersey'},
  {id:'L2',grupo:'L',jornada:1,local:'Ghana',visitante:'Panamá',fecha:'2026-06-18T01:00',sede:'Kansas City'},
  {id:'L3',grupo:'L',jornada:2,local:'Croacia',visitante:'Ghana',fecha:'2026-06-23T19:00',sede:'Los Ángeles'},
  {id:'L4',grupo:'L',jornada:2,local:'Inglaterra',visitante:'Panamá',fecha:'2026-06-24T01:00',sede:'Miami'},
  {id:'L5',grupo:'L',jornada:3,local:'Croacia',visitante:'Panamá',fecha:'2026-06-27T18:00',sede:'Kansas City'},
{id:'L6',grupo:'L',jornada:3,local:'Ghana',visitante:'Inglaterra',fecha:'2026-06-27T18:00',sede:'Filadelfia'},
];

function mwValidarFixtureGrupos(fixtures = MUNDIAL_PARTIDOS) {
  console.table(fixtures);

  const porGrupo = {};
  fixtures.forEach(p => {
    if (!porGrupo[p.grupo]) porGrupo[p.grupo] = [];
    porGrupo[p.grupo].push(p);
  });

  Object.entries(porGrupo).forEach(([grupo, partidos]) => {
    const equipos = new Set();
    const directos = new Map();
    const pares = new Map();

    partidos.forEach(p => {
      equipos.add(p.local);
      equipos.add(p.visitante);

      const directo = `${p.local}__${p.visitante}`;
      const invertido = `${p.visitante}__${p.local}`;
      const par = [p.local, p.visitante].sort((a, b) => a.localeCompare(b, 'es')).join('__');

      if (directos.has(directo)) {
        console.warn("duplicate match", { grupo, tipo: "mismo local/visitante", actual: p, anterior: directos.get(directo) });
      }
      if (directos.has(invertido)) {
        console.warn("duplicate match", { grupo, tipo: "partido invertido", actual: p, anterior: directos.get(invertido) });
      }
      if (pares.has(par)) {
        console.warn("duplicate match", { grupo, tipo: "par repetido", actual: p, anterior: pares.get(par) });
      }

      directos.set(directo, p);
      pares.set(par, p);
    });

    if (partidos.length !== 6 || equipos.size !== 4 || pares.size !== 6) {
      console.warn("fixture group invalid", {
        grupo,
        partidos: partidos.length,
        equipos: equipos.size,
        paresUnicos: pares.size,
        equiposLista: [...equipos]
      });
    }
  });
}

// ── ESTADO ────────────────────────────────────────────────────
let _mwCerrado = false;
let _mwIgnorarHorario = false;
let _mwPredsGuardadas = {};
let _mwKnockout = {};
let _mwBonus = {};
let _mwUsuarioId = null;
let _mwAutoSaveTimer = null;
let _mwRankingUnsubscribe = null;

// ── TOAST ─────────────────────────────────────────────────────
function mwToast(msg = '✓ Guardado automáticamente') {
  const t = document.getElementById('mw-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── PROGRESO ──────────────────────────────────────────────────
function mwActualizarProgreso() {
  const ahora = Date.now();
  let completados = 0;
  let total = 0;

  MUNDIAL_PARTIDOS.forEach(p => {
    const cerrado = _mwCerrado || (new Date(p.fecha).getTime() < ahora && !_mwIgnorarHorario);
    if (cerrado) return;
    total++;
    const glEl = document.querySelector(`.mw-gl[data-id="${p.id}"]`);
    const gvEl = document.querySelector(`.mw-gv[data-id="${p.id}"]`);
    if (glEl && gvEl && glEl.value !== '' && gvEl.value !== '') completados++;
  });

  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
  const bar = document.getElementById('mw-progreso-bar');
  const count = document.getElementById('mw-progreso-count');
  if (bar) bar.style.width = pct + '%';
  if (count) count.textContent = `${completados} de ${total} partidos completados`;
}

// ── INIT ──────────────────────────────────────────────────────
async function initMundialUsuario() {
  try {
    const cfg = await db.collection('config').doc('estado_mundial').get();
    if (cfg.exists) {
      _mwCerrado = !!cfg.data().cerrado;
      _mwIgnorarHorario = !!cfg.data().ignorarHorario;
    }
  } catch(e) {
    console.error("[Firebase Error] Error al cargar estado_mundial:", e);
  }

  const wa = sessionStorage.getItem('mundial_wa');
  const nombre = sessionStorage.getItem('mundial_nombre');
  if (wa) {
    const inp = document.getElementById('mw-whatsapp');
    const ninp = document.getElementById('mw-nombre');
    if (inp) inp.value = wa;
    if (ninp && nombre) ninp.value = nombre;
    await cargarPredsGuardadasMundial(wa);
  }

  renderMundialGrupos();
  cargarRankingMundial();
}

// ── RENDER GRUPOS ─────────────────────────────────────────────
function renderMundialGrupos() {
  const container = document.getElementById('mw-partidos-list');
  if (!container) return;

  if (!window._mwFixtureDebugShown) {
    window._mwFixtureDebugShown = true;
    mwValidarFixtureGrupos(MUNDIAL_PARTIDOS);
  }

  const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const ahora = Date.now();
  let html = '';

  grupos.forEach(g => {
    const partidos = MUNDIAL_PARTIDOS.filter(p => p.grupo === g);

    html += `<div class="mw-grupo-bloque">
      <div class="mw-grupo-header" onclick="mwToggleGrupo('${g}')" id="mw-ghdr-${g}">
        GRUPO ${g}
        <span id="mw-garrow-${g}" style="margin-left:auto;font-size:0.7rem;opacity:0.6;">▼</span>
      </div>
      <div id="mw-gbody-${g}">`;

    let jornadaActual = 0;
    partidos.forEach(p => {
      if (p.jornada !== jornadaActual) {
        jornadaActual = p.jornada;
        html += `<div class="mw-jornada-label">Jornada ${jornadaActual}</div>`;
      }

      const fechaMs = new Date(p.fecha).getTime();
      const cerrado = _mwCerrado || (fechaMs < ahora && !_mwIgnorarHorario);
      const pred = _mwPredsGuardadas[p.id] || {};
      const glVal = pred.gl !== undefined ? pred.gl : '';
      const gvVal = pred.gv !== undefined ? pred.gv : '';
      const completado = glVal !== '' && gvVal !== '';
      const dis = cerrado ? 'disabled' : '';
      const fechaStr = new Date(p.fecha).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      const filledClass = completado && !cerrado ? 'mw-filled' : '';
      const partidoClass = cerrado ? 'mw-cerrado' : completado ? 'mw-completado' : '';

      html += `
        <div class="mw-partido ${partidoClass}" data-id="${p.id}">
          <div class="mw-partido-info">
            <span class="mw-hora">📅 ${fechaStr} · ${p.sede}</span>
            ${cerrado ? '<span class="badge-cerrado">Cerrado</span>' : ''}
          </div>
          <div class="mw-partido-equipos">
            <div class="mw-equipo">
              <span class="mw-nombre-eq">${p.local}</span>
              <img class="mw-bandera" src="${getBanderaUrl(p.local, 40)}" alt="${p.local}" onerror="this.outerHTML='<span class=\\'mw-bandera\\' style=\\'font-family: var(--font-display); font-weight: 700; color: #fff; background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-size: 0.65rem; text-align: center; display: inline-block; width: 28px; line-height: 1.5;\\'>${p.local.substring(0,3).toUpperCase()}</span>'">
            </div>
            <div class="mw-marcador">
              <input type="number" min="0" max="30" inputmode="numeric"
                class="mw-goles mw-gl ${filledClass}" data-id="${p.id}" data-lado="gl"
                value="${glVal}" placeholder="–" ${dis}>
              <span class="mw-vs">:</span>
              <input type="number" min="0" max="30" inputmode="numeric"
                class="mw-goles mw-gv ${filledClass}" data-id="${p.id}" data-lado="gv"
                value="${gvVal}" placeholder="–" ${dis}>
            </div>
            <div class="mw-equipo mw-equipo-visitante">
              <img class="mw-bandera" src="${getBanderaUrl(p.visitante, 40)}" alt="${p.visitante}" onerror="this.outerHTML='<span class=\\'mw-bandera\\' style=\\'font-family: var(--font-display); font-weight: 700; color: #fff; background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-size: 0.65rem; text-align: center; display: inline-block; width: 28px; line-height: 1.5;\\'>${p.visitante.substring(0,3).toUpperCase()}</span>'">
              <span class="mw-nombre-eq">${p.visitante}</span>
            </div>
          </div>
        </div>`;
    });

    html += `</div></div>`;
  });

  container.innerHTML = html;

  // ── GUARDIA contra partidos duplicados en DOM ──────────────────
  // Escuchar cambios en inputs
  if (!container._mwInputBound) {
    container._mwInputBound = true;
    container.addEventListener('input', e => {
    if (!e.target.classList.contains('mw-goles')) return;
    // Limpiar valor no numérico
    e.target.value = e.target.value.replace(/[^0-9]/g,'').slice(0,2);
    // Marcar en verde si lleno
    const id = e.target.dataset.id;
    const glEl = container.querySelector(`.mw-gl[data-id="${id}"]`);
    const gvEl = container.querySelector(`.mw-gv[data-id="${id}"]`);
    const partido = container.querySelector(`.mw-partido[data-id="${id}"]`);
    if (glEl && gvEl) {
      const lleno = glEl.value !== '' && gvEl.value !== '';
      glEl.classList.toggle('mw-filled', lleno);
      gvEl.classList.toggle('mw-filled', lleno);
      if (partido) partido.classList.toggle('mw-completado', lleno);
    }
    mwActualizarProgreso();

    // Autoguardado con debounce 3s
    mwAutoGuardarDebounced();
    });
  }

  mwActualizarProgreso();
}

window.mwAutoGuardarDebounced = function() {
  clearTimeout(_mwAutoSaveTimer);
  _mwAutoSaveTimer = setTimeout(() => mwAutoGuardar(), 3000);
};

// ── TOGGLE GRUPO ──────────────────────────────────────────────
window.mwToggleGrupo = function(g) {
  const body = document.getElementById(`mw-gbody-${g}`);
  const arrow = document.getElementById(`mw-garrow-${g}`);
  if (!body) return;
  const oculto = body.style.display === 'none';
  body.style.display = oculto ? 'block' : 'none';
  if (arrow) arrow.textContent = oculto ? '▼' : '▶';
};

// ── CARGAR PREDICCIONES GUARDADAS ─────────────────────────────
async function cargarPredsGuardadasMundial(whatsapp) {
  try {
    // 1. Intentar cargar desde localStorage primero (más rápido y sin costo)
    const localData = localStorage.getItem(`prode_mundial_${whatsapp}`);
    if (localData) {
      const data = JSON.parse(localData);
      _mwPredsGuardadas = data.partidos || {};
      _mwKnockout = data.knockout || {};
      _mwBonus = data.bonus || {};
      // FIX: restaurar docId desde localStorage para evitar duplicados
      if (data.docId) {
        _mwUsuarioId = data.docId;
        console.log('Predicciones cargadas desde localStorage, docId restaurado:', _mwUsuarioId);
      } else {
        // docId no estaba guardado (usuario existente antes del fix):
        // buscarlo en Firebase y guardarlo para futuras sesiones
        const snap = await db.collection('predicciones_mundial')
          .where('whatsapp','==', whatsapp).limit(1).get();
        if (!snap.empty) {
          _mwUsuarioId = snap.docs[0].id;
          // Actualizar localStorage con docId para que no vuelva a pasar
          data.docId = _mwUsuarioId;
          localStorage.setItem(`prode_mundial_${whatsapp}`, JSON.stringify(data));
          console.log('docId recuperado de Firebase y guardado en localStorage:', _mwUsuarioId);
        }
      }
    } else {
      // 2. Fallback a Firebase si no hay nada en local
      const snap = await db.collection('predicciones_mundial')
        .where('whatsapp','==', whatsapp).limit(1).get();
      if (!snap.empty) {
        const data = snap.docs[0].data();
        _mwPredsGuardadas = data.partidos || {};
        _mwKnockout = data.knockout || {};
        _mwBonus = data.bonus || {};
        _mwUsuarioId = snap.docs[0].id;
        console.log('Predicciones cargadas desde Firebase');
      }
    }
    
    // Rellenar campos de bonus
    const bG = document.getElementById('mw-bonus-goleador');
    const bGA = document.getElementById('mw-bonus-goleador-arg');
    const bV = document.getElementById('mw-bonus-valla');
    if (bG) bG.value = _mwBonus.goleador || '';
    if (bGA) bGA.value = _mwBonus.goleadorArg || '';
    if (bV) bV.value = _mwBonus.valla || '';
  } catch(e) { console.error('Error cargando preds:', e); }
}

// ── RECOLECTAR PREDICCIONES DEL DOM ───────────────────────────
function mwRecolectarPreds(soloAbiertos = false) {
  const ahora = Date.now();
  const partidos = {};
  MUNDIAL_PARTIDOS.forEach(p => {
    const fechaMs = new Date(p.fecha).getTime();
    const cerrado = _mwCerrado || (fechaMs < ahora && !_mwIgnorarHorario);
    if (soloAbiertos && cerrado) return;
    const glEl = document.querySelector(`.mw-gl[data-id="${p.id}"]`);
    const gvEl = document.querySelector(`.mw-gv[data-id="${p.id}"]`);
    if (glEl && gvEl && glEl.value !== '' && gvEl.value !== '') {
      partidos[p.id] = { gl: parseInt(glEl.value), gv: parseInt(gvEl.value) };
    }
  });
  return partidos;
}

// ── AUTOGUARDADO ──────────────────────────────────────────────
async function mwAutoGuardar() {
  const wa = document.getElementById('mw-whatsapp')?.value?.trim();
  const nombre = document.getElementById('mw-nombre')?.value?.trim();
  if (!wa || !nombre) {
    if (Object.keys(mwRecolectarPreds()).length > 0) {
      mwToast('⚠️ Completá tus datos arriba para guardar');
    }
    return;
  }

  const partidos = mwRecolectarPreds();
  
  // Recolectar bonus
  const bG = document.getElementById('mw-bonus-goleador')?.value?.trim() || '';
  const bGA = document.getElementById('mw-bonus-goleador-arg')?.value?.trim() || '';
  const bV = document.getElementById('mw-bonus-valla')?.value?.trim() || '';
  _mwBonus = { goleador: bG, goleadorArg: bGA, valla: bV };

  if (Object.keys(partidos).length === 0 && Object.keys(_mwKnockout).length === 0 && !bG && !bGA && !bV) return;

  try {
    const payload = {
      nombre, whatsapp: wa, torneo: 'mundial', partidos, knockout: _mwKnockout, bonus: _mwBonus, puntos: 0,
      fechaActualizacion: new Date().toISOString()
    };
    
    localStorage.setItem(`prode_mundial_${wa}`, JSON.stringify({
      nombre, whatsapp: wa, torneo: 'mundial', partidos, knockout: _mwKnockout, bonus: _mwBonus,
      puntos: 0, metadata, fechaActualizacion: new Date().toISOString()
    }));
    _mwPredsGuardadas = partidos;
    sessionStorage.setItem('mundial_wa', wa);
    sessionStorage.setItem('mundial_nombre', nombre);
    
    mwToast('✓ Guardado localmente');
  } catch(e) { console.error('Autoguardado falló:', e); }
}

// ── CONFIRMAR MANUAL ──────────────────────────────────────────
window.enviarPrediccionesMundial = async function() {
  const nombre = document.getElementById('mw-nombre')?.value?.trim();
  const wa = document.getElementById('mw-whatsapp')?.value?.trim();
  if (!nombre || !wa) { alert('Completá tu nombre y WhatsApp.'); return; }

  const ahora = Date.now();
  const partidos = mwRecolectarPreds();
  let incompletos = [];

  MUNDIAL_PARTIDOS.forEach(p => {
    const fechaMs = new Date(p.fecha).getTime();
    const cerrado = _mwCerrado || (fechaMs < ahora && !_mwIgnorarHorario);
    if (cerrado) return;
    if (!partidos[p.id]) incompletos.push(`${p.local} vs ${p.visitante}`);
  });

  if (incompletos.length > 0) {
    const primeros = incompletos.slice(0, 4).join('\n');
    const resto = incompletos.length > 4 ? `\n...y ${incompletos.length - 4} más` : '';
    if (!confirm(`Hay ${incompletos.length} partidos sin completar:\n${primeros}${resto}\n\n¿Guardar igual?`)) return;
  }

  const btn = document.getElementById('btn-mw-confirmar');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  try {
    let ip = 'desconocida';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip;
    } catch(e) { console.warn('No se pudo obtener IP'); }

    const metadata = {
      ip,
      userAgent: navigator.userAgent,
      dispositivo: navigator.platform || '',
      idioma: navigator.language || '',
      timestamp: Date.now()
    };

    const payload = {
      nombre, whatsapp: wa, torneo: 'mundial', partidos, knockout: _mwKnockout, bonus: _mwBonus, puntos: 0,
      metadata,
      fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
    };
    // FIX anti-duplicados: si no tenemos ID en memoria, buscar en Firebase antes de crear
    if (!_mwUsuarioId) {
      const existing = await db.collection('predicciones_mundial')
        .where('whatsapp','==', wa).limit(1).get();
      if (!existing.empty) {
        _mwUsuarioId = existing.docs[0].id;
        console.log('Documento existente encontrado en Firebase:', _mwUsuarioId);
      }
    }

    if (_mwUsuarioId) {
      await db.collection('predicciones_mundial').doc(_mwUsuarioId).set(payload, { merge: true });
    } else {
      payload.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('predicciones_mundial').add(payload);
      _mwUsuarioId = ref.id;
    }
    _mwPredsGuardadas = partidos;
    sessionStorage.setItem('mundial_wa', wa);
    sessionStorage.setItem('mundial_nombre', nombre);
    
    // Guardado local con docId incluido para recuperarlo en próximas sesiones
    localStorage.setItem(`prode_mundial_${wa}`, JSON.stringify({ ...payload, docId: _mwUsuarioId }));
    
    mwToast('✅ ¡Predicciones guardadas en la nube!');
    
    // Redirigir y generar dashboard
    generarYMostrarDashboard(wa, partidos);
    
  } catch(err) {
    console.error("[Firebase Error]", err);
    alert('Error al guardar. Intentá de nuevo.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🌍 Confirmar Predicciones'; }
  }
};

// ── GENERAR DASHBOARD Y BRACKET ───────────────────────────────
function generarYMostrarDashboard(wa, partidos) {
  const dashSection = document.getElementById('mw-dashboard-section');
  if (dashSection) {
    dashSection.style.display = 'block';
    dashSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Actualizar stats
  const keys = Object.keys(partidos);
  const count = document.getElementById('mw-dash-completados');
  if (count) count.textContent = `${keys.length}/72`;
  
  if (keys.length === 72) {
    generarBracketMundial(partidos);
  }
}

function generarBracketMundial(partidos) {
  const container = document.getElementById('mw-bracket-container');
  if (!container) return;

  const tabla = mwCalcularTablasDesdeResultados(partidos);
  const clasificacion = mwResolverClasificados(tabla);
  console.log("[Bracket] Clasificados:", clasificacion.clasificados);
  
  if (!clasificacion.completo) {
    container.innerHTML = `<p style="color:var(--text-muted);text-align:center;">Faltan partidos por completar para armar los 16vos de final.</p>`;
    return;
  }

  const bracket = mwGenerarCrucesR32(clasificacion);
  if (!bracket.ok) {
    container.innerHTML = `<p style="color:var(--text-muted);text-align:center;">No se pudo ubicar automaticamente a los mejores terceros. Revisa que los grupos esten completos.</p>`;
    return;
  }

  window._mwCurrentBracketTeams = bracket.matches;
  
  renderBracketStructure();
}

const MW_R32_TEMPLATE = [
  { matchNo: 74, eq1: { type: 'pos', group: 'E', pos: 1 }, eq2: { type: 'third', candidates: ['A','B','C','D','F'] } },
  { matchNo: 77, eq1: { type: 'pos', group: 'I', pos: 1 }, eq2: { type: 'third', candidates: ['C','D','F','G','H'] } },
  { matchNo: 73, eq1: { type: 'pos', group: 'A', pos: 2 }, eq2: { type: 'pos', group: 'B', pos: 2 } },
  { matchNo: 75, eq1: { type: 'pos', group: 'F', pos: 1 }, eq2: { type: 'pos', group: 'C', pos: 2 } },
  { matchNo: 76, eq1: { type: 'pos', group: 'C', pos: 1 }, eq2: { type: 'pos', group: 'F', pos: 2 } },
  { matchNo: 78, eq1: { type: 'pos', group: 'E', pos: 2 }, eq2: { type: 'pos', group: 'I', pos: 2 } },
  { matchNo: 79, eq1: { type: 'pos', group: 'A', pos: 1 }, eq2: { type: 'third', candidates: ['C','E','F','H','I'] } },
  { matchNo: 80, eq1: { type: 'pos', group: 'L', pos: 1 }, eq2: { type: 'third', candidates: ['E','H','I','J','K'] } },
  { matchNo: 83, eq1: { type: 'pos', group: 'K', pos: 2 }, eq2: { type: 'pos', group: 'L', pos: 2 } },
  { matchNo: 84, eq1: { type: 'pos', group: 'H', pos: 1 }, eq2: { type: 'pos', group: 'J', pos: 2 } },
  { matchNo: 81, eq1: { type: 'pos', group: 'D', pos: 1 }, eq2: { type: 'third', candidates: ['B','E','F','I','J'] } },
  { matchNo: 82, eq1: { type: 'pos', group: 'G', pos: 1 }, eq2: { type: 'third', candidates: ['A','E','H','I','J'] } },
  { matchNo: 86, eq1: { type: 'pos', group: 'J', pos: 1 }, eq2: { type: 'pos', group: 'H', pos: 2 } },
  { matchNo: 88, eq1: { type: 'pos', group: 'D', pos: 2 }, eq2: { type: 'pos', group: 'G', pos: 2 } },
  { matchNo: 85, eq1: { type: 'pos', group: 'B', pos: 1 }, eq2: { type: 'third', candidates: ['E','F','G','I','J'] } },
  { matchNo: 87, eq1: { type: 'pos', group: 'K', pos: 1 }, eq2: { type: 'third', candidates: ['D','E','I','J','L'] } },
];

function mwCrearEquipoTabla(nombre, grupo) {
  return { nombre, grupo, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0 };
}

function mwCalcularTablasDesdeResultados(partidos) {
  const tabla = {};
  MUNDIAL_PARTIDOS.forEach(p => {
    if (!tabla[p.grupo]) tabla[p.grupo] = {};
    if (!tabla[p.grupo][p.local]) tabla[p.grupo][p.local] = mwCrearEquipoTabla(p.local, p.grupo);
    if (!tabla[p.grupo][p.visitante]) tabla[p.grupo][p.visitante] = mwCrearEquipoTabla(p.visitante, p.grupo);
    const res = partidos[p.id];
    const gl = Number(res?.gl);
    const gv = Number(res?.gv);
    if (!Number.isInteger(gl) || !Number.isInteger(gv) || gl < 0 || gv < 0) return;
    const tl = tabla[p.grupo][p.local];
    const tv = tabla[p.grupo][p.visitante];
    tl.pj++; tv.pj++;
    tl.gf += gl; tl.gc += gv; tl.dg = tl.gf - tl.gc;
    tv.gf += gv; tv.gc += gl; tv.dg = tv.gf - tv.gc;
    if (gl > gv) { tl.pts += 3; tl.pg++; tv.pp++; }
    else if (gl < gv) { tv.pts += 3; tv.pg++; tl.pp++; }
    else { tl.pts += 1; tv.pts += 1; tl.pe++; tv.pe++; }
  });
  Object.keys(tabla).forEach(grupo => {
    tabla[grupo] = Object.values(tabla[grupo]).sort(mwCompararEquiposFifa);
  });
  return tabla;
}

function mwCompararEquiposFifa(a, b) {
  return (b.pts - a.pts)
    || (b.dg - a.dg)
    || (b.gf - a.gf)
    || (b.pg - a.pg)
    || a.nombre.localeCompare(b.nombre, 'es');
}

function mwResolverClasificados(tabla) {
  const primeros = {};
  const segundos = {};
  const terceros = [];
  let completo = true;
  Object.keys(tabla).sort().forEach(grupo => {
    const equipos = tabla[grupo] || [];
    if (equipos.length < 4 || equipos.some(e => e.pj < 3)) completo = false;
    if (equipos[0]) primeros[grupo] = equipos[0];
    if (equipos[1]) segundos[grupo] = equipos[1];
    if (equipos[2]) terceros.push({ ...equipos[2], thirdRank: 0 });
  });
  terceros.sort(mwCompararEquiposFifa).forEach((t, idx) => { t.thirdRank = idx + 1; });
  const mejoresTerceros = terceros.slice(0, 8);
  return {
    completo: completo && Object.keys(primeros).length === 12 && Object.keys(segundos).length === 12 && mejoresTerceros.length === 8,
    primeros,
    segundos,
    terceros: mejoresTerceros,
    clasificados: [...Object.values(primeros), ...Object.values(segundos), ...mejoresTerceros]
  };
}

function mwGenerarCrucesR32(clasificacion) {
  const thirdByGroup = {};
  clasificacion.terceros.forEach(t => { thirdByGroup[t.grupo] = t; });
  const slots = MW_R32_TEMPLATE
    .map((m, idx) => ({ idx, def: m.eq2, candidates: m.eq2.type === 'third' ? m.eq2.candidates.filter(g => thirdByGroup[g]) : [] }))
    .filter(s => s.def.type === 'third')
    .sort((a, b) => a.candidates.length - b.candidates.length);
  const used = new Set();
  const assignment = {};
  function backtrack(pos) {
    if (pos >= slots.length) return true;
    const slot = slots[pos];
    const candidates = slot.candidates
      .map(g => thirdByGroup[g])
      .filter(Boolean)
      .filter(t => !used.has(t.grupo))
      .sort((a, b) => a.thirdRank - b.thirdRank);
    for (const team of candidates) {
      assignment[slot.idx] = team;
      used.add(team.grupo);
      if (backtrack(pos + 1)) return true;
      used.delete(team.grupo);
      delete assignment[slot.idx];
    }
    return false;
  }
  if (!backtrack(0)) return { ok: false, matches: [] };
  const resolve = (def, idx) => {
    if (def.type === 'pos') return (def.pos === 1 ? clasificacion.primeros : clasificacion.segundos)[def.group] || null;
    return assignment[idx] || null;
  };
  return {
    ok: true,
    matches: MW_R32_TEMPLATE.map((m, idx) => ({
      matchNo: m.matchNo,
      eq1: resolve(m.eq1, idx),
      eq2: resolve(m.eq2, idx),
      label: `M${m.matchNo}`
    }))
  };
}

window.MundialBracketEngine = {
  calcularTablas: mwCalcularTablasDesdeResultados,
  resolverClasificados: mwResolverClasificados,
  generarCrucesR32: mwGenerarCrucesR32,
  template: MW_R32_TEMPLATE
};

// ── BRACKET SCROLL: instalar rueda del mouse → scroll horizontal ──
function _mwInstallBracketWheelScroll(container) {
  if (container._mwWheelBound) return;
  container._mwWheelBound = true;
  container.addEventListener('wheel', function(e) {
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (!delta) return;

    const root = document.scrollingElement || document.documentElement;
    const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
    const pageAtVerticalLimit = delta < 0 ? root.scrollTop <= 0 : root.scrollTop >= maxScrollTop - 1;
    const atLeft = container.scrollLeft <= 0;
    const atRight = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
    const canMoveHorizontally = delta < 0 ? !atLeft : !atRight;

    if ((!e.shiftKey && !pageAtVerticalLimit) || !canMoveHorizontally) return;

    e.preventDefault();
    container.scrollLeft += delta;
  }, { passive: false });
}

function _mwRenderBracketStructureLegacy() {
  const container = document.getElementById('mw-bracket-container');
  if (!container) return;

  // ── PRESERVAR SCROLL antes del render ──────────────────────────
  const savedScrollLeft = container.scrollLeft;
  const savedScrollTop  = container.scrollTop;

  const RONDAS = [
    { id: 'R32', name: '16avos', count: 16 },
    { id: 'R16', name: 'Octavos', count: 8 },
    { id: 'QF', name: 'Cuartos', count: 4 },
    { id: 'SF', name: 'Semis', count: 2 },
    { id: 'F', name: 'Final', count: 1 }
  ];

  let html = `<div class="mw-bracket">`;
  
  RONDAS.forEach((ronda) => {
    html += `<div class="mw-bracket-round mw-round-${ronda.id}">`;
    html += `<div class="mw-round-title">${ronda.name}</div>`;
    
    for (let i = 0; i < ronda.count; i++) {
      html += `
        <div class="mw-match-wrapper">
          <div class="mw-match" id="match-${ronda.id}-${i}">
             ${renderMatchContent(ronda.id, i)}
          </div>
        </div>`;
    }
    html += `</div>`;
  });

  // Champion Box
  const champ = _mwKnockout['CHAMPION'];
  html += `
    <div class="mw-bracket-round mw-round-CHAMPION">
      <div class="mw-round-title" style="color: var(--primary);">Campeón</div>
      <div class="mw-champion-card ${champ ? 'active' : ''}" id="match-CHAMPION-0">
        ${champ ? `
          <div class="mw-champion-glow"></div>
          <span style="font-size: 2rem;">🏆</span>
          <img src="${getBanderaUrl(champ, 60)}" style="width:60px; border-radius:50%; border: 3px solid var(--primary); margin: 0.5rem 0; box-shadow: 0 0 15px rgba(212,175,55,0.5);">
          <span style="font-size: 1.2rem; font-weight: bold; color: #fff;">${champ}</span>
        ` : `
          <span style="font-size: 2rem; opacity: 0.5;">🏆</span>
          <span style="color: var(--text-muted); font-size: 0.9rem;">Esperando Campeón</span>
        `}
      </div>
    </div>
  `;

  html += `</div>`;
  container.innerHTML = html;

  // ── RESTAURAR SCROLL después del render ────────────────────────
  // requestAnimationFrame garantiza que el DOM ya está pintado
  requestAnimationFrame(() => {
    container.scrollLeft = savedScrollLeft;
    container.scrollTop  = savedScrollTop;
  });

  // ── Rueda del mouse → scroll horizontal ───────────────────────
  _mwInstallBracketWheelScroll(container);
}

function renderBracketStructure() {
  const container = document.getElementById('mw-bracket-container');
  if (!container) return;

  const savedScrollLeft = container.scrollLeft;
  const savedScrollTop  = container.scrollTop;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const openMobileRounds = Array.from(container.querySelectorAll('.mw-mobile-round[open]')).map(el => el.dataset.round);

  const RONDAS = [
    { id: 'R32', name: '16avos', count: 16 },
    { id: 'R16', name: 'Octavos', count: 8 },
    { id: 'QF', name: 'Cuartos', count: 4 },
    { id: 'SF', name: 'Semis', count: 2 },
    { id: 'F', name: 'Final', count: 1 }
  ];

  const champ = _mwKnockout['CHAMPION'];
  const championHtml = `
    <div class="mw-bracket-round mw-round-CHAMPION">
      <div class="mw-round-title" style="color: var(--primary);">Campeón</div>
      <div class="mw-champion-card ${champ ? 'active' : ''}" id="match-CHAMPION-0">
        ${champ ? `
          <div class="mw-champion-glow"></div>
          <span style="font-size: 2rem;">🏆</span>
          <img src="${getBanderaUrl(champ, 60)}" style="width:60px; border-radius:50%; border: 3px solid var(--primary); margin: 0.5rem 0; box-shadow: 0 0 15px rgba(212,175,55,0.5);">
          <span style="font-size: 1.2rem; font-weight: bold; color: #fff;">${champ}</span>
        ` : `
          <span style="color: var(--text-muted); font-size: 0.9rem;">Esperando campeón</span>
        `}
      </div>
    </div>
  `;

  let html = '';
  if (isMobile) {
    const hasOpenRounds = openMobileRounds.length > 0;
    html = `<div class="mw-bracket-mobile">`;
    RONDAS.forEach((ronda, rondaIndex) => {
      const isOpen = hasOpenRounds ? openMobileRounds.includes(ronda.id) : rondaIndex === 0;
      html += `
        <details class="mw-mobile-round" data-round="${ronda.id}" ${isOpen ? 'open' : ''}>
          <summary>
            <span>${ronda.name}</span>
            <small>${ronda.count} partidos</small>
          </summary>
          <div class="mw-mobile-round-matches">`;
      for (let i = 0; i < ronda.count; i++) {
        html += `
          <div class="mw-match-wrapper">
            <div class="mw-match" id="match-${ronda.id}-${i}">
              ${renderMatchContent(ronda.id, i)}
            </div>
          </div>`;
      }
      html += `</div></details>`;
    });
    html += `<section class="mw-mobile-champion">${championHtml}</section></div>`;
  } else {
    html = `<div class="mw-bracket">`;
    RONDAS.forEach((ronda) => {
      html += `<div class="mw-bracket-round mw-round-${ronda.id}">`;
      html += `<div class="mw-round-title">${ronda.name}</div>`;
      for (let i = 0; i < ronda.count; i++) {
        html += `
          <div class="mw-match-wrapper">
            <div class="mw-match" id="match-${ronda.id}-${i}">
              ${renderMatchContent(ronda.id, i)}
            </div>
          </div>`;
      }
      html += `</div>`;
    });
    html += championHtml;
    html += `</div>`;
  }

  container.innerHTML = html;
  if (isMobile) {
    container.querySelectorAll('.mw-mobile-round').forEach(detail => {
      detail.addEventListener('toggle', () => {
        if (!detail.open) return;
        container.querySelectorAll('.mw-mobile-round').forEach(other => {
          if (other !== detail) other.open = false;
        });
      });
    });
  }
  requestAnimationFrame(() => {
    container.scrollLeft = isMobile ? 0 : savedScrollLeft;
    container.scrollTop = savedScrollTop;
  });

  if (!isMobile) _mwInstallBracketWheelScroll(container);
}

function renderMatchContent(rondaId, matchIndex) {
  let eq1 = null;
  let eq2 = null;

  if (rondaId === 'R32') {
    const initMatch = window._mwCurrentBracketTeams[matchIndex];
    eq1 = initMatch?.eq1?.nombre || null;
    eq2 = initMatch?.eq2?.nombre || null;
  } else {
    // Buscar en los ganadores de la ronda anterior
    let prevRondaId;
    if (rondaId === 'R16') prevRondaId = 'R32';
    else if (rondaId === 'QF') prevRondaId = 'R16';
    else if (rondaId === 'SF') prevRondaId = 'QF';
    else if (rondaId === 'F') prevRondaId = 'SF';

    const pMatch1 = prevRondaId + '_' + (matchIndex * 2);
    const pMatch2 = prevRondaId + '_' + (matchIndex * 2 + 1);

    eq1 = _mwKnockout[pMatch1] || null;
    eq2 = _mwKnockout[pMatch2] || null;
  }

  const selected = _mwKnockout[`${rondaId}_${matchIndex}`];
  
  const renderTeam = (teamName, slot) => {
    if (!teamName) {
      return `
        <button class="btn-prediccion-el empty" disabled>
          <span class="empty-slot">?</span>
        </button>
      `;
    }
    
    const isSelected = selected === teamName;
    const isDefeated = selected && !isSelected;
    const cls = `btn-prediccion-el ${isSelected ? 'selected' : ''} ${isDefeated ? 'defeated' : ''}`;
    
    return `
      <button class="${cls}" onclick="mwAvanzarEquipo('${rondaId}', ${matchIndex}, '${teamName}')">
        <img src="${getBanderaUrl(teamName, 40)}" class="team-flag">
        <span class="team-name">${teamName}</span>
      </button>
    `;
  };

  return `
    <div class="match-teams">
      ${rondaId === 'R32' && window._mwCurrentBracketTeams?.[matchIndex]?.label ? `<div class="match-code">${window._mwCurrentBracketTeams[matchIndex].label}</div>` : ''}
      ${renderTeam(eq1, 1)}
      <div class="match-divider">VS</div>
      ${renderTeam(eq2, 2)}
    </div>
  `;
}

window.mwAvanzarEquipo = function(rondaId, matchIndex, equipoGanador) {
  const matchKey = `${rondaId}_${matchIndex}`;
  
  // Si ya estaba seleccionado, no hacer nada (o deseleccionar? mejor no deseleccionar)
  if (_mwKnockout[matchKey] === equipoGanador) return;

  _mwKnockout[matchKey] = equipoGanador;

  // Limpiar fases subsecuentes que dependan de esta rama
  limpiarRamasFuturas(rondaId, matchIndex);

  // Si estamos en la Final, definir al campeón
  if (rondaId === 'F') {
    _mwKnockout['CHAMPION'] = equipoGanador;
  }

  mwAutoGuardarDebounced();
  
  // Re-render completo pero optimizado (el navegador es rápido)
  renderBracketStructure();
};

function limpiarRamasFuturas(rondaId, matchIndex) {
  const progression = ['R32', 'R16', 'QF', 'SF', 'F'];
  let currentRIdx = progression.indexOf(rondaId);
  
  let currentIndex = matchIndex;
  
  for (let i = currentRIdx + 1; i < progression.length; i++) {
    const nextRondaId = progression[i];
    currentIndex = Math.floor(currentIndex / 2);
    const nextMatchKey = `${nextRondaId}_${currentIndex}`;
    
    // Borramos el ganador del partido futuro porque uno de los contendientes cambió
    delete _mwKnockout[nextMatchKey];
  }
  // Y si se modificó algo, también borramos al campeón
  delete _mwKnockout['CHAMPION'];
}


// ── RANKING ───────────────────────────────────────────────────
let _mwRankingSnapshot = {};

async function cargarRankingMundial() {
  const div = document.getElementById('mw-ranking-list');
  const miPosDiv = document.getElementById('mw-mi-posicion');
  if (!div) return;

  try {
    // Intentar cargar snapshot histórico para tendencias (⬆️⬇️)
    try {
        const snap = await db.collection('config').doc('ranking_snapshot').get();
        if(snap.exists) _mwRankingSnapshot = snap.data().users || {};
    } catch(e) {}

    // Escuchar ranking en tiempo real sin duplicar listeners
    if (_mwRankingUnsubscribe) _mwRankingUnsubscribe();
    _mwRankingUnsubscribe = db.collection('predicciones_mundial').onSnapshot(snap => {
      console.log("[Partidos] Ranking Mundial actualizado, docs:", snap.size);
      if (snap.empty) {
        div.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1.5rem 0;">Aún no hay participantes.</p>';
        return;
      }

      let users = [];
      snap.forEach(d => users.push({ id: d.id, ...d.data() }));
      users.sort((a, b) => (b.puntos||0) - (a.puntos||0));

      const miWa = sessionStorage.getItem('mundial_wa');
      const miIdx = miWa ? users.findIndex(u => u.whatsapp === miWa) : -1;

      // Mi posición destacada
      if (miIdx >= 0 && miPosDiv) {
        const yo = users[miIdx];
        const lider = users[0];
        const diff = (lider.puntos||0) - (yo.puntos||0);
        const pos = miIdx + 1;
        miPosDiv.style.display = 'flex';
        miPosDiv.innerHTML = `
          <div class="mw-tu-posicion">
            <div class="mw-tu-posicion-pos">${pos}°</div>
            <div class="mw-tu-posicion-info">
              <div class="mw-tu-posicion-nombre">📍 Tu posición</div>
              <div class="mw-tu-posicion-diff">${diff > 0 ? `A ${diff} pts del líder` : '¡Estás primero!'}</div>
            </div>
            <div class="mw-tu-posicion-pts">${yo.puntos||0} pts</div>
          </div>`;
      }

      // Top 10
      const top = users.slice(0, 10);
      let html = '';
      top.forEach((u, i) => {
        const pos = i + 1;
        const emoji = pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':pos;
        const cls = pos<=3 ? `ranking-top${pos}` : '';
        const esYo = miWa && u.whatsapp === miWa;
        
        // Tendencia
        let tendencia = '<span style="color:var(--text-muted); font-size:0.75rem;">=</span>';
        if (_mwRankingSnapshot[u.id]) {
            const oldPos = _mwRankingSnapshot[u.id].pos;
            if (pos < oldPos) tendencia = '<span style="color:#10b981; font-size:0.8rem;">⬆️</span>';
            else if (pos > oldPos) tendencia = '<span style="color:#ef4444; font-size:0.8rem;">⬇️</span>';
        } else if (Object.keys(_mwRankingSnapshot).length > 0) {
            tendencia = '<span style="color:#10b981; font-size:0.8rem;">✨</span>'; // Nuevo en el top
        }

        html += `<div class="ranking-item ${cls}" ${esYo ? 'style="border-color:var(--primary);background:linear-gradient(to right,rgba(212,175,55,0.08),transparent 70%)"' : ''}>
          <div class="ranking-pos">${emoji}</div>
          <div style="margin-left: 0.5rem; margin-right: 0.5rem;">${tendencia}</div>
          <div class="ranking-name">${u.nombre}${esYo ? ' <span style="font-size:0.65rem;color:var(--primary);font-family:var(--font-condensed);letter-spacing:1px;">TÚ</span>' : ''}</div>
          <div class="ranking-pts"><span class="pts-number">${u.puntos||0}</span><span class="pts-exactos">pts</span></div>
        </div>`;
      });
      div.innerHTML = html;
    }, err => {
      console.error("[Firebase Error]", err);
      div.innerHTML = `
        <div style="text-align:center; padding: 2rem 1rem; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--card-border);">
            <p style="color: var(--danger); font-size: 1.1rem; margin-bottom: 1rem;">No se pudo conectar el ranking en tiempo real.</p>
            <button onclick="cargarRankingMundial()" class="btn-primary" style="padding: 0.5rem 1rem;">Reintentar</button>
        </div>
      `;
    });
  } catch(e) {
    console.error("[Firebase Error] Error al cargar ranking mundial:", e);
    div.innerHTML = `
        <div style="text-align:center; padding: 2rem 1rem; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--card-border);">
            <p style="color: var(--danger); font-size: 1.1rem; margin-bottom: 1rem;">No se pudo cargar el ranking.</p>
            <button onclick="cargarRankingMundial()" class="btn-primary" style="padding: 0.5rem 1rem;">🔄 Reintentar</button>
        </div>
    `;
  }
}