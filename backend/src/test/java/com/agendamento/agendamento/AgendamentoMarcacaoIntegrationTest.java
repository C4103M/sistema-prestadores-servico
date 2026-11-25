package com.agendamento.agendamento;

import com.agendamento.agendamento.model.Agendamento;
import com.agendamento.agendamento.model.StatusAgendamento;
import com.agendamento.agendamento.repository.AgendamentoRepository;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.cliente.repository.ClienteRepository;
import com.agendamento.disponibilidade.model.DiaSemana;
import com.agendamento.disponibilidade.model.Disponibilidade;
import com.agendamento.disponibilidade.repository.DisponibilidadeRepository;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.servico.model.Servico;
import com.agendamento.servico.repository.ServicoRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Cenários de aceitação CT01–CT08 da US02: busca, cálculo de horários livres e reserva transacional. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AgendamentoMarcacaoIntegrationTest {

    private static final String SENHA = "123456";

    @Autowired private MockMvc mvc;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private ClienteRepository clienteRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private DisponibilidadeRepository disponibilidadeRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;

    @Test
    @DisplayName("CT01: busca por serviço retorna apenas serviços ativos correspondentes")
    void ct01_buscaPorServico() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Busca", "Barbearia");
        Sessao cliente = cadastrarCliente("Lucas");
        String tag = UUID.randomUUID().toString().substring(0, 8);
        Servico corteAtivo = salvarServico(pro.perfilId, "Corte " + tag, "Barbearia", 45, "50.00", true);
        Servico corteInativo = salvarServico(pro.perfilId, "Corte Inativo " + tag, "Barbearia", 45, "60.00", false);

        mvc.perform(get("/api/cliente/servicos")
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("busca", tag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + corteAtivo.getId() + ")]").exists())
                .andExpect(jsonPath("$[?(@.id == " + corteInativo.getId() + ")]").doesNotExist());
    }

    @Test
    @DisplayName("CT02: busca por profissional retorna profissional com serviços ativos e exclui quem não tem ativo")
    void ct02_buscaPorProfissional() throws Exception {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        Sessao beatriz = cadastrarProfissional("Beatriz " + tag, "Estética");
        Sessao semAtivos = cadastrarProfissional("Beatriz SemAtivos " + tag, "Estética");
        Sessao cliente = cadastrarCliente("Mariana");
        Servico limpeza = salvarServico(beatriz.perfilId, "Limpeza de pele", "Estética", 60, "140.00", true);
        salvarServico(semAtivos.perfilId, "Serviço pausado", "Estética", 60, "100.00", false);

        mvc.perform(get("/api/cliente/profissionais")
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("busca", "Beatriz"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + beatriz.perfilId + ")].servicos[0].id", hasItem(limpeza.getId().intValue())))
                .andExpect(jsonPath("$[?(@.id == " + semAtivos.perfilId + ")]").doesNotExist());
    }

    @Test
    @DisplayName("CT03: busca sem resultado retorna lista vazia")
    void ct03_buscaSemResultado() throws Exception {
        Sessao cliente = cadastrarCliente("Rafael");

        mvc.perform(get("/api/cliente/servicos")
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("busca", "termo-inexistente-" + UUID.randomUUID()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @DisplayName("CT04: horários livres respeitam disponibilidade e ocupados, e conflito na API retorna 409")
    void ct04_horariosLivresEConflito() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Slots", "Barbearia");
        Sessao cliente = cadastrarCliente("Ana");
        Servico corte = salvarServico(pro.perfilId, "Corte degradê", "Barbearia", 45, "50.00", true);
        salvarDisponibilidade(pro.perfilId, DiaSemana.SEGUNDA, LocalTime.of(9, 0), LocalTime.of(18, 0));

        LocalDate segunda = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        salvarAgendamento(cliente.perfilId, pro.perfilId, corte, segunda.atTime(10, 0), StatusAgendamento.AGENDADO);

        String inicioConflito = segunda.atTime(10, 0).toString();
        String inicioLivre0900 = segunda.atTime(9, 0).toString();
        String inicioSobreposto0930 = segunda.atTime(9, 30).toString();
        String inicioSobreposto1030 = segunda.atTime(10, 30).toString();
        String inicioLivre1100 = segunda.atTime(11, 0).toString();
        String inicioLivre1700 = segunda.atTime(17, 0).toString();
        String inicioExcedente1730 = segunda.atTime(17, 30).toString();

        mvc.perform(get("/api/cliente/servicos/{servicoId}/horarios-livres", corte.getId())
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("data", segunda.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].dataHoraInicio", hasItem(inicioLivre0900 + ":00")))
                .andExpect(jsonPath("$[*].dataHoraInicio", hasItem(inicioLivre1100 + ":00")))
                .andExpect(jsonPath("$[*].dataHoraInicio", hasItem(inicioLivre1700 + ":00")))
                .andExpect(jsonPath("$[*].dataHoraInicio", not(hasItem(inicioSobreposto0930 + ":00"))))
                .andExpect(jsonPath("$[*].dataHoraInicio", not(hasItem(inicioConflito + ":00"))))
                .andExpect(jsonPath("$[*].dataHoraInicio", not(hasItem(inicioSobreposto1030 + ":00"))))
                .andExpect(jsonPath("$[*].dataHoraInicio", not(hasItem(inicioExcedente1730 + ":00"))));

        String corpoConflito = """
                {"profissionalId":%d,"servicoId":%d,"dataHoraInicio":"%s"}
                """.formatted(pro.perfilId, corte.getId(), segunda.atTime(10, 30));

        mvc.perform(post("/api/cliente/{clienteId}/agendamentos", cliente.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoConflito))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("O profissional já possui um agendamento conflitante neste horário."));
    }

    @Test
    @DisplayName("CT05: confirmação cria agendamento AGENDADO com preço congelado e remove horário dos livres")
    void ct05_agendamentoBemSucedidoECongelamentoPreco() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Reserva", "Barbearia");
        Sessao cliente = cadastrarCliente("João");
        Servico corte = salvarServico(pro.perfilId, "Corte degradê", "Barbearia", 45, "50.00", true);
        salvarDisponibilidade(pro.perfilId, DiaSemana.TERCA, LocalTime.of(9, 0), LocalTime.of(12, 0));

        LocalDate terca = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.TUESDAY));
        LocalDateTime horario = terca.atTime(9, 0);

        String corpo = """
                {"profissionalId":%d,"servicoId":%d,"dataHoraInicio":"%s"}
                """.formatted(pro.perfilId, corte.getId(), horario);

        MvcResult res = mvc.perform(post("/api/cliente/{clienteId}/agendamentos", cliente.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("AGENDADO"))
                .andExpect(jsonPath("$.preco").value(50.0))
                .andReturn();
        Long agendamentoId = ((Number) JsonPath.read(res.getResponse().getContentAsString(), "$.id")).longValue();

        mvc.perform(get("/api/cliente/{clienteId}/agendamentos", cliente.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + agendamentoId + ")].preco", hasItem(50.0)));

        mvc.perform(get("/api/cliente/servicos/{servicoId}/horarios-livres", corte.getId())
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("data", terca.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].dataHoraInicio", not(hasItem(horario + ":00"))));
    }

    @Test
    @DisplayName("CT06: dia sem faixa de disponibilidade ou com agenda lotada retorna lista vazia de horários livres")
    void ct06_diaSemHorarioLivre() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Lotado", "Barbearia");
        Sessao cliente = cadastrarCliente("Pedro");
        Servico servico = salvarServico(pro.perfilId, "Barba", "Barbearia", 60, "40.00", true);
        salvarDisponibilidade(pro.perfilId, DiaSemana.QUARTA, LocalTime.of(9, 0), LocalTime.of(10, 0));

        LocalDate domingo = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.SUNDAY));
        LocalDate quarta = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY));
        salvarAgendamento(cliente.perfilId, pro.perfilId, servico, quarta.atTime(9, 0), StatusAgendamento.AGENDADO);

        mvc.perform(get("/api/cliente/servicos/{servicoId}/horarios-livres", servico.getId())
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("data", domingo.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mvc.perform(get("/api/cliente/servicos/{servicoId}/horarios-livres", servico.getId())
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("data", quarta.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @DisplayName("CT07: segundo cliente que tenta reservar o mesmo horário recebe 409 sem duplicar agendamento")
    void ct07_corridaMesmoHorario() throws Exception {
        Sessao pro = cadastrarProfissional("Beatriz Corrida", "Estética");
        Sessao cliente1 = cadastrarCliente("Cliente Um");
        Sessao cliente2 = cadastrarCliente("Cliente Dois");
        Servico limpeza = salvarServico(pro.perfilId, "Limpeza", "Estética", 60, "140.00", true);
        salvarDisponibilidade(pro.perfilId, DiaSemana.QUINTA, LocalTime.of(10, 0), LocalTime.of(14, 0));

        LocalDate quinta = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.THURSDAY));
        LocalDateTime horario = quinta.atTime(10, 0);
        String corpo = """
                {"profissionalId":%d,"servicoId":%d,"dataHoraInicio":"%s"}
                """.formatted(pro.perfilId, limpeza.getId(), horario);

        mvc.perform(post("/api/cliente/{clienteId}/agendamentos", cliente1.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, cliente1.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/cliente/{clienteId}/agendamentos", cliente2.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, cliente2.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("O profissional já possui um agendamento conflitante neste horário."));

        assertEquals(1, agendamentoRepository.findByProfissionalIdOrderByDataHoraInicioAsc(pro.perfilId).size());
        mvc.perform(get("/api/cliente/servicos/{servicoId}/horarios-livres", limpeza.getId())
                        .header(HttpHeaders.AUTHORIZATION, cliente2.bearer())
                        .param("data", quinta.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].dataHoraInicio", not(hasItem(horario + ":00"))));
    }

    @Test
    @DisplayName("CT08: serviço inativo ou período inválido para horários livres retorna 400")
    void ct08_servicoInativoEPeriodoInvalido() throws Exception {
        Sessao pro = cadastrarProfissional("Marcos Inativo", "Elétrica");
        Sessao cliente = cadastrarCliente("Bruno");
        Servico inativo = salvarServico(pro.perfilId, "Instalação pausada", "Elétrica", 60, "120.00", false);
        Servico ativo = salvarServico(pro.perfilId, "Revisão elétrica", "Elétrica", 60, "180.00", true);

        LocalDate amanha = LocalDate.now().plusDays(2);

        mvc.perform(get("/api/cliente/servicos/{servicoId}/horarios-livres", inativo.getId())
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("data", amanha.toString()))
                .andExpect(status().isBadRequest());

        mvc.perform(get("/api/cliente/servicos/{servicoId}/horarios-livres", ativo.getId())
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .param("de", amanha.plusDays(2).toString())
                        .param("ate", amanha.toString()))
                .andExpect(status().isBadRequest());
    }

    private Sessao cadastrarProfissional(String nome, String especialidade) throws Exception {
        String json = """
                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s","especialidade":"%s"}
                """.formatted(nome, email(), SENHA, especialidade);
        MvcResult result = mvc.perform(post("/api/auth/cadastro/profissional")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn();
        return sessao(result);
    }

    private Sessao cadastrarCliente(String nome) throws Exception {
        String json = """
                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s"}
                """.formatted(nome, email(), SENHA);
        MvcResult result = mvc.perform(post("/api/auth/cadastro/cliente")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn();
        return sessao(result);
    }

    private Servico salvarServico(Long proId, String nome, String categoria, int duracao, String preco, boolean ativo) {
        Profissional pro = profissionalRepository.findById(proId).orElseThrow();
        return servicoRepository.saveAndFlush(Servico.builder()
                .nome(nome).categoria(categoria).descricao("Descrição")
                .duracaoMinutos(duracao).preco(new BigDecimal(preco))
                .ativo(ativo).profissional(pro).build());
    }

    private void salvarDisponibilidade(Long proId, DiaSemana dia, LocalTime inicio, LocalTime fim) {
        Profissional pro = profissionalRepository.findById(proId).orElseThrow();
        disponibilidadeRepository.saveAndFlush(Disponibilidade.builder()
                .profissional(pro).diaSemana(dia).horaInicio(inicio).horaFim(fim).build());
    }

    private void salvarAgendamento(Long clienteId, Long proId, Servico servico, LocalDateTime inicio, StatusAgendamento status) {
        Cliente cliente = clienteRepository.findById(clienteId).orElseThrow();
        Profissional pro = profissionalRepository.findById(proId).orElseThrow();
        agendamentoRepository.saveAndFlush(Agendamento.builder()
                .cliente(cliente).profissional(pro).servico(servico)
                .dataHoraInicio(inicio).dataHoraFim(inicio.plusMinutes(servico.getDuracaoMinutos()))
                .preco(servico.getPreco()).status(status).build());
    }

    private Sessao sessao(MvcResult result) throws Exception {
        String json = result.getResponse().getContentAsString();
        return new Sessao(JsonPath.read(json, "$.token"), ((Number) JsonPath.read(json, "$.perfilId")).longValue());
    }

    private String email() { return "us02-" + UUID.randomUUID() + "@teste.com"; }

    private record Sessao(String token, Long perfilId) {
        String bearer() { return "Bearer " + token; }
    }
}
