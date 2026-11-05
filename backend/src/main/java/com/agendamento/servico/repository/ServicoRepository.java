package com.agendamento.servico.repository;

import com.agendamento.servico.model.Servico;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findByAtivoTrue();
    List<Servico> findByProfissionalId(Long profissionalId);
    List<Servico> findByProfissionalIdAndAtivoTrue(Long profissionalId);

    // Busca do cliente: o termo pode ser o nome do serviço, a descrição ou o nome do profissional
    @Query("SELECT s FROM Servico s WHERE s.ativo = true AND (" +
           "LOWER(s.nome) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(s.descricao) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(s.profissional.nome) LIKE LOWER(CONCAT('%', :termo, '%'))) " +
           "ORDER BY s.nome")
    List<Servico> buscarAtivos(@Param("termo") String termo);
}
