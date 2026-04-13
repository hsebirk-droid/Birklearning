// ============================================
// DASHBOARD - LÓGICA PRINCIPAL (VERSÃO CORRIGIDA)
// ============================================

let allCourses = [];
let userProgress = {};
let currentUser = null;
let currentFilter = 'todas';
let searchTerm = '';
let currentCertificateData = null;

function getSessionProgressKey() {
  const sessionKey = currentUser?.user || currentUser?.email || currentUser?.name || 'utilizador';
  return `progress_${sessionKey}`;
}

async function loadCourses() {
  const loadingDiv = document.getElementById('loading');
  const coursesGrid = document.getElementById('coursesGrid');

  if (!loadingDiv || !coursesGrid) return;

  loadingDiv.style.display = 'block';
  coursesGrid.style.display = 'none';

  try {
    if (window.firebaseReady && window.db) {
      try {
        const snapshot = await window.db.collection('formacoes').get();
        allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('✅ Formações carregadas do Firestore:', allCourses.length);
      } catch (firestoreError) {
        console.warn('⚠️ Firestore falhou, usando localStorage:', firestoreError.message);
        allCourses = JSON.parse(localStorage.getItem('formacoes') || '[]');
      }
    } else {
      console.log('📦 Firestore indisponível, usando localStorage');
      allCourses = JSON.parse(localStorage.getItem('formacoes') || '[]');
    }
  } catch (error) {
    console.error('❌ Erro geral, usando localStorage:', error);
    allCourses = JSON.parse(localStorage.getItem('formacoes') || '[]');
  }

  console.log('📚 Formações carregadas:', allCourses.length);

  await filtrarApenasAtribuidas();
  
  loadUserProgress();
  updateUserStats();
  renderCourses();

  loadingDiv.style.display = 'none';
  coursesGrid.style.display = 'grid';
}

async function initDashboard() {
  console.log('🚀 Iniciando dashboard...');
  
  // ✅ Verificar primeiro se tem token na URL
  const urlParams = new URLSearchParams(window.location.search);
  const tokenId = urlParams.get('t') || urlParams.get('token');
  
  if (tokenId) {
    // Se tem token, redireciona para a formação
    console.log("🔑 Token encontrado, redirecionando para formação...");
    window.location.href = 'formacao.html' + window.location.search;
    return;
  }

  currentUser = window.getCurrentUser ? window.getCurrentUser() : null;

  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  if (currentUser.type === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  // ... resto do código
}
async function filtrarApenasAtribuidas() {
  const userIdentifier = currentUser?.user || currentUser?.email || currentUser?.name || '';
  
  console.log('🔍 Filtrando formações para:', userIdentifier);
  
  let atribuicoesData = [];
  
  try {
    if (window.firebaseReady && window.db) {
      try {
        const snapshot = await window.db.collection('atribuicoes').get();
        atribuicoesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        atribuicoesData = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
      }
    } else {
      atribuicoesData = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
    }
  } catch (e) {
    atribuicoesData = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
  }
  
  console.log('📋 Total de atribuições:', atribuicoesData.length);
  
  const minhasAtribuicoes = atribuicoesData.filter(a => {
    const userMatch = a.colaboradorUser === userIdentifier;
    const emailMatch = a.colaboradorEmail?.toLowerCase() === userIdentifier?.toLowerCase();
    const nomeMatch = a.colaboradorNome === userIdentifier;
    return userMatch || emailMatch || nomeMatch;
  });
  
  console.log('📋 Minhas atribuições:', minhasAtribuicoes.length);
  
  // Guardar prazos para uso nos cards
  window.minhasAtribuicoesMap = {};
  minhasAtribuicoes.forEach(a => {
    window.minhasAtribuicoesMap[a.cursoId] = a;
  });
  
  if (minhasAtribuicoes.length === 0) {
    allCourses = [];
    console.log('ℹ️ Nenhuma formação atribuída a este colaborador');
    return;
  }
  
  const cursosAtribuidosIds = [...new Set(minhasAtribuicoes.map(a => a.cursoId))];
  console.log('🎯 IDs atribuídos:', cursosAtribuidosIds);
  
  allCourses = allCourses.filter(curso => cursosAtribuidosIds.includes(curso.id));
  
  console.log('✅ Formações após filtro:', allCourses.length);
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

  const coursesCompletedEl = document.getElementById('coursesCompleted');
  const coursesInProgressEl = document.getElementById('coursesInProgress');
  const certificatesCountEl = document.getElementById('certificatesCount');
  
  if (coursesCompletedEl) coursesCompletedEl.textContent = completed;
  if (coursesInProgressEl) coursesInProgressEl.textContent = inProgress;
  if (certificatesCountEl) certificatesCountEl.textContent = completed;
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
      String(c.nome || '').toLowerCase().includes(searchTerm)
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
    const atribuicao = window.minhasAtribuicoesMap?.[curso.id];
    const prazo = atribuicao?.prazo || 'Não definido';

    let cardContent = '';
    
    if (completed) {
      // Formação CONCLUÍDA - apenas título e botões de certificado
      cardContent = `
        <div class="course-card completed-course">
          <div class="course-cover" style="background: linear-gradient(135deg, var(--success), #059669);">
            <span>🎓</span>
            <span class="course-badge">Concluído</span>
          </div>
          <div class="course-body">
            <div class="course-title">${window.escapeHtml(curso.nome)}</div>
            <div style="margin-top: 12px; color: var(--success); font-size: 12px;">
              <i class="fas fa-check-circle"></i> Formação concluída
            </div>
          </div>
          <div style="display: flex; gap: 8px; padding: 16px;">
            <button class="btn-start completed" onclick="window.viewCertificateFromDashboard('${curso.id}')" style="flex: 1;">
              <i class="fas fa-certificate"></i> Ver Certificado
            </button>
            <button class="btn-start" onclick="window.downloadCertificateFromDashboard('${curso.id}')" style="flex: 1; background: var(--info);">
              <i class="fas fa-download"></i> Download PDF
            </button>
          </div>
        </div>
      `;
    } else {
      // Formação NÃO CONCLUÍDA - título, prazo, sem conteúdo programático
      const modulesCount = curso.modulos?.length || 0;
      let btnText = progress > 0 ? '▶ Continuar' : '📖 Iniciar';
      let btnClass = progress > 0 ? 'continue' : '';
      
      // ✅ Extrair primeiras palavras do conteúdo programático para preview
const conteudoPreview = (curso.conteudoProgramatico || curso.descricao || '').substring(0, 80) + '...';

cardContent = `
  <div class="course-card">
    <div class="course-cover" onclick="window.entrarFormacao('${curso.id}')">
      <span>${curso.icone || '📖'}</span>
      <span class="course-badge">${curso.duracao || '30 min'}</span>
    </div>
    <div class="course-body" onclick="window.entrarFormacao('${curso.id}')">
      <div class="course-title">${window.escapeHtml(curso.nome)}</div>
      <div class="course-desc" style="font-size: 12px; color: var(--birkenstock-gray); margin: 8px 0; line-height: 1.4;">
        ${window.escapeHtml(conteudoPreview)}
      </div>
      <div class="course-prazo" style="font-size: 12px; color: var(--birkenstock-blue); margin: 8px 0;">
        <i class="far fa-calendar-alt"></i> Prazo: ${window.escapeHtml(prazo)}
      </div>
      <div class="course-meta">
        <span><i class="fas fa-layer-group"></i> ${modulesCount} módulos</span>
        <span><i class="fas fa-question-circle"></i> ${curso.perguntas?.length || 0} questões</span>
      </div>
            ${progress > 0 ? `
              <div class="course-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-text">${progress}% concluído</div>
              </div>
            ` : ''}
          </div>
          <div class="btn-start ${btnClass}" onclick="window.entrarFormacao('${curso.id}')">${btnText}</div>
        </div>
      `;
    }
    
    return cardContent;
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
        window.location.href = 'login.html';
      }
    });
  }

  window.addEventListener('click', (e) => {
    const profileModal = document.getElementById('profileModal');
    const allCertificatesModal = document.getElementById('allCertificatesModal');
    const certificateModal = document.getElementById('certificateModal');

    if (e.target === profileModal) profileModal.classList.remove('show');
    if (e.target === allCertificatesModal) allCertificatesModal.classList.remove('show');
    if (e.target === certificateModal) certificateModal.classList.remove('show');
  });
}

// ==================== CERTIFICADOS ====================

window.openAllCertificatesModal = function() {
  const modal = document.getElementById('allCertificatesModal');
  const list = document.getElementById('allCertificatesList');
  
  if (!modal || !list) return;
  
  const historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  const meusCertificados = historicos.filter(h => 
    h.nome === currentUser?.user || 
    h.nomeDisplay === currentUser?.name || 
    h.email === currentUser?.email
  );
  
  if (!meusCertificados.length) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--birkenstock-gray);">Nenhum certificado disponível.</div>';
  } else {
    list.innerHTML = meusCertificados.map((cert, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border);">
        <div>
          <strong>${window.escapeHtml(cert.curso)}</strong>
          <div style="font-size: 12px; color: var(--birkenstock-gray);">Concluído em ${cert.data} · Nota: ${cert.nota}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-sm" onclick="window.viewCertificateFromHistory('${cert.id}')" style="background: var(--info);">
            <i class="fas fa-eye"></i> Ver
          </button>
          <button class="btn-sm" onclick="window.downloadCertificateFromHistory('${cert.id}')" style="background: var(--success);">
            <i class="fas fa-download"></i> PDF
          </button>
        </div>
      </div>
    `).join('');
  }
  
  modal.classList.add('show');
};

window.closeAllCertificatesModal = function() {
  document.getElementById('allCertificatesModal')?.classList.remove('show');
};

window.viewCertificateFromDashboard = function(cursoId) {
  const historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  const cert = historicos.find(h => 
    h.cursoId === cursoId && 
    (h.nome === currentUser?.user || h.nomeDisplay === currentUser?.name)
  );
  if (cert) {
    showCertificateInModal(cert);
  } else {
    window.showToast('❌ Certificado não encontrado.');
  }
};

window.viewCertificateFromHistory = function(historicoId) {
  const historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  const cert = historicos.find(h => h.id === historicoId);
  if (cert) {
    showCertificateInModal(cert);
  }
};

window.downloadCertificateFromDashboard = function(cursoId) {
  const historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  const cert = historicos.find(h => 
    h.cursoId === cursoId && 
    (h.nome === currentUser?.user || h.nomeDisplay === currentUser?.name)
  );
  if (cert) {
    currentCertificateData = cert;
    setTimeout(() => downloadCertificatePDF(), 500);
  }
};

window.downloadCertificateFromHistory = function(historicoId) {
  const historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  const cert = historicos.find(h => h.id === historicoId);
  if (cert) {
    currentCertificateData = cert;
    setTimeout(() => downloadCertificatePDF(), 500);
  }
};

function showCertificateInModal(cert) {
  currentCertificateData = cert;
  
  // Buscar a formação para obter a duração
  const formacoes = JSON.parse(localStorage.getItem('formacoes') || '[]');
  const formacao = formacoes.find(f => f.id === cert.cursoId);
  const duracaoFormacao = formacao?.duracao || '—';
  
  const fundoImagem = 'assets/fundo_certificado.png';
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image:url('${fundoImagem}');background-size:cover;background-position:center;width:100%;aspect-ratio:210/297;padding:40px;box-sizing:border-box;">
      <div style="text-align:center;height:100%;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:900;color:#00338D;margin-bottom:10px;">${window.escapeHtml(cert.nomeDisplay || cert.nome)}</div>
        <div style="font-size:1.2rem;margin:20px 0;color:#616365;">concluiu com sucesso a formação</div>
        <div style="font-family:'Fraunces',serif;font-size:1.5rem;font-weight:700;color:#C5A059;margin-bottom:20px;">${window.escapeHtml(cert.curso)}</div>
        <div style="margin-top:30px;display:flex;justify-content:center;gap:40px;flex-wrap:wrap;">
          <div><div style="font-size:0.7rem;">NOTA FINAL</div><div style="font-size:1.3rem;font-weight:700;">${cert.nota}</div></div>
          <div><div style="font-size:0.7rem;">DURAÇÃO</div><div style="font-size:1rem;">${window.escapeHtml(duracaoFormacao)}</div></div>
          <div><div style="font-size:0.7rem;">DATA</div><div style="font-size:1rem;">${cert.data}</div></div>
          <div><div style="font-size:0.7rem;">CERTIFICADO ID</div><div style="font-family:monospace;font-size:0.9rem;">${cert.certificadoId || 'CERT-' + Date.now()}</div></div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('certificateViewer').innerHTML = certHtml;
  document.getElementById('certificateModal').classList.add('show');
}

window.closeCertificateModal = function() {
  document.getElementById('certificateModal')?.classList.remove('show');
};

window.downloadCertificateFromModal = function() {
  downloadCertificatePDF();
};

window.printCertificateFromModal = function() {
  const element = document.getElementById('certificado-visualizacao-pdf');
  if (!element) return;
  
  html2canvas(element, { scale: 3 }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><body style="margin:0;"><img src="${imgData}" style="width:100%;"></body><script>window.onload=function(){window.print();setTimeout(window.close,1000);}<\/script>`);
    printWindow.document.close();
  });
};

function downloadCertificatePDF() {
  const modal = document.getElementById('certificateModal');
  const wasOpen = modal?.classList.contains('show');
  
  if (!wasOpen && currentCertificateData) {
    showCertificateInModal(currentCertificateData);
  }
  
  setTimeout(() => {
    const element = document.getElementById('certificado-visualizacao-pdf');
    if (!element) return;
    
    html2canvas(element, { scale: 3 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificado_${currentCertificateData?.nomeDisplay || 'colaborador'}.pdf`);
      window.showToast('✅ PDF guardado!');
      
      if (!wasOpen) {
        document.getElementById('certificateModal')?.classList.remove('show');
      }
    });
  }, 300);
}

// ==================== PERFIL ====================

window.openProfileModal = function() {
  const modal = document.getElementById('profileModal');
  if (!modal || !currentUser) return;

  document.getElementById('profileName').textContent = currentUser.name || '—';
  document.getElementById('profileEmail').textContent = currentUser.email || '—';
  document.getElementById('profileMatricula').textContent = `Matrícula / Nº Interno: ${currentUser.matricula || '—'}`;
  document.getElementById('profileAvatar').textContent = String(currentUser.name || 'U').charAt(0).toUpperCase();
  modal.classList.add('show');
};

window.closeProfileModal = function() {
  document.getElementById('profileModal')?.classList.remove('show');
};

// ==================== ENTRAR FORMAÇÃO ====================

window.entrarFormacao = function(cursoId) {
  localStorage.setItem('cursoAtualId', cursoId);
  window.location.href = 'formacao.html';
};

document.addEventListener('DOMContentLoaded', initDashboard);
console.log('✅ dashboard.js carregado - versão corrigida');
