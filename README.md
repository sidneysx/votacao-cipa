# Votação CIPA

Sistema de eleição da CIPA com banco de dados na nuvem (Supabase). Todas as bases votam no mesmo banco, então a apuração sai somada e separada por base.

## Páginas

| Endereço     | Quem usa  | Para quê                                                                       |
| ------------ | --------- | ------------------------------------------------------------------------------ |
| `/`          | Mesário   | Urna. Só funciona em aparelho ativado com código gerado no painel.             |
| `/admin`     | Comissão  | Configurações (nome, cor, logo, horário), candidatos, bases, dispositivos, eleitores, resultado. |
| `/resultado` | Todos     | Resultado por base e total. Só aparece depois do horário de encerramento.      |

## Como o voto funciona

1. O mesário digita a matrícula e o sistema confere se ela está na lista e se a pessoa ainda não votou.
2. O eleitor escolhe o candidato (ou vota em branco) e confirma.
3. O banco grava, em tabelas separadas e sem ligação entre elas:
   - `eleitores`: "matrícula X votou" (sem o candidato);
   - `votos`: "um voto para o candidato Y na base Z" (sem o eleitor).

A base do voto vem do **dispositivo**: cada tablet é cadastrado no painel com uma tag (ex.: `TABLET-01`) e uma base, e é ativado com um código de uso único. Um aparelho não ativado não consegue votar, e o admin pode bloquear ou trocar o código de um aparelho a qualquer momento.

## Configuração (uma vez)

### 1. Supabase

1. Crie uma conta e um projeto em <https://supabase.com> (plano gratuito).
2. Em **SQL Editor**, cole e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Authentication > Sign In / Providers**, desative **Allow new users to sign up**.
4. Em **Authentication > Users > Add user**, crie o usuário do administrador (e-mail e senha, marcando *Auto Confirm User*).
5. No **SQL Editor**, transforme esse usuário em admin:

   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'seu-email@empresa.com';
   ```

6. Em **Project Settings > API**, copie a *Project URL* e a chave *anon public*.

### 2. Rodar no computador

```bash
cp .env.example .env.local   # preencha com a URL e a chave do passo anterior
npm install
npm run dev
```

### 3. Publicar (Vercel, grátis)

1. Suba o projeto para o GitHub.
2. Em <https://vercel.com>, clique em **Add New > Project** e importe o repositório.
3. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Clique em **Deploy**. O `vercel.json` já faz as rotas `/admin` e `/resultado` funcionarem.

## Roteiro de cada eleição

1. **Configurações:** nome, cor, logo, abertura e encerramento.
2. **Candidatos:** cadastrar, editar ou excluir.
3. **Bases:** cadastrar as bases/regionais.
4. **Eleitores:** importar a lista (`matrícula;nome`, dá para colar do Excel).
5. **Dispositivos:** cadastrar cada tablet com a base dele e, no tablet, abrir o site e digitar o código.
6. Depois do encerramento, ver a aba **Resultado** ou a página `/resultado`.

No ano seguinte, use **Configurações > Nova eleição > Zerar votos**, troque nome, cor e candidatos, e está pronto. Bases, dispositivos e a lista de eleitores continuam cadastrados.
