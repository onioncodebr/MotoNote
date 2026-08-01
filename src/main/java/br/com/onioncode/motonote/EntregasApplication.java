package br.com.onioncode.motonote;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class EntregasApplication {

	// Fixa o timezone padrão da JVM em UTC, não importa o fuso do SO/
	// container onde a aplicação rodar (ver melhorias.md 1.2). Os dados
	// persistidos já são independentes disso (todo timestamp de domínio é
	// Instant, e LocalDate é convertido pra UTC explicitamente em
	// MongoConfig) — o único uso de LocalDateTime.now() no projeto é o
	// campo informativo ApiError.timestamp, que hoje variava de fuso
	// dependendo de onde a aplicação estava rodando. Bloco estático (não
	// @PostConstruct) porque precisa rodar antes de qualquer outra coisa
	// no Spring, inclusive antes do primeiro LocalDateTime.now() possível.
	static {
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
	}

	public static void main(String[] args) {
		SpringApplication.run(EntregasApplication.class, args);
	}

}
