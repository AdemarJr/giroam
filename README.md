# GiroAm · Pedal Challenge

Plataforma de campeonatos de ciclismo e triathlon da Amazônia.

**Infra:** Next.js (App Router) + Postgres no **EasyPanel** (ex.: `crm-app` / `pyroudb`, database `giroam`).

## Módulo CAMPEONATOS

Temporadas → Torneios → Etapas → Inscrições → Equipes → Chegada manual → Homologação → Rankings individuais/coletivos → Premiação → Relatórios.

## Setup local

1. Crie o database no Postgres do EasyPanel:

```sql
CREATE DATABASE giroam;
```

2. Configure o ambiente:

```bash
cp .env.example .env
# DATABASE_URL apontando para o Postgres (dev: host externo; prod: host interno do compose)
```

3. Instale, migre e rode o seed:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Admin padrão do seed: `admin@giroam.app` / `GiroAm@Admin123` (altere via `.env`).

## EasyPanel

Sugestão de serviços:

| Serviço | Tipo | Notas |
|---------|------|--------|
| `giroam` | App (Dockerfile) | `DATABASE_URL=postgresql://USER:PASS@crm-app_pyroudb:5432/giroam` |
| Postgres | `pyroudb` (existente) | Database `giroam` — não misturar com outros apps |

Variáveis obrigatórias no app:

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`

Após o primeiro deploy:

```bash
npm run db:migrate
npm run db:seed
```

## Fluxo de homologação

1. Admin registra a ordem de chegada (`/admin/chegada`)
2. Sistema calcula pontuação preliminar
3. Admin homologa (`/admin/homologacao`)
4. Pontos entram no ledger definitivo (sem duplicar)
5. Rankings atualizam
6. Correções pós-homologação exigem justificativa + auditoria

## Identidade

- Verde Amazônia (`#2ECC71` / `#1B7A4E`)
- Fundo escuro (`#0B1210`)
- Dourado / prata / bronze para pódios
