// Snapshot-only rendering for Practical section (read-only)
(function(){
  const mapEl = document.getElementById('map');
  const chipWeather = document.getElementById('chipWeather');
  const chipTraffic = document.getElementById('chipTraffic');
  const chipModel = document.getElementById('chipModel');

  if (!mapEl) return;

  function setChip(el, done){ if (el) el.dataset.state = done ? 'done' : ''; }

  // Fixed segment around Sydney CBD (from user example)
  const a = { lat: -33.911496, lng: 151.212878 };
  const b = { lat: -33.891834, lng: 151.216998 };
  const mid = { lat: (a.lat+b.lat)/2, lon: (a.lng+b.lng)/2 };
  const start = new Date(Date.now() - 29*24*3600*1000).toISOString().slice(0,10);
  const end = new Date().toISOString().slice(0,10);

  // Fill date inputs (read-only view)
  const startEl = document.getElementById('paStart');
  const endEl = document.getElementById('paEnd');
  if (startEl) startEl.value = start;
  if (endEl) endEl.value = end;
  // Demo mode: disable inputs so UI stays static while charts still render
  const trafficSel = document.getElementById('paTrafficSource');
  const bufferInput = document.getElementById('paBuffer');
  [startEl, endEl, trafficSel, bufferInput].forEach(el => {
    if (!el) return;
    el.setAttribute('disabled', 'true');
    el.setAttribute('aria-disabled', 'true');
    el.style.opacity = '0.7';
    el.style.pointerEvents = 'none';
    el.title = 'Demo mode: controls disabled';
  });

  // Add static coord box
  const coordBox = document.createElement('div');
  coordBox.style.cssText = 'position:absolute; left:10px; bottom:10px; z-index:1000; background: rgba(11,15,26,0.9); border:1px solid rgba(60,84,126,0.3); color:#cfe3ff; padding:6px 8px; border-radius:8px; font-size:12px;';
  coordBox.innerHTML = `Start: ${a.lat.toFixed(6)}, ${a.lng.toFixed(6)}<br>End: ${b.lat.toFixed(6)}, ${b.lng.toFixed(6)}`;
  const mapContainer = mapEl.parentElement; if (mapContainer) mapContainer.appendChild(coordBox);

  // Road-only styling (hide non-road labels/features where possible)
  const ROAD_ONLY_STYLES = [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "poi.government", stylers: [{ visibility: "off" }] },
    { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
    { featureType: "poi.school", stylers: [{ visibility: "off" }] },
    { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ visibility: "off" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] }
  ];

  // Sydney bounds to filter geotechnical points
  const SYD_BOUNDS = { north: -33.70, south: -34.10, east: 151.35, west: 150.90 };
  function isInSydney(lat, lon){
    return lat <= SYD_BOUNDS.north && lat >= SYD_BOUNDS.south && lon >= SYD_BOUNDS.west && lon <= SYD_BOUNDS.east;
  }

  function ensureCharts(){
    const common = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display:false }, tooltip:{mode:'index', intersect:false} },
      scales: { x: { ticks:{ color:'#cfe3ff' }, grid:{ color:'rgba(99,123,168,0.15)' } }, y: { ticks:{ color:'#cfe3ff' }, grid:{ color:'rgba(99,123,168,0.15)' } } }
    };
    if (!window._rainChart){
      window._rainChart = new Chart(document.getElementById('chartRain'), { type:'bar', data:{ labels:[], datasets:[{ label:'Rain (mm)', data:[], backgroundColor:'rgba(123,212,255,0.6)' }] }, options: common });
    }
    if (!window._tempChart){
      window._tempChart = new Chart(document.getElementById('chartTemp'), { type:'line', data:{ labels:[], datasets:[{ label:'Tmax', data:[], borderColor:'#7bd4ff', tension:0.25 }, { label:'Tmin', data:[], borderColor:'#8ef5c0', tension:0.25 }] }, options: common });
    }
    if (!window._windChart){
      window._windChart = new Chart(document.getElementById('chartWind'), { type:'line', data:{ labels:[], datasets:[{ label:'Gust (km/h)', data:[], borderColor:'#bba6ff', tension:0.25 }] }, options: common });
    }
    if (!window._trafficFlowChart){
      window._trafficFlowChart = new Chart(document.getElementById('chartTrafficFlow'), { type:'line', data:{ labels:[], datasets:[{ label:'Traffic Flow Index', data:[], borderColor:'#ff6b6b', tension:0.25, fill:true, backgroundColor:'rgba(255,107,107,0.1)' }] }, options: common });
    }
  }

  async function fetchWeather(lat, lon, start, end){
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('start_date', start);
    url.searchParams.set('end_date', end);
    url.searchParams.set('daily', ['precipitation_sum','temperature_2m_max','temperature_2m_min','wind_gusts_10m_max'].join(','));
    url.searchParams.set('timezone','Australia/Melbourne');
    url.searchParams.set('models','era5_seamless');
    const r = await fetch(url, { mode:'cors' });
    if (!r.ok) throw new Error('weather');
    return r.json();
  }

  async function fetchTraffic(){
    return { type:'FeatureCollection', features: [] };
  }

  function updateCharts(weather){
    ensureCharts();
    const t = weather?.daily?.time || [];
    const p = (weather?.daily?.precipitation_sum || []).map(v=>v==null?0:v);
    const tmax = (weather?.daily?.temperature_2m_max || []).map(v=>v==null?null:v);
    const tmin = (weather?.daily?.temperature_2m_min || []).map(v=>v==null?null:v);
    const gust = (weather?.daily?.wind_gusts_10m_max || []).map(v=>v==null?null:v);
    window._rainChart.data.labels = t; window._rainChart.data.datasets[0].data = p; window._rainChart.update();
    window._tempChart.data.labels = t; window._tempChart.data.datasets[0].data = tmax; window._tempChart.data.datasets[1].data = tmin; window._tempChart.update();
    window._windChart.data.labels = t; window._windChart.data.datasets[0].data = gust; window._windChart.update();
    // Simple synthetic traffic series aligned to dates
    const flow = t.map((_,i)=> Math.max(10, Math.min(95, 70 + 10*Math.sin(i/3) + (Math.random()-0.5)*6)));
    window._trafficFlowChart.data.labels = t; window._trafficFlowChart.data.datasets[0].data = flow; window._trafficFlowChart.update();
  }

  function initMap(){
    return null; // Map disabled for placeholder snapshot
  }

  // Lightweight CSV loader + parser (robust to quoted commas)
  async function loadGeotechCsv(){
    try{
      const r = await fetch('newdata_points.csv', { cache:'no-cache' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    }catch(err){ console.error('Failed to load newdata_points.csv:', err); return null; }
  }
  function parseCsv(text){
    function splitCsvRow(line){
      const out = []; let cur = ''; let inQuotes = false; let i = 0;
      while (i < line.length){
        const ch = line[i];
        if (ch === '"'){
          if (inQuotes && line[i+1] === '"'){ cur += '"'; i += 2; continue; }
          inQuotes = !inQuotes; i++; continue;
        }
        if (ch === ',' && !inQuotes){ out.push(cur); cur=''; i++; continue; }
        cur += ch; i++;
      }
      out.push(cur);
      return out;
    }
    const lines = text.split(/\r?\n/).filter(l=>l.trim()); if (!lines.length) return [];
    const header = splitCsvRow(lines[0]).map(h => h.trim());
    const idx = (name) => header.indexOf(name);
    const ilat = idx('lat'), ilon = idx('lon');
    const ittex = idx('top_texture');
    const rows = [];
    for (let i=1;i<lines.length;i++){
      const row = splitCsvRow(lines[i]);
      const lat = parseFloat(row[ilat]);
      const lon = parseFloat(row[ilon]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      rows.push({ lat, lon, top_texture: (row[ittex]||'').trim() });
    }
    return rows;
  }

  function textureColor(tex){
    return ({
      'sp:field-texture-CL':  '#1f77b4',
      'sp:field-texture-SCL': '#ff7f0e',
      'sp:field-texture-LS':  '#2ca02c',
      'sp:field-texture-ZCL': '#d62728',
      'sp:field-texture-CLS': '#9467bd',
      'sp:field-texture-SL':  '#8c564b',
      'sp:field-texture-L':   '#e377c2',
      'sp:field-texture-ZL':  '#7f7f7f',
      'sp:field-texture-AP':  '#bcbd22',
      'sp:field-texture-CS':  '#17becf',
      'sp:field-texture-HP':  '#393b79',
      'sp:field-texture-S':   '#637939',
      'sp:field-texture-LP':  '#8c6d31',
      'sp:field-texture-IP':  '#843c39',
      'sp:field-texture-SP':  '#7b4173',
      'sp:field-texture-CP':  '#5254a3'
    }[tex] || '#f59e0b');
  }

  async function addGeotechMarkers(map){
    const text = await loadGeotechCsv(); if (!text) return;
    let rows = parseCsv(text);
    rows = rows.filter(r => isInSydney(r.lat, r.lon));
    if (!rows.length) return;
    // Map disabled; skip marker rendering
  }

  async function render(){
    try {
      const map = initMap();
      const weather = await fetchWeather(mid.lat, mid.lon, start, end).catch(()=>({}));
      setChip(chipWeather, true);
      setChip(chipTraffic, true);
      setChip(chipModel, true);
      updateCharts(weather);
      await addGeotechMarkers(map);
    } catch (e) {
      // swallow
    }
  }

  // Render immediately (no Google Maps dependency)
  render();
})();


