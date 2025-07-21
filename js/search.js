async function fetchBooks() {
  try {
    const response = await fetch("data/books.json");
    if (!response.ok) throw new Error("Erro ao carregar os livros");
    return await response.json();
  } catch (error) {
    alert("Não foi possível carregar os dados dos livros.");
    return [];
  }
}

function createBookCard(book) {
  return `
    <div class="book-card">
        <img src="${book.imagem}" alt="${book.titulo}" class="book-cover">
        <div class="book-title">${book.titulo}</div>
        <div class="book-author"><strong>Autor:</strong> ${book.autor}</div>
        <div class="book-genre"><strong>Gênero:</strong> ${book.genero.join(
          ", "
        )}</div>
        <div class="book-corrente"><strong>Corrente:</strong> ${
          book.corrente_literaria
        }</div>
        <div class="book-desc">${book.descricao}</div>
    </div>
    `;
}

function filterBooks(books, query) {
  query = query.trim().toLowerCase();
  if (!query) return [];
  return books.filter((book) => {
    return (
      book.titulo.toLowerCase().includes(query) ||
      book.autor.toLowerCase().includes(query) ||
      book.genero.join(",").toLowerCase().includes(query) ||
      book.corrente_literaria.toLowerCase().includes(query)
    );
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const books = await fetchBooks();
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("searchResults");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = input.value;
    const filtered = filterBooks(books, q);

    resultsDiv.innerHTML =
      filtered.length > 0
        ? filtered.map((book) => createBookCard(book)).join("")
        : `<p>Nenhum livro encontrado para <strong>"${q}"</strong>.</p>`;
  });

  // Opcional: inicia com todos, ou vazio
  resultsDiv.innerHTML = "<p>Digite acima para buscar livros pelo clube!</p>";
});
