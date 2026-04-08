// ============================================
// AUTH - GESTÃO DE AUTENTICAÇÃO
// ============================================

function getAdminPassword() {
  return localStorage.getItem('admin_password') || window.ADMIN_PASS || 'SSA2024admin';
}

function clearSessionStorage() {
  [
    'usuarioAtivo',
    'usuarioAdmin',
    'usuarioNome',
    'usuarioEmail',
    'usuarioMatricula',
    'cursoAtualId',
    'cursoConcluido'
  ].forEach((key) => localStorage.removeItem(key));
}

function persistCollaboratorSession(colaborador) {
  clearSessionStorage();
  localStorage.setItem('usuarioAtivo', colaborador.user || colaborador.email || colaborador.nome);
  localStorage.setItem('usuarioNome', colaborador.nome || colaborador.user || 'Colaborador');
  localStorage.setItem('usuarioEmail', colaborador.email || '');
  localStorage.setItem('usuarioMatricula', colaborador.matricula || '');
}

function persistAdminSession(nome = 'Administrador', email = '') {
  clearSessionStorage();
  localStorage.setItem('usuarioAdmin', 'admin');
  localStorage.setItem('usuarioNome', nome);
  localStorage.setItem('usuarioEmail', email || '');
}

function generateUsername(nome, email) {
  if (email && email.includes('@')) {
    return email.split('@')[0].toLowerCase();
  }
  return String(nome || 'utilizador')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'utilizador';
}

async function carregarColaboradores() {
  if (window.firebaseReady && window.db) {
    try {
      const snapshot = await window.db.collection('colaboradores').get();
      const colaboradores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (colaboradores.length) {
        localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
        return colaboradores;
      }
    } catch (error) {
      console.warn('Erro ao carregar do Firestore:', error);
    }
  }
  return JSON.parse(localStorage.getItem('colaboradores') || '[]');
}

async function guardarColaboradorFirestore(colaborador) {
  if (!window.firebaseReady || !window.db) return false;
  try {
    const id = colaborador.id || colaborador.email;
    await window.db.collection('colaboradores').doc(id).set(colaborador, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao guardar no Firestore:', error);
    return false;
  }
}

async function loginColaborador(emailOuUser, pass) {
  const identifier = String(emailOuUser || '').trim().toLowerCase();
  if (!identifier || !pass) return false;

  // Tentar login Firebase primeiro
  if (window.firebaseReady && window.auth && identifier.includes('@')) {
    try {
      const cred = await window.auth.signInWithEmailAndPassword(identifier, pass);
      const firebaseUser = cred.user;
      const email = firebaseUser.email.toLowerCase();

      if (window.isAdminEmail(email)) {
        persistAdminSession(firebaseUser.displayName || 'Administrador', email);
        return true;
      }

      // Verificar se colaborador existe
      const colaboradores = await carregarColaboradores();
      let found = colaboradores.find(c => String(c.email || '').toLowerCase() === email);
      
      if (!found) {
        found = {
          id: firebaseUser.uid,
          matricula: '',
          user: generateUsername(firebaseUser.displayName, email),
          nome: firebaseUser.displayName || email.split('@')[0],
          email: email,
          dataCriacao: new Date().toISOString()
        };
        await guardarColaboradorFirestore(found);
        const cols = await carregarColaboradores();
        if (!cols.find(c => c.email === email)) {
          cols.push(found);
          localStorage.setItem('colaboradores', JSON.stringify(cols));
        }
      }

      persistCollaboratorSession(found);
      return true;
    } catch (error) {
      console.warn('Login Firebase falhou:', error.message);
    }
  }

  // Fallback para login local
  const colaboradores = await carregarColaboradores();
  const found = colaboradores.find(c => {
    const user = String(c.user || '').toLowerCase();
    const email = String(c.email || '').toLowerCase();
    return (user === identifier || email === identifier) && c.pass === pass;
  });

  if (!found) return false;
  persistCollaboratorSession(found);
  return true;
}

function loginAdmin(password) {
  if (password === getAdminPassword()) {
    persistAdminSession('Administrador');
    return true;
  }
  return false;
}

function getCurrentUser() {
  const colaborador = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  const nome = localStorage.getItem('usuarioNome') || colaborador || 'Utilizador';
  const email = localStorage.getItem('usuarioEmail') || '';
  const matricula = localStorage.getItem('usuarioMatricula') || '';

  if (admin) {
    return { type: 'admin', name: nome || 'Administrador', email };
  }
  if (colaborador) {
    return {
      type: 'colaborador',
      name: nome,
      email: email,
      matricula: matricula,
      user: colaborador
    };
  }
  if (window.auth?.currentUser) {
    const user = window.auth.currentUser;
    return {
      type: window.isAdminEmail?.(user.email) ? 'admin' : 'colaborador',
      name: user.displayName || user.email,
      email: user.email || '',
      matricula: '',
      user: generateUsername(user.displayName, user.email)
    };
  }
  return null;
}

function isAuthenticated() {
  return !!getCurrentUser();
}

async function logout() {
  clearSessionStorage();
  if (window.auth?.currentUser) {
    try {
      await window.auth.signOut();
    } catch (error) {
      console.warn('Erro ao terminar sessão Firebase:', error);
    }
  }
  window.location.href = 'login.html';
}

async function getColaboradores() {
  return await carregarColaboradores();
}

// Login com Google (versão compatível com Firebase 8)
async function loginWithGoogle() {
  if (!window.firebaseReady || !window.auth) {
    window.showToast('❌ Firebase não disponível');
    return false;
  }
  
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await window.auth.signInWithPopup(provider);
    const user = result.user;
    const email = user.email.toLowerCase();
    
    if (window.isAdminEmail(email)) {
      persistAdminSession(user.displayName, email);
      return true;
    }
    
    const colaboradores = await carregarColaboradores();
    let found = colaboradores.find(c => String(c.email || '').toLowerCase() === email);
    
    if (!found) {
      found = {
        id: user.uid,
        matricula: '',
        user: generateUsername(user.displayName, email),
        nome: user.displayName || email.split('@')[0],
        email: email,
        provider: 'google',
        dataCriacao: new Date().toISOString()
      };
      await guardarColaboradorFirestore(found);
      const cols = await carregarColaboradores();
      if (!cols.find(c => c.email === email)) {
        cols.push(found);
        localStorage.setItem('colaboradores', JSON.stringify(cols));
      }
    }
    
    persistCollaboratorSession(found);
    return true;
  } catch (error) {
    console.error('Erro no login Google:', error);
    window.showToast('❌ Erro no login com Google: ' + error.message);
    return false;
  }
}

// Expor funções globalmente
window.loginColaborador = loginColaborador;
window.loginAdmin = loginAdmin;
window.loginWithGoogle = loginWithGoogle;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.logout = logout;
window.getColaboradores = getColaboradores;
window.generateUsername = generateUsername;

console.log('✅ auth.js carregado com sucesso');
