# Plano de Implementação — Perfil de Player + Sync Blizzard / Raider.IO / Warcraft Logs

_Data: 2026-03-25_

## 1) Objetivo do módulo
Criar um **perfil único do player** que agregue:
- Dados de personagem (itens, gems, enchants, embellishments, talentos)
- Confiabilidade de gameplay (mortes evitáveis, execução mecânica, consistência)
- Histórico de M+ e raids
- Afiliações (guild atual, histórico de guild/teams)

Esse perfil deve servir para:
1. Recrutamento
2. Avaliação de desempenho contínuo
3. Montagem de rosters para raid e M+

---

## 2) Arquitetura recomendada (visão macro)

### 2.1 Camadas
1. **Ingest Layer**
   - Blizzard API
   - Raider.IO API pública
   - Warcraft Logs API (report/fight)

2. **Normalize Layer**
   - Converter tudo para um esquema interno canônico
   - Resolver identidade cross-source (mesmo player em fontes diferentes)

3. **Storage Layer**
   - Banco relacional (PostgreSQL/Prisma) para entidades principais
   - Cache (Redis ou disco) para respostas quentes

4. **Scoring Layer**
   - Cálculo de indicadores (reliability, awareness, consistency)

5. **Serving Layer**
   - Endpoints para UI (perfil player, histórico, comparativos)

---

## 3) Modelo de dados (MVP)

## 3.1 Entidades principais

### `player_identity`
- id (uuid)
- battle_net_id (nullable)
- raiderio_profile_url
- wcl_character_key
- normalized_name
- normalized_realm
- region

### `player_snapshot`
- id
- player_id
- captured_at
- ilvl
- class
- spec
- guild_name
- faction

### `player_gear_item`
- id
- snapshot_id
- slot
- item_id
- item_name
- item_level
- source_name (raid, dungeon, crafting)
- source_id (boss_id / dungeon_id)
- has_embellishment
- embellishment_ids[]
- gem_ids[]
- enchant_id

### `player_talent_build`
- id
- snapshot_id
- loadout_string
- hero_talent
- class_talent_hash
- spec_talent_hash

### `player_mplus_run`
- id
- player_id
- run_date
- dungeon
- key_level
- timed
- deaths
- interrupts
- avoidable_damage_estimate
- defensive_usage_score

### `player_raid_pull`
- id
- player_id
- report_code
- fight_id
- boss
- difficulty
- kill
- deaths
- avoidable_events
- dps
- hps
- mechanics_score

### `player_reliability_daily`
- id
- player_id
- date
- reliability_score
- awareness_score
- consistency_score
- notes

---

## 4) Identity Resolution (ponto crítico)

Como as APIs têm identificadores diferentes, use chave canônica:

`{region}:{realm_slug}:{character_name_lower}`

Regras:
1. Sempre normalizar realm/name
2. Guardar aliases (renomeou char, transferiu realm)
3. Manter tabela de merge/manual override para casos ambíguos

---

## 5) Sync strategy por fonte

## 5.1 Blizzard API
### Puxa:
- Equipamentos atuais
- Gems/enchants/embellishments
- Talentos
- Dados básicos do char

### Frequência:
- On-demand quando abrir perfil
- Warm refresh a cada 6h para players monitorados

## 5.2 Raider.IO API pública
### Puxa:
- Histórico de M+
- Score por dungeon
- Chaves recentes

### Frequência:
- Batch diário + on-demand

## 5.3 Warcraft Logs API
### Puxa:
- Pull/fight por report monitorado
- Eventos por player para scoring

### Frequência:
- Ingest por novo report cadastrado
- Reprocessamento incremental (somente fights novas)

---

## 6) Como lidar com limitação/rate limit de API

1. **Fila de jobs** (BullMQ / queue worker)
   - Cada sync vira job idempotente

2. **Janela de backoff exponencial**
   - Retry com jitter

3. **Cache agressivo com TTL por tipo de dado**
   - Gear/talento: 6-12h
   - M+ runs: 12-24h
   - Pull details: imutável após ingest

4. **Delta fetch sempre que possível**
   - Evitar refetch completo de histórico

5. **Ordem de prioridade de jobs**
   - P1: perfil aberto pelo usuário
   - P2: players favoritos/recrutamento
   - P3: refresh de rotina

---

## 7) Scoring de jogador (versão 1)

### 7.1 Reliability Score (0-100)
Componentes:
- morte evitável (peso alto)
- uso de defensivos em janelas críticas
- uptime
- consistência por 10 pulls/runs

### 7.2 Awareness Score
- interrupções relevantes
- execução de mecânica atribuída
- posicionamento (proxy por eventos evitáveis)

### 7.3 Consistency Score
- variância de performance entre pulls/runs
- penalização por outliers ruins repetidos

> Importante: score deve ser **explicável** (mostrar "por que" ganhou/perdeu pontos).

---

## 8) UI do perfil (proposta)

## 8.1 Layout (Bento)
- Card 1: Header do player (spec, ilvl, guild, links)
- Card 2: Reliability / Awareness / Consistency
- Card 3: Gear completo + tooltips de origem
- Card 4: Talentos (loadout + comparação com top build)
- Card 5: Histórico de M+ (últimas 20 runs)
- Card 6: Histórico de raid pulls (últimos bosses)
- Card 7: “Pontos de melhoria” automáticos

## 8.2 Interações-chave
- Clique em item => origem e alternativa de upgrade
- Filtro por período (7/14/30 dias)
- Comparar player com outro mesmo role/spec

---

## 9) Endpoints recomendados (MVP)

- `GET /api/player/:region/:realm/:name`
  - perfil agregado completo

- `GET /api/player/:id/mplus?range=30d`
  - runs + métricas de execução

- `GET /api/player/:id/raids?boss=...`
  - histórico de pulls/bosses

- `POST /api/player/:id/sync`
  - dispara sincronização on-demand

- `GET /api/player/:id/sync-status`
  - status do job

---

## 10) Plano de execução (fases)

### Fase 1 (2 semanas)
- Banco/modelos MVP
- Identity resolution
- Sync on-demand Blizzard + Raider.IO
- Página de perfil com header + reliability + gear

### Fase 2 (2 semanas)
- Ingest WCL por player
- Histórico de pulls e métricas de execução
- Score explicável (breakdown)

### Fase 3 (2-3 semanas)
- Comparativos por role/spec
- Alertas de regressão
- Recomendações automáticas de melhoria

---

## 11) Riscos + mitigação

1. **Limite de API / instabilidade externa**
   - Mitigação: cache, jobs, retry, prioridade

2. **Identity mismatch entre fontes**
   - Mitigação: chave canônica + alias + override manual

3. **Score injusto/ruidoso**
   - Mitigação: janelas mínimas de amostra e score explicável

4. **Dados antigos**
   - Mitigação: timestamps visíveis e badge de "última atualização"

---

## 12) Recomendação final
Comece pequeno e forte:
1. Perfil agregado básico com gear + talentos + reliability
2. Sync on-demand confiável
3. Só depois ampliar para ranking interno de M+ por qualidade de gameplay

Esse caminho reduz risco técnico e já entrega valor real de recrutamento e progressão.

---

## 13) Opção de DB gratuita (recomendado para MVP online)

Para evitar crescimento de storage local, use **Supabase free tier** para snapshots.

Tabela mínima sugerida:

```sql
create table if not exists player_profile_snapshots (
  id bigint generated always as identity primary key,
  region text not null,
  realm text not null,
  name text not null,
  captured_at timestamptz not null,
  identity jsonb not null,
  mythic_plus jsonb not null
);

create index if not exists idx_player_profile_snapshots_lookup
  on player_profile_snapshots(region, realm, name, captured_at desc);
```

No app, quando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estiverem definidos, persistir snapshots no Supabase; caso contrário, fallback local em arquivo.
