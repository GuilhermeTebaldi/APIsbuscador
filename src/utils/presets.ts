import { FreeApiInfo } from '../types';

export interface CommandPreset {
  label: string;
  endpointIndex: number;
  queryParams?: Record<string, string>;
  pathParams?: Record<string, string>;
}

export function getPresetsForApi(api: FreeApiInfo): CommandPreset[] {
  if (!api) return [];

  const uid = api.id || '';
  const url = api.url || '';

  if (uid === 'open-meteo' || url.includes('open-meteo.com')) {
    return [
      {
        label: "☀️ Clima: São Paulo (SP)",
        endpointIndex: 0,
        queryParams: { latitude: "-23.5505", longitude: "-46.6333", current_weather: "true" }
      },
      {
        label: "🌴 Clima: Rio de Janeiro (RJ)",
        endpointIndex: 0,
        queryParams: { latitude: "-22.9068", longitude: "-43.1729", current_weather: "true" }
      },
      {
        label: "🏰 Clima: Lisboa (Portugal)",
        endpointIndex: 0,
        queryParams: { latitude: "38.7223", longitude: "-9.1393", current_weather: "true" }
      }
    ];
  }

  if (uid === 'pokeapi' || url.includes('pokeapi.co')) {
    return [
      {
        label: "⚡ Ver dados do Pikachu",
        endpointIndex: 0,
        pathParams: { name_or_id: "pikachu" }
      },
      {
        label: "🔥 Ver dados do Charizard",
        endpointIndex: 0,
        pathParams: { name_or_id: "charizard" }
      },
      {
        label: "🦕 Ver dados do Bulbasaur",
        endpointIndex: 0,
        pathParams: { name_or_id: "bulbasaur" }
      },
      {
        label: "📜 Listar 10 Pokémons Iniciais",
        endpointIndex: 1,
        queryParams: { limit: "10", offset: "0" }
      }
    ];
  }

  if (uid === 'rickandmorty' || url.includes('rickandmortyapi.com')) {
    return [
      {
        label: "👦 Ver Morty Smith (Vivo)",
        endpointIndex: 0,
        queryParams: { name: "Morty Smith", status: "alive" }
      },
      {
        label: "🧪 Ver Rick Sanchez (Vivo)",
        endpointIndex: 0,
        queryParams: { name: "Rick Sanchez", status: "alive" }
      },
      {
        label: "💀 Ver Rick Sanchez (Morto)",
        endpointIndex: 0,
        queryParams: { name: "Rick Sanchez", status: "dead" }
      }
    ];
  }

  if (uid === 'voicerss' || url.includes('voicerss.org')) {
    return [
      {
        label: "🗣️ Falar texto de boas-vindas",
        endpointIndex: 0,
        queryParams: {
          key: "359b3bbff7ad47468160fc4569ce4b21",
          src: "Olá! Seja bem-vindo ao buscador inteligente de APIs. Clique em qualquer comando pronto para testá-lo!",
          hl: "pt-br",
          r: "0"
        }
      },
      {
        label: "🤖 Falar com voz de robô rápida",
        endpointIndex: 0,
        queryParams: {
          key: "359b3bbff7ad47468160fc4569ce4b21",
          src: "Conexão de teste estabelecida com sucesso pela porta de proxy brasileira.",
          hl: "pt-br",
          r: "3"
        }
      }
    ];
  }

  if (uid === 'adviceslip' || url.includes('adviceslip.com')) {
    return [
      {
        label: "🧠 Pegar conselho aleatório",
        endpointIndex: 0
      }
    ];
  }

  if (uid === 'dogapi' || url.includes('dog.ceo')) {
    return [
      {
        label: "🐶 Foto de Cachorro Aleatório",
        endpointIndex: 0
      },
      {
        label: "🐺 Foto de Husky Siberiano",
        endpointIndex: 1
      }
    ];
  }

  if (uid === 'bibleapi' || url.includes('bible-api.com')) {
    return [
      {
        label: "📖 Ler João 3:16",
        endpointIndex: 0,
        queryParams: { translation: "almeida" }
      }
    ];
  }

  if (uid === 'github' || url.includes('api.github.com')) {
    return [
      {
        label: "🐈 Perfil da Octocat (Gata-polvo)",
        endpointIndex: 0,
        pathParams: { username_or_id: "octocat" }
      },
      {
        label: "🧑‍💻 Perfil do Torvalds (Linux Creator)",
        endpointIndex: 0,
        pathParams: { username_or_id: "torvalds" }
      },
      {
        label: "💼 Perfil de Exemplo (Google)",
        endpointIndex: 0,
        pathParams: { username_or_id: "google" }
      }
    ];
  }

  if (uid === 'nasa-apod' || url.includes('api.nasa.gov')) {
    return [
      {
        label: "🌌 Carregar Foto Científica do Dia",
        endpointIndex: 0,
        queryParams: { api_key: "DEMO_KEY" }
      }
    ];
  }

  if (uid === 'jokeapi' || url.includes('jokeapi.dev')) {
    return [
      {
        label: "🤣 Piada de Programação Segura",
        endpointIndex: 0,
        queryParams: { "safe-mode": "true" }
      }
    ];
  }

  if (uid === 'yugioh' || url.includes('ygoprodeck.com')) {
    return [
      {
        label: "🔮 Detalhes: Mago Negro",
        endpointIndex: 0,
        queryParams: { name: "Dark Magician" }
      },
      {
        label: "🐉 Detalhes: Dragão Branco de Olhos Azuis",
        endpointIndex: 0,
        queryParams: { name: "Blue-Eyes White Dragon" }
      }
    ];
  }

  if (uid === 'universities' || url.includes('universities.hipolabs.com')) {
    return [
      {
        label: "🏫 Faculdades do Brasil",
        endpointIndex: 0,
        queryParams: { country: "Brazil" }
      },
      {
        label: "🏰 Faculdades de Portugal",
        endpointIndex: 0,
        queryParams: { country: "Portugal" }
      }
    ];
  }

  if (uid === 'nationalize' || url.includes('nationalize.io')) {
    return [
      {
        label: "🇧🇷 Adivinhar nome 'Guilherme'",
        endpointIndex: 0,
        queryParams: { name: "guilherme" }
      },
      {
        label: "🇫🇷 Adivinhar nome 'Jean'",
        endpointIndex: 0,
        queryParams: { name: "jean" }
      }
    ];
  }

  if (uid === 'swapi' || url.includes('swapi.py4e.com')) {
    return [
      {
        label: "⚔️ Luke Skywalker",
        endpointIndex: 0,
        pathParams: { name_or_id: "1" }
      }
    ];
  }

  if (uid === 'spacex' || url.includes('api.spacexdata.com')) {
    return [
      {
        label: "🚀 Lançamento mais Recente",
        endpointIndex: 0
      }
    ];
  }

  if (uid === 'frankfurter' || url.includes('api.frankfurter.dev')) {
    return [
      {
        label: "💵 Conversão base Dólar (USD)",
        endpointIndex: 0,
        queryParams: { base: "USD" }
      },
      {
        label: "💶 Conversão base Euro (EUR)",
        endpointIndex: 0,
        queryParams: { base: "EUR" }
      },
      {
        label: "💷 Conversão base Libra (GBP)",
        endpointIndex: 0,
        queryParams: { base: "GBP" }
      }
    ];
  }

  if (uid === 'dnd5e' || url.includes('dnd5eapi.co')) {
    return [
      {
        label: "👁️ Beholder (Observador)",
        endpointIndex: 0,
        pathParams: { monster_index: "beholder" }
      },
      {
        label: "🐉 Dragão Vermelho Adulto",
        endpointIndex: 0,
        pathParams: { monster_index: "adult-red-dragon" }
      },
      {
        label: "🧙‍♂️ Goblin",
        endpointIndex: 0,
        pathParams: { monster_index: "goblin" }
      }
    ];
  }

  if (uid === 'disney' || url.includes('api.disneyapi.dev')) {
    return [
      {
        label: "👸 Personagens Disney",
        endpointIndex: 0,
        queryParams: { pageSize: "4" }
      }
    ];
  }

  if (uid === 'agify' || url.includes('api.agify.io')) {
    return [
      {
        label: "👵 Idade de 'Maria'",
        endpointIndex: 0,
        queryParams: { name: "maria" }
      },
      {
        label: "🧑 Idade de 'Arthur'",
        endpointIndex: 0,
        queryParams: { name: "arthur" }
      }
    ];
  }

  if (uid === 'openlibrary' || url.includes('openlibrary.org')) {
    return [
      {
        label: "🧝 Lord of the Rings",
        endpointIndex: 0,
        queryParams: { title: "Lord of the Rings", limit: "1" }
      },
      {
        label: "🪐 Dune (Duna)",
        endpointIndex: 0,
        queryParams: { title: "Dune", limit: "1" }
      }
    ];
  }

  if (uid === 'ipapi' || url.includes('ipapi.co')) {
    return [
      {
        label: "📍 Meu IP e Geolocalização",
        endpointIndex: 0
      }
    ];
  }

  if (uid === 'genderize' || url.includes('api.genderize.io')) {
    return [
      {
        label: "🙋‍♂️ Nome 'Guilherme'",
        endpointIndex: 0,
        queryParams: { name: "guilherme" }
      },
      {
        label: "🙋‍♀️ Nome 'Maria'",
        endpointIndex: 0,
        queryParams: { name: "maria" }
      }
    ];
  }

  if (uid === 'coincap' || url.includes('api.coincap.io')) {
    return [
      {
        label: "🪙 Top 5 Criptomedas",
        endpointIndex: 0,
        queryParams: { limit: "5" }
      },
      {
        label: "🪙 Top 15 Criptomedas",
        endpointIndex: 0,
        queryParams: { limit: "15" }
      }
    ];
  }

  if (uid === 'zippopotam' || url.includes('api.zippopotam.us')) {
    return [
      {
        label: "🇧🇷 Cep: São Paulo (01000-000)",
        endpointIndex: 0,
        pathParams: { country_and_zip: "BR/01000-000" }
      },
      {
        label: "🇺🇸 Zip: Beverly Hills (US/90210)",
        endpointIndex: 0,
        pathParams: { country_and_zip: "US/90210" }
      }
    ];
  }

  if (uid === 'uselessfacts' || url.includes('uselessfacts.jsph.pl')) {
    return [
      {
        label: "🧠 Fato Curioso Aleatório",
        endpointIndex: 0,
        queryParams: { language: "en" }
      }
    ];
  }

  if (uid === 'magicthegathering' || url.includes('api.magicthegathering.io')) {
    return [
      {
        label: "🪷 Black Lotus",
        endpointIndex: 0,
        queryParams: { name: "Black Lotus" }
      },
      {
        label: "⚡ Lightning Bolt",
        endpointIndex: 0,
        queryParams: { name: "Lightning Bolt" }
      }
    ];
  }

  if (uid === 'ghibli' || url.includes('ghibliapi.vercel.app')) {
    return [
      {
        label: "🌲 Meu Vizinho Totoro",
        endpointIndex: 0,
        queryParams: { limit: "1" }
      },
      {
        label: "🏰 Castelo no Céu",
        endpointIndex: 0,
        queryParams: { limit: "2" }
      }
    ];
  }

  if (uid === 'opentdb' || url.includes('opentdb.com')) {
    return [
      {
        label: "💻 Perguntas de Informática",
        endpointIndex: 0,
        queryParams: { amount: "1", category: "18", difficulty: "easy" }
      },
      {
        label: "🎬 Perguntas de Cinema",
        endpointIndex: 0,
        queryParams: { amount: "1", category: "11", difficulty: "medium" }
      }
    ];
  }

  if (uid === 'numbers' || url.includes('numbersapi.com')) {
    return [
      {
        label: "🌀 Segredo do Número 42",
        endpointIndex: 0,
        queryParams: { json: "true" },
        pathParams: { number_and_type: "42/math" }
      },
      {
        label: "📅 Fato do Dia 25 de Maio",
        endpointIndex: 0,
        queryParams: { json: "true" },
        pathParams: { number_and_type: "5/25/date" }
      }
    ];
  }

  if (uid === 'thecocktaildb' || url.includes('thecocktaildb.com')) {
    return [
      {
        label: "🍹 Receita de Margarita",
        endpointIndex: 0,
        queryParams: { s: "margarita" }
      },
      {
        label: "🍸 Receita de Mojito",
        endpointIndex: 0,
        queryParams: { s: "mojito" }
      }
    ];
  }

  if (uid === 'hpapi' || url.includes('hp-api.onrender.com')) {
    return [
      {
        label: "🧙‍♂️ Personagens Principais",
        endpointIndex: 0
      }
    ];
  }

  if (uid === 'freetogame' || url.includes('freetogame.com')) {
    return [
      {
        label: "🎮 Jogos de Computador (PC)",
        endpointIndex: 0,
        queryParams: { platform: "pc" }
      },
      {
        label: "🌐 Jogos de Navegador (Web)",
        endpointIndex: 0,
        queryParams: { platform: "browser" }
      }
    ];
  }

  if (uid === 'pokemon' || url.includes('pokeapi.co')) {
    return [
      {
        label: "⚡ Pikachu",
        endpointIndex: 0,
        pathParams: { pokemon_name_or_id: "pikachu" }
      },
      {
        label: "🔥 Charizard",
        endpointIndex: 0,
        pathParams: { pokemon_name_or_id: "charizard" }
      },
      {
        label: "💧 Squirtle",
        endpointIndex: 0,
        pathParams: { pokemon_name_or_id: "squirtle" }
      }
    ];
  }

  if (uid === 'rickandmorty' || url.includes('rickandmortyapi.com')) {
    return [
      {
        label: "🧪 Rick Sanchez",
        endpointIndex: 0,
        pathParams: { character_id: "1" }
      },
      {
        label: "👦 Morty Smith",
        endpointIndex: 0,
        pathParams: { character_id: "2" }
      }
    ];
  }

  if (uid === 'dogapi' || url.includes('dog.ceo')) {
    return [
      {
        label: "🐶 Foto Fofa Aleatória",
        endpointIndex: 0
      }
    ];
  }

  if (uid === 'catfacts' || url.includes('catfact.ninja')) {
    return [
      {
        label: "🐈 Fato de Gato Aleatório",
        endpointIndex: 0
      }
    ];
  }

  if (uid === 'restcountries' || url.includes('restcountries.com')) {
    return [
      {
        label: "🇧🇷 Brasil",
        endpointIndex: 0,
        pathParams: { country_name: "brazil" }
      },
      {
        label: "🇵🇹 Portugal",
        endpointIndex: 0,
        pathParams: { country_name: "portugal" }
      },
      {
        label: "🇯🇵 Japão (Japan)",
        endpointIndex: 0,
        pathParams: { country_name: "japan" }
      }
    ];
  }

  if (uid === 'httpcat' || url.includes('http.cat')) {
    return [
      {
        label: "❌ Erro 404 (Not Found)",
        endpointIndex: 0,
        pathParams: { status_code: "404" }
      },
      {
        label: "☕ Erro 418 (I'm a teapot)",
        endpointIndex: 0,
        pathParams: { status_code: "418" }
      },
      {
        label: "✅ Status 200 (OK)",
        endpointIndex: 0,
        pathParams: { status_code: "200" }
      }
    ];
  }

  if (uid === 'randomuser' || url.includes('randomuser.me')) {
    return [
      {
        label: "👩 1 Usuário Falso",
        endpointIndex: 0,
        queryParams: { results: "1" }
      },
      {
        label: "👥 3 Usuários Falsos",
        endpointIndex: 0,
        queryParams: { results: "3" }
      }
    ];
  }

  if (uid === 'kitsu' || url.includes('kitsu.io')) {
    return [
      {
        label: "🍥 Anime: Naruto",
        endpointIndex: 0,
        queryParams: { "filter[text]": "naruto" }
      },
      {
        label: "🐾 Anime: Totoro",
        endpointIndex: 0,
        queryParams: { "filter[text]": "totoro" }
      },
      {
        label: "🌌 Anime: Attack on Titan",
        endpointIndex: 0,
        queryParams: { "filter[text]": "attack on titan" }
      }
    ];
  }

  if (uid === 'openbrewery' || url.includes('openbrewerydb.org')) {
    return [
      {
        label: "🍺 Cervejarias em San Diego",
        endpointIndex: 0,
        queryParams: { by_city: "san_diego", per_page: "3" }
      },
      {
        label: "🗽 Cervejarias em Nova York",
        endpointIndex: 0,
        queryParams: { by_city: "new_york", per_page: "2" }
      }
    ];
  }

  if (uid === 'fruityvice' || url.includes('fruityvice.com')) {
    return [
      {
        label: "🍌 Nutrição de Banana",
        endpointIndex: 0,
        pathParams: { fruit_name: "banana" }
      },
      {
        label: "🍓 Nutrição de Morango",
        endpointIndex: 0,
        pathParams: { fruit_name: "strawberry" }
      },
      {
        label: "🍎 Nutrição de Maçã (Apple)",
        endpointIndex: 0,
        pathParams: { fruit_name: "apple" }
      }
    ];
  }

  if (uid === 'zenquotes' || url.includes('zenquotes.io')) {
    return [
      {
        label: "🧘 Citação de Sabedoria",
        endpointIndex: 0
      }
    ];
  }

  if (uid === 'baconipsum' || url.includes('baconipsum.com')) {
    return [
      {
        label: "🥓 Texto Carnes (2 Parágrafos)",
        endpointIndex: 0,
        queryParams: { type: "all-meat", paras: "2" }
      },
      {
        label: "🥗 Texto Carnes e Mistura",
        endpointIndex: 0,
        queryParams: { type: "meat-and-filler", paras: "1" }
      }
    ];
  }

  // Fallback dynamic presets for search-discovered APIs
  if (api.endpoints && api.endpoints.length > 0) {
    return api.endpoints.map((ep, idx) => {
      let label = ep.description 
        ? ep.description.replace(/Obter\s+/i, '').replace(/Listar\s+/i, '').replace(/Buscar\s+/i, '')
        : `Rota ${ep.path}`;
      
      label = label.charAt(0).toUpperCase() + label.slice(1);
      if (label.length > 34) {
        label = label.slice(0, 32) + '...';
      }

      const qp: Record<string, string> = {};
      ep.queryParams?.forEach(p => {
        if (p.defaultValue) qp[p.name] = p.defaultValue;
      });

      const pp: Record<string, string> = {};
      ep.pathParams?.forEach(p => {
        if (p.defaultValue) pp[p.name] = p.defaultValue;
      });

      return {
        label: `👉 Rodar: ${label}`,
        endpointIndex: idx,
        queryParams: qp,
        pathParams: pp
      };
    });
  }

  return [];
}
