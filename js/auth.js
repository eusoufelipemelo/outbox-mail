/* ============================================================
   OutBox Mail — Autenticação
   Sessão local. Em produção, trocar por Supabase Auth
   (ver supabase/schema.sql e README).
   ============================================================ */
window.Auth = (function () {
  let usuario = null;
  const nuvem = () => (window.Supa && Supa.ativo);

  /* Restaura a sessão no boot. Em nuvem, valida com o Supabase e
     hidrata o cache; em demo, lê a sessão local. É assíncrona. */
  async function restaurar() {
    if (nuvem()) {
      try {
        const sess = await Supa.sessao();
        if (sess) {
          usuario = await Supa.perfil(sess.user.id);
          if (usuario) await Supa.hidratar();
        } else { usuario = null; }
      } catch (e) { console.warn('Falha ao restaurar sessão', e); usuario = null; }
      return usuario;
    }
    const id = OB.sessao.ler();
    usuario = id ? (OB.q.usuarioPorId(id) || null) : null;
    return usuario;
  }
  const atual = () => usuario;
  const ehAdmin = () => !!usuario && usuario.papel === 'admin';
  const nivel = () => (usuario && usuario.nivel) || (ehAdmin() ? 'gestor' : null);
  const ehMaster = () => nivel() === 'master';
  const conta = () => (usuario && usuario.conta_id ? OB.q.contaPorId(usuario.conta_id) : null);

  async function entrar(email, senha) {
    if (nuvem()) {
      const r = await Supa.entrar(email, senha);
      if (r.erro) return { erro: r.erro };
      usuario = r.perfil;
      await Supa.hidratar();
      OB.log('Acesso ao painel', usuario.email, 'info', usuario.nome);
      return { usuario };
    }
    const u = OB.q.usuarioPorEmail(email);
    if (!u) return { erro: 'Não encontramos uma conta com esse e-mail.' };
    const hash = await OB.hashSenha(senha);
    /* aceita hash (padrão novo) e, por retrocompatibilidade, texto puro antigo */
    if (u.senha !== hash && u.senha !== senha) {
      return { erro: 'Senha incorreta. Verifique e tente novamente.' };
    }
    if (!u.ativo) return { erro: 'Esta conta está desativada. Fale com o suporte.' };
    usuario = u;
    OB.sessao.salvar(u.id);
    OB.log('Acesso ao painel', u.email, 'info', u.nome);
    return { usuario: u };
  }

  function sair() {
    usuario = null;
    OB.sessao.limpar();
    localStorage.removeItem('obmail_admin_origem');
    if (nuvem()) { Supa.sair().finally(() => { location.hash = '#/'; location.reload(); }); return; }
    location.hash = '#/';
  }

  /* admin visualizando o painel de um cliente, com retorno */
  function verComoCliente(contaId) {
    const cliente = OB.q.usuarioDaConta(contaId);
    if (!cliente || !usuario || usuario.papel !== 'admin') return false;
    localStorage.setItem('obmail_admin_origem', usuario.id);
    usuario = cliente;
    OB.sessao.salvar(cliente.id);
    return true;
  }
  const ehImpersonando = () => !!localStorage.getItem('obmail_admin_origem');
  function voltarAoAdmin() {
    const id = localStorage.getItem('obmail_admin_origem');
    localStorage.removeItem('obmail_admin_origem');
    const a = id ? OB.q.usuarioPorId(id) : null;
    if (a) { usuario = a; OB.sessao.salvar(a.id); }
    location.hash = '#/admin/clientes';
  }

  /* ---------- telas ---------- */
  const cabecalho = (titulo, sub) => `
    <a class="auth-logo" href="#/" aria-label="OutBox Mail, início">
      <img data-logo src="assets/logo-preta.svg" alt="OutBox" style="height:28px">
    </a>
    <div class="center mb-24">
      <h1 style="font-size:1.6rem">${titulo}</h1>
      <p class="soft small mt-8" style="margin-inline:auto">${sub}</p>
    </div>`;

  function telaLogin() {
    return `<div class="auth-page fade-in"><div class="auth-card">
      ${cabecalho('Entrar no painel', 'Gerencie os e-mails da sua empresa em um lugar só.')}
      <div class="card">
        <form id="f-login" class="col" style="gap:16px" novalidate>
          <div class="field">
            <label for="l-email">E-mail</label>
            <input type="email" id="l-email" class="input" placeholder="voce@suaempresa.com.br" autocomplete="username" required>
          </div>
          <div class="field">
            <div class="row-between" style="gap:8px">
              <label for="l-senha">Senha</label>
              <a href="#/recuperar" class="small" style="color:var(--brand);font-weight:600">Esqueci a senha</a>
            </div>
            ${UI.campoSenha('l-senha')}
          </div>
          <div id="l-erro" class="field-error hidden" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Entrar</button>
        </form>

        ${(window.Supa && Supa.ativo) ? '' : `
        <div class="divider mt-24 mb-16">acesso de demonstração</div>
        <div class="demo-box">
          <strong>Contas de demonstração</strong>
          Administrador: <code>admin@outboxgroup.com.br</code> / <code>admin123</code><br>
          Cliente: <code>marcos@belluccimoveis.com.br</code> / <code>cliente123</code>
          <div class="row" style="gap:8px;margin-top:12px">
            <button class="btn btn-sm btn-ghost" data-demo="admin">Entrar como admin</button>
            <button class="btn btn-sm btn-ghost" data-demo="cliente">Entrar como cliente</button>
          </div>
          <p class="xs" style="margin-top:10px;opacity:.85">O seu acesso de administrador é o <code>felipe@outboxgroup.com.br</code> com a senha que você definiu. Pelo painel de admin, em Clientes, você abre o painel de qualquer cliente para ver o lado deles.</p>
        </div>`}
      </div>
      <p class="center small soft mt-24">Ainda não tem conta?
        <a href="#/contratar" style="color:var(--brand);font-weight:600">Contratar o OutBox Mail</a>
      </p>
    </div></div>`;
  }

  function ligarLogin() {
    const f = document.getElementById('f-login');
    if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('l-email').value.trim();
      const senha = document.getElementById('l-senha').value;
      const erro = document.getElementById('l-erro');
      erro.classList.add('hidden');

      if (!UI.emailValido(email)) return mostrarErro(erro, 'Informe um e-mail válido.');
      if (!senha) return mostrarErro(erro, 'Digite a sua senha.');

      const btn = f.querySelector('button[type="submit"]');
      const parar = UI.carregando(btn, 'Entrando');
      setTimeout(async () => {
        const r = await entrar(email, senha);
        parar();
        if (r.erro) return mostrarErro(erro, r.erro);
        UI.toast('ok', 'Bem-vindo de volta', r.usuario.nome.split(' ')[0] + ', tudo pronto.');
        location.hash = r.usuario.papel === 'admin' ? '#/admin' : '#/app';
      }, 420);
    });

    document.querySelectorAll('[data-demo]').forEach((b) => {
      b.addEventListener('click', () => {
        const admin = b.getAttribute('data-demo') === 'admin';
        document.getElementById('l-email').value = admin ? 'admin@outboxgroup.com.br' : 'marcos@belluccimoveis.com.br';
        document.getElementById('l-senha').value = admin ? 'admin123' : 'cliente123';
        f.requestSubmit();
      });
    });
  }

  function mostrarErro(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function telaRecuperar() {
    if (window.Supa && Supa.ativo) {
      return `<div class="auth-page fade-in"><div class="auth-card">
        ${cabecalho('Recuperar acesso', 'Vamos te enviar um link de redefinição por e-mail.')}
        <div class="card">
          <form id="f-rec" class="col" style="gap:16px" novalidate>
            <div class="field">
              <label for="r-email">E-mail cadastrado</label>
              <input type="email" id="r-email" class="input" placeholder="voce@suaempresa.com.br" required>
            </div>
            <div id="r-erro" class="field-error hidden" role="alert"></div>
            <button type="submit" class="btn btn-primary btn-block">Enviar link de redefinição</button>
            <a href="#/entrar" class="btn btn-ghost btn-block">Voltar para o login</a>
          </form>
          <p class="xs muted mt-16">Se não chegar em alguns minutos, verifique o spam ou fale com o nosso suporte.</p>
        </div>
      </div></div>`;
    }
    return `<div class="auth-page fade-in"><div class="auth-card">
      ${cabecalho('Recuperar acesso', 'Enviamos um código de verificação para o seu e-mail de contato.')}
      <div class="card">
        <form id="f-rec" class="col" style="gap:16px" novalidate>
          <div class="field">
            <label for="r-email">E-mail cadastrado</label>
            <input type="email" id="r-email" class="input" placeholder="voce@suaempresa.com.br" required>
          </div>
          <div id="r-erro" class="field-error hidden" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-block">Enviar código</button>
          <a href="#/entrar" class="btn btn-ghost btn-block">Voltar para o login</a>
        </form>
      </div>
    </div></div>`;
  }

  function ligarRecuperar() {
    const f = document.getElementById('f-rec');
    if (!f) return;

    /* modo nuvem: usa o e-mail de redefinição do Supabase Auth */
    if (window.Supa && Supa.ativo) {
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('r-email').value.trim().toLowerCase();
        const erro = document.getElementById('r-erro');
        erro.classList.add('hidden');
        if (!UI.emailValido(email)) return mostrarErro(erro, 'Informe um e-mail válido.');
        const btn = f.querySelector('button[type="submit"]');
        const parar = UI.carregando(btn, 'Enviando');
        try {
          await Supa.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/emails' });
        } catch (err) { /* não revela se o e-mail existe */ }
        parar();
        UI.toast('ok', 'Verifique seu e-mail', 'Se houver uma conta com esse endereço, enviamos o link de redefinição.');
        location.hash = '#/entrar';
      });
      return;
    }
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('r-email').value.trim();
      const erro = document.getElementById('r-erro');
      erro.classList.add('hidden');
      if (!UI.emailValido(email)) return mostrarErro(erro, 'Informe um e-mail válido.');
      const u = OB.q.usuarioPorEmail(email);
      if (!u) return mostrarErro(erro, 'Não encontramos uma conta com esse e-mail.');

      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      UI.modal({
        titulo: 'Código de verificação',
        sub: 'Nesta demonstração o código aparece na tela. Em produção ele vai por e-mail.',
        corpo: `<div class="demo-box center"><strong>Seu código</strong>
            <div style="font-size:2rem;font-weight:800;letter-spacing:.3em;font-family:var(--mono)">${codigo}</div>
          </div>
          <div class="field">
            <label for="rc">Digite o código</label>
            <input id="rc" class="input" inputmode="numeric" maxlength="6" placeholder="000000">
          </div>
          <div class="field">
            <label for="rs">Nova senha</label>
            ${UI.campoSenha('rs', 'Mínimo de 8 caracteres', 'new-password')}
          </div>`,
        acoes: `<button class="btn btn-ghost" data-fechar>Cancelar</button>
                <button class="btn btn-primary" id="rc-ok">Redefinir senha</button>`,
        aoAbrir: (bd) => {
          bd.querySelector('#rc-ok').addEventListener('click', async () => {
            const c = bd.querySelector('#rc').value.trim();
            const s = bd.querySelector('#rs').value;
            if (c !== codigo) return UI.toast('err', 'Código incorreto', 'Confira os seis dígitos e tente de novo.');
            if (s.length < 8) return UI.toast('err', 'Senha curta', 'Use no mínimo 8 caracteres.');
            OB.atualizar('usuarios', u.id, { senha: await OB.hashSenha(s) });
            UI.fecharModal();
            UI.toast('ok', 'Senha redefinida', 'Já pode entrar com a nova senha.');
            location.hash = '#/entrar';
          });
        },
      });
    });
  }

  return { restaurar, atual, ehAdmin, nivel, ehMaster, conta, entrar, sair, verComoCliente, ehImpersonando, voltarAoAdmin, telaLogin, ligarLogin, telaRecuperar, ligarRecuperar };
})();
