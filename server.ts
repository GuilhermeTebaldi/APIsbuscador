import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();

// Initialize Gemini SDK only when API key is available
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

if (!geminiApiKey) {
  console.warn("[Gemini] GEMINI_API_KEY não configurada. Usando fallback local para buscas inteligentes.");
}

// A robust set of high-quality verified default free APIs to make the initial experience instant & fantastic
const VERIFIED_APIs = [
  {
    id: "open-meteo",
    name: "Previsão do Tempo (Open-Meteo)",
    description: "API meteorológica pública e de alta precisão de uso totalmente gratuito. Obtenha previsões locais de temperatura, vento e chuva em tempo real sem chaves de acesso.",
    category: "Clima & Geografia",
    url: "https://api.open-meteo.com/v1",
    docsUrl: "https://open-meteo.com/",
    auth: "none",
    endpoints: [
      {
        path: "/forecast",
        method: "GET",
        description: "Obter previsão do tempo para latitude e longitude específicas",
        queryParams: [
          { name: "latitude", type: "string", required: true, defaultValue: "-23.5505", description: "Latitude da cidade (ex: -23.5505 para São Paulo)" },
          { name: "longitude", type: "string", required: true, defaultValue: "-46.6333", description: "Longitude da cidade (ex: -46.6333 para São Paulo)" },
          { name: "current_weather", type: "string", required: true, defaultValue: "true", description: "Incluir dados atuais do clima (true ou false)" }
        ]
      }
    ],
    sampleResponse: {
      latitude: -23.5505,
      longitude: -46.6333,
      generationtime_ms: 0.12,
      utc_offset_seconds: 0,
      timezone: "GMT",
      elevation: 760.0,
      current_weather: {
        temperature: 24.5,
        windspeed: 14.8,
        winddirection: 120,
        weathercode: 1,
        is_day: 1,
        time: "2026-05-15T14:00"
      }
    }
  },
  {
    id: "pokeapi",
    name: "PokeAPI (Pokémon)",
    description: "A API definitiva de Pokémon. Retorna todos os dados de Pokémons, espécies, habilidades, fotos oficiais e movimentos totalmente gratuito.",
    category: "Games & Entretenimento",
    url: "https://pokeapi.co/api/v2",
    docsUrl: "https://pokeapi.co/",
    auth: "none",
    endpoints: [
      {
        path: "/pokemon/pikachu",
        method: "GET",
        description: "Obter detalhes de um Pokémon por nome/id",
        pathParams: [
          { name: "name_or_id", type: "string", required: true, defaultValue: "pikachu", description: "Nome ou ID de um Pokémon do Pokédex" }
        ]
      },
      {
        path: "/pokemon",
        method: "GET",
        description: "Listar Pokémons paginados",
        queryParams: [
          { name: "limit", type: "number", required: false, defaultValue: "10", description: "Quantidade de registros por página" },
          { name: "offset", type: "number", required: false, defaultValue: "0", description: "Quantidade de registros pulados" }
        ]
      }
    ],
    sampleResponse: {
      id: 25,
      name: "pikachu",
      base_experience: 112,
      height: 4,
      weight: 60,
      species: { name: "pikachu" },
      types: [
        { slot: 1, type: { name: "electric" } }
      ],
      sprites: {
        front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
      }
    }
  },
  {
    id: "rickandmorty",
    name: "The Rick and Morty API",
    description: "Acesse centenas de personagens, episódios e localizações do desenho animado Rick and Morty com fotos e status em tempo real.",
    category: "Games & Entretenimento",
    url: "https://rickandmortyapi.com/api",
    docsUrl: "https://rickandmortyapi.com/",
    auth: "none",
    endpoints: [
      {
        path: "/character",
        method: "GET",
        description: "Filtrar e obter personagens de Rick and Morty",
        queryParams: [
          { name: "name", type: "string", required: false, defaultValue: "Morty Smith", description: "Filtrar personagens pelo nome" },
          { name: "status", type: "string", required: false, defaultValue: "alive", description: "Filtrar por status: alive, dead ou unknown" }
        ]
      }
    ],
    sampleResponse: {
      id: 1,
      name: "Rick Sanchez",
      status: "Alive",
      species: "Human",
      gender: "Male",
      image: "https://rickandmortyapi.com/api/character/avatar/1.jpeg"
    }
  },
  {
    id: "catfact",
    name: "Cat Facts (Fatos sobre Gatos)",
    description: "Aprenda dados científicos e curiosidades interessantes sobre os felinos através de fatos curtos gerados em tempo real.",
    category: "Educação & Curiosidades",
    url: "https://catfact.ninja",
    docsUrl: "https://catfact.ninja/",
    auth: "none",
    endpoints: [
      {
        path: "/fact",
        method: "GET",
        description: "Obter um fato aleatório sobre gatos",
        queryParams: []
      }
    ],
    sampleResponse: {
      fact: "Os gatos passam cerca de 30% a 50% de suas vidas limpando a si próprios.",
      length: 74
    }
  },
  {
    id: "coindesk",
    name: "Preço do Bitcoin (CoinDesk)",
    description: "API de dados financeiros em tempo real com a taxa atual do Bitcoin atualizada a cada minuto em USD, GBP e EUR.",
    category: "Finanças & Crypto",
    url: "https://api.coindesk.com/v1",
    docsUrl: "https://www.coindesk.com/coindesk-api/",
    auth: "none",
    endpoints: [
      {
        path: "/bpi/currentprice.json",
        method: "GET",
        description: "Obter a cotação atual do Bitcoin em tempo real",
        queryParams: []
      }
    ],
    sampleResponse: {
      chartName: "Bitcoin",
      bpi: {
        USD: { code: "USD", rate: "92,540.23", description: "United States Dollar", rate_float: 92540.23 },
        EUR: { code: "EUR", rate: "85,410.50", description: "Euro", rate_float: 85410.5 }
      }
    }
  },
  {
    id: "nagerdate",
    name: "Nager.Date (Feriados Públicos)",
    description: "Verifique os feriados nacionais, públicos e bancários oficiais de mais de 100 países para qualquer ano especificado.",
    category: "Utilidades & Cultura",
    url: "https://date.nager.at/api/v3",
    docsUrl: "https://date.nager.at/",
    auth: "none",
    endpoints: [
      {
        path: "/PublicHolidays/2026/BR",
        method: "GET",
        description: "Listar feriados para o ano de 2026 no Brasil (BR)",
        queryParams: []
      }
    ],
    sampleResponse: [
      {
        date: "2026-01-01",
        localName: "Confraternização Universal",
        name: "New Year's Day",
        countryCode: "BR",
        fixed: true,
        global: true
      },
      {
        date: "2026-09-07",
        localName: "Independência do Brasil",
        name: "Independence Day",
        countryCode: "BR",
        fixed: true,
        global: true
      }
    ]
  },
  {
    id: "restcountries",
    name: "Rest Countries (Dados Oficiais de Países)",
    description: "API super completa contendo dados geográficos, moedas, idiomas, bandeiras oficiais e fronteiras dos países do mundo inteiro.",
    category: "Clima & Geografia",
    url: "https://restcountries.com/v3.1",
    docsUrl: "https://restcountries.com/",
    auth: "none",
    endpoints: [
      {
        path: "/name/brazil",
        method: "GET",
        description: "Obter informações do Brasil",
        queryParams: []
      }
    ],
    sampleResponse: {
      name: { common: "Brazil", official: "Federative Republic of Brazil" },
      capital: ["Brasília"],
      region: "Americas",
      subregion: "South America",
      languages: { por: "Portuguese" },
      population: 212559417,
      flags: { png: "https://flagcdn.com/w320/br.png" }
    }
  },
  {
    id: "jsonplaceholder",
    name: "JSONPlaceholder (Mock API)",
    description: "API falsa de prototipagem rápida de posts, fotos, usuários e comentários para simular cenários de bancos de dados CRUD de forma instantânea.",
    category: "Utilidades & Prototipagem",
    url: "https://jsonplaceholder.typicode.com",
    docsUrl: "https://jsonplaceholder.typicode.com/",
    auth: "none",
    endpoints: [
      {
        path: "/posts/1",
        method: "GET",
        description: "Obter um post fictício por ID",
        queryParams: []
      }
    ],
    sampleResponse: {
      userId: 1,
      id: 1,
      title: "Sunt aut facere repellat provident occaecati excepturi optio",
      body: "Quia et suscipit recusandae consequuntur expedita et cum reprehenderit molestiae ut ut quas totam nostrum rerum est autem"
    }
  },
  {
    id: "dogapi",
    name: "Dog API (Imagens de Cães)",
    description: "API gratuita para obter fotos de cães de qualquer raça de forma dinâmica. Muito bom para testar exibições de galerias de fotos.",
    category: "Imagens & Animais",
    url: "https://dog.ceo/api",
    docsUrl: "https://dog.ceo/dog-api/",
    auth: "none",
    endpoints: [
      {
        path: "/breeds/image/random",
        method: "GET",
        description: "Obtém uma imagem aleatória de um cachorro",
        queryParams: []
      },
      {
        path: "/breed/husky/images/random",
        method: "GET",
        description: "Obtém uma imagem de Husky Siberiano",
        queryParams: []
      }
    ],
    sampleResponse: {
      message: "https://images.dog.ceo/breeds/husky/n02110185_1469.jpg",
      status: "success"
    }
  },
  {
    id: "bibleapi",
    name: "Digital Bible API",
    description: "Fornece versículos e livros da Bíblia Sagrada de forma gratuita com múltiplos idiomas e traduções públicas.",
    category: "Cultura & Religião",
    url: "https://bible-api.com",
    docsUrl: "https://bible-api.com/",
    auth: "none",
    endpoints: [
      {
        path: "/john 3:16",
        method: "GET",
        description: "Obtém o livro, capítulo e versículo bíblico fornecido na rota",
        queryParams: [
          { name: "translation", type: "string", required: false, defaultValue: "almeida", description: "Tradução bíblica (ex: almeida)" }
        ]
      }
    ],
    sampleResponse: {
      reference: "John 3:16",
      text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.\n",
      translation_id: "web",
      translation_name: "World English Bible",
      translation_note: "Public Domain"
    }
  },
  {
    id: "voicerss",
    name: "Text to Speech (Voz Eletrônica)",
    description: "API pública excelente para transformar qualquer texto escrito em áudio MP3 de voz falada de alta qualidade. Suporta português do Brasil.",
    category: "Utilidades & Áudio",
    url: "https://api.voicerss.org",
    docsUrl: "http://www.voicerss.org/api/",
    auth: "apiKey",
    endpoints: [
      {
        path: "/",
        method: "GET",
        description: "Converter texto escrito em player de áudio MP3",
        queryParams: [
          { name: "key", type: "string", required: true, defaultValue: "359b3bbff7ad47468160fc4569ce4b21", description: "Chave da API da VoiceRSS (Usando chave pública para testes rápidos)" },
          { name: "src", type: "string", required: true, defaultValue: "Olá! Eu sou a voz artificial oficial do Buscador de APIs.", description: "Texto a ser lido pela inteligência de voz" },
          { name: "hl", type: "string", required: true, defaultValue: "pt-br", description: "Idioma da voz (ex: pt-br)" },
          { name: "r", type: "number", required: false, defaultValue: "0", description: "Velocidade da fala de -10 a 10" }
        ]
      }
    ],
    sampleResponse: {
      success: true,
      audio_url: "https://api.voicerss.org/?key=359b3bbff7ad47468160fc4569ce4b21&src=Ola&hl=pt-br"
    }
  },
  {
    id: "github",
    name: "Dados do Usuário GitHub",
    description: "Pesquise perfis, bios, número de repositórios, data de criação e links públicos para qualquer desenvolvedor registrado no GitHub em tempo real.",
    category: "Desenvolvimento & Perfis",
    url: "https://api.github.com",
    docsUrl: "https://docs.github.com/v3/",
    auth: "none",
    endpoints: [
      {
        path: "/users/octocat",
        method: "GET",
        description: "Obter informações do perfil público do GitHub de um usuário",
        pathParams: [
          { name: "username_or_id", type: "string", required: true, defaultValue: "octocat", description: "Nome de usuário do GitHub" }
        ]
      }
    ],
    sampleResponse: {
      login: "octocat",
      name: "The Octocat",
      company: "@github",
      blog: "https://github.blog",
      location: "San Francisco",
      bio: "Testing & coding active profiles",
      public_repos: 8,
      followers: 3950,
      avatar_url: "https://avatars.githubusercontent.com/u/5832347?v=4"
    }
  },
  {
    id: "nasa-apod",
    name: "Foto Astronômica do Dia (NASA)",
    description: "Acesse a maravilhosa Foto Astronômica do Dia (APOD) oficial da NASA com explicações científicas, títulos e imagens em altíssima resolução.",
    category: "Espaço & Ciência",
    url: "https://api.nasa.gov",
    docsUrl: "https://api.nasa.gov/",
    auth: "none",
    endpoints: [
      {
        path: "/planetary/apod",
        method: "GET",
        description: "Obter a imagem e explicação espacial do dia",
        queryParams: [
          { name: "api_key", type: "string", required: true, defaultValue: "DEMO_KEY", description: "Chave pública fornecida pela NASA de uso livre para demonstrações" }
        ]
      }
    ],
    sampleResponse: {
      title: "The Majestic Horsehead Nebula",
      date: "2026-05-25",
      explanation: "An energetic wave of interstellar gas and dust shapes this beautiful silhouette of a cosmic horse profile, located deep within the constellation of Orion.",
      url: "https://apod.nasa.gov/apod/image/2311/Horsehead_Euclid_960.jpg",
      media_type: "image"
    }
  },
  {
    id: "jokeapi",
    name: "JokeAPI (Piadas de Programação & Humor)",
    description: "API de piadas, trocadilhos e tiradas humorísticas de programação ou cultura pop filtrados sob medida em modo seguro para inteligência e divertimento.",
    category: "Educação & Curiosidades",
    url: "https://v2.jokeapi.dev",
    docsUrl: "https://sv46.gq/jokeapi",
    auth: "none",
    endpoints: [
      {
        path: "/joke/Any",
        method: "GET",
        description: "Obter uma piada aleatória em inglês",
        queryParams: [
          { name: "safe-mode", type: "string", required: false, defaultValue: "true", description: "Ativar filtro de piadas adequadas para ambiente profissional" }
        ]
      }
    ],
    sampleResponse: {
      category: "Programming",
      type: "single",
      joke: "There are 10 types of people in this world: those who understand binary, and those who don't.",
      id: 1,
      safe: true
    }
  },
  {
    id: "yugioh",
    name: "Banco de Cartas Yu-Gi-Oh! (YGOPRODeck)",
    description: "API de pesquisa massiva de cartas de Yu-Gi-Oh! oficial. Obtenha tipo de carta, descrição histórica de ataque e defesa, e link oficial da foto ilustrativa.",
    category: "Games & Entretenimento",
    url: "https://db.ygoprodeck.com/api/v7",
    docsUrl: "https://ygoprodeck.com/api-guide/",
    auth: "none",
    endpoints: [
      {
        path: "/cardinfo.php",
        method: "GET",
        description: "Pesquisar características de cartas do anime/cardgame",
        queryParams: [
          { name: "name", type: "string", required: true, defaultValue: "Dark Magician", description: "Nome exato da carta a pesquisar (ex: Dark Magician, Blue-Eyes White Dragon)" }
        ]
      }
    ],
    sampleResponse: {
      data: [{
        id: 46986414,
        name: "Dark Magician",
        type: "Normal Monster",
        desc: "The ultimate wizard in terms of attack and defense.",
        race: "Spellcaster",
        card_images: [{ 
          image_url: "https://images.ygoprodeck.com/images/cards/46986414.jpg" 
        }]
      }]
    }
  },
  {
    id: "universities",
    name: "Universidades Globais",
    description: "API de utilidade acadêmica fantástica para pesquisar listas completas de universidades oficiais registradas em cada país com links de websites de faculdades.",
    category: "Educação & Curiosidades",
    url: "http://universities.hipolabs.com",
    docsUrl: "https://github.com/Hipo/university-domains-list",
    auth: "none",
    endpoints: [
      {
        path: "/search",
        method: "GET",
        description: "Listar universidades oficiais de um determinado país",
        queryParams: [
          { name: "country", type: "string", required: true, defaultValue: "Brazil", description: "Nome do país para listagem (ex: Brazil, Germany, United States)" }
        ]
      }
    ],
    sampleResponse: [
      { 
        name: "Universidade Federal do Rio de Janeiro", 
        country: "Brazil", 
        alpha_two_code: "BR", 
        web_pages: ["http://www.ufrj.br/"] 
      },
      { 
        name: "Universidade de São Paulo", 
        country: "Brazil", 
        alpha_two_code: "BR", 
        web_pages: ["http://www.usp.br/"] 
      }
    ]
  },
  {
    id: "nationalize",
    name: "Preditor de Nacionalidade (Nationalize.io)",
    description: "API de inteligência estatística de probabilidade que adivinha o provável país de origem e nacionalidade de um indivíduo baseado no padrão de seu primeiro nome.",
    category: "Utilidades & Inteligência",
    url: "https://api.nationalize.io",
    docsUrl: "https://nationalize.io/",
    auth: "none",
    endpoints: [
      {
        path: "/",
        method: "GET",
        description: "Prever de qual país é o primeiro nome fornecido",
        queryParams: [
          { name: "name", type: "string", required: true, defaultValue: "guilherme", description: "Primeiro nome de teste para avaliar probabilidade de país" }
        ]
      }
    ],
    sampleResponse: {
      count: 35002,
      name: "guilherme",
      country: [
        { country_id: "BR", probability: 0.88 },
        { country_id: "PT", probability: 0.08 }
      ]
    }
  },
  {
    id: "swapi",
    name: "SWAPI (Universo de Star Wars)",
    description: "Consulte toda a saga Star Wars! Dados completos de personagens, naves, planetas e filmes clássicos catalogados em banco de dados de uso livre.",
    category: "Games & Entretenimento",
    url: "https://swapi.py4e.com/api",
    docsUrl: "https://swapi.py4e.com/",
    auth: "none",
    endpoints: [
      {
        path: "/people/1",
        method: "GET",
        description: "Carregar detalhes do personagem principal",
        queryParams: []
      }
    ],
    sampleResponse: {
      name: "Luke Skywalker",
      height: "172",
      mass: "77",
      hair_color: "blond",
      skin_color: "fair",
      eye_color: "blue",
      birth_year: "19BBY",
      gender: "male"
    }
  },
  {
    id: "spacex",
    name: "SpaceX API (Exploração Espacial)",
    description: "Pesquise os foguetes oficiais, tripulações e lançamentos de satélites em tempo real. Uma excelente API pública sem necessidade de login.",
    category: "Espaço & Ciência",
    url: "https://api.spacexdata.com/v4",
    docsUrl: "https://github.com/r-spacex/SpaceX-API",
    auth: "none",
    endpoints: [
      {
        path: "/launches/latest",
        method: "GET",
        description: "Obter detalhes do lançamento mais recente da SpaceX",
        queryParams: []
      }
    ],
    sampleResponse: {
      name: "Crew-8",
      flight_number: 198,
      date_utc: "2024-03-04T03:53:00.000Z",
      success: true,
      details: "Crew Dragon spacecraft carrying four crew members to the ISS.",
      links: {
        patch: {
          small: "https://images2.imgbox.com/3c/0e/96v69S3C_o.png"
        }
      }
    }
  },
  {
    id: "frankfurter",
    name: "Frankfurter (Câmbio & Conversão Monetária)",
    description: "API europeia super robusta para taxas de câmbio atualizadas em tempo real. Converta valores e consulte dados históricos de moedas oficiais gratuitamente.",
    category: "Finanças & Crypto",
    url: "https://api.frankfurter.dev/v1",
    docsUrl: "https://www.frankfurter.app/docs/",
    auth: "none",
    endpoints: [
      {
        path: "/latest",
        method: "GET",
        description: "Obter a cotação em tempo real das moedas mundiais com base no Dólar (USD) ou Euro (EUR)",
        queryParams: [
          { name: "base", type: "string", required: true, defaultValue: "USD", description: "Moeda de origem para conversão (ex: USD, EUR, GBP)" }
        ]
      }
    ],
    sampleResponse: {
      amount: 1.0,
      base: "USD",
      date: "2026-05-22",
      rates: {
        EUR: 0.9234,
        GBP: 0.7891,
        BRL: 5.1245,
        JPY: 156.42
      }
    }
  },
  {
    id: "dnd5e",
    name: "D&D 5e SRD (Monstros e Feitiços)",
    description: "API rica em conteúdo para RPG da 5ª edição de Dungeons & Dragons. Consulte classes, regras, feitiços e fichas completas de monstros.",
    category: "Games & Entretenimento",
    url: "https://www.dnd5eapi.co/api",
    docsUrl: "https://www.dnd5eapi.co/",
    auth: "none",
    endpoints: [
      {
        path: "/monsters/beholder",
        method: "GET",
        description: "Ver ficha completa do monstro icônico 'Beholder'",
        pathParams: [
          { name: "monster_index", type: "string", required: true, defaultValue: "beholder", description: "Índice do monstro a consultar (ex: beholder, adult-red-dragon, goblin)" }
        ]
      }
    ],
    sampleResponse: {
      index: "beholder",
      name: "Beholder",
      size: "Large",
      type: "aberration",
      alignment: "lawful evil",
      armor_class: [{ value: 18 }],
      hit_points: 180,
      strength: 10,
      dexterity: 14,
      constitution: 18
    }
  },
  {
    id: "disney",
    name: "Disney API (Animações & Personagens)",
    description: "Acesse informações sobre centenas de personagens da Disney clássica e contemporânea. Retorna listas de filmes, programas de TV e avatares.",
    category: "Games & Entretenimento",
    url: "https://api.disneyapi.dev",
    docsUrl: "https://disneyapi.dev/docs",
    auth: "none",
    endpoints: [
      {
        path: "/character",
        method: "GET",
        description: "Listar personagens da Disney cadastrados",
        queryParams: [
          { name: "pageSize", type: "number", required: false, defaultValue: "1", description: "Número de personagens retornados" }
        ]
      }
    ],
    sampleResponse: {
      info: { count: 7438, totalPages: 149 },
      data: {
        _id: 308,
        name: "Queen Elsa",
        films: ["Frozen", "Frozen II", "Olaf's Frozen Adventure"],
        shortFilms: ["Frozen Fever"],
        tvShows: ["Once Upon a Time"],
        imageUrl: "https://static.wikia.nocookie.net/disney/images/e/ef/Elsa_frozen_2_profile.png"
      }
    }
  },
  {
    id: "agify",
    name: "Estimador de Idade (Agify.io)",
    description: "API de inferência demográfica que adivinha a idade média estimada de uma pessoa baseado puramente no seu primeiro nome fornecido.",
    category: "Utilidades & Inteligência",
    url: "https://api.agify.io",
    docsUrl: "https://agify.io/",
    auth: "none",
    endpoints: [
      {
        path: "/",
        method: "GET",
        description: "Adivinhar idade típica pelo primeiro nome",
        queryParams: [
          { name: "name", type: "string", required: true, defaultValue: "maria", description: "Nome a estimar" }
        ]
      }
    ],
    sampleResponse: {
      count: 245012,
      name: "maria",
      age: 63
    }
  },
  {
    id: "openlibrary",
    name: "Open Library Book Search",
    description: "A maior base aberta e colaborativa de livros do mundo. Pesquise por títulos, autores, resumos e capas oficiais sem custos.",
    category: "Educação & Curiosidades",
    url: "https://openlibrary.org",
    docsUrl: "https://openlibrary.org/developers/api",
    auth: "none",
    endpoints: [
      {
        path: "/search.json",
        method: "GET",
        description: "Buscar livros, autores e edições por termo textual",
        queryParams: [
          { name: "title", type: "string", required: true, defaultValue: "The Lord of the Rings", description: "Título do livro de interesse" },
          { name: "limit", type: "number", required: false, defaultValue: "1", description: "Quantidade de resultados" }
        ]
      }
    ],
    sampleResponse: {
      numFound: 212,
      docs: [
        {
          title: "The Lord of the Rings",
          first_publish_year: 1954,
          author_name: ["J.R.R. Tolkien"],
          isbn: ["0141033576"],
          cover_i: 8408436
        }
      ]
    }
  },
  {
    id: "ipapi",
    name: "IPAPI (Geolocalização de IP)",
    description: "Obtenha detalhes instantâneos sobre a localização geográfica, fuso horário, cidade, país e provedor de internet de qualquer IP público do mundo.",
    category: "Utilidades & Inteligência",
    url: "https://ipapi.co",
    docsUrl: "https://ipapi.co/api/",
    auth: "none",
    endpoints: [
      {
        path: "/json",
        method: "GET",
        description: "Obter geolocalização detalhada em formato JSON do próprio IP visitante ou de um IP específico",
        queryParams: []
      }
    ],
    sampleResponse: {
      ip: "8.8.8.8",
      network: "8.8.8.0/24",
      version: "IPv4",
      city: "Mountain View",
      region: "California",
      country_name: "United States",
      postal: "94043",
      latitude: 37.4223,
      longitude: -122.0848,
      timezone: "America/Los_Angeles",
      org: "Google LLC"
    }
  },
  {
    id: "genderize",
    name: "Preditor de Gênero (Genderize.io)",
    description: "API de inferência estatística capaz de prever com altos níveis de certeza o provável gênero correspondente a um primeiro nome fornecido.",
    category: "Utilidades & Inteligência",
    url: "https://api.genderize.io",
    docsUrl: "https://genderize.io/",
    auth: "none",
    endpoints: [
      {
        path: "/",
        method: "GET",
        description: "Prever o gênero correspondente baseado em um nome próprio",
        queryParams: [
          { name: "name", type: "string", required: true, defaultValue: "guilherme", description: "Primeiro nome a ser testado na pesquisa estatística" }
        ]
      }
    ],
    sampleResponse: {
      count: 14034,
      name: "guilherme",
      gender: "male",
      probability: 0.99
    }
  },
  {
    id: "coincap",
    name: "Ativos e Cotações Cripto (CoinCap API)",
    description: "Obtenha listagens e cotações em tempo real de centenas de moedas criptográficas (Bitcoin, Ethereum, Solana, etc.), capitais de mercado e volumes de transações comerciais globais.",
    category: "Finanças & Crypto",
    url: "https://api.coincap.io/v2",
    docsUrl: "https://docs.coincap.io/",
    auth: "none",
    endpoints: [
      {
        path: "/assets",
        method: "GET",
        description: "Obter listagem e preços consolidados de ativos crypto ativos no mercado",
        queryParams: [
          { name: "limit", type: "number", required: false, defaultValue: "5", description: "Número de moedas de topo a retornar" }
        ]
      }
    ],
    sampleResponse: {
      data: [
        {
          id: "bitcoin",
          rank: "1",
          symbol: "BTC",
          name: "Bitcoin",
          supply: "19600000.0000000000000000",
          marketCapUsd: "1351125203901.40102039120000",
          priceUsd: "68923.4501290380120239"
        },
        {
          id: "ethereum",
          rank: "2",
          symbol: "ETH",
          name: "Ethereum",
          supply: "120000000.0000000000000000",
          marketCapUsd: "461029302194.50291029120000",
          priceUsd: "3812.5029102940120129"
        }
      ]
    }
  },
  {
    id: "zippopotam",
    name: "Busca de CEP Global (Zippopotam.us)",
    description: "Acesse informações postais rápidas e completas de CEPs de dezenas de países oficiais (Brasil, EUA, Canadá, Alemanha) retornando estados, cidades e coordenadas geográficas.",
    category: "Clima & Geografia",
    url: "https://api.zippopotam.us",
    docsUrl: "http://www.zippopotam.us/",
    auth: "none",
    endpoints: [
      {
        path: "/BR/01000-000",
        method: "GET",
        description: "Obter localização e endereço postal aproximado para um CEP brasileiro específico",
        pathParams: [
          { name: "country_and_zip", type: "string", required: true, defaultValue: "BR/01000-000", description: "Código internacional do país barra o código postal (ex: BR/01000-000, US/90210)" }
        ]
      }
    ],
    sampleResponse: {
      "post code": "01000-000",
      country: "Brazil",
      "country abbreviation": "BR",
      places: [
        {
          "place name": "São Paulo",
          longitude: "-46.633",
          state: "São Paulo",
          "state abbreviation": "SP",
          latitude: "-23.55"
        }
      ]
    }
  },
  {
    id: "uselessfacts",
    name: "Useless Facts (Fatos Perfeitas & Inúteis)",
    description: "API divertida que fornece fatos totalmente inúteis, porém comprovados e engraçados sobre animais, história, ciência e sociedade humana.",
    category: "Educação & Curiosidades",
    url: "https://uselessfacts.jsph.pl/api/v2",
    docsUrl: "https://uselessfacts.jsph.pl/",
    auth: "none",
    endpoints: [
      {
        path: "/facts/random",
        method: "GET",
        description: "Obter um fato inútil totalmente aleatório em inglês",
        queryParams: [
          { name: "language", type: "string", required: false, defaultValue: "en", description: "Suporte aos idiomas: en (Inglês) ou de (Alemão)" }
        ]
      }
    ],
    sampleResponse: {
      id: "9f1b9f62-1b15-4ba8-aaad-9debd55e7fc2",
      text: "A cat has 32 muscles in each ear, allowing them to rotate their ears like satellite dishes.",
      source: "djtech.net",
      source_url: "https://djtech.net/facts.html",
      language: "en"
    }
  },
  {
    id: "magicthegathering",
    name: "Magic: The Gathering (MTG Cards)",
    description: "Consulte cartas do jogo de cartas colecionáveis Magic: The Gathering. Detalhes de raridade, mana, subtipos, ilustrador e imagem.",
    category: "Games & Entretenimento",
    url: "https://api.magicthegathering.io/v1",
    docsUrl: "https://docs.magicthegathering.io/",
    auth: "none",
    endpoints: [
      {
        path: "/cards",
        method: "GET",
        description: "Pesquisar dezenas de cartas de Magic por filtro de termos",
        queryParams: [
          { name: "name", type: "string", required: true, defaultValue: "Black Lotus", description: "Nome parcial ou completo da carta MTG para consulta (ex: Black Lotus, Ancestral Recall)" }
        ]
      }
    ],
    sampleResponse: {
      cards: [
        {
          name: "Black Lotus",
          manaCost: "{0}",
          colors: [],
          type: "Artifact",
          rarity: "Special",
          text: "{T}, Sacrifice Black Lotus: Add three mana of any one color to your mana pool.",
          imageUrl: "https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=600&type=card"
        }
      ]
    }
  },
  {
    id: "ghibli",
    name: "Studio Ghibli (Filmes & Animações)",
    description: "Pesquise detalhes dos filmes clássicos do Studio Ghibli, como Meu Vizinho Totoro e A Viagem de Chihiro. Retorna diretores, lançamentos, sinopse e pontuação de crítica.",
    category: "Games & Entretenimento",
    url: "https://ghibliapi.vercel.app",
    docsUrl: "https://ghibliapi.vercel.app/",
    auth: "none",
    endpoints: [
      {
        path: "/films",
        method: "GET",
        description: "Listar todos os filmes clássicos do Studio Ghibli",
        queryParams: [
          { name: "limit", type: "number", required: false, defaultValue: "5", description: "Número de filmes para trazer" }
        ]
      }
    ],
    sampleResponse: [
      {
        id: "2baf70d1-42bb-4437-b551-e51d28717ba2",
        title: "Castle in the Sky",
        original_title: "天空の城ラピュタ",
        description: "The orphan Sheeta and her kidnapper Muska are flying in a military airship when... ",
        director: "Hayao Miyazaki",
        release_date: "1986",
        rt_score: "95",
        image: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/np0t4METSgY7v9vCQ98HgUs6f4y.jpg"
      }
    ]
  },
  {
    id: "opentdb",
    name: "Open Trivia DB (Perguntas de Quiz)",
    description: "API global e aberta para quizzes e jogos de perguntas e respostas. Obtenha perguntas de múltipla escolha com respostas corretas e incorretas em categorias de ciência, história, etc.",
    category: "Educação & Curiosidades",
    url: "https://opentdb.com/api.php",
    docsUrl: "https://opentdb.com/api_config.php",
    auth: "none",
    endpoints: [
      {
        path: "",
        method: "GET",
        description: "Obter perguntas de quiz aleatórias e configuradas",
        queryParams: [
          { name: "amount", type: "number", required: true, defaultValue: "1", description: "Quantidade de perguntas a obter de uma só vez" },
          { name: "category", type: "number", required: false, defaultValue: "18", description: "ID das categorias (ex: 18 para Informática, 9 para Geral, 15 para Videogames)" },
          { name: "difficulty", type: "string", required: false, defaultValue: "easy", description: "Dificuldade: easy, medium, hard" }
        ]
      }
    ],
    sampleResponse: {
      response_code: 0,
      results: [
        {
          category: "Science: Computers",
          type: "multiple",
          difficulty: "easy",
          question: "The series of books written by Mitchell Waite is associated with which operating system?",
          correct_answer: "MS-DOS",
          incorrect_answers: ["Windows", "Mac OS", "Linux"]
        }
      ]
    }
  },
  {
    id: "numbers",
    name: "Numbers API (Curiosidades de Números)",
    description: "Dê vida e humor aos seus números. Encontre fatos históricos, matemáticos e de datas para qualquer número real arbitrário inserido no sitema.",
    category: "Educação & Curiosidades",
    url: "http://numbersapi.com",
    docsUrl: "http://numbersapi.com/",
    auth: "none",
    endpoints: [
      {
        path: "/42/math",
        method: "GET",
        description: "Obter fato matemático de um número",
        queryParams: [
          { name: "json", type: "string", required: true, defaultValue: "true", description: "Sempre usar true para obter resposta estruturada em JSON" }
        ],
        pathParams: [
          { name: "number_and_type", type: "string", required: true, defaultValue: "42/math", description: "O número seguido do tipo de fato (ex: 42/math, 12/trivia, 5/25/date)" }
        ]
      }
    ],
    sampleResponse: {
      text: "42 is the 10th pronic number and the active ingredient in many household cleaners.",
      number: 42,
      found: true,
      type: "math"
    }
  },
  {
    id: "thecocktaildb",
    name: "The Cocktail DB (Drinks & Coqueteleiras)",
    description: "API de barman interativa. Pesquise por coquetéis, receitas, ingredientes, instruções detalhadas de como servir e imagens oficiais.",
    category: "Utilidades & Inteligência",
    url: "https://www.thecocktaildb.com/api/json/v1/1",
    docsUrl: "https://www.thecocktaildb.com/api.php",
    auth: "none",
    endpoints: [
      {
        path: "/search.php",
        method: "GET",
        description: "Pesquisar coqueteis por nome ou termo",
        queryParams: [
          { name: "s", type: "string", required: true, defaultValue: "margarita", description: "Nome do drink para pesquisar receitas" }
        ]
      }
    ],
    sampleResponse: {
      drinks: [
        {
          idDrink: "11007",
          strDrink: "Margarita",
          strCategory: "Ordinary Drink",
          strAlcoholic: "Alcoholic",
          strGlass: "Cocktail glass",
          strInstructions: "Rub the rim of the glass with the lime slice...",
          strDrinkThumb: "https://www.thecocktaildb.com/images/media/drink/5n76761563110331.jpg",
          strIngredient1: "Tequila",
          strIngredient2: "Triple sec",
          strIngredient3: "Lime juice"
        }
      ]
    }
  },
  {
    id: "hpapi",
    name: "Harry Potter Database (HP-API)",
    description: "Banco de dados completo da renomada saga de mágicos de Hogwarts. Detalhes de feitiços, varinhas mágicas, casas e todos os professores e alunos que existiram.",
    category: "Games & Entretenimento",
    url: "https://hp-api.onrender.com/api",
    docsUrl: "https://hp-api.onrender.com/",
    auth: "none",
    endpoints: [
      {
        path: "/characters",
        method: "GET",
        description: "Obter lista de personagens principais de Harry Potter",
        queryParams: []
      }
    ],
    sampleResponse: [
      {
        id: "9e39a530-cf17-4f08-9539-78a44048a049",
        name: "Harry Potter",
        alternate_names: ["The Boy Who Lived", "The Chosen One"],
        species: "human",
        gender: "male",
        house: "Gryffindor",
        dateOfBirth: "31-07-1980",
        wizard: true,
        ancestry: "half-blood",
        actor: "Daniel Radcliffe",
        image: "https://hp-api.onrender.com/images/harry.jpg"
      }
    ]
  },
  {
    id: "freetogame",
    name: "Free To Game (Banco de Jogos Grátis)",
    description: "API de jogos eletrônicos gratuitos. Obtenha listas de jogos Free-to-Play, com avaliações de gênero, desenvolvedor, plataformas e links rápidos de download.",
    category: "Games & Entretenimento",
    url: "https://www.freetogame.com/api",
    docsUrl: "https://www.freetogame.com/api-doc",
    auth: "none",
    endpoints: [
      {
        path: "/games",
        method: "GET",
        description: "Listar ou filtrar jogos gratuitos por plataforma ou categoria",
        queryParams: [
          { name: "platform", type: "string", required: true, defaultValue: "pc", description: "Plataforma de interesse (ex: pc ou browser)" }
        ]
      }
    ],
    sampleResponse: [
      {
        id: 540,
        title: "Overwatch 2",
        thumbnail: "https://www.freetogame.com/g/540/thumbnail.jpg",
        short_description: "A hero-focused team action game from Blizzard Entertainment.",
        game_url: "https://www.freetogame.com/open/overwatch-2",
        genre: "Shooter",
        platform: "PC (Windows)",
        publisher: "Activision Blizzard",
        developer: "Blizzard Entertainment",
        release_date: "2022-10-04"
      }
    ]
  },
  {
    id: "pokemon",
    name: "PokéAPI (Banco de Dados de Pokémon)",
    description: "Pesquise qualquer Pokémon por nome ou ID para obter estatísticas detalhadas, tipos, habilidades, altura, peso e a arte gráfica oficial (ilustração) de cada criatura.",
    category: "Games & Entretenimento",
    url: "https://pokeapi.co/api/v2",
    docsUrl: "https://pokeapi.co/",
    auth: "none",
    endpoints: [
      {
        path: "/pokemon/pikachu",
        method: "GET",
        description: "Obter ficha completa, habilidades e fotos oficiais de um Pokémon específico",
        pathParams: [
          { name: "pokemon_name_or_id", type: "string", required: true, defaultValue: "pikachu", description: "Nome em inglês (ex: pikachu, charizard) ou ID nacional do Pokémon" }
        ]
      }
    ],
    sampleResponse: {
      name: "pikachu",
      id: 25,
      height: 4,
      weight: 10,
      sprites: {
        other: {
          "official-artwork": {
            front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
          }
        }
      },
      types: [
        { type: { name: "electric" } }
      ]
    }
  },
  {
    id: "rickandmorty",
    name: "Rick & Morty API (Saga Interdimensional)",
    description: "Pesquise por centenas de personagens da aclamada série da Adult Swim. Obtenha tipo de espécie, status de vida, origem, planeta correspondente e foto oficial.",
    category: "Games & Entretenimento",
    url: "https://rickandmortyapi.com/api",
    docsUrl: "https://rickandmortyapi.com/",
    auth: "none",
    endpoints: [
      {
        path: "/character/1",
        method: "GET",
        description: "Obter ficha de personagem individual por ID numérico",
        pathParams: [
          { name: "character_id", type: "number", required: true, defaultValue: "1", description: "ID exato do personagem (ex: 1 para Rick Sanchez, 2 para Morty Smith)" }
        ]
      }
    ],
    sampleResponse: {
      id: 1,
      name: "Rick Sanchez",
      status: "Alive",
      species: "Human",
      type: "",
      gender: "Male",
      origin: { name: "Earth (C-137)" },
      image: "https://rickandmortyapi.com/api/character/avatar/1.jpeg"
    }
  },
  {
    id: "dogapi",
    name: "Dog CEO API (Fotos de Cachorrinhos)",
    description: "A maior e mais amigável API pública para fotos aleatórias de cachorros e pesquisa refinada por raças com fotos fofíssimas gratuitas.",
    category: "Utilidades & Inteligência",
    url: "https://dog.ceo/api",
    docsUrl: "https://dog.ceo/dog-api/",
    auth: "none",
    endpoints: [
      {
        path: "/breeds/image/random",
        method: "GET",
        description: "Obter uma imagem aleatória de cachorro de qualquer raça",
        queryParams: []
      }
    ],
    sampleResponse: {
      message: "https://images.dog.ceo/breeds/retriever-golden/n02099601_332.jpg",
      status: "success"
    }
  },
  {
    id: "catfacts",
    name: "Cat Facts (Curiosidades sobre Gatos)",
    description: "Retorne curiosidades de nível biológico, histórico e comportamental dos felinos domésticos mais queridos do mundo com essa API leve e livre.",
    category: "Educação & Curiosidades",
    url: "https://catfact.ninja",
    docsUrl: "https://catfact.ninja/",
    auth: "none",
    endpoints: [
      {
        path: "/fact",
        method: "GET",
        description: "Obter um fato curioso aleatório sobre gatos em inglês",
        queryParams: []
      }
    ],
    sampleResponse: {
      fact: "Cats have 30 teeth, while dogs have 42.",
      length: 37
    }
  },
  {
    id: "restcountries",
    name: "Rest Countries (Fichas de Países)",
    description: "API global e maravilhosa para pesquisar dados sobre qualquer nação do mundo: moedas, capitais, populações, fronteiras terrestres e bandeira em alta resolução.",
    category: "Clima & Geografia",
    url: "https://restcountries.com/v3.1",
    docsUrl: "https://restcountries.com/",
    auth: "none",
    endpoints: [
      {
        path: "/name/brazil",
        method: "GET",
        description: "Buscar detalhes estatísticos de qualquer país por nome de termo",
        pathParams: [
          { name: "country_name", type: "string", required: true, defaultValue: "brazil", description: "Nome do país em inglês ou correspondente local (ex: brazil, portugal, japan)" }
        ]
      }
    ],
    sampleResponse: [
      {
        name: { common: "Brazil", official: "Federative Republic of Brazil" },
        cca2: "BR",
        capital: ["Brasília"],
        region: "Americas",
        subregion: "South America",
        population: 212559409,
        flags: {
          png: "https://flagcdn.com/w320/br.png",
          alt: "The flag of Brazil has a green field and a large yellow diamond in the center..."
        }
      }
    ]
  },
  {
    id: "httpcat",
    name: "HTTP Cats (Status HTTP Representados por Gatos)",
    description: "Aprenda engenharia de redes de uma forma extremamente visual e divertida. Obtenha fotos oficiais de gatos ilustrando cada código de status HTTP do mundo.",
    category: "Desenvolvimento & Perfis",
    url: "https://http.cat",
    docsUrl: "https://http.cat/",
    auth: "none",
    endpoints: [
      {
        path: "/404",
        method: "GET",
        description: "Obter a ilustração correspondente de gatinho para um código de erro HTTP específico",
        pathParams: [
          { name: "status_code", type: "number", required: true, defaultValue: "404", description: "Código de status numérico válido (ex: 200, 400, 404, 500, 418)" }
        ]
      }
    ],
    sampleResponse: {
      imageUrl: "https://http.cat/404.jpg",
      status: 404,
      title: "Not Found"
    }
  },
  {
    id: "randomuser",
    name: "Random User Generator (Perfis Fictícios)",
    description: "Fabuloso gerador de perfis fictícios completos de usuários. Útil para mockar cadastros de clientes com nomes, fotos, e-mails, endereços e gêneros aleatórios de forma dinâmica.",
    category: "Utilidades & Prototipagem",
    url: "https://randomuser.me/api",
    docsUrl: "https://randomuser.me/",
    auth: "none",
    endpoints: [
      {
        path: "/",
        method: "GET",
        description: "Obter perfis de usuários fake estruturados com fotos e geolocalização fictícia",
        queryParams: [
          { name: "results", type: "number", required: false, defaultValue: "1", description: "Quantidade de registros de usuários a obter de uma só vez (ex: 1, 3, 5)" }
        ]
      }
    ],
    sampleResponse: {
      results: [
        {
          gender: "female",
          name: { title: "Ms", first: "Ana", last: "Silva" },
          email: "ana.silva@example.com",
          location: { city: "São Paulo", state: "São Paulo", country: "Brazil" },
          picture: { large: "https://randomuser.me/api/portraits/women/25.jpg" }
        }
      ]
    }
  },
  {
    id: "kitsu",
    name: "Kitsu (Catálogo de Anime & Mangá)",
    description: "Acesse uma biblioteca digital massiva de animes, mangás, estúdios nipônicos e franquias clássicas ou modernas com sinopses, pontuações de fãs e posters oficiais.",
    category: "Games & Entretenimento",
    url: "https://kitsu.io/api/edge",
    docsUrl: "https://kitsu.docs.apiary.io/",
    auth: "none",
    endpoints: [
      {
        path: "/anime",
        method: "GET",
        description: "Buscar animes por filtros textuais ou categorias específicas",
        queryParams: [
          { name: "filter[text]", type: "string", required: true, defaultValue: "naruto", description: "Nome ou pedaço do título do anime (ex: naruto, totoro, dragon ball)" }
        ]
      }
    ],
    sampleResponse: {
      data: [
        {
          id: "11",
          type: "anime",
          attributes: {
            canonicalTitle: "Naruto",
            synopsis: "Moments prior to Naruto Uzumaki's birth, a huge demon known as the Kyuubi, the Nine-Tailed Fox...",
            averageRating: "78.3",
            posterImage: {
              tiny: "https://media.kitsu.io/anime/poster_images/11/tiny.jpg",
              small: "https://media.kitsu.io/anime/poster_images/11/small.jpg"
            }
          }
        }
      ]
    }
  },
  {
    id: "openbrewery",
    name: "Open Brewery DB (Cervejarias Globais)",
    description: "API de mapeamento mundial para cervejarias artesanais, micro-cervejarias, pubs cervejeiros e marcas independentes de bebidas por cidade e tipo.",
    category: "Clima & Geografia",
    url: "https://api.openbrewerydb.org/v1",
    docsUrl: "https://www.openbrewerydb.org/",
    auth: "none",
    endpoints: [
      {
        path: "/breweries",
        method: "GET",
        description: "Listar ou filtrar cervejarias por cidades globais ou nomes",
        queryParams: [
          { name: "by_city", type: "string", required: true, defaultValue: "san_diego", description: "Nome da cidade em inglês para filtragem (ex: san_diego, new_york)" },
          { name: "per_page", type: "number", required: false, defaultValue: "3", description: "Limite de registros a retornar" }
        ]
      }
    ],
    sampleResponse: [
      {
        id: "5128df48-79fc-4f0f-8b52-d055419405d4",
        name: "10 Barrel Brewing Co",
        brewery_type: "large",
        city: "San Diego",
        state_province: "California",
        country: "United States",
        website_url: "http://10barrel.com"
      }
    ]
  },
  {
    id: "fruityvice",
    name: "Fruityvice (Valores Nutricionais de Frutas)",
    description: "API completa e científica de frutas e nutrição. Obtenha calorias, gorduras brutas, carboidratos, açúcar, proteínas e classificação biológica de frutas.",
    category: "Educação & Curiosidades",
    url: "https://www.fruityvice.com/api/fruit",
    docsUrl: "https://www.fruityvice.com/",
    auth: "none",
    endpoints: [
      {
        path: "/banana",
        method: "GET",
        description: "Obter a descrição nutricional de uma fruta específica na rota",
        pathParams: [
          { name: "fruit_name", type: "string", required: true, defaultValue: "banana", description: "Nome em inglês da fruta a ser pesquisada (ex: banana, apple, watermelon, strawberry)" }
        ]
      }
    ],
    sampleResponse: {
      name: "Banana",
      id: 21,
      family: "Musaceae",
      order: "Zingiberales",
      nutritions: {
        carbohydrates: 22,
        protein: 1,
        fat: 0.2,
        calories: 96,
        sugar: 17.2
      }
    }
  },
  {
    id: "zenquotes",
    name: "ZenQuotes (Frases de Filosofia & Vida)",
    description: "Incorpore doses de inspiração, sabedoria de vida e pensamentos motivacionais diários proferidos pelos maiores pensadores e intelectuais da história da humanidade.",
    category: "Educação & Curiosidades",
    url: "https://zenquotes.io/api",
    docsUrl: "https://zenquotes.io/",
    auth: "none",
    endpoints: [
      {
        path: "/random",
        method: "GET",
        description: "Obter uma citação filosófica aleatória estruturada",
        queryParams: []
      }
    ],
    sampleResponse: [
      {
        q: "The only true wisdom is in knowing you know nothing.",
        a: "Socrates",
        h: "<blockquote>&ldquo;The only true wisdom is in knowing you know nothing.&rdquo; &mdash; <cite>Socrates</cite></blockquote>"
      }
    ]
  },
  {
    id: "baconipsum",
    name: "Bacon Ipsum (Placeholder Gourmet)",
    description: "Gerador divertido de textos de placeholder ricos em carnes frias, pratos e temperos culinários de forma estruturada. Perfeito para preencher telas com bom humor.",
    category: "Utilidades & Prototipagem",
    url: "https://baconipsum.com/api",
    docsUrl: "https://baconipsum.com/json-api/",
    auth: "none",
    endpoints: [
      {
        path: "",
        method: "GET",
        description: "Gerar parágrafos de texto culinário fictício",
        queryParams: [
          { name: "type", type: "string", required: true, defaultValue: "all-meat", description: "Estilo do texto (all-meat ou meat-and-filler)" },
          { name: "paras", type: "number", required: true, defaultValue: "2", description: "Total de parágrafos" }
        ]
      }
    ],
    sampleResponse: [
      "Bacon ipsum dolor amet fatback bresaola tail jerky short loin salami beef ribs drumstick. Ribeye turkey tongue frankfurter shank pork belly.",
      "Tenderloin flank shank ham loin bacon short ribs short loin. Salami turkey tongue tail landjaeger pancetta brisket shoulder cow pig boudin flank."
    ]
  }
];

function buildLocalSearchFallback(query: string) {
  const combinedList = getCombinedCatalogApis();
  const lowerQuery = query.toLowerCase();
  const matchedApis = combinedList.filter(api =>
    api.name.toLowerCase().includes(lowerQuery) ||
    api.description.toLowerCase().includes(lowerQuery) ||
    api.category.toLowerCase().includes(lowerQuery) ||
    // simple typo allowances
    (lowerQuery.includes("clim") && api.id === "open-meteo") ||
    (lowerQuery.includes("temp") && api.id === "open-meteo") ||
    (lowerQuery.includes("pok") && api.id === "pokeapi") ||
    (lowerQuery.includes("mort") && api.id === "rickandmorty") ||
    (lowerQuery.includes("vo") && api.id === "voicerss") ||
    (lowerQuery.includes("fala") && api.id === "voicerss") ||
    (lowerQuery.includes("ca") && api.id === "dogapi") ||
    (lowerQuery.includes("cao") && api.id === "dogapi") ||
    (lowerQuery.includes("cons") && api.id === "adviceslip")
  );

  return {
    correctedQuery: query,
    explanation: `Exibindo sugestões de API baseadas em nossa base de inteligência local para: "${query}".`,
    apis: matchedApis.length > 0 ? matchedApis : combinedList.slice(0, 4),
    isFallback: true
  };
}

// Helper: safe search grounding with backup in case Google Search quota or limits are reached
async function searchApisWithGoogle(query: string) {
  if (!ai) {
    return buildLocalSearchFallback(query);
  }

  try {
    const prompt = `O usuário está querendo encontrar uma API gratuita na internet ou no GitHub que corresponda à seguinte busca (mesmo se contiver erros de caligrafia ou gramática em português, entenda a real intenção): "${query}".
Use a sua inteligência de busca para encontrar as melhores APIs gratuitas da web e do GitHub para o usuário. 
Exemplos de APIs reais que você deve encontrar na busca com as URLs atualizadas se corresponderem ao tema:
- Clima (Open-Meteo): "https://api.open-meteo.com/v1"
- Pokémon: "https://pokeapi.co/api/v2"
- Rick & Morty: "https://rickandmortyapi.com/api"
- Star Wars (SWAPI): "https://swapi.dev/api"
- Clima (Open-Meteo): "https://api.open-meteo.com/v1"
- Livros (Open Library): "https://openlibrary.org"
- Imagens de Cães (Dog CEO): "https://dog.ceo/api"
- Imagens de Gatos (TheCatAPI): "https://api.thecatapi.com/v1"
- Países (Rest Countries): "https://restcountries.com/v3.1"
- Piadas (JokeAPI): "https://v2.jokeapi.dev"
- Text to Speech (VoiceRSS): "https://api.voicerss.org"

Identifique e forneça:
1. O nome exato da API.
2. Uma excelente descrição estruturada em Português.
3. A URL Base atual e real da API (onde podemos de fato fazer requisições). Certifique-se de que a URL é real!
4. Um link de documentação oficial, GitHub ou site.
5. De 1 a 3 endpoints de teste funcionais com descrições em português. Defina parâmetros fictícios/reais úteis para o usuário testar de forma interativa. Se um parâmetro de rota contiver ':' ou for dinâmico, defina um valor padrão e passe no pathParams do JSON.
6. Se precisa de chave/Token (apiKey) para acessar, colocando 'none' se for pública e acessível sem chaves.

Retorne em formato estritamente estruturado JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedQuery: { type: Type.STRING, description: "A busca tratada, arrumando erros de português ou digitação (ex: 'api iugioh' vira 'API de cartas Yu-Gi-Oh')." },
            explanation: { type: Type.STRING, description: "Breve explicação em português sobre as APIs gratuitas encontradas e como elas se aplicam à necessidade do usuário." },
            apis: {
              type: Type.ARRAY,
              description: "Lista de 3 a 5 APIs públicas reais encontradas para resolver o pedido.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "ID kebab-case simplificado como 'yugioh-db'" },
                  name: { type: Type.STRING, description: "Nome correto e amigável da API" },
                  description: { type: Type.STRING, description: "O que a API faz e o que ela resolve para o usuário" },
                  category: { type: Type.STRING, description: "Categoria ou nicho (ex: Jogos, Voz, Utilitários, etc)" },
                  url: { type: Type.STRING, description: "A URL real e operacional de base da API (ex: https://db.ygoprodeck.com/api/v7)" },
                  docsUrl: { type: Type.STRING, description: "Link da página oficial ou repositório de documentação." },
                  auth: { type: Type.STRING, description: "Insira 'none' se for pública sem auth necessária, ou 'apiKey' se for necessário chave." },
                  sampleResponse: { type: Type.OBJECT, description: "Um mini payload JSON de exemplo realista do que esta de fato dentro da API quando respondida com sucesso." },
                  endpoints: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        path: { type: Type.STRING, description: "O caminho relativo ao endpoint (ex: '/cardinfo.php' ou '/v1/breeds')" },
                        method: { type: Type.STRING, description: "Método HTTP recomendando, ex: 'GET'" },
                        description: { type: Type.STRING, description: "Uma explicação em português do que este endpoint retorna" },
                        queryParams: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              type: { type: Type.STRING, description: "string, number, ou boolean" },
                              required: { type: Type.BOOLEAN },
                              defaultValue: { type: Type.STRING },
                              description: { type: Type.STRING }
                            },
                            required: ["name", "type", "required", "description"]
                          }
                        },
                        pathParams: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              type: { type: Type.STRING },
                              required: { type: Type.BOOLEAN },
                              defaultValue: { type: Type.STRING },
                              description: { type: Type.STRING }
                            },
                            required: ["name", "type", "required", "description"]
                          }
                        }
                      },
                      required: ["path", "method", "description"]
                    }
                  }
                },
                required: ["id", "name", "description", "category", "url", "docsUrl", "endpoints", "auth"]
              }
            }
          },
          required: ["correctedQuery", "explanation", "apis"]
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText.trim());
  } catch (error) {
    console.error("Erro na busca do Gemini, usando fallback de busca inteligente:", error);
    return buildLocalSearchFallback(query);
  }
}

// --- DYNAMIC STORAGE (LOCAL FILE IN SECRET FOLDER) ---
const SECRET_STORE_DIR = path.join(process.cwd(), ".site-secret");
const DYNAMIC_APIS_PATH = path.join(SECRET_STORE_DIR, "collected_apis.json");
const LEGACY_DYNAMIC_APIS_PATH = path.join(process.cwd(), "collected_apis.json");
const API_BLOCKLIST_PATH = path.join(SECRET_STORE_DIR, "api_blocklist.json");
const API_HEALTH_STATE_PATH = path.join(SECRET_STORE_DIR, "api_health_state.json");

type ApiBlockSource = "auto-proxy" | "bulk-audit" | "manual";

interface ApiBlockEntry {
  apiId: string;
  host?: string;
  blockedAt: string;
  reason: string;
  source: ApiBlockSource;
  status?: number;
  lastUrl?: string;
}

interface ApiHealthEntry {
  apiId: string;
  failStreak: number;
  totalFails: number;
  totalSuccess: number;
  lastStatus?: number;
  lastCheckedAt?: string;
  lastUrl?: string;
  blocked?: boolean;
}

let DYNAMIC_APIs: any[] = [];
let API_BLOCKLIST: Record<string, ApiBlockEntry> = {};
let API_HEALTH_STATE: Record<string, ApiHealthEntry> = {};

function ensureSecretStore() {
  if (!fs.existsSync(SECRET_STORE_DIR)) {
    fs.mkdirSync(SECRET_STORE_DIR, { recursive: true });
  }
}

function migrateLegacyStoreIfNeeded() {
  try {
    ensureSecretStore();
    if (!fs.existsSync(DYNAMIC_APIS_PATH) && fs.existsSync(LEGACY_DYNAMIC_APIS_PATH)) {
      fs.copyFileSync(LEGACY_DYNAMIC_APIS_PATH, DYNAMIC_APIS_PATH);
      console.log(`[Storage] Migração concluída para pasta secreta: ${DYNAMIC_APIS_PATH}`);
    }
  } catch (err) {
    console.error("[Storage] Erro ao migrar store legado:", err);
  }
}

function loadDynamicApis() {
  try {
    migrateLegacyStoreIfNeeded();
    if (fs.existsSync(DYNAMIC_APIS_PATH)) {
      const content = fs.readFileSync(DYNAMIC_APIS_PATH, "utf-8");
      DYNAMIC_APIs = JSON.parse(content);
      console.log(`[Storage] Carregadas ${DYNAMIC_APIs.length} APIs da pasta secreta local.`);
    }
  } catch (err) {
    console.error("[Storage] Erro ao carregar APIs da pasta secreta:", err);
  }
}

function saveDynamicApis() {
  try {
    ensureSecretStore();
    fs.writeFileSync(DYNAMIC_APIS_PATH, JSON.stringify(DYNAMIC_APIs, null, 2), "utf-8");
    console.log(`[Storage] Catálogo local atualizado em ${DYNAMIC_APIS_PATH}.`);
  } catch (err) {
    console.error("[Storage] Erro ao gravar APIs na pasta secreta:", err);
  }
}

function loadApiBlocklist() {
  try {
    ensureSecretStore();
    if (fs.existsSync(API_BLOCKLIST_PATH)) {
      const content = fs.readFileSync(API_BLOCKLIST_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        API_BLOCKLIST = parsed;
        console.log(`[Storage] Blocklist carregada com ${Object.keys(API_BLOCKLIST).length} API(s) bloqueada(s).`);
      }
    }
  } catch (err) {
    console.error("[Storage] Erro ao carregar blocklist:", err);
  }
}

function saveApiBlocklist() {
  try {
    ensureSecretStore();
    fs.writeFileSync(API_BLOCKLIST_PATH, JSON.stringify(API_BLOCKLIST, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Erro ao salvar blocklist:", err);
  }
}

function loadApiHealthState() {
  try {
    ensureSecretStore();
    if (fs.existsSync(API_HEALTH_STATE_PATH)) {
      const content = fs.readFileSync(API_HEALTH_STATE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        API_HEALTH_STATE = parsed;
      }
    }
  } catch (err) {
    console.error("[Storage] Erro ao carregar histórico de saúde:", err);
  }
}

function saveApiHealthState() {
  try {
    ensureSecretStore();
    fs.writeFileSync(API_HEALTH_STATE_PATH, JSON.stringify(API_HEALTH_STATE, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Erro ao salvar histórico de saúde:", err);
  }
}

function normalizeHostFromUrl(rawUrl?: string) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function getCombinedCatalogApis() {
  const blockedHosts = new Set(
    Object.values(API_BLOCKLIST)
      .map((entry) => entry.host || "")
      .filter(Boolean)
  );

  const combined = [...DYNAMIC_APIs, ...VERIFIED_APIs];
  return combined.filter((api) => {
    if (!api || !api.id) return false;
    if (API_BLOCKLIST[api.id]) return false;
    const host = normalizeHostFromUrl(api.url);
    if (host && blockedHosts.has(host)) return false;
    return true;
  });
}

function filterOutBlockedApis(list: any[]) {
  const blockedHosts = new Set(
    Object.values(API_BLOCKLIST)
      .map((entry) => entry.host || "")
      .filter(Boolean)
  );

  return (Array.isArray(list) ? list : []).filter((api) => {
    if (!api || !api.id) return false;
    if (API_BLOCKLIST[api.id]) return false;
    const host = normalizeHostFromUrl(api.url);
    if (host && blockedHosts.has(host)) return false;
    return true;
  });
}

function markApiBlocked(apiId: string, reason: string, source: ApiBlockSource, status?: number, lastUrl?: string) {
  if (!apiId) return;

  const foundApi = [...DYNAMIC_APIs, ...VERIFIED_APIs].find((api) => api.id === apiId);
  const host = normalizeHostFromUrl(foundApi?.url || lastUrl);

  API_BLOCKLIST[apiId] = {
    apiId,
    host: host || undefined,
    blockedAt: new Date().toISOString(),
    reason,
    source,
    status,
    lastUrl
  };

  const dynamicBefore = DYNAMIC_APIs.length;
  DYNAMIC_APIs = DYNAMIC_APIs.filter((api) => api.id !== apiId);
  if (DYNAMIC_APIs.length !== dynamicBefore) {
    saveDynamicApis();
  }

  API_HEALTH_STATE[apiId] = {
    ...(API_HEALTH_STATE[apiId] || {
      apiId,
      failStreak: 0,
      totalFails: 0,
      totalSuccess: 0
    }),
    blocked: true,
    lastStatus: status,
    lastCheckedAt: new Date().toISOString(),
    lastUrl
  };

  saveApiBlocklist();
  saveApiHealthState();
  console.warn(`[Health] API bloqueada automaticamente: ${apiId} (${reason})`);
}

function shouldAutoBlockFromStatus(status: number, failStreak: number) {
  if (status === 401 || status === 403) return failStreak >= 2;
  if (status === 404 || status === 410) return failStreak >= 3;
  if (status >= 500) return failStreak >= 5;
  return false;
}

function recordProxyHealthObservation(params: {
  apiId?: string;
  status?: number;
  ok?: boolean;
  url?: string;
}) {
  const { apiId, status, ok, url } = params;
  if (!apiId || typeof apiId !== "string") return;
  if (API_BLOCKLIST[apiId]) return;

  const current = API_HEALTH_STATE[apiId] || {
    apiId,
    failStreak: 0,
    totalFails: 0,
    totalSuccess: 0
  };

  const nowIso = new Date().toISOString();
  const hasSuccess = !!ok && typeof status === "number" && status >= 200 && status < 400;

  if (hasSuccess) {
    current.failStreak = 0;
    current.totalSuccess += 1;
  } else {
    current.failStreak += 1;
    current.totalFails += 1;
  }

  current.lastStatus = status;
  current.lastCheckedAt = nowIso;
  current.lastUrl = url;
  API_HEALTH_STATE[apiId] = current;
  saveApiHealthState();

  if (!hasSuccess && typeof status === "number" && shouldAutoBlockFromStatus(status, current.failStreak)) {
    const reason = `Falha recorrente detectada (HTTP ${status}, sequência ${current.failStreak})`;
    markApiBlocked(apiId, reason, "auto-proxy", status, url);
  }
}

function buildTestUrlForApi(api: any) {
  const endpoint = api?.endpoints?.[0];
  if (!endpoint) return api?.url || "";

  let pathPart = String(endpoint.path || "");
  if (!pathPart.startsWith("/")) {
    pathPart = `/${pathPart}`;
  }

  if (Array.isArray(endpoint.pathParams)) {
    for (const param of endpoint.pathParams) {
      const fallback = encodeURIComponent(param?.defaultValue || "1");
      pathPart = pathPart.replace(`:${param.name}`, fallback);
    }
  }

  const query = new URLSearchParams();
  if (Array.isArray(endpoint.queryParams)) {
    for (const p of endpoint.queryParams) {
      if (p?.defaultValue !== undefined && p?.defaultValue !== null && String(p.defaultValue).trim() !== "") {
        query.set(String(p.name), String(p.defaultValue));
      } else if (p?.required) {
        query.set(String(p.name), "1");
      }
    }
  }

  const queryString = query.toString();
  return `${api.url}${pathPart}${queryString ? `?${queryString}` : ""}`;
}

async function runBulkCatalogAudit(options?: { limit?: number; sampleOnly?: boolean }) {
  const catalog = getCombinedCatalogApis();
  const limit = options?.limit && options.limit > 0 ? options.limit : catalog.length;
  const sampleOnly = !!options?.sampleOnly;
  const targets = catalog.slice(0, limit);

  const report: any[] = [];
  let blockedCount = 0;
  const startedAt = Date.now();

  for (const api of targets) {
    const testUrl = buildTestUrlForApi(api);
    const method = api?.endpoints?.[0]?.method || "GET";

    let status = 0;
    let ok = false;
    let errorMessage = "";
    let dataPreview: any = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(testUrl, {
        method,
        headers: {
          "Accept": "application/json, text/plain, */*",
          "User-Agent": "API-Pirate-Bulk-Audit/1.0"
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      status = response.status;
      ok = response.ok;

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        dataPreview = data && typeof data === "object"
          ? Object.keys(data).slice(0, 10)
          : data;
      } else {
        const text = await response.text();
        dataPreview = text.slice(0, 140);
      }

      if ((status === 401 || status === 403 || status === 404 || status === 410) && !sampleOnly) {
        markApiBlocked(
          api.id,
          `Audit em lote detectou API indisponível/fechada (HTTP ${status})`,
          "bulk-audit",
          status,
          testUrl
        );
        blockedCount += 1;
      }
    } catch (err: any) {
      errorMessage = err?.name === "AbortError"
        ? "timeout"
        : (err?.message || "network_error");

      if (!sampleOnly) {
        const rec: ApiHealthEntry = API_HEALTH_STATE[api.id] || {
          apiId: api.id,
          failStreak: 0,
          totalFails: 0,
          totalSuccess: 0
        };
        rec.failStreak += 1;
        rec.totalFails += 1;
        rec.lastCheckedAt = new Date().toISOString();
        rec.lastUrl = testUrl;
        rec.lastStatus = 0;
        API_HEALTH_STATE[api.id] = rec;
        saveApiHealthState();
      }
    }

    report.push({
      apiId: api.id,
      apiName: api.name,
      status,
      ok,
      testUrl,
      preview: dataPreview,
      error: errorMessage
    });
  }

  return {
    audited: targets.length,
    blocked: blockedCount,
    sampleOnly,
    durationMs: Date.now() - startedAt,
    report
  };
}

// Initial hydration
loadDynamicApis();
loadApiBlocklist();
loadApiHealthState();

// ENDPOINT: COLLECT AUTOMATICALLY & TEST CUSTOM API
app.post("/api/collect", async (req, res) => {
  let { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ ok: false, message: "A URL do endpoint de teste é obrigatória." });
  }

  url = url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  try {
    const allApis = getCombinedCatalogApis();
    
    // Check duplication
    const alreadyExists = allApis.some(api => {
      try {
        const u1 = new URL(api.url).hostname.replace("www.", "").toLowerCase();
        const u2 = new URL(url).hostname.replace("www.", "").toLowerCase();
        return u1 === u2;
      } catch {
        return api.url.toLowerCase() === url.toLowerCase();
      }
    });

    if (alreadyExists) {
      return res.json({
        ok: true,
        alreadyCovered: true,
        message: "Esta API (ou domínio) já está indexada em nossas bases e pronta para ser consultada no buscador principal!"
      });
    }

    // Connect to test url
    const requestStartTime = Date.now();
    const testResponse = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "API-Pirate-Collector/1.0"
      }
    });

    const durationMs = Date.now() - requestStartTime;

    if (!testResponse.ok) {
      return res.json({
        ok: false,
        message: `Não foi possível mapear a API. O servidor remoto respondeu com status HTTP de erro: ${testResponse.status} (${testResponse.statusText}).`
      });
    }

    const contentType = testResponse.headers.get("content-type") || "";
    let responseData: any = null;

    if (contentType.includes("application/json")) {
      responseData = await testResponse.json();
    } else {
      const rawText = await testResponse.text();
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = rawText;
      }
    }

    // Mandatory Rule: "Se não tiver nada, ou se tiver zero coisas, ou se tiver apenas uma, a gente ignora. Se for uma API que tem bastante dados, a gente salva."
    let isValidData = false;
    let itemsCount = 0;

    if (responseData !== null && responseData !== undefined) {
      if (Array.isArray(responseData)) {
        itemsCount = responseData.length;
        if (itemsCount > 1) {
          isValidData = true;
        }
      } else if (typeof responseData === "object") {
        const keys = Object.keys(responseData);
        itemsCount = keys.length;

        let maxNestedListLen = 0;
        for (const k of keys) {
          if (Array.isArray(responseData[k])) {
            maxNestedListLen = Math.max(maxNestedListLen, responseData[k].length);
          }
        }

        if (itemsCount > 1 || maxNestedListLen > 1) {
          isValidData = true;
          itemsCount = Math.max(itemsCount, maxNestedListLen);
        }
      } else if (typeof responseData === "string" && responseData.trim().length > 30) {
        isValidData = true;
        itemsCount = 3; 
      }
    }

    if (!isValidData) {
      return res.json({
        ok: false,
        message: `A API respondeu com status OK [Sucesso], porém ela se encontra sem dados substanciais (encontrou apenas ${itemsCount} elemento/propriedade). Conforme a política de coleta automatizada, ela foi ignorada.`
      });
    }

    // Structuring API dynamic config block via Gemini intelligence
    let parsedApiBlock: any = null;
    const cleanUrl = url.split("?")[0];
    const cleanUrlObj = new URL(url);

    try {
      if (!ai) {
        throw new Error("Gemini indisponível (GEMINI_API_KEY ausente).");
      }

      const gPrompt = `Você é um Analisador de APIs Inteligente. Recebemos uma requisição com sucesso na URL: "${cleanUrl}"
O payload JSON de resposta recebido da API foi:
${JSON.stringify(typeof responseData === 'object' ? responseData : { text: responseData }).slice(0, 1600)}

Com base nisso, gere um bloco JSON de catalogação completo em Português para adicionarmos essa nova API à nossa biblioteca.
Siga RIGOROSAMENTE a seguinte especificação de tipos em JSON:
{
  "id": "slug-id-unico-kebab-case",
  "name": "Nome elegante da API em Português",
  "description": "Uma descrição curta, amigável para leigos, de até duas linhas explicando o que a API oferece em Português",
  "category": "Escolha uma categoria (Ex: Jogos, Finanças, Clima, Saúde, Educação, Entretenimento ou Utilidades)",
  "url": "A url raiz ou de host da API, ex: '${cleanUrlObj.protocol}//${cleanUrlObj.hostname}'",
  "docsUrl": "URL de documentação ou o site raiz, ex: '${cleanUrlObj.protocol}//${cleanUrlObj.hostname}'",
  "auth": "none",
  "endpoints": [
    {
      "path": "A rota complementar testada, ex: '${cleanUrlObj.pathname}'",
      "method": "GET",
      "description": "Explicação curta em português do que este endpoint retorna",
      "queryParams": [],
      "pathParams": []
    }
  ],
  "sampleResponse": (insira o próprio JSON recebido de resposta ou até no máximo 10 campos dele)
}

Retorne unicamente o JSON válido, sem markdown ou caracteres extras de código.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: gPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = aiResponse.text || "{}";
      parsedApiBlock = JSON.parse(responseText.trim());
    } catch (aiErr) {
      console.warn("Falha no parse via Gemini na coleta, aplicando template estrutural de segurança:", aiErr);
      
      const hostParts = cleanUrlObj.hostname.split(".");
      const coreDomain = hostParts[hostParts.length - 2] || "api-site";
      const formattedName = coreDomain.charAt(0).toUpperCase() + coreDomain.slice(1) + " (Coletada)";

      parsedApiBlock = {
        id: `${coreDomain.toLowerCase()}-${Date.now().toString().slice(-4)}`,
        name: formattedName,
        description: `API indexada de maneira automatizada pelo Pirate Index a partir do host remoto: ${cleanUrlObj.hostname}. Disponibiliza recursos sem obrigatoriedade de chaves.`,
        category: "Utilidades & Prototipagem",
        url: `${cleanUrlObj.protocol}//${cleanUrlObj.hostname}`,
        docsUrl: `${cleanUrlObj.protocol}//${cleanUrlObj.hostname}`,
        auth: "none",
        endpoints: [
          {
            path: cleanUrlObj.pathname + cleanUrlObj.search,
            method: "GET",
            description: "Consultar rota dinâmica de dados catalogada",
            queryParams: [],
            pathParams: []
          }
        ],
        sampleResponse: typeof responseData === 'object' ? responseData : { data: responseData }
      };
    }

    if (parsedApiBlock) {
      // Avoid identical ID duplicate
      const hasClash = allApis.some(api => api.id === parsedApiBlock.id);
      if (hasClash) {
        parsedApiBlock.id = `${parsedApiBlock.id}-${Date.now().toString().slice(-3)}`;
      }

      const parsedHost = normalizeHostFromUrl(parsedApiBlock.url || url);
      let unblockedAny = false;
      for (const [blockedId, blockedEntry] of Object.entries(API_BLOCKLIST)) {
        const sameId = blockedId === parsedApiBlock.id;
        const sameHost = !!parsedHost && blockedEntry.host === parsedHost;
        if (sameId || sameHost) {
          delete API_BLOCKLIST[blockedId];
          if (API_HEALTH_STATE[blockedId]) {
            API_HEALTH_STATE[blockedId].blocked = false;
            API_HEALTH_STATE[blockedId].failStreak = 0;
          }
          unblockedAny = true;
        }
      }
      if (unblockedAny) {
        saveApiBlocklist();
        saveApiHealthState();
      }

      DYNAMIC_APIs.unshift(parsedApiBlock);
      saveDynamicApis();

      return res.json({
        ok: true,
        saved: true,
        api: parsedApiBlock,
        message: `Sucesso! A API '${parsedApiBlock.name}' foi validada pelo analisador e adicionada ao acervo global de forma permanente!`
      });
    }

    throw new Error("Não foi possível formatar o bloco.");
  } catch (err: any) {
    return res.json({
      ok: false,
      message: `Erro ao tentar conectar à URL da API: ${err.message || "Servidor offline ou endereço incompleto. Insira um link válido."}`
    });
  }
});

app.get("/api/admin/blocked", (req, res) => {
  const entries = Object.values(API_BLOCKLIST).sort((a, b) => b.blockedAt.localeCompare(a.blockedAt));
  res.json({
    totalBlocked: entries.length,
    blocked: entries
  });
});

app.post("/api/admin/unblock", (req, res) => {
  const { apiId } = req.body || {};
  if (!apiId || typeof apiId !== "string") {
    return res.status(400).json({ ok: false, message: "apiId é obrigatório." });
  }

  if (!API_BLOCKLIST[apiId]) {
    return res.status(404).json({ ok: false, message: "API não está bloqueada." });
  }

  delete API_BLOCKLIST[apiId];
  if (API_HEALTH_STATE[apiId]) {
    API_HEALTH_STATE[apiId].blocked = false;
    API_HEALTH_STATE[apiId].failStreak = 0;
  }
  saveApiBlocklist();
  saveApiHealthState();

  return res.json({ ok: true, message: `API ${apiId} removida da blocklist.` });
});

app.post("/api/admin/audit", async (req, res) => {
  const { limit, sampleOnly = false } = req.body || {};
  const safeLimit = typeof limit === "number" && limit > 0 ? Math.min(limit, 2000) : undefined;

  try {
    const result = await runBulkCatalogAudit({
      limit: safeLimit,
      sampleOnly: !!sampleOnly
    });

    return res.json({
      ok: true,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Falha inesperada na auditoria."
    });
  }
});

// ENDPOINT: SEARCH OVERRIDE WITH DYNAMIC API INTEGRATION
app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  const combinedList = getCombinedCatalogApis();
  if (!query || typeof query !== "string") {
    return res.status(200).json({
      correctedQuery: "",
      explanation: "Procure as APIs cadastradas no Pirate Index ou adicione as suas.",
      apis: combinedList
    });
  }

  const result = await searchApisWithGoogle(query);
  if (Array.isArray(result?.apis)) {
    result.apis = filterOutBlockedApis(result.apis);
  }
  res.json(result);
});

// ENDPOINT: SEED DEFAULT SUGGESTIONS
app.get("/api/defaults", (req, res) => {
  const combinedList = getCombinedCatalogApis();
  res.json({
    correctedQuery: "Sugestões Populares",
    explanation: "Selecione uma destas APIs públicas para começar a explorar e testar imediatamente na tela de visualização ampliada!",
    apis: combinedList,
    totalSystemApis: combinedList.length
  });
});

// ENDPOINT: PROXY
// Makes real backend proxy requests to public APIs, avoiding browser CORS blocks completely!
app.post("/api/proxy", async (req, res) => {
  const { url, method = "GET", headers = {}, body, apiId } = req.body;
  
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Parâmetro 'url' é obrigatório no corpo da requisição." });
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "API-Hunter-Client/1.0",
        ...headers
      }
    };

    if (method !== "GET" && method !== "HEAD" && body) {
      if (typeof body === "object") {
        fetchOptions.body = JSON.stringify(body);
        (fetchOptions.headers as any)["Content-Type"] = "application/json";
      } else {
        fetchOptions.body = String(body);
      }
    }

    const startTime = Date.now();
    const proxyResponse = await fetch(url, fetchOptions);
    const durationMs = Date.now() - startTime;

    const contentType = proxyResponse.headers.get("content-type") || "";
    let responseData: any = null;

    if (contentType.includes("application/json")) {
      responseData = await proxyResponse.json();
    } else {
      responseData = await proxyResponse.text();
    }

    recordProxyHealthObservation({
      apiId,
      status: proxyResponse.status,
      ok: proxyResponse.ok,
      url
    });
    const autoBlocked = !!(apiId && API_BLOCKLIST[apiId]);

    res.json({
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: Object.fromEntries(proxyResponse.headers.entries()),
      data: responseData,
      durationMs,
      ok: proxyResponse.ok,
      autoBlocked,
      blockedReason: autoBlocked ? API_BLOCKLIST[apiId]?.reason : undefined
    });
  } catch (error: any) {
    recordProxyHealthObservation({
      apiId,
      status: 0,
      ok: false,
      url
    });
    res.status(500).json({
      ok: false,
      error: error.message || "Erro desconhecido ao conectar com o servidor da API."
    });
  }
});

// Vite Server initialization & middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Buscador de APIs rodando com sucesso no endereço http://localhost:${PORT}`);
  });
}

startServer();
