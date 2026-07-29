/* ============================================================
   OutBox Mail — Painel administrativo (OutBox Soluções Digitais)
   ============================================================ */
window.Admin = (function () {
  const E = UI.esc;
  let ultimaMetrica = null;

  function menu(ativo) {
    const m = OB.metricas();
    return [
      { sec: 'Operação' },
      { id: 'dash', rota: '#/admin', nome: 'Dashboard', ico: 'chart' },
      { id: 'clientes', rota: '#/admin/clientes', nome: 'Clientes', ico: 'users', count: OB.db.contas.length },
      { id: 'dominios', rota: '#/admin/dominios', nome: 'Domínios', ico: 'globe', count: OB.db.dominios.length },
      { id: 'caixas', rota: '#/admin/caixas', nome: 'Caixas', ico: 'mail', count: m.caixasAtivas },
      { sec: 'Financeiro' },
      { id: 'financeiro', rota: '#/admin/financeiro', nome: 'Faturamento', ico: 'wallet', count: m.vencidas || null },
      { id: 'planos', rota: '#/admin/planos', nome: 'Planos e margem', ico: 'package' },
      { id: 'cupons', rota: '#/admin/cupons', nome: 'Cupons', ico: 'tag' },
      { sec: 'Sistema' },
      { id: 'chamados', rota: '#/admin/chamados', nome: 'Chamados', ico: 'help', count: m.chamadosAbertos || null },
      { id: 'logs', rota: '#/admin/logs', nome: 'Registro de atividade', ico: 'activity' },
    ].map((i) => ({ ...i, ativo: i.id === ativo }));
  }

  const kpi = (rot, val, i, cor, sub, trend) => `<div class="kpi">
    <div class="kpi-top">
      <span class="kpi-label">${rot}</span>
      <span class="kpi-ico" style="background:var(--${cor}-soft);color:var(--${cor})">${ico(i)}</span>
    </div>
    <div class="kpi-value">${val}</div>
    <div class="kpi-sub">${trend || ''}${sub}</div>
  </div>`;

  const vazio = (i, t, d) => `<div class="empty"><div class="empty-ico">${ico(i)}</div><h3>${t}</h3><p>${d}</p></div>`;

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function dash() {
    const m = OB.metricas();
    ultimaMetrica = m;
    const ultimoMes = m.serie[m.serie.length - 1].receita;
    const penultimo = m.serie[m.serie.length - 2] ? m.serie[m.serie.length - 2].receita : 0;
    const variacao = penultimo ? ((ultimoMes - penultimo) / penultimo) * 100 : 0;

    const conteudo = `
      <div class="kpis mb-24">
        ${kpi('Receita recorrente', OB.money(m.mrr), 'wallet', 'brand', `${OB.money(m.arr)} projetados no ano`)}
        ${kpi('Margem bruta', OB.money(m.margem), 'trendUp', 'green', `${OB.pct(m.margemPct)} sobre a receita, custo de ${OB.money(m.custo)}`)}
        ${kpi('Caixas ativas', m.caixasAtivas, 'mail', 'blue', `${m.dominiosAtivos} domínios ativos, ${m.contas} clientes`)}
        ${kpi('Inadimplência', OB.money(m.valorVencido), 'alert', m.vencidas ? 'red' : 'green',
          m.vencidas ? `${m.vencidas} ${m.vencidas === 1 ? 'fatura vencida' : 'faturas vencidas'}, ${OB.pct(m.inadimplenciaPct)} da receita` : 'Nenhuma fatura vencida')}
      </div>

      ${alertas(m)}

      <div class="grid mb-24" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">
        <div class="card">
          <div class="card-head">
            <div>
              <span class="card-title">Receita recebida por mês</span>
              <div class="xs muted mt-8">Últimos 8 meses</div>
            </div>
            <span class="trend ${variacao >= 0 ? 'trend-up' : 'trend-down'}">
              ${ico(variacao >= 0 ? 'trendUp' : 'trendDown')} ${OB.pct(Math.abs(variacao))}
            </span>
          </div>
          <div class="chart-box"><canvas id="g-receita" role="img" aria-label="Gráfico de receita mensal"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title">Caixas ativas por mês</span></div>
          <div class="chart-box"><canvas id="g-caixas" role="img" aria-label="Gráfico de caixas ativas"></canvas></div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div class="card">
          <div class="card-head"><span class="card-title">Distribuição por plano</span></div>
          <div class="chart-box chart-box-sm"><canvas id="g-planos" role="img" aria-label="Distribuição de caixas por plano"></canvas></div>
        </div>

        <div class="card">
          <div class="card-head"><span class="card-title">Indicadores do negócio</span></div>
          <div class="col" style="gap:14px">
            ${[
              ['Ticket médio por cliente', OB.money(m.ticket)],
              ['Receita por caixa', OB.money(m.caixasAtivas ? m.mrr / m.caixasAtivas : 0)],
              ['Custo por caixa', OB.money(m.caixasAtivas ? m.custo / m.caixasAtivas : 0)],
              ['Margem por caixa', OB.money(m.caixasAtivas ? m.margem / m.caixasAtivas : 0)],
              ['Total já recebido', OB.money(m.recebido)],
              ['A receber em aberto', OB.money(m.valorAberto)],
            ].map(([r, v]) => `<div class="row-between" style="padding-bottom:12px;border-bottom:1px solid var(--border)">
              <span class="small soft">${r}</span><span class="t-strong">${v}</span>
            </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><span class="card-title">Atividade recente</span><a class="btn btn-sm btn-ghost" href="#/admin/logs">Ver tudo</a></div>
          <div class="tl-list">
            ${OB.db.logs.slice(0, 6).map(itemLog).join('')}
          </div>
        </div>
      </div>`;

    return App.shell({
      itens: menu('dash'),
      titulo: 'Dashboard',
      sub: 'Visão geral do OutBox Mail em ' + new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '.',
      conteudo,
    });
  }

  function alertas(m) {
    const itens = [];
    const pend = OB.db.dominios.filter((d) => d.status === 'pendente');
    const susp = OB.db.dominios.filter((d) => d.status === 'suspenso');
    const cheias = OB.db.caixas.filter((c) => c.tipo === 'caixa' && c.usado_mb / (c.cota_gb * 1024) > 0.9);

    if (m.vencidas) itens.push(['red', 'alert', `${m.vencidas} ${m.vencidas === 1 ? 'fatura vencida' : 'faturas vencidas'}`, `${OB.money(m.valorVencido)} em atraso. Cobre antes de suspender.`, '#/admin/financeiro']);
    if (pend.length) itens.push(['amber', 'clock', `${pend.length} ${pend.length === 1 ? 'domínio aguardando DNS' : 'domínios aguardando DNS'}`, 'Cliente contratou mas ainda não apontou. Vale um contato ativo.', '#/admin/dominios']);
    if (susp.length) itens.push(['red', 'pause', `${susp.length} ${susp.length === 1 ? 'domínio suspenso' : 'domínios suspensos'}`, 'Parou de receber mensagens novas. Conteúdo preservado por 30 dias.', '#/admin/dominios']);
    if (cheias.length) itens.push(['blue', 'hardDrive', `${cheias.length} ${cheias.length === 1 ? 'caixa acima de 90%' : 'caixas acima de 90%'}`, 'Oportunidade de subir o plano antes de a caixa lotar.', '#/admin/caixas']);
    if (m.chamadosAbertos) itens.push(['violet', 'help', `${m.chamadosAbertos} ${m.chamadosAbertos === 1 ? 'chamado aberto' : 'chamados abertos'}`, 'Aguardando resposta do suporte.', '#/admin/chamados']);

    if (!itens.length) return '';
    return `<div class="grid mb-24" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      ${itens.map(([cor, i, t, d, href]) => `<a class="card card-hover" href="${href}" style="border-left:3px solid var(--${cor})">
        <div class="row" style="gap:12px;align-items:flex-start">
          <span class="kpi-ico" style="background:var(--${cor}-soft);color:var(--${cor});width:34px;height:34px">${ico(i)}</span>
          <div class="grow">
            <div class="small t-strong">${t}</div>
            <div class="xs muted mt-8">${d}</div>
          </div>
        </div>
      </a>`).join('')}
    </div>`;
  }

  function itemLog(l) {
    const cores = { ok: 'green', alerta: 'red', info: 'blue' };
    const icos = { ok: 'checkCircle', alerta: 'alert', info: 'info' };
    const cor = cores[l.tipo] || 'blue';
    return `<div class="tl-item">
      <span class="tl-ico" style="background:var(--${cor}-soft);color:var(--${cor})">${ico(icos[l.tipo] || 'info')}</span>
      <div class="tl-body">
        <div class="t">${E(l.acao)}</div>
        <div class="d">${E(l.alvo)}${l.alvo ? ' · ' : ''}${E(l.ator)} · ${OB.desde(l.quando)}</div>
      </div>
    </div>`;
  }

  function desenharGraficos() {
    const m = ultimaMetrica || OB.metricas();
    if (document.getElementById('g-receita')) Graficos.receita('g-receita', m.serie);
    if (document.getElementById('g-caixas')) Graficos.caixas('g-caixas', m.serie);
    if (document.getElementById('g-planos')) Graficos.planos('g-planos', m.porPlano);
  }

  /* ============================================================
     CLIENTES
     ============================================================ */
  function clientes() {
    const conteudo = `
      <div class="row-between mb-24 wrap-gap">
        <input class="input" id="busca-cliente" placeholder="Buscar por empresa, responsável ou domínio" style="max-width:340px">
        <span class="small muted">${OB.db.contas.length} ${OB.db.contas.length === 1 ? 'cliente' : 'clientes'} cadastrados</span>
      </div>
      <div id="lista-clientes">${tabelaClientes(OB.db.contas)}</div>`;
    return App.shell({ itens: menu('clientes'), titulo: 'Clientes', sub: 'Todas as contas do OutBox Mail.', conteudo });
  }

  function tabelaClientes(lista) {
    if (!lista.length) return vazio('users', 'Nenhum cliente', 'Nada corresponde à busca.');
    return `<div class="table-wrap"><table>
      <thead><tr><th>Cliente</th><th>Domínios</th><th>Caixas</th><th>Mensalidade</th><th>Situação</th><th class="td-right">Ações</th></tr></thead>
      <tbody>
        ${lista.map((c) => {
          const doms = OB.q.dominiosDaConta(c.id);
          const caixas = OB.q.caixasDaConta(c.id).filter((x) => x.tipo === 'caixa').length;
          const assins = OB.q.assinaturasDaConta(c.id);
          const total = assins.reduce((s, a) => s + a.valor_total, 0);
          const inad = assins.some((a) => a.status === 'inadimplente');
          const u = OB.q.usuarioDaConta(c.id);
          return `<tr>
            <td>
              <div class="row" style="gap:10px">
                <span class="avatar" style="background:${OB.corDe(c.empresa)}">${OB.iniciais(c.empresa)}</span>
                <div style="min-width:0">
                  <div class="t-strong truncate">${E(c.empresa)}</div>
                  <div class="xs muted truncate">${E(u ? u.nome : '')} · ${E(c.cidade)}/${E(c.uf)}</div>
                </div>
              </div>
            </td>
            <td class="small">${doms.map((d) => E(d.dominio)).join('<br>') || '–'}</td>
            <td class="t-strong">${caixas}</td>
            <td class="t-strong">${OB.money(total)}</td>
            <td>${UI.badge(inad ? 'inadimplente' : (doms.some((d) => d.status === 'pendente') ? 'pendente' : 'ativo'))}</td>
            <td class="td-right"><button class="btn btn-sm btn-ghost" data-cliente="${c.id}">Detalhes</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  function modalCliente(id) {
    const c = OB.q.contaPorId(id);
    const u = OB.q.usuarioDaConta(id);
    const doms = OB.q.dominiosDaConta(id);
    const faturas = OB.q.faturasDaConta(id);
    const pagas = faturas.filter((f) => f.status === 'paga');
    UI.modal({
      titulo: c.empresa,
      sub: `Cliente desde ${OB.fdate(c.criado_em)} · origem: ${c.origem}`,
      largo: true,
      corpo: `
        <dl class="dl">
          <div><dt>Responsável</dt><dd>${E(u ? u.nome : '–')}</dd></div>
          <div><dt>E-mail de acesso</dt><dd class="small">${E(u ? u.email : '–')}</dd></div>
          <div><dt>Telefone</dt><dd>${E(c.telefone || '–')}</dd></div>
          <div><dt>Documento</dt><dd>${E(c.doc || '–')}</dd></div>
          <div><dt>Cidade</dt><dd>${E(c.cidade)}/${E(c.uf)}</dd></div>
          <div><dt>Total já pago</dt><dd>${OB.money(pagas.reduce((s, f) => s + f.valor, 0))}</dd></div>
        </dl>

        <h4 class="mt-24 mb-8">Domínios</h4>
        <div class="col" style="gap:8px">
          ${doms.map((d) => {
            const a = OB.q.assinaturaDoDominio(d.id);
            return `<div class="row-between card" style="padding:12px">
              <div>
                <div class="small t-strong">${E(d.dominio)}</div>
                <div class="xs muted">${OB.planoPor(d.plano_id).nome} · ${a ? a.qtd : 0} caixas · ${a ? OB.money(a.valor_total) : '–'}</div>
              </div>
              ${UI.badge(d.status)}
            </div>`;
          }).join('') || '<p class="small muted">Nenhum domínio.</p>'}
        </div>

        <h4 class="mt-24 mb-8">Últimas faturas</h4>
        <div class="col" style="gap:6px">
          ${faturas.slice(0, 5).map((f) => `<div class="row-between small" style="padding:8px 0;border-bottom:1px solid var(--border)">
            <span>#${E(f.numero)} · ${OB.fdate(f.vencimento)}</span>
            <span class="row" style="gap:10px"><span class="t-strong">${OB.money(f.valor)}</span>${UI.badge(f.status)}</span>
          </div>`).join('') || '<p class="small muted">Sem faturas.</p>'}
        </div>`,
      acoes: `<a class="btn btn-ghost" href="${Site.wppLink('Olá ' + (u ? u.nome.split(' ')[0] : '') + '! Aqui é da OutBox Soluções Digitais.')}" target="_blank" rel="noopener">${ico('whatsapp')} WhatsApp</a>
              <button class="btn btn-primary" data-ver-cliente="${id}">${ico('eye')} Abrir painel do cliente</button>`,
      aoAbrir: (bd) => {
        const b = bd.querySelector('[data-ver-cliente]');
        if (b) b.addEventListener('click', () => {
          if (Auth.verComoCliente(id)) { UI.fecharModal(); location.hash = '#/app'; }
        });
      },
    });
  }

  /* ============================================================
     DOMÍNIOS
     ============================================================ */
  function dominios() {
    const conteudo = `
      <div class="row-between mb-24 wrap-gap">
        <div class="row wrap-gap" style="gap:10px">
          <input class="input" id="busca-dom" placeholder="Buscar domínio" style="max-width:260px">
          <select class="select" id="filtro-status" style="max-width:200px">
            <option value="">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="pendente">Aguardando DNS</option>
            <option value="suspenso">Suspensos</option>
          </select>
        </div>
      </div>
      <div id="lista-dominios">${tabelaDominios(OB.db.dominios)}</div>`;
    return App.shell({ itens: menu('dominios'), titulo: 'Domínios', sub: 'Situação técnica e comercial de cada domínio.', conteudo });
  }

  function tabelaDominios(lista) {
    if (!lista.length) return vazio('globe', 'Nenhum domínio', 'Nada corresponde ao filtro.');
    return `<div class="table-wrap"><table>
      <thead><tr><th>Domínio</th><th>Cliente</th><th>Plano</th><th>DNS</th><th>Status</th><th class="td-right">Ações</th></tr></thead>
      <tbody>
        ${lista.map((d) => {
          const c = OB.q.contaPorId(d.conta_id);
          const p = DNS.progresso(d.dns);
          const caixas = OB.q.caixasDoDominio(d.id).filter((x) => x.tipo === 'caixa').length;
          return `<tr>
            <td class="t-strong">${E(d.dominio)}<div class="xs muted mt-8">${caixas} ${caixas === 1 ? 'caixa' : 'caixas'}</div></td>
            <td class="small">${E(c ? c.empresa : '–')}</td>
            <td>${OB.planoPor(d.plano_id).nome}<div class="xs muted mt-8">${E(OB.cicloPor(d.ciclo).nome)}</div></td>
            <td style="min-width:120px">
              <div class="xs muted mb-8">${p}% publicado</div>
              <div class="bar ${p === 100 ? 'ok' : 'warn'}"><span style="width:${p}%"></span></div>
            </td>
            <td>${UI.badge(d.status)}</td>
            <td class="td-right td-actions">
              ${d.status === 'suspenso'
                ? `<button class="btn btn-sm btn-ghost" data-reativar="${d.id}">${ico('play')} Reativar</button>`
                : `<button class="btn btn-sm btn-ghost" data-suspender="${d.id}">${ico('pause')} Suspender</button>`}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  /* ============================================================
     CAIXAS
     ============================================================ */
  function caixas() {
    const todas = OB.db.caixas;
    const conteudo = `
      <div class="row-between mb-24 wrap-gap">
        <input class="input" id="busca-cx" placeholder="Buscar endereço ou cliente" style="max-width:320px">
        <span class="small muted">${todas.filter((c) => c.tipo === 'caixa').length} caixas e ${todas.filter((c) => c.tipo !== 'caixa').length} apelidos</span>
      </div>
      <div id="lista-cx">${tabelaCaixasAdmin(todas)}</div>`;
    return App.shell({ itens: menu('caixas'), titulo: 'Caixas', sub: 'Todos os endereços provisionados no sistema.', conteudo });
  }

  function tabelaCaixasAdmin(lista) {
    if (!lista.length) return vazio('mail', 'Nenhuma caixa', 'Nada corresponde à busca.');
    return `<div class="table-wrap"><table>
      <thead><tr><th>Endereço</th><th>Cliente</th><th>Tipo</th><th>Espaço</th><th>Último acesso</th><th>Status</th></tr></thead>
      <tbody>
        ${lista.map((c) => {
          const d = OB.q.dominioPorId(c.dominio_id);
          const conta = OB.q.contaPorId(c.conta_id);
          const p = Math.min(100, (c.usado_mb / (c.cota_gb * 1024)) * 100);
          const cls = p > 90 ? 'crit' : p > 70 ? 'warn' : 'ok';
          return `<tr>
            <td class="t-strong">${E(c.local)}@${E(d ? d.dominio : '')}<div class="xs muted mt-8">${E(c.nome)}</div></td>
            <td class="small">${E(conta ? conta.empresa : '–')}</td>
            <td>${c.tipo === 'caixa' ? '<span class="badge badge-brand">Caixa</span>' : c.tipo === 'alias' ? '<span class="badge badge-blue">Apelido</span>' : '<span class="badge badge-violet">Redireciona</span>'}</td>
            <td style="min-width:130px">
              ${c.tipo === 'caixa'
                ? `<div class="xs muted mb-8">${OB.gb(c.usado_mb)} de ${c.cota_gb} GB</div><div class="bar ${cls}"><span style="width:${p}%"></span></div>`
                : '<span class="small muted">–</span>'}
            </td>
            <td class="small muted">${c.ultimo_acesso ? OB.desde(c.ultimo_acesso) : 'Nunca acessou'}</td>
            <td>${UI.badge(c.status)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  /* ============================================================
     FINANCEIRO
     ============================================================ */
  function financeiro() {
    const m = OB.metricas();
    const faturas = OB.db.faturas.slice().sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));
    const conteudo = `
      <div class="kpis mb-24">
        ${kpi('Recebido no total', OB.money(m.recebido), 'wallet', 'green', `${OB.db.faturas.filter((f) => f.status === 'paga').length} faturas quitadas`)}
        ${kpi('A receber', OB.money(m.valorAberto), 'clock', 'amber', `${m.abertas} em aberto`)}
        ${kpi('Vencido', OB.money(m.valorVencido), 'alert', 'red', `${m.vencidas} ${m.vencidas === 1 ? 'fatura' : 'faturas'}`)}
        ${kpi('Custo do provedor', OB.money(m.custo), 'server', 'blue', `Margem de ${OB.pct(m.margemPct)}`)}
      </div>

      <div class="row-between mb-16 wrap-gap">
        <select class="select" id="filtro-fat" style="max-width:220px">
          <option value="">Todas as faturas</option>
          <option value="aberta">Em aberto</option>
          <option value="vencida">Vencidas</option>
          <option value="paga">Pagas</option>
        </select>
        <button class="btn btn-sm btn-ghost" id="b-exportar">${ico('download')} Exportar CSV</button>
      </div>
      <div id="lista-fat">${tabelaFaturas(faturas)}</div>`;

    return App.shell({ itens: menu('financeiro'), titulo: 'Faturamento', sub: 'Cobranças, recebimentos e inadimplência.', conteudo });
  }

  function tabelaFaturas(lista) {
    if (!lista.length) return vazio('receipt', 'Nenhuma fatura', 'Nada corresponde ao filtro.');
    return `<div class="table-wrap"><table>
      <thead><tr><th>Fatura</th><th>Cliente</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th><th class="td-right">Ações</th></tr></thead>
      <tbody>
        ${lista.map((f) => {
          const c = OB.q.contaPorId(f.conta_id);
          return `<tr>
            <td class="mono t-strong">#${E(f.numero)}</td>
            <td class="small">${E(c ? c.empresa : '–')}</td>
            <td class="small">${new Date(f.competencia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</td>
            <td class="small">${OB.fdate(f.vencimento)}</td>
            <td class="t-strong">${OB.money(f.valor)}</td>
            <td>${UI.badge(f.status)}</td>
            <td class="td-right">
              ${f.status !== 'paga' ? `<button class="btn btn-sm btn-ghost" data-baixa="${f.id}">Dar baixa</button>` : `<span class="xs muted">${E(f.metodo || '')}</span>`}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  function exportarCsv() {
    const linhas = [['Fatura', 'Cliente', 'Competencia', 'Vencimento', 'Valor', 'Status', 'Metodo']];
    OB.db.faturas.forEach((f) => {
      const c = OB.q.contaPorId(f.conta_id);
      linhas.push([f.numero, c ? c.empresa : '', OB.fdate(f.competencia), OB.fdate(f.vencimento),
        String(f.valor).replace('.', ','), f.status, f.metodo || '']);
    });
    const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'outbox-mail-faturas.csv';
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('ok', 'Arquivo gerado', 'O CSV foi baixado para o seu computador.');
  }

  /* ============================================================
     PLANOS E MARGEM
     ============================================================ */
  function planos() {
    const conteudo = `
      <div class="card mb-24">
        <p class="small soft">O custo por caixa é o que você paga ao provedor de e-mail. Ajuste conforme o contrato de revenda para que a margem exibida no dashboard fique correta.</p>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Plano</th><th>Espaço</th>
          ${OB.CICLOS.map((c) => `<th>${E(c.nome)}</th>`).join('')}
          <th>Custo</th><th>Margem no mensal</th><th>Caixas ativas</th>
        </tr></thead>
        <tbody>
          ${OB.PLANOS.map((p) => {
            const caixas = OB.db.caixas.filter((c) => {
              const d = OB.q.dominioPorId(c.dominio_id);
              return c.tipo === 'caixa' && d && d.plano_id === p.id;
            }).length;
            const mensal = OB.precoUnit(p.id, 'mensal');
            const margem = mensal - p.custo;
            const margemPct = (margem / mensal) * 100;
            return `<tr>
              <td class="t-strong">${E(p.nome)}${p.destaque ? ' <span class="badge badge-brand">Destaque</span>' : ''}</td>
              <td>${p.cota} GB</td>
              ${OB.CICLOS.map((c) => {
                const unit = OB.precoUnit(p.id, c.id);
                const margemCiclo = unit - p.custo;
                return `<td>
                  <span class="t-strong">${OB.money(unit)}</span><span class="xs muted">/mês</span>
                  <div class="xs muted mt-8">${OB.money(OB.totalCiclo(p.id, c.id))} no ciclo</div>
                  <div class="xs mt-8" style="color:${margemCiclo > 0 ? 'var(--green)' : 'var(--red)'}">margem ${OB.money(margemCiclo)}</div>
                </td>`;
              }).join('')}
              <td>${OB.money(p.custo)}<div class="xs muted mt-8">por caixa/mês</div></td>
              <td>
                <span class="t-strong" style="color:var(--green)">${OB.money(margem)}</span>
                <div class="xs muted mt-8">${OB.pct(margemPct)}</div>
              </td>
              <td class="t-strong">${caixas}<div class="xs muted mt-8">${OB.money(caixas * margem)} de margem</div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
      <p class="small muted mt-16">A margem por ciclo considera o valor mensal equivalente menos o custo do provedor. Confira se o ciclo de 3 anos ainda cobre o custo caso o provedor reajuste o contrato de revenda.</p>

      <div class="grid mt-24" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        <div class="card">
          <h3 style="font-size:1.02rem" class="mb-16">Ponto de equilíbrio</h3>
          <p class="small soft">Com a margem média atual de ${OB.money(mediaMargem())} por caixa, você precisa de aproximadamente <strong>${Math.ceil(2000 / Math.max(1, mediaMargem()))} caixas ativas</strong> para cobrir um custo fixo de ${OB.money(2000)} por mês.</p>
          <p class="xs muted mt-16">Ajuste o custo fixo à sua realidade: servidor, suporte, gateway de pagamento e impostos.</p>
        </div>
        <div class="card">
          <h3 style="font-size:1.02rem" class="mb-16">Impostos e taxas a considerar</h3>
          <div class="col small soft" style="gap:9px">
            <div class="row" style="gap:8px">${ico('info')} ISS sobre o serviço, conforme o município</div>
            <div class="row" style="gap:8px">${ico('info')} Simples Nacional ou o regime da sua empresa</div>
            <div class="row" style="gap:8px">${ico('info')} Taxa do gateway: Pix costuma ser a mais barata, cartão a mais cara</div>
            <div class="row" style="gap:8px">${ico('info')} Câmbio, se o provedor cobrar em dólar</div>
          </div>
        </div>
      </div>`;
    return App.shell({ itens: menu('planos'), titulo: 'Planos e margem', sub: 'Preço, custo e resultado de cada plano.', conteudo });
  }

  function mediaMargem() {
    const caixas = OB.db.caixas.filter((c) => c.tipo === 'caixa');
    if (!caixas.length) return 0;
    const total = caixas.reduce((s, c) => {
      const d = OB.q.dominioPorId(c.dominio_id);
      const p = OB.planoPor(d ? d.plano_id : 'essencial');
      return s + (OB.precoUnit(p.id, d ? d.ciclo : 'mensal') - p.custo);
    }, 0);
    return total / caixas.length;
  }

  /* ============================================================
     CUPONS
     ============================================================ */
  function cupons() {
    const conteudo = `
      <div class="row-between mb-24">
        <p class="small muted">Cupons aplicados no checkout, sobre o valor do primeiro ciclo.</p>
        <button class="btn btn-primary btn-sm" id="b-novo-cupom">${ico('plus')} Novo cupom</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Código</th><th>Descrição</th><th>Desconto</th><th>Usos</th><th>Status</th><th class="td-right">Ações</th></tr></thead>
        <tbody>
          ${OB.db.cupons.map((c) => `<tr>
            <td class="mono t-strong">${E(c.codigo)}</td>
            <td class="small">${E(c.desc || '–')}</td>
            <td class="t-strong">${c.tipo === 'percentual' ? c.valor + '%' : OB.money(c.valor)}</td>
            <td>${c.usos}${c.limite ? ' de ' + c.limite : ''}</td>
            <td>${c.ativo ? UI.badge('ativo') : UI.badge('cancelado')}</td>
            <td class="td-right"><button class="btn btn-sm btn-ghost" data-cupom="${E(c.codigo)}">${c.ativo ? 'Desativar' : 'Ativar'}</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
    return App.shell({ itens: menu('cupons'), titulo: 'Cupons', sub: 'Descontos promocionais do checkout.', conteudo });
  }

  /* ============================================================
     CHAMADOS
     ============================================================ */
  function chamados() {
    const lista = OB.db.chamados.slice().sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    const conteudo = lista.length ? `<div class="col" style="gap:12px">
      ${lista.map((c) => {
        const conta = OB.q.contaPorId(c.conta_id);
        return `<div class="card">
          <div class="row-between mb-8 wrap-gap">
            <div class="row" style="gap:10px">
              <span class="avatar" style="background:${OB.corDe(conta ? conta.empresa : '?')}">${OB.iniciais(conta ? conta.empresa : '?')}</span>
              <div>
                <div class="t-strong small">${E(c.assunto)}</div>
                <div class="xs muted">${E(conta ? conta.empresa : '–')} · ${OB.desde(c.criado_em)}</div>
              </div>
            </div>
            ${UI.badge(c.status)}
          </div>
          <p class="small soft mt-16">${E(c.mensagem)}</p>
          <div class="row mt-16 wrap-gap">
            <a class="btn btn-sm btn-ghost" href="${Site.wppLink('Olá! Sobre o seu chamado: ' + c.assunto)}" target="_blank" rel="noopener">${ico('whatsapp')} Responder</a>
            ${c.status !== 'fechado' ? `<button class="btn btn-sm btn-ghost" data-fechar-chamado="${c.id}">Marcar como resolvido</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>` : vazio('help', 'Nenhum chamado', 'Quando um cliente abrir um chamado ele aparece aqui.');
    return App.shell({ itens: menu('chamados'), titulo: 'Chamados', sub: 'Solicitações abertas pelos clientes.', conteudo });
  }

  /* ============================================================
     LOGS
     ============================================================ */
  function logs() {
    const conteudo = `<div class="card"><div class="tl-list">
      ${OB.db.logs.length ? OB.db.logs.map(itemLog).join('') : vazio('activity', 'Sem registros', 'As ações do sistema aparecem aqui.')}
    </div></div>`;
    return App.shell({ itens: menu('logs'), titulo: 'Registro de atividade', sub: 'Últimas ações no sistema.', conteudo });
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  function ligar() {
    desenharGraficos();

    const bc = document.getElementById('busca-cliente');
    if (bc) {
      bc.addEventListener('input', () => {
        const t = bc.value.trim().toLowerCase();
        const lista = OB.db.contas.filter((c) => {
          const u = OB.q.usuarioDaConta(c.id);
          const doms = OB.q.dominiosDaConta(c.id).map((d) => d.dominio).join(' ');
          return (c.empresa + ' ' + (u ? u.nome + ' ' + u.email : '') + ' ' + doms).toLowerCase().includes(t);
        });
        document.getElementById('lista-clientes').innerHTML = tabelaClientes(lista);
        ligarDetalhes();
      });
    }
    ligarDetalhes();

    const bd = document.getElementById('busca-dom');
    const fs = document.getElementById('filtro-status');
    const filtrarDom = () => {
      const t = (bd ? bd.value : '').trim().toLowerCase();
      const st = fs ? fs.value : '';
      let lista = OB.db.dominios;
      if (st) lista = lista.filter((d) => d.status === st);
      if (t) lista = lista.filter((d) => d.dominio.includes(t));
      document.getElementById('lista-dominios').innerHTML = tabelaDominios(lista);
      ligarAcoesDominio();
    };
    if (bd) bd.addEventListener('input', filtrarDom);
    if (fs) fs.addEventListener('change', filtrarDom);
    ligarAcoesDominio();

    const bcx = document.getElementById('busca-cx');
    if (bcx) {
      bcx.addEventListener('input', () => {
        const t = bcx.value.trim().toLowerCase();
        const lista = OB.db.caixas.filter((c) => {
          const d = OB.q.dominioPorId(c.dominio_id);
          const conta = OB.q.contaPorId(c.conta_id);
          return (c.local + '@' + (d ? d.dominio : '') + ' ' + c.nome + ' ' + (conta ? conta.empresa : '')).toLowerCase().includes(t);
        });
        document.getElementById('lista-cx').innerHTML = tabelaCaixasAdmin(lista);
      });
    }

    const ff = document.getElementById('filtro-fat');
    if (ff) {
      ff.addEventListener('change', () => {
        const v = ff.value;
        const lista = OB.db.faturas.filter((f) => !v || f.status === v)
          .sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));
        document.getElementById('lista-fat').innerHTML = tabelaFaturas(lista);
        ligarBaixas();
      });
    }
    ligarBaixas();

    const be = document.getElementById('b-exportar');
    if (be) be.addEventListener('click', exportarCsv);

    document.querySelectorAll('[data-cupom]').forEach((b) => {
      b.addEventListener('click', () => {
        const c = OB.db.cupons.find((x) => x.codigo === b.getAttribute('data-cupom'));
        c.ativo = !c.ativo;
        OB.salvar();
        OB.log((c.ativo ? 'Cupom ativado' : 'Cupom desativado'), c.codigo, 'info');
        App.rotear();
      });
    });

    const bnc = document.getElementById('b-novo-cupom');
    if (bnc) bnc.addEventListener('click', modalCupom);

    document.querySelectorAll('[data-fechar-chamado]').forEach((b) => {
      b.addEventListener('click', () => {
        const c = OB.db.chamados.find((x) => x.id === b.getAttribute('data-fechar-chamado'));
        c.status = 'fechado';
        OB.salvar();
        UI.toast('ok', 'Chamado encerrado', 'O cliente foi marcado como atendido.');
        App.rotear();
      });
    });
  }

  function ligarDetalhes() {
    document.querySelectorAll('[data-cliente]').forEach((b) => {
      b.addEventListener('click', () => modalCliente(b.getAttribute('data-cliente')));
    });
  }

  function ligarBaixas() {
    document.querySelectorAll('[data-baixa]').forEach((b) => {
      b.addEventListener('click', async () => {
        const f = OB.db.faturas.find((x) => x.id === b.getAttribute('data-baixa'));
        const ok = await UI.confirmar({
          titulo: 'Dar baixa na fatura #' + f.numero,
          msg: `Confirma o recebimento de ${OB.money(f.valor)}? Se o domínio estiver suspenso, ele volta a funcionar imediatamente.`,
          ok: 'Confirmar recebimento',
        });
        if (!ok) return;
        OB.pagarFatura(f.id, 'Baixa manual');
        UI.toast('ok', 'Baixa registrada', 'A fatura foi marcada como paga.');
        App.rotear();
      });
    });
  }

  function ligarAcoesDominio() {
    document.querySelectorAll('[data-suspender]').forEach((b) => {
      b.addEventListener('click', async () => {
        const d = OB.q.dominioPorId(b.getAttribute('data-suspender'));
        const ok = await UI.confirmar({
          titulo: 'Suspender ' + d.dominio,
          msg: 'O domínio para de receber mensagens novas imediatamente. O conteúdo das caixas é preservado. Confirma?',
          ok: 'Suspender', perigo: true,
        });
        if (!ok) return;
        OB.atualizar('dominios', d.id, { status: 'suspenso' });
        OB.q.caixasDoDominio(d.id).forEach((c) => OB.atualizar('caixas', c.id, { status: 'suspensa' }));
        const a = OB.q.assinaturaDoDominio(d.id);
        if (a) OB.atualizar('assinaturas', a.id, { status: 'inadimplente' });
        OB.log('Domínio suspenso manualmente', d.dominio, 'alerta');
        UI.toast('ok', 'Domínio suspenso', d.dominio + ' parou de receber mensagens.');
        App.rotear();
      });
    });
    document.querySelectorAll('[data-reativar]').forEach((b) => {
      b.addEventListener('click', () => {
        const d = OB.q.dominioPorId(b.getAttribute('data-reativar'));
        OB.atualizar('dominios', d.id, { status: 'ativo' });
        OB.q.caixasDoDominio(d.id).forEach((c) => OB.atualizar('caixas', c.id, { status: 'ativa' }));
        const a = OB.q.assinaturaDoDominio(d.id);
        if (a) OB.atualizar('assinaturas', a.id, { status: 'ativa' });
        OB.log('Domínio reativado', d.dominio, 'ok');
        UI.toast('ok', 'Domínio reativado', d.dominio + ' voltou a receber mensagens.');
        App.rotear();
      });
    });
  }

  function modalCupom() {
    UI.modal({
      titulo: 'Novo cupom',
      corpo: `
        <div class="field"><label for="cp-cod">Código</label><input id="cp-cod" class="input mono" placeholder="OUTBOX20" style="text-transform:uppercase"></div>
        <div class="field"><label for="cp-desc">Descrição interna</label><input id="cp-desc" class="input" placeholder="Campanha de julho"></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label for="cp-tipo">Tipo</label>
            <select id="cp-tipo" class="select"><option value="percentual">Percentual</option><option value="fixo">Valor fixo</option></select>
          </div>
          <div class="field"><label for="cp-val">Valor</label><input id="cp-val" class="input" type="number" min="1" value="10"></div>
        </div>
        <div class="field"><label for="cp-lim">Limite de usos, 0 para ilimitado</label><input id="cp-lim" class="input" type="number" min="0" value="0"></div>`,
      acoes: `<button class="btn btn-ghost" data-fechar>Cancelar</button><button class="btn btn-primary" id="cp-ok">Criar cupom</button>`,
      aoAbrir: (bd) => {
        bd.querySelector('#cp-ok').addEventListener('click', () => {
          const cod = bd.querySelector('#cp-cod').value.trim().toUpperCase();
          if (cod.length < 3) return UI.toast('err', 'Código inválido', 'Use no mínimo 3 caracteres.');
          if (OB.db.cupons.some((c) => c.codigo === cod)) return UI.toast('err', 'Código já existe', 'Escolha outro código.');
          OB.db.cupons.push({
            codigo: cod,
            desc: bd.querySelector('#cp-desc').value.trim(),
            tipo: bd.querySelector('#cp-tipo').value,
            valor: Number(bd.querySelector('#cp-val').value) || 10,
            limite: Number(bd.querySelector('#cp-lim').value) || 0,
            usos: 0, ativo: true,
          });
          OB.salvar();
          OB.log('Cupom criado', cod, 'ok');
          UI.fecharModal();
          UI.toast('ok', 'Cupom criado', cod + ' já pode ser usado no checkout.');
          App.rotear();
        });
      },
    });
  }

  return { dash, clientes, dominios, caixas, financeiro, planos, cupons, chamados, logs, ligar, menu, desenharGraficos };
})();
