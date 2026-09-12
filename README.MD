# AniVault — Catálogo de Animes

## Autor
Kauã Henrique Tolentino Nunes — Matrícula 22612244

## Descrição
Aplicação web que permite buscar animes em tempo real e visualizar detalhes como nota, episódios, status e sinopse (traduzida automaticamente para português). Útil para quem quer descobrir rapidamente informações sobre um anime antes de assistir.

## API utilizada
- **AniList API** (GraphQL) — [documentação](https://docs.anilist.co/)
- **MyMemory Translation API** — usada para traduzir a sinopse do inglês para o português
- Endpoint(s) consumido(s):
  - `POST https://graphql.anilist.co` — query `Page.media` (busca de animes por termo)
  - `GET https://api.mymemory.translated.net/get` — tradução da sinopse

## Funcionalidades
- Buscar animes por nome (ex: Bleach, Naruto, Frieren)
- Visualizar em cards: capa, título, nota média e número de episódios
- Clicar em um card para abrir um modal com detalhes completos: sinopse (traduzida para PT-BR), gêneros, status e nota
- Fechar o modal clicando fora, no botão "×" ou pressionando Esc
- Voltar à listagem inicial pelo botão "← Voltar" ou clicando no logo AniVault
- Tratamento de erros: mensagens amigáveis para buscas sem resultado ou falhas de conexão, com nova tentativa automática em erros temporários da API

## Como executar localmente
1. Clone: `git clone https://github.com/kauahenrique-create/REPOSITORIO.git`
2. Abra o arquivo `index.html` no navegador

## Links
- **Aplicação no ar (GitHub Pages):** https://kauahenrique-create.github.io/REPOSITORIO/
- **Repositório:** https://github.com/kauahenrique-create/REPOSITORIO
