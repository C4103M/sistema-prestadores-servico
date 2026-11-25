package com.agendamento.agendamento;

import com.agendamento.agendamento.model.Agendamento;
import com.agendamento.agendamento.model.StatusAgendamento;
import com.agendamento.agendamento.repository.AgendamentoRepository;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.cliente.repository.ClienteRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Cenários de aceitação CT01–CT06 da US06: atualização de status e agenda diária. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AgendaStatusIntegrationTest {

    private static final String SENHA = "123456";

    @Autowired private MockMvc mvc;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private ClienteRepository clienteRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;

    @Test
    @DisplayName("CT01: concluir atendimento AGENDADO muda status para CONCLUIDO e soma no faturamento")
    void ct01_concluirAtendimento() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Concluir");
        Sessao cliente = cadastrarCliente("Lucas");
        Long id = salvarAgendamento(cliente.perfilId, pro.perfilId, LocalDateTime.now().minusMinutes(30), StatusAgendamento.AGENDADO, "50.00");

        mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/concluir", pro.perfilId, id)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDO"));

        assertEquals(StatusAgendamento.CONCLUIDO, agendamentoRepository.findById(id).orElseThrow().getStatus());
        mvc.perform(get("/api/profissional/{id}/dashboard", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concluidos").value(1))
                .andExpect(jsonPath("$.faturamentoTotal").value(50.0));
    }

    @Test
    @DisplayName("CT02: registrar falta em atendimento já iniciado muda status para FALTOU sem faturar")
    void ct02_registrarFaltaDepoisDoInicio() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Falta");
        Sessao cliente = cadastrarCliente("Mariana");
        Long id = salvarAgendamento(cliente.perfilId, pro.perfilId, LocalDateTime.now().minusMinutes(15), StatusAgendamento.AGENDADO, "85.00");

        mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/falta", pro.perfilId, id)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FALTOU"));

        assertEquals(StatusAgendamento.FALTOU, agendamentoRepository.findById(id).orElseThrow().getStatus());
        mvc.perform(get("/api/profissional/{id}/dashboard", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faltas").value(1))
                .andExpect(jsonPath("$.faturamentoTotal").value(0));
    }

    @Test
    @DisplayName("CT03: registrar falta antes do horário de início retorna 409 e mantém AGENDADO")
    void ct03_faltaAntesDoInicioRecusada() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Futuro");
        Sessao cliente = cadastrarCliente("Rafael");
        Long id = salvarAgendamento(cliente.perfilId, pro.perfilId, LocalDateTime.now().plusHours(2), StatusAgendamento.AGENDADO, "60.00");

        mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/falta", pro.perfilId, id)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Só é possível registrar falta a partir do horário de início do agendamento."));

        assertEquals(StatusAgendamento.AGENDADO, agendamentoRepository.findById(id).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("CT04: estados finais não podem ser concluídos nem receber falta (409)")
    void ct04_estadosFinaisBloqueados() throws Exception {
        Sessao pro = cadastrarProfissional("Beatriz Final");
        Sessao cliente = cadastrarCliente("Ana");

        for (StatusAgendamento estado : new StatusAgendamento[]{
                StatusAgendamento.CONCLUIDO, StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU}) {
            Long id = salvarAgendamento(cliente.perfilId, pro.perfilId, LocalDateTime.now().minusHours(1), estado, "120.00");

            mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/concluir", pro.perfilId, id)
                            .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                    .andExpect(status().isConflict());
            mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/falta", pro.perfilId, id)
                            .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                    .andExpect(status().isConflict());

            assertEquals(estado, agendamentoRepository.findById(id).orElseThrow().getStatus());
        }
    }

    @Test
    @DisplayName("CT05: agenda diária filtra pela data e ordena por horário de início crescente")
    void ct05_agendaDiariaOrdenada() throws Exception {
        Sessao pro = cadastrarProfissional("Marcos Agenda");
        Sessao cliente = cadastrarCliente("João");
        LocalDate hoje = LocalDate.now();
        LocalDate amanha = hoje.plusDays(1);

        Long tarde = salvarAgendamento(cliente.perfilId, pro.perfilId, hoje.atTime(15, 0), StatusAgendamento.AGENDADO, "90.00");
        Long manha = salvarAgendamento(cliente.perfilId, pro.perfilId, hoje.atTime(9, 0), StatusAgendamento.AGENDADO, "50.00");
        salvarAgendamento(cliente.perfilId, pro.perfilId, amanha.atTime(10, 0), StatusAgendamento.AGENDADO, "70.00");

        mvc.perform(get("/api/profissional/{id}/agendamentos", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .param("data", hoje.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(manha))
                .andExpect(jsonPath("$[1].id").value(tarde));
    }

    @Test
    @DisplayName("CT06: profissional recebe 404 ao tentar concluir ou marcar falta em agendamento de outro profissional")
    void ct06_isolamentoEntreProfissionais() throws Exception {
        Sessao pro1 = cadastrarProfissional("Profissional Um");
        Sessao pro2 = cadastrarProfissional("Profissional Dois");
        Sessao cliente = cadastrarCliente("Pedro");
        Long idPro2 = salvarAgendamento(cliente.perfilId, pro2.perfilId, LocalDateTime.now().minusMinutes(20), StatusAgendamento.AGENDADO, "80.00");

        mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/concluir", pro1.perfilId, idPro2)
                        .header(HttpHeaders.AUTHORIZATION, pro1.bearer()))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/falta", pro1.perfilId, idPro2)
                        .header(HttpHeaders.AUTHORIZATION, pro1.bearer()))
                .andExpect(status().isNotFound());

        assertEquals(StatusAgendamento.AGENDADO, agendamentoRepository.findById(idPro2).orElseThrow().getStatus());
    }

    private Sessao cadastrarProfissional(String nome) throws Exception {
        String json = """
                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s","especialidade":"Geral"}
                """.formatted(nome, email(), SENHA);
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

    private Long salvarAgendamento(Long clienteId, Long proId, LocalDateTime inicio, StatusAgendamento status, String preco) {
        Cliente cliente = clienteRepository.findById(clienteId).orElseThrow();
        Profissional pro = profissionalRepository.findById(proId).orElseThrow();
        Servico servico = servicoRepository.saveAndFlush(Servico.builder()
                .nome("Serviço Teste").categoria("Geral").duracaoMinutos(45)
                .preco(new BigDecimal(preco)).ativo(true).profissional(pro).build());
        return agendamentoRepository.saveAndFlush(Agendamento.builder()
                .cliente(cliente).profissional(pro).servico(servico)
                .dataHoraInicio(inicio).dataHoraFim(inicio.plusMinutes(45))
                .preco(new BigDecimal(preco)).status(status).build()).getId();
    }

    private Sessao sessao(MvcResult result) throws Exception {
        String json = result.getResponse().getContentAsString();
        return new Sessao(JsonPath.read(json, "$.token"), ((Number) JsonPath.read(json, "$.perfilId")).longValue());
    }

    private String email() { return "us06-" + UUID.randomUUID() + "@teste.com"; }

    private record Sessao(String token, Long perfilId) {
        String bearer() { return "Bearer " + token; }
    }
}
