// ===== VARIÁVEIS GLOBAIS =====
let allBooks = [];
let currentCentury = null;
let backgroundEnabled = true;
let musicEnabled = true;
let effectsEnabled = true;
let currentAudio = null;

// ===== DADOS HISTÓRICOS POR SÉCULO =====
const historicalData = {
  "Século XVI": {
    background:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop",
    title: "Renascimento e Grandes Navegações",
    description:
      "Era de descobrimentos, arte renascentista e expansão marítima. Shakespeare revoluciona o teatro enquanto exploradores descobrem novos mundos.",
    music: "https://www.soundjay.com/misc/sounds/classical-music-1.mp3", // Placeholder
  },
  "Século XVII": {
    background:
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=1080&fit=crop",
    title: "Barroco e Revolução Científica",
    description:
      "Período do Barroco, com Cervantes criando Dom Quixote. Galileu revoluciona a astronomia e a ciência moderna nasce.",
    music: "https://www.soundjay.com/misc/sounds/classical-music-2.mp3",
  },
  "Século XVIII": {
    background:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop",
    title: "Iluminismo e Revoluções",
    description:
      "Era das Luzes, Revolução Francesa e Americana. A razão e a ciência transformam a sociedade e a literatura.",
    music: "https://www.soundjay.com/misc/sounds/classical-music-3.mp3",
  },
  "Século XIX": {
    background:
      "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1920&h=1080&fit=crop",
    title: "Romantismo e Revolução Industrial",
    description:
      "Era do Romantismo, máquinas a vapor e grandes transformações sociais. Literatura explora emoções e a natureza humana.",
    music: "https://www.soundjay.com/misc/sounds/classical-music-4.mp3",
  },
  "Século XX": {
    background:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop",
    title: "Modernismo e Grandes Guerras",
    description:
      "Século das duas grandes guerras, modernismo literário e transformações tecnológicas que mudaram o mundo para sempre.",
    music: "https://www.soundjay.com/misc/sounds/jazz-music-1.mp3",
  },
  "Século XXI": {
    background:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop",
    title: "Era Digital e Globalização",
    description:
      "Internet, globalização e literatura contemporânea. Novos formatos narrativos e democratização do acesso à cultura.",
    music: "https://www.soundjay.com/misc/sounds/electronic-music-1.mp3",
  },
};

// Carregar e organizar livros
async function carregarLivros() {
  try {
    const response = await fetch("data/books.json");
    if (!response.ok) throw new Error("Erro ao carregar livros");

    const livros = await response.json();
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
    return [];
  }
}

// Determinar século do livro
function determinarSeculo(ano) {
  if (ano < 1600) return "Século XVI";
  if (ano < 1700) return "Século XVII";
  if (ano < 1800) return "Século XVIII";
  if (ano < 1900) return "Século XIX";
  if (ano < 2000) return "Século XX";
  return "Século XXI";
}

// Criar sumário de séculos
function criarSumarioSeculos() {
  const seculos = {};

  allBooks.forEach((book) => {
    const seculo = determinarSeculo(book.ano_publicacao);
    if (!seculos[seculo]) {
      seculos[seculo] = [];
    }
    seculos[seculo].push(book);
  });

  const centuryList = document.getElementById("centuryList");
  centuryList.innerHTML = "";

  Object.keys(seculos).forEach((seculo) => {
    const centuryItem = document.createElement("div");
    centuryItem.className = "century-item";
    centuryItem.innerHTML = `
      <div class="century-name">${seculo}</div>
      <div class="century-count">${seculos[seculo].length} livros</div>
    `;

    centuryItem.addEventListener("click", () => {
      navegarParaSeculo(seculo);
    });

    centuryList.appendChild(centuryItem);
  });
}

// Navegar para século específico
function navegarParaSeculo(seculo) {
  // Atualizar visual do sumário
  document.querySelectorAll(".century-item").forEach((item) => {
    item.classList.remove("active");
  });
  event.target.closest(".century-item").classList.add("active");

  // Encontrar primeiro livro do século
  const primeiroLivro = allBooks.find(
    (book) => determinarSeculo(book.ano_publicacao) === seculo
  );

  if (primeiroLivro) {
    const elemento = document.querySelector(
      `[data-book-id="${primeiroLivro.id}"]`
    );
    if (elemento) {
      elemento.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Atualizar contexto histórico
      atualizarContextoHistorico(seculo);
    }
  }
}

// Atualizar background e contexto histórico
function atualizarContextoHistorico(seculo) {
  if (!backgroundEnabled) return;

  currentCentury = seculo;
  const data = historicalData[seculo];

  if (data) {
    // Atualizar background
    const bgElement = document.getElementById("historicalBackground");
    bgElement.style.backgroundImage = `url('${data.background}')`;

    // Atualizar conteúdo
    document.getElementById("historicalTitle").textContent = data.title;
    document.getElementById("historicalDescription").textContent =
      data.description;

    // Mostrar conteúdo com animação
    const content = document.querySelector(".historical-content");
    content.classList.add("visible");

    // Atualizar música
    if (musicEnabled) {
      atualizarMusica(seculo);
    }
  }
}

// Sistema de música por época
function atualizarMusica(seculo) {
  const data = historicalData[seculo];
  if (!data || !data.music) return;

  const audioPlayer = document.getElementById("audioPlayer");
  const currentSong = document.getElementById("currentSong");

  // Parar música atual
  if (currentAudio) {
    currentAudio.pause();
  }

  // Simular mudança de música (em produção, usar arquivos reais)
  currentSong.textContent = `Música do ${seculo}`;

  // Simular progresso da música
  let progress = 0;
  const progressBar = document.getElementById("musicProgressBar");

  const progressInterval = setInterval(() => {
    progress += 1;
    progressBar.style.width = `${progress}%`;

    if (progress >= 100) {
      progress = 0;
    }
  }, 200);

  // Armazenar referência para limpeza
  currentAudio = {
    pause: () => clearInterval(progressInterval),
    interval: progressInterval,
  };
}

// Detectar livro centralizado na tela
function detectarLivroCentralizado() {
  const eventos = document.querySelectorAll(".timeline-event");
  const centerY = window.innerHeight / 2;
  let livroMaisProximo = null;
  let menorDistancia = Infinity;

  eventos.forEach((evento) => {
    const rect = evento.getBoundingClientRect();
    const eventoCenter = rect.top + rect.height / 2;
    const distancia = Math.abs(eventoCenter - centerY);

    if (
      distancia < menorDistancia &&
      rect.top < centerY &&
      rect.bottom > centerY
    ) {
      menorDistancia = distancia;
      livroMaisProximo = evento;
    }
  });

  if (livroMaisProximo) {
    const bookId =
      livroMaisProximo.querySelector(".event-content").dataset.bookId;
    const livro = allBooks.find((b) => b.id == bookId);

    if (livro) {
      const seculo = determinarSeculo(livro.ano_publicacao);
      if (seculo !== currentCentury) {
        atualizarContextoHistorico(seculo);
      }
    }
  }
}

// Configurar controles de imersão
function configurarControlesImersao() {
  document.getElementById("toggleBackground").addEventListener("click", (e) => {
    backgroundEnabled = !backgroundEnabled;
    e.target.classList.toggle("active", backgroundEnabled);

    const bg = document.getElementById("historicalBackground");
    bg.style.opacity = backgroundEnabled ? "0.3" : "0";

    const content = document.querySelector(".historical-content");
    content.classList.toggle("visible", backgroundEnabled);
  });

  document.getElementById("toggleMusic").addEventListener("click", (e) => {
    musicEnabled = !musicEnabled;
    e.target.classList.toggle("active", musicEnabled);

    const player = document.getElementById("musicPlayer");
    player.style.display = musicEnabled ? "block" : "none";

    if (!musicEnabled && currentAudio) {
      currentAudio.pause();
    }
  });

  document.getElementById("toggleEffects").addEventListener("click", (e) => {
    effectsEnabled = !effectsEnabled;
    e.target.classList.toggle("active", effectsEnabled);

    document.querySelectorAll(".timeline-event").forEach((evento) => {
      evento.classList.toggle("effects-enabled", effectsEnabled);
    });
  });
}

// Configurar player de música
function configurarPlayerMusica() {
  document.getElementById("musicToggle").addEventListener("click", () => {
    if (currentAudio) {
      // Toggle play/pause (simulado)
      const btn = document.getElementById("musicToggle");
      btn.textContent = btn.textContent === "🎵" ? "⏸️" : "🎵";
    }
  });

  document.getElementById("musicVolume").addEventListener("click", () => {
    const btn = document.getElementById("musicVolume");
    if (btn.textContent === "🔊") {
      btn.textContent = "🔇";
    } else {
      btn.textContent = "🔊";
    }
  });
}

// Função existente atualizada para incluir efeitos
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
    <div class="timeline-event ${
      effectsEnabled ? "effects-enabled" : ""
    }" style="animation-delay: ${index * 0.1}s">
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

// MOSTRAR MODAL DO LIVRO
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

// FECHAR MODAL
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

// ANIMAÇÃO DE SCROLL
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

// BUSCAR CAPA MELHORADA
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

// ATUALIZAR CAPAS EM BACKGROUND
async function atualizarCapasBackground() {
  const livrosComCapaRuim = allBooks.filter(
    (livro) =>
      !livro.imagem_capa ||
      livro.imagem_capa.includes("unsplash.com") ||
      livro.imagem_capa === ""
  );

  console.log(
    `Buscando capas melhores para ${livrosComCapaRuim.length} livros...`
  );

  for (let i = 0; i < Math.min(livrosComCapaRuim.length, 100); i++) {
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

      console.log(`Capa atualizada para: ${livro.titulo}`);
    }

    // Delay entre buscas
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🎭 Carregando Timeline Imersiva...");

  // Carregar livros
  allBooks = await carregarLivros();
  if (!allBooks.length) return;

  // Criar interface
  criarSumarioSeculos();
  configurarControlesImersao();
  configurarPlayerMusica();

  // Renderizar timeline
  const timelineDiv = document.getElementById("timeline");
  timelineDiv.innerHTML = allBooks
    .map((livro, index) => criarEventoTimeline(livro, index))
    .join("");

  // Configurar eventos existentes...
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

    if (
      e.target.matches(".modal-bg") ||
      e.target.matches(".close-btn") ||
      (e.target.closest(".modal") && e.target.classList.contains("modal"))
    ) {
      fecharModal();
    }
  });

  // Detectar scroll para atualizar contexto
  let scrollTimeout;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(detectarLivroCentralizado, 100);
  });

  // Inicializar com primeiro século
  const primeiroSeculo = determinarSeculo(allBooks[0].ano_publicacao);
  atualizarContextoHistorico(primeiroSeculo);

  // Outras inicializações existentes...
  initBackToTop();
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModal();
  });
  animarEventosScroll();

  console.log("✅ Timeline Imersiva carregada com sucesso!");
});

// Função para mostrar/ocultar o botão baseado no scroll
function toggleBackToTopButton() {
  const backToTopBtn = document.getElementById("backToTop");
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;

  // Mostra o botão após rolar mais de uma tela
  if (scrollTop > windowHeight * 0.5) {
    backToTopBtn.classList.add("visible");
  } else {
    backToTopBtn.classList.remove("visible");
  }

  // Atualizar indicador de progresso (opcional)
  updateScrollProgress();
}

// Função para atualizar o progresso do scroll (opcional)
function updateScrollProgress() {
  const backToTopBtn = document.getElementById("backToTop");
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const documentHeight =
    document.documentElement.scrollHeight - window.innerHeight;
  const progress = (scrollTop / documentHeight) * 360;

  if (progress > 0) {
    backToTopBtn.style.setProperty("--progress", `${progress}deg`);
    backToTopBtn.classList.add("with-progress");
  } else {
    backToTopBtn.classList.remove("with-progress");
  }
}

// Função para scroll suave ao topo
function scrollToTop() {
  const startPosition = window.pageYOffset;
  const startTime = performance.now();
  const duration = 800; // 800ms para a animação

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  function animateScroll(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const ease = easeInOutCubic(progress);

    window.scrollTo(0, startPosition * (1 - ease));

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}

// Função para inicializar o botão voltar ao topo
function initBackToTop() {
  const backToTopBtn = document.getElementById("backToTop");

  if (!backToTopBtn) return;

  // Event listener para o clique
  backToTopBtn.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToTop();
  });

  // Event listener para o scroll
  let scrollTimeout;
  window.addEventListener("scroll", () => {
    // Debounce para melhor performance
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(toggleBackToTopButton, 10);
  });

  // Verificação inicial
  toggleBackToTopButton();
}
