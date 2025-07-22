// ===== CONFIGURAÇÕES =====
const CONFIG = {
  TOTAL_QUESTIONS: 10,
  BATCH_SIZE: 5,
  TRANSLATION_DELAY: 100,
  API_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// APIs e Serviços
const APIS = {
  TRIVIA: "https://opentdb.com/api.php",
  TRANSLATION: "https://api.mymemory.translated.net/get",
  BACKUP_TRANSLATION: "https://translate.googleapis.com/translate_a/single",
};

// ===== SISTEMA DE TRADUÇÃO APRIMORADO =====
class TranslationService {
  constructor() {
    this.cache = new Map();
    this.translationMap = {
      // Categorias
      "Entertainment: Books": "Entretenimento: Livros",
      "Science & Nature": "Ciência & Natureza",
      "General Knowledge": "Conhecimentos Gerais",
      Mythology: "Mitologia",
      History: "História",
      Geography: "Geografia",
      Politics: "Política",
      Art: "Arte",
      Celebrities: "Celebridades",
      Animals: "Animais",
      Comics: "Quadrinhos",
      Sports: "Esportes",
      Film: "Cinema",
      Music: "Música",
      Television: "Televisão",
      "Video Games": "Videogames",
      "Board Games": "Jogos de Tabuleiro",

      // Respostas comuns
      True: "Verdadeiro",
      False: "Falso",
      correct: "correta",
      incorrect: "incorreta",
      true: "verdadeiro",
      false: "falso",
      yes: "sim",
      no: "não",

      // Palavras comuns em perguntas
      What: "Qual",
      Who: "Quem",
      When: "Quando",
      Where: "Onde",
      Why: "Por que",
      How: "Como",
      Which: "Qual",
      author: "autor",
      book: "livro",
      novel: "romance",
      character: "personagem",
      story: "história",
      published: "publicado",
      written: "escrito",
      wrote: "escreveu",
      created: "criou",
      year: "ano",
      century: "século",
    };
  }

  // Tradução com cache e múltiplas estratégias
  async translate(text) {
    if (!text || typeof text !== "string") return text;

    // Verificar cache primeiro
    if (this.cache.has(text)) {
      return this.cache.get(text);
    }

    // Verificar mapa manual
    const manualTranslation = this.translationMap[text];
    if (manualTranslation) {
      this.cache.set(text, manualTranslation);
      return manualTranslation;
    }

    // Tradução inteligente por partes
    const intelligentTranslation = this.intelligentTranslate(text);
    if (intelligentTranslation !== text) {
      this.cache.set(text, intelligentTranslation);
      return intelligentTranslation;
    }

    // Tentar APIs de tradução
    try {
      const apiTranslation = await this.translateViaAPI(text);
      if (apiTranslation && apiTranslation !== text) {
        this.cache.set(text, apiTranslation);
        return apiTranslation;
      }
    } catch (error) {
      console.warn("Erro na tradução via API:", error);
    }

    // Retornar original se nada funcionou
    this.cache.set(text, text);
    return text;
  }

  // Tradução inteligente baseada em padrões
  intelligentTranslate(text) {
    let translated = text;

    // Substituições de palavras conhecidas
    Object.entries(this.translationMap).forEach(([en, pt]) => {
      const regex = new RegExp(`\b${en}\b`, "gi");
      translated = translated.replace(regex, pt);
    });

    // Padrões específicos para perguntas de quiz
    const patterns = [
      {
        pattern: /Who (?:is|was) the author of "([^"]+)"\?/gi,
        replacement: 'Quem é o autor de "$1"?',
      },
      {
        pattern:
          /What (?:is|was) the (?:title of the )?book (?:written )?by ([^?]+)\?/gi,
        replacement: "Qual é o livro escrito por $1?",
      },
      {
        pattern: /In which year was "([^"]+)" published\?/gi,
        replacement: 'Em que ano foi publicado "$1"?',
      },
      {
        pattern:
          /Which (?:of these )?(?:books?|novels?) was written by ([^?]+)\?/gi,
        replacement: "Qual destes livros foi escrito por $1?",
      },
    ];

    patterns.forEach(({ pattern, replacement }) => {
      translated = translated.replace(pattern, replacement);
    });

    return translated;
  }

  // Tradução via API com fallback
  async translateViaAPI(text) {
    const attempts = [
      () => this.translateMyMemory(text),
      () => this.translateSimple(text),
    ];

    for (const attempt of attempts) {
      try {
        const result = await Promise.race([
          attempt(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 3000)
          ),
        ]);

        if (result && result !== text) {
          return result;
        }
      } catch (error) {
        console.warn("Tentativa de tradução falhou:", error);
        continue;
      }
    }

    return text;
  }

  // MyMemory API
  async translateMyMemory(text) {
    const url = `${APIS.TRANSLATION}?q=${encodeURIComponent(
      text
    )}&langpair=en|pt-br`;
    const response = await fetch(url);
    const data = await response.json();

    if (data?.responseData?.translatedText) {
      return data.responseData.translatedText;
    }

    throw new Error("MyMemory translation failed");
  }

  // Tradução simples baseada em padrões
  translateSimple(text) {
    // Implementação de tradução básica para casos simples
    const simplePatterns = {
      the: "o/a",
      and: "e",
      or: "ou",
      of: "de",
      in: "em",
      is: "é",
      was: "foi",
      are: "são",
      were: "foram",
    };

    let result = text;
    Object.entries(simplePatterns).forEach(([en, pt]) => {
      const regex = new RegExp(`\b${en}\b`, "gi");
      result = result.replace(regex, pt);
    });

    return result;
  }

  // Traduzir array de textos em lote
  async translateBatch(texts) {
    const results = [];

    for (let i = 0; i < texts.length; i += CONFIG.BATCH_SIZE) {
      const batch = texts.slice(i, i + CONFIG.BATCH_SIZE);
      const batchPromises = batch.map((text) => this.translate(text));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay entre lotes para não sobrecarregar APIs
      if (i + CONFIG.BATCH_SIZE < texts.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.TRANSLATION_DELAY)
        );
      }
    }

    return results;
  }
}

// ===== GERADOR DE PERGUNTAS DOS LIVROS =====
class BookQuestionGenerator {
  constructor() {
    this.books = [];
    this.usedBooks = new Set();
  }

  async loadBooks() {
    try {
      const response = await fetch("data/books.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.books = await response.json();
      console.log(`📚 ${this.books.length} livros carregados`);

      return this.books;
    } catch (error) {
      console.error("❌ Erro ao carregar livros:", error);
      throw new Error("Não foi possível carregar os dados dos livros");
    }
  }

  // Filtrar livros por dificuldade
  filterBooksByDifficulty(difficulty) {
    switch (difficulty) {
      case "facil":
        return this.books.filter(
          (book) =>
            book.titulo &&
            book.autor &&
            book.titulo.length <= 50 &&
            book.ano_publicacao >= 1950
        );

      case "medium":
        return this.books.filter(
          (book) =>
            book.descricao &&
            book.descricao.length > 100 &&
            book.genero &&
            book.genero.length > 0 &&
            book.corrente_literaria
        );

      case "hard":
        return this.books.filter(
          (book) =>
            book.ano_publicacao < 1980 &&
            book.local &&
            book.pais &&
            book.corrente_literaria
        );

      default:
        return this.books;
    }
  }

  // Gerar pergunta baseada no tipo e dificuldade
  generateQuestion(book, difficulty, allBooks) {
    const questionTypes = this.getQuestionTypes(difficulty);
    const randomType =
      questionTypes[Math.floor(Math.random() * questionTypes.length)];

    return this.createQuestionByType(book, randomType, allBooks);
  }

  // Tipos de pergunta por dificuldade
  getQuestionTypes(difficulty) {
    const types = {
      facil: ["author", "title_by_author", "year_simple"],
      medium: ["description", "genre", "collection", "movement"],
      hard: ["year_exact", "location", "movement_advanced", "country"],
    };

    return types[difficulty] || types.facil;
  }

  // Criar pergunta específica por tipo
  createQuestionByType(book, type, allBooks) {
    const generators = {
      author: () => this.generateAuthorQuestion(book, allBooks),
      title_by_author: () => this.generateTitleByAuthorQuestion(book, allBooks),
      year_simple: () => this.generateYearSimpleQuestion(book),
      description: () => this.generateDescriptionQuestion(book, allBooks),
      genre: () => this.generateGenreQuestion(book, allBooks),
      collection: () => this.generateCollectionQuestion(book, allBooks),
      movement: () => this.generateMovementQuestion(book, allBooks),
      year_exact: () => this.generateYearExactQuestion(book),
      location: () => this.generateLocationQuestion(book, allBooks),
      movement_advanced: () =>
        this.generateMovementAdvancedQuestion(book, allBooks),
      country: () => this.generateCountryQuestion(book, allBooks),
    };

    const generator = generators[type];
    if (!generator) {
      return this.generateAuthorQuestion(book, allBooks);
    }

    try {
      return generator();
    } catch (error) {
      console.warn(`Erro ao gerar pergunta tipo ${type}:`, error);
      return this.generateAuthorQuestion(book, allBooks);
    }
  }

  // Geradores específicos de perguntas
  generateAuthorQuestion(book, allBooks) {
    const otherAuthors = [...new Set(allBooks.map((b) => b.autor))]
      .filter((author) => author !== book.autor)
      .slice(0, 3);

    return {
      pergunta: `Quem é o autor de "${book.titulo}"?`,
      respostas: this.shuffleArray([book.autor, ...otherAuthors]),
      correta: book.autor,
      categoria: "Autor",
      dificuldade: "Fácil",
    };
  }

  generateTitleByAuthorQuestion(book, allBooks) {
    const otherTitles = allBooks
      .filter((b) => b.autor !== book.autor)
      .map((b) => b.titulo)
      .slice(0, 3);

    return {
      pergunta: `Qual destes livros foi escrito por ${book.autor}?`,
      respostas: this.shuffleArray([book.titulo, ...otherTitles]),
      correta: book.titulo,
      categoria: "Título",
      dificuldade: "Fácil",
    };
  }

  generateDescriptionQuestion(book, allBooks) {
    const shortDescription = book.descricao.substring(0, 120) + "...";
    const otherTitles = allBooks
      .filter((b) => b.id !== book.id)
      .map((b) => b.titulo)
      .slice(0, 3);

    return {
      pergunta: `Qual livro tem a seguinte sinopse: "${shortDescription}"`,
      respostas: this.shuffleArray([book.titulo, ...otherTitles]),
      correta: book.titulo,
      categoria: "Sinopse",
      dificuldade: "Médio",
    };
  }

  generateGenreQuestion(book, allBooks) {
    const bookGenres = Array.isArray(book.genero) ? book.genero : [book.genero];
    const correctGenre = bookGenres[0];

    const otherGenres = [
      ...new Set(
        allBooks.flatMap((b) =>
          Array.isArray(b.genero) ? b.genero : [b.genero]
        )
      ),
    ]
      .filter((genre) => !bookGenres.includes(genre))
      .slice(0, 3);

    return {
      pergunta: `Qual é o principal gênero literário de "${book.titulo}"?`,
      respostas: this.shuffleArray([correctGenre, ...otherGenres]),
      correta: correctGenre,
      categoria: "Gênero",
      dificuldade: "Médio",
    };
  }

  generateYearExactQuestion(book) {
    const correctYear = book.ano_publicacao;
    const incorrectYears = [];

    // Gerar anos próximos
    for (let i = 0; i < 3; i++) {
      let year =
        correctYear +
        (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 10) + 1);
      if (year < 1000) year = 1000 + Math.floor(Math.random() * 1000);
      incorrectYears.push(year);
    }

    return {
      pergunta: `Em que ano foi publicado "${book.titulo}"?`,
      respostas: this.shuffleArray(
        [correctYear, ...incorrectYears].map(String)
      ),
      correta: String(correctYear),
      categoria: "Ano de Publicação",
      dificuldade: "Difícil",
    };
  }

  generateLocationQuestion(book, allBooks) {
    const otherLocations = [...new Set(allBooks.map((b) => b.local))]
      .filter((location) => location !== book.local && location)
      .slice(0, 3);

    return {
      pergunta: `Onde se passa a história de "${book.titulo}"?`,
      respostas: this.shuffleArray([book.local, ...otherLocations]),
      correta: book.local,
      categoria: "Localização",
      dificuldade: "Difícil",
    };
  }

  generateMovementQuestion(book, allBooks) {
    const otherMovements = [
      ...new Set(allBooks.map((b) => b.corrente_literaria)),
    ]
      .filter((movement) => movement !== book.corrente_literaria && movement)
      .slice(0, 3);

    return {
      pergunta: `A qual corrente literária pertence "${book.titulo}"?`,
      respostas: this.shuffleArray([
        book.corrente_literaria,
        ...otherMovements,
      ]),
      correta: book.corrente_literaria,
      categoria: "Corrente Literária",
      dificuldade: "Médio",
    };
  }

  generateCollectionQuestion(book, allBooks) {
    const bookCollections = Array.isArray(book.colecao)
      ? book.colecao
      : [book.colecao];
    const correctCollection = bookCollections[0];

    const otherCollections = [
      ...new Set(
        allBooks.flatMap((b) =>
          Array.isArray(b.colecao) ? b.colecao : [b.colecao]
        )
      ),
    ]
      .filter(
        (collection) => !bookCollections.includes(collection) && collection
      )
      .slice(0, 3);

    return {
      pergunta: `"${book.titulo}" faz parte de qual coleção do clube?`,
      respostas: this.shuffleArray([correctCollection, ...otherCollections]),
      correta: correctCollection,
      categoria: "Coleção",
      dificuldade: "Médio",
    };
  }

  generateCountryQuestion(book, allBooks) {
    const otherCountries = [...new Set(allBooks.map((b) => b.pais))]
      .filter((country) => country !== book.pais && country)
      .slice(0, 3);

    return {
      pergunta: `"${book.titulo}" foi escrito por um autor de qual país?`,
      respostas: this.shuffleArray([book.pais, ...otherCountries]),
      correta: book.pais,
      categoria: "País",
      dificuldade: "Difícil",
    };
  }

  // Gerar múltiplas perguntas
  async generateQuestions(
    difficulty = "facil",
    count = CONFIG.TOTAL_QUESTIONS
  ) {
    if (this.books.length === 0) {
      await this.loadBooks();
    }

    const filteredBooks = this.filterBooksByDifficulty(difficulty);

    if (filteredBooks.length === 0) {
      throw new Error(
        `Não há livros suficientes para a dificuldade "${difficulty}"`
      );
    }

    const questions = [];
    const usedBooks = new Set();

    for (let i = 0; i < count && filteredBooks.length > 0; i++) {
      // Selecionar livro não usado
      let availableBooks = filteredBooks.filter(
        (book) => !usedBooks.has(book.id)
      );

      if (availableBooks.length === 0) {
        // Se todos foram usados, resetar para permitir reutilização
        usedBooks.clear();
        availableBooks = filteredBooks;
      }

      const randomBook =
        availableBooks[Math.floor(Math.random() * availableBooks.length)];
      usedBooks.add(randomBook.id);

      try {
        const question = this.generateQuestion(
          randomBook,
          difficulty,
          this.books
        );
        if (question && question.respostas.length >= 4) {
          questions.push(question);
        }
      } catch (error) {
        console.warn(
          `Erro ao gerar pergunta para livro ${randomBook.titulo}:`,
          error
        );
      }
    }

    return questions;
  }

  // Utilitário para embaralhar array
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// ===== CLIENTE DA API PÚBLICA =====
class PublicQuizAPI {
  constructor() {
    this.translator = new TranslationService();
    this.baseURL = APIS.TRIVIA;
  }

  // Buscar perguntas com retry e fallback
  async fetchQuestions(difficulty = "easy", count = CONFIG.TOTAL_QUESTIONS) {
    const categories = [
      { id: 10, name: "Entertainment: Books" },
      { id: 9, name: "General Knowledge" },
      { id: 17, name: "Science & Nature" },
      { id: 23, name: "History" },
    ];

    for (const category of categories) {
      try {
        console.log(`🔍 Tentando categoria: ${category.name}`);
        const questions = await this.fetchFromCategory(
          category.id,
          difficulty,
          count
        );

        if (questions.length > 0) {
          console.log(
            `✅ ${questions.length} perguntas obtidas de ${category.name}`
          );
          return questions;
        }
      } catch (error) {
        console.warn(`⚠️ Erro na categoria ${category.name}:`, error);
        continue;
      }
    }

    throw new Error("Não foi possível obter perguntas de nenhuma categoria");
  }

  // Buscar de categoria específica
  async fetchFromCategory(categoryId, difficulty, count) {
    const url = `${this.baseURL}?amount=${count}&category=${categoryId}&difficulty=${difficulty}&type=multiple&encode=base64`;

    const response = await this.fetchWithTimeout(url, CONFIG.API_TIMEOUT);
    const data = await response.json();

    if (data.response_code !== 0) {
      throw new Error(`API retornou código de erro: ${data.response_code}`);
    }

    if (!data.results || data.results.length === 0) {
      throw new Error("Nenhuma pergunta retornada pela API");
    }

    return await this.processQuestions(data.results);
  }

  // Fetch com timeout
  async fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Processar e traduzir perguntas
  async processQuestions(rawQuestions) {
    const questions = [];

    for (const q of rawQuestions) {
      try {
        // Decodificar base64
        const decodedQuestion = atob(q.question);
        const decodedCorrect = atob(q.correct_answer);
        const decodedIncorrect = q.incorrect_answers.map((ans) => atob(ans));

        // Traduzir
        const translatedQuestion = await this.translator.translate(
          decodedQuestion
        );
        const translatedCorrect = await this.translator.translate(
          decodedCorrect
        );
        const translatedIncorrect = await this.translator.translateBatch(
          decodedIncorrect
        );

        const question = {
          pergunta: translatedQuestion,
          respostas: this.shuffleArray([
            translatedCorrect,
            ...translatedIncorrect,
          ]),
          correta: translatedCorrect,
          categoria: await this.translator.translate(q.category),
          dificuldade: await this.translator.translate(q.difficulty),
          original: {
            question: decodedQuestion,
            correct: decodedCorrect,
            incorrect: decodedIncorrect,
          },
        };

        questions.push(question);
      } catch (error) {
        console.warn("Erro ao processar pergunta:", error);
        continue;
      }
    }

    return questions;
  }

  // Utilitário para embaralhar
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// ===== CONTROLADOR PRINCIPAL DO QUIZ =====
class QuizController {
  constructor() {
    this.bookGenerator = new BookQuestionGenerator();
    this.publicAPI = new PublicQuizAPI();
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.startTime = null;
    this.answers = [];

    this.initializeEventListeners();
  }

  // Inicializar event listeners
  initializeEventListeners() {
    document
      .getElementById("iniciar-quiz")
      .addEventListener("click", () => this.startQuiz());
    document
      .getElementById("quiz-next")
      .addEventListener("click", () => this.nextQuestion());
    document
      .getElementById("quiz-reiniciar")
      .addEventListener("click", () => this.resetQuiz());
    document
      .getElementById("share-whatsapp")
      .addEventListener("click", () => this.shareOnWhatsApp());
  }

  // Iniciar quiz
  async startQuiz() {
    try {
      const difficulty = document.getElementById("dificuldade").value;
      const origin = document.getElementById("origem").value;

      console.log(`🚀 Iniciando quiz: ${origin} - ${difficulty}`);

      // Mostrar área do quiz e loading
      this.showSection("quiz-area");
      this.showLoading(true);

      // Gerar perguntas
      if (origin === "books") {
        this.questions = await this.bookGenerator.generateQuestions(difficulty);
      } else {
        this.questions = await this.publicAPI.fetchQuestions(difficulty);
      }

      if (this.questions.length === 0) {
        throw new Error("Nenhuma pergunta foi gerada");
      }

      // Inicializar estado do quiz
      this.currentQuestionIndex = 0;
      this.score = 0;
      this.startTime = Date.now();
      this.answers = [];

      console.log(`✅ Quiz iniciado com ${this.questions.length} perguntas`);

      this.hideLoading();
      this.showQuestion();
    } catch (error) {
      console.error("❌ Erro ao iniciar quiz:", error);
      this.showError(error.message);
    }
  }

  // Mostrar pergunta atual
  showQuestion() {
    const question = this.questions[this.currentQuestionIndex];
    if (!question) {
      this.endQuiz();
      return;
    }

    // Atualizar contador
    document.getElementById("currentQuestionNumber").textContent =
      this.currentQuestionIndex + 1;
    document.getElementById("totalQuestionsNumber").textContent =
      this.questions.length;

    // Mostrar pergunta
    document.getElementById("quiz-pergunta").textContent = question.pergunta;

    // Limpar feedback anterior
    document.getElementById("quiz-feedback").textContent = "";

    // Criar botões de resposta
    const answersContainer = document.getElementById("quiz-respostas");
    answersContainer.innerHTML = "";

    question.respostas.forEach((answer) => {
      const button = document.createElement("button");
      button.textContent = answer;
      button.addEventListener("click", () => this.checkAnswer(button, answer));
      answersContainer.appendChild(button);
    });

    // Esconder botão próxima
    document.getElementById("quiz-next").style.display = "none";
  }

  // Verificar resposta
  checkAnswer(selectedButton, userAnswer) {
    const question = this.questions[this.currentQuestionIndex];
    const isCorrect = userAnswer === question.correta;

    // Desabilitar todos os botões
    document.querySelectorAll("#quiz-respostas button").forEach((btn) => {
      btn.disabled = true;
    });

    // Registrar resposta
    this.answers.push({
      question: question.pergunta,
      userAnswer,
      correctAnswer: question.correta,
      isCorrect,
      timeSpent: Date.now() - this.startTime,
    });

    // Atualizar score
    if (isCorrect) {
      this.score++;
      selectedButton.classList.add("correct");
      this.showFeedback("✅ Resposta correta!", "success");
    } else {
      selectedButton.classList.add("incorrect");
      this.showFeedback(
        `❌ Resposta incorreta! A resposta correta era: ${question.correta}`,
        "error"
      );

      // Destacar resposta correta
      document.querySelectorAll("#quiz-respostas button").forEach((btn) => {
        if (btn.textContent === question.correta) {
          btn.classList.add("correct");
        }
      });
    }

    // Mostrar botão próxima
    document.getElementById("quiz-next").style.display = "inline-block";
  }

  // Próxima pergunta
  nextQuestion() {
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex < this.questions.length) {
      this.showQuestion();
    } else {
      this.endQuiz();
    }
  }

  // Finalizar quiz
  endQuiz() {
    const endTime = Date.now();
    const totalTime = Math.round((endTime - this.startTime) / 1000);
    const percentage = Math.round((this.score / this.questions.length) * 100);

    console.log(
      `🏁 Quiz finalizado: ${this.score}/${this.questions.length} (${percentage}%)`
    );

    this.showSection("quiz-fim");

    // Gerar relatório detalhado
    const report = this.generateDetailedReport(totalTime, percentage);
    document.getElementById("quiz-resultado").innerHTML = report;
  }

  // Gerar relatório detalhado
  generateDetailedReport(totalTime, percentage) {
    const performance = this.getPerformanceLevel(percentage);
    const averageTime = Math.round(totalTime / this.questions.length);

    return `
      <div class="quiz-stats">
        <div class="main-score">
          <h3>Pontuação: ${this.score}/${this.questions.length}</h3>
          <div class="percentage">${percentage}%</div>
        </div>
        
        <div class="performance-level ${performance.class}">
          <h4>${performance.title}</h4>
          <p>${performance.message}</p>
        </div>
        
        <div class="time-stats">
          <p><strong>Tempo total:</strong> ${this.formatTime(totalTime)}</p>
          <p><strong>Tempo médio por pergunta:</strong> ${this.formatTime(
            averageTime
          )}</p>
        </div>
        
        <div class="category-breakdown">
          <h4>Desempenho por categoria:</h4>
          ${this.generateCategoryBreakdown()}
        </div>
      </div>
    `;
  }

  // Obter nível de performance
  getPerformanceLevel(percentage) {
    if (percentage >= 90) {
      return {
        class: "excellent",
        title: "🏆 Excelente!",
        message:
          "Você é um verdadeiro mestre literário! Parabéns pelo conhecimento excepcional!",
      };
    } else if (percentage >= 70) {
      return {
        class: "good",
        title: "👏 Muito bom!",
        message:
          "Ótimo desempenho! Continue lendo e praticando para se tornar um expert!",
      };
    } else if (percentage >= 50) {
      return {
        class: "average",
        title: "📚 Bom trabalho!",
        message:
          "Você está no caminho certo! Continue estudando para melhorar ainda mais!",
      };
    } else {
      return {
        class: "needs-improvement",
        title: "💪 Continue tentando!",
        message:
          "Não desanime! A leitura é uma jornada. Continue praticando e você vai melhorar!",
      };
    }
  }

  // Gerar breakdown por categoria
  generateCategoryBreakdown() {
    const categories = {};

    this.answers.forEach((answer) => {
      const question = this.questions.find(
        (q) => q.pergunta === answer.question
      );
      const category = question?.categoria || "Geral";

      if (!categories[category]) {
        categories[category] = { correct: 0, total: 0 };
      }

      categories[category].total++;
      if (answer.isCorrect) {
        categories[category].correct++;
      }
    });

    return Object.entries(categories)
      .map(([category, stats]) => {
        const percentage = Math.round((stats.correct / stats.total) * 100);
        return `
          <div class="category-stat">
            <span class="category-name">${category}:</span>
            <span class="category-score">${stats.correct}/${stats.total} (${percentage}%)</span>
          </div>
        `;
      })
      .join("");
  }

  // Formatar tempo
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}min ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  // Resetar quiz
  resetQuiz() {
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.startTime = null;
    this.answers = [];

    this.showSection("quiz-config");
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-respostas").innerHTML = "";
  }

  // Compartilhar no WhatsApp
  shareOnWhatsApp() {
    const percentage = Math.round((this.score / this.questions.length) * 100);
    const performance = this.getPerformanceLevel(percentage);

    const message = `🧠📚 Acabei de fazer o Quiz Literário dos Leitores Inoxidáveis!

📊 Meu resultado: ${this.score}/${this.questions.length} (${percentage}%)
${performance.title}

🎯 Teste seus conhecimentos também: ${window.location.href}

#QuizLiterario #LeitoresInoxidaveis #Literatura`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  }

  // Utilitários de UI
  showSection(sectionId) {
    ["quiz-config", "quiz-area", "quiz-fim"].forEach((id) => {
      document.getElementById(id).style.display = "none";
    });
    document.getElementById(sectionId).style.display = "block";
  }

  showLoading(show) {
    const loadingOverlay = document.querySelector(
      "#quiz-area .loading-overlay"
    );
    if (loadingOverlay) {
      loadingOverlay.style.display = show ? "flex" : "none";
    }
  }

  hideLoading() {
    this.showLoading(false);
  }

  showFeedback(message, type) {
    const feedbackElement = document.getElementById("quiz-feedback");
    feedbackElement.textContent = message;
    feedbackElement.className = `quiz-feedback ${type}`;
  }

  showError(message) {
    this.showSection("quiz-area");
    document.getElementById("quiz-area").innerHTML = `
      <div class="error-container">
        <h3>❌ Erro</h3>
        <p>${message}</p>
        <button onclick="quizController.resetQuiz()" class="main-button">
          Voltar ao Início
        </button>
      </div>
    `;
  }
}

// ===== INICIALIZAÇÃO =====
let quizController;

document.addEventListener("DOMContentLoaded", () => {
  console.log("🎮 Inicializando Quiz Literário...");
  quizController = new QuizController();
});
