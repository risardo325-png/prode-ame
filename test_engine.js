const assert = require('assert');

const ROUNDS = [
    { id: 'R32', name: '16avos', count: 16 },
    { id: 'R16', name: 'Octavos', count: 8 },
    { id: 'QF', name: 'Cuartos', count: 4 },
    { id: 'SF', name: 'Semis', count: 2 },
    { id: 'F', name: 'Final', count: 1 }
];

const state = {
    results: {
        A1: { gl: 2, gv: 1 },
        A2: { gl: 1, gv: 1 }
    },
    estados: {
        A1: 'finalizado',
        A2: 'finalizado'
    },
    knockout: {
        R32_0: 'Argentina',
        R32_1: 'Brasil',
        R16_0: 'Argentina',
        QF_0: 'Argentina',
        SF_0: 'Argentina',
        SF_1: 'Francia',
        F_0: 'Argentina',
        CHAMPION: 'Argentina'
    },
    bonusOficial: {
        goleador: 'Kylian Mbappe',
        goleadorArg: 'Lionel Messi',
        valla: 'Emiliano Martinez'
    }
};

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
        if (n.includes(alias) || n === std) return std;
    }

    if (n.includes("messi")) return "messi";
    if (n.includes("mbappe")) return "mbappe";
    if (n.includes("dibu") || n.includes("emilianomartinez")) return "emilianomartinez";
    if (n.includes("julian") && n.includes("alvarez")) return "alvarez";
    if (n.includes("lautaro")) return "lautaro";

    return n;
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

function teamsByRound(knockout = {}, round) {
    const roundInfo = ROUNDS.find(r => r.id === round);
    const teams = new Set();
    if (!roundInfo) return teams;
    for (let i = 0; i < roundInfo.count; i++) {
        const key = teamKey(knockout?.[`${round}_${i}`]);
        if (key) teams.add(key);
    }
    return teams;
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

    const values = { R32: 10, R16: 20, QF: 30, SF: 50 };
    Object.keys(values).forEach(round => {
        const userTeams = teamsByRound(u.knockout, round);
        if (!userTeams.size) return;
        const officialTeams = teamsByRound(state.knockout, round);
        userTeams.forEach(team => {
            if (officialTeams.has(team)) pts += values[round];
        });
    });

    if (teamKey(u.knockout?.CHAMPION) && teamKey(u.knockout?.CHAMPION) === teamKey(state.knockout.CHAMPION)) pts += 100;

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

function runCase(name, user, expected) {
    const actual = calculateUserPoints(user);
    assert.strictEqual(actual, expected, `${name}: expected ${expected}, got ${actual}`);
    assert.ok(!Number.isNaN(actual), `${name}: generated NaN`);
    console.log(`${name}: ${actual}`);
}

runCase('usuario sin aciertos', {
    partidos: { A1: { gl: 0, gv: 2 }, A2: { gl: 2, gv: 1 } },
    knockout: { R32_0: 'Alemania', R16_0: 'Alemania', QF_0: 'Alemania', SF_0: 'Alemania', CHAMPION: 'Alemania' },
    bonus: { goleador: 'Haaland', goleadorArg: 'Lautaro', valla: 'Alisson' }
}, 0);

runCase('usuario con todos los aciertos', {
    partidos: { A1: { gl: 2, gv: 1 }, A2: { gl: 1, gv: 1 } },
    knockout: {
        R32_0: 'Argentina',
        R32_1: 'Brasil',
        R16_0: 'Argentina',
        QF_0: 'Argentina',
        SF_0: 'Argentina',
        SF_1: 'Francia',
        F_0: 'Argentina',
        CHAMPION: 'Argentina'
    },
    bonus: { goleador: 'Mbappe', goleadorArg: 'Messi', valla: 'Dibu Martinez' }
}, 363);

runCase('usuario con solamente grupos', {
    partidos: { A1: { gl: 2, gv: 1 }, A2: { gl: 2, gv: 2 } }
}, 5);

runCase('usuario con solamente eliminacion directa', {
    knockout: { R32_2: 'Argentina', R16_7: 'Argentina', QF_3: 'Argentina', SF_1: 'Francia' }
}, 110);

runCase('usuario con campeon correcto', {
    knockout: { CHAMPION: 'Argentina' }
}, 100);

runCase('usuario con finalistas correctos', {
    knockout: { SF_0: 'Francia', SF_1: 'Argentina' }
}, 100);

const previousKnockout = { ...state.knockout };
state.knockout = {
    ...state.knockout,
    SF_0: 'Argentina',
    SF_1: 'España',
    CHAMPION: 'Argentina'
};
runCase('final Argentina-España con campeon Argentina', {
    knockout: { SF_0: 'Argentina', SF_1: 'España', CHAMPION: 'Argentina' }
}, 200);
state.knockout = previousKnockout;

runCase('usuario con goleador correcto', {
    bonus: { goleador: 'Kylian Mbappe' }
}, 35);

runCase('usuario con equipos repetidos', {
    knockout: {
        R32_0: 'Argentina',
        R32_1: 'Argentina',
        R32_2: 'Argentina',
        SF_0: 'Argentina',
        SF_1: 'Argentina'
    }
}, 60);

state.knockout.R32_2 = 'Países Bajos';
runCase('normalizacion de equipos con espacios mayusculas tildes e invisibles', {
    knockout: {
        R32_0: ' ARGENTINA\u200B\n',
        R32_2: 'paises   bajos'
    }
}, 20);
delete state.knockout.R32_2;

runCase('usuario con datos incompletos', {
    partidos: { A1: { gl: '', gv: '' } },
    knockout: { R32_0: '', SF_0: 'Argentina' },
    bonus: {}
}, 50);

runCase('usuario con documento antiguo', {
    partidos: { A2: { gl: 0, gv: 0 } }
}, 1);
