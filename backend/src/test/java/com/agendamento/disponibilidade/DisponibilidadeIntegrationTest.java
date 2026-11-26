package com.agendamento.disponibilidade;

import com.agendamento.agendamento.model.Agendamento;
import com.agendamento.agendamento.model.StatusAgendamento;
import com.agendamento.agendamento.repository.AgendamentoRepository;
import com.agendamento.categoria.model.Categoria;
import com.agendamento.categoria.model.StatusCategoria;
import com.agendamento.categoria.repository.CategoriaRepository;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.cliente.repository.ClienteRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DisponibilidadeIntegrationTest {
    private static final String SENHA = "123456";

    @Autowired private MockMvc mvc;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private ClienteRepository clienteRepository;
    @Autowired private DisponibilidadeRepository disponibilidadeRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;

    @Test
    @DisplayName("CT01/CT02: cadastra mais de uma faixa sem sobreposição no mesmo dia")
    void criaMultiplasFaixasNoMesmoDia() throws Exception {
        Sessao pro = cadastrarProfissional();
        Long manha = criarFaixa(pro, "09:00", "12:00");
        criarFaixa(pro, "13:00", "18:00");

        mvc.perform(get("/api/profissional/{id}/disponibilidades", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].horaInicio").value("09:00:00"))
                .andExpect(jsonPath("$[1].horaInicio").value("13:00:00"));
        assertTrue(disponibilidadeRepository.findById(manha).isPresent());
    }

    @Test
    @DisplayName("CT03: rejeita faixa cujo fim é igual ou anterior ao início")
    void rejeitaFimInvalido() throws Exception {
        Sessao pro = cadastrarProfissional();
        String json = faixaJson("SEGUNDA", "14:00", "13:00");

        mvc.perform(post("/api/profissional/{id}/disponibilidades", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("O fim precisa ser depois do início."));
        mvc.perform(post("/api/profissional/{id}/disponibilidades", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(faixaJson("SEGUNDA", "14:00", "14:00")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("O fim precisa ser depois do início."));
        assertTrue(disponibilidadeRepository.findByProfissionalId(pro.perfilId).isEmpty());
    }

    @Test
    @DisplayName("CT04: rejeita sobreposição de faixa no mesmo dia")
    void rejeitaSobreposicao() throws Exception {
        Sessao pro = cadastrarProfissional();
        criarFaixa(pro, "09:00", "12:00");

        mvc.perform(post("/api/profissional/{id}/disponibilidades", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(faixaJson("SEGUNDA", "11:00", "15:00")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Essa faixa se sobrepõe a outra do mesmo dia."));
        assertEquals(1, disponibilidadeRepository.findByProfissionalId(pro.perfilId).size());
    }

    @Test
    @DisplayName("CT05: edita faixa com validação e atualiza os dados persistidos")
    void editaFaixa() throws Exception {
        Sessao pro = cadastrarProfissional();
        Long id = criarFaixa(pro, "09:00", "12:00");

        mvc.perform(put("/api/profissional/{profissionalId}/disponibilidades/{id}", pro.perfilId, id)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(faixaJson("SEGUNDA", "09:00", "12:30")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.horaFim").value("12:30:00"));
        assertEquals(LocalTime.of(12, 30), disponibilidadeRepository.findById(id).orElseThrow().getHoraFim());

        criarFaixa(pro, "13:00", "15:00");
        mvc.perform(put("/api/profissional/{profissionalId}/disponibilidades/{id}", pro.perfilId, id)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(faixaJson("SEGUNDA", "12:00", "14:00")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Essa faixa se sobrepõe a outra do mesmo dia."));
        assertEquals(LocalTime.of(12, 30), disponibilidadeRepository.findById(id).orElseThrow().getHoraFim());
    }

    @Test
    @DisplayName("CT06: remove faixa confirmada sem remover agendamentos existentes")
    void removeFaixaPreservandoAgendamento() throws Exception {
        Sessao pro = cadastrarProfissional();
        Sessao cliente = cadastrarCliente();
        Long faixaId = criarFaixa(pro, "13:00", "18:00", "SEXTA");
        LocalDate proximaSexta = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.FRIDAY));
        Profissional profissional = profissionalRepository.findById(pro.perfilId).orElseThrow();
        Cliente entidadeCliente = clienteRepository.findById(cliente.perfilId).orElseThrow();
        Categoria cat = categoriaAprovada();
        Servico servico = servicoRepository.saveAndFlush(Servico.builder().nome("Serviço")
                .categoria(cat).duracaoMinutos(30).preco(new BigDecimal("40.00"))
                .ativo(true).profissional(profissional).build());
        LocalDateTime inicio = proximaSexta.atTime(14, 0);
        Agendamento agendamento = agendamentoRepository.saveAndFlush(Agendamento.builder()
                .cliente(entidadeCliente).profissional(profissional).servico(servico)
                .dataHoraInicio(inicio).dataHoraFim(inicio.plusMinutes(30))
                .preco(servico.getPreco()).status(StatusAgendamento.AGENDADO).build());

        mvc.perform(delete("/api/profissional/{profissionalId}/disponibilidades/{id}", pro.perfilId, faixaId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isNoContent());
        assertTrue(disponibilidadeRepository.findById(faixaId).isEmpty());
        assertTrue(agendamentoRepository.findById(agendamento.getId()).isPresent());
    }

    @Test
    @DisplayName("CT07: recusa agendamento fora de qualquer faixa com HTTP 409")
    void recusaAgendamentoForaDaDisponibilidade() throws Exception {
        Sessao pro = cadastrarProfissional();
        Sessao cliente = cadastrarCliente();
        Profissional profissional = profissionalRepository.findById(pro.perfilId).orElseThrow();
        Categoria cat = categoriaAprovada();
        Servico servico = servicoRepository.saveAndFlush(Servico.builder().nome("Serviço")
                .categoria(cat).duracaoMinutos(30).preco(new BigDecimal("40.00"))
                .ativo(true).profissional(profissional).build());
        LocalDate proximaSegunda = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        String corpo = """
                {"profissionalId":%d,"servicoId":%d,"dataHoraInicio":"%s"}
                """.formatted(pro.perfilId, servico.getId(), proximaSegunda.atTime(8, 0));

        mvc.perform(post("/api/cliente/{clienteId}/agendamentos", cliente.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("O horário escolhido está fora da disponibilidade do profissional."));
        assertTrue(agendamentoRepository.findByProfissionalIdOrderByDataHoraInicioAsc(pro.perfilId).isEmpty());
    }

    private Sessao cadastrarProfissional() throws Exception {
        String nome = "Profissional Teste";
        String email = email();
        String json = """
                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s"}
                """.formatted(nome, email, SENHA);
        MvcResult result = mvc.perform(post("/api/auth/cadastro/profissional")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn();
        return sessao(result);
    }

    private Sessao cadastrarCliente() throws Exception {
        String json = """
                {"nome":"Cliente Teste","email":"%s","telefone":"11912345678","senha":"%s"}
                """.formatted(email(), SENHA);
        MvcResult result = mvc.perform(post("/api/auth/cadastro/cliente")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn();
        return sessao(result);
    }

    private Long criarFaixa(Sessao pro, String inicio, String fim) throws Exception {
        return criarFaixa(pro, inicio, fim, "SEGUNDA");
    }

    private Long criarFaixa(Sessao pro, String inicio, String fim, String dia) throws Exception {
        MvcResult result = mvc.perform(post("/api/profissional/{id}/disponibilidades", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(faixaJson(dia, inicio, fim)))
                .andExpect(status().isCreated()).andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private String faixaJson(String dia, String inicio, String fim) {
        return "{\"diaSemana\":\"%s\",\"horaInicio\":\"%s\",\"horaFim\":\"%s\"}"
                .formatted(dia, inicio, fim);
    }

    private Sessao sessao(MvcResult result) throws Exception {
        String json = result.getResponse().getContentAsString();
        return new Sessao(JsonPath.read(json, "$.token"), ((Number) JsonPath.read(json, "$.perfilId")).longValue());
    }

    private Categoria categoriaAprovada() {
        return categoriaRepository.findByNomeIgnoreCase("Geral")
                .orElseGet(() -> categoriaRepository.saveAndFlush(Categoria.builder()
                        .nome("Geral")
                        .shortDescription("Serviços gerais")
                        .imagemUrl("/imagens/categorias/outros.jpg")
                        .status(StatusCategoria.APROVADA)
                        .build()));
    }

    private String email() { return "teste-" + UUID.randomUUID() + "@teste.com"; }

    private record Sessao(String token, Long perfilId) {
        String bearer() { return "Bearer " + token; }
    }
}
