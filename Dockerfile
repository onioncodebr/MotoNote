# --- Build ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copia só o pom.xml primeiro pra cachear as dependências numa camada
# separada — elas só baixam de novo quando o pom.xml muda, não a cada
# alteração de código-fonte.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B package -DskipTests

# --- Runtime ---
# JRE, não JDK completo: menor imagem, e produção não precisa de compilador.
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Roda como usuário sem privilégio, não root — reduz o estrago possível se
# algum dia uma vulnerabilidade permitir execução de código dentro do
# container.
RUN useradd --system --create-home --shell /usr/sbin/nologin app
USER app

COPY --from=build /app/target/entregas-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
