package com.agendamento.categoria;

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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CategoriaIntegrationTest {

    private static final String SENHA = "123456";
    // Cabeçalho mínimo válido de PNG (8 bytes assinatura + IHDR)
    private static final byte[] PNG_BYTES = new byte[]{
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
    };

    @Autowired private MockMvc mvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Admin cria categoria já aprovada e edita dados; duplicata retorna 409")
    void adminCriaEditaEValidaDuplicidade() throws Exception {
        Sessao admin = cadastrarAdmin();
        String nome = "Fotografia " + sufixo();

        MvcResult res = mvc.perform(post("/api/admin/categorias")
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"%s","shortDescription":"Ensaios e cobertura de eventos","imagemUrl":"/imagens/categorias/outros.jpg"}
                                """.formatted(nome)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("APROVADA"))
                .andReturn();
        Long id = campoLong(res, "id");

        mvc.perform(post("/api/admin/categorias")
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"%s","shortDescription":"Duplicada","imagemUrl":"/imagens/categorias/outros.jpg"}
                                """.formatted(nome.toUpperCase())))
                .andExpect(status().isConflict());

        mvc.perform(put("/api/admin/categorias/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"%s","shortDescription":"Ensaios profissionais","imagemUrl":"/imagens/categorias/estetica.jpg"}
                                """.formatted(nome + " Editada")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortDescription").value("Ensaios profissionais"));

        mvc.perform(get("/api/categorias"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").exists());
    }

    @Test
    @DisplayName("GET /api/cliente/categorias lista apenas categorias aprovadas com ao menos 1 serviço ativo")
    void clienteVeApenasCategoriasAprovadasComServicosAtivos() throws Exception {
        Sessao admin = cadastrarAdmin();
        Sessao pro = cadastrarProfissional("Ana");
        Sessao cliente = cadastrarCliente("Lucas");

        Long catSemServico = campoLong(mvc.perform(post("/api/admin/categorias")
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Vazia %s","shortDescription":"Sem serviços","imagemUrl":"/imagens/categorias/outros.jpg"}
                                """.formatted(sufixo())))
                .andExpect(status().isCreated()).andReturn(), "id");

        Long catComServico = campoLong(mvc.perform(post("/api/admin/categorias")
                        .header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Ativa %s","shortDescription":"Com serviços","imagemUrl":"/imagens/categorias/outros.jpg"}
                                """.formatted(sufixo())))
                .andExpect(status().isCreated()).andReturn(), "id");

        mvc.perform(post("/api/profissional/{id}/servicos", pro.perfilId)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Serviço Ativo","categoriaId":%d,"descricao":"Desc","duracaoMinutos":30,"preco":60.00,"ativo":true,"profissionalId":%d}
                                """.formatted(catComServico, pro.perfilId)))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/cliente/categorias").header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + catSemServico + ")]").doesNotExist())
                .andExpect(jsonPath("$[?(@.id == " + catComServico + ")].totalServicosAtivos").value(org.hamcrest.Matchers.hasItem(1)));
    }

    @Test
    @DisplayName("Upload de imagem válida retorna 201 e arquivo é servido publicamente; formato inválido retorna 400 e cliente recebe 403")
    void uploadEServicoDeImagem() throws Exception {
        Sessao pro = cadastrarProfissional("Upload");
        Sessao cliente = cadastrarCliente("Cliente");

        MockMultipartFile png = new MockMultipartFile("arquivo", "capa.png", "image/png", PNG_BYTES);
        MvcResult uploadRes = mvc.perform(multipart("/api/uploads/imagens").file(png)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("/api/uploads/categorias/")))
                .andReturn();
        String url = JsonPath.read(uploadRes.getResponse().getContentAsString(), "$.url");

        mvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(PNG_BYTES));

        MockMultipartFile falso = new MockMultipartFile("arquivo", "falso.png", "image/png", "texto-falso".getBytes());
        mvc.perform(multipart("/api/uploads/imagens").file(falso)
                        .header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isBadRequest());

        mvc.perform(multipart("/api/uploads/imagens").file(png)
                        .header(HttpHeaders.AUTHORIZATION, cliente.bearer()))
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

    private Sessao cadastrarCliente(String nome) throws Exception {
        String email = "cli-" + sufixo() + "@teste.com";
        MvcResult res = mvc.perform(post("/api/auth/cadastro/cliente")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s"}
                                """.formatted(nome, email, SENHA)))
                .andExpect(status().isCreated()).andReturn();
        return sessao(res);
    }

    private Sessao sessao(MvcResult res) throws Exception {
        String json = res.getResponse().getContentAsString();
        Object pid = JsonPath.read(json, "$.perfilId");
        return new Sessao(JsonPath.read(json, "$.token"), pid instanceof Number n ? n.longValue() : null);
    }

    private Long campoLong(MvcResult res, String campo) throws Exception {
        return ((Number) JsonPath.read(res.getResponse().getContentAsString(), "$." + campo)).longValue();
    }

    private String sufixo() { return UUID.randomUUID().toString().substring(0, 8); }

    private record Sessao(String token, Long perfilId) {
        String bearer() { return "Bearer " + token; }
    }
}
