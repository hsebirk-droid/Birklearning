// ============================================
// ADMIN - LÓGICA PRINCIPAL (VERSÃO FINAL CORRIGIDA)
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

// ==================== FUNÇÕES UTILITÁRIAS ====================
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showToast(msg) { window.showToast(msg); }

function formatDate(date) { return window.formatDate(date); }

function downloadExcel(data, name, sheet) { window.downloadExcel(data, name, sheet); }

function gerarCertificadoId() { return window.gerarCertificadoId(); }

// ==================== DADOS ====================
async function carregarDadosExemplo() {
  console.log('📦 A carregar dados...');
  const firebaseUser = window.auth?.currentUser;
  const isAdmin = firebaseUser?.email && window.isAdminEmail ? window.isAdminEmail(firebaseUser.email) : false;
  
  if (window.firebaseReady && window.db && (isAdmin || localStorage.getItem('usuarioAdmin') === 'admin')) {
    try {
      if (isAdmin) {
        const snapF = await window.db.collection('formacoes').get();
        formacoes = snapF.docs.map(d => ({ id: d.id, ...d.data() }));
        const snapC = await window.db.collection('colaboradores').get();
        colaboradores = snapC.docs.map(d => ({ id: d.id, ...d.data() }));
        const snapA = await window.db.collection('atribuicoes').get();
        atribuicoes = snapA.docs.map(d => ({ id: d.id, ...d.data() }));
        const snapH = await window.db.collection('historicos').get();
        historicos = snapH.docs.map(d => ({ id: d.id, ...d.data() }));
        
        localStorage.setItem('formacoes', JSON.stringify(formacoes));
        localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
        localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
        localStorage.setItem('historicos', JSON.stringify(historicos));
      } else {
        formacoes = JSON.parse(localStorage.getItem('formacoes') || '[]');
        colaboradores = JSON.parse(localStorage.getItem('colaboradores') || '[]');
        atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
        historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
      }
    } catch (e) {
      console.error('Erro:', e);
      formacoes = JSON.parse(localStorage.getItem('formacoes') || '[]');
      colaboradores = JSON.parse(localStorage.getItem('colaboradores') || '[]');
      atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
      historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
    }
  } else {
    formacoes = JSON.parse(localStorage.getItem('formacoes') || '[]');
    colaboradores = JSON.parse(localStorage.getItem('colaboradores') || '[]');
    atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
    historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
  }
  
  if (!formacoes.length) {
    formacoes = [{
      id: "1", nome: "Formação Exemplo", duracao: "45 min", icone: "📚",
      modulos: [{ id: "m1", titulo: "Módulo 1", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "10 min" }],
      perguntas: [{ id: "p1", texto: "Pergunta exemplo?", opcoes: ["A", "B", "C", "D"], correta: "A" }]
    }];
    await salvarFormacoes();
  }
  if (!colaboradores.length) {
    colaboradores = [{ id: "c1", matricula: "001", user: "colab", nome: "Colaborador", email: "colab@teste.pt", pass: "123456" }];
    await salvarColaboradores();
  }
  console.log('✅ Dados carregados');
}

async function salvarFormacoes() {
  localStorage.setItem('formacoes', JSON.stringify(formacoes));
  if (window.firebaseReady && window.db) {
    for (const f of formacoes) await window.db.collection('formacoes').doc(f.id).set(f, { merge: true });
  }
}
async function salvarColaboradores() {
  localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
  if (window.firebaseReady && window.db) {
    for (const c of colaboradores) await window.db.collection('colaboradores').doc(c.id).set(c, { merge: true });
  }
}
async function salvarAtribuicoes() {
  localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
  if (window.firebaseReady && window.db) {
    for (const a of atribuicoes) await window.db.collection('atribuicoes').doc(a.id).set(a, { merge: true });
  }
}
async function salvarHistoricos() {
  localStorage.setItem('historicos', JSON.stringify(historicos));
  if (window.firebaseReady && window.db) {
    for (const h of historicos) await window.db.collection('historicos').doc(h.id).set(h, { merge: true });
  }
}

// ==================== DASHBOARD ====================
function atualizarDashboard() {
  const totalF = formacoes.length, totalC = colaboradores.length, totalA = atribuicoes.length;
  const concluidas = atribuicoes.filter(a => ['concluido','concluída','Concluido','Concluído'].includes(a.status)).length;
  
  const grid = document.getElementById('dashboard-grid');
  if (grid) grid.innerHTML = `
    <div class="dash-card"><div class="dash-icon" style="background:var(--info-bg)">📚</div><div class="dash-info"><h3>${totalF}</h3><p>Formações</p></div></div>
    <div class="dash-card"><div class="dash-icon" style="background:var(--success-bg)">👥</div><div class="dash-info"><h3>${totalC}</h3><p>Colaboradores</p></div></div>
    <div class="dash-card"><div class="dash-icon" style="background:var(--purple-bg)">🏅</div><div class="dash-info"><h3>${concluidas}</h3><p>Concluídas</p></div></div>
    <div class="dash-card"><div class="dash-icon" style="background:var(--warning-bg)">⏳</div><div class="dash-info"><h3>${totalA - concluidas}</h3><p>Pendentes</p></div></div>
  `;
  
  const recentes = historicos.slice(-5).reverse();
  const ra = document.getElementById('recent-activities');
  if (ra) ra.innerHTML = recentes.length ? recentes.map(h => `<div class="item-card"><div class="item-card-info"><strong>${escapeHtml(h.nomeDisplay||h.nome)}</strong> concluiu "${escapeHtml(h.curso)}" com ${escapeHtml(h.nota)}</div><div class="item-card-meta">${escapeHtml(h.data)}</div></div>`).join('') : '<div class="empty">Sem atividades recentes.</div>';
  
  renderPrazosProximos();
}

function renderPrazosProximos() {
  const c = document.getElementById('prazos-proximos'); if (!c) return;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const pendentes = atribuicoes.filter(a => !['concluido','concluída','Concluido','Concluído'].includes(a.status) && a.prazo);
  const prox = pendentes.map(a => {
    let d = a.prazo.includes('/') ? new Date(a.prazo.split('/')[2], a.prazo.split('/')[1]-1, a.prazo.split('/')[0]) : new Date(a.prazo);
    d.setHours(23,59,59,999);
    return {...a, dias: Math.ceil((d - hoje) / 86400000)};
  }).filter(a => a.dias <= 7 && a.dias >= 0).sort((a,b) => a.dias - b.dias);
  
  if (!prox.length) { c.innerHTML = '<div class="empty">✅ Nenhuma formação próxima do prazo.</div>'; return; }
  c.innerHTML = prox.map(a => {
    const urg = a.dias <= 2;
    const icon = a.dias === 0 ? '🚨' : (a.dias === 1 ? '⚠️' : (a.dias <= 3 ? '⏰' : '📅'));
    const txt = a.dias === 0 ? 'HOJE!' : (a.dias === 1 ? 'AMANHÃ!' : `${a.dias} dias`);
    return `<div class="item-card" style="border-left:4px solid ${urg ? 'var(--danger)' : 'var(--warning)'};"><div class="item-card-info"><div class="item-card-title">${icon} ${escapeHtml(a.colaboradorNome)} - ${escapeHtml(a.cursoNome)}</div><div class="item-card-meta" style="color:${urg ? 'var(--danger)' : 'var(--warning)'};">⏳ ${txt} (${escapeHtml(a.prazo)})</div></div><div class="item-card-actions"><button class="btn-relembrar-dash" data-id="${a.id}" style="background:var(--info);color:white;border:none;padding:6px 12px;border-radius:20px;cursor:pointer;">📧 Relembrar</button></div></div>`;
  }).join('');
  document.querySelectorAll('.btn-relembrar-dash').forEach(b => b.addEventListener('click', () => relembrarColaborador(b.dataset.id)));
}

// ==================== ATRIBUIÇÃO INDIVIDUAL ====================
function prepararAtribuicao() {
  const selC = document.getElementById('select-colaborador');
  const selF = document.getElementById('select-formacao');
  if (selC) selC.innerHTML = '<option value="">Selecione...</option>' + [...colaboradores].sort((a,b) => (parseInt(a.matricula)||999999) - (parseInt(b.matricula)||999999)).map(c => `<option value="${c.id}">${escapeHtml(c.nome)} (${c.matricula||c.user})</option>`).join('');
  if (selF) selF.innerHTML = '<option value="">Selecione...</option>' + formacoes.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
}

async function gerarCodigoAtribuicao() {
  const colabId = document.getElementById('select-colaborador')?.value;
  const cursoId = document.getElementById('select-formacao')?.value;
  const prazo = document.getElementById('atrib-prazo')?.value || '31/12/2026';
  if (!colabId || !cursoId) { showToast('❌ Selecione colaborador e formação'); return; }
  
  const colab = colaboradores.find(c => c.id === colabId);
  const form = formacoes.find(f => f.id === cursoId);
  if (!colab || !form) return;
  
  const user = colab.user || colab.email;
  const existente = atribuicoes.find(a => a.colaboradorUser === user && a.cursoId === cursoId && !['concluido','concluída','Concluido','Concluído'].includes(a.status));
  if (existente) {
    showToast('⚠️ Já atribuído!');
    document.getElementById('resultado-atribuicao').style.display = 'block';
    document.getElementById('link-gerado').textContent = existente.link;
    window.linkAtualGerado = existente.link;
    return;
  }
  
  showToast('⏳ A gerar...');
  const tokenId = Date.now().toString(36) + Math.random().toString(36).substr(2,4);
  const tokenData = { user, nome: colab.nome, email: colab.email||'', matricula: colab.matricula||'', cursoId, cursoNome: form.nome, prazo, ts: Date.now() };
  
  if (!window.firebaseReady || !window.db) { showToast('❌ Sem ligação'); return; }
  
  try {
    await window.db.collection('tokens').doc(tokenId).set(tokenData);
    const link = `${window.location.origin}/formacao.html?t=${tokenId}`;
    const nova = { id: Date.now().toString()+'_'+user.replace(/[^a-z0-9]/gi,'_'), colaboradorId: colab.id, colaboradorUser: user, colaboradorNome: colab.nome, colaboradorEmail: colab.email||'', colaboradorMatricula: colab.matricula||'', cursoId, cursoNome: form.nome, prazo, status: 'pendente', dataAtribuicao: new Date().toISOString(), token: tokenId, link };
    await window.db.collection('atribuicoes').doc(nova.id).set(nova);
    atribuicoes.push(nova);
    document.getElementById('resultado-atribuicao').style.display = 'block';
    document.getElementById('link-gerado').textContent = link;
    window.linkAtualGerado = link;
    showToast("✅ Atribuição registada!");
  } catch(e) { showToast('❌ Erro: '+e.message); }
}

function EnvioEmail() {
  const colab = colaboradores.find(c => c.id === document.getElementById('select-colaborador')?.value);
  const link = window.linkAtualGerado || document.getElementById('link-gerado')?.textContent;
  const prazo = document.getElementById('atrib-prazo')?.value || '31/12/2026';
  if (!colab?.email) { showToast('❌ Sem email'); return; }
  const assunto = encodeURIComponent('Birkenstock - Nova Formação Atribuída');
  const corpo = encodeURIComponent(`Olá ${colab.nome},\n\nFoi-lhe atribuída uma nova formação na plataforma Birkenstock S&CC Portugal.\n\nFormação: ${document.getElementById('select-formacao')?.selectedOptions[0]?.text || 'Formação'}\nPrazo: ${prazo}\n\nAceda através do link:\n${link}\n\nAtenciosamente,\nEquipa de Formação Birkenstock`);
  window.location.href = `mailto:${colab.email}?subject=${assunto}&body=${corpo}`;
  showToast(`📧 A abrir email para ${colab.nome}`);
}

function enviarEmailIndividual(email, nome, link, prazo, cursoNome) {
  if (!email) return;
  const assunto = encodeURIComponent(`Birkenstock - Formação: ${cursoNome}`);
  const corpo = encodeURIComponent(`Olá ${nome},\n\nFoi-lhe atribuída a formação "${cursoNome}" na plataforma Birkenstock S&CC Portugal.\n\nPrazo: ${prazo}\n\nAceda através do link:\n${link}\n\nAtenciosamente,\nEquipa de Formação Birkenstock`);
  window.location.href = `mailto:${email}?subject=${assunto}&body=${corpo}`;
}

function enviarEmailsMassa() {
  if (!linksGerados.length) return;
  linksGerados.filter(l => l.email).forEach(l => {
    const assunto = encodeURIComponent(`Birkenstock - Formação: ${l.cursoNome}`);
    const corpo = encodeURIComponent(`Olá ${l.nome},\n\nFoi-lhe atribuída a formação "${l.cursoNome}".\n\nPrazo: ${l.prazo}\n\nAceda através do link:\n${l.link}\n\nAtenciosamente,\nEquipa de Formação Birkenstock`);
    window.open(`mailto:${l.email}?subject=${assunto}&body=${corpo}`);
  });
  showToast(`📧 A abrir ${linksGerados.length} emails...`);
}

function relembrarColaborador(id) {
  const a = atribuicoes.find(x => x.id === id); if (!a) return;
  const assunto = encodeURIComponent(`Birkenstock - Lembrete: ${a.cursoNome}`);
  const corpo = encodeURIComponent(`Olá ${a.colaboradorNome},\n\nRecordamos que ainda tem pendente a formação "${a.cursoNome}".\n\nPrazo: ${a.prazo || '---'}\n\nAceda através do link:\n${a.link}\n\nAtenciosamente,\nEquipa de Formação Birkenstock`);
  window.location.href = `mailto:${a.colaboradorEmail}?subject=${assunto}&body=${corpo}`;
}

function copiarLink() {
  const link = window.linkAtualGerado || document.getElementById('link-gerado')?.textContent;
  if (link) navigator.clipboard?.writeText(link).then(() => showToast('✅ Copiado!'));
}

// ==================== FORMAÇÕES ====================
function renderFormacoesLista() {
  const c = document.getElementById('formacoes-list'); if (!c) return;
  c.innerHTML = formacoes.map(f => `<div class="item-card"><div class="item-card-info"><div class="item-card-title">📘 ${escapeHtml(f.nome)}</div><div class="item-card-meta">${f.modulos?.length||0} módulos · ${f.perguntas?.length||0} perguntas</div></div><div class="item-card-actions"><button class="btn-editar-formacao" data-id="${f.id}" style="color:var(--info)">✏️</button><button class="btn-apagar-formacao" data-id="${f.id}" style="color:var(--danger)">🗑️</button></div></div>`).join('');
  document.querySelectorAll('.btn-editar-formacao').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); editarFormacao(b.dataset.id); }));
  document.querySelectorAll('.btn-apagar-formacao').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); apagarFormacao(b.dataset.id); }));
}

function editarFormacao(id) {
  const f = formacoes.find(x => x.id === id); if (!f) return;
  document.getElementById('f-titulo').value = f.nome || '';
  document.getElementById('f-duracao').value = f.duracao || '';
  document.getElementById('f-descricao').value = f.descricao || f.conteudoProgramatico || '';
  modulos = f.modulos ? [...f.modulos] : [];
  perguntas = f.perguntas ? [...f.perguntas] : [];
  editandoFormacaoId = id;
  renderModulos(); renderPerguntas();
  document.getElementById('editando-id').innerHTML = `✏️ Editando: ${escapeHtml(f.nome)}`;
  document.getElementById('btn-cancelar-edicao').style.display = 'inline-block';
  document.querySelector('.admin-tab[data-tab="formacoes"]')?.click();
}

function cancelarEdicao() {
  editandoFormacaoId = null;
  document.getElementById('f-titulo').value = document.getElementById('f-duracao').value = document.getElementById('f-descricao').value = '';
  modulos = []; perguntas = [];
  renderModulos(); renderPerguntas();
  document.getElementById('editando-id').innerHTML = '';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
}

function apagarFormacao(id) {
  if (!confirm('Apagar?')) return;
  formacoes = formacoes.filter(f => f.id !== id);
  salvarFormacoes(); renderFormacoesLista(); atualizarDashboard(); atualizarSelectores(); renderAcompanhamento();
  showToast('✅ Apagada!');
}

function publicarFormacao() {
  const titulo = document.getElementById('f-titulo')?.value.trim();
  if (!titulo || !modulos.length) { showToast('❌ Título e pelo menos 1 módulo obrigatórios'); return; }
  const nova = { id: editandoFormacaoId || Date.now().toString(), nome: titulo, duracao: document.getElementById('f-duracao')?.value.trim() || '30 min', descricao: document.getElementById('f-descricao')?.value.trim(), conteudoProgramatico: document.getElementById('f-descricao')?.value.trim(), icone: '📚', modulos: [...modulos], perguntas: perguntas.map(p => ({ id: p.id, texto: p.texto, opcoes: p.opcoes, correta: p.correta })) };
  if (editandoFormacaoId) {
    const idx = formacoes.findIndex(f => f.id === editandoFormacaoId);
    if (idx !== -1) formacoes[idx] = nova;
    editandoFormacaoId = null;
    document.getElementById('btn-cancelar-edicao').style.display = 'none';
  } else { formacoes.push(nova); }
  salvarFormacoes();
  document.getElementById('f-titulo').value = document.getElementById('f-duracao').value = document.getElementById('f-descricao').value = '';
  modulos = []; perguntas = [];
  renderModulos(); renderPerguntas(); renderFormacoesLista(); atualizarSelectores(); atualizarDashboard();
  showToast(`✅ ${editandoFormacaoId ? 'Atualizada' : 'Publicada'}!`);
}

// ==================== MÓDULOS ====================
function abrirModalModulo(tipo) {
  moduloTipoAtual = tipo; editandoModuloId = null;
  document.getElementById('modulo-titulo').value = document.getElementById('modulo-duracao').value = document.getElementById('modulo-video-url').value = document.getElementById('modulo-texto-conteudo').value = document.getElementById('modulo-link-url').value = '';
  document.getElementById('modulo-conteudo-video').style.display = tipo==='video'?'block':'none';
  document.getElementById('modulo-conteudo-texto').style.display = tipo==='texto'?'block':'none';
  document.getElementById('modulo-conteudo-link').style.display = tipo==='link'?'block':'none';
  document.getElementById('modal-modulo-titulo').textContent = {video:'🎬 Vídeo',texto:'📄 Texto',link:'🔗 Link'}[tipo]||'Módulo';
  document.getElementById('modal-modulo').style.display = 'flex';
}

function editarModulo(id) {
  const m = modulos.find(x => x.id === id); if (!m) return;
  editandoModuloId = id; moduloTipoAtual = m.tipo;
  document.getElementById('modulo-titulo').value = m.titulo || '';
  document.getElementById('modulo-duracao').value = m.duracao || '';
  document.getElementById('modulo-conteudo-video').style.display = m.tipo==='video'?'block':'none';
  document.getElementById('modulo-conteudo-texto').style.display = m.tipo==='texto'?'block':'none';
  document.getElementById('modulo-conteudo-link').style.display = m.tipo==='link'?'block':'none';
  if (m.tipo==='video') document.getElementById('modulo-video-url').value = m.conteudo?.url || '';
  if (m.tipo==='texto') document.getElementById('modulo-texto-conteudo').value = m.conteudo?.texto || '';
  if (m.tipo==='link') document.getElementById('modulo-link-url').value = m.conteudo?.url || '';
  document.getElementById('modal-modulo').style.display = 'flex';
}

function salvarModulo() {
  const titulo = document.getElementById('modulo-titulo').value.trim();
  if (!titulo) { showToast('❌ Título obrigatório'); return; }
  let conteudo = {};
  if (moduloTipoAtual === 'video') {
    const url = document.getElementById('modulo-video-url').value.trim();
    if (!url) { showToast('❌ URL obrigatória'); return; }
    conteudo = { url };
  } else if (moduloTipoAtual === 'texto') {
    const texto = document.getElementById('modulo-texto-conteudo').value.trim();
    if (!texto) { showToast('❌ Conteúdo obrigatório'); return; }
    conteudo = { texto };
  } else if (moduloTipoAtual === 'link') {
    const url = document.getElementById('modulo-link-url').value.trim();
    if (!url) { showToast('❌ URL obrigatória'); return; }
    conteudo = { url };
  }
  const duracao = document.getElementById('modulo-duracao').value.trim() || '15 min';
  const novo = { id: editandoModuloId || Date.now().toString(), titulo, tipo: moduloTipoAtual, conteudo, duracao };
  if (editandoModuloId) {
    const idx = modulos.findIndex(m => m.id === editandoModuloId);
    if (idx !== -1) modulos[idx] = novo;
    editandoModuloId = null;
  } else { modulos.push(novo); }
  renderModulos();
  document.getElementById('modal-modulo').style.display = 'none';
  showToast(`✅ Módulo salvo!`);
}

function removerModulo(id) { if (confirm('Remover?')) { modulos = modulos.filter(m => m.id !== id); renderModulos(); } }

function renderModulos() {
  const c = document.getElementById('modulos-container'); if (!c) return;
  c.innerHTML = modulos.length ? modulos.map((m,i) => `<div class="modulo-card"><div style="flex:1"><div style="font-weight:700;">${i+1}. ${escapeHtml(m.titulo)}</div><div style="font-size:11px;">${m.tipo==='video'?'🎬':m.tipo==='texto'?'📄':'🔗'} ${m.duracao}</div></div><div style="display:flex;gap:8px;"><button class="btn-editar-modulo" data-id="${m.id}" style="background:var(--info);color:white;border:none;padding:4px 10px;border-radius:4px;">✏️</button><button class="btn-remover-modulo" data-id="${m.id}" style="background:var(--danger);color:white;border:none;padding:4px 10px;border-radius:4px;">🗑️</button></div></div>`).join('') : '<div class="alert alert-info">Nenhum módulo.</div>';
  document.querySelectorAll('.btn-editar-modulo').forEach(b => b.addEventListener('click', () => editarModulo(b.dataset.id)));
  document.querySelectorAll('.btn-remover-modulo').forEach(b => b.addEventListener('click', () => removerModulo(b.dataset.id)));
}

// ==================== PERGUNTAS (CORRIGIDO) ====================
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
  console.log('🔍 Editando pergunta ID:', id);
  console.log('📋 Perguntas disponíveis:', perguntas);
  
  const p = perguntas.find(x => x.id === id);
  if (!p) {
    console.error('❌ Pergunta não encontrada!');
    showToast('❌ Pergunta não encontrada');
    return;
  }
  
  console.log('✅ Pergunta encontrada:', p);
  
  editandoPerguntaId = id;
  
  // Preencher texto
  document.getElementById('pergunta-texto').value = p.texto || '';
  
  // Preencher opções (garantir que é array)
  let opcoes = p.opcoes;
  if (!Array.isArray(opcoes)) {
    console.warn('⚠️ opcoes não é array, a converter...');
    opcoes = ['', '', '', ''];
  }
  
  document.getElementById('pergunta-opcao-a').value = opcoes[0] || '';
  document.getElementById('pergunta-opcao-b').value = opcoes[1] || '';
  document.getElementById('pergunta-opcao-c').value = opcoes[2] || '';
  document.getElementById('pergunta-opcao-d').value = opcoes[3] || '';
  
  // Preencher resposta correta
  document.getElementById('pergunta-correta').value = p.correta || 'A';
  
  // Mostrar modal
  document.getElementById('modal-pergunta').style.display = 'flex';
  
  console.log('✅ Modal aberto com sucesso!');
}

function salvarPergunta() {
  const texto = document.getElementById('pergunta-texto').value.trim();
  if (!texto) { showToast('❌ Texto obrigatório'); return; }
  const opcoes = ['a','b','c','d'].map(l => document.getElementById(`pergunta-opcao-${l}`).value.trim());
  if (opcoes.some(o => !o)) { showToast('❌ Todas as opções obrigatórias'); return; }
  const correta = document.getElementById('pergunta-correta').value;
  
  if (editandoPerguntaId) {
    const idx = perguntas.findIndex(p => p.id === editandoPerguntaId);
    if (idx !== -1) perguntas[idx] = { ...perguntas[idx], texto, opcoes, correta };
    editandoPerguntaId = null;
  } else {
    perguntas.push({ id: Date.now().toString(), texto, opcoes, correta });
  }
  renderPerguntas();
  document.getElementById('modal-pergunta').style.display = 'none';
  showToast('✅ Pergunta salva!');
}

function removerPergunta(id) { if (confirm('Remover?')) { perguntas = perguntas.filter(p => p.id !== id); renderPerguntas(); } }

function renderPerguntas() {
  const c = document.getElementById('perguntas-container'); if (!c) return;
  c.innerHTML = perguntas.length ? perguntas.map((p,i) => `<div class="pergunta-card"><div style="margin-bottom:8px;"><strong>${i+1}. ${escapeHtml(p.texto)}</strong></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;"><div>A) ${escapeHtml(p.opcoes[0])}</div><div>B) ${escapeHtml(p.opcoes[1])}</div><div>C) ${escapeHtml(p.opcoes[2])}</div><div>D) ${escapeHtml(p.opcoes[3])}</div></div><div style="margin-top:8px;font-size:11px;color:var(--success);">✅ Correta: ${p.correta}</div><div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;"><button class="btn-editar-pergunta" data-id="${p.id}" style="background:var(--info);color:white;border:none;padding:4px 10px;border-radius:4px;">✏️</button><button class="btn-remover-pergunta" data-id="${p.id}" style="background:var(--danger);color:white;border:none;padding:4px 10px;border-radius:4px;">🗑️</button></div></div>`).join('') : '<div class="alert alert-info">Nenhuma pergunta.</div>';
  document.querySelectorAll('.btn-editar-pergunta').forEach(b => b.addEventListener('click', () => editarPergunta(b.dataset.id)));
  document.querySelectorAll('.btn-remover-pergunta').forEach(b => b.addEventListener('click', () => removerPergunta(b.dataset.id)));
}

// ==================== COLABORADORES ====================
function renderColabs() {
  const t = document.getElementById('colab-list-table'); if (!t) return;
  t.innerHTML = colaboradores.length ? [...colaboradores].sort((a,b) => (parseInt(a.matricula)||999999) - (parseInt(b.matricula)||999999)).map(c => `<tr><td>${escapeHtml(c.matricula||'-')}</td><td>${escapeHtml(c.nome||c.user)}</td><td>${escapeHtml(c.email||'-')}</td><td><button class="btn-remover-colab" data-id="${c.id}">🗑️</button></td></tr>`).join('') : '<tr><td colspan="4" class="empty">Nenhum colaborador.</td></tr>';
  document.querySelectorAll('.btn-remover-colab').forEach(b => b.addEventListener('click', () => removerColab(b.dataset.id)));
}

async function removerColab(id) {
  if (!confirm('Remover colaborador? Esta ação não pode ser desfeita.')) return;
  const colab = colaboradores.find(c => c.id === id);
  if (colab) {
    colaboradores = colaboradores.filter(c => c.id !== id);
    await salvarColaboradores();
    if (window.firebaseReady && window.db) {
      try { await window.db.collection('colaboradores').doc(id).delete(); } catch(e) {}
    }
    renderColabs(); atualizarSelectores(); atualizarDashboard(); renderAcompanhamento();
    showToast('✅ Colaborador removido!');
  }
}

async function saveUser() {
  const matricula = document.getElementById('u-matricula')?.value.trim() || '';
  const nome = document.getElementById('u-nome')?.value.trim() || '';
  const email = document.getElementById('u-email')?.value.trim() || '';
  const pass = document.getElementById('u-pass')?.value || '';
  if (!nome || !pass || !email) { showToast('❌ Preencha todos os campos'); return; }
  if (!window.firebaseReady) { showToast('❌ Sem ligação'); return; }
  const btn = document.getElementById('btn-save-user'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A criar...';
  try {
    const cred = await window.auth.createUserWithEmailAndPassword(email, pass);
    const novo = { id: cred.user.uid, matricula, user: email.split('@')[0], nome, email, pass, dataCriacao: new Date().toISOString() };
    await window.db.collection('colaboradores').doc(cred.user.uid).set(novo);
    colaboradores.push(novo);
    showToast('✅ Colaborador criado!');
    document.getElementById('u-matricula').value = document.getElementById('u-nome').value = document.getElementById('u-email').value = document.getElementById('u-pass').value = '';
    renderColabs(); atualizarSelectores(); atualizarDashboard(); renderAcompanhamento();
  } catch(e) { showToast('❌ ' + (e.code==='auth/email-already-in-use' ? 'Email já existe' : e.message)); }
  finally { btn.disabled = false; btn.innerHTML = '➕ Adicionar Colaborador'; }
}

async function importColaboradores(files) {
  if (!files[0]) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const lines = e.target.result.split('\n'); let imported = 0;
    for (let i=1; i<lines.length; i++) {
      const p = lines[i].split(','); if (p.length<4) continue;
      const [matricula, nome, email, pass] = p.map(x => x?.trim()||'');
      if (!nome || !email || !pass) continue;
      try {
        let uid = null;
        if (window.firebaseReady) {
          try { uid = (await window.auth.createUserWithEmailAndPassword(email, pass)).user.uid; }
          catch(authErr) { if (authErr.code !== 'auth/email-already-in-use') throw authErr; }
        }
        const novo = { id: uid || Date.now().toString()+'_'+i, matricula, user: email.split('@')[0], nome, email, pass, dataCriacao: new Date().toISOString() };
        if (window.db) await window.db.collection('colaboradores').doc(novo.id).set(novo);
        colaboradores.push(novo); imported++;
      } catch(err) { console.error(err); }
    }
    salvarColaboradores(); renderColabs(); atualizarSelectores(); atualizarDashboard(); renderAcompanhamento();
    showToast(`✅ ${imported} importados!`);
  };
  reader.readAsText(files[0], 'UTF-8');
}

function downloadModeloCSV() {
  const csv = "matricula,nome,email,password\n001,João Silva,joao@birkenstock.pt,birkenstock2024";
  const blob = new Blob(["\uFEFF"+csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'modelo.csv'; a.click();
}

function exportarColaboradoresExcel() {
  if (!colaboradores.length) return;
  downloadExcel(colaboradores.map(c => ({Matrícula:c.matricula,Nome:c.nome||c.user,Email:c.email})), 'colaboradores');
}

// ==================== ATRIBUIÇÃO EM MASSA ====================
function atualizarSelectores() {
  const curso = document.getElementById('atribuir-curso');
  if (curso) curso.innerHTML = '<option value="">Selecione...</option>' + formacoes.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
  const grid = document.getElementById('colab-selector-grid');
  if (grid) {
    const cursoId = curso?.value;
    grid.innerHTML = [...colaboradores].sort((a,b) => (parseInt(a.matricula)||999999) - (parseInt(b.matricula)||999999)).map(c => {
      const concluido = historicos.some(h => (h.nome===c.user||h.nomeDisplay===c.nome) && h.cursoId===cursoId);
      const atribuido = atribuicoes.some(a => a.colaboradorUser===c.user && a.cursoId===cursoId && !['concluido','concluída','Concluido','Concluído'].includes(a.status));
      let status = ''; if (concluido) status = '<span title="Concluído">✅</span>'; else if (atribuido) status = '<span title="Atribuído">⏳</span>';
      return `<label class="colab-check"><input type="checkbox" value="${c.id}" ${concluido?'disabled':''}> ${escapeHtml(c.nome)} (${c.matricula||c.user}) ${status}</label>`;
    }).join('');
  }
  const filtro = document.getElementById('filtro-formacao-acompanhar');
  if (filtro) filtro.innerHTML = '<option value="">Todas</option>' + formacoes.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
}

function selecionarTodos() { document.querySelectorAll('#colab-selector-grid input:not(:disabled)').forEach(cb => cb.checked = true); }
function deselecionarTodos() { document.querySelectorAll('#colab-selector-grid input').forEach(cb => cb.checked = false); }

async function gerarLinksMassa() {
  const cursoId = document.getElementById('atribuir-curso')?.value;
  if (!cursoId) { showToast('❌ Selecione formação'); return; }
  const selected = Array.from(document.querySelectorAll('#colab-selector-grid input:checked:not(:disabled)'));
  if (!selected.length) { showToast('❌ Selecione colaboradores'); return; }
  if (!window.firebaseReady) { showToast('❌ Sem ligação'); return; }
  const prazo = document.getElementById('atribuir-prazo')?.value || '31/12/2026';
  const cursoNome = document.getElementById('atribuir-curso')?.selectedOptions[0]?.text || 'Formação';
  const baseUrl = window.location.origin + '/formacao.html';
  linksGerados = []; let sucesso = 0, reutilizados = 0;
  showToast('⏳ A gerar...');
  
  for (const cb of selected) {
    const c = colaboradores.find(x => x.id === cb.value); if (!c) continue;
    const user = c.user || c.email;
    const existente = atribuicoes.find(a => a.colaboradorUser === user && a.cursoId === cursoId && !['concluido','concluída','Concluido','Concluído'].includes(a.status));
    if (existente) { linksGerados.push({ nome: c.nome, email: c.email, link: existente.link, prazo, cursoNome, status: 'reutilizado' }); reutilizados++; continue; }
    try {
      const tokenId = Date.now().toString(36) + Math.random().toString(36).substr(2,4) + '_' + sucesso;
      await window.db.collection('tokens').doc(tokenId).set({ user, nome: c.nome, email: c.email||'', matricula: c.matricula||'', cursoId, cursoNome, prazo, createdAt: new Date().toISOString() });
      const link = `${baseUrl}?t=${tokenId}`;
      const nova = { id: Date.now().toString()+'_'+user.replace(/[^a-z0-9]/gi,'_'), colaboradorId: c.id, colaboradorUser: user, colaboradorNome: c.nome, colaboradorEmail: c.email||'', colaboradorMatricula: c.matricula||'', cursoId, cursoNome, prazo, status: 'pendente', dataCriacao: new Date().toISOString(), token: tokenId, link };
      await window.db.collection('atribuicoes').doc(nova.id).set(nova);
      atribuicoes.push(nova);
      linksGerados.push({ nome: c.nome, email: c.email, link, prazo, cursoNome, status: 'novo' });
      sucesso++;
    } catch(e) { console.error(e); }
  }
  
  const div = document.getElementById('links-gerados');
  if (div) {
    document.getElementById('links-list').innerHTML = linksGerados.map(l => `<div class="item-card" style="flex-direction:column;"><div style="display:flex;justify-content:space-between;"><div><strong>${escapeHtml(l.nome)}</strong> ${l.status==='reutilizado'?'<span style="background:var(--info-bg);padding:2px 8px;border-radius:12px;">Já atribuído</span>':'<span style="background:var(--success-bg);padding:2px 8px;border-radius:12px;">Novo</span>'}</div><div><button class="btn-copiar-link-individual" data-link="${l.link}">📋</button>${l.email?`<button class="btn-enviar-email-individual" data-email="${l.email}" data-nome="${l.nome}" data-link="${l.link}" data-prazo="${l.prazo}" data-curso="${l.cursoNome}">📧</button>`:''}</div></div><div style="margin-top:8px;padding:8px;background:var(--bg);border-radius:6px;font-size:11px;word-break:break-all;">${l.link}</div><div style="margin-top:6px;font-size:10px;">📅 ${l.prazo}</div></div>`).join('');
    document.querySelectorAll('.btn-copiar-link-individual').forEach(b => b.addEventListener('click', () => copiarLinkIndividual(b.dataset.link)));
    document.querySelectorAll('.btn-enviar-email-individual').forEach(b => b.addEventListener('click', () => enviarEmailIndividual(b.dataset.email, b.dataset.nome, b.dataset.link, b.dataset.prazo, b.dataset.curso)));
    div.style.display = 'block';
  }
  showToast(`✅ ${sucesso} novo(s), ${reutilizados} existente(s)`);
  renderAcompanhamento();
}

function copiarLinkIndividual(link) { navigator.clipboard?.writeText(link).then(() => showToast('🔗 Copiado!')); }
function copiarTodosLinks() { if (linksGerados.length) navigator.clipboard?.writeText(linksGerados.map(l => `${l.nome}\n${l.link}`).join('\n\n')).then(() => showToast('✅ Copiados!')); }

// ==================== ACOMPANHAMENTO (CORRIGIDO - SEM DUPLICADOS) ====================
function renderAcompanhamento() {
  const container = document.getElementById('acompanhar-lista'); if (!container) return;
  const filtroForm = document.getElementById('filtro-formacao-acompanhar')?.value;
  const filtroStatus = document.getElementById('filtro-status-acompanhar')?.value;
  
  // Remover duplicados
  const uniqueAtribuicoes = [];
  const ids = new Set();
  for (const a of atribuicoes) { if (!ids.has(a.id)) { ids.add(a.id); uniqueAtribuicoes.push(a); } }
  
  let filtered = uniqueAtribuicoes.filter(a => (!filtroForm || a.cursoId === filtroForm) && (!filtroStatus || a.status === filtroStatus));
  if (!filtered.length) { container.innerHTML = '<div class="empty">Nenhuma atribuição.</div>'; return; }
  
  const grouped = {}; filtered.forEach(a => { if (!grouped[a.cursoId]) grouped[a.cursoId] = { nome: a.cursoNome, atribuicoes: [] }; grouped[a.cursoId].atribuicoes.push(a); });
  container.innerHTML = Object.values(grouped).map(g => {
    const concluidos = g.atribuicoes.filter(a => ['concluido','concluída','Concluido','Concluído'].includes(a.status));
    const pendentes = g.atribuicoes.filter(a => !['concluido','concluída','Concluido','Concluído'].includes(a.status));
    return `<div class="acompanhar-card"><h4>📘 ${escapeHtml(g.nome)}</h4><div class="acompanhar-sub"><h5>✅ Concluídos (${concluidos.length})</h5><div class="acompanhar-lista">${concluidos.map(a => `<div class="acompanhar-item concluido"><span>${escapeHtml(a.colaboradorNome)}</span><button class="btn-ver-certificado" data-id="${a.id}">🎓</button></div>`).join('')||'<span>Nenhum</span>'}</div></div><div class="acompanhar-sub"><h5>⏳ Pendentes (${pendentes.length})</h5><div class="acompanhar-lista">${pendentes.map(a => `<div class="acompanhar-item pendente"><span>${escapeHtml(a.colaboradorNome)}</span><span>${a.prazo||'---'}</span><button class="btn-relembrar" data-id="${a.id}">📧</button></div>`).join('')||'<span>Nenhum</span>'}</div></div></div>`;
  }).join('');
  document.querySelectorAll('.btn-ver-certificado').forEach(b => b.addEventListener('click', () => visualizarCertificadoAtribuicao(b.dataset.id)));
  document.querySelectorAll('.btn-relembrar').forEach(b => b.addEventListener('click', () => relembrarColaborador(b.dataset.id)));
}

function visualizarCertificadoAtribuicao(id) {
  const a = atribuicoes.find(x => x.id === id); if (!a) return;
  const h = historicos.find(x => (x.nome === a.colaboradorUser || x.nomeDisplay === a.colaboradorNome) && x.cursoId === a.cursoId);
  if (!h) { showToast('❌ Certificado não encontrado'); return; }
  mostrarCertificado(h);
}

// ==================== HISTÓRICO ====================
function renderHistorico() {
  const tbody = document.getElementById('lista-notas'); if (!tbody) return;
  const filtro = document.getElementById('filtro-colaborador-historico')?.value;
  let filtered = historicos.filter(h => !filtro || h.nome === filtro || h.nomeDisplay === filtro);
  const select = document.getElementById('filtro-colaborador-historico');
  if (select && select.options.length <= 1) {
    const nomes = [...new Set(historicos.map(h => h.nomeDisplay || h.nome))];
    select.innerHTML = '<option value="">Todos</option>' + nomes.map(n => `<option>${escapeHtml(n)}</option>`).join('');
  }
  tbody.innerHTML = filtered.length ? filtered.map(h => `<tr><td>${escapeHtml(h.nomeDisplay||h.nome)}</td><td>${escapeHtml(h.email||'-')}</td><td>${escapeHtml(h.curso)}</td><td>${escapeHtml(h.data)}</td><td><span class="badge badge-success">${escapeHtml(h.nota)}</span></td><td><button class="btn-ver-certificado-historico" data-id="${h.id}">📄</button></td></tr>`).join('') : '<tr><td colspan="6" class="empty">Nenhum resultado.</td></tr>';
  document.querySelectorAll('.btn-ver-certificado-historico').forEach(b => b.addEventListener('click', () => { const h = historicos.find(x => x.id === b.dataset.id); if (h) mostrarCertificado(h); }));
}

function mostrarCertificado(h) {
  const f = formacoes.find(x => x.id === h.cursoId);
  const certHtml = `<div id="certificado-visualizacao-pdf" style="background-image:url('${certTemplate.fundoImagem}');background-size:cover;aspect-ratio:210/297;padding:40px;"><div style="text-align:center;height:100%;display:flex;flex-direction:column;justify-content:center;"><div style="font-family:'Fraunces';font-size:2rem;font-weight:900;color:#00338D;">${escapeHtml(h.nomeDisplay||h.nome)}</div><div style="font-size:1.2rem;color:#616365;">concluiu</div><div style="font-family:'Fraunces';font-size:1.5rem;font-weight:700;color:#C5A059;">${escapeHtml(h.curso)}</div><div style="display:flex;justify-content:center;gap:40px;margin-top:30px;"><div>Nota: ${h.nota}</div><div>Duração: ${f?.duracao||'—'}</div><div>Data: ${h.data}</div><div>ID: ${h.certificadoId||'—'}</div></div></div></div>`;
  document.getElementById('certificado-visualizacao').innerHTML = certHtml;
  document.getElementById('modal-certificado').style.display = 'flex';
  window.certificadoAtual = { html: certHtml, nome: h.nomeDisplay || h.nome };
}

function imprimirCertificadoModal() {
  html2canvas(document.getElementById('certificado-visualizacao-pdf'), {scale:3}).then(c => {
    const w = window.open(''); w.document.write(`<img src="${c.toDataURL()}">`); w.document.close(); w.print();
  });
}

function baixarPDFCertificadoModal() {
  html2canvas(document.getElementById('certificado-visualizacao-pdf'), {scale:3}).then(c => {
    const pdf = new jspdf.jsPDF('p','mm','a4'); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
    pdf.save(`certificado_${window.certificadoAtual?.nome||'colaborador'}.pdf`);
  });
}

function exportarHistoricoExcel() {
  if (!historicos.length) return;
  downloadExcel(historicos.map(h => ({ Colaborador: h.nomeDisplay||h.nome, Email: h.email, Formação: h.curso, Duração: formacoes.find(f=>f.id===h.cursoId)?.duracao||'—', Data: h.data, Nota: h.nota })), 'historico');
}

function exportarAcompanhamentoExcel() {
  if (!atribuicoes.length) return;
  const unique = []; const ids = new Set(); atribuicoes.forEach(a => { if (!ids.has(a.id)) { ids.add(a.id); unique.push(a); } });
  downloadExcel(unique.map(a => ({ Formação: a.cursoNome, Duração: formacoes.find(f=>f.id===a.cursoId)?.duracao||'—', Colaborador: a.colaboradorNome, Matrícula: a.colaboradorMatricula, Email: a.colaboradorEmail, Prazo: a.prazo, Status: ['concluido','concluída','Concluido','Concluído'].includes(a.status)?'Concluído':'Pendente' })), 'acompanhamento');
}

function limparHistorico() { if (confirm('Apagar TUDO?')) { historicos = []; salvarHistoricos(); renderHistorico(); atualizarDashboard(); renderAcompanhamento(); } }

// ==================== CERTIFICADO ====================
function inserirPlaceholder(ph) { document.getElementById('cert-texto').value += ph; }
function previewCertificado() {
  let texto = document.getElementById('cert-texto')?.value || '';
  ['nome','formacao','data','nota','certificado_id'].forEach(k => texto = texto.replace(new RegExp(`{{${k}}}`,'g'), {nome:'João Silva',formacao:'Formação Teste',data:new Date().toLocaleDateString('pt-PT'),nota:'85%',certificado_id:'CERT-001'}[k]));
  document.getElementById('cert-preview-content').innerHTML = `<div style="text-align:center;padding:20px;border:2px solid var(--birkenstock-gold);border-radius:16px;background-image:url('${document.getElementById('cert-fundo-imagem')?.value||''}');background-size:cover;"><h2>${escapeHtml(document.getElementById('cert-titulo')?.value||'')}</h2><div>${texto.replace(/\n/g,'<br>')}</div><div style="margin-top:20px;">${escapeHtml(document.getElementById('cert-rodape')?.value||'')}</div></div>`;
  document.getElementById('cert-preview').style.display = 'block';
}
function salvarTemplateCertificado() {
  certTemplate = { fundoImagem: document.getElementById('cert-fundo-imagem')?.value, titulo: document.getElementById('cert-titulo')?.value, texto: document.getElementById('cert-texto')?.value, rodape: document.getElementById('cert-rodape')?.value };
  localStorage.setItem('cert_template', JSON.stringify(certTemplate)); showToast('✅ Salvo!');
}
function resetTemplateCertificado() {
  certTemplate = {...defaultCert};
  document.getElementById('cert-fundo-imagem').value = defaultCert.fundoImagem;
  document.getElementById('cert-titulo').value = defaultCert.titulo;
  document.getElementById('cert-texto').value = defaultCert.texto;
  document.getElementById('cert-rodape').value = defaultCert.rodape;
  showToast('✅ Restaurado!');
}
function carregarTemplateCertificado() {
  const saved = localStorage.getItem('cert_template'); if (!saved) return;
  try { certTemplate = JSON.parse(saved); ['fundoImagem','titulo','texto','rodape'].forEach(k => { const el = document.getElementById(`cert-${k.replace('Imagem','-imagem')}`); if (el) el.value = certTemplate[k] || ''; }); } catch(e) {}
}

// ==================== SEGURANÇA ====================
function checkPasswordStrength(p) {
  let s = 0; if (p.length>=8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^a-zA-Z0-9]/.test(p)) s++;
  const d = document.getElementById('password-strength-admin'); if (d) { d.className = 'password-strength'; d.classList.add(s<=1?'strength-weak':s<=2?'strength-medium':'strength-strong'); }
}
function alterarPasswordAdmin() {
  const atual = document.getElementById('admin-pass-atual')?.value;
  const nova = document.getElementById('admin-pass-nova')?.value;
  const conf = document.getElementById('admin-pass-confirm')?.value;
  if (atual !== (localStorage.getItem('admin_password')||window.ADMIN_PASS||'SSA2024admin')) { showToast('❌ Password atual incorreta'); return; }
  if (nova !== conf) { showToast('❌ Passwords não coincidem'); return; }
  if (nova.length < 6) { showToast('❌ Mínimo 6 caracteres'); return; }
  localStorage.setItem('admin_password', nova); window.ADMIN_PASS = nova;
  showToast('✅ Password alterada!'); document.getElementById('admin-pass-atual').value = document.getElementById('admin-pass-nova').value = document.getElementById('admin-pass-confirm').value = '';
  setTimeout(() => location.reload(), 2000);
}

// ==================== SWITCH TAB ====================
function switchTab(tabId) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${tabId}`)?.classList.add('active');
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.admin-tab[data-tab="${tabId}"]`)?.classList.add('active');
  if (tabId === 'colaboradores') renderColabs();
  if (tabId === 'historico') renderHistorico();
  if (tabId === 'atribuir') prepararAtribuicao();
  if (tabId === 'atribuir-massa') { linksGerados = []; document.getElementById('links-gerados').style.display = 'none'; atualizarSelectores(); }
  if (tabId === 'overview') { atualizarDashboard(); renderPrazosProximos(); }
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
  document.getElementById('import-csv')?.addEventListener('change', e => importColaboradores(e.target.files));
  document.getElementById('btn-download-modelo')?.addEventListener('click', downloadModeloCSV);
  document.getElementById('filtro-formacao-acompanhar')?.addEventListener('change', renderAcompanhamento);
  document.getElementById('filtro-status-acompanhar')?.addEventListener('change', renderAcompanhamento);
  document.getElementById('filtro-colaborador-historico')?.addEventListener('change', renderHistorico);
  document.getElementById('atribuir-curso')?.addEventListener('change', atualizarSelectores);
  document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => b.closest('.modal').style.display = 'none'));
}

function setupRealtimeListeners() {
  if (!window.firebaseReady) return;
  window.db.collection('historicos').onSnapshot(s => { historicos = s.docs.map(d => ({id:d.id,...d.data()})); if (document.getElementById('sec-historico')?.classList.contains('active')) renderHistorico(); if (document.getElementById('sec-acompanhar')?.classList.contains('active')) renderAcompanhamento(); if (document.getElementById('sec-overview')?.classList.contains('active')) { atualizarDashboard(); renderPrazosProximos(); } });
  window.db.collection('atribuicoes').onSnapshot(s => { atribuicoes = s.docs.map(d => ({id:d.id,...d.data()})); if (document.getElementById('sec-acompanhar')?.classList.contains('active')) renderAcompanhamento(); if (document.getElementById('sec-overview')?.classList.contains('active')) { atualizarDashboard(); renderPrazosProximos(); } if (document.getElementById('sec-atribuir-massa')?.classList.contains('active')) atualizarSelectores(); });
  window.db.collection('formacoes').onSnapshot(s => { formacoes = s.docs.map(d => ({id:d.id,...d.data()})); if (document.getElementById('sec-formacoes')?.classList.contains('active')) renderFormacoesLista(); if (document.getElementById('sec-overview')?.classList.contains('active')) atualizarDashboard(); atualizarSelectores(); });
}

function initAdmin() {
  const firebaseUser = window.auth?.currentUser;
  if (!firebaseUser && localStorage.getItem('usuarioAdmin') !== 'admin') { location.href = 'login.html'; return; }
  if (firebaseUser) { localStorage.setItem('usuarioAdmin', 'admin'); localStorage.setItem('usuarioNome', firebaseUser.displayName||'Administrador'); localStorage.setItem('usuarioEmail', firebaseUser.email||''); }
  carregarDadosExemplo().then(() => {
    setupEventListeners();
    renderModulos(); renderPerguntas(); renderColabs(); renderHistorico();
    atualizarSelectores(); atualizarDashboard(); renderFormacoesLista();
    carregarTemplateCertificado(); renderAcompanhamento();
    setupRealtimeListeners();
    setTimeout(() => atualizarSelectores(), 500);
  });
}

// ==================== EXPOR GLOBALMENTE ====================
window.gerarCodigoAtribuicao = gerarCodigoAtribuicao;
window.EnvioEmail = EnvioEmail;
window.enviarEmailIndividual = enviarEmailIndividual;
window.enviarEmailsMassa = enviarEmailsMassa;
window.relembrarColaborador = relembrarColaborador;
window.copiarLink = copiarLink;
window.abrirModalModulo = abrirModalModulo;
window.editarModulo = editarModulo;
window.salvarModulo = salvarModulo;
window.removerModulo = removerModulo;
window.renderModulos = renderModulos;
window.abrirModalPergunta = abrirModalPergunta;
window.editarPergunta = editarPergunta;
window.salvarPergunta = salvarPergunta;
window.removerPergunta = removerPergunta;
window.renderPerguntas = renderPerguntas;
window.saveUser = saveUser;
window.importColaboradores = importColaboradores;
window.downloadModeloCSV = downloadModeloCSV;
window.exportarColaboradoresExcel = exportarColaboradoresExcel;
window.selecionarTodos = selecionarTodos;
window.deselecionarTodos = deselecionarTodos;
window.gerarLinksMassa = gerarLinksMassa;
window.copiarLinkIndividual = copiarLinkIndividual;
window.copiarTodosLinks = copiarTodosLinks;
window.visualizarCertificadoAtribuicao = visualizarCertificadoAtribuicao;
window.imprimirCertificadoModal = imprimirCertificadoModal;
window.baixarPDFCertificadoModal = baixarPDFCertificadoModal;
window.exportarAcompanhamentoExcel = exportarAcompanhamentoExcel;
window.publicarFormacao = publicarFormacao;
window.exportarHistoricoExcel = exportarHistoricoExcel;
window.limparHistorico = limparHistorico;
window.inserirPlaceholder = inserirPlaceholder;
window.previewCertificado = previewCertificado;
window.salvarTemplateCertificado = salvarTemplateCertificado;
window.resetTemplateCertificado = resetTemplateCertificado;
window.carregarTemplateCertificado = carregarTemplateCertificado;
window.checkPasswordStrength = checkPasswordStrength;
window.alterarPasswordAdmin = alterarPasswordAdmin;
window.switchTab = switchTab;
window.initAdmin = initAdmin;

document.addEventListener('DOMContentLoaded', initAdmin);
console.log('✅ admin.js - VERSÃO FINAL CORRIGIDA');
