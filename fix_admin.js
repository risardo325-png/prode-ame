const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

// Link CSS
html = html.replace('<link rel="stylesheet" href="styles.css?v=5">', '<link rel="stylesheet" href="admin.css">');

// Body class
html = html.replace('<body>', '<body class="admin-body">');

// Wrapper
html = html.replace('<div id="admin-app-wrapper" style="display:none; height:100vh; overflow:hidden; flex-direction:column;">', '<div id="admin-app-wrapper" class="admin-app" style="display:none;">');

// Buttons
html = html.replace(/class="btn-primary/g, 'class="admin-btn-primary');
html = html.replace(/class="btn-secondary/g, 'class="admin-btn-secondary');
html = html.replace(/class="btn-danger/g, 'class="admin-btn-danger');

// Cards
html = html.replace(/class="card/g, 'class="admin-card');
html = html.replace(/class="card mt-2"/g, 'class="admin-card admin-mt-1"');

// Form groups & inputs
html = html.replace(/class="form-group"/g, 'class="admin-form-group"');
html = html.replace(/<input type="email"/g, '<input type="email" class="admin-input"');
html = html.replace(/<input type="password"/g, '<input type="password" class="admin-input"');
html = html.replace(/<input type="text"/g, '<input type="text" class="admin-input"');
html = html.replace(/<input type="tel"/g, '<input type="tel" class="admin-input"');
html = html.replace(/<input type="datetime-local"/g, '<input type="datetime-local" class="admin-input"');
html = html.replace(/<select /g, '<select class="admin-select" ');

// Tables
html = html.replace(/class="table-responsive"/g, 'class="admin-table-responsive"');
html = html.replace(/<table /g, '<table class="admin-table" ');
html = html.replace(/<table id="usuarios-table">/g, '<table id="usuarios-table" class="admin-table">');
html = html.replace(/<table id="cms-users-table">/g, '<table id="cms-users-table" class="admin-table">');

// Utilities
html = html.replace(/w-100/g, 'admin-w-100');

// Add script for backup
html = html.replace('<script src="app.js?v=7"></script>', '<script src="app.js?v=7"></script>\n    <script src="admin-backup.js"></script>');

// Sidebar and Layout
html = html.replace('<main id="admin-main">', '<main id="admin-main" class="admin-main">');
html = html.replace(/<aside [^>]*>/, '<aside class="admin-sidebar">');

// Inline styles cleanup (optional, but keep it mostly intact to avoid breaking specific logic, we just override with CSS)

// Add Recalcular Todo Pueblo Button
html = html.replace(
    '<button id="btn-calcular-puntos" class="admin-btn-secondary admin-w-100">Calcular Puntos de Todos</button>',
    `<button id="btn-calcular-puntos" class="admin-btn-secondary admin-w-100">Calcular Puntos de Todos</button>
     <button onclick="forzarRecalculoGlobalPueblo()" class="admin-btn-danger admin-w-100 admin-mt-1" style="background:linear-gradient(135deg, #ef4444, #b91c1c);">🔄 Recalcular Todo (Fuerza Bruta) - Pueblo</button>`
);

// Add Backup button
html = html.replace(
    '<div id="cms-logs-container"',
    '<button onclick="ejecutarBackupCompleto()" class="admin-btn-primary admin-w-100 admin-mb-1">💾 Descargar Backup Completo</button>\n                <div id="cms-logs-container"'
);

fs.writeFileSync('admin.html', html);
console.log('admin.html updated successfully');
