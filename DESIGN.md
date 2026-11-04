# DESIGN.md — AgendeFácil

Sistema visual do protótipo (frontend). Os tokens vivem em `frontend/src/index.css` (`@theme` do Tailwind v4).

## Ideia

O produto é uma agenda; o visual vem do **livro de agenda** de barbearia e salão: tinta azul-marinho sobre papel frio, linhas de hora e um **marca-texto amarelo** que destaca o horário escolhido e o "agora". É uma ferramenta de trabalho, então a navegação, os formulários e as tabelas seguem padrões conhecidos; a identidade aparece na cor, na tipografia e na linha do tempo do dia.

O que foi descartado da versão anterior: gradientes índigo, cards iguais com ícone, modais para tudo e texto em gradiente.

## Cores

| Token | Valor | Uso |
|---|---|---|
| `ink` | `#13233d` | Texto, barra lateral, botão primário |
| `ink-2` | `#22375a` | Hover do botão primário |
| `ink-soft` | `#e8ecf3` | Hover de botões fantasma |
| `paper` | `#f5f6f8` | Fundo da página, horas sem atendimento |
| `surface` | `#ffffff` | Painéis |
| `rule` / `rule-strong` | `#e3e7ed` / `#c9d0db` | Linhas e bordas |
| `muted` / `faint` | `#566173` / `#8a93a3` | Texto secundário / placeholder |
| `marker` / `marker-soft` | `#ffc53d` / `#fff3cf` | Horário selecionado, linha do "agora", item em edição |

Estados do agendamento (sempre com ícone e rótulo, nunca só cor):

| Estado | Texto | Fundo |
|---|---|---|
| Agendado | `#2450c8` | `#e9efff` |
| Concluído | `#13774a` | `#e3f4ec` |
| Cancelado | `#566173` | `#eef0f3` |
| Faltou | `#ad3d0a` | `#fdeee4` |
| Perigo (excluir) | `#b42323` | `#fdeaea` |

## Tipografia

Uma família: **Figtree** (variável, `@fontsource-variable/figtree`). Escala fixa em rem: título de página 28px/700, seção 18px/700, corpo 14–15px, rótulos 13px/600, legendas 12px. Números de preço, hora e data usam `tabular-nums` (utilitário `tabular`).

## Componentes

- **Botões** (`.btn` + `btn-primary` | `btn-secondary` | `btn-ghost` | `btn-danger`, tamanhos `btn-sm`, `btn-icon`): altura 40px (32px no `sm`), raio 8px, transição de 150ms.
- **Campos** (`.label`, `.input`, `.erro-campo`): borda `rule-strong`, foco com anel azul de 3px, erro em vermelho abaixo do campo.
- **Painel** (`.painel`): fundo branco, borda 1px `rule`, raio 12px, sem sombra.
- **StatusBadge**, **PageHeader**, **EmptyState** (sempre com uma ação), **ConfirmDialog** (`<dialog>` nativo, só para ações destrutivas).
- **AppShell**: barra lateral `ink` de 256px no desktop; barra superior com navegação rolável abaixo de 1024px.

## Assinatura

A **linha do tempo do dia** na Agenda: horas como linhas de caderno, atendimentos posicionados pela hora de início e duração, horários fora da disponibilidade no tom do papel e o "agora" como uma faixa de marca-texto. A mesma linguagem aparece na régua semanal da Disponibilidade e no horário escolhido na tela principal.

## Movimento

Somente transições de estado de 150ms (cor de fundo e borda). Sem animação de entrada.
