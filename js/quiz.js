// --- CONFIG ---
const QUESTION_API =
  "https://opentdb.com/api.php?amount=10&category=10&type=multiple&encode=base64"; // Trivia Open API

// UTIL: Embaralhar array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Pega perguntas do books.json e monta questões com base nos livros
async function generateBookQuestions(difficulty = "facil", quant = 10) {
  const resp = await fetch("data/books.json");
  const books = await resp.json();

  let pool = books;
  if (difficulty === "medio")
    pool = books.filter((book) => book.sinopse && book.sinopse.length > 100);
  else if (difficulty === "dificil")
    pool = books.filter((book) => book.ano_publicacao < 1980);

  const questions = [];
  for (let i = 0; i < quant && pool.length; i++) {
    const book = pool[Math.floor(Math.random() * pool.length)];
    questions.push({
      pergunta: `Quem é o autor de "${book.titulo.replace(/"/g, "")}"?`,
      respostas: shuffle([
        book.autor,
        ...shuffle(
          pool
            .filter((b) => b.id !== book.id)
            .slice(0, 3)
            .map((b) => b.autor)
        ),
      ]),
      correta: book.autor,
    });
    // Adicione outros formatos (ex: perguntas sobre local, sinopse)
  }
  return questions;
}

// Pega perguntas de uma API pública de quiz
async function getPublicQuizQuestions(difficulty = "easy", quant = 8) {
  // Open Trivia DB: https://opentdb.com
  const url = `https://opentdb.com/api.php?amount=${quant}&category=10&difficulty=${difficulty}&type=multiple&encode=base64`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data.results.map((q) => ({
    pergunta: atob(q.question),
    respostas: shuffle([
      atob(q.correct_answer),
      ...q.incorrect_answers.map((ans) => atob(ans)),
    ]),
    correta: atob(q.correct_answer),
  }));
}

// --- LÓGICA DO QUIZ ---
let perguntas = [];
let atual = 0,
  pontos = 0;

function resetQuiz() {
  perguntas = [];
  atual = 0;
  pontos = 0;
  document.getElementById("quiz-area").style.display = "none";
  document.getElementById("quiz-fim").style.display = "none";
  document.getElementById("quiz-config").style.display = "flex";
}

function mostrarPergunta() {
  const quest = perguntas[atual];

  document.getElementById("quiz-pergunta").innerText = `Pergunta ${
    atual + 1
  }: ${quest.pergunta}`;
  document.getElementById("quiz-feedback").textContent = "";
  const respostasDiv = document.getElementById("quiz-respostas");
  respostasDiv.innerHTML = "";
  quest.respostas.forEach((resp) => {
    const btn = document.createElement("button");
    btn.textContent = resp;
    btn.onclick = () => checarResposta(resp);
    respostasDiv.appendChild(btn);
  });
  document.getElementById("quiz-next").style.display = "none";
}

function checarResposta(respUser) {
  const correta = perguntas[atual].correta;
  if (respUser === correta) {
    pontos++;
    document.getElementById("quiz-feedback").textContent =
      "✔️ Resposta correta!";
    document.getElementById("quiz-feedback").style.color = "forestgreen";
  } else {
    document.getElementById(
      "quiz-feedback"
    ).textContent = `❌ Resposta errada! Resposta certa: ${correta}`;
    document.getElementById("quiz-feedback").style.color = "crimson";
  }
  // Travar seleção
  Array.from(document.querySelectorAll("#quiz-respostas button")).forEach(
    (b) => (b.disabled = true)
  );
  document.getElementById("quiz-next").style.display = "inline-block";
}

function proximaPergunta() {
  atual++;
  if (atual < perguntas.length) {
    mostrarPergunta();
  } else {
    exibeFimQuiz();
  }
}

function exibeFimQuiz() {
  document.getElementById("quiz-area").style.display = "none";
  document.getElementById("quiz-fim").style.display = "block";
  document.getElementById("quiz-resultado").innerHTML = `
    <p>Você acertou <b>${pontos}</b> de <b>${
    perguntas.length
  }</b> perguntas.</p>
    <p>${
      pontos === perguntas.length
        ? "Incrível! Parabéns!"
        : "Tente novamente para melhorar seu score!"
    }</p>
  `;
}

document.getElementById("iniciar-quiz").onclick = async () => {
  const dif = document.getElementById("dificuldade").value;
  const origem = document.getElementById("origem").value;
  document.getElementById("quiz-config").style.display = "none";
  document.getElementById("quiz-fim").style.display = "none";

  // Gera perguntas
  if (origem === "books") {
    perguntas = await generateBookQuestions(dif);
  } else {
    // public API: adaptar dificuldade
    let difApi = dif === "facil" ? "easy" : dif === "medio" ? "medium" : "hard";
    perguntas = await getPublicQuizQuestions(difApi);
  }
  atual = 0;
  pontos = 0;
  document.getElementById("quiz-area").style.display = "block";
  mostrarPergunta();
};

document.getElementById("quiz-next").onclick = proximaPergunta;
document.getElementById("quiz-reiniciar").onclick = resetQuiz;

// Estado inicial
resetQuiz();
