let isCelsius = true;
let isDarkMode = true;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let map;
let historyChart; // For Chart.js

// Load favorites on page load
window.onload = function () {
    loadFavorites();
    toggleTheme(); // Apply initial theme
};

async function getWeather(cityName = null, lat = null, lon = null) {
    const city = cityName || document.getElementById('city').value;
    const apiKey = 'da5cc509bc967933cf9f957a7a06eb9b'; // Replace with secure method
    const units = isCelsius ? 'metric' : 'imperial';
    const unitSymbol = isCelsius ? '°C' : '°F';

    let currentWeatherUrl, forecastWeatherUrl;
    if (lat && lon) {
        currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
        forecastWeatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
    } else {
        currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units}`;
        forecastWeatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${units}`;
    }

    document.getElementById('loading').classList.add('show');
    document.getElementById('error-message').textContent = '';

    try {
        // Fetch current weather
        const currentResponse = await fetch(currentWeatherUrl);
        if (!currentResponse.ok) throw new Error('City not found or API error');
        const currentData = await currentResponse.json();

        document.getElementById('cityName').textContent = currentData.name;
        document.getElementById('temperature').textContent = `Temperature: ${currentData.main.temp}${unitSymbol}`;
        document.getElementById('description').textContent = `Description: ${currentData.weather[0].description}`;
        document.getElementById('humidity').textContent = `Humidity: ${currentData.main.humidity}%`;
        document.getElementById('wind').textContent = `Wind: ${currentData.wind.speed} m/s`;
        document.getElementById('pressure').textContent = `Pressure: ${currentData.main.pressure} hPa`;

        // Sunrise and Sunset
        const sunrise = new Date(currentData.sys.sunrise * 1000).toLocaleTimeString();
        const sunset = new Date(currentData.sys.sunset * 1000).toLocaleTimeString();
        document.getElementById('sunrise').textContent = `Sunrise: ${sunrise}`;
        document.getElementById('sunset').textContent = `Sunset: ${sunset}`;

        // UV Index (One Call API - may require paid key)
        try {
            const uvResponse = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${currentData.coord.lat}&lon=${currentData.coord.lon}&exclude=minutely,hourly,daily,alerts&appid=${apiKey}`);
            if (uvResponse.ok) {
                const uvData = await uvResponse.json();
                const uvIndex = uvData.current.uvi;
                document.getElementById('uv-index').textContent = `UV Index: ${uvIndex} (${getUVCategory(uvIndex)})`;
            } else {
                document.getElementById('uv-index').textContent = 'UV Index: Data unavailable';
            }
        } catch (uvError) {
            console.error('UV Error:', uvError);
            document.getElementById('uv-index').textContent = 'UV Index: Error loading data';
        }

        const currentIcon = currentData.weather[0].icon;
        document.querySelector('.current-weather .icon').innerHTML = `<img src="https://openweathermap.org/img/wn/${currentIcon}@2x.png" alt="weather icon">`;

        // Change background
        changeBackground(currentData.weather[0].main.toLowerCase());

        // Alerts
        if (currentData.alerts) {
            document.getElementById('alert-text').textContent = currentData.alerts[0].description;
            document.getElementById('alerts').style.display = 'block';
        } else {
            document.getElementById('alerts').style.display = 'none';
        }

        // Map
        if (map) map.remove();
        map = L.map('map').setView([currentData.coord.lat, currentData.coord.lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        L.marker([currentData.coord.lat, currentData.coord.lon]).addTo(map).bindPopup(currentData.name).openPopup();

        // Air Quality (calculate real numerical AQI from components)
        try {
            const aqiResponse = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${currentData.coord.lat}&lon=${currentData.coord.lon}&appid=${apiKey}`);
            if (aqiResponse.ok) {
                const aqiData = await aqiResponse.json();
                const components = aqiData.list[0].components;
                if (components) {
                    const calculatedAQI = calculateAQI(components);
                    const category = getAQICategory(calculatedAQI);
                    document.getElementById('aqi').textContent = `AQI: ${calculatedAQI} (${category})`;

                    // Push Notification for high AQI
                    if (Notification.permission === 'granted' && calculatedAQI > 150) { // Unhealthy threshold
                        new Notification('Air Quality Alert', { body: `AQI is ${calculatedAQI} (${category}) in ${currentData.name}` });
                    } else if (Notification.permission !== 'denied') {
                        Notification.requestPermission();
                    }
                } else {
                    document.getElementById('aqi').textContent = 'AQI: Data unavailable';
                }
            } else {
                document.getElementById('aqi').textContent = 'AQI: Data unavailable';
            }
        } catch (aqiError) {
            console.error('Error fetching AQI:', aqiError);
            document.getElementById('aqi').textContent = 'AQI: Error loading data. Check API key or location.';
        }

        // Fetch forecast data (hourly)
        const forecastResponse = await fetch(forecastWeatherUrl);
        const forecastData = await forecastResponse.json();

        const forecastHours = document.querySelectorAll('.hour');
        forecastHours.forEach((hour, index) => {
            const forecast = forecastData.list[index];
            const forecastIcon = forecast.weather[0].icon;
            const time = new Date(forecast.dt_txt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            hour.querySelector('.time').textContent = time;
            hour.querySelector('.icon').innerHTML = `<img src="https://openweathermap.org/img/wn/${forecastIcon}@2x.png" alt="forecast icon">`;
            hour.querySelector('.temp').textContent = `${Math.round(forecast.main.temp)}${unitSymbol}`;
        });

        document.getElementById('loading').classList.remove('show');
    } catch (error) {
        console.error('Error fetching weather data:', error);
        document.getElementById('error-message').textContent = 'Error: ' + error.message + '. Please try again.';
        document.getElementById('loading').classList.remove('show');
    }
}

function startVoiceSearch() {
    const recognition = new webkitSpeechRecognition();
    recognition.onresult = (event) => {
        document.getElementById('city').value = event.results[0][0].transcript;
        getWeather();
    };
    recognition.start();
}

function changeBackground(condition) {
    const body = document.body;
    body.className = isDarkMode ? 'dark' : 'light'; // Preserve theme
    body.classList.add(condition);
}

function toggleUnits() {
    isCelsius = !isCelsius;
    const button = document.getElementById('unit-toggle');
    button.textContent = isCelsius ? 'Switch to °F' : 'Switch to °C';
    // Refetch data if a city is already loaded
    if (document.getElementById('cityName').textContent !== 'City') {
        getWeather(document.getElementById('cityName').textContent);
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    const body = document.body;
    const button = document.getElementById('theme-toggle');
    if (isDarkMode) {
        body.classList.remove('light');
        body.classList.add('dark');
        button.textContent = 'Light Mode';
    } else {
        body.classList.remove('dark');
        body.classList.add('light');
        button.textContent = 'Dark Mode';
    }
}

function getCurrentLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            await getWeather(null, lat, lon);
        }, (error) => {
            document.getElementById('error-message').textContent = 'Location access denied.';
        });
    } else {
        document.getElementById('error-message').textContent = 'Geolocation not supported.';
    }
}

function saveCity() {
    const city = document.getElementById('cityName').textContent;
    if (city !== 'City' && !favorites.includes(city)) {
        favorites.push(city);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        loadFavorites();
    }
}

function loadFavorites() {
    const list = document.getElementById('favorites-list');
    list.innerHTML = '';
    favorites.forEach(city => {
        const li = document.createElement('li');
        li.textContent = city;
        li.onclick = () => getWeather(city);
        list.appendChild(li);
    });
}

async function getHistoricalWeather() {
    const date = document.getElementById('history-date').value;
    if (!date) {
        alert('Please select a date.');
        return;
    }
    const city = document.getElementById('cityName').textContent;
    if (city === 'City') {
        alert('Please search for a city first.');
        return;
    }
    const apiKey = 'da5cc509bc967933cf9f957a7a06eb9b';
    const timestamp = Math.floor(new Date(date).getTime() / 1000);
    // Note: Historical API requires lat/lon; this is a placeholder. In a real app, store lat/lon from getWeather.
    const currentLat = 0; // Replace with actual lat from currentData
    const currentLon = 0; // Replace with actual lon from currentData
    try {
        const historyResponse = await fetch(`https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${currentLat}&lon=${currentLon}&dt=${timestamp}&appid=${apiKey}`);
        const historyData = await historyResponse.json();
        const temps = historyData.hourly.map(h => h.temp);
        const labels = historyData.hourly.map(h => new Date(h.dt * 1000).toLocaleTimeString());

        document.getElementById('history-chart').style.display = 'block';
        if (historyChart) historyChart.destroy();
        historyChart = new Chart(document.getElementById('history-chart'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperature (°C)',
                    data: temps,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                }]
            }
        });
    } catch (error) {
        console.error('Historical weather error:', error);
        alert('Error loading historical data.');
    }
}

async function compareCities() {
    const city1 = document.getElementById('city1').value;
    const city2 = document.getElementById('city2').value;
    if (!city1 || !city2) {
        alert('Please enter both cities.');
        return;
    }
    const apiKey = 'da5cc509bc967933cf9f957a7a06eb9b';
    try {
        const [data1, data2] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city1}&appid=${apiKey}&units=metric`).then(r => r.json()),
            fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city2}&appid=${apiKey}&units=metric`).then(r => r.json())
        ]);
        document.getElementById('comparison-result').innerHTML = `
            <p><strong>${data1.name}:</strong> ${data1.main.temp}°C, ${data1.weather[0].description}</p>
            <p><strong>${data2.name}:</strong> ${data2.main.temp}°C, ${data2.weather[0].description}</p>
        `;
    } catch (error) {
        console.error('Comparison error:', error);
        document.getElementById('comparison-result').innerHTML = 'Error comparing cities.';
    }
}

function openSettings() {
    document.getElementById('settings').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settings').style.display = 'none';
}

function getUVCategory(uvi) {
    if (uvi <= 2) return 'Low';
    if (uvi <= 5) return 'Moderate';
    if (uvi <= 7) return 'High';
    if (uvi <= 10) return 'Very High';
    return 'Extreme';
}

function getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

// Function to calculate AQI from pollutant components (based on US EPA formula)
function calculateAQI(components) {
    if (!components) return 0;
    const pm25 = components.pm2_5;
    const pm10 = components.pm10;
    const no2 = components.no2;
    const o3 = components.o3;
    const so2 = components.so2;
    const co = components.co;

    const pm25AQI = calculatePollutantAQI(pm25, 'pm25');
    const pm10AQI = calculatePollutantAQI(pm10, 'pm10');
    const no2AQI = calculatePollutantAQI(no2, 'no2');
    const o3AQI = calculatePollutantAQI(o3, 'o3');
    const so2AQI = calculatePollutantAQI(so2, 'so2');
    const coAQI = calculatePollutantAQI(co, 'co');

    return Math.max(pm25AQI, pm10AQI, no2AQI, o3AQI, so2AQI, coAQI);
}

function calculatePollutantAQI(concentration, pollutant) {
    const breakpoints = {
        pm25: [
            { low: 0, high: 12, aqiLow: 0, aqiHigh: 50 },
            { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
            { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
            { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
            { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
            { low: 250.5, high: 350.4, aqiLow: 301, aqiHigh: 400 },
            { low: 350.5, high: 500.4, aqiLow: 401, aqiHigh: 500 }
        ],
        pm10: [
            { low: 0, high: 54, aqiLow: 0, aqiHigh: 50 },
            { low: 55, high: 154, aqiLow: 51, aqiHigh: 100 },
            { low: 155, high: 254, aqiLow: 101, aqiHigh: 150 },
            { low: 255, high: 354, aqiLow: 151, aqiHigh: 200 },
            { low: 355, high: 424, aqiLow: 201, aqiHigh: 300 },
            { low: 425, high: 504, aqiLow: 301, aqiHigh: 400 },
            { low: 505, high: 604, aqiLow: 401, aqiHigh: 500 }
        ],
        no2: [
            { low: 0, high: 53, aqiLow: 0, aqiHigh: 50 },
            { low: 54, high: 100, aqiLow: 51, aqiHigh: 100 },
            { low: 101, high: 360, aqiLow: 101, aqiHigh: 150 },
            { low: 361, high: 649, aqiLow: 151, aqiHigh: 200 },
            { low: 650, high: 1249, aqiLow: 201, aqiHigh: 300 },
            { low: 1250, high: 1649, aqiLow: 301, aqiHigh: 400 },
            { low: 1650, high: 2049, aqiLow: 401, aqiHigh: 500 }
        ],
                o3: [
                    { low: 0, high: 54, aqiLow: 0, aqiHigh: 50 },
                    { low: 55, high: 70, aqiLow: 51, aqiHigh: 100 },
                    { low: 71, high: 85, aqiLow: 101, aqiHigh: 150 },
                    { low: 86, high: 105, aqiLow: 151, aqiHigh: 200 },
                    { low: 106, high: 200, aqiLow: 201, aqiHigh: 300 },
                    { low: 201, high: 400, aqiLow: 301, aqiHigh: 400 },
                    { low: 401, high: 600, aqiLow: 401, aqiHigh: 500 }
                ],
                so2: [
                    { low: 0, high: 35, aqiLow: 0, aqiHigh: 50 },
                    { low: 36, high: 75, aqiLow: 51, aqiHigh: 100 },
                    { low: 76, high: 185, aqiLow: 101, aqiHigh: 150 },
                    { low: 186, high: 304, aqiLow: 151, aqiHigh: 200 },
                    { low: 305, high: 604, aqiLow: 201, aqiHigh: 300 },
                    { low: 605, high: 804, aqiLow: 301, aqiHigh: 400 },
                    { low: 805, high: 1004, aqiLow: 401, aqiHigh: 500 }
                ],
                co: [
                    { low: 0, high: 4.4, aqiLow: 0, aqiHigh: 50 },
                    { low: 4.5, high: 9.4, aqiLow: 51, aqiHigh: 100 },
                    { low: 9.5, high: 12.4, aqiLow: 101, aqiHigh: 150 },
                    { low: 12.5, high: 15.4, aqiLow: 151, aqiHigh: 200 },
                    { low: 15.5, high: 30.4, aqiLow: 201, aqiHigh: 300 },
                    { low: 30.5, high: 40.4, aqiLow: 301, aqiHigh: 400 },
                    { low: 40.5, high: 50.4, aqiLow: 401, aqiHigh: 500 }
                ]
            };
        
            const pollutantBreakpoints = breakpoints[pollutant];
            if (!pollutantBreakpoints || !concentration) return 0;
        
            const bracket = pollutantBreakpoints.find(bp => concentration >= bp.low && concentration <= bp.high);
            if (!bracket) return 0;
        
            const { low, high, aqiLow, aqiHigh } = bracket;
            return ((aqiHigh - aqiLow) / (high - low)) * (concentration - low) + aqiLow;
        }

        