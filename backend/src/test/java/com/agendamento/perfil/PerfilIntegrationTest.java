package com.agendamento.perfil;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PerfilIntegrationTest {

    private static final String SENHA = "123456";

    @Autowired private MockMvc mvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Cliente, Profissional e Admin consultam e atualizam os próprios dados; e-mail duplicado retorna 409")
    void consultarEAtualizarPerfilTodosPapeis() throws Exception {
        Sessao cli1 = cadastrarCliente("Lucas Original");
        String emailOcupado = "ocupado-" + sufixo() + "@teste.com";
        cadastrarClienteComEmail("Outro", emailOcupado);

        mvc.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, cli1.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Lucas Original"))
                .andExpect(jsonPath("$.papel").value("CLIENTE"));

        String novoEmail = "lucas-novo-" + sufixo() + "@teste.com";
        mvc.perform(put("/api/perfil").header(HttpHeaders.AUTHORIZATION, cli1.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Lucas Atualizado","email":"%s","telefone":"(11) 99999-0000"}
                                """.formatted(novoEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Lucas Atualizado"))
                .andExpect(jsonPath("$.email").value(novoEmail));

        mvc.perform(put("/api/perfil").header(HttpHeaders.AUTHORIZATION, cli1.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Lucas","email":"%s","telefone":"(11) 99999-0000"}
                                """.formatted(emailOcupado)))
                .andExpect(status().isConflict());

        Sessao pro = cadastrarProfissional("Carlos Pro");
        mvc.perform(put("/api/perfil").header(HttpHeaders.AUTHORIZATION, pro.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Carlos Silva","email":"%s","telefone":"11988887777","especialidade":"Barbearia","bannerUrl":"/imagens/categorias/barbearia.webp"}
                                """.formatted("pro-novo-" + sufixo() + "@teste.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Carlos Silva"));

        mvc.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, pro.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bannerUrl").value("/imagens/categorias/barbearia.webp"));

        Sessao admin = cadastrarAdmin();
        mvc.perform(put("/api/perfil").header(HttpHeaders.AUTHORIZATION, admin.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nome":"Admin Chefe","email":"%s"}
                                """.formatted("admin-novo-" + sufixo() + "@teste.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Admin Chefe"));
    }

    @Test
    @DisplayName("Alterar senha exige senha atual correta (400 se errada) e autentica com a nova senha após sucesso")
    void alterarSenhaValidaAtualEPermiteLoginNovo() throws Exception {
        String email = "senha-" + sufixo() + "@teste.com";
        Sessao cli = cadastrarClienteComEmail("Ana Senha", email);

        mvc.perform(patch("/api/perfil/senha").header(HttpHeaders.AUTHORIZATION, cli.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"senhaAtual":"errada123","novaSenha":"nova123"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A senha atual está incorreta."));

        mvc.perform(patch("/api/perfil/senha").header(HttpHeaders.AUTHORIZATION, cli.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"senhaAtual":"%s","novaSenha":"novaSenha123"}
                                """.formatted(SENHA)))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"senha\":\"novaSenha123\"}"))
                .andExpect(status().isOk());
    }

    private Sessao cadastrarCliente(String nome) throws Exception {
        return cadastrarClienteComEmail(nome, "cli-" + sufixo() + "@teste.com");
    }

    private Sessao cadastrarClienteComEmail(String nome, String email) throws Exception {
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
                                {"nome":"%s","email":"%s","telefone":"11912345678","senha":"%s"}
                                """.formatted(nome, email, SENHA)))
                .andExpect(status().isCreated()).andReturn();
        return sessao(res);
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

    private Sessao sessao(MvcResult res) throws Exception {
        return new Sessao(JsonPath.read(res.getResponse().getContentAsString(), "$.token"));
    }

    private String sufixo() { return UUID.randomUUID().toString().substring(0, 8); }

    private record Sessao(String token) {
        String bearer() { return "Bearer " + token; }
    }
}
