import React, { useState, useEffect } from "react";

export default function App() {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [theme, setTheme] = useState("dark");
  const [bgTheme, setBgTheme] = useState("default"); // dynamic backgrounds

  useEffect(() => {
    document.body.className = `${theme} ${bgTheme}`;
  }, [theme, bgTheme]);

  async function handleSearch(e) {
    e?.preventDefault();
    if (!city.trim()) {
      setError("Please enter a city name.");
      return;
    }
    setLoading(true);
    setError(null);
    setWeather(null);
    setLocationName("");

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=5&language=en&format=json`
      );
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        setError("No matching location found.");
        setLoading(false);
        return;
      }

      const top = geoData.results[0];
      setLocationName(
        `${top.name}${top.admin1 ? ", " + top.admin1 : ""}${
          top.country ? ", " + top.country : ""
        }`
      );

      const lat = top.latitude;
      const lon = top.longitude;
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,relativehumidity_2m,pressure_msl,visibility,uv_index&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode&timezone=auto`
      );
      const weatherData = await weatherRes.json();

      if (!weatherData.current_weather) {
        setError("Weather data not available.");
        setLoading(false);
        return;
      }

      setWeather({
        ...weatherData.current_weather,
        hourly: weatherData.hourly,
        daily: weatherData.daily,
      });

      updateBackgroundTheme(weatherData.current_weather);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateBackgroundTheme(current) {
    const code = current.weathercode;
    const hour = new Date(current.time).getHours();

    if (hour >= 20 || hour <= 5) {
      setBgTheme("night"); // 🌙 Night
    } else if ([61, 63, 65, 80, 81, 82].includes(code)) {
      setBgTheme("rainy"); // 🌧️ Rainy
    } else if ([0, 1].includes(code)) {
      setBgTheme("sunny"); // ☀️ Sunny
    } else {
      setBgTheme("default"); // fallback
    }
  }

  function formatWindDirection(deg) {
    if (deg == null) return "-";
    const dirs = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  function getWeatherIcon(code) {
    const icons = {
      0: "☀️",
      1: "🌤️",
      2: "⛅",
      3: "☁️",
      45: "🌫️",
      48: "🌫️",
      51: "🌦️",
      53: "🌦️",
      55: "🌧️",
      61: "🌦️",
      63: "🌧️",
      65: "🌧️",
      71: "🌨️",
      73: "🌨️",
      75: "❄️",
      80: "🌧️",
      81: "🌧️",
      82: "🌧️",
      95: "⛈️",
      96: "⛈️",
      99: "⛈️",
    };
    return icons[code] || "❓";
  }

  function getNext12HoursForecast(weather) {
    if (!weather?.hourly) return [];
    const nowIndex = weather.hourly.time.indexOf(weather.time);
    return weather.hourly.time
      .slice(nowIndex + 1, nowIndex + 13)
      .map((time, i) => ({
        time: new Date(time).toLocaleTimeString([], { hour: "2-digit" }),
        temp: weather.hourly.temperature_2m[nowIndex + 1 + i],
        feels: weather.hourly.apparent_temperature[nowIndex + 1 + i],
        hum: weather.hourly.relativehumidity_2m[nowIndex + 1 + i],
      }));
  }

  return (
    <div className="app-root">
      {/* Background Effects Layer */}
      <div className="background-effects"></div>

      <header className="header">
        <h1 className="title">Weather Now</h1>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </header>

      <form className="search" onSubmit={handleSearch}>
        <input
          aria-label="City"
          className="city-input"
          placeholder="Enter city..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button className="search-btn" type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <div className="notice error">{error}</div>}

      {weather && (
        <div className="cards">
          <section className="card current">
            <h2>{locationName}</h2>
            <div className="temp-big">
              {getWeatherIcon(weather.weathercode)}{" "}
              {Math.round(weather.temperature)}°C
            </div>
            <p>
              Feels like {Math.round(weather.hourly.apparent_temperature[0])}°C
            </p>
            <p>Humidity: {weather.hourly.relativehumidity_2m[0]}%</p>
            <p>
              Wind: {Math.round(weather.windspeed)} km/h{" "}
              {formatWindDirection(weather.winddirection)}
            </p>
            <p>Pressure: {weather.hourly.pressure_msl[0]} hPa</p>
            <p>
              Visibility: {Math.round(weather.hourly.visibility[0] / 1000)} km
            </p>
            <p>UV Index: {weather.hourly.uv_index[0]}</p>
          </section>

          <section className="card hourly">
            <h2>Next 12 Hours</h2>
            <div className="hourly-scroll">
              {getNext12HoursForecast(weather).map((f, i) => (
                <div className="hour-card" key={i}>
                  <div>{f.time}</div>
                  <div>🌡️ {Math.round(f.temp)}°C</div>
                  <div>Feels {Math.round(f.feels)}°C</div>
                  <div>{f.hum}% 💧</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card daily">
            <h2>7-Day Forecast</h2>
            <div className="daily-grid">
              {weather.daily.time.map((day, i) => (
                <div className="day-card" key={i}>
                  <div>
                    {new Date(day).toLocaleDateString(undefined, {
                      weekday: "short",
                    })}
                  </div>
                  <div className="day-icon">
                    {getWeatherIcon(weather.daily.weathercode[i])}
                  </div>
                  <div>
                    {Math.round(weather.daily.temperature_2m_max[i])}° /{" "}
                    {Math.round(weather.daily.temperature_2m_min[i])}°
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <footer className="footer">Built for Jamie — Outdoor Enthusiast.</footer>
    </div>
  );
}
