/**
 * equipos.js — Módulo de configuración de torneos y equipos
 * 
 * Fuente única de verdad para:
 *   - Lista de torneos disponibles
 *   - Equipos por torneo
 *   - Configuración UI por torneo (categorías, etiquetas, etc.)
 * 
 * Para agregar un nuevo torneo: solo modificar TORNEOS_CONFIG.
 * El resto de la app lo detecta automáticamente.
 */

const TORNEOS_CONFIG = {
    pueblo: {
        label: '⚽ Pueblo',
        nombre: 'Prode del Pueblo',
        categorias: ['Primera', 'Tercera', 'Senior'],
        mostrarCategorias: true,
        equiposPorCategoria: {
            Primera: [
                "Fútbol Club Tres Algarrobos",
                "Social (González Moreno)",
                "Gorra de Cuero (Carlos Tejedor)",
                "Independiente (América)",
                "Social (Tres Algarrobos)",
                "Los Once (Colonia Seré)",
                "Barrio Norte",
                "Jorge Newbery (Fortín Olavarría)",
                "Atlético Rivadavia",
                "Racing F.B.C. (Fortín Olavarría)"
            ].sort(),
            Tercera: [
                "Fútbol Club Tres Algarrobos",
                "Social (González Moreno)",
                "Gorra de Cuero (Carlos Tejedor)",
                "Independiente (América)",
                "Social (Tres Algarrobos)",
                "Los Once (Colonia Seré)",
                "Barrio Norte",
                "Jorge Newbery (Fortín Olavarría)",
                "Atlético Rivadavia",
                "Racing F.B.C. (Fortín Olavarría)"
            ].sort(),
            Senior: [
                "Fútbol Club Tres Algarrobos",
                "Social (González Moreno)",
                "Gorra de Cuero (Carlos Tejedor)",
                "Independiente (América)",
                "Sportivo (América)",
                "Social (Tres Algarrobos)",
                "Los Once (Colonia Seré)",
                "Barrio Norte",
                "Jorge Newbery (Fortín Olavarría)",
                "Atlético Rivadavia",
                "Racing F.B.C. (Fortín Olavarría)"
            ].sort()
        },
        pagos: { habilitado: true, montoPorFecha: 500, moneda: 'ARS' }
    },

    // ─────────────────────────────────────────────
    //  TORNEO: MUNDIAL
    // ─────────────────────────────────────────────
    mundial: {
        label: '🌍 Mundial',
        nombre: 'Mundial 2026',

        // Sin categorías en partidos internacionales
        categorias: [],
        mostrarCategorias: false,

        // Todos los equipos en una sola lista (sin subcategorías)
        equiposPorCategoria: {
            // Clave "General" → cargada en el select cuando no hay categorías
            General: [
                'Alemania',
                'Arabia Saudí',
                'Argelia',
                'Argentina',
                'Australia',
                'Austria',
                'Bélgica',
                'Bosnia y Herzegovina',
                'Brasil',
                'Canadá',
                'Catar',
                'Chequia',
                'Colombia',
                'Costa de Marfil',
                'Croacia',
                'Curazao',
                'Ecuador',
                'Egipto',
                'Escocia',
                'España',
                'Estados Unidos',
                'Francia',
                'Ghana',
                'Haití',
                'Inglaterra',
                'Irak',
                'Irán',
                'Islas de Cabo Verde',
                'Japón',
                'Jordania',
                'Marruecos',
                'México',
                'Noruega',
                'Nueva Zelanda',
                'Países Bajos',
                'Panamá',
                'Paraguay',
                'Portugal',
                'RD Congo',
                'República de Corea',
                'Senegal',
                'Sudáfrica',
                'Suecia',
                'Suiza',
                'Túnez',
                'Turquía',
                'Uruguay',
                'Uzbekistán',
            ].sort((a, b) => a.localeCompare(b, 'es')),
        },

        // Configuración de pagos
        pagos: {
            habilitado: true,
            montoPorFecha: 1000,
            moneda: 'ARS',
        },
    },
};

// ─────────────────────────────────────────────────────────────────
//  API PÚBLICA — funciones que consume el resto de la app
// ─────────────────────────────────────────────────────────────────

/**
 * Devuelve la configuración completa de un torneo.
 * @param {string} torneoId  - ej: 'pueblo' | 'mundial'
 * @returns {object}
 */
function getTorneoConfig(torneoId) {
    return TORNEOS_CONFIG[torneoId] || TORNEOS_CONFIG['pueblo'];
}

/**
 * Devuelve todos los torneos como array de { id, label, nombre }.
 * Útil para construir dinámicamente las pestañas de navegación.
 * @returns {Array<{id: string, label: string, nombre: string}>}
 */
function getTodosLosTorneos() {
    return Object.entries(TORNEOS_CONFIG).map(([id, cfg]) => ({
        id,
        label: cfg.label,
        nombre: cfg.nombre,
    }));
}

/**
 * Devuelve la lista de categorías de un torneo.
 * @param {string} torneoId
 * @returns {string[]}
 */
function getCategorias(torneoId) {
    const cfg = getTorneoConfig(torneoId);
    return cfg.categorias || [];
}

/**
 * Devuelve todos los equipos de un torneo, sin importar categoría.
 * Útil cuando se necesita una lista plana.
 * @param {string} torneoId
 * @returns {string[]}
 */
function getEquipos(torneoId) {
    const cfg = getTorneoConfig(torneoId);
    const todos = [];
    for (const lista of Object.values(cfg.equiposPorCategoria)) {
        lista.forEach(eq => {
            if (!todos.includes(eq)) todos.push(eq);
        });
    }
    return todos.sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Devuelve los equipos agrupados por categoría para un torneo.
 * @param {string} torneoId
 * @returns {Object.<string, string[]>}
 */
function getEquiposPorCategoria(torneoId) {
    const cfg = getTorneoConfig(torneoId);
    return cfg.equiposPorCategoria || {};
}

/**
 * Indica si un torneo muestra selector de categorías.
 * @param {string} torneoId
 * @returns {boolean}
 */
function torneoTieneCategorias(torneoId) {
    const cfg = getTorneoConfig(torneoId);
    return cfg.mostrarCategorias === true;
}

/**
 * Devuelve la config de pagos de un torneo.
 * @param {string} torneoId
 * @returns {object}
 */
function getPagosConfig(torneoId) {
    const cfg = getTorneoConfig(torneoId);
    return cfg.pagos || { habilitado: false };
}