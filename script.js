// script.js — consome a AniList API (https://docs.anilist.co/) para buscar animes
// A AniList usa GraphQL: fazemos um POST com uma query em vez de montar a URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_URL = "https://graphql.anilist.co";

// ---- Inicialização do Supabase ----
const SUPABASE_URL = "https://ocvrqxonmhtjajrvyzwo.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ln4c75pHqY1ikD2iiXFS7Q_ytENKKGL";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// A MyMemory (plano gratuito) só aceita até 500 caracteres por consulta.
const LIMITE_CARACTERES_TRADUCAO = 480;

// Função auxiliar para traduzir a sinopse em inglês para português
async function traduzirParaPT(texto) {
  if (!texto || texto === "Sinopse não disponível para este título.") return texto;

  let textoLimpo = texto.replace(/<[^>]*>?/gm, '');

  if (textoLimpo.length > LIMITE_CARACTERES_TRADUCAO) {
    const cortado = textoLimpo.slice(0, LIMITE_CARACTERES_TRADUCAO);
    const ultimoPonto = cortado.lastIndexOf(". ");
    textoLimpo = ultimoPonto > 100 ? cortado.slice(0, ultimoPonto + 1) : cortado + "...";
  }

  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textoLimpo)}&langpair=en|pt`);
    if (!res.ok) return textoLimpo;

    const json = await res.json();
    const traduzido = json.responseData?.translatedText;

    if (!traduzido || /QUERY LENGTH LIMIT EXCEEDED/i.test(traduzido)) {
      return textoLimpo;
    }

    return traduzido;
  } catch (erro) {
    console.error("Erro na tradução:", erro);
    return textoLimpo;
  }
}

// ---- Funções CRUD do Supabase (Persistência) ----

// CREATE — Salvar Anime nos Favoritos (com verificação de duplicados)
async function salvarFavorito(animeId, titulo, imagemUrl) {
  // 1. Verifica se o anime já existe na tabela pelo anime_id
  const { data: existente, error: erroConsulta } = await supabaseClient
    .from('favoritos')
    .select('id')
    .eq('anime_id', animeId);

  if (erroConsulta) {
    console.error('Erro ao verificar duplicados:', erroConsulta);
  }

  if (existente && existente.length > 0) {
    alert('Este anime já se encontra nos seus favoritos!');
    return;
  }

  // 2. Se não existir, insere normalmente
  const { data, error } = await supabaseClient
    .from('favoritos')
    .insert([{ anime_id: animeId, titulo: titulo, imagem_url: imagemUrl }]);

  if (error) {
    console.error('Detalhe completo do erro do Supabase:', error);
    alert('Erro ao guardar: ' + (error.message || JSON.stringify(error)));
  } else {
    alert('Anime adicionado aos favoritos!');
    listarFavoritos();
  }
}

// READ — Listar Animes Favoritos na Interface
async function listarFavoritos() {
  const containerFavoritos = document.getElementById('lista-favoritos');
  if (!containerFavoritos) return;

  const { data, error } = await supabaseClient
    .from('favoritos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao listar favoritos:', error);
    containerFavoritos.innerHTML = `<p style="color: #ff6b6b;">Erro ao carregar favoritos do banco.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    containerFavoritos.innerHTML = `<p style="color: #888;">Nenhum favorito guardado ainda.</p>`;
    return;
  }

  containerFavoritos.innerHTML = data.map(fav => `
    <div class="card-favorito" style="background: #25282e; border-radius: 6px; padding: 10px; width: 140px; text-align: center; border: 1px solid #33363d;">
      <img src="${fav.imagem_url || ''}" alt="${fav.titulo}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 4px;">
      <h4 style="color: #fff; font-size: 13px; margin: 8px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${fav.titulo}">${fav.titulo}</h4>
      <button class="btn-excluir-fav" data-id="${fav.id}" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">Excluir</button>
    </div>
  `).join('');

  // Evento para excluir
  containerFavoritos.querySelectorAll('.btn-excluir-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      removerFavorito(id);
    });
  });
}

// DELETE — Remover Anime dos Favoritos
async function removerFavorito(id) {
  const { error } = await supabaseClient
    .from('favoritos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao remover favorito:', error);
    alert('Erro ao remover favorito.');
  } else {
    listarFavoritos();
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
        <button id="btn-salvar-favorito" style="margin-top: 15px; background: #e74c3c; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">⭐ Salvar nos Favoritos</button>
      </div>
    </div>
  `;

  modalOverlay.hidden = false;
  modalFechar.focus();

  // Ação do botão de favoritar dentro do modal
  document.getElementById('btn-salvar-favorito').addEventListener('click', () => {
    salvarFavorito(anime.id, titulo, capa);
  });

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

// ---- Inicialização ao carregar a página ----
document.addEventListener('DOMContentLoaded', () => {
  listarFavoritos();
  buscarAnimes("Frieren");
});