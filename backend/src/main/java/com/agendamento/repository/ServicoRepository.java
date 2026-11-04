package com.agendamento.repository;

import com.agendamento.model.Servico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findByAtivoTrue();
    List<Servico> findByProfissionalId(Long profissionalId);
    List<Servico> findByProfissionalIdAndAtivoTrue(Long profissionalId);
    List<Servico> findByNomeContainingIgnoreCaseAndAtivoTrue(String termo);
}
