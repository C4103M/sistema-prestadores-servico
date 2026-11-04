# Especificação dos Casos de Uso

## 1. Regras gerais do sistema

Antes da descrição dos casos de uso, são estabelecidas algumas regras gerais para garantir a consistência das funcionalidades:

- O sistema possui dois atores principais: **Cliente** e **Profissional**.
- O Cliente pode pesquisar profissionais e serviços, consultar horários disponíveis, realizar agendamentos, acompanhar seus agendamentos e cancelá-los.
- O Profissional pode cadastrar e gerenciar seus serviços, configurar sua disponibilidade, visualizar sua agenda, concluir atendimentos, registrar faltas e consultar informações sobre seu desempenho.
- Cada agendamento deve estar associado a um cliente, um profissional, um serviço, uma data e um horário.
- Um mesmo profissional não pode possuir dois agendamentos para horários incompatíveis.
- A disponibilidade do profissional deve considerar seus horários de atendimento, bloqueios de agenda e agendamentos existentes.
- Um agendamento confirmado não pode ser realizado em um horário que já esteja ocupado ou bloqueado.
- Os agendamentos devem possuir estados que permitam acompanhar seu andamento: **Confirmado, Concluído, Cancelado** e **Falta registrada**.

---

## 2. Especificação dos casos de uso

### UC01 - Cadastrar e Autenticar

**Ator principal:** Cliente e Profissional.

**Objetivo:** Permitir que clientes e profissionais criem suas contas e acessem o sistema por meio de autenticação de usuário.

#### Pré-condições
- O sistema deve estar disponível.
- O usuário deve possuir acesso à página de cadastro ou login.
- Para realizar a autenticação, o usuário deve possuir uma conta previamente cadastrada.

#### Fluxo principal - Cadastro
1. O usuário acessa a opção de cadastro.
2. O sistema apresenta o formulário de cadastro.
3. O usuário seleciona o tipo de conta que deseja criar: Cliente ou Profissional.
4. O usuário preenche as informações solicitadas.
5. Caso seja um Profissional, o sistema solicita também as informações necessárias para identificar sua área de atuação.
6. O usuário confirma o envio do formulário.
7. O sistema valida os dados informados.
8. O sistema verifica se o e-mail informado já está vinculado a outra conta.
9. O sistema registra os dados do usuário e cria sua conta.
10. O sistema apresenta uma mensagem de confirmação do cadastro.

#### Fluxo alternativo - Autenticação
1. O usuário acessa a página de login.
2. O sistema apresenta os campos de e-mail e senha.
3. O usuário informa suas credenciais.
4. O usuário seleciona a opção de entrar.
5. O sistema verifica se as credenciais correspondem a uma conta cadastrada.
6. O sistema identifica o tipo de usuário.
7. O sistema inicia uma sessão autenticada.
8. O sistema direciona o usuário para a área correspondente ao seu perfil.

#### Fluxos de exceção
- **E1 - Dados inválidos:** Caso algum campo obrigatório esteja vazio ou preenchido incorretamente, o sistema informa quais campos precisam ser corrigidos e solicita uma nova tentativa.
- **E2 - E-mail já cadastrado:** Caso o e-mail informado já esteja associado a outra conta, o sistema impede o cadastro e informa a existência de uma conta vinculada.
- **E3 - Credenciais incorretas:** Caso o e-mail ou a senha estejam incorretos, o sistema informa que não foi possível realizar a autenticação.
- **E4 - Falha no sistema:** Caso ocorra um erro durante o cadastro ou login, o sistema informa que a operação não pôde ser concluída e não cria uma sessão ou conta incompleta.

#### Pós-condições
- No cadastro, uma nova conta de Cliente ou Profissional estará registrada no sistema.
- Na autenticação, o usuário terá uma sessão ativa e acesso às funcionalidades correspondentes ao seu perfil.

---

### UC02 - Pesquisar Serviços/Profissão

**Ator principal:** Cliente.

**Objetivo:** Permitir que o cliente encontre profissionais e serviços disponíveis no sistema de acordo com sua necessidade.

#### Pré-condições
- O sistema deve estar disponível.
- Deve existir pelo menos um profissional cadastrado com serviços disponíveis para que sejam apresentados resultados.
- Os serviços devem estar ativos e vinculados aos respectivos profissionais.

#### Fluxo principal
1. O cliente acessa a funcionalidade de pesquisa.
2. O sistema apresenta um campo para pesquisa de serviços ou profissões.
3. O cliente informa o nome de um serviço, profissão ou especialidade que deseja encontrar.
4. O cliente confirma a pesquisa.
5. O sistema consulta os profissionais cadastrados e seus respectivos serviços ativos.
6. O sistema identifica os resultados que correspondem aos termos informados.
7. O sistema apresenta uma lista de profissionais encontrados.
8. Para cada resultado, o sistema apresenta informações relevantes, como nome do profissional, profissão, serviços oferecidos e valores, quando disponíveis.
9. O cliente seleciona um profissional ou serviço para visualizar seus detalhes.
10. O sistema apresenta as informações completas do profissional e os serviços oferecidos.

#### Fluxo alternativo 1 - Pesquisa utilizando filtros
1. Durante a pesquisa, o cliente seleciona um ou mais filtros disponíveis.
2. O sistema apresenta os critérios de filtragem, como categoria profissional, localização ou faixa de preço, caso estejam disponíveis.
3. O cliente seleciona os filtros desejados.
4. O sistema aplica os critérios selecionados à pesquisa.
5. O sistema apresenta os resultados correspondentes.

#### Fluxo alternativo 2 - Visualização de todos os profissionais
1. O cliente acessa a área de pesquisa sem informar um termo específico.
2. O sistema apresenta os profissionais e serviços ativos cadastrados.
3. O cliente pode selecionar um dos resultados para consultar suas informações.

#### Fluxos de exceção
- **E1 - Nenhum resultado encontrado:** Caso não existam profissionais ou serviços compatíveis com a pesquisa, o sistema apresenta uma mensagem informando que nenhum resultado foi encontrado.
- **E2 - Pesquisa inválida:** Caso o cliente informe termos inválidos ou utilize filtros incompatíveis, o sistema solicita a correção dos critérios.
- **E3 - Falha na consulta:** Caso ocorra uma falha ao consultar os dados, o sistema informa que não foi possível realizar a pesquisa.

#### Pós-condições
- O cliente terá acesso à lista de profissionais e serviços compatíveis com os critérios informados.
- Nenhum agendamento será criado durante a pesquisa.
- O cliente poderá prosseguir para a consulta dos horários disponíveis de um profissional.

---

### UC03 - Consultar Horários Livres

**Ator principal:** Cliente.

**Objetivo:** Permitir que o cliente visualize os horários disponíveis na agenda de um profissional antes de realizar um agendamento.

#### Pré-condições
- O sistema deve estar disponível.
- O profissional deve estar cadastrado e possuir pelo menos um serviço ativo.
- O profissional deve ter configurado sua disponibilidade de atendimento.
- O cliente deve ter selecionado um profissional e um serviço.

#### Fluxo principal
1. O cliente acessa o perfil de um profissional.
2. O sistema apresenta os serviços oferecidos pelo profissional.
3. O cliente seleciona o serviço desejado.
4. O sistema apresenta uma opção para consultar os horários disponíveis.
5. O cliente informa a data ou o período em que deseja realizar o atendimento.
6. O sistema consulta a disponibilidade configurada pelo profissional.
7. O sistema verifica os agendamentos existentes e os horários bloqueados.
8. O sistema considera a duração do serviço selecionado para determinar os horários que podem ser ocupados.
9. O sistema apresenta ao cliente uma lista ou calendário com os horários livres.
10. O cliente seleciona um horário de interesse.

#### Fluxo alternativo 1 - Alteração da data de consulta
1. O cliente verifica os horários apresentados.
2. Caso não encontre um horário adequado, seleciona outra data ou período.
3. O sistema realiza uma nova consulta à agenda do profissional.
4. O sistema apresenta os horários disponíveis para a nova data.

#### Fluxo alternativo 2 - Nenhum horário disponível na data
1. O cliente seleciona uma data para consulta.
2. O sistema verifica que não existem horários livres nessa data.
3. O sistema informa que não há disponibilidade.
4. O sistema oferece a possibilidade de consultar outras datas.
5. O cliente seleciona uma nova data.
6. O sistema apresenta os horários correspondentes, caso existam.

#### Fluxos de exceção
- **E1 - Profissional sem disponibilidade configurada:** Caso o profissional ainda não tenha definido seus horários de atendimento, o sistema informa que não existem horários disponíveis para consulta.
- **E2 - Serviço desativado:** Caso o serviço selecionado tenha sido desativado, o sistema informa que ele não pode mais ser agendado.
- **E3 - Falha ao consultar a agenda:** Caso ocorra um erro na consulta, o sistema informa que não foi possível carregar os horários disponíveis.

#### Pós-condições
- O cliente terá visualizado os horários disponíveis para o serviço selecionado.
- Nenhum horário terá sido reservado ou ocupado apenas pela consulta.
- O cliente poderá selecionar um horário e prosseguir para a realização do agendamento.

---

### UC04 - Realizar Agendamento

**Ator principal:** Cliente.

**Objetivo:** Permitir que o cliente reserve um horário disponível na agenda de um profissional para realizar determinado serviço.

#### Pré-condições
- O cliente deve possuir uma conta cadastrada e estar autenticado.
- O profissional deve estar cadastrado e possuir o serviço selecionado ativo.
- O serviço deve possuir informações válidas, incluindo duração e valor, quando aplicável.
- O horário desejado deve estar disponível na agenda do profissional.
- O horário não pode estar bloqueado ou ocupado por outro agendamento.

#### Fluxo principal
1. O cliente acessa o perfil do profissional desejado.
2. O cliente seleciona o serviço que deseja contratar.
3. O sistema apresenta as informações do serviço, incluindo descrição, duração e valor, quando disponíveis.
4. O cliente seleciona a opção de consultar horários.
5. O sistema apresenta os horários livres na agenda do profissional.
6. O cliente seleciona a data e o horário desejados.
7. O sistema apresenta um resumo do agendamento, contendo o profissional, serviço, data, horário e valor.
8. O cliente verifica as informações apresentadas.
9. O cliente confirma a solicitação de agendamento.
10. O sistema realiza uma nova verificação da disponibilidade do horário.
11. O sistema registra o agendamento e associa os dados do cliente, profissional e serviço.
12. O sistema atualiza a agenda do profissional, marcando o horário como ocupado.
13. O sistema altera o estado do agendamento para **Confirmado**.
14. O sistema apresenta uma mensagem informando que o agendamento foi realizado com sucesso.

#### Fluxo alternativo 1 - Alteração do horário antes da confirmação
1. O cliente seleciona um horário disponível.
2. Antes de confirmar o agendamento, o cliente decide escolher outro horário.
3. O sistema retorna à visualização da agenda.
4. O cliente seleciona uma nova data ou horário.
5. O sistema atualiza o resumo do agendamento.
6. O cliente prossegue com a confirmação.

#### Fluxo alternativo 2 - Cancelamento da operação pelo cliente
1. O cliente inicia o processo de agendamento.
2. Antes da confirmação final, o cliente seleciona a opção de voltar ou desistir.
3. O sistema interrompe o processo.
4. O sistema retorna à página anterior sem registrar o agendamento.

#### Fluxos de exceção
- **E1 - Horário ocupado:** Caso o horário seja reservado por outro cliente antes da confirmação, o sistema informa que ele não está mais disponível e solicita que o cliente selecione outro horário.
- **E2 - Serviço indisponível:** Caso o profissional desative o serviço durante o processo, o sistema impede a conclusão do agendamento.
- **E3 - Falha ao salvar:** Caso ocorra um erro durante o registro, o sistema informa que o agendamento não foi concluído e mantém o horário disponível, desde que nenhuma outra reserva tenha sido realizada.

#### Pós-condições
- Um novo agendamento estará registrado no sistema.
- O agendamento estará associado ao cliente, ao profissional e ao serviço escolhido.
- O estado do agendamento será **Confirmado**.
- O horário correspondente estará indisponível para novos agendamentos incompatíveis.
- O cliente poderá consultar o agendamento por meio da funcionalidade de acompanhamento.

---

### UC05 - Acompanhar Agendamento

**Ator principal:** Cliente.

**Objetivo:** Permitir que o cliente consulte os agendamentos realizados e acompanhe suas informações e respectivos estados.

#### Pré-condições
- O cliente deve possuir uma conta cadastrada e estar autenticado.
- O cliente deve possuir pelo menos um agendamento registrado para visualizar informações.

#### Fluxo principal
1. O cliente acessa sua área pessoal.
2. O cliente seleciona a opção de acompanhar agendamentos.
3. O sistema consulta os agendamentos vinculados à conta do cliente.
4. O sistema apresenta uma lista dos agendamentos encontrados.
5. Para cada agendamento, o sistema apresenta informações como profissional, serviço, data, horário e estado atual.
6. O cliente seleciona um agendamento para visualizar seus detalhes.
7. O sistema apresenta todas as informações disponíveis sobre o agendamento selecionado.
8. O cliente verifica a situação do atendimento.

#### Fluxo alternativo 1 - Consultar agendamentos anteriores
1. O cliente acessa a lista de agendamentos.
2. O cliente seleciona a opção de visualizar o histórico.
3. O sistema apresenta os agendamentos anteriores, incluindo os concluídos, cancelados e aqueles em que houve registro de falta.
4. O cliente seleciona um registro para consultar seus detalhes.

#### Fluxos de exceção
- **E1 - Nenhum agendamento encontrado:** Caso o cliente ainda não tenha realizado agendamentos, o sistema informa que não existem registros disponíveis.
- **E2 - Agendamento inexistente:** Caso o cliente tente acessar um agendamento que não existe ou não pertence à sua conta, o sistema impede a visualização.
- **E3 - Falha ao carregar informações:** Caso ocorra uma falha na consulta, o sistema informa que não foi possível carregar os agendamentos.

#### Pós-condições
- O cliente terá visualizado as informações e o estado dos seus agendamentos.
- Nenhuma informação do agendamento será alterada apenas pela consulta.
- O cliente poderá prosseguir para o cancelamento de um agendamento que ainda esteja elegível para essa operação.

---

### UC06 - Cancelar Agendamento

**Ator principal:** Cliente.

**Objetivo:** Permitir que o cliente cancele um agendamento previamente realizado, respeitando as regras e os prazos de cancelamento estabelecidos pelo sistema.

#### Pré-condições
- O cliente deve estar autenticado.
- Deve existir um agendamento vinculado à conta do cliente.
- O agendamento deve estar no estado **Confirmado**.
- O cancelamento deve respeitar o prazo mínimo de 2 horas antes do horário marcado.
- O agendamento não pode ter sido concluído, cancelado ou ter recebido um registro de falta.

#### Fluxo principal
1. O cliente acessa sua área pessoal.
2. O cliente seleciona a opção de acompanhar agendamentos.
3. O sistema apresenta a lista de agendamentos do cliente.
4. O cliente seleciona o agendamento que deseja cancelar.
5. O sistema apresenta os detalhes do agendamento.
6. O cliente seleciona a opção de cancelar.
7. O sistema verifica se o agendamento está dentro do prazo permitido para cancelamento.
8. O sistema apresenta uma mensagem solicitando a confirmação da operação.
9. O cliente confirma o cancelamento.
10. O sistema altera o estado do agendamento para **Cancelado**.
11. O sistema libera o horário na agenda do profissional, desde que não exista outro bloqueio ou impedimento.
12. O sistema apresenta uma mensagem informando que o cancelamento foi realizado com sucesso.

#### Fluxo alternativo 1 - Desistência do cancelamento
1. O cliente seleciona a opção de cancelar um agendamento.
2. O sistema solicita a confirmação da operação.
3. O cliente seleciona a opção de voltar ou desistir.
4. O sistema interrompe o processo.
5. O agendamento permanece confirmado e não sofre alterações.

#### Fluxo alternativo 2 - Cancelamento fora do prazo mínimo
1. O cliente seleciona um agendamento para cancelar.
2. O sistema verifica a data e o horário do atendimento.
3. O sistema identifica que o prazo mínimo para cancelamento já foi ultrapassado.
4. O sistema informa que o cancelamento não pode ser realizado diretamente pela funcionalidade.
5. O sistema orienta o cliente sobre os procedimentos disponíveis.

#### Fluxos de exceção
- **E1 - Agendamento inexistente:** Caso o agendamento selecionado não exista ou não pertença ao cliente autenticado, o sistema impede a operação.
- **E2 - Agendamento já cancelado:** Caso o agendamento já esteja cancelado, o sistema informa que não é possível repetir a operação.
- **E3 - Atendimento já concluído:** Caso o agendamento tenha sido concluído, o sistema impede o cancelamento.
- **E4 - Falta registrada:** Caso já exista um registro de falta para o agendamento, o sistema impede seu cancelamento.
- **E5 - Falha ao atualizar o estado:** Caso ocorra um erro durante o cancelamento, o sistema informa que a operação não foi concluída e preserva o estado anterior do agendamento.

#### Pós-condições
- O agendamento terá seu estado alterado para **Cancelado**, caso a operação seja concluída.
- O horário anteriormente ocupado será liberado para novos agendamentos, respeitando as regras de disponibilidade.
- O cancelamento será registrado no histórico do cliente e do profissional.
- Caso a operação não seja permitida, o agendamento permanecerá inalterado.

---

### UC07 - Gerenciar Serviços

**Ator principal:** Profissional.

**Objetivo:** Permitir que o profissional cadastre, consulte, altere e desative os serviços que oferece aos clientes.

#### Pré-condições
- O profissional deve possuir uma conta cadastrada e estar autenticado.
- O profissional deve possuir permissão para acessar a funcionalidade de gerenciamento de serviços.

#### Fluxo principal - Cadastro de serviço
1. O profissional acessa sua área pessoal.
2. O profissional seleciona a opção de gerenciar serviços.
3. O sistema apresenta a lista de serviços já cadastrados.
4. O profissional seleciona a opção de adicionar um novo serviço.
5. O sistema apresenta um formulário de cadastro.
6. O profissional informa os dados do serviço, como nome, descrição, duração e valor.
7. O profissional confirma o cadastro.
8. O sistema valida as informações fornecidas.
9. O sistema registra o novo serviço e o associa à conta do profissional.
10. O sistema apresenta uma mensagem de confirmação.

#### Fluxo alternativo 1 - Edição de serviço
1. O profissional acessa a lista de serviços cadastrados.
2. O profissional seleciona o serviço que deseja editar.
3. O sistema apresenta as informações atuais do serviço.
4. O profissional altera os campos desejados.
5. O profissional confirma as alterações.
6. O sistema valida os novos dados.
7. O sistema atualiza as informações do serviço.
8. O sistema apresenta uma mensagem de confirmação.

#### Fluxo alternativo 2 - Exclusão ou desativação de serviço
1. O profissional acessa a lista de serviços cadastrados.
2. O profissional seleciona o serviço que deseja remover.
3. O sistema solicita a confirmação da operação.
4. O profissional confirma a exclusão ou desativação.
5. O sistema verifica se o serviço possui agendamentos associados.
6. Caso não existam impedimentos, o sistema remove o serviço ou altera seu estado para inativo.
7. O sistema informa que a operação foi realizada.

#### Fluxos de exceção
- **E1 - Dados inválidos:** Caso alguma informação obrigatória esteja ausente ou incorreta, o sistema informa os campos que precisam ser corrigidos.
- **E2 - Serviço duplicado:** Caso o sistema identifique um serviço duplicado, poderá solicitar que o profissional revise as informações antes de cadastrá-lo.
- **E3 - Serviço com agendamentos futuros:** Caso o serviço possua agendamentos confirmados, o sistema impede a exclusão definitiva e permite apenas sua desativação, preservando os agendamentos existentes.
- **E4 - Serviço inexistente:** Caso o profissional tente editar ou excluir um serviço que não existe ou não pertence à sua conta, o sistema impede a operação.
- **E5 - Falha ao salvar:** Caso ocorra uma falha durante o cadastro ou edição, o sistema informa que a operação não foi concluída e preserva os dados anteriores.

#### Pós-condições
- O serviço estará cadastrado, atualizado ou desativado, conforme a operação realizada.
- Os serviços ativos poderão ser encontrados pelos clientes durante a pesquisa.
- Os serviços desativados deixarão de ser oferecidos para novos agendamentos.
- Os dados históricos dos agendamentos relacionados ao serviço serão preservados.

---

### UC08 - Configurar Disponibilidade

**Ator principal:** Profissional.

**Objetivo:** Permitir que o profissional configure seus horários de atendimento e defina períodos nos quais não estará disponível para receber agendamentos.

#### Pré-condições
- O profissional deve estar cadastrado e autenticado no sistema.
- O profissional deve possuir acesso à funcionalidade de configuração de disponibilidade.
- O sistema deve estar disponível.

#### Fluxo principal
1. O profissional acessa sua área pessoal.
2. O profissional seleciona a opção de configurar disponibilidade.
3. O sistema apresenta sua configuração atual de horários.
4. O profissional seleciona os dias da semana em que deseja atender.
5. O profissional informa os horários de início e término do atendimento para cada dia selecionado.
6. O profissional define eventuais intervalos, como pausas para almoço ou descanso.
7. O profissional confirma as configurações.
8. O sistema verifica se os horários informados são válidos.
9. O sistema verifica se existem conflitos com outros horários cadastrados ou agendamentos já confirmados.
10. O sistema salva a nova configuração de disponibilidade.
11. O sistema atualiza a agenda do profissional.
12. O sistema apresenta uma mensagem informando que os horários foram configurados com sucesso.

#### Fluxo alternativo 1 - Edição da disponibilidade
1. O profissional acessa os horários já cadastrados.
2. O profissional seleciona um dia ou período que deseja alterar.
3. O sistema apresenta a configuração atual.
4. O profissional realiza as modificações desejadas.
5. O sistema valida os novos horários.
6. O sistema salva as alterações e atualiza a disponibilidade.

#### Fluxos de exceção
- **E1 - Horários inválidos:** Caso o horário de encerramento seja anterior ao horário de início ou os intervalos estejam incorretos, o sistema informa o problema e solicita a correção.
- **E2 - Conflito com agendamentos existentes:** Caso o profissional tente bloquear um horário que já possui agendamentos confirmados, o sistema informa o conflito e não remove automaticamente os compromissos existentes.
- **E3 - Sobreposição de horários:** Caso sejam cadastrados períodos incompatíveis ou sobrepostos, o sistema impede o salvamento até que os horários sejam corrigidos.
- **E4 - Falha ao salvar:** Caso ocorra um erro durante a atualização, o sistema informa que as alterações não foram realizadas e mantém a configuração anterior.

#### Pós-condições
- A disponibilidade do profissional estará atualizada.
- Os horários configurados poderão ser consultados pelos clientes.
- Os períodos bloqueados não serão oferecidos para novos agendamentos.
- Os agendamentos previamente confirmados serão preservados, mesmo quando houver alterações na disponibilidade.

---

### UC09 - Visualizar Agenda do Dia

**Ator principal:** Profissional.

**Objetivo:** Permitir que o profissional visualize seus compromissos e atendimentos programados para determinado dia.

#### Pré-condições
- O profissional deve estar cadastrado e autenticado no sistema.
- O profissional deve possuir acesso à sua agenda.
- Para visualizar compromissos, deve existir pelo menos um agendamento registrado.

#### Fluxo principal
1. O profissional acessa sua área pessoal.
2. O profissional seleciona a opção de visualizar agenda.
3. O sistema identifica a data atual.
4. O sistema consulta os agendamentos vinculados ao profissional para aquela data.
5. O sistema organiza os compromissos em ordem cronológica.
6. O sistema apresenta os horários e as informações de cada agendamento.
7. Para cada compromisso, o sistema apresenta dados como nome do cliente, serviço contratado, horário e estado do agendamento.
8. O profissional seleciona um compromisso, caso deseje visualizar mais detalhes.
9. O sistema apresenta as informações completas do agendamento selecionado.

#### Fluxo alternativo 1 - Consultar outra data
1. O profissional acessa a agenda.
2. O profissional seleciona a opção de alterar a data de visualização.
3. O sistema apresenta um calendário.
4. O profissional seleciona uma data desejada.
5. O sistema consulta os agendamentos correspondentes.
6. O sistema apresenta os compromissos daquela data.

#### Fluxo alternativo 2 - Dia sem agendamentos
1. O profissional acessa a agenda de determinado dia.
2. O sistema consulta os compromissos existentes.
3. O sistema identifica que não há agendamentos para a data selecionada.
4. O sistema informa que não existem atendimentos programados para aquele dia.
5. O sistema pode apresentar os horários de disponibilidade configurados pelo profissional.

#### Fluxos de exceção
- **E1 - Data inválida:** Caso o profissional selecione uma data inválida, o sistema solicita que seja escolhida outra data.
- **E2 - Agendamento inexistente:** Caso seja solicitado um compromisso que não exista, o sistema informa que o registro não foi encontrado.
- **E3 - Falha ao carregar agenda:** Caso ocorra um erro na consulta, o sistema informa que não foi possível carregar os compromissos.
- **E4 - Acesso não autorizado:** Caso um usuário tente visualizar a agenda de outro profissional, o sistema impede o acesso.

#### Pós-condições
- O profissional terá visualizado os compromissos registrados para a data selecionada.
- Nenhum agendamento será alterado apenas pela visualização.
- O profissional poderá selecionar um compromisso para realizar operações permitidas, como concluir o atendimento ou registrar uma falta.

---

### UC10 - Concluir Atendimento

**Ator principal:** Profissional.

**Objetivo:** Permitir que o profissional registre a conclusão de um atendimento previamente agendado.

#### Pré-condições
- O profissional deve estar autenticado.
- Deve existir um agendamento vinculado à sua conta.
- O agendamento deve estar no estado **Confirmado**.
- O atendimento deve ter sido realizado.

#### Fluxo principal
1. O profissional acessa sua agenda.
2. O sistema apresenta os compromissos registrados.
3. O profissional seleciona o atendimento que deseja concluir.
4. O sistema apresenta os dados do agendamento.
5. O profissional verifica se o atendimento foi realizado.
6. O profissional seleciona a opção de concluir atendimento.
7. O sistema solicita a confirmação da operação.
8. O profissional confirma a conclusão.
9. O sistema altera o estado do agendamento para **Concluído**.
10. O sistema registra a conclusão e a data da operação.
11. O sistema apresenta uma mensagem informando que o atendimento foi concluído com sucesso.

#### Fluxo alternativo 1 - Desistência da conclusão
1. O profissional seleciona um atendimento.
2. O profissional inicia a operação de conclusão.
3. O sistema solicita a confirmação.
4. O profissional decide não prosseguir.
5. O sistema interrompe a operação.
6. O agendamento permanece no estado anterior.

#### Fluxos de exceção
- **E1 - Agendamento inexistente:** Caso o agendamento não exista ou não pertença ao profissional autenticado, o sistema impede a operação.
- **E2 - Estado incompatível:** Caso o agendamento já esteja cancelado, concluído ou com falta registrada, o sistema impede a conclusão.
- **E3 - Falha ao atualizar o estado:** Caso ocorra um erro ao registrar a conclusão, o sistema informa que a operação não foi realizada e mantém o estado anterior.

#### Pós-condições
- O agendamento terá seu estado alterado para **Concluído**.
- O registro da conclusão ficará associado ao profissional e ao agendamento correspondente.
- O atendimento passará a integrar o histórico de serviços realizados.

---

### UC11 - Registrar Falta

**Ator principal:** Profissional.

**Objetivo:** Permitir que o profissional registre quando um cliente não comparecer a um atendimento previamente agendado.

#### Pré-condições
- O profissional deve estar autenticado.
- Deve existir um agendamento vinculado à sua conta.
- O agendamento deve estar no estado **Confirmado**.
- A data e o horário previstos para o atendimento devem ter ocorrido.
- O cliente não deve ter comparecido ao atendimento.

#### Fluxo principal
1. O profissional acessa sua agenda.
2. O sistema apresenta os compromissos registrados.
3. O profissional seleciona o agendamento referente ao cliente que não compareceu.
4. O sistema apresenta os detalhes do compromisso.
5. O profissional seleciona a opção de registrar falta.
6. O sistema solicita a confirmação da operação.
7. O profissional confirma que o cliente não compareceu.
8. O sistema altera o estado do agendamento para **Falta registrada**.
9. O sistema registra a ocorrência e a data em que foi realizada.
10. O sistema apresenta uma mensagem informando que a falta foi registrada com sucesso.

#### Fluxo alternativo 1 - Cancelamento da operação
1. O profissional seleciona um agendamento.
2. O profissional inicia o processo de registro de falta.
3. O sistema solicita a confirmação.
4. O profissional decide não prosseguir.
5. O sistema interrompe a operação.
6. O agendamento permanece confirmado.

#### Fluxos de exceção
- **E1 - Agendamento inexistente:** Caso o agendamento não exista ou não pertença ao profissional autenticado, o sistema impede a operação.
- **E2 - Agendamento futuro:** Caso o horário do atendimento ainda não tenha ocorrido, o sistema impede o registro de falta.
- **E3 - Agendamento já concluído:** Caso o atendimento esteja concluído, o sistema impede o registro.
- **E4 - Agendamento cancelado:** Caso o cliente já tenha cancelado o agendamento, o sistema impede o registro de falta.
- **E5 - Falta já registrada:** Caso já exista um registro de falta para o agendamento, o sistema informa que a operação já foi realizada.
- **E6 - Falha ao salvar:** Caso ocorra um erro durante o registro, o sistema informa que a operação não foi concluída e mantém o estado anterior.

#### Pós-condições
- O agendamento terá seu estado alterado para **Falta registrada**.
- A ocorrência ficará registrada no histórico do profissional e do agendamento.
- O atendimento não será contabilizado como um serviço concluído.

---

### UC12 - Visualizar Dashboard (Faturamento e Atendimentos)

**Ator principal:** Profissional.

**Objetivo:** Permitir que o profissional visualize indicadores e informações consolidadas sobre seus atendimentos, agendamentos e faturamento.

#### Pré-condições
- O profissional deve possuir uma conta cadastrada e estar autenticado.
- O profissional deve possuir acesso à funcionalidade de dashboard.
- Para apresentar indicadores históricos, devem existir registros de agendamentos ou atendimentos associados à conta.

#### Fluxo principal
1. O profissional acessa sua área pessoal.
2. O profissional seleciona a opção de visualizar dashboard.
3. O sistema consulta os dados associados à conta do profissional.
4. O sistema processa os registros de agendamentos e atendimentos.
5. O sistema calcula os indicadores disponíveis.
6. O sistema apresenta um painel contendo informações como:
   - Quantidade total de agendamentos.
   - Quantidade de atendimentos concluídos.
   - Quantidade de agendamentos cancelados.
   - Quantidade de faltas registradas.
   - Faturamento calculado a partir dos serviços concluídos.
   - Quantidade de serviços oferecidos.
7. O profissional consulta os indicadores apresentados.

#### Fluxo alternativo 1 - Filtrar por período
1. O profissional acessa o dashboard.
2. O profissional seleciona um período específico para consulta.
3. O sistema recebe os critérios de filtragem.
4. O sistema consulta os registros correspondentes ao período informado.
5. O sistema recalcula os indicadores.
6. O sistema atualiza as informações apresentadas no dashboard.

#### Fluxo alternativo 2 - Consultar detalhamento de um indicador
1. O profissional visualiza os indicadores do dashboard.
2. O profissional seleciona um dos indicadores, como atendimentos concluídos ou faturamento.
3. O sistema consulta os registros relacionados ao indicador.
4. O sistema apresenta as informações detalhadas que compõem o resultado.

#### Fluxo alternativo 3 - Profissional sem movimentações
1. O profissional acessa o dashboard.
2. O sistema consulta seus registros.
3. O sistema identifica que não existem agendamentos ou atendimentos registrados.
4. O sistema apresenta os indicadores com valores zerados ou uma mensagem informando que ainda não existem dados suficientes.
5. O profissional poderá consultar o dashboard novamente após registrar atividades.

#### Fluxos de exceção
- **E1 - Período inválido:** Caso o profissional informe um intervalo de datas inválido, o sistema solicita a correção dos filtros.
- **E2 - Nenhum resultado no período:** Caso não existam movimentações no intervalo escolhido, o sistema informa que não há dados disponíveis para aquele período.
- **E3 - Falha no processamento:** Caso ocorra um erro durante o cálculo dos indicadores, o sistema informa que não foi possível gerar os resultados.
- **E4 - Acesso não autorizado:** Caso um usuário tente acessar o dashboard de outro profissional, o sistema impede a visualização.

#### Pós-condições
- O profissional terá visualizado os indicadores disponíveis sobre sua atividade.
- Nenhum agendamento será alterado durante a consulta.
- Os dados apresentados serão restritos aos registros associados ao profissional autenticado.
- O dashboard estará atualizado de acordo com os registros existentes no sistema.
