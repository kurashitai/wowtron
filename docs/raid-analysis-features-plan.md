# 📊 Plano de Funcionalidades de Análise de Raid - WoWtron

## Visão Geral

Este documento descreve funcionalidades de análise de raid que **complementam o Warcraft Logs** e oferecem insights **impossíveis de obter com addons in-game**. O foco é fornecer valor real para raid leaders de guildas pequenas/médias.

---

## 🔴 PRIORIDADE ALTA - Análise de Wipe

### 1. Análise de Cadeia de Mortes (Death Cascade Analysis)

**Problema que resolve:** Raid leaders frequentemente não percebem que uma morte early causou uma reação em cadeia.

**O que faz:**
- Identifica a "primeira morte crítica" que iniciou o wipe
- Rastreia o impacto em cadeia: "Tank morreu → Healer teve que movimentar → Segundo healer morreu → Raid sem healing → Wipe"
- Calcula o "tempo até o wipe inevitável" após a primeira morte crítica

**Dados necessários do WCL:**
```graphql
query {
  reportData {
    report(code: $code) {
      events(fightIDs: [$fightId], dataType: Deaths) { data }
      events(fightIDs: [$fightId], dataType: Healing) { data }
    }
  }
}
```

**UI/UX:**
- Timeline visual mostrando a cadeia de mortes
- Destaque da "morte raiz" em vermelho
- Linhas conectando mortes relacionadas
- "Tempo de recuperação perdido" em segundos

**Dificuldade:** Média
**Valor:** Muito Alto

---

### 2. Análise de Janela de Cooldowns (Cooldown Window Analysis)

**Problema que resolve:** Raid CDs foram usados no momento certo? Foram desperdiçados?

**O que faz:**
- Mapeia TODOS os raid cooldowns usados (Tranq, HTT, Barrier, etc.)
- Cruza com momentos de alto dano raid-wide
- Identifica cooldowns desperdiçados (usados quando dano era baixo)
- Identifica gaps mortais (momentos sem CD quando dano era alto)

**Dados necessários do WCL:**
```graphql
query {
  reportData {
    report(code: $code) {
      events(fightIDs: [$fightId], dataType: Casts, abilityID: [raid_cd_ids]) { data }
      graph(fightIDs: [$fightId], dataType: DamageTaken)  # Para identificar picos de dano
    }
  }
}
```

**IDs de abilities importantes:**
- Tranquility: 740
- Healing Tide Totem: 108280
- Spirit Link Totem: 98008
- Divine Hymn: 64843
- Revival: 115310
- Ancestral Guidance: 108281
- Aura Mastery: 31821
- Darkness: 209426
- Power Word: Barrier: 62618

**UI/UX:**
- Gráfico de barras: dano taken vs cooldowns ativos
- Timeline com ícones dos CDs usados
- "Score de alinhamento" (0-100%)
- Lista de "CDs desperdiçados" com timestamp

**Dificuldade:** Média-Alta
**Valor:** Muito Alto

---

### 3. Análise de Mecânica "Fantasma" (Ghost Mechanic Analysis)

**Problema que resolve:** Players morrem por não fazer algo que DEVERIAM fazer (não interromperam, não soaram, não se moveram).

**O que faz:**
- Identifica mecânicas que exigem ação (interrupt, soak, stack, spread)
- Verifica se cada player designado executou a ação
- Conta "falhas silenciosas" - erros que não causaram morte imediata mas prejudicaram

**Exemplo concreto:**
```
Vorasius - Void Scream cast:
- Player A: Deveria interromper às 0:15, 0:40, 1:05
- Realmente interrompeu: 0:15 ✓, 0:42 (tarde), 1:05 ✓
- Falhas: 1 interrupção atrasada
```

**Dados necessários:**
- Boss data com mecânicas definidas (já temos em `boss-data-midnight.ts`)
- Eventos de cast do boss
- Eventos de interrupt
- Eventos de soak (damage taken de abilities específicas)

**UI/UX:**
- Tabela por mecânica: "Quem deveria | Quem fez | Status"
- Contador de falhas por player
- "Grade de execução de mecânica" por player

**Dificuldade:** Alta
**Valor:** Muito Alto

---

### 4. Análise de Tempo de Reação de Healing (Healer Reaction Time)

**Problema que resolve:** Healers estão reagindo rápido o suficiente ao dano?

**O que faz:**
- Meça tempo entre dano recebido e heal aplicado
- Identifica healers com reação lenta
- Detecta "janelas de perigo" - momentos com dano massivo e healing baixo

**Dados necessários:**
```graphql
query {
  reportData {
    report(code: $code) {
      events(fightIDs: [$fightId], dataType: Healing, startTime: $start, endTime: $end)
      events(fightIDs: [$fightId], dataType: DamageTaken)
    }
  }
}
```

**UI/UX:**
- Média de tempo de reação por healer (ms)
- Gráfico: Dano recebido vs Healing feito ao longo do tempo
- "Pior janela" - momento onde healing foi mais lento

**Dificuldade:** Média
**Valor:** Alto

---

### 5. Análise de DPS "Ramp-up" (DPS Ramp-up Analysis)

**Problema que resolve:** Specs com ramp-up (Affliction, Feral, etc.) estão tendo tempo para buildar?

**O que faz:**
- Identifica specs que precisam de tempo para "ramp"
- Meça tempo até cada player atingir DPS máximo
- Compara com pulls anteriores
- Sugere ajustes de positioning/timing para specs com ramp

**Dados necessários:**
- Graph data de DPS por segundo (já temos)
- Spec de cada player (já temos)
- Template de ramp-up por spec

**UI/UX:**
- Gráfico de linha: DPS de cada player ao longo do tempo
- Tempo médio até "peak DPS"
- Comparação entre pulls

**Dificuldade:** Fácil-Média
**Valor:** Médio-Alto

---

## 🟢 PRIORIDADE ALTA - Análise de Kill

### 6. Comparação de Pulls (Pull Comparison Engine)

**Problema que resolve:** O que mudamos entre o wipe de 5% e o kill?

**O que faz:**
- Compara dois pulls lado a lado
- Identifica diferenças específicas:
  - Morte de player X vs Player X sobreviveu
  - CD usado no tempo Y vs CD usado no tempo Z
  - DPS em cada fase
  - Mecânicas executadas corretamente

**Dados necessários:**
- Todos os dados de dois fights diferentes
- Sistema de diff

**UI/UX:**
- "Diff viewer" estilo git
- Timeline lado a lado
- Lista de "O que mudou" em bullet points

**Dificuldade:** Média
**Valor:** Muito Alto

---

### 7. Análise de Eficiência de Burst (Burst Window Efficiency)

**Problema que resolve:** Players estão usando CDs durante Bloodlust?

**O que faz:**
- Identifica janelas de burst (Bloodlust, execute phase, add spawn)
- Verifica se cada DPS usou CDs principais durante essas janelas
- Calcula "DPS desperdiçado" por má alocação de CDs

**Dados necessários:**
```graphql
query {
  reportData {
    report(code: $code) {
      events(fightIDs: [$fightId], dataType: Buffs, abilityID: [2825, 32182, 80353])  # Bloodlust IDs
      events(fightIDs: [$fightId], dataType: Casts)  # Para CDs ofensivos
    }
  }
}
```

**UI/UX:**
- Gráfico: Bloodlust window destacada
- Lista de players que NÃO usaram CDs durante lust
- "Eficiência de burst" score por player

**Dificuldade:** Média
**Valor:** Alto

---

### 8. Análise de Uso de Potion (Potion Usage Analysis)

**Problema que resolve:** O problema atual só diz "usou potion ou não". Precisamos saber QUANDO.

**O que faz:**
- Detecta uso de potions e TEMPO de uso
- Verifica se foi usado no momento ótimo (start + lust, ou execute)
- Identifica uso "perdido" (potion usada segundos antes de morrer)
- Conta potions não usadas (deveria ter usado 2, usou 1)

**IDs de Potions:**
- Potion of Unbridled Fury: 169299
- Potion of Phantom Fire: 171349
- Potion of Deathly Fixation: 171352
- etc.

**UI/UX:**
- Timeline com ícones de potion
- "Timing score" por player
- Lista de potions desperdiçadas

**Dificuldade:** Fácil
**Valor:** Médio-Alto

---

### 9. Análise de Dano Evitável por Fase (Avoidable Damage by Phase)

**Problema que resolve:** Em que fase a raid está tomando mais dano evitável?

**O que faz:**
- Divide o fight em fases (baseado no boss data)
- Calcula dano evitável por fase
- Identifica players que consistentemente tomam dano evitável
- Sugere focus de atenção para cada fase

**Dados necessários:**
- Boss phase data (já temos)
- Damage taken events filtrados por ability type

**UI/UX:**
- Gráfico de barras: Dano evitável por fase
- Heatmap de players x fases
- "Pior fase" destacada

**Dificuldade:** Média
**Valor:** Alto

---

## 📈 PRIORIDADE MÉDIA - Progression Tracking

### 10. Previsão de Progresso (Progress Prediction)

**Problema que resolve:** Quantos pulls até o kill?

**O que faz:**
- Analisa tendência de HP do boss ao longo dos pulls
- Calcula taxa de melhoria
- Prevê número de pulls até o kill
- Identifica "plateaus" - momentos sem melhoria

**UI/UX:**
- Gráfico de linha: HP do boss por pull
- Linha de tendência
- Previsão: "Kill previsto em ~X pulls"

**Dificuldade:** Fácil
**Valor:** Médio (engajamento)

---

### 11. Análise de Consistência (Consistency Analysis)

**Problema que resolve:** Quem é o player mais inconsistente?

**O que faz:**
- Rastreia performance de cada player ao longo de múltiplos pulls
- Calcula desvio padrão de DPS/HPS
- Identifica players com alta variância
- Detecta "chokers" - players que performam bem em pulls fáceis mas mal em progress

**UI/UX:**
- Box plot de DPS por player (mostra variância)
- "Consistency score" por player
- Lista de players mais consistentes

**Dificuldade:** Média
**Valor:** Médio-Alto

---

### 12. Análise de "Best Pull" (Best Pull Analysis)

**Problema que resolve:** Qual foi nosso melhor pull e por quê?

**O que faz:**
- Identifica o melhor pull (não necessariamente o mais longo)
- Analisa o que fez desse pull especial
- Compara com outros pulls para identificar o "segredo"

**Critérios para "melhor":**
- Boss HP mais baixo
- Menos mortes evitáveis
- Melhor alinhamento de CDs
- Maior raid DPS

**UI/UX:**
- Destaque do "Best Pull" na lista
- "Por que foi o melhor" em bullet points
- Comparação rápida com outros pulls

**Dificuldade:** Fácil-Média
**Valor:** Médio

---

## 🟡 PRIORIDADE BAIXA - Nice to Have

### 13. Análise de Posicionamento (Positioning Analysis)

**Problema que resolve:** Players estão posicionados corretamente?

**O que faz:**
- Usa eventos de dano para inferir posicionamento
- Identifica players frequentemente longe do grupo
- Detecta "stacking issues" - players que deveriam estar juntos mas não estão

**Limitações:** WCL não fornece coordenadas exatas, apenas inferência

**Dificuldade:** Alta
**Valor:** Médio

---

### 14. Análise de Target Swapping (Target Swap Analysis)

**Problema que resolve:** DPS estão trocando de target quando deveriam?

**O que faz:**
- Rastreia danos por target
- Identifica DPS que permaneceram no boss durante add phase
- Calcula "tempo perdido" em swaps lentos

**Dificuldade:** Alta
**Valor:** Médio-Alto

---

### 15. Análise de GCD Uptime (GCD Efficiency)

**Problema que resolve:** Players estão aproveitando cada GCD?

**O que faz:**
- Calcula gaps entre casts
- Identifica "downtime" não explicado por mechanics
- Compara com benchmarks da spec

**Dificuldade:** Alta
**Valor:** Médio

---

## 🛠️ Implementação Técnica

### Queries WCL Necessárias (Consolidadas)

```graphql
# Query principal para análise completa
query FullFightAnalysis($code: String!, $fightId: Int!) {
  reportData {
    report(code: $code) {
      # Informações básicas
      fights(fightIDs: [$fightId]) {
        id, name, difficulty, kill, startTime, endTime, bossPercentage
      }
      
      # Players
      playerDetails(fightIDs: [$fightId])
      
      # Dano
      table(fightIDs: [$fightId], dataType: DamageDone) { data }
      graph(fightIDs: [$fightId], dataType: DamageDone)
      
      # Healing
      table(fightIDs: [$fightId], dataType: Healing) { data }
      graph(fightIDs: [$fightId], dataType: Healing)
      
      # Dano tomado
      table(fightIDs: [$fightId], dataType: DamageTaken) { data }
      graph(fightIDs: [$fightId], dataType: DamageTaken)
      
      # Mortes
      events(fightIDs: [$fightId], dataType: Deaths, limit: 100) { data }
      
      # Buffs (flasks, food, potions, bloodlust)
      events(fightIDs: [$fightId], dataType: Buffs, limit: 1000) { data }
      
      # Casts (cooldowns, interrupts)
      events(fightIDs: [$fightId], dataType: Casts, limit: 5000) { data }
      
      # Summons (para battle res)
      events(fightIDs: [$fightId], dataType: Summons, limit: 100) { data }
      
      # Interrupts
      events(fightIDs: [$fightId], dataType: Interrupts, limit: 500) { data }
      
      # Dispels
      events(fightIDs: [$fightId], dataType: Dispels, limit: 500) { data }
      
      # Rankings
      rankings(fightIDs: [$fightId], playerMetric: dps)
    }
  }
}
```

### Estrutura de Arquivos Sugerida

```
src/lib/analysis/
├── wipe-analysis.ts       # Funcionalidades 1-5
├── kill-analysis.ts       # Funcionalidades 6-9
├── progress-tracking.ts   # Funcionalidades 10-12
├── advanced-analysis.ts   # Funcionalidades 13-15
├── utils/
│   ├── timeline.ts        # Helpers de timeline
│   ├── phases.ts          # Detecção de fases
│   ├── cooldowns.ts       # IDs e lógica de CDs
│   └── mechanics.ts       # Detecção de mecânicas
└── types.ts               # Tipos compartilhados
```

---

## 📊 Priorização Final

| Rank | Funcionalidade | Dificuldade | Valor | ROI |
|------|----------------|-------------|-------|-----|
| 1 | Cadeia de Mortes | Média | Muito Alto | ⭐⭐⭐⭐⭐ |
| 2 | Janela de Cooldowns | Média-Alta | Muito Alto | ⭐⭐⭐⭐⭐ |
| 3 | Comparação de Pulls | Média | Muito Alto | ⭐⭐⭐⭐⭐ |
| 4 | Mecânica Fantasma | Alta | Muito Alto | ⭐⭐⭐⭐ |
| 5 | Burst Window Efficiency | Média | Alto | ⭐⭐⭐⭐ |
| 6 | Reação de Healing | Média | Alto | ⭐⭐⭐⭐ |
| 7 | Dano Evitável por Fase | Média | Alto | ⭐⭐⭐⭐ |
| 8 | Uso de Potion (Avançado) | Fácil | Médio-Alto | ⭐⭐⭐⭐ |
| 9 | DPS Ramp-up | Fácil-Média | Médio-Alto | ⭐⭐⭐ |
| 10 | Previsão de Progresso | Fácil | Médio | ⭐⭐⭐ |
| 11 | Consistência | Média | Médio-Alto | ⭐⭐⭐ |
| 12 | Best Pull | Fácil-Média | Médio | ⭐⭐⭐ |

---

## 🎯 Próximos Passos Recomendados

### Fase 1 - Fundação (1-2 semanas)
1. Implementar análise de Cadeia de Mortes
2. Implementar Comparação de Pulls básica
3. Melhorar análise de Potion (timing)

### Fase 2 - Insights de Wipe (2-3 semanas)
4. Implementar Janela de Cooldowns
5. Implementar Burst Window Efficiency
6. Implementar Reação de Healing básica

### Fase 3 - Progress Tracking (1-2 semanas)
7. Implementar Previsão de Progresso
8. Implementar Análise de Consistência
9. Dashboard de progressão

### Fase 4 - Avançado (ongoing)
10. Mecânica Fantasma (requer boss data robusto)
11. Dano Evitável por Fase
12. Features baseadas em feedback

---

## 💡 Diferenciação vs Warcraft Logs

O WoWtron NÃO deve competir com o WCL em:
- Rankings e percentiles
- Análise detalhada por ability
- Comparação com outros guilds
- Logs raw

O WoWtron DEVE oferecer:
- **Insights acionáveis** ("Faça X para melhorar")
- **Contexto de raid** (o que o raid leader precisa saber)
- **Comparação interna** (nosso pull atual vs nosso pull anterior)
- **Detecção de padrões** (quem sempre erra em P2?)
- **Predição** (vamos matar hoje?)

---

## 🎨 Exemplos de Output

### Exemplo: Análise de Cadeia de Mortes

```
💀 CADEIA DE MORTES IDENTIFICADA

Morte Raiz: TanqueDK morreu para Void Cleave (0:42)
├─ Impacto: Sem tank, boss virou para raid
├─ 0:45 - HealerPriest morreu para Void Blast (tentou salvar tank)
├─ 0:48 - HunterDPS morreu para Darkened Wake (sem healing)
└─ 0:52 - Raid wipe inevitável (sem healers)

🔴 Recomendação: Tank swap estava atrasado. Use externals no terceiro stack.
```

### Exemplo: Janela de Cooldowns

```
🛡️ ANÁLISE DE COOLDOWNS - Void Scream

Cooldowns Disponíveis:
✅ Tranquility (DruidResto) - Usado aos 0:35 ✓
❌ Healing Tide (ShamResto) - NÃO USADO (disponível)
✅ Divine Hymn (PriestHoly) - Usado aos 0:38 ✓

⚠️ GAP IDENTIFICADO: 0:20-0:25 (5s sem CD durante Void Scream)
   - Dano tomado: 2.1M
   - Healing disponível: 0
   - Recomendação: Salvar HTT para este momento

📊 Score de Alinhamento: 67/100
```

### Exemplo: Comparação de Pulls

```
📊 COMPARAÇÃO: Pull #47 vs Pull #48

✅ Melhorias:
• Raid DPS: +450K (+3.2%)
• Dano evitável: -180K (-24%)
• TanqueDK sobreviveu (morreu aos 0:42 no pull anterior)

❌ Regressões:
• HunterDPS morreu aos 1:02 (sobreviveu no pull anterior)
• Bloodlust usado 8s mais tarde

💡 Insight Principal: 
A troca de talentos do TanqueDK resolveu a morte em P1.
Foque em manter HunterDPS vivo em P2.
```

---

*Documento criado para planejamento do WoWtron - Análise de Raid*
*Última atualização: Março 2025*
