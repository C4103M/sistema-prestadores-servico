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
import com.agendamento.usuario.model.PapelUsuario;
import com.agendamento.usuario.model.Usuario;
import com.agendamento.usuario.repository.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Cenários de aceitação CT01–CT06 da US07 + validação de período inválido nos dashboards. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardIntegrationTest {

    private static final String SENHA = "123456";

    @Autowired private MockMvc mvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private ClienteRepository clienteRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("CT01: dashboard do profissional filtra período, soma apenas CONCLUIDO e calcula comparecimento")
    void ct01_dashboardProfissionalNoPeriodo() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Dash");
        Sessao cliente = cadastrarCliente("Lucas");
        Servico corte = salvarServico(pro.perfilId, "Corte degradê", "50.00");
        Servico barba = salvarServico(pro.perfilId, "Barba", "40.00");
        Servico combo = salvarServico(pro.perfilId, "Corte + barba", "85.00");

        LocalDate inicio = LocalDate.now().withDayOfMonth(1);
        LocalDate fim = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());
        LocalDateTime dentro = inicio.atTime(10, 0);
        LocalDateTime fora = inicio.minusMonths(1).atTime(10, 0);

        salvarAgendamento(cliente.perfilId, pro.perfilId, corte, dentro, StatusAgendamento.CONCLUIDO);
        salvarAgendamento(cliente.perfilId, pro.perfilId, barba, dentro.plusHours(1), StatusAgendamento.CONCLUIDO);
        salvarAgendamento(cliente.perfilId, pro.perfilId, combo, dentro.plusHours(2), StatusAgendamento.CONCLUIDO);
        salvarAgendamento(cliente.perfilId, pro.perfilId, corte, dentro.plusHours(3), StatusAgendamento.CANCELADO);
        salvarAgendamento(cliente.perfilId, pro.perfilId, barba, dentro.plusHours(4), StatusAgendamento.FALTOU);
        salvarAgendamento(cliente.perfilId, pro.perfilId, combo, fora, StatusAgendamento.CONCLUIDO);

        mvc.perform(get("/api/profissional/{id}/dashboard", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .param("de", inicio.toString())
                        .param("ate", fim.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faturamentoTotal").value(175.0))
                .andExpect(jsonPath("$.concluidos").value(3))
                .andExpect(jsonPath("$.cancelados").value(1))
                .andExpect(jsonPath("$.faltas").value(1))
                .andExpect(jsonPath("$.taxaComparecimento").value(75.0));
    }

    @Test
    @DisplayName("CT02: faturamento por serviço é ordenado do maior para o menor")
    void ct02_faturamentoPorServicoOrdenado() throws Exception {
        Sessao pro = cadastrarProfissional("Beatriz Servicos");
        Sessao cliente = cadastrarCliente("Mariana");
        Servico barato = salvarServico(pro.perfilId, "Sobrancelha", "35.00");
        Servico caro = salvarServico(pro.perfilId, "Limpeza de pele", "140.00");
        Servico medio = salvarServico(pro.perfilId, "Massagem", "90.00");

        LocalDate hoje = LocalDate.now();
        salvarAgendamento(cliente.perfilId, pro.perfilId, barato, hoje.minusDays(2).atTime(9, 0), StatusAgendamento.CONCLUIDO);
        salvarAgendamento(cliente.perfilId, pro.perfilId, caro, hoje.minusDays(2).atTime(11, 0), StatusAgendamento.CONCLUIDO);
        salvarAgendamento(cliente.perfilId, pro.perfilId, medio, hoje.minusDays(1).atTime(10, 0), StatusAgendamento.CONCLUIDO);

        mvc.perform(get("/api/profissional/{id}/dashboard", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .param("de", hoje.minusDays(5).toString())
                        .param("ate", hoje.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.porServico", hasSize(3)))
                .andExpect(jsonPath("$.porServico[0].servicoNome").value("Limpeza de pele"))
                .andExpect(jsonPath("$.porServico[0].faturamento").value(140.0))
                .andExpect(jsonPath("$.porServico[1].servicoNome").value("Massagem"))
                .andExpect(jsonPath("$.porServico[2].servicoNome").value("Sobrancelha"));
    }

    @Test
    @DisplayName("CT03: dashboard do admin consolida múltiplos profissionais no período")
    void ct03_dashboardAdminConsolidado() throws Exception {
        Sessao admin = cadastrarAdmin();
        Sessao pro1 = cadastrarProfissional("Marcos Admin");
        Sessao pro2 = cadastrarProfissional("Ana Admin");
        Sessao cliente = cadastrarCliente("Rafael");
        Servico s1 = salvarServico(pro1.perfilId, "Quadro elétrico", "200.00");
        Servico s2 = salvarServico(pro2.perfilId, "Consultoria", "100.00");

        LocalDate base = LocalDate.of(2026, 2, 10);
        salvarAgendamento(cliente.perfilId, pro1.perfilId, s1, base.atTime(9, 0), StatusAgendamento.CONCLUIDO);
        salvarAgendamento(cliente.perfilId, pro2.perfilId, s2, base.atTime(11, 0), StatusAgendamento.CONCLUIDO);
        salvarAgendamento(cliente.perfilId, pro2.perfilId, s2, base.atTime(14, 0), StatusAgendamento.FALTOU);

        mvc.perform(get("/api/admin/dashboard")
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .param("de", base.minusDays(1).toString())
                        .param("ate", base.plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totais.faturamentoTotal").value(300.0))
                .andExpect(jsonPath("$.totais.concluidos").value(2))
                .andExpect(jsonPath("$.totais.faltas").value(1))
                .andExpect(jsonPath("$.totais.taxaComparecimento").value(66.7))
                .andExpect(jsonPath("$.porProfissional", hasSize(2)))
                .andExpect(jsonPath("$.porProfissional[0].profissionalId").value(pro1.perfilId))
                .andExpect(jsonPath("$.porProfissional[0].faturamento").value(200.0))
                .andExpect(jsonPath("$.porProfissional[1].profissionalId").value(pro2.perfilId))
                .andExpect(jsonPath("$.porProfissional[1].faturamento").value(100.0));
    }

    @Test
    @DisplayName("CT04: agendados futuros contam em agendadosFuturos sem entrar no faturamento")
    void ct04_agendadosFuturosSemFaturamento() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Futuros");
        Sessao cliente = cadastrarCliente("João");
        Servico s = salvarServico(pro.perfilId, "Corte", "50.00");

        LocalDate amanha = LocalDate.now().plusDays(1);
        salvarAgendamento(cliente.perfilId, pro.perfilId, s, amanha.atTime(10, 0), StatusAgendamento.AGENDADO);
        salvarAgendamento(cliente.perfilId, pro.perfilId, s, amanha.atTime(14, 0), StatusAgendamento.AGENDADO);

        mvc.perform(get("/api/profissional/{id}/dashboard", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .param("de", LocalDate.now().toString())
                        .param("ate", amanha.plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agendadosFuturos").value(2))
                .andExpect(jsonPath("$.faturamentoTotal").value(0));
    }

    @Test
    @DisplayName("CT05: período vazio zera indicadores, retorna listas vazias e taxaComparecimento nula")
    void ct05_periodoVazioSemDivisaoPorZero() throws Exception {
        Sessao pro = cadastrarProfissional("Carlos Vazio");
        LocalDate antigoInicio = LocalDate.of(2020, 1, 1);
        LocalDate antigoFim = LocalDate.of(2020, 1, 31);

        mvc.perform(get("/api/profissional/{id}/dashboard", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .param("de", antigoInicio.toString())
                        .param("ate", antigoFim.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAtendimentos").value(0))
                .andExpect(jsonPath("$.concluidos").value(0))
                .andExpect(jsonPath("$.cancelados").value(0))
                .andExpect(jsonPath("$.faltas").value(0))
                .andExpect(jsonPath("$.agendadosFuturos").value(0))
                .andExpect(jsonPath("$.faturamentoTotal").value(0))
                .andExpect(jsonPath("$.taxaComparecimento").value(nullValue()))
                .andExpect(jsonPath("$.porServico").isEmpty());
    }

    @Test
    @DisplayName("CT06 e validação: escopo isolado por profissional (403) e período inválido retorna 400")
    void ct06_escopoEPeriodoInvalido() throws Exception {
        Sessao pro1 = cadastrarProfissional("Profissional Um");
        Sessao pro2 = cadastrarProfissional("Profissional Dois");
        Sessao cliente = cadastrarCliente("Pedro");
        Servico s2 = salvarServico(pro2.perfilId, "Privado", "300.00");
        salvarAgendamento(cliente.perfilId, pro2.perfilId, s2, LocalDate.now().atTime(9, 0), StatusAgendamento.CONCLUIDO);

        mvc.perform(get("/api/profissional/{id}/dashboard", pro1.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro1.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faturamentoTotal").value(0));

        mvc.perform(get("/api/profissional/{id}/dashboard", pro2.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro1.bearer()))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/profissional/{id}/dashboard", pro1.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro1.bearer())
                        .param("de", "2026-05-10")
                        .param("ate", "2026-05-01"))
                .andExpect(status().isBadRequest());
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

    private Sessao cadastrarAdmin() throws Exception {
        String email = email();
        usuarioRepository.saveAndFlush(Usuario.builder().email(email).senha(passwordEncoder.encode(SENHA))
                .papel(PapelUsuario.ADMIN).build());
        String json = """
                {"email":"%s","senha":"%s"}
                """.formatted(email, SENHA);
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk()).andReturn();
        return sessao(result);
    }

    private Servico salvarServico(Long proId, String nome, String preco) {
        Profissional pro = profissionalRepository.findById(proId).orElseThrow();
        return servicoRepository.saveAndFlush(Servico.builder()
                .nome(nome).categoria("Geral").duracaoMinutos(45)
                .preco(new BigDecimal(preco)).ativo(true).profissional(pro).build());
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
        Object perfilId = JsonPath.read(json, "$.perfilId");
        Long id = perfilId instanceof Number n ? n.longValue() : null;
        return new Sessao(JsonPath.read(json, "$.token"), id);
    }

    private String email() { return "us07-" + UUID.randomUUID() + "@teste.com"; }

    private record Sessao(String token, Long perfilId) {
        String bearer() { return "Bearer " + token; }
    }
}
