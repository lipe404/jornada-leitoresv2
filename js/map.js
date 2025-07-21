// Função para geocodificar via Nominatim (OpenStreetMap)
async function obterCoordenadas(cidade, pais) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    cidade + ", " + pais
  )}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "leitores-inoxidaveis/1.0" },
  });
  const dados = await response.json();
  if (dados && dados.length > 0) {
    return { lat: parseFloat(dados[0].lat), lon: parseFloat(dados[0].lon) };
  }
  return null;
}

async function carregaLivros() {
  const resp = await fetch("data/books.json");
  const livros = await resp.json();
  return livros;
}

async function inicializaMapa() {
  const livros = await carregaLivros();
  // Inicializa mapa no centro da Europa/Brasil
  const mapa = L.map("map-literario").setView([20, 0], 2);

  // Camada base OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap colaboradores",
  }).addTo(mapa);

  // Mapeando livros para coordenadas e adicionando marcadores
  for (const livro of livros) {
    // Para performance, adote um cache localStorage se tiver muitos livros!
    let coords = null;
    try {
      coords = await obterCoordenadas(livro.local, livro.pais);
    } catch (e) {
      coords = null;
    }

    if (coords) {
      const iconeLivro = L.icon({
        iconUrl: livro.imagem_capa || "",
        iconSize: [40, 60],
        iconAnchor: [20, 60],
        popupAnchor: [0, -60],
        className: "livro-marker",
      });

      const marker = L.marker([coords.lat, coords.lon], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<img src="${livro.imagem_capa}" alt="capa" class="livro-capa-thumb" />`,
          iconAnchor: [20, 50],
        }),
      }).addTo(mapa);

      marker.bindPopup(`
        <div style="max-width:180px">
          <img src="${
            livro.imagem_capa
          }" alt="capa" style="width:100%; border-radius:8px;" />
          <h3 style="font-size:1.1rem; margin:.5em 0 .2em">${livro.titulo}</h3>
          <p style="margin:0; font-size:.95rem;">${livro.autor}</p>
          <p style="margin:0; font-size:.9rem;color:#555"><strong>${
            livro.local
          }, ${livro.pais}</strong> (${livro.ano_publicacao || ""})</p>
        </div>
      `);
    }
  }
}

document.addEventListener("DOMContentLoaded", inicializaMapa);
