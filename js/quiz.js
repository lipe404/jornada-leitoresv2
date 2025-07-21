// --- CONFIGURAÇÃO ---
const TOTAL_QUESTIONS = 10; // Número fixo de perguntas
const OPEN_TRIVIA_API_BASE =
  "https://opentdb.com/api.php?amount=10&type=multiple&encode=base64"; // Always fetch 10
const TRANSLATION_SERVICE_URL = "https://api.mymemory.translated.net/get?q="; // Free API (limited, for demo)
const TRANSLATION_MAP = {
  // Mapeamento manual para termos comuns da API que podem não ser bem traduzidos ou para demonstrar.
  // Em uma aplicação real, você usaria um serviço de tradução robusto.
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
  Vehicles: "Veículos",
  Comics: "Quadrinhos",
  Computers: "Computadores",
  Mathematics: "Matemática",
  correct: "correta",
  incorrect: "incorreta",
  true: "verdadeiro",
  false: "falso",
  // Adicione mais termos conforme necessário
};

// --- UTILITÁRIOS ---

// Embaralha um array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Função para simular ou tentar traduzir texto
async function translateText(text) {
  // Tenta traduzir usando o mapa manual primeiro
  const mapped = TRANSLATION_MAP[text];
  if (mapped) return mapped;

  // Se não estiver no mapa, tenta uma API de tradução (gratuita e limitada)
  // ESTA API É GRATUITA E PODE TER LIMITES DE USO/QUALIDADE.
  // PARA PRODUÇÃO, CONSIDERE UMA SOLUÇÃO MAIS ROBUSTA.
  try {
    const response = await fetch(
      `${TRANSLATION_SERVICE_URL}${encodeURIComponent(text)}&langpair=en|pt-br`
    );
    const data = await response.json();
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (error) {
    console.warn("Erro ao usar API de tradução, retornando original:", error);
  }
  return text; // Retorna o texto original se a tradução falhar
}

// Pega perguntas do books.json e monta questões
async function generateBookQuestions(difficulty = "facil") {
  console.log("Gerando perguntas dos livros do clube...");
  try {
    const resp = await fetch("data/books.json");
    if (!resp.ok) throw new Error("Erro ao carregar books.json");
    const books = await resp.json();

    let pool = books;
    // CORREÇÃO: Usar 'descricao' em vez de 'sinopse'
    if (difficulty === "medium")
      pool = books.filter(
        (book) => book.descricao && book.descricao.length > 100
      );
    else if (difficulty === "hard")
      pool = books.filter((book) => book.ano_publicacao < 1980);

    // Adiciona log para verificar o pool após a filtragem
    console.log(
      `Pool de livros para dificuldade ${difficulty}: ${pool.length} livros.`
    );

    const questions = [];
    const allAuthors = Array.from(new Set(books.map((b) => b.autor))); // Pool completo de autores

    // Garante que o pool não está vazio
    if (pool.length === 0) {
      showError(
        "Não há livros suficientes para gerar perguntas com essa dificuldade. Tente outra!"
      );
      return [];
    }

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      if (pool.length === 0) {
        console.warn(
          "Não há livros suficientes no pool para gerar todas as perguntas. Perguntas geradas:",
          questions.length
        );
        break;
      }

      // Seleciona um livro aleatoriamente do pool e o remove (para evitar repetição na mesma rodada de quiz)
      const randomIndex = Math.floor(Math.random() * pool.length);
      const book = pool.splice(randomIndex, 1)[0]; // Remove o livro do pool

      let questionText, correctAnswer, incorrectAnswers;

      switch (difficulty) {
        case "facil":
          questionText = `Quem é o autor de "${book.titulo}"?`;
          correctAnswer = book.autor;
          incorrectAnswers = shuffle(
            allAuthors.filter((a) => a !== book.autor) // Filtra o autor correto
          ).slice(0, 3);
          break;
        case "medium":
          questionText = `Qual livro conta a história de "${book.descricao.substring(
            0,
            Math.min(book.descricao.length, 120)
          )}..."?`;
          correctAnswer = book.titulo;
          incorrectAnswers = shuffle(
            books.filter((b) => b.id !== book.id).map((b) => b.titulo) // Pega títulos de outros livros
          ).slice(0, 3);
          break;
        case "hard":
          questionText = `Qual o ano de publicação de "${book.titulo}"?`;
          correctAnswer = String(book.ano_publicacao);
          incorrectAnswers = [];
          // Gera anos próximos como respostas incorretas
          for (let j = 0; j < 3; j++) {
            let year =
              parseInt(book.ano_publicacao) +
              Math.floor(Math.random() * 20) -
              10;
            // Evita anos inválidos
            if (year < 0) year = Math.abs(year);
            if (year === parseInt(book.ano_publicacao)) year += 1; // Garante que não seja o ano correto
            incorrectAnswers.push(String(year));
          }
          break;
        default: // Fallback para fácil se a dificuldade for desconhecida
          questionText = `Quem escreveu "${book.titulo}"?`;
          correctAnswer = book.autor;
          incorrectAnswers = shuffle(
            allAuthors.filter((a) => a !== book.autor)
          ).slice(0, 3);
      }

      let allAnswers = [correctAnswer, ...incorrectAnswers];
      allAnswers = Array.from(new Set(allAnswers)); // Remove duplicatas

      // Garante que haja 4 opções, se possível, puxando mais do pool de autores/títulos/anos
      while (allAnswers.length < 4) {
        let additionalOption = null;
        if (difficulty === "facil" || difficulty === "hard") {
          const potentialOption =
            allAuthors[Math.floor(Math.random() * allAuthors.length)];
          if (!allAnswers.includes(potentialOption))
            additionalOption = potentialOption;
        } else if (difficulty === "medium") {
          const potentialOption =
            books[Math.floor(Math.random() * books.length)].titulo;
          if (!allAnswers.includes(potentialOption))
            additionalOption = potentialOption;
        }

        if (additionalOption) {
          allAnswers.push(additionalOption);
        } else {
          // Se não conseguiu adicionar uma opção única, para evitar loop infinito
          break;
        }
      }

      questions.push({
        pergunta: questionText,
        respostas: shuffle(allAnswers),
        correta: correctAnswer,
      });
    }
    return questions;
  } catch (error) {
    console.error("Erro ao gerar perguntas dos livros do clube:", error);
    showError(
      "Erro ao gerar perguntas dos livros do clube. Verifique o arquivo books.json."
    );
    return [];
  }
}

// Pega perguntas de uma API pública de quiz (Open Trivia DB)
async function getPublicQuizQuestions(difficulty = "easy") {
  console.log(
    `Buscando perguntas da API pública (dificuldade: ${difficulty})...`
  );
  showLoading(true);
  let category = 10; // Categoria "Entertainment: Books"

  // Tenta pegar da categoria de livros primeiro
  let url = `${OPEN_TRIVIA_API_BASE}&category=${category}&difficulty=${difficulty}`;
  let data;

  try {
    const response = await fetch(url);
    data = await response.json();

    // Se não há perguntas de livros ou erro, tenta Conhecimentos Gerais
    if (data.response_code !== 0 || !data.results.length) {
      console.warn(
        `Não há perguntas de livros para dificuldade ${difficulty}. Tentando categoria "General Knowledge".`
      );
      category = 9; // Categoria "General Knowledge"
      url = `${OPEN_TRIVIA_API_BASE}&category=${category}&difficulty=${difficulty}`;
      const generalResponse = await fetch(url);
      data = await generalResponse.json();
    }

    if (data.response_code !== 0 || !data.results.length) {
      throw new Error(
        "Não foi possível carregar perguntas da API OpenTDB após tentativas."
      );
    }

    const questions = await Promise.all(
      data.results.map(async (q) => {
        // Decodifica de base64
        const decodedQuestion = atob(q.question);
        const decodedCorrect = atob(q.correct_answer);
        const decodedIncorrect = q.incorrect_answers.map((ans) => atob(ans));

        // Traduz pergunta e respostas
        const translatedQuestion = await translateText(decodedQuestion);
        const translatedCorrect = await translateText(decodedCorrect);
        const translatedIncorrect = await Promise.all(
          decodedIncorrect.map((ans) => translateText(ans))
        );

        return {
          pergunta: translatedQuestion,
          respostas: shuffle([translatedCorrect, ...translatedIncorrect]),
          correta: translatedCorrect,
        };
      })
    );
    return questions;
  } catch (error) {
    console.error("Erro ao buscar perguntas da API pública:", error);
    showError(
      "Não foi possível carregar perguntas da API pública. Tente novamente ou use os livros do clube."
    );
    return [];
  } finally {
    hideLoading();
  }
}

// --- LÓGICA DO QUIZ ---
let perguntas = [];
let currentQuestionIndex = 0;
let score = 0;

function resetQuiz() {
  console.log("Reiniciando quiz...");
  perguntas = [];
  currentQuestionIndex = 0;
  score = 0;
  document.getElementById("quiz-area").style.display = "none";
  document.getElementById("quiz-fim").style.display = "none";
  document.getElementById("quiz-config").style.display = "flex";
  document.getElementById("quiz-feedback").textContent = ""; // Limpa feedback
  document.getElementById("quiz-respostas").innerHTML = ""; // Limpa respostas
}

function showQuestion() {
  const quest = perguntas[currentQuestionIndex];
  if (!quest) {
    exibeFimQuiz(); // Se não houver mais perguntas válidas
    return;
  }

  document.getElementById("currentQuestionNumber").textContent =
    currentQuestionIndex + 1;
  document.getElementById("totalQuestionsNumber").textContent =
    perguntas.length;
  document.getElementById("quiz-pergunta").innerText = quest.pergunta;
  document.getElementById("quiz-feedback").textContent = "";

  const respostasDiv = document.getElementById("quiz-respostas");
  respostasDiv.innerHTML = "";

  quest.respostas.forEach((resp) => {
    const btn = document.createElement("button");
    btn.textContent = resp;
    btn.onclick = () => checkAnswer(btn, resp); // Passa o botão para mudar a classe
    respostasDiv.appendChild(btn);
  });
  document.getElementById("quiz-next").style.display = "none";
}

function checkAnswer(selectedButton, userAnswer) {
  const correctAnswer = perguntas[currentQuestionIndex].correta;

  // Desabilita todos os botões de resposta
  Array.from(document.querySelectorAll("#quiz-respostas button")).forEach(
    (b) => (b.disabled = true)
  );

  if (userAnswer === correctAnswer) {
    score++;
    selectedButton.classList.add("correct");
    document.getElementById("quiz-feedback").textContent =
      "✔️ Resposta correta!";
    document.getElementById("quiz-feedback").style.color = "forestgreen";
  } else {
    selectedButton.classList.add("incorrect");
    document.getElementById(
      "quiz-feedback"
    ).textContent = `❌ Resposta errada! A resposta correta era: ${correctAnswer}`;
    document.getElementById("quiz-feedback").style.color = "crimson";
    // Destaca a resposta correta
    Array.from(document.querySelectorAll("#quiz-respostas button")).forEach(
      (b) => {
        if (b.textContent === correctAnswer) {
          b.classList.add("correct");
        }
      }
    );
  }
  document.getElementById("quiz-next").style.display = "inline-block";
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < perguntas.length) {
    showQuestion();
  } else {
    exibeFimQuiz();
  }
}

function exibeFimQuiz() {
  console.log("Exibindo tela final do quiz.");
  document.getElementById("quiz-area").style.display = "none";
  document.getElementById("quiz-fim").style.display = "block";

  const resultadoDiv = document.getElementById("quiz-resultado");
  resultadoDiv.innerHTML = `
    <p>Você acertou <b>${score}</b> de <b>${TOTAL_QUESTIONS}</b> perguntas.</p>
    <p>${
      score === TOTAL_QUESTIONS
        ? "Incrível! Parabéns, você é um mestre literário!"
        : score >= TOTAL_QUESTIONS / 2
        ? "Muito bom! Continue praticando para ser um mestre!"
        : "Não desanime! Tente novamente para melhorar seu score!"
    }</p>
  `;
}

function shareOnWhatsApp() {
  const resultText = `Participei do Quiz Literário do Leitores Inoxidáveis e acertei ${score} de ${TOTAL_QUESTIONS} perguntas! ��🧠`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    resultText
  )}\n\nJogue também: ${window.location.href}`;
  window.open(whatsappUrl, "_blank");
}

// --- EVENT LISTENERS ---
document.getElementById("iniciar-quiz").onclick = async () => {
  console.log("Botão Iniciar Quiz clicado!");
  const difficulty = document.getElementById("dificuldade").value;
  const origin = document.getElementById("origem").value;

  document.getElementById("quiz-config").style.display = "none";
  document.getElementById("quiz-fim").style.display = "none";
  document.getElementById("quiz-area").style.display = "block"; // Mostra área do quiz
  showLoading(true); // Exibe loading

  // Gera perguntas
  if (origin === "books") {
    perguntas = await generateBookQuestions(difficulty);
  } else {
    perguntas = await getPublicQuizQuestions(difficulty);
  }

  hideLoading(); // Esconde loading

  if (perguntas.length === 0) {
    console.error("Nenhuma pergunta gerada. Exibindo mensagem de erro.");
    showError(
      "Não foi possível carregar perguntas. Tente outra origem ou dificuldade."
    );
    return;
  }

  // Limita as perguntas ao total desejado (se a API retornar mais)
  perguntas = perguntas.slice(0, TOTAL_QUESTIONS);
  console.log(`Quiz iniciado com ${perguntas.length} perguntas.`);

  currentQuestionIndex = 0;
  score = 0;
  showQuestion(); // Mostra a primeira pergunta
};

document.getElementById("quiz-next").onclick = nextQuestion;
document.getElementById("quiz-reiniciar").onclick = resetQuiz;
document.getElementById("share-whatsapp").onclick = shareOnWhatsApp;

// --- FUNÇÕES DE LOADING E ERRO ---
function showLoading(show) {
  const loadingOverlay = document.querySelector("#quiz-area .loading-overlay");
  if (loadingOverlay) {
    loadingOverlay.style.display = show ? "flex" : "none";
  }
}

function showError(message) {
  const quizArea = document.getElementById("quiz-area");
  quizArea.innerHTML = `
    <div class="quiz-section">
      <p style="color: #dc3545; font-weight: bold;">${message}</p>
      <button onclick="resetQuiz()" class="main-button restart-button">Voltar ao Início</button>
    </div>
  `;
  quizArea.style.display = "block";
  document.getElementById("quiz-config").style.display = "none"; // Garante que a config não apareça junto
}

// Estado inicial ao carregar a página
document.addEventListener("DOMContentLoaded", resetQuiz);
