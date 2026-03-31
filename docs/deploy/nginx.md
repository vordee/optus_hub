# Nginx

## Responsabilidades esperadas

- terminacao HTTP ou HTTPS
- proxy reverso para API
- entrega de arquivos estaticos do frontend
- headers de seguranca

## Estado atual

- reverse proxy para `127.0.0.1:8000`
- redirect de `80/tcp` para HTTPS
- publicacao principal em `443/tcp`
- logs dedicados de access e error
- rate limiting por IP
- headers defensivos para a superficie HTTPS
- certificado local em `/etc/nginx/tls/optus-hub.crt`

## Pendencias

- hostnames finais
- trocar certificado autoassinado por certificado valido
- headers de seguranca mais completos
