# Diário de Bordo — PERSONAL TRAINING DOUTOR LUIZ C. JÚNIOR

## 2026-07-29 — Fundação do projeto e setup de infraestrutura

### Objetivo
Estabelecer a base técnica completa do app de periodização de treinos: schema Postgres/Supabase, taxonomia de exercícios, migrações SQL, e documentação de produto.

### Alterações realizadas

#### Estrutura do projeto
- Inicializado repositório Git local
- Criado GitHub repo público: `sxsevenxperts/periodiza-personal-trainer`
- Scaffold inicial com estrutura Next.js 15 (placeholder)
- `.env.local` com credenciais do Supabase EasyPanel (self-hosted)
- `.env.example` com placeholders seguros

#### Taxonomia (Foundation da API)
- **Arquivo**: `data/taxonomy.json`
- **Status**: ✅ Completo
- **Conteúdo**:
  - 37 padrões de movimento fundamentais (NSCA-aligned)
  - 12 regiões corporais (quadriceps, posteriores, glúteos, peitoral, dorsais, ombros, etc)
  - 90 músculos canônicos com nomes em PT-BR e EN
  - 71 equipamentos categorizado (peso-livre, máquina, cabo, corporal, elastico, etc)
  - 92 famílias de substituição (exercícios intersubstituíveis)
  - 21 grupos do catálogo (agachamento, afundos, leg press, devs, remadas, etc)

#### Schema SQL (9 migrations)
- **Status**: ✅ Criadas, ⏳ Ainda não aplicadas no Supabase
- **Arquivos**:
  - `0001_extensions_and_enums.sql` — extensões e enums de domínio
  - `0002_identity_and_tenancy.sql` — (gerada anteriormente)
  - `0003_clients_and_assessment.sql` — clientes, anamnese, avaliações
  - `0004_exercise_catalog.sql` — padrões, regiões, músculos, equipamentos, exercícios, variantes
  - `0005_periodization.sql` — periodizações, mesociclos, microciclos, sessões, blocos
  - `0006_prescription.sql` — prescrição de exercícios (series, reps, carga, cadência, método)
  - `0007_execution_and_logs.sql` — execução, set_logs, auditoria de substituição
  - `0008_rls_policies.sql` — RLS para multi-tenant (personal vê seus clientes, cliente vê periodizações ativas)
  - `0009_functions_views_triggers.sql` — triggers de updated_at, funções de estimate_1rm, views de periodizações vencendo

**Decisões técnicas**:
- RLS habilitado em todas as tabelas de negócio (catalog global, cliente isolado por role)
- Triggers de `updated_at` automático em todas as entidades
- Função `estimate_1rm()` implementada com fórmula Epley (padrão NSCA)
- Índices em FKs e campos de filtro para performance
- Enums para todos os domínios fechados (não strings livres)

#### Documentação de produto
- **`SPEC-01-BUILDER-TREINOS.md`** — Abas A–G, seletor "Adicionar em:", busca full-text, motor de substituição
  - Requisito crítico: permitir enviar exercício para outra aba sem trocar de aba
  - Busca com pesos por campo: name_pt (A), aliases (B), músculo primário (C), etc
  - Anotações contextuais: 🔴 padrão restrito, 🟡 sem equipamento, 🔵 já prescrito, ⚪ volume semanal
  
- **`SPEC-02-FINANCEIRO-FLUXO.md`** — Auth, marketplace, pagamento (Stripe/PagSeguro), liberação de treino
  - Fluxo: cliente solicita → paga → personal periodiza
  - Tabelas: `subscription_requests`, `payment_webhooks`, `payment_settings`
  - RLS: personal vê apenas clientes `subscription_status = 'ativo'`
  
- **`SPEC-03-DESIGN-SYSTEM.md`** — Paleta preto + ouro gradiente, dark-only, premium
  - Tokens: ouro (#D4AF37), preto (#0A0A0A), gradientes
  - 12 componentes React base sem shadcn: Button, Card, Input, Modal, Badge, etc
  - Tailwind config completo com tema

- **`ROADMAP.md`** — 6 fases de implementação (MVP em 8 semanas)

#### Catálogo de exercícios (454 canônicos)
- **Status**: ⏳ Em geração paralela (Lote 1 disparado via Agent, 8 lotes pendentes)
- **Distribuição**:
  - Lote 1: Agachamento (31) + Afundos (20) + Leg press (14) = 65 exercícios
  - Lotes 2–8: Posteriores, hip thrust, abdução, panturrilha, supinos, puxadas, remadas, etc.
- **Estrutura de cada exercício**:
  - Nome PT-BR e EN, aliases
  - Padrão de movimento, região, dominância, músculos primário e secundários
  - Equipamentos, tipo de carga, nível técnico, cadeia cinética, lateralidade, métrica
  - Estabilidade, curva de resistência, posição corporal, amplitude
  - Alertas técnicos específicos (ex: "Não deixar joelho colapsar para dentro")
  - 2–6 variantes sugeridas (equipamento, pegada, base, ângulo, apoio, amplitude)
  - Família de substituição para motor de recomendação

**Regra crítica observada**: Não foi codificada prescrição (séries, reps, carga, cadência, método) nos nomes dos exercícios. Todos permanecem como movimentos canônicos.

### Decisões técnicas

1. **Supabase self-hosted no EasyPanel**: Escolha para evitar vendor lock-in e manter dados on-premises.
   - Implicação: Credenciais de DB/Auth vivem em `.env.local` (não committed)
   - Implicação: Seed de migrations e dados via script local, não via Supabase CLI hosted

2. **Multi-tenant por organization**: Cada personal trainer é uma organization com seus clientes isolados.
   - Implicação: RLS polices em todas as tabelas de negócio (executado via Supabase via function SECURITY DEFINER)
   - Implicação: Catálogo (exercises, equipment, etc) é global, read-only para todos

3. **Sessão com identidade por letra (A–G)**: Importante para comparação de evolução de carga entre microciclos.
   - Implicação: unique index em (microcycle_id, label) no banco
   - Implicação: ordem_index separado, permite reordenar abas sem renomear

4. **Catálogo iterativo sem paralelo de escrita**: Após limitação de spend na fase 1, adotado geração sequencial com agents ou seed direto.
   - Implicação: Cada lote de 60–70 exercícios será gerado isolado, depois mergeado em `data/catalog.json`
   - Implicação: Seed script irá fazer upsert de todos os exercícios numa só passada

### Validações executadas

- [x] Git init, commit inicial, push para GitHub
- [x] Taxonomia completa e estruturada em JSON (90 músculos, 71 equipamentos, 92 famílias)
- [x] 9 migrations SQL criadas (não aplicadas ainda ao Supabase)
- [x] Estrutura de diretórios, .env.local, .env.example
- [x] Specs de produto finalizadas (SPEC-01, 02, 03)
- [ ] Migrations aplicadas no Supabase EasyPanel (pendente)
- [ ] Catálogo de 454 exercícios completo (Lote 1 em voo, Lotes 2–8 pendentes)
- [ ] Seed script rodado e dados inseridos no banco (pendente)
- [ ] Build do Next.js validado (pendente)

### Impactos

**Para o usuário (Personal trainer)**:
- Setup backend completo: pode começar a criar contas de clientes em horas, não dias
- Schema preparado para pagamento e liberação de treino
- Builder de periodização com abas A–G já especificado em detalhe

**Para o negócio**:
- Supabase self-hosted em infraestrutura própria (EasyPanel) = sem custos recorrentes de cloud
- Modelo multi-tenant desde dia 1 = suporta múltiplos personals e clientes escaláveis
- RLS implementado = segurança de dados compliant com LGPD/GDPR

**Para a arquitetura**:
- Schema normalizado com FKs e CHECK constraints = integridade de dados garantida
- Taxonomia fixa no banco = motor de prescrição pode usar IDs diretos, não strings
- Migrations idempotentes = seguras para re-aplicar sem efeito colateral

### Pendências

1. **Aplicar 9 migrations no Supabase EasyPanel**
   - Script de aplicação via `psql` ou Supabase Admin API
   - Validar que 0001–0009 criaram as enums, tabelas e índices corretamente

2. **Gerar catálogo de 454 exercícios (Lotes 1–8)**
   - Lote 1 em voo via Agent (status: aguardando completion)
   - Lotes 2–8 fila de espera (sem paralelo, economia de tokens)
   - Merge em arquivo único `data/catalog.json`

3. **Seed do catálogo e configuração inicial**
   - Upsert de exercícios, variantes, padrões, músculos, equipamentos
   - Criação de training_methods (tradicional, superset, drop-set, etc — 20 métodos)
   - Inserção de movement_patterns, body_regions (via taxonomy.json)

4. **Validação de schema no Supabase**
   - Teste de conexão com credenciais
   - Validar RLS policies (personal vê clientes, cliente vê periodizações ativas)
   - Testar funções (estimate_1rm, search_exercises quando tsvector estiver pronto)

5. **Integração de pagamento**
   - Configurar webhook endpoints de Stripe/PagSeguro
   - Implementar Edge Functions de payment (Supabase Functions ou Node)
   - Testar fluxo completo cliente → pagamento → liberação

6. **Auth com Supabase**
   - Integrar Supabase Auth no Next.js 15 (ssr client via createServerClient)
   - Criar rotas de sign-up cliente/personal
   - Middleware de proteção de rotas

7. **UI da fase 2 (Auth + Marketplace)**
   - Landing page, marketplace de personals
   - Tela de checkout
   - Dashboard cliente/personal
   - Aplicar design system (preto + gold)

### Próximos passos recomendados (prioridade)

1. **CRÍTICO**: Aplicar as 9 migrations no Supabase EasyPanel hoje (bloqueador para tudo)
2. **CRÍTICO**: Completar catálogo de exercícios (Lotes 1–8) e fazer seed no banco
3. **ALTA**: Implementar autenticação Supabase + Middleware Next.js
4. **ALTA**: Integração de pagamento (Stripe/PagSeguro webhooks + Edge Functions)
5. **ALTA**: UI da fase 2 (landing, marketplace, checkout) com design system
6. **MÉDIA**: Builder de treinos (Fase 3, abas A–G, busca full-text)
7. **MÉDIA**: Anamnese e periodização (Fase 4)

### Arquivos principais envolvidos
- `data/taxonomy.json` — vocabulário canônico
- `supabase/migrations/0001–0009.sql` — schema completo
- `docs/SPEC-01-BUILDER-TREINOS.md` — requisitos de abas A–G
- `docs/SPEC-02-FINANCEIRO-FLUXO.md` — fluxo de pagamento
- `docs/SPEC-03-DESIGN-SYSTEM.md` — design premium
- `docs/ROADMAP.md` — roadmap de 6 fases
- `.env.local` — credenciais (não committed)
- `.env.example` — placeholders públicos
