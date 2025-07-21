// ===== VARIÁVEIS GLOBAIS =====
let map;
let allBooks = [];
let markers = [];
let markerClusterGroup;
let geocodeCache = new Map();
let useCluster = false;

// ===== CONFIGURAÇÕES =====
const CONFIG = {
  defaultCenter: [20, 0],
  defaultZoom: 2,
  maxZoom: 18,
  clusterDistance: 50,
  geocodeDelay: 300,
};

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🗺️ Inicializando Mapa Literário...");

  showLoading(true);

  try {
    await initializeMap();
    await loadBooks();
    setupEventListeners();
    console.log("✅ Mapa carregado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar mapa:", error);
    showError("Erro ao carregar o mapa. Tente recarregar a página.");
  } finally {
    hideLoading();
  }
});

// ===== INICIALIZAR MAPA =====
async function initializeMap() {
  try {
    // Verificar se Leaflet está disponível
    if (typeof L === "undefined") {
      throw new Error("Leaflet não carregou corretamente");
    }

    // Criar mapa
    map = L.map("map-literario", {
      center: CONFIG.defaultCenter,
      zoom: CONFIG.defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      touchZoom: true,
    });

    // Adicionar camada base
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: CONFIG.maxZoom,
    }).addTo(map);

    // Verificar se MarkerCluster está disponível
    if (typeof L.markerClusterGroup !== "undefined") {
      console.log("✅ MarkerCluster disponível");
      useCluster = true;
      markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: CONFIG.clusterDistance,
        iconCreateFunction: function (cluster) {
          const count = cluster.getChildCount();
          let size = "small";
          if (count > 10) size = "large";
          else if (count > 5) size = "medium";

          return L.divIcon({
            html: `<div class="cluster-marker cluster-${size}">${count}</div>`,
            className: "custom-cluster",
            iconSize: [40, 40],
          });
        },
      });
      map.addLayer(markerClusterGroup);
    } else {
      console.warn(
        "⚠️ MarkerCluster não disponível, usando marcadores simples"
      );
      useCluster = false;
      markers = [];
    }

    console.log("✅ Mapa inicializado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inicializar mapa:", error);
    throw error;
  }
}

// ===== CARREGAR LIVROS =====
async function loadBooks() {
  try {
    const response = await fetch("data/books.json");
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    allBooks = await response.json();
    console.log(`📚 ${allBooks.length} livros carregados`);

    // Filtrar livros com localizações válidas
    const validBooks = allBooks.filter(
      (book) =>
        book.local &&
        book.pais &&
        !book.local.toLowerCase().includes("ficcional") &&
        !book.local.toLowerCase().includes("futuro") &&
        book.local !== "Global" &&
        book.local !== "Universo" &&
        !book.local.includes("(")
    );

    console.log(`🌍 ${validBooks.length} livros com localizações válidas`);

    // Preencher filtros
    populateFilters(allBooks);

    // Processar apenas alguns livros inicialmente para teste
    const testBooks = validBooks.slice(0, 10);
    await processBooksBatch(testBooks);

    // Atualizar estatísticas
    updateStats();
  } catch (error) {
    console.error("❌ Erro ao carregar livros:", error);
    showError("Não foi possível carregar os dados dos livros.");
    throw error;
  }
}

// ===== PROCESSAR LIVROS EM LOTES =====
async function processBooksBatch(books) {
  console.log(`🔄 Processando ${books.length} livros...`);

  for (let i = 0; i < books.length; i++) {
    const book = books[i];

    try {
      await processBook(book);

      // Atualizar progresso
      const progress = ((i + 1) / books.length) * 100;
      updateLoadingProgress(progress);

      // Delay entre processamentos
      if (i < books.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao processar livro ${book.titulo}:`, error);
    }
  }
}

// ===== PROCESSAR LIVRO INDIVIDUAL =====
async function processBook(book) {
  try {
    const coords = await getCoordinates(book.local, book.pais);
    if (coords) {
      addBookMarker(book, coords);
      console.log(
        `📍 Marcador adicionado para: ${book.titulo} em ${book.local}, ${book.pais}`
      );
    } else {
      console.warn(
        `⚠️ Coordenadas não encontradas para: ${book.local}, ${book.pais}`
      );
    }
  } catch (error) {
    console.warn(`❌ Erro ao processar ${book.titulo}:`, error);
  }
}

// ===== OBTER COORDENADAS COM CACHE =====
async function getCoordinates(local, pais) {
  const cacheKey = `${local}, ${pais}`;

  // Verificar cache primeiro
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    // Tentar diferentes variações da busca
    const searchQueries = [`${local}, ${pais}`, local, pais];

    for (const query of searchQueries) {
      const coords = await geocodeLocation(query);
      if (coords) {
        geocodeCache.set(cacheKey, coords);
        return coords;
      }

      // Delay entre tentativas
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    geocodeCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.warn(`❌ Erro na geocodificação de ${cacheKey}:`, error);
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

// ===== GEOCODIFICAR LOCALIZAÇÃO =====
async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "leitores-inoxidaveis/2.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };

      // Validar coordenadas
      if (isNaN(result.lat) || isNaN(result.lng)) {
        throw new Error("Coordenadas inválidas recebidas");
      }

      return result;
    }

    return null;
  } catch (error) {
    console.warn(`❌ Erro na API de geocodificação para "${query}":`, error);
    throw error;
  }
}

// ===== ADICIONAR MARCADOR DO LIVRO =====
function addBookMarker(book, coords) {
  try {
    const marker = L.marker([coords.lat, coords.lng], {
      icon: L.divIcon({
        className: "book-marker",
        html: '<div class="book-marker-icon">📚</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      }),
    });

    // Adicionar dados do livro ao marcador
    marker.bookData = book;

    // Criar popup
    const popupContent = createPopupContent(book);
    marker.bindPopup(popupContent, {
      maxWidth: 300,
      className: "custom-popup",
    });

    // Adicionar ao mapa
    if (useCluster && markerClusterGroup) {
      markerClusterGroup.addLayer(marker);
    } else {
      marker.addTo(map);
    }

    markers.push(marker);
  } catch (error) {
    console.error(`❌ Erro ao adicionar marcador para ${book.titulo}:`, error);
  }
}

// ===== CRIAR CONTEÚDO DO POPUP =====
function createPopupContent(book) {
  const collections = book.colecao
    ? book.colecao
        .map((col) => `<span class="popup-collection-badge">${col}</span>`)
        .join("")
    : "";

  return `
    <div class="popup-content">
      <img src="${book.imagem_capa || "img/default-cover.png"}" 
           alt="Capa de ${book.titulo}" 
           class="popup-cover"
           onerror="this.src='img/default-cover.png'">
      <div class="popup-title">${book.titulo}</div>
      <div class="popup-author">${book.autor}</div>
      <div class="popup-location">📍 ${book.local}, ${book.pais}</div>
      <div class="popup-collections">${collections}</div>
      <button class="popup-more-btn" onclick="openBookModal(${book.id})">
        Ver Detalhes
      </button>
    </div>
  `;
}

// ===== PREENCHER FILTROS =====
function populateFilters(books) {
  try {
    // Gêneros únicos
    const genres = new Set();
    books.forEach((book) => {
      if (book.genero && Array.isArray(book.genero)) {
        book.genero.forEach((g) => genres.add(g));
      }
    });

    const genreSelect = document.getElementById("genreFilter");
    if (genreSelect) {
      Array.from(genres)
        .sort()
        .forEach((genre) => {
          const option = document.createElement("option");
          option.value = genre;
          option.textContent = genre;
          genreSelect.appendChild(option);
        });
    }
  } catch (error) {
    console.error("❌ Erro ao preencher filtros:", error);
  }
}

// ===== CONFIGURAR EVENT LISTENERS =====
function setupEventListeners() {
  try {
    // Busca por localização
    const searchBtn = document.getElementById("searchBtn");
    const locationSearch = document.getElementById("locationSearch");

    if (searchBtn) {
      searchBtn.addEventListener("click", searchLocation);
    }

    if (locationSearch) {
      locationSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") searchLocation();
      });
    }

    // Filtros
    const collectionFilter = document.getElementById("collectionFilter");
    const genreFilter = document.getElementById("genreFilter");
    const resetFilters = document.getElementById("resetFilters");

    if (collectionFilter) {
      collectionFilter.addEventListener("change", applyFilters);
    }

    if (genreFilter) {
      genreFilter.addEventListener("change", applyFilters);
    }

    if (resetFilters) {
      resetFilters.addEventListener("click", resetFiltersHandler);
    }

    // Modal
    const closeBtn = document.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }

    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) closeModal();
    });

    // Eventos do mapa
    if (map) {
      map.on("zoomend moveend", updateStats);
    }
  } catch (error) {
    console.error("❌ Erro ao configurar event listeners:", error);
  }
}

// ===== BUSCAR LOCALIZAÇÃO =====
async function searchLocation() {
  const query = document.getElementById("locationSearch")?.value?.trim();
  if (!query) return;

  try {
    const coords = await geocodeLocation(query);
    if (coords) {
      map.setView([coords.lat, coords.lng], 10);
    } else {
      alert("Localização não encontrada. Tente outro termo.");
    }
  } catch (error) {
    console.error("❌ Erro na busca:", error);
    alert("Erro ao buscar localização.");
  }
}

// ===== APLICAR FILTROS =====
function applyFilters() {
  try {
    const collectionFilter =
      document.getElementById("collectionFilter")?.value || "";
    const genreFilter = document.getElementById("genreFilter")?.value || "";

    markers.forEach((marker) => {
      const book = marker.bookData;
      let show = true;

      // Filtro de coleção
      if (
        collectionFilter &&
        (!book.colecao || !book.colecao.includes(collectionFilter))
      ) {
        show = false;
      }

      // Filtro de gênero
      if (genreFilter && (!book.genero || !book.genero.includes(genreFilter))) {
        show = false;
      }

      // Mostrar/esconder marcador
      if (useCluster && markerClusterGroup) {
        if (show) {
          markerClusterGroup.addLayer(marker);
        } else {
          markerClusterGroup.removeLayer(marker);
        }
      } else {
        if (show) {
          marker.addTo(map);
        } else {
          map.removeLayer(marker);
        }
      }
    });

    updateStats();
  } catch (error) {
    console.error("❌ Erro ao aplicar filtros:", error);
  }
}

// ===== RESETAR FILTROS =====
function resetFiltersHandler() {
  try {
    const collectionFilter = document.getElementById("collectionFilter");
    const genreFilter = document.getElementById("genreFilter");
    const locationSearch = document.getElementById("locationSearch");

    if (collectionFilter) collectionFilter.value = "";
    if (genreFilter) genreFilter.value = "";
    if (locationSearch) locationSearch.value = "";

    // Mostrar todos os marcadores
    markers.forEach((marker) => {
      if (useCluster && markerClusterGroup) {
        markerClusterGroup.addLayer(marker);
      } else {
        marker.addTo(map);
      }
    });

    // Voltar à visualização inicial
    map.setView(CONFIG.defaultCenter, CONFIG.defaultZoom);
    updateStats();
  } catch (error) {
    console.error("❌ Erro ao resetar filtros:", error);
  }
}

// ===== ATUALIZAR ESTATÍSTICAS =====
function updateStats() {
  try {
    const mappedBooks = markers.length;
    let visibleBooks = 0;

    if (useCluster && markerClusterGroup) {
      visibleBooks = markerClusterGroup.getLayers().length;
    } else {
      visibleBooks = markers.filter((marker) => map.hasLayer(marker)).length;
    }

    // Contar países únicos
    const countries = new Set();
    markers.forEach((marker) => {
      if (marker.bookData?.pais) {
        countries.add(marker.bookData.pais);
      }
    });

    const totalBooksEl = document.getElementById("totalBooks");
    const totalCountriesEl = document.getElementById("totalCountries");
    const visibleBooksEl = document.getElementById("visibleBooks");

    if (totalBooksEl) totalBooksEl.textContent = mappedBooks;
    if (totalCountriesEl) totalCountriesEl.textContent = countries.size;
    if (visibleBooksEl) visibleBooksEl.textContent = visibleBooks;
  } catch (error) {
    console.error("❌ Erro ao atualizar estatísticas:", error);
  }
}

// ===== MODAL DO LIVRO =====
function openBookModal(bookId) {
  try {
    const book = allBooks.find((b) => b.id === bookId);
    if (!book) return;

    // Preencher modal
    const elements = {
      modalTitle: document.getElementById("modalTitle"),
      modalCover: document.getElementById("modalCover"),
      modalAuthor: document.getElementById("modalAuthor"),
      modalYear: document.getElementById("modalYear"),
      modalLocation: document.getElementById("modalLocation"),
      modalGenre: document.getElementById("modalGenre"),
      modalMovement: document.getElementById("modalMovement"),
      modalDescription: document.getElementById("modalDescription"),
      modalCollections: document.getElementById("modalCollections"),
      bookModal: document.getElementById("bookModal"),
    };

    if (elements.modalTitle) elements.modalTitle.textContent = book.titulo;
    if (elements.modalCover)
      elements.modalCover.src = book.imagem_capa || "img/default-cover.png";
    if (elements.modalAuthor) elements.modalAuthor.textContent = book.autor;
    if (elements.modalYear)
      elements.modalYear.textContent = book.ano_publicacao;
    if (elements.modalLocation)
      elements.modalLocation.textContent = `${book.local}, ${book.pais}`;
    if (elements.modalGenre)
      elements.modalGenre.textContent = Array.isArray(book.genero)
        ? book.genero.join(", ")
        : book.genero;
    if (elements.modalMovement)
      elements.modalMovement.textContent = book.corrente_literaria;
    if (elements.modalDescription)
      elements.modalDescription.textContent = book.descricao;

    // Coleções
    if (elements.modalCollections) {
      if (book.colecao && book.colecao.length > 0) {
        elements.modalCollections.innerHTML = book.colecao
          .map((col) => `<span class="collection-badge">${col}</span>`)
          .join("");
      } else {
        elements.modalCollections.innerHTML = "";
      }
    }

    // Mostrar modal
    if (elements.bookModal) {
      elements.bookModal.style.display = "block";
      document.body.style.overflow = "hidden";
    }
  } catch (error) {
    console.error("❌ Erro ao abrir modal:", error);
  }
}

function closeModal() {
  try {
    const bookModal = document.getElementById("bookModal");
    if (bookModal) {
      bookModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  } catch (error) {
    console.error("❌ Erro ao fechar modal:", error);
  }
}

// ===== FUNÇÕES DE LOADING =====
function showLoading(show) {
  try {
    const loading = document.getElementById("mapLoading");
    if (loading) {
      loading.style.display = show ? "flex" : "none";
    }
  } catch (error) {
    console.error("❌ Erro ao mostrar loading:", error);
  }
}

function hideLoading() {
  showLoading(false);
}

function updateLoadingProgress(progress) {
  try {
    const loadingText = document.querySelector(".loading-content p");
    if (loadingText) {
      loadingText.textContent = `Carregando localizações literárias... ${Math.round(
        progress
      )}%`;
    }
  } catch (error) {
    console.error("❌ Erro ao atualizar progresso:", error);
  }
}

function showError(message) {
  try {
    const loading = document.getElementById("mapLoading");
    if (loading) {
      loading.innerHTML = `
        <div class="loading-content">
          <p style="color: #ff6b6b;">❌ ${message}</p>
          <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #3d5afe; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Tentar Novamente
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Erro ao mostrar erro:", error);
  }
}

// ===== TORNAR FUNÇÃO GLOBAL =====
window.openBookModal = openBookModal;
