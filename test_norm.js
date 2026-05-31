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

console.log('Messi -> ' + normalizePlayer('Messi'));
console.log('Lionel Messi -> ' + normalizePlayer('Lionel Messi'));
console.log('Mbappé -> ' + normalizePlayer('Mbappé'));
console.log('Kylian Mbappé -> ' + normalizePlayer('Kylian Mbappé'));
console.log('Dibu Martínez -> ' + normalizePlayer('Dibu Martínez'));
console.log('Emiliano Martinez -> ' + normalizePlayer('Emiliano Martinez'));
console.log('Julián Álvarez -> ' + normalizePlayer('Julián Álvarez'));
