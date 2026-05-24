# 🌤️ Weather Explorer

A feature-rich, responsive weather web app built with vanilla HTML, CSS, and JavaScript — powered by the OpenWeatherMap API.

> Designed by **Abhishek Singh**

---

## 🚀 Live Demo

> *https://abhhishek2433365.github.io/Weather-website/*

---

## ✨ Features

- 🔍 **City Search** — Look up current weather for any city worldwide
- 📍 **Geolocation** — Instantly get weather for your current location
- 🎤 **Voice Search** — Search by speaking the city name (Chrome supported)
- 🌡️ **Unit Toggle** — Switch between Celsius and Fahrenheit
- 🌓 **Dark / Light Mode** — Smooth theme switching with persistent backgrounds
- 🌈 **Dynamic Backgrounds** — Background changes based on weather condition (clear, rain, snow, clouds)
- ⏱️ **Hourly Forecast** — Next 4-hour forecast with icons and temperatures
- 🌬️ **Air Quality Index (AQI)** — Real AQI calculated using US EPA formula from live pollutant data (PM2.5, PM10, NO₂, O₃, SO₂, CO)
- 🔔 **AQI Push Notifications** — Browser notifications when AQI exceeds unhealthy levels
- ☀️ **UV Index** — UV level with Low / Moderate / High / Extreme categorization
- 🌅 **Sunrise & Sunset** — Local sunrise and sunset times
- 🗺️ **Interactive Map** — Leaflet.js map with a pin on the searched location
- 📊 **Historical Weather Chart** — Temperature history chart via Chart.js
- ⚖️ **City Comparison** — Compare current weather between two cities side by side
- ⭐ **Saved Cities** — Save favorite cities locally (persisted via localStorage)
- ⚙️ **Settings Panel** — Toggle map and AQI display on/off
- ⚠️ **Weather Alerts** — Displays active weather alerts when available

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Structure |
| CSS3 | Styling, animations, themes |
| JavaScript (ES6+) | Logic, API calls, DOM manipulation |
| [OpenWeatherMap API](https://openweathermap.org/api) | Weather, forecast, AQI, UV data |
| [Leaflet.js](https://leafletjs.com/) | Interactive map |
| [Chart.js](https://www.chartjs.org/) | Historical temperature chart |
| Web Speech API | Voice search |
| Geolocation API | Current location detection |
| Notifications API | AQI push alerts |

---

## 📁 Project Structure

```
weather-explorer/
├── index.html      # Main HTML structure
├── styles.css      # Styling, themes, animations, responsive layout
└── script.js       # All app logic, API calls, and DOM updates
```

---

## ⚙️ Setup & Usage

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/weather-explorer.git
cd weather-explorer
```

### 2. Get an OpenWeatherMap API Key

1. Sign up at [openweathermap.org](https://openweathermap.org/)
2. Go to **API Keys** in your account dashboard
3. Copy your key

### 3. Add Your API Key

Open `script.js` and replace the placeholder key in the relevant lines:

```js
const apiKey = 'YOUR_API_KEY_HERE';
```

> ⚠️ **Security note:** Never commit your real API key to a public repo. For production, use environment variables or a backend proxy.

### 4. Run the App

Simply open `index.html` in your browser — no build step or server required.

```bash
# Or use a local dev server (recommended for geolocation & notifications)
npx serve .
```

> Geolocation and browser notifications require the page to be served over **HTTPS** or `localhost`.

---

## 📸 Screenshots

> *(Add screenshots of your app here)*

---

## 🗺️ API Endpoints Used

| Feature | Endpoint |
|---|---|
| Current Weather | `api.openweathermap.org/data/2.5/weather` |
| Hourly Forecast | `api.openweathermap.org/data/2.5/forecast` |
| Air Quality | `api.openweathermap.org/data/2.5/air_pollution` |
| UV Index | `api.openweathermap.org/data/3.0/onecall` *(One Call — paid plan)* |
| Historical Weather | `api.openweathermap.org/data/2.5/onecall/timemachine` *(paid plan)* |

> The UV Index and Historical Weather features require the **OpenWeatherMap One Call API 3.0**, which needs a subscribed plan.

---

## 📱 Responsive Design

The app is fully responsive and works on mobile, tablet, and desktop screens. The layout adjusts automatically for smaller viewports.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Authors

- **Abhishek Singh**
