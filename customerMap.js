// LocalKaam Interactive Map Module
// Built with Leaflet + OpenStreetMap (100% Free, Zero API Keys Required)
// Features: Geolocation, Nominatim address search, Category colored markers,
// 2-way synced list, Haversine nearby filters, OSRM turn-by-turn routing & live tracking.

import { StorageService } from './storage.js';
import { CATEGORIES, LOCALITIES } from './data.js';
import { Toast } from './toast.js';
import { esc } from './utils.js';

// Demo City Fallback: Mumbai, India
export const DEMO_CITY_CENTER = {
  lat: 19.0760,
  lng: 72.8777,
  name: 'Mumbai Center'
};

// Fix Leaflet default marker asset paths for standard browser / module environments
if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  });
}

// Category color and icon mapping
export const CATEGORY_STYLES = {
  plumber: { color: '#2563eb', bg: '#eff6ff', icon: '🔧', label: 'Plumber' },
  electrician: { color: '#d97706', bg: '#fef3c7', icon: '⚡', label: 'Electrician' },
  carpenter: { color: '#ea580c', bg: '#fff7ed', icon: '🪚', label: 'Carpenter' },
  painter: { color: '#9333ea', bg: '#faf5ff', icon: '🎨', label: 'Painter' },
  cleaner: { color: '#16a34a', bg: '#f0fdf4', icon: '🧹', label: 'Cleaner' },
  cleaning: { color: '#16a34a', bg: '#f0fdf4', icon: '🧹', label: 'Cleaner' },
  appliance_repair: { color: '#0284c7', bg: '#f0f9ff', icon: '🔌', label: 'Appliance Repair' },
  ac_repair: { color: '#0891b2', bg: '#ecfeff', icon: '❄️', label: 'AC Repair' },
  default: { color: '#4f46e5', bg: '#eef2ff', icon: '🛠️', label: 'Service Pro' }
};

export function getCategoryStyle(categoryKey) {
  return CATEGORY_STYLES[categoryKey] || CATEGORY_STYLES.default;
}

// Generate stylish custom SVG Leaflet pin icons
export function createCategoryDivIcon(categoryKey, isOnline = true, isSelected = false) {
  const style = getCategoryStyle(categoryKey);
  const strokeColor = isSelected ? '#111827' : style.color;
  const strokeWidth = isSelected ? '3' : '2';
  const size = isSelected ? 44 : 38;

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; transform: translate(-50%, -100%); cursor: pointer; transition: transform 0.2s ease;">
      <svg viewBox="0 0 36 44" width="${size}" height="${size}" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <path d="M18 0 C8 0 0 8 0 18 C0 29 18 44 18 44 C18 44 36 29 36 18 C36 8 28 0 18 0 Z" fill="${style.color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
        <circle cx="18" cy="17" r="13" fill="#ffffff" />
      </svg>
      <div style="position: absolute; top: ${size * 0.16}px; left: ${size * 0.24}px; font-size: ${size * 0.42}px; line-height: 1; pointer-events: none;">
        ${style.icon}
      </div>
      ${isOnline ? `
        <span style="position: absolute; bottom: ${size * 0.42}px; right: 2px; width: 10px; height: 10px; background: #10b981; border: 2px solid #ffffff; border-radius: 50%; display: block;"></span>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'custom-cat-pin',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -size]
  });
}

// Customer live location pulsing marker
export function createCustomerDivIcon() {
  const html = `
    <div style="position: relative; width: 32px; height: 32px; transform: translate(-50%, -50%);">
      <div style="position: absolute; inset: 0; background: rgba(220, 38, 38, 0.25); border-radius: 50%; animation: pulseRing 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;"></div>
      <div style="position: absolute; top: 6px; left: 6px; width: 20px; height: 20px; background: #dc2626; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px;">
        📍
      </div>
    </div>
  `;
  return L.divIcon({
    className: 'customer-pin',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18]
  });
}

// Moving Worker Transit Scooter Icon for Live Tracking
export function createWorkerTransitIcon() {
  const html = `
    <div style="position: relative; width: 42px; height: 42px; transform: translate(-50%, -50%);">
      <div style="position: absolute; inset: 0; background: rgba(37, 99, 235, 0.25); border-radius: 50%; animation: pulseRing 1.5s infinite;"></div>
      <div style="position: absolute; top: 4px; left: 4px; width: 34px; height: 34px; background: #2563eb; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4); font-size: 18px;">
        🛵
      </div>
    </div>
  `;
  return L.divIcon({
    className: 'worker-transit-pin',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -20]
  });
}

export const CustomerMap = {
  mapInstance: null,
  customerLocation: { ...DEMO_CITY_CENTER },
  customerMarker: null,
  workerMarkers: new Map(), // workerId -> Leaflet marker
  activeRouteLayer: null,
  liveTrackingBooking: null,
  trackingWatchId: null,
  trackingInterval: null,
  sseSource: null,

  // Active filter state
  filters: {
    service: 'all',
    radius: 10,
    minRating: 0,
    availableOnly: true,
    searchQuery: ''
  },

  cachedWorkers: [],

  /**
   * Initialize and render the customer map interface
   */
  async mount(container, options = {}) {
    this.cleanup();

    if (options.preselectedService) {
      this.filters.service = options.preselectedService;
    }
    if (options.trackingBooking) {
      this.liveTrackingBooking = options.trackingBooking;
    }

    container.innerHTML = this.renderMapLayout();

    await this.initLeafletMap(container);
    this.attachEvents(container);
    // Show workers immediately at the current centre — don't block on
    // GPS (which can sit on its permission prompt for ~6s). When GPS
    // resolves, re-centre and refresh the nearby list in the background.
    await this.fetchAndDisplayWorkers();
    this.detectUserLocation().then(() => {
      if (this.mapInstance) this.fetchAndDisplayWorkers();
    });

    // If viewing active live tracking, start routing
    if (this.liveTrackingBooking) {
      this.startLiveTrackingMode(this.liveTrackingBooking);
    }
  },

  // Wait for the Leaflet CDN script (deferred in index.html). If it
  // never arrives (blocked/slow network), inject it ourselves and wait
  // again — instead of leaving a blank grey box forever.
  async ensureLeaflet(mapElement) {
    if (typeof L !== 'undefined') return true;
    try {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    } catch (_) {}
    if (typeof L === 'undefined' && mapElement) {
      mapElement.innerHTML = '<div style="display:grid;place-items:center;height:100%;padding:2rem;text-align:center;color:#6b7280;">🗺️ Map library could not load. Check your connection and <button class="btn btn-primary btn-sm" onclick="window.location.reload()">Reload</button></div>';
    }
    return typeof L !== 'undefined';
  },

  renderMapLayout() {
    return `
      <div class="customer-map-page" style="display: flex; flex-direction: column; height: calc(100vh - 120px); min-height: 600px; gap: 0.75rem;">
        
        <!-- Top Location Search & Filter Controls -->
        <div class="map-controls-header" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-cards); padding: 0.85rem 1rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; box-shadow: var(--shadow-subtle);">
          
          <!-- Search Address / Locality with Nominatim -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 280px; position: relative;">
            <span style="font-size: 1.1rem;">📍</span>
            <input type="text" id="map-address-search" class="form-control" placeholder="Search locality or landmark in Mumbai (e.g. Bandra, Powai, Juhu)..." style="font-size: 0.88rem; padding: 0.5rem 0.75rem; flex: 1;">
            <button class="btn btn-outline btn-sm" id="map-search-btn" title="Search Address via OpenStreetMap Nominatim">
              Search
            </button>
            <button class="btn btn-outline btn-sm" id="map-current-loc-btn" title="Use My Current GPS Location" style="display: flex; align-items: center; gap: 0.25rem;">
              <span>🎯</span> <span class="hide-mobile">My Location</span>
            </button>
          </div>

          <!-- Quick Filters: Service, Radius, Rating, Online Only -->
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            
            <!-- Service Selector -->
            <select id="map-service-filter" class="form-select" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; min-width: 140px;">
              <option value="all" ${this.filters.service === 'all' ? 'selected' : ''}>🌟 All Services</option>
              <option value="plumber" ${this.filters.service === 'plumber' ? 'selected' : ''}>🔧 Plumber</option>
              <option value="electrician" ${this.filters.service === 'electrician' ? 'selected' : ''}>⚡ Electrician</option>
              <option value="carpenter" ${this.filters.service === 'carpenter' ? 'selected' : ''}>🪚 Carpenter</option>
              <option value="painter" ${this.filters.service === 'painter' ? 'selected' : ''}>🎨 Painter</option>
              <option value="cleaner" ${this.filters.service === 'cleaner' ? 'selected' : ''}>🧹 Cleaner</option>
              <option value="appliance_repair" ${this.filters.service === 'appliance_repair' ? 'selected' : ''}>🔌 Appliance Repair</option>
            </select>

            <!-- Radius Filter -->
            <select id="map-radius-filter" class="form-select" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; width: 110px;">
              <option value="1" ${this.filters.radius === 1 ? 'selected' : ''}>1 km</option>
              <option value="3" ${this.filters.radius === 3 ? 'selected' : ''}>3 km</option>
              <option value="5" ${this.filters.radius === 5 ? 'selected' : ''}>5 km</option>
              <option value="10" ${this.filters.radius === 10 ? 'selected' : ''}>10 km</option>
              <option value="25" ${this.filters.radius === 25 ? 'selected' : ''}>25 km (All)</option>
            </select>

            <!-- Rating Filter -->
            <select id="map-rating-filter" class="form-select" style="font-size: 0.82rem; padding: 0.45rem 0.75rem; width: 110px;">
              <option value="0" ${this.filters.minRating === 0 ? 'selected' : ''}>⭐ Any Rating</option>
              <option value="4.0" ${this.filters.minRating === 4.0 ? 'selected' : ''}>⭐ 4.0+</option>
              <option value="4.5" ${this.filters.minRating === 4.5 ? 'selected' : ''}>⭐ 4.5+</option>
              <option value="4.8" ${this.filters.minRating === 4.8 ? 'selected' : ''}>⭐ 4.8+</option>
            </select>

            <!-- Available Only Toggle -->
            <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; user-select: none;">
              <input type="checkbox" id="map-available-only" ${this.filters.availableOnly ? 'checked' : ''} style="cursor: pointer;">
              <span>Online Now</span>
            </label>

          </div>
        </div>

        <!-- Live Tracking Banner (when active) -->
        <div id="live-tracking-banner" style="display: none; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem; animation: floatSoft 3s ease-in-out infinite;">🛵</span>
            <div>
              <div style="font-weight: 700; color: #1e40af; font-size: 0.95rem;" id="tracking-title">Worker En Route</div>
              <div style="font-size: 0.82rem; color: #3b82f6;" id="tracking-eta">Calculating route and arrival time...</div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="btn btn-outline btn-sm" id="btn-simulate-tracking" style="font-size: 0.75rem; background: white;">
              🎮 Simulate Live Drive
            </button>
            <button class="btn btn-danger btn-sm" id="btn-close-tracking" style="font-size: 0.75rem;">
              Close Tracking
            </button>
          </div>
        </div>

        <!-- Main Map & Synced List Panel Grid -->
        <div class="map-grid-split" style="display: grid; grid-template-columns: 1fr 380px; gap: 0.75rem; flex: 1; min-height: 480px; position: relative;">
          
          <!-- Leaflet Map Container -->
          <div id="leaflet-map-canvas" style="width: 100%; height: 100%; min-height: 450px; border-radius: var(--radius-cards); border: 1px solid var(--border-color); overflow: hidden; background: #e5e7eb; position: relative;">
            <div id="map-loading-indicator" style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 1000; background: rgba(0,0,0,0.75); color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; display: none; align-items: center; gap: 6px;">
              <span>⏳</span> Updating nearby workers...
            </div>
          </div>

          <!-- Synced Nearby Workers List Panel -->
          <div class="map-sidebar-list" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-cards); display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-subtle);">
            
            <div style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary);">
              <div>
                <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">Nearby Professionals</h3>
                <span style="font-size: 0.75rem; color: var(--text-secondary);" id="map-results-count">Finding nearby workers...</span>
              </div>
              <span class="badge" style="background: var(--accent-light); color: var(--accent-primary); font-size: 0.75rem;">
                OSM Free Map
              </span>
            </div>

            <!-- Scrollable Worker Cards List -->
            <div id="map-worker-cards-container" style="overflow-y: auto; flex: 1; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.65rem;">
              <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <span>🔍 Locating service professionals around your position...</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;
  },

  async initLeafletMap(container) {
    const mapElement = container.querySelector('#leaflet-map-canvas');
    if (!mapElement) return;
    if (!(await this.ensureLeaflet(mapElement))) return;

    // Center on current location or demo city
    const initialCenter = [this.customerLocation.lat, this.customerLocation.lng];

    this.mapInstance = L.map(mapElement, {
      center: initialCenter,
      zoom: 13,
      zoomControl: true
    });

    // Add standard OpenStreetMap tiles (free, zero API key), with a
    // one-time fallback to Carto basemap if OSM tiles are blocked.
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(this.mapInstance);
    tileLayer.on('tileerror', () => {
      if (tileLayer.options.url.includes('openstreetmap')) {
        tileLayer.setUrl('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', true);
      }
    });

    // Keep tiles crisp when the window/sidebar resizes
    this._onResize = () => { if (this.mapInstance) this.mapInstance.invalidateSize(); };
    window.addEventListener('resize', this._onResize);

    // Add customer marker
    this.customerMarker = L.marker(initialCenter, {
      icon: createCustomerDivIcon(),
      title: 'Your Location'
    }).addTo(this.mapInstance);

    this.customerMarker.bindPopup(`
      <div style="font-family: Inter, sans-serif; padding: 4px;">
        <div style="font-weight: 700; font-size: 0.9rem; color: #dc2626; margin-bottom: 2px;">📍 Your Location</div>
        <div style="font-size: 0.78rem; color: #4b5563;">${esc(this.customerLocation.name || 'Current Service Point')}</div>
      </div>
    `);

    // Invalidate size after layout stabilization
    setTimeout(() => {
      if (this.mapInstance) this.mapInstance.invalidateSize();
    }, 200);
  },

  /**
   * Browser Geolocation detection with Mumbai fallback
   */
  async detectUserLocation() {
    if (!navigator.geolocation) {
      this.setCustomerLocation(DEMO_CITY_CENTER.lat, DEMO_CITY_CENTER.lng, DEMO_CITY_CENTER.name);
      return;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.setCustomerLocation(pos.coords.latitude, pos.coords.longitude, 'My Detected Location');
          resolve();
        },
        (err) => {
          console.warn('[Geolocation denied/error]', err.message, 'Falling back to Mumbai center');
          Toast.show('Location access denied. Using demo center: Mumbai (19.0760, 72.8777)', 'info');
          this.setCustomerLocation(DEMO_CITY_CENTER.lat, DEMO_CITY_CENTER.lng, DEMO_CITY_CENTER.name);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    });
  },

  setCustomerLocation(lat, lng, name = 'Service Location') {
    this.customerLocation = { lat, lng, name };
    if (this.customerMarker && this.mapInstance) {
      this.customerMarker.setLatLng([lat, lng]);
      this.customerMarker.getPopup().setContent(`
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <div style="font-weight: 700; font-size: 0.9rem; color: #dc2626; margin-bottom: 2px;">📍 ${esc(name)}</div>
          <div style="font-size: 0.78rem; color: #4b5563;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</div>
        </div>
      `);
      this.mapInstance.panTo([lat, lng]);
    }
  },

  /**
   * Search an address or locality using OpenStreetMap Nominatim
   */
  async searchNominatimAddress(query) {
    if (!query || !query.trim()) return;

    const trimmed = query.trim();
    Toast.show(`Searching for "${trimmed}"...`, 'info');

    try {
      const q = trimmed.toLowerCase().includes('mumbai') ? trimmed : `${trimmed}, Mumbai, India`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&viewbox=72.7,18.8,73.2,19.4&bounded=0&limit=1`;
      
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      });
      const results = await res.json();

      if (results && results.length > 0) {
        const place = results[0];
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        this.setCustomerLocation(lat, lng, place.display_name.split(',')[0]);
        if (this.mapInstance) {
          this.mapInstance.flyTo([lat, lng], 14, { duration: 1.2 });
        }
        Toast.show(`Location set: ${place.display_name.split(',')[0]}`, 'success');
        await this.fetchAndDisplayWorkers();
      } else {
        Toast.show(`No Mumbai location found for "${trimmed}". Try another locality.`, 'error');
      }
    } catch (err) {
      console.error('[Nominatim error]', err);
      Toast.show('Address search failed. Please try again.', 'error');
    }
  },

  /**
   * Fetch nearby workers from backend GET /api/workers/nearby
   */
  async fetchAndDisplayWorkers() {
    const loading = document.getElementById('map-loading-indicator');
    if (loading) loading.style.display = 'flex';

    try {
      const { lat, lng } = this.customerLocation;
      const { service, radius, minRating, availableOnly } = this.filters;

      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
        service,
        minRating: minRating.toString(),
        availableOnly: availableOnly ? 'true' : 'false'
      });

      let workers = [];

      try {
        const res = await fetch(`/api/workers/nearby?${params.toString()}`);
        // On Vercel the static fallback returns index.html (200) for API
        // paths — only treat an actual JSON response as worker data.
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          workers = Array.isArray(data) ? data : (data.workers || []);
        } else {
          throw new Error('Server endpoint unavailable');
        }
      } catch (e) {
        // Fallback to client-side store if server endpoint is unavailable
        const stored = StorageService.getWorkers();
        workers = stored.map(w => {
          const wLat = w.lat || (w.location?.coordinates ? w.location.coordinates[1] : 19.0760);
          const wLng = w.lng || (w.location?.coordinates ? w.location.coordinates[0] : 72.8777);
          const dist = this.haversine(lat, lng, wLat, wLng);
          return {
            ...w,
            lat: wLat,
            lng: wLng,
            distanceKm: dist,
            estimatedArrivalMinutes: Math.round(dist * 3.5 + 8)
          };
        }).filter(w => {
          if (radius > 0 && w.distanceKm > radius) return false;
          if (service !== 'all') {
            const hasService = (w.specialities && (w.specialities[service] || (service === 'cleaner' && w.specialities['cleaning']))) ||
                               w.category === service || (service === 'cleaner' && w.category === 'cleaning');
            if (!hasService) return false;
          }
          if (minRating > 0 && (w.ratingAverage || 0) < minRating) return false;
          if (availableOnly && (!w.available || w.pauseNewBookings)) return false;
          return true;
        }).sort((a, b) => a.distanceKm - b.distanceKm);
      }

      this.cachedWorkers = workers;
      this.renderWorkerMarkers(workers);
      this.renderWorkerListPanel(workers);

    } catch (err) {
      console.error('[fetchAndDisplayWorkers error]', err);
    } finally {
      if (loading) loading.style.display = 'none';
    }
  },

  haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  },

  /**
   * Render worker markers on the Leaflet map with category styling
   */
  renderWorkerMarkers(workers) {
    if (!this.mapInstance) return;

    // Clear existing worker markers
    for (const [id, marker] of this.workerMarkers.entries()) {
      this.mapInstance.removeLayer(marker);
    }
    this.workerMarkers.clear();

    workers.forEach(w => {
      const primaryCat = Object.keys(w.specialities || {})[0] || 'plumber';
      const spec = w.specialities?.[primaryCat] || { startingPrice: 350 };
      const catStyle = getCategoryStyle(primaryCat);

      const marker = L.marker([w.lat, w.lng], {
        icon: createCategoryDivIcon(primaryCat, w.available, false),
        title: `${w.name} (${catStyle.label})`
      }).addTo(this.mapInstance);

      // Marker popup contents
      const popupHtml = `
        <div class="map-worker-popup" style="font-family: Inter, sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <img src="${esc(w.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80')}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid ${catStyle.color};" />
            <div>
              <div style="font-weight: 700; font-size: 0.95rem; color: #111827; line-height: 1.2;">${esc(w.name)}</div>
              <div style="font-size: 0.75rem; color: ${catStyle.color}; font-weight: 600;">${catStyle.icon} ${catStyle.label}</div>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.5rem; background: #f3f4f6; padding: 4px 8px; border-radius: 6px;">
            <span>⭐ <strong>${w.ratingAverage || 4.8}</strong> (${w.ratingCount || 0})</span>
            <span>📍 <strong>${w.distanceKm} km</strong></span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; font-size: 0.82rem;">
            <span style="color: #4b5563;">Rate from:</span>
            <span style="font-weight: 700; color: #15803d; font-size: 0.95rem;">₹${spec.startingPrice || 350}/job</span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: #16a34a; margin-bottom: 0.75rem;">
            <span>⚡</span> Estimated arrival: <strong>~${w.estimatedArrivalMinutes} mins</strong>
          </div>

          <button class="btn btn-primary btn-sm map-popup-book-btn" data-worker-id="${esc(w.id)}" style="width: 100%; font-size: 0.82rem; padding: 0.45rem; border-radius: 6px;">
            ⚡ Book Now
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      // Click on marker -> highlight synced list item
      marker.on('click', () => {
        this.highlightWorkerInList(w.id);
      });

      this.workerMarkers.set(w.id, marker);
    });

    // Auto-fit bounds if we have workers
    if (workers.length > 0) {
      const bounds = L.latLngBounds([
        [this.customerLocation.lat, this.customerLocation.lng],
        ...workers.map(w => [w.lat, w.lng])
      ]);
      this.mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  },

  /**
   * Render synced list panel of worker cards
   */
  renderWorkerListPanel(workers) {
    const container = document.getElementById('map-worker-cards-container');
    const countLabel = document.getElementById('map-results-count');
    if (!container) return;

    if (countLabel) {
      countLabel.textContent = `${workers.length} professionals within ${this.filters.radius} km`;
    }

    if (workers.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.35rem;">No active workers found in this radius</div>
          <p style="font-size: 0.8rem; margin: 0;">Try expanding the radius to 10 km, choosing "All Services", or turning off "Online Now".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = workers.map(w => {
      const primaryCat = Object.keys(w.specialities || {})[0] || 'plumber';
      const spec = w.specialities?.[primaryCat] || { startingPrice: 350 };
      const catStyle = getCategoryStyle(primaryCat);

      return `
        <div class="map-worker-card" id="list-worker-${esc(w.id)}" data-worker-id="${esc(w.id)}" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; cursor: pointer; transition: all 0.2s ease;">
          <div style="display: flex; gap: 0.65rem;">
            <img src="${esc(w.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80')}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid ${catStyle.color}; flex-shrink: 0;" />
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${esc(w.name)}
                </div>
                <span class="badge" style="background: ${catStyle.bg}; color: ${catStyle.color}; font-size: 0.7rem; padding: 2px 6px;">
                  ${catStyle.icon} ${catStyle.label}
                </span>
              </div>

              <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                <span>⭐ ${w.ratingAverage || 4.8}</span>
                <span>•</span>
                <span>📍 <strong>${w.distanceKm} km</strong></span>
                <span>•</span>
                <span style="color: #16a34a; font-weight: 600;">~${w.estimatedArrivalMinutes} min ETA</span>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <div style="font-size: 0.82rem; font-weight: 700; color: #15803d;">
                  ₹${spec.startingPrice || 350}/job
                </div>
                <button class="btn btn-primary btn-sm list-book-btn" data-worker-id="${esc(w.id)}" style="font-size: 0.78rem; padding: 0.35rem 0.65rem;">
                  Book
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers for two-way sync
    container.querySelectorAll('.map-worker-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.list-book-btn')) return; // let booking button handle itself
        const workerId = card.getAttribute('data-worker-id');
        this.focusWorkerMarker(workerId);
      });
    });

    // Attach list book buttons
    container.querySelectorAll('.list-book-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const workerId = btn.getAttribute('data-worker-id');
        this.triggerBookingModal(workerId);
      });
    });
  },

  /**
   * Two-Way Sync: Clicking a list card pans map to marker & opens popup
   */
  focusWorkerMarker(workerId) {
    const marker = this.workerMarkers.get(workerId);
    if (!marker || !this.mapInstance) return;

    const latLng = marker.getLatLng();
    this.mapInstance.flyTo(latLng, 15, { duration: 0.8 });
    marker.openPopup();
    this.highlightWorkerInList(workerId);
  },

  /**
   * Two-Way Sync: Highlight corresponding list card & scroll into view
   */
  highlightWorkerInList(workerId) {
    const container = document.getElementById('map-worker-cards-container');
    if (!container) return;

    container.querySelectorAll('.map-worker-card').forEach(c => {
      c.style.borderColor = 'var(--border-color)';
      c.style.backgroundColor = 'var(--bg-primary)';
    });

    const targetCard = document.getElementById(`list-worker-${workerId}`);
    if (targetCard) {
      targetCard.style.borderColor = 'var(--accent-primary)';
      targetCard.style.backgroundColor = 'var(--accent-light)';
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  /**
   * Live Tracking & OSRM Turn-by-Turn Route Polyline (Step 4)
   */
  async startLiveTrackingMode(booking) {
    this.liveTrackingBooking = booking;

    const banner = document.getElementById('live-tracking-banner');
    const title = document.getElementById('tracking-title');
    const etaText = document.getElementById('tracking-eta');
    if (banner) banner.style.display = 'flex';

    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === booking.workerId) || workers[0];
    if (title) title.textContent = `${esc(worker.name)} (${booking.serviceCategory || 'Service'}) is en route to you`;

    // Coordinates of customer and worker
    const custLat = this.customerLocation.lat;
    const custLng = this.customerLocation.lng;
    const workerLat = worker.lat || 19.1136;
    const workerLng = worker.lng || 72.8258;

    // Draw route using OSRM
    await this.fetchAndRenderOSRMRoute(workerLng, workerLat, custLng, custLat);

    // Subscribe to SSE updates from server for real-time live GPS marker ticks
    this.subscribeLiveLocationUpdates(booking);
  },

  /**
   * Query free OSRM public API and draw GeoJSON route polyline
   */
  async fetchAndRenderOSRMRoute(startLng, startLat, endLng, endLat) {
    if (!this.mapInstance) return;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const durationMin = Math.max(2, Math.round(route.duration / 60));
        const distanceKm = (route.distance / 1000).toFixed(1);

        const etaEl = document.getElementById('tracking-eta');
        if (etaEl) {
          etaEl.innerHTML = `Live ETA: <strong>${durationMin} mins</strong> (${distanceKm} km away) via driving route`;
        }

        // Remove old route layer
        if (this.activeRouteLayer) {
          this.mapInstance.removeLayer(this.activeRouteLayer);
        }

        // Draw smooth polyline
        this.activeRouteLayer = L.geoJSON(route.geometry, {
          style: {
            color: '#2563eb',
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 8',
            lineJoin: 'round'
          }
        }).addTo(this.mapInstance);

        this.mapInstance.fitBounds(this.activeRouteLayer.getBounds(), { padding: [50, 50] });
      }
    } catch (err) {
      console.warn('[OSRM route error, fallback to straight line]', err);
      // Fallback straight line
      if (this.activeRouteLayer) this.mapInstance.removeLayer(this.activeRouteLayer);
      this.activeRouteLayer = L.polyline([
        [startLat, startLng],
        [endLat, endLng]
      ], { color: '#2563eb', weight: 4, dashArray: '6, 6' }).addTo(this.mapInstance);
    }
  },

  /**
   * SSE listener for live GPS location broadcasts
   */
  subscribeLiveLocationUpdates(booking) {
    try {
      if (this.sseSource) this.sseSource.close();
      this.sseSource = new EventSource('/api/events');

      this.sseSource.addEventListener('sync', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'WORKER_LOCATION_UPDATED' && payload.workerId === booking.workerId) {
            this.updateMovingWorkerMarker(payload.lat, payload.lng);
          }
        } catch (err) {}
      });
    } catch (err) {}
  },

  updateMovingWorkerMarker(lat, lng) {
    if (!this.mapInstance) return;

    if (!this.liveTrackingMarker) {
      this.liveTrackingMarker = L.marker([lat, lng], {
        icon: createWorkerTransitIcon(),
        title: 'Worker Moving Live'
      }).addTo(this.mapInstance);
    } else {
      this.liveTrackingMarker.setLatLng([lat, lng]);
    }
  },

  /**
   * Simulation mode: moves worker closer to customer step-by-step for live hackathon demo
   */
  simulateDriverProgress() {
    if (!this.liveTrackingBooking) return;
    Toast.show('Simulating real-time worker transit towards customer...', 'info');

    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === this.liveTrackingBooking.workerId) || workers[0];
    
    let currentLat = worker.lat || 19.1136;
    let currentLng = worker.lng || 72.8258;
    const targetLat = this.customerLocation.lat;
    const targetLng = this.customerLocation.lng;

    let steps = 0;
    if (this.trackingInterval) clearInterval(this.trackingInterval);

    this.trackingInterval = setInterval(async () => {
      steps++;
      // Move 15% closer on each tick
      currentLat += (targetLat - currentLat) * 0.18;
      currentLng += (targetLng - currentLng) * 0.18;

      this.updateMovingWorkerMarker(currentLat, currentLng);
      await this.fetchAndRenderOSRMRoute(currentLng, currentLat, targetLng, targetLat);

      // Post update to backend
      fetch(`/api/workers/${worker.id}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: currentLat, lng: currentLng, bookingId: this.liveTrackingBooking.id })
      }).catch(() => {});

      if (steps >= 8) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
        Toast.show(`${worker.name} has arrived at your doorstep!`, 'success');
        const etaEl = document.getElementById('tracking-eta');
        if (etaEl) etaEl.innerHTML = `🎉 <strong>Worker Arrived!</strong> Service professional is at your door.`;
      }
    }, 2500);
  },

  /**
   * Event listeners for search, filter changes, and booking clicks
   */
  attachEvents(container) {
    // Address Search via Nominatim
    const searchInput = container.querySelector('#map-address-search');
    const searchBtn = container.querySelector('#map-search-btn');

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        this.searchNominatimAddress(searchInput.value);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.searchNominatimAddress(searchInput.value);
        }
      });
    }

    // Current GPS Location Button
    const gpsBtn = container.querySelector('#map-current-loc-btn');
    if (gpsBtn) {
      gpsBtn.addEventListener('click', async () => {
        Toast.show('Acquiring high-accuracy GPS coordinates...', 'info');
        await this.detectUserLocation();
        await this.fetchAndDisplayWorkers();
      });
    }

    // Filter: Service Category
    const serviceFilter = container.querySelector('#map-service-filter');
    if (serviceFilter) {
      serviceFilter.addEventListener('change', (e) => {
        this.filters.service = e.target.value;
        this.fetchAndDisplayWorkers();
      });
    }

    // Filter: Radius
    const radiusFilter = container.querySelector('#map-radius-filter');
    if (radiusFilter) {
      radiusFilter.addEventListener('change', (e) => {
        this.filters.radius = parseFloat(e.target.value);
        this.fetchAndDisplayWorkers();
      });
    }

    // Filter: Rating
    const ratingFilter = container.querySelector('#map-rating-filter');
    if (ratingFilter) {
      ratingFilter.addEventListener('change', (e) => {
        this.filters.minRating = parseFloat(e.target.value);
        this.fetchAndDisplayWorkers();
      });
    }

    // Filter: Available Now Only
    const availableOnly = container.querySelector('#map-available-only');
    if (availableOnly) {
      availableOnly.addEventListener('change', (e) => {
        this.filters.availableOnly = e.target.checked;
        this.fetchAndDisplayWorkers();
      });
    }

    // Global click delegate for Leaflet Popups
    container.addEventListener('click', (e) => {
      const bookBtn = e.target.closest('.map-popup-book-btn');
      if (bookBtn) {
        const workerId = bookBtn.getAttribute('data-worker-id');
        this.triggerBookingModal(workerId);
      }
    });

    // Simulation Drive Button
    const simBtn = container.querySelector('#btn-simulate-tracking');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        this.simulateDriverProgress();
      });
    }

    // Close Tracking Banner
    const closeTrackingBtn = container.querySelector('#btn-close-tracking');
    if (closeTrackingBtn) {
      closeTrackingBtn.addEventListener('click', () => {
        const banner = container.querySelector('#live-tracking-banner');
        if (banner) banner.style.display = 'none';
        if (this.activeRouteLayer && this.mapInstance) {
          this.mapInstance.removeLayer(this.activeRouteLayer);
        }
        if (this.liveTrackingMarker && this.mapInstance) {
          this.mapInstance.removeLayer(this.liveTrackingMarker);
        }
        if (this.trackingInterval) {
          clearInterval(this.trackingInterval);
          this.trackingInterval = null;
        }
        this.liveTrackingBooking = null;
      });
    }
  },

  triggerBookingModal(workerId) {
    if (this.onBookWorker) {
      this.onBookWorker(workerId);
    } else {
      // Dispatches custom event so customer.js can open its booking modal
      window.dispatchEvent(new CustomEvent('localkaam:book-worker', { detail: { workerId } }));
    }
  },

  /**
   * Cleanup Leaflet map, GPS watchers, SSE listeners, and intervals on unmount
   */
  cleanup() {
    if (this.trackingWatchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.trackingWatchId);
      this.trackingWatchId = null;
    }
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
    this.workerMarkers.clear();
    this.activeRouteLayer = null;
    this.liveTrackingMarker = null;
  }
};
