package com.onioncode.entregas.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Por padrão, o Spring Data MongoDB converte campos {@link LocalDate} para
 * {@link Date} (e vice-versa) usando o fuso horário PADRÃO DA JVM
 * ({@code ZoneId.systemDefault()}).
 * <p>
 * Isso é uma armadilha clássica: se a aplicação rodar em máquinas ou
 * containers com fusos horários diferentes ao longo do tempo (ex.: em
 * desenvolvimento local em America/Sao_Paulo, e depois em um container
 * Docker/servidor configurado em UTC), a MESMA data gravada no banco pode
 * ser reconstruída como um dia diferente — fazendo consultas por "hoje"
 * (ou qualquer outro período) não baterem com nada, mesmo com o dado
 * existindo no banco.
 * <p>
 * Aqui fixamos essa conversão em UTC sempre, não importa em qual fuso
 * horário o servidor da aplicação esteja configurado. Como {@link LocalDate}
 * já representa uma data "pura" (sem horário nem fuso), isso só padroniza
 * o formato de armazenamento — não altera o significado da data.
 */
@Configuration
public class MongoConfig {

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        List<Converter<?, ?>> converters = new ArrayList<>();
        converters.add(new LocalDateToDateConverter());
        converters.add(new DateToLocalDateConverter());
        return new MongoCustomConversions(converters);
    }

    @WritingConverter
    private static class LocalDateToDateConverter implements Converter<LocalDate, Date> {
        @Override
        public Date convert(LocalDate source) {
            return Date.from(source.atStartOfDay(ZoneOffset.UTC).toInstant());
        }
    }

    @ReadingConverter
    private static class DateToLocalDateConverter implements Converter<Date, LocalDate> {
        @Override
        public LocalDate convert(Date source) {
            return source.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
        }
    }
}
