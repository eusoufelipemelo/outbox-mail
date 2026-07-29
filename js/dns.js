/* ============================================================
   OutBox Mail — DNS e configuração de servidores
   Gera os registros que o cliente precisa publicar e verifica
   o que está publicado de verdade, via DNS over HTTPS (Google).
   Trocar HOSTS ao mudar de provedor de e-mail.
   ============================================================ */
window.DNS = (function () {
  /* Hosts do serviço. Ao contratar o provedor real, troque aqui. */
  const HOSTS = {
    mx1: 'mx1.outboxmail.com.br',
    mx2: 'mx2.outboxmail.com.br',
    spf: '_spf.outboxmail.com.br',
    imap: 'imap.outboxmail.com.br',
    pop: 'pop.outboxmail.com.br',
    smtp: 'smtp.outboxmail.com.br',
    webmail: 'https://webmail.outboxmail.com.br',
    autodiscover: 'autodiscover.outboxmail.com.br',
    selector: 'obmail',
  };

  const SERVIDORES = [
    { nome: 'Entrada (IMAP)', host: HOSTS.imap, porta: '993', seg: 'SSL/TLS', obs: 'Recomendado, mantém tudo sincronizado' },
    { nome: 'Entrada (POP3)', host: HOSTS.pop, porta: '995', seg: 'SSL/TLS', obs: 'Baixa as mensagens para o aparelho' },
    { nome: 'Saída (SMTP)', host: HOSTS.smtp, porta: '587', seg: 'STARTTLS', obs: 'Exige autenticação com e-mail e senha' },
    { nome: 'Saída alternativa', host: HOSTS.smtp, porta: '465', seg: 'SSL/TLS', obs: 'Use se a porta 587 estiver bloqueada' },
  ];

  /* chave pública DKIM de exibição, determinística por domínio */
  function chaveDkim(dominio) {
    let h = 0;
    for (let i = 0; i < dominio.length; i++) h = (h * 31 + dominio.charCodeAt(i)) >>> 0;
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let s = '';
    let x = h;
    for (let i = 0; i < 216; i++) {
      x = (x * 1103515245 + 12345) >>> 0;
      s += abc[x % abc.length];
    }
    return 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC' + s;
  }

  /* Registros que o cliente precisa publicar */
  function registros(dominio) {
    const d = String(dominio || '').toLowerCase();
    return [
      {
        chave: 'mx', tipo: 'MX', nome: '@', prioridade: 10, valor: HOSTS.mx1,
        titulo: 'Registro MX principal',
        desc: 'Diz para a internet que as mensagens do seu domínio chegam nos nossos servidores.',
      },
      {
        chave: 'mx2', tipo: 'MX', nome: '@', prioridade: 20, valor: HOSTS.mx2,
        titulo: 'Registro MX secundário',
        desc: 'Recebe as mensagens caso o servidor principal esteja em manutenção.',
        opcional: false,
      },
      {
        chave: 'spf', tipo: 'TXT', nome: '@', valor: `v=spf1 include:${HOSTS.spf} ~all`,
        titulo: 'SPF',
        desc: 'Autoriza os nossos servidores a enviar em nome do seu domínio. Sem ele, muita coisa cai em spam.',
      },
      {
        chave: 'dkim', tipo: 'TXT', nome: `${HOSTS.selector}._domainkey`,
        valor: `v=DKIM1; k=rsa; p=${chaveDkim(d)}`,
        titulo: 'DKIM',
        desc: 'Assina digitalmente cada mensagem enviada, provando que ela não foi adulterada no caminho.',
      },
      {
        chave: 'dmarc', tipo: 'TXT', nome: '_dmarc',
        valor: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${d}; pct=100; adkim=r; aspf=r`,
        titulo: 'DMARC',
        desc: 'Define o que fazer com quem tentar falsificar o seu domínio. Exigido pelo Gmail e pelo Outlook.',
      },
      {
        chave: 'autodiscover', tipo: 'CNAME', nome: 'autodiscover', valor: HOSTS.autodiscover,
        titulo: 'Autodiscover',
        desc: 'Faz o Outlook e o celular se configurarem sozinhos, só com e-mail e senha.',
        opcional: true,
      },
    ];
  }

  /* ---------- consulta real por DNS over HTTPS ---------- */
  async function consultar(dominio, tipo) {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(dominio)}&type=${tipo}`;
    const r = await fetch(url, { headers: { Accept: 'application/dns-json' } });
    if (!r.ok) throw new Error('Falha na consulta DNS');
    const j = await r.json();
    return (j.Answer || []).map((a) => String(a.data).replace(/^"|"$/g, '').replace(/" "/g, ''));
  }

  /*
    Verifica o que está publicado e compara com o esperado.
    Retorna { modo: 'real'|'simulado', itens: {chave: {ok, encontrado[]}} }
  */
  async function verificar(dominio, estadoSimulado) {
    const d = String(dominio || '').toLowerCase();
    const itens = {};
    try {
      const [mx, txtRaiz, dkim, dmarc, auto] = await Promise.all([
        consultar(d, 'MX').catch(() => []),
        consultar(d, 'TXT').catch(() => []),
        consultar(`${HOSTS.selector}._domainkey.${d}`, 'TXT').catch(() => []),
        consultar(`_dmarc.${d}`, 'TXT').catch(() => []),
        consultar(`autodiscover.${d}`, 'CNAME').catch(() => []),
      ]);

      const contem = (lista, alvo) => lista.some((v) => v.toLowerCase().includes(alvo.toLowerCase()));

      itens.mx = { ok: contem(mx, HOSTS.mx1), encontrado: mx };
      itens.mx2 = { ok: contem(mx, HOSTS.mx2), encontrado: mx };
      const spfs = txtRaiz.filter((v) => v.toLowerCase().startsWith('v=spf1'));
      itens.spf = { ok: contem(spfs, HOSTS.spf), encontrado: spfs };
      itens.dkim = { ok: contem(dkim, 'v=dkim1'), encontrado: dkim };
      itens.dmarc = { ok: contem(dmarc, 'v=dmarc1'), encontrado: dmarc };
      itens.autodiscover = { ok: contem(auto, HOSTS.autodiscover), encontrado: auto };

      return { modo: 'real', itens };
    } catch (e) {
      /* sem rede: cai para o estado guardado no sistema */
      const s = estadoSimulado || {};
      ['mx', 'mx2', 'spf', 'dkim', 'dmarc', 'autodiscover'].forEach((k) => {
        const base = k === 'mx2' ? s.mx : s[k];
        itens[k] = { ok: !!base, encontrado: [] };
      });
      return { modo: 'simulado', itens };
    }
  }

  /* progresso de propagação, 0 a 100 */
  function progresso(dns) {
    const obrigatorios = ['mx', 'spf', 'dkim', 'dmarc'];
    const ok = obrigatorios.filter((k) => dns && dns[k]).length;
    return Math.round((ok / obrigatorios.length) * 100);
  }

  /* ---------- tutoriais de configuração ---------- */
  const TUTORIAIS = [
    {
      id: 'webmail', nome: 'Webmail', ico: 'globe',
      passos: [
        `Acesse <strong>${HOSTS.webmail}</strong> pelo navegador.`,
        'Informe o endereço completo, por exemplo contato@suaempresa.com.br.',
        'Digite a senha criada no painel e entre.',
        'Na primeira visita, revise a assinatura e o fuso horário nas preferências.',
      ],
    },
    {
      id: 'iphone', nome: 'iPhone e iPad', ico: 'smartphone',
      passos: [
        'Abra <strong>Ajustes</strong>, toque em <strong>Apps</strong> e depois em <strong>Mail</strong>.',
        'Toque em <strong>Contas</strong>, <strong>Adicionar conta</strong> e escolha <strong>Outra</strong>.',
        'Selecione <strong>Adicionar conta do Mail</strong> e preencha nome, e-mail e senha.',
        `Escolha <strong>IMAP</strong>. Servidor de entrada: <strong>${HOSTS.imap}</strong>. Servidor de saída: <strong>${HOSTS.smtp}</strong>.`,
        'No servidor de saída, informe o mesmo usuário e a mesma senha. Ele não é opcional.',
        'Toque em Avançar e aguarde a verificação.',
      ],
    },
    {
      id: 'android', nome: 'Android', ico: 'smartphone',
      passos: [
        'Abra o aplicativo <strong>Gmail</strong> e toque na sua foto, depois em <strong>Adicionar outra conta</strong>.',
        'Escolha <strong>Outro</strong> e digite o endereço completo.',
        'Escolha <strong>Pessoal (IMAP)</strong> e informe a senha.',
        `Entrada: <strong>${HOSTS.imap}</strong>, porta <strong>993</strong>, SSL/TLS.`,
        `Saída: <strong>${HOSTS.smtp}</strong>, porta <strong>587</strong>, STARTTLS, com autenticação.`,
        'Conclua e defina a frequência de sincronização.',
      ],
    },
    {
      id: 'outlook', nome: 'Outlook (Windows)', ico: 'monitor',
      passos: [
        'Abra o Outlook e vá em <strong>Arquivo</strong>, <strong>Adicionar conta</strong>.',
        'Digite o endereço completo e clique em <strong>Opções avançadas</strong>.',
        'Marque <strong>Permitir configuração manual</strong> e escolha <strong>IMAP</strong>.',
        `Entrada: <strong>${HOSTS.imap}</strong>, porta 993, SSL. Saída: <strong>${HOSTS.smtp}</strong>, porta 587, STARTTLS.`,
        'Informe a senha e conclua. Se o autodiscover estiver publicado, o Outlook preenche tudo sozinho.',
      ],
    },
    {
      id: 'thunderbird', nome: 'Thunderbird', ico: 'monitor',
      passos: [
        'Vá em <strong>Configurações da conta</strong>, <strong>Ações da conta</strong>, <strong>Adicionar conta de e-mail</strong>.',
        'Preencha nome, endereço e senha e clique em <strong>Configuração manual</strong>.',
        `Entrada IMAP: <strong>${HOSTS.imap}</strong>, 993, SSL/TLS, senha normal.`,
        `Saída SMTP: <strong>${HOSTS.smtp}</strong>, 587, STARTTLS, senha normal.`,
        'Clique em Concluir.',
      ],
    },
  ];

  return { HOSTS, SERVIDORES, registros, consultar, verificar, progresso, chaveDkim, TUTORIAIS };
})();
