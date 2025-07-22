// VARIÁVEIS GLOBAIS
let allBooks = [];
let displayedBooks = [];
let currentSearchSource = "local";
let currentQuery = "";
let currentPage = 0;
const BOOKS_PER_PAGE = 15;
const LOAD_MORE_COUNT = 10;

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", async () => {
  await loadLocalBooks();
  showDefaultBooks();
  setupEventListeners();
});

// CARREGAR LIVROS LOCAIS
async function loadLocalBooks() {
  try {
    const response = await fetch("data/books.json");
    if (!response.ok) throw new Error("Erro ao carregar os livros");
    allBooks = await response.json();
    console.log(`${allBooks.length} livros carregados da biblioteca local`);
  } catch (error) {
    console.error("Erro ao carregar livros:", error);
    showError("Não foi possível carregar os dados dos livros.");
  }
}

// FUNÇÃO PARA BUSCAR CAPA DE LIVRO
async function fetchBookCover(titulo, autor) {
  const searchVariations = [
    `intitle:"${titulo}" inauthor:"${autor}"`,
    `intitle:"${titulo.toLowerCase()}" inauthor:"${autor.toLowerCase()}"`,
    `intitle:"${titulo}"`,
    `${titulo} ${autor}`,
    titulo.split(" ").slice(0, 3).join(" "),
  ];

  for (const query of searchVariations) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=5`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          if (item.volumeInfo && item.volumeInfo.imageLinks) {
            const links = item.volumeInfo.imageLinks;
            const imageUrl =
              links.extraLarge ||
              links.large ||
              links.medium ||
              links.thumbnail ||
              links.smallThumbnail;

            if (imageUrl) {
              console.log(`✅ Capa encontrada para: ${titulo}`);
              return imageUrl.replace("http:", "https:");
            }
          }
        }
      }

      // Delay entre tentativas
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.warn(`Erro na busca de capa para ${titulo}:`, error);
      continue;
    }
  }

  console.warn(`❌ Capa não encontrada para: ${titulo}`);
  return null;
}

// FUNÇÃO PARA VERIFICAR SE PRECISA BUSCAR CAPA
function needsCoverUpdate(book) {
  return (
    !book.imagem_capa ||
    book.imagem_capa === "" ||
    book.imagem_capa.includes("unsplash.com") ||
    book.imagem_capa.includes("placeholder")
  );
}

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const modal = document.getElementById("bookModal");
  const closeBtn = document.querySelector(".close-btn");
  const radioButtons = document.querySelectorAll('input[name="searchSource"]');

  form.addEventListener("submit", handleSearch);
  loadMoreBtn.addEventListener("click", loadMoreBooks);
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  radioButtons.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      currentSearchSource = e.target.value;
      if (currentQuery) {
        performSearch(currentQuery);
      }
    });
  });

  // Busca em tempo real
  input.addEventListener(
    "input",
    debounce((e) => {
      if (e.target.value.trim().length > 2) {
        handleSearch(e);
      } else if (e.target.value.trim().length === 0) {
        showDefaultBooks();
      }
    }, 500)
  );
}

// MOSTRAR LIVROS PADRÃO
async function showDefaultBooks() {
  displayedBooks = allBooks.slice(0, BOOKS_PER_PAGE);
  await renderBooksWithCovers(displayedBooks);
  updateResultsInfo(allBooks.length, "Biblioteca completa");
  updateLoadMoreButton();
}

// MANIPULAR BUSCA
function handleSearch(event) {
  event.preventDefault();
  const query = document.getElementById("searchInput").value.trim();

  if (!query) {
    showDefaultBooks();
    return;
  }

  currentQuery = query;
  currentPage = 0;
  performSearch(query);
}

// REALIZAR BUSCA
async function performSearch(query) {
  showLoading();

  try {
    let results = [];

    if (currentSearchSource === "local") {
      results = searchLocalBooks(query);
      updateResultsInfo(results.length, `"${query}" na nossa biblioteca`);
    } else {
      results = await searchOnlineBooks(query);
      updateResultsInfo(results.length, `"${query}" online`);
    }

    displayedBooks = results.slice(0, BOOKS_PER_PAGE);
    await renderBooksWithCovers(displayedBooks);
    updateLoadMoreButton(results);
  } catch (error) {
    console.error("Erro na busca:", error);
    showError("Erro ao realizar a busca. Tente novamente.");
  }
}

// BUSCAR LIVROS LOCAIS
function searchLocalBooks(query) {
  const searchTerm = query.toLowerCase();

  return allBooks.filter((book) => {
    return (
      book.titulo.toLowerCase().includes(searchTerm) ||
      book.autor.toLowerCase().includes(searchTerm) ||
      book.genero.some((g) => g.toLowerCase().includes(searchTerm)) ||
      book.corrente_literaria.toLowerCase().includes(searchTerm) ||
      book.descricao.toLowerCase().includes(searchTerm) ||
      book.pais.toLowerCase().includes(searchTerm)
    );
  });
}

// BUSCAR LIVROS ONLINE
async function searchOnlineBooks(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=20&langRestrict=pt`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) return [];

    return data.items.map((item) => {
      const volumeInfo = item.volumeInfo;
      return {
        id: item.id,
        titulo: volumeInfo.title || "Título não disponível",
        autor: volumeInfo.authors
          ? volumeInfo.authors.join(", ")
          : "Autor desconhecido",
        ano_publicacao: volumeInfo.publishedDate
          ? new Date(volumeInfo.publishedDate).getFullYear()
          : "Ano desconhecido",
        pais: "Não informado",
        local: "Não informado",
        colecao: ["Biblioteca Pública"],
        imagem_capa: volumeInfo.imageLinks
          ? volumeInfo.imageLinks.large ||
            volumeInfo.imageLinks.medium ||
            volumeInfo.imageLinks.thumbnail ||
            volumeInfo.imageLinks.smallThumbnail
          : "img/default-cover.png",
        genero: volumeInfo.categories || ["Não categorizado"],
        corrente_literaria: "Não informado",
        descricao: volumeInfo.description || "Descrição não disponível.",
      };
    });
  } catch (error) {
    console.error("Erro ao buscar livros online:", error);
    throw error;
  }
}

// CARREGAR MAIS LIVROS
async function loadMoreBooks() {
  const allResults = currentQuery
    ? currentSearchSource === "local"
      ? searchLocalBooks(currentQuery)
      : []
    : allBooks;

  const startIndex = displayedBooks.length;
  const endIndex = startIndex + LOAD_MORE_COUNT;
  const newBooks = allResults.slice(startIndex, endIndex);

  displayedBooks = [...displayedBooks, ...newBooks];
  await renderBooksWithCovers(displayedBooks);
  updateLoadMoreButton(allResults);
}

// RENDERIZAR LIVROS COM CAPAS
async function renderBooksWithCovers(books) {
  const resultsDiv = document.getElementById("searchResults");

  if (books.length === 0) {
    resultsDiv.innerHTML = `
      <div class="no-results">
        <h3>📚 Nenhum livro encontrado</h3>
        <p>Tente buscar por título, autor, gênero ou corrente literária.</p>
      </div>
    `;
    return;
  }

  // Primeiro renderiza os livros
  resultsDiv.innerHTML = `<div class="bookshelf">${books
    .map((book) => createBookSpine(book))
    .join("")}</div>`;

  // Adicionar event listeners
  document.querySelectorAll(".book-spine").forEach((spine) => {
    spine.addEventListener("click", async () => {
      const bookId = spine.dataset.bookId;
      const book = books.find((b) => b.id == bookId);
      if (book) {
        // Buscar capa se necessário antes de abrir o modal
        if (needsCoverUpdate(book)) {
          console.log(`🔍 Buscando capa para: ${book.titulo}`);
          const newCover = await fetchBookCover(book.titulo, book.autor);
          if (newCover) {
            book.imagem_capa = newCover;
          }
        }
        openBookModal(book);
      }
    });
  });

  // Buscar capas em background para livros que precisam
  const booksNeedingCovers = books.filter(needsCoverUpdate);
  if (booksNeedingCovers.length > 0) {
    console.log(
      `🔍 Buscando capas para ${booksNeedingCovers.length} livros em background...`
    );

    // Buscar capas sequencialmente para não sobrecarregar a API
    for (let i = 0; i < booksNeedingCovers.length; i++) {
      const book = booksNeedingCovers[i];
      try {
        const newCover = await fetchBookCover(book.titulo, book.autor);
        if (newCover) {
          book.imagem_capa = newCover;
          console.log(`✅ Capa atualizada para: ${book.titulo}`);
        }

        // Delay entre buscas
        if (i < booksNeedingCovers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Erro ao buscar capa para ${book.titulo}:`, error);
      }
    }
  }
}

// CRIAR LOMBADA DO LIVRO
function createBookSpine(book) {
  // Melhor tratamento do título para legibilidade
  let title = book.titulo;
  if (title.length > 30) {
    // Tenta quebrar em uma palavra adequada
    const words = title.split(" ");
    let shortTitle = "";
    for (const word of words) {
      if ((shortTitle + word).length <= 30) {
        shortTitle += (shortTitle ? " " : "") + word;
      } else {
        break;
      }
    }
    title = shortTitle + (shortTitle.length < book.titulo.length ? "..." : "");
  }

  // Melhor tratamento do autor
  let author = book.autor;
  if (author.length > 25) {
    // Pega apenas o primeiro e último nome se for muito longo
    const names = author.split(" ");
    if (names.length > 2) {
      author = `${names[0]} ${names[names.length - 1]}`;
    } else {
      author = author.substring(0, 22) + "...";
    }
  }

  return `
    <div class="book-spine" data-book-id="${book.id}">
      <div class="book-spine-decoration"></div>
      <div class="book-spine-content">
        <div class="book-spine-title">${title}</div>
        <div class="book-spine-author">${author}</div>
      </div>
    </div>
  `;
}

// ABRIR MODAL DO LIVRO
function openBookModal(book) {
  const modal = document.getElementById("bookModal");

  // Preencher dados do modal
  document.getElementById("modalBookCover").src =
    book.imagem_capa || "img/default-cover.png";
  document.getElementById("modalBookTitle").textContent = book.titulo;
  document.getElementById("modalBookAuthor").textContent = book.autor;
  document.getElementById("modalBookYear").textContent = book.ano_publicacao;
  document.getElementById("modalBookCountry").textContent = book.pais;
  document.getElementById("modalBookGenre").textContent = Array.isArray(
    book.genero
  )
    ? book.genero.join(", ")
    : book.genero;
  document.getElementById("modalBookMovement").textContent =
    book.corrente_literaria;
  document.getElementById("modalBookDescription").textContent = book.descricao;

  // Coleções
  const collectionsDiv = document.getElementById("modalBookCollections");
  if (book.colecao && book.colecao.length > 0) {
    collectionsDiv.innerHTML = book.colecao
      .map((col) => `<span class="collection-badge">${col}</span>`)
      .join("");
  } else {
    collectionsDiv.innerHTML = "";
  }

  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

// FECHAR MODAL
function closeModal() {
  const modal = document.getElementById("bookModal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

// ATUALIZAR INFO DOS RESULTADOS
function updateResultsInfo(count, searchInfo) {
  const resultsCount = document.getElementById("resultsCount");
  resultsCount.textContent = `${count} livro${
    count !== 1 ? "s" : ""
  } encontrado${count !== 1 ? "s" : ""} para ${searchInfo}`;
}

// ATUALIZAR BOTÃO "VER MAIS"
function updateLoadMoreButton(allResults = null) {
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const totalResults = allResults ? allResults.length : allBooks.length;

  if (displayedBooks.length < totalResults) {
    loadMoreBtn.style.display = "block";
    loadMoreBtn.textContent = `Ver mais (${Math.min(
      LOAD_MORE_COUNT,
      totalResults - displayedBooks.length
    )} livros)`;
  } else {
    loadMoreBtn.style.display = "none";
  }
}

// MOSTRAR LOADING
function showLoading() {
  document.getElementById("searchResults").innerHTML = `
    <div class="loading">
      <h3>🔍 Buscando livros...</h3>
      <p>Aguarde um momento</p>
    </div>
  `;
}

// MOSTRAR ERRO
function showError(message) {
  document.getElementById("searchResults").innerHTML = `
    <div class="no-results">
      <h3>❌ Erro</h3>
      <p>${message}</p>
    </div>
  `;
}

// FUNÇÃO DEBOUNCE
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
