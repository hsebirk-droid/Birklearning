// ============================================
// ADMIN - LÓGICA PRINCIPAL (VERSÃO CORRIGIDA)
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

// ==================== FUNÇÃO CORRIGIDA - TOKEN SEGURO ====================
function gerarTokenSeguro(dados) {
    try {
        // 1. Converter para JSON
        const jsonStr = JSON.stringify(dados);
        
        // 2. Codificar para UTF-8 corretamente (suporta ç, ã, õ, etc)
        const utf8Str = unescape(encodeURIComponent(jsonStr));
        
        // 3. Converter para base64
        let base64 = btoa(utf8Str);
        
        // 4. Substituir caracteres problemáticos para URL
        base64 = base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        return base64;
    } catch(e) {
        console.error('Erro ao gerar token:', e);
        return Date.now() + '_' + dados.user.replace(/[^a-z0-9]/gi, '_');
    }
}

// ==================== DADOS ====================
// ==================== DADOS (CORRIGIDO - FIRESTORE PRIMEIRO) ====================
async function carregarDadosExemplo() {
  console.log('📦 A carregar dados...');
  
  // 1. Tentar carregar do FIRESTORE primeiro (nuvem)
  if (window.firebaseReady && window.db) {
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
      
      // Atualizar localStorage com os dados da nuvem (backup)
      localStorage.setItem('formacoes', JSON.stringify(formacoes));
      localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
      localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
      localStorage.setItem('historicos', JSON.stringify(historicos));
      
    } catch (error) {
      console.error('❌ Erro ao carregar do Firestore:', error);
      carregarDoLocalStorage();
    }
  } else {
    console.warn('⚠️ Firestore indisponível, usando localStorage');
    carregarDoLocalStorage();
  }
  
  // Se não houver dados, criar exemplos E GUARDAR NO FIRESTORE
  if (!formacoes || formacoes.length === 0) {
    console.log('📝 Criando formações de exemplo...');
    formacoes = [
      {
        id: "1",
        nome: "Atendimento ao Cliente",
        descricao: "Aprenda técnicas de atendimento ao cliente para garantir a satisfação dos consumidores.",
        duracao: "45 minutos",
        icone: "💬",
        modulos: [
          { id: "m1", titulo: "Introdução ao Atendimento", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "10 min" },
          { id: "m2", titulo: "Técnicas de Comunicação", tipo: "texto", conteudo: { texto: "<p>A comunicação eficaz é fundamental para um bom atendimento...</p>" }, duracao: "15 min" }
        ],
        perguntas: [
          { id: "p1", texto: "Qual é a primeira impressão?", opcoes: ["Olhar nos olhos", "Sorriso", "Postura correta", "Todas as anteriores"], correta: "D" }
        ]
      },
      {
        id: "2",
        nome: "Segurança no Trabalho",
        descricao: "Normas e procedimentos de segurança para o ambiente laboral.",
        duracao: "60 minutos",
        icone: "🛡️",
        modulos: [
          { id: "m1", titulo: "EPI's e sua Utilização", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "20 min" }
        ],
        perguntas: []
      }
    ];
    await salvarFormacoes();
  }
  
  if (!colaboradores || colaboradores.length === 0) {
    console.log('📝 Criando colaboradores de exemplo...');
    colaboradores = [
      { id: "c1", matricula: "001", user: "joao.silva", nome: "João Silva", email: "joao.silva@birkenstock.pt", pass: "123456" },
      { id: "c2", matricula: "002", user: "maria.santos", nome: "Maria Santos", email: "maria.santos@birkenstock.pt", pass: "123456" }
    ];
    await salvarColaboradores();
  }
  
  console.log('✅ Dados carregados com sucesso!');
}

function carregarDoLocalStorage() {
  formacoes = JSON.parse(localStorage.getItem('formacoes') || '[]');
  colaboradores = JSON.parse(localStorage.getItem('colaboradores') || '[]');
  atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
  historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  console.log('📦 Dados carregados do localStorage (fallback)');
}

// ==================== FUNÇÕES DE SALVAR (FIRESTORE + LOCALSTORAGE) ====================
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

function getColaboradoresList() {
  return colaboradores;
}

function getFormacoesList() {
  return formacoes;
}

// ==================== DASHBOARD ====================
function atualizarDashboard() {
  const totalFormacoes = formacoes.length;
  const totalColaboradores = colaboradores.length;
  const totalAtribuicoes = atribuicoes.length;
  const pendentes = atribuicoes.filter(a => a.status !== 'concluido').length;
  
  const dashboardGrid = document.getElementById('dashboard-grid');
  if (dashboardGrid) {
    dashboardGrid.innerHTML = `
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--info-bg)">📚</div>
        <div class="dash-info">
          <h3>${totalFormacoes}</h3>
          <p>Formações</p>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--success-bg)">👥</div>
        <div class="dash-info">
          <h3>${totalColaboradores}</h3>
          <p>Colaboradores</p>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--purple-bg)">🏅</div>
        <div class="dash-info">
          <h3>${totalAtribuicoes - pendentes}</h3>
          <p>Atribuições concluídas</p>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--warning-bg)">⏳</div>
        <div class="dash-info">
          <h3>${pendentes}</h3>
          <p>Pendentes</p>
        </div>
      </div>
    `;
  }
  
  const recentes = historicos.slice(-5).reverse();
  const recentActivities = document.getElementById('recent-activities');
  if (recentActivities) {
    recentActivities.innerHTML = recentes.length ? 
      recentes.map(h => `
        <div class="item-card">
          <div class="item-card-info">
            <strong>${escapeHtml(h.nomeDisplay || h.nome)}</strong> concluiu "${escapeHtml(h.curso)}" com ${escapeHtml(h.nota)}
          </div>
          <div class="item-card-meta">${escapeHtml(h.data)}</div>
        </div>
      `).join('') : 
      '<div class="empty">Sem atividades recentes.</div>';
  }
}

// ==================== ATRIBUIÇÃO INDIVIDUAL ====================
function prepararAtribuicao() {
    const colabs = colaboradores;
    const forms = formacoes;
    
    const selColab = document.getElementById('select-colaborador');
    const selForm = document.getElementById('select-formacao');
    
    if (selColab) {
        selColab.innerHTML = '<option value="">Selecione um colaborador...</option>' + 
            colabs.map(c => `<option value="${c.id}" data-nome="${escapeHtml(c.nome)}" data-email="${escapeHtml(c.email || '')}" data-matricula="${escapeHtml(c.matricula || '')}">${escapeHtml(c.nome)} (${c.matricula || c.user})</option>`).join('');
    }
    
    if (selForm) {
        selForm.innerHTML = '<option value="">Selecione uma formação...</option>' +
            forms.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
    }
}

function gerarCodigoAtribuicao() {
    const colabSelect = document.getElementById('select-colaborador');
    const cursoSelect = document.getElementById('select-formacao');
    const prazoInput = document.getElementById('atrib-prazo');
    
    const colabId = colabSelect?.value;
    const cursoId = cursoSelect?.value;
    const prazo = prazoInput?.value || '31/12/2026';

    if (!colabId) { showToast('❌ Selecione um colaborador'); return; }
    if (!cursoId) { showToast('❌ Selecione uma formação'); return; }

    const colaborador = colaboradores.find(c => c.id === colabId);
    const formacao = formacoes.find(f => f.id === cursoId);
    
    if (!colaborador || !formacao) {
        showToast('❌ Dados não encontrados');
        return;
    }

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
    
    const token = gerarTokenSeguro(tokenData);
    
    const urlBase = window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao.html';
    const linkFinal = `${urlBase}?token=${token}`;

    localStorage.setItem(`token_${token}`, JSON.stringify(tokenData));

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
        token: token,
        link: linkFinal
    };
    
    atribuicoes.push(novaAtribuicao);
    salvarAtribuicoes();

    const resultadoDiv = document.getElementById('resultado-atribuicao');
    const linkSpan = document.getElementById('link-gerado');
    if (resultadoDiv) resultadoDiv.style.display = 'block';
    if (linkSpan) linkSpan.textContent = linkFinal;
    
    window.linkAtualGerado = linkFinal;
    
    showToast("✅ Atribuição registada com sucesso!");
}

// ==================== FUNÇÃO CORRIGIDA - ENVIO DE EMAIL ====================
function EnvioEmail() {
    const colabSelect = document.getElementById('select-colaborador');
    const colabId = colabSelect?.value;
    
    if (!colabId) { 
        showToast('❌ Selecione um colaborador primeiro'); 
        return; 
    }
    
    const colaborador = colaboradores.find(c => c.id === colabId);
    const link = window.linkAtualGerado || document.getElementById('link-gerado')?.textContent || '';
    
    if (!link) {
        showToast('❌ Gere o link primeiro');
        return;
    }

    if (!colaborador?.email) {
        showToast('❌ Este colaborador não tem email registado');
        return;
    }

    // CORRIGIDO: Acentuação correta em "Formação"
    const assunto = encodeURIComponent('[Birkenstock] Nova Formação Atribuída');
    const corpo = encodeURIComponent(
        `Olá ${colaborador.nome},\n\n` +
        `Foi-lhe atribuída uma nova formação na plataforma Birkenstock S&CC Portugal.\n\n` +
        `🔗 Link de acesso: ${link}\n\n` +
        `📅 Prazo: ${document.getElementById('atrib-prazo')?.value || '31/12/2026'}\n\n` +
        `Atenciosamente,\nEquipa de Formação Birkenstock`
    );
    
    window.open(`mailto:${colaborador.email}?subject=${assunto}&body=${corpo}`);
    showToast(`📧 A abrir cliente de email para ${colaborador.nome}`);
}

function copiarLink() {
    const link = window.linkAtualGerado || document.getElementById('link-gerado')?.textContent;
    if (!link) { showToast('❌ Gere um link primeiro'); return; }
    
    navigator.clipboard?.writeText(link).then(() => {
        showToast("✅ Link copiado!");
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast("✅ Link copiado!");
    });
}

// ==================== GESTÃO DE FORMAÇÕES ====================
function renderFormacoesLista() {
  const container = document.getElementById('formacoes-list');
  if (!container) return;
  
  if (!formacoes.length) {
    container.innerHTML = '<div class="empty">Nenhuma formação criada.</div>';
    return;
  }
  
  container.innerHTML = formacoes.map(curso => `
    <div class="item-card">
      <div class="item-card-info">
        <div class="item-card-title">📘 ${escapeHtml(curso.nome)}</div>
        <div class="item-card-meta">${curso.modulos?.length || 0} módulos · ${curso.perguntas?.length || 0} perguntas</div>
      </div>
      <div class="item-card-actions">
        <button class="btn-editar-formacao" data-id="${curso.id}" style="color:var(--info)">✏️ Editar</button>
        <button class="btn-apagar-formacao" data-id="${curso.id}" style="color:var(--danger)">🗑️ Apagar</button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.btn-editar-formacao').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editarFormacao(btn.dataset.id);
    });
  });
  
  document.querySelectorAll('.btn-apagar-formacao').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      apagarFormacao(btn.dataset.id);
    });
  });
}

function apagarFormacao(id) {
  if (!confirm('Apagar esta formação permanentemente?')) return;
  formacoes = formacoes.filter(f => f.id !== id);
  salvarFormacoes();
  renderFormacoesLista();
  atualizarDashboard();
  atualizarSelectores();
  renderAcompanhamento();
  showToast('✅ Formação apagada!');
}

// ==================== MÓDULOS ====================
function abrirModalModulo(tipo) {
  moduloTipoAtual = tipo;
  editandoModuloId = null;
  
  document.getElementById('modulo-titulo').value = '';
  document.getElementById('modulo-duracao').value = '';
  document.getElementById('modulo-video-url').value = '';
  document.getElementById('modulo-texto-conteudo').value = '';
  document.getElementById('modulo-link-url').value = '';
  
  document.getElementById('modulo-conteudo-video').style.display = tipo === 'video' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-texto').style.display = tipo === 'texto' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-link').style.display = tipo === 'link' ? 'block' : 'none';
  
  const titulos = { video: '🎬 Adicionar Vídeo', texto: '📄 Adicionar Texto', link: '🔗 Adicionar Link' };
  document.getElementById('modal-modulo-titulo').textContent = titulos[tipo] || 'Adicionar Módulo';
  
  document.getElementById('modal-modulo').style.display = 'flex';
}

function editarModulo(id) {
  const m = modulos.find(m => m.id === id);
  if (!m) return;
  
  editandoModuloId = id;
  moduloTipoAtual = m.tipo;
  
  document.getElementById('modulo-titulo').value = m.titulo;
  document.getElementById('modulo-duracao').value = m.duracao;
  
  document.getElementById('modulo-conteudo-video').style.display = m.tipo === 'video' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-texto').style.display = m.tipo === 'texto' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-link').style.display = m.tipo === 'link' ? 'block' : 'none';
  
  if (m.tipo === 'video') document.getElementById('modulo-video-url').value = m.conteudo?.url || '';
  if (m.tipo === 'texto') document.getElementById('modulo-texto-conteudo').value = m.conteudo?.texto || '';
  if (m.tipo === 'link') document.getElementById('modulo-link-url').value = m.conteudo?.url || '';
  
  document.getElementById('modal-modulo').style.display = 'flex';
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
    conteudo = { url };
  }
  
  const duracao = document.getElementById('modulo-duracao').value.trim() || '15 min';
  
  const novoModulo = {
    id: editandoModuloId || Date.now().toString(),
    titulo: titulo,
    tipo: moduloTipoAtual,
    conteudo: conteudo,
    duracao: duracao
  };
  
  if (editandoModuloId) {
    const index = modulos.findIndex(m => m.id === editandoModuloId);
    if (index !== -1) modulos[index] = novoModulo;
    editandoModuloId = null;
  } else {
    modulos.push(novoModulo);
  }
  
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
  
  if (!modulos.length) {
    container.innerHTML = '<div class="alert alert-info">Nenhum módulo adicionado. Clique nos botões acima para adicionar.</div>';
    return;
  }
  
  container.innerHTML = modulos.map((m, idx) => `
    <div class="modulo-card">
      <div style="flex:1">
        <div style="font-weight: 700;">${idx + 1}. ${escapeHtml(m.titulo)}</div>
        <div style="font-size: 11px; color: var(--birkenstock-gray);">${m.tipo === 'video' ? '🎬 Vídeo' : m.tipo === 'texto' ? '📄 Texto' : '🔗 Link'} · ${m.duracao}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-editar-modulo" data-id="${m.id}" style="background: var(--info); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">✏️</button>
        <button class="btn-remover-modulo" data-id="${m.id}" style="background: var(--danger); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.btn-editar-modulo').forEach(btn => {
    btn.addEventListener('click', () => editarModulo(btn.dataset.id));
  });
  document.querySelectorAll('.btn-remover-modulo').forEach(btn => {
    btn.addEventListener('click', () => removerModulo(btn.dataset.id));
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
  } else {
    perguntas.push({ id: Date.now().toString(), texto, opcoes, correta });
  }
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
  
  if (!perguntas.length) {
    container.innerHTML = '<div class="alert alert-info">Nenhuma pergunta adicionada. Clique em "Adicionar Pergunta".</div>';
    return;
  }
  container.innerHTML = perguntas.map((p, idx) => `
    <div class="pergunta-card">
      <div style="margin-bottom: 8px;"><strong>${idx + 1}. ${escapeHtml(p.texto)}</strong></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
        <div>A) ${escapeHtml(p.opcoes[0])}</div>
        <div>B) ${escapeHtml(p.opcoes[1])}</div>
        <div>C) ${escapeHtml(p.opcoes[2])}</div>
        <div>D) ${escapeHtml(p.opcoes[3])}</div>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: var(--success);">✅ Correta: ${p.correta}</div>
      <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-editar-pergunta" data-id="${p.id}" style="background: var(--info); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">✏️ Editar</button>
        <button class="btn-remover-pergunta" data-id="${p.id}" style="background: var(--danger); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️ Remover</button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.btn-editar-pergunta').forEach(btn => {
    btn.addEventListener('click', () => editarPergunta(btn.dataset.id));
  });
  document.querySelectorAll('.btn-remover-pergunta').forEach(btn => {
    btn.addEventListener('click', () => removerPergunta(btn.dataset.id));
  });
}

// ==================== COLABORADORES ====================
function renderColabs() {
  const tbody = document.getElementById('colab-list-table');
  if (!tbody) return;
  
  if (!colaboradores.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhum colaborador cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = colaboradores.map(c => `
    <tr>
      <td data-label="Matrícula">${escapeHtml(c.matricula || '-')}</td>
      <td data-label="Nome">${escapeHtml(c.nome || c.user)}</td>
      <td data-label="Email">${escapeHtml(c.email || '-')}</td>
      <td data-label="Ações">
        <button class="btn-remover-colab" data-id="${c.id}" class="btn-sm btn-danger">🗑️ Remover</button>
      </td>
    </tr>
  `).join('');
  
  document.querySelectorAll('.btn-remover-colab').forEach(btn => {
    btn.addEventListener('click', () => removerColab(btn.dataset.id));
  });
}

function removerColab(id) {
  if (confirm('Remover colaborador?')) {
    colaboradores = colaboradores.filter(c => c.id !== id);
    salvarColaboradores();
    renderColabs();
    atualizarSelectores();
    atualizarDashboard();
    renderAcompanhamento();
    showToast('✅ Colaborador removido!');
  }
}

function saveUser() {
  const matricula = document.getElementById('u-matricula')?.value.trim() || '';
  const nome = document.getElementById('u-nome')?.value.trim() || '';
  const email = document.getElementById('u-email')?.value.trim() || '';
  const pass = document.getElementById('u-pass')?.value || '';
  const user = nome.toLowerCase().replace(/\s+/g, '.');
  
  if (!nome || !pass) { showToast('❌ Preencha nome e password.'); return; }
  
  const novoColab = {
    id: Date.now().toString(),
    matricula,
    user,
    nome,
    email,
    pass,
    dataCriacao: new Date().toISOString()
  };
  
  colaboradores.push(novoColab);
  salvarColaboradores();
  
  showToast('✅ Colaborador criado!');
  document.getElementById('u-matricula').value = '';
  document.getElementById('u-nome').value = '';
  document.getElementById('u-email').value = '';
  document.getElementById('u-pass').value = '';
  renderColabs();
  atualizarSelectores();
  atualizarDashboard();
  renderAcompanhamento();
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
          colaboradores.push({
            id: Date.now().toString() + imported,
            matricula, user, nome, email, pass,
            dataCriacao: new Date().toISOString()
          });
          imported++;
        }
      }
    }
    salvarColaboradores();
    showToast(`✅ Importados ${imported} colaboradores!`);
    renderColabs();
    atualizarSelectores();
    atualizarDashboard();
    renderAcompanhamento();
  };
  reader.readAsText(files[0], 'UTF-8');
}

function downloadModeloCSV() {
  const csv = "matricula,nome,email,password\n001,João Silva,joao.silva@empresa.pt,birkenstock2024\n002,Maria Santos,maria.santos@empresa.pt,birkenstock2024";
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'modelo_colaboradores.csv';
  link.click();
}

function exportarColaboradoresExcel() {
  if (!colaboradores.length) { showToast('❌ Sem colaboradores para exportar'); return; }
  const dados = colaboradores.map(c => ({
    'Matrícula': c.matricula || '',
    'Nome': c.nome || c.user,
    'Email': c.email || '',
    'Data Criação': c.dataCriacao ? formatDate(c.dataCriacao) : ''
  }));
  downloadExcel(dados, 'colaboradores', 'Colaboradores');
}

// ==================== ATRIBUIÇÃO EM MASSA ====================
function atualizarSelectores() {
  const atribuirCurso = document.getElementById('atribuir-curso');
  const colabGrid = document.getElementById('colab-selector-grid');
  
  const valorSelecionado = atribuirCurso ? atribuirCurso.value : '';
  
  if (atribuirCurso) {
    atribuirCurso.innerHTML = '<option value="">Selecione uma formação</option>' +
      formacoes.map(c => `<option value="${c.id}" ${valorSelecionado === c.id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('');
  }
  
  if (colabGrid) {
    const cursoSelecionado = atribuirCurso?.value || '';
    colabGrid.innerHTML = colaboradores.map(c => {
      const jaConcluiu = historicos.some(h => (h.nome === c.user || h.nomeDisplay === c.nome) && h.cursoId === cursoSelecionado);
      const jaAtribuido = atribuicoes.some(a => a.colaboradorUser === c.user && a.cursoId === cursoSelecionado && a.status !== 'concluido');
      
      let statusHtml = '';
      if (jaConcluiu) {
        statusHtml = '<span class="colab-completed" title="Já concluiu esta formação">✅</span>';
      } else if (jaAtribuido) {
        statusHtml = '<span class="colab-completed" title="Já atribuído">⏳</span>';
      }
      
      return `
        <label class="colab-check">
          <input type="checkbox" value="${c.id}" data-user="${c.user || c.email}" data-email="${c.email || ''}" data-nome="${c.nome}" data-matricula="${c.matricula || ''}" ${jaConcluiu ? 'disabled' : ''}>
          ${escapeHtml(c.nome)} (${c.matricula || c.user})
          ${statusHtml}
        </label>
      `;
    }).join('');
  }
  
  const filtroFormacao = document.getElementById('filtro-formacao-acompanhar');
  if (filtroFormacao) {
    filtroFormacao.innerHTML = '<option value="">Todas formações</option>' +
      formacoes.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
  }
}  

function selecionarTodos() {
  document.querySelectorAll('#colab-selector-grid input:not(:disabled)').forEach(cb => cb.checked = true);
}

function deselecionarTodos() {
  document.querySelectorAll('#colab-selector-grid input').forEach(cb => cb.checked = false);
}

function gerarLinksMassa() {
    const cursoId = document.getElementById('atribuir-curso')?.value;
    if (!cursoId) { showToast('❌ Selecione uma formação'); return; }
    
    const selected = Array.from(document.querySelectorAll('#colab-selector-grid input:checked:not(:disabled)'));
    
    if (!selected.length) { showToast('❌ Selecione pelo menos um colaborador'); return; }
    
    const prazo = document.getElementById('atribuir-prazo')?.value || '31/12/2026';
    const cursoNome = document.getElementById('atribuir-curso')?.selectedOptions[0]?.text || 'Formação';
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao.html';
    
    linksGerados = [];
    let contadorSucesso = 0;
    let contadorReutilizados = 0;
    
    for (const cb of selected) {
        const colaboradorId = cb.value;
        const colaborador = colaboradores.find(c => c.id === colaboradorId);
        
        if (!colaborador) continue;
        
        const user = colaborador.user || colaborador.email;
        const nome = colaborador.nome;
        const email = colaborador.email || '';
        const matricula = colaborador.matricula || '';
        
        const atribuicaoExistente = atribuicoes.find(a =>
            a.colaboradorUser === user && 
            a.cursoId === cursoId && 
            a.status !== 'concluido'
        );
        
        if (atribuicaoExistente) {
            linksGerados.push({ nome, email, matricula, link: atribuicaoExistente.link, prazo, cursoNome, status: 'reutilizado' });
            contadorReutilizados++;
            continue;
        }
        
        const tokenData = { user, nome, email, matricula, cursoId, cursoNome, prazo, timestamp: Date.now() };
        const token = gerarTokenSeguro(tokenData);
        const link = `${baseUrl}?token=${token}`;
        
        localStorage.setItem(`token_${token}`, JSON.stringify(tokenData));
        
        const novaAtribuicao = {
            id: Date.now().toString() + '_' + user.replace(/[^a-z0-9]/gi, '_'),
            colaboradorId: colaborador.id,
            colaboradorUser: user,
            colaboradorNome: nome,
            colaboradorEmail: email,
            colaboradorMatricula: matricula,
            cursoId: cursoId,
            cursoNome: cursoNome,
            prazo: prazo,
            status: 'pendente',
            dataCriacao: new Date().toISOString(),
            token: token,
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
            <div class="item-card" style="flex-direction: column; align-items: stretch; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <strong>${escapeHtml(l.nome)}</strong>
                        ${l.email ? `<span style="font-size: 11px; color: #666;">(${escapeHtml(l.email)})</span>` : ''}
                        ${l.status === 'reutilizado' ? '<span style="background:var(--info-bg); color:var(--info); padding:2px 8px; border-radius:12px; font-size:10px; margin-left:8px;">Já atribuído</span>' : '<span style="background:var(--success-bg); color:var(--success); padding:2px 8px; border-radius:12px; font-size:10px; margin-left:8px;">Novo</span>'}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-sm btn-copiar-link-individual" data-link="${l.link.replace(/'/g, "\\'")}" style="background:var(--info); color:white;">📋 Copiar Link</button>
                        ${l.email ? `<button class="btn-sm btn-success btn-enviar-email-individual" data-email="${l.email.replace(/'/g, "\\'")}" data-nome="${l.nome.replace(/'/g, "\\'")}" data-link="${l.link.replace(/'/g, "\\'")}" data-prazo="${l.prazo.replace(/'/g, "\\'")}" data-curso="${l.cursoNome.replace(/'/g, "\\'")}">📧 Enviar Email</button>` : ''}
                    </div>
                </div>
                <div style="margin-top: 8px; padding: 8px; background: var(--bg); border-radius: 6px; font-size: 11px; word-break: break-all; font-family: monospace;">
                    ${l.link}
                </div>
                <div style="margin-top: 6px; font-size: 10px; color: var(--birkenstock-gray);">
                    📅 Prazo: ${l.prazo}
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.btn-copiar-link-individual').forEach(btn => {
            btn.addEventListener('click', () => copiarLinkIndividual(btn.dataset.link));
        });
        document.querySelectorAll('.btn-enviar-email-individual').forEach(btn => {
            btn.addEventListener('click', () => enviarEmailIndividual(btn.dataset.email, btn.dataset.nome, btn.dataset.link, btn.dataset.prazo, btn.dataset.curso));
        });
        
        linksGeradosDiv.style.display = 'block';
        
        let msg = `✅ ${contadorSucesso} link(s) novo(s) gerado(s)!`;
        if (contadorReutilizados > 0) msg += ` ${contadorReutilizados} já existente(s).`;
        showToast(msg);
        renderAcompanhamento();
    }
}

function copiarLinkIndividual(link) {
  navigator.clipboard?.writeText(link).then(() => {
    showToast('🔗 Link copiado!');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = link;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('🔗 Link copiado!');
  });
}

function copiarTodosLinks() {
  if (!linksGerados.length) { showToast('❌ Gere links primeiro'); return; }
  let texto = "LINKS DE ACESSO ÀS FORMAÇÕES\n\n";
  linksGerados.forEach(l => {
    texto += `👤 ${l.nome}\n📧 ${l.email || 'sem email'}\n📅 Prazo: ${l.prazo}\n🔗 ${l.link}\n───────────────────────\n\n`;
  });
  navigator.clipboard?.writeText(texto).then(() => {
    showToast(`✅ ${linksGerados.length} links copiados!`);
  }).catch(() => {
    showToast('❌ Erro ao copiar');
  });
}

function enviarEmailsMassa() {
  if (!linksGerados.length) { showToast('❌ Gere links primeiro'); return; }
  
  const emailsList = linksGerados.filter(l => l.email).map(l => ({
    nome: l.nome,
    email: l.email,
    link: l.link,
    prazo: l.prazo,
    curso: l.cursoNome
  }));
  
  if (emailsList.length === 0) {
    showToast('❌ Nenhum colaborador tem email');
    return;
  }
  
  emailsList.forEach(e => {
    const assunto = encodeURIComponent(`[Birkenstock] Formação: ${e.curso}`);
    const corpo = encodeURIComponent(
      `Olá ${e.nome},\n\nFoi-lhe atribuída a formação "${e.curso}".\n\nPrazo: ${e.prazo}\n\nAceda através do link:\n${e.link}\n\nAtenciosamente,\nEquipa de Formação Birkenstock`
    );
    window.open(`mailto:${e.email}?subject=${assunto}&body=${corpo}`);
  });
  showToast(`📧 A abrir ${emailsList.length} emails...`);
}

// ==================== FUNÇÃO CORRIGIDA - ENVIO DE EMAIL INDIVIDUAL ====================
function enviarEmailIndividual(email, nome, link, prazo, cursoNome) {
    if (!email) {
        showToast('❌ Este colaborador não tem email');
        return;
    }
    
    // CORRIGIDO: Acentuação correta
    const assunto = encodeURIComponent(`[Birkenstock] Formação: ${cursoNome}`);
    const corpo = encodeURIComponent(
        `Olá ${nome},\n\n` +
        `Foi-lhe atribuída a formação "${cursoNome}" na plataforma Birkenstock S&CC Portugal.\n\n` +
        `Link de acesso: ${link}\n\n` +
        `Prazo: ${prazo}\n\n` +
        `Atenciosamente,\nEquipa de Formação Birkenstock`
    );
    
    window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`);
    showToast(`📧 A abrir email para ${nome}`);
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
  
  if (!filtered.length) {
    container.innerHTML = '<div class="empty">Nenhuma atribuição encontrada.</div>';
    return;
  }
  
  const grouped = {};
  filtered.forEach(a => {
    if (!grouped[a.cursoId]) grouped[a.cursoId] = { nome: a.cursoNome, atribuicoes: [] };
    grouped[a.cursoId].atribuicoes.push(a);
  });
  
  container.innerHTML = Object.values(grouped).map(g => `
    <div class="acompanhar-card">
      <h4>📘 ${escapeHtml(g.nome)}</h4>
      <div class="acompanhar-sub">
        <h5>✅ Concluídos (${g.atribuicoes.filter(a => a.status === 'concluido').length})</h5>
        <div class="acompanhar-lista">
          ${g.atribuicoes.filter(a => a.status === 'concluido').map(a => `
            <div class="acompanhar-item concluido">
              <span>${escapeHtml(a.colaboradorNome)}</span>
              <button class="btn-ver-certificado" data-id="${a.id}" title="Ver certificado">🎓</button>
            </div>
          `).join('') || '<span style="color:gray;">Nenhum</span>'}
        </div>
      </div>
      <div class="acompanhar-sub">
        <h5>⏳ Pendentes (${g.atribuicoes.filter(a => a.status !== 'concluido').length})</h5>
        <div class="acompanhar-lista">
          ${g.atribuicoes.filter(a => a.status !== 'concluido').map(a => `
            <div class="acompanhar-item pendente">
              <span>${escapeHtml(a.colaboradorNome)}</span>
              <span style="font-size:10px;">Prazo: ${a.prazo || '---'}</span>
              <button class="btn-relembrar" data-id="${a.id}" title="Enviar lembrete">📧</button>
            </div>
          `).join('') || '<span style="color:gray;">Nenhum</span>'}
        </div>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.btn-ver-certificado').forEach(btn => {
    btn.addEventListener('click', () => visualizarCertificadoAtribuicao(btn.dataset.id));
  });
  document.querySelectorAll('.btn-relembrar').forEach(btn => {
    btn.addEventListener('click', () => relembrarColaborador(btn.dataset.id));
  });
}

function relembrarColaborador(atribuicaoId) {
  const atribuicao = atribuicoes.find(a => a.id === atribuicaoId);
  if (!atribuicao) return;
  
  const assunto = encodeURIComponent(`[Birkenstock] Lembrete: ${atribuicao.cursoNome}`);
  const corpo = encodeURIComponent(
    `Olá ${atribuicao.colaboradorNome},\n\nRecordamos que ainda tem pendente a formação "${atribuicao.cursoNome}".\n\nPrazo: ${atribuicao.prazo}\n\nAceda através do link:\n${atribuicao.link}\n\nAtenciosamente,\nEquipa de Formação Birkenstock`
  );
  window.open(`mailto:${atribuicao.colaboradorEmail}?subject=${assunto}&body=${corpo}`);
  showToast(`📧 Email de lembrete aberto para ${atribuicao.colaboradorNome}`);
}

function visualizarCertificadoAtribuicao(atribuicaoId) {
  const atribuicao = atribuicoes.find(a => a.id === atribuicaoId);
  if (!atribuicao) return;
  
  const registro = historicos.find(h => (h.nome === atribuicao.colaboradorUser || h.nomeDisplay === atribuicao.colaboradorNome) && h.cursoId === atribuicao.cursoId);
  if (!registro) {
    showToast('❌ Certificado não encontrado.');
    return;
  }
  
  // NOVO: Buscar a formação para obter o conteúdo programático
  const formacao = formacoes.find(f => f.id === atribuicao.cursoId);
  const conteudoProgramatico = formacao?.conteudoProgramatico || formacao?.descricao || 'Conteúdo não especificado';
  
  const certId = registro.certificadoId || gerarCertificadoId();
  const fundoImagem = certTemplate.fundoImagem || 'assets/fundo_certificado.png';
  
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image: url('${fundoImagem}'); background-size: cover; background-position: center; width: 100%; aspect-ratio: 210/297; position: relative; padding: 40px; box-sizing: border-box;">
      <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 900; color: #00338D; margin-bottom: 10px;">${escapeHtml(registro.nomeDisplay || registro.nome)}</div>
        <div style="font-size: 1.2rem; margin: 20px 0; color: #616365;">concluiu com sucesso a formação</div>
        <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059; margin-bottom: 20px;">${escapeHtml(registro.curso)}</div>
        
        <!-- CONTEÚDO PROGRAMÁTICO -->
        <div style="margin: 20px 0; padding: 15px; background: rgba(0,51,141,0.05); border-radius: 8px; max-height: 150px; overflow-y: auto;">
          <div style="font-size: 0.9rem; font-weight: 700; color: #00338D; margin-bottom: 8px;">CONTEÚDO PROGRAMÁTICO</div>
          <div style="font-size: 0.8rem; color: #444; line-height: 1.4; text-align: left; white-space: pre-line;">${escapeHtml(conteudoProgramatico)}</div>
        </div>
        
        <div style="margin-top: 30px; display: flex; justify-content: center; gap: 40px;">
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #616365;">NOTA FINAL</div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #00338D;">${registro.nota}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #616365;">DATA</div>
            <div style="font-size: 1rem; font-weight: 600; color: #00338D;">${registro.data}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #616365;">CERTIFICADO ID</div>
            <div style="font-family: monospace; font-size: 0.9rem; font-weight: 600; color: #00338D;">${certId}</div>
          </div>
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
    printWindow.document.write(`
      <html><body style="margin:0;padding:0;"><img src="${imgData}" style="width:100%;height:auto;"></body>
      <script>window.onload=function(){window.print();setTimeout(window.close,1000);}<\/script>
    `);
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
  const dados = atribuicoes.map(a => ({
    'Formação': a.cursoNome,
    'Colaborador': a.colaboradorNome,
    'Matrícula': a.colaboradorMatricula || '',
    'Email': a.colaboradorEmail || '',
    'Prazo': a.prazo || '',
    'Status': a.status === 'concluido' ? 'Concluído' : 'Pendente',
    'Data Conclusão': a.dataConclusao ? formatDate(a.dataConclusao) : ''
  }));
  downloadExcel(dados, 'acompanhamento_formacoes', 'Acompanhamento');
}

// ==================== PUBLICAÇÃO ====================
function publicarFormacao() {
  const titulo = document.getElementById('f-titulo')?.value.trim() || '';
  if (!titulo) { showToast('❌ Título obrigatório'); return; }
  if (!modulos.length) { showToast('❌ Adicione pelo menos um módulo'); return; }
  
  const novaFormacao = {
    id: editandoFormacaoId || Date.now().toString(),
    nome: titulo,
    duracao: document.getElementById('f-duracao')?.value || '30 min',
    descricao: document.getElementById('f-descricao')?.value || '',  // ← Mantém o campo "descricao" internamente
    conteudoProgramatico: document.getElementById('f-descricao')?.value || '', // ← NOVO CAMPO
    icone: '📚',
    modulos: [...modulos],
    perguntas: perguntas.map(p => ({ texto: p.texto, opcoes: p.opcoes, correta: p.correta })),
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
  
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum resultado registado</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(h => {
    const colab = colaboradores.find(c => c.user === h.nome || c.nome === h.nomeDisplay);
    const email = colab?.email || h.email || '-';
    return `
      <tr>
        <td data-label="Colaborador"><strong>${escapeHtml(h.nomeDisplay || h.nome)}</strong></td>
        <td data-label="Email">${escapeHtml(email)}</td>
        <td data-label="Formação">${escapeHtml(h.curso)}</td>
        <td data-label="Data">${escapeHtml(h.data)}</td>
        <td data-label="Nota"><span class="badge badge-success">${escapeHtml(h.nota)}</span></td>
        <td data-label="Certificado"><button class="btn-sm btn-ver-certificado-historico" data-id="${h.id}">📄 Ver</button></td>
      </tr>
    `;
  }).join('');
  
  document.querySelectorAll('.btn-ver-certificado-historico').forEach(btn => {
    btn.addEventListener('click', () => visualizarCertificadoHistorico(btn.dataset.id));
  });
}

function visualizarCertificadoHistorico(historicoId) {
  const registro = historicos.find(h => h.id === historicoId);
  if (!registro) return;
  
  // NOVO: Buscar a formação para obter o conteúdo programático
  const formacao = formacoes.find(f => f.id === registro.cursoId);
  const conteudoProgramatico = formacao?.conteudoProgramatico || formacao?.descricao || 'Conteúdo não especificado';
  
  const certId = registro.certificadoId || gerarCertificadoId();
  const fundoImagem = certTemplate.fundoImagem || 'assets/fundo_certificado.png';
  
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image: url('${fundoImagem}'); background-size: cover; background-position: center; width: 100%; aspect-ratio: 210/297; position: relative; padding: 40px; box-sizing: border-box;">
      <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 900; color: #00338D; margin-bottom: 10px;">${escapeHtml(registro.nomeDisplay || registro.nome)}</div>
        <div style="font-size: 1.2rem; margin: 20px 0; color: #616365;">concluiu com sucesso a formação</div>
        <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059; margin-bottom: 20px;">${escapeHtml(registro.curso)}</div>
        
        <!-- CONTEÚDO PROGRAMÁTICO -->
        <div style="margin: 20px 0; padding: 15px; background: rgba(0,51,141,0.05); border-radius: 8px; max-height: 150px; overflow-y: auto;">
          <div style="font-size: 0.9rem; font-weight: 700; color: #00338D; margin-bottom: 8px;">CONTEÚDO PROGRAMÁTICO</div>
          <div style="font-size: 0.8rem; color: #444; line-height: 1.4; text-align: left; white-space: pre-line;">${escapeHtml(conteudoProgramatico)}</div>
        </div>
        
        <div style="margin-top: 30px; display: flex; justify-content: center; gap: 40px;">
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #616365;">NOTA FINAL</div>
            <div style="font-size: 1.3rem; font-weight: 700; color: #00338D;">${registro.nota}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #616365;">DATA</div>
            <div style="font-size: 1rem; font-weight: 600; color: #00338D;">${registro.data}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #616365;">CERTIFICADO ID</div>
            <div style="font-family: monospace; font-size: 0.9rem; font-weight: 600; color: #00338D;">${certId}</div>
          </div>
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
  const dados = historicos.map(h => ({
    'Colaborador': h.nomeDisplay || h.nome,
    'Email': h.email || '',
    'Formação': h.curso,
    'Data': h.data,
    'Nota': h.nota
  }));
  downloadExcel(dados, 'historico_formacoes', 'Histórico');
}

function limparHistorico() {
  if (confirm('Apagar todo o histórico de formações?')) {
    historicos = [];
    salvarHistoricos();
    renderHistorico();
    atualizarDashboard();
    renderAcompanhamento();
    showToast('✅ Histórico limpo!');
  }
}

// ==================== CERTIFICADO ====================
function inserirPlaceholder(ph) {
  const textarea = document.getElementById('cert-texto');
  if (textarea) textarea.value += ph;
}

function previewCertificado() {
  const preview = document.getElementById('cert-preview');
  const content = document.getElementById('cert-preview-content');
  const fundoImagem = document.getElementById('cert-fundo-imagem')?.value || '';
  let texto = document.getElementById('cert-texto')?.value || '';
  const titulo = document.getElementById('cert-titulo')?.value || '';
  const rodape = document.getElementById('cert-rodape')?.value || '';
  
  const dadosExemplo = {
    nome: "João Silva",
    formacao: "Formação Teste",
    data: new Date().toLocaleDateString('pt-PT'),
    nota: "85%",
    certificado_id: "CERT-001"
  };
  
  Object.entries(dadosExemplo).forEach(([k, v]) => {
    texto = texto.replace(new RegExp(`{{${k}}}`, 'g'), v);
  });
  
  const fundoStyle = fundoImagem ? `background-image: url('${fundoImagem}'); background-size: cover; background-position: center;` : '';
  
  if (content) {
    content.innerHTML = `
      <div style="text-align:center;padding:20px;border:2px solid var(--birkenstock-gold);border-radius:16px;${fundoStyle} min-height:300px;">
        <h2 style="color:var(--birkenstock-blue);">${escapeHtml(titulo)}</h2>
        <div style="margin:20px 0;">${texto.replace(/\n/g, '<br>')}</div>
        <div style="margin-top:20px; font-size:12px;">${escapeHtml(rodape)}</div>
      </div>
    `;
  }
  if (preview) preview.style.display = 'block';
}

function salvarTemplateCertificado() {
  certTemplate = {
    fundoImagem: document.getElementById('cert-fundo-imagem')?.value || '',
    titulo: document.getElementById('cert-titulo')?.value || '',
    texto: document.getElementById('cert-texto')?.value || '',
    rodape: document.getElementById('cert-rodape')?.value || ''
  };
  localStorage.setItem('cert_template', JSON.stringify(certTemplate));
  showToast('✅ Template salvo!');
}

function resetTemplateCertificado() {
  certTemplate = JSON.parse(JSON.stringify(defaultCert));
  const fundoInput = document.getElementById('cert-fundo-imagem');
  const tituloInput = document.getElementById('cert-titulo');
  const textoInput = document.getElementById('cert-texto');
  const rodapeInput = document.getElementById('cert-rodape');
  if (fundoInput) fundoInput.value = certTemplate.fundoImagem;
  if (tituloInput) tituloInput.value = certTemplate.titulo;
  if (textoInput) textoInput.value = certTemplate.texto;
  if (rodapeInput) rodapeInput.value = certTemplate.rodape;
  showToast('✅ Template restaurado!');
}

function carregarTemplateCertificado() {
  const saved = localStorage.getItem('cert_template');
  if (saved) {
    try {
      const template = JSON.parse(saved);
      certTemplate = template;
      const fundoInput = document.getElementById('cert-fundo-imagem');
      const tituloInput = document.getElementById('cert-titulo');
      const textoInput = document.getElementById('cert-texto');
      const rodapeInput = document.getElementById('cert-rodape');
      if (fundoInput) fundoInput.value = template.fundoImagem || '';
      if (tituloInput) tituloInput.value = template.titulo || '';
      if (textoInput) textoInput.value = template.texto || '';
      if (rodapeInput) rodapeInput.value = template.rodape || '';
    } catch(e) {}
  }
}

// ==================== SEGURANÇA ====================
function checkPasswordStrength(pass) {
  let s = 0;
  if (pass.length >= 8) s++;
  if (/[A-Z]/.test(pass)) s++;
  if (/[0-9]/.test(pass)) s++;
  if (/[^a-zA-Z0-9]/.test(pass)) s++;
  const d = document.getElementById('password-strength-admin') || document.getElementById('password-strength');
  if (d) {
    d.className = 'password-strength';
    if (s <= 1) d.classList.add('strength-weak');
    else if (s <= 2) d.classList.add('strength-medium');
    else d.classList.add('strength-strong');
  }
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
  document.getElementById('f-descricao').value = formacao.descricao;
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
  modulos = [];
  perguntas = [];
  renderModulos();
  renderPerguntas();
  document.getElementById('editando-id').innerHTML = '';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
}

// ==================== UTILITÁRIOS ====================
function switchTab(tabId) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  const secAtiva = document.getElementById(`sec-${tabId}`);
  if (secAtiva) secAtiva.classList.add('active');
  
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  const tabAtiva = document.querySelector(`.admin-tab[data-tab="${tabId}"]`);
  if (tabAtiva) tabAtiva.classList.add('active');
  
  if (tabId === 'colaboradores') renderColabs();
  if (tabId === 'historico') renderHistorico();
  if (tabId === 'atribuir') prepararAtribuicao();
  if (tabId === 'atribuir-massa') {
    linksGerados = [];
    const linksDiv = document.getElementById('links-gerados');
    if (linksDiv) linksDiv.style.display = 'none';
  }
  if (tabId === 'overview') atualizarDashboard();
  if (tabId === 'formacoes') renderFormacoesLista();
  if (tabId === 'certificado') carregarTemplateCertificado();
  if (tabId === 'acompanhar') renderAcompanhamento();
}

// ==================== INICIALIZAÇÃO ====================
function setupEventListeners() {
  const btnSaveUser = document.getElementById('btn-save-user');
  const btnPublicar = document.getElementById('btn-publicar');
  const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');
  const importCsv = document.getElementById('import-csv');
  const btnDownloadModelo = document.getElementById('btn-download-modelo');
  const btnSalvarModulo = document.getElementById('btn-salvar-modulo');
  const btnSalvarPergunta = document.getElementById('btn-salvar-pergunta');
  
  if (btnSaveUser) btnSaveUser.addEventListener('click', saveUser);
  if (btnPublicar) btnPublicar.addEventListener('click', publicarFormacao);
  if (btnCancelarEdicao) btnCancelarEdicao.addEventListener('click', () => cancelarEdicao());
  if (btnSalvarModulo) btnSalvarModulo.addEventListener('click', salvarModulo);
  if (btnSalvarPergunta) btnSalvarPergunta.addEventListener('click', salvarPergunta);
  
  document.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  
  if (importCsv) importCsv.addEventListener('change', (e) => importColaboradores(e.target.files));
  if (btnDownloadModelo) btnDownloadModelo.addEventListener('click', downloadModeloCSV);
  
  const filtroFormacao = document.getElementById('filtro-formacao-acompanhar');
  const filtroStatus = document.getElementById('filtro-status-acompanhar');
  if (filtroFormacao) filtroFormacao.addEventListener('change', () => renderAcompanhamento());
  if (filtroStatus) filtroStatus.addEventListener('change', () => renderAcompanhamento());
  
  const filtroHistorico = document.getElementById('filtro-colaborador-historico');
  if (filtroHistorico) filtroHistorico.addEventListener('change', () => renderHistorico());
  
  const atribuirCurso = document.getElementById('atribuir-curso');
  if (atribuirCurso) {
    atribuirCurso.addEventListener('change', () => {
      atualizarSelectores();
    });
  }
  
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').style.display = 'none';
    });
  });
}

function initAdmin() {
  const isAdmin = localStorage.getItem('usuarioAdmin');
  if (!isAdmin) {
    window.location.href = 'login.html';
    return;
  }
  
  carregarDadosExemplo();
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
  
  setTimeout(() => {
    atualizarSelectores();
  }, 500);
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

console.log("✅ admin.js carregado - versão corrigida");
