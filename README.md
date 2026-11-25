# AgendeFácil — Sistema de Agendamento para Prestadores de Serviço

Aplicação web full-stack para agendamento de serviços entre **Clientes**, **Profissionais** (prestadores de serviço) e **Administradores**, com vitrine visual por categorias, fluxo de aprovação de novas especialidades/categorias, upload de imagens no servidor, ativação/desativação de usuários, gestão de perfil (*Meus dados*), controle de disponibilidade semanal, detecção de conflitos, congelamento histórico de preços, agenda diária e dashboards de faturamento por período.

---

## Stack Tecnológica

| Camada | Tecnologias |
|---|---|
| **Backend** | Java 21, Spring Boot 4.1.2, Spring Security (JWT + BCrypt), Spring Data JPA, Spring Validation, Springdoc OpenAPI (Swagger UI) |
| **Banco de dados** | PostgreSQL 16 (execução/Docker) e H2 em memória (perfil `test`) |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS 4, Axios, Lucide Icons |
| **Qualidade & CI** | JUnit 5 + MockMvc, Oxlint, GitHub Actions (`.github/workflows/ci.yml`), Docker / Docker Compose |

---

## Pré-requisitos

- **Via Docker (recomendado):** [Docker](https://docs.docker.com/get-docker/) e Docker Compose v2+.
- **Execução local sem containerizar back/front:**
  - Java 21+ (Maven Wrapper `./mvnw` já incluído em `backend/`)
  - Node.js 24+ e npm
  - PostgreSQL 16 (pode ser subido isoladamente via `docker compose up -d postgres`)

---

## Como Executar

### 1. Subida completa com Docker Compose

1. Crie o arquivo `.env` na raiz a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

2. Preencha `JWT_SECRET` no `.env` com um segredo forte (mínimo de 32 bytes/caracteres para HS256):

   ```bash
   openssl rand -base64 48
   ```

3. Suba PostgreSQL, backend e frontend (imagens enviadas são persistidas no volume Docker `uploads:/app/uploads`):

   ```bash
   docker compose up --build
   ```

4. Acesse os serviços:
   - **Frontend:** `http://localhost:3000`
   - **API / Healthcheck:** `http://localhost:8080/api/health`
   - **Swagger UI:** `http://localhost:8080/swagger-ui.html`
   - **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`

---

### 2. Execução local para desenvolvimento

1. Suba apenas o banco PostgreSQL (ou aponte para uma instância local):

   ```bash
   docker compose up -d postgres
   ```

2. Em um terminal, configure `JWT_SECRET` e inicie o backend (`http://localhost:8080`):

   ```bash
   cd backend
   export JWT_SECRET="meu-segredo-local-com-pelo-menos-32-caracteres"
   ./mvnw spring-boot:run
   ```

   *(No Windows PowerShell: `$env:JWT_SECRET="meu-segredo-local-com-pelo-menos-32-caracteres"; .\mvnw.cmd spring-boot:run`)*

3. Em outro terminal, instale as dependências e inicie o frontend (`http://localhost:3000`, com proxy `/api` configurado para `localhost:8080` em `frontend/vite.config.ts`):

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

---

## Variáveis de Ambiente

Definidas em [`.env.example`](.env.example), [`frontend/.env.example`](frontend/.env.example) e consumidas em [`docker-compose.yml`](docker-compose.yml) / [`application.properties`](backend/src/main/resources/application.properties):

| Variável | Onde é usada | Padrão | Descrição |
|---|---|---|---|
| `POSTGRES_DB` / `DB_NAME` | Postgres / Backend | `agendamento_db` | Nome do banco PostgreSQL |
| `POSTGRES_USER` / `DB_USER` | Postgres / Backend | `postgres` | Usuário do banco |
| `POSTGRES_PASSWORD` / `DB_PASSWORD` | Postgres / Backend | `postgres` | Senha do banco |
| `DB_HOST` | Backend | `localhost` (`postgres` no Compose) | Host do PostgreSQL |
| `DB_PORT` | Backend / Compose | `5432` | Porta do PostgreSQL |
| `BACKEND_PORT` / `SERVER_PORT` | Compose / Backend | `8080` | Porta HTTP da API Spring Boot |
| `JPA_DDL_AUTO` | Backend | `update` | Estratégia de schema Hibernate (`update`, `validate` etc.) |
| `JPA_SHOW_SQL` | Backend | `false` | Exibe SQL no log quando `true` |
| `CORS_ALLOWED_ORIGINS` | Backend | `http://localhost:3000,http://localhost:3001,http://localhost:5173` | Origens permitidas no CORS |
| `APP_SEED_ENABLED` | Backend | `true` | Popula dados iniciais pelo `DataSeeder` quando o banco está vazio |
| `APP_UPLOAD_DIR` | Backend / Compose | `./uploads` (`/app/uploads` no Compose) | Diretório de armazenamento das imagens enviadas por upload |
| `JWT_SECRET` | Backend *(obrigatória)* | — | Segredo HMAC-SHA256 para assinar tokens JWT |
| `JWT_EXPIRACAO_MINUTOS` | Backend | `120` | Tempo de vida do token JWT em minutos |
| `FRONTEND_PORT` | Compose | `3000` | Porta pública do container Nginx do frontend |
| `VITE_API_URL` | Frontend | `/api` | Base URL das chamadas Axios (Nginx/Vite fazem proxy para o backend) |
| `VITE_PORT` / `VITE_API_TARGET` | Frontend (dev) | `3000` / `http://localhost:8080` | Porta local do Vite e destino do proxy `/api` |

---

## Principais Funcionalidades por Perfil

- **Cadastro e Perfil (*Meus dados*):**
  - Cadastro de **Cliente** ou **Profissional** com confirmação de senha (`#/cadastro`) e sem exigência prévia de especialidade.
  - Tela **Meus dados** em todas as áreas (`#/<ator>/perfil`) para editar nome, e-mail, telefone, especialidade (Profissional) e alterar senha com validação da senha atual (`GET/PUT /api/perfil`, `PATCH /api/perfil/senha`).
- **Categorias/Especialidades e Vitrine Inicial:**
  - Categorias têm `nome`, `shortDescription` e imagem (imagens iniciais em `frontend/public/imagens/categorias/` + upload real JPG/PNG/WEBP até 5 MB em `POST /api/uploads/imagens`).
  - **Profissional** pode sugerir uma nova categoria ao cadastrar/editar um serviço; o serviço nasce editável (preço, duração, categoria etc.), porém permanece oculto aos clientes até que o **Admin** aprove a categoria. Caso o Admin rejeite, o Profissional pode editar o serviço e associá-lo a outra categoria.
  - Na tela inicial do **Cliente** (`#/cliente/buscar`), são exibidos **cards visuais** apenas das categorias **aprovadas que possuem ao menos 1 serviço ativo**, filtrando a busca ao clicar.
- **Administração (`ADMIN`):**
  - **Usuários (`#/admin/usuarios`):** listagem, filtros e ativação/desativação de contas (desativar bloqueia login e revoga JWTs ativos imediatamente; serviços de profissionais desativados saem da busca).
  - **Categorias (`#/admin/categorias`):** fila de aprovação/rejeição das sugestões de profissionais + criação (já aprovada) e edição de categorias com upload de imagem.
  - **Dashboard (`#/admin/dashboard`):** indicadores operacionais e faturamento consolidado por período.

---

## Documentação da API (Swagger / OpenAPI)

Com o backend em execução:

- **Swagger UI interativo:** [`http://localhost:8080/swagger-ui.html`](http://localhost:8080/swagger-ui.html)
- **Especificação OpenAPI 3 (JSON):** [`http://localhost:8080/v3/api-docs`](http://localhost:8080/v3/api-docs)

### Como autenticar no Swagger UI
1. Execute `POST /api/auth/login` com uma das credenciais abaixo e copie o campo `token` da resposta.
2. Clique em **Authorize** (canto superior direito do Swagger UI) e cole apenas o token no campo **bearerAuth**.
3. As rotas estão organizadas pelas tags **Autenticação**, **Cliente**, **Profissional**, **Administrador**, **Categorias**, **Uploads**, **Perfil** e **Infraestrutura**. Erros seguem **RFC 7807 (`ProblemDetail`)** (`400`, `401`, `403`, `404`, `409`).

---

## Credenciais de Demonstração (`DataSeeder`)

Quando `APP_SEED_ENABLED=true` e a tabela de usuários está vazia, o [`DataSeeder`](backend/src/main/java/com/agendamento/compartilhado/config/DataSeeder.java) cria as 4 categorias iniciais (`Barbearia`, `Estética`, `Elétrica`, `Outros`) e os usuários abaixo com senha padrão **`123456`**:

| Perfil | E-mail | Área / Especialidade |
|---|---|---|
| **ADMIN** | `admin@agendefacil.com` | Administração da plataforma |
| **PROFISSIONAL** | `carlos@barbearia.com` | Barbearia (Carlos Silva) |
| **PROFISSIONAL** | `beatriz@estetica.com` | Estética (Beatriz Mendes) |
| **PROFISSIONAL** | `marcos@eletrica.com` | Elétrica residencial (Marcos Andrade) |
| **CLIENTE** | `lucas@email.com` | Lucas Pereira *(também: `mariana@email.com`, `rafael@email.com`, `ana@email.com`, `joao@email.com`, `pedro@email.com`)* |

---

## Roteiro de Validação das Regras de Negócio (`RN01`–`RN06`)

1. **RN01 — Disponibilidade semanal:** Entre como Profissional (`carlos@barbearia.com`), acesse **Disponibilidade**, tente salvar faixa com fim anterior ao início ou sobreposta (deve bloquear) e verifique na área do Cliente que só aparecem horários dentro das faixas cadastradas.
2. **RN02 — Prevenção de conflito de horário:** Como Cliente (`lucas@email.com`), agende um horário livre; o slot desaparece da lista em `/api/cliente/servicos/{servicoId}/horarios-livres` e uma tentativa concorrente direta na API retorna `409 Conflict`.
3. **RN03 — Cancelamento com antecedência de 2h:** Como Cliente em **Meus agendamentos**, agendamentos a menos de 2h do início não permitem cancelamento (a API retorna `409`); como Profissional em **Agenda**, o cancelamento continua permitido antes do início.
4. **RN04 — Faturamento apenas de concluídos:** No **Dashboard** (Profissional e Admin), o valor de atendimentos `CANCELADO`, `FALTOU` ou `AGENDADO` futuro não soma em `Faturamento` — apenas `CONCLUIDO`.
5. **RN05 — Congelamento de preço:** Crie um agendamento com o serviço a R$ 50,00, altere o preço do serviço em **Serviços** para R$ 55,00 e confira que o agendamento já existente preserva R$ 50,00.
6. **RN06 — Máquina de estados final:** Conclua ou registre falta (somente após o início do atendimento) na **Agenda**; atendimentos em `CONCLUIDO`, `CANCELADO` ou `FALTOU` não exibem mais ações de transição e retornam `409` na API.

---

## Casos de Uso e Documentação Complementar

| Caso de Uso | Escopo | Especificação |
|---|---|---|
| **UC01 / US01** | Cadastro e autenticação JWT (`CLIENTE`, `PROFISSIONAL`, `ADMIN`) | [`US01-Cadastrar-se.docx`](docs/especificacao/US01-Cadastrar-se.docx) |
| **UC02 / US02** | Busca por categorias/serviços/profissionais, horários livres e confirmação | [`US02-Agendar-atendimento.docx`](docs/especificacao/US02-Agendar-atendimento.docx) |
| **UC03 / US03** | Cancelamento pelo Cliente (`RN03`) e pelo Profissional | [`US03-Cancelar-agendamento.docx`](docs/especificacao/US03-Cancelar-agendamento.docx) |
| **UC04 / US04** | Manter serviços do Profissional | [`US04-Manter-serviço.docx`](docs/especificacao/US04-Manter-serviço.docx) |
| **UC05 / US05** | Manter disponibilidade semanal (Profissional) | [`US05-Manter-disponibilidade.docx`](docs/especificacao/US05-Manter-disponibilidade.docx) |
| **UC06 / US06** | Atualizar status do agendamento e agenda do dia | [`US06-Atualizar-status-do-agendamento.docx`](docs/especificacao/US06-Atualizar-status-do-agendamento.docx) |
| **UC07 / US07** | Dashboard de faturamento e métricas por período (Profissional e Admin) | [`US07-Ver-dashboard.docx`](docs/especificacao/US07-Ver-dashboard.docx) |

- Backlog macro do produto: [`docs/backlog_produto.md`](docs/backlog_produto.md)
- Modelagem UML (Astah): [`docs/diagramas/Projeto_Agenda.asta`](docs/diagramas/Projeto_Agenda.asta)
- Protótipos visuais: [`docs/prototipo/`](docs/prototipo/)

---

## Testes Automatizados e Qualidade

### Backend (perfil `test` com H2 em memória — não exige PostgreSQL rodando)

```bash
cd backend
./mvnw test -B
```

*(No Windows PowerShell: `.\mvnw.cmd clean test -B`)*

### Frontend (lint, typecheck e build de produção)

```bash
cd frontend
npm ci
npm run lint
npm run build
```
