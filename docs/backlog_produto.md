# Backlog do Produto: Sistema de Agendamento

## 1. Documentação (docs)

- [x] **docs: Elaborar visão geral do escopo e requisitos do MVP**
- [x] **docs: Criar diagrama de classes (modelo de objetos)**
- [x] **docs: Criar diagrama de casos de uso (Slide 6)**
- [x] **docs: Criar diagrama de sequência do agendamento com conflito**
- [ ] **docs: Especificar rotas e contratos da API REST (Swagger/OpenAPI)**
- [ ] **docs: Criar guia de execução e roteiro de testes (README)**

---

## 2. Casos de Uso & Funcionalidades (feat)

### Fundação & Banco de Dados
- [x] **feat: Configurar projeto backend Spring Boot e frontend React com Tailwind**
- [x] **feat: Configurar container PostgreSQL com Docker Compose**
- [ ] **feat: Criar migration Flyway com schema das tabelas**
- [ ] **feat: Implementar models (entidades JPA) e repositories**

### Autenticação & Acesso (UC01)
- [ ] **feat: Implementar autenticação com JWT e Spring Security**
- [ ] **feat: Implementar cadastro e login de Cliente e Profissional**
- [ ] **feat: Criar telas de login e cadastro no frontend**

### Catálogo & Disponibilidade (UC07, UC08)
- [ ] **feat: Implementar CRUD de serviços do profissional**
- [ ] **feat: Implementar configuração de disponibilidade semanal**
- [ ] **feat: Criar tela de perfil com serviços e horários de atendimento**

### Descoberta & Agendamento (UC02, UC03, UC04)
- [ ] **feat: Implementar busca de serviços e profissionais**
- [ ] **feat: Implementar cálculo de horários livres no backend (HorarioService)**
- [ ] **feat: Implementar criação de agendamento com validação de conflito e preço congelado**
- [ ] **feat: Criar tela de busca e fluxo de novo agendamento no frontend**

### Gestão da Agenda & Ciclo de Vida (UC05, UC06, UC09, UC10, UC11)
- [ ] **feat: Implementar cancelamento pelo cliente com antecedência mínima de 2h**
- [ ] **feat: Implementar visualização da agenda do dia para o profissional**
- [ ] **feat: Implementar ações do profissional (concluir atendimento e marcar falta)**
- [ ] **feat: Criar telas de 'Meus Agendamentos' (cliente) e 'Agenda do Dia' (profissional)**

### Dashboard (UC12)
- [ ] **feat: Implementar métricas de faturamento do mês e atendimentos realizados**
- [ ] **feat: Criar tela de dashboard simples para o profissional**

---

## 3. Qualidade & Testes (test)

- [ ] **test: Implementar testes unitários para cálculo de horários livres e conflitos**
- [ ] **test: Implementar testes unitários para regras de cancelamento (2h) e transições de status**
- [ ] **test: Implementar testes de integração para fluxo completo de agendamento**
