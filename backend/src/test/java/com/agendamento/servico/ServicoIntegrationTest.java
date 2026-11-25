package com.agendamento.servico;

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
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ServicoIntegrationTest {

    private static final String SENHA = "123456";

    @Autowired private MockMvc mvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private ClienteRepository clienteRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("CT01: profissional cadastra serviço ativo vinculado à própria conta")
    void ct01_cadastroPorProfissional() throws Exception {
        Sessao profissional = cadastrarProfissional("Carlos");

        MvcResult result = mvc.perform(post("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Corte degradê", profissional.perfilId, "50.00")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(jsonPath("$.profissionalId").value(profissional.perfilId))
                .andReturn();

        Long servicoId = campoLong(result, "id");
        mvc.perform(get("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(servicoId));
    }

    @Test
    @DisplayName("CT02: admin escolhe o profissional e o serviço aparece nas duas listas")
    void ct02_cadastroPorAdmin() throws Exception {
        Sessao admin = cadastrarAdmin();
        Sessao profissional = cadastrarProfissional("Beatriz");

        MvcResult result = mvc.perform(post("/api/admin/servicos")
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Limpeza de pele", profissional.perfilId, "140.00")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.profissionalId").value(profissional.perfilId))
                .andReturn();
        Long servicoId = campoLong(result, "id");

        mvc.perform(get("/api/admin/servicos").header(HttpHeaders.AUTHORIZATION, admin.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + servicoId + ")]").exists());
        mvc.perform(get("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(servicoId));
    }

    @Test
    @DisplayName("CT03: nome, duração e preço inválidos retornam erros por campo")
    void ct03_validacoes() throws Exception {
        Sessao profissional = cadastrarProfissional("Validacao");
        String corpo = """
                {"nome":"   ","categoria":"Outros","descricao":"","duracaoMinutos":3,"preco":-10,"ativo":true}
                """;

        mvc.perform(post("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").value("Informe o nome do serviço."))
                .andExpect(jsonPath("$.campos.duracaoMinutos").value("A duração mínima é 5 minutos."))
                .andExpect(jsonPath("$.campos.preco").value("Informe um preço igual ou maior que zero."));
    }

    @Test
    @DisplayName("CT04: editar preço não altera o preço congelado em agendamento existente")
    void ct04_precoHistoricoPreservado() throws Exception {
        Sessao profissional = cadastrarProfissional("Preco");
        Sessao cliente = cadastrarCliente();
        Long servicoId = criarServico(profissional, "Corte", "50.00");
        Long agendamentoId = salvarAgendamento(cliente.perfilId, profissional.perfilId, servicoId, new BigDecimal("50.00"));

        mvc.perform(put("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Corte", profissional.perfilId, "55.00")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.preco").value(55.0));

        Servico atualizado = servicoRepository.findById(servicoId).orElseThrow();
        Agendamento existente = agendamentoRepository.findById(agendamentoId).orElseThrow();
        assertEquals(new BigDecimal("55.00"), atualizado.getPreco());
        assertEquals(new BigDecimal("50.00"), existente.getPreco());
    }

    @Test
    @DisplayName("CT05: desativar serviço remove-o da busca do cliente")
    void ct05_servicoInativoNaoApareceNaBusca() throws Exception {
        Sessao profissional = cadastrarProfissional("Busca");
        Sessao cliente = cadastrarCliente();
        Long servicoId = criarServico(profissional, "Serviço temporário", "25.00");

        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + servicoId + ")]").exists());
        mvc.perform(patch("/api/profissional/{profissionalId}/servicos/{servicoId}/status", profissional.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + servicoId + ")]").doesNotExist());
    }

    @Test
    @DisplayName("CT06: serviço sem agendamentos é excluído")
    void ct06_excluiServicoSemAgendamentos() throws Exception {
        Sessao profissional = cadastrarProfissional("Excluir");
        Long servicoId = criarServico(profissional, "Sem agenda", "10.00");

        mvc.perform(delete("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer()))
                .andExpect(status().isNoContent());
        assertTrue(servicoRepository.findById(servicoId).isEmpty());
    }

    @Test
    @DisplayName("CT07: serviço com agendamentos não pode ser excluído")
    void ct07_bloqueiaExclusaoComAgendamentos() throws Exception {
        Sessao profissional = cadastrarProfissional("Bloqueio");
        Sessao cliente = cadastrarCliente();
        Long servicoId = criarServico(profissional, "Com agenda", "30.00");
        salvarAgendamento(cliente.perfilId, profissional.perfilId, servicoId, new BigDecimal("30.00"));

        mvc.perform(delete("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("Desative-o")));
        assertTrue(servicoRepository.findById(servicoId).isPresent());
    }

    @Test
    @DisplayName("CT08: profissional recebe 404 ao editar serviço de outra pessoa")
    void ct08_isolamentoDePropriedade() throws Exception {
        Sessao profissional1 = cadastrarProfissional("Um");
        Sessao profissional2 = cadastrarProfissional("Dois");
        Long servicoId = criarServico(profissional2, "Privado", "80.00");

        mvc.perform(put("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional1.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional1.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Tentativa de alteração", profissional1.perfilId, "1.00")))
                .andExpect(status().isNotFound());
        assertEquals("Privado", servicoRepository.findById(servicoId).orElseThrow().getNome());
    }

    @Test
    @DisplayName("Admin não pode trocar o profissional de um serviço com agendamentos")
    void adminNaoPodeTrocarResponsavelDeServicoComAgendamentos() throws Exception {
        Sessao admin = cadastrarAdmin();
        Sessao profissionalOriginal = cadastrarProfissional("Original");
        Sessao profissionalNovo = cadastrarProfissional("Novo");
        Sessao cliente = cadastrarCliente();
        Long servicoId = criarServico(profissionalOriginal, "Servico vinculado", "30.00");
        salvarAgendamento(cliente.perfilId, profissionalOriginal.perfilId, servicoId, new BigDecimal("30.00"));

        mvc.perform(put("/api/admin/servicos/{id}", servicoId)
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Servico vinculado", profissionalNovo.perfilId, "30.00")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("agendamentos vinculados")));

        assertEquals(profissionalOriginal.perfilId,
                servicoRepository.findById(servicoId).orElseThrow().getProfissional().getId());
    }

    private Sessao cadastrarProfissional(String nome) throws Exception {
        String email = email(nome);
        String corpo = """
                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s","especialidade":"Outros"}
                """.formatted(nome, email, SENHA);
        MvcResult result = mvc.perform(post("/api/auth/cadastro/profissional")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated()).andReturn();
        return sessao(result);
    }

    private Sessao cadastrarCliente() throws Exception {
        String corpo = """
                {"nome":"Cliente Teste","email":"%s","telefone":"11912345678","senha":"%s"}
                """.formatted(email("cliente"), SENHA);
        MvcResult result = mvc.perform(post("/api/auth/cadastro/cliente")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated()).andReturn();
        return sessao(result);
    }

    private Sessao cadastrarAdmin() throws Exception {
        String email = email("admin");
        usuarioRepository.saveAndFlush(Usuario.builder().email(email).senha(passwordEncoder.encode(SENHA))
                .papel(PapelUsuario.ADMIN).build());
        String corpo = """
                {"email":"%s","senha":"%s"}
                """.formatted(email, SENHA);
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk()).andReturn();
        return sessao(result);
    }

    private Sessao sessao(MvcResult result) throws Exception {
        String corpo = result.getResponse().getContentAsString();
        Object perfilId = JsonPath.read(corpo, "$.perfilId");
        Long id = perfilId instanceof Number numero ? numero.longValue() : null;
        return new Sessao(JsonPath.read(corpo, "$.token"), id);
    }

    private Long criarServico(Sessao profissional, String nome, String preco) throws Exception {
        MvcResult result = mvc.perform(post("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico(nome, profissional.perfilId, preco)))
                .andExpect(status().isCreated()).andReturn();
        return campoLong(result, "id");
    }

    private String jsonServico(String nome, Long profissionalId, String preco) throws Exception {
        return """
                {"nome":"%s","categoria":"Outros","descricao":"Descrição","duracaoMinutos":45,"preco":%s,"ativo":true,"profissionalId":%d}
                """.formatted(nome, preco, profissionalId);
    }

    private Long campoLong(MvcResult result, String campo) throws Exception {
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$." + campo)).longValue();
    }

    private Long salvarAgendamento(Long clienteId, Long profissionalId, Long servicoId, BigDecimal preco) {
        Cliente cliente = clienteRepository.findById(clienteId).orElseThrow();
        Profissional profissional = profissionalRepository.findById(profissionalId).orElseThrow();
        Servico servico = servicoRepository.findById(servicoId).orElseThrow();
        LocalDateTime inicio = LocalDateTime.now().plusDays(4).withSecond(0).withNano(0);
        Agendamento salvo = agendamentoRepository.saveAndFlush(Agendamento.builder()
                .cliente(cliente).profissional(profissional).servico(servico)
                .dataHoraInicio(inicio).dataHoraFim(inicio.plusMinutes(servico.getDuracaoMinutos()))
                .preco(preco).status(StatusAgendamento.AGENDADO).build());
        return salvo.getId();
    }

    private String email(String prefixo) {
        return prefixo.toLowerCase() + "-" + UUID.randomUUID() + "@teste.com";
    }

    private record Sessao(String token, Long perfilId) {
        String bearer() { return "Bearer " + token; }
    }
}
