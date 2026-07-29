-- ============================================================
-- OutBox Mail — esquema do banco (PostgreSQL / Supabase)
-- Rode no SQL Editor do Supabase, do início ao fim, uma vez só.
-- Depois disso, o protótipo em localStorage pode ser trocado
-- pelo cliente do Supabase mantendo os mesmos nomes de campos.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TIPOS
-- ------------------------------------------------------------
create type papel_usuario   as enum ('cliente', 'admin', 'suporte');
create type status_dominio  as enum ('pendente', 'ativo', 'suspenso', 'cancelado');
create type status_caixa    as enum ('ativa', 'suspensa');
create type tipo_endereco   as enum ('caixa', 'alias', 'encaminhamento');
create type ciclo_cobranca  as enum ('mensal', 'anual', 'trienal');
create type status_assin    as enum ('trial', 'ativa', 'inadimplente', 'cancelada');
create type status_fatura   as enum ('aberta', 'paga', 'vencida', 'cancelada');
create type status_chamado  as enum ('aberto', 'respondido', 'fechado');

-- ------------------------------------------------------------
-- 2. CONTAS E USUÁRIOS
--    A autenticação fica no auth.users do Supabase.
--    perfis.id referencia auth.users.id (mesmo UUID).
-- ------------------------------------------------------------
create table contas (
  id           uuid primary key default gen_random_uuid(),
  empresa      text not null,
  documento    text,                        -- CNPJ ou CPF, só dígitos
  tipo         text not null default 'pj' check (tipo in ('pf','pj')),
  telefone     text,
  cep          text,
  cidade       text,
  uf           char(2),
  origem       text default 'site',         -- site, consultor, indicacao
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table perfis (
  id           uuid primary key references auth.users(id) on delete cascade,
  conta_id     uuid references contas(id) on delete cascade,
  nome         text not null,
  email        text not null unique,
  telefone     text,
  papel        papel_usuario not null default 'cliente',
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now()
);
create index on perfis (conta_id);

-- ------------------------------------------------------------
-- 3. CATÁLOGO DE PLANOS
--    Preços em centavos para evitar erro de arredondamento.
-- ------------------------------------------------------------
create table planos (
  id             text primary key,          -- inicio, essencial, profissional, business
  nome           text not null,
  cota_gb        int  not null,
  preco_mensal   int  not null,             -- centavos, total do ciclo mensal
  preco_anual    int  not null,             -- centavos, total do ciclo de 12 meses
  preco_trienal  int  not null,             -- centavos, total do ciclo de 36 meses
  custo_mensal   int  not null default 0,   -- centavos, custo por caixa no provedor
  destaque       boolean not null default false,
  ordem          int not null default 0,
  ativo          boolean not null default true,
  recursos       jsonb not null default '[]'::jsonb
);

insert into planos (id, nome, cota_gb, preco_mensal, preco_anual, preco_trienal, custo_mensal, destaque, ordem) values
  ('inicio',       'Início',       1,   990,  9900,  23800,  300, false, 1),
  ('essencial',    'Essencial',    10, 1790, 17900,  43000,  600, false, 2),
  ('profissional', 'Profissional', 30, 2390, 23900,  57400,  800, true,  3),
  ('business',     'Business',     60, 4990, 49900, 119800, 1700, false, 4);

-- ------------------------------------------------------------
-- 4. DOMÍNIOS
-- ------------------------------------------------------------
create table dominios (
  id             uuid primary key default gen_random_uuid(),
  conta_id       uuid not null references contas(id) on delete cascade,
  dominio        text not null unique,
  status         status_dominio not null default 'pendente',
  plano_id       text not null references planos(id),
  ciclo          ciclo_cobranca not null default 'mensal',
  dkim_selector  text not null default 'obmail',
  dns_mx         boolean not null default false,
  dns_spf        boolean not null default false,
  dns_dkim       boolean not null default false,
  dns_dmarc      boolean not null default false,
  dns_verificado_em timestamptz,
  provedor_ref   text,                      -- id do domínio no provedor de e-mail
  criado_em      timestamptz not null default now(),
  ativado_em     timestamptz
);
create index on dominios (conta_id);
create index on dominios (status);

-- ------------------------------------------------------------
-- 5. ENDEREÇOS (caixas, apelidos e redirecionamentos)
--    Senha NUNCA é gravada aqui: quem guarda é o provedor.
-- ------------------------------------------------------------
create table caixas (
  id             uuid primary key default gen_random_uuid(),
  dominio_id     uuid not null references dominios(id) on delete cascade,
  conta_id       uuid not null references contas(id) on delete cascade,
  local_part     text not null,             -- o que vem antes do @
  nome_exibicao  text,
  tipo           tipo_endereco not null default 'caixa',
  destino        text,                      -- para alias e encaminhamento
  cota_gb        int not null default 10,
  usado_mb       int not null default 0,
  status         status_caixa not null default 'ativa',
  provedor_ref   text,
  criado_em      timestamptz not null default now(),
  ultimo_acesso  timestamptz,
  unique (dominio_id, local_part)
);
create index on caixas (conta_id);
create index on caixas (dominio_id);

-- ------------------------------------------------------------
-- 6. ASSINATURAS E FATURAS
-- ------------------------------------------------------------
create table assinaturas (
  id                uuid primary key default gen_random_uuid(),
  conta_id          uuid not null references contas(id) on delete cascade,
  dominio_id        uuid not null references dominios(id) on delete cascade,
  plano_id          text not null references planos(id),
  ciclo             ciclo_cobranca not null default 'mensal',
  qtd               int not null default 1,        -- caixas cobradas hoje
  qtd_contratada    int not null default 1,        -- caixas compradas no checkout
  valor_unit        int not null,                  -- centavos, mensal equivalente por caixa
  valor_total       int not null,                  -- centavos, mensalidade equivalente
  valor_ciclo       int not null,                  -- centavos, cobrado a cada ciclo
  status            status_assin not null default 'trial',
  proxima_cobranca  date,
  gateway_ref       text,                          -- id da assinatura no gateway
  criado_em         timestamptz not null default now(),
  cancelado_em      timestamptz
);
create index on assinaturas (conta_id);
create index on assinaturas (status);

create table faturas (
  id             uuid primary key default gen_random_uuid(),
  numero         bigserial,
  conta_id       uuid not null references contas(id) on delete cascade,
  assinatura_id  uuid references assinaturas(id) on delete set null,
  competencia    date not null,
  valor          int not null,                     -- centavos
  vencimento     date not null,
  status         status_fatura not null default 'aberta',
  metodo         text,
  pago_em        timestamptz,
  gateway_ref    text,
  link_pagamento text,
  criado_em      timestamptz not null default now()
);
create index on faturas (conta_id);
create index on faturas (status, vencimento);

create table cupons (
  codigo     text primary key,
  descricao  text,
  tipo       text not null check (tipo in ('percentual','fixo')),
  valor      int  not null,                        -- % ou centavos
  limite     int  not null default 0,              -- 0 = ilimitado
  usos       int  not null default 0,
  ativo      boolean not null default true,
  expira_em  date
);

-- ------------------------------------------------------------
-- 7. SUPORTE E AUDITORIA
-- ------------------------------------------------------------
create table chamados (
  id         uuid primary key default gen_random_uuid(),
  conta_id   uuid not null references contas(id) on delete cascade,
  aberto_por uuid references perfis(id) on delete set null,
  assunto    text not null,
  mensagem   text not null,
  status     status_chamado not null default 'aberto',
  criado_em  timestamptz not null default now(),
  fechado_em timestamptz
);

create table logs (
  id        bigserial primary key,
  conta_id  uuid references contas(id) on delete set null,
  ator_id   uuid references perfis(id) on delete set null,
  ator_nome text,
  acao      text not null,
  alvo      text,
  tipo      text not null default 'info' check (tipo in ('info','ok','alerta')),
  quando    timestamptz not null default now()
);
create index on logs (conta_id, quando desc);

-- ------------------------------------------------------------
-- 8. FUNÇÕES DE APOIO
-- ------------------------------------------------------------

-- conta do usuário logado
create or replace function conta_atual()
returns uuid language sql stable security definer set search_path = public as $$
  select conta_id from perfis where id = auth.uid()
$$;

-- o usuário logado é da equipe OutBox
create or replace function eh_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis
    where id = auth.uid() and papel in ('admin','suporte') and ativo
  )
$$;

-- recalcula o valor da assinatura conforme as caixas existentes (mínimo 1)
create or replace function recalcular_assinatura(p_dominio uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_plano   planos%rowtype;
  v_ciclo   ciclo_cobranca;
  v_qtd     int;
  v_meses   int;
  v_total   int;
begin
  select p.* into v_plano
    from dominios d join planos p on p.id = d.plano_id
   where d.id = p_dominio;

  select ciclo into v_ciclo from assinaturas where dominio_id = p_dominio limit 1;
  if v_ciclo is null then return; end if;

  select greatest(1, count(*)) into v_qtd
    from caixas where dominio_id = p_dominio and tipo = 'caixa';

  v_meses := case v_ciclo when 'mensal' then 1 when 'anual' then 12 else 36 end;
  v_total := case v_ciclo
               when 'mensal'  then v_plano.preco_mensal
               when 'anual'   then v_plano.preco_anual
               else v_plano.preco_trienal
             end;

  update assinaturas
     set qtd         = v_qtd,
         valor_unit  = round(v_total::numeric / v_meses),
         valor_total = round(v_total::numeric / v_meses) * v_qtd,
         valor_ciclo = v_total * v_qtd
   where dominio_id = p_dominio;
end;
$$;

create or replace function trg_recalcular_assinatura()
returns trigger language plpgsql as $$
begin
  perform recalcular_assinatura(coalesce(new.dominio_id, old.dominio_id));
  return coalesce(new, old);
end;
$$;

create trigger caixas_recalculam_assinatura
after insert or update or delete on caixas
for each row execute function trg_recalcular_assinatura();

-- ------------------------------------------------------------
-- 9. RLS — cada cliente enxerga apenas a própria conta
-- ------------------------------------------------------------
alter table contas      enable row level security;
alter table perfis      enable row level security;
alter table dominios    enable row level security;
alter table caixas      enable row level security;
alter table assinaturas enable row level security;
alter table faturas     enable row level security;
alter table chamados    enable row level security;
alter table logs        enable row level security;
alter table planos      enable row level security;
alter table cupons      enable row level security;

-- catálogo é público para leitura, só a equipe altera
create policy planos_leitura   on planos for select using (true);
create policy planos_escrita   on planos for all    using (eh_equipe()) with check (eh_equipe());
create policy cupons_leitura   on cupons for select using (ativo or eh_equipe());
create policy cupons_escrita   on cupons for all    using (eh_equipe()) with check (eh_equipe());

-- perfis: o próprio usuário e a equipe
create policy perfis_ler     on perfis for select using (id = auth.uid() or eh_equipe());
create policy perfis_editar  on perfis for update using (id = auth.uid() or eh_equipe())
                                              with check (id = auth.uid() or eh_equipe());

-- contas
create policy contas_ler     on contas for select using (id = conta_atual() or eh_equipe());
create policy contas_editar  on contas for update using (id = conta_atual() or eh_equipe())
                                              with check (id = conta_atual() or eh_equipe());
create policy contas_equipe  on contas for all    using (eh_equipe()) with check (eh_equipe());

-- tabelas ligadas à conta: mesma regra para todas
create policy dominios_conta    on dominios    for all using (conta_id = conta_atual() or eh_equipe())
                                                  with check (conta_id = conta_atual() or eh_equipe());
create policy caixas_conta      on caixas      for all using (conta_id = conta_atual() or eh_equipe())
                                                  with check (conta_id = conta_atual() or eh_equipe());
create policy assinaturas_conta on assinaturas for all using (conta_id = conta_atual() or eh_equipe())
                                                  with check (conta_id = conta_atual() or eh_equipe());
create policy chamados_conta    on chamados    for all using (conta_id = conta_atual() or eh_equipe())
                                                  with check (conta_id = conta_atual() or eh_equipe());

-- faturas: cliente lê, só a equipe e as funções de serviço escrevem
create policy faturas_ler       on faturas for select using (conta_id = conta_atual() or eh_equipe());
create policy faturas_equipe    on faturas for all    using (eh_equipe()) with check (eh_equipe());

-- logs: cliente lê os próprios, equipe lê tudo, ninguém edita pelo cliente
create policy logs_ler          on logs for select using (conta_id = conta_atual() or eh_equipe());
create policy logs_equipe       on logs for all    using (eh_equipe()) with check (eh_equipe());

-- ------------------------------------------------------------
-- 10. VISÃO DE APOIO PARA O DASHBOARD
-- ------------------------------------------------------------
create or replace view vw_metricas as
select
  (select coalesce(sum(valor_total),0) from assinaturas where status in ('ativa','inadimplente')) as mrr_centavos,
  (select count(*) from caixas   where tipo = 'caixa' and status = 'ativa')                       as caixas_ativas,
  (select count(*) from dominios where status = 'ativo')                                          as dominios_ativos,
  (select count(*) from dominios where status = 'pendente')                                       as dominios_pendentes,
  (select coalesce(sum(valor),0) from faturas where status = 'vencida')                           as vencido_centavos,
  (select coalesce(sum(valor),0) from faturas where status = 'paga')                              as recebido_centavos;

-- ============================================================
-- FIM
-- Depois de rodar: crie o primeiro admin pelo painel do Supabase
-- (Authentication > Add user) e execute
--   update perfis set papel = 'admin' where email = 'voce@outboxgroup.com.br';
-- ============================================================
