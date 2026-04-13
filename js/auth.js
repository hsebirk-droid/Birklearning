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

// ==================== AUTENTICAÇÃO AUTOMÁTICA COM TOKEN ====================

/**
 * Verifica se existe um token válido na URL e autentica o utilizador automaticamente
 * @returns {Promise<boolean>} true se autenticou com sucesso
 */
async function authenticateWithToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenId = urlParams.get('t') || urlParams.get('token');
  
  if (!tokenId) return false;
  
  console.log("🔑 Tentando autenticar com token:", tokenId);
  
  // Tentar ler do localStorage
  let tokenData = null;
  const savedTokenData = localStorage.getItem(`token_${tokenId}`);
  if (savedTokenData) {
    try { 
      tokenData = JSON.parse(savedTokenData);
      console.log("📦 Token carregado do localStorage");
    } catch(e) {
      console.warn("Erro ao parsear token do localStorage:", e);
    }
  }
  
  // Tentar ler do Firestore se não encontrou no localStorage
  if (!tokenData && window.firebaseReady && window.db) {
    try {
      const doc = await window.db.collection('tokens').doc(tokenId).get();
      if (doc.exists) {
        tokenData = doc.data();
        localStorage.setItem(`token_${tokenId}`, JSON.stringify(tokenData));
        console.log("☁️ Token carregado do Firestore");
      }
    } catch(e) { 
      console.warn("Erro ao carregar token do Firestore:", e); 
    }
  }
  
  // Se encontrou token válido, autentica o utilizador
  if (tokenData && tokenData.user && tokenData.cursoId) {
    console.log("✅ Token válido! Autenticando:", tokenData.user);
    
    // Guardar sessão do colaborador
    localStorage.setItem('usuarioAtivo', tokenData.user);
    localStorage.setItem('usuarioNome', tokenData.nome || tokenData.user);
    localStorage.setItem('usuarioEmail', tokenData.email || '');
    localStorage.setItem('usuarioMatricula', tokenData.matricula || '');
    localStorage.setItem('cursoAtualId', tokenData.cursoId);
    
    return true;
  }
  
  console.warn("❌ Token inválido ou expirado");
  return false;
}

// ==================== RECUPERAÇÃO DE PASSWORD (3 PASSOS) ====================

/**
 * Passo 1: Verifica se o email existe para recuperação
 */
async function verifyEmailForRecovery(email) {
  if (!email) {
    return { success: false, message: 'Por favor, insira um email.' };
  }
  
  const colaboradores = await carregarColaboradores();
  const colaborador = colaboradores.find(c => 
    String(c.email || '').toLowerCase() === email.toLowerCase()
  );
  
  if (!colaborador) {
    return { success: false, message: 'Email não encontrado na base de dados.' };
  }
  
  return { 
    success: true, 
    message: 'Email verificado com sucesso.',
    colaborador: colaborador
  };
}

/**
 * Passo 2: Verifica se a matrícula corresponde ao email
 */
async function verifyMatriculaForRecovery(email, matricula) {
  if (!matricula || matricula.length !== 4) {
    return { success: false, message: 'A matrícula deve ter 4 dígitos.' };
  }
  
  if (!/^\d{4}$/.test(matricula)) {
    return { success: false, message: 'A matrícula deve conter apenas números.' };
  }
  
  const colaboradores = await carregarColaboradores();
  const colaborador = colaboradores.find(c => 
    String(c.email || '').toLowerCase() === email.toLowerCase()
  );
  
  if (!colaborador) {
    return { success: false, message: 'Email não encontrado.' };
  }
  
  const matriculaColab = String(colaborador.matricula || '').padStart(4, '0');
  
  if (matriculaColab !== matricula) {
    return { success: false, message: 'Número interno incorreto. Verifique e tente novamente.' };
  }
  
  return { 
    success: true, 
    message: 'Matrícula verificada com sucesso.',
    colaborador: colaborador
  };
}

/**
 * Passo 3: Guarda a nova password
 */
async function saveNewPassword(email, newPassword) {
  if (!email || !newPassword) {
    return { success: false, message: 'Email e nova password são obrigatórios.' };
  }
  
  if (newPassword.length < 6) {
    return { success: false, message: 'A password deve ter pelo menos 6 caracteres.' };
  }
  
  const colaboradores = await carregarColaboradores();
  const index = colaboradores.findIndex(c => 
    String(c.email || '').toLowerCase() === email.toLowerCase()
  );
  
  if (index === -1) {
    return { success: false, message: 'Colaborador não encontrado.' };
  }
  
  // Atualizar password no localStorage
  colaboradores[index].pass = newPassword;
  localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
  
  // Atualizar no Firestore se disponível
  if (window.firebaseReady && window.db) {
    try {
      const colaborador = colaboradores[index];
      await window.db.collection('colaboradores').doc(colaborador.id).update({
        pass: newPassword
      });
      console.log('☁️ Password atualizada no Firestore');
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar Firestore:', error);
    }
  }
  
  return { success: true, message: 'Password atualizada com sucesso!' };
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

window.authenticateWithToken = authenticateWithToken;

window.verifyEmailForRecovery = verifyEmailForRecovery;
window.verifyMatriculaForRecovery = verifyMatriculaForRecovery;
window.saveNewPassword = saveNewPassword;

console.log('✅ auth.js carregado com sucesso');
