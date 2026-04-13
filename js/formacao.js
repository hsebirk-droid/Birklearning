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
    localStorage.setItem('usuarioEmail', tokenData.email || '');
    localStorage.setItem('usuarioMatricula', tokenData.matricula || '');
    
    nomeUser = tokenData.user;
    nomeUserDisplay = tokenData.nome || tokenData.user;
    userEmail = tokenData.email || '';
    
    document.getElementById('user-name-display').textContent = nomeUserDisplay;
    
    if (tokenData.prazo) {
      document.getElementById('prazo-data').textContent = tokenData.prazo;
    }
    
    await carregarFormacao(tokenData.cursoId);
    return;
  }
  
  console.log("🔍 Sem token, verificando sessão normal...");
  
  const usuario = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  
  if (!usuario && !admin) {
    window.location.href = 'login.html';
    return;
  }
  
  if (admin) {
    nomeUser = 'admin';
    nomeUserDisplay = 'Administrador';
  } else {
    nomeUser = usuario;
    nomeUserDisplay = localStorage.getItem('usuarioNome') || usuario;
    userEmail = localStorage.getItem('usuarioEmail') || '';
  }
  
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
    
    // 🔥 LER APENAS DO FIRESTORE
    if (window.firebaseReady && window.db) {
        try {
            const doc = await window.db.collection('tokens').doc(tokenId).get();
            if (doc.exists) {
                const data = doc.data();
                console.log("☁️ Token carregado do Firestore");
                return data;
            }
        } catch(e) { 
            console.error("❌ Erro ao carregar do Firestore:", e); 
        }
    }
    
    console.error("❌ Token não encontrado no Firestore");
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
  
  let data = null;
  const formacoesLocal = JSON.parse(localStorage.getItem('formacoes') || '[]');
  data = formacoesLocal.find(f => f.id === id);
  
  if (!data && window.firebaseReady && window.db) {
    try {
      console.log('☁️ Buscando formação do Firestore...');
      const doc = await window.db.collection('formacoes').doc(id).get();
      if (doc.exists) {
        data = { id: doc.id, ...doc.data() };
        formacoesLocal.push(data);
        localStorage.setItem('formacoes', JSON.stringify(formacoesLocal));
      }
    } catch (error) {
      console.error('❌ Erro ao buscar do Firestore:', error);
    }
  }
  
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
    
    await carregarPrazoAtribuicao();
    carregarProgresso();
    
    document.getElementById('hero-title').textContent = cursoData.nome;
    
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

async function carregarPrazoAtribuicao() {
  // 1. Tentar carregar do Firestore primeiro
  if (window.firebaseReady && window.db) {
    try {
      const snapshot = await window.db.collection('atribuicoes')
        .where('cursoId', '==', cursoId)
        .get();
      
      const atribuicoesFirestore = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      atribuicaoAtual = atribuicoesFirestore.find(a => 
        (a.colaboradorUser === nomeUser || a.colaboradorEmail === userEmail)
      );
      
      if (atribuicaoAtual) {
        console.log('☁️ Atribuição carregada do Firestore');
        if (atribuicaoAtual.prazo) {
          document.getElementById('prazo-data').textContent = atribuicaoAtual.prazo;
        } else {
          document.getElementById('prazo-data').textContent = 'Não definido';
        }
        return;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar atribuição do Firestore:', error);
    }
  }
  
  // 2. Fallback para localStorage
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
    setTimeout(() => window.detectarScrollCompleto(`scrollable-${moduleIdStr}`, () => {
      if (btn) btn.disabled = false;
      window.showToast('✅ Conteúdo visualizado! Pode confirmar a conclusão.');
    }), 100);
  } else {
    setTimeout(() => {
      if (btn) btn.disabled = false;
    }, 30000);
  }
  
  if (btn && !btn.dataset.listener) {
    btn.dataset.listener = 'true';
    btn.onclick = () => window.confirmModule(moduleIdStr);
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
      <div class="s-num">📝</div><div class="s-info"><div class="s-title">Avaliação Final</div><div class="s-meta">Nota mínima: 70%</div></div>
      <div id="status-quiz">${quizPassed ? '✅' : (allModulesCompleted ? '📝' : '🔒')}</div>
    </div>
    <div class="section-body" id="body-quiz">
      <div id="quiz-questions"></div>
      <div class="quiz-footer"><span id="quiz-answered">0 respondidas</span><button class="btn-submit" id="btn-submit" disabled>Submeter</button></div>
      <div class="result-screen" id="result-screen" style="display:none;"><div class="result-score-ring" id="result-ring"><div class="score-num" id="score-num">0%</div></div><h2 id="result-title"></h2><p id="result-msg"></p><div class="result-actions" id="result-actions"></div></div>
    </div>
  `;
  container.appendChild(quizBlock);
  
  if (quizPassed) {
    document.getElementById('quiz-questions').style.display = 'none';
    document.querySelector('.quiz-footer').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    mostrarResultadoQuiz(true);
    return;
  }
  
  const questionsDiv = document.getElementById('quiz-questions');
  questionsDiv.innerHTML = perguntas.map((q, idx) => `
    <div class="question"><div class="question-text">${window.escapeHtml(q.texto)}</div>
    <div class="options" id="opts-${idx}">${q.opcoes.map((opt, i) => `<div class="option-item ${respostas[idx]===String.fromCharCode(65+i)?'selected':''}" data-optidx="${i}"><div class="option-letter">${String.fromCharCode(65+i)}</div>${window.escapeHtml(opt)}</div>`).join('')}</div></div>
  `).join('');
  
  perguntas.forEach((_, idx) => {
    document.querySelectorAll(`#opts-${idx} .option-item`).forEach(opt => {
      opt.onclick = () => window.selectOpt(idx, parseInt(opt.dataset.optidx));
    });
  });
  
  atualizarContadorRespondidas();
  document.getElementById('btn-submit').onclick = () => window.submitQuiz();
}

function mostrarResultadoQuiz(passed) {
  // Implementação no submitQuiz
}

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

window.selectOpt = function(qIdx, optIdx) {
  const opts = document.querySelectorAll(`#opts-${qIdx} .option-item`);
  opts.forEach(o => o.classList.remove('selected'));
  opts[optIdx].classList.add('selected');
  respostas[qIdx] = String.fromCharCode(65 + optIdx);
  atualizarContadorRespondidas();
  salvarProgresso();
};

function atualizarContadorRespondidas() {
  const answered = Object.keys(respostas).length;
  document.getElementById('quiz-answered').textContent = `${answered} de ${totalPerguntas} respondidas`;
  document.getElementById('btn-submit').disabled = answered < totalPerguntas;
}

window.submitQuiz = function() {
  let score = 0;
  for (let i = 0; i < totalPerguntas; i++) if (respostas[i] === perguntas[i].correta) score++;
  const pct = Math.round((score / totalPerguntas) * 100);
  const passed = pct >= 70;
  
  quizPassed = passed;
  salvarProgresso(); updateProgress();
  
  document.getElementById('quiz-questions').style.display = 'none';
  document.querySelector('.quiz-footer').style.display = 'none';
  document.getElementById('result-screen').style.display = 'block';
  document.getElementById('status-quiz').innerHTML = passed ? '✅' : '❌';
  
  document.getElementById('score-num').textContent = pct + '%';
  const actions = document.getElementById('result-actions');
  actions.innerHTML = '';
  
  if (passed) {
    document.getElementById('result-title').innerHTML = '🎉 Parabéns!';
    document.getElementById('result-msg').innerHTML = `Acertaste ${score} de ${totalPerguntas}. Aprovado!`;
    document.getElementById('result-ring').classList.remove('fail');
    const certBtn = document.createElement('button');
    certBtn.className = 'result-btn result-btn-cert';
    certBtn.innerHTML = '🎓 Ver Certificado';
    certBtn.onclick = () => window.showCertificate(pct);
    actions.appendChild(certBtn);
    registrarConclusao(pct);
    window.showToast('🏆 Formação concluída!');
  } else {
    document.getElementById('result-title').innerHTML = '❌ Não aprovado';
    document.getElementById('result-msg').innerHTML = `${pct}% (${score}/${totalPerguntas}). Precisas de 70%.`;
    document.getElementById('result-ring').classList.add('fail');
    const retryBtn = document.createElement('button');
    retryBtn.className = 'result-btn result-btn-retry';
    retryBtn.innerHTML = '🔄 Tentar novamente';
    retryBtn.onclick = () => window.retryQuiz();
    actions.appendChild(retryBtn);
    window.showToast('⚠️ Tente novamente!');
  }
  
  const backBtn = document.createElement('button');
  backBtn.className = 'result-btn';
  backBtn.style.background = 'var(--birkenstock-gray)';
  backBtn.innerHTML = '← Dashboard';
  backBtn.onclick = () => window.location.href = 'dashboard.html';
  actions.appendChild(backBtn);
};

async function registrarConclusao(nota) {
  const novoHistorico = { 
    id: Date.now().toString(), 
    nome: nomeUser, 
    nomeDisplay: nomeUserDisplay, 
    email: userEmail,
    curso: cursoData.nome, 
    cursoId, 
    nota: nota + '%', 
    data: window.formatDate(new Date()), 
    dataTimestamp: Date.now(), 
    certificadoId: window.gerarCertificadoId() 
  };
  
  const historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  historicos.push(novoHistorico);
  localStorage.setItem('historicos', JSON.stringify(historicos));
  
  const atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
  const idx = atribuicoes.findIndex(a => a.colaboradorUser === nomeUser && a.cursoId === cursoId && a.status !== 'concluido');
  if (idx !== -1) { 
    atribuicoes[idx].status = 'concluido'; 
    atribuicoes[idx].dataConclusao = new Date().toISOString(); 
    atribuicoes[idx].nota = nota + '%'; 
  }
  localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
  localStorage.setItem('cursoConcluido', cursoId);
  
  if (window.firebaseReady && window.db) {
    try {
      await window.db.collection('historicos').doc(novoHistorico.id).set(novoHistorico);
      if (idx !== -1) {
        await window.db.collection('atribuicoes').doc(atribuicoes[idx].id).set(atribuicoes[idx], { merge: true });
      }
    } catch (error) {
      console.error('❌ Erro ao guardar no Firestore:', error);
    }
  }
}

window.retryQuiz = function() {
  respostas = {};
  for (let i = 0; i < totalPerguntas; i++) document.querySelectorAll(`#opts-${i} .option-item`).forEach(o => o.classList.remove('selected'));
  document.getElementById('quiz-questions').style.display = 'block';
  document.querySelector('.quiz-footer').style.display = 'flex';
  document.getElementById('result-screen').style.display = 'none';
  document.getElementById('btn-submit').disabled = true;
  atualizarContadorRespondidas();
  window.showToast('🔄 Quiz reiniciado!');
};

// ==================== CERTIFICADO ====================
window.showCertificate = function(nota) {
  const certId = window.gerarCertificadoId();
  let fundoImagem = 'assets/fundo_certificado.png';
  try { const t = JSON.parse(localStorage.getItem('cert_template')); if (t?.fundoImagem) fundoImagem = t.fundoImagem; } catch(e) {}
  
  const duracaoFormacao = cursoData.duracao || '—';
  
  const certHtml = `
    <div class="cert-screen" id="cert-screen">
      <div id="certificado-para-pdf" style="background-image:url('${fundoImagem}');background-size:cover;width:100%;max-width:210mm;aspect-ratio:210/297;">
        <div style="height:100%;display:flex;flex-direction:column;justify-content:center;padding:40px;text-align:center;">
          <div style="font-family:'Fraunces',serif;font-size:2.2rem;font-weight:900;color:#00338D;margin-bottom:20px;">${window.escapeHtml(nomeUserDisplay)}</div>
          <div style="font-size:1.2rem;color:#616365;margin-bottom:20px;">concluiu com sucesso a formação</div>
          <div style="font-family:'Fraunces',serif;font-size:1.5rem;font-weight:700;color:#C5A059;margin-bottom:30px;">${window.escapeHtml(cursoData.nome)}</div>
          <div style="display:flex;justify-content:center;gap:60px;flex-wrap:wrap;">
            <div><div>NOTA FINAL</div><div style="font-size:1.5rem;font-weight:700;color:#00338D;">${typeof nota==='number'?nota+'%':nota}</div></div>
            <div><div>DURAÇÃO</div><div style="font-size:1rem;color:#00338D;">${window.escapeHtml(duracaoFormacao)}</div></div>
            <div><div>DATA</div><div style="font-size:1rem;color:#00338D;">${window.formatDate(new Date())}</div></div>
            <div><div>CERTIFICADO ID</div><div style="font-family:monospace;color:#00338D;">${certId}</div></div>
          </div>
        </div>
      </div>
      <div class="cert-actions">
        <button class="action-btn action-btn-download" id="btn-descarregar-pdf">📄 Descarregar PDF</button>
        <button class="action-btn" id="btn-imprimir-certificado">🖨️ Imprimir</button>
        <button class="action-btn" onclick="window.location.href='dashboard.html'">🏠 Dashboard</button>
      </div>
    </div>
  `;
  
  document.getElementById('cert-screen')?.remove();
  document.getElementById('modules-container')?.insertAdjacentHTML('beforeend', certHtml);
  document.getElementById('btn-descarregar-pdf').onclick = () => window.descarregarPDF();
  document.getElementById('btn-imprimir-certificado').onclick = () => window.imprimirCertificado();
  document.getElementById('cert-screen')?.scrollIntoView({ behavior: 'smooth' });
};

window.descarregarPDF = async function() {
  const el = document.getElementById('certificado-para-pdf');
  if (!el || typeof html2canvas === 'undefined') return;
  window.showToast('📄 A gerar PDF...');
  try {
    const canvas = await html2canvas(el, { scale: 3, useCORS: true });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
    pdf.save(`certificado_${nomeUserDisplay.replace(/\s/g,'_')}.pdf`);
    window.showToast('✅ PDF guardado!');
  } catch(e) { window.showToast('❌ Erro ao gerar PDF'); }
};

window.imprimirCertificado = async function() {
  const el = document.getElementById('certificado-para-pdf');
  if (!el || typeof html2canvas === 'undefined') return;
  const canvas = await html2canvas(el, { scale: 3, useCORS: true });
  const win = window.open('', '_blank');
  win.document.write(`<html><body style="margin:0;"><img src="${canvas.toDataURL('image/png')}" style="width:100%;"></body><script>window.onload=function(){window.print();setTimeout(window.close,1000);}<\/script>`);
  win.document.close();
};

// ==================== BOTÃO SAIR ====================
document.getElementById('btn-sair')?.addEventListener('click', () => {
  if (confirm('Sair? O progresso será guardado.')) {
    window.location.href = 'dashboard.html';
  }
});

// Expor funções globalmente
window.toggleSection = window.toggleSection;
window.confirmModule = window.confirmModule;
window.selectOpt = window.selectOpt;
window.submitQuiz = window.submitQuiz;
window.retryQuiz = window.retryQuiz;
window.showCertificate = window.showCertificate;
window.descarregarPDF = window.descarregarPDF;
window.imprimirCertificado = window.imprimirCertificado;

document.addEventListener('DOMContentLoaded', initFormacao);
console.log("✅ formacao.js carregado - versão corrigida");
