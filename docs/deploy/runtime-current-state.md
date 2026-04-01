# Runtime Current State

Documento de referencia do ambiente real em `10.222.222.33` na data de publicacao do commit `b32aa44`.

Use este arquivo como fonte de verdade operacional para humanos e agentes antes de qualquer novo deploy, troubleshooting ou continuidade de implementacao.

## Host principal

- host: `10.222.222.33`
- sistema: Oracle Linux 9.x
- timezone operacional observada: `-04`
- repositorio de aplicacao: `/opt/optus_hub`

## Diretórios que importam

Existem dois caminhos diferentes para frontend e isso precisa continuar explicito:

- codigo-fonte e build do repositorio: `/opt/optus_hub/frontend`
- build gerada no repositorio: `/opt/optus_hub/frontend/dist`
- raiz realmente servida pelo nginx: `/var/www/optus-hub/frontend`
- releases publicados do frontend: `/var/www/optus-hub/releases/`

No estado atual, `/var/www/optus-hub/frontend` e um link simbolico para o release ativo:

- release ativo no momento desta documentacao: `/var/www/optus-hub/releases/frontend-b32aa44-20260401094901`

## Nginx

- arquivo de referencia versionado no repo: `/opt/optus_hub/deploy/nginx/optus-hub.conf`
- root configurado no nginx: `/var/www/optus-hub/frontend`
- API proxied para: `http://127.0.0.1:8000`
- redirect de `80/tcp` para HTTPS
- HTTPS principal em `443/tcp`
- certificado local: `/etc/nginx/tls/optus-hub.crt`
- chave privada: `/etc/nginx/tls/optus-hub.key`

Implicacao pratica:

- atualizar apenas `/opt/optus_hub/frontend/dist` nao publica o frontend visivel ao usuario
- o deploy correto precisa atualizar o release em `/var/www/optus-hub/releases/` e apontar `/var/www/optus-hub/frontend` para esse release

## Serviços systemd

- API: `optus-hub-api`
- comando observado: `/opt/optus_hub/backend/.venv/bin/python3.11 -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
- status no momento da coleta: `active (running)`

## Versões observadas no servidor

- Node.js: `v20.20.0`
- npm: `10.8.2`
- Python runtime da API: `Python 3.11.13`
- PostgreSQL client: `psql (PostgreSQL) 13.23`
- Nginx: `1.20.1`

## Anomalias operacionais já confirmadas

- o `ssh` padrao nesta sessao falhou antes da autenticacao por causa de permissões incorretas em `/etc/ssh/ssh_config.d/50-redhat.conf`
- a autenticacao por chave funciona quando o comando ignora a config global com `-F /dev/null`
- o `pip` dentro de `/opt/optus_hub/backend/.venv/bin/pip` estava com shebang apontando para um caminho antigo e falhou na leitura direta

## Padrão de acesso SSH que funciona

Para operacao automatizada e por agentes, use:

```bash
ssh -F /dev/null -i /home/admin/.ssh/optus_hub_ed25519 \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  root@10.222.222.33
```

Evite depender do `ssh` padrao sem `-F /dev/null` enquanto a config global do host local continuar inconsistente.

## Procedimento de publicação do frontend

### Build local

```bash
cd /tmp/optus_hub/frontend
npm run build
tar -C dist -czf /tmp/optus_hub-frontend-dist.tgz .
```

### Upload

```bash
scp -F /dev/null -i /home/admin/.ssh/optus_hub_ed25519 \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  /tmp/optus_hub-frontend-dist.tgz root@10.222.222.33:/tmp/optus_hub-frontend-dist.tgz
```

### Publicação segura

Substitua `<commit>` e `<timestamp>` antes de executar:

```bash
ssh -F /dev/null -i /home/admin/.ssh/optus_hub_ed25519 \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  root@10.222.222.33 '
set -euo pipefail
mkdir -p /var/www/optus-hub/releases
mkdir -p /var/www/optus-hub/releases/frontend-<commit>-<timestamp>
tar -xzf /tmp/optus_hub-frontend-dist.tgz -C /var/www/optus-hub/releases/frontend-<commit>-<timestamp>
chown -R nginx:nginx /var/www/optus-hub/releases/frontend-<commit>-<timestamp>
mv /var/www/optus-hub/frontend /var/www/optus-hub/frontend-prev-<timestamp>
ln -s /var/www/optus-hub/releases/frontend-<commit>-<timestamp> /var/www/optus-hub/frontend
chown -h nginx:nginx /var/www/optus-hub/frontend
nginx -t
systemctl reload nginx
'
```

### Validação

```bash
curl --silent --show-error --insecure https://10.222.222.33/ | sed -n '1,20p'
```

Confirme se os nomes de assets servidos batem com o `dist` gerado.

## Estado publicado nesta entrega

- commit publicado: `b32aa44`
- release ativo: `/var/www/optus-hub/releases/frontend-b32aa44-20260401094901`
- assets servidos apos publicacao:
  - `index-C0CQEbzT.js`
  - `index-FT7ogpZ-.css`

## Regra para continuidade por agentes

Antes de qualquer deploy ou investigacao:

1. confirme o root atual do nginx
2. compare assets servidos com assets do `dist`
3. nunca assuma que `/opt/optus_hub/frontend/dist` e o diretório publicado
4. prefira release versionado com symlink para rollback simples
