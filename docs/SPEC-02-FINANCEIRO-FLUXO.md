# SPEC-02 — Financeiro, Pagamento e Fluxo de Liberação de Treino

Status: **aprovado pelo product owner** · Marca: PERSONAL TRAINING DOUTOR LUIZ C. JÚNIOR
Referências: MFIT Personal, WIKI4FIT, Tecnofit Personal

---

## 1. Requisito original

> "Pode ter financeiro, aba de criação de contas e liberação de pedido de treino após o pagamento.
> Daí o educador físico periodiza, tem anamnese etc, completo."

Traduzido para fluxo SaaS:

1. **Criação de conta**: cliente se registra, pode visualizar só a home e marketplace de personals.
2. **Solicitação de treino**: cliente escolhe um personal, solicita um treino (status `pendente_pagamento`).
3. **Pagamento**: integração com gateway (Stripe, PagSeguro), cliente paga.
4. **Liberação**: após pagamento confirmado, status muda para `ativo`. Personal acessa a anamnese do
   cliente e monta a periodização.
5. **Execução**: cliente segue o treino, personal monitora e ajusta.

---

## 2. Impacto no schema

### 2.1 Novo: `subscription_requests`

Tabela que registra o pedido de treino (a conversão):

```sql
create type subscription_status as enum (
  'pendente_pagamento',    -- cliente solicitou, aguardando pagamento
  'pagamento_processando', -- webhooks de pagamento em voo
  'ativo',                 -- pagamento confirmado, personal pode periodizar
  'vencido',               -- periodização expirou (conforme data de fim)
  'cancelado_cliente',     -- cliente cancelou
  'cancelado_personal'     -- personal deletou o cliente
);

create table subscription_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  personal_id uuid not null references profiles on delete restrict,
  client_id uuid not null references clients on delete cascade,
  
  requested_at timestamptz not null default now(),
  status subscription_status not null default 'pendente_pagamento',
  
  -- periodizacao vinculada
  periodization_id uuid references periodizations on delete set null,
  
  -- financeiro
  price_cents numeric not null,         -- centavos, ex: 29900 = R$ 299,00
  duration_days integer not null,       -- quantos dias de acesso (ex: 30, 90)
  
  -- pagamento via gateway
  payment_provider text not null,       -- 'stripe', 'pagseguro', etc
  payment_id text,                      -- tx ID no gateway (ex: ch_123...)
  paid_at timestamptz,
  
  -- chaves para reconciliação
  idempotency_key text unique,          -- evitar duplicata de pagamento
  payment_metadata jsonb,               -- resposta completa do gateway
  
  -- rastreamento
  notes text,
  created_by uuid not null references profiles,
  updated_at timestamptz not null default now(),
  
  constraint price_positive check (price_cents > 0),
  constraint duration_positive check (duration_days > 0)
);

create index subscription_requests_organization on subscription_requests (organization_id);
create index subscription_requests_client on subscription_requests (client_id);
create index subscription_requests_personal on subscription_requests (personal_id);
create index subscription_requests_status on subscription_requests (status);
```

### 2.2 Modificação: `clients` — status de acesso

```sql
alter table clients
  add column subscription_status subscription_status;
  -- espelho de subscription_requests.status para leitura rápida

alter table clients
  add column subscription_expires_at timestamptz;
  -- data de expiração da periodização atual
```

RLS: Um personal só vê `clients` cuja `subscription_status` é `'ativo'` (ou `'vencido'` em
contexto de renovação). Cliente não autorizado é invisível — não vaza lista de personals com
seus clientes.

### 2.3 Novo: `payment_webhooks` — auditoria

Log de todos os webhooks de pagamento para rastreamento e retry:

```sql
create type webhook_status as enum ('recebido', 'processado', 'erro', 'ignorado');

create table payment_webhooks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,               -- 'stripe', 'pagseguro'
  provider_event_id text not null unique,
  event_type text not null,             -- 'charge.paid', 'charge.failed', etc
  payload jsonb not null,
  status webhook_status not null default 'recebido',
  subscription_request_id uuid references subscription_requests on delete set null,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  
  create index payment_webhooks_subscription on payment_webhooks (subscription_request_id);
);
```

### 2.4 Novo: `payment_settings` — chaves do gateway por organization

```sql
create table payment_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations on delete cascade,
  provider text not null,               -- 'stripe', 'pagseguro'
  public_key text not null,             -- chave publica (seguro publicar)
  secret_key text not null,             -- chave secreta (criptografar em rest, nunca em logs)
  webhook_secret text,                  -- secret para validar webhook assinatura
  active bool not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: apenas owner da organizacao pode ver e editar
```

---

## 3. Fluxo de pagamento

### 3.1 Front-end: Cliente solicita treino

**Tela de marketplace**

- Lista de personals com foto, nome, especialidades, preço, rating.
- Filtro por: especialidade (hipertrofia, emagrecimento, força, etc), localidade.
- CTA: `Solicitar treino` → abre modal com:
  - Personal selecionado
  - Opções de duração (30 dias, 90 dias, 180 dias, 1 ano) → preços diferentes
  - Observação (opcional)
  - Termos de uso
  - Botão `Prosseguir com pagamento`

**Checkout**

- Resumo de preço, duração, personal.
- Campo de e-mail e telefone pre-preenchidos.
- CPF (obrigatório para nota fiscal no Brasil).
- Forma de pagamento: cartão de crédito, PIX, boleto (conforme gateway).
- Stripe Elements (cartão) ou SDK de gateway integrado.
- Após submit: webhooks confirmam pagamento em tempo real (ou polling para PIX/boleto).

**Página de confirmação**

- Sucesso: "Seu treino foi solicitado com sucesso! O personal entrará em contato em breve."
- Pendente: "Pagamento sob processamento. Você receberá uma confirmação no e-mail."
- Erro: "Pagamento recusado. Tente novamente ou entre em contato."

### 3.2 Back-end: Edge Function de pagamento

```
POST /api/payments/create-checkout
  body: { subscription_request_id, amount, duration_days, payment_method }
  → Stripe.checkout.create() ou PagSeguro.createCharge()
  → subscriber_request.payment_id ← transaction ID
  → subscriber_request.status = 'pagamento_processando'
  → retorna checkout URL ou token

POST /api/webhooks/payment/{provider}
  autenticado com webhook_secret
  → valida assinatura
  → atualiza payment_webhooks
  → se charge.paid:
    → subscription_request.status = 'ativo'
    → clients.subscription_status = 'ativo'
    → clients.subscription_expires_at = now() + duration_days
    → envia e-mail para personal: "Novo cliente: [Nome]. Anamnese pendente."
    → envia e-mail para cliente: "Seu treino está ativo! Aguarde a periodização."
```

### 3.3 Retry e reconciliação

- Cron job 2x ao dia: lista `subscription_requests` com status `'pagamento_processando'`
  há mais de 1 hora e checa status no gateway.
- Se transação desapareceu no gateway, muda para `'pagamento_falhou'` e notifica cliente.
- Tabela `payment_webhooks` permite replay de webhook perdido sem duplicar.

---

## 4. Impacto em RLS e autenticação

### 4.1 Visibilidade de clients

```sql
-- personal vê apenas clientes seu cujos status e 'ativo' ou 'vencido' (renovacao)
create policy "personal_sees_own_clients"
  on clients for select
  using (
    auth.uid() in (select personal_id from organization_members where organization_id = clients.organization_id)
    and clients.subscription_status in ('ativo', 'vencido')
  );

-- cliente vê apenas seus dados
create policy "client_sees_self"
  on clients for select
  using (auth.uid() = profile_id);
```

### 4.2 Criação de conta de cliente sem organization_id

Cliente é criado com `organization_id = null` até submeter um `subscription_request`. Apenas após
pagamento confirmado, `organization_id` é preenchido e o cliente vira visível para o personal.

---

## 5. Fluxo de contas

### 5.1 Primeiro acesso

1. **Landing page** (sem autenticação): CTA `Criar conta como cliente` ou `Quero ser personal`.
2. **Sign-up cliente**: e-mail, senha, nome, data de nasc, sexo. Vai para dashboard vazio com
   ícone de marketplace.
3. **Sign-up personal**: e-mail, senha, nome, CREF, especialidades, foto, bio, preço base.
   Vai para dashboard de personals (meus clientes, criar periodização, relatórios).

### 5.2 Proteção de rotas

```typescript
// (app)/dashboard/page.tsx
if (!user) redirect('/login');

if (user.role === 'cliente') {
  if (!user.subscription_status || user.subscription_status === 'pendente_pagamento') {
    redirect('/marketplace');
  }
  // cliente ativo: mostra meus-treinos
}

if (user.role === 'personal') {
  // personal: mostra meus-clientes, criar-periodizacao, etc
}
```

---

## 6. Pricing e modelos

### 6.1 Estrutura proposta (exemplo, ajustar com negócio)

| Duração | Preço   |
|---------|---------|
| 30 dias | R$ 299  |
| 90 dias | R$ 799  |
| 180 dias| R$ 1.499|
| 12 meses| R$ 2.499|

Margem de configuração por `organization` via admin dashboard. Personal pode oferecer desconto
por duração ou para primeiro cliente.

### 6.2 Renovação

Após `subscription_expires_at`, status muda para `'vencido'` (função agendada). Cliente vê
banner: "Seu treino expirou em [data]. Renovar agora?" → leva ao marketplace.

---

## 7. Critérios de aceite

- [ ] Cliente cria conta, vê marketplace filtrado por especialidade.
- [ ] Cliente solicita treino, preenche checkout Stripe/PagSeguro sem sair da app.
- [ ] Webhook de pagamento confirmado muda status para `'ativo'` e notifica personal.
- [ ] Personal não vê cliente cujo `subscription_status` ≠ `'ativo'` até renovar.
- [ ] Pagamento duplicado é prevenido por `idempotency_key`.
- [ ] Webhook perdido é recuperado manualmente via replay de `payment_webhooks`.
- [ ] Acesso a anamnese e periodização é bloqueado para cliente com status ≠ `'ativo'`.
- [ ] Email de confirmação é enviado para ambas as partes.
- [ ] Renovação com 7 dias de antecedência é sugerida.

---

## 8. Fora de escopo

- Integrações com ERP/nota fiscal (fatura depois).
- Programa de afiliado ou comissão.
- Múltiplas periodizações ativas simultaneamente.
