const ROUNDS = [
    { id: 'R32', name: '16avos', count: 16 },
    { id: 'R16', name: 'Octavos', count: 8 },
    { id: 'QF', name: 'Cuartos', count: 4 },
    { id: 'SF', name: 'Semis', count: 2 },
    { id: 'F', name: 'Final', count: 1 }
];
function normalizePlayer(name) {
    if (!name) return "";
    let n = String(name).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    const aliases = {
        'lionelmessi': 'messi',
        'leomessi': 'messi',
        'kylianmbappe': 'mbappe',
        'kilianmbappe': 'mbappe',
        'dibumartinez': 'emilianomartinez',
        'emimartinez': 'emilianomartinez',
        'julianalvarez': 'alvarez',
        'lautaromartinez': 'lautaro'
    };
    for (const [alias, std] of Object.entries(aliases)) {
        if (n.includes(alias) || n === std) return std;
    }
    if (n.includes('messi')) return 'messi';
    if (n.includes('mbappe')) return 'mbappe';
    if (n.includes('dibu') || n.includes('emilianomartinez')) return 'emilianomartinez';
    if (n.includes('julian') && n.includes('alvarez')) return 'alvarez';
    if (n.includes('lautaro')) return 'lautaro';
    return n;
}

const state = {
    results: {
        'match1': { gl: 2, gv: 1 },
        'match2': { gl: 1, gv: 1 }
    },
    estados: {
        'match1': 'finalizado',
        'match2': 'finalizado'
    },
    knockout: {
        'F_0': 'Argentina',
        'CHAMPION': 'Argentina'
    },
    bonusOficial: {
        goleador: 'Kylian Mbappé',
        goleadorArg: 'Leo Messi',
        valla: 'Dibu Martinez'
    }
};

function sign(gl, gv) { return Number(gl) > Number(gv) ? 'L' : Number(gl) < Number(gv) ? 'V' : 'E'; }

function calculateUserPoints(u) {
    let pts = 0;
    Object.keys(state.results).forEach(id => {
      if (state.estados[id] !== 'finalizado') return;
      const real = state.results[id];
      const pred = (u.partidos || {})[id];
      if (!real || !pred) return;
      if (Number(pred.gl) === Number(real.gl) && Number(pred.gv) === Number(real.gv)) pts += 4;
      else if (sign(pred.gl, pred.gv) === sign(real.gl, real.gv)) pts += 1;
    });
    const values = { R32: 2, R16: 3, QF: 5, SF: 7, F: 10 };
    Object.keys(values).forEach(round => {
      const count = ROUNDS.find(r => r.id === round).count;
      for (let i = 0; i < count; i++) {
        if (u.knockout?.[`_`] && u.knockout[`_`] === state.knockout[`_`]) pts += values[round];
      }
    });
    if (u.knockout?.CHAMPION && u.knockout.CHAMPION === state.knockout.CHAMPION) pts += 15;

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

const userWithoutBonus = {
    partidos: { 'match1': { gl: 2, gv: 1 }, 'match2': { gl: 2, gv: 0 } },
    knockout: { 'F_0': 'Argentina', 'CHAMPION': 'Argentina' }
};

const userWithPartialBonus = {
    partidos: { 'match1': { gl: 2, gv: 1 }, 'match2': { gl: 2, gv: 0 } },
    knockout: { 'F_0': 'Argentina', 'CHAMPION': 'Argentina' },
    bonus: {
        goleador: 'Messi',
        goleadorArg: 'Messi',
        valla: 'Martinez'
    }
};

const userWithFullBonusAliases = {
    partidos: { 'match1': { gl: 2, gv: 1 }, 'match2': { gl: 2, gv: 0 } },
    knockout: { 'F_0': 'Argentina', 'CHAMPION': 'Argentina' },
    bonus: {
        goleador: 'Mbappe',
        goleadorArg: 'Lionel Messi',
        valla: 'Emiliano Martinez'
    }
};

console.log('Without bonus: ' + calculateUserPoints(userWithoutBonus));
console.log('Partial bonus (only arg): ' + calculateUserPoints(userWithPartialBonus));
console.log('Full bonus with aliases: ' + calculateUserPoints(userWithFullBonusAliases));
