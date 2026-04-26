// REEMPLAZAR con la configuración real de Firebase
// 1. Ve a la consola de Firebase (console.firebase.google.com)
// 2. Crea un proyecto web
// 3. Copia el objeto firebaseConfig y reemplázalo aquí abajo
const firebaseConfig = {
    apiKey: "AIzaSyAnvaeiunSWJu2VVx4oGZ7-egHI3e8DlAU",
    authDomain: "prode-pueblo.firebaseapp.com",
    projectId: "prode-pueblo",
    storageBucket: "prode-pueblo.firebasestorage.app",
    messagingSenderId: "1051563108455",
    appId: "1:1051563108455:web:0f9363e1ae009010bd4cc2"
};

// 🔥 ESTO ES LO IMPORTANTE
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();