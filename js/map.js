// VARIÁVEIS GLOBAIS
let map;
let allBooks = [];
let processedBooks = [];
let markers = [];
let markerClusterGroup;
let geocodeCache = new Map();
let useCluster = true;
let isProcessing = false;

// CONFIGURAÇÕES
const CONFIG = {
  defaultCenter: [20, 0],
  defaultZoom: 2,
  maxZoom: 18,
  clusterDistance: 50,
  geocodeDelay: 200,
  batchSize: 5,
  maxRetries: 3,
};

// COORDENADAS FIXAS PARA LOCAIS FICCIONAIS
const FICTIONAL_LOCATIONS = {
  "Terra-média": {
    lat: -41.2865,
    lng: 174.7762,
    country: "Nova Zelândia (Ficcional)",
  },
  Hogwarts: { lat: 57.1497, lng: -2.0943, country: "Escócia (Ficcional)" },
  Westeros: {
    lat: 54.526,
    lng: -5.665,
    country: "Irlanda do Norte (Ficcional)",
  },
  Narnia: { lat: 51.752, lng: -1.2577, country: "Inglaterra (Ficcional)" },
  Atlântida: { lat: 37.9755, lng: 23.7348, country: "Grécia (Ficcional)" },
  "El Dorado": { lat: -8.7832, lng: -63.8759, country: "Brasil (Ficcional)" },
  "Shangri-La": { lat: 27.8006, lng: 86.8528, country: "Tibet (Ficcional)" },
  Utopia: { lat: 51.5074, lng: -0.1278, country: "Inglaterra (Ficcional)" },
  Futuro: { lat: 40.7128, lng: -74.006, country: "Nova York (Ficcional)" },
  Espaço: { lat: 28.5383, lng: -80.65, country: "Cabo Canaveral (Ficcional)" },
  Universo: { lat: 0, lng: 0, country: "Cosmos (Ficcional)" },
};

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", async () => {
  // Verificar se estamos na página do mapa
  if (!document.getElementById("map-literario")) {
    console.log("Não é a página do mapa, pulando inicialização...");
    return;
  }

  console.log("🗺️ Inicializando Mapa Literário...");

  showLoading(true);

  try {
    await initializeMap();
    await loadMapBooks();
    await processAllBooks();
    setupEventListeners();
    updateStats();
    console.log("✅ Mapa carregado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar mapa:", error);
    showError("Erro ao carregar o mapa. Tente recarregar a página.");
  } finally {
    hideLoading();
  }
});

// INICIALIZAR MAPA
async function initializeMap() {
  try {
    if (typeof L === "undefined") {
      throw new Error("Leaflet não carregou corretamente");
    }

    const mapElement = document.getElementById("map-literario");
    if (!mapElement) {
      throw new Error("Elemento do mapa não encontrado");
    }

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

    // Camada base
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: CONFIG.maxZoom,
    }).addTo(map);

    // Configurar cluster de marcadores
    if (typeof L.markerClusterGroup !== "undefined") {
      markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: CONFIG.clusterDistance,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function (cluster) {
          const count = cluster.getChildCount();
          let className = "cluster-small";

          if (count > 20) {
            className = "cluster-large";
          } else if (count > 10) {
            className = "cluster-medium";
          }

          return L.divIcon({
            html: `<div class="cluster-marker ${className}"><span>${count}</span></div>`,
            className: "custom-cluster",
            iconSize: [40, 40],
          });
        },
      });
      map.addLayer(markerClusterGroup);
      console.log("✅ Cluster de marcadores configurado");
    } else {
      console.warn("⚠️ MarkerCluster não disponível");
      useCluster = false;
    }

    console.log("✅ Mapa inicializado");
  } catch (error) {
    console.error("❌ Erro ao inicializar mapa:", error);
    throw error;
  }
}

// CARREGAR LIVROS PARA O MAPA (função específica para evitar conflito)
async function loadMapBooks() {
  try {
    console.log("📚 Carregando livros para o mapa...");

    const response = await fetch("data/books.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    allBooks = await response.json();
    console.log(`📚 ${allBooks.length} livros carregados para o mapa`);

    // Preencher filtros
    populateFilters(allBooks);

    return allBooks;
  } catch (error) {
    console.error("❌ Erro ao carregar livros:", error);
    throw error;
  }
}

// PROCESSAR TODOS OS LIVROS
async function processAllBooks() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    console.log(`🔄 Processando ${allBooks.length} livros...`);

    // Filtrar e categorizar livros
    const categorizedBooks = categorizeBooks(allBooks);

    // Processar livros ficcionais primeiro (mais rápido)
    await processFictionalBooks(categorizedBooks.fictional);

    // Processar livros reais em lotes
    await processRealBooksInBatches(categorizedBooks.real);

    console.log(`✅ ${processedBooks.length} livros processados com sucesso`);
  } catch (error) {
    console.error("❌ Erro ao processar livros:", error);
  } finally {
    isProcessing = false;
  }
}

// CATEGORIZAR LIVROS
function categorizeBooks(books) {
  const fictional = [];
  const real = [];

  books.forEach((book) => {
    if (isFictionalLocation(book.local, book.pais)) {
      fictional.push(book);
    } else if (isValidLocation(book.local, book.pais)) {
      real.push(book);
    }
  });

  console.log(
    `📊 Categorizados: ${fictional.length} ficcionais, ${real.length} reais`
  );
  return { fictional, real };
}

// VERIFICAR SE É LOCALIZAÇÃO FICCIONAL
function isFictionalLocation(local, pais) {
  if (!local || !pais) return false;

  const localLower = local.toLowerCase();
  const paisLower = pais.toLowerCase();

  const fictionalKeywords = [
    "ficcional",
    "fictício",
    "imaginário",
    "fantasia",
    "futuro",
    "espaço",
    "universo",
    "galáxia",
    "planeta",
    "dimensão",
    "terra-média",
    "hogwarts",
    "westeros",
    "narnia",
    "atlântida",
  ];

  return (
    fictionalKeywords.some(
      (keyword) => localLower.includes(keyword) || paisLower.includes(keyword)
    ) || FICTIONAL_LOCATIONS.hasOwnProperty(local)
  );
}

// VERIFICAR SE É LOCALIZAÇÃO VÁLIDA
function isValidLocation(local, pais) {
  if (!local || !pais) return false;

  const invalidKeywords = [
    "desconhecido",
    "não informado",
    "global",
    "mundial",
  ];
  const localLower = local.toLowerCase();
  const paisLower = pais.toLowerCase();

  return !invalidKeywords.some(
    (keyword) => localLower.includes(keyword) || paisLower.includes(keyword)
  );
}

// PROCESSAR LIVROS FICCIONAIS
async function processFictionalBooks(books) {
  console.log(`🏰 Processando ${books.length} livros ficcionais...`);

  for (const book of books) {
    try {
      const coords = getFictionalCoordinates(book.local);
      if (coords) {
        addBookMarker(book, coords, true);
        processedBooks.push(book);
      }
    } catch (error) {
      console.warn(
        `⚠️ Erro ao processar livro ficcional ${book.titulo}:`,
        error
      );
    }
  }
}

// OBTER COORDENADAS FICCIONAIS
function getFictionalCoordinates(local) {
  // Verificar locais ficcionais conhecidos
  if (FICTIONAL_LOCATIONS[local]) {
    return FICTIONAL_LOCATIONS[local];
  }

  // Para outros locais ficcionais, usar coordenadas padrão
  const fictionalDefaults = {
    futuro: { lat: 40.7128, lng: -74.006, country: "Nova York (Ficcional)" },
    espaço: {
      lat: 28.5383,
      lng: -80.65,
      country: "Cabo Canaveral (Ficcional)",
    },
    universo: { lat: 0, lng: 0, country: "Cosmos (Ficcional)" },
  };

  const localLower = local.toLowerCase();
  for (const [key, coords] of Object.entries(fictionalDefaults)) {
    if (localLower.includes(key)) {
      return coords;
    }
  }

  // Coordenada padrão para ficcionais não mapeados
  return { lat: 51.5074, lng: -0.1278, country: "Londres (Ficcional)" };
}

// PROCESSAR LIVROS REAIS EM LOTES
async function processRealBooksInBatches(books) {
  console.log(`🌍 Processando ${books.length} livros reais...`);

  for (let i = 0; i < books.length; i += CONFIG.batchSize) {
    const batch = books.slice(i, i + CONFIG.batchSize);

    // Processar lote em paralelo
    const promises = batch.map((book) => processRealBook(book));
    await Promise.allSettled(promises);

    // Atualizar progresso
    const progress = Math.min(
      ((i + CONFIG.batchSize) / books.length) * 100,
      100
    );
    updateLoadingProgress(
      progress,
      `Processando livros reais... ${Math.round(progress)}%`
    );

    // Delay entre lotes
    if (i + CONFIG.batchSize < books.length) {
      await new Promise((resolve) => setTimeout(resolve, CONFIG.geocodeDelay));
    }
  }
}

// PROCESSAR LIVRO REAL
async function processRealBook(book) {
  try {
    const coords = await getCoordinatesWithRetry(book.local, book.pais);
    if (coords) {
      addBookMarker(book, coords, false);
      processedBooks.push(book);
      console.log(`📍 ${book.titulo} → ${book.local}, ${book.pais}`);
    } else {
      console.warn(
        `❌ Coordenadas não encontradas: ${book.local}, ${book.pais}`
      );
    }
  } catch (error) {
    console.warn(`⚠️ Erro ao processar ${book.titulo}:`, error);
  }
}

// OBTER COORDENADAS COM RETRY
async function getCoordinatesWithRetry(
  local,
  pais,
  retries = CONFIG.maxRetries
) {
  const cacheKey = `${local}, ${pais}`;

  // Verificar cache
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const coords = await geocodeLocation(local, pais);
      geocodeCache.set(cacheKey, coords);
      return coords;
    } catch (error) {
      console.warn(
        `Tentativa ${attempt + 1}/${retries} falhou para ${cacheKey}:`,
        error
      );
      if (attempt < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  geocodeCache.set(cacheKey, null);
  return null;
}

// GEOCODIFICAR LOCALIZAÇÃO
async function geocodeLocation(local, pais) {
  const queries = [`${local}, ${pais}`, local, pais];

  for (const query of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "LeitoresInoxidaveis/2.0 (contato@leitoresinoxidaveis.com)",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          country: pais,
        };
      }

      // Pequeno delay entre tentativas
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.warn(`Erro na geocodificação de "${query}":`, error);
      continue;
    }
  }

  return null;
}

// ADICIONAR MARCADOR DO LIVRO
function addBookMarker(book, coords, isFictional = false) {
  try {
    const iconClass = isFictional
      ? "book-marker fictional"
      : "book-marker real";
    const iconEmoji = isFictional ? "🏰" : "📚";

    const marker = L.marker([coords.lat, coords.lng], {
      icon: L.divIcon({
        className: iconClass,
        html: `<div class="marker-content">${iconEmoji}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      }),
    });

    // Adicionar dados do livro
    marker.bookData = {
      ...book,
      coordinates: coords,
      isFictional: isFictional,
    };

    // Criar popup
    const popupContent = createPopupContent(book, isFictional);
    marker.bindPopup(popupContent, {
      maxWidth: 320,
      className: "custom-popup",
    });

    // Adicionar ao cluster
    if (markerClusterGroup) {
      markerClusterGroup.addLayer(marker);
    } else {
      marker.addTo(map);
    }

    markers.push(marker);
  } catch (error) {
    console.error(`❌ Erro ao adicionar marcador para ${book.titulo}:`, error);
  }
}

// CRIAR CONTEÚDO DO POPUP
function createPopupContent(book, isFictional = false) {
  const collections = book.colecao
    ? book.colecao
        .map((col) => `<span class="popup-collection-badge">${col}</span>`)
        .join("")
    : "";

  const locationLabel = isFictional ? "🏰 Local Ficcional" : "📍 Localização";
  const locationText = isFictional
    ? `${book.local} (Ficcional)`
    : `${book.local}, ${book.pais}`;

  return `
    <div class="popup-content">
      <img src="${book.imagem_capa || "img/default-cover.png"}"
           alt="Capa de ${book.titulo}"
           class="popup-cover"
           onerror="this.src='img/default-cover.png'"
           loading="lazy">
      <div class="popup-title">${book.titulo}</div>
      <div class="popup-author">✍️ ${book.autor}</div>
      <div class="popup-location ${
        isFictional ? "fictional" : ""
      }">${locationLabel}: ${locationText}</div>
      <div class="popup-year">📅 ${book.ano_publicacao}</div>
      <div class="popup-collections">${collections}</div>
      <button class="popup-more-btn" onclick="openBookModal(${book.id})">
        Ver Detalhes Completos
      </button>
    </div>
  `;
}

// BUSCAR CAPA MELHORADA
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
              return imageUrl.replace("http:", "https:");
            }
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.warn(`Erro na busca de capa para ${titulo}:`, error);
      continue;
    }
  }

  return null;
}

// PREENCHER FILTROS
function populateFilters(books) {
  try {
    const collections = new Set();
    const genres = new Set();
    const countries = new Set();

    books.forEach((book) => {
      // Coleções
      if (book.colecao && Array.isArray(book.colecao)) {
        book.colecao.forEach((col) => collections.add(col));
      }

      // Gêneros
      if (book.genero && Array.isArray(book.genero)) {
        book.genero.forEach((g) => genres.add(g));
      }

      // Países
      if (book.pais) {
        countries.add(book.pais);
      }
    });

    // Preencher select de gêneros
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

    // Preencher select de países
    const countrySelect = document.getElementById("countryFilter");
    if (countrySelect) {
      Array.from(countries)
        .sort()
        .forEach((country) => {
          const option = document.createElement("option");
          option.value = country;
          option.textContent = country;
          countrySelect.appendChild(option);
        });
    }

    console.log("✅ Filtros preenchidos");
  } catch (error) {
    console.error("❌ Erro ao preencher filtros:", error);
  }
}

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
  try {
    // Busca
    const searchBtn = document.getElementById("searchBtn");
    const locationSearch = document.getElementById("locationSearch");

    if (searchBtn) searchBtn.addEventListener("click", searchLocation);
    if (locationSearch) {
      locationSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") searchLocation();
      });
    }

    // Filtros
    const filters = ["collectionFilter", "genreFilter", "countryFilter"];
    filters.forEach((filterId) => {
      const filter = document.getElementById(filterId);
      if (filter) filter.addEventListener("change", applyFilters);
    });

    const resetFilters = document.getElementById("resetFilters");
    if (resetFilters)
      resetFilters.addEventListener("click", resetFiltersHandler);

    // Modal
    const closeBtn = document.querySelector(".close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) closeModal();
    });

    // Eventos do mapa
    if (map) {
      map.on("zoomend moveend", updateStats);
    }

    console.log("✅ Event listeners configurados");
  } catch (error) {
    console.error("❌ Erro ao configurar event listeners:", error);
  }
}

// BUSCAR LOCALIZAÇÃO
async function searchLocation() {
  const query = document.getElementById("locationSearch")?.value?.trim();
  if (!query) return;

  try {
    showLoading(true, "Buscando localização...");
    const coords = await geocodeLocation(query, "");

    if (coords) {
      map.setView([coords.lat, coords.lng], 10);
    } else {
      alert("Localização não encontrada. Tente outro termo.");
    }
  } catch (error) {
    console.error("❌ Erro na busca:", error);
    alert("Erro ao buscar localização.");
  } finally {
    hideLoading();
  }
}

// APLICAR FILTROS
function applyFilters() {
  try {
    const filters = {
      collection: document.getElementById("collectionFilter")?.value || "",
      genre: document.getElementById("genreFilter")?.value || "",
      country: document.getElementById("countryFilter")?.value || "",
    };

    let visibleMarkers = 0;

    markers.forEach((marker) => {
      const book = marker.bookData;
      let show = true;

      // Filtro de coleção
      if (
        filters.collection &&
        (!book.colecao || !book.colecao.includes(filters.collection))
      ) {
        show = false;
      }

      // Filtro de gênero
      if (
        filters.genre &&
        (!book.genero || !book.genero.includes(filters.genre))
      ) {
        show = false;
      }

      // Filtro de país
      if (filters.country && book.pais !== filters.country) {
        show = false;
      }

      // Aplicar visibilidade
      if (markerClusterGroup) {
        if (show) {
          if (!markerClusterGroup.hasLayer(marker)) {
            markerClusterGroup.addLayer(marker);
          }
          visibleMarkers++;
        } else {
          markerClusterGroup.removeLayer(marker);
        }
      }
    });

    updateStats();
    console.log(`🔍 Filtros aplicados: ${visibleMarkers} marcadores visíveis`);
  } catch (error) {
    console.error("❌ Erro ao aplicar filtros:", error);
  }
}

// RESETAR FILTROS
function resetFiltersHandler() {
  try {
    const filterIds = [
      "collectionFilter",
      "genreFilter",
      "countryFilter",
      "locationSearch",
    ];

    filterIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.value = "";
    });

    // Mostrar todos os marcadores
    if (markerClusterGroup) {
      markerClusterGroup.clearLayers();
      markers.forEach((marker) => markerClusterGroup.addLayer(marker));
    }

    // Voltar à visualização inicial
    map.setView(CONFIG.defaultCenter, CONFIG.defaultZoom);
    updateStats();
  } catch (error) {
    console.error("❌ Erro ao resetar filtros:", error);
  }
}

// ATUALIZAR ESTATÍSTICAS
function updateStats() {
  try {
    const totalBooks = processedBooks.length;
    let visibleBooks = 0;

    if (markerClusterGroup) {
      visibleBooks = markerClusterGroup.getLayers().length;
    }

    // Contar países únicos dos livros visíveis
    const visibleCountries = new Set();
    if (markerClusterGroup) {
      markerClusterGroup.getLayers().forEach((marker) => {
        if (marker.bookData?.pais) {
          visibleCountries.add(marker.bookData.pais);
        }
      });
    }

    // Atualizar elementos
    const totalBooksEl = document.getElementById("totalBooks");
    const totalCountriesEl = document.getElementById("totalCountries");

    if (totalBooksEl) totalBooksEl.textContent = totalBooks;
    if (totalCountriesEl) totalCountriesEl.textContent = visibleCountries.size;
  } catch (error) {
    console.error("❌ Erro ao atualizar estatísticas:", error);
  }
}

// MODAL DO LIVRO
async function openBookModal(bookId) {
  try {
    const book = allBooks.find((b) => b.id === bookId);
    if (!book) return;

    // Buscar capa se necessário
    if (
      !book.imagem_capa ||
      book.imagem_capa.includes("unsplash.com") ||
      book.imagem_capa === ""
    ) {
      console.log(`🔍 Buscando capa para: ${book.titulo}`);
      const newCover = await fetchBookCover(book.titulo, book.autor);
      if (newCover) {
        book.imagem_capa = newCover;
      }
    }

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
    if (elements.modalCover) {
      elements.modalCover.src = book.imagem_capa || "img/default-cover.png";
      elements.modalCover.alt = `Capa de ${book.titulo}`;
    }
    if (elements.modalAuthor) elements.modalAuthor.textContent = book.autor;
    if (elements.modalYear)
      elements.modalYear.textContent = book.ano_publicacao;

    // Verificar se é ficcional
    const isFictional = isFictionalLocation(book.local, book.pais);
    const locationText = isFictional
      ? `${book.local} (Localização Ficcional)`
      : `${book.local}, ${book.pais}`;

    if (elements.modalLocation)
      elements.modalLocation.textContent = locationText;
    if (elements.modalGenre) {
      elements.modalGenre.textContent = Array.isArray(book.genero)
        ? book.genero.join(", ")
        : book.genero;
    }
    if (elements.modalMovement)
      elements.modalMovement.textContent = book.corrente_literaria;
    if (elements.modalDescription)
      elements.modalDescription.textContent = book.descricao;

    // Coleções
    if (elements.modalCollections && book.colecao && book.colecao.length > 0) {
      elements.modalCollections.innerHTML = book.colecao
        .map((col) => `<span class="collection-badge">${col}</span>`)
        .join("");
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

// FUNÇÕES DE LOADING
function showLoading(show, message = "Carregando localizações literárias...") {
  try {
    const loading = document.getElementById("mapLoading");
    if (loading) {
      if (show) {
        loading.style.display = "flex";
        const loadingText = loading.querySelector("p");
        if (loadingText) loadingText.textContent = message;
      } else {
        loading.style.display = "none";
      }
    }
  } catch (error) {
    console.error("❌ Erro ao mostrar loading:", error);
  }
}

function hideLoading() {
  showLoading(false);
}

function updateLoadingProgress(progress, message) {
  try {
    const loadingText = document.querySelector(".loading-content p");
    if (loadingText) {
      loadingText.textContent = message;
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
          <button onclick="location.reload()" 
                  style="margin-top: 16px; padding: 12px 24px; background: #3d5afe; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em;">
            🔄 Tentar Novamente
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Erro ao mostrar erro:", error);
  }
}

// Tornar função global
window.openBookModal = openBookModal;
