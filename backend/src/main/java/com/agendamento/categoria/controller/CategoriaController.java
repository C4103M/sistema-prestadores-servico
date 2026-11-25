package com.agendamento.categoria.controller;

import com.agendamento.categoria.dto.CategoriaResponse;
import com.agendamento.categoria.service.CategoriaService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Categorias", description = "Catálogo público de categorias aprovadas")
@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService categoriaService;

    @Operation(summary = "Listar categorias aprovadas", description = "Retorna todas as categorias aprovadas ordenadas por nome.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de categorias aprovadas")
    })
    @SecurityRequirements
    @GetMapping
    public List<CategoriaResponse> listarAprovadas() {
        return categoriaService.listarAprovadas();
    }
}
