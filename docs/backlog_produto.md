# Backlog do Produto: Sistema de Agendamento

## 1. Documentação (docs)

- [x] **#1 docs: Elaborar visão geral do escopo e requisitos do MVP**
- [x] **#2 docs: Criar diagrama de classes (modelo de objetos conceitual)**
- [x] **#3 docs: Criar diagrama de casos de uso (Slide 6)**
- [x] **#4 docs: Criar diagrama de sequência do agendamento com conflito**
- [ ] **#30 docs: Especificar detalhadamente TODOS os casos de uso (UC01 a UC12) [Etapa 2]**
- [ ] **#31 docs: Modelar diagrama de classes no Astah UML [Etapa 2]**
- [ ] **#32 docs: Modelar diagrama de pacotes com arquitetura no Astah UML [Etapa 2]**
- [ ] **#28 docs: Especificar rotas e contratos da API REST (Swagger/OpenAPI)**
- [ ] **#29 docs: Criar guia de execução e roteiro de testes (README)**

---

## 2. Casos de Uso & Funcionalidades (feat)

### Fundação & Banco de Dados
- [x] **#5 feat: Configurar projeto backend Spring Boot e frontend React com Tailwind**
- [x] **#6 feat: Configurar container PostgreSQL com Docker Compose**
- [x] ~~**#7 feat: Criar migration Flyway com schema das tabelas**~~ *(Descartado: schema gerado automaticamente pelo JPA/Hibernate)*
- [ ] **#8 feat: Implementar models (entidades JPA) e repositories [Sprint 2 / Etapa 2]**

### Interface Principal & Protótipo
- [ ] **#33 feat: Implementar Tela Principal do sistema no frontend [Sprint 2 / Etapa 2]**

### Autenticação & Acesso (UC01)
- [ ] **#9 feat: Implementar autenticação com JWT e Spring Security**
- [ ] **#10 feat: Implementar cadastro e login de Cliente e Profissional [Sprint 2 / Etapa 2]**
- [ ] **#11 feat: Criar telas de login e cadastro no frontend [Sprint 2 / Etapa 2]**

### Catálogo & Disponibilidade (UC07, UC08)
- [ ] **#12 feat: Implementar CRUD de serviços do profissional [Sprint 2 / Etapa 2]**
- [ ] **#13 feat: Implementar configuração de disponibilidade semanal**
- [ ] **#14 feat: Criar tela de perfil com serviços e horários de atendimento**

### Descoberta & Agendamento (UC02, UC03, UC04)
- [ ] **#15 feat: Implementar busca de serviços e profissionais**
- [ ] **#16 feat: Implementar cálculo de horários livres no backend (HorarioService)**
- [ ] **#17 feat: Implementar criação de agendamento com validação de conflito e preço congelado**
- [ ] **#18 feat: Criar tela de busca e fluxo de novo agendamento no frontend**

### Gestão da Agenda & Ciclo de Vida (UC05, UC06, UC09, UC10, UC11)
- [ ] **#19 feat: Implementar cancelamento pelo cliente com antecedência mínima de 2h**
- [ ] **#20 feat: Implementar visualização da agenda do dia para o profissional**
- [ ] **#21 feat: Implementar ações do profissional (concluir atendimento e marcar falta)**
- [ ] **#22 feat: Criar telas de 'Meus Agendamentos' (cliente) e 'Agenda do Dia' (profissional)**

### Dashboard (UC12)
- [ ] **#23 feat: Implementar métricas de faturamento do mês e atendimentos realizados**
- [ ] **#24 feat: Criar tela de dashboard simples para o profissional**

---

## 3. Qualidade & Testes (test)

- [ ] **#25 test: Implementar testes unitários para cálculo de horários livres e conflitos**
- [ ] **#26 test: Implementar testes unitários para regras de cancelamento (2h) e transições de status**
- [ ] **#27 test: Implementar testes de integração para fluxo completo de agendamento**
