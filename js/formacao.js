// ============================================
// FORMAÇÃO - LÓGICA PRINCIPAL
// ============================================

let modules = [];
let perguntas = [];
let completedModules = {};
let quizPassed = false;
let cursoId = null;
let nomeUser = '';
let nomeUserDisplay = '';
let userEmail = '';
let cursoData = {};
let respostas = {};
let totalPerguntas = 0;

// ==================== INICIALIZAÇÃO ====================
async function initFormacao() {
  console.log("🚀 Iniciando página de formação...");
  
  // Verificar autenticação
  if (!window.checkAuth || !window.checkAuth()) {
    window.location.href = 'login.html';
    return;
  }
  
  // Tentar ler token da URL (acesso via link de atribuição)
  const tokenData = lerTokenUrl();
  
  if (tokenData && tokenData.user && tokenData.cursoId) {
    console.log("🔑 Token válido encontrado para:", tokenData.user);
    
    // Verificar prazo
    if (tokenData.prazo && !validarPrazo(tokenData.prazo)) {
      window.showToast('❌ Este link expirou. Contacte o RH.');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
      return;
    }
    
    // Configurar sessão temporária
    localStorage.setItem('usuarioAtivo', tokenData.user);
    localStorage.setItem('usuarioNome', tokenData.nome || tokenData.user);
    nomeUser = tokenData.user;
    nomeUserDisplay = tokenData.nome || tokenData.user;
    userEmail = tokenData.email || '';
    
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay) userNameDisplay.textContent = nomeUserDisplay;
    
    const prazoElement = document.getElementById('prazo-data');
    if (prazoElement && tokenData.prazo) {
      prazoElement.textContent = tokenData.prazo;
    }
    
    await carregarFormacao(tokenData.cursoId);
    return;
  }
  
  // Sem token - verificar sessão normal
  console.log("🔍 Sem token, verificando sessão normal...");
  
  const user = window.getCurrentUser();
  if (!user || user.type !== 'colaborador') {
    window.location.href = 'login.html';
    return;
  }
  
  nomeUser = user.user || user.email || user.name;
  nomeUserDisplay = user.name || nomeUser;
  userEmail = user.email || '';
  const userNameDisplay = document.getElementById('user-name-display');
  if (userNameDisplay) userNameDisplay.textContent = nomeUserDisplay;
  
  const cursoIdStorage = localStorage.getItem('cursoAtualId');
  if (cursoIdStorage) {
    await carregarFormacao(cursoIdStorage);
  } else {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
      loadingDiv.innerHTML = '❌ Nenhuma formação selecionada.<br><br><a href="dashboard.html" style="color: var(--info);">← Voltar ao Dashboard</a>';
    }
  }
}

// ==================== LEITURA DE TOKEN ====================
ffunction lerTokenUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token') || urlParams.get('t');
    
    if (!token) {
        console.log("🔍 Nenhum token encontrado na URL");
        return null;
    }
    
    console.log("🔑 Token encontrado");
    
    // Tentar ler do localStorage primeiro
    const savedTokenData = localStorage.getItem(`token_${token}`);
    if (savedTokenData) {
        try {
            return JSON.parse(savedTokenData);
        } catch(e) {
            console.warn("Erro ao parse token salvo:", e);
        }
    }
    
    // Decodificar token
    try {
        // 1. Restaurar caracteres base64
        let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
        
        // 2. Adicionar padding se necessário
        while (base64.length % 4) {
            base64 += '=';
        }
        
        // 3. Decodificar base64
        const utf8Str = atob(base64);
        
        // 4. Decodificar URI
        const jsonStr = decodeURIComponent(utf8Str);
        
        // 5. Parse JSON
        const parsed = JSON.parse(jsonStr);
        
        if (parsed && parsed.user && parsed.cursoId) {
            console.log("✅ Token decodificado:", parsed.user, parsed.cursoId);
            localStorage.setItem(`token_${token}`, JSON.stringify(parsed));
            return parsed;
        }
    } catch(e) {
        console.warn("⚠️ Erro ao decodificar token:", e.message);
    }
    
    return null;
}

function validarPrazo(prazoStr) {
  if (!prazoStr) return true;
  
  try {
    let prazoDate;
    
    if (prazoStr.includes('/')) {
      const partes = prazoStr.split('/');
      if (partes.length === 3) {
        prazoDate = new Date(partes[2], partes[1] - 1, partes[0]);
      } else {
        prazoDate = new Date(prazoStr);
      }
    } else {
      prazoDate = new Date(prazoStr);
    }
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    prazoDate.setHours(23, 59, 59, 999);
    
    return !isNaN(prazoDate.getTime()) && prazoDate >= hoje;
  } catch(e) {
    console.error('Erro ao validar prazo:', e);
    return true;
  }
}

// ==================== CARREGAR FORMAÇÃO ====================
async function carregarFormacao(id) {
  const loadingDiv = document.getElementById('loading');
  const modulesContainer = document.getElementById('modules-container');
  
  if (!loadingDiv || !modulesContainer) return;
  
  loadingDiv.style.display = 'block';
  modulesContainer.style.display = 'none';
  
  if (!id) {
    loadingDiv.innerHTML = '❌ Nenhuma formação selecionada.<br><br><a href="dashboard.html" style="color: var(--info);">← Voltar</a>';
    return;
  }
  
  cursoId = id;
  console.log("📚 Carregando formação ID:", id);
  
  // Carregar dados da formação
  const formacoes = window.firebaseReady && typeof window.carregarDoFirestore === 'function'
    ? await window.carregarDoFirestore('formacoes')
    : JSON.parse(localStorage.getItem('formacoes') || '[]');
  const data = formacoes.find(f => f.id === id);
  
  if (data) {
    cursoData = {
      nome: data.nome,
      duracao: data.duracao,
      descricao: data.descricao
    };
    modules = data.modulos || [];
    perguntas = data.perguntas || [];
    totalPerguntas = perguntas.length;
    
    console.log("✅ Formação carregada:", cursoData.nome);
    
    // Carregar progresso salvo
    carregarProgresso();
    
    // Atualizar UI
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const metaDuration = document.getElementById('meta-duration');
    const metaModules = document.getElementById('meta-modules');
    
    if (heroTitle) heroTitle.textContent = cursoData.nome;
    if (heroDesc) heroDesc.textContent = cursoData.descricao || '';
    if (metaDuration) metaDuration.textContent = cursoData.duracao || '—';
    if (metaModules) metaModules.textContent = modules.length + ' módulos';
    
    loadingDiv.style.display = 'none';
    modulesContainer.style.display = 'block';
    
    // Renderizar módulos e quiz
    renderModules();
    updateProgress();
  } else {
    loadingDiv.innerHTML = `
      <div style="text-align: center;">
        <p>❌ Formação não encontrada.</p>
        <br>
        <a href="dashboard.html" style="color: var(--info);">← Voltar ao Dashboard</a>
      </div>
    `;
  }
}

// ==================== PROGRESSO ====================
function carregarProgresso() {
  const storageKey = `progresso_${cursoId}_${nomeUser}`;
  const saved = localStorage.getItem(storageKey);
  
  if (saved) {
    try {
      const progress = JSON.parse(saved);
      completedModules = progress.completedModules || {};
      quizPassed = progress.quizPassed || false;
      respostas = progress.respostas || {};
    } catch(e) {
      console.error('Erro ao carregar progresso:', e);
      completedModules = {};
      quizPassed = false;
      respostas = {};
    }
  }
}

function salvarProgresso() {
  const progress = {
    completedModules: completedModules,
    quizPassed: quizPassed,
    respostas: respostas,
    dataAtualizacao: new Date().toISOString()
  };
  
  const storageKey = `progresso_${cursoId}_${nomeUser}`;
  localStorage.setItem(storageKey, JSON.stringify(progress));
  
  // Atualizar progresso geral do utilizador
  const userProgressKey = `progress_${nomeUser}`;
  const userProgress = JSON.parse(localStorage.getItem(userProgressKey) || '{}');
  
  userProgress[cursoId] = {
    modulesCompleted: Object.keys(completedModules).length,
    completed: quizPassed,
    completedAt: quizPassed ? window.formatDate(new Date()) : null
  };
  
  localStorage.setItem(userProgressKey, JSON.stringify(userProgress));
}

function updateProgress() {
  const total = modules.length + (perguntas.length > 0 ? 1 : 0);
  let done = modules.filter(m => completedModules[String(m.id)]).length;
  if (quizPassed) done++;
  
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  
  const progFill = document.getElementById('prog-fill');
  const progressText = document.getElementById('progress-text');
  
  if (progFill) progFill.style.width = pct + '%';
  if (progressText) progressText.textContent = pct + '%';
  
  salvarProgresso();
}

// ==================== RENDERIZAÇÃO ====================
function renderModules() {
  const container = document.getElementById('modules-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Renderizar cada módulo
  modules.forEach((module, idx) => {
    const moduleIdStr = String(module.id);
    const isCompleted = completedModules[moduleIdStr];
    const isLocked = idx > 0 && !completedModules[String(modules[idx-1]?.id)];
    
    const block = document.createElement('div');
    block.className = `section-block ${isLocked && !isCompleted ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`;
    block.id = 'block-' + moduleIdStr;
    
    block.innerHTML = `
      <div class="section-header" onclick="window.toggleSection('${moduleIdStr}')">
        <div class="s-num">${idx + 1}</div>
        <div class="s-info">
          <div class="s-title">${window.escapeHtml(module.titulo || 'Módulo ' + (idx + 1))}</div>
          <div class="s-meta">${module.tipo === 'video' ? '🎬 Vídeo' : module.tipo === 'texto' ? '📄 Texto' : '🔗 Link'} · ${module.duracao || '15 min'}</div>
        </div>
        <div>${isCompleted ? '✅' : (isLocked ? '🔒' : '▶')}</div>
      </div>
      <div class="section-body" id="body-${moduleIdStr}">
        <div id="content-${moduleIdStr}" style="min-height: 200px;">A carregar conteúdo...</div>
        <div class="confirm-viewed">
          <span>✅ Após visualizar o conteúdo, clique para confirmar</span>
          <button class="btn-confirm" id="btn-confirm-${moduleIdStr}" disabled>✓ Confirmar conclusão</button>
        </div>
        <div id="confirmed-${moduleIdStr}" style="display:none; margin-top:10px;" class="confirmed-label">✅ Módulo concluído</div>
      </div>
    `;
    container.appendChild(block);
    
    // Carregar conteúdo do módulo
    setTimeout(() => {
      carregarConteudoModulo(module, moduleIdStr);
    }, 50);
    
    // Se já estiver concluído, atualizar UI
    if (isCompleted) {
      const btn = document.getElementById(`btn-confirm-${moduleIdStr}`);
      const confirmedDiv = document.getElementById(`confirmed-${moduleIdStr}`);
      if (btn) btn.style.display = 'none';
      if (confirmedDiv) confirmedDiv.style.display = 'block';
    }
  });
  
  // Renderizar quiz se houver perguntas
  if (perguntas && perguntas.length > 0) {
    renderQuiz();
  }
}

function carregarConteudoModulo(module, moduleIdStr) {
  const contentDiv = document.getElementById(`content-${moduleIdStr}`);
  if (!contentDiv) return;
  
  let contentHtml = '';
  
  if (module.tipo === 'texto' && module.conteudo?.texto) {
    contentHtml = `
      <div class="scrollable-content" id="scrollable-${moduleIdStr}">
        ${module.conteudo.texto}
      </div>
    `;
  } else if (module.tipo === 'video' && module.conteudo?.url) {
    let embedUrl = window.converterLinkGoogleDrive(module.conteudo.url);
    contentHtml = `
      <div class="video-wrap">
        <iframe src="${embedUrl}" frameborder="0" allowfullscreen 
          style="width:100%; height:420px; border-radius:12px;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
        </iframe>
      </div>
    `;
  } else if (module.tipo === 'link' && module.conteudo?.url) {
    const linkUrl = module.conteudo.url;
    const embedUrl = window.converterLinkGoogleDrive(linkUrl);
    
    if (embedUrl.includes('preview') || embedUrl.includes('docs.google.com')) {
      contentHtml = `
        <div class="doc-viewer">
          <iframe src="${embedUrl}" class="doc-iframe" frameborder="0" 
            style="width:100%; height:500px; border-radius:12px;">
          </iframe>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="text-content" style="padding: 20px;">
          <p style="margin-bottom: 12px;">Clique no link abaixo para aceder ao conteúdo:</p>
          <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" 
            style="color: var(--info); word-break: break-all;">
            <i class="fas fa-external-link-alt"></i> ${linkUrl}
          </a>
        </div>
      `;
    }
  } else {
    contentHtml = '<div class="text-content">Conteúdo não disponível.</div>';
  }
  
  contentDiv.innerHTML = contentHtml;
  
  // Configurar deteção de scroll para módulos de texto
  if (module.tipo === 'texto') {
    const scrollableDiv = document.getElementById(`scrollable-${moduleIdStr}`);
    const confirmBtn = document.getElementById(`btn-confirm-${moduleIdStr}`);
    
    if (scrollableDiv && confirmBtn) {
      setTimeout(() => {
        window.detectarScrollCompleto(`scrollable-${moduleIdStr}`, () => {
          confirmBtn.disabled = false;
        });
      }, 100);
    }
  } else {
    // Para vídeo/link, ativar botão após 3 segundos
    const confirmBtn = document.getElementById(`btn-confirm-${moduleIdStr}`);
    if (confirmBtn) {
      setTimeout(() => {
        confirmBtn.disabled = false;
      }, 3000);
    }
  }
  
  // Evento do botão de confirmação
  const confirmBtn = document.getElementById(`btn-confirm-${moduleIdStr}`);
  if (confirmBtn && !confirmBtn.dataset.listener) {
    confirmBtn.dataset.listener = 'true';
    confirmBtn.onclick = () => window.confirmModule(moduleIdStr);
  }
}

function renderQuiz() {
  const container = document.getElementById('modules-container');
  if (!container) return;
  
  const allModulesCompleted = modules.every(m => completedModules[String(m.id)]);
  
  const quizBlock = document.createElement('div');
  quizBlock.className = `section-block ${!allModulesCompleted && !quizPassed ? 'locked' : ''}`;
  quizBlock.id = 'block-quiz';
  
  quizBlock.innerHTML = `
    <div class="section-header" onclick="window.toggleSection('quiz')">
      <div class="s-num">📝</div>
      <div class="s-info">
        <div class="s-title">Avaliação Final</div>
        <div class="s-meta">Nota mínima: 70%</div>
      </div>
      <div id="status-quiz">${quizPassed ? '✅' : (allModulesCompleted ? '📝' : '🔒')}</div>
    </div>
    <div class="section-body" id="body-quiz">
      <div id="quiz-questions"></div>
      <div class="quiz-footer">
        <span id="quiz-answered">0 respondidas</span>
        <button class="btn-submit" id="btn-submit" disabled>Submeter avaliação</button>
      </div>
      <div class="result-screen" id="result-screen" style="display:none;">
        <div class="result-score-ring" id="result-ring">
          <div class="score-num" id="score-num">0%</div>
        </div>
        <h2 id="result-title" style="margin-bottom: 16px;"></h2>
        <p id="result-msg" style="color: #666;"></p>
        <div class="result-actions" id="result-actions"></div>
      </div>
    </div>
  `;
  container.appendChild(quizBlock);
  
  // Se já passou no quiz, mostrar resultado
  if (quizPassed) {
    const quizQuestions = document.getElementById('quiz-questions');
    const quizFooter = document.querySelector('.quiz-footer');
    const resultScreen = document.getElementById('result-screen');
    
    if (quizQuestions) quizQuestions.style.display = 'none';
    if (quizFooter) quizFooter.style.display = 'none';
    if (resultScreen) {
      resultScreen.style.display = 'block';
      mostrarResultadoQuiz(true);
    }
    return;
  }
  
  // Renderizar perguntas
  const questionsDiv = document.getElementById('quiz-questions');
  if (!questionsDiv) return;
  
  questionsDiv.innerHTML = perguntas.map((q, idx) => {
    const respostaSalva = respostas[idx];
    
    return `
      <div class="question" data-qidx="${idx}">
        <div class="question-text">${window.escapeHtml(q.texto)}</div>
        <div class="options" id="opts-${idx}">
          ${q.opcoes.map((opt, i) => `
            <div class="option-item ${respostas[idx] === String.fromCharCode(65+i) ? 'selected' : ''}" 
                 data-optidx="${i}">
              <div class="option-letter">${String.fromCharCode(65+i)}</div>
              ${window.escapeHtml(opt)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Configurar eventos das opções
  perguntas.forEach((_, idx) => {
    const optsContainer = document.getElementById(`opts-${idx}`);
    if (optsContainer) {
      const options = optsContainer.querySelectorAll('.option-item');
      options.forEach(opt => {
        opt.onclick = () => window.selectOpt(idx, parseInt(opt.dataset.optidx));
      });
    }
  });
  
  // Atualizar contador de respondidas
  atualizarContadorRespondidas();
  
  // Evento do botão submeter
  const submitBtn = document.getElementById('btn-submit');
  if (submitBtn) {
    submitBtn.onclick = () => window.submitQuiz();
  }
}

// ==================== INTERAÇÕES ====================
window.toggleSection = function(id) {
  if (id === 'quiz') {
    const block = document.getElementById('block-quiz');
    if (block && block.classList.contains('locked')) {
      window.showToast('Complete todos os módulos primeiro!');
      return;
    }
    const bodyQuiz = document.getElementById('body-quiz');
    if (bodyQuiz) bodyQuiz.classList.toggle('open');
  } else {
    const block = document.getElementById('block-' + id);
    if (block && block.classList.contains('locked')) {
      window.showToast('Complete o módulo anterior!');
      return;
    }
    const body = document.getElementById('body-' + id);
    if (body) body.classList.toggle('open');
  }
};

window.confirmModule = function(moduleId) {
  const moduleIdStr = String(moduleId);
  
  // Verificar se já foi confirmado
  if (completedModules[moduleIdStr]) return;
  
  // Marcar como concluído
  completedModules[moduleIdStr] = true;
  
  // Atualizar UI
  const block = document.getElementById('block-' + moduleIdStr);
  if (block) block.classList.add('completed');
  
  const btn = document.getElementById(`btn-confirm-${moduleIdStr}`);
  const confirmedDiv = document.getElementById(`confirmed-${moduleIdStr}`);
  
  if (btn) btn.style.display = 'none';
  if (confirmedDiv) confirmedDiv.style.display = 'block';
  
  window.showToast('✅ Módulo concluído!');
  updateProgress();
  
  // Fechar o body do módulo
  const currentBody = document.getElementById(`body-${moduleIdStr}`);
  if (currentBody) currentBody.classList.remove('open');
  
  // Encontrar índice do módulo atual
  const idx = modules.findIndex(m => String(m.id) === moduleIdStr);
  
  // Se for o último módulo, desbloquear quiz
  if (idx === modules.length - 1) {
    const quizBlock = document.getElementById('block-quiz');
    if (quizBlock) {
      quizBlock.classList.remove('locked');
      const statusQuiz = document.getElementById('status-quiz');
      if (statusQuiz) statusQuiz.innerHTML = '📝';
      
      const quizBody = document.getElementById('body-quiz');
      if (quizBody) {
        quizBody.classList.add('open');
        setTimeout(() => {
          quizBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      window.showToast('📝 Avaliação final desbloqueada!');
    }
  } else if (idx >= 0 && idx < modules.length - 1) {
    // Desbloquear próximo módulo
    const nextModuleId = String(modules[idx + 1].id);
    const nextBlock = document.getElementById(`block-${nextModuleId}`);
    if (nextBlock) {
      nextBlock.classList.remove('locked');
      const nextBody = document.getElementById(`body-${nextModuleId}`);
      if (nextBody) {
        nextBody.classList.add('open');
        setTimeout(() => {
          nextBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      window.showToast('📚 Próximo módulo desbloqueado!');
    }
  }
};

window.selectOpt = function(qIdx, optIdx) {
  const optsContainer = document.getElementById(`opts-${qIdx}`);
  if (!optsContainer) return;
  
  // Remover seleção anterior
  const options = optsContainer.querySelectorAll('.option-item');
  options.forEach(opt => opt.classList.remove('selected'));
  
  // Selecionar nova opção
  options[optIdx].classList.add('selected');
  
  // Guardar resposta
  respostas[qIdx] = String.fromCharCode(65 + optIdx);
  
  // Atualizar contador
  atualizarContadorRespondidas();
  
  salvarProgresso();
};

function atualizarContadorRespondidas() {
  const answered = Object.keys(respostas).length;
  const answeredSpan = document.getElementById('quiz-answered');
  const submitBtn = document.getElementById('btn-submit');
  
  if (answeredSpan) answeredSpan.textContent = `${answered} de ${totalPerguntas} respondidas`;
  if (submitBtn) submitBtn.disabled = answered < totalPerguntas;
}

window.submitQuiz = function() {
  let score = 0;
  
  for (let i = 0; i < totalPerguntas; i++) {
    if (respostas[i] === perguntas[i].correta) score++;
  }
  
  const pct = Math.round((score / totalPerguntas) * 100);
  const passed = pct >= 70;
  
  quizPassed = passed;
  salvarProgresso();
  updateProgress();
  
  // Atualizar UI
  const quizQuestions = document.getElementById('quiz-questions');
  const quizFooter = document.querySelector('.quiz-footer');
  const resultScreen = document.getElementById('result-screen');
  const statusQuiz = document.getElementById('status-quiz');
  
  if (quizQuestions) quizQuestions.style.display = 'none';
  if (quizFooter) quizFooter.style.display = 'none';
  if (resultScreen) resultScreen.style.display = 'block';
  if (statusQuiz) statusQuiz.innerHTML = passed ? '✅' : '❌';
  
  // Mostrar resultado
  const scoreNum = document.getElementById('score-num');
  const resultTitle = document.getElementById('result-title');
  const resultMsg = document.getElementById('result-msg');
  const resultRing = document.getElementById('result-ring');
  const resultActions = document.getElementById('result-actions');
  
  if (scoreNum) scoreNum.textContent = pct + '%';
  
  if (resultActions) resultActions.innerHTML = '';
  
  if (passed) {
    if (resultTitle) {
      resultTitle.innerHTML = '🎉 Parabéns!';
      resultTitle.style.color = 'var(--success)';
    }
    if (resultMsg) {
      resultMsg.innerHTML = `Acertaste ${score} de ${totalPerguntas} perguntas.<br>Obtiveste ${pct}% - Aprovado!`;
    }
    if (resultRing) resultRing.classList.remove('fail');
    
    // Botão de certificado
    const certBtn = document.createElement('button');
    certBtn.className = 'result-btn result-btn-cert';
    certBtn.innerHTML = '<i class="fas fa-certificate"></i> Ver Certificado';
    certBtn.onclick = () => window.showCertificate(pct);
    resultActions.appendChild(certBtn);
    
    // Registrar no histórico
    registrarConclusao(pct);
    
    window.showToast('🏆 Parabéns! Formação concluída!');
  } else {
    if (resultTitle) {
      resultTitle.innerHTML = '❌ Não aprovado';
      resultTitle.style.color = 'var(--danger)';
    }
    if (resultMsg) {
      resultMsg.innerHTML = `Obtiveste ${pct}% (${score}/${totalPerguntas} corretas).<br>Precisas de pelo menos 70% para ser aprovado.`;
    }
    if (resultRing) resultRing.classList.add('fail');
    
    // Botão de tentar novamente
    const retryBtn = document.createElement('button');
    retryBtn.className = 'result-btn result-btn-retry';
    retryBtn.innerHTML = '<i class="fas fa-redo"></i> Tentar novamente';
    retryBtn.onclick = () => window.retryQuiz();
    resultActions.appendChild(retryBtn);
    
    window.showToast('⚠️ Não atingiu a nota mínima. Tente novamente!');
  }
  
  // Botão de voltar
  const backBtn = document.createElement('button');
  backBtn.className = 'result-btn';
  backBtn.style.background = 'var(--birkenstock-gray)';
  backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Voltar ao Dashboard';
  backBtn.onclick = () => window.location.href = 'dashboard.html';
  resultActions.appendChild(backBtn);
};

function registrarConclusao(nota) {
  // Registrar no histórico
  const historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  
  const novoHistorico = {
    id: Date.now().toString(),
    nome: nomeUser,
    nomeDisplay: nomeUserDisplay,
    email: userEmail,
    curso: cursoData.nome,
    cursoId: cursoId,
    nota: nota + '%',
    data: window.formatDate(new Date()),
    dataTimestamp: Date.now(),
    certificadoId: window.gerarCertificadoId()
  };
  
  historicos.push(novoHistorico);
  localStorage.setItem('historicos', JSON.stringify(historicos));
  
  // Atualizar atribuições
  const atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
  const atribIndex = atribuicoes.findIndex(a => 
    a.colaboradorUser === nomeUser && 
    a.cursoId === cursoId && 
    a.status !== 'concluido'
  );
  
  if (atribIndex !== -1) {
    atribuicoes[atribIndex].status = 'concluido';
    atribuicoes[atribIndex].dataConclusao = new Date().toISOString();
    atribuicoes[atribIndex].nota = nota + '%';
    localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
  }
  
  localStorage.setItem('cursoConcluido', cursoId);
}

window.retryQuiz = function() {
  // Limpar respostas
  respostas = {};
  
  // Limpar seleções visuais
  for (let i = 0; i < totalPerguntas; i++) {
    const optsContainer = document.getElementById(`opts-${i}`);
    if (optsContainer) {
      const options = optsContainer.querySelectorAll('.option-item');
      options.forEach(opt => opt.classList.remove('selected'));
    }
  }
  
  // Resetar UI
  const quizQuestions = document.getElementById('quiz-questions');
  const quizFooter = document.querySelector('.quiz-footer');
  const resultScreen = document.getElementById('result-screen');
  const submitBtn = document.getElementById('btn-submit');
  
  if (quizQuestions) quizQuestions.style.display = 'block';
  if (quizFooter) quizFooter.style.display = 'flex';
  if (resultScreen) resultScreen.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;
  
  atualizarContadorRespondidas();
  window.showToast('🔄 Quiz reiniciado. Boa sorte!');
};

// ==================== CERTIFICADO ====================
window.showCertificate = function(nota) {
  const certId = window.gerarCertificadoId();
  const notaStr = typeof nota === 'number' ? nota + '%' : nota;
  
  let fundoImagem = 'assets/fundo_certificado.png';
  const certTemplateSalvo = localStorage.getItem('cert_template');
  if (certTemplateSalvo) {
    try {
      const template = JSON.parse(certTemplateSalvo);
      if (template.fundoImagem) fundoImagem = template.fundoImagem;
    } catch(e) {}
  }
  
  const certHtml = `
    <div class="cert-screen" style="display:block;" id="cert-screen">
      <div id="certificado-para-pdf" style="
        background-image: url('${fundoImagem}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        aspect-ratio: 210 / 297;
      ">
        <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 40px;">
          <div style="text-align: center;">
            <div style="font-family: 'Fraunces', serif; font-size: 2.2rem; font-weight: 900; color: #00338D; margin-bottom: 20px;">
              ${window.escapeHtml(nomeUserDisplay || nomeUser)}
            </div>
            <div style="font-size: 1.2rem; color: #616365; margin-bottom: 20px;">
              concluiu com sucesso a formação
            </div>
            <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059; margin-bottom: 50px;">
              ${window.escapeHtml(cursoData.nome)}
            </div>
            <div style="display: flex; justify-content: center; gap: 60px; flex-wrap: wrap;">
              <div style="text-align: center;">
                <div style="font-size: 0.8rem; color: #616365;">NOTA FINAL</div>
                <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #00338D;">${notaStr}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.8rem; color: #616365;">DATA</div>
                <div style="font-family: 'Fraunces', serif; font-size: 1rem; font-weight: 600; color: #00338D;">${window.formatDate(new Date())}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.8rem; color: #616365;">CERTIFICADO ID</div>
                <div style="font-family: monospace; font-size: 0.9rem; font-weight: 600; color: #00338D;">${certId}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="cert-actions">
        <button class="action-btn action-btn-download" id="btn-descarregar-pdf">
          <i class="fas fa-file-pdf"></i> Descarregar PDF
        </button>
        <button class="action-btn" id="btn-imprimir-certificado">
          <i class="fas fa-print"></i> Imprimir
        </button>
        <button class="action-btn" onclick="window.location.href='dashboard.html'">
          <i class="fas fa-home"></i> Dashboard
        </button>
      </div>
    </div>
  `;
  
  // Remover certificado existente
  const existingCert = document.getElementById('cert-screen');
  if (existingCert) existingCert.remove();
  
  const modulesContainer = document.getElementById('modules-container');
  if (modulesContainer) {
    modulesContainer.insertAdjacentHTML('beforeend', certHtml);
    
    document.getElementById('btn-descarregar-pdf').onclick = () => window.descarregarPDF();
    document.getElementById('btn-imprimir-certificado').onclick = () => window.imprimirCertificado();
  }
  
  setTimeout(() => {
    document.getElementById('cert-screen')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
};

window.descarregarPDF = async function() {
  const element = document.getElementById('certificado-para-pdf');
  if (!element) return;
  
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    window.showToast('❌ Bibliotecas de PDF não carregadas.');
    return;
  }
  
  window.showToast('📄 A gerar PDF...');
  
  try {
    const canvas = await html2canvas(element, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`certificado_${(nomeUserDisplay || nomeUser).replace(/\s/g, '_')}.pdf`);
    window.showToast('✅ PDF guardado!');
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    window.showToast('❌ Erro ao gerar PDF');
  }
};

window.imprimirCertificado = async function() {
  const element = document.getElementById('certificado-para-pdf');
  if (!element || typeof html2canvas === 'undefined') return;
  
  window.showToast('🖨️ A preparar impressão...');
  
  try {
    const canvas = await html2canvas(element, { scale: 3, useCORS: true });
    const imageData = canvas.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Certificado - ${nomeUserDisplay || nomeUser}</title></head>
      <body style="margin:0;"><img src="${imageData}" style="width:100%;"></body>
      <script>window.onload=function(){window.print();setTimeout(window.close,1000);}<\/script>
    `);
    printWindow.document.close();
  } catch (err) {
    console.error('Erro ao imprimir:', err);
    window.showToast('❌ Erro ao preparar impressão');
  }
};

// ==================== EVENT LISTENERS ====================
document.getElementById('btn-sair')?.addEventListener('click', () => {
  if (confirm('Tem a certeza que deseja sair? O seu progresso será guardado.')) {
    window.location.href = 'dashboard.html';
  }
});

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', initFormacao);
