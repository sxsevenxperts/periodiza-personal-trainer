# SPEC-01 — Builder de Treinos: abas A–G e busca de exercício

Status: **aprovado pelo product owner** · Origem: requisito direto do cliente
Depende de: `data/taxonomy.json`, `data/catalog.json`, migrations `0005_periodization.sql` e `0006_prescription.sql`

---

## 1. Requisito original

> "Que em cada aba acrescentada para o treino haja a opção de pesquisar qual exercício e a qual
> treino será, se A, B, C, D, E, F ou G."

Traduzido para requisito de produto:

1. A sessão de treino dentro de um microciclo é identificada por uma **letra de A a G** (máximo 7).
2. O builder exibe as sessões como **abas** — `Treino A`, `Treino B`, ... até `Treino G` — com um
   botão `+ Adicionar treino` que cria a próxima letra livre.
3. Dentro de cada aba existe uma **busca de exercício** que consulta o catálogo canônico.
4. No momento de adicionar o exercício, o personal escolhe **para qual treino (A–G)** ele vai —
   sem precisar sair da aba em que está.

---

## 2. Impacto no schema

### 2.1 `sessions` — nova coluna obrigatória

```sql
-- enum da letra do treino
create type session_label as enum ('A','B','C','D','E','F','G');

alter table sessions
  add column label session_label not null;

-- não pode haver dois "Treino A" no mesmo microciclo
create unique index if not exists sessions_microcycle_label_uniq
  on sessions (microcycle_id, label);
```

Regras:

- `label` é a identidade funcional do treino. `name` continua livre e descritivo
  (ex: `label = 'A'`, `name = 'Inferiores — dominância de quadril'`).
- A letra é **estável ao longo da periodização**: o `Treino A` da semana 1 e o da semana 6 têm o
  mesmo `label`, o que permite comparar evolução do mesmo treino entre microciclos.
- `order_index` continua existindo e governa a ordem de exibição; `label` governa a identidade.
  Por padrão `order_index` segue a ordem alfabética, mas o personal pode reordenar as abas sem
  renomear os treinos.

### 2.2 Divisão de treino no nível da periodização

```sql
create type training_split as enum (
  'A',              -- full body, 1 treino
  'AB', 'ABC', 'ABCD', 'ABCDE', 'ABCDEF', 'ABCDEFG'
);

alter table periodizations
  add column split training_split not null default 'ABC';
```

- `split` define quantas letras o builder oferece por padrão e valida a criação de abas:
  não é permitido criar `Treino D` se `split = 'ABC'` — o personal precisa promover a divisão
  primeiro (ação explícita na UI, com confirmação, porque impacta todos os microciclos).
- Ao promover a divisão (ex: `ABC` → `ABCD`), o builder oferece criar a nova sessão em **todos**
  os microciclos ou apenas nos microciclos a partir do atual.

### 2.3 Ajuste em `prescription_items`

Nenhuma coluna nova. O vínculo com a letra é indireto e correto:
`prescription_items.session_id → sessions.label`. **Não duplicar a letra em `prescription_items`** —
seria desnormalização com risco de divergência.

---

## 3. Motor de busca de exercício

### 3.1 Campos pesquisáveis

A busca é uma consulta única sobre o catálogo, cobrindo:

| Campo | Peso | Exemplo de match |
|---|---|---|
| `name_pt` | 10 | "supino reto" |
| `aliases_pt[]` | 8 | "hip thrust" → Elevação pelvica |
| `name_en` | 6 | "romanian deadlift" |
| `primary_muscle.name_pt` | 5 | "glúteo máximo" |
| `catalog_group.name_pt` | 4 | "remadas horizontais" |
| `movement_pattern.name_pt` | 4 | "puxar vertical" |
| `equipment_slugs[]` | 3 | "kettlebell" |
| `secondary_muscles[].name_pt` | 2 | "serrátil anterior" |

Implementação: coluna `search_vector tsvector` gerada em `exercises`, com dicionário
`portuguese`, mantida por trigger, mais índice GIN. Busca sem acento via `unaccent`.
Fallback de similaridade com `pg_trgm` (`similarity() > 0.3`) para erro de digitação —
"agacahmento" ainda encontra "Agachamento".

```sql
create extension if not exists unaccent;
create extension if not exists pg_trgm;

alter table exercises add column search_vector tsvector;
create index exercises_search_gin on exercises using gin (search_vector);
create index exercises_name_trgm on exercises using gin (name_pt gin_trgm_ops);
```

### 3.2 Filtros da busca

Expostos como chips acima do resultado, todos combináveis:

- Grupo do catálogo (os 21 grupos)
- Padrão de movimento (os 37)
- Região corporal (as 12)
- Músculo primário
- Equipamento
- Nível técnico
- Lateralidade
- **`Só o que o aluno tem`** — cruza `client_equipment_access.available_equipment_slugs`.
  Ligado por padrão.

### 3.3 Sinalização contextual no resultado (diferencial do produto)

Cada linha do resultado é anotada com o contexto **daquele aluno**, não com dado genérico:

- 🔴 **Restrito** — o `movement_pattern` do exercício está em
  `client_anamnesis.restricted_movement_patterns`. Bloqueia a inclusão com confirmação explícita
  e registra o override em `exercise_substitution_log`.
- 🟡 **Sem equipamento** — o equipamento não está em `client_equipment_access`. Ao adicionar,
  o motor de substituição sugere a alternativa da mesma `substitution_family`.
- 🟡 **Acima do nível** — `technical_level` do exercício maior que
  `clients.nivel_treinamento`.
- 🔵 **Já prescrito** — o exercício já está em outra sessão do mesmo microciclo. Mostra em qual
  letra (ex: "já está no Treino B"), para o personal decidir se é intencional.
- ⚪ **Volume do grupo** — quantas séries semanais o `body_region` do exercício já acumula neste
  microciclo, para leitura de volume enquanto monta.

---

## 4. Comportamento da UI

### 4.1 Barra de abas

```
┌────────────────────────────────────────────────────────────────────────┐
│  Treino A  │  Treino B  │  Treino C  │  + Adicionar treino            │
│  Inferior  │  Superior  │  Full body │                                │
│  8 exerc.  │  7 exerc.  │  6 exerc.  │                                │
└────────────────────────────────────────────────────────────────────────┘
```

- Cada aba mostra a letra, o `name` e a contagem de exercícios.
- `+ Adicionar treino` cria a próxima letra livre (A→B→C→...→G). Desabilitado em G, com tooltip
  explicando o limite e oferecendo promover o `split`.
- Aba com validação pendente (sem exercício, ou volume fora do alvo do microciclo) recebe um
  indicador visual.
- Reordenar abas por drag altera `order_index`, nunca `label`.
- Renomear e duplicar treino no menu de contexto da aba. Duplicar copia todos os
  `prescription_items` para a próxima letra livre.

### 4.2 Busca dentro da aba

Campo persistente no topo do painel da sessão, com foco por `/` e navegação por teclado:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔍 Buscar exercício...                          Adicionar em: [Treino A ▾]│
├──────────────────────────────────────────────────────────────────────────┤
│ [Grupo ▾] [Padrão ▾] [Músculo ▾] [Equipamento ▾]  ☑ Só o que o aluno tem │
├──────────────────────────────────────────────────────────────────────────┤
│ Supino reto com barra              Peitoral maior · Empurrar horizontal   │
│   barra olímpica, banco reto       ⚪ 12 séries/sem  🔵 já no Treino B  [+]│
│                                                                           │
│ Supino reto com halteres           Peitoral maior · Empurrar horizontal   │
│   halteres, banco reto             ⚪ 12 séries/sem                    [+]│
│                                                                           │
│ Crucifixo no cabo                  Peitoral maior · Adução de ombro       │
│   crossover                        🟡 sem equipamento                  [+]│
└──────────────────────────────────────────────────────────────────────────┘
```

**O seletor `Adicionar em: [Treino A ▾]` é o núcleo do requisito.** Ele:

- inicia na aba ativa;
- lista todas as letras existentes na periodização (A–G) com o nome de cada treino;
- permite mandar o exercício para outro treino **sem trocar de aba** — o resultado da busca
  continua na tela, então o personal distribui vários exercícios entre A, B e C numa só passada;
- oferece `Adicionar em todos os treinos` para itens de aquecimento/mobilidade;
- mantém a última escolha durante a sessão de edição (sticky), porque o padrão de uso é
  adicionar vários exercícios seguidos ao mesmo treino;
- mostra um toast com desfazer ("Adicionado ao Treino C · Desfazer") quando o destino é
  diferente da aba ativa, já que a mudança acontece fora da vista.

### 4.3 Ao adicionar

O exercício entra na sessão com prescrição **pré-preenchida pelo motor** — nunca em branco —
derivada do objetivo do aluno, da fase do mesociclo e da estratégia de carga do microciclo
(séries, faixa de reps, RIR alvo, descanso, cadência). O personal ajusta o que quiser.

Se o exercício tiver mais de uma `variant`, um seletor de variante aparece na linha do item já
adicionado, com a `is_default` pré-selecionada.

### 4.4 Mover exercício entre treinos

- Drag do item entre abas (drop na aba de destino).
- Menu do item: `Mover para ▸ Treino A–G` e `Copiar para ▸ Treino A–G`.
- Mover reatribui `session_id` e recalcula `order_index` na origem e no destino.

---

## 5. Critérios de aceite

- [ ] Criar treinos de A até G num microciclo; a 8ª tentativa é bloqueada com mensagem clara.
- [ ] Duas sessões com a mesma letra no mesmo microciclo são rejeitadas pelo banco, não só pela UI.
- [ ] Busca por "hip thrust" retorna "Elevação pelvica com barra" (match por alias).
- [ ] Busca por "agacahmento" retorna resultados de agachamento (trigram).
- [ ] Busca sem acento ("gluteo") retorna resultados acentuados.
- [ ] Estando na aba `Treino A`, adicionar um exercício ao `Treino C` funciona, exibe toast com
      desfazer, e a contagem da aba `Treino C` incrementa sem recarregar a página.
- [ ] Filtro `Só o que o aluno tem` remove exercícios cujo equipamento não está liberado.
- [ ] Exercício com padrão restrito na anamnese exige confirmação e grava o override no log.
- [ ] Exercício já prescrito em outra letra do mesmo microciclo é sinalizado com a letra.
- [ ] Mover um exercício de A para C não perde a prescrição nem duplica o item.
- [ ] Nenhum campo de prescrição (série, rep, carga, RIR, RPE, descanso, cadência, método)
      é gravado em `exercises` ou `exercise_variants` — só em `prescription_items`.

---

## 6. Fora de escopo desta spec

- Execução do treino pelo aluno (`workout_executions`, `set_logs`).
- Motor de substituição completo — aqui só é consumido pela sinalização 🟡.
- Biblioteca de vídeo por exercício.
