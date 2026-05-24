// ═══════════════════════════════════════════════
//  CONFIG & STATE
// ═══════════════════════════════════════════════
const API_KEY = 'da5cc509bc967933cf9f957a7a06eb9b';
let isCelsius = true;
let isDark = true;
let map, mapTileLayer, historyChart;
let currentData = null;
let favorites = JSON.parse(localStorage.getItem('wv_favorites') || '[]');
let settings = JSON.parse(localStorage.getItem('wv_settings') || '{"map":true,"aqi":true,"sun":true,"particles":true,"notif":true,"alerts":true,"refresh":false}');
let refreshInterval = null;

const popularCities = ['London','New York','Tokyo','Paris','Dubai','Mumbai','Sydney','Berlin','Toronto','Singapore','Rome','Bangkok','Moscow','Cairo','Lagos'];

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
window.onload = () => {
  initParticles();
  renderFavorites();
  applySettings();
  // try load last city
  const last = localStorage.getItem('wv_lastCity');
  if(last) { document.getElementById('city').value = last; getWeather(); }
};

// ═══════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════
function initParticles() {
  if(!settings.particles) return;
  const colors = ['rgba(56,189,248,0.6)','rgba(129,140,248,0.5)','rgba(52,211,153,0.4)'];
  for(let i=0;i<20;i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random()*4+2;
    p.style.cssText = `width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}vw;bottom:-20px;animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*10}s;`;
    document.body.appendChild(p);
  }
}

// ═══════════════════════════════════════════════
//  SUGGESTIONS
// ═══════════════════════════════════════════════
function showSuggestions(val) {
  const box = document.getElementById('suggestions');
  if(!val || val.length < 2) { box.classList.remove('show'); return; }
  const matches = popularCities.filter(c => c.toLowerCase().startsWith(val.toLowerCase())).slice(0,5);
  if(!matches.length) { box.classList.remove('show'); return; }
  box.innerHTML = matches.map(c => `<div class="suggestion-item" onclick="selectCity('${c}')"><span>📍</span>${c}</div>`).join('');
  box.classList.add('show');
}
function selectCity(c) {
  document.getElementById('city').value = c;
  document.getElementById('suggestions').classList.remove('show');
  getWeather();
}
document.addEventListener('click', e => { if(!e.target.closest('.search-wrap')) document.getElementById('suggestions').classList.remove('show'); });

// ═══════════════════════════════════════════════
//  MAIN WEATHER FETCH
// ═══════════════════════════════════════════════
async function getWeather(cityName=null, lat=null, lon=null) {
  const city = cityName || document.getElementById('city').value.trim();
  if(!city && !lat) return;
  setLoading(true);
  clearError();

  const u = isCelsius ? 'metric' : 'imperial';
  const sym = isCelsius ? '°C' : '°F';

  let cUrl, fUrl;
  if(lat && lon) {
    cUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${u}`;
    fUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${u}`;
  } else {
    cUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${u}`;
    fUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${u}`;
  }

  try {
    const [cRes, fRes] = await Promise.all([fetch(cUrl), fetch(fUrl)]);
    if(!cRes.ok) throw new Error('City not found. Please try again.');
    const [cData, fData] = await Promise.all([cRes.json(), fRes.json()]);
    currentData = cData;

    localStorage.setItem('wv_lastCity', cData.name);
    renderHero(cData, sym);
    renderHourly(fData, sym);
    renderDaily(fData, sym);
    renderSunMoon(cData);
    updateBackground(cData.weather[0].main);
    fetchAQI(cData.coord.lat, cData.coord.lon);
    fetchUV(cData.coord.lat, cData.coord.lon);
    renderMap(cData.coord.lat, cData.coord.lon, cData.name);
    document.getElementById('lastUpdated').textContent = 'Updated: ' + new Date().toLocaleTimeString();

    if(cData.alerts && settings.alerts) showAlert(cData.alerts[0]);
    else document.getElementById('alertCard').classList.remove('show');

    setLoading(false);
    setStatus('✓ Data loaded for ' + cData.name);
  } catch(err) {
    setLoading(false);
    showError(err.message);
  }
}

function refreshWeather() {
  if(currentData) getWeather(currentData.name);
  else if(document.getElementById('city').value) getWeather();
}

// ═══════════════════════════════════════════════
//  RENDER HERO
// ═══════════════════════════════════════════════
function renderHero(d, sym) {
  document.getElementById('cityName').textContent = d.name + ', ' + d.sys.country;
  document.getElementById('cityMeta').textContent = `${d.coord.lat.toFixed(2)}°N, ${d.coord.lon.toFixed(2)}°E • ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}`;
  document.getElementById('temperature').textContent = Math.round(d.main.temp);
  document.getElementById('tempUnit').textContent = sym;
  document.getElementById('feelsLike').textContent = `Feels like ${Math.round(d.main.feels_like)}${sym}`;
  document.getElementById('description').textContent = d.weather[0].description;
  document.getElementById('tempHigh').textContent = Math.round(d.main.temp_max) + sym;
  document.getElementById('tempLow').textContent = Math.round(d.main.temp_min) + sym;
  document.getElementById('humidity').textContent = d.main.humidity + '%';
  document.getElementById('wind').textContent = d.wind.speed + ' m/s';
  document.getElementById('pressure').textContent = d.main.pressure + ' hPa';
  document.getElementById('visibility').textContent = d.visibility ? (d.visibility/1000).toFixed(1) + ' km' : '--';
  document.getElementById('windDir').textContent = degToCompass(d.wind.deg || 0);

  const icon = d.weather[0].icon;
  document.getElementById('weatherIconWrap').innerHTML = `<img class="hero-icon-img" src="https://openweathermap.org/img/wn/${icon}@4x.png" alt="weather">`;
}

function degToCompass(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg/45)%8];
}

// ═══════════════════════════════════════════════
//  HOURLY
// ═══════════════════════════════════════════════
function renderHourly(fData, sym) {
  const scroll = document.getElementById('hourlyScroll');
  const items = fData.list.slice(0, 12);
  scroll.innerHTML = items.map((f, i) => {
    const t = new Date(f.dt_txt);
    const label = i===0 ? 'Now' : t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    const pop = f.pop ? Math.round(f.pop*100) + '%' : '';
    return `<div class="hour-card${i===0?' current':''}">
      <div class="hour-time">${label}</div>
      <div class="hour-icon"><img src="https://openweathermap.org/img/wn/${f.weather[0].icon}@2x.png" alt=""></div>
      <div class="hour-temp">${Math.round(f.main.temp)}${sym}</div>
      ${pop ? `<div class="hour-pop">💧${pop}</div>` : ''}
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
//  7-DAY (derived from 3h forecast)
// ═══════════════════════════════════════════════
function renderDaily(fData, sym) {
  const days = {};
  fData.list.forEach(f => {
    const d = f.dt_txt.split(' ')[0];
    if(!days[d]) days[d] = {temps:[], icons:[], descs:[], pops:[]};
    days[d].temps.push(f.main.temp);
    days[d].icons.push(f.weather[0].icon);
    days[d].descs.push(f.weather[0].description);
    days[d].pops.push(f.pop||0);
  });

  const allTemps = fData.list.map(f=>f.main.temp);
  const globalMin = Math.min(...allTemps), globalMax = Math.max(...allTemps);

  const list = document.getElementById('dailyList');
  list.innerHTML = Object.entries(days).slice(0,7).map(([date, v]) => {
    const hi = Math.round(Math.max(...v.temps));
    const lo = Math.round(Math.min(...v.temps));
    const icon = v.icons[Math.floor(v.icons.length/2)];
    const desc = v.descs[Math.floor(v.descs.length/2)];
    const dayName = new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'});
    const barW = Math.round(((hi - globalMin)/(globalMax - globalMin))*100);
    return `<div class="day-row">
      <div class="day-name">${dayName}</div>
      <div class="day-icon"><img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="" width="36"></div>
      <div class="day-desc">${desc}</div>
      <div class="day-bar-wrap"><div class="day-bar" style="width:${barW}%"></div></div>
      <div class="day-temps"><span class="day-hi">${hi}${sym}</span><span class="day-lo">${lo}${sym}</span></div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
//  AQI
// ═══════════════════════════════════════════════
async function fetchAQI(lat, lon) {
  try {
    const r = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const d = await r.json();
    const comp = d.list[0].components;
    const aqi = calcAQI(comp);
    const cat = getAQICat(aqi);
    const col = getAQIColor(aqi);

    document.getElementById('aqiNum').textContent = aqi;
    document.getElementById('aqiNum').style.color = col;
    document.getElementById('aqiCat').textContent = cat;
    document.getElementById('aqiLabel').textContent = cat;
    document.getElementById('aqiLabel').style.color = col;
    document.getElementById('aqiDesc').textContent = getAQIAdvice(aqi);

    // Arc animation
    const arc = document.getElementById('aqiArc');
    const pct = Math.min(aqi/500, 1);
    arc.style.strokeDashoffset = 326.7 * (1 - pct);
    arc.style.stroke = col;

    // Pollutants
    const polls = [
      {n:'PM2.5',v:comp.pm2_5.toFixed(1),u:'μg/m³'},
      {n:'PM10',v:comp.pm10.toFixed(1),u:'μg/m³'},
      {n:'NO₂',v:comp.no2.toFixed(1),u:'μg/m³'},
      {n:'O₃',v:comp.o3.toFixed(1),u:'μg/m³'},
      {n:'SO₂',v:comp.so2.toFixed(1),u:'μg/m³'},
      {n:'CO',v:(comp.co/1000).toFixed(2),u:'mg/m³'},
    ];
    document.getElementById('pollutants').innerHTML = polls.map(p=>`
      <div class="poll-item">
        <div class="poll-name">${p.n}</div>
        <div class="poll-val">${p.v}</div>
        <div style="font-size:.65rem;color:var(--muted)">${p.u}</div>
      </div>`).join('');

    if(settings.notif && aqi > 150 && Notification.permission === 'granted')
      new Notification('⚠️ Air Quality Alert', {body:`AQI is ${aqi} (${cat}) — ${getAQIAdvice(aqi)}`});
    else if(Notification.permission !== 'denied') Notification.requestPermission();
  } catch(e) { console.warn('AQI fetch failed', e); }
}

async function fetchUV(lat, lon) {
  try {
    const r = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${API_KEY}`);
    if(!r.ok) return;
    const d = await r.json();
    const uv = d.current.uvi;
    document.getElementById('uv').textContent = uv + ' (' + getUVCat(uv) + ')';
  } catch(e) {}
}

// ═══════════════════════════════════════════════
//  MAP
// ═══════════════════════════════════════════════
let currentLat, currentLon;
function renderMap(lat, lon, name) {
  currentLat = lat; currentLon = lon;
  if(map) { map.remove(); map=null; }
  map = L.map('map').setView([lat, lon], 10);
  mapTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© OSM'}).addTo(map);
  L.marker([lat,lon]).addTo(map).bindPopup(`<b>${name}</b>`).openPopup();
}

const tileLayers = {
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
};

function setMapLayer(type, btn) {
  document.querySelectorAll('.map-layer-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(!map) return;
  if(mapTileLayer) map.removeLayer(mapTileLayer);
  mapTileLayer = L.tileLayer(tileLayers[type], {attribution:'© Map'}).addTo(map);
}

// ═══════════════════════════════════════════════
//  SUN / MOON
// ═══════════════════════════════════════════════
function renderSunMoon(d) {
  const sr = new Date(d.sys.sunrise * 1000);
  const ss = new Date(d.sys.sunset * 1000);
  const now = new Date();
  const fmt = t => t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});

  document.getElementById('sunriseTime').textContent = fmt(sr);
  document.getElementById('sunsetTime').textContent = fmt(ss);
  document.getElementById('sunriseLabel').textContent = fmt(sr);
  document.getElementById('sunsetLabel').textContent = fmt(ss);

  const totalMs = ss - sr;
  const dayH = Math.floor(totalMs/3600000);
  const dayM = Math.floor((totalMs%3600000)/60000);
  document.getElementById('dayLength').textContent = `${dayH}h ${dayM}m`;

  // Moon phase (approximate)
  const moonAge = getMoonAge(now);
  document.getElementById('moonPhase').textContent = getMoonEmoji(moonAge) + ' ' + getMoonName(moonAge);

  // Sun position on arc
  const nowMs = now - sr;
  const pct = Math.max(0, Math.min(1, nowMs / totalMs));
  const angle = Math.PI * pct;
  const arcR = 140;
  const cx = 50; // percent
  const x = (50 + Math.cos(Math.PI - angle) * 50) + '%';
  const y = (Math.sin(angle) * 100);
  document.getElementById('sunDot').style.left = x;
  document.getElementById('sunDot').style.bottom = y + 'px';
  document.getElementById('sunFill').style.clipPath = `inset(${100-y*0.65}% 0 0 0)`;
}

function getMoonAge(date) {
  const knownNew = new Date('2000-01-06');
  const diff = (date - knownNew) / (1000*60*60*24);
  return diff % 29.53;
}
function getMoonEmoji(age) {
  const phases = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  return phases[Math.round(age/29.53*8)%8];
}
function getMoonName(age) {
  if(age < 1.85) return 'New Moon';
  if(age < 7.38) return 'Waxing Crescent';
  if(age < 9.22) return 'First Quarter';
  if(age < 14.77) return 'Waxing Gibbous';
  if(age < 16.61) return 'Full Moon';
  if(age < 22.15) return 'Waning Gibbous';
  if(age < 23.99) return 'Last Quarter';
  return 'Waning Crescent';
}

// ═══════════════════════════════════════════════
//  HISTORY CHART
// ═══════════════════════════════════════════════
async function getHistoricalWeather() {
  const date = document.getElementById('history-date').value;
  if(!date) { alert('Pick a date first'); return; }
  if(!currentData) { alert('Search a city first'); return; }

  const ts = Math.floor(new Date(date).getTime()/1000);
  const lat = currentData.coord.lat, lon = currentData.coord.lon;

  try {
    const r = await fetch(`https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${ts}&appid=${API_KEY}&units=${isCelsius?'metric':'imperial'}`);
    const d = await r.json();
    const temps = d.data.map(h=>h.temp);
    const labels = d.data.map(h=>new Date(h.dt*1000).toLocaleTimeString('en-US',{hour:'2-digit'}));

    if(historyChart) historyChart.destroy();
    const ctx = document.getElementById('history-chart').getContext('2d');
    historyChart = new Chart(ctx, {
      type:'line',
      data:{
        labels,
        datasets:[{
          label:`Temp (${isCelsius?'°C':'°F'})`,
          data:temps,
          borderColor:'#38bdf8',
          backgroundColor:'rgba(56,189,248,.12)',
          fill:true,
          tension:.4,
          pointRadius:3,
          pointBackgroundColor:'#38bdf8',
        }]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:'#94a3b8',font:{family:'Outfit'}}}},
        scales:{
          x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#64748b'}},
          y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#64748b'}}
        }
      }
    });
  } catch(e) {
    // Show a demo chart if API fails (One Call 3.0 needs paid plan)
    const hours = Array.from({length:24},(_,i)=>i+':00');
    const fake = Array.from({length:24},()=>15+Math.round(Math.sin(Math.random()*3)*8));
    if(historyChart) historyChart.destroy();
    const ctx = document.getElementById('history-chart').getContext('2d');
    historyChart = new Chart(ctx,{type:'line',data:{labels:hours,datasets:[{label:'Temp (demo)',data:fake,borderColor:'#818cf8',backgroundColor:'rgba(129,140,248,.12)',fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94a3b8'}}},scales:{x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#64748b'}},y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#64748b'}}}}});
    setStatus('ℹ️ Historical API needs One Call 3.0 plan — showing demo data');
  }
}

// ═══════════════════════════════════════════════
//  COMPARE
// ═══════════════════════════════════════════════
async function compareCities() {
  const c1 = document.getElementById('city1').value.trim();
  const c2 = document.getElementById('city2').value.trim();
  if(!c1||!c2) { alert('Enter both cities'); return; }
  const u = isCelsius?'metric':'imperial', sym = isCelsius?'°C':'°F';

  try {
    const [r1,r2] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${c1}&appid=${API_KEY}&units=${u}`).then(r=>r.json()),
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${c2}&appid=${API_KEY}&units=${u}`).then(r=>r.json()),
    ]);

    const renderCard = (d, rival) => {
      const stats = [
        {l:'Temperature', v: d.main.temp, rv: rival.main.temp, unit:sym, higher:'warm'},
        {l:'Humidity', v: d.main.humidity, rv: rival.main.humidity, unit:'%', higher:'low'},
        {l:'Wind Speed', v: d.wind.speed, rv: rival.wind.speed, unit:' m/s', higher:'low'},
        {l:'Pressure', v: d.main.pressure, rv: rival.main.pressure, unit:' hPa', higher:'high'},
        {l:'Visibility', v: (d.visibility||0)/1000, rv: (rival.visibility||0)/1000, unit:' km', higher:'high'},
      ];
      return `<div class="compare-card">
        <div style="font-size:2rem;margin-bottom:4px"><img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png" width="50"></div>
        <h4>${d.name}, ${d.sys.country}</h4>
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:12px;text-transform:capitalize">${d.weather[0].description}</div>
        ${stats.map(s=>{
          const isBetter = s.higher==='high' ? s.v > s.rv : s.v < s.rv;
          return `<div class="compare-stat"><span>${s.l}</span><span class="${isBetter?'compare-winner':''}">${typeof s.v==='number'?s.v.toFixed(1):s.v}${s.unit}</span></div>`;
        }).join('')}
      </div>`;
    };

    document.getElementById('compareResult').innerHTML = renderCard(r1,r2) + renderCard(r2,r1);
  } catch(e) { document.getElementById('compareResult').innerHTML = '<p style="color:var(--danger)">Error fetching data. Check city names.</p>'; }
}

// ═══════════════════════════════════════════════
//  FAVORITES
// ═══════════════════════════════════════════════
function saveCurrentCity() {
  if(!currentData) { setStatus('Search a city first'); return; }
  const city = currentData.name;
  if(favorites.find(f=>f.name===city)) { setStatus('Already saved!'); return; }
  favorites.push({name:city, country:currentData.sys.country, temp:Math.round(currentData.main.temp), desc:currentData.weather[0].description});
  localStorage.setItem('wv_favorites', JSON.stringify(favorites));
  renderFavorites();
  setStatus('✓ ' + city + ' saved!');
}

function renderFavorites() {
  const grid = document.getElementById('favGrid');
  document.getElementById('favCount').textContent = favorites.length + ' saved';
  if(!favorites.length) {
    grid.innerHTML = '<div class="no-favorites">No saved cities yet. Search a city and click Save.</div>';
    return;
  }
  grid.innerHTML = favorites.map((f,i)=>`
    <div class="fav-card" onclick="loadFav('${f.name}')">
      <div class="fav-city">${f.name}, ${f.country}</div>
      <div class="fav-temp">${f.temp}${isCelsius?'°C':'°F'}</div>
      <div class="fav-desc">${f.desc}</div>
      <button class="fav-remove" onclick="event.stopPropagation();removeFav(${i})">✕</button>
    </div>`).join('');
}

function loadFav(city) {
  document.getElementById('city').value = city;
  getWeather();
}
function removeFav(i) {
  favorites.splice(i,1);
  localStorage.setItem('wv_favorites', JSON.stringify(favorites));
  renderFavorites();
}

// ═══════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════
function switchTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
  if(id==='map' && map) setTimeout(()=>map.invalidateSize(),100);
}

// ═══════════════════════════════════════════════
//  BACKGROUND
// ═══════════════════════════════════════════════
function updateBackground(main) {
  const m = main.toLowerCase();
  const body = document.body;
  ['clear-sky','rainy','snowy','stormy','cloudy'].forEach(c=>body.classList.remove(c));
  if(m.includes('clear')) body.classList.add('clear-sky');
  else if(m.includes('rain')||m.includes('drizzle')) body.classList.add('rainy');
  else if(m.includes('snow')) body.classList.add('snowy');
  else if(m.includes('thunder')) body.classList.add('stormy');
}

// ═══════════════════════════════════════════════
//  THEME & UNITS
// ═══════════════════════════════════════════════
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  document.body.classList.toggle('dark', isDark);
  document.getElementById('theme-btn').textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function toggleUnits() {
  isCelsius = !isCelsius;
  document.getElementById('unit-btn').textContent = isCelsius ? 'Switch to °F' : 'Switch to °C';
  if(currentData) getWeather(currentData.name);
}

// ═══════════════════════════════════════════════
//  VOICE SEARCH
// ═══════════════════════════════════════════════
function startVoiceSearch() {
  if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Voice search not supported in this browser'); return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.onstart = () => setStatus('🎤 Listening...');
  rec.onresult = e => {
    const q = e.results[0][0].transcript;
    document.getElementById('city').value = q;
    setStatus('🎤 Got: ' + q);
    getWeather();
  };
  rec.onerror = () => setStatus('Voice search failed');
  rec.start();
}

// ═══════════════════════════════════════════════
//  GEOLOCATION
// ═══════════════════════════════════════════════
function getCurrentLocationWeather() {
  if(!navigator.geolocation) { showError('Geolocation not supported'); return; }
  setStatus('📍 Getting your location...');
  navigator.geolocation.getCurrentPosition(
    pos => getWeather(null, pos.coords.latitude, pos.coords.longitude),
    () => showError('Location access denied. Please allow location access.')
  );
}

// ═══════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════
function openSettings() {
  document.getElementById('settingsDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeSettings() {
  document.getElementById('settingsDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}
function toggleSetting(key, el) {
  settings[key] = !settings[key];
  el.classList.toggle('on', settings[key]);
  localStorage.setItem('wv_settings', JSON.stringify(settings));
  if(key==='refresh') {
    clearInterval(refreshInterval);
    if(settings.refresh) refreshInterval = setInterval(refreshWeather, 5*60*1000);
  }
}
function applySettings() {
  Object.keys(settings).forEach(k => {
    const el = document.getElementById('tog-'+k);
    if(el) el.classList.toggle('on', settings[k]);
  });
  if(settings.refresh) refreshInterval = setInterval(refreshWeather, 5*60*1000);
}

// ═══════════════════════════════════════════════
//  ALERTS
// ═══════════════════════════════════════════════
function showAlert(alert) {
  if(!settings.alerts) return;
  document.getElementById('alertText').textContent = alert.description || alert.event;
  document.getElementById('alertCard').classList.add('show');
}

// ═══════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════
function setLoading(v) {
  document.getElementById('loading').classList.toggle('show', v);
}
function setStatus(msg) {
  document.getElementById('status-text').textContent = msg;
  setTimeout(()=>{ document.getElementById('status-text').textContent=''; }, 4000);
}
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 5000);
}
function clearError() {
  document.getElementById('error-msg').classList.remove('show');
}

// ═══════════════════════════════════════════════
//  AQI HELPERS
// ═══════════════════════════════════════════════
function calcAQI(c) {
  const pm25 = calcPollAQI(c.pm2_5,'pm25');
  const pm10 = calcPollAQI(c.pm10,'pm10');
  const no2 = calcPollAQI(c.no2,'no2');
  return Math.round(Math.max(pm25,pm10,no2));
}
function calcPollAQI(conc, type) {
  const bp = {
    pm25:[{l:0,h:12,al:0,ah:50},{l:12.1,h:35.4,al:51,ah:100},{l:35.5,h:55.4,al:101,ah:150},{l:55.5,h:150.4,al:151,ah:200},{l:150.5,h:250.4,al:201,ah:300}],
    pm10:[{l:0,h:54,al:0,ah:50},{l:55,h:154,al:51,ah:100},{l:155,h:254,al:101,ah:150},{l:255,h:354,al:151,ah:200},{l:355,h:424,al:201,ah:300}],
    no2:[{l:0,h:53,al:0,ah:50},{l:54,h:100,al:51,ah:100},{l:101,h:360,al:101,ah:150},{l:361,h:649,al:151,ah:200},{l:650,h:1249,al:201,ah:300}],
  };
  const bps = bp[type]; if(!bps||!conc) return 0;
  const b = bps.find(x=>conc>=x.l&&conc<=x.h);
  if(!b) return conc > bps[bps.length-1].h ? bps[bps.length-1].ah : 0;
  return ((b.ah-b.al)/(b.h-b.l))*(conc-b.l)+b.al;
}
function getAQICat(aqi) {
  if(aqi<=50) return 'Good'; if(aqi<=100) return 'Moderate';
  if(aqi<=150) return 'Unhealthy for Sensitive'; if(aqi<=200) return 'Unhealthy';
  if(aqi<=300) return 'Very Unhealthy'; return 'Hazardous';
}
function getAQIColor(aqi) {
  if(aqi<=50) return '#34d399'; if(aqi<=100) return '#fbbf24';
  if(aqi<=150) return '#f97316'; if(aqi<=200) return '#f87171';
  return '#c084fc';
}
function getAQIAdvice(aqi) {
  if(aqi<=50) return 'Air quality is excellent. Great day for outdoor activities!';
  if(aqi<=100) return 'Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exertion.';
  if(aqi<=150) return 'Members of sensitive groups may experience health effects. Consider reducing outdoor activity.';
  if(aqi<=200) return 'Everyone may begin to experience health effects. Avoid prolonged outdoor exertion.';
  return 'Health alert! Everyone may experience serious health effects. Avoid outdoor activity.';
}
function getUVCat(uv) {
  if(uv<=2) return 'Low'; if(uv<=5) return 'Moderate';
  if(uv<=7) return 'High'; if(uv<=10) return 'Very High'; return 'Extreme';
}