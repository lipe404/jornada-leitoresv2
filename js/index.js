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

// Mostrar últimos livros com capas otimizadas
async function showLatestBooksWithCovers(books) {
  // Pega os 5 últimos livros adicionados
  const latest = books.slice(-5).reverse();

  // Primeiro, mostra os livros com as imagens que já existem
  displayBooks(latest);

  // Depois, busca e atualiza apenas as capas que precisam ser melhoradas
  const booksNeedingCovers = latest.filter(needsCoverUpdate);

  if (booksNeedingCovers.length > 0) {
    console.log(
      `Buscando capas para ${booksNeedingCovers.length} dos últimos livros...`
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
      <div class="book-cover-container">
        <img 
          src="${book.imagem_capa || "img/default-cover.png"}" 
          alt="Capa de ${book.titulo}"
          loading="lazy"
          onerror="this.onerror=null; this.src='img/default-cover.png';"
          class="book-cover"
        >
        ${needsCoverUpdate(book) ? '<div class="loading-overlay">🔍</div>' : ""}
      </div>
      <h4>${book.titulo}</h4>
      <span>${book.autor}</span>
      <p>${book.descricao.substring(0, 100)}...</p>
    </div>
  `
    )
    .join("");
}

// Função para atualizar apenas a capa de um livro específico
function updateBookCover(bookId, newCoverUrl) {
  const bookCard = document.querySelector(`[data-book-id="${bookId}"]`);
  if (bookCard) {
    const img = bookCard.querySelector(".book-cover");
    const loadingOverlay = bookCard.querySelector(".loading-overlay");

    if (img) {
      img.src = newCoverUrl;
    }
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }
}

// Inicialização quando a página carrega
document.addEventListener("DOMContentLoaded", loadBooks);
