-- =====================================================================
-- 0001_extensions_and_enums.sql
-- Extensoes e vocabulario de dominio (enums) do app de periodizacao.
--
-- Convencao do projeto:
--   * nomes de tabela/coluna em INGLES
--   * valores de enum em PORTUGUES quando forem dominio de negocio
--   * ids uuid default gen_random_uuid() (nativo no PG13+, pg_catalog)
--   * created_at / updated_at timestamptz not null default now()
--
-- Idempotente: pode ser reexecutado sem efeito colateral.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensoes
-- No Supabase as extensoes vivem no schema "extensions". As funcoes que
-- dependem delas (unaccent) declaram search_path = public, extensions.
-- ---------------------------------------------------------------------
create schema if not exists extensions;

create extension if not exists pgcrypto  with schema extensions;  -- gen_random_bytes, digest
create extension if not exists unaccent  with schema extensions;  -- busca sem acento
create extension if not exists pg_trgm   with schema extensions;  -- similaridade / erro de digitacao
create extension if not exists btree_gin with schema extensions;  -- indices compostos gin

comment on schema extensions is 'Extensoes do Postgres isoladas fora de public (padrao Supabase).';

-- ---------------------------------------------------------------------
-- Enums
--
-- Um unico bloco declarativo: cria o tipo se nao existir e, se ja existir,
-- acrescenta apenas os labels que faltam. Isso torna a migration segura
-- tanto em banco novo quanto em banco ja provisionado.
-- ---------------------------------------------------------------------
do $$
declare
  e         record;
  lbl       text;
  ddl       text;
begin
  for e in
    select * from (values

      -- ============ identidade e tenancy ============
      ('user_role',                 array['owner','personal','assistente','aluno']),
      ('org_plan',                  array['trial','essencial','profissional','estudio','enterprise']),
      ('subscription_status',       array['trialing','ativa','inadimplente','cancelada','expirada']),

      -- ============ aluno / avaliacao ============
      ('biological_sex',            array['masculino','feminino','intersexo','nao_informado']),
      ('training_goal',             array['hipertrofia','forca','resistencia','emagrecimento',
                                          'condicionamento','reabilitacao','performance_esportiva','saude_geral']),
      ('training_level',            array['sedentario','iniciante','intermediario','avancado']),
      ('client_status',             array['ativo','inativo','pausado','arquivado']),
      ('stress_level',              array['baixo','moderado','alto','muito_alto']),
      ('quality_scale',             array['muito_ruim','ruim','regular','bom','otimo']),
      ('smoking_status',            array['nunca_fumou','ex_fumante','fumante_ocasional','fumante_diario']),
      ('equipment_access_context',  array['academia_completa','academia_basica','home_gym','hotel',
                                          'ao_ar_livre','estudio_personal','sem_equipamento']),
      ('one_rm_source',             array['direto','estimado']),
      ('one_rm_formula',            array['epley','brzycki','lombardi','oconner']),

      -- ============ catalogo canonico ============
      -- movement_dominance espelha data/taxonomy.json -> padroes_movimento[].dominancia
      ('movement_dominance',        array['joelho','quadril','tornozelo',
                                          'empurrar_horizontal','empurrar_vertical',
                                          'puxar_horizontal','puxar_vertical',
                                          'core','transporte','potencia_total','isolado']),
      -- equipment_category espelha data/taxonomy.json -> equipamentos[].categoria
      ('equipment_category',        array['peso_livre','maquina','cabo','elastico',
                                          'corporal','implemento','acessorio']),
      ('load_type',                 array['carga_externa','peso_corporal','peso_corporal_assistido',
                                          'peso_corporal_lastrado','elastico','isometrico','sem_carga']),
      ('technical_level',           array['iniciante','intermediario','avancado']),
      ('dominant_plane',            array['sagital','frontal','transversal','multiplanar']),
      ('kinetic_chain',             array['aberta','fechada','mista']),
      ('laterality',                array['bilateral','unilateral','alternado','assimetrico']),
      ('exercise_metric',           array['carga_reps','repeticoes','tempo','distancia','carga_tempo']),
      ('stability_demand',          array['baixa','moderada','alta','muito_alta']),
      ('resistance_curve',          array['ascendente','descendente','constante','em_sino','variavel']),
      ('body_position',             array['em_pe','sentado','deitado_supino','deitado_prono','deitado_lateral',
                                          'quatro_apoios','ajoelhado','semi_ajoelhado','suspenso',
                                          'inclinado','apoiado','invertido']),
      ('range_of_motion',           array['completa','parcial','parcial_alongada','parcial_encurtada',
                                          'amplitude_ampliada','amplitude_reduzida']),
      -- os 6 eixos de variacao definidos pelo product owner
      ('variant_axis',              array['equipamento','pegada','base','angulo','apoio','amplitude']),
      ('media_type',                array['video','gif','imagem','animacao_3d']),

      -- ============ periodizacao ============
      ('periodization_model',       array['linear','ondulatoria_diaria','ondulatoria_semanal','blocos',
                                          'conjugada','concorrente','bulgara','ate_a_falha_autoregulada','custom']),
      ('periodization_status',      array['rascunho','ativa','pausada','expirada','concluida',
                                          'cancelada','substituida']),
      -- SPEC-01: divisao de treino no nivel da periodizacao
      ('training_split',            array['A','AB','ABC','ABCD','ABCDE','ABCDEF','ABCDEFG']),
      -- SPEC-01: letra do treino (abas A-G)
      ('session_label',             array['A','B','C','D','E','F','G']),
      ('mesocycle_phase',           array['adaptacao_anatomica','acumulo','intensificacao','realizacao',
                                          'choque','deload','transicao','manutencao','pico','taper']),
      ('load_strategy',             array['crescente','decrescente','constante','ondulatoria','deload']),
      ('session_type',              array['forca','hipertrofia','potencia','resistencia','metabolico',
                                          'tecnica','mobilidade','condicionamento','recuperacao_ativa','avaliacao']),
      ('session_status',            array['planejada','em_andamento','concluida','perdida','remarcada']),
      ('session_block_type',        array['aquecimento','principal','acessorio','finalizador','alongamento']),

      -- ============ prescricao ============
      ('method_scope',              array['item','bloco','sessao']),
      ('intentional_velocity',      array['controlada','moderada','explosiva','maxima','lenta_intencional']),

      -- ============ execucao ============
      ('execution_status',          array['em_andamento','concluida','abandonada']),
      ('mood_scale',                array['otimo','bom','neutro','ruim','pessimo']),
      ('substitution_reason',       array['equipamento_indisponivel','dor_articular','lesao','nivel_tecnico',
                                          'preferencia_aluno','lotacao_academia','ajuste_do_personal']),
      ('substitution_decider',      array['motor','personal','aluno']),

      -- ============ auditoria / notificacao ============
      ('periodization_event_type',  array['criada','ativada','pausada','retomada','vencendo_em_7_dias',
                                          'expirada','renovada','concluida','cancelada','substituida']),
      ('notification_channel',      array['in_app','email','push','whatsapp']),
      ('notification_status',       array['pendente','enviada','lida','falhou'])

    ) as t(type_name, labels)
  loop
    if not exists (
      select 1
        from pg_type ty
        join pg_namespace ns on ns.oid = ty.typnamespace
       where ty.typname = e.type_name
         and ns.nspname = 'public'
    ) then
      select string_agg(quote_literal(l), ', ')
        into ddl
        from unnest(e.labels) as l;

      execute format('create type public.%I as enum (%s)', e.type_name, ddl);
    else
      -- tipo ja existe: acrescenta somente labels novos, preservando a ordem
      foreach lbl in array e.labels loop
        execute format('alter type public.%I add value if not exists %L', e.type_name, lbl);
      end loop;
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------
-- Documentacao dos enums menos obvios
-- ---------------------------------------------------------------------
comment on type public.user_role is
  'Papel do usuario. owner = dono da organizacao; personal = treinador; assistente = estagiario/apoio; aluno = cliente final com login.';
comment on type public.training_split is
  'SPEC-01: divisao de treino da periodizacao. Define quantas letras (A-G) o builder libera.';
comment on type public.session_label is
  'SPEC-01: letra identificadora do treino dentro do microciclo. Identidade funcional estavel entre semanas.';
comment on type public.variant_axis is
  'Eixo canonico de variacao do exercicio. Hierarquia inviolavel: exercise -> exercise_variant (equipamento, pegada, base, angulo, apoio, amplitude).';
comment on type public.exercise_metric is
  'Como o exercicio e medido: carga x reps, reps puras, tempo (isometria/EMOM), distancia (carries/sprints) ou carga x tempo.';
comment on type public.periodization_status is
  'Ciclo de vida da periodizacao. "expirada" e atribuida automaticamente por expire_periodizations() quando end_date < current_date.';
comment on type public.intentional_velocity is
  'Velocidade intencional da fase concentrica prescrita pelo personal (nao e velocidade medida por encoder).';
comment on type public.one_rm_source is
  'direto = teste de 1RM real; estimado = derivado de uma serie submaxima via formula.';
