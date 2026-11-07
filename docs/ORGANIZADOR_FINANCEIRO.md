# Organizador e módulo financeiro

## Visão geral

Foi adicionado o perfil **Organizador** ao GiroAm / Altogiro Pedal Challenge, com painel próprio (`/organizador`), isolamento por `organizer_id` e cobranças reais via **Asaas** (gateway único escolhido: PIX dinâmico, checkout, webhooks e consulta de cobranças).

Não há simulação de PIX. Sem `ASAAS_API_KEY`, eventos pagos e lotes são bloqueados.

## Papéis

| Papel | Acesso |
|-------|--------|
| `super_admin` / `admin` | Plataforma + aprovação de organizadores/eventos + auditoria |
| `organizer` | Painel `/organizador` (somente seus eventos) |
| `captain` / `participant` | Fluxos anteriores; podem solicitar perfil organizador |

## Fluxo do organizador

1. Usuário solicita perfil em `/organizador`.
2. Admin aprova em `/admin/organizadores`.
3. Organizador cria temporadas, eventos, etapas, categorias e lotes.
4. Eventos novos entram em `approval_status = pending_review`.
5. Admin aprova o evento; organizador abre `status = registration_open`.
6. Ciclista se inscreve em `/torneios/[id]`.
7. Se pago: Asaas gera cobrança + QR PIX / link; webhook confirma; inscrição vira `approved`.

## Gateway Asaas

Variáveis:

- `ASAAS_API_KEY`
- `ASAAS_API_URL` (sandbox ou produção)
- `ASAAS_WEBHOOK_TOKEN`
- Webhook: `{APP_URL}/api/webhooks/asaas`

Arquivos:

- `src/lib/payments/asaas.ts` — cliente HTTP
- `src/lib/payments/service.ts` — cobrança, idempotência, confirmação
- `src/app/api/webhooks/asaas/route.ts` — webhook

Split/comissão da plataforma: campo `platform_fee_percent` e setting `platform_fee_percent` preparados; **não ativar split no Asaas sem validação**.

## Migração

```bash
npm run db:migrate
```

Migration: `drizzle/0003_organizer_payments.sql`.

## Segurança

- Confirmação de pagamento só via webhook/API Asaas.
- Token de webhook validado quando configurado.
- Idempotência por `idempotency_key` e `gateway_event_id`.
- Credenciais só no backend.
- Dados financeiros filtrados por `organizer_id`.
