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
// ==================== RECUPERAÇÃO DE PASSWORD ====================

/**
 * Envia um email de recuperação de password
 * @param {string} email - Email do utilizador
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendPasswordResetEmail(email) {
  if (!email) {
    return { success: false, message: 'Por favor, insira um email.' };
  }
  
  // Verificar se o email existe nos colaboradores
  const colaboradores = await carregarColaboradores();
  const colaborador = colaboradores.find(c => 
    String(c.email || '').toLowerCase() === email.toLowerCase()
  );
  
  if (!colaborador) {
    return { success: false, message: 'Email não encontrado na base de dados.' };
  }
  
  // Tentar enviar pelo Firebase Auth
  if (window.firebaseReady && window.auth) {
    try {
      await window.auth.sendPasswordResetEmail(email, {
        url: window.location.origin + '/reset-password.html',
        handleCodeInApp: true
      });
      return { 
        success: true, 
        message: 'Email de recuperação enviado! Verifique a sua caixa de entrada.' 
      };
    } catch (error) {
      console.warn('Firebase password reset failed:', error.message);
      // Continua para o fallback
    }
  }
  
  // Fallback: Gerar token local para recuperação
  const resetToken = gerarTokenSeguro({ 
    email: email, 
    userId: colaborador.id,
    exp: Date.now() + 3600000 // 1 hora
  });
  
  localStorage.setItem(`reset_${email}`, resetToken);
  
  // Gerar link de recuperação local
  const resetLink = `${window.location.origin}${window.location.pathname.replace('login.html', '')}reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
  
  // Abrir cliente de email com o link
  const assunto = 'Birkenstock - Recuperação de Password';
  const corpo = `Olá ${colaborador.nome},\n\nRecebemos um pedido para redefinir a sua password.\n\nClique no link abaixo para criar uma nova password (válido por 1 hora):\n\n${resetLink}\n\nSe não foi você que solicitou, ignore este email.\n\nAtenciosamente,\nEquipa Birkenstock S&CC Portugal`;
  
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  
  return { 
    success: true, 
    message: 'A abrir cliente de email com instruções de recuperação.' 
  };
}

/**
 * Gera um token seguro para recuperação de password
 * @param {object} dados - Dados a incluir no token
 * @returns {string} Token seguro
 */
function gerarTokenSeguro(dados) {
  try {
    const jsonStr = JSON.stringify(dados);
    const encoder = new TextEncoder();
    const utf8Bytes = encoder.encode(jsonStr);
    let base64 = '';
    const chunk = 0x8000;
    for (let i = 0; i < utf8Bytes.length; i += chunk) {
      const slice = utf8Bytes.subarray(i, i + chunk);
      base64 += String.fromCharCode.apply(null, slice);
    }
    base64 = btoa(base64);
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return base64;
  } catch(e) {
    console.error('Erro ao gerar token:', e);
    const jsonStr = JSON.stringify(dados);
    let base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return base64;
  }
}

/**
 * Valida um token de recuperação de password
 * @param {string} token - Token a validar
 * @param {string} email - Email associado ao token
 * @returns {boolean} true se o token for válido
 */
function validateResetToken(token, email) {
  try {
    // Decodificar o token base64
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    
    const decoder = new TextDecoder('utf-8');
    const jsonStr = decoder.decode(bytes);
    const dados = JSON.parse(jsonStr);
    
    // Verificar email
    if (dados.email !== email) return false;
    
    // Verificar expiração (1 hora)
    if (dados.exp && Date.now() > dados.exp) return false;
    
    return true;
  } catch (e) {
    console.error('Erro ao validar token:', e);
    return false;
  }
}

/**
 * Redefine a password do utilizador
 * @param {string} email - Email do utilizador
 * @param {string} newPassword - Nova password
 * @param {string} token - Token de validação
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function resetPassword(email, newPassword, token) {
  if (!email || !newPassword) {
    return { success: false, message: 'Email e nova password são obrigatórios.' };
  }
  
  if (newPassword.length < 6) {
    return { success: false, message: 'A password deve ter pelo menos 6 caracteres.' };
  }
  
  // Validar token
  const savedToken = localStorage.getItem(`reset_${email}`);
  if (savedToken !== token) {
    return { success: false, message: 'Token inválido ou expirado.' };
  }
  
  // Validar estrutura do token
  if (!validateResetToken(token, email)) {
    return { success: false, message: 'Link de recuperação inválido ou expirado.' };
  }
  
  // Atualizar no localStorage
  const colaboradores = await carregarColaboradores();
  const index = colaboradores.findIndex(c => 
    String(c.email || '').toLowerCase() === email.toLowerCase()
  );
  
  if (index === -1) {
    return { success: false, message: 'Colaborador não encontrado.' };
  }
  
  // Atualizar password
  colaboradores[index].pass = newPassword;
  localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
  
  // Atualizar no Firestore se disponível
  if (window.firebaseReady && window.db) {
    try {
      await window.db.collection('colaboradores').doc(colaboradores[index].id).update({
        pass: newPassword
      });
      console.log('☁️ Password atualizada no Firestore');
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar Firestore:', error);
    }
  }
  
  // Remover token usado
  localStorage.removeItem(`reset_${email}`);
  
  return { success: true, message: 'Password atualizada com sucesso!' };
}

// Expor funções globalmente
window.sendPasswordResetEmail = sendPasswordResetEmail;
window.resetPassword = resetPassword;
window.validateResetToken = validateResetToken;
console.log('✅ auth.js carregado com sucesso');
