package com.agendamento.compartilhado;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Test
    @DisplayName("GET /v3/api-docs é público, agrupa atores, documenta novas rotas e expõe esquema bearerAuth")
    void documentacaoOpenApiCompletaEAcessivel() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags[*].name", hasItem("Autenticação")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Cliente")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Profissional")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Administrador")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Categorias")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Uploads")))
                .andExpect(jsonPath("$.tags[*].name", hasItem("Perfil")))
                .andExpect(jsonPath("$.paths['/api/categorias']").exists())
                .andExpect(jsonPath("$.paths['/api/cliente/categorias']").exists())
                .andExpect(jsonPath("$.paths['/api/cliente/servicos/{servicoId}/horarios-livres']").exists())
                .andExpect(jsonPath("$.paths['/api/profissional/{profissionalId}/dashboard']").exists())
                .andExpect(jsonPath("$.paths['/api/admin/usuarios']").exists())
                .andExpect(jsonPath("$.paths['/api/admin/categorias']").exists())
                .andExpect(jsonPath("$.paths['/api/admin/dashboard']").exists())
                .andExpect(jsonPath("$.paths['/api/perfil']").exists())
                .andExpect(jsonPath("$.paths['/api/uploads/imagens']").exists())
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"));
    }

    @Test
    @DisplayName("Swagger UI fica acessível sem autenticação")
    void swaggerUiPublico() throws Exception {
        mvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk());
    }
}
