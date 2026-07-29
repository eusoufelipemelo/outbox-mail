/* ============================================================
   OutBox Mail — Camada de dados
   Persistência local (localStorage) com API única `OB`.
   Trocar por Supabase = reescrever apenas OB.persist / OB.q.
   ============================================================ */
window.OB = (function () {
  const KEY = 'obmail_db_v1';
  const KEY_SESSAO = 'obmail_sessao';
  const KEY_TEMA = 'obmail_tema';

  /* ---------- utilidades ---------- */
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

  /*
    Senhas do painel nunca são guardadas em texto puro.
    Guardamos o hash SHA-256; no login, o texto digitado é convertido
    em hash e comparado. Assim a senha real nunca aparece no código
    nem no armazenamento local. (crypto.subtle exige https ou localhost.)
  */
  async function hashSenha(s) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  /* hashes pré-calculados dos acessos que já nascem com o sistema */
  const H = {
    felipe:  '660303237cedea7098688a233b293235327ba19551d65b7190bb4fe13047f4af', // admin real
    admin:   '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin demo (admin123)
    cliente: '09a31a7001e261ab1e056182a71d3cf57f582ca9a29cff5eb83be0f0549730a9', // clientes demo (cliente123)
  };
  const hoje = () => new Date();
  const iso = (d) => d.toISOString();

  function addMeses(data, n) {
    const d = new Date(data);
    const dia = d.getDate();
    d.setMonth(d.getMonth() + n);
    if (d.getDate() < dia) d.setDate(0);
    return d;
  }
  function addDias(data, n) { const d = new Date(data); d.setDate(d.getDate() + n); return d; }

  const money = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (n) => Number(n || 0).toLocaleString('pt-BR');
  const pct = (n, casas = 1) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';

  function fdate(v) {
    if (!v) return '–';
    const d = new Date(v);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function fdatetime(v) {
    if (!v) return '–';
    const d = new Date(v);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function mesRotulo(d) {
    return new Date(d).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').replace(/^\w/, (c) => c.toUpperCase());
  }
  function desde(v) {
    const seg = Math.floor((Date.now() - new Date(v)) / 1000);
    if (seg < 60) return 'agora';
    if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
    if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;
    const dias = Math.floor(seg / 86400);
    if (dias < 30) return `há ${dias} d`;
    return fdate(v);
  }
  const gb = (mb) => (mb / 1024).toFixed(mb < 1024 ? 2 : 1).replace('.', ',') + ' GB';

  /* ---------- catálogo de planos ---------- */
  /*
    Preços por caixa de e-mail.
    `precos` guarda o TOTAL cobrado em cada ciclo; o valor mensal
    equivalente é derivado dividindo pelos meses do ciclo.
    Âncora definida com o cliente: Essencial em 3 anos = R$ 430,00.
  */
  const CICLOS = [
    { id: 'mensal', nome: 'Mensal', curto: 'mês', meses: 1 },
    { id: 'anual', nome: 'Anual', curto: 'ano', meses: 12 },
    { id: 'trienal', nome: '3 anos', curto: '3 anos', meses: 36 },
  ];

  const PLANOS = [
    {
      id: 'inicio', nome: 'Início', custo: 3.00, cota: 1, destaque: false,
      precos: { mensal: 9.90, anual: 99.00, trienal: 238.00 },
      desc: 'O básico bem feito, para sair do e-mail pessoal hoje.',
      resumo: '1 GB por caixa',
      recursos: [
        ['1 GB de espaço por caixa', true],
        ['1 apelido incluso', true],
        ['Webmail e aplicativo no celular', true],
        ['Antispam e antivírus', true],
        ['IMAP, POP3 e SMTP', true],
        ['Agenda e contatos compartilhados', false],
        ['Regras, filtros e resposta automática', false],
        ['Atendimento em tempo real', false],
      ],
    },
    {
      id: 'essencial', nome: 'Essencial', custo: 6.00, cota: 10, destaque: false,
      precos: { mensal: 17.90, anual: 179.00, trienal: 430.00 },
      desc: 'Para quem usa o e-mail o dia inteiro e não pode ficar sem espaço.',
      resumo: '10 GB por caixa',
      recursos: [
        ['10 GB de espaço por caixa', true],
        ['Até 10 apelidos por caixa', true],
        ['Webmail e aplicativo no celular', true],
        ['Antispam e antivírus', true],
        ['IMAP, POP3 e SMTP', true],
        ['Agenda e contatos compartilhados', true],
        ['Regras, filtros e resposta automática', false],
        ['Atendimento em tempo real', true],
      ],
    },
    {
      id: 'profissional', nome: 'Profissional', custo: 8.00, cota: 30, destaque: true,
      precos: { mensal: 23.90, anual: 239.00, trienal: 574.00 },
      desc: 'O equilíbrio certo para equipes que vivem do e-mail.',
      resumo: '30 GB por caixa',
      recursos: [
        ['30 GB de espaço por caixa', true],
        ['Apelidos ilimitados', true],
        ['Webmail e aplicativo no celular', true],
        ['Antispam e antivírus', true],
        ['IMAP, POP3 e SMTP', true],
        ['Agenda e contatos compartilhados', true],
        ['Regras, filtros e resposta automática', true],
        ['Atendimento em tempo real', true],
      ],
    },
    {
      id: 'business', nome: 'Business', custo: 17.00, cota: 60, destaque: false,
      precos: { mensal: 49.90, anual: 499.00, trienal: 1198.00 },
      desc: 'Volume alto, histórico longo e atendimento na frente da fila.',
      resumo: '60 GB por caixa',
      recursos: [
        ['60 GB de espaço por caixa', true],
        ['Apelidos ilimitados', true],
        ['Webmail e aplicativo no celular', true],
        ['Antispam e antivírus', true],
        ['IMAP, POP3 e SMTP', true],
        ['Agenda e contatos compartilhados', true],
        ['Regras, filtros e resposta automática', true],
        ['Atendimento prioritário em tempo real', true],
      ],
    },
  ];

  const planoPor = (id) => PLANOS.find((p) => p.id === id) || PLANOS[0];
  const cicloPor = (id) => CICLOS.find((c) => c.id === id) || CICLOS[0];
  const mesesDe = (ciclo) => cicloPor(ciclo).meses;

  /* total cobrado por caixa em um ciclo inteiro */
  function totalCiclo(planoId, ciclo) {
    const p = planoPor(planoId);
    return p.precos[cicloPor(ciclo).id] || p.precos.mensal;
  }
  /* valor mensal equivalente por caixa, base de comparação e do MRR */
  function precoUnit(planoId, ciclo) {
    return +(totalCiclo(planoId, ciclo) / mesesDe(ciclo)).toFixed(2);
  }
  /* quanto o cliente economiza no ciclo, comparado a pagar mês a mês */
  function economiaCiclo(planoId, ciclo) {
    const p = planoPor(planoId);
    const cheio = p.precos.mensal * mesesDe(ciclo);
    return +(cheio - totalCiclo(planoId, ciclo)).toFixed(2);
  }
  function descontoPct(planoId, ciclo) {
    const p = planoPor(planoId);
    const cheio = p.precos.mensal * mesesDe(ciclo);
    if (!cheio) return 0;
    return Math.round(((cheio - totalCiclo(planoId, ciclo)) / cheio) * 100);
  }

  const CORES = ['#F15532', '#2563EB', '#16A34A', '#7C3AED', '#D97706', '#0891B2', '#DB2777'];
  const corDe = (txt) => CORES[[...String(txt)].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];
  const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  /* ---------- seed de demonstração ---------- */
  function seed() {
    const agora = hoje();
    const db = {
      versao: 1,
      criado_em: iso(agora),
      usuarios: [], contas: [], dominios: [], caixas: [],
      assinaturas: [], faturas: [], cupons: [], logs: [], chamados: [],
      config: {
        empresa: 'OutBox Group',
        produto: 'OutBox Mail',
        provedor: 'demo',
        email_suporte: 'suporte@outboxgroup.com.br',
        whatsapp: '5514991234567',
        trial_dias: 7,
        carencia_dias: 5,
      },
    };

    /* administradores */
    db.usuarios.push({
      id: 'usr_felipe', nome: 'Felipe Melo', email: 'felipe@outboxgroup.com.br',
      senha: H.felipe, papel: 'admin', conta_id: null,
      telefone: '(14) 99123-4567', criado_em: iso(addMeses(agora, -14)), ativo: true,
    });
    db.usuarios.push({
      id: 'usr_admin', nome: 'Administrador (demonstração)', email: 'admin@outboxgroup.com.br',
      senha: H.admin, papel: 'admin', conta_id: null,
      telefone: '(14) 99123-4567', criado_em: iso(addMeses(agora, -14)), ativo: true,
    });

    const base = [
      {
        empresa: 'Bellucci Planejados', doc: '12.345.678/0001-90', tipo: 'pj',
        dominio: 'belluccimoveis.com.br', plano: 'profissional', ciclo: 'anual', meses: 9, origem: 'consultor',
        contato: 'Marcos Bellucci', email: 'marcos@belluccimoveis.com.br', cidade: 'Ourinhos', uf: 'SP',
        caixas: [
          ['contato', 'Contato Bellucci', 'caixa', '', 8420],
          ['comercial', 'Comercial', 'caixa', '', 14380],
          ['marcos', 'Marcos Bellucci', 'caixa', '', 21150],
          ['financeiro', 'Financeiro', 'caixa', '', 5240],
          ['vendas', 'Vendas (apelido)', 'alias', 'comercial@belluccimoveis.com.br', 0],
        ],
      },
      {
        empresa: 'Clínica Áurea Plenus', doc: '23.456.789/0001-01', tipo: 'pj',
        dominio: 'aureaplenus.com.br', plano: 'essencial', ciclo: 'mensal', meses: 5, origem: 'site',
        contato: 'Dra. Renata Alves', email: 'renata@aureaplenus.com.br', cidade: 'Santa Cruz do Rio Pardo', uf: 'SP',
        caixas: [
          ['contato', 'Recepção', 'caixa', '', 3120],
          ['renata', 'Dra. Renata', 'caixa', '', 6890],
          ['agendamento', 'Agendamento', 'caixa', '', 1740],
        ],
      },
      {
        empresa: 'MOBID Planejados', doc: '34.567.890/0001-12', tipo: 'pj',
        dominio: 'mobidplanejados.com.br', plano: 'business', ciclo: 'trienal', meses: 7, origem: 'indicacao',
        contato: 'Juliana Prado', email: 'juliana@mobidplanejados.com.br', cidade: 'Bauru', uf: 'SP',
        caixas: [
          ['contato', 'Contato MOBID', 'caixa', '', 18300],
          ['juliana', 'Juliana Prado', 'caixa', '', 42600],
          ['projetos', 'Projetos', 'caixa', '', 61200],
          ['pos-venda', 'Pós-venda', 'caixa', '', 9800],
          ['montagem', 'Montagem', 'caixa', '', 4300],
          ['sac', 'SAC (redireciona)', 'encaminhamento', 'contato@mobidplanejados.com.br', 0],
        ],
      },
      {
        empresa: 'New Bike Center', doc: '45.678.901/0001-23', tipo: 'pj',
        dominio: 'newbikecenter.com.br', plano: 'inicio', ciclo: 'mensal', meses: 3, origem: 'site',
        contato: 'Rafael Souza', email: 'rafael@newbikecenter.com.br', cidade: 'Ourinhos', uf: 'SP',
        inadimplente: true,
        caixas: [
          ['contato', 'Contato', 'caixa', '', 780],
          ['oficina', 'Oficina', 'caixa', '', 410],
        ],
      },
      {
        empresa: 'Stopa Design', doc: '56.789.012/0001-34', tipo: 'pj',
        dominio: 'stopadesing.com.br', plano: 'profissional', ciclo: 'mensal', meses: 1, origem: 'consultor',
        contato: 'Camila Stopa', email: 'camila@stopadesing.com.br', cidade: 'Ourinhos', uf: 'SP',
        pendenteDns: true,
        caixas: [
          ['contato', 'Contato Stopa', 'caixa', '', 320],
          ['camila', 'Camila Stopa', 'caixa', '', 810],
        ],
      },
    ];

    base.forEach((b, i) => {
      const criadoEm = addMeses(agora, -b.meses);
      const conta = {
        id: uid('cta'), empresa: b.empresa, doc: b.doc, tipo: b.tipo,
        telefone: '(14) 9' + (9000 + i * 137) + '-' + (1000 + i * 211),
        cep: '19900-000', cidade: b.cidade, uf: b.uf, origem: b.origem,
        criado_em: iso(criadoEm),
      };
      db.contas.push(conta);

      db.usuarios.push({
        id: uid('usr'), nome: b.contato, email: b.email, senha: H.cliente,
        papel: 'cliente', conta_id: conta.id, telefone: conta.telefone,
        criado_em: iso(criadoEm), ativo: true,
      });

      const caixasReais = b.caixas.filter((c) => c[2] === 'caixa').length;
      const dominio = {
        id: uid('dom'), conta_id: conta.id, dominio: b.dominio,
        status: b.pendenteDns ? 'pendente' : (b.inadimplente ? 'suspenso' : 'ativo'),
        plano_id: b.plano, ciclo: b.ciclo, dkim_selector: 'obmail',
        dns: b.pendenteDns
          ? { mx: false, spf: true, dkim: false, dmarc: false }
          : { mx: true, spf: true, dkim: true, dmarc: true },
        criado_em: iso(criadoEm),
        ativado_em: b.pendenteDns ? null : iso(addDias(criadoEm, 1)),
      };
      db.dominios.push(dominio);

      b.caixas.forEach((c) => {
        db.caixas.push({
          id: uid('cx'), dominio_id: dominio.id, conta_id: conta.id,
          local: c[0], nome: c[1], tipo: c[2], destino: c[3],
          cota_gb: planoPor(b.plano).cota, usado_mb: c[4],
          status: b.inadimplente ? 'suspensa' : 'ativa',
          criado_em: iso(addDias(criadoEm, 1)),
          ultimo_acesso: iso(addDias(agora, -Math.floor(Math.random() * 4))),
        });
      });

      const unit = precoUnit(b.plano, b.ciclo);
      const assin = {
        id: uid('asn'), conta_id: conta.id, dominio_id: dominio.id,
        plano_id: b.plano, ciclo: b.ciclo, qtd: caixasReais, qtd_contratada: caixasReais,
        valor_unit: unit, valor_total: +(unit * caixasReais).toFixed(2),
        valor_ciclo: +(totalCiclo(b.plano, b.ciclo) * caixasReais).toFixed(2),
        status: b.inadimplente ? 'inadimplente' : (b.pendenteDns ? 'trial' : 'ativa'),
        proxima_cobranca: iso(addMeses(agora, mesesDe(b.ciclo))),
        criado_em: iso(criadoEm),
      };
      db.assinaturas.push(assin);

      /* histórico de faturas, por competência mensal */
      for (let m = b.meses; m >= 0; m--) {
        const venc = addMeses(criadoEm, b.meses - m);
        if (venc > agora && m !== 0) continue;
        const futura = venc > agora;
        const ultima = m === 0;
        let status = 'paga';
        if (futura) status = 'aberta';
        else if (ultima && b.inadimplente) status = 'vencida';
        else if (ultima && b.pendenteDns) status = 'aberta';

        db.faturas.push({
          id: uid('fat'),
          numero: String(1000 + db.faturas.length + 1),
          conta_id: conta.id, assinatura_id: assin.id,
          competencia: iso(venc),
          valor: assin.valor_total,
          vencimento: iso(venc),
          status,
          pago_em: status === 'paga' ? iso(addDias(venc, -2)) : null,
          metodo: status === 'paga' ? (i % 2 ? 'Pix' : 'Cartão de crédito') : null,
        });
      }
    });

    db.cupons = [
      { codigo: 'OUTBOX10', tipo: 'percentual', valor: 10, ativo: true, usos: 14, limite: 100, desc: 'Campanha institucional' },
      { codigo: 'PRIMEIRO50', tipo: 'percentual', valor: 50, ativo: true, usos: 6, limite: 50, desc: '50% no primeiro mês' },
      { codigo: 'MIGRACAO', tipo: 'fixo', valor: 30, ativo: true, usos: 3, limite: 0, desc: 'Bônus de migração' },
    ];

    db.chamados = [
      { id: uid('chm'), conta_id: db.contas[3].id, assunto: 'Fatura em atraso', mensagem: 'Preciso da segunda via do boleto de junho.', status: 'aberto', criado_em: iso(addDias(agora, -2)) },
      { id: uid('chm'), conta_id: db.contas[1].id, assunto: 'Configurar no iPhone', mensagem: 'Não consigo configurar a caixa no Mail do iPhone.', status: 'respondido', criado_em: iso(addDias(agora, -6)) },
    ];

    db.logs = [
      { id: uid('log'), quando: iso(addDias(agora, -1)), ator: 'Sistema', acao: 'Domínio suspenso por inadimplência', alvo: 'newbikecenter.com.br', tipo: 'alerta' },
      { id: uid('log'), quando: iso(addDias(agora, -2)), ator: 'Camila Stopa', acao: 'Domínio cadastrado, aguardando DNS', alvo: 'stopadesing.com.br', tipo: 'info' },
      { id: uid('log'), quando: iso(addDias(agora, -3)), ator: 'Juliana Prado', acao: 'Caixa criada', alvo: 'montagem@mobidplanejados.com.br', tipo: 'ok' },
      { id: uid('log'), quando: iso(addDias(agora, -5)), ator: 'Sistema', acao: 'Pagamento confirmado via Pix', alvo: 'Bellucci Planejados', tipo: 'ok' },
    ];

    return db;
  }

  /* ---------- persistência ---------- */
  let db = null;

  function carregar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { db = JSON.parse(raw); return db; }
    } catch (e) { console.warn('Base local corrompida, recriando.', e); }
    db = seed();
    salvar();
    return db;
  }
  function salvar() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { console.warn('Não foi possível salvar localmente.', e); }
  }
  function resetar() { localStorage.removeItem(KEY); db = seed(); salvar(); return db; }

  /* ---------- consultas ---------- */
  const q = {
    usuarioPorEmail: (email) => db.usuarios.find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim()),
    usuarioPorId: (id) => db.usuarios.find((u) => u.id === id),
    contaPorId: (id) => db.contas.find((c) => c.id === id),
    usuarioDaConta: (contaId) => db.usuarios.find((u) => u.conta_id === contaId),
    dominiosDaConta: (contaId) => db.dominios.filter((d) => d.conta_id === contaId),
    dominioPorId: (id) => db.dominios.find((d) => d.id === id),
    dominioPorNome: (nome) => db.dominios.find((d) => d.dominio.toLowerCase() === String(nome).toLowerCase().trim()),
    caixasDoDominio: (domId) => db.caixas.filter((c) => c.dominio_id === domId),
    caixasDaConta: (contaId) => db.caixas.filter((c) => c.conta_id === contaId),
    caixaPorId: (id) => db.caixas.find((c) => c.id === id),
    assinaturaDoDominio: (domId) => db.assinaturas.find((a) => a.dominio_id === domId),
    assinaturasDaConta: (contaId) => db.assinaturas.filter((a) => a.conta_id === contaId),
    faturasDaConta: (contaId) => db.faturas.filter((f) => f.conta_id === contaId)
      .sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento)),
    cupomPorCodigo: (cod) => db.cupons.find((c) => c.codigo.toUpperCase() === String(cod).toUpperCase().trim() && c.ativo),
    contasAtivas: () => db.contas.filter((c) => db.dominios.some((d) => d.conta_id === c.id && d.status !== 'cancelado')),
  };

  /* ---------- escritas ---------- */
  function log(acao, alvo, tipo, ator) {
    db.logs.unshift({
      id: uid('log'), quando: iso(hoje()),
      ator: ator || (window.Auth && Auth.atual() ? Auth.atual().nome : 'Sistema'),
      acao, alvo: alvo || '', tipo: tipo || 'info',
    });
    db.logs = db.logs.slice(0, 200);
    salvar();
  }

  function criarConta({ empresa, doc, tipo, contato, email, senha, telefone, cidade, uf, origem }) {
    const conta = {
      id: uid('cta'), empresa, doc: doc || '', tipo: tipo || 'pj',
      telefone: telefone || '', cep: '', cidade: cidade || '', uf: uf || '',
      origem: origem || 'site', criado_em: iso(hoje()),
    };
    db.contas.push(conta);
    const usuario = {
      id: uid('usr'), nome: contato, email: String(email).toLowerCase().trim(),
      senha, papel: 'cliente', conta_id: conta.id, telefone: telefone || '',
      criado_em: iso(hoje()), ativo: true,
    };
    db.usuarios.push(usuario);
    salvar();
    log('Conta criada', empresa, 'ok', contato);
    return { conta, usuario };
  }

  function criarDominio({ contaId, dominio, planoId, ciclo, qtd, nomeContato }) {
    const d = {
      id: uid('dom'), conta_id: contaId, dominio: String(dominio).toLowerCase().trim(),
      status: 'pendente', plano_id: planoId, ciclo, dkim_selector: 'obmail',
      dns: { mx: false, spf: false, dkim: false, dmarc: false },
      criado_em: iso(hoje()), ativado_em: null,
    };
    db.dominios.push(d);

    const unit = precoUnit(planoId, ciclo);
    const assin = {
      id: uid('asn'), conta_id: contaId, dominio_id: d.id, plano_id: planoId, ciclo,
      qtd: qtd || 1, qtd_contratada: qtd || 1,
      valor_unit: unit, valor_total: +(unit * (qtd || 1)).toFixed(2),
      valor_ciclo: +(totalCiclo(planoId, ciclo) * (qtd || 1)).toFixed(2),
      status: 'trial', proxima_cobranca: iso(addDias(hoje(), db.config.trial_dias)),
      criado_em: iso(hoje()),
    };
    db.assinaturas.push(assin);

    /* toda contratação já nasce com o endereço principal criado */
    const senhaInicial = senhaAleatoria();
    criarCaixa({
      dominioId: d.id, local: 'contato',
      nome: nomeContato || 'Contato', tipo: 'caixa', senha: senhaInicial,
    });

    /* a primeira fatura cobra o ciclo inteiro, sobre as caixas existentes */
    db.faturas.push({
      id: uid('fat'), numero: String(1000 + db.faturas.length + 1),
      conta_id: contaId, assinatura_id: assin.id,
      competencia: iso(hoje()), valor: assin.valor_ciclo,
      vencimento: iso(addDias(hoje(), db.config.trial_dias)),
      status: 'aberta', pago_em: null, metodo: null,
    });

    salvar();
    log('Domínio contratado', d.dominio, 'ok');
    return { dominio: d, assinatura: assin, senhaInicial };
  }

  function senhaAleatoria(n = 14) {
    const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let s = '';
    for (let i = 0; i < n; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  }

  function criarCaixa({ dominioId, local, nome, tipo, destino, senha }) {
    const dom = q.dominioPorId(dominioId);
    if (!dom) return null;
    const existe = q.caixasDoDominio(dominioId)
      .some((c) => c.local.toLowerCase() === String(local).toLowerCase().trim());
    if (existe) return { erro: 'Já existe um endereço com esse nome neste domínio.' };

    const caixa = {
      id: uid('cx'), dominio_id: dominioId, conta_id: dom.conta_id,
      local: String(local).toLowerCase().trim(), nome: nome || local,
      tipo: tipo || 'caixa', destino: destino || '',
      cota_gb: planoPor(dom.plano_id).cota, usado_mb: 0,
      status: 'ativa', senha_inicial: senha || null,
      criado_em: iso(hoje()), ultimo_acesso: null,
    };
    db.caixas.push(caixa);
    if (caixa.tipo === 'caixa') sincronizarAssinatura(dominioId);
    salvar();
    log(tipo === 'caixa' ? 'Caixa criada' : 'Apelido criado', caixa.local + '@' + dom.dominio, 'ok');
    return { caixa };
  }

  function removerCaixa(id) {
    const c = q.caixaPorId(id);
    if (!c) return;
    const dom = q.dominioPorId(c.dominio_id);
    db.caixas = db.caixas.filter((x) => x.id !== id);
    if (c.tipo === 'caixa') sincronizarAssinatura(c.dominio_id);
    salvar();
    log('Endereço removido', c.local + '@' + (dom ? dom.dominio : ''), 'alerta');
  }

  /* quantidade de caixas reais define o valor da assinatura, com mínimo de 1 */
  function sincronizarAssinatura(dominioId) {
    const a = q.assinaturaDoDominio(dominioId);
    if (!a) return;
    const qtd = Math.max(1, q.caixasDoDominio(dominioId).filter((c) => c.tipo === 'caixa').length);
    a.qtd = qtd;
    a.valor_unit = precoUnit(a.plano_id, a.ciclo);
    a.valor_total = +(a.valor_unit * qtd).toFixed(2);
    a.valor_ciclo = +(totalCiclo(a.plano_id, a.ciclo) * qtd).toFixed(2);
    salvar();
  }

  function atualizar(colecao, id, campos) {
    const item = (db[colecao] || []).find((x) => x.id === id);
    if (item) { Object.assign(item, campos); salvar(); }
    return item;
  }

  function pagarFatura(id, metodo) {
    const f = db.faturas.find((x) => x.id === id);
    if (!f) return;
    f.status = 'paga'; f.pago_em = iso(hoje()); f.metodo = metodo || 'Pix';
    const a = db.assinaturas.find((x) => x.id === f.assinatura_id);
    if (a && a.status === 'inadimplente') {
      a.status = 'ativa';
      const dom = q.dominioPorId(a.dominio_id);
      if (dom && dom.status === 'suspenso') {
        dom.status = 'ativo';
        db.caixas.filter((c) => c.dominio_id === dom.id).forEach((c) => { c.status = 'ativa'; });
      }
    }
    salvar();
    log('Pagamento confirmado', 'Fatura ' + f.numero, 'ok');
  }

  /* ---------- métricas ---------- */
  function metricas() {
    const ativas = db.assinaturas.filter((a) => a.status === 'ativa' || a.status === 'inadimplente');
    /* MRR usa sempre o valor mensal equivalente, mesmo em ciclos longos */
    const mrr = ativas.reduce((s, a) => s + a.valor_total, 0);
    const custo = ativas.reduce((s, a) => s + planoPor(a.plano_id).custo * a.qtd, 0);
    const caixasAtivas = db.caixas.filter((c) => c.tipo === 'caixa' && c.status === 'ativa').length;
    const dominiosAtivos = db.dominios.filter((d) => d.status === 'ativo').length;
    const dominiosPendentes = db.dominios.filter((d) => d.status === 'pendente').length;
    const vencidas = db.faturas.filter((f) => f.status === 'vencida');
    const abertas = db.faturas.filter((f) => f.status === 'aberta');
    const recebido = db.faturas.filter((f) => f.status === 'paga').reduce((s, f) => s + f.valor, 0);

    /* série dos últimos 8 meses */
    const serie = [];
    for (let i = 7; i >= 0; i--) {
      const ref = addMeses(hoje(), -i);
      const ini = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
      const doMes = db.faturas.filter((f) => {
        const v = new Date(f.vencimento);
        return v >= ini && v <= fim && f.status === 'paga';
      });
      const caixasNoMes = db.caixas.filter((c) => c.tipo === 'caixa' && new Date(c.criado_em) <= fim).length;
      serie.push({
        rotulo: mesRotulo(ref),
        receita: +doMes.reduce((s, f) => s + f.valor, 0).toFixed(2),
        caixas: caixasNoMes,
      });
    }

    const porPlano = PLANOS.map((p) => ({
      nome: p.nome,
      caixas: db.caixas.filter((c) => {
        const d = q.dominioPorId(c.dominio_id);
        return c.tipo === 'caixa' && d && d.plano_id === p.id;
      }).length,
    }));

    return {
      mrr, custo, margem: mrr - custo,
      margemPct: mrr ? ((mrr - custo) / mrr) * 100 : 0,
      arr: mrr * 12,
      caixasAtivas, dominiosAtivos, dominiosPendentes,
      contas: q.contasAtivas().length,
      ticket: q.contasAtivas().length ? mrr / q.contasAtivas().length : 0,
      vencidas: vencidas.length, valorVencido: vencidas.reduce((s, f) => s + f.valor, 0),
      abertas: abertas.length, valorAberto: abertas.reduce((s, f) => s + f.valor, 0),
      inadimplenciaPct: mrr ? (vencidas.reduce((s, f) => s + f.valor, 0) / mrr) * 100 : 0,
      recebido, serie, porPlano,
      chamadosAbertos: db.chamados.filter((c) => c.status === 'aberto').length,
    };
  }

  /* ---------- sessão e tema ---------- */
  const sessao = {
    salvar: (userId) => localStorage.setItem(KEY_SESSAO, userId),
    ler: () => localStorage.getItem(KEY_SESSAO),
    limpar: () => localStorage.removeItem(KEY_SESSAO),
  };
  const tema = {
    ler: () => localStorage.getItem(KEY_TEMA) || 'light',
    salvar: (t) => localStorage.setItem(KEY_TEMA, t),
  };

  carregar();

  return {
    get db() { return db; },
    PLANOS, CICLOS, planoPor, cicloPor, mesesDe, precoUnit, totalCiclo, economiaCiclo, descontoPct,
    q, log, criarConta, criarDominio, criarCaixa, removerCaixa,
    sincronizarAssinatura, atualizar, pagarFatura, metricas,
    salvar, resetar, sessao, tema, hashSenha,
    uid, money, num, pct, fdate, fdatetime, desde, gb, addMeses, addDias, mesRotulo,
    corDe, iniciais,
  };
})();
