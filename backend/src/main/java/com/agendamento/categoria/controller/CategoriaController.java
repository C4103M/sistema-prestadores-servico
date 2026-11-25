package com.agendamento.categoria.controller;

import com.agendamento.categoria.dto.CategoriaResponse;
import com.agendamento.categoria.service.CategoriaService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService categoriaService;

    @GetMapping
    public List<CategoriaResponse> listarAprovadas() {
        return categoriaService.listarAprovadas();
    }
}
