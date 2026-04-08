// ============================================
// UTILITÁRIOS GLOBAIS COM FIREBASE
// ============================================

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-PT');
}

function formatDateTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-PT');
}

// ==================== TOAST ====================
let toastTimeout = null;
function showToast(message, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ==================== VERIFICAÇÃO DE AUTENTICAÇÃO ====================
function checkAuth() {
  const usuario = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  const firebaseUser = window.auth?.currentUser || null;
  return !!(usuario || admin || firebaseUser);
}

function requireAuth() {
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// ==================== CONVERSÃO DE LINKS ====================
function converterLinkGoogleDrive(url) {
  if (!url) return url;
  
  if (url.includes('/preview') || url.includes('youtube.com/embed')) {
    return url;
  }
  
  let fileId = null;
  const patterns = [
    /\/file\/d\/([^\/]+)/,
    /\/d\/([^\/]+)/,
    /[?&]id=([^&]+)/,
    /open\?id=([^&]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      fileId = match[1];
      break;
    }
  }
  
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  if (url.includes('youtube.com/watch')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }
  
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }
  
  return url;
}

// ==================== CERTIFICADO ====================
function gerarCertificadoId() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CERT-${year}-${random}`;
}

// ==================== EXPORTAÇÃO EXCEL ====================
function downloadExcel(data, filename, sheetName = 'Dados') {
  if (!data || data.length === 0) {
    showToast('❌ Sem dados para exportar');
    return;
  }
  
  if (typeof XLSX === 'undefined') {
    showToast('❌ Biblioteca Excel não carregada');
    return;
  }
  
  try {
    const wsData = [Object.keys(data[0]), ...data.map(row => Object.values(row))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}_${formatDate(new Date()).replace(/\//g, '-')}.xlsx`);
    showToast('✅ Ficheiro Excel exportado!');
  } catch(e) {
    console.error('Erro ao exportar Excel:', e);
    showToast('❌ Erro ao exportar Excel');
  }
}

// ==================== DETECÇÃO DE SCROLL ====================
function detectarScrollCompleto(elementId, onComplete) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  let hasScrolledToBottom = false;
  
  const checkImmediate = () => {
    if (element.scrollHeight <= element.clientHeight + 5) {
      if (onComplete) onComplete();
      return true;
    }
    return false;
  };
  
  if (checkImmediate()) return;
  
  const checkScroll = () => {
    if (!hasScrolledToBottom && 
        element.scrollTop + element.clientHeight >= element.scrollHeight - 10) {
      hasScrolledToBottom = true;
      if (onComplete) onComplete();
      element.removeEventListener('scroll', checkScroll);
    }
  };
  
  element.addEventListener('scroll', checkScroll);
  setTimeout(checkScroll, 500);
}

// ==================== FIRESTORE HELPERS ====================
async function salvarNoFirestore(colecao, dados, id = null) {
  try {
    if (!window.db || !window.firebaseReady) {
      throw new Error('Firestore indisponível');
    }

    if (id) {
      await window.db.collection(colecao).doc(id).set({
        ...dados,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      await window.db.collection(colecao).add({
        ...dados,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error(`Erro ao salvar em ${colecao}:`, error);
    const localData = JSON.parse(localStorage.getItem(colecao) || '[]');
    if (id) {
      const index = localData.findIndex(item => item.id === id);
      if (index >= 0) {
        localData[index] = { ...localData[index], ...dados };
      } else {
        localData.push({ id, ...dados });
      }
    } else {
      const newId = Date.now().toString();
      localData.push({ id: newId, ...dados });
    }
    localStorage.setItem(colecao, JSON.stringify(localData));
    return false;
  }
}

async function carregarDoFirestore(colecao) {
  try {
    if (!window.db || !window.firebaseReady) {
      throw new Error('Firestore indisponível');
    }

    const snapshot = await window.db.collection(colecao).get();
    const dados = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    localStorage.setItem(colecao, JSON.stringify(dados));
    return dados;
  } catch (error) {
    console.error(`Erro ao carregar ${colecao}:`, error);
    return JSON.parse(localStorage.getItem(colecao) || '[]');
  }
}

// ============================================
// EXPORTAÇÃO GLOBAL
// ============================================
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.formatDate = formatDate;
  window.formatDateTime = formatDateTime;
  window.showToast = showToast;
  window.checkAuth = checkAuth;
  window.requireAuth = requireAuth;
  window.converterLinkGoogleDrive = converterLinkGoogleDrive;
  window.gerarCertificadoId = gerarCertificadoId;
  window.downloadExcel = downloadExcel;
  window.detectarScrollCompleto = detectarScrollCompleto;
  window.salvarNoFirestore = salvarNoFirestore;
  window.carregarDoFirestore = carregarDoFirestore;
}

console.log('✅ utils.js carregado com sucesso');
