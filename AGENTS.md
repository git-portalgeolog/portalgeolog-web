# 🤖 Agentic Guidelines: Certify Web (2026 Edition)

Este documento é a "Fonte da Verdade" para agentes de IA operando neste repositório. Siga estas instruções rigorosamente para manter a integridade do código, a economia de tokens e a precisão das refatorações.

---

## 🛠 1. Comandos de Operação (Build/Lint/Test)

Sempre verifique o `package.json` antes de executar, mas prefira estes padrões:

### Build & Instalação
- **Instalar:** `npm install` (mantenha o `package-lock.json` atualizado).
- **Build:** `npm run build` - Verifique a pasta `dist/` ou `.next/` após a execução.
- **Dev Mode:** `npm run dev` - Use para validar mudanças em tempo real.

### Linting & Formatação
- **Check:** `npm run lint`
- **Fix:** `npm run lint -- --fix`
- **Prettier:** `npx prettier --write .` (execute obrigatoriamente antes de cada commit).

### 🧪 Testes (Protocolo de Validação)
- **Fluxo de Trabalho:** Modificar código -> Rodar Lint no arquivo -> Rodar Teste Unitário específico.
- **Rodar teste único:** `npx jest path/to/file.test.ts` ou `npm test -- path/to/file.test.ts`
- **Economia de Recursos:** Não execute a suite completa de testes (`npm test`) para mudanças triviais em arquivos isolados.

---

## 🎨 2. Diretrizes de Estilo e Arquitetura

### Importações & Organização
- **Caminhos:** Use Aliases (`@/components/...`). Caminhos relativos (`../../`) são permitidos apenas para arquivos na mesma pasta.
- **Ordem de Importação:**
  1. React/Next.js Core
  2. Bibliotecas externas (npm)
  3. Aliases de Projeto (`@/hooks`, `@/utils`, `@/services`)
  4. Imports relativos e CSS.
- **Exports:** Use `Named Exports` (`export const ...`). `Default exports` são exclusivos para componentes de Página (Next.js Pages/App Router).

### Naming Conventions
- **Componentes:** `PascalCase.tsx` (ex: `LoginCard.tsx`).
- **Lógica/Utils:** `kebab-case.ts` (ex: `auth-validator.ts`).
- **Variáveis/Funções:** `camelCase`.
- **Booleanos:** Iniciar com `is`/`has`/`should` (ex: `isLoading`, `hasPermission`).
- **Types/Interfaces:** `PascalCase`. Proibido prefixo `I` (use `User`, não `IUser`).

### TypeScript & Tipagem Estrita
- **No Any:** O uso de `any` é proibido. Use `unknown` com Type Guards ou defina a interface correta.
- **Async:** Nunca use `.then()`. Use sempre `async/await` com blocos `try/catch`.
- **Explicicidade:** Funções exportadas devem ter tipos de retorno definidos.

---

## 🌐 3. Internacionalização (i18n) - PRIORIDADE 2026

Ao refatorar para i18n no `certify-web`:
- **Zero Hardcoding:** Nenhuma string visível ao usuário deve permanecer no JSX.
- **Hook de Tradução:** Use o padrão estabelecido (ex: `useTranslation` do `next-intl`).
- **Padrão de Chaves:** Use nomes semânticos e hierárquicos: `contexto.subcontexto.elemento_propriedade`. 
  - *Exemplo:* `auth.login.button_label` em vez de `btn_entrar`.
- **Sincronização:** Toda chave adicionada em `pt-BR.json` deve ter sua contraparte (mesmo que vazia ou em inglês) em `en.json`.

---

## 📂 4. Mapeamento de Lógica (Contexto Específico)

Ao buscar por funcionalidades centrais, priorize:
1. **Auth/Login:** `src/pages/login/`, `src/components/auth/`, `src/hooks/useAuth.ts`.
2. **Traduções:** `public/locales/` ou `src/messages/`.
3. **Serviços de API:** `src/services/` ou `src/api/`.
4. **Envio de E-mails:** `src/app/api/users/route.ts` (exemplo de integração com Resend).

---

## 📏 5. Regras de Eficiência do Agente (Token Economy)

- **Busca Cirúrgica:** Use `grep` ou `list_dir` antes de ler arquivos. Não leia arquivos com mais de 500 linhas inteiros se precisar apenas de uma função; peça a leitura de linhas específicas.
- **Proibição de Leitura:** Nunca tente ler as pastas `node_modules`, `.next`, `dist` ou `.git`.
- **Respostas Concisas:** Retorne apenas o código modificado ou explicações técnicas breves. Evite introduções educadas como "Com certeza, vou te ajudar...".
- **Refatoração Atômica:** Não tente refatorar múltiplos componentes de uma vez. Faça um por um, valide com lint/test, e siga para o próximo.

---

## 🧠 6. Integração com IDE

- **Preservação:** Não apague comentários de lógica complexa ou anotações de outros desenvolvedores sem justificativa clara no chat.
- **Documentação de Exceção:** Se encontrar um padrão que viole este guia mas seja necessário para o projeto, comente no topo do arquivo e sugira a atualização deste `AGENTS.md`.

---

## 🔔 7. Sistema de Notificações & RBAC (Real-time)

O sistema utiliza uma arquitetura baseada em banco de dados para notificações, garantindo segurança e separação entre usuários **Internos** e **Gestores**.

### Arquitetura de Notificações
- **Tabela Mestre:** `public.app_notifications`. Nunca dispare `toast()` no frontend baseado em listeners de tabelas de negócio (ex: `clientes`, `os`).
- **Geração de Mensagens:** Exclusivamente via **PostgreSQL Triggers**. Toda lógica de *o que* e *para quem* notificar deve residir no banco de dados.
- **Segurança (RLS):** A filtragem de público (`target_audience`) é feita via **Row-Level Security**. Internos nunca recebem pacotes de Gestores e vice-versa.
- **Frontend (Listener):** O `DataContext.tsx` possui um único listener dedicado a `app_notifications`. Ele apenas renderiza o que o banco envia.

### Controle de Acesso (RBAC)
- **Tabela de Perfis:** `public.user_roles`.
- **Sincronização:** O `AuthContext.tsx` monitora mudanças na categoria do usuário logado em tempo real. Se um acesso for revogado, o sistema deve deslogar o usuário imediatamente.
- **Caminho da Gestão:** `/portal/config` é a página central para administração desses perfis.

---

## 🛡 8. Segurança e Operações de Admin (Supabase & Resend)

### Supabase Admin
- **Escalação de Privilégios:** Operações de criação/modificação de usuários `auth` devem ser feitas exclusivamente via Server Actions ou API Routes usando a `SUPABASE_SERVICE_ROLE_KEY`.
- **Bypass de RLS:** A Service Role ignora todas as políticas de RLS. Use com extrema cautela e valide permissões de admin no código antes de executar.

### Comunicação (Resend)
- **Key Management:** A `RESEND_API_KEY` deve residir apenas no `.env.local`. Nunca exponha essa chave no cliente.
- **E-mails Transacionais:** Use templates HTML profissionais para boas-vindas, redefinição de senha e alertas críticos.
- **Atomicidade:** Sempre que criar um usuário no Auth, registre-o simultaneamente na tabela `user_roles` e dispare o e-mail de boas-vindas com as credenciais.

---

# Estrutura de Autenticação e Git 

## 1. Perfis e Diretórios de Configuração
Existem dois perfis de autenticação isolados via variáveis de ambiente. NUNCA utilize `gh auth login` ou `git push` sem os prefixos de diretório abaixo:

### Perfil: Principal (git-portalgeolog)
- **GitHub CLI Config:** `~/.gh-config1`
- **GitHub Desktop Data:** `~/.gh-app1`
- **Alias recomendado:** `gh1` (env GH_CONFIG_DIR=~/.gh-config1 gh)

## 2. Comandos Obrigatórios para o Agente
Ao executar comandos no terminal para o usuário, você deve injetar a variável de ambiente correspondente ao perfil desejado:

- **Para checar status:** `GH_CONFIG_DIR=~/.gh-config1 gh auth status`.

- **Para clonar ou gerenciar repositórios:** Sempre use `GH_CONFIG_DIR=~/.gh-config[X]` antes de qualquer comando `gh`.

- **Operações de Git (Push/Pull):**
Certifique-se de que o `user.name` e `user.email` no repositório local (`git config`) correspondem ao perfil autenticado no diretório de configuração fornecido.

## 3. Prevenção de Erros Conhecidos
- **ERRO KIO CLIENT:** Se o sistema solicitar login via navegador, pare. A autenticação deve ser feita via CLI com as pastas acima para evitar o erro de protocolo `x-github-desktop-dev-auth`.
- **SANDBOX:** Ao sugerir a abertura do GitHub Desktop (AppImage), sempre inclua a flag `--no-sandbox` e a variável `XDG_CONFIG_HOME` correta.

## 4. Solução de Problemas (Troubleshooting)
- **Usuário Incorreto no GitHub:** Se `gh` reportar um usuário diferente do esperado (ex: `nshsystem` em vez de `git-portalgeolog`), o token no diretório de configuração está incorreto. 
- **Como corrigir:** Execute `echo "SEU_TOKEN" | GH_CONFIG_DIR=~/.gh-config1 gh auth login --with-token` para re-vincular o perfil ao token correto.
- **Verificação:** Sempre valide com `GH_CONFIG_DIR=~/.gh-config1 gh api user --jq .login` antes de realizar operações de escrita (push/create repo).

## 🚀 5. Deploy & Infraestrutura (Vercel)

### Vercel CLI
- **Autenticação:** Agentes devem usar o flag `--token` com o **Vercel Access Token** do usuário para operações de deploy, link e configuração de variáveis.
- **Controle de Deploy:** Agentes NUNCA devem realizar deploys (seja para `test` ou `main`) sem a solicitação explícita do usuário no chat.
- **Comandos Principais:**
  - `vercel link --yes --token $VERCEL_TOKEN` (conecta a pasta ao projeto).
  - `vercel env add <KEY> <ENV> --token $VERCEL_TOKEN` (adiciona variáveis ao dashboard).
  - `vercel deploy --prod --yes --token $VERCEL_TOKEN` (deploy final em produção).

### Links de Referência
- **GitHub:** [https://github.com/git-portalgeolog/portalgeolog-web](https://github.com/git-portalgeolog/portalgeolog-web)
- **Produção:** [https://portalgeolog.com.br](https://portalgeolog.com.br)

---

*Assinado: Certify Web Core Team (2026)*
