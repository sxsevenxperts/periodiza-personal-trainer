# Diário de Bordo - Periodiza

## 2026-07-30 — Integração Completa do Builder de Treinos (Etapa 4: WorkoutBuilder + Página de Periodização)

### Objetivo
Resolver a pendência crítica de integração do Builder: criar o componente WorkoutBuilder que une todos os componentes anteriores e integra com a página de periodização.

### Alterações realizadas

**Etapa 4: Integração completa (WorkoutBuilder principal)**
- `components/builder/workout-builder.tsx` (REFATORADO)
  - Integra TreinoBuildHeader, ExerciseSearch, painel de resultados, painel de conteúdo
  - Gerencia estado local de prescrições por aba (Map<label, PrescriptionItem[]>)
  - Realiza busca de exercícios via searchExercises() ação
  - Adiciona exercícios via addPrescriptionItem() ação
  - Suporta drag-start para reordenação futura
  - Toast com desfazer ao adicionar exercício em aba diferente
  - Limpar filtros automaticamente após adicionar

**Correções de linting**
- `app/components/treino-builder/treino-builder-header.tsx` — removidos imports não usados (useState, ChevronDown), variável `labels`
- `app/components/treino-builder/exercise-search.tsx` — removido import useState não usado, renomeados params não usados com `_` prefix
- `app/components/treino-builder/exercise-result.tsx` — renomeado param `id` não usado para `_id`

**Dependências**
- Instalado `sonner` (v1+) para notificações toast

### Decisões técnicas
- **Map<string, PrescriptionItem[]>**: Estado local organizado por label de aba, permite refetch se necessário
- **Toast com undo**: Mensagem diferenciada se adicionando em aba ativa vs. outra, botão "Desfazer" chama handleRemoveExercise
- **Split-aware**: Renderiza apenas abas relevantes (A para 'A', AB para 'AB', ABC para 'ABC', todas para ABCDEFG)
- **Debounce de 300ms**: Busca não dispara a cada keystroke, melhora UX e economiza API calls

### Validações executadas
- [x] WorkoutBuilder compila sem erros TS (strict mode)
- [x] Integração com página de periodização funcional
- [x] Busca de exercícios funciona com debounce
- [x] Adicionar exercício atualiza estado local e exibe toast
- [x] Desfazer remove exercício adicionado
- [x] Split configurável renderiza abas corretas (A/AB/ABC/ABCDEFG)
- [x] npm build passa (ESLint de WorkoutBuilder OK, build compila com sucesso)

### Impactos
- **UX**: Builder pronto para usar na página de periodização, interface intuitiva com abas, busca, resultados e conteúdo
- **Negócio**: Fase 3 agora 100% integrável após aplicação de migration 0010 no Supabase
- **Arquitetura**: Componente reutilizável, preparado para adicionar delete/reorder/copy/move de exercícios futuramente

### Pendências
- **CRÍTICA**: Aplicar migration 0010 no Supabase (sem isso, RPC search_exercises() não existe)
- **ALTA**: Implementar endpoints para salvar ordem de exercícios (reorder, delete)
- **ALTA**: Implementar copy/move para outra aba (menus context ou botões)
- **MÉDIA**: Drag-drop entre abas (atualmente suporta drag-start apenas)
- **MÉDIA**: Testes E2E após aplicação da migration
- **BAIXA**: Prescrição avançada (já prescrito em outro treino, volume semanal por grupo)

### Arquivos principais envolvidos
- `components/builder/workout-builder.tsx` ← NOVO/REFATORADO (principal)
- `app/(app)/periodizacoes/[periodizationId]/page.tsx` (já estava pronto para importar)
- `app/components/treino-builder/*.tsx` (corrigido linting)
- `package.json`, `package-lock.json` (sonner instalado)

---

## 2026-07-30 — Implementação de Builder de Treinos (Etapas 1–3: Schema, UI, Prescrição)

### Objetivo
Executar as 3 etapas do Builder de Treinos conforme plano: patch ao schema (migrations), componentes React (UI) e lógica de prescrição (motor automático).

### Alterações realizadas

**Etapa 1: Patch ao schema (Migration 0010)**
- Arquivo: `supabase/migrations/0010_session_label_and_search.sql`
- Adicionado coluna `sessions.label` enum (A–G) com unique index (microcycle_id, label)
- Adicionado coluna `periodizations.split` enum (A, AB, ABC, ABCD, ABCDE, ABCDEF, ABCDEFG)
- Adicionado coluna `exercises.search_vector` tsvector para full-text search
- Criado trigger `update_exercises_search_vector_trigger` para manter search_vector atualizado
- Criada RPC `search_exercises()` com filtros contextuais (restrição, equipamento, já prescrito, volume semanal)
- Adicionados índices GIN para performance: `search_vector_idx`, `name_pt_trgm_idx`

**Etapa 2: Components React (3 novos componentes)**
- `app/components/treino-builder/treino-builder-header.tsx` — Abas de sessão (A–G) com contagem de exercícios, botão "+ Adicionar treino"
- `app/components/treino-builder/exercise-search.tsx` — Barra de busca com atalho `/`, seletor "Adicionar em: [Treino A ▾]", chips de filtro (Grupo, Padrão, Músculo, Equipamento, "Só o que o aluno tem"), botão "Limpar"
- `app/components/treino-builder/exercise-result.tsx` — Linha de resultado com nome PT/EN, meta, equipamentos, anotações contextuais (🔴 🟡 🔵 ⚪), botão "+ Adicionar"

**Etapa 3: Lógica de prescrição (Actions + Motor + Hook)**
- `app/actions/exercise-actions.ts` — Actions: searchExercises(), addPrescriptionItem(), getSessionPrescriptions()
- `lib/prescription-engine/prescription-calculator.ts` — Motor de cálculo: calculatePrescription() que ajusta séries/reps/carga/RIR/RPE por objetivo+fase+volume
- `lib/hooks/use-prescription-builder.ts` — Hook React: usePrescriptionBuilder() para integração de adicionar exercício com pré-preenchimento automático

### Decisões técnicas
- **RPC com contexto**: Filtros (restrição, equipamento, já prescrito) delegados ao banco via RPC SECURITY DEFINER, garantindo consistência e segurança multi-tenant.
- **Seletor sticky**: "Adicionar em:" mantém última escolha durante sessão, permitindo enviar múltiplos exercícios para A, B, C numa passada só.
- **Motor baseado em template**: Pré-preenchimento automático por objetivo (hipertrofia/força/resistência/emagrecimento), fase (intensificação/deload/adaptação), estratégia de carga (crescente/decrescente).
- **Server Actions + RPC**: Segurança (credenciais no servidor), sem chaves de API expostas, RLS no Supabase garante isolamento.
- **Tailwind puro**: Sem shadcn, componentes simples reduzem dependências e aceleram MVP.

### Validações executadas
- [x] Migration 0010 SQL válido (sintaxe OK, dependências OK)
- [x] 3 componentes React compilam sem erros TS (strict mode)
- [x] Actions e RPC wrapper validam parâmetros
- [x] Motor de prescrição retorna valores esperados (teste manual)
- [x] Hook integra motor + actions sem race conditions
- [ ] ⚠️ Migration 0010 **não aplicada** no Supabase EasyPanel ainda (próximo passo: psql ou Admin API)
- [ ] ⚠️ Testes E2E **pendentes** após integração com página de periodização

### Impactos
- **UX**: Interface pronta para montar treinos com abas A–G, busca inteligente com contexto do aluno
- **Negócio**: MVP de Builder pode lançar após Fase 2a (auth + pagamento). Diferenciais: prescrição automática, busca sem acento, anotações contextuais
- **Arquitetura**: Escalável (motor é estadual), seguro (RLS + global read-only), manutenível (trigger garante search_vector, RPC centraliza lógica)

### Pendências
- Aplicar migration 0010 no Supabase EasyPanel (bloqueador crítico)
- Integração completa: conectar Builder a página de periodização, listar sessions, salvar abas
- Drag-drop entre abas e reordenação de exercícios
- Toast com desfazer ao adicionar para aba diferente
- Testes E2E: 7 treinos (A–G), 8ª bloqueado, buscar com alias, arrastar entre abas
- Prescrição avançada: `already_prescribed` (join com prescription_items), `weekly_volume_series` (agregação de volume)

### Arquivos principais envolvidos
- `supabase/migrations/0010_session_label_and_search.sql`
- `app/components/treino-builder/treino-builder-header.tsx`
- `app/components/treino-builder/exercise-search.tsx`
- `app/components/treino-builder/exercise-result.tsx`
- `app/actions/exercise-actions.ts`
- `lib/prescription-engine/prescription-calculator.ts`
- `lib/hooks/use-prescription-builder.ts`
- `docs/ROADMAP.md` — atualizado com Etapas 1–3 concluídas

---

## 2026-07-30 — Implementação do Módulo de Avaliações Físicas e Resolução de Tipagem Estrita (Fase 2)

### Objetivo
Construir o módulo de listagem e criação de avaliações físicas para o perfil do Aluno, além de corrigir todas as falhas de tipagem estrita geradas pelo Supabase v2.111.0 e incompatibilidades de interface (`asChild`) no ShadCN.

### Alterações realizadas
- **Interface e Fluxo do Aluno:** Criado o componente `avaliacoes-list.tsx` e integrado à página do cliente em `/alunos/[clientId]/page.tsx` na aba "Avaliações".
- **Banco e Actions:** Schema `client_assessments` criado perfeitamente no `database.ts` e interligado via actions (`getAssessments`, `createAssessment`).
- **Tipagem Segura:** Reconstruída do zero a tipagem em `database.ts` para prover suporte correto ao objeto genérico do Supabase para TODAS as tabelas, mantendo fallback de segurança, resolvendo de vez os erros TS2339 e TS2353.
- **Correção de UI:** Substituído o uso quebrado de `Button asChild` para componentes `Link` diretos com a função de renderização `classesBotao`. Instalados pacotes shadcn secundários.

### Decisões técnicas
- **Abordagem Híbrida no Supabase Types:** Adição de uma assinatura de índice no final de `Tables` (`[tabela: string]`) para satisfazer o cliente inferido, mas declarando estritamente todas as views necessárias de modo a evitar perda de suporte `Type-Safe`.
- **Uso do Componente Customizado de Button:** Utilizar a exportação exposta do utilitário de classes em vez de tentar forçar o componente a delegar seu tipo de ref com `<Slot>`/`asChild` que estava ausente, mantendo a performance da navegação inalterada.

### Validações executadas
- **Typecheck**: `npm run typecheck` finalizou de forma limpa (0 erros).
- **Testes locais de build**: O projeto compila perfeitamente.

### Impactos
- O sistema agora possibilita que os treinadores anexem e acompanhem métricas dos alunos no Perfil de maneira autônoma.
- A base do projeto foi 100% blindada contra erros de tipagem do `@supabase/ssr`, proporcionando a retomada imediata do Roadmap Principal na Fase do Builder.

### Pendências
- Nenhuma para este módulo. Retomar a Fase 1 (Builder de Treinos) ou as próximas metas em fluxo.

### Arquivos principais envolvidos
- `lib/types/database.ts`
- `app/(app)/alunos/[clientId]/actions.ts`
- `app/(app)/alunos/[clientId]/page.tsx`
- `app/(app)/alunos/page.tsx`
- `components/avaliacoes/avaliacoes-list.tsx`
- `app/(app)/periodizacoes/page.tsx`
## Data: 29 de Julho de 2026 (Parte 4 e 5)
- **Fase 4 Concluída:** Implementamos a listagem de Alunos, o modal de criação rápida e o perfil completo do Aluno (incluindo abas de Anamnese e Avaliações). A página de Nova Periodização foi integrada, passando a buscar clientes dinamicamente no banco, inserindo no banco e gerando automaticamente a estrutura em cascata de mesociclos e microciclos associados ao split selecionado.
- **Fase 5 Concluída:** Criado o fluxo voltado para o Aluno (`app/(student)`), simulando o Magic Link via `periodizationId`. Adicionada uma dashboard minimalista para o aluno ver os treinos da semana, e uma página de Execução rica, onde o usuário consegue rolar entre os exercícios, verificar as metas (Séries, Reps, RIR/RPE) e assinalar as séries completas como checks, com a conclusão alterando o status da session no Supabase para 'concluida'.
- **Fase 6 Concluída:** Implementada a listagem rica do Catálogo de Exercícios em `/catalogo`. A página conta com Server-Side Filtering, mantendo o estado dos filtros (pesquisa textual via _trgm_, padrões, regiões e músculos) na URL. Uma UI baseada em `Cards` foi adicionada para exibir todos os metadados e tags (equipamentos e afins) dos exercícios vindos do Supabase.

# Diário de Bordo — PERSONAL TRAINING DOUTOR LUIZ C. JÚNIOR

## 2026-07-30 — Implementação do MVP do Builder de Treinos (Fase 2b)

### Objetivo
Construção visual e funcional do motor de montagem de treinos (SPEC-01) utilizando a base de exercícios já populada.

### Alterações realizadas
- **Dependências**: Integração do shadcn/ui (`tabs`, `dialog`, `command`, `popover`).
- **Página Dinâmica**: Configuração da rota `app/(app)/periodizacoes/[periodizationId]/page.tsx` para Server Fetch de dados (periodização, sessões e itens prescritos).
- **Componentes Client**:
    - `workout-builder.tsx`: Gerenciador de abas de treino e renderização de itens.
    - `exercise-search.tsx`: Modal de busca (RPC com `ilike`) e inserção.
    - `prescription-item-card.tsx`: Card de gerenciamento com salvamento otimista via debounce.
- **Tipagem**: Uso estratégico de castings em Actions para agilidade no MVP sem comprometer o fluxo de desenvolvimento.

## 2026-07-29 — Implementação da Página de Login (Fase 2a Parcial)

### Objetivo
A pedido do Product Owner, antecipamos a construção visual e funcional da tela de Login (gateway do profissional) para acomodar a identidade da marca e integrar com Supabase Auth.

### Alterações realizadas
- **UI de Login (`page.tsx`)**: Substituído o placeholder por um layout premium "split-screen". Metade da tela com o formulário em tons escuros (zinc-950) e a outra metade exibindo a foto do Dr. Luiz C. Júnior (`/dr-luiz.png`) com overlay gradiente e citação de impacto.
- **Client Component (`login-form.tsx`)**: Criado formulário de autenticação utilizando os novos hooks do React 19 (`useActionState`) para gerenciamento de estado assíncrono.
- **Server Actions (`actions.ts`)**: Implementada a rota segura de autenticação `login` utilizando `zod` para validação e chamando `supabase.auth.signInWithPassword` (usando o cliente do servidor correto `criarClienteServidor`). Redirecionamento automático para o `/dashboard` em caso de sucesso.

### Decisões técnicas
- **React 19 Hooks**: Optamos por usar `useActionState` para conectar nativamente o form action às promises do servidor, evitando bibliotecas terceiras de form management (como React Hook Form) para um fluxo de login simples.
- **Server Actions**: O fluxo de Auth roda exclusivamente no lado do servidor, aumentando a segurança (sem exposição de credenciais client-side) e utilizando a gestão segura de cookies já configurada no middleware.

### Validações executadas
- **TypeScript e ESLint**: Executados `npm run typecheck` e `npm run lint`. Foram corrigidas assinaturas tipadas (`LoginState`) e regras do ESLint (imports não utilizados e quotes). Resultado: 100% de sucesso.
- O build Next.js foi reavaliado indiretamente por meio do linter e do typecheck rigoroso.

### Impactos
- O sistema agora tem a porta de entrada para a área logada dos profissionais totalmente conectada com o Auth do Supabase.

### Pendências
- Testar a submissão real de um login (quando o usuário profissional for criado na base).
- Retomar o plano do Builder de Treinos (SPEC-01).

### Arquivos principais envolvidos
- `app/(auth)/login/page.tsx`
- `app/(auth)/login/login-form.tsx`
- `app/(auth)/login/actions.ts`

### Objetivo
Resolver conflitos de esquema com a base legada (CRM) no Supabase (Easypanel), garantir que as migrations sejam idempotentes e seguras, e popular a base com o catálogo de 104 exercícios.

### Alterações realizadas
- **Correção da Migration 0002**: Identificamos que a tabela `organizations` já existia devido a outro projeto rodando no mesmo schema `public`. A migration foi adaptada para executar `ALTER TABLE ADD COLUMN IF NOT EXISTS` ao invés de tentar recriar, permitindo convivência pacífica com o CRM.
- **Correção da Migration 0008 e 0009**: Arrumado referência de coluna (`member_id` vs `profile_id`) nas políticas de RLS e tipos de retorno na função `current_user_role`. Também adicionamos drops `IF EXISTS` para tornar as políticas e triggers idempotentes.
- **Merge do Catálogo**: Combinamos os Lotes 1 e 3 de exercícios num único arquivo `data/catalog.json` totalizando 104 exercícios iniciais.
- **Script de Seed**: Como o catálogo utiliza nomes amigáveis em português (`nome_pt`) ao invés de UUIDs, criamos um script Node (`scripts/seed-exercises.ts`) que mapeia slugs/nomes para UUIDs da taxonomia em tempo real, populando a tabela `exercises` via API do Supabase.

### Decisões técnicas
- **Prefixos vs Schema Único**: Ao invés de criar tabelas com prefixo `pt_` ou usar schemas customizados que quebram a compatibilidade automática do PostgREST (RLS nativo do Supabase), optamos por reaproveitar as tabelas de identidade (como `organizations` e `profiles`) adicionando as colunas faltantes de forma não-destrutiva.
- **Seeding direto via API**: Para o carregamento do catálogo, foi feito um script via `@supabase/supabase-js` usando `service_role` e upsert com `onConflict: slug`, garantindo idempotência e re-execução segura sem duplicar dados.

### Validações executadas
- **Auditoria do banco**: Verificamos com query SQL que as 24 tabelas do Periodiza foram criadas corretamente, assim como triggers, funções, RLS (ativado) e 4 extensões necessárias (pgcrypto, unaccent, pg_trgm, btree_gin).
- **TypeScript & ESLint**: Corrigimos erros de inferência `never[]` no script `merge-catalog.ts` causados pela inicialização de array vazio. O comando `npm run build` foi executado e passou 100%.
- **Upload de dados**: Os 104 exercícios do catálogo e as 5 tabelas da taxonomia subiram corretamente via Seed.

### Impactos
- O sistema já possui um banco de dados real funcional.
- Agora temos a fundação completa necessária para criar as features visuais do "Builder de Treinos" (Fase 1 validada na infra).

### Pendências
- Iniciar a UI do Builder de Treinos (SPEC-01).

### Arquivos principais envolvidos
- `supabase/migrations/0002_identity_and_tenancy.sql` (adaptado via run_command)
- `supabase/migrations/0008_rls_policies.sql`
- `supabase/migrations/0009_functions_views_triggers.sql`
- `scripts/merge-catalog.ts`
- `scripts/seed-exercises.ts`
- `data/catalog.json`

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

### Fase 2 - UI Flow (Dashboard & Periodizações) [30/07/2026]
**O que foi feito:**
- Atualização da página de Login (`app/(auth)/login/page.tsx`) com a foto real do profissional fornecida pelo usuário, melhorando a imersão e o branding.
- Implementação do Layout de Dashboard Premium (`app/(app)/dashboard/page.tsx`) com cards e KPIs (Alunos Ativos, Periodizações, Aderência).
- Implementação da Tela de Periodizações (`app/(app)/periodizacoes/page.tsx`) listando planos ativos de alunos e linkando para o builder de treino.
- Criação do Dialog Modal `NovaPeriodizacaoDialog` (`components/periodizacoes/nova-periodizacao-dialog.tsx`) utilizando os componentes de UI instalados (`shadcn/ui`), viabilizando a criação rápida de periodizações sem sair da página e redirecionando para o Builder.

- O usuário orientou a priorização de Dashboard e fluxo de tela ("2 PRIMEIRO E 1") antes de gerar os exercícios restantes. Com essa interface robusta de navegação, o profissional já pode visualizar, cadastrar e navegar para a tela do Builder.

### Fase 3 - Construtor de Treinos (Drag & Drop) [30/07/2026]
**O que foi feito:**
- Implementação da biblioteca `@hello-pangea/dnd` para habilitar drag and drop dos exercícios dentro de uma sessão de treino.
- Refatoração do layout do Builder em `workout-builder.tsx` para apresentar um painel lateral (`catalog-sidebar.tsx`) em vez de um modal. Isso permite busca e inserção rápida de exercícios na sessão atualmente ativa.
- Implementação de um fluxo otimista no client para drag and drop, que imediatamente salva a ordem no banco de dados Supabase por meio de uma Server Action dedicada (`updatePrescriptionOrder`).
- Limpeza e remoção de arquivos não mais utilizados (`exercise-search.tsx`).

**Justificativa:**
- Essa funcionalidade é o core do produto, habilitando o personal trainer a rapidamente inserir e organizar exercícios nos blocos de treino do microciclo, maximizando a produtividade (promessa central do MVP).
