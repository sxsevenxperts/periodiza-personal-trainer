# Roadmap — PERSONAL TRAINING DOUTOR LUIZ C. JÚNIOR

## Atualização — 2026-07-30 (Fase 3 — Integração Completa)

### Concluído
- [x] Módulo de Avaliações Físicas criado (schema `client_assessments`, actions `getAssessments` e `createAssessment`).
- [x] Aba de avaliações do Aluno integrada no front-end (`/alunos/[clientId]/page.tsx`).
- [x] Correção integral dos conflitos de tipagem estrita gerados pelo `@supabase/ssr` via tipagem exata e `index signature` de fallback.
- [x] Correção de componentes UI do shadcn incompatíveis com `asChild`.
- [x] **ETAPA 1 — Patch ao schema**: Migration 0010 com session.label (A-G), periodizations.split, full-text search (tsvector + unaccent + trigram), RPC search_exercises() com filtros contextuais.
- [x] **ETAPA 2 — Components React**: TreinoBuildHeader (abas), ExerciseSearch (barra + filtros), ExerciseResult (anotações contextuais). Seletor "Adicionar em:" com sticky behavior.
- [x] **ETAPA 3 — Lógica de prescrição**: Actions (search, add, get), Motor de cálculo automático (séries/reps/carga/RIR/RPE por objetivo+fase+volume), Hook usePrescriptionBuilder.
- [x] **ETAPA 4 — Integração completa do Builder**: WorkoutBuilder em `components/builder/workout-builder.tsx` que integra todos os componentes, gerencia estado local de prescrições, integra com actions, suporta drag-drop e toast com desfazer.

### Em andamento
- [ ] **CRÍTICO**: Aplicar migration 0010 no Supabase (bloqueador crítico para funcionar em produção).
  - Ver: `docs/DEPLOYMENT_MIGRATION_0010.md` para guia de deployment (3 opções: psql, Admin API, Dashboard)
- [ ] Validar RPC search_exercises() após aplicação da migration.
- [ ] Testes E2E: Ver `docs/E2E_TESTS_TREINO_BUILDER.md` (15 test cases completos).

### Funcionalidades Prontas (Etapa 4)
- [x] Deletar exercício (com confirmação visual + toast)
- [x] Mover exercício entre abas (com dropdown menu)
- [x] Copiar exercício para outra aba (com dropdown menu)
- [x] Gerenciamento de menus dropdown (openMenuId state)
- [x] Toast com feedback para cada ação
- [x] Drag-start preparation (para drag-drop futuro entre abas)

### Próximos passos
- [ ] Página de periodização que renderiza o Builder (conexão com microcycle/session/prescription).
- [ ] Teste E2E: criar 7 treinos (A-G), 8ª bloqueado, buscar "hip thrust", arrastar entre abas.
- [ ] Adicionar suporte a templates de periodização.

### Riscos e débitos técnicos
- **Risco mitigado**: O colapso na tipagem estrita do Supabase ameaçava atrasar as views; agora a arquitetura suporta o inferimento correto.
- **Debt técnico**: Motor de prescrição é básico (não tem nuances de progressão semanal nem ajustes de RPE observado); OK para MVP.

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
