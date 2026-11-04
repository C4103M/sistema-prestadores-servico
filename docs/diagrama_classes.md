# Diagrama de Classes

Espelha o diagrama do Astah (`Projeto_Agenda.asta`, pacote `2.Desing › Modelo de Objeto › Objetos`), acrescido das operações que implementam as regras de negócio.

> Fonte: [`diagramas/classes.mmd`](diagramas/classes.mmd)

![Diagrama de classes](diagramas/classes.png)

```mermaid
classDiagram
    direction LR

    class Usuario {
        -Long id
        -String email
        -String senha
    }

    class Cliente {
        -String nome
        -String telefone
    }

    class Profissional {
        -String nome
        -String especialidade
        +estaDisponivel(inicio, fim) boolean
    }

    class Servico {
        -Long id
        -String nome
        -int duracaoMinutos
        -BigDecimal preco
        -boolean ativo
    }

    class Disponibilidade {
        -long id
        -DayOfWeek diaSemana
        -LocalTime horaInicio
        -LocalTime horaFim
        +contem(inicio, fim) boolean
    }

    class Agendamento {
        -Long id
        -LocalDateTime inicio
        -LocalDateTime fim
        -BigDecimal valor
        -StatusAgendamento statusAgendamento
        +podeCancelar(agora) boolean
        +cancelar(agora) void
        +marcarConcluido() void
        +marcarFalta() void
    }

    class StatusAgendamento {
        <<enumeration>>
        AGENDADO
        CONCLUIDO
        CANCELADO
        FALTOU
    }

    Usuario <|-- Cliente
    Usuario <|-- Profissional
    Profissional "1" *-- "0..*" Disponibilidade : disponibilidades
    Profissional "1" --> "0..*" Servico : servicos
    Cliente "1" --> "0..*" Agendamento : agendamentos
    Servico "1" --> "0..*" Agendamento : agendamentos
    Agendamento --> StatusAgendamento
```

## Regras de negócio no modelo

| Regra | Onde fica |
|---|---|
| `fim = inicio + servico.duracaoMinutos` | criação do `Agendamento` |
| Preço congelado: `valor` recebe uma cópia de `Servico.preco` no momento do agendamento | criação do `Agendamento` |
| Sem sobreposição: nenhum agendamento AGENDADO do mesmo profissional com `inicio < outro.fim && fim > outro.inicio` | `Profissional.estaDisponivel` |
| Horário dentro de uma `Disponibilidade` do dia da semana | `Disponibilidade.contem` |
| Cancelamento com no mínimo 2 h de antecedência | `Agendamento.podeCancelar` |
| Só agendamentos AGENDADO mudam de estado | `cancelar`, `marcarConcluido`, `marcarFalta` |

## Correspondência com o código

O modelo de implementação (`backend/src/main/java/com/agendamento/model`) mapeia as mesmas classes com JPA. Diferenças de nome entre o modelo do Astah e o código:

| Astah | Código (JPA) |
|---|---|
| `Agendamento.inicio` / `fim` | `dataHoraInicio` / `dataHoraFim` |
| `Agendamento.valor` | `precoCobrado` |
| `Agendamento.statusAgendamento` | `status` |
| `Disponibilidade.diaSemana : DayOfWeek` | `diaSemana : DiaSemana` (enum próprio) |
| Herança `Cliente`/`Profissional` → `Usuario` | associação 1:1 com `Usuario` (`@OneToOne`) e enum `PapelUsuario` |
