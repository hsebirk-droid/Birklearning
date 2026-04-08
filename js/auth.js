// ============================================
// AUTH - GESTÃO DE AUTENTICAÇÃO (SEM GOOGLE)
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

function inicializarDados() {
  if (!localStorage.getItem('colaboradores')) {
    const colaboradores = [
      { id: 'c1', matricula: '001', user: 'joao.silva', nome: 'João Silva', email: 'joao.silva@birkenstock.pt', pass: '123456' },
      { id: 'c2', matricula: '002', user: 'maria.santos', nome: 'Maria Santos', email: 'maria.santos@birkenstock.pt', pass: '123456' }
    ];
    localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
  }

  if (!localStorage.getItem('formacoes')) {
    const formacoes = [
      {
        id: '1',
        nome: 'Atendimento ao Cliente',
        descricao: 'Aprenda técnicas de atendimento ao cliente.',
        duracao: '45 minutos',
        icone: '💬',
        modulos: [
          { id: 'm1', titulo: 'Introdução', tipo: 'video', conteudo: { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }, duracao: '10 min' }
        ],
        perguntas: [
          { texto: 'Qual é a primeira impressão?', opcoes: ['Olhar nos olhos', 'Sorriso', 'Postura correta', 'Todas as anteriores'], correta: 'D' }
        ]
      }
    ];
    localStorage.setItem('formacoes', JSON.stringify(formacoes));
  }
}

async function carregarColaboradores() {
  inicializarDados();

  if (window.firebaseReady && typeof window.carregarDoFirestore === 'function') {
    const firestoreData = await window.carregarDoFirestore('colaboradores');
    if (Array.isArray(firestoreData) && firestoreData.length) {
      return firestoreData;
    }
  }

  return JSON.parse(localStorage.getItem('colaboradores') || '[]');
}

async function guardarColaborador(colaborador) {
  const colaboradores = JSON.parse(localStorage.getItem('colaboradores') || '[]');
  const index = colaboradores.findIndex((item) => item.id === colaborador.id || item.email === colaborador.email);

  if (index >= 0) {
    colaboradores[index] = { ...colaboradores[index], ...colaborador };
  } else {
    colaboradores.push(colaborador);
  }

  localStorage.setItem('colaboradores', JSON.stringify(colaboradores));

  if (window.firebaseReady && typeof window.salvarNoFirestore === 'function') {
    await window.salvarNoFirestore('colaboradores', colaborador, colaborador.id);
  }
}

async function loginColaborador(emailOuUser, pass) {
  const identifier = String(emailOuUser || '').trim().toLowerCase();
  if (!identifier || !pass) return false;

  const colaboradores = await carregarColaboradores();

  // Tentar login Firebase (apenas email/password - sem Google)
  if (window.firebaseReady && identifier.includes('@') && window.auth) {
    try {
      const cred = await window.auth.signInWithEmailAndPassword(identifier, pass);
      const firebaseUser = cred.user;
      const email = (firebaseUser?.email || identifier).toLowerCase();

      if (window.isAdminEmail?.(email)) {
        persistAdminSession(firebaseUser?.displayName || 'Administrador', email);
        return true;
      }

      let found = colaboradores.find((c) => String(c.email || '').toLowerCase() === email);
      if (!found) {
        found = {
          id: firebaseUser.uid,
          matricula: '',
          user: generateUsername(firebaseUser.displayName, email),
          nome: firebaseUser.displayName || email,
          email,
          provider: 'password',
          dataCriacao: new Date().toISOString()
        };
        await guardarColaborador(found);
      }

      persistCollaboratorSession(found);
      return true;
    } catch (error) {
      console.warn('⚠️ Login Firebase falhou, a tentar fallback local:', error?.message || error);
    }
  }

  // Fallback para login local
  const found = colaboradores.find((c) => {
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
      email,
      matricula,
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

function getColaboradores() {
  inicializarDados();
  return JSON.parse(localStorage.getItem('colaboradores') || '[]');
}

window.loginColaborador = loginColaborador;
window.loginAdmin = loginAdmin;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.logout = logout;
window.getColaboradores = getColaboradores;
window.generateUsername = generateUsername;

console.log('✅ auth.js carregado com sucesso (sem Google Auth)');
