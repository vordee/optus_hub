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
- root servido atualmente: `/var/www/optus-hub/frontend`

## Regra critica

O frontend publicado nao e servido de `/opt/optus_hub/frontend/dist`.

O deploy correto do frontend precisa atualizar o release em `/var/www/optus-hub/releases/` e apontar o symlink `/var/www/optus-hub/frontend` para o release ativo.

## Pendencias

- hostnames finais
- trocar certificado autoassinado por certificado valido
- headers de seguranca mais completos
