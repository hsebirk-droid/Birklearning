// ============================================
// DASHBOARD - LÓGICA PRINCIPAL
// ============================================

let allCourses = [];
let userProgress = {};
let currentUser = null;
let currentFilter = 'todas';
let searchTerm = '';

function getSessionProgressKey() {
  const sessionKey = currentUser?.user || currentUser?.email || currentUser?.name || 'utilizador';
  return `progress_${sessionKey}`;
}

async function initDashboard() {
  console.log('🚀 Iniciando dashboard...');

  currentUser = window.getCurrentUser ? window.getCurrentUser() : null;

  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  if (currentUser.type === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  const welcomeMessage = document.getElementById('welcomeMessage');
  const userAvatar = document.getElementById('userAvatar');

  if (welcomeMessage) {
    const firstName = String(currentUser.name || 'Utilizador').split(' ')[0];
    welcomeMessage.innerHTML = `Bem-vindo de volta, ${firstName}! 👋`;
  }

  if (userAvatar) {
    userAvatar.textContent = String(currentUser.name || 'U').charAt(0).toUpperCase();
  }

  await loadCourses();
  setupEventListeners();
}

async function loadCourses() {
  const loadingDiv = document.getElementById('loading');
  const coursesGrid = document.getElementById('coursesGrid');

  if (!loadingDiv || !coursesGrid) return;

  loadingDiv.style.display = 'block';
  coursesGrid.style.display = 'none';

  // Carregar todas as formações
  if (window.firebaseReady && typeof window.carregarDoFirestore === 'function') {
    const firestoreCourses = await window.carregarDoFirestore('formacoes');
    allCourses = Array.isArray(firestoreCourses) && firestoreCourses.length
      ? firestoreCourses
      : JSON.parse(localStorage.getItem('formacoes') || '[]');
  } else {
    allCourses = JSON.parse(localStorage.getItem('formacoes') || '[]');
  }

  // ✅ CORREÇÃO: Filtrar apenas formações ATRIBUÍDAS a este colaborador
  await filtrarApenasAtribuidas();
  
  loadUserProgress();
  updateUserStats();
  renderCourses();

  loadingDiv.style.display = 'none';
  coursesGrid.style.display = 'grid';
}
async function filtrarApenasAtribuidas() {
  // Identificar o utilizador atual
  const userIdentifier = currentUser?.user || currentUser?.email || currentUser?.name || '';
  
  console.log('🔍 Filtrando formações para:', userIdentifier);
  
  // Carregar atribuições
  let atribuicoesData = [];
  if (window.firebaseReady && window.db) {
    try {
      const snapshot = await window.db.collection('atribuicoes').get();
      atribuicoesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('⚠️ Erro ao carregar atribuições do Firestore, usando localStorage');
      atribuicoesData = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
    }
  } else {
    atribuicoesData = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
  }
  
  // Filtrar atribuições deste colaborador
  const minhasAtribuicoes = atribuicoesData.filter(a => {
    const userMatch = a.colaboradorUser === userIdentifier;
    const emailMatch = a.colaboradorEmail?.toLowerCase() === userIdentifier?.toLowerCase();
    const nomeMatch = a.colaboradorNome === userIdentifier;
    return userMatch || emailMatch || nomeMatch;
  });
  
  console.log('📋 Atribuições encontradas:', minhasAtribuicoes.length);
  
  if (minhasAtribuicoes.length === 0) {
    // Se não tem atribuições, não vê nenhuma formação
    allCourses = [];
    console.log('ℹ️ Nenhuma formação atribuída a este colaborador');
    return;
  }
  
  // Extrair IDs das formações atribuídas
  const cursosAtribuidosIds = [...new Set(minhasAtribuicoes.map(a => a.cursoId))];
  
  // Filtrar apenas as formações atribuídas
  allCourses = allCourses.filter(curso => cursosAtribuidosIds.includes(curso.id));
  
  console.log('✅ Formações atribuídas:', allCourses.length);
  console.log('📚 IDs atribuídos:', cursosAtribuidosIds);
}

function loadUserProgress() {
  const saved = localStorage.getItem(getSessionProgressKey());

  if (!saved) {
    userProgress = {};
    return;
  }

  try {
    userProgress = JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao carregar progresso do utilizador:', e);
    userProgress = {};
  }
}

function calculateCourseProgress(curso) {
  if (!curso || !curso.id) return 0;

  const progress = userProgress[curso.id];
  if (progress?.completed) return 100;

  if (progress?.modulesCompleted) {
    const totalModules = curso.modulos?.length || 1;
    return Math.round((progress.modulesCompleted / totalModules) * 100);
  }

  return 0;
}

function updateUserStats() {
  let completed = 0;
  let inProgress = 0;

  allCourses.forEach((curso) => {
    const progress = calculateCourseProgress(curso);
    if (progress === 100) completed++;
    else if (progress > 0) inProgress++;
  });

  document.getElementById('coursesCompleted').textContent = completed;
  document.getElementById('coursesInProgress').textContent = inProgress;
  document.getElementById('certificatesCount').textContent = completed;
}

function getFilteredCourses() {
  let filtered = [...allCourses];

  if (currentFilter === 'concluidas') {
    filtered = filtered.filter((c) => calculateCourseProgress(c) === 100);
  } else if (currentFilter === 'em_andamento') {
    filtered = filtered.filter((c) => {
      const p = calculateCourseProgress(c);
      return p > 0 && p < 100;
    });
  }

  if (searchTerm) {
    filtered = filtered.filter((c) =>
      String(c.nome || '').toLowerCase().includes(searchTerm) ||
      String(c.descricao || '').toLowerCase().includes(searchTerm)
    );
  }

  return filtered;
}

function renderCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  const filtered = getFilteredCourses();

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h4>Nenhuma formação encontrada</h4>
        <p>Não há formações disponíveis no momento.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((curso) => {
    const progress = calculateCourseProgress(curso);
    const completed = progress === 100;
    const modulesCount = curso.modulos?.length || 0;

    let btnText = '📖 Iniciar';
    let btnClass = '';
    if (completed) {
      btnText = '🎓 Ver Certificado';
      btnClass = 'completed';
    } else if (progress > 0) {
      btnText = '▶ Continuar';
      btnClass = 'continue';
    }

    return `
      <div class="course-card">
        <div class="course-cover" onclick="window.entrarFormacao('${curso.id}')">
          <span>${curso.icone || '📖'}</span>
          <span class="course-badge">${curso.duracao || '30 min'}</span>
        </div>
        <div class="course-body" onclick="window.entrarFormacao('${curso.id}')">
          <div class="course-title">${window.escapeHtml(curso.nome)}</div>
          <div class="course-desc">${window.escapeHtml((curso.descricao || '').substring(0, 100))}</div>
          <div class="course-meta">
            <span><i class="fas fa-layer-group"></i> ${modulesCount} módulos</span>
            <span><i class="fas fa-question-circle"></i> ${curso.perguntas?.length || 0} questões</span>
          </div>
          ${!completed ? `
            <div class="course-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <div class="progress-text">${progress}% concluído</div>
            </div>
          ` : `
            <div style="margin-top: 12px; color: var(--success); font-size: 12px;">
              <i class="fas fa-check-circle"></i> Concluído
            </div>
          `}
        </div>
        <div class="btn-start ${btnClass}" onclick="window.entrarFormacao('${curso.id}')">${btnText}</div>
      </div>
    `;
  }).join('');
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = String(e.target.value || '').toLowerCase();
      renderCourses();
    });
  }

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((item) => item.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCourses();
    });
  });

  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');

  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown?.classList.toggle('show');
    });
  }

  document.addEventListener('click', () => {
    userDropdown?.classList.remove('show');
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Deseja sair da plataforma?')) {
        await window.logout();
      }
    });
  }

  window.addEventListener('click', (e) => {
    const profileModal = document.getElementById('profileModal');
    const completedModal = document.getElementById('completedModal');

    if (e.target === profileModal) profileModal.classList.remove('show');
    if (e.target === completedModal) completedModal.classList.remove('show');
  });
}

window.entrarFormacao = function(cursoId) {
  localStorage.setItem('cursoAtualId', cursoId);
  window.location.href = 'formacao.html';
};

window.openProfileModal = function() {
  const modal = document.getElementById('profileModal');
  if (!modal || !currentUser) return;

  document.getElementById('profileName').textContent = currentUser.name || '—';
  document.getElementById('profileEmail').textContent = currentUser.email || '—';
  document.getElementById('profileMatricula').textContent = `Matrícula: ${currentUser.matricula || '—'}`;
  document.getElementById('profileAvatar').textContent = String(currentUser.name || 'U').charAt(0).toUpperCase();
  modal.classList.add('show');
};

window.closeProfileModal = function() {
  document.getElementById('profileModal')?.classList.remove('show');
};

window.openCompletedModal = function() {
  const modal = document.getElementById('completedModal');
  const list = document.getElementById('completedList');

  if (!modal || !list) return;

  const completed = allCourses.filter((c) => calculateCourseProgress(c) === 100);

  if (!completed.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--birkenstock-gray);">Nenhuma formação concluída.</div>';
  } else {
    list.innerHTML = completed.map((curso) => `
      <div class="completed-item">
        <div class="completed-icon"><i class="fas fa-check-circle"></i></div>
        <div class="completed-info">
          <div class="completed-title">${window.escapeHtml(curso.nome)}</div>
          <div class="completed-date">Concluído em ${userProgress[curso.id]?.completedAt || '—'}</div>
        </div>
        <button class="completed-btn" onclick="window.entrarFormacao('${curso.id}')">Ver</button>
      </div>
    `).join('');
  }

  modal.classList.add('show');
};

window.closeCompletedModal = function() {
  document.getElementById('completedModal')?.classList.remove('show');
};

document.addEventListener('DOMContentLoaded', initDashboard);
