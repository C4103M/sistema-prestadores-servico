# Diagrama de Casos de Uso

Espelha o diagrama do Astah (`Projeto_Agenda.asta`, pacote `1.Analise › Modelo de Casos de Uso`). A especificação de cada caso de uso está em [especificacao_casos_de_uso.md](especificacao_casos_de_uso.md).

> Fonte: [`diagramas/casos_de_uso.mmd`](diagramas/casos_de_uso.mmd)

![Diagrama de casos de uso](diagramas/casos_de_uso.png)

```mermaid
flowchart LR
    Cliente(["Cliente"])
    Profissional(["Profissional"])

    subgraph Sistema ["Sistema de Agendamento"]
        UC01(["UC01 Cadastrar-se"])
        UC02(["UC02 Agendar atendimento"])
        UC03(["UC03 Consultar meus Agendamentos"])
        UC04(["UC04 Cancelar Agendamento"])
        UC05(["UC05 Manter serviço"])
        UC06(["UC06 Manter disponibilidade"])
        UC07(["UC07 Consultar agenda"])
        UC08(["UC08 Atualizar Status do agendamento"])
        UC09(["UC09 Ver dashboard"])
    end

    Cliente --- UC01
    Cliente --- UC02
    Cliente --- UC03
    Cliente --- UC04

    UC01 --- Profissional
    UC05 --- Profissional
    UC06 --- Profissional
    UC07 --- Profissional
    UC08 --- Profissional
    UC09 --- Profissional
```
