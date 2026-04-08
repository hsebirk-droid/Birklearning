// ============================================
// FIREBASE CONFIGURATION (SEM GOOGLE AUTH)
// ============================================

const firebaseConfig = {
  apiKey: "SUBSTITUIR_PELO_SEU_API_KEY",
  authDomain: "SUBSTITUIR_PELO_SEU_AUTH_DOMAIN",
  projectId: "SUBSTITUIR_PELO_SEU_PROJECT_ID",
  storageBucket: "SUBSTITUIR_PELO_SEU_STORAGE_BUCKET",
  messagingSenderId: "SUBSTITUIR_PELO_SEU_MESSAGING_SENDER_ID",
  appId: "SUBSTITUIR_PELO_SEU_APP_ID"
};

window.firebaseConfig = firebaseConfig;
window.ADMIN_EMAILS = [
  'admin@birkenstock.pt',
  'rh@birkenstock.pt',
  'formacao@birkenstock.pt'
];
window.ADMIN_PASS = localStorage.getItem('admin_password') || 'SSA2024admin';
window.isAdminEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  return window.ADMIN_EMAILS.some(item => item.toLowerCase() === normalized);
};

function hasFirebasePlaceholders(config) {
  return Object.values(config).some(value => !value || String(value).includes('SUBSTITUIR_PELO_SEU_'));
}

window.firebaseReady = false;
window.auth = null;
window.db = null;
window.storage = null;
window.firebaseHasPlaceholders = hasFirebasePlaceholders(firebaseConfig);

if (typeof firebase !== 'undefined' && !window.firebaseHasPlaceholders) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
    window.firebaseReady = true;

    console.log('🔥 Firebase inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
  }
} else {
  console.warn('⚠️ Firebase em modo de preparação. Preencha firebase-config.js para ativar Auth/Firestore/Storage.');
}

window.getFirebaseStatus = function () {
  return {
    ready: window.firebaseReady,
    placeholders: window.firebaseHasPlaceholders,
    hasAuth: !!window.auth,
    hasDb: !!window.db,
    hasStorage: !!window.storage
  };
};

console.log('✅ firebase-config.js carregado (sem Google Auth - apenas email/password)');
