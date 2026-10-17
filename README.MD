# AniVault — Catálogo de Animes

## Autor
Kauã Henrique Tolentino Nunes — Matrícula 22612244

## Links do Projeto
- **Repositório GitHub:** https://github.com/kauahenrique-create/REPOSITORIO
- **Aplicação no ar (GitHub Pages):** https://kauahenrique-create.github.io/REPOSITORIO/
- **Imagem no Docker Hub:** https://hub.docker.com/r/kauatolentino/anivault

---

## Descrição
Aplicação web que permite buscar animes em tempo real e visualizar detalhes como nota, episódios, status e sinopse (traduzida automaticamente para português).

## API utilizada
- **AniList API** (GraphQL)
- **MyMemory Translation API** — usada para traduzir a sinopse do inglês para o português

## Funcionalidades
- Buscar animes por nome (ex: Bleach, Naruto, Frieren)
- Visualizar em cards: capa, título, nota média e número de episódios
- Modal com detalhes completos: sinopse traduzida para PT-BR, gêneros, status e nota

---

## 💾 Persistência de Dados (Supabase / PostgreSQL)
A aplicação conta com persistência de dados em nuvem utilizando o Supabase para gerenciar a lista de animes favoritos do usuário.
- **Tabela utilizada:** `favoritos`
- **Operações CRUD:** Create, Read e Delete implementados.

---

## 🐳 Conteinerização com Docker
Aplicação conteinerizada utilizando imagem base **Nginx (Alpine)**.

### Como rodar localmente:
\`\`\`bash
docker run -d -p 8080:80 --name anivault-app kauatolentino/anivault:1.0.0
\`\`\`
Aceda em: `http://localhost:8080`

---

## 🧩 Evidências das Sidequests

### SQ1 · \`.dockerignore\`
Exclui ficheiros desnecessários do build, otimizando o tamanho e a performance da imagem.

### SQ2 · Versionamento de Imagem
Publicada no Docker Hub sob as tags `1.0.0`, `1.1.0` e `latest`.

### SQ3 · Documentação no Docker Hub
Repositório no Docker Hub com descrição completa e instruções.

### SQ4 · Orquestração e Múltiplos Containers
Execução simultânea em portas distintas (`8080` e `8081`).

* **Container na porta 8080:**
  ![Print SQ4 Porta 8080](./print-sq4-8080.jpg)

* **Container na porta 8081:**
  ![Print SQ4 Porta 8081](./print-sq4-8081.jpg)

**Reflexão sobre Orquestração (Kubernetes):**
*Em cenários de alta escala com centenas de instâncias, o uso do **Kubernetes** é essencial para gerenciar clusters em Pods, realizar balanceamento de carga, escalabilidade automática e substituição de instâncias com falha.*