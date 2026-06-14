// Service Worker — desregistrar versiones viejas y limpiar caches
if ('serviceWorker' in navigator) {
    // Registrar el SW de limpieza (se auto-desactiva y borra caches)
    navigator.serviceWorker.register('./service-worker.js')
        .then(() => console.log('[SW] Cache limpiado correctamente'))
        .catch(err => console.warn('[SW] Error:', err));

    // Por las dudas: desregistrar cualquier SW previo que pueda servir archivos viejos
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
            if (!reg.active || !reg.active.scriptURL.includes('service-worker.js')) {
                reg.unregister();
            }
        });
    });
}

// Variables globales para almacenar datos cargados y evitar re-fetches innecesarios
let partidosGlobal = [];
let partidosGlobalAdmin = [];
let resultadosGlobal = {};

// ===== MULTI-TORNEO =====
// Torneo activo. Leer desde URL (?torneo=mundial) o por defecto "pueblo"
const _urlParams = new URLSearchParams(window.location.search);
let torneoActual = _urlParams.get('torneo') || 'pueblo';

// cambiarTorneo: definido en la sección LÓGICA DEL USUARIO (override completo)
// Se sobrescribe en initUserApp para manejar las secciones pueblo / mundial

// Helper: devuelve query base filtrada por torneo (compatible con docs sin campo "torneo" = "pueblo")
function queryTorneo(coleccion) {
    return db.collection(coleccion).where('torneo', '==', torneoActual);
}

// Config doc específica por torneo (evita colisión entre torneos)
function configDocId(nombre) {
    return `${nombre}_${torneoActual}`;
}

// Funciones para escudos automáticos
// Manejador global de errores para imágenes caídas (No inline)
document.addEventListener('error', function (e) {
    const target = e.target;
    if (target.tagName && target.tagName.toLowerCase() === 'img') {
        const fallbackSrc = target.getAttribute('data-fallback');
        
        // Si hay un fallback guardado y no lo hemos probado aún, intentamos el nombre base
        if (fallbackSrc && !target.src.includes(fallbackSrc) && !target.hasAttribute('data-fallback-attempted')) {
            target.setAttribute('data-fallback-attempted', 'true');
            target.src = fallbackSrc;
        } 
        // Si el fallback también falla, aplicamos un estilo robusto
        else {
            // Ocultar la imagen rota y usar CSS para mostrar un círculo genérico
            target.style.display = 'none';
            const container = target.parentElement;
            if (container && container.classList.contains('escudo-container')) {
                const altText = (target.alt || '?').charAt(0).toUpperCase();
                container.innerHTML = `<span style="color: white; font-size: 1.5rem; font-family: var(--font-display); font-weight: 700;">${altText}</span>`;
            }
        }
    }
}, true); // Modo captura para interceptar antes

function normalizarNombre(nombre) {
    if (!nombre) return 'default';
    return nombre
      .toLowerCase()                   // 1. Pasa todo a minúsculas
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // 2. Elimina tildes y acentos
      .replace(/\./g, "")              // 3. Elimina puntos (ej: F.B.C. -> fbc)
      .replace(/\(/g, " ")             // 4. Reemplaza "(" por espacio
      .replace(/\)/g, "")              // 5. Elimina ")"
      .replace(/[^a-z0-9]+/g, "-")     // 6. Reemplaza espacios y símbolos por guiones
      .replace(/-+/g, "-")             // 7. Evita guiones dobles
      .replace(/^-+|-+$/g, "");        // 8. Limpia guiones en los extremos
}

function getEscudo(nombre) {
    const key = normalizarNombre(nombre);
    const ruta = `/img/escudos/${key}.png`;
    
    let nombreBase = nombre.replace(/\s*\(.*?\)/g, "");
    let keyBase = normalizarNombre(nombreBase);
    const rutaBase = `/img/escudos/${keyBase}.png`;

    // Escudos que necesitan tamaño personalizado
    const tamaños = {
        'ingeniero-white': '90%',
        'eclipse-villegas': '90%',
    };
    const size = tamaños[key] || '70%';

    console.log("Equipo:", nombre);
    console.log("Archivo generado:", key);

    return `
      <div class="escudo-container">
        <img src="${ruta}" alt="${nombre}" data-fallback="${rutaBase}" style="width:${size}; height:${size};">
      </div>
    `;
}

// ===== DETECCIÓN DE PÁGINA =====
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('user-main')) {
        initUserApp();
    } else if (document.getElementById('admin-main')) {
        initAdminApp();
    }
});

// ==========================================
// ========== LÓGICA DEL USUARIO ============
// ==========================================

// ─── HANDLER "COMPLETAR REGISTRO" — abre WhatsApp con datos del usuario ──────
document.addEventListener('DOMContentLoaded', function() {
    const btnRegistrarse = document.getElementById('btn-registrarse');
    if (btnRegistrarse) {
        btnRegistrarse.addEventListener('click', function () {
            const nombre = document.getElementById('nombre').value.trim();
            const telefono = document.getElementById('whatsapp').value.trim();

            if (!nombre || !telefono) {
                alert('Completá tus datos primero');
                return;
            }

            const mensaje = `Hola! Quiero participar del Prode del Pueblo.%0A%0ANombre: ${nombre}%0ATeléfono: ${telefono}%0A%0AYa realicé el pago, te envío comprobante.`;
            const url = `https://wa.me/5491164050369?text=${mensaje}`;
            window.open(url, '_blank');
        });
    }
});

// ─── CAMBIO DE TAB TORNEO (override para mostrar/ocultar secciones) ────────
// El cambiarTorneo original en la parte de arriba maneja el admin.
// Para el user-main, además mostramos la sección correcta.
const _cambiarTorneoOriginal = window.cambiarTorneo;
window.cambiarTorneo = function(torneo) {
    torneoActual = torneo;

    // Actualizar estado visual de pestañas
    document.querySelectorAll('.tab-torneo').forEach(btn => {
        btn.classList.toggle('tab-activa', btn.dataset.torneo === torneo);
    });

    if (document.getElementById('user-main')) {
        const seccionPueblo = document.getElementById('seccion-pueblo');
        const seccionMundial = document.getElementById('seccion-mundial');

        if (torneo === 'mundial') {
            if (seccionPueblo) seccionPueblo.style.display = 'none';
            if (seccionMundial) {
                seccionMundial.style.display = 'block';
                seccionMundial.style.animation = 'fadeSlideUp 0.5s ease both';
            }
            document.body.classList.add('modo-mundial');
            // Inicializar Mundial
            if (typeof initMundialUsuario === 'function') initMundialUsuario();
        } else {
            // Mostrar sección Pueblo
            if (seccionMundial) seccionMundial.style.display = 'none';
            if (seccionPueblo) {
                seccionPueblo.style.display = 'block';
                seccionPueblo.style.animation = 'fadeSlideUp 0.5s ease both';
            }
            document.body.classList.remove('modo-mundial');
            // Recargar datos pueblo
            cargarPartidosUsuario();
            cargarConfigGolUser();
            cargarRanking();
        }
    } else if (document.getElementById('admin-main')) {
        poblarFormularioTorneo(torneo);
        cargarPartidosAdmin();
        cargarUsuariosAdmin();
        cargarConfigGolAdmin();
        const btnCerrar = document.getElementById('btn-cerrar-fecha');
        if (btnCerrar) {
            db.collection('config').doc(configDocId('estado')).get().then(doc => {
                btnCerrar.textContent = (doc.exists && doc.data().fechaCerrada) ? "Abrir Fecha Global" : "Cerrar Fecha Global";
            }).catch(() => {});
        }
    }
};

async function initUserApp() {
    await cargarPartidosUsuario();
    await cargarConfigGolUser();
    await cargarRanking();

    const btnParticipar = document.getElementById('btn-participar');
    btnParticipar.addEventListener('click', enviarPredicciones);
}

async function cargarPartidosUsuario() {
    console.log("[Firebase] Conectado");
    console.log("[Partidos] Cargando...");
    console.log("[Partidos] Colección: partidos");

    const listDiv = document.getElementById('partidos-list');
    if (!listDiv) return;
    listDiv.innerHTML = '<p>Cargando partidos...</p>';

    try {
        const snapshot = await queryTorneo('partidos').get();
        console.log("[Partidos] Encontrados:", snapshot.size);

        if (snapshot.empty) {
            listDiv.innerHTML = '<p>No hay partidos disponibles aún.</p>';
            return;
        }

        // Ordenar en JS para evitar problemas de índices compuestos en Firebase
        let partidosArray = [];
        snapshot.forEach(doc => partidosArray.push({ id: doc.id, ...doc.data() }));
        
        partidosArray.sort((a, b) => {
            const jA = a.jornada || 0;
            const jB = b.jornada || 0;
            if (jA !== jB) return jA - jB;
            
            const catOrder = { "Primera": 1, "Tercera": 2, "Senior": 3, "Liga Profesional": 4 };
            const catA = catOrder[a.categoria || "Primera"] || 99;
            const catB = catOrder[b.categoria || "Primera"] || 99;
            if (catA !== catB) return catA - catB;

            return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        });

        let html = '';
        partidosGlobal = [];
        let algunCerrado = false;
        let jornadaActual = null;
        let categoriaActual = null;
        const ahora = Date.now();

        // Verificar estado global de cierre de fecha
        let fechaCerradaGlobal = false;
        let ignorarCierreHorario = false;
        try {
            const estadoDoc = await db.collection('config').doc(configDocId('estado')).get();
            if (estadoDoc.exists && estadoDoc.data().fechaCerrada) {
                fechaCerradaGlobal = true;
            }
            if (estadoDoc.exists && estadoDoc.data().ignorarCierreHorario) {
                ignorarCierreHorario = true;
                window._ignorarCierreHorario = true;
            } else {
                window._ignorarCierreHorario = false;
            }
        } catch (e) { console.error("Error al leer estado global:", e); }

        partidosArray.forEach(partido => {
            partidosGlobal.push(partido);
            
            const dateObj = new Date(partido.fecha);
            const fechaPartido = dateObj.getTime();
            const diaStr = dateObj.toLocaleDateString('es-AR', { dateStyle: 'short' });
            const horaStr = dateObj.toLocaleTimeString('es-AR', { timeStyle: 'short' });

            if (partido.jornada !== jornadaActual) {
                jornadaActual = partido.jornada;
                html += `<div class="fecha-header">🏆 JORNADA ${jornadaActual || '?'}</div>`;
                categoriaActual = null; // Reiniciar categoría al cambiar la jornada
            }

            const cat = partido.categoria || "Primera";
            if (cat !== categoriaActual) {
                categoriaActual = cat;
                html += `<h2 class="categoria-title">${categoriaActual}</h2>`;
            }

            const imgLocal = getEscudo(partido.local);
            const imgVisitante = getEscudo(partido.visitante);
            
            // Auto-cerrar por timestamp salvo que la ventana de carga manual esté activa
            let cerrado = fechaCerradaGlobal || partido.cerrado || (fechaPartido < ahora && !ignorarCierreHorario);
            if (cerrado) algunCerrado = true;
            const disabledAttr = cerrado ? 'disabled' : '';
            
            // Etiqueta visual para partido doble
            const esDoble = (partido.local === "Independiente (América)" || partido.visitante === "Independiente (América)");
            const badgeDoble = esDoble ? '<span style="background: #ef4444; color: white; padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.7rem; font-weight: bold; margin-left: 0.5rem; letter-spacing: 0.5px; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);">🔥 x2 PUNTOS</span>' : '';

            html += `
                <div class="partido-item ${cerrado ? 'partido-cerrado' : ''}" data-id="${partido.id}">
                    <div class="partido-hora">📅 ${diaStr} - ⏰ ${horaStr} ${badgeDoble} ${cerrado ? '<span class="badge-cerrado">CERRADO</span>' : ''}</div>
                    <div class="partido-content" style="flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px;">
                            <div class="equipo-block local" style="flex:1;">
                                ${imgLocal}
                                <span class="equipo-name" style="text-align: center;">${partido.local}</span>
                            </div>
                            <div class="equipo-block visitante" style="flex:1;">
                                ${imgVisitante}
                                <span class="equipo-name" style="text-align: center;">${partido.visitante}</span>
                            </div>
                        </div>
                        
                        <div class="opciones-resultado">
                            <label class="btn-prediccion">
                                <input type="radio" name="res_${partido.id}" value="local" class="radio-prediccion" ${disabledAttr}>
                                <span>Local</span>
                            </label>
                            <label class="btn-prediccion">
                                <input type="radio" name="res_${partido.id}" value="empate" class="radio-prediccion" ${disabledAttr}>
                                <span>Empate</span>
                            </label>
                            <label class="btn-prediccion">
                                <input type="radio" name="res_${partido.id}" value="visitante" class="radio-prediccion" ${disabledAttr}>
                                <span>Visitante</span>
                            </label>
                        </div>
                    </div>
                </div>
            `;
        });
        listDiv.innerHTML = html;
        
        const btn = document.getElementById('btn-participar');
        if (fechaCerradaGlobal && btn) {
            btn.disabled = true;
            btn.textContent = 'Fecha Cerrada';
            
            // Obtener Top 3 para mostrar en el banner desde el HISTORIAL
            let ganadorHtml = '';
            try {
                const historialSnap = await queryTorneo('historial_fechas').orderBy('fechaCierre', 'desc').limit(1).get();
                if (!historialSnap.empty) {
                    const historialData = historialSnap.docs[0].data();
                    const topUsers = historialData.ranking || [];
                    const tituloFecha = historialData.fecha || "Última Fecha";
                    
                    if (topUsers.length > 0) {
                        const top1 = topUsers[0];
                        ganadorHtml = `<div style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                            <div style="font-size: 1.3em; margin-bottom: 5px; color: #eab308;">🏆 <strong>Resultados - ${tituloFecha}:</strong></div>
                            <div style="font-size: 1.5em; font-weight: bold; margin-bottom: 10px;">${top1.nombre} <span style="font-size: 0.8em; color: #ddd;">(${top1.puntos} pts)</span></div>`;
                        
                        if (topUsers.length > 1) {
                             ganadorHtml += `<div style="font-size: 0.9em; color: #ccc;">
                                🥈 2º: ${topUsers[1].nombre} (${topUsers[1].puntos} pts)
                                ${topUsers[2] ? `&nbsp;&nbsp;|&nbsp;&nbsp;🥉 3º: ${topUsers[2].nombre} (${topUsers[2].puntos} pts)` : ''}
                             </div>`;
                        }
                        ganadorHtml += `</div>`;
                    }
                } else {
                    // Manejo del caso donde aún no hay historial (primer uso)
                    ganadorHtml = `<div style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                        <div style="font-size: 1em; color: #ccc;">Los resultados finales estarán disponibles pronto.</div>
                    </div>`;
                }
            } catch(e) { console.error("Error cargando historial de ganadores", e); }

            listDiv.insertAdjacentHTML('afterbegin', `<div style="background:var(--accent); color:white; padding:15px; border-radius:8px; text-align:center; font-weight:bold; margin-bottom:15px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                La fecha ha sido cerrada. Ya no se aceptan predicciones.
                ${ganadorHtml}
            </div>`);
        } else if (algunCerrado) {
             // Si todos están cerrados, o para mantener simple, no deshabilitamos el botón, pero sí se envían los que se pueden.
        }
    } catch (error) {
        console.error("[Firebase Error] Error cargando partidos:", error);
        listDiv.innerHTML = `
            <div style="text-align:center; padding: 2rem 1rem; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--card-border);">
                <p style="color: var(--danger); font-size: 1.1rem; margin-bottom: 1rem;">No se pudieron cargar los partidos.</p>
                <button onclick="cargarPartidosUsuario()" class="btn-primary" style="padding: 0.5rem 1rem;">🔄 Reintentar</button>
            </div>
        `;
    }
}

async function enviarPredicciones() {
    const nombre = document.getElementById('nombre').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();

    if (!nombre || !whatsapp) {
        alert("Por favor completá tu nombre y WhatsApp.");
        return;
    }

    // 🛑 VALIDACIÓN: verificar si la fecha global está cerrada (segunda línea de defensa)
    try {
        const estadoDoc = await db.collection('config').doc(configDocId('estado')).get();
        if (estadoDoc.exists && estadoDoc.data().fechaCerrada) {
            alert("La fecha ya fue cerrada. No se aceptan más predicciones.");
            return;
        }
    } catch(err) {
        console.error("Error al verificar estado global:", err);
    }

    // 🔄 VALIDACIÓN DE USUARIO EXISTENTE POR WHATSAPP
    // Buscamos en todos los usuarios (sin filtro de torneo) para evitar duplicados
    // aunque el campo "torneo" no esté bien seteado en registros viejos
    let usuarioExistenteId = null;
    let usuarioExistentePuntos = 0;
    let usuarioExistentePago = false;
    try {
        // Primero buscar con filtro de torneo (lo más común)
        let existUser = await queryTorneo('usuarios').where('whatsapp', '==', whatsapp).get();

        // Si no encuentra nada, buscar sin filtro de torneo (usuarios viejos sin campo torneo)
        if (existUser.empty) {
            existUser = await db.collection('usuarios').where('whatsapp', '==', whatsapp).get();
        }

        if (!existUser.empty) {
            const docExistente = existUser.docs[0];
            const dataExistente = docExistente.data();

            // Verificar si ya tiene predicciones en esta fecha
            const predExistentes = await queryTorneo('predicciones')
                .where('userId', '==', docExistente.id).get();
            if (!predExistentes.empty) {
                alert("Ya enviaste tus predicciones para esta fecha. ¡Buena suerte!");
                return;
            }

            // Lo reconocemos: guardamos su id y puntos para no pisarlos
            usuarioExistenteId = docExistente.id;
            usuarioExistentePuntos = dataExistente.puntos || 0;
            usuarioExistentePago = dataExistente.pagoConfirmado || false;

            // Si el usuario no tiene torneo seteado, lo actualizamos
            if (!dataExistente.torneo) {
                await db.collection('usuarios').doc(docExistente.id).update({ torneo: torneoActual });
            }
        }
    } catch(err) {
        console.error("Error al validar WhatsApp:", err);
    }

    const items = document.querySelectorAll('.partido-item');
    const predicciones = [];
    let incompletos = false;

    items.forEach(item => {
        const pId = item.getAttribute('data-id');
        const pInfo = partidosGlobal.find(p => p.id === pId);
        if (!pInfo) return;

        // Validación Anti-Trampa: respeta el flag de ventana de carga manual
        const ahora = Date.now();
        const fechaPartido = new Date(pInfo.fecha).getTime();
        const isClosed = pInfo.cerrado || (fechaPartido < ahora && !window._ignorarCierreHorario);
        
        if (isClosed) return; // Se descarta cualquier input inyectado si ya está cerrado

        const radioChecked = item.querySelector(`input[name="res_${pId}"]:checked`);
        if (!radioChecked) {
            incompletos = true;
        } else {
            predicciones.push({
                partidoId: pId,
                resultado: radioChecked.value
            });
        }
    });

    if (incompletos) {
        alert("Completá todos los resultados antes de participar.");
        return;
    }

    // Obtener prediccion gol y validar si aplica
    let prediccionGolValor = null;
    const golContainer = document.getElementById('gol-fecha-container');
    if (golContainer && golContainer.style.display !== 'none' && golContainer.dataset.cerrado !== "true") {
        const golRadios = document.getElementsByName('prediccion-gol');
        let respondido = false;
        for (const radio of golRadios) {
            if (radio.checked) {
                prediccionGolValor = (radio.value === 'si');
                respondido = true;
            }
        }
        if (!respondido) {
            alert("Debes responder si el jugador de la fecha hace gol o no.");
            return;
        }
    }

    const btn = document.getElementById('btn-participar');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {

        // 1. Guardar o actualizar usuario
        let userId;
        if (usuarioExistenteId) {
            // Usuario de fecha anterior — actualizamos nombre y gol, conservamos puntos y pago
            userId = usuarioExistenteId;
            await db.collection('usuarios').doc(userId).update({
                nombre: nombre,
                prediccionGol: prediccionGolValor,
                jugadorGol: document.getElementById('gol-fecha-jugador').innerText,
                fechaUltimaParticipacion: firebase.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            // Usuario nuevo
            const userRef = await db.collection('usuarios').add({
                nombre: nombre,
                whatsapp: whatsapp,
                activo: true,
                pagoConfirmado: false,
                intentoPago: false,
                puntos: 0,
                torneo: torneoActual,
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                prediccionGol: prediccionGolValor,
                jugadorGol: document.getElementById('gol-fecha-jugador').innerText
            });
            userId = userRef.id;
        }

        // 2. Guardar predicciones en batch
        const batch = db.batch();
        predicciones.forEach(pred => {
            const docRef = db.collection('predicciones').doc();
            batch.set(docRef, {
                userId: userId,
                torneo: torneoActual,
                ...pred
            });
        });

        await batch.commit();

        alert("¡Tus predicciones fueron enviadas con éxito! Buena suerte.");
        document.getElementById('registro-form').reset();
        
        // Limpiar inputs
        document.querySelectorAll('.input-goles').forEach(inp => inp.value = "");
        
        // Limpiar radios de partidos y gol
        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);

    } catch (error) {
        console.error("Error guardando:", error);
        alert("Hubo un error al guardar. Intentá de nuevo.");
    } finally {
        btn.disabled = false;
        btn.textContent = '¡Confirmar Predicciones!';
    }
}

async function cargarRanking() {
    const rankingDiv = document.getElementById('ranking-list');
    try {
        // 🔧 FIX: leemos TODA la colección sin filtro de torneo para no
        // excluir usuarios viejos que no tienen el campo "torneo" guardado.
        // Luego filtramos en JS: incluimos los que no tienen campo torneo
        // (registros históricos) y los que tienen torneo == 'pueblo'.
        const snapshot = await db.collection('usuarios').get();

        if (snapshot.empty) {
            rankingDiv.innerHTML = '<p>Aún no hay participantes.</p>';
            return;
        }

        let users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Incluir usuarios sin campo torneo (viejos) O con torneo == 'pueblo'
            if (!data.torneo || data.torneo === 'pueblo') {
                users.push(data);
            }
        });

        // 🔑 FILTRAR: aparecen en el ranking si tienen pago confirmado O puntos acumulados
        const usersConPago = users.filter(u => u.pagoConfirmado === true || (u.puntos || 0) > 0);

        if (usersConPago.length === 0) {
            rankingDiv.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1rem;">Aún no hay participantes con pago confirmado.</p>';
            return;
        }

        // Ordenar por puntos
        usersConPago.sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

        let html = '';
        let pos = 1;
        usersConPago.forEach(user => {
            let topClass = '';
            if (pos === 1) topClass = 'ranking-top1';
            else if (pos === 2) topClass = 'ranking-top2';
            else if (pos === 3) topClass = 'ranking-top3';

            const posEmoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;

            html += `
                <div class="ranking-item ${topClass}">
                    <div class="ranking-pos">${posEmoji}</div>
                    <div class="ranking-name">${user.nombre}${user.pagoConfirmado ? ' <span style="color:var(--primary); font-size:0.75rem;" title="Pago confirmado">✔</span>' : ''}</div>
                    <div class="ranking-pts">
                        <span class="pts-number">${user.puntos || 0}</span>
                        <span class="pts-exactos">pts</span>
                    </div>
                </div>
            `;
            pos++;
        });
        rankingDiv.innerHTML = html;
    } catch (error) {
        console.error("Error cargando ranking:", error);
        rankingDiv.innerHTML = '<p>Error al cargar el ranking.</p>';
    }
}


async function cargarConfigGolUser() {
    try {
        const doc = await db.collection('config').doc(configDocId('gol')).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.jugador) {
                const container = document.getElementById('gol-fecha-container');
                container.style.display = 'block';
                document.getElementById('gol-fecha-jugador').innerText = data.jugador;

                if (data.cerrado) {
                    document.getElementById('gol-fecha-jugador').innerText += " (CERRADA)";
                    document.getElementById('gol-fecha-jugador').style.color = "var(--accent)";
                    const radios = document.getElementsByName('prediccion-gol');
                    radios.forEach(r => {
                        r.disabled = true;
                        // Estilo visual apagado
                        r.parentElement.querySelector('.radio-btn').style.opacity = "0.5";
                        r.parentElement.querySelector('.radio-btn').style.cursor = "not-allowed";
                    });
                    container.dataset.cerrado = "true";
                }
            }
        }
    } catch(e) {
        console.error("Error config gol:", e);
    }
}

// ==========================================
// ========== LÓGICA DEL ADMIN ============
// ==========================================

// ─────────────────────────────────────────────────────────────────
//  HELPERS DE FORMULARIO — selects dinámicos por torneo
// ─────────────────────────────────────────────────────────────────

/**
 * Construye las <option> de un select de equipo a partir de equiposPorCategoria.
 * Si el torneo tiene múltiples categorías, genera <optgroup> por categoría.
 * Si tiene una sola (ej: "General"), las inyecta planas.
 * @param {HTMLSelectElement} selectEl
 * @param {string} torneoId
 * @param {string} [valorSeleccionado] - para preseleccionar al editar
 */
function poblarSelectEquipos(selectEl, torneoId, valorSeleccionado = '') {
    const equiposPorCat = getEquiposPorCategoria(torneoId);
    const categorias = Object.keys(equiposPorCat);
    const usarGrupos = categorias.length > 1;

    // Limpiar opciones previas (conservar el placeholder vacío)
    selectEl.innerHTML = '<option value="">— Seleccioná un equipo —</option>';

    categorias.forEach(cat => {
        const equipos = equiposPorCat[cat];
        if (!equipos || equipos.length === 0) return;

        if (usarGrupos) {
            const group = document.createElement('optgroup');
            group.label = cat;
            equipos.forEach(eq => {
                const opt = document.createElement('option');
                opt.value = eq;
                opt.textContent = eq;
                if (eq === valorSeleccionado) opt.selected = true;
                group.appendChild(opt);
            });
            selectEl.appendChild(group);
        } else {
            // Lista plana (ej: Mundial → General)
            equipos.forEach(eq => {
                const opt = document.createElement('option');
                opt.value = eq;
                opt.textContent = eq;
                if (eq === valorSeleccionado) opt.selected = true;
                selectEl.appendChild(opt);
            });
        }
    });
}

/**
 * Construye las <option> del select de categorías.
 * @param {HTMLSelectElement} selectEl
 * @param {string} torneoId
 * @param {string} [valorSeleccionado]
 */
function poblarSelectCategorias(selectEl, torneoId, valorSeleccionado = '') {
    const categorias = getCategorias(torneoId);
    selectEl.innerHTML = '';
    categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === valorSeleccionado) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

/**
 * Actualiza todo el formulario de partido según el torneo activo:
 *   - Muestra/oculta el campo de categoría
 *   - Repuebla selects de equipos y categorías
 * Llamar al cargar el admin y al cambiar de torneo.
 * @param {string} torneoId
 * @param {object} [valoresEdicion] - { local, visitante, categoria } al editar un partido
 */
function poblarFormularioTorneo(torneoId, valoresEdicion = {}) {
    const grupoCat = document.getElementById('grupo-categoria');
    const selectCat = document.getElementById('partido-categoria');
    const selectLocal = document.getElementById('partido-local');
    const selectVisitante = document.getElementById('partido-visitante');

    if (!selectLocal || !selectVisitante) return; // No estamos en el admin

    const tieneCats = torneoTieneCategorias(torneoId);

    // Mostrar/ocultar categorías
    if (grupoCat) grupoCat.style.display = tieneCats ? 'block' : 'none';

    // Poblar categorías (solo si aplica)
    if (tieneCats && selectCat) {
        poblarSelectCategorias(selectCat, torneoId, valoresEdicion.categoria || '');
    }

    // Poblar equipos en ambos selects
    poblarSelectEquipos(selectLocal, torneoId, valoresEdicion.local || '');
    poblarSelectEquipos(selectVisitante, torneoId, valoresEdicion.visitante || '');

    // Attach validación anti-mismo-equipo (una sola vez)
    if (!selectLocal.dataset.validacionAdjuntada) {
        const validarMismoEquipo = () => {
            const errorEl = document.getElementById('error-mismo-equipo');
            const btnSubmit = document.getElementById('btn-submit-partido');
            const mismoEquipo = selectLocal.value &&
                                selectVisitante.value &&
                                selectLocal.value === selectVisitante.value;

            if (errorEl) errorEl.style.display = mismoEquipo ? 'block' : 'none';
            if (btnSubmit) btnSubmit.disabled = mismoEquipo;
        };
        selectLocal.addEventListener('change', validarMismoEquipo);
        selectVisitante.addEventListener('change', validarMismoEquipo);
        selectLocal.dataset.validacionAdjuntada = 'true';
    }
}

async function initAdminApp() {
    // Inicializar formulario dinámico según el torneo activo al cargar
    poblarFormularioTorneo(torneoActual);

    document.getElementById('crear-partido-form').addEventListener('submit', guardarPartido);
    document.getElementById('btn-calcular-puntos').addEventListener('click', calcularPuntos);
    
    const btnReset = document.getElementById('btn-resetear-fecha');
    if (btnReset) btnReset.addEventListener('click', resetearFecha);

    const btnAvanzar = document.getElementById('btn-avanzar-fecha');
    if (btnAvanzar) btnAvanzar.addEventListener('click', avanzarFecha);
    
    const btnCerrarFecha = document.getElementById('btn-cerrar-fecha');
    if (btnCerrarFecha) {
        btnCerrarFecha.addEventListener('click', toggleCierreGlobal);
        // Cargar estado inicial del botón y banner de desactualización
        db.collection('config').doc(configDocId('estado')).get().then(doc => {
            if (doc.exists && doc.data().fechaCerrada) {
                btnCerrarFecha.textContent = "Abrir Fecha Global";
            }
            const banner = document.getElementById('ranking-desactualizado-banner');
            if (banner && doc.exists && doc.data().resultadosDesactualizados) {
                banner.style.display = 'block';
            }
        }).catch(err => console.error(err));
    }
    
    const configForm = document.getElementById('config-gol-form');
    if (configForm) configForm.addEventListener('submit', guardarConfigGol);

    const btnOverride = document.getElementById('btn-override-horario');
    if (btnOverride) {
        db.collection('config').doc(configDocId('estado')).get().then(doc => {
            const activo = doc.exists && doc.data().ignorarCierreHorario;
            actualizarBtnOverride(activo);
        }).catch(() => {});
        btnOverride.addEventListener('click', toggleOverrideHorario);
    }

    await cargarPartidosAdmin();
    await cargarUsuariosAdmin();
    await cargarConfigGolAdmin();
    await cargarPronosticosAdmin();
    await cargarHistorialFechas();
}

async function guardarPartido(e) {
    e.preventDefault();
    const id = document.getElementById('partido-edit-id').value;
    const jornadaRaw = document.getElementById('partido-jornada').value.trim();
    const jornada = isNaN(jornadaRaw) ? jornadaRaw : parseInt(jornadaRaw);
    const local = document.getElementById('partido-local').value;
    const visitante = document.getElementById('partido-visitante').value;
    const fecha = document.getElementById('partido-fecha').value;

    // Categoría: solo aplica si el torneo la usa; si no, guardamos "General"
    const tieneCats = torneoTieneCategorias(torneoActual);
    const selectCat = document.getElementById('partido-categoria');
    const categoria = tieneCats && selectCat ? selectCat.value : 'General';

    // Validación final anti-mismo-equipo (doble seguridad)
    if (local && visitante && local === visitante) {
        const errorEl = document.getElementById('error-mismo-equipo');
        if (errorEl) errorEl.style.display = 'block';
        alert('El local y el visitante no pueden ser el mismo equipo.');
        return;
    }

    if (!local || !visitante) {
        alert('Seleccioná ambos equipos antes de guardar.');
        return;
    }

    try {
        if (id) {
            await db.collection('partidos').doc(id).update({
                jornada, categoria, local, visitante, fecha
            });
            alert('Partido actualizado exitosamente');
        } else {
            await db.collection('partidos').add({
                jornada, categoria, local, visitante, fecha, cerrado: false, torneo: torneoActual
            });
            alert('Partido creado exitosamente');
        }
        
        cancelarEdicion();
        cargarPartidosAdmin();
    } catch (error) {
        console.error("Error:", error);
        alert('Error al guardar partido');
    }
}

window.editarPartido = function(id) {
    const p = partidosGlobalAdmin.find(x => x.id === id);
    if (!p) return;

    // Pre-poblar el formulario con los valores del partido a editar
    // (incluyendo preselección de los selects de equipos y categoría)
    poblarFormularioTorneo(torneoActual, {
        local: p.local,
        visitante: p.visitante,
        categoria: p.categoria || '',
    });

    document.getElementById('partido-edit-id').value = p.id;
    document.getElementById('partido-jornada').value = p.jornada || '';
    document.getElementById('partido-fecha').value = p.fecha;
    document.getElementById('titulo-form-partido').innerText = 'Editar Partido';
    document.getElementById('btn-cancel-edit').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.cancelarEdicion = function() {
    document.getElementById('crear-partido-form').reset();
    document.getElementById('partido-edit-id').value = '';
    document.getElementById('titulo-form-partido').innerText = 'Crear Partido';
    document.getElementById('btn-cancel-edit').style.display = 'none';
    // Limpiar error de mismo equipo
    const errorEl = document.getElementById('error-mismo-equipo');
    if (errorEl) errorEl.style.display = 'none';
    // Re-poblar selects de equipos sin preselección (formulario limpio)
    poblarFormularioTorneo(torneoActual);
}

window.eliminarPartido = async function(id) {
    if (!confirm("¿Seguro querés eliminar este partido? También se borrarán sus resultados reales.")) return;
    try {
        await db.collection('partidos').doc(id).delete();
        // Borrar resultados asociados
        const resSnapshot = await db.collection('resultados').where('partidoId', '==', id).get();
        const batch = db.batch();
        resSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        alert("Partido eliminado.");
        cargarPartidosAdmin();
    } catch (err) {
        console.error("Error:", err);
        alert("Error al eliminar.");
    }
}

async function cargarPartidosAdmin() {
    const listDiv = document.getElementById('admin-partidos-list');
    listDiv.innerHTML = '<p>Cargando...</p>';

    try {
        const snapshot = await queryTorneo('partidos').get();
        if (snapshot.empty) {
            listDiv.innerHTML = '<p>No hay partidos.</p>';
            return;
        }

        let partidosArray = [];
        snapshot.forEach(doc => partidosArray.push({ id: doc.id, ...doc.data() }));
        
        partidosArray.sort((a, b) => {
            const jA = a.jornada || 0;
            const jB = b.jornada || 0;
            if (jA !== jB) return jA - jB;
            
            const catOrder = { "Primera": 1, "Tercera": 2, "Senior": 3, "Liga Profesional": 4 };
            const catA = catOrder[a.categoria || "Primera"] || 99;
            const catB = catOrder[b.categoria || "Primera"] || 99;
            if (catA !== catB) return catA - catB;

            return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        });

        const resSnapshot = await queryTorneo('resultados').get();
        const resultadosMap = {};
        resSnapshot.forEach(doc => {
            resultadosMap[doc.data().partidoId] = doc.data();
        });

        let html = '';
        partidosGlobalAdmin = partidosArray;
        const ahora = Date.now();

        partidosArray.forEach(p => {
            const pId = p.id;
            
            const res = resultadosMap[pId] || { resultado: '' };
            const isAutoClosed = new Date(p.fecha).getTime() < ahora;
            const esDoble = (p.local === "Independiente (América)" || p.visitante === "Independiente (América)");
            const badgeDoble = esDoble ? '<span style="color:#ef4444; font-size:0.8rem; font-weight:bold; margin-left: 5px;">🔥 x2</span>' : '';

            html += `
                <div class="partido-item">
                    <div class="partido-equipos" style="flex-direction:column; align-items:start;">
                        <div style="width:100%; display:flex; justify-content:space-between; align-items: center;">
                            <span><strong style="color:var(--primary)">J${p.jornada || '?'} (${p.categoria || "Primera"})</strong> | <strong>${p.local} vs ${p.visitante}</strong> ${badgeDoble} ${isAutoClosed ? '<span style="color:var(--accent); font-size:0.8rem; margin-left:5px;">(CERRADO POR FECHA)</span>' : ''}</span>
                            <label style="font-size:0.8rem; cursor:pointer;">
                                <input type="checkbox" onchange="togglePartidoCerrado('${pId}', this.checked)" ${p.cerrado ? 'checked' : ''}> Forzar Cierre
                            </label>
                        </div>
                        <div style="margin-top: 5px;">
                            <button onclick="editarPartido('${pId}')" style="background: none; border: none; color: var(--secondary); cursor: pointer; text-decoration: underline; padding: 0; font-size: 0.8rem; margin-right: 10px;">Editar</button>
                            <button onclick="eliminarPartido('${pId}')" style="background: none; border: none; color: var(--accent); cursor: pointer; text-decoration: underline; padding: 0; font-size: 0.8rem;">Eliminar</button>
                        </div>
                    </div>
                    <div class="partido-inputs" style="margin-top:10px; width: 100%; display: flex; align-items: center;">
                        <select id="res-${pId}" style="padding: 0.5rem; flex: 1; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-color);">
                            <option value="">Seleccionar resultado real...</option>
                            <option value="local" ${res.resultado === 'local' ? 'selected' : ''}>Gana Local</option>
                            <option value="empate" ${res.resultado === 'empate' ? 'selected' : ''}>Empate</option>
                            <option value="visitante" ${res.resultado === 'visitante' ? 'selected' : ''}>Gana Visitante</option>
                        </select>
                        <button onclick="guardarResultado('${pId}')" class="btn-secondary" style="padding:0.5rem; margin-left:10px;">Guardar</button>
                    </div>
                </div>
            `;
        });
        listDiv.innerHTML = html;
    } catch (error) {
        console.error("Error:", error);
    }
}

window.togglePartidoCerrado = async function(partidoId, isClosed) {
    try {
        await db.collection('partidos').doc(partidoId).update({ cerrado: isClosed });
    } catch (err) {
        console.error("Error al cerrar partido:", err);
    }
}

// Global function para el botón "Guardar" en la lista de admin
window.guardarResultado = async function(partidoId) {
    const r = document.getElementById(`res-${partidoId}`).value;

    if (!r) {
        alert("Seleccioná un resultado");
        return;
    }

    // Si ya se calcularon puntos, advertir que el ranking quedará desactualizado
    try {
        const estadoDoc = await db.collection('config').doc(configDocId('estado')).get();
        if (estadoDoc.exists && estadoDoc.data().fechaCalculada === true) {
            const continuar = confirm("⚠️ Ya se calcularon los puntos para esta fecha.\n\nSi modificás este resultado, el ranking quedará DESACTUALIZADO hasta que vuelvas a calcular puntos.\n\n¿Querés guardar de todas formas?");
            if (!continuar) return;
            // Marcar que los resultados fueron modificados post-cálculo
            await db.collection('config').doc(configDocId('estado')).set({ resultadosDesactualizados: true }, { merge: true });
        }
    } catch(e) { console.error(e); }

    try {
        // Buscar si ya existe resultado para actualizarlo
        const snapshot = await db.collection('resultados').where('partidoId', '==', partidoId).where('torneo', '==', torneoActual).get();
        if (!snapshot.empty) {
            await db.collection('resultados').doc(snapshot.docs[0].id).update({
                resultado: r
            });
        } else {
            await db.collection('resultados').add({
                partidoId: partidoId,
                resultado: r,
                torneo: torneoActual
            });
        }
        alert("Resultado guardado");
        cargarPartidosAdmin(); // recargar
    } catch (error) {
        console.error("Error:", error);
        alert("Error al guardar");
    }
}

// Guardar todos los resultados en una sola acción batch
window.guardarTodosLosResultados = async function() {
    const btn = document.getElementById('btn-guardar-todos');
    if (btn && btn._guardando) return;
    if (btn) { btn._guardando = true; btn.disabled = true; btn.textContent = "Guardando..."; }

    try {
        if (partidosGlobalAdmin.length === 0) {
            alert("No hay partidos cargados.");
            return;
        }

        const updates = [];
        const sinResultado = [];

        for (const p of partidosGlobalAdmin) {
            const select = document.getElementById(`res-${p.id}`);
            if (!select || !select.value) {
                sinResultado.push(`${p.local} vs ${p.visitante}`);
                continue;
            }
            updates.push({ partidoId: p.id, resultado: select.value });
        }

        if (sinResultado.length > 0) {
            const continuar = confirm(`⚠️ Los siguientes partidos no tienen resultado seleccionado:\n\n${sinResultado.join('\n')}\n\n¿Guardar solo los que tienen resultado cargado?`);
            if (!continuar) return;
        }

        if (updates.length === 0) {
            alert("No hay resultados para guardar.");
            return;
        }

        // Advertir si los puntos ya fueron calculados (ranking quedará desactualizado)
        try {
            const estadoDoc = await db.collection('config').doc(configDocId('estado')).get();
            if (estadoDoc.exists && estadoDoc.data().fechaCalculada === true) {
                const continuar = confirm("⚠️ Ya se calcularon los puntos para esta fecha.\n\nSi guardás nuevos resultados, el ranking quedará DESACTUALIZADO hasta que vuelvas a calcular puntos.\n\n¿Querés continuar?");
                if (!continuar) return;
                await db.collection('config').doc(configDocId('estado')).set({ resultadosDesactualizados: true }, { merge: true });
            }
        } catch(e) { console.error(e); }

        // Obtener resultados existentes para saber qué actualizar vs crear
        const resSnapshot = await queryTorneo('resultados').get();
        const existentesMap = {};
        resSnapshot.forEach(doc => { existentesMap[doc.data().partidoId] = doc.id; });

        const batch = db.batch();
        updates.forEach(({ partidoId, resultado }) => {
            if (existentesMap[partidoId]) {
                batch.update(db.collection('resultados').doc(existentesMap[partidoId]), { resultado });
            } else {
                batch.set(db.collection('resultados').doc(), { partidoId, resultado, torneo: torneoActual });
            }
        });

        await batch.commit();
        alert(`✅ ${updates.length} resultado(s) guardados correctamente.`);
        cargarPartidosAdmin();
    } catch (err) {
        console.error("Error al guardar todos los resultados:", err);
        alert("Error al guardar los resultados. Intentá de nuevo.");
    } finally {
        if (btn) { btn._guardando = false; btn.disabled = false; btn.textContent = "💾 Guardar Todos los Resultados"; }
    }
}

async function cargarUsuariosAdmin() {
    const tbody = document.getElementById('usuarios-tbody');
    try {
        const snapshot = await queryTorneo('usuarios').get();
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5">No hay usuarios.</td></tr>';
            return;
        }

        let users = [];
        snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

        users.sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

        let html = '';
        users.forEach(u => {
            const uId = u.id;
            const intentoBadge = u.intentoPago
                ? '<span style="background:rgba(251,191,36,0.2); color:#fbbf24; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;">💸 Avisó</span>'
                : '<span style="color:var(--text-muted); font-size:0.75rem;">—</span>';

            const pagoBtn = u.pagoConfirmado
                ? `<button onclick="togglePago('${uId}', false)" style="background:linear-gradient(135deg,#22c55e,#15803d); color:white; border:none; border-radius:8px; padding:5px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; letter-spacing:0.5px;">✔ Pagado</button>`
                : `<button onclick="togglePago('${uId}', true)" style="background:rgba(255,255,255,0.07); color:var(--text-muted); border:1px solid var(--card-border); border-radius:8px; padding:5px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; letter-spacing:0.5px;">Marcar Pagado</button>`;

            html += `
                <tr id="row-${uId}" data-nombre="${u.nombre.toLowerCase()}" data-pago="${u.pagoConfirmado ? 'true' : 'false'}" data-aviso="${u.intentoPago ? 'true' : 'false'}">
                    <td>${u.nombre}</td>
                    <td><a href="https://wa.me/${u.whatsapp}" target="_blank">${u.whatsapp}</a></td>
                    <td>${u.puntos || 0}</td>
                    <td style="text-align:center;">${intentoBadge}</td>
                    <td style="text-align:center;">${pagoBtn}</td>
                    <td style="text-align:center;">
                        <button onclick="resetearPrediccionesUsuario('${uId}', '${u.nombre.replace(/'/g, "\\'")}')"
                            title="Borrar predicciones de esta fecha"
                            style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:5px 8px; font-size:0.8rem; cursor:pointer;">
                            🗑️
                        </button>
                    </td>
                    <td style="text-align:center;">
                        <button onclick="abrirModalUsuario('${uId}', '${u.nombre.replace(/'/g, "\\'")}', '${u.whatsapp}')"
                            title="Editar o fusionar"
                            style="background:rgba(99,102,241,0.15); color:#818cf8; border:1px solid rgba(99,102,241,0.3); border-radius:8px; padding:5px 8px; font-size:0.8rem; cursor:pointer;">
                            ✏️
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        // Mostrar contador inicial
        const contador = document.getElementById('filtro-contador');
        if (contador) contador.textContent = `${users.length} participantes en total`;
    } catch (error) {
        console.error("Error:", error);
    }
}

// ─── FILTRO EN TIEMPO REAL DE PARTICIPANTES ───────────────────────────────────
// ─── EDITAR / FUSIONAR USUARIO ────────────────────────────────────────────────
let _todosLosUsuarios = []; // cache para el selector de fusión

window.abrirModalUsuario = function(userId, nombre, whatsapp) {
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-nombre').value = nombre;
    document.getElementById('edit-whatsapp').value = whatsapp;
    document.getElementById('fusion-principal').textContent = `${nombre} (${whatsapp})`;
    mostrarEditar();
    const modal = document.getElementById('modal-usuario');
    modal.style.display = 'flex';
};

window.cerrarModalUsuario = function() {
    document.getElementById('modal-usuario').style.display = 'none';
};

window.mostrarEditar = function() {
    document.getElementById('modal-editar').style.display = 'block';
    document.getElementById('modal-fusionar').style.display = 'none';
};

window.mostrarFusion = async function() {
    document.getElementById('modal-editar').style.display = 'none';
    document.getElementById('modal-fusionar').style.display = 'block';

    const principalId = document.getElementById('edit-user-id').value;
    const select = document.getElementById('fusion-duplicado');
    select.innerHTML = '<option value="">— Cargando... —</option>';

    try {
        const snap = await queryTorneo('usuarios').get();
        _todosLosUsuarios = [];
        snap.forEach(d => { if (d.id !== principalId) _todosLosUsuarios.push({ id: d.id, ...d.data() }); });
        _todosLosUsuarios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

        select.innerHTML = '<option value="">— Seleccioná el duplicado —</option>';
        _todosLosUsuarios.forEach(u => {
            select.innerHTML += `<option value="${u.id}">${u.nombre} (${u.whatsapp}) — ${u.puntos || 0} pts</option>`;
        });
        select.onchange = mostrarPreviewFusion;
    } catch (err) {
        select.innerHTML = '<option value="">Error al cargar usuarios</option>';
    }
};

window.mostrarPreviewFusion = function() {
    const dupId = document.getElementById('fusion-duplicado').value;
    const preview = document.getElementById('fusion-preview');
    if (!dupId) { preview.style.display = 'none'; return; }

    const dup = _todosLosUsuarios.find(u => u.id === dupId);
    const principalNombre = document.getElementById('edit-nombre').value;
    const principalPts = 0; // se muestra después

    if (dup) {
        preview.style.display = 'block';
        preview.innerHTML = `
            ✅ <strong>${principalNombre}</strong> va a absorber a <strong>${dup.nombre}</strong>.<br>
            Sus predicciones de esta fecha se van a transferir al principal.<br>
            Los puntos del duplicado (${dup.puntos || 0} pts) se sumarán si el principal tiene menos.<br>
            El duplicado será eliminado.
        `;
    }
};

window.guardarEdicionUsuario = async function() {
    const userId = document.getElementById('edit-user-id').value;
    const nuevoNombre = document.getElementById('edit-nombre').value.trim();
    const nuevoWhatsapp = document.getElementById('edit-whatsapp').value.trim();

    if (!nuevoNombre || !nuevoWhatsapp) {
        alert('Completá nombre y WhatsApp.');
        return;
    }

    try {
        // Verificar que el nuevo WhatsApp no esté en uso por otro usuario
        const existente = await queryTorneo('usuarios').where('whatsapp', '==', nuevoWhatsapp).get();
        const conflicto = existente.docs.find(d => d.id !== userId);
        if (conflicto) {
            if (!confirm(`⚠️ El WhatsApp ${nuevoWhatsapp} ya pertenece a ${conflicto.data().nombre}.\n\n¿Querés fusionar ambos en lugar de editar? Cerrá este diálogo y usá el botón "Fusionar".`)) return;
            return;
        }

        await db.collection('usuarios').doc(userId).update({
            nombre: nuevoNombre,
            whatsapp: nuevoWhatsapp,
        });

        cerrarModalUsuario();
        await cargarUsuariosAdmin();
        alert(`✅ Datos de ${nuevoNombre} actualizados correctamente.`);
    } catch (err) {
        console.error(err);
        alert('Error al guardar. Intentá de nuevo.');
    }
};

window.ejecutarFusion = async function() {
    const principalId = document.getElementById('edit-user-id').value;
    const dupId = document.getElementById('fusion-duplicado').value;
    const dup = _todosLosUsuarios.find(u => u.id === dupId);
    const principalNombre = document.getElementById('edit-nombre').value;

    if (!dupId || !dup) { alert('Seleccioná el duplicado primero.'); return; }

    if (!confirm(`¿Fusionar?\n\n✅ Principal: ${principalNombre}\n🗑️ Duplicado a eliminar: ${dup.nombre} (${dup.whatsapp})\n\nEsta acción no se puede deshacer.`)) return;

    try {
        // 1. Obtener predicciones del duplicado
        const predsDup = await queryTorneo('predicciones').where('userId', '==', dupId).get();
        // 2. Obtener predicciones actuales del principal para no duplicar por partido
        const predsPrincipal = await queryTorneo('predicciones').where('userId', '==', principalId).get();
        const partidosYaCargados = new Set();
        predsPrincipal.forEach(d => partidosYaCargados.add(d.data().partidoId));

        const batch = db.batch();

        // 3. Transferir predicciones del duplicado que no existan en el principal
        predsDup.forEach(d => {
            const pred = d.data();
            if (!partidosYaCargados.has(pred.partidoId)) {
                // Crear nueva predicción con userId del principal
                const nuevaRef = db.collection('predicciones').doc();
                batch.set(nuevaRef, { ...pred, userId: principalId });
            }
            // Borrar la del duplicado
            batch.delete(d.ref);
        });

        // 4. Obtener datos actuales del principal para comparar puntos
        const principalDoc = await db.collection('usuarios').doc(principalId).get();
        const principalData = principalDoc.data();
        const puntosFinales = Math.max(principalData.puntos || 0, dup.puntos || 0);
        const historicosFinales = Math.max(principalData.puntosHistoricos || 0, dup.puntosHistoricos || 0);

        // 5. Actualizar principal con el mejor dato de pago, puntos y gol
        const prediccionGolFinal = (principalData.prediccionGol !== null && principalData.prediccionGol !== undefined)
            ? principalData.prediccionGol
            : (dup.prediccionGol !== null && dup.prediccionGol !== undefined ? dup.prediccionGol : null);
        const jugadorGolFinal = principalData.jugadorGol || dup.jugadorGol || '';

        batch.update(db.collection('usuarios').doc(principalId), {
            puntos: puntosFinales,
            puntosHistoricos: historicosFinales,
            pagoConfirmado: principalData.pagoConfirmado || dup.pagoConfirmado || false,
            prediccionGol: prediccionGolFinal,
            jugadorGol: jugadorGolFinal,
        });

        // 6. Borrar duplicado
        batch.delete(db.collection('usuarios').doc(dupId));

        await batch.commit();

        cerrarModalUsuario();
        await cargarUsuariosAdmin();
        alert(`✅ Fusión completada. ${dup.nombre} fue absorbido por ${principalNombre}.`);
    } catch (err) {
        console.error(err);
        alert('Error al fusionar. Revisá la consola.');
    }
};

// Cerrar modal al hacer click fuera
document.addEventListener('click', function(e) {
    const modal = document.getElementById('modal-usuario');
    if (modal && e.target === modal) cerrarModalUsuario();
});

// ─── RESETEAR PREDICCIONES DE UN USUARIO ─────────────────────────────────────
window.resetearPrediccionesUsuario = async function(userId, nombre) {
    if (!confirm(`¿Borrar las predicciones de ${nombre} para esta fecha?\n\nVa a poder volver a cargarlas desde el sitio.`)) return;

    try {
        const preds = await queryTorneo('predicciones').where('userId', '==', userId).get();
        if (preds.empty) {
            alert(`${nombre} no tiene predicciones cargadas en esta fecha.`);
            return;
        }
        const batch = db.batch();
        preds.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert(`✅ Predicciones de ${nombre} eliminadas. Ya puede volver a cargar sus pronósticos.`);
    } catch (err) {
        console.error(err);
        alert('Error al eliminar las predicciones. Intentá de nuevo.');
    }
};

window.filtrarUsuarios = function() {
    const texto = (document.getElementById('filtro-usuario')?.value || '').toLowerCase();
    const filtroPago = document.getElementById('filtro-pago')?.value || 'todos';
    const filas = document.querySelectorAll('#usuarios-tbody tr[data-nombre]');
    let visibles = 0;

    filas.forEach(fila => {
        const nombre = (fila.dataset.nombre || '').toLowerCase();
        const pago = fila.dataset.pago;
        const aviso = fila.dataset.aviso;

        const coincideTexto = !texto || nombre.includes(texto);
        const coincidePago =
            filtroPago === 'todos' ||
            (filtroPago === 'pagados' && pago === 'true') ||
            (filtroPago === 'sin-pago' && pago === 'false') ||
            (filtroPago === 'avisaron' && aviso === 'true');

        const mostrar = coincideTexto && coincidePago;
        fila.style.display = mostrar ? '' : 'none';
        if (mostrar) visibles++;
    });

    const contador = document.getElementById('filtro-contador');
    if (contador) contador.textContent = `Mostrando ${visibles} de ${filas.length} participantes`;
};

window.togglePago = async function(userId, isChecked) {
    try {
        await db.collection('usuarios').doc(userId).update({
            pagoConfirmado: isChecked
        });
        // Refrescar tabla para mostrar estado actualizado
        await cargarUsuariosAdmin();
    } catch (error) {
        console.error("Error:", error);
        alert("Error actualizando pago");
    }
}

// Función interna de cálculo de puntos (usada por btn y por cierre de fecha)
async function _calcularPuntosInterno(btn = null) {
    // 1. Obtener resultados reales
    const resSnapshot = await queryTorneo('resultados').get();
    const resultadosMap = {};
    resSnapshot.forEach(doc => {
        const data = doc.data();
        resultadosMap[data.partidoId] = data;
    });

    if (Object.keys(resultadosMap).length === 0) {
        throw new Error("No hay resultados reales cargados. Cargá los resultados antes de calcular puntos.");
    }

    // 2. Obtener usuarios
    const usersSnapshot = await queryTorneo('usuarios').get();
    
    // 3. Obtener todas las predicciones
    const predSnapshot = await queryTorneo('predicciones').get();
    const prediccionesPorUser = {};
    predSnapshot.forEach(doc => {
        const p = doc.data();
        if (!prediccionesPorUser[p.userId]) {
            prediccionesPorUser[p.userId] = [];
        }
        prediccionesPorUser[p.userId].push(p);
    });

    // 3.2 Obtener info de los partidos para puntos dobles
    const partSnapshot = await queryTorneo('partidos').get();
    const partidosDataMap = {};
    partSnapshot.forEach(doc => {
        partidosDataMap[doc.id] = doc.data();
    });

    // 3.5 Obtener config de gol
    let jugadorGolHizo = null;
    const configDoc = await db.collection('config').doc(configDocId('gol')).get();
    if (configDoc.exists) {
        const val = configDoc.data().hizoGol;
        if (val === 'si') jugadorGolHizo = true;
        if (val === 'no') jugadorGolHizo = false;
    }

    // 4. RESETEAR todos los puntos a 0 primero (cálculo determinístico, sin acumulación)
    //    Luego calcular desde cero para cada usuario.
    const batch = db.batch();
    const totalUsers = usersSnapshot.size;
    let index = 0;

    for (const userDoc of usersSnapshot.docs) {
        index++;
        if (btn && index % 10 === 0) {
            btn.textContent = `Calculando progreso... (${Math.round((index/totalUsers)*100)}%)`;
            await new Promise(r => setTimeout(r, 0)); // Permitir render
        }
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Usuarios sin pago y sin puntos previos: quedan en 0
        // Usuarios con puntos acumulados: se les calculan igualmente
        if (!userData.pagoConfirmado && (userData.puntos || 0) === 0) {
            batch.update(db.collection('usuarios').doc(userId), { puntos: 0 });
            continue;
        }

        // Partir SIEMPRE desde 0 — nunca sumar sobre valor previo
        const predicciones = prediccionesPorUser[userId] || [];
        let totalPuntos = 0;

        predicciones.forEach(pred => {
            const resReal = resultadosMap[pred.partidoId];
            const infoPartido = partidosDataMap[pred.partidoId];

            if (resReal && resReal.resultado && infoPartido) {
                if (pred.resultado === resReal.resultado) {
                    const esDoble = infoPartido.local === "Independiente (América)" || infoPartido.visitante === "Independiente (América)";
                    totalPuntos += esDoble ? 6 : 3;
                }
            }
        });

        // Sumar punto por predicción de gol
        if (jugadorGolHizo !== null && userData.prediccionGol !== undefined && userData.prediccionGol !== null) {
            if (userData.prediccionGol === jugadorGolHizo) {
                totalPuntos += 1;
            }
        }

        batch.update(db.collection('usuarios').doc(userId), { 
            puntos: (userData.puntosHistoricos || 0) + totalPuntos,
            puntosEsteFecha: totalPuntos
        });
    }

    if (btn) btn.textContent = "Guardando en Firebase... (Puede demorar)";

    await batch.commit();

    // Marcar fecha como calculada y limpiar flag de desactualización
    await db.collection('config').doc(configDocId('estado')).set({
        fechaCalculada: true,
        resultadosDesactualizados: false
    }, { merge: true });

    // Ocultar banner de desactualización si está visible
    const banner = document.getElementById('ranking-desactualizado-banner');
    if (banner) banner.style.display = 'none';
}

async function calcularPuntos() {
    const btn = document.getElementById('btn-calcular-puntos');
    if (btn._calculando) return; // Evitar doble click / race condition
    btn._calculando = true;
    btn.disabled = true;
    btn.textContent = "Calculando progreso... (0%)";

    try {
        // Validación de Admin
        if (!firebase.auth().currentUser) {
            throw new Error("No estás autenticado como admin.");
        }
        // Verificar si ya fue calculado y confirmar recálculo
        const estadoDoc = await db.collection('config').doc(configDocId('estado')).get();
        if (estadoDoc.exists && estadoDoc.data().fechaCalculada === true) {
            const recalcular = confirm("⚠️ Los puntos ya fueron calculados para esta fecha.\n\n¿Querés RECALCULAR de todas formas?\n\nSe volverán a calcular los puntos de esta fecha y se sumarán a los históricos de cada jugador.");
            if (!recalcular) return;
        }

        await _calcularPuntosInterno();
        alert("¡Puntos calculados y ranking actualizado correctamente!");
        cargarUsuariosAdmin();
    } catch (error) {
        console.error("Error:", error);
        alert(error.message || "Error al calcular puntos.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Calcular Puntos de Todos";
        btn._calculando = false;
    }
}

async function cargarConfigGolAdmin() {
    try {
        const doc = await db.collection('config').doc(configDocId('gol')).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.jugador) document.getElementById('config-jugador').value = data.jugador;
            if (data.hizoGol) document.getElementById('config-hizo-gol').value = data.hizoGol;
            if (data.cerrado) document.getElementById('config-cerrado').checked = true;
        }
    } catch(e) {}
}

async function guardarConfigGol(e) {
    e.preventDefault();
    const jugador = document.getElementById('config-jugador').value.trim();
    const hizoGol = document.getElementById('config-hizo-gol').value;
    const cerrado = document.getElementById('config-cerrado').checked;

    try {
        await db.collection('config').doc(configDocId('gol')).set({
            jugador: jugador,
            hizoGol: hizoGol,
            cerrado: cerrado
        }, { merge: true });
        alert('Configuración guardada.');
    } catch(err) {
        console.error(err);
        alert('Error al guardar configuración.');
    }
}

// ─── AVANZAR A NUEVA FECHA (conserva usuarios y puntos) ──────────────────────
window.avanzarFecha = async function() {
    if (!confirm(
        '➡️ ¿Avanzar a la nueva fecha?\n\n' +
        'Esto va a:\n' +
        '✅ Conservar todos los usuarios y sus puntos acumulados\n' +
        '✅ Conservar el estado de pagos\n' +
        '🗑️ Borrar los partidos de esta fecha\n' +
        '🗑️ Borrar las predicciones de esta fecha\n\n' +
        '¿Confirmás?'
    )) return;

    const btn = document.getElementById('btn-avanzar-fecha');
    if (btn) { btn.disabled = true; btn.textContent = 'Avanzando...'; }

    try {
        // Traer partidos, predicciones Y resultados (NO usuarios)
        const [partidosSnap, prediccionesSnap, resultadosSnap] = await Promise.all([
            queryTorneo('partidos').get(),
            queryTorneo('predicciones').get(),
            queryTorneo('resultados').get(),
        ]);

        const docsABorrar = [...partidosSnap.docs, ...prediccionesSnap.docs, ...resultadosSnap.docs];

        // Borrar en batches de 490
        const batches = [];
        let currentBatch = db.batch();
        let opsCounter = 0;

        docsABorrar.forEach(doc => {
            currentBatch.delete(doc.ref);
            opsCounter++;
            if (opsCounter === 490) {
                batches.push(currentBatch.commit());
                currentBatch = db.batch();
                opsCounter = 0;
            }
        });
        if (opsCounter > 0) batches.push(currentBatch.commit());
        await Promise.all(batches);

        // Conservar puntos acumulados y resetear pago para la nueva fecha
        const usuariosSnap = await queryTorneo('usuarios').get();
        const userBatches = [];
        let ub = db.batch();
        let uOps = 0;
        usuariosSnap.forEach(doc => {
            const data = doc.data();
            ub.update(doc.ref, { 
                prediccionGol: null, 
                jugadorGol: '',
                puntosHistoricos: data.puntos || 0,  // guardar acumulado
                puntosEsteFecha: 0,
                pagoConfirmado: false,  // resetear pago para nueva fecha
            });
            uOps++;
            if (uOps === 490) {
                userBatches.push(ub.commit());
                ub = db.batch();
                uOps = 0;
            }
        });
        if (uOps > 0) userBatches.push(ub.commit());
        await Promise.all(userBatches);

        // Avanzar número de fecha y abrir nueva
        const estadoDoc = await db.collection('config').doc(configDocId('estado')).get();
        const numeroFechaActual = (estadoDoc.exists && estadoDoc.data().numeroFecha) || 1;

        await db.collection('config').doc(configDocId('estado')).set({
            numeroFecha: numeroFechaActual + 1,
            fechaCerrada: false,
            ignorarCierreHorario: false,
            resultadosDesactualizados: false,
            puntosCalculados: false,
        }, { merge: true });

        // Resetear config gol de la fecha
        await db.collection('config').doc(configDocId('gol')).set({
            jugador: '',
            hizoGol: 'pendiente',
            cerrado: false,
        }, { merge: true });

        alert(
            `✅ ¡Fecha ${numeroFechaActual} cerrada!\n\n` +
            `Ahora estás en la Fecha ${numeroFechaActual + 1}.\n` +
            `Los usuarios y sus puntos acumulados están intactos.\n\n` +
            `Próximo paso: cargá los nuevos partidos.`
        );

        // Recargar admin
        cargarPartidosAdmin();
        cargarUsuariosAdmin();
        cargarConfigGolAdmin();

        const btnCerrar = document.getElementById('btn-cerrar-fecha');
        if (btnCerrar) btnCerrar.textContent = 'Cerrar Fecha Global';

    } catch (err) {
        console.error('Error al avanzar fecha:', err);
        alert('Ocurrió un error al avanzar la fecha. Revisá la consola.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '➡️ Avanzar a Nueva Fecha'; }
    }
};

// ─── VENTANA DE CARGA MANUAL ──────────────────────────────────────────────────
// ─── RANKING DE ESTA FECHA ────────────────────────────────────────────────────
window.fijarPuntosHistoricos = async function() {
    if (!confirm(
        '📌 ¿Fijar puntos actuales como históricos?\n\n' +
        'Esto toma los puntos que tiene cada jugador AHORA y los guarda como base histórica.\n' +
        'El próximo cálculo va a sumar los puntos de la fecha actual a esa base.\n\n' +
        'Usá esto solo si olvidaste presionar "Avanzar Fecha" antes de cargar la nueva fecha.\n\n' +
        '¿Confirmás?'
    )) return;

    try {
        const snap = await queryTorneo('usuarios').get();
        const batch = db.batch();
        snap.forEach(doc => {
            const puntos = doc.data().puntos || 0;
            batch.update(doc.ref, {
                puntosHistoricos: puntos,
                puntosEsteFecha: 0,
            });
        });
        await batch.commit();
        alert('✅ Puntos históricos actualizados. Ahora podés calcular los puntos de esta fecha y se van a sumar correctamente.');
    } catch (err) {
        console.error(err);
        alert('Error al fijar los históricos. Revisá la consola.');
    }
};

window.toggleRankingFecha = async function() {
    const container = document.getElementById('ranking-fecha-container');
    const btn = document.getElementById('btn-ranking-fecha');
    if (!container) return;

    if (container.style.display !== 'none') {
        container.style.display = 'none';
        btn.textContent = '🏆 Ver Tabla de Esta Fecha';
        return;
    }

    btn.textContent = 'Cargando...';
    container.style.display = 'block';
    container.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">Cargando...</p>';

    try {
        const snap = await queryTorneo('usuarios').get();
        let usuarios = [];
        snap.forEach(d => {
            const u = d.data();
            const ptsFecha = u.puntosEsteFecha || 0;
            if (u.pagoConfirmado || (u.puntos || 0) > 0) {
                usuarios.push({ nombre: u.nombre, ptsFecha, puntos: u.puntos || 0 });
            }
        });

        usuarios.sort((a, b) => b.ptsFecha - a.ptsFecha);

        if (usuarios.length === 0) {
            container.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">Sin datos aún. Calculá los puntos primero.</p>';
            btn.textContent = '🏆 Ver Tabla de Esta Fecha';
            return;
        }

        const medallas = ['🥇','🥈','🥉'];
        let html = '<table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-top:0.5rem;">';
        html += '<thead><tr style="border-bottom:1px solid var(--card-border); color:var(--text-muted);">';
        html += '<th style="text-align:left; padding:5px 4px;">#</th>';
        html += '<th style="text-align:left; padding:5px 4px;">Nombre</th>';
        html += '<th style="text-align:right; padding:5px 4px;">Esta fecha</th>';
        html += '<th style="text-align:right; padding:5px 4px;">Total</th>';
        html += '</tr></thead><tbody>';

        usuarios.forEach((u, i) => {
            const pos = medallas[i] || `${i + 1}`;
            const esLider = i === 0;
            html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05); ${esLider ? 'background:rgba(251,191,36,0.07);' : ''}">
                <td style="padding:6px 4px;">${pos}</td>
                <td style="padding:6px 4px; font-weight:${esLider ? '700' : '400'};">${u.nombre}</td>
                <td style="padding:6px 4px; text-align:right; font-weight:700; color:var(--primary);">${u.ptsFecha} pts</td>
                <td style="padding:6px 4px; text-align:right; color:var(--text-muted);">${u.puntos}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
        btn.textContent = '🏆 Ocultar Tabla de Esta Fecha';

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:var(--danger); font-size:0.85rem;">Error al cargar.</p>';
        btn.textContent = '🏆 Ver Tabla de Esta Fecha';
    }
};

function actualizarBtnOverride(activo) {
    const btn = document.getElementById('btn-override-horario');
    if (!btn) return;
    if (activo) {
        btn.textContent = '🟢 Ventana de Carga ACTIVA — Desactivar';
        btn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
    } else {
        btn.textContent = '🕐 Activar Ventana de Carga Manual';
        btn.style.background = 'linear-gradient(135deg, #7c3aed, #4f46e5)';
    }
}

window.toggleOverrideHorario = async function() {
    const btn = document.getElementById('btn-override-horario');
    if (btn) btn.disabled = true;
    try {
        const doc = await db.collection('config').doc(configDocId('estado')).get();
        const estaActivo = doc.exists && doc.data().ignorarCierreHorario;
        const nuevoEstado = !estaActivo;

        const msg = nuevoEstado
            ? '¿Activar la ventana de carga manual?\n\nLos partidos ya jugados quedarán desbloqueados.\n\n⚠️ Acordate de DESACTIVAR esto cuando terminen.'
            : '¿Cerrar la ventana de carga manual?\n\nLos partidos volverán a cerrarse automáticamente por horario.';

        if (!confirm(msg)) return;

        await db.collection('config').doc(configDocId('estado')).set(
            { ignorarCierreHorario: nuevoEstado }, { merge: true }
        );
        actualizarBtnOverride(nuevoEstado);
        alert(nuevoEstado
            ? '✅ Ventana activada. Avisale a la gente del físico que cargue ahora.'
            : '🔒 Ventana cerrada. Los partidos volvieron a su estado normal.'
        );
    } catch (err) {
        console.error(err);
        alert('Error al cambiar el estado de la ventana de carga.');
    } finally {
        if (btn) btn.disabled = false;
    }
};

// ─── PRONÓSTICOS POR PARTIDO ──────────────────────────────────────────────────
async function cargarPronosticosAdmin() {
    const div = document.getElementById('pronosticos-list');
    if (!div) return;
    div.innerHTML = '<p>Cargando...</p>';

    try {
        const [partSnap, resSnap, predSnap, userSnap, golSnap] = await Promise.all([
            queryTorneo('partidos').get(),
            queryTorneo('resultados').get(),
            queryTorneo('predicciones').get(),
            queryTorneo('usuarios').get(),
            db.collection('config').doc(configDocId('gol')).get(),
        ]);

        const resultadoReal = {};
        resSnap.forEach(d => { resultadoReal[d.data().partidoId] = d.data().resultado; });

        const usuarios = {};
        userSnap.forEach(d => { usuarios[d.id] = d.data(); });

        const predPorPartido = {};
        predSnap.forEach(d => {
            const p = d.data();
            if (!predPorPartido[p.partidoId]) predPorPartido[p.partidoId] = [];
            predPorPartido[p.partidoId].push(p);
        });

        // Gol de la fecha
        const golConfig = golSnap.exists ? golSnap.data() : {};
        const jugadorNombre = golConfig.jugador || '—';
        const hizoGol = golConfig.hizoGol || 'pendiente';
        const golSi = [], golNo = [], golSinVoto = [];
        userSnap.forEach(d => {
            const u = d.data();
            if (u.prediccionGol === true) golSi.push(u.nombre);
            else if (u.prediccionGol === false) golNo.push(u.nombre);
            else if (u.pagoConfirmado === true) golSinVoto.push(u.nombre);
        });

        let partidos = [];
        partSnap.forEach(d => partidos.push({ id: d.id, ...d.data() }));
        partidos.sort((a, b) => {
            const jA = a.jornada || 0, jB = b.jornada || 0;
            if (jA !== jB) return jA - jB;
            const catOrder = { "Primera": 1, "Tercera": 2, "Senior": 3, "Liga Profesional": 4 };
            return (catOrder[a.categoria] || 99) - (catOrder[b.categoria] || 99);
        });

        if (partidos.length === 0) {
            div.innerHTML = '<p>No hay partidos cargados.</p>';
            return;
        }

        const etiqueta = { local: 'Local', empate: 'Empate', visitante: 'Visitante' };
        let html = '';

        partidos.forEach(p => {
            const res = resultadoReal[p.id];
            const preds = predPorPartido[p.id] || [];
            const esDoble = p.local === "Independiente (América)" || p.visitante === "Independiente (América)";
            const pts = esDoble ? 6 : 3;
            const resLabel = res
                ? `<strong style="color:var(--primary)">${etiqueta[res]}</strong> <span style="font-size:0.75rem; color:var(--text-muted)">(${pts} pts)</span>`
                : '<span style="color:var(--text-muted)">Sin resultado aún</span>';

            const votos = { local: [], empate: [], visitante: [] };
            preds.forEach(pr => {
                const nombre = usuarios[pr.userId]?.nombre || 'Desconocido';
                if (votos[pr.resultado]) votos[pr.resultado].push(nombre);
            });

            const apostaron = new Set(preds.map(pr => pr.userId));
            const noApostaron = Object.entries(usuarios)
                .filter(([id, u]) => !apostaron.has(id) && u.pagoConfirmado === true)
                .map(([, u]) => u.nombre);

            html += `
                <div style="border:1px solid var(--card-border); border-radius:10px; padding:1rem; margin-bottom:1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:0.75rem;">
                        <div>
                            <span style="font-size:0.75rem; color:var(--text-muted);">J${p.jornada || '?'} · ${p.categoria || 'General'}</span>
                            <div style="font-weight:700; font-size:0.95rem;">${p.local} <span style="color:var(--text-muted)">vs</span> ${p.visitante}${esDoble ? ' <span style="color:#ef4444; font-size:0.75rem;">x2</span>' : ''}</div>
                        </div>
                        <div style="font-size:0.85rem;">Resultado: ${resLabel}</div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; font-size:0.82rem;">
                        ${['local','empate','visitante'].map(op => {
                            const lista = votos[op];
                            const esGanador = res === op;
                            const bg = esGanador ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)';
                            const border = esGanador ? '1px solid #22c55e' : '1px solid var(--card-border)';
                            return `
                                <div style="background:${bg}; border:${border}; border-radius:8px; padding:0.5rem;">
                                    <div style="font-weight:700; margin-bottom:4px; color:${esGanador ? '#22c55e' : 'var(--text-main)'};">
                                        ${etiqueta[op]} ${esGanador ? '✓' : ''} <span style="font-weight:400; color:var(--text-muted);">(${lista.length})</span>
                                    </div>
                                    ${lista.length === 0
                                        ? '<div style="color:var(--text-muted); font-style:italic; font-size:0.78rem;">Nadie</div>'
                                        : lista.map(n => `<div style="padding:1px 0;">• ${n}</div>`).join('')
                                    }
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${noApostaron.length > 0 ? `<div style="margin-top:0.6rem; font-size:0.75rem; color:var(--text-muted);">Sin predicción: ${noApostaron.join(', ')}</div>` : ''}
                </div>
            `;
        });

        // GOL DE LA FECHA
        const golColorSi = hizoGol === 'si' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)';
        const golBorderSi = hizoGol === 'si' ? '1px solid #22c55e' : '1px solid var(--card-border)';
        const golColorNo = hizoGol === 'no' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)';
        const golBorderNo = hizoGol === 'no' ? '1px solid #22c55e' : '1px solid var(--card-border)';

        html += `
            <div style="border:1px solid var(--card-border); border-radius:10px; padding:1rem; margin-bottom:1rem; background:rgba(251,191,36,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:0.75rem;">
                    <div>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Gol de la Fecha</span>
                        <div style="font-weight:700; font-size:0.95rem;">${jugadorNombre}</div>
                    </div>
                    <div style="font-size:0.85rem;">
                        ${hizoGol === 'si' ? '<strong style="color:#22c55e">Anotó ✓</strong> <span style="font-size:0.75rem; color:var(--text-muted)">(1 pt)</span>'
                        : hizoGol === 'no' ? '<strong style="color:#ef4444">No anotó</strong>'
                        : '<span style="color:var(--text-muted)">Pendiente</span>'}
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.82rem;">
                    <div style="background:${golColorSi}; border:${golBorderSi}; border-radius:8px; padding:0.5rem;">
                        <div style="font-weight:700; margin-bottom:4px; color:${hizoGol === 'si' ? '#22c55e' : 'var(--text-main)'};">
                            Sí anota ${hizoGol === 'si' ? '✓' : ''} <span style="font-weight:400; color:var(--text-muted);">(${golSi.length})</span>
                        </div>
                        ${golSi.length === 0 ? '<div style="color:var(--text-muted); font-style:italic; font-size:0.78rem;">Nadie</div>' : golSi.map(n => `<div style="padding:1px 0;">• ${n}</div>`).join('')}
                    </div>
                    <div style="background:${golColorNo}; border:${golBorderNo}; border-radius:8px; padding:0.5rem;">
                        <div style="font-weight:700; margin-bottom:4px; color:${hizoGol === 'no' ? '#22c55e' : 'var(--text-main)'};">
                            No anota ${hizoGol === 'no' ? '✓' : ''} <span style="font-weight:400; color:var(--text-muted);">(${golNo.length})</span>
                        </div>
                        ${golNo.length === 0 ? '<div style="color:var(--text-muted); font-style:italic; font-size:0.78rem;">Nadie</div>' : golNo.map(n => `<div style="padding:1px 0;">• ${n}</div>`).join('')}
                    </div>
                </div>
                ${golSinVoto.length > 0 ? `<div style="margin-top:0.6rem; font-size:0.75rem; color:var(--text-muted);">Sin voto: ${golSinVoto.join(', ')}</div>` : ''}
            </div>
        `;

        div.innerHTML = html;

    } catch (err) {
        console.error('Error cargando pronósticos:', err);
        div.innerHTML = '<p>Error al cargar. Verificá tu conexión.</p>';
    }
}


// ─── HISTORIAL DE PARTICIPACIÓN POR FECHAS ────────────────────────────────────
async function cargarHistorialParticipacion() {
    const div = document.getElementById('historial-participacion-list');
    if (!div) return;
    div.innerHTML = '<p>Cargando...</p>';

    try {
        const histSnap = await db.collection('historial_fechas')
            .where('torneo', '==', torneoActual)
            .orderBy('numeroFecha', 'desc')
            .get();

        if (histSnap.empty) {
            div.innerHTML = '<p style="color:var(--text-muted);">Aún no hay fechas cerradas con historial.</p>';
            return;
        }

        let html = '';
        histSnap.forEach(doc => {
            const data = doc.data();
            const ranking = data.ranking || [];
            const ganador = data.ganador;

            html += `
                <div style="border:1px solid var(--card-border); border-radius:10px; padding:1rem; margin-bottom:1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:6px;">
                        <div style="font-weight:700; font-size:1rem;">📅 ${data.fecha || `Fecha ${data.numeroFecha}`}</div>
                        ${ganador ? `<div style="font-size:0.82rem; background:rgba(251,191,36,0.15); border:1px solid #fbbf24; color:#fbbf24; padding:3px 10px; border-radius:20px;">🥇 ${ganador.nombre} — ${ganador.puntos} pts</div>` : ''}
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:6px;">
                        ${ranking.map((u, i) => `
                            <div style="background:rgba(255,255,255,0.04); border:1px solid var(--card-border); border-radius:8px; padding:0.4rem 0.6rem; font-size:0.82rem; display:flex; justify-content:space-between;">
                                <span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} ${u.nombre}</span>
                                <strong style="color:var(--primary)">${u.puntos} pts</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        div.innerHTML = html;
    } catch (err) {
        console.error('Error cargando historial:', err);
        // Si falla por índice faltante, intentar sin orderBy
        try {
            const histSnap2 = await db.collection('historial_fechas')
                .where('torneo', '==', torneoActual).get();
            if (histSnap2.empty) {
                div.innerHTML = '<p style="color:var(--text-muted);">Aún no hay fechas cerradas con historial.</p>';
                return;
            }
            let fechas = [];
            histSnap2.forEach(d => fechas.push(d.data()));
            fechas.sort((a, b) => (b.numeroFecha || 0) - (a.numeroFecha || 0));

            let html2 = '';
            fechas.forEach(data => {
                const ranking = data.ranking || [];
                const ganador = data.ganador;
                html2 += `
                    <div style="border:1px solid var(--card-border); border-radius:10px; padding:1rem; margin-bottom:1rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:6px;">
                            <div style="font-weight:700; font-size:1rem;">📅 ${data.fecha || `Fecha ${data.numeroFecha}`}</div>
                            ${ganador ? `<div style="font-size:0.82rem; background:rgba(251,191,36,0.15); border:1px solid #fbbf24; color:#fbbf24; padding:3px 10px; border-radius:20px;">🥇 ${ganador.nombre} — ${ganador.puntos} pts</div>` : ''}
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:6px;">
                            ${ranking.map((u, i) => `
                                <div style="background:rgba(255,255,255,0.04); border:1px solid var(--card-border); border-radius:8px; padding:0.4rem 0.6rem; font-size:0.82rem; display:flex; justify-content:space-between;">
                                    <span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} ${u.nombre}</span>
                                    <strong style="color:var(--primary)">${u.puntos} pts</strong>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            div.innerHTML = html2;
        } catch(err2) {
            div.innerHTML = '<p style="color:var(--danger);">Error al cargar historial.</p>';
        }
    }
}

window.resetearFecha = async function() {
    if (!confirm("⚠️ ¿Estás seguro que querés resetear la fecha? Esto eliminará TODOS los participantes, puntos y sus predicciones. Esta acción NO se puede deshacer.")) return;

    try {
        const prediccionesSnap = await queryTorneo('predicciones').get();
        const usuariosSnap = await queryTorneo('usuarios').get();
        
        const allDocs = [...prediccionesSnap.docs, ...usuariosSnap.docs];
        
        if (allDocs.length === 0) {
            alert("No hay datos para resetear.");
            return;
        }

        // --- ACTUALIZAR ESTADO (Avanzar fecha y Abrir nueva) ---
        let numeroFecha = 1;
        try {
            const estadoDoc = await db.collection('config').doc(configDocId('estado')).get();
            if (estadoDoc.exists && estadoDoc.data().numeroFecha) {
                numeroFecha = estadoDoc.data().numeroFecha;
            }
        } catch(e) { console.error(e); }

        await db.collection('config').doc(configDocId('estado')).set({ 
            numeroFecha: numeroFecha + 1,
            fechaCerrada: false
        }, { merge: true });

        // Actualizar botón frontend si existe
        const btnCerrar = document.getElementById('btn-cerrar-fecha');
        if (btnCerrar) btnCerrar.textContent = "Cerrar Fecha Global";

        // --- BORRAR DATOS (RESET) ---
        const batches = [];
        let currentBatch = db.batch();
        let opsCounter = 0;

        allDocs.forEach(doc => {
            currentBatch.delete(doc.ref);
            opsCounter++;

            // El límite de Firestore es de 500 operaciones por batch
            if (opsCounter === 490) {
                batches.push(currentBatch.commit());
                currentBatch = db.batch(); // Iniciar nuevo batch
                opsCounter = 0;
            }
        });

        // Commit del remanente final
        if (opsCounter > 0) {
            batches.push(currentBatch.commit());
        }

        // Esperar a que se procesen todos los batches
        await Promise.all(batches);

        alert("Fecha reseteada con éxito. Todos los participantes han sido eliminados.");
        cargarUsuariosAdmin(); // Recargar tabla
    } catch (err) {
        console.error("Error al resetear fecha:", err);
        alert("Ocurrió un error al intentar resetear la fecha.");
    }
}

window.toggleCierreGlobal = async function() {
    const btn = document.getElementById('btn-cerrar-fecha');
    if (btn) btn.disabled = true;

    try {
        const doc = await db.collection('config').doc(configDocId('estado')).get();
        const estaCerrada = doc.exists && doc.data().fechaCerrada;
        const numeroFecha = doc.exists && doc.data().numeroFecha ? doc.data().numeroFecha : 1;
        
        const nuevoEstado = !estaCerrada;

        // Si vamos a CERRAR, calcular puntos automáticamente solo si aún no se calcularon
        if (nuevoEstado === true) {
            if (!confirm(`¿Seguro que querés CERRAR la fecha?\n\n⚡ Se verificarán y calcularán los puntos antes de cerrar.`)) {
                return;
            }
            if (btn) btn.textContent = "Verificando puntos...";

            const estadoActual = await db.collection('config').doc(configDocId('estado')).get();
            const yaCalculado = estadoActual.exists && estadoActual.data().fechaCalculada === true;

            if (!yaCalculado) {
                if (btn) btn.textContent = "Calculando puntos...";
                await _calcularPuntosInterno();
            }
            // Si ya estaban calculados, no recalcular — el ranking ya es correcto
        } else {
            if (!confirm(`¿Seguro que querés ABRIR la fecha para todos?`)) {
                return;
            }
        }

        if (btn) btn.textContent = nuevoEstado ? "Cerrando..." : "Abriendo...";

        // Guardar historial al cerrar
        if (nuevoEstado === true) {
            const usuariosSnap = await queryTorneo('usuarios').get();
            let usuariosArray = [];
            usuariosSnap.forEach(uDoc => {
                const data = uDoc.data();
                usuariosArray.push({ nombre: data.nombre, puntos: data.puntos || 0 });
            });

            if (usuariosArray.length > 0) {
                usuariosArray.sort((a, b) => b.puntos - a.puntos);
                const historialData = {
                    fecha: `Fecha ${numeroFecha}`,
                    numeroFecha: numeroFecha,
                    fechaCierre: firebase.firestore.FieldValue.serverTimestamp(),
                    ranking: usuariosArray,
                    ganador: usuariosArray[0],
                    torneo: torneoActual
                };
                await db.collection('historial_fechas').doc(`fecha_${torneoActual}_${numeroFecha}`).set(historialData, { merge: true });
            }
        }

        await db.collection('config').doc(configDocId('estado')).set({ fechaCerrada: nuevoEstado }, { merge: true });
        alert(`La fecha ha sido ${nuevoEstado ? 'CERRADA (puntos calculados y ranking actualizado)' : 'ABIERTA'} globalmente.`);
        
        if (btn) btn.textContent = nuevoEstado ? "Abrir Fecha Global" : "Cerrar Fecha Global";

        // Recargar la UI del admin para reflejar estado
        cargarPartidosAdmin();
        cargarUsuariosAdmin();
    } catch (err) {
        console.error(err);
        alert("Error al cambiar estado global.");
        try {
            const doc2 = await db.collection('config').doc(configDocId('estado')).get();
            if (btn) btn.textContent = (doc2.exists && doc2.data().fechaCerrada) ? "Abrir Fecha Global" : "Cerrar Fecha Global";
        } catch(_) {}
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ─── BUSCAR PREDICCIONES POR USUARIO ─────────────────────────────────────────
// ─── DETECTAR USUARIOS DUPLICADOS ────────────────────────────────────────────
window.detectarDuplicados = async function() {
    const div = document.getElementById('duplicados-list');
    div.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted);">Buscando...</p>';

    try {
        // Buscar en TODOS los usuarios sin filtro de torneo para atrapar duplicados cross-torneo
        const snap = await db.collection('usuarios').get();
        
        // Agrupar por WhatsApp
        const porWhatsapp = {};
        snap.forEach(d => {
            const u = { id: d.id, ...d.data() };
            const wa = u.whatsapp || 'sin-numero';
            if (!porWhatsapp[wa]) porWhatsapp[wa] = [];
            porWhatsapp[wa].push(u);
        });

        // Filtrar solo los que tienen más de uno
        const duplicados = Object.entries(porWhatsapp)
            .filter(([, lista]) => lista.length > 1)
            .sort((a, b) => a[0].localeCompare(b[0]));

        if (duplicados.length === 0) {
            div.innerHTML = '<p style="color:#22c55e; font-size:0.88rem;">✅ No se encontraron duplicados.</p>';
            return;
        }

        let html = `<p style="color:var(--danger); font-size:0.85rem; margin-bottom:0.75rem;">⚠️ Se encontraron <strong>${duplicados.length}</strong> WhatsApp con más de un registro:</p>`;

        duplicados.forEach(([wa, lista]) => {
            html += `
                <div style="border:1px solid rgba(239,68,68,0.4); border-radius:10px; padding:1rem; margin-bottom:0.75rem; background:rgba(239,68,68,0.05);">
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">📱 ${wa} — ${lista.length} registros</div>
                    ${lista.map(u => `
                        <div style="display:flex; justify-content:space-between; align-items:center; 
                             background:rgba(255,255,255,0.04); border:1px solid var(--card-border);
                             border-radius:8px; padding:0.5rem 0.75rem; margin-bottom:6px; font-size:0.83rem;">
                            <div>
                                <strong>${u.nombre}</strong>
                                <span style="color:var(--text-muted); margin-left:8px;">
                                    ${u.puntos || 0} pts · ${u.pagoConfirmado ? '✅ Pagó' : '❌ Sin pago'} · torneo: ${u.torneo || 'pueblo'}
                                </span>
                            </div>
                            <button onclick="abrirModalUsuario('${u.id}', '${u.nombre.replace(/'/g, "\\'")}', '${u.whatsapp}')"
                                style="background:rgba(99,102,241,0.2); color:#818cf8; border:1px solid rgba(99,102,241,0.4); 
                                       border-radius:6px; padding:4px 10px; font-size:0.78rem; cursor:pointer; white-space:nowrap;">
                                🔀 Fusionar
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        });

        div.innerHTML = html;

    } catch (err) {
        console.error(err);
        div.innerHTML = '<p style="color:var(--danger);">Error al buscar duplicados.</p>';
    }
};

window.buscarPrediccionesUsuario = async function() {
    const input = document.getElementById('buscar-usuario-input').value.trim().toLowerCase();
    const div = document.getElementById('buscar-usuario-resultados');
    if (!input) { div.innerHTML = '<p style="color:var(--danger);">Ingresá un nombre para buscar.</p>'; return; }

    div.innerHTML = '<p>Buscando...</p>';

    try {
        // Traer usuarios, predicciones y partidos en paralelo
        const [userSnap, predSnap, partSnap, resSnap] = await Promise.all([
            queryTorneo('usuarios').get(),
            queryTorneo('predicciones').get(),
            queryTorneo('partidos').get(),
            queryTorneo('resultados').get(),
        ]);

        // Buscar usuarios que coincidan con el texto
        const usuariosMatch = [];
        userSnap.forEach(d => {
            if (d.data().nombre.toLowerCase().includes(input)) {
                usuariosMatch.push({ id: d.id, ...d.data() });
            }
        });

        if (usuariosMatch.length === 0) {
            div.innerHTML = '<p>No se encontró ningún participante con ese nombre.</p>';
            return;
        }

        // Mapas de lookup
        const partidos = {};
        partSnap.forEach(d => { partidos[d.id] = d.data(); });
        const resultados = {};
        resSnap.forEach(d => { resultados[d.data().partidoId] = d.data().resultado; });

        // Agrupar predicciones por userId
        const predPorUser = {};
        predSnap.forEach(d => {
            const p = { docId: d.id, ...d.data() };
            if (!predPorUser[p.userId]) predPorUser[p.userId] = {};
            // Agrupar por partidoId para detectar duplicados
            if (!predPorUser[p.userId][p.partidoId]) predPorUser[p.userId][p.partidoId] = [];
            predPorUser[p.userId][p.partidoId].push(p);
        });

        const etiqueta = { local: 'Local', empate: 'Empate', visitante: 'Visitante' };

        let html = '';
        usuariosMatch.forEach(u => {
            const porPartido = predPorUser[u.id] || {};
            const tienePreds = Object.keys(porPartido).length > 0;

            html += `
                <div style="border:1px solid var(--card-border); border-radius:10px; padding:1rem; margin-bottom:1rem;">
                    <div style="font-weight:700; font-size:1rem; margin-bottom:0.25rem;">👤 ${u.nombre}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">
                        📱 ${u.whatsapp} · 💰 Pago: ${u.pagoConfirmado ? '✅' : '❌'} · 🏆 Puntos: ${u.puntos || 0}
                        <br><span style="font-size:0.72rem; opacity:0.6;">ID: ${u.id}</span>
                    </div>
            `;

            if (!tienePreds) {
                html += '<p style="color:var(--text-muted); font-size:0.85rem;">Sin predicciones registradas.</p>';
            } else {
                Object.entries(porPartido).forEach(([partidoId, preds]) => {
                    const partido = partidos[partidoId];
                    const resReal = resultados[partidoId];
                    const esDuplicado = preds.length > 1;
                    const esDoble = partido && (partido.local === "Independiente (América)" || partido.visitante === "Independiente (América)");

                    html += `
                        <div style="background:${esDuplicado ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)'}; 
                             border:1px solid ${esDuplicado ? 'var(--danger)' : 'var(--card-border)'}; 
                             border-radius:8px; padding:0.65rem; margin-bottom:0.5rem;">
                            <div style="font-size:0.82rem; font-weight:600; margin-bottom:0.4rem;">
                                ${esDuplicado ? '⚠️ DUPLICADO — ' : ''}
                                ${partido ? `${partido.local} vs ${partido.visitante}${esDoble ? ' 🔥' : ''}` : `Partido ID: ${partidoId}`}
                                ${resReal ? ` · Real: <strong>${etiqueta[resReal]}</strong>` : ''}
                            </div>
                            ${preds.map((pr, i) => {
                                const acerto = resReal && pr.resultado === resReal;
                                return `
                                    <div style="display:flex; justify-content:space-between; align-items:center; 
                                         padding:0.35rem 0.5rem; margin-bottom:3px;
                                         background:${acerto ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.2)'}; 
                                         border-radius:6px; font-size:0.8rem;">
                                        <span>
                                            Pronóstico ${preds.length > 1 ? `#${i+1}` : ''}: 
                                            <strong>${etiqueta[pr.resultado] || pr.resultado}</strong>
                                            ${acerto ? ' ✅' : (resReal ? ' ❌' : '')}
                                        </span>
                                        <button onclick="borrarPrediccion('${pr.docId}', '${u.id}')" 
                                            style="background:var(--danger); color:white; border:none; 
                                                   border-radius:5px; padding:2px 8px; cursor:pointer; font-size:0.75rem;">
                                            Borrar
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                });
            }

            html += '</div>';
        });

        div.innerHTML = html;

    } catch (err) {
        console.error(err);
        div.innerHTML = '<p style="color:var(--danger);">Error al buscar. Revisá la consola.</p>';
    }
};

window.borrarPrediccion = async function(docId, userId) {
    if (!confirm('¿Borrar esta predicción? Esta acción no se puede deshacer.')) return;
    try {
        await db.collection('predicciones').doc(docId).delete();
        alert('✅ Predicción borrada. Recalculá los puntos para actualizar el ranking.');
        // Refrescar la búsqueda
        buscarPrediccionesUsuario();
    } catch (err) {
        console.error(err);
        alert('Error al borrar la predicción.');
    }
};
// ==========================================
// ========== LÓGICA MUNDIAL 2026 ===========
// ==========================================

/**
 * Renderiza el formulario de grupos del Mundial en #mundial-grupos-list.
 * Cada grupo muestra los 4 equipos con bandera circular y selectores 1°/2°.
 */
function renderGruposMundial() {
    const container = document.getElementById('mundial-grupos-list');
    if (!container) return;

    const grupos = getGruposMundial();
    const letras = Object.keys(grupos);

    let html = '';
    letras.forEach(letra => {
        const equipos = grupos[letra];
        html += `
            <div class="grupo-mundial" style="margin-bottom:1.5rem; padding:1rem; border:1px solid var(--card-border); border-radius:12px; background:rgba(255,255,255,0.03);">
                <h3 style="margin:0 0 0.75rem; color:var(--primary); font-size:1rem; letter-spacing:1px;">GRUPO ${letra}</h3>
                <div class="grupo-equipos" style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.75rem;">
                    ${equipos.map(eq => `
                        <div style="display:flex; align-items:center; gap:0.5rem; padding:0.4rem 0.6rem; background:rgba(255,255,255,0.04); border-radius:8px;">
                            <img src="${getBanderaUrl(eq, 32)}" alt="${eq}"
                                style="width:28px; height:20px; object-fit:cover; border-radius:3px; flex-shrink:0;"
                                onerror="this.style.display='none'">
                            <span style="font-size:0.82rem;">${eq}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                    <div>
                        <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:3px;">🥇 1° Clasificado</label>
                        <select id="grupo-${letra}-1" data-grupo="${letra}" data-pos="1"
                            style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid var(--card-border); background:rgba(0,0,0,0.3); color:white; font-size:0.85rem;">
                            <option value="">— Elegí —</option>
                            ${equipos.map(eq => `<option value="${eq}">${eq}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:3px;">🥈 2° Clasificado</label>
                        <select id="grupo-${letra}-2" data-grupo="${letra}" data-pos="2"
                            style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid var(--card-border); background:rgba(0,0,0,0.3); color:white; font-size:0.85rem;">
                            <option value="">— Elegí —</option>
                            ${equipos.map(eq => `<option value="${eq}">${eq}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Validación: 1° y 2° del mismo grupo no pueden ser el mismo equipo
    letras.forEach(letra => {
        const s1 = document.getElementById(`grupo-${letra}-1`);
        const s2 = document.getElementById(`grupo-${letra}-2`);
        const validar = () => {
            if (s1.value && s2.value && s1.value === s2.value) {
                s2.style.borderColor = 'var(--danger)';
            } else {
                s2.style.borderColor = '';
            }
        };
        s1.addEventListener('change', validar);
        s2.addEventListener('change', validar);
    });

    // Botón confirmar
    const btn = document.getElementById('btn-mundial-confirmar');
    if (btn) {
        btn.onclick = enviarPronosticosMundial;
    }

    // Cargar pronósticos previos si el usuario ya votó (por whatsapp en sessionStorage)
    cargarPronosticosPreviosMundial();
}

/**
 * Intenta pre-cargar pronósticos previos del usuario desde Firebase
 * usando el whatsapp guardado en sessionStorage.
 */
async function cargarPronosticosPreviosMundial() {
    const wa = sessionStorage.getItem('mundial_whatsapp');
    if (!wa) return;
    try {
        const snap = await db.collection('pronosticos_grupos')
            .where('torneo', '==', 'mundial')
            .where('whatsapp', '==', wa)
            .limit(1).get();
        if (snap.empty) return;
        const data = snap.docs[0].data();
        const pronosticos = data.grupos || {};
        Object.entries(pronosticos).forEach(([letra, preds]) => {
            const s1 = document.getElementById(`grupo-${letra}-1`);
            const s2 = document.getElementById(`grupo-${letra}-2`);
            if (s1 && preds.primero) s1.value = preds.primero;
            if (s2 && preds.segundo) s2.value = preds.segundo;
        });
        // Pre-llenar nombre
        const nombreInput = document.getElementById('mundial-nombre');
        const waInput = document.getElementById('mundial-whatsapp');
        if (nombreInput && data.nombre) nombreInput.value = data.nombre;
        if (waInput) waInput.value = wa;
    } catch(e) { console.error('Error cargando pronósticos previos:', e); }
}

/**
 * Valida y guarda los pronósticos de grupos en Firebase.
 */
async function enviarPronosticosMundial() {
    const nombre = document.getElementById('mundial-nombre').value.trim();
    const whatsapp = document.getElementById('mundial-whatsapp').value.trim();

    if (!nombre || !whatsapp) {
        alert('Completá tu nombre y WhatsApp antes de confirmar.');
        return;
    }

    const grupos = getGruposMundial();
    const letras = Object.keys(grupos);
    const pronosticos = {};
    let incompletos = [];
    let mismosEquipos = [];

    letras.forEach(letra => {
        const s1 = document.getElementById(`grupo-${letra}-1`);
        const s2 = document.getElementById(`grupo-${letra}-2`);
        const primero = s1 ? s1.value : '';
        const segundo = s2 ? s2.value : '';

        if (!primero || !segundo) {
            incompletos.push(`Grupo ${letra}`);
        } else if (primero === segundo) {
            mismosEquipos.push(`Grupo ${letra}`);
        } else {
            pronosticos[letra] = { primero, segundo };
        }
    });

    if (incompletos.length > 0) {
        alert(`Completá el 1° y 2° de: ${incompletos.join(', ')}`);
        return;
    }
    if (mismosEquipos.length > 0) {
        alert(`El 1° y 2° no pueden ser el mismo equipo en: ${mismosEquipos.join(', ')}`);
        return;
    }

    const btn = document.getElementById('btn-mundial-confirmar');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
        // Buscar si ya existe un pronóstico de este usuario
        const snap = await db.collection('pronosticos_grupos')
            .where('torneo', '==', 'mundial')
            .where('whatsapp', '==', whatsapp)
            .limit(1).get();

        const payload = {
            nombre, whatsapp,
            torneo: 'mundial',
            grupos: pronosticos,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (!snap.empty) {
            await db.collection('pronosticos_grupos').doc(snap.docs[0].id).set(payload, { merge: true });
        } else {
            payload.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
            payload.puntos = 0;
            await db.collection('pronosticos_grupos').add(payload);
        }

        // Guardar whatsapp en session para pre-cargar próxima vez
        sessionStorage.setItem('mundial_whatsapp', whatsapp);

        alert('✅ ¡Pronósticos del Mundial guardados! Podés volver a cambiarlos antes del inicio.');
    } catch(err) {
        console.error('Error guardando pronósticos Mundial:', err);
        alert('Error al guardar. Intentá de nuevo.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🌍 Confirmar Pronósticos'; }
    }
}

/**
 * Carga y muestra el ranking del Mundial desde pronosticos_grupos.
 */
async function cargarRankingMundial() {
    const div = document.getElementById('mundial-ranking-list');
    if (!div) return;
    try {
        const snap = await db.collection('pronosticos_grupos')
            .where('torneo', '==', 'mundial')
            .orderBy('puntos', 'desc')
            .get();

        if (snap.empty) {
            div.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1rem;">Aún no hay participantes.</p>';
            return;
        }

        let users = [];
        snap.forEach(d => users.push(d.data()));
        users.sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

        let html = '';
        users.forEach((u, i) => {
            const pos = i + 1;
            const posEmoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
            const topClass = pos <= 3 ? `ranking-top${pos}` : '';
            html += `
                <div class="ranking-item ${topClass}">
                    <div class="ranking-pos">${posEmoji}</div>
                    <div class="ranking-name">${u.nombre}</div>
                    <div class="ranking-pts">
                        <span class="pts-number">${u.puntos || 0}</span>
                        <span class="pts-exactos">pts</span>
                    </div>
                </div>
            `;
        });
        div.innerHTML = html;
    } catch(err) {
        console.error('Error ranking mundial:', err);
        // Si falla por índice faltante, intentar sin orderBy
        try {
            const snap2 = await db.collection('pronosticos_grupos').where('torneo', '==', 'mundial').get();
            let users = [];
            snap2.forEach(d => users.push(d.data()));
            users.sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
            if (users.length === 0) { div.innerHTML = '<p>Aún no hay participantes.</p>'; return; }
            let html = '';
            users.forEach((u, i) => {
                const pos = i + 1;
                const posEmoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
                html += `<div class="ranking-item"><div class="ranking-pos">${posEmoji}</div><div class="ranking-name">${u.nombre}</div><div class="ranking-pts"><span class="pts-number">${u.puntos || 0}</span><span class="pts-exactos">pts</span></div></div>`;
            });
            div.innerHTML = html;
        } catch(e2) {
            div.innerHTML = '<p>Error al cargar ranking.</p>';
        }
    }
}

// ==========================================
// ===== ADMIN — MUNDIAL 2026 GRUPOS ========
// ==========================================

/**
 * Renderiza en el admin el formulario para cargar quién salió 1° y 2° de cada grupo.
 * Se llama automáticamente al cargar el admin (desde initAdminApp).
 */
function renderAdminGruposMundial() {
    const container = document.getElementById('admin-mundial-grupos');
    if (!container) return;

    const grupos = getGruposMundial();
    const letras = Object.keys(grupos);

    let html = '';
    letras.forEach(letra => {
        const equipos = grupos[letra];
        html += `
            <div style="margin-bottom:1rem; padding:0.75rem; border:1px solid var(--card-border); border-radius:10px;">
                <div style="font-weight:700; color:var(--primary); margin-bottom:0.5rem; font-size:0.9rem;">GRUPO ${letra}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                    <div>
                        <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:3px;">🥇 1° Real</label>
                        <select id="admin-grupo-${letra}-1"
                            style="width:100%; padding:0.45rem; border-radius:7px; border:1px solid var(--card-border); background:rgba(0,0,0,0.3); color:white; font-size:0.82rem;">
                            <option value="">— Sin definir —</option>
                            ${equipos.map(eq => `<option value="${eq}">${eq}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:3px;">🥈 2° Real</label>
                        <select id="admin-grupo-${letra}-2"
                            style="width:100%; padding:0.45rem; border-radius:7px; border:1px solid var(--card-border); background:rgba(0,0,0,0.3); color:white; font-size:0.82rem;">
                            <option value="">— Sin definir —</option>
                            ${equipos.map(eq => `<option value="${eq}">${eq}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Cargar resultados ya guardados
    cargarResultadosGruposAdmin();
}

/**
 * Carga desde Firebase los resultados de grupos ya guardados y los pre-selecciona.
 */
async function cargarResultadosGruposAdmin() {
    try {
        const doc = await db.collection('config').doc('resultados_grupos_mundial').get();
        if (!doc.exists) return;
        const data = doc.data();
        const grupos = getGruposMundial();
        Object.keys(grupos).forEach(letra => {
            const r = data[letra];
            if (!r) return;
            const s1 = document.getElementById(`admin-grupo-${letra}-1`);
            const s2 = document.getElementById(`admin-grupo-${letra}-2`);
            if (s1 && r.primero) s1.value = r.primero;
            if (s2 && r.segundo) s2.value = r.segundo;
        });
    } catch(e) { console.error('Error cargando resultados grupos:', e); }
}

/**
 * Guarda los resultados reales de grupos y recalcula puntos de todos los participantes.
 */
window.guardarResultadosGruposMundial = async function() {
    const grupos = getGruposMundial();
    const letras = Object.keys(grupos);
    const resultados = {};
    let incompletos = [];

    letras.forEach(letra => {
        const s1 = document.getElementById(`admin-grupo-${letra}-1`);
        const s2 = document.getElementById(`admin-grupo-${letra}-2`);
        const primero = s1 ? s1.value : '';
        const segundo = s2 ? s2.value : '';
        if (primero && segundo) {
            resultados[letra] = { primero, segundo };
        } else if (primero || segundo) {
            incompletos.push(`Grupo ${letra} (falta el ${!primero ? '1°' : '2°'})`);
        }
        // Grupos sin nada se ignoran (no están definidos aún)
    });

    if (incompletos.length > 0) {
        const ok = confirm(`Algunos grupos están incompletos:\n${incompletos.join('\n')}\n\n¿Guardar solo los completos y calcular puntos?`);
        if (!ok) return;
    }

    if (Object.keys(resultados).length === 0) {
        alert('No hay resultados completos para guardar.');
        return;
    }

    try {
        // 1. Guardar resultados en config
        await db.collection('config').doc('resultados_grupos_mundial').set(resultados, { merge: true });

        // 2. Calcular puntos para todos los participantes
        const snap = await db.collection('pronosticos_grupos').where('torneo', '==', 'mundial').get();
        if (snap.empty) {
            alert('✅ Resultados guardados. No hay participantes con pronósticos aún.');
            return;
        }

        const batch = db.batch();
        let actualizados = 0;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const pronosticos = data.grupos || {};
            let puntos = 0;

            Object.entries(pronosticos).forEach(([letra, pred]) => {
                const real = resultados[letra];
                if (!real) return; // Grupo sin resultado aún

                // Acertó clasificación 1° (pero no posición exacta)
                if (pred.primero === real.primero) {
                    puntos += 4; // posición exacta
                } else if (pred.primero === real.segundo) {
                    puntos += 1; // clasificó pero posición incorrecta
                }

                // Acertó clasificación 2°
                if (pred.segundo === real.segundo) {
                    puntos += 4; // posición exacta
                } else if (pred.segundo === real.primero) {
                    puntos += 1; // clasificó pero posición incorrecta
                }
            });

            batch.update(docSnap.ref, { puntos });
            actualizados++;
        });

        await batch.commit();
        alert(`✅ Resultados guardados y puntos calculados para ${actualizados} participante(s).`);
    } catch(err) {
        console.error('Error guardando resultados grupos:', err);
        alert('Error al guardar. Revisá la consola.');
    }
};

/**
 * Muestra en el admin todos los pronósticos de grupos de los participantes.
 */
window.verPronosticosMundialAdmin = async function() {
    const div = document.getElementById('admin-mundial-pronosticos');
    div.innerHTML = '<p>Cargando...</p>';

    try {
        const [snapPron, snapRes] = await Promise.all([
            db.collection('pronosticos_grupos').where('torneo', '==', 'mundial').get(),
            db.collection('config').doc('resultados_grupos_mundial').get(),
        ]);

        const resultados = snapRes.exists ? snapRes.data() : {};

        if (snapPron.empty) {
            div.innerHTML = '<p style="color:var(--text-muted);">Nadie cargó pronósticos todavía.</p>';
            return;
        }

        let users = [];
        snapPron.forEach(d => users.push({ id: d.id, ...d.data() }));
        users.sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

        let html = `<p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.75rem;">${users.length} participante(s) con pronósticos cargados.</p>`;

        users.forEach(u => {
            const pronosticos = u.grupos || {};
            const letras = Object.keys(pronosticos).sort();

            html += `
                <div style="border:1px solid var(--card-border); border-radius:10px; padding:0.75rem; margin-bottom:0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <strong style="font-size:0.9rem;">👤 ${u.nombre}</strong>
                        <span style="background:rgba(99,102,241,0.2); color:#818cf8; padding:2px 10px; border-radius:10px; font-size:0.8rem; font-weight:600;">${u.puntos || 0} pts</span>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px,1fr)); gap:5px;">
                        ${letras.map(letra => {
                            const pred = pronosticos[letra];
                            const real = resultados[letra];
                            const ok1 = real && pred.primero === real.primero ? '✅' : real && pred.primero === real.segundo ? '〽️' : real ? '❌' : '';
                            const ok2 = real && pred.segundo === real.segundo ? '✅' : real && pred.segundo === real.primero ? '〽️' : real ? '❌' : '';
                            return `
                                <div style="background:rgba(255,255,255,0.03); border:1px solid var(--card-border); border-radius:7px; padding:5px 8px; font-size:0.75rem;">
                                    <div style="font-weight:700; color:var(--primary); margin-bottom:3px;">Grupo ${letra}</div>
                                    <div>${ok1 || '⏳'} 1°: ${pred.primero}</div>
                                    <div>${ok2 || '⏳'} 2°: ${pred.segundo}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        div.innerHTML = html;
    } catch(err) {
        console.error('Error cargando pronósticos mundial admin:', err);
        div.innerHTML = '<p style="color:var(--danger);">Error al cargar. Revisá la consola.</p>';
    }
};

// Hook para inicializar el admin mundial al cargar
const _initAdminOriginal = window.initAdminApp;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-main')) {
        // Renderizar grupos mundial en el admin
        renderAdminGruposMundial();
    }
});