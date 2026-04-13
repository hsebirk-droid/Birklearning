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
      console.error('❌ Erro crítico ao carregar do Firestore:', error.message);
      const dashboardGrid = document.getElementById('dashboard-grid');
      if (dashboardGrid) {
        dashboardGrid.innerHTML = '<div class="empty"><p>❌ Erro de ligação à base de dados.<br><button class="btn" onclick="location.reload()">Tentar novamente</button></p></div>';
      }
      return;
    }
  } else {
    console.log('📦 A carregar do localStorage (modo offline)');
    formacoes = JSON.parse(localStorage.getItem('formacoes') || '[]');
    colaboradores = JSON.parse(localStorage.getItem('colaboradores') || '[]');
    atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
    historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
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
  
  // 🔥 NOVO: Renderizar prazos próximos
  renderPrazosProximos();
}

// ==================== PRAZOS PRÓXIMOS ====================
function renderPrazosProximos() {
  const container = document.getElementById('prazos-proximos');
  if (!container) return;
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const pendentes = atribuicoes.filter(a => 
    a.status !== 'concluido' && 
    a.status !== 'concluída' && 
    a.status !== 'Concluido' && 
    a.status !== 'Concluído' &&
    a.prazo
  );
  
  const proximos = pendentes.map(a => {
    let prazoDate;
    if (a.prazo.includes('/')) {
      const partes = a.prazo.split('/');
      prazoDate = new Date(partes[2], partes[1] - 1, partes[0]);
    } else {
      prazoDate = new Date(a.prazo);
    }
    prazoDate.setHours(23, 59, 59, 999);
    
    const diasRestantes = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    
    return {
      ...a,
      prazoDate,
      diasRestantes
    };
  }).filter(a => a.diasRestantes <= 7 && a.diasRestantes >= 0)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  
  if (proximos.length === 0) {
    container.innerHTML = '<div class="empty">✅ Nenhuma formação próxima do prazo.</div>';
    return;
  }
  
  container.innerHTML = proximos.map(a => {
    const urgente = a.diasRestantes <= 2;
    const alerta = a.diasRestantes <= 5;
    
    let statusIcon = '📅';
    if (a.diasRestantes === 0) statusIcon = '🚨';
    else if (a.diasRestantes === 1) statusIcon = '⚠️';
    else if (a.diasRestantes <= 3) statusIcon = '⏰';
    
    let diasTexto = '';
    if (a.diasRestantes === 0) diasTexto = 'HOJE!';
    else if (a.diasRestantes === 1) diasTexto = 'AMANHÃ!';
    else diasTexto = `${a.diasRestantes} dias`;
    
    return `
      <div class="item-card" style="border-left: 4px solid ${urgente ? 'var(--danger)' : (alerta ? 'var(--warning)' : 'var(--info)')};">
        <div class="item-card-info">
          <div class="item-card-title">
            ${statusIcon} ${escapeHtml(a.colaboradorNome)} - ${escapeHtml(a.cursoNome)}
          </div>
          <div class="item-card-meta" style="color: ${urgente ? 'var(--danger)' : (alerta ? 'var(--warning)' : 'var(--info)')}; font-weight: 600;">
            ⏳ Termina em ${diasTexto} (${escapeHtml(a.prazo)})
          </div>
        </div>
        <div class="item-card-actions">
          <button class="btn-relembrar-dashboard" data-id="${a.id}" style="background: var(--info); color: white; border: none; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 12px;">
            📧 Relembrar
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.btn-relembrar-dashboard').forEach(btn => {
    btn.addEventListener('click', () => relembrarColaborador(btn.dataset.id));
  });
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

async function gerarCodigoAtribuicao() {
    const colabId = document.getElementById('select-colaborador')?.value;
    const cursoId = document.getElementById('select-formacao')?.value;
    const prazo = document.getElementById('atrib-prazo')?.value || '31/12/2026';
    
    if (!colabId) { showToast('❌ Selecione um colaborador'); return; }
    if (!cursoId) { showToast('❌ Selecione uma formação'); return; }
    
    const colaborador = colaboradores.find(c => c.id === colabId);
    const formacao = formacoes.find(f => f.id === cursoId);
    if (!colaborador || !formacao) { showToast('❌ Dados não encontrados'); return; }
    
    const user = colaborador.user || colaborador.email;
    
    const atribuicaoExistente = atribuicoes.find(a => 
        a.colaboradorUser === user && 
        a.cursoId === cursoId && 
        a.status !== 'concluido' && 
        a.status !== 'concluída' && 
        a.status !== 'Concluido' && 
        a.status !== 'Concluído'
    );
    
    if (atribuicaoExistente) {
        showToast('⚠️ Este colaborador já tem esta formação atribuída!');
        document.getElementById('resultado-atribuicao').style.display = 'block';
        document.getElementById('link-gerado').textContent = atribuicaoExistente.link;
        window.linkAtualGerado = atribuicaoExistente.link;
        return;
    }
    
    showToast('⏳ A gerar link...');
    
    const tokenId = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    
    const tokenData = { 
        user: user,
        nome: colaborador.nome,
        email: colaborador.email || '',
        matricula: colaborador.matricula || '',
        cursoId: cursoId, 
        cursoNome: formacao.nome,
        prazo: prazo, 
        ts: Date.now(),
        createdAt: new Date().toISOString()
    };
    
    if (!window.firebaseReady || !window.db) {
        showToast('❌ Erro: Sem ligação à base de dados online.');
        return;
    }
    
    try {
        await window.db.collection('tokens').doc(tokenId).set(tokenData);
        console.log('☁️ Token guardado no Firestore:', tokenId);
        
        const urlBase = window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao.html';
        const linkFinal = `${urlBase}?t=${tokenId}`;
        
        const novaAtribuicao = {
            id: Date.now().toString() + '_' + user.replace(/[^a-z0-9]/gi, '_'),
            colaboradorId: colaborador.id,
            colaboradorUser: user,
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
        
        await window.db.collection('atribuicoes').doc(novaAtribuicao.id).set(novaAtribuicao);
        atribuicoes.push(novaAtribuicao);
        
        document.getElementById('resultado-atribuicao').style.display = 'block';
        document.getElementById('link-gerado').textContent = linkFinal;
        window.linkAtualGerado = linkFinal;
        
        showToast("✅ Atribuição registada com sucesso!");
        
    } catch (error) {
        console.error('❌ Erro ao guardar no Firestore:', error);
        showToast('❌ Erro ao gerar link: ' + error.message);
    }
}

// ==================== CONTINUA... (o resto do ficheiro mantém-se igual, mas sem duplicações) ====================
// [NOTA: Devido ao limite de caracteres, vou fornecer o resto das funções num próximo bloco]
