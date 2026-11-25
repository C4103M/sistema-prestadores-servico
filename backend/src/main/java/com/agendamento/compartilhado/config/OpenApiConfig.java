package com.agendamento.compartilhado.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    public static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI agendeFacilOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AgendeFácil — API de Agendamento de Serviços")
                        .version("v1")
                        .description("""
                                API REST do sistema de agendamento para prestadores de serviço.

                                **Atores e permissões:**
                                - **Autenticação**: cadastro (`CLIENTE` e `PROFISSIONAL`), login e renovação de sessão JWT.
                                - **Cliente**: visualização de categorias com serviços ativos, busca de serviços/profissionais, consulta de horários livres (`RN01`/`RN02`), reserva transacional com preço congelado (`RN05`) e cancelamento com antecedência mínima de 2h (`RN03`).
                                - **Profissional**: manutenção de serviços, sugestão de categorias (pendentes até aprovação do Admin), faixas de disponibilidade semanal, agenda diária, conclusão/falta (`RN04`, `RN06`), cancelamento sem regra de 2h e dashboard de métricas por período.
                                - **Administrador**: ativação/desativação de usuários, gestão e aprovação de categorias/especialidades e dashboard consolidado da plataforma.
                                - **Perfil & Uploads**: consulta/edição de dados pessoais e troca de senha para todos os perfis (`GET/PUT /api/perfil`, `PATCH /api/perfil/senha`) e envio de imagens de categoria (`POST /api/uploads/imagens`).

                                **Autenticação:** clique em **Authorize** e informe o token JWT obtido em `POST /api/auth/login`.
                                **Erros:** respostas de erro seguem RFC 7807 (`ProblemDetail`) com códigos `400`, `401`, `403`, `404` e `409`."""))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components().addSecuritySchemes(
                        SECURITY_SCHEME_NAME,
                        new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                ));
    }
}
