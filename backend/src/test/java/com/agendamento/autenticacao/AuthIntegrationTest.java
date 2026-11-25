package com.agendamento.autenticacao;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
// Spring Boot 4: o pacote mudou para org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Cenários de aceitação CT01–CT08 da US01 (parte do backend) + proteção por papel e por dono. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mvc;

    private static String emailUnico(String prefixo) {
        return prefixo + "-" + UUID.randomUUID() + "@teste.com";
    }

    private static String jsonCliente(String nome, String email) {
        return """
                {"nome":"%s","email":"%s","telefone":"(11) 91234-5678","senha":"123456"}
                """.formatted(nome, email);
    }

    private static String jsonProfissional(String nome, String email, String especialidade) {
        return """
                {"nome":"%s","email":"%s","telefone":"(11) 91234-5678","senha":"123456","especialidade":"%s"}
                """.formatted(nome, email, especialidade);
    }

    private static String jsonLogin(String email, String senha) {
        return """
                {"email":"%s","senha":"%s"}
                """.formatted(email, senha);
    }

    private ResultActions postJson(String url, String json) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String corpo(ResultActions r) throws Exception {
        return r.andReturn().getResponse().getContentAsString();
    }

    @Test
    @DisplayName("CT01: cadastra Cliente e já devolve sessão com papel CLIENTE")
    void ct01_cadastroCliente() throws Exception {
        postJson("/api/auth/cadastro/cliente", jsonCliente("Lucas Pereira", emailUnico("lucas")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.papel").value("CLIENTE"))
                .andExpect(jsonPath("$.perfilId").isNumber());
    }

    @Test
    @DisplayName("CT02: cadastra Profissional com especialidade e devolve papel PROFISSIONAL")
    void ct02_cadastroProfissional() throws Exception {
        postJson("/api/auth/cadastro/profissional", jsonProfissional("Carlos Silva", emailUnico("carlos"), "Barbearia"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.papel").value("PROFISSIONAL"));
    }

    @Test
    @DisplayName("CT03: nome vazio é rejeitado com \"Informe o nome.\"")
    void ct03_nomeObrigatorio() throws Exception {
        postJson("/api/auth/cadastro/cliente", jsonCliente("", emailUnico("sem-nome")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").value("Informe o nome."));
    }

    @Test
    @DisplayName("CT04: e-mail inválido é rejeitado com \"Informe um e-mail válido.\"")
    void ct04_emailInvalido() throws Exception {
        postJson("/api/auth/cadastro/cliente", jsonCliente("Ana Costa", "isso-nao-e-email"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.email").value("Informe um e-mail válido."));
    }

    @Test
    @DisplayName("CT05: Profissional pode se cadastrar sem informar especialidade")
    void ct05_profissionalSemEspecialidade() throws Exception {
        postJson("/api/auth/cadastro/profissional", jsonProfissional("Marcos Andrade", emailUnico("marcos"), ""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.papel").value("PROFISSIONAL"));
    }

    @Test
    @DisplayName("CT06: e-mail já cadastrado (inclusive com outra caixa) é rejeitado")
    void ct06_emailDuplicado() throws Exception {
        String email = emailUnico("duplicado");
        postJson("/api/auth/cadastro/cliente", jsonCliente("Primeiro", email)).andExpect(status().isCreated());

        postJson("/api/auth/cadastro/cliente", jsonCliente("Segundo", email.toUpperCase()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Já existe uma conta com este e-mail."));
    }

    @Test
    @DisplayName("CT07: login válido devolve token e papel para redirecionar")
    void ct07_loginValido() throws Exception {
        String email = emailUnico("login");
        postJson("/api/auth/cadastro/profissional", jsonProfissional("Beatriz Mendes", email, "Estética"))
                .andExpect(status().isCreated());

        postJson("/api/auth/login", jsonLogin(email, "123456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.papel").value("PROFISSIONAL"));
    }

    @Test
    @DisplayName("CT08: senha errada e e-mail inexistente dão a MESMA resposta 401")
    void ct08_credenciaisIncorretas() throws Exception {
        String email = emailUnico("cred");
        postJson("/api/auth/cadastro/cliente", jsonCliente("Rafael Lima", email)).andExpect(status().isCreated());

        String senhaErrada = corpo(postJson("/api/auth/login", jsonLogin(email, "errada1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("E-mail ou senha incorretos.")));

        String emailInexistente = corpo(postJson("/api/auth/login", jsonLogin(emailUnico("fantasma"), "123456"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("E-mail ou senha incorretos.")));

        org.junit.jupiter.api.Assertions.assertEquals(senhaErrada, emailInexistente);
    }

    // ---- Proteção por papel e por dono

    @Test
    @DisplayName("Sem token: 401 em rota protegida")
    void semToken() throws Exception {
        mvc.perform(get("/api/cliente/servicos")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Token de Cliente não acessa área do Profissional nem do Admin (403)")
    void papelErrado() throws Exception {
        String token = JsonPath.read(corpo(postJson("/api/auth/cadastro/cliente",
                jsonCliente("Pedro Alves", emailUnico("pedro")))), "$.token");

        mvc.perform(get("/api/admin/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/profissional/1/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/cliente/servicos").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Cliente só acessa os próprios agendamentos (403 no id de outro cliente)")
    void soODono() throws Exception {
        String respA = corpo(postJson("/api/auth/cadastro/cliente", jsonCliente("A", emailUnico("a"))));
        String respB = corpo(postJson("/api/auth/cadastro/cliente", jsonCliente("B", emailUnico("b"))));
        String tokenA = JsonPath.read(respA, "$.token");
        Number idA = JsonPath.read(respA, "$.perfilId");
        Number idB = JsonPath.read(respB, "$.perfilId");

        mvc.perform(get("/api/cliente/" + idA + "/agendamentos").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk());
        mvc.perform(get("/api/cliente/" + idB + "/agendamentos").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Renovar sessão devolve novo token para quem está autenticado")
    void renovarSessao() throws Exception {
        String token = JsonPath.read(corpo(postJson("/api/auth/cadastro/cliente",
                jsonCliente("Renova", emailUnico("renova")))), "$.token");

        mvc.perform(post("/api/auth/renovar").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())));
        mvc.perform(post("/api/auth/renovar")).andExpect(status().isUnauthorized());
    }
}
