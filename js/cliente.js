/* ============================================================
   OutBox Mail — Área do cliente
   ============================================================ */
window.Cliente = (function () {
  const E = UI.esc;

  function menu(ativo) {
    const conta = Auth.conta();
    const doms = conta ? OB.q.dominiosDaConta(conta.id) : [];
    const caixas = conta ? OB.q.caixasDaConta(conta.id).filter((c) => c.tipo === 'caixa') : [];
    const abertas = conta ? OB.q.faturasDaConta(conta.id).filter((f) => f.status !== 'paga') : [];
    return [
      { sec: 'Gestão' },
      { id: 'painel', rota: '#/app', nome: 'Visão geral', ico: 'layout' },
      { id: 'dominios', rota: '#/app/dominios', nome: 'Domínios', ico: 'globe', count: doms.length },
      { id: 'caixas', rota: '#/app/caixas', nome: 'Caixas de e-mail', ico: 'mail', count: caixas.length },
      { sec: 'Financeiro' },
      { id: 'faturas', rota: '#/app/faturas', nome: 'Faturas', ico: 'receipt', count: abertas.length || null },
      { id: 'plano', rota: '#/app/plano', nome: 'Plano e uso', ico: 'package' },
      { sec: 'Conta' },
      { id: 'ajuda', rota: '#/app/ajuda', nome: 'Como configurar', ico: 'help' },
      { id: 'config', rota: '#/app/config', nome: 'Dados e senha', ico: 'settings' },
    ].map((i) => ({ ...i, ativo: i.id === ativo }));
  }

  /* ============================================================
     VISÃO GERAL
     ============================================================ */
  function painel() {
    const conta = Auth.conta();
    const doms = OB.q.dominiosDaConta(conta.id);
    const caixas = OB.q.caixasDaConta(conta.id).filter((c) => c.tipo === 'caixa');
    const usadoMb = caixas.reduce((s, c) => s + c.usado_mb, 0);
    const cotaMb = caixas.reduce((s, c) => s + c.cota_gb * 1024, 0);
    const faturas = OB.q.faturasDaConta(conta.id);
    const proxima = faturas.find((f) => f.status !== 'paga');
    const pendentes = doms.filter((d) => d.status === 'pendente');
    const suspensos = doms.filter((d) => d.status === 'suspenso');

    const avisos = [];
    if (suspensos.length) {
      avisos.push(`<div class="card" style="border-color:var(--red);background:var(--red-soft)">
        <div class="row" style="gap:12px;align-items:flex-start">
          <span class="dns-state dns-err">${ico('alert')}</span>
          <div class="grow">
            <h3 style="font-size:1rem">Domínio suspenso por falta de pagamento</h3>
            <p class="small soft mt-8">O domínio ${E(suspensos[0].dominio)} parou de receber mensagens novas. O conteúdo das caixas está preservado e volta ao normal assim que o pagamento for confirmado.</p>
            <a class="btn btn-sm btn-primary mt-16" href="#/app/faturas">Regularizar agora</a>
          </div>
        </div>
      </div>`);
    }
    pendentes.forEach((d) => {
      avisos.push(`<div class="card" style="border-color:var(--amber);background:var(--amber-soft)">
        <div class="row" style="gap:12px;align-items:flex-start">
          <span class="dns-state dns-pend">${ico('clock')}</span>
          <div class="grow">
            <h3 style="font-size:1rem">Falta apontar o DNS de ${E(d.dominio)}</h3>
            <p class="small soft mt-8">As caixas já estão criadas, mas as mensagens só passam a chegar depois que os registros forem publicados no seu provedor de domínio. Leva de alguns minutos até 24 horas para propagar.</p>
            <a class="btn btn-sm btn-primary mt-16" href="#/app/dominio/${d.id}">Ver o que publicar ${ico('arrowRight')}</a>
          </div>
        </div>
      </div>`);
    });

    OB.q.assinaturasDaConta(conta.id).forEach((a) => {
      const criadas = OB.q.caixasDoDominio(a.dominio_id).filter((c) => c.tipo === 'caixa').length;
      const contratadas = a.qtd_contratada || 0;
      if (contratadas > criadas) {
        const d = OB.q.dominioPorId(a.dominio_id);
        avisos.push(`<div class="card" style="border-color:var(--blue)">
          <div class="row" style="gap:12px;align-items:flex-start">
            <span class="dns-state" style="background:var(--blue-soft);color:var(--blue)">${ico('mailPlus')}</span>
            <div class="grow">
              <h3 style="font-size:1rem">${contratadas - criadas === 1 ? 'Falta 1 endereço' : `Faltam ${contratadas - criadas} endereços`} para criar</h3>
              <p class="small soft mt-8">Você contratou ${contratadas} ${contratadas === 1 ? 'caixa' : 'caixas'} em ${E(d.dominio)} e criou ${criadas}. A cobrança acompanha as caixas que existirem, então crie os endereços da equipe quando quiser.</p>
              <a class="btn btn-sm btn-ghost mt-16" href="#/app/dominio/${a.dominio_id}">Criar endereços ${ico('arrowRight')}</a>
            </div>
          </div>
        </div>`);
      }
    });

    const conteudo = `
      ${avisos.length ? `<div class="col mb-24" style="gap:12px">${avisos.join('')}</div>` : ''}

      <div class="kpis mb-24">
        ${kpi('Caixas ativas', caixas.filter((c) => c.status === 'ativa').length, 'mail', 'brand',
          `${OB.q.caixasDaConta(conta.id).filter((c) => c.tipo !== 'caixa').length} apelidos sem custo`)}
        ${kpi('Espaço usado', OB.gb(usadoMb), 'hardDrive', 'blue',
          `de ${OB.gb(cotaMb)} contratados`)}
        ${kpi('Domínios', doms.length, 'globe', 'violet',
          `${doms.filter((d) => d.status === 'ativo').length} em pleno funcionamento`)}
        ${kpi('Próxima fatura', proxima ? OB.money(proxima.valor) : 'Em dia', 'receipt',
          proxima && proxima.status === 'vencida' ? 'red' : 'green',
          proxima ? 'Vence em ' + OB.fdate(proxima.vencimento) : 'Nenhuma fatura em aberto')}
      </div>

      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
        <div class="card">
          <div class="card-head">
            <span class="card-title">Seus domínios</span>
            <a class="btn btn-sm btn-ghost" href="#/app/dominios">Ver todos</a>
          </div>
          ${doms.length ? doms.map(linhaDominio).join('') : vazio('globe', 'Nenhum domínio', 'Contrate um plano para começar.', '#/contratar', 'Contratar')}
        </div>

        <div class="card">
          <div class="card-head">
            <span class="card-title">Caixas com mais espaço usado</span>
            <a class="btn btn-sm btn-ghost" href="#/app/caixas">Gerenciar</a>
          </div>
          ${caixas.length
            ? caixas.slice().sort((a, b) => b.usado_mb - a.usado_mb).slice(0, 5).map((c) => {
              const dom = OB.q.dominioPorId(c.dominio_id);
              const p = Math.min(100, (c.usado_mb / (c.cota_gb * 1024)) * 100);
              const cls = p > 90 ? 'crit' : p > 70 ? 'warn' : 'ok';
              return `<div style="padding:11px 0;border-bottom:1px solid var(--border)">
                <div class="row-between" style="gap:8px">
                  <span class="small t-strong truncate">${E(c.local)}@${E(dom ? dom.dominio : '')}</span>
                  <span class="xs muted nowrap">${OB.gb(c.usado_mb)} de ${c.cota_gb} GB</span>
                </div>
                <div class="bar ${cls} mt-8"><span style="width:${p}%"></span></div>
              </div>`;
            }).join('')
            : vazio('mail', 'Nenhuma caixa criada', 'Crie o primeiro endereço do seu domínio.', '#/app/caixas', 'Criar caixa')}
        </div>
      </div>

      <div class="grid mt-24" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
        <div class="card">
          <div class="card-head"><span class="card-title">Últimas faturas</span><a class="btn btn-sm btn-ghost" href="#/app/faturas">Ver todas</a></div>
          ${faturas.length ? faturas.slice(0, 4).map((f) => `
            <div class="row-between" style="padding:11px 0;border-bottom:1px solid var(--border)">
              <div>
                <div class="small t-strong">Fatura ${E(f.numero)}</div>
                <div class="xs muted">Vence em ${OB.fdate(f.vencimento)}</div>
              </div>
              <div class="row" style="gap:10px">
                <span class="small t-strong">${OB.money(f.valor)}</span>
                ${UI.badge(f.status)}
              </div>
            </div>`).join('') : vazio('receipt', 'Sem faturas', 'Nada cobrado até agora.')}
        </div>

        <div class="card">
          <div class="card-head"><span class="card-title">Precisa de ajuda?</span></div>
          <div class="col" style="gap:10px">
            <a class="row card-hover card" style="gap:12px;padding:14px" href="#/app/ajuda">
              <span class="kpi-ico" style="background:var(--brand-soft);color:var(--brand);width:36px;height:36px">${ico('smartphone')}</span>
              <span class="grow"><span class="small t-strong" style="display:block">Configurar no celular</span><span class="xs muted">iPhone, Android e Outlook</span></span>
              ${ico('chevronRight')}
            </a>
            <a class="row card-hover card" style="gap:12px;padding:14px" href="${DNS.HOSTS.webmail}" target="_blank" rel="noopener">
              <span class="kpi-ico" style="background:var(--blue-soft);color:var(--blue);width:36px;height:36px">${ico('globe')}</span>
              <span class="grow"><span class="small t-strong" style="display:block">Abrir o webmail</span><span class="xs muted">Acesso pelo navegador</span></span>
              ${ico('external')}
            </a>
            <a class="row card-hover card" style="gap:12px;padding:14px" href="${Site.wppLink('Olá! Preciso de ajuda com o OutBox Mail.')}" target="_blank" rel="noopener">
              <span class="kpi-ico" style="background:var(--green-soft);color:var(--green);width:36px;height:36px">${ico('whatsapp')}</span>
              <span class="grow"><span class="small t-strong" style="display:block">Falar com o suporte</span><span class="xs muted">Seg a sex, 8h30 às 18h</span></span>
              ${ico('external')}
            </a>
          </div>
        </div>
      </div>`;

    return App.shell({
      itens: menu('painel'),
      titulo: 'Olá, ' + Auth.atual().nome.split(' ')[0],
      sub: 'Aqui está o resumo de ' + E(conta.empresa) + '.',
      conteudo,
    });
  }

  const kpi = (rot, val, i, cor, sub) => `<div class="kpi">
    <div class="kpi-top">
      <span class="kpi-label">${rot}</span>
      <span class="kpi-ico" style="background:var(--${cor}-soft);color:var(--${cor === 'brand' ? 'brand' : cor})">${ico(i)}</span>
    </div>
    <div class="kpi-value">${val}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
  </div>`;

  const vazio = (i, t, d, href, cta) => `<div class="empty">
    <div class="empty-ico">${ico(i)}</div>
    <h3>${t}</h3><p>${d}</p>
    ${href ? `<a class="btn btn-primary btn-sm" href="${href}">${cta}</a>` : ''}
  </div>`;

  function linhaDominio(d) {
    const p = DNS.progresso(d.dns);
    const caixas = OB.q.caixasDoDominio(d.id).filter((c) => c.tipo === 'caixa').length;
    return `<a class="row-between card-hover" style="padding:14px 0;border-bottom:1px solid var(--border);gap:12px" href="#/app/dominio/${d.id}">
      <div style="min-width:0">
        <div class="row" style="gap:8px">
          <span class="small t-strong truncate">${E(d.dominio)}</span>
          ${UI.badge(d.status)}
        </div>
        <div class="xs muted mt-8">${OB.planoPor(d.plano_id).nome}, ${caixas} ${caixas === 1 ? 'caixa' : 'caixas'}${d.status === 'pendente' ? `, DNS ${p}% publicado` : ''}</div>
      </div>
      ${ico('chevronRight')}
    </a>`;
  }

  /* ============================================================
     DOMÍNIOS
     ============================================================ */
  function dominios() {
    const conta = Auth.conta();
    const doms = OB.q.dominiosDaConta(conta.id);
    const conteudo = `
      <div class="row-between mb-24">
        <p class="small muted">Cada domínio tem o seu próprio plano e a sua própria cobrança.</p>
        <a class="btn btn-primary btn-sm" href="#/contratar">${ico('plus')} Adicionar domínio</a>
      </div>
      ${doms.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        ${doms.map((d) => {
          const p = DNS.progresso(d.dns);
          const caixas = OB.q.caixasDoDominio(d.id);
          const a = OB.q.assinaturaDoDominio(d.id);
          return `<article class="card card-hover">
            <div class="row-between mb-16">
              <span class="kpi-ico" style="background:var(--brand-soft);color:var(--brand)">${ico('globe')}</span>
              ${UI.badge(d.status)}
            </div>
            <h3 style="font-size:1.05rem;word-break:break-all">${E(d.dominio)}</h3>
            <dl class="dl mt-16">
              <div><dt>Plano</dt><dd>${OB.planoPor(d.plano_id).nome}</dd></div>
              <div><dt>Caixas</dt><dd>${caixas.filter((c) => c.tipo === 'caixa').length}</dd></div>
              <div><dt>Mensalidade</dt><dd>${a ? OB.money(a.valor_total) : '–'}</dd></div>
            </dl>
            ${d.status === 'pendente' ? `<div class="mt-16">
              <div class="row-between xs muted mb-8"><span>DNS publicado</span><span>${p}%</span></div>
              <div class="bar ${p === 100 ? 'ok' : 'warn'}"><span style="width:${p}%"></span></div>
            </div>` : ''}
            <a class="btn btn-ghost btn-block mt-24" href="#/app/dominio/${d.id}">Gerenciar ${ico('arrowRight')}</a>
          </article>`;
        }).join('')}
      </div>` : vazio('globe', 'Nenhum domínio ainda', 'Contrate um plano para começar a usar o e-mail da sua empresa.', '#/contratar', 'Ver planos')}`;

    return App.shell({ itens: menu('dominios'), titulo: 'Domínios', sub: 'Gerencie os domínios e o DNS de cada um.', conteudo });
  }

  /* ---------- detalhe do domínio ---------- */
  let abaDominio = 'dns';

  function dominio(id) {
    const d = OB.q.dominioPorId(id);
    if (!d || d.conta_id !== Auth.conta().id) {
      return App.shell({ itens: menu('dominios'), titulo: 'Domínio não encontrado', conteudo: vazio('alert', 'Não encontramos esse domínio', 'Ele pode ter sido removido.', '#/app/dominios', 'Voltar') });
    }
    const conteudo = `
      <div class="tabs">
        <button class="tab ${abaDominio === 'dns' ? 'active' : ''}" data-aba="dns">Apontamento de DNS</button>
        <button class="tab ${abaDominio === 'caixas' ? 'active' : ''}" data-aba="caixas">Caixas</button>
        <button class="tab ${abaDominio === 'plano' ? 'active' : ''}" data-aba="plano">Plano</button>
      </div>
      <div id="aba-corpo">${abaDominio === 'dns' ? abaDns(d) : abaDominio === 'caixas' ? abaCaixas(d) : abaPlano(d)}</div>`;

    return App.shell({
      itens: menu('dominios'),
      titulo: d.dominio,
      sub: OB.planoPor(d.plano_id).nome + ', criado em ' + OB.fdate(d.criado_em),
      voltar: '#/app/dominios',
      acoes: UI.badge(d.status),
      conteudo,
    });
  }

  function abaDns(d) {
    const regs = DNS.registros(d.dominio);
    const p = DNS.progresso(d.dns);
    return `<div class="fade-in">
      <div class="card mb-24">
        <div class="row-between">
          <div>
            <h3 style="font-size:1.05rem">${p === 100 ? 'DNS configurado corretamente' : 'Publique estes registros no seu domínio'}</h3>
            <p class="small muted mt-8" style="max-width:62ch">${p === 100
              ? 'Está tudo apontando para os nossos servidores. Se algum registro sair do ar, avisamos por e-mail.'
              : 'Entre no painel onde o domínio foi registrado, por exemplo Registro.br, GoDaddy, Cloudflare ou Hostinger, e crie os registros abaixo na zona de DNS.'}</p>
          </div>
          <button class="btn btn-primary btn-sm" id="b-verificar">${ico('refresh')} Verificar agora</button>
        </div>
        <div class="mt-24">
          <div class="row-between xs muted mb-8"><span>Progresso da configuração</span><span>${p}% dos registros obrigatórios</span></div>
          <div class="bar ${p === 100 ? 'ok' : 'warn'}"><span style="width:${p}%"></span></div>
        </div>
        <p class="xs muted mt-16" id="modo-verificacao">A verificação consulta o DNS público na hora. A propagação pode levar até 24 horas.</p>
      </div>

      <div class="col" style="gap:12px" id="lista-dns">
        ${regs.map((r) => itemDns(r, d)).join('')}
      </div>

      <div class="card mt-24">
        <h3 style="font-size:1.02rem" class="mb-16">Prefere que a gente faça?</h3>
        <p class="small soft">Se você tiver o acesso do painel do domínio, a nossa equipe publica os registros para você sem custo. Envie o acesso pelo WhatsApp do suporte.</p>
        <a class="btn btn-ghost btn-sm mt-16" href="${Site.wppLink('Olá! Quero ajuda para apontar o DNS do domínio ' + d.dominio)}" target="_blank" rel="noopener">${ico('whatsapp')} Pedir ajuda no WhatsApp</a>
      </div>
    </div>`;
  }

  function itemDns(r, d) {
    const ok = r.chave === 'mx2' ? d.dns.mx : d.dns[r.chave];
    const opcional = r.opcional;
    return `<div class="dns-item" data-dns="${r.chave}">
      <span class="dns-state ${ok ? 'dns-ok' : (opcional ? 'dns-pend' : 'dns-pend')}">${ico(ok ? 'check' : 'clock')}</span>
      <div class="dns-info">
        <h4>${E(r.titulo)}
          <span class="badge badge-mut">${r.tipo}</span>
          ${opcional ? '<span class="badge badge-blue">Opcional</span>' : ''}
          ${ok ? '<span class="badge badge-green"><span class="dot"></span>Publicado</span>' : '<span class="badge badge-amber"><span class="dot"></span>Pendente</span>'}
        </h4>
        <p>${E(r.desc)}</p>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
          <div>
            <div class="xs muted mb-8">Nome / Host</div>
            ${UI.linhaCopia(r.nome, 'nome do registro')}
          </div>
          ${r.prioridade ? `<div>
            <div class="xs muted mb-8">Prioridade</div>
            ${UI.linhaCopia(String(r.prioridade), 'prioridade')}
          </div>` : ''}
          <div style="grid-column:1/-1">
            <div class="xs muted mb-8">Valor / Destino</div>
            ${UI.linhaCopia(r.valor, 'valor do registro')}
          </div>
        </div>
        <div class="xs muted mt-8 hidden" data-encontrado="${r.chave}"></div>
      </div>
    </div>`;
  }

  function abaCaixas(d) {
    const caixas = OB.q.caixasDoDominio(d.id);
    return `<div class="fade-in">
      <div class="row-between mb-16">
        <p class="small muted">Caixas contam na mensalidade. Apelidos e redirecionamentos não são cobrados.</p>
        <button class="btn btn-primary btn-sm" data-nova-caixa="${d.id}">${ico('mailPlus')} Nova caixa</button>
      </div>
      ${caixas.length ? tabelaCaixas(caixas, d) : vazio('mail', 'Nenhum endereço criado', 'Crie o primeiro endereço deste domínio.')}
    </div>`;
  }

  function tabelaCaixas(caixas, dom) {
    return `<div class="table-wrap">
      <table>
        <thead><tr>
          <th>Endereço</th><th>Tipo</th><th>Espaço</th><th>Status</th><th class="td-right">Ações</th>
        </tr></thead>
        <tbody>
          ${caixas.map((c) => {
            const d = dom || OB.q.dominioPorId(c.dominio_id);
            const usoP = Math.min(100, (c.usado_mb / (c.cota_gb * 1024)) * 100);
            const cls = usoP > 90 ? 'crit' : usoP > 70 ? 'warn' : 'ok';
            return `<tr>
              <td>
                <div class="row" style="gap:10px">
                  <span class="avatar" style="background:${OB.corDe(c.local)};width:32px;height:32px;font-size:.72rem">${OB.iniciais(c.nome)}</span>
                  <div style="min-width:0">
                    <div class="t-strong truncate">${E(c.local)}@${E(d.dominio)}</div>
                    <div class="xs muted truncate">${E(c.nome)}</div>
                  </div>
                </div>
              </td>
              <td>${c.tipo === 'caixa'
                ? '<span class="badge badge-brand">Caixa</span>'
                : c.tipo === 'alias'
                  ? `<span class="badge badge-blue">Apelido</span><div class="xs muted mt-8 truncate">para ${E(c.destino)}</div>`
                  : `<span class="badge badge-violet">Redireciona</span><div class="xs muted mt-8 truncate">para ${E(c.destino)}</div>`}</td>
              <td style="min-width:130px">
                ${c.tipo === 'caixa'
                  ? `<div class="xs muted mb-8">${OB.gb(c.usado_mb)} de ${c.cota_gb} GB</div>
                     <div class="bar ${cls}"><span style="width:${usoP}%"></span></div>`
                  : '<span class="muted small">Não ocupa espaço</span>'}
              </td>
              <td>${UI.badge(c.status)}</td>
              <td class="td-right td-actions">
                ${c.tipo === 'caixa' ? `<button class="btn-icon" data-senha="${c.id}" aria-label="Redefinir senha de ${E(c.local)}">${ico('key')}</button>` : ''}
                <button class="btn-icon" data-editar="${c.id}" aria-label="Editar ${E(c.local)}">${ico('edit')}</button>
                <button class="btn-icon" data-excluir="${c.id}" aria-label="Excluir ${E(c.local)}">${ico('trash')}</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  function abaPlano(d) {
    const a = OB.q.assinaturaDoDominio(d.id);
    const p = OB.planoPor(d.plano_id);
    const caixas = OB.q.caixasDoDominio(d.id).filter((c) => c.tipo === 'caixa').length;
    return `<div class="fade-in grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
      <div class="card">
        <div class="card-head"><span class="card-title">Plano atual</span>${UI.badge(a ? a.status : 'ativa')}</div>
        <div class="row-between mb-16">
          <div>
            <div style="font-size:1.4rem;font-weight:800;letter-spacing:-.03em">${E(p.nome)}</div>
            <div class="small muted">${E(p.resumo)}</div>
          </div>
          <div class="td-right">
            <div style="font-size:1.3rem;font-weight:800">${OB.money(a ? a.valor_total : 0)}</div>
            <div class="xs muted">por mês</div>
          </div>
        </div>
        <dl class="dl">
          <div><dt>Caixas</dt><dd>${caixas}</dd></div>
          <div><dt>Por caixa, por mês</dt><dd>${OB.money(a ? a.valor_unit : OB.precoUnit(p.id, 'mensal'))}</dd></div>
          <div><dt>Ciclo</dt><dd>${E(OB.cicloPor(a ? a.ciclo : 'mensal').nome)}</dd></div>
          <div><dt>Cobrado a cada ciclo</dt><dd>${OB.money(a ? (a.valor_ciclo || a.valor_total) : 0)}</dd></div>
          <div><dt>Próxima cobrança</dt><dd>${a ? OB.fdate(a.proxima_cobranca) : '–'}</dd></div>
        </dl>
        <div class="row mt-24 wrap-gap">
          <button class="btn btn-ghost btn-sm" data-trocar-plano="${d.id}">Trocar de plano</button>
          <button class="btn btn-ghost btn-sm" data-trocar-ciclo="${d.id}">Mudar o ciclo</button>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><span class="card-title">O que está incluso</span></div>
        <ul class="plan-feats">
          ${p.recursos.map(([txt, tem]) => `<li class="${tem ? '' : 'off'}">${ico(tem ? 'check' : 'x')}<span>${E(txt)}</span></li>`).join('')}
        </ul>
        <div class="mt-24" style="padding-top:16px;border-top:1px solid var(--border)">
          <h4 class="mb-8">Encerrar este domínio</h4>
          <p class="xs muted">O cancelamento vale a partir do fim do período já pago. Antes de encerrar, exportamos as mensagens e enviamos o arquivo para você.</p>
          <button class="btn btn-danger btn-sm mt-16" data-cancelar="${d.id}">Solicitar cancelamento</button>
        </div>
      </div>
    </div>`;
  }

  /* ============================================================
     CAIXAS (todas)
     ============================================================ */
  function caixas() {
    const conta = Auth.conta();
    const doms = OB.q.dominiosDaConta(conta.id);
    const todas = OB.q.caixasDaConta(conta.id);
    const conteudo = `
      <div class="row-between mb-24 wrap-gap">
        <div class="row wrap-gap" style="gap:10px">
          <input class="input" id="busca-caixa" placeholder="Buscar endereço" style="max-width:260px">
          <select class="select" id="filtro-dominio" style="max-width:230px">
            <option value="">Todos os domínios</option>
            ${doms.map((d) => `<option value="${d.id}">${E(d.dominio)}</option>`).join('')}
          </select>
        </div>
        ${doms.length ? `<button class="btn btn-primary btn-sm" data-nova-caixa="${doms[0].id}">${ico('mailPlus')} Nova caixa</button>` : ''}
      </div>
      <div id="lista-caixas">${todas.length ? tabelaCaixas(todas) : vazio('mail', 'Nenhum endereço criado', 'Crie o primeiro endereço da sua empresa.')}</div>`;

    return App.shell({ itens: menu('caixas'), titulo: 'Caixas de e-mail', sub: 'Crie, edite e remova os endereços da sua empresa.', conteudo });
  }

  function filtrarCaixas() {
    const termo = (document.getElementById('busca-caixa') || {}).value || '';
    const dom = (document.getElementById('filtro-dominio') || {}).value || '';
    let lista = OB.q.caixasDaConta(Auth.conta().id);
    if (dom) lista = lista.filter((c) => c.dominio_id === dom);
    if (termo.trim()) {
      const t = termo.trim().toLowerCase();
      lista = lista.filter((c) => {
        const d = OB.q.dominioPorId(c.dominio_id);
        return (c.local + '@' + (d ? d.dominio : '') + ' ' + c.nome).toLowerCase().includes(t);
      });
    }
    const el = document.getElementById('lista-caixas');
    if (el) {
      el.innerHTML = lista.length ? tabelaCaixas(lista)
        : vazio('search', 'Nada encontrado', 'Nenhum endereço corresponde à busca.');
      ligarAcoesCaixa();
    }
  }

  /* ============================================================
     FATURAS
     ============================================================ */
  function faturas() {
    const conta = Auth.conta();
    const lista = OB.q.faturasDaConta(conta.id);
    const abertas = lista.filter((f) => f.status !== 'paga');
    const totalAberto = abertas.reduce((s, f) => s + f.valor, 0);
    const conteudo = `
      ${abertas.length ? `<div class="card mb-24" style="border-color:${abertas.some((f) => f.status === 'vencida') ? 'var(--red)' : 'var(--amber)'}">
        <div class="row-between wrap-gap">
          <div>
            <h3 style="font-size:1.05rem">${abertas.length === 1 ? 'Você tem 1 fatura em aberto' : `Você tem ${abertas.length} faturas em aberto`}</h3>
            <p class="small muted mt-8">Total de ${OB.money(totalAberto)}. Após 5 dias do vencimento o domínio é suspenso, mas nada é apagado.</p>
          </div>
          <button class="btn btn-primary" data-pagar="${abertas[0].id}">Pagar ${OB.money(abertas[0].valor)}</button>
        </div>
      </div>` : ''}

      ${lista.length ? `<div class="table-wrap">
        <table>
          <thead><tr><th>Fatura</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th><th class="td-right">Ações</th></tr></thead>
          <tbody>
            ${lista.map((f) => `<tr>
              <td class="t-strong mono">#${E(f.numero)}</td>
              <td>${new Date(f.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</td>
              <td>${OB.fdate(f.vencimento)}</td>
              <td class="t-strong">${OB.money(f.valor)}</td>
              <td>${UI.badge(f.status)}${f.pago_em ? `<div class="xs muted mt-8">${E(f.metodo || '')}</div>` : ''}</td>
              <td class="td-right td-actions">
                ${f.status === 'paga'
                  ? `<button class="btn btn-sm btn-ghost" data-recibo="${f.id}">Recibo</button>`
                  : `<button class="btn btn-sm btn-primary" data-pagar="${f.id}">Pagar</button>`}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : vazio('receipt', 'Nenhuma fatura', 'Assim que a primeira cobrança for gerada ela aparece aqui.')}`;

    return App.shell({ itens: menu('faturas'), titulo: 'Faturas', sub: 'Histórico de cobranças e pagamentos.', conteudo });
  }

  /* ============================================================
     PLANO E USO
     ============================================================ */
  function plano() {
    const conta = Auth.conta();
    const assins = OB.q.assinaturasDaConta(conta.id);
    const total = assins.filter((a) => a.status !== 'cancelada').reduce((s, a) => s + a.valor_total, 0);
    const conteudo = `
      <div class="kpis mb-24">
        ${kpi('Custo mensal total', OB.money(total), 'wallet', 'brand', assins.length + (assins.length === 1 ? ' assinatura' : ' assinaturas'))}
        ${kpi('Caixas contratadas', assins.reduce((s, a) => s + a.qtd, 0), 'mail', 'blue', 'Somando todos os domínios')}
        ${kpi('Economia pelo prazo', OB.money(assins.reduce((s, a) =>
          s + OB.economiaCiclo(a.plano_id, a.ciclo) * a.qtd, 0)), 'trendUp', 'green',
          'Comparado a pagar mês a mês')}
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Domínio</th><th>Plano</th><th>Caixas</th><th>Ciclo</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            ${assins.map((a) => {
              const d = OB.q.dominioPorId(a.dominio_id);
              return `<tr>
                <td class="t-strong">${E(d ? d.dominio : '–')}</td>
                <td>${OB.planoPor(a.plano_id).nome}</td>
                <td>${a.qtd}</td>
                <td>${E(OB.cicloPor(a.ciclo).nome)}</td>
                <td class="t-strong">${OB.money(a.valor_total)}<div class="xs muted mt-8">por mês</div></td>
                <td>${UI.badge(a.status)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="card mt-24">
        <h3 style="font-size:1.05rem" class="mb-16">Uso de espaço por caixa</h3>
        ${OB.q.caixasDaConta(conta.id).filter((c) => c.tipo === 'caixa')
          .sort((a, b) => b.usado_mb - a.usado_mb).map((c) => {
            const d = OB.q.dominioPorId(c.dominio_id);
            const p = Math.min(100, (c.usado_mb / (c.cota_gb * 1024)) * 100);
            const cls = p > 90 ? 'crit' : p > 70 ? 'warn' : 'ok';
            return `<div style="padding:11px 0;border-bottom:1px solid var(--border)">
              <div class="row-between" style="gap:8px">
                <span class="small t-strong truncate">${E(c.local)}@${E(d ? d.dominio : '')}</span>
                <span class="xs muted nowrap">${OB.gb(c.usado_mb)} de ${c.cota_gb} GB (${Math.round(p)}%)</span>
              </div>
              <div class="bar ${cls} mt-8"><span style="width:${p}%"></span></div>
              ${p > 90 ? '<div class="xs mt-8" style="color:var(--red)">Espaço quase no limite. Considere subir de plano para não parar de receber.</div>' : ''}
            </div>`;
          }).join('')}
      </div>`;

    return App.shell({ itens: menu('plano'), titulo: 'Plano e uso', sub: 'Quanto você paga e quanto está usando.', conteudo });
  }

  /* ============================================================
     AJUDA
     ============================================================ */
  function ajuda() {
    const conteudo = `
      <div class="tabs" role="tablist">
        ${DNS.TUTORIAIS.map((t, i) => `<button class="tab ${i === 0 ? 'active' : ''}" role="tab" data-tuto="${t.id}" aria-selected="${i === 0}">${E(t.nome)}</button>`).join('')}
      </div>
      <div id="corpo-tuto"></div>

      <div class="card mt-24">
        <h3 style="font-size:1.05rem" class="mb-16">Dados dos servidores</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Serviço</th><th>Servidor</th><th>Porta</th><th>Segurança</th></tr></thead>
            <tbody>
              ${DNS.SERVIDORES.map((s) => `<tr>
                <td class="t-strong">${E(s.nome)}</td>
                <td>${UI.linhaCopia(s.host, s.nome)}</td>
                <td class="mono">${E(s.porta)}</td>
                <td>${E(s.seg)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card mt-24">
        <div class="row-between wrap-gap">
          <div>
            <h3 style="font-size:1.05rem">Não resolveu?</h3>
            <p class="small muted mt-8">Chame no WhatsApp que a gente configura junto com você, por chamada de vídeo se precisar.</p>
          </div>
          <a class="btn btn-primary" href="${Site.wppLink('Olá! Preciso de ajuda para configurar meu e-mail.')}" target="_blank" rel="noopener">${ico('whatsapp')} Falar com o suporte</a>
        </div>
      </div>`;
    return App.shell({ itens: menu('ajuda'), titulo: 'Como configurar', sub: 'Passo a passo por aparelho e programa.', conteudo });
  }

  /* ============================================================
     CONFIGURAÇÕES
     ============================================================ */
  function config() {
    const u = Auth.atual();
    const c = Auth.conta();
    const conteudo = `
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
        <div class="card">
          <div class="card-head"><span class="card-title">Dados da empresa</span></div>
          <form id="f-conta" class="col" style="gap:14px">
            <div class="field"><label for="k-empresa">Razão social</label><input id="k-empresa" class="input" value="${E(c.empresa)}"></div>
            <div class="field"><label for="k-doc">CNPJ ou CPF</label><input id="k-doc" class="input" value="${E(c.doc)}"></div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
              <div class="field"><label for="k-cidade">Cidade</label><input id="k-cidade" class="input" value="${E(c.cidade)}"></div>
              <div class="field"><label for="k-uf">Estado</label><input id="k-uf" class="input" value="${E(c.uf)}" maxlength="2"></div>
            </div>
            <div class="field"><label for="k-tel">Telefone</label><input id="k-tel" class="input" value="${E(c.telefone)}"></div>
            <button class="btn btn-primary" type="submit">Salvar alterações</button>
          </form>
        </div>

        <div class="card">
          <div class="card-head"><span class="card-title">Acesso ao painel</span></div>
          <div class="row mb-24" style="gap:14px">
            <span class="avatar avatar-lg" style="background:${OB.corDe(u.nome)}">${OB.iniciais(u.nome)}</span>
            <div><div class="t-strong">${E(u.nome)}</div><div class="small muted">${E(u.email)}</div></div>
          </div>
          <form id="f-senha" class="col" style="gap:14px">
            <div class="field"><label for="k-atual">Senha atual</label>${UI.campoSenha('k-atual')}</div>
            <div class="field"><label for="k-nova">Nova senha</label>${UI.campoSenha('k-nova', 'Mínimo de 8 caracteres', 'new-password')}</div>
            <button class="btn btn-ghost" type="submit">Trocar senha</button>
          </form>
          <div class="mt-24" style="padding-top:16px;border-top:1px solid var(--border)">
            <h4 class="mb-8">Sessão</h4>
            <p class="xs muted mb-16">Encerra o acesso apenas neste aparelho.</p>
            <button class="btn btn-danger btn-sm" id="b-sair">${ico('logout')} Sair da conta</button>
          </div>
        </div>
      </div>`;
    return App.shell({ itens: menu('config'), titulo: 'Dados e senha', sub: 'Informações de cadastro e acesso.', conteudo });
  }

  /* ============================================================
     MODAIS E AÇÕES
     ============================================================ */
  function modalCaixa(dominioId, caixaId) {
    const dom = OB.q.dominioPorId(dominioId);
    const c = caixaId ? OB.q.caixaPorId(caixaId) : null;
    const senhaSugerida = UI.senhaForte();
    UI.modal({
      titulo: c ? 'Editar endereço' : 'Novo endereço',
      sub: c ? `${c.local}@${dom.dominio}` : `Criando em ${dom.dominio}`,
      corpo: `
        <div class="field">
          <label for="m-tipo">Tipo</label>
          <select id="m-tipo" class="select" ${c ? 'disabled' : ''}>
            <option value="caixa" ${!c || c.tipo === 'caixa' ? 'selected' : ''}>Caixa de e-mail, conta com senha e espaço próprio</option>
            <option value="alias" ${c && c.tipo === 'alias' ? 'selected' : ''}>Apelido, entrega em outra caixa sem custo</option>
            <option value="encaminhamento" ${c && c.tipo === 'encaminhamento' ? 'selected' : ''}>Redirecionamento para um e-mail externo</option>
          </select>
          <span class="field-hint" id="m-tipo-hint">Caixas contam na mensalidade. Apelidos e redirecionamentos não.</span>
        </div>
        <div class="field">
          <label for="m-local">Endereço</label>
          <div class="input-group">
            <input id="m-local" class="input" placeholder="contato" value="${c ? E(c.local) : ''}" ${c ? 'disabled' : ''}>
            <span class="addon">@${E(dom.dominio)}</span>
          </div>
          <span class="field-error hidden" id="m-erro"></span>
        </div>
        <div class="field">
          <label for="m-nome">Nome de exibição</label>
          <input id="m-nome" class="input" placeholder="Contato ${E(dom.dominio.split('.')[0])}" value="${c ? E(c.nome) : ''}">
          <span class="field-hint">É o nome que aparece para quem recebe as mensagens.</span>
        </div>
        <div class="field hidden" id="m-destino-wrap">
          <label for="m-destino">Entregar em</label>
          <input id="m-destino" class="input" placeholder="contato@${E(dom.dominio)}" value="${c ? E(c.destino) : ''}">
        </div>
        <div class="field" id="m-senha-wrap">
          <label for="m-senha">Senha inicial</label>
          <div class="input-group">
            <input id="m-senha" class="input mono" value="${senhaSugerida}">
            <button class="addon clickable" type="button" id="m-gerar">Gerar outra</button>
          </div>
          <span class="field-hint">Anote e entregue ao usuário. Ele pode trocar no primeiro acesso ao webmail.</span>
        </div>`,
      acoes: `<button class="btn btn-ghost" data-fechar>Cancelar</button>
              <button class="btn btn-primary" id="m-salvar">${c ? 'Salvar' : 'Criar endereço'}</button>`,
      aoAbrir: (bd) => {
        const tipo = bd.querySelector('#m-tipo');
        const destWrap = bd.querySelector('#m-destino-wrap');
        const senhaWrap = bd.querySelector('#m-senha-wrap');
        const hint = bd.querySelector('#m-tipo-hint');
        const sync = () => {
          const t = tipo.value;
          destWrap.classList.toggle('hidden', t === 'caixa');
          senhaWrap.classList.toggle('hidden', t !== 'caixa');
          hint.textContent = t === 'caixa'
            ? 'Caixas contam na mensalidade. Apelidos e redirecionamentos não.'
            : t === 'alias'
              ? 'O apelido entrega em uma caixa que já existe neste domínio.'
              : 'O redirecionamento envia a mensagem para um endereço de fora, sem guardar cópia.';
        };
        tipo.addEventListener('change', sync);
        sync();
        bd.querySelector('#m-gerar').addEventListener('click', () => {
          bd.querySelector('#m-senha').value = UI.senhaForte();
        });
        bd.querySelector('#m-salvar').addEventListener('click', () => {
          const erro = bd.querySelector('#m-erro');
          erro.classList.add('hidden');
          const local = bd.querySelector('#m-local').value.trim().toLowerCase();
          const nome = bd.querySelector('#m-nome').value.trim();
          const t = tipo.value;
          const destino = bd.querySelector('#m-destino').value.trim();

          if (!c) {
            if (!UI.localValido(local)) {
              erro.textContent = 'Use apenas letras, números, ponto, hífen e sublinhado.';
              erro.classList.remove('hidden');
              return;
            }
            if (t !== 'caixa' && !UI.emailValido(destino)) {
              erro.textContent = 'Informe um endereço de destino válido.';
              erro.classList.remove('hidden');
              return;
            }
            const r = OB.criarCaixa({
              dominioId, local, nome: nome || local, tipo: t, destino,
              senha: bd.querySelector('#m-senha').value,
            });
            if (r && r.erro) {
              erro.textContent = r.erro;
              erro.classList.remove('hidden');
              return;
            }
            UI.fecharModal();
            UI.toast('ok', 'Endereço criado', local + '@' + dom.dominio + ' já está funcionando.');
          } else {
            OB.atualizar('caixas', c.id, { nome: nome || c.nome, destino });
            UI.fecharModal();
            UI.toast('ok', 'Alterações salvas', 'O endereço foi atualizado.');
          }
          App.rotear();
        });
      },
    });
  }

  function modalSenha(caixaId) {
    const c = OB.q.caixaPorId(caixaId);
    const dom = OB.q.dominioPorId(c.dominio_id);
    const nova = UI.senhaForte();
    UI.modal({
      titulo: 'Redefinir senha',
      sub: c.local + '@' + dom.dominio,
      corpo: `<p class="small soft">Ao confirmar, a senha atual deixa de funcionar imediatamente em todos os aparelhos conectados nessa caixa.</p>
        <div class="field">
          <label for="s-nova">Nova senha</label>
          <div class="input-group">
            <input id="s-nova" class="input mono" value="${nova}">
            <button class="addon clickable" type="button" id="s-gerar">Gerar outra</button>
          </div>
        </div>
        ${UI.linhaCopia(nova, 'senha')}`,
      acoes: `<button class="btn btn-ghost" data-fechar>Cancelar</button>
              <button class="btn btn-primary" id="s-ok">Redefinir</button>`,
      aoAbrir: (bd) => {
        bd.querySelector('#s-gerar').addEventListener('click', () => {
          const v = UI.senhaForte();
          bd.querySelector('#s-nova').value = v;
          bd.querySelector('[data-copiar]').setAttribute('data-copiar', v);
          bd.querySelector('.copy-row code').textContent = v;
        });
        bd.querySelector('#s-ok').addEventListener('click', () => {
          const v = bd.querySelector('#s-nova').value;
          if (v.length < 8) return UI.toast('err', 'Senha curta', 'Use no mínimo 8 caracteres.');
          OB.atualizar('caixas', c.id, { senha_inicial: v });
          OB.log('Senha redefinida', c.local + '@' + dom.dominio, 'alerta');
          UI.fecharModal();
          UI.toast('ok', 'Senha redefinida', 'Entregue a nova senha ao usuário.');
        });
      },
    });
  }

  function modalPagar(faturaId) {
    const f = OB.db.faturas.find((x) => x.id === faturaId);
    if (!f) return;
    const codigoPix = '00020126580014BR.GOV.BCB.PIX0136' + f.id.replace(/\W/g, '') + '5204000053039865802BR5925OUTBOX SOLUCOES DIGITAIS6009OURINHOS62070503***6304ABCD';
    UI.modal({
      titulo: 'Pagar fatura #' + f.numero,
      sub: OB.money(f.valor) + ', vencimento em ' + OB.fdate(f.vencimento),
      corpo: `
        <div class="demo-box">Demonstração: nenhum pagamento real é processado. Em produção, este passo chama a API do gateway (Asaas, Iugu, Pagar.me ou Stripe).</div>
        <div class="field">
          <span class="lbl">Pix copia e cola</span>
          ${UI.linhaCopia(codigoPix, 'código Pix')}
        </div>
        <div class="col" style="gap:10px">
          ${[['pix', 'Pix', 'Compensa em segundos'], ['boleto', 'Boleto', 'Compensa em até 2 dias úteis'], ['cartao', 'Cartão de crédito', 'Cobrança recorrente']]
            .map(([id, nome, desc], i) => `<label class="card clickable row" style="gap:12px;padding:13px">
              <input type="radio" name="pgt" value="${nome}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--brand);width:17px;height:17px">
              <span class="grow"><span class="small t-strong" style="display:block">${nome}</span><span class="xs muted">${desc}</span></span>
            </label>`).join('')}
        </div>`,
      acoes: `<button class="btn btn-ghost" data-fechar>Fechar</button>
              <button class="btn btn-primary" id="p-ok">Confirmar pagamento</button>`,
      aoAbrir: (bd) => {
        bd.querySelector('#p-ok').addEventListener('click', (e) => {
          const metodo = (bd.querySelector('input[name="pgt"]:checked') || {}).value || 'Pix';
          const parar = UI.carregando(e.currentTarget, 'Confirmando');
          setTimeout(() => {
            OB.pagarFatura(f.id, metodo);
            parar();
            UI.fecharModal();
            UI.toast('ok', 'Pagamento confirmado', 'A fatura #' + f.numero + ' foi quitada.');
            App.rotear();
          }, 800);
        });
      },
    });
  }

  function modalRecibo(faturaId) {
    const f = OB.db.faturas.find((x) => x.id === faturaId);
    const c = OB.q.contaPorId(f.conta_id);
    UI.modal({
      titulo: 'Recibo da fatura #' + f.numero,
      corpo: `<div class="card" style="background:var(--surface-2)">
        <div class="row-between mb-16">
          <img data-logo src="assets/logo-preta.svg" alt="OutBox" style="height:22px">
          <span class="badge badge-green"><span class="dot"></span>Pago</span>
        </div>
        <dl class="dl">
          <div><dt>Cliente</dt><dd>${E(c.empresa)}</dd></div>
          <div><dt>Documento</dt><dd>${E(c.doc || '–')}</dd></div>
          <div><dt>Competência</dt><dd>${new Date(f.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</dd></div>
          <div><dt>Pago em</dt><dd>${OB.fdate(f.pago_em)}</dd></div>
          <div><dt>Forma</dt><dd>${E(f.metodo || '–')}</dd></div>
          <div><dt>Valor</dt><dd style="font-size:1.15rem">${OB.money(f.valor)}</dd></div>
        </dl>
        <p class="xs muted mt-24">Documento de demonstração, sem valor fiscal. Em produção, emita a nota fiscal de serviço pelo sistema da prefeitura ou por um emissor integrado.</p>
      </div>`,
      acoes: `<button class="btn btn-ghost" data-fechar>Fechar</button>
              <button class="btn btn-primary" onclick="window.print()">${ico('download')} Imprimir</button>`,
    });
  }

  function modalTrocarPlano(dominioId) {
    const d = OB.q.dominioPorId(dominioId);
    const a = OB.q.assinaturaDoDominio(dominioId);
    UI.modal({
      titulo: 'Trocar de plano',
      sub: d.dominio,
      largo: true,
      corpo: `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        ${OB.PLANOS.map((p) => `<label class="card clickable" style="padding:14px;border-color:${p.id === d.plano_id ? 'var(--brand)' : 'var(--border)'}">
          <div class="row" style="gap:9px">
            <input type="radio" name="np" value="${p.id}" ${p.id === d.plano_id ? 'checked' : ''} style="accent-color:var(--brand);width:17px;height:17px">
            <div><div class="small t-strong">${E(p.nome)}</div><div class="xs muted">${E(p.resumo)}</div></div>
          </div>
          <div class="t-strong mt-8">${OB.money(OB.precoUnit(p.id, a.ciclo))}<span class="xs muted"> /caixa</span></div>
        </label>`).join('')}
      </div>
      <p class="small muted">A diferença é calculada proporcionalmente e aparece na próxima fatura. Reduzir o plano só é possível se o espaço usado couber na nova cota.</p>`,
      acoes: `<button class="btn btn-ghost" data-fechar>Cancelar</button>
              <button class="btn btn-primary" id="np-ok">Confirmar troca</button>`,
      aoAbrir: (bd) => {
        bd.querySelector('#np-ok').addEventListener('click', () => {
          const novo = (bd.querySelector('input[name="np"]:checked') || {}).value;
          if (!novo || novo === d.plano_id) { UI.fecharModal(); return; }
          const p = OB.planoPor(novo);
          const excede = OB.q.caixasDoDominio(d.id).filter((c) => c.tipo === 'caixa' && c.usado_mb > p.cota * 1024);
          if (excede.length) {
            return UI.toast('err', 'Não é possível reduzir', `A caixa ${excede[0].local}@${d.dominio} usa mais espaço do que o plano ${p.nome} oferece.`);
          }
          OB.atualizar('dominios', d.id, { plano_id: novo });
          OB.q.caixasDoDominio(d.id).forEach((c) => OB.atualizar('caixas', c.id, { cota_gb: p.cota }));
          OB.atualizar('assinaturas', a.id, { plano_id: novo });
          OB.sincronizarAssinatura(d.id);
          OB.log('Plano alterado para ' + p.nome, d.dominio, 'info');
          UI.fecharModal();
          UI.toast('ok', 'Plano alterado', 'Agora este domínio está no plano ' + p.nome + '.');
          App.rotear();
        });
      },
    });
  }

  function modalCiclo(dominioId) {
    const d = OB.q.dominioPorId(dominioId);
    const a = OB.q.assinaturaDoDominio(dominioId);
    UI.modal({
      titulo: 'Mudar o ciclo de cobrança',
      sub: d.dominio + ', plano ' + OB.planoPor(d.plano_id).nome,
      corpo: `<div class="col" style="gap:10px">
        ${OB.CICLOS.map((c) => {
          const unit = OB.precoUnit(d.plano_id, c.id);
          const off = OB.descontoPct(d.plano_id, c.id);
          return `<label class="card clickable row" style="gap:12px;padding:15px;border-color:${a.ciclo === c.id ? 'var(--brand)' : 'var(--border)'}">
            <input type="radio" name="nc" value="${c.id}" ${a.ciclo === c.id ? 'checked' : ''} style="accent-color:var(--brand);width:17px;height:17px">
            <span class="grow">
              <span class="small t-strong" style="display:block">${E(c.nome)} ${off ? `<span class="save-pill">−${off}%</span>` : ''}</span>
              <span class="xs muted">${OB.money(unit)} por caixa por mês, ${OB.money(OB.totalCiclo(d.plano_id, c.id) * a.qtd)} a cada ${E(c.curto)} com ${a.qtd} ${a.qtd === 1 ? 'caixa' : 'caixas'}</span>
            </span>
          </label>`;
        }).join('')}
      </div>
      <p class="small muted">A mudança vale a partir da próxima cobrança. Em ciclos de 12 e 36 meses o preço fica travado durante todo o período contratado.</p>`,
      acoes: `<button class="btn btn-ghost" data-fechar>Cancelar</button>
              <button class="btn btn-primary" id="nc-ok">Confirmar</button>`,
      aoAbrir: (bd) => {
        bd.querySelector('#nc-ok').addEventListener('click', () => {
          const novo = (bd.querySelector('input[name="nc"]:checked') || {}).value;
          if (!novo || novo === a.ciclo) { UI.fecharModal(); return; }
          OB.atualizar('assinaturas', a.id, { ciclo: novo });
          OB.atualizar('dominios', d.id, { ciclo: novo });
          OB.sincronizarAssinatura(d.id);
          OB.log('Ciclo alterado para ' + OB.cicloPor(novo).nome, d.dominio, 'info');
          UI.fecharModal();
          UI.toast('ok', 'Ciclo alterado', 'A cobrança passa a ser ' + OB.cicloPor(novo).nome.toLowerCase() + '.');
          App.rotear();
        });
      },
    });
  }

  /* ============================================================
     VERIFICAÇÃO DE DNS
     ============================================================ */
  async function verificarDns(d, btn) {
    const parar = UI.carregando(btn, 'Consultando');
    const r = await DNS.verificar(d.dominio, d.dns);
    parar();

    const novo = {
      mx: r.itens.mx.ok, spf: r.itens.spf.ok,
      dkim: r.itens.dkim.ok, dmarc: r.itens.dmarc.ok,
      autodiscover: r.itens.autodiscover.ok,
    };
    OB.atualizar('dominios', d.id, { dns: novo });

    const completo = novo.mx && novo.spf && novo.dkim && novo.dmarc;
    if (completo && d.status === 'pendente') {
      OB.atualizar('dominios', d.id, { status: 'ativo', ativado_em: new Date().toISOString() });
      const a = OB.q.assinaturaDoDominio(d.id);
      if (a && a.status === 'trial') OB.atualizar('assinaturas', a.id, { status: 'ativa' });
      OB.log('Domínio ativado', d.dominio, 'ok');
      UI.toast('ok', 'Domínio ativo', 'Está tudo apontado. Suas caixas já recebem mensagens.');
    } else if (r.modo === 'real') {
      const faltam = ['mx', 'spf', 'dkim', 'dmarc'].filter((k) => !novo[k]);
      UI.toast(faltam.length ? 'warn' : 'ok',
        faltam.length ? 'Ainda falta publicar' : 'Registros verificados',
        faltam.length ? 'Pendentes: ' + faltam.join(', ').toUpperCase() + '. A propagação pode levar até 24 horas.' : 'Tudo certo por aqui.');
    } else {
      UI.toast('info', 'Sem conexão para consultar', 'Mostrando o último estado conhecido dos registros.');
    }

    /* mostra o que foi encontrado de fato */
    const el = document.getElementById('modo-verificacao');
    if (el) {
      el.textContent = r.modo === 'real'
        ? 'Última consulta feita agora no DNS público. A propagação pode levar até 24 horas.'
        : 'Não foi possível consultar o DNS agora. Exibindo o último estado conhecido.';
    }
    Object.entries(r.itens).forEach(([chave, val]) => {
      const alvo = document.querySelector(`[data-encontrado="${chave}"]`);
      if (alvo && val.encontrado && val.encontrado.length) {
        alvo.classList.remove('hidden');
        alvo.textContent = 'Publicado hoje: ' + val.encontrado.slice(0, 2).join(' | ').slice(0, 160);
      }
    });

    App.rotear();
  }

  /* ============================================================
     LIGAÇÕES DE EVENTOS
     ============================================================ */
  function ligarAcoesCaixa() {
    document.querySelectorAll('[data-nova-caixa]').forEach((b) => {
      b.addEventListener('click', () => {
        const dom = (document.getElementById('filtro-dominio') || {}).value || b.getAttribute('data-nova-caixa');
        modalCaixa(dom);
      });
    });
    document.querySelectorAll('[data-editar]').forEach((b) => {
      b.addEventListener('click', () => {
        const c = OB.q.caixaPorId(b.getAttribute('data-editar'));
        modalCaixa(c.dominio_id, c.id);
      });
    });
    document.querySelectorAll('[data-senha]').forEach((b) => {
      b.addEventListener('click', () => modalSenha(b.getAttribute('data-senha')));
    });
    document.querySelectorAll('[data-excluir]').forEach((b) => {
      b.addEventListener('click', async () => {
        const c = OB.q.caixaPorId(b.getAttribute('data-excluir'));
        const dom = OB.q.dominioPorId(c.dominio_id);
        const ok = await UI.confirmar({
          titulo: 'Excluir ' + c.local + '@' + dom.dominio,
          msg: c.tipo === 'caixa'
            ? 'Todas as mensagens desta caixa serão apagadas em 30 dias e o valor sai da próxima fatura. Esta ação não pode ser desfeita.'
            : 'O endereço deixa de existir imediatamente. Esta ação não pode ser desfeita.',
          ok: 'Excluir', perigo: true,
        });
        if (!ok) return;
        OB.removerCaixa(c.id);
        UI.toast('ok', 'Endereço removido', c.local + '@' + dom.dominio + ' foi excluído.');
        App.rotear();
      });
    });
  }

  function ligar(rota) {
    ligarAcoesCaixa();

    /* abas do domínio */
    document.querySelectorAll('[data-aba]').forEach((b) => {
      b.addEventListener('click', () => {
        abaDominio = b.getAttribute('data-aba');
        App.rotear();
      });
    });

    /* verificação de DNS */
    const bv = document.getElementById('b-verificar');
    if (bv) {
      const id = (location.hash.split('/')[3] || '').split('?')[0];
      const d = OB.q.dominioPorId(id);
      if (d) bv.addEventListener('click', () => verificarDns(d, bv));
    }

    /* filtros de caixas */
    const bc = document.getElementById('busca-caixa');
    if (bc) bc.addEventListener('input', filtrarCaixas);
    const fd = document.getElementById('filtro-dominio');
    if (fd) fd.addEventListener('change', filtrarCaixas);

    /* faturas */
    document.querySelectorAll('[data-pagar]').forEach((b) => {
      b.addEventListener('click', () => modalPagar(b.getAttribute('data-pagar')));
    });
    document.querySelectorAll('[data-recibo]').forEach((b) => {
      b.addEventListener('click', () => modalRecibo(b.getAttribute('data-recibo')));
    });

    /* plano */
    document.querySelectorAll('[data-trocar-plano]').forEach((b) => {
      b.addEventListener('click', () => modalTrocarPlano(b.getAttribute('data-trocar-plano')));
    });
    document.querySelectorAll('[data-trocar-ciclo]').forEach((b) => {
      b.addEventListener('click', () => modalCiclo(b.getAttribute('data-trocar-ciclo')));
    });
    document.querySelectorAll('[data-cancelar]').forEach((b) => {
      b.addEventListener('click', async () => {
        const d = OB.q.dominioPorId(b.getAttribute('data-cancelar'));
        const ok = await UI.confirmar({
          titulo: 'Solicitar cancelamento de ' + d.dominio,
          msg: 'O serviço continua ativo até o fim do período já pago. Antes de encerrar, entramos em contato para exportar as mensagens. Deseja seguir?',
          ok: 'Solicitar cancelamento', perigo: true,
        });
        if (!ok) return;
        OB.log('Cancelamento solicitado', d.dominio, 'alerta');
        UI.toast('ok', 'Solicitação registrada', 'Nossa equipe entra em contato em até um dia útil.');
      });
    });

    /* tutoriais */
    if (document.getElementById('corpo-tuto')) Site.ligarAjuda();

    /* configurações */
    const fc = document.getElementById('f-conta');
    if (fc) {
      UI.ligarMascara(document.getElementById('k-doc'), UI.mascaraDoc);
      UI.ligarMascara(document.getElementById('k-tel'), UI.mascaraTel);
      fc.addEventListener('submit', (e) => {
        e.preventDefault();
        OB.atualizar('contas', Auth.conta().id, {
          empresa: document.getElementById('k-empresa').value.trim(),
          doc: document.getElementById('k-doc').value.trim(),
          cidade: document.getElementById('k-cidade').value.trim(),
          uf: document.getElementById('k-uf').value.trim().toUpperCase(),
          telefone: document.getElementById('k-tel').value.trim(),
        });
        UI.toast('ok', 'Dados salvos', 'As informações da empresa foram atualizadas.');
        App.rotear();
      });
    }
    const fs = document.getElementById('f-senha');
    if (fs) {
      fs.addEventListener('submit', async (e) => {
        e.preventDefault();
        const atual = document.getElementById('k-atual').value;
        const nova = document.getElementById('k-nova').value;
        const u = Auth.atual();
        if (nova.length < 8) return UI.toast('err', 'Senha curta', 'Use no mínimo 8 caracteres.');

        if (window.Supa && Supa.ativo) {
          /* confere a senha atual reautenticando e então atualiza no Auth */
          const conf = await Supa.client.auth.signInWithPassword({ email: u.email, password: atual });
          if (conf.error) return UI.toast('err', 'Senha atual incorreta', 'Verifique e tente novamente.');
          const upd = await Supa.client.auth.updateUser({ password: nova });
          if (upd.error) return UI.toast('err', 'Não foi possível trocar', upd.error.message);
          fs.reset();
          return UI.toast('ok', 'Senha alterada', 'Sua nova senha já está valendo.');
        }

        const atualHash = await OB.hashSenha(atual);
        if (u.senha !== atualHash && u.senha !== atual) return UI.toast('err', 'Senha atual incorreta', 'Verifique e tente novamente.');
        OB.atualizar('usuarios', u.id, { senha: await OB.hashSenha(nova) });
        fs.reset();
        UI.toast('ok', 'Senha alterada', 'Use a nova senha no próximo acesso.');
      });
    }
    const bs = document.getElementById('b-sair');
    if (bs) bs.addEventListener('click', () => Auth.sair());
  }

  return { painel, dominios, dominio, caixas, faturas, plano, ajuda, config, ligar, menu };
})();
