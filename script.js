// script.js — consome a AniList API (https://docs.anilist.co/) para buscar animes
// A AniList usa GraphQL: fazemos um POST com uma query em vez de montar a URL.
 
const API_URL = "https://graphql.anilist.co";
 
const form = document.getElementById("form-busca");
const campoBusca = document.getElementById("campo-busca");
const areaResultado = document.getElementById("resultado");
const areaStatus = document.getElementById("status-area");
const modalOverlay = document.getElementById("modal-overlay");
const modalConteudo = document.getElementById("modal-conteudo");
const modalFechar = document.getElementById("modal-fechar");
const btnLimpar = document.getElementById("btn-limpar");
const btnInicio = document.getElementById("btn-inicio");
 
let ultimosResultados = []; // guarda os dados da última busca para abrir no modal sem nova requisição
 
// Tradução simples dos status que a AniList devolve em inglês
const STATUS_PT = {
  FINISHED: "Finalizado",
  RELEASING: "Em exibição",
  NOT_YET_RELEASED: "Ainda não lançado",
  CANCELLED: "Cancelado",
  HIATUS: "Em hiato",
};
 
// Query GraphQL: busca até 15 animes pelo termo digitado
const QUERY_BUSCA = `
  query ($termo: String) {
    Page(perPage: 15) {
      media(search: $termo, type: ANIME, sort: SEARCH_MATCH) {
        id
        title {
          romaji
          english
        }
        coverImage {
          large
        }
        averageScore
        episodes
        status
        genres
        description(asHtml: false)
      }
    }
  }
`;
 
// ---- Utilidades de status (loading / erro / vazio) ----
function mostrarStatus(mensagem, tipo = "info") {
  areaStatus.hidden = false;
  areaStatus.textContent = mensagem;
  areaStatus.classList.toggle("erro", tipo === "erro");
}
 
function esconderStatus() {
  areaStatus.hidden = true;
  areaStatus.classList.remove("erro");
}
 
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
 
// Função auxiliar para traduzir a sinopse em inglês para português
async function traduzirParaPT(texto) {
  if (!texto || texto === "Sinopse não disponível para este título.") return texto;
 
  const textoLimpo = texto.replace(/<[^>]*>?/gm, '');
 
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textoLimpo)}&langpair=en|pt`);
    if (!res.ok) return textoLimpo;
 
    const json = await res.json();
    return json.responseData?.translatedText || textoLimpo;
  } catch (erro) {
    console.error("Erro na tradução:", erro);
    return textoLimpo;
  }
}
 
// ---- Busca na API (com retry automático em erros temporários) ----
const STATUS_TEMPORARIOS = [429, 502, 503, 504];
 
async function buscarAnimes(termo, tentativa = 1) {
  const MAX_TENTATIVAS = 3;
 
  if (tentativa === 1) {
    areaResultado.innerHTML = "";
    mostrarStatus(`Buscando por "${termo}"...`);
  } else {
    mostrarStatus(`O servidor da API está lento. Tentando novamente (${tentativa}/${MAX_TENTATIVAS})...`);
  }
 
  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query: QUERY_BUSCA,
        variables: { termo },
      }),
    });
 
    if (!resposta.ok) {
      const erroTemporario = STATUS_TEMPORARIOS.includes(resposta.status);
      if (erroTemporario && tentativa < MAX_TENTATIVAS) {
        await esperar(1000 * tentativa);
        return buscarAnimes(termo, tentativa + 1);
      }
      throw new Error(`A API respondeu com status ${resposta.status}`);
    }
 
    const corpo = await resposta.json();
 
    if (corpo.errors && corpo.errors.length > 0) {
      throw new Error(corpo.errors[0].message || "Erro retornado pela API");
    }
 
    const lista = corpo.data?.Page?.media || [];
 
    if (lista.length === 0) {
      mostrarStatus(`Nenhum anime encontrado para "${termo}". Tente outro termo.`, "erro");
      ultimosResultados = [];
      return;
    }
 
    // AQUI ENTRA A REGRA DO BOTÃO VOLTAR:
    if (btnLimpar) {
      if (termo.toLowerCase() !== "frieren") {
        btnLimpar.hidden = false;
      } else {
        btnLimpar.hidden = true;
      }
    }
 
    ultimosResultados = lista;
    esconderStatus();
    renderizarGrid(lista);
  } catch (erro) {
    console.error("Erro ao buscar animes:", erro);
    mostrarStatus(
      "Não foi possível carregar os dados agora. Verifique sua conexão e tente novamente em instantes.",
      "erro"
    );
  }
}
 
// ---- Renderização do grid de cards ----
function tituloDe(anime) {
  return anime.title?.english || anime.title?.romaji || "Sem título";
}
 
function renderizarGrid(lista) {
  areaResultado.innerHTML = lista
    .map((anime, indice) => {
      const capa = anime.coverImage?.large || "";
      const titulo = tituloDe(anime);
      const nota = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "—";
      const episodios = anime.episodes ? `${anime.episodes} eps` : "Em exibição";
 
      return `
        <article class="card" tabindex="0" role="button" data-indice="${indice}" aria-label="Ver detalhes de ${titulo}">
          <img src="${capa}" alt="Capa de ${titulo}" loading="lazy">
          <div class="card-body">
            <h3 class="card-title">${titulo}</h3>
            <div class="card-meta">
              <span class="card-score">★ ${nota}</span>
              <span>${episodios}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}
 
// ---- Modal de detalhes com tradução da sinopse ----
async function abrirModal(indice) {
  const anime = ultimosResultados[indice];
  if (!anime) return;
 
  const capa = anime.coverImage?.large || "";
  const titulo = tituloDe(anime);
  const generos = (anime.genres || []).map((g) => `<span class="tag">${g}</span>`).join("");
  const statusTraduzido = STATUS_PT[anime.status] || anime.status || "—";
  const nota = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "—";
  const sinopseOriginal = anime.description || "Sinopse não disponível para este título.";
 
  modalConteudo.innerHTML = `
    <div class="modal-grid">
      <img src="${capa}" alt="Capa de ${titulo}">
      <div>
        <h2 id="modal-titulo">${titulo}</h2>
        <div class="modal-stats">
          <span><strong>★ ${nota}</strong> nota</span>
          <span><strong>${anime.episodes ?? "?"}</strong> episódios</span>
          <span><strong>${statusTraduzido}</strong></span>
        </div>
        <div class="modal-tags">${generos}</div>
        <p class="modal-synopsis" id="synopsis-text">Traduzindo sinopse para português...</p>
      </div>
    </div>
  `;
 
  modalOverlay.hidden = false;
  modalFechar.focus();
 
  // Traduz e atualiza o texto no modal
  const sinopseTraduzida = await traduzirParaPT(sinopseOriginal);
  const elementoSinopse = document.getElementById("synopsis-text");
  if (elementoSinopse) {
    elementoSinopse.textContent = sinopseTraduzida;
  }
}
 
function fecharModal() {
  modalOverlay.hidden = true;
  modalConteudo.innerHTML = "";
}
 
// ---- Função para resetar e voltar para o início ----
function resetarParaInicio(evento) {
  if (evento) evento.preventDefault();
  campoBusca.value = "";
  if (btnLimpar) btnLimpar.hidden = true;
  buscarAnimes("Frieren");
}
 
// ---- Eventos ----
form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const termo = campoBusca.value.trim();
  if (termo) buscarAnimes(termo);
});
 
areaResultado.addEventListener("click", (evento) => {
  const card = evento.target.closest(".card");
  if (card) abrirModal(Number(card.dataset.indice));
});
 
areaResultado.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter" || evento.key === " ") {
    const card = evento.target.closest(".card");
    if (card) {
      evento.preventDefault();
      abrirModal(Number(card.dataset.indice));
    }
  }
});
 
modalFechar.addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", (evento) => {
  if (evento.target === modalOverlay) fecharModal();
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !modalOverlay.hidden) fecharModal();
});
 
if (btnLimpar) btnLimpar.addEventListener("click", resetarParaInicio);
if (btnInicio) btnInicio.addEventListener("click", resetarParaInicio);
 
// ---- Busca inicial ao carregar a página ----
buscarAnimes("Frieren");