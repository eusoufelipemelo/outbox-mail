/* ============================================================
   OutBox Mail — Roteador e casca do painel
   ============================================================ */
window.App = (function () {
  const E = UI.esc;
  const root = () => document.getElementById('root');

  /* ============================================================
     CASCA DO PAINEL (cliente e admin)
     ============================================================ */
  function shell({ itens, titulo, sub, conteudo, voltar, acoes }) {
    const u = Auth.atual();
    const admin = u && u.papel === 'admin';
    return `<div class="app">
      <div class="drawer-backdrop" id="drawer-bd"></div>
      <aside class="sidebar" id="sidebar" aria-label="Menu do painel">
        <div class="sidebar-head">
          <a class="logo" href="#/">
            <img data-logo src="assets/logo-preta.svg" alt="OutBox">
            <span class="logo-sep" aria-hidden="true"></span>
            <span class="logo-name">Mail</span>
          </a>
          ${admin ? '<span class="badge badge-brand mt-16">Administração</span>' : ''}
        </div>

        <nav class="sidebar-nav">
          ${itens.map((i) => i.sec
            ? `<div class="nav-sec">${E(i.sec)}</div>`
            : `<a class="nav-item ${i.ativo ? 'active' : ''}" href="${i.rota}">
                 ${ico(i.ico)}<span>${E(i.nome)}</span>
                 ${i.count ? `<span class="count">${i.count}</span>` : ''}
               </a>`).join('')}
        </nav>

        <div class="sidebar-foot">
          <a class="nav-item" href="#/">${ico('external')}<span>Ver o site</span></a>
          <button class="nav-item" id="b-sair-menu" style="width:100%;text-align:left">${ico('logout')}<span>Sair</span></button>
        </div>
      </aside>

      <div class="app-main">
        ${!admin && Auth.ehImpersonando() ? `<div class="impersonate-bar">
          <span>${ico('eye')} Você está vendo o painel de <strong>${E(Auth.conta() ? Auth.conta().empresa : 'um cliente')}</strong> como administrador.</span>
          <button class="btn btn-sm" id="b-voltar-admin" style="background:#fff;color:var(--brand)">Voltar ao admin</button>
        </div>` : ''}
        <header class="app-header">
          <div class="row" style="gap:10px;min-width:0">
            <button class="btn-icon sidebar-toggle" id="sb-toggle" aria-label="Abrir menu" aria-expanded="false">${ico('menu')}</button>
            ${voltar ? `<a class="btn-icon" href="${voltar}" aria-label="Voltar">${ico('arrowLeft')}</a>` : ''}
            <div style="min-width:0">
              <div class="t-strong truncate">${voltar ? E(titulo) : (admin ? 'Administração' : E(Auth.conta() ? Auth.conta().empresa : 'Meu painel'))}</div>
              <div class="xs muted truncate">${voltar ? E(sub || '') : 'OutBox Mail'}</div>
            </div>
          </div>
          <div class="row" style="gap:6px">
            ${acoes || ''}
            <button class="btn-icon" data-tema-ico aria-label="Alternar tema claro e escuro"></button>
            <a class="user-chip" href="${admin ? '#/admin' : '#/app/config'}">
              <span class="avatar" style="background:${OB.corDe(u ? u.nome : '?')}">${OB.iniciais(u ? u.nome : '?')}</span>
              <span class="hidden-sm">
                <span class="nm" style="display:block">${E(u ? u.nome.split(' ')[0] : '')}</span>
                <span class="rl">${admin ? 'Administrador' : (Auth.conta() ? E(Auth.conta().empresa) : 'Cliente')}</span>
              </span>
            </a>
          </div>
        </header>

        <main class="app-body fade-in" id="conteudo">
          <div class="page-head">
            <h1>${E(titulo)}</h1>
            ${sub ? `<p>${E(sub)}</p>` : ''}
          </div>
          ${conteudo}
        </main>
      </div>
    </div>`;
  }

  /* ============================================================
     ROTEADOR
     ============================================================ */
  function parseRota() {
    const bruto = (location.hash || '#/').slice(1);
    const [caminho, query] = bruto.split('?');
    const partes = caminho.split('/').filter(Boolean);
    const params = {};
    if (query) {
      query.split('&').forEach((par) => {
        const [k, v] = par.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { partes, params, caminho };
  }

  const TITULOS = {
    '': 'OutBox Mail | E-mail profissional com o seu domínio',
    planos: 'Planos e preços | OutBox Mail',
    recursos: 'Recursos | OutBox Mail',
    migracao: 'Migração gratuita | OutBox Mail',
    ajuda: 'Central de ajuda | OutBox Mail',
    contratar: 'Contratar | OutBox Mail',
    entrar: 'Entrar | OutBox Mail',
    app: 'Meu painel | OutBox Mail',
    admin: 'Administração | OutBox Mail',
  };

  function rotear() {
    const { partes, params } = parseRota();
    const secao = partes[0] || '';
    const sub = partes[1] || '';
    const u = Auth.atual();
    Graficos.destruir();

    document.title = TITULOS[secao] || 'OutBox Mail';

    let html = '';
    let depois = null;

    /* ---------- área do cliente ---------- */
    if (secao === 'app') {
      if (!u) { location.hash = '#/entrar'; return; }
      if (u.papel === 'admin') { location.hash = '#/admin'; return; }
      const mapa = {
        '': Cliente.painel, dominios: Cliente.dominios, caixas: Cliente.caixas,
        faturas: Cliente.faturas, plano: Cliente.plano, ajuda: Cliente.ajuda, config: Cliente.config,
      };
      if (sub === 'dominio') html = Cliente.dominio(partes[2]);
      else html = (mapa[sub] || Cliente.painel)();
      depois = () => { ligarShell(); Cliente.ligar(sub); };

    /* ---------- administração ---------- */
    } else if (secao === 'admin') {
      if (!u) { location.hash = '#/entrar'; return; }
      if (u.papel !== 'admin') { location.hash = '#/app'; return; }
      const mapa = {
        '': Admin.dash, clientes: Admin.clientes, dominios: Admin.dominios, caixas: Admin.caixas,
        financeiro: Admin.financeiro, planos: Admin.planos, cupons: Admin.cupons,
        chamados: Admin.chamados, logs: Admin.logs,
      };
      html = (mapa[sub] || Admin.dash)();
      depois = () => { ligarShell(); Admin.ligar(); };

    /* ---------- autenticação ---------- */
    } else if (secao === 'entrar') {
      if (u) { location.hash = u.papel === 'admin' ? '#/admin' : '#/app'; return; }
      html = Auth.telaLogin();
      depois = Auth.ligarLogin;

    } else if (secao === 'recuperar') {
      html = Auth.telaRecuperar();
      depois = Auth.ligarRecuperar;

    /* ---------- site público ---------- */
    } else if (secao === 'contratar') {
      html = Site.checkout(params);
      depois = () => { Site.ligarHeader(); Site.ligarCheckout(); };

    } else if (secao === 'planos') {
      html = Site.planos();
      depois = () => { Site.ligarHeader(); Site.ligarCiclo(); };

    } else if (secao === 'recursos') {
      html = Site.recursos();
      depois = Site.ligarHeader;

    } else if (secao === 'migracao') {
      html = Site.migracao();
      depois = Site.ligarHeader;

    } else if (secao === 'ajuda') {
      html = Site.ajuda();
      depois = () => { Site.ligarHeader(); Site.ligarAjuda(); };

    } else if (secao === 'termos' || secao === 'privacidade') {
      html = Site.juridico(secao);
      depois = Site.ligarHeader;

    } else {
      html = Site.home();
      depois = () => { Site.ligarHeader(); Site.ligarCiclo(); Site.ligarVolume(); };
    }

    root().innerHTML = html;
    UI.aplicarTema(OB.tema.ler());
    if (depois) depois();
  }

  function ligarShell() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('drawer-bd');
    const tg = document.getElementById('sb-toggle');
    if (tg && sb && bd) {
      const fechar = () => {
        sb.classList.remove('open');
        bd.classList.remove('show');
        tg.setAttribute('aria-expanded', 'false');
      };
      tg.addEventListener('click', () => {
        const aberto = sb.classList.toggle('open');
        bd.classList.toggle('show', aberto);
        tg.setAttribute('aria-expanded', aberto);
      });
      bd.addEventListener('click', fechar);
      sb.querySelectorAll('a').forEach((a) => a.addEventListener('click', fechar));
    }
    const bs = document.getElementById('b-sair-menu');
    if (bs) bs.addEventListener('click', () => Auth.sair());
    const bva = document.getElementById('b-voltar-admin');
    if (bva) bva.addEventListener('click', () => Auth.voltarAoAdmin());
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  function iniciar() {
    UI.aplicarTema(OB.tema.ler());
    Auth.restaurar();

    /*
      Entrada dedicada dos clientes: mail.outboxgroup.com.br/emails
      Quem chega por esse caminho, sem uma rota específica, vai direto
      para o login (ou para o painel, se já estiver logado).
      A leitura é do pathname do navegador, então funciona mesmo que o
      EasyPanel remova o prefixo /emails ao encaminhar para o container.
    */
    const entradaClientes = /\/emails\/?$/.test(location.pathname);
    const semRota = !location.hash || location.hash === '#' || location.hash === '#/';
    if (entradaClientes && semRota) {
      const u = Auth.atual();
      location.hash = u ? (u.papel === 'admin' ? '#/admin' : '#/app') : '#/entrar';
    }

    window.addEventListener('hashchange', () => {
      UI.fecharModal();
      rotear();
      /* leva ao topo em troca de página, exceto âncoras internas */
      if (!location.hash.includes('#/app/dominio')) window.scrollTo({ top: 0 });
    });

    /* alternância de tema em qualquer botão marcado */
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-tema-ico]')) UI.alternarTema();
    });

    /* atalho de administração: recriar a base de demonstração */
    window.OutBoxMailReset = () => {
      OB.resetar();
      UI.toast('info', 'Base recriada', 'Os dados de demonstração foram restaurados.');
      rotear();
    };

    rotear();
  }

  /* publica a API antes de iniciar: shell() é chamado por Cliente e Admin
     ainda durante a primeira rota, quando o IIFE não retornou */
  const api = { shell, rotear, iniciar };
  window.App = api;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  return api;
})();
