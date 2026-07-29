# OutBox Mail

Sistema completo de venda e gestão de e-mail profissional da **OutBox Soluções Digitais**: vitrine de vendas, checkout, área do cliente e painel administrativo, em um único aplicativo.

Feito em HTML, CSS e JavaScript puros, sem build e sem dependência de framework. Roda abrindo o `index.html` em qualquer servidor estático.

---

## 1. Como rodar

```bash
cd outbox-mail && python3 -m http.server 4899
```

Depois acesse `http://localhost:4899`.

### Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@outboxgroup.com.br` | `admin123` |
| Cliente | `marcos@belluccimoveis.com.br` | `cliente123` |
| Cliente com domínio pendente de DNS | `camila@stopadesing.com.br` | `cliente123` |
| Cliente inadimplente | `rafael@newbikecenter.com.br` | `cliente123` |

Para recriar os dados de demonstração, rode `OutBoxMailReset()` no console do navegador.

---

## 2. O que já está pronto

**Vitrine de vendas**
Home, recursos, planos com os três ciclos, comparativo, migração, central de ajuda, FAQ, termos e política de privacidade. Formulário de proposta para quem precisa de mais de 10 caixas.

**Checkout em três passos**
Domínio e plano, dados da empresa, pagamento. Valida domínio duplicado, aplica cupom, cria a conta, o domínio, a assinatura, a primeira fatura e já provisiona o endereço `contato@`.

**Área do cliente**
Visão geral com avisos acionáveis, gestão de domínios com verificação de DNS, criação de caixas, apelidos e redirecionamentos, geração de senha forte, faturas com pagamento e recibo, troca de plano e de ciclo, tutoriais de configuração por aparelho.

**Painel administrativo**
Receita recorrente, margem, caixas ativas e inadimplência, gráficos de 8 meses, alertas operacionais, clientes, domínios com suspensão e reativação, todas as caixas, faturamento com baixa manual e exportação em CSV, planos com margem por ciclo, cupons, chamados e registro de atividade.

### A verificação de DNS é real

O botão **Verificar agora** consulta o DNS público de verdade, via DNS over HTTPS do Google, e compara o que está publicado com o que deveria estar. Não é simulação. Se o domínio ainda não apontar para os servidores configurados em `js/dns.js`, o sistema mostra exatamente quais registros faltam.

---

## 3. Tabela de preços

Valores por caixa de e-mail. O ciclo mais longo sempre tem o menor valor mensal, e o preço fica travado durante o período contratado.

| Plano | Espaço | Mensal | Anual | 3 anos |
|---|---|---|---|---|
| Início | 1 GB | R$ 9,90 | R$ 99,00 (R$ 8,25/mês) | R$ 238,00 (R$ 6,61/mês) |
| Essencial | 10 GB | R$ 17,90 | R$ 179,00 (R$ 14,92/mês) | **R$ 430,00** (R$ 11,94/mês) |
| Profissional | 30 GB | R$ 23,90 | R$ 239,00 (R$ 19,92/mês) | R$ 574,00 (R$ 15,94/mês) |
| Business | 60 GB | R$ 49,90 | R$ 499,00 (R$ 41,58/mês) | R$ 1.198,00 (R$ 33,28/mês) |

Desconto de aproximadamente 17% no anual e 33% no ciclo de 3 anos. Tudo isso está em `js/data.js`, na constante `PLANOS`. Para mudar um preço, altere apenas esse arquivo.

**Regra de cobrança:** o valor acompanha as caixas que existirem no domínio, com mínimo de uma. Apelidos e redirecionamentos não são cobrados.

---

## 4. Preciso de um banco de dados exclusivo?

**Para testar e demonstrar, não.** Hoje o sistema guarda tudo no `localStorage` do navegador, então funciona sem nenhuma infraestrutura. Você pode mostrar para um cliente ainda hoje.

**Para vender de verdade, sim, e exclusivo.** Estes são os motivos:

1. **Isolamento de responsabilidade.** Aqui trafegam dados cadastrais, faturamento e a estrutura de comunicação de terceiros. Misturar com o banco do sistema de consultores ou de outro projeto significa que um erro de consulta em um sistema expõe dados do outro.
2. **LGPD.** Você passa a ser controlador dos dados cadastrais e operador quanto às caixas. Base separada facilita responder pedido de exclusão, portabilidade e incidente sem tocar em outros sistemas.
3. **Backup e retenção próprios.** Cobrança e histórico de faturas exigem retenção fiscal, que é diferente do que outros projetos precisam.
4. **RLS por conta.** O `supabase/schema.sql` já isola cada cliente por `conta_id`. Essa política só funciona bem se o banco for dedicado a este produto.

**Recomendação:** um projeto Supabase novo, só do OutBox Mail. O plano gratuito atende a fase de validação com folga, e a migração para o pago acontece quando o volume justificar.

O arquivo `supabase/schema.sql` já traz tabelas, tipos, índices, funções, gatilho de recálculo de assinatura, políticas de RLS e uma visão de métricas. É só colar no SQL Editor e rodar de uma vez.

> Atenção ao usar o SQL Editor do Supabase: cole o conteúdo, não digite. O autocomplete do editor corrompe comandos longos.

Depois de rodar, crie o primeiro usuário em Authentication e promova a admin:

```sql
update perfis set papel = 'admin' where email = 'voce@outboxgroup.com.br';
```

---

## 5. Configurações necessárias para entrar no ar

### 5.1 Provedor de e-mail

Esta é a decisão mais importante e a única que não dá para adiar. O sistema é a camada de venda e gestão; quem entrega a mensagem é o provedor.

**Opção recomendada para começar: revenda white-label.** Você não hospeda nada, não cuida de reputação de IP e não atende incidente de madrugada.

| Provedor | Como funciona | Observação |
|---|---|---|
| Titan | Programa de revenda com API de provisionamento | Focado em pequenas empresas, boa margem |
| Zoho Mail | Revenda com painel próprio | Preço baixo, interface em português |
| Google Workspace | Programa de revendedor oficial | Marca forte, margem apertada |
| Microsoft 365 | Revenda via CSP | Exige contrato e volume mínimo |
| Rackspace Email | Revenda tradicional | Bom para volume |

**Opção de margem alta: servidor próprio** (Mailcow, iRedMail, Zimbra). Margem muito maior, mas você assume reputação de IP, antispam, backup, uptime e migração. Não recomendo antes de ter cerca de 100 caixas pagantes e alguém dedicado a operar isso.

Depois de fechar com o provedor, ajuste em **`js/dns.js`**, na constante `HOSTS`:

```js
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
```

Troque pelos hosts reais do provedor. Todas as telas do sistema, os tutoriais e o verificador de DNS passam a usar esses valores automaticamente.

### 5.2 DNS do seu próprio domínio de serviço

Registre um domínio para o serviço, por exemplo `outboxmail.com.br`, e crie os apontamentos que o provedor indicar (normalmente CNAMEs para os hosts deles). É esse domínio que aparece para o cliente, e não o do provedor. É o que faz o serviço parecer seu, porque é seu.

### 5.3 O que o cliente precisa publicar

O painel já gera e mostra, pronto para copiar:

| Tipo | Nome | Valor |
|---|---|---|
| MX | @ | `mx1.outboxmail.com.br` (prioridade 10) |
| MX | @ | `mx2.outboxmail.com.br` (prioridade 20) |
| TXT | @ | `v=spf1 include:_spf.outboxmail.com.br ~all` |
| TXT | `obmail._domainkey` | chave DKIM fornecida pelo provedor |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@dominio; pct=100` |
| CNAME | `autodiscover` | `autodiscover.outboxmail.com.br` (opcional, mas configura Outlook e iPhone sozinho) |

A chave DKIM exibida hoje é gerada localmente para demonstração. Quando integrar o provedor, busque a chave real pela API dele.

### 5.4 Gateway de pagamento

Assinatura recorrente precisa de um gateway que faça cobrança automática e avise quando o pagamento cair.

| Gateway | Vantagem | Ponto de atenção |
|---|---|---|
| Asaas | Pix, boleto e cartão recorrente, API simples, taxa baixa | Melhor custo para o mercado brasileiro |
| Iugu | Boa para assinatura, régua de cobrança pronta | Taxa um pouco maior |
| Pagar.me | Robusto, bom antifraude | Documentação mais técnica |
| Stripe | Excelente API | Menos aderente a Pix e boleto |

**Recomendação: Asaas**, pelo custo do Pix e pela régua de cobrança automática, que é o que resolve inadimplência sem trabalho manual.

O que precisa existir na integração:
1. Criar cliente no gateway quando a conta é criada
2. Criar assinatura recorrente com o valor e o ciclo escolhidos
3. Receber o webhook de pagamento confirmado e dar baixa na fatura
4. Receber o webhook de atraso, suspender o domínio após a carência e reativar quando pagar

A carência está em `OB.db.config.carencia_dias`, hoje 5 dias.

### 5.5 Envio de e-mails transacionais

O sistema precisa mandar mensagem de boas-vindas, senha da caixa, aviso de vencimento e recuperação de acesso. Use um serviço de saída separado do produto que você vende, por exemplo Amazon SES, Resend ou Mailgun, com domínio e reputação próprios.

### 5.6 Emissão de nota fiscal

Serviço de comunicação e valor adicionado tem tratamento tributário próprio. Fale com o seu contador antes da primeira venda para definir o código de serviço e a alíquota de ISS do município. O recibo do sistema é um comprovante interno e não substitui a nota fiscal.

### 5.7 Documentos jurídicos

`#/termos` e `#/privacidade` já trazem um modelo de referência, incluindo política de uso aceitável (o item que autoriza você a suspender um cliente que dispare spam e queime a reputação de todo mundo). Revise com apoio jurídico antes de publicar.

---

## 6. Ordem sugerida para colocar no ar

1. Fechar o provedor de e-mail e ajustar `HOSTS` em `js/dns.js`
2. Registrar o domínio do serviço e apontar conforme o provedor
3. Criar o projeto Supabase exclusivo e rodar `supabase/schema.sql`
4. Trocar a camada de dados do `localStorage` pelo cliente do Supabase
5. Integrar o gateway de pagamento e os webhooks
6. Ligar o provisionamento automático via API do provedor
7. Configurar o e-mail transacional
8. Revisar os textos jurídicos e ligar o Google Analytics ou similar
9. Publicar e migrar de dois a três clientes conhecidos antes de abrir a venda

Os passos 1, 2 e 3 já liberam a venda assistida, com o provisionamento feito manualmente pela sua equipe enquanto os passos 4 a 6 ficam prontos.

---

## 7. Estrutura dos arquivos

```
outbox-mail/
├── index.html                 # SPA, meta tags e OpenGraph
├── manifest.webmanifest       # instalação como aplicativo
├── Dockerfile                 # nginx, pronto para EasyPanel
├── css/styles.css             # design system da marca OutBox
├── js/
│   ├── icons.js               # ícones SVG (Lucide), sem emoji
│   ├── data.js                # modelo de dados, planos, métricas, persistência
│   ├── dns.js                 # hosts, registros, verificação real e tutoriais
│   ├── ui.js                  # toast, modal, máscaras, tema, senhas
│   ├── auth.js                # login, recuperação, sessão
│   ├── charts.js              # gráficos do dashboard
│   ├── site.js                # vitrine e checkout
│   ├── cliente.js             # área do cliente
│   ├── admin.js               # painel administrativo
│   └── app.js                 # roteador e casca do painel
├── supabase/schema.sql        # banco de produção com RLS
└── assets/                    # logos, ícones e imagem OpenGraph
```

**Onde mexer com mais frequência**

| Preciso mudar | Arquivo |
|---|---|
| Preço, plano, ciclo ou custo | `js/data.js`, constantes `PLANOS` e `CICLOS` |
| Servidores, registros de DNS, tutoriais | `js/dns.js` |
| Textos da vitrine, FAQ, termos | `js/site.js` |
| Cores, tipografia, espaçamento | `css/styles.css` |
| WhatsApp do suporte | `js/site.js`, constante `WPP` |

> Ao publicar uma alteração, suba o número de versão dos assets no `index.html` (`?v=6` para `?v=7`). Sem isso, o navegador do cliente continua com o arquivo antigo em cache.

---

## 8. Publicação

O projeto é estático. Funciona em qualquer lugar que sirva arquivos.

**Vercel:** suba a pasta em um repositório e conecte. Não precisa de configuração de build.

**EasyPanel ou qualquer Docker:** o `Dockerfile` já está pronto com nginx, fallback de rota e política de cache.

```bash
docker build -t outbox-mail . && docker run -p 8080:80 outbox-mail
```

Antes de publicar, troque `mail.outboxgroup.com.br` pelas URLs reais nas meta tags do `index.html`.

---

Desenvolvido por [OutBox Group](https://www.outboxgroup.com.br)
