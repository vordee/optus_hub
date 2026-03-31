# Nginx

## Responsabilidades esperadas

- terminacao HTTP ou HTTPS
- proxy reverso para API
- entrega de arquivos estaticos do frontend
- headers de seguranca

## Estado atual

- reverse proxy para `127.0.0.1:8000`
- publicacao em `80/tcp`
- logs dedicados de access e error
- rate limiting por IP
- headers defensivos para superficie HTTP atual

## Pendencias

- hostnames finais
- TLS
- headers de seguranca mais completos
