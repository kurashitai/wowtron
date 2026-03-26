# Auditoria de Utilidade Real do WoWtron para Raid Leaders

_Data: 2026-03-25_

## Visão geral

Este documento avalia, do ponto de vista de **raid call** e **progressão Mythic**, o que no WoWtron já gera valor real, o que ainda não gera, e o que falta para virar uma ferramenta realmente indispensável para RL/Officers.

---

## O que já é realmente útil

### 1) Pipeline de ingestão e análise por fight
- A rota `/api/wcl` já processa report e fight com dados reais do Warcraft Logs.
- Para revisão pós-pull, isso é o núcleo que mais importa.

**Valor para RL:** reduz tempo entre pull e feedback acionável.

### 2) Cache de report/fight
- O cache em disco evita reprocessar a mesma luta repetidamente.

**Valor para RL:** velocidade de leitura de tentativa durante sessão de review.

### 3) Estrutura de análise por jogador e por evento
- O backend já entrega estatísticas por player (DPS/HPS/DTPS, mortes, interrupções, dispels, timeline).
- Já existe base para scorecards, death analysis e defensive analysis.

**Valor para RL:** permite identificar padrão de erro por jogador em vez de "achismo".

### 4) Interface de seleção de pull e análise rápida
- O fluxo de carregar report -> selecionar pull -> visualizar análise está direto.

**Valor para RL:** bom para debrief rápido em Discord.

---

## O que hoje NÃO é tão útil (ou pode induzir decisão ruim)

### 1) Recomendações ainda pouco orientadas a decisão
- A análise ainda depende bastante de métricas gerais.
- Falta priorização explícita de impacto no kill ("se corrigir X, ganha Y% chance").

**Risco:** muita informação, pouca clareza de prioridade.

### 2) Ausência de contexto por fase/mecânica chave
- Métricas agregadas de fight inteira podem esconder gargalo real de uma fase específica.

**Risco:** raid melhorar "média" e continuar wipeando no mesmo ponto.

### 3) Sem baseline comparativa clara por pull
- Falta comparação objetiva Pull N vs Best Pull (por fase e por role).

**Risco:** evolução real da guild fica difícil de medir.

### 4) Pouca operacionalização para raid call
- Não há checklist final de call com frases acionáveis para o próximo try.

**Risco:** RL precisa traduzir tudo manualmente antes de explicar para a raid.

---

## O que falta para ser REALMENTE útil em progressão

## Prioridade P0 (obrigatório)

### A) "Top 3 ações do próximo pull" (automático)
Saída direta no formato:
1. "Healers: antecipar CD em 03:42 (+2s)"
2. "Melee: evitar [ability] na Fase 2 (4 mortes)"
3. "Raid: guardar burst para janela de add em 05:10"

**Por quê:** RL precisa de decisão, não só dashboard.

### B) Timeline por fase com causalidade
- Detectar "primeira morte relevante" e cadeia subsequente.
- Marcar se wipe foi por execução mecânica, throughput, ou CD gap.

**Por quê:** responde "por que wipeamos?" com causa raiz.

### C) Pull-to-pull delta
- Mostrar evolução entre últimos 5 pulls: mortes por mecânica, uptime de buff, uso de defensivos, tempo até wipe.

**Por quê:** transforma review em processo contínuo de melhoria.

## Prioridade P1 (alto impacto)

### D) Score por role e por mecânica crítica
- Tanque: swaps/mitigação em janelas perigosas.
- Healer: cobertura de CD em picos previsíveis.
- DPS: alvo prioritário e execução de mecânica sem perda de uptime.

### E) Detecção de "erro repetido"
- "Jogador X morreu 3 vezes seguidas na mesma mecânica em pulls consecutivos".

### F) Export de briefing para Discord
- Gerar texto pronto: "Resumo de 5 linhas + Top 3 correções + responsáveis".

## Prioridade P2 (escala de guild)

### G) Histórico longitudinal por boss
- Curva de progressão por semana, por composição e por roster.

### H) Alertas de regressão
- "Últimos 3 pulls pioraram Fase 2 em comparação ao best." 

### I) Benchmark externo contextualizado
- Comparar com percentis/squads similares de ilvl e comp.

---

## KPI de produto recomendados

1. **Tempo até insight útil** (TTI) após upload de pull.
2. **% de pulls com recomendação acionável válida**.
3. **Taxa de correção no pull seguinte** (se problema apontado melhorou).
4. **Redução de mortes evitáveis por 10 pulls**.
5. **Tempo médio até first kill por boss**.

---

## Recomendação prática de roadmap (4 semanas)

### Semana 1
- Top 3 ações automáticas.
- Delta dos últimos 5 pulls.

### Semana 2
- Causalidade de wipe por fase.
- Checklist de raid call exportável.

### Semana 3
- Score por role/mecânica.
- Erro repetido por jogador.

### Semana 4
- Benchmark e regressão.
- Polimento de UX para review em grupo.

---

## Conclusão

O WoWtron **já tem base técnica boa** para análise de logs, mas para virar ferramenta "must-have" de RL ele precisa migrar de **visualização de dados** para **suporte à decisão**: causa raiz por fase, prioridade objetiva e plano de ação do próximo pull.

---

## Melhorias e adições recomendadas (próxima iteração)

### 1) Plano de CD automático por fase (Raid Cooldown Planner)
- Gerar grade por timestamp com recomendação de CD defensivo/ofensivo por role.
- Exemplo: `02:14 Aura Mastery`, `03:42 Rallying Cry + Barrier`.

**Impacto:** reduz wipes por sobreposição/ausência de CD.

### 2) Detection de assignment break (falha de responsabilidade)
- Detectar quando mecânica atribuída para jogador/grupo não foi executada.
- Ex.: soak não realizado, interrupção atribuída que não aconteceu, target swap tardio.

**Impacto:** acelera accountability sem blame genérico.

### 3) \"What changed from best pull\" (diferença contextual)
- Mostrar apenas mudanças relevantes do pull atual para o best pull:
  - mortes novas,
  - CD faltando,
  - players com queda de uptime.

**Impacto:** revisão objetiva em 2 minutos.

### 4) Modelo de \"Kill Probability\"
- Score de 0-100 com base em:
  - HP no wipe,
  - mortes por fase,
  - cobertura de CD,
  - execução mecânica repetida.

**Impacto:** priorização clara para continuidade de progressão.

### 5) Coach por role (micro-recomendação)
- Tank coach: swaps, mitigações, posicionamento.
- Healer coach: janelas de burst healing, overheal crítico, uso de externos.
- DPS coach: uptime alvo prioritário, interrupções, execução sem perda de rotação.

**Impacto:** melhora individual sem depender de análise manual longa.

### 6) Integração nativa com Discord (briefing automático)
- Comando `/wowtron-brief` para postar:
  - resumo do pull,
  - top 3 ações,
  - responsáveis,
  - call para próximo try.

**Impacto:** comunicação rápida e padronizada pós-wipe.

### 7) Modo \"Raid Night Live\" (quase tempo real)
- Processar pull encerrado e devolver briefing em até 10-20s.
- Foco em resposta operacional durante progress, não só pós-raid.

**Impacto:** curva de aprendizado dentro da própria raid night.
