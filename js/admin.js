// ============================================
// ADMIN - LÓGICA PRINCIPAL (VERSÃO COMPLETA COM DETEÇÃO DE PDF)
// ============================================

let formacoes = [];
let colaboradores = [];
let atribuicoes = [];
let historicos = [];
let modulos = [];
let perguntas = [];
let editandoModuloId = null;
let editandoPerguntaId = null;
let moduloTipoAtual = 'video';
let editandoFormacaoId = null;
let linksGerados = [];

const defaultCert = {
  fundoImagem: "assets/fundo_certificado.png",
  titulo: "Certificado de Formação",
  texto: "Certifica-se que {{nome}} concluiu {{formacao}} com {{nota}}.\nEmitido em {{data}}.",
  rodape: "Direção de Formação"
};

let certTemplate = JSON.parse(localStorage.getItem('cert_template') || JSON.stringify(defaultCert));

// ==================== FUNÇÃO CORRIGIDA - TOKEN SEGURO (UTF-8 CORRETO) ====================
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

// ==================== DADOS (FIRESTORE PRIMEIRO) ====================
async function carregarDadosExemplo() {
  console.log('📦 A carregar dados...');
  
  // ✅ SEGURO: Verificar APENAS autenticação Firebase + email admin
  const firebaseUser = window.auth?.currentUser;
  const isAdminEmail = firebaseUser?.email && window.isAdminEmail ? window.isAdminEmail(firebaseUser.email) : false;
  const isAuthenticated = firebaseUser && isAdminEmail;
  
  if (window.firebaseReady && window.db && isAuthenticated) {
    try {
      console.log('☁️ A carregar do Firestore...');
      const snapshotFormacoes = await window.db.collection('formacoes').get();
      formacoes = snapshotFormacoes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ ${formacoes.length} formações carregadas do Firestore`);
      
      const snapshotColabs = await window.db.collection('colaboradores').get();
      colaboradores = snapshotColabs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ ${colaboradores.length} colaboradores carregados do Firestore`);
      
      const snapshotAtrib = await window.db.collection('atribuicoes').get();
      atribuicoes = snapshotAtrib.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ ${atribuicoes.length} atribuições carregadas do Firestore`);
      
      const snapshotHist = await window.db.collection('historicos').get();
      historicos = snapshotHist.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ ${historicos.length} históricos carregados do Firestore`);
      
      localStorage.setItem('formacoes', JSON.stringify(formacoes));
      localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
      localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
      localStorage.setItem('historicos', JSON.stringify(historicos));
    } catch (error) {
      console.warn('⚠️ Erro ao carregar do Firestore, usando localStorage:', error.message);
      carregarDoLocalStorage();
    }
  } else {
    console.log('📦 Usando localStorage (não autenticado ou offline)');
    carregarDoLocalStorage();
  }
  
  if (!formacoes || formacoes.length === 0) {
    console.log('📝 Criando formações de exemplo...');
    formacoes = [
      {
        id: "1",
        nome: "Formação Tester",
        descricao: "Formação de exemplo para testar a plataforma.",
        duracao: "45 minutos",
        icone: "💬",
        modulos: [
          { id: "m1", titulo: "Módulo de Exemplo", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "10 min" }
        ],
        perguntas: [
          { id: "p1", texto: "Qual é a primeira impressão no atendimento ao cliente?", opcoes: ["Olhar nos olhos", "Sorriso", "Postura correta", "Todas as anteriores"], correta: "D" }
        ]
      }
    ];
    await salvarFormacoes();
  }
  
  if (!colaboradores || colaboradores.length === 0) {
    console.log('📝 Criando colaboradores de exemplo...');
    colaboradores = [
      { id: "c1", matricula: "000", user: "tester.formacao", nome: "Tester Formação", email: "tester.formacao@birkenstock.pt", pass: "123456" }
    ];
    await salvarColaboradores();
  }
  
  console.log('✅ Dados carregados com sucesso!');
}

// ==================== FUNÇÕES DE SALVAR ====================
async function salvarFormacoes() {
  localStorage.setItem('formacoes', JSON.stringify(formacoes));
  if (window.firebaseReady && window.db) {
    try {
      for (const f of formacoes) {
        await window.db.collection('formacoes').doc(f.id).set(f, { merge: true });
      }
      console.log('☁️ Formações guardadas no Firestore');
    } catch (error) {
      console.error('Erro ao guardar formações no Firestore:', error);
    }
  }
}

async function salvarColaboradores() {
  localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
  if (window.firebaseReady && window.db) {
    try {
      for (const c of colaboradores) {
        await window.db.collection('colaboradores').doc(c.id).set(c, { merge: true });
      }
      console.log('☁️ Colaboradores guardados no Firestore');
    } catch (error) {
      console.error('Erro ao guardar colaboradores no Firestore:', error);
    }
  }
}

async function salvarAtribuicoes() {
  localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
  if (window.firebaseReady && window.db) {
    try {
      for (const a of atribuicoes) {
        await window.db.collection('atribuicoes').doc(a.id).set(a, { merge: true });
      }
      console.log('☁️ Atribuições guardadas no Firestore');
    } catch (error) {
      console.error('Erro ao guardar atribuições no Firestore:', error);
    }
  }
}

async function salvarHistoricos() {
  localStorage.setItem('historicos', JSON.stringify(historicos));
  if (window.firebaseReady && window.db) {
    try {
      for (const h of historicos) {
        await window.db.collection('historicos').doc(h.id).set(h, { merge: true });
      }
      console.log('☁️ Históricos guardados no Firestore');
    } catch (error) {
      console.error('Erro ao guardar históricos no Firestore:', error);
    }
  }
}

function getColaboradoresList() { return colaboradores; }
function getFormacoesList() { return formacoes; }

// ==================== DASHBOARD ====================
function atualizarDashboard() {
  const totalFormacoes = formacoes.length;
  const totalColaboradores = colaboradores.length;
  const totalAtribuicoes = atribuicoes.length;
  
  const concluidas = atribuicoes.filter(a => 
    a.status === 'concluido' || 
    a.status === 'concluída' || 
    a.status === 'Concluido' ||
    a.status === 'Concluído'
  ).length;
  
  const pendentes = totalAtribuicoes - concluidas;
  
  console.log('📊 Dashboard atualizado:', {
    formacoes: totalFormacoes,
    colaboradores: totalColaboradores,
    atribuicoes: totalAtribuicoes,
    concluidas: concluidas,
    pendentes: pendentes
  });
  
  const dashboardGrid = document.getElementById('dashboard-grid');
  if (dashboardGrid) {
    dashboardGrid.innerHTML = `
      <div class="dash-card"><div class="dash-icon" style="background:var(--info-bg)">📚</div><div class="dash-info"><h3>${totalFormacoes}</h3><p>Formações</p></div></div>
      <div class="dash-card"><div class="dash-icon" style="background:var(--success-bg)">👥</div><div class="dash-info"><h3>${totalColaboradores}</h3><p>Colaboradores</p></div></div>
      <div class="dash-card"><div class="dash-icon" style="background:var(--purple-bg)">🏅</div><div class="dash-info"><h3>${concluidas}</h3><p>Atribuições concluídas</p></div></div>
      <div class="dash-card"><div class="dash-icon" style="background:var(--warning-bg)">⏳</div><div class="dash-info"><h3>${pendentes}</h3><p>Pendentes</p></div></div>
    `;
  }
  
  const recentes = historicos.slice(-5).reverse();
  const recentActivities = document.getElementById('recent-activities');
  if (recentActivities) {
    recentActivities.innerHTML = recentes.length ? recentes.map(h => `
      <div class="item-card"><div class="item-card-info"><strong>${escapeHtml(h.nomeDisplay || h.nome)}</strong> concluiu "${escapeHtml(h.curso)}" com ${escapeHtml(h.nota)}</div><div class="item-card-meta">${escapeHtml(h.data)}</div></div>
    `).join('') : '<div class="empty">Sem atividades recentes.</div>';
  }
}

// ==================== ATRIBUIÇÃO INDIVIDUAL ====================
function prepararAtribuicao() {
    const colabs = colaboradores;
    const forms = formacoes;
    const selColab = document.getElementById('select-colaborador');
    const selForm = document.getElementById('select-formacao');
    
    const colabsOrdenados = [...colabs].sort((a, b) => {
      const matA = parseInt(a.matricula) || 999999;
      const matB = parseInt(b.matricula) || 999999;
      return matA - matB;
    });
    
    if (selColab) {
        selColab.innerHTML = '<option value="">Selecione um colaborador...</option>' + 
          colabsOrdenados.map(c => `<option value="${c.id}" data-nome="${escapeHtml(c.nome)}" data-email="${escapeHtml(c.email || '')}" data-matricula="${escapeHtml(c.matricula || '')}">${escapeHtml(c.nome)} (${c.matricula || c.user})</option>`).join('');
    }
    if (selForm) {
        selForm.innerHTML = '<option value="">Selecione uma formação...</option>' + 
          forms.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
    }
}

function gerarCodigoAtribuicao() {
    const colabId = document.getElementById('select-colaborador')?.value;
    const cursoId = document.getElementById('select-formacao')?.value;
    const prazo = document.getElementById('atrib-prazo')?.value || '31/12/2026';
    
    if (!colabId) { showToast('❌ Selecione um colaborador'); return; }
    if (!cursoId) { showToast('❌ Selecione uma formação'); return; }
    
    const colaborador = colaboradores.find(c => c.id === colabId);
    const formacao = formacoes.find(f => f.id === cursoId);
    if (!colaborador || !formacao) { showToast('❌ Dados não encontrados'); return; }
    
    const tokenId = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    
    const tokenData = { 
        user: colaborador.user || colaborador.email,
        nome: colaborador.nome,
        email: colaborador.email || '',
        matricula: colaborador.matricula || '',
        cursoId: cursoId, 
        cursoNome: formacao.nome,
        prazo: prazo, 
        ts: Date.now() 
    };
    
    localStorage.setItem(`token_${tokenId}`, JSON.stringify(tokenData));
    
    if (window.firebaseReady && window.db) {
        window.db.collection('tokens').doc(tokenId).set(tokenData);
    }
    
    const urlBase = window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao.html';
    const linkFinal = `${urlBase}?t=${tokenId}`;
    
    const novaAtribuicao = {
        id: Date.now().toString(),
        colaboradorId: colaborador.id,
        colaboradorUser: colaborador.user || colaborador.email,
        colaboradorNome: colaborador.nome,
        colaboradorEmail: colaborador.email || '',
        colaboradorMatricula: colaborador.matricula || '',
        cursoId: cursoId,
        cursoNome: formacao.nome,
        prazo: prazo,
        status: 'pendente',
        dataAtribuicao: new Date().toISOString(),
        token: tokenId,
        link: linkFinal
    };
    
    atribuicoes.push(novaAtribuicao);
    salvarAtribuicoes();
    
    document.getElementById('resultado-atribuicao').style.display = 'block';
    document.getElementById('link-gerado').textContent = linkFinal;
    window.linkAtualGerado = linkFinal;
    
    showToast("✅ Atribuição registada com sucesso!");
}

// ==================== ENVIO DE EMAIL ====================
function EnvioEmail() {
    const colabId = document.getElementById('select-colaborador')?.value;
    if (!colabId) { showToast('❌ Selecione um colaborador primeiro'); return; }
    const colaborador = colaboradores.find(c => c.id === colabId);
    const link = window.linkAtualGerado || document.getElementById('link-gerado')?.textContent || '';
    if (!link) { showToast('❌ Gere o link primeiro'); return; }
    if (!colaborador?.email) { showToast('❌ Este colaborador não tem email registado'); return; }
    const assunto = 'Birkenstock - Nova Formacao Atribuida';
    const corpo = `Ola ${colaborador.nome},\n\nFoi-lhe atribuida uma nova formacao na plataforma Birkenstock S&CC Portugal.\n\nLink de acesso: ${link}\n\nPrazo: ${document.getElementById('atrib-prazo')?.value || '31/12/2026'}\n\nAtenciosamente,\nEquipa de Formacao Birkenstock`;
    window.location.href = `mailto:${colaborador.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    showToast(`📧 A abrir cliente de email para ${colaborador.nome}`);
}

function enviarEmailIndividual(email, nome, link, prazo, cursoNome) {
    if (!email) { showToast('❌ Este colaborador não tem email'); return; }
    const assunto = `Birkenstock - Formacao: ${cursoNome}`;
    const corpo = `Ola ${nome},\n\nFoi-lhe atribuida a formacao "${cursoNome}" na plataforma Birkenstock S&CC Portugal.\n\nLink de acesso: ${link}\n\nPrazo: ${prazo}\n\nAtenciosamente,\nEquipa de Formacao Birkenstock`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    showToast(`📧 A abrir email para ${nome}`);
}

function enviarEmailsMassa() {
  if (!linksGerados.length) { showToast('❌ Gere links primeiro'); return; }
  const emailsList = linksGerados.filter(l => l.email).map(l => ({ nome: l.nome, email: l.email, link: l.link, prazo: l.prazo, curso: l.cursoNome }));
  if (emailsList.length === 0) { showToast('❌ Nenhum colaborador tem email'); return; }
  emailsList.forEach(e => {
    const assunto = `Birkenstock - Formacao: ${e.curso}`;
    const corpo = `Ola ${e.nome},\n\nFoi-lhe atribuida a formacao "${e.curso}".\n\nPrazo: ${e.prazo}\n\nAceda atraves do link:\n${e.link}\n\nAtenciosamente,\nEquipa de Formacao Birkenstock`;
    window.open(`mailto:${e.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`);
  });
  showToast(`📧 A abrir ${emailsList.length} emails...`);
}

function relembrarColaborador(atribuicaoId) {
  const atribuicao = atribuicoes.find(a => a.id === atribuicaoId);
  if (!atribuicao) return;
  const assunto = `Birkenstock - Lembrete: ${atribuicao.cursoNome}`;
  const corpo = `Ola ${atribuicao.colaboradorNome},\n\nRecordamos que ainda tem pendente a formacao "${atribuicao.cursoNome}".\n\nPrazo: ${atribuicao.prazo}\n\nAceda atraves do link:\n${atribuicao.link}\n\nAtenciosamente,\nEquipa de Formacao Birkenstock`;
  window.location.href = `mailto:${atribuicao.colaboradorEmail}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  showToast(`📧 Email de lembrete aberto para ${atribuicao.colaboradorNome}`);
}

function copiarLink() {
    const link = window.linkAtualGerado || document.getElementById('link-gerado')?.textContent;
    if (!link) { showToast('❌ Gere um link primeiro'); return; }
    navigator.clipboard?.writeText(link).then(() => showToast("✅ Link copiado!")).catch(() => {
        const textarea = document.createElement('textarea'); textarea.value = link;
        document.body.appendChild(textarea); textarea.select();
        document.execCommand('copy'); document.body.removeChild(textarea);
        showToast("✅ Link copiado!");
    });
}

// ==================== GESTÃO DE FORMAÇÕES ====================
function renderFormacoesLista() {
  const container = document.getElementById('formacoes-list');
  if (!container) return;
  if (!formacoes.length) { container.innerHTML = '<div class="empty">Nenhuma formação criada.</div>'; return; }
  container.innerHTML = formacoes.map(curso => `
    <div class="item-card">
      <div class="item-card-info"><div class="item-card-title">📘 ${escapeHtml(curso.nome)}</div><div class="item-card-meta">${curso.modulos?.length || 0} módulos · ${curso.perguntas?.length || 0} perguntas</div></div>
      <div class="item-card-actions">
        <button class="btn-editar-formacao" data-id="${curso.id}" style="color:var(--info)">✏️ Editar</button>
        <button class="btn-apagar-formacao" data-id="${curso.id}" style="color:var(--danger)">🗑️ Apagar</button>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.btn-editar-formacao').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); editarFormacao(btn.dataset.id); }));
  document.querySelectorAll('.btn-apagar-formacao').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); apagarFormacao(btn.dataset.id); }));
}

function apagarFormacao(id) {
  if (!confirm('Apagar esta formação permanentemente?')) return;
  formacoes = formacoes.filter(f => f.id !== id);
  salvarFormacoes(); renderFormacoesLista(); atualizarDashboard(); atualizarSelectores(); renderAcompanhamento();
  showToast('✅ Formação apagada!');
}

// ==================== MÓDULOS ====================
function abrirModalModulo(tipo) {
  moduloTipoAtual = tipo; editandoModuloId = null;
  document.getElementById('modulo-titulo').value = '';
  document.getElementById('modulo-duracao').value = '';
  document.getElementById('modulo-video-url').value = '';
  document.getElementById('modulo-texto-conteudo').value = '';
  document.getElementById('modulo-link-url').value = '';
  document.getElementById('modulo-link-pages').value = '1';
  document.getElementById('modulo-conteudo-video').style.display = tipo === 'video' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-texto').style.display = tipo === 'texto' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-link').style.display = tipo === 'link' ? 'block' : 'none';
  const titulos = { video: '🎬 Adicionar Vídeo', texto: '📄 Adicionar Texto', link: '🔗 Adicionar Link' };
  document.getElementById('modal-modulo-titulo').textContent = titulos[tipo] || 'Adicionar Módulo';
  document.getElementById('modal-modulo').style.display = 'flex';
  
  setTimeout(() => setupDetectarPaginas(), 100);
}

function editarModulo(id) {
  const m = modulos.find(m => m.id === id);
  if (!m) return;
  editandoModuloId = id; moduloTipoAtual = m.tipo;
  document.getElementById('modulo-titulo').value = m.titulo;
  document.getElementById('modulo-duracao').value = m.duracao;
  document.getElementById('modulo-conteudo-video').style.display = m.tipo === 'video' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-texto').style.display = m.tipo === 'texto' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-link').style.display = m.tipo === 'link' ? 'block' : 'none';
  if (m.tipo === 'video') document.getElementById('modulo-video-url').value = m.conteudo?.url || '';
  if (m.tipo === 'texto') document.getElementById('modulo-texto-conteudo').value = m.conteudo?.texto || '';
  if (m.tipo === 'link') {
    document.getElementById('modulo-link-url').value = m.conteudo?.url || '';
    document.getElementById('modulo-link-pages').value = m.conteudo?.pages || 1;
  }
  document.getElementById('modal-modulo').style.display = 'flex';
  
  setTimeout(() => setupDetectarPaginas(), 100);
}

function salvarModulo() {
  const titulo = document.getElementById('modulo-titulo').value.trim();
  if (!titulo) { showToast('❌ Título obrigatório'); return; }
  let conteudo = {};
  if (moduloTipoAtual === 'video') {
    const url = document.getElementById('modulo-video-url').value.trim();
    if (!url) { showToast('❌ URL do vídeo obrigatória'); return; }
    conteudo = { url };
  } else if (moduloTipoAtual === 'texto') {
    const texto = document.getElementById('modulo-texto-conteudo').value.trim();
    if (!texto) { showToast('❌ Conteúdo obrigatório'); return; }
    conteudo = { texto };
  } else if (moduloTipoAtual === 'link') {
    const url = document.getElementById('modulo-link-url').value.trim();
    if (!url) { showToast('❌ URL do link obrigatória'); return; }
    const pages = parseInt(document.getElementById('modulo-link-pages')?.value) || 1;
    conteudo = { url, pages };
  }
  const duracao = document.getElementById('modulo-duracao').value.trim() || '15 min';
  const novoModulo = { id: editandoModuloId || Date.now().toString(), titulo, tipo: moduloTipoAtual, conteudo, duracao };
  if (editandoModuloId) {
    const index = modulos.findIndex(m => m.id === editandoModuloId);
    if (index !== -1) modulos[index] = novoModulo;
    editandoModuloId = null;
  } else { modulos.push(novoModulo); }
  renderModulos();
  document.getElementById('modal-modulo').style.display = 'none';
  showToast(`✅ Módulo "${titulo}" salvo!`);
}

function removerModulo(id) {
  if (confirm('Remover este módulo?')) {
    modulos = modulos.filter(m => m.id !== id);
    renderModulos();
    showToast('✅ Módulo removido!');
  }
}

function renderModulos() {
  const container = document.getElementById('modulos-container');
  if (!container) return;
  if (!modulos.length) { container.innerHTML = '<div class="alert alert-info">Nenhum módulo adicionado.</div>'; return; }
  container.innerHTML = modulos.map((m, idx) => `
    <div class="modulo-card">
      <div style="flex:1"><div style="font-weight:700;">${idx+1}. ${escapeHtml(m.titulo)}</div><div style="font-size:11px;color:var(--birkenstock-gray);">${m.tipo==='video'?'🎬 Vídeo':m.tipo==='texto'?'📄 Texto':'🔗 Link'} · ${m.duracao}</div></div>
      <div style="display:flex;gap:8px;">
        <button class="btn-editar-modulo" data-id="${m.id}" style="background:var(--info);color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">✏️</button>
        <button class="btn-remover-modulo" data-id="${m.id}" style="background:var(--danger);color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">🗑️</button>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.btn-editar-modulo').forEach(btn => btn.addEventListener('click', () => editarModulo(btn.dataset.id)));
  document.querySelectorAll('.btn-remover-modulo').forEach(btn => btn.addEventListener('click', () => removerModulo(btn.dataset.id)));
}

// ==================== DETEÇÃO AUTOMÁTICA DE PÁGINAS DE PDF ====================

function extrairFileIdGoogleDrive(url) {
  if (!url) return null;
  
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

function converterParaUrlDownload(fileId) {
  const corsProxy = 'https://corsproxy.io/?';
  const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return corsProxy + encodeURIComponent(driveUrl);
}

async function obterNumeroPaginasPDF(url) {
  const fileId = extrairFileIdGoogleDrive(url);
  
  if (!fileId) {
    throw new Error('Não foi possível extrair o ID do ficheiro. Verifique o URL.');
  }
  
  console.log('📄 ID do ficheiro:', fileId);
  
  const pdfUrl = converterParaUrlDownload(fileId);
  
  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    console.log(`✅ PDF carregado! ${pdf.numPages} páginas.`);
    return pdf.numPages;
  } catch (error) {
    console.error('❌ Erro:', error);
    const proxyAlternativo = 'https://api.allorigins.win/raw?url=';
    const pdfUrlAlt = proxyAlternativo + encodeURIComponent(`https://drive.google.com/uc?export=download&id=${fileId}`);
    
    const loadingTask = pdfjsLib.getDocument(pdfUrlAlt);
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  }
}

function setupDetectarPaginas() {
  const btnDetectar = document.getElementById('btn-detectar-paginas');
  const urlInput = document.getElementById('modulo-link-url');
  const pagesInput = document.getElementById('modulo-link-pages');
  const statusSpan = document.getElementById('detectar-status');
  
  if (!btnDetectar) return;
  
  // Remover listeners antigos
  const newBtn = btnDetectar.cloneNode(true);
  btnDetectar.parentNode.replaceChild(newBtn, btnDetectar);
  
  newBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    
    if (!url) {
      showToast('❌ Primeiro insira o URL do Google Drive');
      return;
    }
    
    newBtn.disabled = true;
    newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A detetar...';
    statusSpan.textContent = '⏳ A analisar o PDF...';
    statusSpan.style.color = 'var(--warning)';
    
    try {
      const numPages = await obterNumeroPaginasPDF(url);
      pagesInput.value = numPages;
      statusSpan.textContent = `✅ Detetado! ${numPages} páginas.`;
      statusSpan.style.color = 'var(--success)';
      showToast(`✅ PDF analisado! ${numPages} páginas.`);
    } catch (error) {
      statusSpan.textContent = '❌ ' + error.message;
      statusSpan.style.color = 'var(--danger)';
      showToast('❌ ' + error.message);
    } finally {
      newBtn.disabled = false;
      newBtn.innerHTML = '<i class="fas fa-magic"></i> Detetar número de páginas automaticamente';
    }
  });
}

// ==================== PERGUNTAS ====================
function abrirModalPergunta() {
  editandoPerguntaId = null;
  document.getElementById('pergunta-texto').value = '';
  document.getElementById('pergunta-opcao-a').value = '';
  document.getElementById('pergunta-opcao-b').value = '';
  document.getElementById('pergunta-opcao-c').value = '';
  document.getElementById('pergunta-opcao-d').value = '';
  document.getElementById('pergunta-correta').value = 'A';
  document.getElementById('modal-pergunta').style.display = 'flex';
}

function editarPergunta(id) {
  const p = perguntas.find(p => p.id === id);
  if (!p) return;
  editandoPerguntaId = id;
  document.getElementById('pergunta-texto').value = p.texto;
  document.getElementById('pergunta-opcao-a').value = p.opcoes[0];
  document.getElementById('pergunta-opcao-b').value = p.opcoes[1];
  document.getElementById('pergunta-opcao-c').value = p.opcoes[2];
  document.getElementById('pergunta-opcao-d').value = p.opcoes[3];
  document.getElementById('pergunta-correta').value = p.correta;
  document.getElementById('modal-pergunta').style.display = 'flex';
}

function salvarPergunta() {
  const texto = document.getElementById('pergunta-texto').value.trim();
  if (!texto) { showToast('Texto da pergunta obrigatório'); return; }
  const opcoes = [
    document.getElementById('pergunta-opcao-a').value.trim(),
    document.getElementById('pergunta-opcao-b').value.trim(),
    document.getElementById('pergunta-opcao-c').value.trim(),
    document.getElementById('pergunta-opcao-d').value.trim()
  ];
  if (opcoes.some(o => !o)) { showToast('Todas as opções são obrigatórias'); return; }
  const correta = document.getElementById('pergunta-correta').value;
  if (editandoPerguntaId) {
    const idx = perguntas.findIndex(p => p.id === editandoPerguntaId);
    if (idx !== -1) perguntas[idx] = { ...perguntas[idx], texto, opcoes, correta };
  } else { perguntas.push({ id: Date.now().toString(), texto, opcoes, correta }); }
  renderPerguntas();
  document.getElementById('modal-pergunta').style.display = 'none';
  showToast('✅ Pergunta salva!');
}

function removerPergunta(id) {
  if (confirm('Remover pergunta?')) {
    perguntas = perguntas.filter(p => p.id !== id);
    renderPerguntas();
    showToast('✅ Pergunta removida!');
  }
}

function renderPerguntas() {
  const container = document.getElementById('perguntas-container');
  if (!container) return;
  if (!perguntas.length) { container.innerHTML = '<div class="alert alert-info">Nenhuma pergunta adicionada.</div>'; return; }
  container.innerHTML = perguntas.map((p, idx) => `
    <div class="pergunta-card">
      <div style="margin-bottom:8px;"><strong>${idx+1}. ${escapeHtml(p.texto)}</strong></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;">
        <div>A) ${escapeHtml(p.opcoes[0])}</div><div>B) ${escapeHtml(p.opcoes[1])}</div>
        <div>C) ${escapeHtml(p.opcoes[2])}</div><div>D) ${escapeHtml(p.opcoes[3])}</div>
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--success);">✅ Correta: ${p.correta}</div>
      <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn-editar-pergunta" data-id="${p.id}" style="background:var(--info);color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">✏️</button>
        <button class="btn-remover-pergunta" data-id="${p.id}" style="background:var(--danger);color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">🗑️</button>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.btn-editar-pergunta').forEach(btn => btn.addEventListener('click', () => editarPergunta(btn.dataset.id)));
  document.querySelectorAll('.btn-remover-pergunta').forEach(btn => btn.addEventListener('click', () => removerPergunta(btn.dataset.id)));
}

// ==================== COLABORADORES ====================
function renderColabs() {
  const tbody = document.getElementById('colab-list-table');
  if (!tbody) return;
  if (!colaboradores.length) { 
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhum colaborador cadastrado.</td></tr>'; 
    return; 
  }
  
  const colaboradoresOrdenados = [...colaboradores].sort((a, b) => {
    const matA = parseInt(a.matricula) || 999999;
    const matB = parseInt(b.matricula) || 999999;
    return matA - matB;
  });
  
  tbody.innerHTML = colaboradoresOrdenados.map(c => `
    <tr>
      <td>${escapeHtml(c.matricula || '-')}</td>
      <td>${escapeHtml(c.nome || c.user)}</td>
      <td>${escapeHtml(c.email || '-')}</td>
      <td><button class="btn-remover-colab" data-id="${c.id}">🗑️ Remover</button></td>
    </tr>
  `).join('');
  
  document.querySelectorAll('.btn-remover-colab').forEach(btn => 
    btn.addEventListener('click', () => removerColab(btn.dataset.id))
  );
}

function removerColab(id) {
  if (confirm('Remover este colaborador? Esta ação não pode ser desfeita.')) {
    colaboradores = colaboradores.filter(c => c.id !== id);
    salvarColaboradores();
    renderColabs();
    atualizarSelectores();
    atualizarDashboard();
    renderAcompanhamento();
    showToast('✅ Colaborador removido com sucesso!');
  }
}

function saveUser() {
  const matricula = document.getElementById('u-matricula')?.value.trim() || '';
  const nome = document.getElementById('u-nome')?.value.trim() || '';
  const email = document.getElementById('u-email')?.value.trim() || '';
  const pass = document.getElementById('u-pass')?.value || '';
  const user = nome.toLowerCase().replace(/\s+/g, '.');
  if (!nome || !pass) { showToast('❌ Preencha nome e password.'); return; }
  const novoColab = { id: Date.now().toString(), matricula, user, nome, email, pass, dataCriacao: new Date().toISOString() };
  colaboradores.push(novoColab);
  salvarColaboradores();
  showToast('✅ Colaborador criado!');
  document.getElementById('u-matricula').value = '';
  document.getElementById('u-nome').value = '';
  document.getElementById('u-email').value = '';
  document.getElementById('u-pass').value = '';
  renderColabs(); atualizarSelectores(); atualizarDashboard(); renderAcompanhamento();
}

function importColaboradores(files) {
  if (!files || !files[0]) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n');
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const matricula = parts[0]?.trim() || '';
        const nome = parts[1]?.trim() || '';
        const email = parts[2]?.trim() || '';
        const pass = parts[3]?.trim() || 'birkenstock2024';
        const user = nome.toLowerCase().replace(/\s+/g, '.');
        if (nome && pass) {
          colaboradores.push({ id: Date.now().toString() + imported, matricula, user, nome, email, pass, dataCriacao: new Date().toISOString() });
          imported++;
        }
      }
    }
    salvarColaboradores();
    showToast(`✅ Importados ${imported} colaboradores!`);
    renderColabs(); atualizarSelectores(); atualizarDashboard(); renderAcompanhamento();
  };
  reader.readAsText(files[0], 'UTF-8');
}

function downloadModeloCSV() {
  const csv = "matricula,nome,email,password\n000,Tester Formação,tester.formacao@birkenstock.pt,birkenstock2024";
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'modelo_colaboradores.csv';
  link.click();
}

function exportarColaboradoresExcel() {
  if (!colaboradores.length) { showToast('❌ Sem colaboradores para exportar'); return; }
  const dados = colaboradores.map(c => ({ 'Matrícula': c.matricula || '', 'Nome': c.nome || c.user, 'Email': c.email || '', 'Data Criação': c.dataCriacao ? formatDate(c.dataCriacao) : '' }));
  downloadExcel(dados, 'colaboradores', 'Colaboradores');
}

// ==================== ATRIBUIÇÃO EM MASSA ====================
function atualizarSelectores() {
  const atribuirCurso = document.getElementById('atribuir-curso');
  const colabGrid = document.getElementById('colab-selector-grid');
  const valorSelecionado = atribuirCurso ? atribuirCurso.value : '';
  
  if (atribuirCurso) {
    atribuirCurso.innerHTML = '<option value="">Selecione uma formação</option>' + 
      formacoes.map(c => `<option value="${c.id}" ${valorSelecionado===c.id?'selected':''}>${escapeHtml(c.nome)}</option>`).join('');
  }
  
  if (colabGrid) {
    const cursoSelecionado = atribuirCurso?.value || '';
    
    const colaboradoresOrdenados = [...colaboradores].sort((a, b) => {
      const matA = parseInt(a.matricula) || 999999;
      const matB = parseInt(b.matricula) || 999999;
      return matA - matB;
    });
    
    colabGrid.innerHTML = colaboradoresOrdenados.map(c => {
      const jaConcluiu = historicos.some(h => (h.nome === c.user || h.nomeDisplay === c.nome) && h.cursoId === cursoSelecionado);
      const jaAtribuido = atribuicoes.some(a => a.colaboradorUser === c.user && a.cursoId === cursoSelecionado && a.status !== 'concluido');
      let statusHtml = '';
      if (jaConcluiu) statusHtml = '<span class="colab-completed" title="Já concluiu">✅</span>';
      else if (jaAtribuido) statusHtml = '<span class="colab-completed" title="Já atribuído">⏳</span>';
      return `<label class="colab-check"><input type="checkbox" value="${c.id}" ${jaConcluiu?'disabled':''}> ${escapeHtml(c.nome)} (${c.matricula || c.user}) ${statusHtml}</label>`;
    }).join('');
  }
  
  const filtroFormacao = document.getElementById('filtro-formacao-acompanhar');
  if (filtroFormacao) {
    filtroFormacao.innerHTML = '<option value="">Todas formações</option>' + 
      formacoes.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
  }
}

function selecionarTodos() { document.querySelectorAll('#colab-selector-grid input:not(:disabled)').forEach(cb => cb.checked = true); }
function deselecionarTodos() { document.querySelectorAll('#colab-selector-grid input').forEach(cb => cb.checked = false); }

function gerarLinksMassa() {
    const cursoId = document.getElementById('atribuir-curso')?.value;
    if (!cursoId) { showToast('❌ Selecione uma formação'); return; }
    const selected = Array.from(document.querySelectorAll('#colab-selector-grid input:checked:not(:disabled)'));
    if (!selected.length) { showToast('❌ Selecione pelo menos um colaborador'); return; }
    const prazo = document.getElementById('atribuir-prazo')?.value || '31/12/2026';
    const cursoNome = document.getElementById('atribuir-curso')?.selectedOptions[0]?.text || 'Formação';
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao.html';
    linksGerados = [];
    let contadorSucesso = 0, contadorReutilizados = 0;
    for (const cb of selected) {
        const colaborador = colaboradores.find(c => c.id === cb.value);
        if (!colaborador) continue;
        const user = colaborador.user || colaborador.email;
        const nome = colaborador.nome;
        const email = colaborador.email || '';
        const matricula = colaborador.matricula || '';
        const atribuicaoExistente = atribuicoes.find(a => a.colaboradorUser === user && a.cursoId === cursoId && a.status !== 'concluido');
        if (atribuicaoExistente) {
            linksGerados.push({ nome, email, matricula, link: atribuicaoExistente.link, prazo, cursoNome, status: 'reutilizado' });
            contadorReutilizados++;
            continue;
        }
        
        const tokenId = Date.now().toString(36) + Math.random().toString(36).substr(2, 4) + '_' + contadorSucesso;
        const tokenData = { user, nome, email, matricula, cursoId, cursoNome, prazo, timestamp: Date.now() };
        localStorage.setItem(`token_${tokenId}`, JSON.stringify(tokenData));
        if (window.firebaseReady && window.db) {
            window.db.collection('tokens').doc(tokenId).set(tokenData);
        }
        const link = `${baseUrl}?t=${tokenId}`;
        
        const novaAtribuicao = { 
            id: Date.now().toString() + '_' + user.replace(/[^a-z0-9]/gi, '_'), 
            colaboradorId: colaborador.id, 
            colaboradorUser: user, 
            colaboradorNome: nome, 
            colaboradorEmail: email, 
            colaboradorMatricula: matricula, 
            cursoId, cursoNome, prazo, 
            status: 'pendente', 
            dataCriacao: new Date().toISOString(), 
            token: tokenId, 
            link: link 
        };
        atribuicoes.push(novaAtribuicao);
        linksGerados.push({ nome, email, matricula, link, prazo, cursoNome, status: 'novo' });
        contadorSucesso++;
    }
    salvarAtribuicoes();
    const linksList = document.getElementById('links-list');
    const linksGeradosDiv = document.getElementById('links-gerados');
    if (linksList && linksGerados.length > 0) {
        linksList.innerHTML = linksGerados.map(l => `
            <div class="item-card" style="flex-direction:column;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div><strong>${escapeHtml(l.nome)}</strong> ${l.email?`<span style="font-size:11px;">(${escapeHtml(l.email)})</span>`:''} ${l.status==='reutilizado'?'<span style="background:var(--info-bg);padding:2px 8px;border-radius:12px;">Já atribuído</span>':'<span style="background:var(--success-bg);padding:2px 8px;border-radius:12px;">Novo</span>'}</div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-copiar-link-individual" data-link="${l.link}">📋 Copiar</button>
                        ${l.email?`<button class="btn-enviar-email-individual" data-email="${l.email}" data-nome="${l.nome}" data-link="${l.link}" data-prazo="${l.prazo}" data-curso="${l.cursoNome}">📧 Email</button>`:''}
                    </div>
                </div>
                <div style="margin-top:8px;padding:8px;background:var(--bg);border-radius:6px;font-size:11px;word-break:break-all;">${l.link}</div>
                <div style="margin-top:6px;font-size:10px;">📅 Prazo: ${l.prazo}</div>
            </div>
        `).join('');
        document.querySelectorAll('.btn-copiar-link-individual').forEach(btn => btn.addEventListener('click', () => copiarLinkIndividual(btn.dataset.link)));
        document.querySelectorAll('.btn-enviar-email-individual').forEach(btn => btn.addEventListener('click', () => enviarEmailIndividual(btn.dataset.email, btn.dataset.nome, btn.dataset.link, btn.dataset.prazo, btn.dataset.curso)));
        linksGeradosDiv.style.display = 'block';
        let msg = `✅ ${contadorSucesso} link(s) novo(s) gerado(s)!`;
        if (contadorReutilizados > 0) msg += ` ${contadorReutilizados} já existente(s).`;
        showToast(msg);
        renderAcompanhamento();
    }
}

function copiarLinkIndividual(link) {
  navigator.clipboard?.writeText(link).then(() => showToast('🔗 Link copiado!')).catch(() => {
    const textarea = document.createElement('textarea'); textarea.value = link;
    document.body.appendChild(textarea); textarea.select();
    document.execCommand('copy'); document.body.removeChild(textarea);
    showToast('🔗 Link copiado!');
  });
}

function copiarTodosLinks() {
  if (!linksGerados.length) { showToast('❌ Gere links primeiro'); return; }
  let texto = "LINKS DE ACESSO ÀS FORMAÇÕES\n\n";
  linksGerados.forEach(l => { texto += `👤 ${l.nome}\n📧 ${l.email || 'sem email'}\n📅 Prazo: ${l.prazo}\n🔗 ${l.link}\n───────────────────────\n\n`; });
  navigator.clipboard?.writeText(texto).then(() => showToast(`✅ ${linksGerados.length} links copiados!`)).catch(() => showToast('❌ Erro ao copiar'));
}

// ==================== ACOMPANHAMENTO ====================
function renderAcompanhamento() {
  const filtroFormacao = document.getElementById('filtro-formacao-acompanhar')?.value || '';
  const filtroStatus = document.getElementById('filtro-status-acompanhar')?.value || '';
  let filtered = [...atribuicoes];
  if (filtroFormacao) filtered = filtered.filter(a => a.cursoId === filtroFormacao);
  if (filtroStatus) filtered = filtered.filter(a => a.status === filtroStatus);
  const container = document.getElementById('acompanhar-lista');
  if (!container) return;
  if (!filtered.length) { container.innerHTML = '<div class="empty">Nenhuma atribuição encontrada.</div>'; return; }
  const grouped = {};
  filtered.forEach(a => { if (!grouped[a.cursoId]) grouped[a.cursoId] = { nome: a.cursoNome, atribuicoes: [] }; grouped[a.cursoId].atribuicoes.push(a); });
  container.innerHTML = Object.values(grouped).map(g => `
    <div class="acompanhar-card">
      <h4>📘 ${escapeHtml(g.nome)}</h4>
      <div class="acompanhar-sub"><h5>✅ Concluídos (${g.atribuicoes.filter(a=>a.status==='concluido').length})</h5><div class="acompanhar-lista">${g.atribuicoes.filter(a=>a.status==='concluido').map(a=>`<div class="acompanhar-item concluido"><span>${escapeHtml(a.colaboradorNome)}</span><button class="btn-ver-certificado" data-id="${a.id}">🎓</button></div>`).join('')||'<span>Nenhum</span>'}</div></div>
      <div class="acompanhar-sub"><h5>⏳ Pendentes (${g.atribuicoes.filter(a=>a.status!=='concluido').length})</h5><div class="acompanhar-lista">${g.atribuicoes.filter(a=>a.status!=='concluido').map(a=>`<div class="acompanhar-item pendente"><span>${escapeHtml(a.colaboradorNome)}</span><span>Prazo: ${a.prazo||'---'}</span><button class="btn-relembrar" data-id="${a.id}">📧</button></div>`).join('')||'<span>Nenhum</span>'}</div></div>
    </div>
  `).join('');
  document.querySelectorAll('.btn-ver-certificado').forEach(btn => btn.addEventListener('click', () => visualizarCertificadoAtribuicao(btn.dataset.id)));
  document.querySelectorAll('.btn-relembrar').forEach(btn => btn.addEventListener('click', () => relembrarColaborador(btn.dataset.id)));
}

function visualizarCertificadoAtribuicao(atribuicaoId) {
  const atribuicao = atribuicoes.find(a => a.id === atribuicaoId);
  if (!atribuicao) return;
  const registro = historicos.find(h => (h.nome === atribuicao.colaboradorUser || h.nomeDisplay === atribuicao.colaboradorNome) && h.cursoId === atribuicao.cursoId);
  if (!registro) { showToast('❌ Certificado não encontrado.'); return; }
  const formacao = formacoes.find(f => f.id === atribuicao.cursoId);
  const conteudoProgramatico = formacao?.conteudoProgramatico || formacao?.descricao || 'Conteúdo não especificado';
  const duracaoFormacao = formacao?.duracao || '—';
  const certId = registro.certificadoId || gerarCertificadoId();
  const fundoImagem = certTemplate.fundoImagem || 'assets/fundo_certificado.png';
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image:url('${fundoImagem}');background-size:cover;background-position:center;width:100%;aspect-ratio:210/297;padding:40px;box-sizing:border-box;">
      <div style="text-align:center;height:100%;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:900;color:#00338D;margin-bottom:10px;">${escapeHtml(registro.nomeDisplay || registro.nome)}</div>
        <div style="font-size:1.2rem;margin:20px 0;color:#616365;">concluiu com sucesso a formação</div>
        <div style="font-family:'Fraunces',serif;font-size:1.5rem;font-weight:700;color:#C5A059;margin-bottom:20px;">${escapeHtml(registro.curso)}</div>
        <div style="margin:20px 0;padding:15px;background:rgba(0,51,141,0.05);border-radius:8px;max-height:150px;overflow-y:auto;">
          <div style="font-size:0.9rem;font-weight:700;color:#00338D;margin-bottom:8px;">CONTEÚDO PROGRAMÁTICO</div>
          <div style="font-size:0.8rem;color:#444;line-height:1.4;text-align:left;white-space:pre-line;">${escapeHtml(conteudoProgramatico)}</div>
        </div>
        <div style="margin-top:30px;display:flex;justify-content:center;gap:40px;flex-wrap:wrap;">
          <div><div style="font-size:0.7rem;">NOTA FINAL</div><div style="font-size:1.3rem;font-weight:700;">${registro.nota}</div></div>
          <div><div style="font-size:0.7rem;">DURAÇÃO</div><div style="font-size:1rem;">${escapeHtml(duracaoFormacao)}</div></div>
          <div><div style="font-size:0.7rem;">DATA</div><div style="font-size:1rem;">${registro.data}</div></div>
          <div><div style="font-size:0.7rem;">CERTIFICADO ID</div><div style="font-family:monospace;font-size:0.9rem;">${certId}</div></div>
        </div>
      </div>
    </div>
  `;
  const modal = document.getElementById('modal-certificado');
  const content = document.getElementById('certificado-visualizacao');
  if (content) content.innerHTML = certHtml;
  if (modal) modal.style.display = 'flex';
  window.certificadoAtual = { html: certHtml, nome: registro.nomeDisplay || registro.nome };
}

function imprimirCertificadoModal() {
  const element = document.getElementById('certificado-visualizacao-pdf');
  if (!element) return;
  html2canvas(element, { scale: 3 }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><body style="margin:0;"><img src="${imgData}" style="width:100%;"></body><script>window.onload=function(){window.print();setTimeout(window.close,1000);}<\/script>`);
    printWindow.document.close();
  });
}

function baixarPDFCertificadoModal() {
  const element = document.getElementById('certificado-visualizacao-pdf');
  if (!element) return;
  html2canvas(element, { scale: 3 }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`certificado_${window.certificadoAtual?.nome || 'colaborador'}.pdf`);
    showToast('✅ PDF guardado!');
  });
}

function exportarAcompanhamentoExcel() {
  if (!atribuicoes.length) { showToast('❌ Sem dados para exportar'); return; }
  const dados = atribuicoes.map(a => ({ 'Formação': a.cursoNome, 'Colaborador': a.colaboradorNome, 'Matrícula': a.colaboradorMatricula || '', 'Email': a.colaboradorEmail || '', 'Prazo': a.prazo || '', 'Status': a.status === 'concluido' ? 'Concluído' : 'Pendente', 'Data Conclusão': a.dataConclusao ? formatDate(a.dataConclusao) : '' }));
  downloadExcel(dados, 'acompanhamento_formacoes', 'Acompanhamento');
}

// ==================== PUBLICAÇÃO ====================
function publicarFormacao() {
  const titulo = document.getElementById('f-titulo')?.value.trim() || '';
  const duracao = document.getElementById('f-duracao')?.value.trim() || '30 min';
  const conteudoProgramatico = document.getElementById('f-descricao')?.value.trim() || '';
  
  if (!titulo) { 
    showToast('❌ Título obrigatório'); 
    return; 
  }
  
  if (!modulos.length) { 
    showToast('❌ Adicione pelo menos um módulo'); 
    return; 
  }
  
  const novaFormacao = { 
    id: editandoFormacaoId || Date.now().toString(), 
    nome: titulo, 
    duracao: duracao,
    descricao: conteudoProgramatico,
    conteudoProgramatico: conteudoProgramatico,
    icone: '📚', 
    modulos: [...modulos], 
    perguntas: perguntas.map(p => ({ 
      id: p.id,
      texto: p.texto, 
      opcoes: p.opcoes, 
      correta: p.correta 
    })), 
    dataCriacao: new Date().toLocaleDateString('pt-PT'), 
    dataTimestamp: Date.now() 
  };
  
  if (editandoFormacaoId) {
    const index = formacoes.findIndex(f => f.id === editandoFormacaoId);
    if (index !== -1) formacoes[index] = novaFormacao;
    showToast(`✅ Formação "${titulo}" atualizada!`);
    editandoFormacaoId = null;
    document.getElementById('editando-id').innerHTML = '';
    document.getElementById('btn-cancelar-edicao').style.display = 'none';
  } else { 
    formacoes.push(novaFormacao); 
    showToast(`✅ Formação "${titulo}" publicada!`);
  }
  
  salvarFormacoes();
  
  document.getElementById('f-titulo').value = '';
  document.getElementById('f-duracao').value = '';
  document.getElementById('f-descricao').value = '';
  modulos = []; 
  perguntas = [];
  
  renderModulos(); 
  renderPerguntas(); 
  renderFormacoesLista(); 
  atualizarSelectores(); 
  atualizarDashboard();
}

// ==================== HISTÓRICO ====================
function renderHistorico() {
  const tbody = document.getElementById('lista-notas');
  const filtro = document.getElementById('filtro-colaborador-historico')?.value || '';
  let filtered = [...historicos];
  if (filtro) filtered = filtered.filter(h => (h.nome === filtro || h.nomeDisplay === filtro));
  const filtroSelect = document.getElementById('filtro-colaborador-historico');
  if (filtroSelect && filtroSelect.options.length <= 1) {
    const nomes = [...new Set(historicos.map(h => h.nomeDisplay || h.nome))];
    filtroSelect.innerHTML = '<option value="">Todos</option>' + nomes.map(n => `<option value="${n}">${escapeHtml(n)}</option>`).join('');
  }
  if (!tbody) return;
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum resultado registado</td></tr>'; return; }
  tbody.innerHTML = filtered.map(h => {
    const colab = colaboradores.find(c => c.user === h.nome || c.nome === h.nomeDisplay);
    const email = colab?.email || h.email || '-';
    return `<tr><td><strong>${escapeHtml(h.nomeDisplay || h.nome)}</strong></td><td>${escapeHtml(email)}</td><td>${escapeHtml(h.curso)}</td><td>${escapeHtml(h.data)}</td><td><span class="badge badge-success">${escapeHtml(h.nota)}</span></td><td><button class="btn-ver-certificado-historico" data-id="${h.id}">📄 Ver</button></td></tr>`;
  }).join('');
  document.querySelectorAll('.btn-ver-certificado-historico').forEach(btn => btn.addEventListener('click', () => visualizarCertificadoHistorico(btn.dataset.id)));
}

function visualizarCertificadoHistorico(historicoId) {
  const registro = historicos.find(h => h.id === historicoId);
  if (!registro) return;
  const formacao = formacoes.find(f => f.id === registro.cursoId);
  const conteudoProgramatico = formacao?.conteudoProgramatico || formacao?.descricao || 'Conteúdo não especificado';
  const duracaoFormacao = formacao?.duracao || '—';
  const certId = registro.certificadoId || gerarCertificadoId();
  const fundoImagem = certTemplate.fundoImagem || 'assets/fundo_certificado.png';
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image:url('${fundoImagem}');background-size:cover;background-position:center;width:100%;aspect-ratio:210/297;padding:40px;box-sizing:border-box;">
      <div style="text-align:center;height:100%;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-family:'Fraunces',serif;font-size:2rem;font-weight:900;color:#00338D;margin-bottom:10px;">${escapeHtml(registro.nomeDisplay || registro.nome)}</div>
        <div style="font-size:1.2rem;margin:20px 0;color:#616365;">concluiu com sucesso a formação</div>
        <div style="font-family:'Fraunces',serif;font-size:1.5rem;font-weight:700;color:#C5A059;margin-bottom:20px;">${escapeHtml(registro.curso)}</div>
        <div style="margin:20px 0;padding:15px;background:rgba(0,51,141,0.05);border-radius:8px;max-height:150px;overflow-y:auto;">
          <div style="font-size:0.9rem;font-weight:700;color:#00338D;margin-bottom:8px;">CONTEÚDO PROGRAMÁTICO</div>
          <div style="font-size:0.8rem;color:#444;line-height:1.4;text-align:left;white-space:pre-line;">${escapeHtml(conteudoProgramatico)}</div>
        </div>
        <div style="margin-top:30px;display:flex;justify-content:center;gap:40px;flex-wrap:wrap;">
          <div><div style="font-size:0.7rem;">NOTA FINAL</div><div style="font-size:1.3rem;font-weight:700;">${registro.nota}</div></div>
          <div><div style="font-size:0.7rem;">DURAÇÃO</div><div style="font-size:1rem;">${escapeHtml(duracaoFormacao)}</div></div>
          <div><div style="font-size:0.7rem;">DATA</div><div style="font-size:1rem;">${registro.data}</div></div>
          <div><div style="font-size:0.7rem;">CERTIFICADO ID</div><div style="font-family:monospace;font-size:0.9rem;">${certId}</div></div>
        </div>
      </div>
    </div>
  `;
  const modal = document.getElementById('modal-certificado');
  const content = document.getElementById('certificado-visualizacao');
  if (content) content.innerHTML = certHtml;
  if (modal) modal.style.display = 'flex';
  window.certificadoAtual = { html: certHtml, nome: registro.nomeDisplay || registro.nome };
}

function exportarHistoricoExcel() {
  if (!historicos.length) { showToast('❌ Sem dados para exportar'); return; }
  const dados = historicos.map(h => ({ 'Colaborador': h.nomeDisplay || h.nome, 'Email': h.email || '', 'Formação': h.curso, 'Data': h.data, 'Nota': h.nota }));
  downloadExcel(dados, 'historico_formacoes', 'Histórico');
}

function limparHistorico() {
  if (confirm('Apagar todo o histórico de formações?')) {
    historicos = []; salvarHistoricos(); renderHistorico(); atualizarDashboard(); renderAcompanhamento();
    showToast('✅ Histórico limpo!');
  }
}

// ==================== CERTIFICADO ====================
function inserirPlaceholder(ph) { const textarea = document.getElementById('cert-texto'); if (textarea) textarea.value += ph; }
function previewCertificado() {
  const preview = document.getElementById('cert-preview');
  const content = document.getElementById('cert-preview-content');
  const fundoImagem = document.getElementById('cert-fundo-imagem')?.value || '';
  let texto = document.getElementById('cert-texto')?.value || '';
  const titulo = document.getElementById('cert-titulo')?.value || '';
  const rodape = document.getElementById('cert-rodape')?.value || '';
  const dadosExemplo = { nome: "João Silva", formacao: "Formação Teste", data: new Date().toLocaleDateString('pt-PT'), nota: "85%", certificado_id: "CERT-001" };
  Object.entries(dadosExemplo).forEach(([k, v]) => { texto = texto.replace(new RegExp(`{{${k}}}`, 'g'), v); });
  const fundoStyle = fundoImagem ? `background-image:url('${fundoImagem}');background-size:cover;background-position:center;` : '';
  if (content) { content.innerHTML = `<div style="text-align:center;padding:20px;border:2px solid var(--birkenstock-gold);border-radius:16px;${fundoStyle}min-height:300px;"><h2>${escapeHtml(titulo)}</h2><div style="margin:20px 0;">${texto.replace(/\n/g,'<br>')}</div><div style="margin-top:20px;font-size:12px;">${escapeHtml(rodape)}</div></div>`; }
  if (preview) preview.style.display = 'block';
}
function salvarTemplateCertificado() {
  certTemplate = { fundoImagem: document.getElementById('cert-fundo-imagem')?.value || '', titulo: document.getElementById('cert-titulo')?.value || '', texto: document.getElementById('cert-texto')?.value || '', rodape: document.getElementById('cert-rodape')?.value || '' };
  localStorage.setItem('cert_template', JSON.stringify(certTemplate));
  showToast('✅ Template salvo!');
}
function resetTemplateCertificado() {
  certTemplate = JSON.parse(JSON.stringify(defaultCert));
  document.getElementById('cert-fundo-imagem').value = certTemplate.fundoImagem;
  document.getElementById('cert-titulo').value = certTemplate.titulo;
  document.getElementById('cert-texto').value = certTemplate.texto;
  document.getElementById('cert-rodape').value = certTemplate.rodape;
  showToast('✅ Template restaurado!');
}
function carregarTemplateCertificado() {
  const saved = localStorage.getItem('cert_template');
  if (saved) { try { const t = JSON.parse(saved); certTemplate = t; document.getElementById('cert-fundo-imagem').value = t.fundoImagem || ''; document.getElementById('cert-titulo').value = t.titulo || ''; document.getElementById('cert-texto').value = t.texto || ''; document.getElementById('cert-rodape').value = t.rodape || ''; } catch(e) {} }
}

// ==================== SEGURANÇA ====================
function checkPasswordStrength(pass) {
  let s = 0;
  if (pass.length >= 8) s++; if (/[A-Z]/.test(pass)) s++; if (/[0-9]/.test(pass)) s++; if (/[^a-zA-Z0-9]/.test(pass)) s++;
  const d = document.getElementById('password-strength-admin') || document.getElementById('password-strength');
  if (d) { d.className = 'password-strength'; if (s<=1) d.classList.add('strength-weak'); else if (s<=2) d.classList.add('strength-medium'); else d.classList.add('strength-strong'); }
}
function alterarPasswordAdmin() {
  const atual = document.getElementById('admin-pass-atual')?.value;
  const nova = document.getElementById('admin-pass-nova')?.value;
  const conf = document.getElementById('admin-pass-confirm')?.value;
  if (atual !== (localStorage.getItem('admin_password') || window.ADMIN_PASS)) { showToast('❌ Password atual incorreta'); return; }
  if (nova !== conf) { showToast('❌ Passwords não coincidem'); return; }
  if (nova.length < 6) { showToast('❌ Mínimo 6 caracteres'); return; }
  localStorage.setItem('admin_password', nova);
  window.ADMIN_PASS = nova;
  showToast('✅ Password alterada com sucesso!');
  document.getElementById('admin-pass-atual').value = '';
  document.getElementById('admin-pass-nova').value = '';
  document.getElementById('admin-pass-confirm').value = '';
}

// ==================== EDIÇÃO DE FORMAÇÃO ====================
function editarFormacao(id) {
  const formacao = formacoes.find(f => f.id === id);
  if (!formacao) return;
  
  document.getElementById('f-titulo').value = formacao.nome;
  document.getElementById('f-duracao').value = formacao.duracao;
  
  document.getElementById('f-descricao').value = formacao.conteudoProgramatico || formacao.descricao || '';
  
  modulos = formacao.modulos ? [...formacao.modulos] : [];
  perguntas = formacao.perguntas ? [...formacao.perguntas] : [];
  editandoFormacaoId = id;
  
  renderModulos(); 
  renderPerguntas();
  
  document.getElementById('editando-id').innerHTML = `✏️ Editando: ${escapeHtml(formacao.nome)}`;
  document.getElementById('btn-cancelar-edicao').style.display = 'inline-block';
  
  document.querySelector('.admin-tab[data-tab="formacoes"]')?.click();
}

function cancelarEdicao() {
  editandoFormacaoId = null;
  document.getElementById('f-titulo').value = '';
  document.getElementById('f-duracao').value = '';
  document.getElementById('f-descricao').value = '';
  modulos = []; perguntas = [];
  renderModulos(); renderPerguntas();
  document.getElementById('editando-id').innerHTML = '';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
}

// ==================== UTILITÁRIOS ====================
function switchTab(tabId) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${tabId}`)?.classList.add('active');
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.admin-tab[data-tab="${tabId}"]`)?.classList.add('active');
  if (tabId === 'colaboradores') renderColabs();
  if (tabId === 'historico') renderHistorico();
  if (tabId === 'atribuir') prepararAtribuicao();
  if (tabId === 'atribuir-massa') { linksGerados = []; document.getElementById('links-gerados').style.display = 'none'; }
  if (tabId === 'overview') atualizarDashboard();
  if (tabId === 'formacoes') renderFormacoesLista();
  if (tabId === 'certificado') carregarTemplateCertificado();
  if (tabId === 'acompanhar') renderAcompanhamento();
}

// ==================== INICIALIZAÇÃO ====================
function setupEventListeners() {
  document.getElementById('btn-save-user')?.addEventListener('click', saveUser);
  document.getElementById('btn-publicar')?.addEventListener('click', publicarFormacao);
  document.getElementById('btn-cancelar-edicao')?.addEventListener('click', cancelarEdicao);
  document.getElementById('btn-salvar-modulo')?.addEventListener('click', salvarModulo);
  document.getElementById('btn-salvar-pergunta')?.addEventListener('click', salvarPergunta);
  document.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  document.getElementById('import-csv')?.addEventListener('change', (e) => importColaboradores(e.target.files));
  document.getElementById('btn-download-modelo')?.addEventListener('click', downloadModeloCSV);
  document.getElementById('filtro-formacao-acompanhar')?.addEventListener('change', renderAcompanhamento);
  document.getElementById('filtro-status-acompanhar')?.addEventListener('change', renderAcompanhamento);
  document.getElementById('filtro-colaborador-historico')?.addEventListener('change', renderHistorico);
  document.getElementById('atribuir-curso')?.addEventListener('change', atualizarSelectores);
  document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none'));
}

function initAdmin() {
  // ✅ Verificar autenticação real do Firebase
  const firebaseUser = window.auth?.currentUser;
  const isAdminEmail = firebaseUser?.email && window.isAdminEmail ? window.isAdminEmail(firebaseUser.email) : false;
  
  if (!firebaseUser || !isAdminEmail) { 
    console.warn('🔒 Acesso negado - redirecionando para login');
    window.location.href = 'login.html'; 
    return; 
  }
  
  // Atualizar localStorage com dados do Firebase (apenas para UI, não para segurança)
  localStorage.setItem('usuarioAdmin', 'admin');
  localStorage.setItem('usuarioNome', firebaseUser.displayName || 'Administrador');
  localStorage.setItem('usuarioEmail', firebaseUser.email || '');
  
  carregarDadosExemplo().then(() => {
    setupEventListeners();
    renderModulos(); 
    renderPerguntas(); 
    renderColabs(); 
    renderHistorico();
    atualizarSelectores(); 
    atualizarDashboard(); 
    renderFormacoesLista();
    carregarTemplateCertificado(); 
    renderAcompanhamento();
    setTimeout(() => atualizarSelectores(), 500);
  });
}

function logout() {
  localStorage.removeItem('usuarioAdmin');
  localStorage.removeItem('usuarioNome');
  localStorage.removeItem('usuarioEmail');
  window.location.href = 'login.html';
}

// Expor funções globalmente
window.logout = logout;
window.prepararAtribuicao = prepararAtribuicao;
window.gerarCodigoAtribuicao = gerarCodigoAtribuicao;
window.EnvioEmail = EnvioEmail;
window.copiarLink = copiarLink;
window.selecionarTodos = selecionarTodos;
window.deselecionarTodos = deselecionarTodos;
window.gerarLinksMassa = gerarLinksMassa;
window.copiarTodosLinks = copiarTodosLinks;
window.enviarEmailsMassa = enviarEmailsMassa;
window.relembrarColaborador = relembrarColaborador;
window.visualizarCertificadoAtribuicao = visualizarCertificadoAtribuicao;
window.visualizarCertificadoHistorico = visualizarCertificadoHistorico;
window.imprimirCertificadoModal = imprimirCertificadoModal;
window.baixarPDFCertificadoModal = baixarPDFCertificadoModal;
window.exportarAcompanhamentoExcel = exportarAcompanhamentoExcel;
window.exportarHistoricoExcel = exportarHistoricoExcel;
window.limparHistorico = limparHistorico;
window.exportarColaboradoresExcel = exportarColaboradoresExcel;
window.inserirPlaceholder = inserirPlaceholder;
window.previewCertificado = previewCertificado;
window.salvarTemplateCertificado = salvarTemplateCertificado;
window.resetTemplateCertificado = resetTemplateCertificado;
window.checkPasswordStrength = checkPasswordStrength;
window.alterarPasswordAdmin = alterarPasswordAdmin;
window.cancelarEdicao = cancelarEdicao;
window.abrirModalModulo = abrirModalModulo;
window.abrirModalPergunta = abrirModalPergunta;
window.publicarFormacao = publicarFormacao;
window.editarFormacao = editarFormacao;
window.apagarFormacao = apagarFormacao;

document.addEventListener('DOMContentLoaded', initAdmin);
console.log("✅ admin.js carregado - versão completa com deteção de PDF");
