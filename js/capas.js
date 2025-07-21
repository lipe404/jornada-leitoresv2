async function fetchBooks() {
  const response = await fetch("data/books.json");
  const books = await response.json();
  return books;
}

// Busca capa pelo título e autor na Google Books API
async function fetchBookCover(titulo, autor) {
  const query = encodeURIComponent(`intitle:${titulo} inauthor:${autor}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.items && data.items[0].volumeInfo.imageLinks) {
      // Pega a melhor imagem disponível (preferindo a maior delas)
      const links = data.items[0].volumeInfo.imageLinks;
      return (
        links.extraLarge ||
        links.large ||
        links.thumbnail ||
        links.smallThumbnail
      );
    }
  } catch (e) {
    console.warn("Erro ao buscar capa:", titulo, autor, e);
  }
  return null;
}

async function enrichBooksWithCovers(books) {
  // Processo só livros sem a imagem da capa
  const promises = books.map(async (book) => {
    if (!book.imagem_capa || book.imagem_capa === "") {
      const capa = await fetchBookCover(book.titulo, book.autor);
      if (capa) book.imagem_capa = capa;
    }
    return book;
  });
  return Promise.all(promises);
}

// Função de inicialização, exemplo de uso:
async function mostrarLivrosComCapas() {
  let livros = await fetchBooks();
  livros = await enrichBooksWithCovers(livros);
  // Exemplo: exibe em cards em um div#lista-livros
  const container = document.getElementById("lista-livros");
  container.innerHTML = livros
    .map(
      (livro) => `
    <div class="livro-card">
      <img src="${livro.imagem_capa || "default-cover.png"}" alt="Capa ${
        livro.titulo
      }" />
      <h3>${livro.titulo}</h3>
      <p>${livro.autor}</p>
    </div>
  `
    )
    .join("");
}

// Inicialize sua função principal na página desejada
// document.addEventListener('DOMContentLoaded', mostrarLivrosComCapas);
