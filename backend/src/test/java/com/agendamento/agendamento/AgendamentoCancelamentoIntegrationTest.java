package com.agendamento.agendamento;

import com.agendamento.agendamento.model.Agendamento;
import com.agendamento.agendamento.model.StatusAgendamento;
import com.agendamento.agendamento.repository.AgendamentoRepository;
import com.agendamento.categoria.model.Categoria;
import com.agendamento.categoria.model.StatusCategoria;
import com.agendamento.categoria.repository.CategoriaRepository;
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
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AgendamentoCancelamentoIntegrationTest {
    private static final String SENHA = "123456";

    @Autowired private MockMvc mvc;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private ClienteRepository clienteRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;

    @Test
    @DisplayName("CT01: cliente cancela com antecedência, muda status e libera o horário")
    void clienteCancelaEHorarioFicaLivre() throws Exception {
        Cenario c = cenario(LocalDateTime.now().plusDays(1).withSecond(0).withNano(0), StatusAgendamento.AGENDADO);
        mvc.perform(get("/api/cliente/profissionais/{id}/horarios-ocupados", c.pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, c.cliente.bearer())
                        .param("de", c.inicio.toLocalDate().toString()).param("ate", c.inicio.toLocalDate().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].dataHoraInicio").exists());

        mvc.perform(patch("/api/cliente/{clienteId}/agendamentos/{id}/cancelar", c.cliente.perfilId, c.agendamentoId)
                        .header(HttpHeaders.AUTHORIZATION, c.cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADO"));
        assertEquals(StatusAgendamento.CANCELADO, buscar(c.agendamentoId).getStatus());
        mvc.perform(get("/api/cliente/profissionais/{id}/horarios-ocupados", c.pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, c.cliente.bearer())
                        .param("de", c.inicio.toLocalDate().toString()).param("ate", c.inicio.toLocalDate().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @DisplayName("CT02: cliente não cancela a menos de duas horas e a API responde 409")
    void clienteNaoCancelaComMenosDuasHoras() throws Exception {
        Cenario c = cenario(LocalDateTime.now().plusHours(1).withSecond(0).withNano(0), StatusAgendamento.AGENDADO);
        mvc.perform(get("/api/cliente/{clienteId}/agendamentos", c.cliente.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, c.cliente.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].podeCancelar").value(false));
        mvc.perform(patch("/api/cliente/{clienteId}/agendamentos/{id}/cancelar", c.cliente.perfilId, c.agendamentoId)
                        .header(HttpHeaders.AUTHORIZATION, c.cliente.bearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Cancelamento só permitido com no mínimo 2 horas de antecedência."));
        assertEquals(StatusAgendamento.AGENDADO, buscar(c.agendamentoId).getStatus());
    }

    @Test
    @DisplayName("CT03: profissional cancela atendimento em menos de duas horas")
    void profissionalCancelaEmMenosDuasHoras() throws Exception {
        Cenario c = cenario(LocalDateTime.now().plusMinutes(30).withSecond(0).withNano(0), StatusAgendamento.AGENDADO);
        mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/cancelar", c.pro.perfilId, c.agendamentoId)
                        .header(HttpHeaders.AUTHORIZATION, c.pro.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELADO"));
        assertEquals(StatusAgendamento.CANCELADO, buscar(c.agendamentoId).getStatus());
    }

    @Test
    @DisplayName("Profissional não cancela um atendimento que já começou")
    void profissionalNaoCancelaAtendimentoIniciado() throws Exception {
        Cenario c = cenario(LocalDateTime.now().minusMinutes(1), StatusAgendamento.AGENDADO);
        mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/cancelar", c.pro.perfilId, c.agendamentoId)
                        .header(HttpHeaders.AUTHORIZATION, c.pro.bearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Agendamentos que já começaram não podem ser cancelados."));
        assertEquals(StatusAgendamento.AGENDADO, buscar(c.agendamentoId).getStatus());
    }

    @Test
    @DisplayName("CT04: sem confirmar a desistência, o agendamento continua AGENDADO")
    void desistirMantemAgendamento() throws Exception {
        Cenario c = cenario(LocalDateTime.now().plusDays(1), StatusAgendamento.AGENDADO);
        mvc.perform(get("/api/cliente/{clienteId}/agendamentos", c.cliente.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, c.cliente.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("AGENDADO"));
        assertEquals(StatusAgendamento.AGENDADO, buscar(c.agendamentoId).getStatus());
    }

    @Test
    @DisplayName("CT05: estados finais não podem ser cancelados pelo cliente nem pelo profissional")
    void estadosFinaisRetornamConflito() throws Exception {
        for (StatusAgendamento estado : new StatusAgendamento[]{StatusAgendamento.CONCLUIDO,
                StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU}) {
            Cenario c = cenario(LocalDateTime.now().plusDays(1), estado);
            mvc.perform(patch("/api/cliente/{clienteId}/agendamentos/{id}/cancelar", c.cliente.perfilId, c.agendamentoId)
                            .header(HttpHeaders.AUTHORIZATION, c.cliente.bearer()))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.detail").value("Apenas agendamentos no status AGENDADO podem ser cancelados."));
            mvc.perform(patch("/api/profissional/{profissionalId}/agendamentos/{id}/cancelar", c.pro.perfilId, c.agendamentoId)
                            .header(HttpHeaders.AUTHORIZATION, c.pro.bearer()))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.detail").value("Apenas agendamentos no status AGENDADO podem ser cancelados."));
            assertEquals(estado, buscar(c.agendamentoId).getStatus());
        }
    }

    @Test
    @DisplayName("CT06: cliente não cancela agendamento de outra pessoa")
    void outroClienteRecebe404() throws Exception {
        Cenario c = cenario(LocalDateTime.now().plusDays(1), StatusAgendamento.AGENDADO);
        Sessao outroCliente = cadastrarCliente("Outro Cliente");
        mvc.perform(patch("/api/cliente/{clienteId}/agendamentos/{id}/cancelar", outroCliente.perfilId, c.agendamentoId)
                        .header(HttpHeaders.AUTHORIZATION, outroCliente.bearer()))
                .andExpect(status().isNotFound());
        assertEquals(StatusAgendamento.AGENDADO, buscar(c.agendamentoId).getStatus());
    }

    @Test
    @DisplayName("CT07: cancelamento não entra no faturamento e conta em cancelamentos")
    void cancelamentoAtualizaDashboardSemFaturar() throws Exception {
        Cenario cancelado = cenario(LocalDateTime.now().plusDays(1), StatusAgendamento.CANCELADO);
        Cenario concluido = cenario(LocalDateTime.now().plusDays(2), StatusAgendamento.CONCLUIDO,
                cancelado.pro.perfilId, cancelado.pro.token, cancelado.cliente.perfilId, cancelado.cliente.token);

        mvc.perform(get("/api/profissional/{id}/dashboard", cancelado.pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, cancelado.pro.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelados").value(1))
                .andExpect(jsonPath("$.concluidos").value(1))
                .andExpect(jsonPath("$.faturamentoTotal").value(40.0));
        assertFalse(buscar(cancelado.agendamentoId).getStatus() == StatusAgendamento.CONCLUIDO);
        assertEquals(new BigDecimal("40.00"), buscar(concluido.agendamentoId).getPreco());
    }

    private Cenario cenario(LocalDateTime inicio, StatusAgendamento estado) throws Exception {
        Sessao pro = cadastrarProfissional();
        Sessao cliente = cadastrarCliente("Cliente");
        return cenario(inicio, estado, pro.perfilId, pro.token, cliente.perfilId, cliente.token);
    }

    private Cenario cenario(LocalDateTime inicio, StatusAgendamento estado, Long proId, String proToken,
                            Long clienteId, String clienteToken) {
        Profissional profissional = profissionalRepository.findById(proId).orElseThrow();
        Cliente cliente = clienteRepository.findById(clienteId).orElseThrow();
        Categoria categoria = categoriaRepository.findByNomeIgnoreCase("Outros")
                .orElseGet(() -> categoriaRepository.saveAndFlush(Categoria.builder()
                        .nome("Outros").shortDescription("Geral").imagemUrl("/imagens/categorias/outros.jpg")
                        .status(StatusCategoria.APROVADA).build()));
        Servico servico = servicoRepository.saveAndFlush(Servico.builder().nome("Corte")
                .categoria(categoria).duracaoMinutos(30).preco(new BigDecimal("40.00"))
                .ativo(true).profissional(profissional).build());
        Agendamento agendamento = agendamentoRepository.saveAndFlush(Agendamento.builder()
                .cliente(cliente).profissional(profissional).servico(servico)
                .dataHoraInicio(inicio).dataHoraFim(inicio.plusMinutes(30))
                .preco(servico.getPreco()).status(estado).build());
        return new Cenario(new Sessao(proToken, proId), new Sessao(clienteToken, clienteId), agendamento.getId(), inicio);
    }

    private Sessao cadastrarProfissional() throws Exception {
        String email = email();
        String corpo = """
                {"nome":"Profissional Teste","email":"%s","telefone":"11912345678","senha":"%s"}
                """.formatted(email, SENHA);
        MvcResult result = mvc.perform(post("/api/auth/cadastro/profissional")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated()).andReturn();
        return sessao(result);
    }

    private Sessao cadastrarCliente(String nome) throws Exception {
        String corpo = """
                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s"}
                """.formatted(nome, email(), SENHA);
        MvcResult result = mvc.perform(post("/api/auth/cadastro/cliente")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated()).andReturn();
        return sessao(result);
    }

    private Sessao sessao(MvcResult result) throws Exception {
        String json = result.getResponse().getContentAsString();
        return new Sessao(JsonPath.read(json, "$.token"), ((Number) JsonPath.read(json, "$.perfilId")).longValue());
    }

    private Agendamento buscar(Long id) { return agendamentoRepository.findById(id).orElseThrow(); }
    private String email() { return "us03-" + UUID.randomUUID() + "@teste.com"; }

    private record Sessao(String token, Long perfilId) {
        String bearer() { return "Bearer " + token; }
    }
    private record Cenario(Sessao pro, Sessao cliente, Long agendamentoId, LocalDateTime inicio) { }
}
