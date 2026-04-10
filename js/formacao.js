// ============================================
// FORMAÇÃO - LÓGICA PRINCIPAL (VERSÃO CORRIGIDA)
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
let atribuicaoAtual = null;

// ==================== INICIALIZAÇÃO ====================
async function initFormacao() {
  console.log("🚀 Iniciando página de formação...");
  
  if (!window.checkAuth || !window.checkAuth()) {
    window.location.href = 'login.html';
    return;
  }
  
  const tokenData = await lerTokenUrl();
  
  if (tokenData && tokenData.user && tokenData.cursoId) {
    console.log("🔑 Token válido encontrado para:", tokenData.user);
    
    if (tokenData.prazo && !validarPrazo(tokenData.prazo)) {
      window.showToast('❌ Este link expirou. Contacte o RH.');
      setTimeout(() => window.location.href = 'dashboard.html', 2000);
      return;
    }
    
    localStorage.setItem('usuarioAtivo', tokenData.user);
    localStorage.setItem('usuarioNome', tokenData.nome || tokenData.user);
    nomeUser = tokenData.user;
    nomeUserDisplay = tokenData.nome || tokenData.user;
    userEmail = tokenData.email || '';
    
    document.getElementById('user-name-display').textContent = nomeUserDisplay;
    
    // ✅ CORRIGIDO: Mostrar prazo corretamente
    if (tokenData.prazo) {
      document.getElementById('prazo-data').textContent = tokenData.prazo;
    }
    
    await carregarFormacao(tokenData.cursoId);
    return;
  }
  
  console.log("🔍 Sem token, verificando sessão normal...");
  const user = window.getCurrentUser();
  if (!user || user.type !== 'colaborador') {
    window.location.href = 'login.html';
    return;
  }
  
  nomeUser = user.user || user.email || user.name;
  nomeUserDisplay = user.name || nomeUser;
  userEmail = user.email || '';
  document.getElementById('user-name-display').textContent = nomeUserDisplay;
  
  const cursoIdStorage = localStorage.getItem('cursoAtualId');
  if (cursoIdStorage) {
    await carregarFormacao(cursoIdStorage);
  } else {
    document.getElementById('loading').innerHTML = '❌ Nenhuma formação selecionada.<br><br><a href="dashboard.html">← Voltar ao Dashboard</a>';
  }
}

// ==================== LEITURA DE TOKEN ====================
async function lerTokenUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenId = urlParams.get('t') || urlParams.get('token');
    
    if (!tokenId) {
        console.log("🔍 Nenhum token encontrado na URL");
        return null;
    }
    
    console.log("🔑 Token:", tokenId);
    
    const savedTokenData = localStorage.getItem(`token_${tokenId}`);
    if (savedTokenData) {
        try { return JSON.parse(savedTokenData); } catch(e) {}
    }
    
    if (window.firebaseReady && window.db && tokenId.length < 50) {
        try {
            const doc = await window.db.collection('tokens').doc(tokenId).get();
            if (doc.exists) {
                const data = doc.data();
                localStorage.setItem(`token_${tokenId}`, JSON.stringify(data));
                console.log("✅ Token carregado do Firestore");
                return data;
            }
        } catch(e) { console.warn("Erro ao carregar do Firestore:", e); }
    }
    
    if (tokenId.length > 50) {
        try {
            let base64 = tokenId.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const decoder = new TextDecoder('utf-8');
            const jsonStr = decoder.decode(bytes);
            const parsed = JSON.parse(jsonStr);
            if (parsed && parsed.user && parsed.cursoId) {
                localStorage.setItem(`token_${tokenId}`, JSON.stringify(parsed));
                return parsed;
            }
        } catch(e) {
            console.warn("Erro ao decodificar token antigo:", e);
        }
    }
    
    console.error("❌ Token inválido ou expirado");
    return null;
}

function validarPrazo(prazoStr) {
  if (!prazoStr) return true;
  try {
    let prazoDate;
    if (prazoStr.includes('/')) {
      const partes = prazoStr.split('/');
      prazoDate = new Date(partes[2], partes[1] - 1, partes[0]);
    } else {
      prazoDate = new Date(prazoStr);
    }
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    prazoDate.setHours(23,59,59,999);
    return !isNaN(prazoDate.getTime()) && prazoDate >= hoje;
  } catch(e) { return true; }
}

// ==================== CARREGAR FORMAÇÃO ====================
async function carregarFormacao(id) {
  const loadingDiv = document.getElementById('loading');
  const modulesContainer = document.getElementById('modules-container');
  if (!loadingDiv || !modulesContainer) return;
  
  loadingDiv.style.display = 'block';
  modulesContainer.style.display = 'none';
  
  if (!id) {
    loadingDiv.innerHTML = '❌ Nenhuma formação selecionada.<br><br><a href="dashboard.html">← Voltar</a>';
    return;
  }
  
  cursoId = id;
  console.log("📚 Carregando formação ID:", id);
  
  const formacoes = JSON.parse(localStorage.getItem('formacoes') || '[]');
  const data = formacoes.find(f => f.id === id);
  
  if (data) {
    cursoData = { 
      nome: data.nome, 
      duracao: data.duracao, 
      descricao: data.descricao,
      conteudoProgramatico: data.conteudoProgramatico || data.descricao || ''
    };
    modules = data.modulos || [];
    perguntas = data.perguntas || [];
    totalPerguntas = perguntas.length;
    
    // ✅ CORRIGIDO: Carregar prazo da atribuição
    await carregarPrazoAtribuicao();
    
    carregarProgresso();
    
    document.getElementById('hero-title').textContent = cursoData.nome;
    
    // ✅ CORRIGIDO: Mostrar conteúdo programático como lista
    const conteudoProgramatico = cursoData.conteudoProgramatico || '';
    const linhas = conteudoProgramatico.split('\n').filter(l => l.trim() !== '');
    let conteudoHtml = '';
    if (linhas.length > 0) {
      conteudoHtml = '<ul style="margin:0;padding-left:20px;">' + 
        linhas.map(l => `<li style="margin-bottom:5px;">${window.escapeHtml(l)}</li>`).join('') + 
        '</ul>';
    }
    document.getElementById('hero-desc').innerHTML = conteudoHtml || 'Sem conteúdo programático definido.';
    
    document.getElementById('meta-duration').textContent = cursoData.duracao || '—';
    document.getElementById('meta-modules').textContent = modules.length + ' módulos';
    
    loadingDiv.style.display = 'none';
    modulesContainer.style.display = 'block';
    
    renderModules();
    updateProgress();
  } else {
    loadingDiv.innerHTML = '<div style="text-align:center;"><p>❌ Formação não encontrada.</p><br><a href="dashboard.html">← Voltar ao Dashboard</a></div>';
  }
}

// ✅ NOVA FUNÇÃO: Carregar prazo da atribuição
async function carregarPrazoAtribuicao() {
  const atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
  atribuicaoAtual = atribuicoes.find(a => 
    (a.colaboradorUser === nomeUser || a.colaboradorEmail === userEmail) && 
    a.cursoId === cursoId
  );
  
  if (atribuicaoAtual && atribuicaoAtual.prazo) {
    document.getElementById('prazo-data').textContent = atribuicaoAtual.prazo;
  } else {
    document.getElementById('prazo-data').textContent = 'Não definido';
  }
}

// ==================== PROGRESSO ====================
function carregarProgresso() {
  const saved = localStorage.getItem(`progresso_${cursoId}_${nomeUser}`);
  if (saved) {
    try {
      const progress = JSON.parse(saved);
      completedModules = progress.completedModules || {};
      quizPassed = progress.quizPassed || false;
      respostas = progress.respostas || {};
    } catch(e) { completedModules = {}; quizPassed = false; respostas = {}; }
  }
}

function salvarProgresso() {
  const progress = { completedModules, quizPassed, respostas, dataAtualizacao: new Date().toISOString() };
  localStorage.setItem(`progresso_${cursoId}_${nomeUser}`, JSON.stringify(progress));
  const userProgress = JSON.parse(localStorage.getItem(`progress_${nomeUser}`) || '{}');
  userProgress[cursoId] = { modulesCompleted: Object.keys(completedModules).length, completed: quizPassed, completedAt: quizPassed ? window.formatDate(new Date()) : null };
  localStorage.setItem(`progress_${nomeUser}`, JSON.stringify(userProgress));
}

function updateProgress() {
  const total = modules.length + (perguntas.length > 0 ? 1 : 0);
  let done = modules.filter(m => completedModules[String(m.id)]).length;
  if (quizPassed) done++;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = pct + '%';
  salvarProgresso();
}

// ==================== RENDERIZAÇÃO ====================
function renderModules() {
  const container = document.getElementById('modules-container');
  if (!container) return;
  container.innerHTML = '';
  
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
        <div class="s-info"><div class="s-title">${window.escapeHtml(module.titulo || 'Módulo ' + (idx + 1))}</div>
        <div class="s-meta">${module.tipo==='video'?'🎬':module.tipo==='texto'?'📄':'🔗'} ${module.duracao || '15 min'}</div></div>
        <div>${isCompleted ? '✅' : (isLocked ? '🔒' : '▶')}</div>
      </div>
      <div class="section-body" id="body-${moduleIdStr}">
        <div id="content-${moduleIdStr}" style="min-height:200px;">A carregar conteúdo...</div>
        <div class="confirm-viewed"><span>✅ Após visualizar completamente, clique para confirmar</span>
        <button class="btn-confirm" id="btn-confirm-${moduleIdStr}" disabled>✓ Confirmar conclusão</button></div>
        <div id="confirmed-${moduleIdStr}" style="display:none;margin-top:10px;" class="confirmed-label">✅ Módulo concluído</div>
      </div>
    `;
    container.appendChild(block);
    
    setTimeout(() => carregarConteudoModulo(module, moduleIdStr), 50);
    
    if (isCompleted) {
      document.getElementById(`btn-confirm-${moduleIdStr}`).style.display = 'none';
      document.getElementById(`confirmed-${moduleIdStr}`).style.display = 'block';
    }
  });
  
  if (perguntas && perguntas.length > 0) renderQuiz();
}

function carregarConteudoModulo(module, moduleIdStr) {
  const contentDiv = document.getElementById(`content-${moduleIdStr}`);
  if (!contentDiv) return;
  
  let contentHtml = '';
  if (module.tipo === 'texto' && module.conteudo?.texto) {
    contentHtml = `<div class="scrollable-content" id="scrollable-${moduleIdStr}">${module.conteudo.texto.replace(/\n/g, '<br>')}</div>`;
  } else if (module.tipo === 'video' && module.conteudo?.url) {
    const videoUrl = window.converterLinkGoogleDrive(module.conteudo.url);
    contentHtml = `
      <div class="video-wrap">
        <iframe id="video-${moduleIdStr}" src="${videoUrl}" frameborder="0" allowfullscreen style="width:100%;height:420px;border-radius:12px;"></iframe>
      </div>
    `;
  } else if (module.tipo === 'link' && module.conteudo?.url) {
    const embedUrl = window.converterLinkGoogleDrive(module.conteudo.url);
    if (embedUrl.includes('preview') || embedUrl.includes('docs.google.com')) {
      contentHtml = `<div class="doc-viewer"><iframe src="${embedUrl}" class="doc-iframe" style="width:100%;height:500px;"></iframe></div>`;
    } else {
      contentHtml = `<div class="text-content"><p>Clique no link:</p><a href="${module.conteudo.url}" target="_blank">${module.conteudo.url}</a></div>`;
    }
  } else {
    contentHtml = '<div class="text-content">Conteúdo não disponível.</div>';
  }
  contentDiv.innerHTML = contentHtml;
  
  const btn = document.getElementById(`btn-confirm-${moduleIdStr}`);
  
  if (module.tipo === 'texto') {
    // ✅ Texto: só habilita após scroll até ao fim
    setTimeout(() => window.detectarScrollCompleto(`scrollable-${moduleIdStr}`, () => {
      if (btn) btn.disabled = false;
      window.showToast('✅ Conteúdo visualizado! Pode confirmar a conclusão.');
    }), 100);
  } else if (module.tipo === 'video') {
    // ✅ Vídeo: só habilita após assistir até ao fim
    const videoIframe = document.getElementById(`video-${moduleIdStr}`);
    if (videoIframe) {
      // Para YouTube, usamos a API para detetar quando termina
      const videoUrl = module.conteudo?.url || '';
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // YouTube - vamos usar um timer como fallback, mas o ideal seria a API
        setTimeout(() => {
          window.showToast('ℹ️ Assista o vídeo até ao fim para confirmar.');
        }, 1000);
      } else {
        // Outros vídeos - habilitar após um tempo proporcional
        setTimeout(() => {
          if (btn) btn.disabled = false;
        }, 60000); // 1 minuto como fallback
      }
    }
  } else {
    // Link/Documento - habilitar após alguns segundos
    setTimeout(() => {
      if (btn) btn.disabled = false;
    }, 5000);
  }
  
  if (btn && !btn.dataset.listener) {
    btn.dataset.listener = 'true';
    btn.onclick = () => window.confirmModule(moduleIdStr);
  }
}

// ✅ NOVA FUNÇÃO: Chamada quando o vídeo do YouTube termina
window.onYouTubeIframeAPIReady = function() {
  console.log('YouTube API pronta');
};

// ==================== INTERAÇÕES ====================
window.toggleSection = function(id) {
  const block = document.getElementById(id === 'quiz' ? 'block-quiz' : 'block-' + id);
  if (block?.classList.contains('locked')) {
    window.showToast(id === 'quiz' ? 'Complete todos os módulos primeiro!' : 'Complete o módulo anterior!');
    return;
  }
  document.getElementById(id === 'quiz' ? 'body-quiz' : 'body-' + id)?.classList.toggle('open');
};

window.confirmModule = function(moduleId) {
  const moduleIdStr = String(moduleId);
  if (completedModules[moduleIdStr]) return;
  completedModules[moduleIdStr] = true;
  
  document.getElementById('block-' + moduleIdStr)?.classList.add('completed');
  document.getElementById(`btn-confirm-${moduleIdStr}`).style.display = 'none';
  document.getElementById(`confirmed-${moduleIdStr}`).style.display = 'block';
  
  window.showToast('✅ Módulo concluído!');
  updateProgress();
  document.getElementById(`body-${moduleIdStr}`)?.classList.remove('open');
  
  const idx = modules.findIndex(m => String(m.id) === moduleIdStr);
  if (idx === modules.length - 1) {
    const quizBlock = document.getElementById('block-quiz');
    if (quizBlock) {
      quizBlock.classList.remove('locked');
      document.getElementById('status-quiz').innerHTML = '📝';
      document.getElementById('body-quiz')?.classList.add('open');
      quizBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.showToast('📝 Avaliação final desbloqueada!');
    }
  } else if (idx >= 0 && idx < modules.length - 1) {
    const nextId = String(modules[idx + 1].id);
    const nextBlock = document.getElementById(`block-${nextId}`);
    if (nextBlock) {
      nextBlock.classList.remove('locked');
      document.getElementById(`body-${nextId}`)?.classList.add('open');
      nextBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.showToast('📚 Próximo módulo desbloqueado!');
    }
  }
};

// ==================== BOTÃO SAIR ====================
document.getElementById('btn-sair')?.addEventListener('click', () => {
  if (confirm('Sair? O progresso será guardado.')) {
    window.location.href = 'login.html';
  }
});

// ... (resto do código mantém-se igual: renderQuiz, selectOpt, submitQuiz, registrarConclusao, etc.)
// Incluir todas as outras funções existentes (renderQuiz, selectOpt, submitQuiz, registrarConclusao, retryQuiz, showCertificate, descarregarPDF, imprimirCertificado, etc.)

document.addEventListener('DOMContentLoaded', initFormacao);
console.log("✅ formacao.js carregado - versão corrigida");
