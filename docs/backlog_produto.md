# Backlog do Produto (Gerenciamento Macro): Sistema de Agendamento

> Quadro oficial no GitHub Projects: [gerenciamento-sistema-prestadores-servico (Project #5)](https://github.com/users/C4103M/projects/5)
>
> O backlog foi reorganizado em nível **macro**: cada Caso de Uso oficial (`UC01` a `UC07`) representa uma entrega vertical completa (**Backend + Integração Frontend + Testes de Aceitação**), acompanhada dos macro-itens de **Documentação**, **DevOps** e **Deploy**.

---

## 1. Documentação (`docs`)

- [x] **[#35](https://github.com/C4103M/sistema-prestadores-servico/issues/35) `[DOCS]` Requisitos, Casos de Uso (UC01–UC07), Modelagem UML e Protótipo**
  - **Status:** Done | **Prioridade:** P0 | **Size:** M | **Estimativa:** 5 pts
  - **Escopo:** Visão geral do MVP, regras de negócio (`RN01`–`RN06`), especificação detalhada com testes de aceitação de `UC01` a `UC07` ([especificação](especificacao/)), modelagem UML no Astah ([Projeto_Agenda.asta](diagramas/Projeto_Agenda.asta)) e protótipos de tela ([prototipo](prototipo/)).
- [ ] **[#36](https://github.com/C4103M/sistema-prestadores-servico/issues/36) `[DOCS]` Documentação da API (Swagger/OpenAPI) e Guia de Execução (README)**
  - **Status:** Backlog | **Prioridade:** P2 | **Size:** S | **Estimativa:** 3 pts
  - **Escopo:** Especificação interativa dos contratos REST via Springdoc OpenAPI/Swagger, recriação do `README.md` na raiz com passos de execução local, credenciais de seed e roteiro de validação das regras de negócio.

---

## 2. DevOps, Fundação & Deploy (`devops` / `fundacao`)

- [x] **[#37](https://github.com/C4103M/sistema-prestadores-servico/issues/37) `[DEVOPS]` Ambiente Local Executável, Fundação da API e Integração Base Front-Back**
  - **Status:** Done | **Prioridade:** P0 | **Size:** M | **Estimativa:** 5 pts
  - **Escopo:** Containerização full-stack (`docker-compose.yml` com PostgreSQL, Backend Spring Boot 4 / Java 21 e Frontend React/Vite + Nginx), revisão das entidades JPA/tratamento de erros (`ProblemDetail`), seed inicial de dados (`DataSeeder`), healthcheck (`GET /api/health`), cliente HTTP base no frontend (`api.ts`) e configuração de CORS/variáveis de ambiente.
- [ ] **[#38](https://github.com/C4103M/sistema-prestadores-servico/issues/38) `[DEVOPS]` Pipeline de CI e Infraestrutura de Testes Automatizados**
  - **Status:** Backlog | **Prioridade:** P1 | **Size:** M | **Estimativa:** 5 pts
  - **Escopo:** Workflow de CI no GitHub Actions (build e testes Maven + lint/typecheck/build frontend), ambiente isolado para testes de integração (perfil `test`) e cobertura ponta a ponta das regras críticas (`RN01`–`RN06`).
- [ ] **[#39](https://github.com/C4103M/sistema-prestadores-servico/issues/39) `[DEPLOY]` Containerização (Docker) e Deploy da Aplicação**
  - **Status:** Backlog | **Prioridade:** P2 | **Size:** M | **Estimativa:** 5 pts
  - **Escopo:** `Dockerfile` multi-stage para backend e frontend, `docker-compose.prod.yml` com variáveis externalizadas e publicação em ambiente funcional acessível.

---

## 3. Casos de Uso — UC01 a UC07 (`caso-de-uso`)

> Total dos Casos de Uso: **32 Story Points** (conforme estimativas oficiais em `docs/especificacao/US01..US07.docx`).

- [ ] **[#40](https://github.com/C4103M/sistema-prestadores-servico/issues/40) `[UC01 / US01]` Cadastrar-se e Autenticação (Cliente, Profissional e Admin)**
  - **Status:** Sprint | **Prioridade:** P0 | **Size:** M | **Estimativa:** 5 pts
  - **Escopo:** Spring Security + JWT real (`BCrypt`), endpoints de registro e login por perfil (`CLIENTE`, `PROFISSIONAL`, `ADMIN`), novas telas de Login e Cadastro no frontend e testes de aceitação (`CT01`–`CT08`).
- [ ] **[#41](https://github.com/C4103M/sistema-prestadores-servico/issues/41) `[UC04 / US04]` Manter Serviço (Profissional e Administrador)**
  - **Status:** Backlog | **Prioridade:** P0 | **Size:** M | **Estimativa:** 5 pts
  - **Escopo:** CRUD completo de serviços (Profissional com escopo próprio e Admin global), ativar/desativar, bloqueio de exclusão com vínculo, preservação de preço (`RN05`), integração da `ServicosPage` à API e testes (`CT01`–`CT08`).
- [ ] **[#42](https://github.com/C4103M/sistema-prestadores-servico/issues/42) `[UC05 / US05]` Manter Disponibilidade Semanal (Profissional)**
  - **Status:** Backlog | **Prioridade:** P0 | **Size:** S | **Estimativa:** 3 pts
  - **Escopo:** CRUD de múltiplas faixas por dia da semana, validações de horário e sobreposição, manutenção de agendamentos existentes ao remover faixa, integração da `DisponibilidadePage` à API e testes (`CT01`–`CT07`).
- [ ] **[#43](https://github.com/C4103M/sistema-prestadores-servico/issues/43) `[UC02 / US02]` Agendar Atendimento (Busca, Horários Livres e Confirmação)**
  - **Status:** Backlog | **Prioridade:** P1 | **Size:** L | **Estimativa:** 8 pts
  - **Escopo:** Busca por serviço e profissional (apenas ativos), cálculo de horários livres no backend (`HorarioService`, `RN01`/`RN02`), reserva transacional com proteção de conflito (`409`) e preço congelado (`RN05`), integração da `HomePage` à API e testes (`CT01`–`CT08`).
- [ ] **[#44](https://github.com/C4103M/sistema-prestadores-servico/issues/44) `[UC03 / US03]` Cancelar Agendamento (Cliente e Profissional)**
  - **Status:** Backlog | **Prioridade:** P1 | **Size:** S | **Estimativa:** 3 pts
  - **Escopo:** Cancelamento pelo Cliente com antecedência mínima de 2h (`RN03`), cancelamento livre pelo Profissional, bloqueio em estados finais (`RN06` → `409`), isolamento (`404`), integração de `MeusAgendamentosPage` e `AgendaPage` à API e testes (`CT01`–`CT07`).
- [ ] **[#45](https://github.com/C4103M/sistema-prestadores-servico/issues/45) `[UC06 / US06]` Atualizar Status do Agendamento e Agenda do Dia**
  - **Status:** Backlog | **Prioridade:** P1 | **Size:** S | **Estimativa:** 3 pts
  - **Escopo:** Visualização diária ordenada com navegação entre datas, concluir atendimento (`RN04`), registrar falta apenas após o início do horário (`E2`), bloqueio em estados finais (`RN06`), integração da `AgendaPage` à API e testes (`CT01`–`CT06`).
- [ ] **[#46](https://github.com/C4103M/sistema-prestadores-servico/issues/46) `[UC07 / US07]` Ver Dashboard de Faturamento e Métricas (Profissional e Admin)**
  - **Status:** Backlog | **Prioridade:** P2 | **Size:** M | **Estimativa:** 5 pts
  - **Escopo:** Filtro por período nos dashboards Profissional e Admin, faturamento apenas de concluídos (`RN04`), faturamento por serviço/profissional, taxa de comparecimento sem divisão por zero, agendados futuros, integração da `DashboardPage` à API e testes (`CT01`–`CT07`).

---

## Rastreabilidade (Consolidação das Issues `#1` a `#33`)

As 33 issues granulares anteriores (`#1`–`#33`) foram consolidadas nos 12 macro-itens acima para viabilizar o acompanhamento por entregáveis e Casos de Uso:

| Macro-item | Issues antigas consolidadas |
|---|---|
| `#35` `[DOCS]` Requisitos, UC01–UC07, UML e Protótipo | `#1`, `#2`, `#3`, `#4`, `#30`, `#31`, `#32`, `#33` *(entregues na Etapa 1 e 2 / PR #34)* |
| `#36` `[DOCS]` Swagger/OpenAPI e README | `#28`, `#29` |
| `#37` `[DEVOPS]` Ambiente Local, Fundação e Integração Base | `#5`, `#6`, `#7` *(descartada)*, `#8` e antiga `#34` do backlog |
| `#38` `[DEVOPS]` CI e Infraestrutura de Testes | `#25`, `#26`, `#27` |
| `#39` `[DEPLOY]` Containerização e Deploy | *(Novo macro-item)* |
| `#40` `[UC01]` Cadastrar-se e Autenticação | `#9`, `#10`, `#11` |
| `#41` `[UC04]` Manter Serviço | `#12`, `#14` *(serviços)* |
| `#42` `[UC05]` Manter Disponibilidade | `#13`, `#14` *(disponibilidade)* |
| `#43` `[UC02]` Agendar Atendimento | `#15`, `#16`, `#17`, `#18` e cenários de `#25` |
| `#44` `[UC03]` Cancelar Agendamento | `#19`, `#22` *(cancelamento)* e cenários de `#26` |
| `#45` `[UC06]` Atualizar Status e Agenda | `#20`, `#21`, `#22` *(agenda)* e cenários de `#26` |
| `#46` `[UC07]` Ver Dashboard | `#23`, `#24` |
