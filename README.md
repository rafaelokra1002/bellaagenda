# BellaAgenda

Sistema de agendamento online para profissionais da beleza (extensão de cílios, design de sobrancelhas e outros serviços). Cada profissional tem uma página pública própria (`/agendar/[slug]`) onde as clientes agendam pelo celular sem criar conta, e um painel protegido para gerenciar agenda, serviços, clientes e horários.

A base é multi-profissional (SaaS): serviços, clientes, agenda, configurações e faturamento são isolados por profissional.

## Stack

| Camada | Tecnologia |
| --- | --- |
| App | Next.js 15 (App Router), React 19, TypeScript (strict) |
| UI | Tailwind CSS 4, Radix Dialog, Lucide, Sonner (toasts) |
| Formulários | React Hook Form + Zod (os mesmos schemas validam no servidor) |
| Dados | PostgreSQL 16 + Prisma 6 |
| Testes | Vitest (unitários + integração com PostgreSQL real) |

## Requisitos

- Node.js **20.11+** (testado com 24.x) e npm 10+
- PostgreSQL **14+** com a extensão `btree_gist` disponível (vem com o PostgreSQL padrão e com Neon, Supabase, RDS, Railway, Render)
- Docker (opcional, para subir o banco local)

## Instalação local

```bash
npm install
cp .env.example .env          # ajuste se necessário
npm run db:up                 # PostgreSQL local via Docker (porta 5433)
npm run db:deploy             # aplica as migrations
npm run db:seed               # dados FICTÍCIOS de demonstração (opcional)
npm run dev                   # http://localhost:3000
```

O seed imprime o e-mail e a senha da conta demo. Para fixar a senha, rode com `DEMO_ADMIN_PASSWORD="sua-senha" npm run db:seed`.

- Página pública demo: http://localhost:3000/agendar/studio-demo
- Painel: http://localhost:3000/login

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão PostgreSQL. Em produção, inclua `sslmode=require` se o provedor exigir. |
| `TEST_DATABASE_URL` | só para testes | Banco **separado** para os testes de integração. O nome precisa conter `test`. |
| `APP_URL` | sim | URL pública, sem barra final. |
| `SESSION_TTL_DAYS` | não | Duração da sessão do painel (padrão 7). |
| `DEFAULT_TIMEZONE` | não | Fuso padrão de novas contas (padrão `America/Bahia`). |

Nenhuma senha ou chave fica no código. As variáveis `WHATSAPP_*` do `.env.example` são reservadas para a integração futura e **não são usadas** hoje.

## PostgreSQL e migrations

- Desenvolvimento: `npm run db:migrate` cria e aplica novas migrations a partir de `prisma/schema.prisma`.
- Produção/CI: `npm run db:deploy` aplica somente as migrations existentes, sem apagar dados.

A migration inicial cria, além das tabelas, uma **restrição de exclusão** (`Appointment_no_overlap`, via `btree_gist`) que impede no próprio banco que dois atendimentos não cancelados da mesma profissional ocupem intervalos sobrepostos.

## Conta administrativa (produção)

Crie a conta de cada profissional com o comando abaixo. Ele é seguro para produção: pede a senha no terminal ou lê de `ADMIN_PASSWORD`, e nunca grava credenciais no código.

```bash
npm run admin:create -- --email maria@exemplo.com --name "Maria Silva" --slug maria-silva --whatsapp "(71) 99999-8888"
```

Rodar de novo com o mesmo e-mail **redefine a senha** e encerra as sessões abertas. Depois, a profissional completa o perfil, os serviços e os horários pelo painel.

## Dados de demonstração

`npm run db:seed` cria a profissional "Bella Studio (Demonstração)" com 5 serviços de exemplo, expediente seg–sex 08–12/14–18 e sáb 08–13, 4 clientes e agendamentos fictícios (marcados com `isDemo`). Os preços são **apenas exemplos**.

O seed recusa rodar com `NODE_ENV=production` ou contra um banco que não seja local. Para um banco de homologação, use `ALLOW_DEMO_SEED=true` de forma consciente. Ele nunca roda automaticamente.

## Testes

```bash
npm test                  # tudo (unitários + integração)
npm run test:unit         # só regras puras, sem banco
npm run test:integration  # exige TEST_DATABASE_URL e o PostgreSQL rodando
npm run typecheck
```

Os testes de integração aplicam as migrations no banco de testes (`prisma migrate deploy`) e limpam as tabelas entre os casos. Cobrem: cálculo de disponibilidade, expediente, bloqueios, 10 reservas simultâneas no mesmo horário (só uma vence), sobreposição com durações diferentes, a restrição do banco, cancelamento liberando horário, remarcação, transições de status, isolamento entre profissionais, autorização das rotas, CSRF, validação, honeypot e limite de requisições.

## Regras de agenda

- O horário ocupado é `[início, início + duração + intervalo adicional)`. Dois atendimentos conflitam quando `novoInicio < fimExistente` e `novoFim > inicioExistente`; intervalos que apenas se encostam não conflitam.
- Os horários oferecidos começam no início de cada período de expediente e avançam pelo "intervalo entre opções" (ex.: 30 min). O intervalo ocupado inteiro precisa caber no período.
- Ocupam a agenda: atendimentos **Pendente, Confirmado, Concluído e Não compareceu**, além dos **bloqueios** (folgas, férias). **Cancelado** libera o horário imediatamente.
- Para a cliente valem a antecedência mínima e o limite de dias futuros. Na remarcação pelo painel essas duas regras não se aplicam, mas o passado nunca é permitido.
- Concorrência: cada reserva roda em uma transação com lock consultivo por profissional (`pg_advisory_xact_lock`), recalcula a disponibilidade no servidor e ainda conta com a restrição `EXCLUDE` do banco.
- Alterar o expediente ou criar um bloqueio **não cancela** atendimentos existentes; o painel lista os que ficaram em conflito.
- O fuso é o da profissional (padrão `America/Bahia`), e tudo é exibido em formato brasileiro.

## Segurança e LGPD

- Senhas com bcrypt (custo 12). Sessões em cookie `httpOnly`/`SameSite=Lax` (`Secure` em produção), guardadas no banco apenas como hash SHA-256 do token.
- A identidade da profissional sempre vem da sessão no servidor; `professionalId` enviado pelo navegador é ignorado. Todas as consultas do painel filtram por profissional.
- As rotas de escrita do painel verificam o cabeçalho `Origin` (CSRF).
- Limites de requisição guardados no PostgreSQL (funcionam com várias instâncias): login, consulta de horários, agendamentos por IP e por WhatsApp. Também há um máximo de 3 agendamentos futuros em aberto por WhatsApp e um honeypot anti-robô.
- O login responde com a mesma mensagem e o mesmo custo de processamento para e-mail inexistente e senha errada (proteção contra enumeração de contas).
- Erros internos nunca chegam ao navegador; a resposta usa um formato padronizado `{ error: { code, message } }`.
- A cliente informa só nome e WhatsApp, com consentimento registrado. O link de confirmação usa um token aleatório e mostra apenas o primeiro nome. No painel, "Remover dados" anonimiza a cliente a pedido dela e preserva o histórico financeiro sem identificação.

## WhatsApp

**Hoje:** usamos links oficiais `wa.me` com mensagem pronta.
- Página de confirmação: botão "Confirmar pelo WhatsApp" abre a conversa com o número da profissional, com serviço, data, horário e nome da profissional.
- Painel: abrir conversa com a cliente, copiar e compartilhar os dados do atendimento.
- O número da profissional é configurado em **Painel → Configurações**.

Abrir o link **não** envia a mensagem: a pessoa ainda precisa tocar em enviar. O sistema não registra nem simula envio.

**Futuro (WhatsApp Business Platform):** o ponto de extensão é `src/server/notifications/index.ts`, hoje com o canal `disabled`. Para lembretes automáticos serão necessários uma conta Meta Business verificada, um número na Cloud API (`WHATSAPP_PHONE_NUMBER_ID`), um token permanente (`WHATSAPP_CLOUD_API_TOKEN`), modelos de mensagem aprovados, um webhook com `WHATSAPP_WEBHOOK_VERIFY_TOKEN` para status de entrega e um job agendado para os lembretes.

## Deploy

Qualquer hospedagem Node.js serve (Vercel, Railway, Render, Coolify/Docker, VPS). O `next.config.ts` gera um build `standalone`.

1. Crie um PostgreSQL gerenciado e configure `DATABASE_URL`, `APP_URL` e `NODE_ENV=production`.
2. Build: `npm ci && npm run build` (o script já roda `prisma generate`).
3. Antes de iniciar cada versão: `npm run db:deploy`.
4. Inicie com `npm start` (ou `node .next/standalone/server.js`, copiando `.next/static` e `public` se existirem).
5. Crie as contas com `npm run admin:create` (**não** rode o seed em produção).
6. Se houver proxy reverso, ele deve repassar `X-Forwarded-For` e `X-Forwarded-Host`: o limite por IP e a checagem de origem dependem deles.

### Domínio

Aponte o domínio para a hospedagem (registro `A`/`CNAME`, conforme o provedor), ative HTTPS e atualize `APP_URL`. A página de cada profissional fica em `https://seu-dominio/agendar/<slug>`, e é esse link que vai na bio do Instagram e no WhatsApp.

## Estrutura

```
prisma/              schema, migrations (com a restrição EXCLUDE) e seed
scripts/             create-admin e guarda contra produção
src/app/             páginas (público, login, painel) e API (Route Handlers)
src/components/      ui/ (design system), booking/ (página pública), panel/ (painel)
src/lib/             utilitários puros: fuso, dinheiro, telefone, WhatsApp, status, erros
src/server/          regras de negócio: availability/engine.ts (puro, testável), appointments,
                     catalog, customers, schedule, calendar, dashboard, professional, auth, http
src/validation/      schemas Zod compartilhados entre cliente e servidor
tests/               unit/ e integration/
```

## Limitações conhecidas (v1)

- Não há envio automático de WhatsApp, lembretes nem e-mail; o contato é feito por links `wa.me`.
- Fotos e imagens são informadas por URL https; ainda não existe upload de arquivos.
- A cliente não cancela nem remarca sozinha; ela fala com a profissional, que altera pelo painel.
- Um agendamento cancelado não pode ser reativado (crie um novo).
- Não existe criação manual de agendamento pelo painel; a profissional usa a própria página pública.
- Cada conta tem uma única profissional (sem equipe ou vários atendentes) e não há cadastro self-service: as contas são criadas por `admin:create`.
- Não há cobrança de assinatura. A separação por `professionalId` já permite adicionar planos e limites depois.
- Não há recuperação de senha por e-mail; use `admin:create` com o mesmo e-mail para redefinir.
- Não há testes end-to-end automatizados de navegador (o fluxo completo foi validado manualmente e pelas rotas nos testes de integração).
