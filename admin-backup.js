// ─── ADMIN BACKUP SCRIPT ──────────────────────────────────────────
// Script para respaldar todas las colecciones relevantes.
// Esto permite al admin descargar JSONs con los datos de Firebase.

async function backupCollection(collectionName) {
    try {
        console.log(`[Backup] Iniciando respaldo de ${collectionName}...`);
        const snapshot = await db.collection(collectionName).get();
        if (snapshot.empty) {
            console.log(`[Backup] Colección ${collectionName} vacía.`);
            return null;
        }

        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });

        return data;
    } catch (e) {
        console.error(`[Backup Error] Falló al respaldar ${collectionName}:`, e);
        return null;
    }
}

function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.ejecutarBackupCompleto = async function() {
    const colecciones = ['partidos', 'predicciones', 'predicciones_mundial', 'usuarios', 'historial_fechas', 'config'];
    
    alert("Iniciando backup. Puede demorar unos segundos. Acepta las descargas múltiples si el navegador lo solicita.");

    for (const coll of colecciones) {
        const data = await backupCollection(coll);
        if (data) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            downloadJSON(data, `backup_${coll}_${timestamp}.json`);
        }
    }
    
    alert("Backup finalizado.");
};
