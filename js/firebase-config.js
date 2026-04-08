// ============================================
// firebase-config.js - BIRKENSTOCK FORMAÇÃO
// ============================================

// Configuração do Firebase (ATUALIZADA)
const firebaseConfig = {
  apiKey: "AIzaSyBY_Npu9n8VEh6bykipH3HCt1aeTU5B0n4",
  authDomain: "birk-formacao.firebaseapp.com",
  projectId: "birk-formacao",
  storageBucket: "birk-formacao.firebasestorage.app",
  messagingSenderId: "314572551710",
  appId: "1:314572551710:web:fddb38b6a1517fead2a00f"
};

// Emails que podem ser administradores - ADICIONA AQUI O TEU EMAIL
window.ADMIN_EMAILS = [
  'hsebirk@gmail.com'
  // Adiciona mais emails admin aqui se necessário
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

// Aguardar pelo Firebase SDK (versão compatível)
function initFirebase() {
  // Verificar se o Firebase já foi inicializado via script tag
  if (typeof firebase !== 'undefined' && firebase.apps && !firebase.apps.length) {
    try {
      firebase.initializeApp(firebaseConfig);
      window.auth = firebase.auth();
      window.db = firebase.firestore();
      window.firebaseReady = true;
      console.log('🔥 Firebase inicializado com sucesso');
      
      // Configurar persistência de autenticação
      if (window.auth) {
        window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
          .catch(err => console.warn('Persistência error:', err));
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase:', error);
      window.firebaseReady = false;
    }
  } 
  // Verificar se já foi inicializado (via module)
  else if (typeof window.firebaseApp !== 'undefined') {
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.firebaseReady = true;
    console.log('🔥 Firebase já inicializado (module)');
  }
  else {
    console.warn('⚠️ Firebase SDK não carregado, a aguardar...');
    setTimeout(initFirebase, 500);
  }
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFirebase);
} else {
  initFirebase();
}

window.getFirebaseStatus = function () {
  return {
    ready: window.firebaseReady,
    hasAuth: !!window.auth,
    hasDb: !!window.db
  };
};

console.log('✅ firebase-config.js carregado');
