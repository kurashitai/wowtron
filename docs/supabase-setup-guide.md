# Guia rápido — Configurar Supabase grátis para WoWtron

## Onde você está agora
Você já está no dashboard do projeto Supabase (ótimo). Próximos passos:

## 1) Criar a tabela de snapshots

1. No menu lateral, clique em **SQL Editor**.
2. Clique em **New query**.
3. Cole e rode:

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

## 2) Pegar as credenciais do projeto

1. Vá em **Project Settings** (ícone de engrenagem).
2. Aba **API**.
3. Copie:
   - **Project URL** (SUPABASE_URL)
   - **Secret key** (SUPABASE_SECRET_KEY) **ou** service_role key (legacy)

> Importante: use Secret/service_role apenas no backend (server-side).
>
> No novo painel da Supabase, você pode ver:
> - `Publishable key` (client/public)
> - `Secret key` (server)
> Para o WoWtron backend, use **Secret key**.

## 3) Configurar no WoWtron

No `.env.local` (ou variáveis do deploy):

```bash
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=seu_secret_key
SUPABASE_PLAYER_SNAPSHOTS_TABLE=player_profile_snapshots
```

## 4) Teste manual rápido

1. Rode o app.
2. Abra um perfil de player.
3. Clique em **Sync Public Data**.
4. Verifique:
   - endpoint: `GET /api/player/{region}/{realm}/{name}/sync-status`
   - endpoint: `GET /api/player/{region}/{realm}/{name}/history`
5. No Supabase, abra **Table Editor** e veja linhas novas em `player_profile_snapshots`.

## 5) Troubleshooting

### Projeto aparece "Unhealthy"
- Aguarde alguns minutos após criação do projeto.
- Verifique em **Database** se a instância está ativa.

### 401/403 no insert
- Confirme que usou **service_role key** (não anon key).
- Confirme `SUPABASE_URL` sem barra extra no final.

### Nada é salvo
- Cheque logs da API do app.
- Confirme que as variáveis estão carregadas no ambiente de execução.

## O que você precisa me fornecer para eu continuar

1. `SUPABASE_URL` (pode mascarar parte).
2. Confirmação de que a tabela foi criada.
3. Se quiser, o nome customizado da tabela (senão usamos `player_profile_snapshots`).
4. (Opcional) print/erro caso algum passo falhe.
