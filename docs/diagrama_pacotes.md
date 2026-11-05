# Diagrama de Pacotes e Arquitetura

O sistema segue uma arquitetura **cliente-servidor em camadas**: um frontend React (SPA) conversa com uma API REST em Spring Boot, que persiste os dados no PostgreSQL. Cada camada depende apenas da camada logo abaixo.

> Fonte: [`diagramas/pacotes.mmd`](diagramas/pacotes.mmd)

![Diagrama de pacotes](diagramas/pacotes.png)

```mermaid
flowchart LR
    subgraph FE ["«subsystem» frontend (React + TypeScript)"]
        direction TB
        pages["<b>«package» pages</b><br/>HomePage · MeusAgendamentosPage<br/>ServicosPage · DisponibilidadePage<br/>AgendaPage · DashboardPage"]
        components["<b>«package» components</b><br/>AppShell · PageHeader · StatusBadge<br/>ConfirmDialog · EmptyState"]
        fservices["<b>«package» services</b><br/>storage · horarios · formato · mockData"]
        types["<b>«package» types</b><br/>Servico · Agendamento · Disponibilidade"]
        pages --> components
        pages --> fservices
        pages --> types
        fservices --> types
    end

    subgraph BE ["«subsystem» backend (Spring Boot · com.agendamento)"]
        direction TB
        config["<b>«package» config</b><br/>SecurityConfig"]
        controller["<b>«package» controller</b><br/>ServicoController · DisponibilidadeController<br/>AgendamentoController · DashboardController"]
        dto["<b>«package» dto</b><br/>ServicoDTO · DisponibilidadeDTO<br/>AgendamentoRequestDTO · AgendamentoResponseDTO · DashboardDTO"]
        service["<b>«package» service</b><br/>ServicoService · DisponibilidadeService<br/>AgendamentoService"]
        repository["<b>«package» repository</b><br/>UsuarioRepository · ClienteRepository · ProfissionalRepository<br/>ServicoRepository · DisponibilidadeRepository · AgendamentoRepository"]
        model["<b>«package» model</b><br/>Usuario · Cliente · Profissional · Servico<br/>Disponibilidade · Agendamento · StatusAgendamento"]
        exception["<b>«package» exception</b><br/>GlobalExceptionHandler · RecursoNaoEncontradoException"]
        config -.-> controller
        controller --> service
        controller --> dto
        service --> repository
        service --> model
        service --> dto
        repository --> model
        service -.-> exception
        controller -.-> exception
    end

    db[("PostgreSQL 16")]

    fservices -- "HTTP · JSON (/api/*)" --> controller
    repository -- "JPA / Hibernate" --> db
```

## Camadas do backend

| Pacote | Responsabilidade |
|---|---|
| `config` | Segurança (Spring Security) e CORS. |
| `controller` | Endpoints REST: recebe a requisição, valida o DTO e devolve o código HTTP. |
| `dto` | Contratos da API, separados das entidades. |
| `service` | Regras de negócio: horários livres, conflito de horário, cancelamento com 2 h, preço congelado, faturamento. |
| `repository` | Interfaces Spring Data JPA, incluindo a consulta de conflito de horário. |
| `model` | Entidades JPA e enumerações do domínio. |
| `exception` | `GlobalExceptionHandler` converte as exceções em respostas `ProblemDetail` (RFC 7807): 404 para recurso inexistente, 400 para dados inválidos e 409 para regra de negócio violada. |

## Pacotes do frontend

| Pasta | Responsabilidade |
|---|---|
| `src/pages` | Uma tela por caso de uso (tela principal, CRUDs, agenda, dashboard). |
| `src/components` | Peças reutilizadas entre telas: estrutura com navegação, cabeçalho, selo de estado, diálogo de confirmação, estado vazio. |
| `src/services` | Acesso a dados (hoje `localStorage` com dados de demonstração; na Etapa 3, a API), cálculo de horários livres e formatação. |
| `src/types` | Tipos TypeScript espelhando os DTOs da API. |

## Endpoints

| Método | Rota | Caso de uso |
|---|---|---|
| `GET` | `/api/servicos?busca=` | UC02 |
| `POST` `PUT` `PATCH` `DELETE` | `/api/servicos[/{id}]` | UC05 |
| `GET` `POST` `PUT` `DELETE` | `/api/disponibilidades[/{id}]` | UC06 |
| `POST` | `/api/agendamentos` | UC02 |
| `GET` | `/api/agendamentos/cliente/{id}` | UC03 |
| `PATCH` | `/api/agendamentos/{id}/cancelar` | UC04, UC08 |
| `GET` | `/api/agendamentos/profissional/{id}` | UC07 |
| `PATCH` | `/api/agendamentos/{id}/concluir` · `/falta` | UC08 |
| `GET` | `/api/dashboard/profissional/{id}` | UC09 |
