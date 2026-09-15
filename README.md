# Elo Mídia

**A comunicação da sua igreja, em equipe.**

Aplicativo para a equipe de comunicação de igrejas gerenciar a produção de conteúdo: o que precisa ser feito, quem é responsável, em qual etapa está, prazos e onde/quando será publicado.

Stack: Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui (Base UI) · Supabase (Postgres, Auth, Storage) · Zod · PWA.

---

## 1. Rodando localmente

### Pré-requisitos

- Node.js 20.9+ (recomendado 22+; a Vercel deve usar 22 — veja seção de deploy)
- Docker Desktop (para o Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (já incluído via `npx supabase`, não precisa instalar globalmente)

### Passo a passo

```bash
npm install

# Sobe Postgres, Auth e Storage localmente (Docker) e aplica as migrations
npx supabase start
```

O comando acima imprime `API URL`, `ANON_KEY` e `SERVICE_ROLE_KEY` locais. Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY impresso pelo supabase start>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY impresso pelo supabase start>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Crie a primeira igreja e seu administrador (veja detalhes na seção 3):

```bash
npm run bootstrap:church -- --nome "Minha Igreja" --slug minha-igreja \
  --admin-email voce@exemplo.com --admin-senha "SenhaForte123!"
```

Rode o app:

```bash
npm run dev
```

Acesse `http://localhost:3000`, entre com o e-mail/senha do administrador criado.

### Dados de demonstração (opcionais)

`npx supabase db reset` recria o banco e roda automaticamente `supabase/seed.sql`, que cria **duas igrejas** (uma delas só para evidenciar o isolamento entre igrejas) com conteúdos em todas as etapas do fluxo. Usuários de teste (senha `DemoSenha123!` para todos):

| E-mail | Igreja | Perfil |
| --- | --- | --- |
| `admin@demo.elomidia.app` | Igreja Modelo | Administrador |
| `coordenador@demo.elomidia.app` | Igreja Modelo | Coordenador |
| `colaborador@demo.elomidia.app` | Igreja Modelo | Colaborador |
| `admin2@demo.elomidia.app` | Segunda Igreja | Administrador |

**Esses dados nunca são carregados em produção** — o seed só roda via `supabase db reset`/`supabase start` local; deploys usam apenas os arquivos em `supabase/migrations`.

### Testes

```bash
npm test                 # testes unitários (regras de fluxo, fuso horário) — não dependem de banco
npm run test:integration # RLS, isolamento entre igrejas, convites, fluxo completo — requer `supabase start`
npm run build             # build de produção (também roda o type-check)
```

---

## 2. Configuração do Supabase

### Criando o projeto

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie a `Project URL` e a `anon public key` para `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Copie a `service_role key` para `SUPABASE_SERVICE_ROLE_KEY` — **nunca** exponha essa chave no cliente ou em variáveis `NEXT_PUBLIC_`.
3. Aplique as migrations no projeto remoto:

   ```bash
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```

4. Crie o bucket de anexos (já criado automaticamente pela migration `20250101000005_storage.sql` ao rodar `db push`).

### E-mails (recuperação de senha e convites)

O Supabase Auth já envia o e-mail de **recuperação de senha** nativamente, desde que:

- Em **Authentication → URL Configuration**, adicione `https://SEU_DOMINIO/auth/callback` (e `http://localhost:3000/auth/callback` para dev) às *Redirect URLs*.
- Configure um provedor de SMTP em **Project Settings → Auth → SMTP Settings** (o remetente padrão do Supabase tem limite baixo de envios e não é recomendado para produção).

Os **convites de equipe** não enviam e-mail automaticamente neste MVP: a tela de Equipe gera um link copiável (`/convite/<token>`) para o administrador enviar manualmente (WhatsApp, e-mail etc.). Isso está documentado na própria interface. Se quiser automatizar o envio, dá para acoplar uma [Supabase Edge Function](https://supabase.com/docs/guides/functions) disparada por um trigger na tabela `invites` — não implementado neste MVP por não ser exigido.

---

## 3. Criando a primeira igreja e o administrador

Não existe cadastro público de igrejas — é uma decisão deliberada do produto. A criação é feita por um script que usa a `service_role key` (por isso só roda localmente/em CI, nunca pelo navegador):

```bash
npm run bootstrap:church -- \
  --nome "Igreja Modelo" \
  --slug igreja-modelo \
  --fuso America/Sao_Paulo \
  --admin-email pastor@exemplo.com \
  --admin-nome "Nome do Administrador" \
  --admin-senha "UmaSenhaForte123!"
```

O script cria a igreja, cria o usuário já com e-mail confirmado e o vincula como `admin`. Recomenda-se pedir que o administrador troque a senha após o primeiro acesso (**Esqueci minha senha**, na tela de login). A partir daí, todo o restante da equipe entra **por convite**, enviado pelo próprio administrador em **Equipe e configurações**.

Nunca versione senhas reais nem rode esse script contra produção com credenciais de teste.

---

## 4. Deploy na Vercel

1. Suba o repositório para o GitHub/GitLab e importe o projeto na Vercel.
2. Em **Settings → Environment Variables**, configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (necessária só se você rodar o script de bootstrap a partir de um ambiente com acesso a essas variáveis; **não** é usada em nenhuma rota pública do app)
   - `NEXT_PUBLIC_SITE_URL` (a URL final do deploy, ex.: `https://elo-midia.vercel.app`)
3. Em **Settings → General → Node.js Version**, selecione **22.x** (o `@supabase/supabase-js` recomenda Node 22+; o app roda em Node 20.9+, mas 22 é o ambiente validado).
4. Rode `npx supabase db push` contra o projeto Supabase de produção **antes** do primeiro deploy (as migrations não rodam automaticamente no build da Vercel).
5. Depois do primeiro deploy, rode o script de bootstrap (seção 3) apontando `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` para o projeto de produção, a partir da sua máquina — nunca a partir de uma rota da aplicação.

Este projeto não faz deploy nem altera nenhum serviço externo automaticamente — o passo de publicar é sempre uma ação explícita de quem estiver validando.

---

## 5. Arquitetura e modelo de dados

- **Multi-igreja desde o início**: toda tabela de negócio tem `church_id`. A resolução da igreja é centralizada em `src/server/church.ts` — a URL usa `/app/[churchSlug]`, mas o slug **nunca** é confiado sozinho: a participação do usuário (`memberships`) é sempre revalidada no servidor, e a própria consulta à igreja já é filtrada por Row Level Security.
- **Autorização em camadas**: regras de negócio centralizadas em `src/lib/workflow.ts` (máquina de estados do fluxo, usada tanto na interface quanto nas Server Actions) + Row Level Security no Postgres (isolamento entre igrejas e permissões por papel) + gatilhos/funções SQL (`supabase/migrations`) que garantem invariantes mesmo que alguém contorne a interface (ex.: transição de etapa inválida, exigência de responsável e prazo, invalidação de aprovação, proteção do último administrador).
- **Convites**: tabela `invites` com token de uso único, expiração e aceite vinculado ao e-mail autenticado (`accept_invite`, função SQL `security definer`).
- **Concorrência otimista**: coluna `version` em `contents`, incrementada por gatilho; toda escrita relevante exige a versão lida por último — evita sobrescrita silenciosa em edição simultânea.
- **Fuso horário**: todo instante é armazenado em UTC; a conversão para o fuso da igreja (padrão `America/Sao_Paulo`) acontece na exibição e na leitura de formulários (`src/lib/format.ts`), nunca no navegador do usuário de forma ambígua.
- **Anexos**: bucket privado do Supabase Storage, upload autorizado direto do navegador (`createSignedUploadUrl`), sem passar o arquivo por uma função da Vercel. Downloads usam links assinados temporários.

Tabelas: `churches`, `profiles`, `memberships`, `invites`, `ministries`, `contents`, `content_channels`, `checklist_items`, `comments`, `attachments`, `activity_log`, `approvals`. Migrations em `supabase/migrations/`, em ordem:

1. `20250101000001_schema.sql` — tabelas e índices
2. `20250101000002_functions_triggers.sql` — perfis automáticos, versionamento, invariantes do fluxo
3. `20250101000003_rls.sql` — políticas de Row Level Security
4. `20250101000004_rpcs.sql` — aprovar, solicitar alterações, agendar, confirmar publicação, reabrir, duplicar, convites
5. `20250101000005_storage.sql` — bucket e políticas de anexos
6. `20250101000006_stage_transition_graph.sql` — trava o grafo de transições de etapa no banco

---

## 6. Subdomínios por igreja (futuro)

O MVP usa `/app/[churchSlug]`. Para migrar para `minhaigreja.dominio.com` no futuro, sem reescrever a autorização:

1. A resolução da igreja já está centralizada em `requireChurchContext` (`src/server/church.ts`). Trocar a origem do identificador (de slug na URL para subdomínio) é alterar **apenas** essa função — ela recebe hoje o slug via parâmetro de rota; passaria a recebê-lo extraído do `host` da requisição (em `src/proxy.ts`, que já roda em todo request).
2. Configure os domínios/wildcards no provedor DNS e na Vercel (Domains → wildcard domain apontando para o projeto).
3. Nenhuma política de RLS muda: elas já dependem só de `memberships`, nunca do identificador vindo do cliente.
4. Não é necessário (nem recomendado) fazer essa mudança antes de haver mais de uma igreja realmente usando o produto.

---

## 7. O que foi implementado

- Autenticação (login, recuperação de senha, logout), convites com expiração/revogação/uso único.
- Multi-igreja com isolamento por Row Level Security, alternador de igrejas.
- Perfis Administrador / Coordenador / Colaborador com as permissões da especificação, incluindo proteção do último administrador.
- Fluxo completo: Solicitação → Planejamento → Criação → Aprovação → Agendado → Publicado, com todas as regras de transição, invalidação de aprovação, reabertura de publicado e histórico automático.
- Telas: Início (painel de atenção), Produção (Kanban + Lista, filtros, busca), Detalhes do conteúdo (checklist, comentários, anexos, histórico, aprovações), Agenda editorial (mês, semana, lista por dia, conteúdos sem data), Equipe e configurações (membros, convites, ministérios, dados da igreja).
- Anexos com upload direto ao Storage, distinguindo material publicável de referência interna; links externos para vídeos grandes.
- Concorrência otimista (versão do registro).
- PWA: manifest, ícones (incluindo maskable), página offline, indicador de conexão, service worker restrito a arquivos estáticos públicos (nunca cacheia páginas autenticadas, API ou anexos).
- Identidade visual própria (paleta, tipografia, marca) em tema claro, layout responsivo com navegação lateral no desktop e inferior no celular.

## 8. Testes executados

- **Unitários** (`npm test`, 24 testes): regras do fluxo (`src/lib/workflow.test.ts`) e conversão de fuso horário (`src/lib/format.test.ts`).
- **Integração contra Supabase local real** (`npm run test:integration`, 25 testes): isolamento entre duas igrejas (leitura, escrita, canais, arquivos), permissões de cada perfil, convites expirado/revogado/já usado/e-mail divergente, fluxo completo solicitação→publicado, bloqueio de pular etapas, invalidação de aprovação por legenda, não invalidação ao reagendar, proteção de conteúdo publicado + reabertura, concorrência otimista, proteção do último administrador (remover e rebaixar).
- **Build de produção** (`npm run build`): compila e type-checa sem erros.
- **Inspeção manual em navegador** (Chrome, via DevTools): login, dashboard, Kanban, movimentação de etapa com diálogo de responsável/prazo, aprovação, alteração de canal invalidando aprovação automaticamente, edição de detalhes — em viewport desktop. A verificação completa em viewport mobile (360px) e leitor de tela não foi executada nesta sessão; recomenda-se antes de validar com usuários reais.

## 9. Configurações pendentes para uso real

- **SMTP de produção** no Supabase Auth (recuperação de senha) — veja seção 2.
- **Envio automático de convites por e-mail** — hoje é manual (link copiável); ver seção 2 para como automatizar.
- **Node 22 na Vercel** — configurar em Settings → General.
- Trocar a senha do administrador criado pelo script de bootstrap após o primeiro acesso.
- Verificação de acessibilidade com leitor de tela e teste de dispositivo móvel real (não realizados nesta entrega).
