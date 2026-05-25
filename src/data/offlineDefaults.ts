import { FreeApiInfo } from "../types";

// Fallback local para quando os endpoints /api/* não estiverem disponíveis
// (ex: preview estático do AI Studio sem backend Node ativo).
export const OFFLINE_DEFAULT_APIS: FreeApiInfo[] = [
  {
    id: "open-meteo",
    name: "Previsão do Tempo (Open-Meteo)",
    description: "API pública de clima com previsão e condições atuais por latitude/longitude.",
    category: "Clima & Geografia",
    url: "https://api.open-meteo.com/v1",
    docsUrl: "https://open-meteo.com/",
    auth: "none",
    endpoints: [
      {
        path: "/forecast",
        method: "GET",
        description: "Obtém previsão por coordenadas.",
        queryParams: [
          { name: "latitude", type: "string", required: true, defaultValue: "-23.5505", description: "Latitude." },
          { name: "longitude", type: "string", required: true, defaultValue: "-46.6333", description: "Longitude." },
          { name: "current_weather", type: "string", required: true, defaultValue: "true", description: "Incluir clima atual." }
        ]
      }
    ],
    sampleResponse: {
      latitude: -23.5505,
      longitude: -46.6333,
      current_weather: { temperature: 24.5, windspeed: 14.8, weathercode: 1, is_day: 1 }
    }
  },
  {
    id: "pokeapi",
    name: "PokeAPI (Pokémon)",
    description: "Dados de Pokémons, habilidades, tipos e imagens oficiais.",
    category: "Games & Entretenimento",
    url: "https://pokeapi.co/api/v2",
    docsUrl: "https://pokeapi.co/",
    auth: "none",
    endpoints: [
      {
        path: "/pokemon/pikachu",
        method: "GET",
        description: "Consulta um Pokémon por nome ou id.",
        pathParams: [
          { name: "name_or_id", type: "string", required: true, defaultValue: "pikachu", description: "Nome ou ID." }
        ]
      }
    ],
    sampleResponse: {
      id: 25,
      name: "pikachu",
      height: 4,
      weight: 60,
      types: [{ slot: 1, type: { name: "electric" } }],
      sprites: { front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" }
    }
  },
  {
    id: "rickandmorty",
    name: "The Rick and Morty API",
    description: "Personagens, episódios e locais do universo Rick and Morty.",
    category: "Games & Entretenimento",
    url: "https://rickandmortyapi.com/api",
    docsUrl: "https://rickandmortyapi.com/",
    auth: "none",
    endpoints: [
      {
        path: "/character/1",
        method: "GET",
        description: "Busca personagem por ID."
      }
    ],
    sampleResponse: {
      id: 1,
      name: "Rick Sanchez",
      status: "Alive",
      species: "Human",
      image: "https://rickandmortyapi.com/api/character/avatar/1.jpeg"
    }
  },
  {
    id: "restcountries",
    name: "REST Countries",
    description: "Informações de países: nome, capital, população, bandeira e região.",
    category: "Clima & Geografia",
    url: "https://restcountries.com/v3.1",
    docsUrl: "https://restcountries.com/",
    auth: "none",
    endpoints: [
      {
        path: "/name/brazil",
        method: "GET",
        description: "Busca dados de países por nome."
      }
    ],
    sampleResponse: [
      {
        name: { common: "Brazil", official: "Federative Republic of Brazil" },
        capital: ["Brasília"],
        region: "Americas",
        population: 212559417
      }
    ]
  },
  {
    id: "github",
    name: "GitHub Users API",
    description: "Perfil público de usuários do GitHub (repos, seguidores e bio).",
    category: "Desenvolvimento & Perfis",
    url: "https://api.github.com",
    docsUrl: "https://docs.github.com/en/rest/users/users",
    auth: "none",
    endpoints: [
      {
        path: "/users/octocat",
        method: "GET",
        description: "Consulta usuário público."
      }
    ],
    sampleResponse: {
      login: "octocat",
      id: 583231,
      public_repos: 8,
      followers: 19572
    }
  },
  {
    id: "coindesk",
    name: "Bitcoin Price Index (CoinDesk)",
    description: "Preço do Bitcoin em múltiplas moedas com atualização frequente.",
    category: "Finanças & Crypto",
    url: "https://api.coindesk.com/v1",
    docsUrl: "https://www.coindesk.com/coindesk-api",
    auth: "none",
    endpoints: [
      {
        path: "/bpi/currentprice.json",
        method: "GET",
        description: "Retorna cotações atuais do BTC."
      }
    ],
    sampleResponse: {
      bpi: {
        USD: { code: "USD", rate: "66,230.2017" },
        EUR: { code: "EUR", rate: "61,112.4821" }
      }
    }
  }
];
