# Supabase auto-hospedado no mesmo servidor

Guia para rodar o app no EasyPanel contra um Supabase que **você hospeda**, e não
o Supabase gerenciado. As diferenças não são cosméticas — duas delas quebram o
login de formas que não produzem erro visível.

---

## As duas armadilhas do auto-hospedado

### 1. O nome do cookie de sessão é derivado do hostname

O `@supabase/supabase-js` calcula assim:

```js
const defaultStorageKey = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`
```

No Supabase gerenciado isso dá o *project ref*, que nunca muda. No
auto-hospedado, vira uma função do domínio:

| URL do Supabase | Cookie que o cliente procura |
|---|---|
| `https://meu-supabase.exemplo.com` | `sb-meu-supabase-auth-token` |
| `http://supabase-kong:8000` | `sb-supabase-kong-auth-token` |
| `http://164.68.116.21:8000` | `sb-164-auth-token` |

Consequências:

- **Trocar o domínio do Supabase desloga todo mundo**, sem erro nenhum no log.
- **Se o servidor e o browser usarem URLs diferentes, os dois procuram cookies
  diferentes.** O login parece funcionar e a próxima navegação volta para a tela
  de login. Em loop.

**Correção aplicada:** o projeto fixa o nome em `lib/env.ts`:

```ts
export const NOME_COOKIE_SESSAO = 'sb-periodiza-auth-token'
```

e passa `cookieOptions: { name: NOME_COOKIE_SESSAO }` nos três clientes
(browser, servidor, middleware). O nome deixa de depender do domínio.

> Se você já tinha sessões abertas antes desta mudança, elas ficam órfãs — basta
> logar de novo, uma vez.

### 2. O servidor e o browser não alcançam o Supabase pelo mesmo caminho

O container do app roda **ao lado** do Supabase, na mesma rede Docker. O browser
está fora, na internet. Forçar os dois pelo domínio público significa que o
servidor sai para a internet, volta pelo proxy reverso e depende de DNS público
e de TLS válido só para falar com o vizinho de porta.

**Correção aplicada:** `SUPABASE_INTERNAL_URL` (opcional, lida em runtime).

| Quem | Usa | Variável |
|---|---|---|
| Browser | domínio público | `NEXT_PUBLIC_SUPABASE_URL` |
| Servidor (SSR, actions, middleware) | rede interna, se definida | `SUPABASE_INTERNAL_URL` |

Ganhos concretos:

- o app **sobe mesmo antes de o domínio público existir**;
- certificado autoassinado no domínio público deixa de derrubar o servidor,
  porque as chamadas internas não passam por TLS;
- uma volta a menos pela internet em toda renderização.

Sem `SUPABASE_INTERNAL_URL`, tudo usa a URL pública — comportamento de antes.

---

## Descobrir os valores no seu servidor

### Qual serviço é o gateway

O Supabase auto-hospedado é uma stack de vários containers. O que serve a API é
o **Kong**, na porta **8000**. Ele é o único que expõe `/rest/v1/`, `/auth/v1/`
e `/storage/v1/`.

| Serviço | Porta | É o que você quer? |
|---|---|---|
| `kong` / `supabase-kong` | 8000 | ✅ **sim** |
| `studio` | 3000 | ❌ interface web |
| `rest` / `postgrest` | 3000 | ❌ interno, sem auth |
| `auth` / `gotrue` | 9999 | ❌ interno, só auth |
| `db` / `postgres` | 5432 | ❌ banco, para migrations |

### O nome do host interno

No EasyPanel, os serviços de um projeto se enxergam pelo nome do serviço. O
formato costuma ser `<projeto>_<servico>` ou só `<servico>`. Confira na aba do
serviço Kong, ou teste a partir do terminal do container do app:

```bash
wget -qO- http://supabase-kong:8000/auth/v1/health
# {"name":"GoTrue","version":"...","description":"..."}
```

Se responder JSON, esse é o valor de `SUPABASE_INTERNAL_URL`.

### As chaves

No Supabase auto-hospedado, `ANON_KEY` e `SERVICE_ROLE_KEY` são JWTs assinados
com o `JWT_SECRET` da sua instância — estão no `.env` da stack do Supabase, não
em nenhum painel da Supabase. Confira o papel antes de usar:

```bash
# decodifica o payload sem validar assinatura
echo "<a-chave>" | cut -d. -f2 | base64 -d 2>/dev/null; echo
# {"role":"anon","iss":"supabase",...}     <- esta vai no app
# {"role":"service_role", ...}             <- esta NUNCA vai no app
```

O `Dockerfile` aborta o build se receber a `service_role`, justamente porque
`SUPABASE_KEY` é um nome genérico e fácil de trocar sem querer.

---

## Configuração no EasyPanel

### Build args (resolvidos durante o build)

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` *ou* `SUPABASE_URL` | domínio **público** do Kong, com `https://` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` *ou* `SUPABASE_KEY` | chave **anon** |

### Variáveis de runtime

| Nome | Valor | Obrigatória |
|---|---|---|
| `SUPABASE_INTERNAL_URL` | `http://supabase-kong:8000` | não, mas recomendada |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service role | só para scripts admin |

> `NEXT_PUBLIC_SUPABASE_URL` é resolvida no **build** e fica embutida no bundle
> do browser. Mudá-la só em runtime não tem efeito no cliente — exige rebuild.
> `SUPABASE_INTERNAL_URL` é o oposto: runtime puro, muda sem rebuild.

---

## Conferir se ficou certo

```bash
curl -s "https://<dominio-do-app>/api/health?deep=1" | jq
```

A sonda testa os dois caminhos separadamente, porque eles falham por motivos
diferentes:

```json
{
  "status": "ok",
  "configuracao": {
    "NEXT_PUBLIC_SUPABASE_URL": "meu-supabase.exemplo.com",
    "SUPABASE_INTERNAL_URL": "supabase-kong:8000",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": { "comprimento": 218, "papel": "anon" },
    "cookieDeSessao": "sb-periodiza-auth-token"
  },
  "caminhos": {
    "publico": { "ok": true, "usadoPor": "browser" },
    "interno": { "ok": true, "usadoPor": "servidor" }
  }
}
```

| Sintoma | Leitura |
|---|---|
| `interno.ok: false`, `publico.ok: true` | nome do serviço ou porta errados no `SUPABASE_INTERNAL_URL` |
| `interno.ok: true`, `publico.ok: false` | **o app renderiza, mas o browser não fala com o Supabase** — domínio público, proxy ou certificado |
| `content-type "text/html"` | nenhum serviço vinculado a esse domínio; é a página catch-all do proxy |
| `papel: "service_role"` | chave errada — troque pela anon imediatamente |
| ambos `ok: false` | Supabase parado, ou o app não está na mesma rede |

O `status` no topo reflete o caminho **do servidor**, que é o que decide se o app
consegue renderizar.

---

## Certificado autoassinado

Se o domínio público usa certificado autoassinado e você **não** configurou
`SUPABASE_INTERNAL_URL`, as chamadas de servidor falham na validação de TLS com
`fetch failed` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

Duas saídas corretas, em ordem de preferência:

1. **Configurar `SUPABASE_INTERNAL_URL`.** As chamadas de servidor passam a ir
   por HTTP na rede interna e o problema desaparece. O browser continua no
   HTTPS público, onde o certificado precisa ser válido de qualquer forma.
2. **Montar a CA no container** e apontar `NODE_EXTRA_CA_CERTS` para ela:
   ```
   NODE_EXTRA_CA_CERTS=/etc/ssl/certs/minha-ca.crt
   ```

Nunca use `NODE_TLS_REJECT_UNAUTHORIZED=0`: desliga a verificação de **todas** as
conexões TLS do processo, não só a do Supabase.

---

## Migrations

O deploy do app não aplica migrations. Como o Postgres do auto-hospedado quase
nunca está exposto publicamente, o caminho costuma ser o SQL Editor do Studio, ou
o `psql` a partir de um shell no próprio servidor:

```bash
export SUPABASE_DB_URL="postgresql://postgres:SENHA@localhost:5432/postgres"
npm run db:migrate
```

Detalhes e verificação: `docs/MIGRATIONS.md`.

---

## Validação executada neste repositório

O split de URL e o cookie fixo foram testados ponta a ponta com um Supabase
falso, alcançável **somente** pelo caminho interno, e com a URL pública apontada
para um host inexistente:

| Cenário | Esperado | Obtido |
|---|---|---|
| `/dashboard` com cookie `sb-periodiza-auth-token` | 200, sessão válida | `200` |
| `/dashboard` com cookie de nome derivado do host | 307 para `/login` | `307` |
| requisições recebidas pelo Supabase interno | validação + queries | `GET /auth/v1/user`, `HEAD /rest/v1/clients`, `HEAD /rest/v1/periodizations` |
| `?deep=1` com público quebrado e interno OK | `200`, distinguindo os dois | `status: ok`, `publico.ok: false`, `interno.ok: true` |

A URL pública usada no teste (`publico-inalcancavel.invalid`) é inalcançável de
propósito: se o servidor a tivesse usado, nada disso teria respondido.
