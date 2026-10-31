package co.tecnihardware.st.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import co.tecnihardware.st.model.ConfiguracionSistema;

public interface ConfiguracionRepository extends JpaRepository<ConfiguracionSistema, Long> {
}
