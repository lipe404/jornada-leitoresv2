// ===== VARIÁVEIS GLOBAIS =====
let allBooks = [];

// ===== CARREGAR E ORDENAR LIVROS =====
async function carregarLivros() {
  try {
    const response = await fetch("data/books.json");
    if (!response.ok) throw new Error("Erro ao carregar livros");

    const livros = await response.json();

    // Filtrar livros com ano de publicação válido e ordenar cronologicamente
    const livrosValidos = livros.filter(
      (livro) =>
        livro.ano_publicacao &&
        livro.ano_publicacao !== "Ano desconhecido" &&
        !isNaN(livro.ano_publicacao)
    );

    return livrosValidos.sort((a, b) => {
      if (a.ano_publicacao === b.ano_publicacao) {
        return a.titulo.localeCompare(b.titulo);
      }
      return a.ano_publicacao - b.ano_publicacao;
    });
  } catch (error) {
    console.error("Erro ao carregar livros:", error);
    document.getElementById("timeline").innerHTML =
      "<p style='text-align: center; color: #666; font-size: 1.2em; padding: 40px;'>Não foi possível carregar os dados da linha do tempo.</p>";
    return [];
  }
}

// ===== CRIAR EVENTO DA TIMELINE =====
function criarEventoTimeline(livro, index) {
  const genres = Array.isArray(livro.genero)
    ? livro.genero.join(", ")
    : livro.genero;
  const collections = livro.colecao
    ? livro.colecao
        .map((col) => `<span class="collection-badge">${col}</span>`)
        .join("")
    : "";

  return `
    <div class="timeline-event" style="animation-delay: ${index * 0.1}s">
      <div class="timeline-year">${livro.ano_publicacao}</div>
      <div class="timeline-dot"></div>
      <div class="event-content" 
           data-book-id="${livro.id}"
           data-titulo="${livro.titulo}"
           data-autor="${livro.autor}"
           data-ano="${livro.ano_publicacao}"
           data-pais="${livro.pais}"
           data-genero="${genres}"
           data-corrente="${livro.corrente_literaria}"
           data-desc="${livro.descricao.replace(/"/g, "&quot;")}"
           data-capa="${livro.imagem_capa || "img/default-cover.png"}"
           data-colecoes="${livro.colecao ? livro.colecao.join(", ") : ""}">
        
        <div class="book-info">
          <img class="book-cover" 
               src="${livro.imagem_capa || "img/default-cover.png"}" 
               alt="Capa de ${livro.titulo}"
               onerror="this.src='img/default-cover.png'">
          
          <div class="book-details">
            <h3 class="book-title">${livro.titulo}</h3>
            <div class="book-author">${livro.autor}</div>
            <div class="book-genre"><strong>Gêneros:</strong> ${genres}</div>
            <div class="book-movement"><strong>Corrente:</strong> ${
              livro.corrente_literaria
            }</div>
            <div class="book-description">${livro.descricao}</div>
            <div class="book-collections">${collections}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== MOSTRAR MODAL DO LIVRO =====
function mostrarModalLivro(data) {
  const modal = document.getElementById("bookModal");

  // Preencher dados do modal
  document.getElementById("modalCover").src = data.capa;
  document.getElementById("modalCover").alt = data.titulo;
  document.getElementById("modalTitle").textContent = data.titulo;
  document.getElementById(
    "modalAuthor"
  ).innerHTML = `<strong>Autor:</strong> ${data.autor}`;
  document.getElementById(
    "modalGenre"
  ).innerHTML = `<strong>Gêneros:</strong> ${data.genero}`;
  document.getElementById(
    "modalCorrente"
  ).innerHTML = `<strong>Corrente:</strong> ${data.corrente}`;
  document.getElementById("modalDesc").textContent = data.desc;

  // Adicionar informações extras no modal
  const extraInfo = document.createElement("div");
  extraInfo.innerHTML = `
    <p style="margin-top: 16px;"><strong>Ano de Publicação:</strong> ${
      data.ano
    }</p>
    <p><strong>País:</strong> ${data.pais}</p>
    ${data.colecoes ? `<p><strong>Coleções:</strong> ${data.colecoes}</p>` : ""}
  `;

  const modalDesc = document.getElementById("modalDesc");
  modalDesc.parentNode.insertBefore(extraInfo, modalDesc.nextSibling);

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

// ===== FECHAR MODAL =====
function fecharModal() {
  const modal = document.getElementById("bookModal");
  modal.classList.remove("open");
  document.body.style.overflow = "auto";

  // Remover informações extras adicionadas
  const extraInfo = modal.querySelector("div:not([id])");
  if (extraInfo && extraInfo.innerHTML.includes("Ano de Publicação")) {
    extraInfo.remove();
  }
}

// ===== ANIMAÇÃO DE SCROLL =====
function animarEventosScroll() {
  const eventos = document.querySelectorAll(".timeline-event");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }
  );

  eventos.forEach((evento) => {
    observer.observe(evento);
  });
}

// ===== BUSCAR CAPA MELHORADA =====
async function buscarCapaMelhorada(livro) {
  try {
    const query = encodeURIComponent(
      `intitle:"${livro.titulo}" inauthor:"${livro.autor}"`
    );
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items[0]?.volumeInfo?.imageLinks) {
      const links = data.items[0].volumeInfo.imageLinks;
      return (
        links.large || links.medium || links.thumbnail || links.smallThumbnail
      );
    }
  } catch (error) {
    console.warn(`Erro ao buscar capa para ${livro.titulo}:`, error);
  }
  return null;
}

// ===== ATUALIZAR CAPAS EM BACKGROUND =====
async function atualizarCapasBackground() {
  const livrosComCapaRuim = allBooks.filter(
    (livro) =>
      !livro.imagem_capa ||
      livro.imagem_capa.includes("unsplash.com") ||
      livro.imagem_capa === ""
  );

  console.log(
    `🔍 Buscando capas melhores para ${livrosComCapaRuim.length} livros...`
  );

  for (let i = 0; i < Math.min(livrosComCapaRuim.length, 10); i++) {
    const livro = livrosComCapaRuim[i];
    const novaCapa = await buscarCapaMelhorada(livro);

    if (novaCapa) {
      livro.imagem_capa = novaCapa;

      // Atualizar na timeline
      const eventCard = document.querySelector(`[data-book-id="${livro.id}"]`);
      if (eventCard) {
        const img = eventCard.querySelector(".book-cover");
        if (img) img.src = novaCapa;
        eventCard.dataset.capa = novaCapa;
      }

      console.log(`✅ Capa atualizada para: ${livro.titulo}`);
    }

    // Delay entre buscas
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Carregando Timeline Literária...");

  // Carregar livros
  allBooks = await carregarLivros();
  if (!allBooks.length) return;

  console.log(
    `📚 ${allBooks.length} livros carregados e ordenados cronologicamente`
  );

  // Renderizar timeline
  const timelineDiv = document.getElementById("timeline");
  timelineDiv.innerHTML = allBooks
    .map((livro, index) => criarEventoTimeline(livro, index))
    .join("");

  // Configurar eventos do modal
  document.body.addEventListener("click", (e) => {
    if (e.target.closest(".event-content")) {
      const el = e.target.closest(".event-content");
      mostrarModalLivro({
        titulo: el.dataset.titulo,
        autor: el.dataset.autor,
        ano: el.dataset.ano,
        pais: el.dataset.pais,
        genero: el.dataset.genero,
        corrente: el.dataset.corrente,
        desc: el.dataset.desc,
        capa: el.dataset.capa,
        colecoes: el.dataset.colecoes,
      });
    }

    // Fechar modal
    if (
      e.target.matches(".modal-bg") ||
      e.target.matches(".close-btn") ||
      (e.target.closest(".modal") && e.target.classList.contains("modal"))
    ) {
      fecharModal();
    }
  });

  // Fechar modal com ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModal();
  });

  // Iniciar animações de scroll
  animarEventosScroll();

  // Buscar capas melhores em background
  setTimeout(() => {
    atualizarCapasBackground();
  }, 2000);

  console.log("✅ Timeline carregada com sucesso!");
});
