# Roadmap — PERSONAL TRAINING DOUTOR LUIZ C. JÚNIOR

## Atualização — 2026-08-01 (regra geral: um Supabase, vários projetos)

Regra de arquitetura estabelecida: uma única instância do Supabase hospeda
vários projetos, cada um com schema e usuários isolados.

### Concluído
- [x] **Migration 0012 — schema dedicado por projeto.** O projeto sai do
  `public` e passa a ocupar o schema `periodiza`. Sem isso, dois projetos na
  mesma instância colidem: `clients`, `sessions`, `profiles` e `equipment` são
  nomes que qualquer sistema usa, e o segundo a rodar migrations passaria a
  escrever nas tabelas do primeiro. Move tabelas, views, enums e funções;
  `set schema` leva junto índices, constraints, triggers, RLS e policies.
- [x] **Correção dentro da própria 0012**: mover a função não conserta o que ela
  faz por dentro. Cinco funções (`handle_new_user`, `current_org_id`,
  `is_staff`, `is_org_owner`, `is_org_member`) tinham `public.` no corpo, e sete
  tinham `search_path = pg_catalog, public, pg_temp`. Sintoma observado no
  teste: `ERROR: relation "public.profiles" does not exist` ao inserir em
  `auth.users`, disparado pelo trigger. A migration passou a reescrever corpo e
  `search_path` das funções movidas.
- [x] **`SCHEMA_DO_PROJETO` no app** (`lib/env.ts`), aplicado via
  `db: { schema }` nos clientes de browser e servidor.
- [x] Documentada a ordem obrigatória `0011 → 0012` e o requisito de
  `PGRST_DB_SCHEMAS` na stack do Supabase.

### Em andamento
- [ ] **CRÍTICO — rotacionar `JWT_SECRET` e as chaves do Supabase.** As chaves
  em uso são as de exemplo (`iss: supabase-demo`), públicas. Nem a camada 1 nem
  a camada 2 protegem contra um `service_role` forjado.
- [ ] **CRÍTICO** — publicar o Kong (porta 8000) no domínio; segue 404 catch-all.
- [ ] **CRÍTICO** — aplicar 0010, 0011 e 0012, nessa ordem.
- [ ] Incluir `periodiza` em `PGRST_DB_SCHEMAS` e reiniciar o serviço `rest`.
- [ ] Confirmar o primeiro build verde no EasyPanel.

### Próximos passos
- [ ] Rotacionar o token do GitHub e o de API do EasyPanel, expostos em conversa.
- [ ] Suíte de testes automatizados.
- [ ] Regenerar `lib/types/database.ts` apontando para o schema novo.

### Riscos e débitos técnicos
- **A 0012 move dados reais.** Foi validada contra base reconstruída das
  migrations, não contra a base de produção. Fazer backup antes de aplicar.
- **`PGRST_DB_SCHEMAS` é pré-requisito silencioso**: sem ele a API responde 404
  em tudo, mesmo com tabelas e RLS corretos — sintoma que parece "app quebrado",
  não "configuração faltando".
- A reescrita de funções na 0012 substitui a string `public.` no corpo. Nenhuma
  função deste projeto tem essa string dentro de literal de texto; se alguma
  passar a ter, a substituição precisa virar reescrita explícita.
- `lib/types/database.ts` segue `any` e agora também desatualizado quanto ao
  schema.


## Atualização — 2026-07-31 (RLS completo e chaves de exemplo do Supabase)

Pedido de rodar contra o Supabase auto-hospedado real. Auditar as credenciais e
o isolamento revelou dois problemas críticos de segurança.

### Concluído
- [x] **CRÍTICO — migration 0011, RLS completo.** A 0008 deixou o isolamento
  pela metade: **8 tabelas sem RLS nenhum** (entre elas `client_anamnesis`, com
  dado de saúde, e `client_assessments`, com medidas corporais — qualquer
  usuário autenticado lia e escrevia dados de alunos de outros treinadores);
  **4 tabelas com RLS ligado e zero policies** (`organizations`, `profiles`,
  `prescription_items`, `set_logs` — no Postgres isso nega tudo, então o builder
  não enxergava nenhum exercício prescrito); e **quase nenhuma policy de
  escrita** (só 1 insert), o que bloqueava criar aluno, prescrever, reordenar e
  registrar treino. Onde havia RLS o app não funcionava; onde funcionava não
  havia isolamento. Validada contra PostgreSQL 16 com dois treinadores: leitura
  cruzada, insert, update de sequestro e delete cruzado todos bloqueados, e o
  fluxo do próprio treinador intacto.
- [x] **Guarda contra as chaves de exemplo do Supabase.** O Dockerfile passou a
  abortar o build quando a chave tem `iss: supabase-demo` — as chaves públicas
  do docker-compose oficial. Verificado que bloqueia as duas chaves de exemplo e
  libera uma chave própria.
- [x] `docs/SUPABASE_AUTO_HOSPEDADO.md` ganhou a seção de rotação de segredos.

### Em andamento
- [ ] **CRÍTICO — rotacionar os segredos do Supabase.** As chaves em uso são as
  de exemplo (`iss: supabase-demo`), assinadas com o `JWT_SECRET` padrão, que é
  público. Enquanto não trocar, **qualquer pessoa que alcance o gateway forja um
  token `service_role`** e ignora todo o RLS — inclusive o da 0011. Trocar só as
  chaves não basta: o segredo que as assina é que precisa mudar.
- [ ] **CRÍTICO** — aplicar 0010 e 0011 no Supabase.
- [ ] **CRÍTICO** — publicar o serviço do Supabase no domínio (segue 404 catch-all).
- [ ] Confirmar o primeiro build verde no EasyPanel.

### Próximos passos
- [ ] Rotacionar o token do GitHub e o token de API do EasyPanel, ambos
  expostos em conversa.
- [ ] Suíte de testes automatizados.
- [ ] Auditar `updatePrescriptionItem`, `movePrescriptionItem` e
  `copyPrescriptionItem` contra Postgres real.

### Riscos e débitos técnicos
- **A 0011 não protege nada enquanto o `JWT_SECRET` for o público.** RLS é
  aplicado com base no papel do JWT; com o segredo conhecido, qualquer um emite
  um `service_role`, que ignora RLS por definição. A rotação é pré-requisito.
- **`exercise_substitution_log` com `workout_execution_id` nulo fica invisível**
  para todos. A coluna é `on delete set null`, então linhas órfãs deixam de ser
  legíveis — escolha deliberada (fail-closed), mas significa perda de trilha de
  auditoria nesse caso.
- A 0011 usa funções `security definer` para quebrar a recursão das policies.
  Elas têm `search_path` fixo, mas qualquer alteração futura nelas precisa
  manter esse cuidado.
- `organizations` e `organization_members` receberam policies apenas de leitura;
  criação de organização ainda depende de service_role ou de fluxo não definido.

## Atualização — 2026-07-31 (Supabase auto-hospedado: duas armadilhas de login)

Contexto novo: o Supabase é **auto-hospedado no mesmo servidor**, não o
gerenciado. Isso muda a arquitetura e expôs dois defeitos que teriam quebrado o
login em produção sem produzir erro visível.

### Concluído
- [x] **CRÍTICO — nome do cookie de sessão fixado.** O `@supabase/supabase-js`
  deriva o nome do hostname: `sb-${hostname.split('.')[0]}-auth-token`. No
  gerenciado isso é o *project ref*, estável. No auto-hospedado vira função do
  domínio: `sb-meu-supabase-auth-token`, `sb-supabase-kong-auth-token`,
  `sb-164-auth-token` para a mesma instância. Efeitos: trocar o domínio do
  Supabase desloga todo mundo silenciosamente, e servidor/browser em URLs
  diferentes procuram cookies diferentes — login em loop. Fixado como
  `sb-periodiza-auth-token` em `lib/env.ts`, aplicado nos três clientes.
- [x] **`SUPABASE_INTERNAL_URL` — split de URL pública/interna.** O servidor
  fala com o Kong pela rede interna do Docker; o browser segue no domínio
  público. O app passa a subir mesmo antes de o domínio público existir, e
  certificado autoassinado deixa de derrubar o servidor (as chamadas internas
  não passam por TLS). Lida em runtime, então muda sem rebuild. Opcional: sem
  ela, tudo usa a URL pública, como antes.
- [x] **Sonda `/api/health?deep=1` passou a testar os dois caminhos**
  separadamente, com `usadoPor: browser` / `usadoPor: servidor`. O caso
  "interno OK, público quebrado" é comum no auto-hospedado e significa que o app
  renderiza mas o browser não fala com o Supabase — antes isso era indistinguível
  de uma falha total.
- [x] `docs/SUPABASE_AUTO_HOSPEDADO.md` — como identificar o Kong entre os
  containers da stack, descobrir o hostname interno, conferir o papel do JWT,
  e o que fazer com certificado autoassinado (incluindo por que
  `NODE_TLS_REJECT_UNAUTHORIZED=0` não é opção).

### Em andamento
- [ ] Confirmar o primeiro build verde no EasyPanel.
- [ ] **CRÍTICO** — publicar o serviço do Supabase no domínio (segue sem nada
  vinculado). Com `SUPABASE_INTERNAL_URL` isso deixa de bloquear o app subir,
  mas o browser continua precisando do domínio público.
- [ ] **CRÍTICO** — aplicar a migration 0010.

### Próximos passos
- [ ] Suíte de testes automatizados.
- [ ] Auditar `updatePrescriptionItem`, `movePrescriptionItem` e
  `copyPrescriptionItem` contra Postgres real.
- [ ] Remover os `eslint-disable` de arquivo inteiro no arquivo de actions.

### Riscos e débitos técnicos
- **Sessões anteriores ficam órfãs** ao mudar o nome do cookie. Como o app nunca
  chegou a subir em produção, o impacto real é nulo — mas exige um novo login
  em qualquer ambiente onde já se tenha logado.
- `NEXT_PUBLIC_SUPABASE_URL` continua embutida no bundle no build: mudar o
  domínio público exige rebuild. Só `SUPABASE_INTERNAL_URL` é ajustável a quente.
- `docker build` segue não executado — sem daemon Docker no ambiente.

## Atualização — 2026-07-30 (revisão da revisão: bugs provados contra Postgres real)

Revisão pedida sobre o trabalho anterior. Encontrou defeitos que as entradas
anteriores não pegaram — inclusive um que o próprio roadmap declarava concluído.

### Concluído
- [x] **CRÍTICO — `updatePrescriptionOrder` nunca funcionou.** A action usava
  `upsert` enviando só `{id, order_index, session_id}`. No Postgres,
  `insert ... on conflict do update` monta a tupla candidata **antes** de avaliar
  o conflito, então a ausência de `exercise_id` (`not null` sem default,
  migration 0006) derruba a instrução mesmo quando a linha já existe. Reproduzido
  contra PostgreSQL 16: `null value in column "exercise_id" ... violates
  not-null constraint`. **Consequência: a reordenação por drag-and-drop nunca
  persistiu** — a UI reordenava, a action retornava erro e a ordem voltava ao
  recarregar. Este roadmap listava "drag-drop e reordenação com persistência"
  como já existente. Reescrito com `UPDATE` por item, validado no mesmo Postgres.
- [x] **Colisão de `order_index`.** `order_index` é nullable e o Postgres ordena
  `NULLS FIRST` em `DESC`; uma única linha com índice nulo virava a primeira do
  resultado, o valor lido era `null` e o próximo índice voltava para 1,
  colidindo com o item que já ocupava a posição 1. Corrigido com filtro
  `not null` + `nullsFirst: false`. Provado com as três linhas `1, 2, NULL`.
- [x] `addPrescriptionItem` deixou de duplicar a lógica de próximo índice (e de
  usar `.single()` numa consulta que legitimamente não retorna linhas); passou a
  reusar `proximoOrderIndex`, que usa `maybeSingle()`.
- [x] **Dependência de rede no build removida.** `app/layout.tsx` usava `Inter`
  via `next/font/google`, que **baixa a fonte durante o `next build`** — ou seja,
  `fonts.googleapis.com` era dependência obrigatória do deploy. Trocado por
  `next/font/local` com o subset `latin` da Inter variável (48 KB) versionado em
  `app/fonts/`. Confirmado que o `unicode-range` (U+0000-00FF) cobre todos os
  acentos do português e que o build não referencia mais Google Fonts.
- [x] **Dashboard deixou de exibir dados inventados.** A página codificava
  "12 alunos ativos", "84% de aderência", "42 treinos" e três alunos fictícios
  (João Silva, Maria Oliveira, Carlos Pereira) direto no JSX — números que
  apareceriam idênticos para qualquer treinador, inclusive um sem nenhum aluno.
  Agora as contagens de alunos e periodizações vêm do banco; o que ainda não
  existe mostra `—` com a razão, em vez de número falso.
- [x] Mensagens de erro do builder traduzidas para pt-BR. Eram exibidas ao
  usuário em inglês (`Failed to add item.`) num produto declarado `lang="pt-BR"`.
- [x] `error.tsx` e `not-found.tsx` deixaram de apontar para `/dashboard` (rota
  protegida): se a causa do erro fosse a própria sessão, o botão "voltar"
  devolveria o usuário ao login. Agora apontam para `/`, que decide conforme a
  sessão.
- [x] Sonda `/api/health` endurecida contra URL malformada (ver ressalva abaixo).

### Em andamento
- [ ] Confirmar o primeiro build verde no EasyPanel.
- [ ] **CRÍTICO** — nenhum serviço publicado no domínio do Supabase.
- [ ] **CRÍTICO** — aplicar a migration 0010.

### Próximos passos
- [ ] Auditar as demais actions com o mesmo rigor: o bug do `upsert` passou por
  revisões anteriores porque ninguém executou o caminho contra um banco real.
  `updatePrescriptionItem`, `movePrescriptionItem` e `copyPrescriptionItem` não
  foram exercitados contra Postgres nesta revisão.
- [ ] Suíte de testes automatizados — este bug teria sido pego por um único
  teste de integração da reordenação. `vitest` está configurado e sem nenhum
  arquivo de teste.
- [ ] Remover os `eslint-disable` de arquivo inteiro em
  `app/(app)/periodizacoes/[periodizationId]/actions.ts` (`no-explicit-any` e
  `no-unused-vars`), que mascaram exatamente a classe de erro encontrada aqui.
- [ ] Métricas reais de aderência e treinos realizados (dependem de
  `workout_executions`).

### Riscos e débitos técnicos
- **Lição registrada**: o `upsert` quebrado sobreviveu a várias revisões porque
  foi avaliado por leitura, não por execução. Toda action que escreve no banco
  deve ser exercitada contra Postgres antes de ser declarada pronta.
- **Ressalva de honestidade**: a proteção que adicionei em `/api/health` contra
  `new URL()` lançando é **defesa em profundidade, não conserto de bug vivo**.
  Ao testar, descobri que `lib/env.ts` já valida a URL com zod durante o
  prerender de `/`, então uma URL malformada **derruba o build** antes de chegar
  ao runtime. A proteção só passa a valer se `/` deixar de ser prerenderizada.
- **Débito**: `app/(app)/periodizacoes/[periodizationId]/actions.ts` continua com
  `as any` em todas as chamadas e dois `eslint-disable` de arquivo inteiro. A
  ausência de tipos é o que permitiu o upsert inválido compilar.
- **Débito**: a busca de contingência (`ilike`) devolve linhas com 4 colunas
  onde a UI espera 12. Não quebra (a UI usa optional chaining), mas o tipo
  declarado não corresponde ao retorno.

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
- [x] **Sonda de saúde `GET /api/health`**: liveness que não toca a rede, e `?deep=1` que sonda o gateway do Supabase **de dentro do container** — a rede que importa, não a da máquina de quem depura. Fica fora do matcher do middleware, então responde mesmo com a sessão quebrada ou o Supabase fora do ar. Não devolve chave: da URL sai só o host, da chave só o comprimento e o papel do JWT. A sonda olha o `content-type`, não só o status — é isso que distingue "gateway respondendo" de "página catch-all do proxy", que é exatamente o modo de falha atual do projeto.
- [x] **`HEALTHCHECK` no Dockerfile** apontando para a sonda **rasa**, de propósito: amarrar a saúde do container à disponibilidade do Supabase transformaria uma instabilidade do banco em loop de restart.
- [x] **`tini` como PID 1**: o `server.js` do Next standalone não instala handler de `SIGTERM`, e um processo sem handler explícito como PID 1 no Linux **ignora** o sinal. Sem isso o EasyPanel esperaria o timeout e mandaria `SIGKILL` em todo redeploy, derrubando requisições em voo.
- [x] **Boundaries de erro**: o app não tinha nenhum. `app/error.tsx` (exceção em rota, com o `digest` para correlacionar com o log), `app/global-error.tsx` (exceção no próprio layout raiz — monta o documento com estilo inline, já que `globals.css` e a fonte podem ser o que quebrou) e `app/not-found.tsx` (404 em pt-BR, no lugar da tela padrão em inglês).
- [x] **Falha de auth deixou de ser silenciosa**: `getUser()` não lança quando o Supabase está fora — o `@supabase/auth-js` converte falha de rede em `AuthRetryableFetchError` e devolve `user: null`. O efeito é *fail-closed* (correto), mas o sintoma no painel era só "ninguém consegue entrar", sem causa visível. O middleware agora registra a falha, amortecida em 30s, filtrando `AuthSessionMissingError` para não logar toda requisição anônima.
- [x] `.env.example` corrigido: ainda afirmava que `SUPABASE_URL`/`SUPABASE_KEY` "não são aceitos como sinônimos", contradizendo o alias que passou a existir no Dockerfile.

### Já existia — registrado por engano como novo
- Drag-drop e reordenação dentro da sessão, com persistência (`workout-builder.tsx` + `PrescriptionItemCard`).
- Edição de séries/reps/carga/RIR/RPE/pausa com save debounced (`PrescriptionItemCard`).
- `sessions.label`, unique `(microcycle_id, label)`, `periodizations.split` — migration **0005**.
- `exercises.search_vector` e índices GIN/trigram — migration **0004**.
- Extensões `unaccent` e `pg_trgm` — migration **0001**.

### Em andamento
- [ ] **Confirmar o primeiro build verde no EasyPanel.** O build de 30/07 15:36 já executou o Dockerfile e parou na guarda de variáveis (comportamento correto, pois os build args vinham como `SUPABASE_URL`/`SUPABASE_KEY`). O Dockerfile passou a aceitar esses nomes como alias, então o próximo build deve avançar. Falta um build concluído.
- [ ] **CRÍTICO — nenhum serviço publicado no domínio do Supabase.** `xpert-backend-supabase.qfotry.easypanel.host` devolve resposta **idêntica byte a byte** à de um hostname inventado (md5 `9d0e48091c0d` em ambos): cai na página catch-all do proxy. O DNS é wildcard, então resolver não prova nada. Conclusão: o serviço Supabase está parado, foi removido, ou o domínio nunca foi vinculado a ele — **não** é roteamento para o serviço errado, como eu havia registrado antes. Para comparação, o domínio do app responde 502 (vínculo existe, container fora do ar). Passos no painel em `docs/MIGRATIONS.md`.
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
- **Risco**: `docker build` não foi executado — o ambiente de desenvolvimento não tem daemon Docker. As premissas do Dockerfile foram validadas individualmente (saída standalone, caminhos de `COPY`, arranque com `node server.js`, HTTP 200 em `/` e `/login`, `npm ci` a partir do lockfile), mas a construção da imagem só se confirma no primeiro build do EasyPanel.
- **Risco de build**: `app/layout.tsx` usa `Inter` via `next/font/google`, que **baixa a fonte durante o build**. Se a rede do builder não alcançar `fonts.googleapis.com`, o `next build` falha. O `npm ci` do mesmo build já prova que há saída para a internet, então o risco é baixo; se aparecer, a correção é migrar para `next/font/local` com o `.woff2` versionado.
- **Débito**: `/dashboard`, `/modelos` e `/configuracoes` são páginas estáticas de placeholder — o dashboard mostra números fixos (12 alunos, 84% de aderência) que não vêm do banco. Precisam virar dinâmicas antes de qualquer uso real.

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
