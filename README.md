# Sistema de Agendamento para Prestadores de Serviço

Projeto acadêmico: clientes encontram profissionais e marcam horário em poucos toques.

## Escopo do MVP
- **Cliente**: cadastro e login, busca de serviço ou profissional, agendamento em horário livre, acompanhamento e cancelamento (mínimo de 2h de antecedência).
- **Profissional**: cadastro e login, serviços (duração e preço), disponibilidade semanal, agenda do dia, conclusão e falta, dashboard (faturamento do mês e atendimentos).

## Regras de negócio
1. O horário deve estar dentro da disponibilidade do profissional.
2. Não pode haver sobreposição com outro agendamento ativo do mesmo profissional (fim = início + duração do serviço).
3. O cliente só cancela com pelo menos 2h de antecedência.
4. Ao marcar como CONCLUÍDO, o valor entra no faturamento.
5. O preço é congelado no agendamento.

## Tecnologias
Spring Boot (Java, JPA, Spring Security), React, Tailwind CSS, PostgreSQL, Git e GitHub.

## Estrutura (planejada)
```
backend/   API REST em Spring Boot
frontend/  Interface web em React
docs/      Backlog, diagramas e documentação
```

## Documentação
- [Backlog do produto](docs/backlog_produto.md)
