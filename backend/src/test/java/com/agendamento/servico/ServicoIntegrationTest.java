package com.agendamento.servico;

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
import com.agendamento.usuario.model.PapelUsuario;
import com.agendamento.usuario.model.Usuario;
import com.agendamento.usuario.repository.UsuarioRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
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

import static org.hamcrest.Matchers.containsString;
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
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private AgendamentoRepository agendamentoRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Categoria categoriaPadrao;

    @BeforeEach
    void prepararCategoriaPadrao() {
        categoriaPadrao = categoriaRepository.findByNomeIgnoreCase("Outros")
                .orElseGet(() -> categoriaRepository.saveAndFlush(Categoria.builder()
                        .nome("Outros")
                        .shortDescription("Serviços gerais")
                        .imagemUrl("/imagens/categorias/outros.jpg")
                        .status(StatusCategoria.APROVADA)
                        .build()));
    }

    @Test
    @DisplayName("CT01: profissional cadastra serviço ativo vinculado à própria conta e categoria aprovada")
    void ct01_cadastroPorProfissional() throws Exception {
        Sessao profissional = cadastrarProfissional("Carlos");

        MvcResult result = mvc.perform(post("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Corte degradê", profissional.perfilId, categoriaPadrao.getId(), "50.00")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(jsonPath("$.profissionalId").value(profissional.perfilId))
                .andExpect(jsonPath("$.categoriaId").value(categoriaPadrao.getId()))
                .andExpect(jsonPath("$.categoriaStatus").value("APROVADA"))
                .andReturn();

        Long servicoId = campoLong(result, "id");
        mvc.perform(get("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(servicoId));
    }

    @Test
    @DisplayName("CT03: nome, duração e preço inválidos retornam erros por campo")
    void ct03_validacoes() throws Exception {
        Sessao profissional = cadastrarProfissional("Validacao");
        String corpo = """
                {"nome":"   ","categoriaId":%d,"descricao":"","duracaoMinutos":3,"preco":-10,"ativo":true}
                """.formatted(categoriaPadrao.getId());

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
        Long servicoId = criarServico(profissional, "Corte", categoriaPadrao.getId(), "50.00");
        Long agendamentoId = salvarAgendamento(cliente.perfilId, profissional.perfilId, servicoId, new BigDecimal("50.00"));

        mvc.perform(put("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Corte", profissional.perfilId, categoriaPadrao.getId(), "55.00")))
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
        Long servicoId = criarServico(profissional, "Serviço temporário", categoriaPadrao.getId(), "25.00");

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
        Long servicoId = criarServico(profissional, "Sem agenda", categoriaPadrao.getId(), "10.00");

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
        Long servicoId = criarServico(profissional, "Com agenda", categoriaPadrao.getId(), "30.00");
        salvarAgendamento(cliente.perfilId, profissional.perfilId, servicoId, new BigDecimal("30.00"));

        mvc.perform(delete("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(containsString("Desative-o")));
        assertTrue(servicoRepository.findById(servicoId).isPresent());
    }

    @Test
    @DisplayName("CT08: profissional recebe 404 ao editar serviço de outra pessoa")
    void ct08_isolamentoDePropriedade() throws Exception {
        Sessao profissional1 = cadastrarProfissional("Um");
        Sessao profissional2 = cadastrarProfissional("Dois");
        Long servicoId = criarServico(profissional2, "Privado", categoriaPadrao.getId(), "80.00");

        mvc.perform(put("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional1.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional1.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Tentativa de alteração", profissional1.perfilId, categoriaPadrao.getId(), "1.00")))
                .andExpect(status().isNotFound());
        assertEquals("Privado", servicoRepository.findById(servicoId).orElseThrow().getNome());
    }

    @Test
    @DisplayName("Serviço em categoria PENDENTE é editável pelo prestador e só fica público após aprovação do admin")
    void servicoEmCategoriaPendenteEEditavelETornaPublicoAposAprovacao() throws Exception {
        Sessao admin = cadastrarAdmin();
        Sessao profissional = cadastrarProfissional("Sugeridor");
        Sessao cliente = cadastrarCliente();

        String nomeCat = "Jardinagem " + UUID.randomUUID().toString().substring(0, 6);
        String bodyCat = """
                {"nome":"%s","shortDescription":"Poda e manutenção de jardins","imagemUrl":"/imagens/categorias/outros.jpg"}
                """.formatted(nomeCat);
        MvcResult catRes = mvc.perform(post("/api/profissional/{id}/categorias", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(bodyCat))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andReturn();
        Long catId = campoLong(catRes, "id");

        Long servicoId = criarServico(profissional, "Poda de árvore", catId, "90.00");

        // Invisível para cliente enquanto pendente
        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + servicoId + ")]").doesNotExist());
        mvc.perform(get("/api/cliente/categorias").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + catId + ")]").doesNotExist());

        // Prestador pode editar preço/duração enquanto a categoria está pendente
        mvc.perform(put("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Poda completa", profissional.perfilId, catId, "120.00")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preco").value(120.0))
                .andExpect(jsonPath("$.categoriaStatus").value("PENDENTE"));

        // Admin aprova -> serviço e categoria ficam públicos para o cliente
        mvc.perform(patch("/api/admin/categorias/{id}/aprovar", catId)
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APROVADA"));

        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + servicoId + ")]").exists());
        mvc.perform(get("/api/cliente/categorias").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + catId + ")]").exists());
    }

    @Test
    @DisplayName("Quando admin rejeita categoria, prestador pode editar serviço para categoria aprovada")
    void prestadorPodeTrocarCategoriaDeServicoAposRejeicao() throws Exception {
        Sessao admin = cadastrarAdmin();
        Sessao profissional = cadastrarProfissional("Rejeitado");
        Sessao cliente = cadastrarCliente();

        String nomeCat = "Rejeitavel " + UUID.randomUUID().toString().substring(0, 6);
        String bodyCat = """
                {"nome":"%s","shortDescription":"Categoria temporária","imagemUrl":"/imagens/categorias/outros.jpg"}
                """.formatted(nomeCat);
        Long catPendenteId = campoLong(mvc.perform(post("/api/profissional/{id}/categorias", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(bodyCat))
                .andExpect(status().isCreated()).andReturn(), "id");

        Long servicoId = criarServico(profissional, "Serviço Pendente", catPendenteId, "75.00");

        mvc.perform(patch("/api/admin/categorias/{id}/rejeitar", catPendenteId)
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJEITADA"));

        mvc.perform(get("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].categoriaStatus").value("REJEITADA"));

        // Prestador edita trocando para categoria aprovada -> passa a aparecer ao cliente
        mvc.perform(put("/api/profissional/{profissionalId}/servicos/{servicoId}", profissional.perfilId, servicoId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico("Serviço Aprovado", profissional.perfilId, categoriaPadrao.getId(), "75.00")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoriaStatus").value("APROVADA"));

        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + servicoId + ")]").exists());
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
        usuarioRepository.saveAndFlush(Usuario.builder().email(email).nome("Admin")
                .senha(passwordEncoder.encode(SENHA)).papel(PapelUsuario.ADMIN).ativo(true).build());
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

    private Long criarServico(Sessao profissional, String nome, Long categoriaId, String preco) throws Exception {
        MvcResult result = mvc.perform(post("/api/profissional/{id}/servicos", profissional.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, profissional.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonServico(nome, profissional.perfilId, categoriaId, preco)))
                .andExpect(status().isCreated()).andReturn();
        return campoLong(result, "id");
    }

    private String jsonServico(String nome, Long profissionalId, Long categoriaId, String preco) {
        return """
                {"nome":"%s","categoriaId":%d,"descricao":"Descrição","duracaoMinutos":45,"preco":%s,"ativo":true,"profissionalId":%d}
                """.formatted(nome, categoriaId, preco, profissionalId);
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
