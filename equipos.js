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
        categorias: ['Primera', 'Tercera', 'Senior', 'Liga Profesional'],
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
                "Racing F.B.C. (Fortín Olavarría)",
                "Ingeniero White",
                "Eclipse (Villegas)"
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
            ].sort(),
            'Liga Profesional': [
                "River Plate",
                "Belgrano"
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

        // ─── GRUPOS DEL MUNDIAL 2026 ───────────────────────────────────────
        // Fuente: sorteo FIFA, Washington D.C., 5 dic 2025
        grupos: {
            A: ['México', 'Sudáfrica', 'República de Corea', 'Chequia'],
            B: ['Canadá', 'Bosnia y Herzegovina', 'Catar', 'Suiza'],
            C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
            D: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
            E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
            F: ['Países Bajos', 'Japón', 'Túnez', 'Noruega'],
            G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
            H: ['España', 'Cabo Verde', 'Arabia Saudí', 'Uruguay'],
            I: ['Francia', 'Polonia', 'Arabia Saudí', 'Senegal'],
            J: ['Argentina', 'Croacia', 'Ghana', 'Panamá'],
            K: ['Portugal', 'Colombia', 'Uzbekistán', 'Irak'],
            L: ['Inglaterra', 'Eslovaquia', 'Suecia', 'RD Congo'],
        },

        // Código ISO de bandera para cada selección (usar con flagcdn.com)
        banderasCodigo: {
            'México': 'mx', 'Sudáfrica': 'za', 'República de Corea': 'kr', 'Chequia': 'cz',
            'Canadá': 'ca', 'Bosnia y Herzegovina': 'ba', 'Catar': 'qa', 'Suiza': 'ch',
            'Brasil': 'br', 'Marruecos': 'ma', 'Haití': 'ht', 'Escocia': 'gb-sct',
            'Estados Unidos': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr',
            'Alemania': 'de', 'Curazao': 'cw', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
            'Países Bajos': 'nl', 'Japón': 'jp', 'Túnez': 'tn', 'Noruega': 'no',
            'Bélgica': 'be', 'Egipto': 'eg', 'Irán': 'ir', 'Nueva Zelanda': 'nz',
            'España': 'es', 'Cabo Verde': 'cv', 'Arabia Saudí': 'sa', 'Uruguay': 'uy',
            'Francia': 'fr', 'Polonia': 'pl', 'Senegal': 'sn',
            'Argentina': 'ar', 'Croacia': 'hr', 'Ghana': 'gh', 'Panamá': 'pa',
            'Portugal': 'pt', 'Colombia': 'co', 'Uzbekistán': 'uz', 'Irak': 'iq',
            'Inglaterra': 'gb-eng', 'Eslovaquia': 'sk', 'Suecia': 'se', 'RD Congo': 'cd',
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
/**
 * Devuelve los grupos del Mundial (solo para torneo 'mundial').
 * @returns {Object.<string, string[]>}
 */
function getGruposMundial() {
    return TORNEOS_CONFIG.mundial.grupos || {};
}

/**
 * Devuelve el código ISO de bandera para un país.
 * @param {string} pais
 * @returns {string}
 */
function getBanderaCodigo(pais) {
    const normalize = (str) => {
        if (!str) return '';
        return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const nPais = normalize(pais);

    const overrideDict = {
        'mexico': 'mx', 'sudafrica': 'za', 'corea del sur': 'kr', 'republica de corea': 'kr', 'chequia': 'cz',
        'canada': 'ca', 'bosnia y herzegovina': 'ba', 'catar': 'qa', 'suiza': 'ch',
        'brasil': 'br', 'marruecos': 'ma', 'haiti': 'ht', 'escocia': 'gb-sct',
        'estados unidos': 'us', 'usa': 'us', 'paraguay': 'py', 'australia': 'au', 'turquia': 'tr',
        'alemania': 'de', 'curazao': 'cw', 'costa de marfil': 'ci', 'ecuador': 'ec',
        'paises bajos': 'nl', 'japon': 'jp', 'tunez': 'tn', 'noruega': 'no',
        'belgica': 'be', 'egipto': 'eg', 'iran': 'ir', 'nueva zelanda': 'nz',
        'espana': 'es', 'cabo verde': 'cv', 'arabia saudi': 'sa', 'uruguay': 'uy',
        'francia': 'fr', 'polonia': 'pl', 'senegal': 'sn',
        'argentina': 'ar', 'croacia': 'hr', 'ghana': 'gh', 'panama': 'pa',
        'portugal': 'pt', 'colombia': 'co', 'uzbekistan': 'uz', 'irak': 'iq',
        'inglaterra': 'gb-eng', 'eslovaquia': 'sk', 'suecia': 'se', 'rd congo': 'cd', 'gales': 'gb-wls',
        'argelia': 'dz', 'jordania': 'jo', 'austria': 'at'
    };
    
    return overrideDict[nPais] || 'un';
}

/**
 * Devuelve la URL de la bandera de un país (flagcdn.com).
 * @param {string} pais
 * @param {number} [size=64]
 * @returns {string}
 */
function getBanderaUrl(pais, size = 64) {
    const codigo = getBanderaCodigo(pais);
    return `https://flagcdn.com/w${size}/${codigo}.png`;
}