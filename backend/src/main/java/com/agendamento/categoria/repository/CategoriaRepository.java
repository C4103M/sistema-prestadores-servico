package com.agendamento.categoria.repository;

import com.agendamento.categoria.model.Categoria;
import com.agendamento.categoria.model.StatusCategoria;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    Optional<Categoria> findByNomeIgnoreCase(String nome);

    boolean existsByNomeIgnoreCase(String nome);

    boolean existsByNomeIgnoreCaseAndIdNot(String nome, Long id);

    List<Categoria> findByStatusOrderByNomeAsc(StatusCategoria status);

    @Query("SELECT c FROM Categoria c WHERE c.status = :aprovada OR c.criadoPor.id = :usuarioId ORDER BY c.nome ASC")
    List<Categoria> findVisiveisParaProfissional(
            @Param("aprovada") StatusCategoria aprovada,
            @Param("usuarioId") Long usuarioId
    );
}
