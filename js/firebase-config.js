// ============================================
// firebase-config.js - BIRKENSTOCK FORMAÇÃO
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyB88K-JEiOZFyOIhMFKdQg9neOLQlh2kYw",
  authDomain: "birkenstock-formacao.firebaseapp.com",
  projectId: "birkenstock-formacao",
  storageBucket: "birkenstock-formacao.firebasestorage.app",
  messagingSenderId: "1023521575862",
  appId: "1:1023521575862:web:c0e6fadc3e9b1deae6e717",
  measurementId: "G-F6G7DXE9R7"
};

window.firebaseConfig = firebaseConfig;

// Emails que podem ser administradores - APENAS O TEU
window.ADMIN_EMAILS = [
  'hsebirk@gmail.com'
];

window.ADMIN_PASS = localStorage.getItem('admin_password') || 'SSA2024admin';

window.isAdminEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  return window.ADMIN_EMAILS.some(item => item.toLowerCase() === normalized);
};

// Inicializar Firebase
window.firebaseReady = false;
window.auth = null;
window.db = null;

if (typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.firebaseReady = true;
    
    console.log('🔥 Firebase inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    window.firebaseReady = false;
  }
} else {
  console.warn('⚠️ Firebase SDK não carregado');
}

window.getFirebaseStatus = function () {
  return {
    ready: window.firebaseReady,
    hasAuth: !!window.auth,
    hasDb: !!window.db
  };
};

console.log('✅ firebase-config.js carregado');
