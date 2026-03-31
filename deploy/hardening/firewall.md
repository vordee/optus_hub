# Firewall

## Estado atual

- permitido: `ssh`
- permitido: `http`
- removido: `cockpit`

## Objetivo

Manter o host com exposicao minima. O backend e o PostgreSQL devem continuar presos ao loopback.

## Comandos uteis

```bash
firewall-cmd --list-services
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --remove-service=cockpit
firewall-cmd --reload
```
