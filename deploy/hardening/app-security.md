# App Security

## Baseline atual

- API presa a `127.0.0.1:8000`
- publicacao externa apenas via `nginx`
- servico dedicado: `optushub`
- PostgreSQL local e nao exposto externamente
- bootstrap admin desativado no `.env`

## Regras

- nao deixar credenciais temporarias em ambiente permanente
- manter segredos fora do Git
- validar login real apos qualquer mudanca em auth
- publicar a aplicacao apenas por proxy controlado

## Proximos endurecimentos recomendados

- trocar HTTP por HTTPS com certificado valido
- adicionar rate limiting no nginx
- definir politica de rotacao de segredo da API
- adicionar logs de autenticacao e eventos sensiveis
