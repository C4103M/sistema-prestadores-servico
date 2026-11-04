# Apresentação — Etapa 2

Slides a acrescentar depois do slide **"Tecnologias e ferramentas"** do deck atual. Cada slide traz o conteúdo da tela, a imagem a usar e uma nota de fala.

Os slides prontos, no estilo do deck e com as notas de fala, estão em [apresentacao_etapa2.pptx](apresentacao_etapa2.pptx). Para juntar ao deck: no Google Slides, **Arquivo › Importar slides › Fazer upload**, escolha o arquivo e marque os 10 slides.

Itens exigidos nesta etapa e onde aparecem:

| Exigência | Slides |
|---|---|
| Especificação de todos os casos de uso | 8, 9, 10 |
| Diagrama de classe | 11 |
| Diagrama de pacote (com arquitetura) | 12 |
| Protótipo codificado: tela principal | 13 |
| Protótipo codificado: CRUDs básicos | 14, 15 |

---

## 8. Casos de uso

| ID | Caso de uso | Ator |
|---|---|---|
| UC01 | Cadastrar-se | Cliente, Profissional |
| UC02 | Agendar atendimento | Cliente |
| UC03 | Consultar meus Agendamentos | Cliente |
| UC04 | Cancelar Agendamento | Cliente |
| UC05 | Manter serviço | Profissional |
| UC06 | Manter disponibilidade | Profissional |
| UC07 | Consultar agenda | Profissional |
| UC08 | Atualizar Status do agendamento | Profissional |
| UC09 | Ver dashboard | Profissional |

> **Fala:** "São nove casos de uso, os mesmos do diagrama no Astah. Cada um está especificado no repositório com pré-condições, fluxo principal, fluxos alternativos, exceções e pós-condições."

## 9. Especificação — UC02 Agendar atendimento

- **Ator:** Cliente. **Pré-condição:** autenticado; existe serviço ativo com disponibilidade.
- **Fluxo principal:** pesquisa o serviço → escolhe o dia → o sistema calcula os horários livres (disponibilidade − agendamentos ativos, considerando a duração) → escolhe o horário → confirma → o sistema verifica de novo e grava como AGENDADO com o preço do momento.
- **Alternativo:** dia sem horários → sugere outro dia.
- **Exceções:** horário ocupado na confirmação; serviço desativado durante o processo.
- **Pós-condição:** agendamento AGENDADO, `fim = início + duração`, preço congelado.

> **Fala:** "Este é o caso de uso central. O ponto principal é que o cliente só vê horários realmente livres."

## 10. Especificação — demais casos de uso (resumo)

| UC | Fluxo principal em uma linha | Exceção principal |
|---|---|---|
| UC01 | Escolhe o tipo de conta, informa dados, sistema cria a conta | E-mail já cadastrado |
| UC03 | Lista próximos e histórico com estado de cada um | Nenhum agendamento |
| UC04 | Cancela com confirmação; horário volta a ficar livre | Menos de 2 h para o início |
| UC05 | Cadastra, edita, ativa/desativa e exclui serviços | Serviço com agendamentos só pode ser desativado |
| UC06 | Cadastra, edita e remove faixas semanais | Faixa sobreposta ou fim antes do início |
| UC07 | Mostra o dia em ordem de horário | Dia sem atendimentos |
| UC08 | Conclui (entra no faturamento) ou registra falta | Falta antes do horário de início |
| UC09 | Faturamento dos concluídos, comparecimento, cancelamentos | Sem movimento no período |

> **Fala:** "A especificação completa está em `docs/especificacao_casos_de_uso.md`."

## 11. Diagrama de classes

Imagem: `docs/diagramas/classes.png` (ou exportada do Astah).

- `Cliente` e `Profissional` especializam `Usuario`.
- `Profissional` oferece `Servico` e define `Disponibilidade` (composição).
- `Agendamento` liga cliente, serviço e `StatusAgendamento`.
- Regras no modelo: `podeCancelar` (2 h), `estaDisponivel` (sem sobreposição), `valor` copiado do preço.

## 12. Diagrama de pacotes e arquitetura

Imagem: `docs/diagramas/pacotes.png`.

- Cliente-servidor em camadas: React (pages → components/services → types) chama a API REST via JSON.
- Backend Spring Boot: `controller → service → repository → model`, com `dto` na fronteira e `config` para segurança.
- PostgreSQL acessado por JPA/Hibernate.

## 13. Protótipo — Tela principal

Imagem: `docs/prototipo/inicio-agendando.png`.

- Busca por serviço ou profissional e filtro por categoria.
- Painel lateral com os próximos 7 dias e só os horários livres.
- Resumo com início, fim e valor garantido antes de confirmar.

> **Fala (demonstração):** abrir `/#/inicio`, escolher "Corte degradê", trocar de dia, escolher um horário e confirmar. Depois mostrar em "Meus agendamentos".

## 14. Protótipo — CRUD de serviços

Imagem: `docs/prototipo/servicos-edicao.png`.

- Lista com duração, preço e situação (ativo/inativo).
- Cadastro e edição no painel ao lado, com validação junto de cada campo.
- Exclusão com confirmação; serviço com histórico só pode ser desativado.

## 15. Protótipo — CRUD de disponibilidade

Imagem: `docs/prototipo/disponibilidade-nova-faixa.png`.

- Semana de segunda a domingo, com a régua do dia mostrando as faixas.
- Adicionar, editar e remover faixas; bloqueia sobreposição e horário inválido.

## 16. Protótipo — Agenda e dashboard (extra)

Imagens: `docs/prototipo/agenda.png` e `docs/prototipo/dashboard.png`.

- Agenda como linha do tempo do dia, com marcador do horário atual e ações de concluir, faltou e cancelar.
- Dashboard com faturamento dos concluídos, comparecimento e faturamento por serviço.

## 17. Próximos passos (Etapa 3)

- Ligar o frontend à API REST (hoje os dados ficam no navegador).
- Autenticação com Spring Security e telas de cadastro/login (UC01).
- Testes de horários livres, conflito e cancelamento com 2 h.
