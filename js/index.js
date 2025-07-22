// Função para carregar books.json e apresentar estatísticas e livros
async function loadBooks() {
  try {
    const response = await fetch("data/books.json");
    const books = await response.json();
    showStats(books);
    await showLatestBooksWithCovers(books);
  } catch (error) {
    console.error("Erro ao carregar livros:", error);
    document.getElementById("stats-cards").innerHTML =
      "<p>Falha ao carregar dados dos livros.</p>";
    document.getElementById("book-list").innerHTML =
      "<p>Falha ao carregar os últimos livros.</p>";
  }
}

// Estatísticas básicas
function showStats(books) {
  const total = books.length;
  const generos = {};
  const autores = new Set();

  books.forEach((book) => {
    book.genero.forEach((g) => (generos[g] = (generos[g] || 0) + 1));
    autores.add(book.autor);
  });

  document.getElementById("stats-cards").innerHTML = `
    <div class="stat-card">
      <h3>${total}</h3>
      <span>Livros lidos</span>
    </div>
    <div class="stat-card">
      <h3>${Object.keys(generos).length}</h3>
      <span>Gêneros diferentes</span>
    </div>
    <div class="stat-card">
      <h3>${autores.size}</h3>
      <span>Autores</span>
    </div>
  `;
}

// Função para buscar capa de livro na Google Books API
async function fetchBookCover(titulo, autor) {
  const query = encodeURIComponent(`intitle:"${titulo}" inauthor:"${autor}"`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items[0]?.volumeInfo?.imageLinks) {
      const links = data.items[0].volumeInfo.imageLinks;
      return (
        links.extraLarge ||
        links.large ||
        links.medium ||
        links.thumbnail ||
        links.smallThumbnail
      );
    }
  } catch (error) {
    console.warn("Erro ao buscar capa:", titulo, autor, error);
  }

  return null;
}

// Função para verificar se uma imagem precisa ser atualizada
function needsCoverUpdate(book) {
  return (
    !book.imagem_capa ||
    book.imagem_capa === "" ||
    book.imagem_capa.includes("unsplash.com") ||
    book.imagem_capa.includes("placeholder")
  );
}

// Função para verificar se um livro pertence a uma coleção específica
function belongsToCollection(book, collectionName) {
  return book.colecao && book.colecao.includes(collectionName);
}

// Função para selecionar livros por coleção
function selectBooksByCollection(books) {
  const selectedBooks = [];

  // Filtrar livros por coleção
  const clubePrincipalBooks = books.filter((book) =>
    belongsToCollection(book, "Clube Principal")
  );
  const vplnBooks = books.filter((book) => belongsToCollection(book, "VPLN"));
  const opecaBooks = books.filter((book) => belongsToCollection(book, "OPECA"));

  // Pegar os 3 últimos do Clube Principal
  const latestClubePrincipal = clubePrincipalBooks.slice(-3);
  selectedBooks.push(...latestClubePrincipal);

  // Pegar o último da VPLN
  const latestVPLN = vplnBooks.slice(-1);
  selectedBooks.push(...latestVPLN);

  // Pegar o último da OPECA
  const latestOPECA = opecaBooks.slice(-1);
  selectedBooks.push(...latestOPECA);

  console.log("Livros selecionados por coleção:");
  console.log(
    `- Clube Principal (3 últimos): ${latestClubePrincipal
      .map((b) => b.titulo)
      .join(", ")}`
  );
  console.log(
    `- VPLN (1 último): ${latestVPLN.map((b) => b.titulo).join(", ")}`
  );
  console.log(
    `- OPECA (1 último): ${latestOPECA.map((b) => b.titulo).join(", ")}`
  );

  return selectedBooks;
}

// Mostrar últimos livros com capas otimizadas
async function showLatestBooksWithCovers(books) {
  // Seleciona livros específicos por coleção
  const selectedBooks = selectBooksByCollection(books);

  // Primeiro, mostra os livros com as imagens que já existem
  displayBooks(selectedBooks);

  // Depois, busca e atualiza apenas as capas que precisam ser melhoradas
  const booksNeedingCovers = selectedBooks.filter(needsCoverUpdate);

  if (booksNeedingCovers.length > 0) {
    console.log(
      `Buscando capas para ${booksNeedingCovers.length} dos livros selecionados...`
    );

    // Busca capas em paralelo para ser mais rápido
    const coverPromises = booksNeedingCovers.map(async (book, index) => {
      // Pequeno delay escalonado para não sobrecarregar a API
      await new Promise((resolve) => setTimeout(resolve, index * 300));

      const capa = await fetchBookCover(book.titulo, book.autor);
      if (capa) {
        book.imagem_capa = capa;
        console.log(`Capa encontrada para: ${book.titulo}`);
        // Atualiza apenas este livro específico na tela
        updateBookCover(book.id, capa);
      }
      return book;
    });

    await Promise.all(coverPromises);
  }
}

// Função para exibir os livros na tela
function displayBooks(books) {
  document.getElementById("book-list").innerHTML = books
    .map(
      (book) => `
    <div class="book-card" data-book-id="${book.id}">
      <div class="book-cover-background" style="background-image: url('${
        book.imagem_capa || "img/default-cover.png"
      }')">
        ${needsCoverUpdate(book) ? '<div class="loading-overlay">🔍</div>' : ""}
        <div class="book-info-overlay">
          <div class="book-info-content">
            <h4 class="book-title">${book.titulo}</h4>
            <span class="book-author">${book.autor}</span>
            <p class="book-description">${book.descricao.substring(
              0,
              120
            )}...</p>
            <div class="book-genres">
              ${book.genero
                .slice(0, 2)
                .map((genero) => `<span class="genre-tag">${genero}</span>`)
                .join("")}
            </div>
            <div class="book-collection">
              ${book.colecao
                .map((col) => `<span class="collection-tag">${col}</span>`)
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

// Função para atualizar apenas a capa de um livro específico
function updateBookCover(bookId, newCoverUrl) {
  const bookCard = document.querySelector(`[data-book-id="${bookId}"]`);
  if (bookCard) {
    const coverBackground = bookCard.querySelector(".book-cover-background");
    const loadingOverlay = bookCard.querySelector(".loading-overlay");

    if (coverBackground) {
      coverBackground.style.backgroundImage = `url('${newCoverUrl}')`;
    }
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }
}

// FUNCIONALIDADE DO MENU RESPONSIVO
document.addEventListener("DOMContentLoaded", function () {
  // Carrega os livros
  loadBooks();
  // Inicializa o menu responsivo
  initResponsiveMenu();
});

function initResponsiveMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarClose = document.getElementById("sidebarClose");
  const mainContent = document.getElementById("mainContent");

  // Função para abrir o menu
  function openSidebar() {
    sidebar.classList.add("active");
    menuToggle.classList.add("active");

    // No mobile, mostra o overlay
    if (window.innerWidth <= 768) {
      sidebarOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }
  // Função para fechar o menu
  function closeSidebar() {
    sidebar.classList.remove("active");
    menuToggle.classList.remove("active");
    sidebarOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  // Função para alternar o menu
  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      // Mobile: comportamento de overlay
      if (sidebar.classList.contains("active")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    } else {
      // Desktop: comportamento de ocultar/mostrar
      sidebar.classList.toggle("hidden");
      mainContent.classList.toggle("sidebar-hidden");

      // Salva a preferência no localStorage
      const isHidden = sidebar.classList.contains("hidden");
      localStorage.setItem("sidebarHidden", isHidden);
    }
  }

  // Event listeners
  menuToggle.addEventListener("click", toggleSidebar);
  sidebarClose.addEventListener("click", closeSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);

  // Fecha o menu ao clicar em um link (mobile)
  const sidebarLinks = sidebar.querySelectorAll("nav a");
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });

  // Restaura a preferência do usuário no desktop
  window.addEventListener("load", () => {
    if (window.innerWidth > 768) {
      const sidebarHidden = localStorage.getItem("sidebarHidden") === "true";
      if (sidebarHidden) {
        sidebar.classList.add("hidden");
        mainContent.classList.add("sidebar-hidden");
      }
    }
  });

  // Ajusta o comportamento ao redimensionar a janela
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      // Desktop: remove classes de mobile e restaura preferência
      sidebarOverlay.classList.remove("active");
      document.body.style.overflow = "";

      const sidebarHidden = localStorage.getItem("sidebarHidden") === "true";
      if (sidebarHidden) {
        sidebar.classList.add("hidden");
        mainContent.classList.add("sidebar-hidden");
      } else {
        sidebar.classList.remove("hidden");
        mainContent.classList.remove("sidebar-hidden");
      }
      sidebar.classList.remove("active");
    } else {
      // Mobile: remove classes de desktop
      sidebar.classList.remove("hidden");
      mainContent.classList.remove("sidebar-hidden");

      if (!sidebar.classList.contains("active")) {
        closeSidebar();
      }
    }
  });

  // Previne scroll do body quando o menu está aberto no mobile
  document.addEventListener(
    "touchmove",
    function (e) {
      if (sidebar.classList.contains("active") && window.innerWidth <= 768) {
        if (!sidebar.contains(e.target)) {
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );
}
