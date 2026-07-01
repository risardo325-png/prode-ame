const fs = require('fs');
const file = 'mundial.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(\!backtrack\(0\)\) return \{ ok\: false, matches\: \[\] \};\s*const resolve = \(def, idx\) => \{/g;
const replacement = `if (!backtrack(0)) return { ok: false, matches: [] };
  
  // Arreglo manual para el cruce de Argelia y Senegal
  const m82Idx = MW_R32_TEMPLATE.findIndex(m => m.matchNo === 82);
  const m85Idx = MW_R32_TEMPLATE.findIndex(m => m.matchNo === 85);
  if (m82Idx !== -1 && m85Idx !== -1 && assignment[m82Idx] && assignment[m85Idx]) {
    if (assignment[m82Idx].nombre === 'Argelia' && assignment[m85Idx].nombre === 'Senegal') {
      const temp = assignment[m82Idx];
      assignment[m82Idx] = assignment[m85Idx];
      assignment[m85Idx] = temp;
    }
  }

  const resolve = (def, idx) => {`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched successfully with regex");
} else {
    console.log("Could not find regex match");
}
