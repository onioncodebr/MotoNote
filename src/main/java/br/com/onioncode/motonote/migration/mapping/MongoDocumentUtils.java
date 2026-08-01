package br.com.onioncode.motonote.migration.mapping;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Date;

// Conversões BSON -> tipos Java compartilhadas pelos 14 mappers de coleção.
final class MongoDocumentUtils {

    private MongoDocumentUtils() {
    }

    static String id(Document doc) {
        Object valor = doc.get("_id");
        if (valor == null) return null;
        return valor instanceof ObjectId oid ? oid.toHexString() : valor.toString();
    }

    // Instant -> equivalente ao campo Java Instant, mapeamento direto do
    // Date gravado pelo driver Mongo.
    static Instant toInstant(Document doc, String field) {
        Date data = doc.getDate(field);
        return data != null ? data.toInstant() : null;
    }

    // LocalDate -> reaplica a mesma regra de UTC que estava em MongoConfig,
    // porque é assim que os dados foram gravados historicamente (LocalDate
    // convertido pro início do dia em UTC antes de virar Date no Mongo).
    static LocalDate toLocalDate(Document doc, String field) {
        Date data = doc.getDate(field);
        return data != null ? data.toInstant().atZone(ZoneOffset.UTC).toLocalDate() : null;
    }

    // Trata tanto BSON double quanto Decimal128 (Number), defensivamente.
    static Double toDouble(Document doc, String field) {
        Object valor = doc.get(field);
        if (valor == null) return null;
        return valor instanceof Number n ? n.doubleValue() : Double.valueOf(valor.toString());
    }

    // Enum.valueOf com log de warning (não exceção) se o valor não bater com
    // nenhuma constante conhecida — um documento legado inconsistente não
    // pode travar a importação inteira.
    static <E extends Enum<E>> E toEnum(Document doc, String field, Class<E> enumType, Logger log) {
        String valor = doc.getString(field);
        if (valor == null) return null;
        try {
            return Enum.valueOf(enumType, valor);
        } catch (IllegalArgumentException e) {
            log.warn("Valor de enum desconhecido para {}.{}: '{}' — campo ficará nulo", enumType.getSimpleName(), field, valor);
            return null;
        }
    }
}
