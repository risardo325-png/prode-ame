const fs = require('fs');
const file = 'mundial.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `function mwCalcularTablasDesdeResultados(partidos) {
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
    || a.grupo.localeCompare(b.grupo)
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

function mwGenerarCrucesR32(clasificacion) {`;

const startIdx = content.indexOf('function mwCalcularTablasDesdeResultados(partidos) {');
const endIdx = content.indexOf('function mwGenerarCrucesR32(clasificacion) {');

if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + replacement + content.slice(endIdx + 'function mwGenerarCrucesR32(clasificacion) {'.length);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Fixed");
} else {
    console.log("Could not find boundaries");
}
