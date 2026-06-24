// ═══════════════════════════════════════════
//  WEATHERCALLER.JS — Appel réel à OpenWeatherMap
//  Météo actuelle + prévisions 5 jours.
//  Si pas de clé configurée ou erreur réseau,
//  bascule sur des données simulées (jamais
//  d'écran vide pour l'utilisateur).
// ═══════════════════════════════════════════

const ICON_MAP = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

function iconePour(code) {
  return ICON_MAP[code] || '⛅';
}

// Données de secours si l'API échoue ou n'est pas configurée
const METEO_SECOURS = {
  temp: 22,
  condition: 'Partiellement nuageux',
  icon: '⛅',
  humidite: 58,
  vent: 14,
  uv: 4,
  ville: 'Villeneuve-sur-Lot',
  prevision: [
    { j: 'Jeu', i: '⛅', h: 22, l: 15 },
    { j: 'Ven', i: '🌧️', h: 17, l: 12 },
    { j: 'Sam', i: '☀️', h: 25, l: 14 },
    { j: 'Dim', i: '☀️', h: 27, l: 16 },
    { j: 'Lun', i: '🌤️', h: 23, l: 15 },
  ],
  source: 'demo',
};

const JOURS_COURT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/**
 * Récupère la météo actuelle + prévisions pour une ville donnée.
 * Retourne toujours un objet météo valide (réel ou de secours).
 */
export async function getMeteoReelle(ville, apiKey) {
  if (!apiKey || !ville) {
    return METEO_SECOURS;
  }

  try {
    // Météo actuelle
    const urlActuel = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ville)}&appid=${apiKey}&units=metric&lang=fr`;
    const resActuel = await fetch(urlActuel);
    if (!resActuel.ok) {
      const body = await resActuel.text();
      throw new Error(`OpenWeatherMap (actuel) erreur ${resActuel.status} : ${body.slice(0, 150)}`);
    }
    const dataActuel = await resActuel.json();

    // Prévisions 5 jours (l'API forecast donne du 3h par 3h, on regroupe par jour)
    const urlPrev = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(ville)}&appid=${apiKey}&units=metric&lang=fr`;
    const resPrev = await fetch(urlPrev);
    let prevision = METEO_SECOURS.prevision;

    if (resPrev.ok) {
      const dataPrev = await resPrev.json();
      const parJour = {};
      (dataPrev.list || []).forEach(entry => {
        const date = new Date(entry.dt * 1000);
        const jourKey = date.toISOString().slice(0, 10);
        if (!parJour[jourKey]) {
          parJour[jourKey] = { temps: [], icons: [], jourNum: date.getDay() };
        }
        parJour[jourKey].temps.push(entry.main.temp);
        parJour[jourKey].icons.push(entry.weather[0].icon);
      });

      prevision = Object.values(parJour).slice(0, 5).map(jour => ({
        j: JOURS_COURT[jour.jourNum],
        i: iconePour(jour.icons[Math.floor(jour.icons.length / 2)]),
        h: Math.round(Math.max(...jour.temps)),
        l: Math.round(Math.min(...jour.temps)),
      }));
    }

    return {
      temp: Math.round(dataActuel.main.temp),
      condition: dataActuel.weather[0].description.charAt(0).toUpperCase() + dataActuel.weather[0].description.slice(1),
      icon: iconePour(dataActuel.weather[0].icon),
      humidite: dataActuel.main.humidity,
      vent: Math.round(dataActuel.wind.speed * 3.6), // m/s → km/h
      uv: 4, // L'UV nécessite un appel séparé (One Call API) — gardé simulé pour l'instant
      ville: dataActuel.name,
      prevision: prevision.length > 0 ? prevision : METEO_SECOURS.prevision,
      source: 'live',
    };
  } catch (e) {
    return { ...METEO_SECOURS, source: 'erreur', erreurMessage: e.message };
  }
}
