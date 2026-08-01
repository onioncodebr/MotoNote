package br.com.onioncode.motonote;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

// Sobe um Postgres real efêmero via Testcontainers só pro contexto de teste
// (EntregasApplicationTests) — @ServiceConnection liga o container ao
// spring.datasource.* automaticamente, sem precisar declarar as propriedades
// manualmente. Requer Docker disponível na máquina que rodar os testes.
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:17"));
    }
}
