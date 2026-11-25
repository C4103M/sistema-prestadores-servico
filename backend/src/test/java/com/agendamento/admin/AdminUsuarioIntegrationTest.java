package com.agendamento.admin;

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

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminUsuarioIntegrationTest {

    private static final String SENHA = "123456";

    @Autowired private MockMvc mvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Admin desativa cliente: login retorna 403 e JWT existente é bloqueado imediatamente; ao reativar volta a funcionar")
    void desativarEReativarClienteBloqueiaLoginEJwt() throws Exception {
        Sessao admin = cadastrarAdmin();
        String emailCliente = "cli-" + sufixo() + "@teste.com";
        Sessao cliente = cadastrarCliente("Cliente Ativo", emailCliente);

        mvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .param("busca", emailCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(cliente.usuarioId))
                .andExpect(jsonPath("$[0].ativo").value(true));

        mvc.perform(patch("/api/admin/usuarios/{id}/status", cliente.usuarioId)
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));

        // Login negado
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + emailCliente + "\",\"senha\":\"" + SENHA + "\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Sua conta está desativada. Entre em contato com o administrador."));

        // JWT emitido antes da desativação é revogado imediatamente no filtro
        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isForbidden());

        // Reativação devolve acesso
        mvc.perform(patch("/api/admin/usuarios/{id}/status", cliente.usuarioId)
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(true));

        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Desativar profissional oculta seus serviços e a categoria exclusiva da área do cliente")
    void desativarProfissionalOcultaServicosECategoria() throws Exception {
        Sessao admin = cadastrarAdmin();
        Sessao pro = cadastrarProfissional("Profissional Inativo");
        Sessao cliente = cadastrarCliente("Cliente Teste", "cli2-" + sufixo() + "@teste.com");

        Long catId = campoLong(mvc.perform(post("/api/admin/categorias")
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Exclusiva %s","shortDescription":"Categoria exclusiva","imagemUrl":"/imagens/categorias/outros.jpg"}
                                """.formatted(sufixo())))
                .andExpect(status().isCreated()).andReturn(), "id");

        Long servicoId = campoLong(mvc.perform(post("/api/profissional/{id}/servicos", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Serviço Exclusivo","categoriaId":%d,"descricao":"Desc","duracaoMinutos":30,"preco":80.00,"ativo":true,"profissionalId":%d}
                                """.formatted(catId, pro.perfilId)))
                .andExpect(status().isCreated()).andReturn(), "id");

        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + servicoId + ")]").exists());
        mvc.perform(get("/api/cliente/categorias").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + catId + ")]").exists());

        // Admin desativa o profissional
        mvc.perform(patch("/api/admin/usuarios/{id}/status", pro.usuarioId)
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));

        mvc.perform(get("/api/cliente/servicos").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + servicoId + ")]").doesNotExist());
        mvc.perform(get("/api/cliente/categorias").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + catId + ")]").doesNotExist());
    }

    @Test
    @DisplayName("Admin não pode desativar a própria conta (409) e não-admin recebe 403")
    void protecoesDeAcessoEDesativacaoPropria() throws Exception {
        Sessao admin = cadastrarAdmin();
        Sessao cliente = cadastrarCliente("Comum", "comum-" + sufixo() + "@teste.com");

        mvc.perform(patch("/api/admin/usuarios/{id}/status", admin.usuarioId)
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer()))
                .andExpect(status().isConflict());

        mvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isForbidden());
    }

    private Sessao cadastrarAdmin() throws Exception {
        String email = "admin-" + sufixo() + "@teste.com";
        usuarioRepository.saveAndFlush(Usuario.builder().email(email).nome("Admin")
                .senha(passwordEncoder.encode(SENHA)).papel(PapelUsuario.ADMIN).ativo(true).build());
        MvcResult res = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"senha\":\"" + SENHA + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return sessao(res);
    }

    private Sessao cadastrarCliente(String nome, String email) throws Exception {
        MvcResult res = mvc.perform(post("/api/auth/cadastro/cliente")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s"}
                                """.formatted(nome, email, SENHA)))
                .andExpect(status().isCreated()).andReturn();
        return sessao(res);
    }

    private Sessao cadastrarProfissional(String nome) throws Exception {
        String email = "pro-" + sufixo() + "@teste.com";
        MvcResult res = mvc.perform(post("/api/auth/cadastro/profissional")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s","especialidade":"Geral"}
                                """.formatted(nome, email, SENHA)))
                .andExpect(status().isCreated()).andReturn();
        return sessao(res);
    }

    private Sessao sessao(MvcResult res) throws Exception {
        String json = res.getResponse().getContentAsString();
        Object pid = JsonPath.read(json, "$.perfilId");
        return new Sessao(
                JsonPath.read(json, "$.token"),
                ((Number) JsonPath.read(json, "$.usuarioId")).longValue(),
                pid instanceof Number n ? n.longValue() : null);
    }

    private Long campoLong(MvcResult res, String campo) throws Exception {
        return ((Number) JsonPath.read(res.getResponse().getContentAsString(), "$." + campo)).longValue();
    }

    private String sufixo() { return UUID.randomUUID().toString().substring(0, 8); }

    private record Sessao(String token, Long usuarioId, Long perfilId) {
        String bearer() { return "Bearer " + token; }
    }
}
