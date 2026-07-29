/* ============================================================
   OutBox Mail — Camada Supabase (nuvem)
   Mantém a renderização síncrona do app: no login, hidrata o
   OB.db a partir do banco; nas mutações, grava de volta
   (write-through otimista). O schema é 1:1 com o modelo, então
   os objetos do app são as próprias linhas das tabelas.
   Se não houver credenciais, tudo isto fica inerte (modo demo).
   ============================================================ */
window.Supa = (function () {
  const cfg = window.OBMAIL_CONFIG || {};
  const temLib = typeof window.supabase !== 'undefined' && window.supabase.createClient;
  const ativo = !!(cfg.SUPABASE_URL && cfg.SUPABASE_KEY && temLib);
  let sb = null;
  if (ativo) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }

  function traduzErro(e) {
    const m = (e && e.message || '').toLowerCase();
    if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
    if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado.';
    if (m.includes('already registered') || m.includes('already been registered')) return 'Já existe uma conta com esse e-mail.';
    if (m.includes('password')) return 'A senha precisa ter no mínimo 6 caracteres.';
    return (e && e.message) || 'Não foi possível concluir a operação.';
  }

  /* ---------------- sessão e perfil ---------------- */
  async function sessao() {
    if (!ativo) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  }
  async function perfil(userId) {
    const { data } = await sb.from('perfis').select('*').eq('id', userId).maybeSingle();
    return data || null;
  }
  async function entrar(email, senha) {
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    if (error) return { erro: traduzErro(error) };
    const p = await perfil(data.session.user.id);
    if (!p) return { erro: 'Conta sem perfil configurado. Fale com o suporte.' };
    if (!p.ativo) return { erro: 'Esta conta está desativada.' };
    return { perfil: p };
  }
  async function sair() { if (ativo) await sb.auth.signOut(); }

  /* ---------------- hidratação do cache ---------------- */
  async function hidratar() {
    const db = OB.db;
    const q = (t, mod) => (mod ? mod(sb.from(t).select('*')) : sb.from(t).select('*'));
    const [contas, dominios, caixas, assinaturas, faturas, chamados, logs, perfis, cupons] = await Promise.all([
      q('contas'), q('dominios'), q('caixas'), q('assinaturas'), q('faturas'), q('chamados'),
      sb.from('logs').select('*').order('quando', { ascending: false }).limit(200),
      q('perfis'), q('cupons'),
    ]);
    db.contas = contas.data || [];
    db.dominios = dominios.data || [];
    db.caixas = caixas.data || [];
    db.assinaturas = assinaturas.data || [];
    db.faturas = faturas.data || [];
    db.chamados = chamados.data || [];
    db.logs = logs.data || [];
    db.usuarios = (perfis.data || []);
    db.cupons = (cupons.data || []).map((c) => ({ ...c, desc: c.descricao }));
    OB.nuvem = true;
  }

  /* ---------------- write-through ---------------- */
  const fila = [];
  function aviso(err, contexto) {
    console.warn('[Supa] erro em', contexto, err);
    if (window.UI) UI.toast('warn', 'Sincronização', 'Uma alteração não foi salva na nuvem: ' + contexto + '. Recarregue se persistir.');
  }
  function envia(promiseFn, contexto) {
    if (!ativo || !OB.nuvem) return;
    Promise.resolve().then(promiseFn).then((r) => { if (r && r.error) aviso(r.error, contexto); }).catch((e) => aviso(e, contexto));
  }
  function upsert(tabela, obj) { envia(() => sb.from(tabela).upsert(obj), 'gravar ' + tabela); }
  function update(tabela, id, campos) { envia(() => sb.from(tabela).update(campos).eq('id', id), 'atualizar ' + tabela); }
  function del(tabela, id) { envia(() => sb.from(tabela).delete().eq('id', id), 'remover ' + tabela); }
  function log(obj) { envia(() => sb.from('logs').insert(obj), 'registrar log'); }
  function cupom(c) {
    envia(() => sb.from('cupons').upsert({
      codigo: c.codigo, descricao: c.desc || c.descricao || '', tipo: c.tipo,
      valor: c.valor, limite: c.limite, usos: c.usos, ativo: c.ativo,
    }), 'gravar cupom');
  }

  /* ---------------- cadastro (checkout) ---------------- */
  /*
    Cria o acesso no Auth e provisiona a conta completa, na ordem
    que as políticas de RLS exigem:
    signUp -> sessão -> vincula conta_id no perfil -> conta ->
    domínio + caixa contato + assinatura + fatura.
    Recebe o mesmo "pedido" do checkout e devolve o perfil logado.
  */
  async function registrar(p) {
    const email = p.email.trim().toLowerCase();
    const { data, error } = await sb.auth.signUp({
      email, password: p.senha, options: { data: { nome: p.contato } },
    });
    if (error) return { erro: traduzErro(error) };
    if (!data.session) return { erro: 'Cadastro criado, mas a sessão não iniciou. Verifique a confirmação de e-mail no Supabase.' };
    const uid = data.session.user.id;

    const conta = {
      id: OB.uid('cta'), empresa: p.empresa, doc: p.doc,
      tipo: String(p.doc || '').replace(/\D/g, '').length > 11 ? 'pj' : 'pf',
      telefone: p.telefone, cep: '', cidade: p.cidade, uf: p.uf, origem: 'site',
      criado_em: new Date().toISOString(),
    };
    let r = await sb.from('contas').insert(conta);
    if (r.error) return { erro: 'Falha ao criar a conta: ' + traduzErro(r.error) };

    r = await sb.from('perfis').update({ conta_id: conta.id, nome: p.contato, telefone: p.telefone }).eq('id', uid);
    if (r.error) return { erro: 'Falha ao vincular o perfil: ' + traduzErro(r.error) };

    const plano = OB.planoPor(p.planoId);
    const unit = OB.precoUnit(p.planoId, p.ciclo);
    const agora = new Date();
    const prox = new Date(agora); prox.setDate(prox.getDate() + 7);

    const dominio = {
      id: OB.uid('dom'), conta_id: conta.id, dominio: p.dominio,
      status: 'pendente', plano_id: p.planoId, ciclo: p.ciclo, dkim_selector: 'obmail',
      dns: { mx: false, spf: false, dkim: false, dmarc: false },
      criado_em: agora.toISOString(), ativado_em: null,
    };
    r = await sb.from('dominios').insert(dominio);
    if (r.error) return { erro: 'Falha ao criar o domínio: ' + traduzErro(r.error) };

    const caixa = {
      id: OB.uid('cx'), dominio_id: dominio.id, conta_id: conta.id,
      local: 'contato', nome: 'Contato ' + p.empresa, tipo: 'caixa', destino: '',
      cota_gb: plano.cota, usado_mb: 0, status: 'ativa', senha_inicial: OB.senhaAleatoria(),
      criado_em: agora.toISOString(), ultimo_acesso: null,
    };
    await sb.from('caixas').insert(caixa);

    const assin = {
      id: OB.uid('asn'), conta_id: conta.id, dominio_id: dominio.id,
      plano_id: p.planoId, ciclo: p.ciclo, qtd: 1, qtd_contratada: p.qtd || 1,
      valor_unit: unit, valor_total: unit, valor_ciclo: OB.totalCiclo(p.planoId, p.ciclo),
      status: 'trial', proxima_cobranca: prox.toISOString(), criado_em: agora.toISOString(),
    };
    await sb.from('assinaturas').insert(assin);

    await sb.from('faturas').insert({
      id: OB.uid('fat'), numero: String(Date.now()).slice(-6),
      conta_id: conta.id, assinatura_id: assin.id, competencia: agora.toISOString(),
      valor: OB.totalCiclo(p.planoId, p.ciclo), vencimento: prox.toISOString(),
      status: 'aberta', metodo: null, pago_em: null, criado_em: agora.toISOString(),
    });

    log({ id: OB.uid('log'), conta_id: conta.id, ator: p.contato, acao: 'Conta criada pelo site', alvo: p.dominio, tipo: 'ok', quando: agora.toISOString() });

    const perfilLogado = await perfil(uid);
    return { perfil: perfilLogado };
  }

  return { ativo, get client() { return sb; }, sessao, perfil, entrar, sair, hidratar, upsert, update, del, log, cupom, registrar };
})();
