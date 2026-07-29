/* ============================================================
   OutBox Mail — Vitrine de vendas e checkout
   OutBox Soluções Digitais
   ============================================================ */
window.Site = (function () {
  const E = UI.esc;
  const WPP = '5514991234567';
  const wppLink = (msg) => `https://wa.me/${WPP}?text=${encodeURIComponent(msg || 'Olá! Quero contratar o OutBox Mail.')}`;

  let ciclo = 'mensal';

  /* ============================================================
     CABEÇALHO E RODAPÉ
     ============================================================ */
  function cabecalho(ativo) {
    const u = Auth.atual();
    return `<header class="site-header">
      <div class="wrap">
        <a class="logo" href="#/" aria-label="OutBox Mail, página inicial">
          <img data-logo src="assets/logo-preta.svg" alt="OutBox">
          <span class="logo-sep" aria-hidden="true"></span>
          <span class="logo-name">Mail</span>
        </a>

        <nav class="site-nav" id="nav-principal" aria-label="Navegação principal">
          <a href="#/" class="${ativo === 'home' ? 'active' : ''}">Início</a>
          <a href="#/recursos" class="${ativo === 'recursos' ? 'active' : ''}">Recursos</a>
          <a href="#/planos" class="${ativo === 'planos' ? 'active' : ''}">Planos</a>
          <a href="#/migracao" class="${ativo === 'migracao' ? 'active' : ''}">Migração</a>
          <a href="#/ajuda" class="${ativo === 'ajuda' ? 'active' : ''}">Ajuda</a>
        </nav>

        <div class="header-actions">
          <button class="btn-icon" data-tema-ico aria-label="Alternar tema claro e escuro"></button>
          ${u
            ? `<a class="btn btn-primary btn-sm" href="${u.papel === 'admin' ? '#/admin' : '#/app'}">Meu painel</a>`
            : `<a class="btn btn-ghost btn-sm" href="#/entrar">Entrar</a>
               <a class="btn btn-primary btn-sm" href="#/contratar">Contratar</a>`}
          <button class="btn-icon nav-toggle" id="nav-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="nav-principal">${ico('menu')}</button>
        </div>
      </div>
    </header>`;
  }

  function rodape() {
    return `<footer class="site-footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <a class="logo mb-16" href="#/">
              <img data-logo src="assets/logo-preta.svg" alt="OutBox">
              <span class="logo-sep" aria-hidden="true"></span>
              <span class="logo-name">Mail</span>
            </a>
            <p class="small soft" style="max-width:32ch">E-mail profissional com o seu domínio, feito e atendido por gente que fala a sua língua.</p>
            <a class="btn btn-sm btn-ghost mt-16" href="${wppLink()}" target="_blank" rel="noopener">
              ${ico('whatsapp')} Falar no WhatsApp
            </a>
          </div>
          <div>
            <h4>Produto</h4>
            <ul>
              <li><a href="#/recursos">Recursos</a></li>
              <li><a href="#/planos">Planos e preços</a></li>
              <li><a href="#/migracao">Migração gratuita</a></li>
              <li><a href="#/contratar">Contratar agora</a></li>
            </ul>
          </div>
          <div>
            <h4>Suporte</h4>
            <ul>
              <li><a href="#/ajuda">Central de ajuda</a></li>
              <li><a href="#/ajuda">Configurar no celular</a></li>
              <li><a href="#/ajuda">Configurar no Outlook</a></li>
              <li><a href="#/entrar">Acessar o painel</a></li>
            </ul>
          </div>
          <div>
            <h4>Empresa</h4>
            <ul>
              <li><a href="https://www.outboxgroup.com.br" target="_blank" rel="noopener">OutBox Soluções Digitais</a></li>
              <li><a href="#/termos">Termos de uso</a></li>
              <li><a href="#/privacidade">Política de privacidade</a></li>
              <li><a href="#/termos">Política de uso aceitável</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} OutBox Mail. Um serviço da OutBox Soluções Digitais.</span>
          <span>Desenvolvido por: <a href="https://www.outboxgroup.com.br" target="_blank" rel="noopener">OutBox Group</a></span>
        </div>
      </div>
    </footer>`;
  }

  const pagina = (conteudo, ativo) => `<div class="page">${cabecalho(ativo)}<main id="conteudo" class="grow">${conteudo}</main>${rodape()}</div>`;

  /* ============================================================
     BLOCOS REUTILIZÁVEIS
     ============================================================ */
  function blocoPlanos({ compacto } = {}) {
    return `
      <div class="center" style="display:flex;flex-direction:column;align-items:center;gap:18px;margin-bottom:38px">
        ${compacto ? '' : `<span class="eyebrow">${ico('tag')} Planos e preços</span>
        <h2>Escolha pelo espaço que a sua equipe precisa</h2>
        <p class="lead" style="max-width:56ch">O preço é por caixa de e-mail, sem taxa de instalação e sem fidelidade. Você paga só pelo que usar e muda de plano quando quiser.</p>`}
        <div class="seg" role="group" aria-label="Ciclo de cobrança">
          ${OB.CICLOS.map((c) => {
            const off = OB.descontoPct('essencial', c.id);
            return `<button data-ciclo="${c.id}" aria-pressed="${ciclo === c.id}">${E(c.nome)}${off ? ` <span class="save-pill" style="margin-left:6px">−${off}%</span>` : ''}</button>`;
          }).join('')}
        </div>
      </div>
      <div class="plans" id="lista-planos">${OB.PLANOS.map(cardPlano).join('')}</div>
      <p class="center small muted mt-24">Valores por caixa de e-mail. Quanto maior o período contratado, menor o valor mensal. No ciclo de 3 anos o preço fica travado, sem reajuste durante o contrato.</p>`;
  }

  function cardPlano(p) {
    const preco = OB.precoUnit(p.id, ciclo);
    const inteiro = Math.floor(preco);
    const centavos = String(Math.round((preco - inteiro) * 100)).padStart(2, '0');
    return `<article class="plan ${p.destaque ? 'plan-featured' : ''}">
      ${p.destaque ? '<span class="plan-tag">Mais escolhido</span>' : ''}
      <div class="plan-head">
        <h3 class="plan-name">${E(p.nome)}</h3>
        <span class="badge badge-mut">${E(p.resumo)}</span>
        <p class="plan-desc">${E(p.desc)}</p>
      </div>
      <div>
        <div class="plan-price">
          <span class="cur">R$</span>
          <span class="val">${inteiro},${centavos}</span>
          <span class="per">por mês, por caixa</span>
        </div>
        ${ciclo === 'mensal'
          ? '<p class="plan-note">Sem fidelidade, cancele quando quiser</p>'
          : `<p class="plan-note">${OB.money(OB.totalCiclo(p.id, ciclo))} por caixa a cada ${OB.cicloPor(ciclo).curto}, uma cobrança só.<br>Economia de ${OB.money(OB.economiaCiclo(p.id, ciclo))} em relação ao mensal.</p>`}
      </div>
      <a class="btn ${p.destaque ? 'btn-primary' : 'btn-ghost'} btn-block" href="#/contratar?plano=${p.id}&ciclo=${ciclo}">
        Contratar ${E(p.nome)}
      </a>
      <ul class="plan-feats">
        ${p.recursos.map(([txt, tem]) => `<li class="${tem ? '' : 'off'}">${ico(tem ? 'check' : 'x')}<span>${E(txt)}</span></li>`).join('')}
      </ul>
    </article>`;
  }

  function ligarCiclo() {
    document.querySelectorAll('[data-ciclo]').forEach((b) => {
      b.addEventListener('click', () => {
        ciclo = b.getAttribute('data-ciclo');
        document.querySelectorAll('[data-ciclo]').forEach((x) => {
          x.setAttribute('aria-pressed', x.getAttribute('data-ciclo') === ciclo);
        });
        const lista = document.getElementById('lista-planos');
        if (lista) lista.innerHTML = OB.PLANOS.map(cardPlano).join('');
      });
    });
  }

  function blocoComparativo() {
    const linhas = OB.PLANOS[0].recursos.map((_, i) => {
      const rotulo = OB.PLANOS[2].recursos[i][0];
      return `<tr>
        <td>${E(rotulo.replace(/^\d+ GB de espaço por caixa$/, 'Espaço por caixa'))}</td>
        ${OB.PLANOS.map((p) => {
          const [txt, tem] = p.recursos[i];
          const numeros = txt.match(/^(\d+ GB|Até \d+ apelidos|\d+ apelido|Apelidos ilimitados)/);
          if (numeros) return `<td class="small t-strong">${E(numeros[0])}</td>`;
          return `<td>${tem ? `<span class="yes">${ico('check')}</span>` : `<span class="no">${ico('x')}</span>`}</td>`;
        }).join('')}
      </tr>`;
    }).join('');

    return `<div class="table-wrap">
      <table class="compare">
        <thead>
          <tr>
            <th>Comparativo</th>
            ${OB.PLANOS.map((p) => `<th class="center">${E(p.nome)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${linhas}
          <tr>
            <td class="t-strong">Por caixa, por mês</td>
            ${OB.PLANOS.map((p) => `<td class="t-strong">${OB.money(OB.precoUnit(p.id, ciclo))}</td>`).join('')}
          </tr>
          <tr>
            <td class="t-strong">Cobrado a cada ${E(OB.cicloPor(ciclo).curto)}</td>
            ${OB.PLANOS.map((p) => `<td>${OB.money(OB.totalCiclo(p.id, ciclo))}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>`;
  }

  const FAQ = [
    ['Eu já tenho e-mail em outro lugar. Vocês migram para mim?',
      'Migramos. Trazemos todas as mensagens, pastas e contatos de qualquer serviço que use IMAP, incluindo Google Workspace, Microsoft 365, Locaweb, HostGator e UOL Host. A migração é feita fora do horário comercial, não custa nada e o e-mail continua funcionando durante todo o processo.'],
    ['Preciso ter um domínio próprio?',
      'Sim, o e-mail profissional usa o domínio da sua empresa, como contato@suaempresa.com.br. Se você ainda não tem, a gente registra para você e já deixa apontado. Se já tem o site conosco, não há nada a fazer, cuidamos de tudo.'],
    ['O que acontece se eu contratar e não gostar?',
      'Não existe fidelidade nem multa. Você cancela pelo painel quando quiser e continua com acesso até o fim do período já pago. Antes de encerrar, exportamos suas mensagens e entregamos o arquivo para você.'],
    ['É difícil de configurar no celular?',
      'Não. O painel mostra o passo a passo para iPhone, Android, Outlook e Thunderbird, e o autodiscover deixa o Outlook e o Mail do iPhone se configurarem sozinhos, só com e-mail e senha. Se preferir, a gente configura o primeiro aparelho junto com você por chamada.'],
    ['Minhas mensagens vão parar no spam de quem recebe?',
      'Configuramos SPF, DKIM e DMARC no seu domínio, que são exatamente os três itens que o Gmail e o Outlook passaram a exigir. O painel verifica esses registros de verdade e avisa se algum deles sair do ar.'],
    ['Quantas caixas eu posso ter?',
      'Quantas quiser. O valor é por caixa, então você cria e remove conforme a equipe muda, e a cobrança do mês seguinte já sai ajustada. Apelidos, como vendas@ e financeiro@ apontando para a mesma caixa, não são cobrados.'],
    ['Vocês leem as minhas mensagens?',
      'Não. O conteúdo das caixas não é acessado pela nossa equipe, não é usado para publicidade e não é compartilhado. O suporte só enxerga dados de configuração, como espaço usado e status de entrega.'],
    ['Qual é o horário do atendimento?',
      'Segunda a sexta, das 8h30 às 18h, por WhatsApp, e-mail e telefone. Casos de indisponibilidade são atendidos fora do horário comercial pelo mesmo WhatsApp.'],
  ];

  function blocoFaq() {
    return `<div class="faq">
      ${FAQ.map(([p, r], i) => `<details ${i === 0 ? 'open' : ''}>
        <summary>${E(p)}</summary>
        <div class="faq-body"><p>${E(r)}</p></div>
      </details>`).join('')}
    </div>`;
  }

  function blocoCta() {
    return `<section class="section">
      <div class="wrap">
        <div class="card card-pad-lg center" style="background:linear-gradient(135deg, var(--brand) 0%, #c2360f 100%);border:none;color:#fff">
          <h2 style="color:#fff">Seu cliente decide se te leva a sério antes de abrir a mensagem</h2>
          <p class="lead mt-16" style="color:rgba(255,255,255,.9);margin-inline:auto">Troque o e-mail pessoal por um endereço com a sua marca hoje. A gente cuida da migração, do DNS e da configuração dos aparelhos.</p>
          <div class="row center mt-24 wrap-gap" style="justify-content:center">
            <a class="btn btn-lg" style="background:#fff;color:var(--brand)" href="#/contratar">Contratar agora ${ico('arrowRight')}</a>
            <a class="btn btn-lg btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.5)" href="${wppLink()}" target="_blank" rel="noopener">${ico('whatsapp')} Tirar dúvidas</a>
          </div>
        </div>
      </div>
    </section>`;
  }

  /* ============================================================
     HOME
     ============================================================ */
  function home() {
    const conteudo = `
      <!-- HERO -->
      <section class="hero">
        <div class="wrap hero-grid">
          <div>
            <span class="eyebrow">${ico('mail')} OutBox Soluções Digitais</span>
            <h1>O e-mail da sua empresa merece o nome da sua empresa</h1>
            <p class="lead">Sai o <span class="mono">@gmail.com</span>, entra o <span class="brand-text mono">@suaempresa.com.br</span>. Criamos, migramos e configuramos tudo para você, com atendimento de gente de verdade e sem letra miúda.</p>
            <div class="hero-cta">
              <a class="btn btn-primary btn-lg" href="#/contratar">Começar agora ${ico('arrowRight')}</a>
              <a class="btn btn-ghost btn-lg" href="#/planos">Ver planos</a>
            </div>
            <ul class="hero-trust">
              <li>${ico('check')} A partir de ${OB.money(Math.min(...OB.PLANOS.map((p) => OB.precoUnit(p.id, 'trienal'))))} por caixa</li>
              <li>${ico('check')} Migração gratuita</li>
              <li>${ico('check')} Sem fidelidade</li>
            </ul>
          </div>
          <div class="inbox-mock" aria-hidden="true">
            <div class="inbox-bar">
              <span class="tl"><i></i><i></i><i></i></span>
              <span class="addr">webmail.outboxmail.com.br</span>
            </div>
            <div class="inbox-list">
              ${[
                ['Ana Carolina', 'AC', 'Proposta aprovada, podemos seguir', '09:41', true],
                ['Financeiro', 'FI', 'Nota fiscal de julho anexada', '08:12', false],
                ['Marcos Bellucci', 'MB', 'Projeto da cozinha, versão final', 'Ontem', false],
                ['Recepção', 'RE', 'Agenda da semana confirmada', 'Ontem', false],
              ].map(([nome, ini, assunto, hora, novo]) => `
                <div class="inbox-item ${novo ? 'unread' : ''}">
                  <span class="inbox-av" style="background:${OB.corDe(nome)}">${ini}</span>
                  <div class="inbox-txt">
                    <div class="inbox-from"><span>${nome}</span><time>${hora}</time></div>
                    <div class="inbox-sub">${assunto}</div>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- POR QUE -->
      <section class="section-tight">
        <div class="wrap">
          <div class="feats">
            <div class="feat">
              <div class="feat-ico">${ico('shield')}</div>
              <h3>Credibilidade na primeira linha</h3>
              <p>Antes de ler a proposta, o cliente lê o remetente. Um endereço com o domínio da empresa muda a resposta que você recebe.</p>
            </div>
            <div class="feat">
              <div class="feat-ico">${ico('users')}</div>
              <h3>A empresa continua sua</h3>
              <p>Quando um funcionário sai, a caixa fica. Você redireciona, transfere o histórico e nenhum contato se perde no e-mail pessoal de ninguém.</p>
            </div>
            <div class="feat">
              <div class="feat-ico">${ico('zap')}</div>
              <h3>Entrega que chega</h3>
              <p>SPF, DKIM e DMARC configurados desde o primeiro dia, do jeito que o Gmail e o Outlook passaram a exigir. Menos caixa de spam, mais resposta.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- COLABORATIVO -->
      <section class="section">
        <div class="wrap">
          <div class="hero-grid">
            <div>
              <span class="eyebrow">${ico('inbox')} Mais colaborativo</span>
              <h2 class="mt-16">Uma caixa que a equipe inteira consegue tocar</h2>
              <p class="lead mt-16">O contato@ não pode depender de uma pessoa só. Compartilhe a caixa de entrada, a agenda e os contatos com quem precisa, defina quem responde o quê e acabe com o encaminhamento eterno de mensagem.</p>
              <ul class="hero-trust" style="flex-direction:column;gap:10px;margin-top:24px">
                <li>${ico('check')} Caixa de entrada compartilhada entre vários usuários</li>
                <li>${ico('check')} Agenda e contatos da empresa em um lugar só</li>
                <li>${ico('check')} Apelidos como vendas@ e suporte@ sem custo extra</li>
                <li>${ico('check')} Histórico preservado quando alguém sai da equipe</li>
              </ul>
            </div>
            <div class="card card-pad-lg">
              <div class="card-head"><span class="card-title">Endereços do domínio</span><span class="badge badge-green"><span class="dot"></span>Ativo</span></div>
              ${[
                ['contato@suaempresa.com.br', 'Compartilhada, 4 pessoas', 'users'],
                ['comercial@suaempresa.com.br', 'Caixa individual', 'user'],
                ['vendas@suaempresa.com.br', 'Apelido de comercial@', 'forward'],
                ['financeiro@suaempresa.com.br', 'Caixa individual', 'user'],
              ].map(([end, desc, i]) => `
                <div class="row" style="padding:12px 0;border-bottom:1px solid var(--border)">
                  <span class="kpi-ico" style="background:var(--brand-soft);color:var(--brand);width:34px;height:34px">${ico(i)}</span>
                  <div class="grow" style="min-width:0">
                    <div class="small t-strong truncate">${end}</div>
                    <div class="xs muted">${desc}</div>
                  </div>
                </div>`).join('')}
              <p class="xs muted mt-16">Exemplo de como o seu domínio aparece no painel.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- RECURSOS -->
      <section class="section" style="background:var(--surface-2);border-block:1px solid var(--border)">
        <div class="wrap">
          <div class="center" style="margin-bottom:44px">
            <span class="eyebrow">${ico('package')} Tudo que vem junto</span>
            <h2 class="mt-16">Não é só uma caixa de entrada</h2>
            <p class="lead mt-8" style="margin-inline:auto">Os recursos que você usaria todo dia já vêm ligados, sem módulo extra e sem cobrança escondida.</p>
          </div>
          <div class="feats">
            ${[
              ['filter', 'Filtros e automação', 'Regras que separam, marcam e arquivam sozinhas. A caixa chega organizada antes de você abrir.'],
              ['calendar', 'Agenda compartilhada', 'Compromissos da equipe visíveis para quem precisa, com convite por e-mail e lembrete.'],
              ['users', 'Grupos de e-mail', 'Um endereço, várias pessoas recebendo. Ideal para financeiro@, suporte@ e comercial@.'],
              ['send', 'Resposta automática', 'Férias, fora do horário ou primeiro contato: a resposta certa sai na hora, sem você lembrar.'],
              ['shield', 'Antispam e antivírus', 'Filtragem em camadas antes da mensagem chegar, com quarentena que você mesmo revisa.'],
              ['smartphone', 'Webmail e celular', 'Acesso pelo navegador em português e sincronização com iPhone, Android e Outlook.'],
            ].map(([i, t, d]) => `
              <div class="feat">
                <div class="feat-ico">${ico(i)}</div>
                <h3>${t}</h3>
                <p>${d}</p>
              </div>`).join('')}
          </div>
        </div>
      </section>

      <!-- PLANOS -->
      <section class="section" id="planos">
        <div class="wrap">${blocoPlanos()}</div>
      </section>

      <!-- MUITAS CAIXAS -->
      <section class="section-tight">
        <div class="wrap">
          <div class="card card-pad-lg">
            <div class="hero-grid" style="align-items:center">
              <div>
                <span class="eyebrow">${ico('building')} Mais de 10 caixas</span>
                <h2 class="mt-16" style="font-size:clamp(1.3rem,2.6vw,1.8rem)">Equipe grande tem preço de equipe grande</h2>
                <p class="lead mt-8">A partir de 10 caixas montamos uma proposta com desconto por volume, migração acompanhada e uma pessoa responsável pelo seu atendimento. Deixe seus dados que respondemos em até duas horas úteis.</p>
              </div>
              <form id="f-volume" class="col" style="gap:12px" novalidate>
                <div class="field">
                  <label for="v-nome">Nome</label>
                  <input id="v-nome" class="input" placeholder="Como podemos te chamar" required>
                </div>
                <div class="field">
                  <label for="v-email">E-mail</label>
                  <input id="v-email" type="email" class="input" placeholder="voce@suaempresa.com.br" required>
                </div>
                <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
                  <div class="field">
                    <label for="v-tel">Telefone</label>
                    <input id="v-tel" class="input" placeholder="(00) 00000-0000" inputmode="tel">
                  </div>
                  <div class="field">
                    <label for="v-qtd">Quantas caixas</label>
                    <select id="v-qtd" class="select">
                      <option>10 a 24</option>
                      <option>25 a 49</option>
                      <option>50 ou mais</option>
                    </select>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Quero uma proposta</button>
                <p class="xs muted center">Seus dados são usados só para esse contato, conforme a nossa política de privacidade.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <!-- DEPOIMENTOS (conteúdo de exemplo, trocar por depoimentos reais) -->
      <section class="section">
        <div class="wrap">
          <div class="center" style="margin-bottom:38px">
            <span class="eyebrow">${ico('star')} Quem já usa</span>
            <h2 class="mt-16">O que muda no dia a dia</h2>
          </div>
          <div class="feats">
            ${[
              ['A migração foi feita de madrugada e na segunda ninguém percebeu que tinha trocado de serviço. Nenhum e-mail se perdeu.', 'Cliente do setor moveleiro', 'Ourinhos, SP'],
              ['O que resolveu para a gente foi ter alguém no WhatsApp que responde. Antes era abrir chamado e esperar dois dias.', 'Cliente da área da saúde', 'Santa Cruz do Rio Pardo, SP'],
              ['Quando um vendedor sai, a caixa continua com a empresa. Isso sozinho já pagou a mudança.', 'Cliente do varejo', 'Bauru, SP'],
            ].map(([txt, quem, onde]) => `
              <div class="feat">
                <div class="row" style="gap:3px;color:var(--brand);margin-bottom:14px">${ico('star')}${ico('star')}${ico('star')}${ico('star')}${ico('star')}</div>
                <p style="font-size:.96rem;color:var(--text)">${txt}</p>
                <div class="row mt-16" style="gap:10px">
                  <span class="avatar" style="background:${OB.corDe(quem)}">${ico('user')}</span>
                  <div>
                    <div class="small t-strong">${quem}</div>
                    <div class="xs muted">${onde}</div>
                  </div>
                </div>
              </div>`).join('')}
          </div>
          <p class="center xs muted mt-24">Depoimentos de exemplo. Substituir pelos relatos reais dos clientes antes de publicar.</p>
        </div>
      </section>

      <!-- FAQ -->
      <section class="section" style="background:var(--surface-2);border-block:1px solid var(--border)">
        <div class="wrap wrap-sm">
          <div class="center" style="margin-bottom:34px">
            <span class="eyebrow">${ico('help')} Perguntas frequentes</span>
            <h2 class="mt-16">O que costumam perguntar antes de contratar</h2>
          </div>
          ${blocoFaq()}
        </div>
      </section>

      ${blocoCta()}`;

    return pagina(conteudo, 'home');
  }

  /* ============================================================
     PLANOS
     ============================================================ */
  function planos() {
    const conteudo = `
      <section class="section">
        <div class="wrap">
          ${blocoPlanos()}
        </div>
      </section>
      <section class="section-tight">
        <div class="wrap">
          <h2 class="center mb-24">Compare item por item</h2>
          ${blocoComparativo()}
          <p class="center small muted mt-16">Apelidos não contam como caixa e não são cobrados.</p>
        </div>
      </section>
      <section class="section">
        <div class="wrap wrap-sm">
          <h2 class="center mb-24">Dúvidas sobre cobrança</h2>
          ${blocoFaq()}
        </div>
      </section>
      ${blocoCta()}`;
    return pagina(conteudo, 'planos');
  }

  /* ============================================================
     RECURSOS
     ============================================================ */
  function recursos() {
    const conteudo = `
      <section class="section">
        <div class="wrap">
          <div class="center" style="margin-bottom:44px">
            <span class="eyebrow">${ico('package')} Recursos</span>
            <h1 class="mt-16" style="font-size:clamp(1.8rem,4vw,2.6rem)">Feito para trabalhar, não para impressionar</h1>
            <p class="lead mt-8" style="margin-inline:auto">Cada recurso aqui existe porque algum cliente pediu. Nada é vendido separado.</p>
          </div>
          <div class="feats">
            ${[
              ['inbox', 'Caixa compartilhada', 'Várias pessoas atendendo o mesmo endereço, com controle de quem já respondeu o quê.'],
              ['filter', 'Filtros e regras', 'Separe por remetente, assunto ou palavra e mande direto para a pasta certa.'],
              ['calendar', 'Agenda e contatos', 'Compromissos e lista de contatos compartilhados, sincronizados com o celular.'],
              ['send', 'Resposta automática', 'Mensagem de ausência, de fora de horário ou de primeiro contato.'],
              ['forward', 'Apelidos e redirecionamentos', 'Endereços extras sem custo, apontando para uma caixa que já existe.'],
              ['shield', 'Antispam e antivírus', 'Camadas de filtragem antes da entrega, com quarentena revisável.'],
              ['key', 'Senha forte e 2FA', 'Política de senha, verificação em duas etapas e sessões auditadas.'],
              ['hardDrive', 'Backup e retenção', 'Cópias diárias das caixas, com restauração sob pedido.'],
              ['globe', 'Webmail em português', 'Acesso pelo navegador, sem instalar nada, em qualquer computador.'],
              ['smartphone', 'Celular e Outlook', 'IMAP, POP3 e SMTP abertos, com autodiscover para configuração automática.'],
              ['activity', 'Relatório de entrega', 'Veja se a mensagem saiu, chegou e foi aceita pelo servidor do destinatário.'],
              ['upload', 'Migração assistida', 'Trazemos o histórico do serviço antigo sem interromper o funcionamento.'],
            ].map(([i, t, d]) => `
              <div class="feat">
                <div class="feat-ico">${ico(i)}</div>
                <h3>${t}</h3>
                <p>${d}</p>
              </div>`).join('')}
          </div>
        </div>
      </section>

      <section class="section" style="background:var(--surface-2);border-block:1px solid var(--border)">
        <div class="wrap">
          <div class="center mb-24">
            <span class="eyebrow">${ico('server')} Dados de configuração</span>
            <h2 class="mt-16">Servidores abertos, sem amarração</h2>
            <p class="lead mt-8" style="margin-inline:auto">Você configura no programa que preferir. Nada aqui é fechado em aplicativo próprio.</p>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Serviço</th><th>Servidor</th><th>Porta</th><th>Segurança</th><th>Observação</th></tr></thead>
              <tbody>
                ${DNS.SERVIDORES.map((s) => `<tr>
                  <td class="t-strong">${E(s.nome)}</td>
                  <td class="mono">${E(s.host)}</td>
                  <td class="mono">${E(s.porta)}</td>
                  <td>${E(s.seg)}</td>
                  <td class="small muted">${E(s.obs)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      ${blocoCta()}`;
    return pagina(conteudo, 'recursos');
  }

  /* ============================================================
     MIGRAÇÃO
     ============================================================ */
  function migracao() {
    const conteudo = `
      <section class="section">
        <div class="wrap wrap-sm center">
          <span class="eyebrow" style="justify-content:center">${ico('upload')} Migração gratuita</span>
          <h1 class="mt-16">Trocar de e-mail sem parar a empresa</h1>
          <p class="lead mt-16">Ninguém pode ficar sem receber mensagem durante a troca. Por isso a migração é feita em etapas, fora do horário comercial, e o serviço antigo continua ativo até o último e-mail ter sido copiado.</p>
        </div>
      </section>
      <section class="section-tight">
        <div class="wrap">
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">
            ${[
              ['1', 'Levantamento', 'Listamos todas as caixas, apelidos e redirecionamentos que existem hoje, com o espaço usado por cada uma.'],
              ['2', 'Cópia em segundo plano', 'Copiamos mensagens, pastas e contatos por IMAP enquanto o serviço antigo segue recebendo normalmente.'],
              ['3', 'Virada do DNS', 'Trocamos o MX fora do horário comercial. A partir daí as mensagens novas já chegam aqui.'],
              ['4', 'Cópia final e ajuste', 'Copiamos o que entrou durante a virada e configuramos os aparelhos da equipe, um por um.'],
            ].map(([n, t, d]) => `
              <div class="card">
                <div class="kpi-ico" style="background:var(--brand-soft);color:var(--brand);font-weight:800;font-size:1rem">${n}</div>
                <h3 class="mt-16" style="font-size:1.02rem">${t}</h3>
                <p class="small soft mt-8">${d}</p>
              </div>`).join('')}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="wrap wrap-sm">
          <div class="card card-pad-lg">
            <h3 class="mb-16">De onde conseguimos migrar</h3>
            <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">
              ${['Google Workspace', 'Microsoft 365', 'Locaweb', 'HostGator', 'UOL Host', 'KingHost', 'cPanel e Plesk', 'Zimbra', 'Qualquer servidor IMAP']
                .map((n) => `<div class="row small" style="gap:8px"><span class="yes">${ico('check')}</span>${n}</div>`).join('')}
            </div>
            <p class="small muted mt-24">Se o seu serviço atual não estiver na lista mas oferecer acesso IMAP, conseguimos migrar do mesmo jeito.</p>
          </div>
        </div>
      </section>
      ${blocoCta()}`;
    return pagina(conteudo, 'migracao');
  }

  /* ============================================================
     AJUDA
     ============================================================ */
  function ajuda() {
    const conteudo = `
      <section class="section">
        <div class="wrap wrap-sm">
          <div class="center mb-24">
            <span class="eyebrow" style="justify-content:center">${ico('help')} Central de ajuda</span>
            <h1 class="mt-16">Como configurar o seu e-mail</h1>
            <p class="lead mt-8">Escolha o programa que você usa e siga o passo a passo. Se travar em alguma etapa, chame no WhatsApp que a gente configura junto com você.</p>
          </div>
          <div class="tabs" id="tabs-tuto" role="tablist">
            ${DNS.TUTORIAIS.map((t, i) => `<button class="tab ${i === 0 ? 'active' : ''}" role="tab" data-tuto="${t.id}" aria-selected="${i === 0}">${E(t.nome)}</button>`).join('')}
          </div>
          <div id="corpo-tuto"></div>

          <div class="card mt-32">
            <h3 class="mb-16">Dados dos servidores</h3>
            <div class="col" style="gap:10px">
              ${DNS.SERVIDORES.map((s) => `
                <div class="row-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div><div class="small t-strong">${E(s.nome)}</div><div class="xs muted">${E(s.seg)}, porta ${E(s.porta)}</div></div>
                  ${UI.linhaCopia(s.host, s.nome)}
                </div>`).join('')}
            </div>
          </div>

          <div class="mt-32">
            <h2 class="mb-16">Perguntas frequentes</h2>
            ${blocoFaq()}
          </div>
        </div>
      </section>
      ${blocoCta()}`;
    return pagina(conteudo, 'ajuda');
  }

  function renderTutorial(id) {
    const t = DNS.TUTORIAIS.find((x) => x.id === id) || DNS.TUTORIAIS[0];
    const el = document.getElementById('corpo-tuto');
    if (!el) return;
    el.innerHTML = `<div class="card fade-in">
      <div class="row mb-16" style="gap:12px">
        <span class="kpi-ico" style="background:var(--brand-soft);color:var(--brand)">${ico(t.ico)}</span>
        <h3>${E(t.nome)}</h3>
      </div>
      <ol class="col" style="gap:14px;counter-reset:p">
        ${t.passos.map((p, i) => `<li class="row" style="gap:12px;align-items:flex-start">
          <span class="avatar" style="width:26px;height:26px;font-size:.74rem;border-radius:8px;background:var(--surface-3);color:var(--text-soft)">${i + 1}</span>
          <span class="small" style="line-height:1.7">${p}</span>
        </li>`).join('')}
      </ol>
    </div>`;
  }

  function ligarAjuda() {
    renderTutorial(DNS.TUTORIAIS[0].id);
    document.querySelectorAll('[data-tuto]').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-tuto]').forEach((x) => {
          x.classList.remove('active'); x.setAttribute('aria-selected', 'false');
        });
        b.classList.add('active'); b.setAttribute('aria-selected', 'true');
        renderTutorial(b.getAttribute('data-tuto'));
      });
    });
  }

  /* ============================================================
     TERMOS E PRIVACIDADE
     ============================================================ */
  function juridico(tipo) {
    const termos = [
      ['Objeto', 'A OutBox Soluções Digitais fornece serviço de hospedagem de e-mail profissional em domínio de titularidade do contratante, incluindo caixas, apelidos, redirecionamentos e acesso por webmail, IMAP, POP3 e SMTP.'],
      ['Vigência e cancelamento', 'A contratação é por prazo indeterminado, sem fidelidade. O cancelamento pode ser solicitado a qualquer momento pelo painel e produz efeito ao fim do período já pago, sem multa.'],
      ['Pagamento e suspensão', 'A cobrança é mensal ou anual, por caixa ativa. Após o vencimento há prazo de tolerância antes da suspensão. A conta suspensa deixa de receber mensagens novas, mas o conteúdo é preservado por 30 dias antes da exclusão definitiva.'],
      ['Uso aceitável', 'É vedado o uso do serviço para envio de mensagem não solicitada em massa, conteúdo ilícito, fraude, phishing ou qualquer prática que comprometa a reputação dos servidores. A violação autoriza a suspensão imediata.'],
      ['Disponibilidade', 'Trabalhamos com meta de 99,9% de disponibilidade mensal, excluídas as janelas de manutenção comunicadas com antecedência.'],
      ['Responsabilidade', 'O contratante é responsável pela guarda das senhas e pelo conteúdo transmitido pelas suas caixas. A OutBox não responde por perdas decorrentes de uso indevido de credenciais sob controle do contratante.'],
    ];
    const priv = [
      ['Quem é o controlador', 'A OutBox Soluções Digitais é a controladora dos dados cadastrais da contratante e operadora quanto ao conteúdo das caixas de e-mail, tratado exclusivamente para prestar o serviço.'],
      ['Dados tratados', 'Dados cadastrais da empresa e do responsável, dados de faturamento, registros de acesso ao painel e metadados técnicos necessários à entrega das mensagens.'],
      ['Conteúdo das mensagens', 'O conteúdo das caixas não é lido, analisado para publicidade nem compartilhado. O acesso técnico só ocorre mediante solicitação expressa do contratante para fins de suporte, com registro.'],
      ['Guarda de registros', 'Os registros de acesso à aplicação são mantidos pelo prazo legal previsto no Marco Civil da Internet e fornecidos apenas mediante ordem judicial.'],
      ['Direitos do titular', 'O titular pode solicitar confirmação de tratamento, acesso, correção, portabilidade e eliminação dos dados, pelos canais de atendimento indicados neste site.'],
      ['Segurança', 'Transporte cifrado, senhas armazenadas com hash, verificação em duas etapas disponível e cópias de segurança diárias com acesso restrito.'],
    ];
    const itens = tipo === 'termos' ? termos : priv;
    const conteudo = `
      <section class="section">
        <div class="wrap wrap-sm">
          <h1>${tipo === 'termos' ? 'Termos de uso' : 'Política de privacidade'}</h1>
          <p class="small muted mt-8">Modelo de referência. Antes de publicar, revise com apoio jurídico e ajuste os prazos e canais à sua operação.</p>
          <div class="col mt-32" style="gap:24px">
            ${itens.map(([t, d], i) => `<div>
              <h3>${i + 1}. ${E(t)}</h3>
              <p class="soft mt-8" style="font-size:.94rem;line-height:1.75">${E(d)}</p>
            </div>`).join('')}
          </div>
        </div>
      </section>`;
    return pagina(conteudo, '');
  }

  /* ============================================================
     CHECKOUT
     ============================================================ */
  let ped = null;

  function novoPedido(params) {
    return {
      passo: 1,
      planoId: params.plano && OB.PLANOS.some((p) => p.id === params.plano) ? params.plano : 'profissional',
      ciclo: OB.CICLOS.some((c) => c.id === params.ciclo) ? params.ciclo : ciclo,
      dominio: '', qtd: 2, cupom: null,
      empresa: '', doc: '', contato: '', email: '', telefone: '', cidade: '', uf: '',
      senha: '', metodo: 'pix',
    };
  }

  function totais() {
    const unit = OB.precoUnit(ped.planoId, ped.ciclo);
    const meses = OB.mesesDe(ped.ciclo);
    const bruto = +(OB.totalCiclo(ped.planoId, ped.ciclo) * ped.qtd).toFixed(2);
    let desconto = 0;
    if (ped.cupom) {
      desconto = ped.cupom.tipo === 'percentual' ? bruto * (ped.cupom.valor / 100) : Math.min(ped.cupom.valor, bruto);
    }
    return { unit, meses, bruto, desconto, total: Math.max(0, bruto - desconto) };
  }

  function checkout(params) {
    const p = params || {};
    if (!ped) {
      ped = novoPedido(p);
    } else {
      /* a URL manda: evita herdar plano ou ciclo de uma visita anterior */
      if (p.plano && OB.PLANOS.some((x) => x.id === p.plano)) ped.planoId = p.plano;
      if (p.ciclo && OB.CICLOS.some((c) => c.id === p.ciclo)) ped.ciclo = p.ciclo;
    }
    const conteudo = `
      <section class="section-tight">
        <div class="wrap">
          <div class="steps">
            ${['Plano e domínio', 'Seus dados', 'Pagamento'].map((t, i) => {
              const n = i + 1;
              const cls = ped.passo > n ? 'done' : (ped.passo === n ? 'on' : '');
              return `<div class="step ${cls}"><span class="n">${ped.passo > n ? '✓' : n}</span>${t}</div>
                ${i < 2 ? '<span class="step-sep"></span>' : ''}`;
            }).join('')}
          </div>
          <div class="checkout-grid">
            <div id="checkout-passo">${passoAtual()}</div>
            <aside class="card summary" id="resumo">${resumo()}</aside>
          </div>
        </div>
      </section>`;
    return pagina(conteudo, '');
  }

  function passoAtual() {
    if (ped.passo === 1) return passo1();
    if (ped.passo === 2) return passo2();
    return passo3();
  }

  function passo1() {
    return `<div class="card card-pad-lg fade-in">
      <h2 style="font-size:1.3rem">Escolha o plano e informe o domínio</h2>
      <p class="small muted mt-8">O valor é por caixa. Você pode criar ou remover caixas depois, direto no painel.</p>

      <div class="field mt-24">
        <label for="c-dominio">Domínio da empresa</label>
        <input id="c-dominio" class="input" placeholder="suaempresa.com.br" value="${E(ped.dominio)}" autocomplete="off">
        <span class="field-hint">Digite sem www e sem http. Ainda não tem domínio? A gente registra para você, é só avisar no WhatsApp.</span>
        <span class="field-error hidden" id="e-dominio"></span>
      </div>

      <div class="field mt-24">
        <span class="lbl">Plano</span>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">
          ${OB.PLANOS.map((p) => `
            <label class="card clickable" style="padding:14px;border-color:${p.id === ped.planoId ? 'var(--brand)' : 'var(--border)'};${p.id === ped.planoId ? 'box-shadow:0 0 0 3px var(--brand-soft)' : ''}">
              <div class="row" style="gap:9px">
                <input type="radio" name="plano" value="${p.id}" ${p.id === ped.planoId ? 'checked' : ''} style="accent-color:var(--brand);width:17px;height:17px">
                <div class="grow">
                  <div class="small t-strong">${E(p.nome)}</div>
                  <div class="xs muted">${E(p.resumo)}</div>
                </div>
              </div>
              <div class="t-strong mt-8" style="font-size:1.05rem">${OB.money(OB.precoUnit(p.id, ped.ciclo))}<span class="xs muted"> /caixa</span></div>
            </label>`).join('')}
        </div>
      </div>

      <div class="row-between mt-24" style="gap:20px">
        <div class="field" style="flex:1;min-width:180px">
          <span class="lbl">Ciclo de cobrança</span>
          <div class="seg">
            ${OB.CICLOS.map((c) => `<button type="button" data-cciclo="${c.id}" aria-pressed="${ped.ciclo === c.id}">${E(c.nome)}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label for="c-qtd">Quantas caixas</label>
          <div class="stepper">
            <button type="button" data-qtd="-1" aria-label="Diminuir">${ico('minus')}</button>
            <input id="c-qtd" type="number" min="1" max="200" value="${ped.qtd}" aria-label="Quantidade de caixas">
            <button type="button" data-qtd="1" aria-label="Aumentar">${ico('plus')}</button>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-lg btn-block mt-32" id="b-passo1">Continuar ${ico('arrowRight')}</button>
    </div>`;
  }

  function passo2() {
    return `<div class="card card-pad-lg fade-in">
      <h2 style="font-size:1.3rem">Dados da empresa</h2>
      <p class="small muted mt-8">Usamos esses dados na nota fiscal e para criar o seu acesso ao painel.</p>

      <div class="grid mt-24" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        <div class="field">
          <label for="c-empresa">Razão social ou nome</label>
          <input id="c-empresa" class="input" value="${E(ped.empresa)}" placeholder="Sua Empresa Ltda">
        </div>
        <div class="field">
          <label for="c-doc">CNPJ ou CPF</label>
          <input id="c-doc" class="input" value="${E(ped.doc)}" placeholder="00.000.000/0000-00" inputmode="numeric">
        </div>
        <div class="field">
          <label for="c-contato">Nome do responsável</label>
          <input id="c-contato" class="input" value="${E(ped.contato)}" placeholder="Quem vai administrar as caixas">
        </div>
        <div class="field">
          <label for="c-tel">Telefone</label>
          <input id="c-tel" class="input" value="${E(ped.telefone)}" placeholder="(00) 00000-0000" inputmode="tel">
        </div>
        <div class="field">
          <label for="c-cidade">Cidade</label>
          <input id="c-cidade" class="input" value="${E(ped.cidade)}" placeholder="Cidade">
        </div>
        <div class="field">
          <label for="c-uf">Estado</label>
          <select id="c-uf" class="select">
            ${['SP', 'PR', 'MG', 'RJ', 'RS', 'SC', 'GO', 'BA', 'PE', 'CE', 'DF', 'MT', 'MS', 'ES', 'PA', 'AM', 'Outro']
              .map((uf) => `<option ${uf === ped.uf ? 'selected' : ''}>${uf}</option>`).join('')}
          </select>
        </div>
      </div>

      <h3 class="mt-32" style="font-size:1.05rem">Acesso ao painel</h3>
      <div class="grid mt-16" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        <div class="field">
          <label for="c-email">E-mail de acesso</label>
          <input id="c-email" type="email" class="input" value="${E(ped.email)}" placeholder="voce@suaempresa.com.br" autocomplete="username">
        </div>
        <div class="field">
          <label for="c-senha">Crie uma senha</label>
          ${UI.campoSenha('c-senha', 'Mínimo de 8 caracteres', 'new-password')}
          <div class="bar mt-8" id="forca-bar"><span style="width:0"></span></div>
          <span class="field-hint" id="forca-txt">Use letras, números e um símbolo.</span>
        </div>
      </div>

      <div class="field-error hidden mt-16" id="e-passo2" role="alert"></div>

      <div class="row mt-32 wrap-gap">
        <button class="btn btn-ghost" id="b-voltar2">${ico('arrowLeft')} Voltar</button>
        <button class="btn btn-primary grow" id="b-passo2">Ir para o pagamento ${ico('arrowRight')}</button>
      </div>
    </div>`;
  }

  function passo3() {
    const t = totais();
    return `<div class="card card-pad-lg fade-in">
      <h2 style="font-size:1.3rem">Forma de pagamento</h2>
      <p class="small muted mt-8">Esta é uma demonstração. Nenhuma cobrança real é feita e nenhum dado de cartão é solicitado ou armazenado.</p>

      <div class="col mt-24" style="gap:10px">
        ${[
          ['pix', 'card', 'Pix', 'Aprovação na hora, com QR Code gerado após a confirmação.'],
          ['boleto', 'file', 'Boleto bancário', 'Compensação em até 2 dias úteis. Indicado para o ciclo anual.'],
          ['cartao', 'card', 'Cartão de crédito', 'Cobrança recorrente automática, com renovação a cada ciclo.'],
        ].map(([id, i, nome, desc]) => `
          <label class="card clickable row" style="gap:12px;padding:16px;border-color:${ped.metodo === id ? 'var(--brand)' : 'var(--border)'}">
            <input type="radio" name="metodo" value="${id}" ${ped.metodo === id ? 'checked' : ''} style="accent-color:var(--brand);width:18px;height:18px">
            <span class="kpi-ico" style="background:var(--surface-3);color:var(--text-soft);width:34px;height:34px">${ico(i)}</span>
            <span class="grow">
              <span class="small t-strong" style="display:block">${nome}</span>
              <span class="xs muted">${desc}</span>
            </span>
          </label>`).join('')}
      </div>

      <div class="field mt-24">
        <label for="c-cupom">Cupom de desconto</label>
        <div class="input-group">
          <input id="c-cupom" class="input" placeholder="Digite o código" value="${ped.cupom ? E(ped.cupom.codigo) : ''}" style="text-transform:uppercase">
          <button class="addon clickable" id="b-cupom" type="button">Aplicar</button>
        </div>
        <span class="field-hint" id="msg-cupom">${ped.cupom ? `Cupom ${E(ped.cupom.codigo)} aplicado.` : 'Tem um cupom? Experimente OUTBOX10.'}</span>
      </div>

      <label class="check mt-24">
        <input type="checkbox" id="c-aceite">
        <span class="small soft">Li e aceito os <a href="#/termos" style="color:var(--brand);font-weight:600">termos de uso</a> e a <a href="#/privacidade" style="color:var(--brand);font-weight:600">política de privacidade</a>, incluindo a política de uso aceitável do serviço de e-mail.</span>
      </label>

      <div class="field-error hidden mt-16" id="e-passo3" role="alert"></div>

      <div class="row mt-32 wrap-gap">
        <button class="btn btn-ghost" id="b-voltar3">${ico('arrowLeft')} Voltar</button>
        <button class="btn btn-primary grow btn-lg" id="b-finalizar">Finalizar contratação ${OB.money(t.total)}</button>
      </div>
    </div>`;
  }

  function resumo() {
    const p = OB.planoPor(ped.planoId);
    const t = totais();
    return `<div class="card-head"><span class="card-title">Resumo do pedido</span></div>
      <div class="sum-line"><span class="soft">Plano</span><span class="t-strong">${E(p.nome)}, ${E(p.resumo)}</span></div>
      <div class="sum-line"><span class="soft">Domínio</span><span class="t-strong mono">${ped.dominio ? E(ped.dominio) : '–'}</span></div>
      <div class="sum-line"><span class="soft">Caixas</span><span class="t-strong">${ped.qtd}</span></div>
      <div class="sum-line"><span class="soft">Ciclo</span><span class="t-strong">${E(OB.cicloPor(ped.ciclo).nome)}${t.meses > 1 ? `, ${t.meses} meses` : ''}</span></div>
      <div class="sum-line"><span class="soft">Por caixa, por mês</span><span class="t-strong">${OB.money(t.unit)}</span></div>
      <div class="sum-line"><span class="soft">Por caixa, no ciclo</span><span class="t-strong">${OB.money(OB.totalCiclo(ped.planoId, ped.ciclo))}</span></div>
      ${t.desconto ? `<div class="sum-line" style="color:var(--green)"><span>Desconto ${E(ped.cupom.codigo)}</span><span class="t-strong">− ${OB.money(t.desconto)}</span></div>` : ''}
      <div class="sum-line total"><span>Total ${t.meses > 1 ? 'a pagar agora' : 'do mês'}</span><span>${OB.money(t.total)}</span></div>
      ${t.meses > 1
        ? `<p class="xs muted mt-8">Uma cobrança só, equivalente a ${OB.money(t.total / t.meses)} por mês. Você economiza ${OB.money(OB.economiaCiclo(ped.planoId, ped.ciclo) * ped.qtd)} em relação a pagar mês a mês, e o preço fica travado durante todo o período.</p>`
        : `<p class="xs muted mt-8">Renova automaticamente todo mês. Cancele quando quiser, sem multa.</p>`}
      <p class="xs muted mt-16" style="padding-top:12px;border-top:1px solid var(--border)">
        A cobrança acompanha as caixas que existirem no domínio, com mínimo de uma. Criou mais, entra na próxima fatura. Removeu, sai. Apelidos não são cobrados.
      </p>
      <div class="col mt-24" style="gap:9px">
        ${['Migração do serviço antigo sem custo', 'Configuração dos aparelhos da equipe', 'Suporte por WhatsApp em português', 'Sem taxa de instalação']
          .map((x) => `<div class="row small" style="gap:8px"><span class="yes">${ico('check')}</span>${x}</div>`).join('')}
      </div>`;
  }

  function atualizarResumo() {
    const el = document.getElementById('resumo');
    if (el) el.innerHTML = resumo();
    const b = document.getElementById('b-finalizar');
    if (b) b.innerHTML = `Finalizar contratação ${OB.money(totais().total)}`;
  }

  function reRender() {
    const el = document.getElementById('checkout-passo');
    if (!el) return;
    el.innerHTML = passoAtual();
    atualizarResumo();
    ligarCheckout();
    /* atualiza a trilha de passos */
    document.querySelectorAll('.steps .step').forEach((s, i) => {
      const n = i + 1;
      s.classList.toggle('done', ped.passo > n);
      s.classList.toggle('on', ped.passo === n);
      s.querySelector('.n').textContent = ped.passo > n ? '✓' : n;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function ligarCheckout() {
    /* ---- passo 1 ---- */
    const dom = document.getElementById('c-dominio');
    if (dom) {
      dom.addEventListener('input', () => {
        ped.dominio = dom.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
        atualizarResumo();
      });
    }
    document.querySelectorAll('input[name="plano"]').forEach((r) => {
      r.addEventListener('change', () => { ped.planoId = r.value; reRender(); });
    });
    document.querySelectorAll('[data-cciclo]').forEach((b) => {
      b.addEventListener('click', () => { ped.ciclo = b.getAttribute('data-cciclo'); reRender(); });
    });
    const qtd = document.getElementById('c-qtd');
    if (qtd) {
      const setQtd = (v) => {
        ped.qtd = Math.max(1, Math.min(200, v || 1));
        qtd.value = ped.qtd;
        atualizarResumo();
      };
      qtd.addEventListener('change', () => setQtd(parseInt(qtd.value, 10)));
      document.querySelectorAll('[data-qtd]').forEach((b) => {
        b.addEventListener('click', () => setQtd(ped.qtd + parseInt(b.getAttribute('data-qtd'), 10)));
      });
    }
    const b1 = document.getElementById('b-passo1');
    if (b1) {
      b1.addEventListener('click', () => {
        const err = document.getElementById('e-dominio');
        err.classList.add('hidden');
        if (!UI.dominioValido(ped.dominio)) {
          err.textContent = 'Informe um domínio válido, como suaempresa.com.br';
          err.classList.remove('hidden');
          dom.setAttribute('aria-invalid', 'true');
          return;
        }
        if (OB.q.dominioPorNome(ped.dominio)) {
          err.textContent = 'Este domínio já está cadastrado. Faça login para gerenciá-lo.';
          err.classList.remove('hidden');
          return;
        }
        ped.passo = 2;
        reRender();
      });
    }

    /* ---- passo 2 ---- */
    UI.ligarMascara(document.getElementById('c-doc'), UI.mascaraDoc);
    UI.ligarMascara(document.getElementById('c-tel'), UI.mascaraTel);
    const senha = document.getElementById('c-senha');
    if (senha) {
      senha.addEventListener('input', () => {
        const f = UI.forcaSenha(senha.value);
        const bar = document.querySelector('#forca-bar > span');
        const txt = document.getElementById('forca-txt');
        const cores = ['var(--red)', 'var(--red)', 'var(--amber)', 'var(--green)', 'var(--green)'];
        const rot = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
        bar.style.width = (f / 4) * 100 + '%';
        bar.style.background = cores[f];
        txt.textContent = senha.value ? 'Segurança da senha: ' + rot[f] : 'Use letras, números e um símbolo.';
      });
    }
    const b2 = document.getElementById('b-passo2');
    if (b2) {
      b2.addEventListener('click', () => {
        const v = (id) => (document.getElementById(id) || {}).value || '';
        Object.assign(ped, {
          empresa: v('c-empresa').trim(), doc: v('c-doc').trim(), contato: v('c-contato').trim(),
          telefone: v('c-tel').trim(), cidade: v('c-cidade').trim(), uf: v('c-uf'),
          email: v('c-email').trim().toLowerCase(), senha: v('c-senha'),
        });
        const err = document.getElementById('e-passo2');
        err.classList.add('hidden');
        const falhar = (m) => { err.textContent = m; err.classList.remove('hidden'); };

        if (ped.empresa.length < 2) return falhar('Informe a razão social ou o seu nome.');
        if (UI.soDigitos(ped.doc).length < 11) return falhar('Informe um CNPJ ou CPF completo.');
        if (ped.contato.length < 3) return falhar('Informe o nome do responsável.');
        if (!UI.emailValido(ped.email)) return falhar('Informe um e-mail de acesso válido.');
        if (OB.q.usuarioPorEmail(ped.email)) return falhar('Já existe uma conta com esse e-mail. Faça login para contratar mais domínios.');
        if (ped.senha.length < 8) return falhar('A senha precisa ter no mínimo 8 caracteres.');

        ped.passo = 3;
        reRender();
      });
    }
    const bv2 = document.getElementById('b-voltar2');
    if (bv2) bv2.addEventListener('click', () => { ped.passo = 1; reRender(); });

    /* ---- passo 3 ---- */
    document.querySelectorAll('input[name="metodo"]').forEach((r) => {
      r.addEventListener('change', () => { ped.metodo = r.value; reRender(); });
    });
    const bc = document.getElementById('b-cupom');
    if (bc) {
      bc.addEventListener('click', () => {
        const cod = document.getElementById('c-cupom').value.trim().toUpperCase();
        const msg = document.getElementById('msg-cupom');
        const c = OB.q.cupomPorCodigo(cod);
        if (!c) {
          ped.cupom = null;
          msg.textContent = 'Cupom inválido ou expirado.';
          msg.style.color = 'var(--red)';
        } else {
          ped.cupom = c;
          msg.textContent = `Cupom ${c.codigo} aplicado: ${c.tipo === 'percentual' ? c.valor + '% de desconto' : OB.money(c.valor) + ' de desconto'}.`;
          msg.style.color = 'var(--green)';
        }
        atualizarResumo();
      });
    }
    const bv3 = document.getElementById('b-voltar3');
    if (bv3) bv3.addEventListener('click', () => { ped.passo = 2; reRender(); });

    const bf = document.getElementById('b-finalizar');
    if (bf) {
      bf.addEventListener('click', () => {
        const err = document.getElementById('e-passo3');
        err.classList.add('hidden');
        if (!document.getElementById('c-aceite').checked) {
          err.textContent = 'Para continuar, aceite os termos de uso e a política de privacidade.';
          err.classList.remove('hidden');
          return;
        }
        const parar = UI.carregando(bf, 'Processando');
        setTimeout(async () => {
          const { conta, usuario } = OB.criarConta({
            empresa: ped.empresa, doc: ped.doc, tipo: UI.soDigitos(ped.doc).length > 11 ? 'pj' : 'pf',
            contato: ped.contato, email: ped.email, senha: await OB.hashSenha(ped.senha),
            telefone: ped.telefone, cidade: ped.cidade, uf: ped.uf, origem: 'site',
          });
          const dom = ped.dominio;
          OB.criarDominio({
            contaId: conta.id, dominio: dom,
            planoId: ped.planoId, ciclo: ped.ciclo, qtd: ped.qtd,
            nomeContato: 'Contato ' + ped.empresa,
          });
          await Auth.entrar(ped.email, ped.senha);
          parar();
          ped = null;
          UI.toast('ok', 'Contratação concluída', 'Criamos contato@' + dom + '. Agora falta apontar o DNS.');
          location.hash = '#/app';
        }, 900);
      });
    }
  }

  /* ---- formulário de volume ---- */
  function ligarVolume() {
    const f = document.getElementById('f-volume');
    if (!f) return;
    UI.ligarMascara(document.getElementById('v-tel'), UI.mascaraTel);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('v-nome').value.trim();
      const email = document.getElementById('v-email').value.trim();
      if (nome.length < 2) return UI.toast('err', 'Falta o nome', 'Diga como podemos te chamar.');
      if (!UI.emailValido(email)) return UI.toast('err', 'E-mail inválido', 'Confira o endereço digitado.');
      const btn = f.querySelector('button[type="submit"]');
      const parar = UI.carregando(btn, 'Enviando');
      setTimeout(() => {
        parar();
        f.reset();
        UI.toast('ok', 'Recebemos o seu pedido', 'Respondemos em até duas horas úteis com a proposta.');
        OB.log('Pedido de proposta por volume', nome + ' (' + email + ')', 'info', 'Site');
      }, 700);
    });
  }

  /* ---- menu mobile ---- */
  function ligarHeader() {
    const t = document.getElementById('nav-toggle');
    const n = document.getElementById('nav-principal');
    if (!t || !n) return;
    t.addEventListener('click', () => {
      const aberto = n.classList.toggle('open');
      t.setAttribute('aria-expanded', aberto);
      t.innerHTML = ico(aberto ? 'x' : 'menu');
    });
    n.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        n.classList.remove('open');
        t.setAttribute('aria-expanded', 'false');
        t.innerHTML = ico('menu');
      }
    });
  }

  function limparPedido() { ped = null; }

  return {
    home, planos, recursos, migracao, ajuda, juridico, checkout,
    ligarCiclo, ligarAjuda, ligarCheckout, ligarVolume, ligarHeader, limparPedido,
    cabecalho, rodape, pagina, wppLink,
  };
})();
