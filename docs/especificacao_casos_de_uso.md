# Especificação dos Casos de Uso

Esta especificação descreve **todos os casos de uso** do diagrama modelado no Astah UML (`Projeto_Agenda.asta`, pacote `1.Analise › Modelo de Casos de Uso`). Os nomes e a quantidade de casos de uso seguem exatamente o diagrama.

## 1. Visão geral

| ID | Caso de uso | Ator | Tela do protótipo |
|---|---|---|---|
| UC01 | Cadastrar-se | Cliente, Profissional | — (fora do protótipo da Etapa 2) |
| UC02 | Agendar atendimento | Cliente | Tela principal › Agendar |
| UC03 | Consultar meus Agendamentos | Cliente | Meus agendamentos |
| UC04 | Cancelar Agendamento | Cliente | Meus agendamentos › Cancelar |
| UC05 | Manter serviço | Profissional | Serviços (CRUD) |
| UC06 | Manter disponibilidade | Profissional | Disponibilidade (CRUD) |
| UC07 | Consultar agenda | Profissional | Agenda |
| UC08 | Atualizar Status do agendamento | Profissional | Agenda › Concluir / Registrar falta |
| UC09 | Ver dashboard | Profissional | Dashboard |

### Regras de negócio

| ID | Regra |
|---|---|
| RN01 | O horário agendado deve estar dentro de uma faixa de disponibilidade do profissional. |
| RN02 | Não pode haver sobreposição com outro agendamento ativo do mesmo profissional (`fim = início + duração do serviço`). |
| RN03 | O cliente só cancela com pelo menos 2 horas de antecedência. |
| RN04 | Ao marcar como CONCLUÍDO, o valor do agendamento entra no faturamento. |
| RN05 | O preço é congelado no agendamento: reajustes posteriores do serviço não alteram agendamentos existentes. |
| RN06 | Apenas agendamentos no estado AGENDADO podem ser cancelados, concluídos ou receber falta. |

### Estados do agendamento

`AGENDADO` → `CONCLUIDO` | `CANCELADO` | `FALTOU`. Todo agendamento nasce AGENDADO; os outros três estados são finais.

---

## 2. Especificação dos casos de uso

### UC01 - Cadastrar-se

**Atores:** Cliente e Profissional.

**Objetivo:** Permitir que clientes e profissionais criem suas contas e acessem o sistema com e-mail e senha.

#### Pré-condições
- O sistema deve estar disponível.
- Para entrar no sistema, o usuário deve possuir uma conta cadastrada.

#### Fluxo principal - Cadastro
1. O usuário acessa a opção de cadastro.
2. O sistema apresenta o formulário de cadastro.
3. O usuário escolhe o tipo de conta: Cliente ou Profissional.
4. O usuário informa nome, e-mail, telefone e senha.
5. Se for Profissional, o sistema solicita também a especialidade.
6. O usuário confirma o envio.
7. O sistema valida os dados e verifica se o e-mail já está em uso.
8. O sistema cria o `Usuario` e o perfil correspondente (`Cliente` ou `Profissional`).
9. O sistema confirma o cadastro e direciona o usuário para a área do seu perfil.

#### Fluxo alternativo 1 - Entrar com conta existente
1. O usuário acessa a página de login.
2. O usuário informa e-mail e senha.
3. O sistema verifica as credenciais.
4. O sistema identifica o papel do usuário (CLIENTE ou PROFISSIONAL).
5. O sistema inicia uma sessão autenticada e direciona o usuário para a área correspondente.

#### Fluxos de exceção
- **E1 - Dados inválidos:** campo obrigatório vazio ou e-mail mal formatado; o sistema indica os campos a corrigir.
- **E2 - E-mail já cadastrado:** o sistema impede o cadastro e informa que já existe uma conta com esse e-mail.
- **E3 - Credenciais incorretas:** o sistema informa que o e-mail ou a senha não conferem, sem dizer qual dos dois.
- **E4 - Falha no sistema:** o sistema informa que a operação não foi concluída e não cria conta incompleta.

#### Pós-condições
- Cadastro: existe um novo `Usuario` vinculado a um `Cliente` ou `Profissional`.
- Login: o usuário tem uma sessão ativa com acesso às funções do seu papel.

---

### UC02 - Agendar atendimento

**Ator:** Cliente.

**Objetivo:** Permitir que o cliente encontre um serviço, escolha um horário livre do profissional e confirme o agendamento sozinho.

#### Pré-condições
- O cliente deve estar autenticado.
- Deve existir pelo menos um serviço ativo com profissional que tenha disponibilidade configurada.

#### Fluxo principal
1. O cliente acessa a tela principal.
2. O sistema apresenta os serviços ativos, com profissional, categoria, duração e preço.
3. O cliente pesquisa por nome do serviço ou do profissional e, se quiser, filtra por categoria.
4. O sistema apresenta os serviços que correspondem à busca.
5. O cliente seleciona o serviço desejado.
6. O cliente escolhe uma data.
7. O sistema calcula os horários livres do dia: faixas de disponibilidade do profissional (RN01) menos os horários já ocupados por agendamentos AGENDADO, considerando a duração do serviço (RN02).
8. O cliente seleciona um horário livre.
9. O sistema apresenta o resumo: serviço, profissional, data, início, término previsto e preço.
10. O cliente confirma.
11. O sistema verifica novamente a disponibilidade do horário.
12. O sistema registra o `Agendamento` no estado AGENDADO, copiando o preço atual do serviço (RN05).
13. O sistema confirma o agendamento e o horário passa a aparecer ocupado na agenda do profissional.

#### Fluxo alternativo 1 - Nenhum horário livre na data
1. No passo 7, o sistema não encontra horários livres.
2. O sistema informa que não há horários nesta data e sugere escolher outra.
3. O cliente escolhe outra data e o fluxo volta ao passo 7.

#### Fluxo alternativo 2 - Desistência
1. Antes do passo 10, o cliente fecha o painel de agendamento.
2. O sistema descarta a seleção sem registrar nada.

#### Fluxos de exceção
- **E1 - Nenhum serviço encontrado:** o sistema informa que a busca não teve resultados e oferece limpar os filtros.
- **E2 - Horário ocupado na confirmação:** outro cliente reservou o horário entre os passos 8 e 11; o sistema informa o conflito e recarrega os horários livres.
- **E3 - Horário no passado:** o sistema não oferece horários anteriores ao momento atual.
- **E4 - Serviço desativado durante o processo:** o sistema impede a confirmação e informa que o serviço não está mais disponível.

#### Pós-condições
- Existe um novo agendamento AGENDADO associado ao cliente, ao profissional e ao serviço.
- `fim = início + duração do serviço` e `valor` igual ao preço do serviço no momento da confirmação.
- O intervalo deixa de ser oferecido para novos agendamentos do mesmo profissional.

---

### UC03 - Consultar meus Agendamentos

**Ator:** Cliente.

**Objetivo:** Permitir que o cliente acompanhe os agendamentos que fez e o estado de cada um.

#### Pré-condições
- O cliente deve estar autenticado.

#### Fluxo principal
1. O cliente acessa "Meus agendamentos".
2. O sistema consulta os agendamentos do cliente.
3. O sistema apresenta primeiro os próximos (AGENDADO), em ordem cronológica, e depois o histórico.
4. Para cada agendamento, o sistema mostra serviço, profissional, data, horário, valor e estado.
5. Para cada agendamento AGENDADO, o sistema indica se ainda pode ser cancelado (RN03).

#### Fluxo alternativo 1 - Histórico
1. O cliente consulta a seção de histórico.
2. O sistema apresenta os agendamentos CONCLUIDO, CANCELADO e FALTOU.

#### Fluxos de exceção
- **E1 - Nenhum agendamento:** o sistema informa que ainda não há agendamentos e oferece o caminho para agendar (UC02).
- **E2 - Falha ao carregar:** o sistema informa que não foi possível carregar a lista.

#### Pós-condições
- Nenhum dado é alterado pela consulta.
- O cliente pode iniciar o cancelamento de um agendamento elegível (UC04).

---

### UC04 - Cancelar Agendamento

**Ator:** Cliente.

**Objetivo:** Permitir que o cliente cancele um agendamento respeitando a antecedência mínima de 2 horas.

#### Pré-condições
- O cliente deve estar autenticado.
- O agendamento pertence ao cliente e está AGENDADO (RN06).

#### Fluxo principal
1. Em "Meus agendamentos", o cliente seleciona "Cancelar" em um agendamento.
2. O sistema verifica se faltam pelo menos 2 horas para o início (RN03).
3. O sistema pede a confirmação, mostrando serviço, data e horário.
4. O cliente confirma.
5. O sistema altera o estado para CANCELADO.
6. O sistema libera o horário na agenda do profissional e confirma a operação.

#### Fluxo alternativo 1 - Desistência
1. No passo 3, o cliente escolhe manter o agendamento.
2. O agendamento permanece AGENDADO.

#### Fluxos de exceção
- **E1 - Menos de 2 horas para o início:** o sistema não oferece o cancelamento e informa o motivo.
- **E2 - Estado incompatível:** agendamento já concluído, cancelado ou com falta; o sistema impede a operação.
- **E3 - Falha ao salvar:** o sistema informa o erro e mantém o estado anterior.

#### Pós-condições
- O agendamento está CANCELADO e o intervalo volta a ficar livre.
- O valor não entra no faturamento do profissional.

---

### UC05 - Manter serviço

**Ator:** Profissional.

**Objetivo:** Permitir que o profissional cadastre, consulte, edite, ative/desative e exclua os serviços que oferece (CRUD).

#### Pré-condições
- O profissional deve estar autenticado.

#### Fluxo principal - Cadastrar serviço
1. O profissional acessa "Serviços".
2. O sistema lista os serviços do profissional com nome, categoria, duração, preço e situação.
3. O profissional seleciona "Novo serviço".
4. O sistema apresenta o formulário.
5. O profissional informa nome, categoria, descrição, duração (minutos) e preço.
6. O sistema valida os dados (nome obrigatório, duração > 0, preço ≥ 0).
7. O sistema salva o serviço como ativo e o mostra na lista.

#### Fluxo alternativo 1 - Editar serviço
1. O profissional seleciona "Editar" em um serviço.
2. O sistema apresenta o formulário preenchido.
3. O profissional altera os campos e salva.
4. O sistema valida e atualiza o serviço. Agendamentos já feitos mantêm o preço antigo (RN05).

#### Fluxo alternativo 2 - Ativar ou desativar
1. O profissional altera a situação de um serviço.
2. O sistema atualiza o campo `ativo`. Serviços inativos deixam de aparecer na tela principal.

#### Fluxo alternativo 3 - Excluir serviço
1. O profissional seleciona "Excluir".
2. O sistema pede confirmação.
3. O profissional confirma e o sistema remove o serviço.

#### Fluxos de exceção
- **E1 - Dados inválidos:** o sistema indica os campos a corrigir junto a cada campo.
- **E2 - Serviço com agendamentos:** o sistema impede a exclusão e sugere desativar, preservando o histórico.
- **E3 - Falha ao salvar:** o sistema informa o erro e mantém os dados anteriores.

#### Pós-condições
- O catálogo do profissional reflete a operação realizada.
- Só serviços ativos podem ser agendados (UC02).

---

### UC06 - Manter disponibilidade

**Ator:** Profissional.

**Objetivo:** Permitir que o profissional cadastre, edite e remova as faixas semanais em que atende (CRUD de `Disponibilidade`).

#### Pré-condições
- O profissional deve estar autenticado.

#### Fluxo principal - Adicionar faixa
1. O profissional acessa "Disponibilidade".
2. O sistema apresenta a semana, de segunda a domingo, com as faixas cadastradas em cada dia.
3. O profissional adiciona uma faixa informando dia da semana, hora de início e hora de fim.
4. O sistema valida que `horaFim > horaInicio` e que a faixa não se sobrepõe a outra do mesmo dia.
5. O sistema salva a faixa e atualiza a semana.

#### Fluxo alternativo 1 - Editar faixa
1. O profissional seleciona uma faixa e altera os horários.
2. O sistema valida e salva.

#### Fluxo alternativo 2 - Remover faixa
1. O profissional remove uma faixa.
2. O sistema exclui a faixa; agendamentos já existentes nesse intervalo são preservados.

#### Fluxos de exceção
- **E1 - Horário inválido:** fim igual ou anterior ao início; o sistema informa e não salva.
- **E2 - Sobreposição:** a faixa se sobrepõe a outra do mesmo dia; o sistema informa e não salva.
- **E3 - Falha ao salvar:** o sistema informa o erro e mantém a configuração anterior.

#### Pós-condições
- Os horários livres oferecidos no UC02 passam a respeitar a nova configuração.

---

### UC07 - Consultar agenda

**Ator:** Profissional.

**Objetivo:** Permitir que o profissional veja os atendimentos de um dia em ordem cronológica.

#### Pré-condições
- O profissional deve estar autenticado.

#### Fluxo principal
1. O profissional acessa "Agenda".
2. O sistema seleciona o dia atual.
3. O sistema lista os agendamentos do profissional naquele dia, por horário, com cliente, serviço, início, fim, valor e estado.
4. O profissional pode selecionar um agendamento para atualizar o estado (UC08).

#### Fluxo alternativo 1 - Outro dia
1. O profissional navega para o dia anterior ou seguinte, ou escolhe uma data.
2. O sistema lista os agendamentos da data escolhida.

#### Fluxos de exceção
- **E1 - Dia sem agendamentos:** o sistema informa que não há atendimentos e mostra a disponibilidade configurada para o dia.
- **E2 - Falha ao carregar:** o sistema informa o erro.

#### Pós-condições
- Nenhum dado é alterado pela consulta.

---

### UC08 - Atualizar Status do agendamento

**Ator:** Profissional.

**Objetivo:** Permitir que o profissional marque um atendimento como concluído ou registre a falta do cliente.

#### Pré-condições
- O profissional deve estar autenticado.
- O agendamento pertence ao profissional e está AGENDADO (RN06).

#### Fluxo principal - Concluir atendimento
1. Na agenda, o profissional seleciona "Concluir" em um agendamento.
2. O sistema altera o estado para CONCLUIDO.
3. O valor do agendamento passa a compor o faturamento (RN04).
4. O sistema atualiza a agenda e o dashboard.

#### Fluxo alternativo 1 - Registrar falta
1. Na agenda, o profissional seleciona "Registrar falta".
2. O sistema verifica se o horário de início já passou.
3. O sistema altera o estado para FALTOU. O valor não entra no faturamento.

#### Fluxo alternativo 2 - Cancelar pelo profissional
1. O profissional seleciona "Cancelar" em um agendamento futuro.
2. O sistema pede confirmação e altera o estado para CANCELADO, liberando o horário.

#### Fluxos de exceção
- **E1 - Estado incompatível:** o agendamento já está em estado final; o sistema impede a operação.
- **E2 - Falta antes do horário:** o sistema impede registrar falta para um atendimento que ainda não começou.
- **E3 - Falha ao salvar:** o sistema informa o erro e mantém o estado anterior.

#### Pós-condições
- O agendamento está em um estado final (CONCLUIDO, FALTOU ou CANCELADO).

---

### UC09 - Ver dashboard

**Ator:** Profissional.

**Objetivo:** Permitir que o profissional acompanhe o faturamento do mês e os números dos seus atendimentos.

#### Pré-condições
- O profissional deve estar autenticado.

#### Fluxo principal
1. O profissional acessa "Dashboard".
2. O sistema consulta os agendamentos do profissional no mês atual.
3. O sistema calcula:
   - faturamento do mês: soma de `valor` dos agendamentos CONCLUIDO (RN04);
   - atendimentos concluídos, agendados, cancelados e faltas;
   - taxa de comparecimento: concluídos ÷ (concluídos + faltas).
4. O sistema apresenta os indicadores e a lista de atendimentos faturados.

#### Fluxo alternativo 1 - Sem movimentação
1. O sistema não encontra agendamentos no mês.
2. O sistema mostra os indicadores zerados e explica que eles aparecem quando houver atendimentos concluídos.

#### Fluxos de exceção
- **E1 - Falha no cálculo:** o sistema informa que não foi possível gerar os indicadores.

#### Pós-condições
- Nenhum dado é alterado pela consulta.
- Os números consideram apenas os agendamentos do profissional autenticado.
