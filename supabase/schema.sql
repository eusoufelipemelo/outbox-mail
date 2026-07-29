-- ============================================================
-- OutBox Mail — esquema do banco (PostgreSQL / Supabase)
-- Versão 1:1 com o modelo do front-end (js/data.js):
--   PKs em texto (geradas pelo app), valores em REAIS (numeric),
--   dns como jsonb. Assim a hidratação e a gravação são diretas,
--   sem camada de tradução.
-- Rode no SQL Editor do Supabase, do início ao fim, uma vez só.
-- Idempotente: pode rodar de novo (drop + create).
-- ============================================================

-- ------------------------------------------------------------
-- 0. LIMPEZA (banco ainda sem dados de clientes)
-- ------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists caixas_recalculam_assinatura on caixas;
drop view if exists vw_metricas;
drop table if exists logs, chamados, faturas, assinaturas, caixas, dominios, perfis, contas, cupons, planos cascade;
drop function if exists handle_new_user() cascade;
drop function if exists conta_atual() cascade;
drop function if exists eh_equipe() cascade;
drop type if exists papel_usuario, status_dominio, status_caixa, tipo_endereco, ciclo_cobranca, status_assin, status_fatura, status_chamado cascade;

-- ------------------------------------------------------------
-- 1. CONTAS E PERFIS
--    perfis.id = auth.users.id. A senha vive no Supabase Auth.
-- ------------------------------------------------------------
create table contas (
  id         text primary key,
  empresa    text not null,
  doc        text,
  tipo       text not null default 'pj',
  telefone   text,
  cep        text,
  cidade     text,
  uf         text,
  origem     text default 'site',
  criado_em  timestamptz not null default now()
);

create table perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  conta_id   text references contas(id) on delete set null,
  nome       text not null,
  email      text not null unique,
  telefone   text,
  papel      text not null default 'cliente',   -- cliente | admin | suporte
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);
create index on perfis (conta_id);

-- ------------------------------------------------------------
-- 2. CATÁLOGO (o app usa OB.PLANOS; a tabela fica de referência)
-- ------------------------------------------------------------
create table planos (
  id             text primary key,
  nome           text not null,
  cota_gb        int not null,
  preco_mensal   numeric(10,2) not null,
  preco_anual    numeric(10,2) not null,
  preco_trienal  numeric(10,2) not null,
  custo_mensal   numeric(10,2) not null default 0,
  destaque       boolean not null default false,
  ordem          int not null default 0
);
insert into planos (id, nome, cota_gb, preco_mensal, preco_anual, preco_trienal, custo_mensal, destaque, ordem) values
  ('inicio',       'Início',       1,   9.90,  99.00, 238.00,  3.00, false, 1),
  ('essencial',    'Essencial',    10, 17.90, 179.00, 430.00,  6.00, false, 2),
  ('profissional', 'Profissional', 30, 23.90, 239.00, 574.00,  8.00, true,  3),
  ('business',     'Business',     60, 49.90, 499.00,1198.00, 17.00, false, 4);

create table cupons (
  codigo    text primary key,
  descricao text,
  tipo      text not null default 'percentual',
  valor     numeric(10,2) not null,
  limite    int not null default 0,
  usos      int not null default 0,
  ativo     boolean not null default true
);
insert into cupons (codigo, descricao, tipo, valor, limite, usos, ativo) values
  ('OUTBOX10',   'Campanha institucional', 'percentual', 10, 100, 0, true),
  ('PRIMEIRO50', '50% no primeiro mês',    'percentual', 50, 50,  0, true),
  ('MIGRACAO',   'Bônus de migração',      'fixo',       30, 0,   0, true);

-- ------------------------------------------------------------
-- 3. DOMÍNIOS, CAIXAS, ASSINATURAS, FATURAS
-- ------------------------------------------------------------
create table dominios (
  id             text primary key,
  conta_id       text not null references contas(id) on delete cascade,
  dominio        text not null unique,
  status         text not null default 'pendente',
  plano_id       text not null,
  ciclo          text not null default 'mensal',
  dkim_selector  text not null default 'obmail',
  dns            jsonb not null default '{"mx":false,"spf":false,"dkim":false,"dmarc":false}'::jsonb,
  criado_em      timestamptz not null default now(),
  ativado_em     timestamptz
);
create index on dominios (conta_id);

create table caixas (
  id             text primary key,
  dominio_id     text not null references dominios(id) on delete cascade,
  conta_id       text not null references contas(id) on delete cascade,
  local          text not null,
  nome           text,
  tipo           text not null default 'caixa',
  destino        text,
  cota_gb        int not null default 10,
  usado_mb       int not null default 0,
  status         text not null default 'ativa',
  senha_inicial  text,
  criado_em      timestamptz not null default now(),
  ultimo_acesso  timestamptz
);
create index on caixas (conta_id);
create index on caixas (dominio_id);

create table assinaturas (
  id                text primary key,
  conta_id          text not null references contas(id) on delete cascade,
  dominio_id        text not null references dominios(id) on delete cascade,
  plano_id          text not null,
  ciclo             text not null default 'mensal',
  qtd               int not null default 1,
  qtd_contratada    int not null default 1,
  valor_unit        numeric(10,2) not null default 0,
  valor_total       numeric(10,2) not null default 0,
  valor_ciclo       numeric(10,2) not null default 0,
  status            text not null default 'trial',
  proxima_cobranca  timestamptz,
  criado_em         timestamptz not null default now()
);
create index on assinaturas (conta_id);

create table faturas (
  id             text primary key,
  numero         text,
  conta_id       text not null references contas(id) on delete cascade,
  assinatura_id  text references assinaturas(id) on delete set null,
  competencia    timestamptz not null,
  valor          numeric(10,2) not null,
  vencimento     timestamptz not null,
  status         text not null default 'aberta',
  metodo         text,
  pago_em        timestamptz,
  criado_em      timestamptz not null default now()
);
create index on faturas (conta_id);

create table chamados (
  id         text primary key,
  conta_id   text not null references contas(id) on delete cascade,
  assunto    text not null,
  mensagem   text not null,
  status     text not null default 'aberto',
  criado_em  timestamptz not null default now()
);

create table logs (
  id        text primary key,
  conta_id  text references contas(id) on delete set null,
  ator      text,
  acao      text not null,
  alvo      text,
  tipo      text not null default 'info',
  quando    timestamptz not null default now()
);
create index on logs (conta_id, quando desc);

-- ------------------------------------------------------------
-- 4. FUNÇÕES DE APOIO (security definer)
-- ------------------------------------------------------------
create or replace function conta_atual()
returns text language sql stable security definer set search_path = public as $$
  select conta_id from perfis where id = auth.uid()
$$;

create or replace function eh_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel in ('admin','suporte') and ativo)
$$;

-- cria o perfil automaticamente quando um usuário nasce no Auth.
-- e-mail @outboxgroup.com.br vira admin; os demais, cliente.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    case when lower(new.email) like '%@outboxgroup.com.br' then 'admin' else 'cliente' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- 5. RLS
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

-- catálogo público para leitura
create policy planos_leitura on planos for select using (true);
create policy planos_equipe  on planos for all using (eh_equipe()) with check (eh_equipe());
create policy cupons_leitura on cupons for select using (true);
create policy cupons_equipe  on cupons for all using (eh_equipe()) with check (eh_equipe());

-- perfis: o próprio e a equipe leem; o próprio se atualiza (para vincular conta_id); equipe faz tudo
create policy perfis_ler    on perfis for select using (id = auth.uid() or eh_equipe());
create policy perfis_editar on perfis for update using (id = auth.uid() or eh_equipe()) with check (id = auth.uid() or eh_equipe());
create policy perfis_equipe on perfis for all using (eh_equipe()) with check (eh_equipe());

-- contas: dono ou equipe leem; usuário autenticado pode criar a própria; dono/equipe atualizam
create policy contas_ler    on contas for select using (id = conta_atual() or eh_equipe());
create policy contas_criar  on contas for insert to authenticated with check (true);
create policy contas_editar on contas for update using (id = conta_atual() or eh_equipe()) with check (id = conta_atual() or eh_equipe());
create policy contas_equipe on contas for all using (eh_equipe()) with check (eh_equipe());

-- tabelas ligadas à conta: dono (conta_atual) ou equipe, tudo
create policy dominios_conta    on dominios    for all using (conta_id = conta_atual() or eh_equipe()) with check (conta_id = conta_atual() or eh_equipe());
create policy caixas_conta      on caixas      for all using (conta_id = conta_atual() or eh_equipe()) with check (conta_id = conta_atual() or eh_equipe());
create policy assinaturas_conta on assinaturas for all using (conta_id = conta_atual() or eh_equipe()) with check (conta_id = conta_atual() or eh_equipe());
create policy chamados_conta    on chamados    for all using (conta_id = conta_atual() or eh_equipe()) with check (conta_id = conta_atual() or eh_equipe());

-- faturas: cliente lê as próprias; equipe faz tudo; cliente pode marcar como paga (update) da própria
create policy faturas_ler    on faturas for select using (conta_id = conta_atual() or eh_equipe());
create policy faturas_editar on faturas for update using (conta_id = conta_atual() or eh_equipe()) with check (conta_id = conta_atual() or eh_equipe());
create policy faturas_criar  on faturas for insert to authenticated with check (conta_id = conta_atual() or eh_equipe());
create policy faturas_equipe on faturas for all using (eh_equipe()) with check (eh_equipe());

-- logs: cliente lê/insere os próprios; equipe tudo
create policy logs_ler    on logs for select using (conta_id = conta_atual() or eh_equipe());
create policy logs_criar  on logs for insert to authenticated with check (conta_id = conta_atual() or conta_id is null or eh_equipe());
create policy logs_equipe on logs for all using (eh_equipe()) with check (eh_equipe());

-- ------------------------------------------------------------
-- 6. VISÃO DE MÉTRICAS (opcional, para relatórios)
-- ------------------------------------------------------------
create or replace view vw_metricas as
select
  (select coalesce(sum(valor_total),0) from assinaturas where status in ('ativa','inadimplente')) as mrr,
  (select count(*) from caixas   where tipo = 'caixa' and status = 'ativa')                        as caixas_ativas,
  (select count(*) from dominios where status = 'ativo')                                           as dominios_ativos,
  (select count(*) from dominios where status = 'pendente')                                        as dominios_pendentes,
  (select coalesce(sum(valor),0) from faturas where status = 'vencida')                            as vencido,
  (select coalesce(sum(valor),0) from faturas where status = 'paga')                               as recebido;

-- ============================================================
-- FIM. Próximo passo: criar o usuário admin no Authentication
-- (Felipe usa a própria senha). O trigger já marca papel=admin
-- para qualquer e-mail @outboxgroup.com.br.
-- ============================================================
