// Utilitário: ordena livros por ano e título
function ordenarLivros(livros) {
  return livros.slice().sort((a, b) => {
    if (a.ano === b.ano) return a.titulo.localeCompare(b.titulo);
    return a.ano - b.ano;
  });
}

async function carregarLivros() {
  try {
    const response = await fetch("data/books.json");
    if (!response.ok) throw new Error("Erro ao carregar livros");
    const livros = await response.json();
    return ordenarLivros(livros.filter((l) => l.ano));
  } catch (e) {
    document.getElementById("timeline").innerHTML =
      "<p>Não foi possível carregar os dados da linha do tempo.</p>";
    return [];
  }
}

function criarEventoLivroLivro(livro, idx) {
  return `
    <div class="timeline-event" style="animation-delay: ${idx * 0.16}s">
        <div class="dot"></div>
        <div class="year">${livro.ano}</div>
        <div class="event-card" tabindex="0"
            data-titulo="${livro.titulo}"
            data-autor="${livro.autor}"
            data-genero="${livro.genero.join(", ")}"
            data-corrente="${livro.corrente_literaria}"
            data-desc="${livro.descricao.replace(/"/g, "&quot;")}"
            data-capa="${livro.imagem}">
            <img class="event-cover" src="${livro.imagem}" alt="Capa de ${
    livro.titulo
  }">
            <div class="event-info">
                <div class="event-title">${livro.titulo}</div>
                <div class="event-author">${livro.autor}</div>
                <div class="event-corrente">${livro.corrente_literaria}</div>
            </div>
        </div>
    </div>
    `;
}

function mostrarModalLivro(data) {
  const modal = document.getElementById("bookModal");
  document.getElementById("modalCover").src = data.capa || "";
  document.getElementById("modalCover").alt = data.titulo;
  document.getElementById("modalTitle").textContent = data.titulo;
  document.getElementById(
    "modalAuthor"
  ).innerHTML = `<strong>Autor:</strong> ${data.autor}`;
  document.getElementById(
    "modalGenre"
  ).innerHTML = `<strong>Gênero:</strong> ${data.genero}`;
  document.getElementById(
    "modalCorrente"
  ).innerHTML = `<strong>Corrente:</strong> ${data.corrente}`;
  document.getElementById("modalDesc").textContent = data.desc;
  modal.classList.add("open");
}

function fecharModal() {
  const modal = document.getElementById("bookModal");
  modal.classList.remove("open");
}

function animarEventosScroll() {
  const eventos = document.querySelectorAll(".timeline-event");
  const ativar = () => {
    let windowBottom = window.scrollY + window.innerHeight * 0.91;
    eventos.forEach((ev) => {
      if (ev.getBoundingClientRect().top + window.scrollY < windowBottom) {
        ev.classList.add("visible");
      }
    });
  };
  ativar();
  window.addEventListener("scroll", ativar);
}

document.addEventListener("DOMContentLoaded", async () => {
  const timelineDiv = document.getElementById("timeline");
  const livros = await carregarLivros();
  if (!livros.length) return;

  timelineDiv.innerHTML = livros.map(criarEventoLivroLivro).join("");

  // Modal
  document.body.addEventListener("click", (e) => {
    if (e.target.closest(".event-card")) {
      const el = e.target.closest(".event-card");
      mostrarModalLivro({
        titulo: el.dataset.titulo,
        autor: el.dataset.autor,
        genero: el.dataset.genero,
        corrente: el.dataset.corrente,
        desc: el.dataset.desc,
        capa: el.dataset.capa,
      });
    }
    // Fecha ao clicar em background ou botão de fechar
    if (
      e.target.matches(".modal-bg") ||
      e.target.matches(".close-btn") ||
      (e.target.closest(".modal") && e.target.classList.contains("modal"))
    ) {
      fecharModal();
    }
  });

  // Também fecha ao apertar Esc
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModal();
  });

  animarEventosScroll();
});
