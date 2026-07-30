# Roadmap — PERSONAL TRAINING DOUTOR LUIZ C. JÚNIOR

## Atualização — 2026-07-30 (revisão corretiva + destrave do deploy)

Esta entrada **corrige** uma atualização anterior da mesma data, que registrava
como concluído e validado trabalho que não estava. A auditoria item a item está
em `DIARIO_DE_BORDO.md`.

### Concluído (verificado)
- [x] Módulo de Avaliações Físicas (schema `client_assessments`, actions `getAssessments` / `createAssessment`).
- [x] Aba de avaliações do Aluno em `/alunos/[clientId]`.
- [x] **Causa raiz da falha de deploy removida**: `Dockerfile` multi-stage + `.dockerignore` + `output: 'standalone'`, agora presentes em `main` (PR #2, merge `3e2cac8`). O build falhava porque o repositório não tinha Dockerfile. Ver `docs/DEPLOY_EASYPANEL.md`.
  - ⚠️ **Não confirmado**: o `docker build` nunca foi executado (sem daemon Docker no ambiente de desenvolvimento). As premissas foram validadas isoladamente, mas o deploy só se confirma no primeiro build do EasyPanel. Não tratar como concluído até um build verde.
- [x] **Build de produção passa**: 27 erros de lint pré-existentes corrigidos. `npm run lint`, `npx tsc --noEmit` e `npm run build` limpos — antes o build falhava, o que também quebraria o build Docker do EasyPanel.
- [x] **Tipagem de domínio real** (`lib/types/dominio.ts`): substitui 19 `any` por tipos que descrevem o runtime. Remover os `eslint-disable` cegos revelou 6 bugs latentes (ex.: `Array.from({ length: null })` quando `series` é nulo).
- [x] **Migration 0010 corrigida e validada contra PostgreSQL 16 real**: a versão anterior não aplicava — erro de sintaxe em `add constraint if not exists`, tipos `session_label_enum` / `training_split_enum` inexistentes, coluna `restricted_movement_patterns` inexistente, `search_vector` sem backfill, trigram e unaccent nunca aplicados de fato. Matriz de testes em `docs/MIGRATIONS.md`.
- [x] **Mover / Copiar exercício entre abas A–G**: `movePrescriptionItem` e `copyPrescriptionItem` no arquivo canônico de actions, com recálculo de `order_index` e `revalidatePath`; UI via Popover em `PrescriptionItemCard`.
- [x] **Regressão revertida**: `components/builder/workout-builder.tsx` havia sido sobrescrito, perdendo drag-drop real (`@hello-pangea/dnd`), persistência de ordem e os campos editáveis de prescrição. Restaurado.
- [x] **RPC `search_exercises` conectada à UI**: `catalog-sidebar.tsx` deixou de buscar com `ilike` e passou a usar a RPC, ganhando busca sem acento, tolerância a erro de digitação (trigram), busca por alias e as anotações contextuais (restrito / sem equipamento / já prescrito) renderizadas nos resultados. O contexto (`clientId`, `microcycleId`) desce da página → builder → sidebar.
- [x] Assinatura da RPC corrigida antes de aplicar: `p_muscle` (texto, comparava por nome) → `p_muscle_id` (uuid). A UI sempre enviou o id do músculo; o filtro por nome nunca teria casado.
- [x] Corrigida chamada duplicada à busca: dois `useEffect` disparavam no mount do catálogo, gerando duas requisições idênticas por carregamento. Unificados em um.
- [x] Anotação "já prescrito" deixou de ficar obsoleta: adicionar um exercício agora re-executa a busca, e falhas do `addPrescriptionItem` passaram a exibir mensagem (`role="alert"`) em vez de falhar em silêncio.
- [x] `aliases_pt` restaurado no resultado da busca: a RPC não os retornava, e a sidebar havia perdido a exibição dos apelidos — que é o que explica por que "hip thrust" traz "Elevação pélvica".
- [x] `libc6-compat` adicionado no Dockerfile (Alpine usa musl; os binários nativos do SWC esperam glibc). Recomendação do Dockerfile oficial do Next.js, incluída porque o build não pode ser testado aqui.
- [x] **Dockerfile aceita `SUPABASE_URL` / `SUPABASE_KEY` como alias** de `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, que é a nomenclatura já publicada pelo EasyPanel. Resolução feita dentro de um `RUN` (semântica POSIX) gravando `.env.production`, em vez de depender de expansão aninhada no `ENV`.
- [x] **Guarda contra vazamento da service_role**: como o alias `SUPABASE_KEY` é genérico, o Dockerfile decodifica o payload do JWT e aborta o build se o papel for `service_role` — que nunca pode ser inlinada num `NEXT_PUBLIC_*`.
- [x] **`npm run db:migrate`**: script que aplica uma migration no banco remoto e roda 5 verificações automáticas (constraints, coluna da anamnese, RPC registrada, `search_vector` preenchido, busca retornando). Lê a conexão de `SUPABASE_DB_URL` no ambiente, nunca por argumento, para não deixar a senha no histórico do shell. Testado ponta a ponta contra PostgreSQL 16 real, incluindo reaplicação, migration inexistente e detecção de falha na verificação.
- [x] Código morto removido: query malformada de `microcycles` que disparava requisição inválida ao Supabase em todo carregamento da página de periodização.

### Já existia — registrado por engano como novo
- Drag-drop e reordenação dentro da sessão, com persistência (`workout-builder.tsx` + `PrescriptionItemCard`).
- Edição de séries/reps/carga/RIR/RPE/pausa com save debounced (`PrescriptionItemCard`).
- `sessions.label`, unique `(microcycle_id, label)`, `periodizations.split` — migration **0005**.
- `exercises.search_vector` e índices GIN/trigram — migration **0004**.
- Extensões `unaccent` e `pg_trgm` — migration **0001**.

### Em andamento
- [ ] **Confirmar o primeiro build verde no EasyPanel.** O build de 30/07 15:36 já executou o Dockerfile e parou na guarda de variáveis (comportamento correto, pois os build args vinham como `SUPABASE_URL`/`SUPABASE_KEY`). O Dockerfile passou a aceitar esses nomes como alias, então o próximo build deve avançar. Falta um build concluído.
- [ ] **CRÍTICO — o domínio do Supabase não serve a API.** `xpert-backend-supabase.qfotry.easypanel.host` resolve corretamente para `164.68.116.21` (mesmo servidor do painel), mas devolve 404 em HTML em `/rest/v1/` e `/auth/v1/health` — não é o formato de erro do PostgREST. Diagnóstico: o domínio está roteado para outro serviço da stack (provavelmente o Studio) em vez do gateway **Kong** (porta 8000), que é quem serve `/rest/v1/`. Como é o mesmo endereço de `NEXT_PUBLIC_SUPABASE_URL`, o app subiria sem carregar dados. Passo a passo para achar a URL certa em `docs/MIGRATIONS.md`.
- [ ] **CRÍTICO — aplicar a migration 0010 no Supabase.** Agora é um comando: `export SUPABASE_DB_URL=... && npm run db:migrate`, que aplica e verifica sozinho. Bloqueado pelo item acima (sem endpoint/porta acessível).
- [ ] Impor o teto de abas conforme o `split` da periodização e bloquear a 8ª sessão (a UI hoje lista as sessões existentes, sem validar o limite).
- [ ] **Remover o fallback de busca** em `searchExercises()` depois de aplicar a 0010. Hoje, se a RPC não existir, a busca cai em `ilike` para não derrubar a tela — comportamento degradado e temporário, sinalizado no log do servidor e (em dev) na própria sidebar.

### Próximos passos
- [ ] Suíte de testes automatizados. `vitest` está configurado mas **não existe nenhum arquivo de teste** (`npm test` sai com código 1).
- [ ] Gerar os tipos do Supabase (`supabase gen types typescript`) e eliminar o `any` de `lib/types/database.ts`.
- [ ] Conectar `lib/prescription-engine/prescription-calculator.ts` ao fluxo de adicionar exercício — hoje é código morto, nenhum import.
- [ ] Agregação de volume semanal por grupo muscular (`out_weekly_volume_series` retorna 0).
- [ ] UI de anamnese que preencha `client_anamnesis.restricted_movement_patterns` (Fase 4).
- [ ] Suporte a templates de periodização.

### Riscos e débitos técnicos
- **Segurança — credenciais expostas**: um log de build compartilhado no chat continha `GROQ_API_KEY` e a chave anon do Supabase em texto claro. **Rotacionar as duas.** Nenhuma está no repositório.
- **Débito**: `lib/types/database.ts` segue `any`, com exceção de lint documentada e restrita a uma linha. Um shape parcial derruba o inferimento de todas as queries do `@supabase/ssr`; só os tipos gerados resolvem.
- **Débito**: o parser de tipos do Supabase infere relações to-one como array; há dois casts documentados na fronteira de dados (`app/(app)/catalogo/page.tsx` e página de execução do aluno).
- **Débito**: motor de prescrição é básico e não está conectado ao fluxo.
- **Débito**: o fallback `ilike` na busca é código de transição. Enquanto existir, uma falha real da RPC (que não seja "função ausente") também degrada silenciosamente para a busca simples.
- **Risco**: `docker build` não foi executado — o ambiente de desenvolvimento não tem daemon Docker. As premissas do Dockerfile foram validadas individualmente (saída standalone, caminhos de `COPY`, arranque com `node server.js`, HTTP 200 em `/` e `/login`), mas a construção da imagem só se confirma no primeiro build do EasyPanel.

---

## Fase 1: Foundation (🔄 em andamento)

**Entrega esperada:** semana de 29/07/2026

Taxonomia, schema Postgres/Supabase, scaffold Next.js e catálogo de 454 exercícios canônicos.

- [x] Taxonomia: 37 padrões de movimento, 12 regiões, ~60 músculos, ~35 equipamentos, 21 grupos, 40+ famílias — `data/taxonomy.json`
- [x] Schema SQL: 9 migrations (extensões, enums, identidade, clientes, catálogo, periodização, prescrição, execução, RLS, funções)
- [x] Scaffold Next.js 15: estrutura, layout, rotas placeholder, clientes Supabase, middleware de sessão
- [x] Catálogo: 104 exercícios (Lotes 1 e 3) integrados, cada um com name_pt, name_en, aliases, músculos, equipamentos, padrão, variantes
- [x] Auditoria adversarial: anatomia, schema, RLS, vazamento entre tenants

**Dependências:** nenhuma (primeira fase)

**Bloqueadores:** nenhum

---

## Fase 2a: Auth + Marketplace + Pagamento (🟠 planejada)

**Prioridade:** 🔴 CRÍTICA — sem essa, nada funciona  
**Duração estimada:** 3–4 semanas  
**Especificação:** SPEC-02 — Financeiro, Pagamento e Fluxo de Liberação de Treino

Fluxo completo: cliente cria conta → escolhe personal → solicita treino → paga → personal acessa.

### Autenticação

- [ ] Auth Supabase: sign-up cliente, sign-up personal, login, logout, reset de senha
- [x] Tela de login: dark + gold gradiente, branding DOUTOR LUIZ C. JÚNIOR
- [ ] Tela de sign-up: separar fluxo cliente vs personal, validação CREF para personal
- [ ] Middleware: protege rotas, redireciona não-autenticados para login, redireciona por role

### Marketplace

- [ ] Tela de marketplace: lista de personals filtrada por especialidade, localidade, preço, rating
- [ ] Card de personal: foto, nome, bio, CREF, especialidades, preço base, botão `Solicitar treino`
- [ ] Modal de solicitação: duração (30/90/180/365 dias), preço, observação, termos de uso

### Pagamento

- [ ] Integração Stripe ou PagSeguro: checkout flow, webhooks, reconciliação
- [ ] Tela de checkout: resumo de pedido, CPF, forma de pagamento, segurança (CVV, 3D Secure)
- [ ] Página de confirmação: sucesso, pendência, erro com CTA de retry
- [ ] Cron de reconciliação: 2x/dia, check status de transações em voo
- [ ] Webhook handler: atualiza `subscription_requests.status`, `clients.subscription_status`, notifica via e-mail
- [ ] Tabela `subscription_requests`: rastreamento completo do pedido
- [ ] Tabela `payment_webhooks`: auditoria de eventos de pagamento
- [ ] Tabela `payment_settings`: chaves de gateway por organização

### RLS & Visibilidade

- [ ] RLS: cliente vê apenas seus dados
- [ ] RLS: personal vê apenas clientes cujo `subscription_status = 'ativo'`
- [ ] Proteção: acesso a anamnese e periodização bloqueado para clientes não-ativos

### E-mails

- [ ] Template de confirmação de pagamento para cliente
- [ ] Template de notificação "novo cliente" para personal
- [ ] Resend ou Brevo integrado

**Dependências:** Fase 1  
**Bloqueadores:** nenhum (Fase 1 deve estar 90% pronta)

---

## Fase 2b: Design System + Componentes (paralelo com 2a)

**Prioridade:** 🟡 ALTA — base para todas as UIs depois  
**Duração estimada:** 2 semanas  
**Especificação:** SPEC-03 — Design System: Preto + Gold Gradiente, Premium

### Tokens

- [ ] Cores: ouro, pretos, cinzas, status (success, warning, destructive, info)
- [ ] Gradientes: ouro horizontal/vertical, premium card, frosted modal
- [ ] Tipografia: Inter + Space Mono, escala de tamanho (H1–Body x-small)
- [ ] Espaçamento: escala de 8px a 96px
- [ ] Sombras: depth 1–3, hover elevations
- [ ] Breakpoints: xs–xl, mobile-first

### Componentes React (sem shadcn)

- [ ] Button: primary, secondary, outline, destructive, states (hover, active, disabled, loading)
- [ ] Card: base, premium, com header/footer
- [ ] Input + Label: focus ring em ouro, placeholder, error state
- [ ] Select + Dropdown: dark card, ouro highlight, keyboard nav
- [ ] Badge: premium, active, pending, inactive, info, error
- [ ] Modal + Overlay: frosted glass, focus trap, close com Esc
- [ ] Tabs: activeTab em ouro, smooth transition
- [ ] Progress: bar + circular, com valor em ouro
- [ ] Toast: sucesso, erro, info, auto-dismiss
- [ ] Skeleton: shimmer gradient, placeholder

### Tailwind Config

- [ ] `tailwind.config.ts` com tema completo (colors, spacing, shadows, fonts)
- [ ] Componentes como Tailwind `@apply` ou React with `cn()` utility
- [ ] Documentação de cada componente no arquivo

### Documentação

- [ ] Storybook (opcional mas recomendado) OU página de showcase em Next.js
- [ ] Guia de uso para cada componente
- [ ] Exemplos de combinação (card + button + input dentro de modal, etc)

**Dependências:** Fase 2a (começar assim que auth está pronto)  
**Bloqueadores:** nenhum

---

## Fase 3: Builder de Treinos (🟡 planejada)

**Prioridade:** 🟢 ALTA — feature central  
**Duração estimada:** 3–4 semanas  
**Especificação:** SPEC-01 — Builder de Treinos: Abas A–G e Busca de Exercício

### Schema - Patch migrations

- [ ] Enum `session_label`: A–G
- [ ] Coluna `sessions.label` + unique index `(microcycle_id, label)`
- [ ] Enum `training_split`: A, AB, ABC, ABCD, ABCDE, ABCDEF, ABCDEFG
- [ ] Coluna `periodizations.split` default 'ABC'
- [ ] Coluna `sessions.order_index` para reordenação

### Full-text Search

- [ ] Coluna `exercises.search_vector tsvector` com dicionário português
- [ ] Trigger de atualização do search_vector ao inserir/editar exercise
- [ ] Extensões `unaccent` e `pg_trgm` para busca tolerante a erro
- [ ] Função RPC `search_exercises(query, filters, client_id)` que retorna resultado anotado:
  - 🔴 padrão restrito na anamnese
  - 🟡 sem equipamento
  - 🟡 acima do nível técnico
  - 🔵 já prescrito em outro treino
  - ⚪ volume de séries/semana no grupo muscular

  - toast com desfazer quando destino ≠ aba ativa

### Prescrição automática

- [ ] Motor de pré-preenchimento: séries, reps, carga, RIR, RPE, descanso, cadência derivados do objetivo do aluno, fase do mesociclo, estratégia de carga do microciclo
- [ ] Selector de variante de exercício na linha já adicionada

### Movimentação

- [ ] Drag de item entre abas
- [ ] Menu: `Mover para…` e `Copiar para…` (A–G)
- [ ] Mover reatribui `session_id` e recalcula `order_index`

### Teste

- [ ] Criar 7 treinos (A–G) numa semana — 8ª bloqueada
- [ ] Buscar "hip thrust" → acha "Elevação pelvica" (alias)
- [ ] Buscar "agacahmento" → acha "Agachamento" (trigram)
- [ ] Buscar "gluteo" → acha resultados com acento
- [ ] Adicionar de A para C sem trocar de aba → toast
- [ ] Mover exercício entre treinos → prescrição mantida
- [ ] Filtro `Só o que o aluno tem` remove equipamento não liberado

**Dependências:** Fase 1 (catálogo), Fase 2a (cliente ativo), Fase 2b (componentes)  
**Bloqueadores:** Fase 1 catálogo deve estar 100%

---

## Fase 4: Anamnese e Periodização (🟠 planejada)

**Prioridade:** 🟢 ALTA — core do produto  
**Duração estimada:** 4–5 semanas

### Anamnese

- [ ] Tela de anamnese completa: histórico de lesões, cirurgias, condições clínicas, medicamentos
- [ ] Padrões de movimento restritos (checkboxes dos 37 padrões)
- [ ] PAR-Q, nível de stress, sono, nutrição, tabagismo, gestante
- [ ] Fotos de antes (para comparação)
- [ ] Validação de restrições: se padrão restrito, builder prealerta ao adicionar

### Periodização

- [ ] Tela de criar periodização: nome, modelo (linear, ondulatória, blocos, etc), duração em semanas
- [ ] Divisão de treino (A, AB, ABC, ABCD, ABCDE, ABCDEF, ABCDEFG) — UI para promover split
- [ ] Mesociclos: nome, fases (adaptação, acúmulo, intensificação, realização, deload, etc)
- [ ] Microciclos (semanas): estratégia de carga (crescente, decrescente, ondulatória), volume/intensity targets
- [ ] Sessões (treinos): builder com abas A–G (da Fase 3)
- [ ] Prescrição de exercícios com todas as variáveis (séries, reps, carga, RIR, RPE, descanso, tempo/cadência, método)
- [ ] Motor de substituição: se equipamento não disponível, sugere alternativa da mesma família
- [ ] Data de fim, prazo de validade automática, revisão agendada

### Relatórios

- [ ] Visão semanal: volume de carga, frequência, distribuição por grupo muscular
- [ ] Comparação inter-microciclo: evolução de carga do mesmo treino
- [ ] Recomendações: "aumentar volume em posteriores", "deload em 2 semanas", etc

**Dependências:** Fase 1, 2a, 2b, 3  
**Bloqueadores:** Fase 3 deve estar pronto

---

## Fase 5: Execução e Tracking (🟠 futuro)

**Prioridade:** 🟡 MÉDIA — complementar  
**Duração estimada:** 3–4 semanas

Aluno executa treino, registra pesos/reps reais, personal vê aderência e ajusta.

- [ ] App do aluno: visualizar treino, marcar séries conforme executa, registrar RIR real
- [ ] Dashboard do personal: histórico de execução, aderência, volume real vs planejado
- [ ] Ajustes: personal edita carga/reps para próxima sessão baseado na execução real

**Dependências:** Fase 4

---

## Fase 6: Relatórios e Analytics (🟠 futuro)

**Prioridade:** 🟢 BAIXA — nice-to-have  
**Duração estimada:** 2 semanas

Insights para personal: crescimento de força, hipertrofia markers, aderência, drop-off risk.

- [ ] Gráficos: evolução de 1RM estimado, volume semanal, frequência, ROI de tempo vs volume
- [ ] Alertas: "cliente não treinou há 2 semanas", "volume acima do esperado", "intensidade caindo"
- [ ] Export: relatório PDF para cliente

**Dependências:** Fase 5

---

## Matriz de dependências

```
Fase 1 (Foundation)
├── Fase 2a (Auth + Marketplace)
│   └── Fase 3 (Builder A–G)
│       └── Fase 4 (Anamnese + Periodização)
│           └── Fase 5 (Execução)
│               └── Fase 6 (Analytics)
└── Fase 2b (Design System) — paralelo com 2a
    └── alimenta 3, 4, 5, 6
```

---

## Timeline realista

| Fase | Semana | Status | Deliverables |
|------|--------|--------|--------------|
| 1 | semana 1 | 🔄 em voo | taxonomy.json, schema.sql, scaffold |
| 2a | semanas 2–5 | 🟠 planejada | auth, marketplace, stripe, emails |
| 2b | semanas 3–4 | 🟠 planejada | design tokens, componentes React |
| 3 | semanas 5–8 | 🟠 planejada | builder A–G, search, prescrição auto |
| 4 | semanas 8–13 | 🟠 planejada | anamnese, periodização, relatórios |
| 5 | semanas 13–16 | 🟠 futuro | app do aluno, tracking |
| 6 | semanas 16–18 | 🟠 futuro | analytics, insights |

**MVP (Fase 1–3):** ~8 semanas → produto funcional para personal cadastrar alunos, receber pagamento, montar treino com abas A–G.

**Produto completo (Fase 1–5):** ~16 semanas.

---

## Go-to-market

1. **Soft launch** (após Fase 3): personal pode receber clientes e montar treinos. Sem tracking ainda.
2. **Feedback loop** (Fase 4): coletar feedback do personal, ajustar UX de periodização.
3. **Hard launch** (após Fase 5): aluno começa a usar, tracking completo. Pronto para replicação e affiliate.
