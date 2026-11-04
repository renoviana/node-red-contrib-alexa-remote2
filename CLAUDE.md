# CLAUDE.md

Fork mantido de `586837r/node-red-contrib-alexa-remote2`, que está parado desde 2020. O pacote se chama `@renoviana/node-red-contrib-alexa-remote2`.
São nós do Node-RED para controlar a Alexa (falar, rotinas, dispositivos, casa inteligente, listas, eventos). O uso principal é o add-on Node-RED do Home Assistant.

- `origin` = fork `renoviana/...`; `upstream` = repositório original (não recebe PRs).
- O trabalho atual fica na branch `fix/amazon-new-login-https`. O Home Assistant instala pelo tarball dessa branch
  (`https://github.com/renoviana/node-red-contrib-alexa-remote2/archive/refs/heads/fix/amazon-new-login-https.tar.gz` em `npm_packages`).
- Ainda não foi publicado no npm. Publicar exige `npm login` e confirmação do usuário.

## Comandos

- `npm test`: testes unitários (`node --test`, Node 18+; acha `test/*.test.js`).
- Um arquivo só: `node --test test/i18n.test.js`. Rode só o teste do que mudou; a suíte completa roda uma vez antes do commit.
- Não há build, lint em CI nem e2e. O `.jshintrc` só define `esversion: 8`.

## Mapa do repositório

| Caminho | Para que serve |
|---|---|
| `nodes/alexa-remote-account.{js,html}` | **Nó de configuração da conta.** Autenticação (Proxy / Cookie / E-mail+senha), estado (`UNINITIALISED`, `INIT_*`, `WAIT_PROXY`, `READY`, `REFRESH`, `UPDATE`, `ERROR`), renovação automática, gravação do arquivo de cookie e endpoints HTTP do editor (`/alexa-remote-*.json`), que entregam listas de dispositivos/rotinas/etc., o estado da conta e sugestões de IP. Todos os outros nós dependem dele. |
| `nodes/alexa-remote-init.*` | Controle manual da conta: iniciar, nova autenticação, renovar cookie, atualizar dados, reiniciar, próxima renovação. |
| `nodes/alexa-remote-event.*` | Saída de eventos. `account-*` vem do `account.emitter` (login necessário, mudança de estado) e funciona sempre; `ws-*` vem da conexão push da biblioteca e exige *Push Events* ligado. |
| `nodes/alexa-remote-routine.*` | Monta e executa sequências de rotina: falar, anúncio, música, casa inteligente, som, prompts (piada, bom dia...), skill, rotina existente, push notification. É o nó mais complexo (`nativizeNode`). |
| `nodes/alexa-remote-echo.*` | Dispositivos Echo: informações, mídia, volume do alarme, não perturbe, Bluetooth, TuneIn, renomear, apagar, comandos. |
| `nodes/alexa-remote-smarthome.*` | Casa inteligente: listar, consultar estado, ações (cor, brilho, temperatura, fechadura...), descobrir, esquecer. |
| `nodes/alexa-remote-other.*` | Conta, contatos, conversas e mensagens, notificações (alarmes, lembretes, timers), cards, atividades, skills, provedores de música. |
| `nodes/alexa-remote-list.*` | Listas de compras e de tarefas. |
| `nodes/locales/{en-US,pt-BR}/` | i18n **do editor** (nativo do Node-RED): `<nó>.json` com os rótulos e `pt-BR/<nó>.html` com a ajuda traduzida. Só existe para Account, Event e Init. |
| `nodes/markdown/*.md` | Fonte antiga, em markdown, da ajuda dos nós. Não é usada em tempo de execução; a ajuda real fica no `<script data-help-name>` de cada `.html`. |
| `nodes/icons/` | Ícones da paleta. |
| `lib/alexa-remote-ext.js` | Estende `AlexaRemote` (do `alexa-remote2`): `initExt`, caches (`deviceByIdExt`, `routineByIdExt`, ...), versões `...Promise` dos métodos, cores, notificações. Desliga os inicializadores padrão da biblioteca (`prepare`, `initDeviceState`...). |
| `lib/proxy-fix.js` | Envolve o `initAmazonProxy` do `alexa-cookie2` para **remover `Content-Security-Policy`/HSTS** no proxy de login (sem isso o navegador troca para https e dá `SSL_ERROR_RX_RECORD_TOO_LONG`). Também faz `parseProxyLoginUrl`, que extrai o link de login da "mensagem de erro" do proxy. |
| `lib/cookie-file.js` | Grava o cookie de forma atômica (tmp + rename), mantém um `.bak` e lê dele quando o principal estiver corrompido. |
| `lib/i18n.js`, `lib/locales/*.json` | i18n **de execução** (status, avisos, erros). O idioma vem da opção *Mensagens* da conta (`language`: auto/en-US/pt-BR). `i18n.t(node, key, vars)` usa o idioma de `node.account`. Placeholders no formato `__nome__`. |
| `lib/common.js` | Utilitários usados em todo lugar: `nodeSetup` (status do nó espelhando o estado da conta), callbacks `send`/`warn`/`error`, `matches`/`template` (validação de entrada), `assign*`, `portAvailable` (com retry). |
| `lib/color-convert.js`, `delta-e.js`, `known-color-values.js` | Conversão de cores e escolha do nome de cor da Alexa mais próximo. |
| `test/` | Testes `node:test` de proxy-fix, cookie-file, conta (refresh/porta) e i18n (paridade dos catálogos). |
| `examples.md` | Flows de exemplo para importar. |
| `get_cookie.md` | Como pegar o cookie à mão (método Cookie, obsoleto). |

## Fluxo de autenticação (o que mais quebra)

1. A conta (`initAlexa`) lê o cookie salvo (`cookieFile`, ou o padrão `<userDir>/alexa-remote-cookie-<id>.json`) e chama `alexa.initExt`.
2. Sem cookie, o `alexa-cookie2` sobe um proxy em `proxyOwnIp:proxyPort` (padrão 3456) e "falha" com uma mensagem contendo o link. `initExt` reconhece essa mensagem → estado `WAIT_PROXY` → evento `account-login-required`.
3. Depois do login no navegador, a biblioteca entrega `cookieData` (com `localCookie`, `macDms` e `formerRegistrationData`), e a conta grava o arquivo.
4. `refreshAlexa` reaproveita o cookie da memória (ou do arquivo); o `alexa-remote2` renova pelo token se ele tiver mais de 24 h.

## Armadilhas conhecidas

- **Dependências fixadas:** `alexa-remote2@8.1.1` traz `alexa-cookie2@5.0.6`. Ao atualizar, confira em `node_modules/alexa-cookie2`:
  o formato da mensagem do proxy (`parseProxyLoginUrl`), se `lib/proxy.js` ainda exporta `initAmazonProxy` e se continua repassando os cabeçalhos CSP.
  `package.json` tem um `overrides` (`cookie@^0.7.2`) por causa de uma vulnerabilidade.
- **A Amazon bloqueia `curl`/scripts** com 503 ("automated access"). Isso não é bug do proxy; teste o login num navegador.
- **Quebra de linha:** a maioria dos arquivos está em CRLF. Scripts de substituição precisam normalizar `\r\n` antes de casar strings com várias linhas.
- **Node-RED guarda o HTML e os catálogos na partida:** depois de editar `.html` ou `locales/`, reinicie o Node-RED de teste.
- **Editor:** `data-i18n` não funciona em `<optgroup>` (o Node-RED remove o atributo). Use `data-label-key` + tradução no `oneditprepare`, como em `alexa-remote-event.html`.
- **i18n:** toda chave nova vai **nos dois** catálogos (`en-US` e `pt-BR`) com os mesmos placeholders; `test/i18n.test.js` falha se faltar.
- **Refresh:** limitado a 1–14 dias (`MAX_REFRESH_DAYS`), porque `setTimeout` estoura acima de ~24,8 dias e entra em loop.
- **Compatibilidade de flows:** não renomeie tipos de nó nem propriedades salvas (`useWsMqtt`, `cookieFile`, `refreshInterval`...); os flows dos usuários dependem deles.

## Testar no Node-RED de verdade

Instale num diretório temporário (`npm install node-red@4` + `npm install <caminho do repo>` no userDir, que cria um symlink) e rode
`node node_modules/node-red/red.js -u <userDir> -p <porta>`. Com um flow de conta Proxy, `GET /alexa-remote-account-state.json?account=<id>`
mostra o estado e o `loginUrl`. Para o editor, um Chrome headless via `playwright-core` (com `executablePath` do Chrome instalado) dá conta.
Encerre o processo do Node-RED no final; ele segura a porta.

## Commits

- Uma branch por mudança, push para `origin` (o fork). Nada vai para `upstream`.
- Atualize o `CHANGELOG.md` (entrada da versão no topo) quando a mudança for visível para o usuário.
