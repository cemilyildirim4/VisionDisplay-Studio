# Bu Dockerfile "src" klasörü build context'i olacak şekilde tasarlandı
# (docker-compose.yml: context: ./src, dockerfile: DisplayConfigurator.Api/Dockerfile)

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Once sadece .csproj dosyalarini kopyala -> katman onbellegi (cache) verimli calisir
COPY DisplayConfigurator.sln ./
COPY DisplayConfigurator.Api/DisplayConfigurator.Api.csproj DisplayConfigurator.Api/
COPY DisplayConfigurator.Application/DisplayConfigurator.Application.csproj DisplayConfigurator.Application/
COPY DisplayConfigurator.Domain/DisplayConfigurator.Domain.csproj DisplayConfigurator.Domain/
COPY DisplayConfigurator.Infrastructure/DisplayConfigurator.Infrastructure.csproj DisplayConfigurator.Infrastructure/
RUN dotnet restore DisplayConfigurator.Api/DisplayConfigurator.Api.csproj

COPY . .
RUN dotnet publish DisplayConfigurator.Api/DisplayConfigurator.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=1654:1654 /app/publish .
USER 1654

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["dotnet", "DisplayConfigurator.Api.dll"]
