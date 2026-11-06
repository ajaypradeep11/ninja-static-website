import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import './realty-map.css';

// The plugin extends the Leaflet global; load it after assigning the same instance.
export async function createListingMap({ homes, neighbourhoods, onOpenHome, onSnapshot, onCloseSnapshot }) {
  window.L = L;
  await import('leaflet.markercluster');
  const root = document.querySelector('.map');
  // Keep the assistant available without covering the map while it is in use.
  const clearMap = () => document.querySelector('.ln-widget:not(.is-collapsed) [data-collapse]')?.click();
  root.addEventListener('pointerdown', clearMap, { capture: true });
  root.addEventListener('focusin', clearMap);
  const canvas = root.querySelector('[data-listing-map]');
  const status = root.querySelector('[data-map-status]');
  const count = root.querySelector('[data-map-count]');
  const guide = root.querySelector('[data-map-snapshot]');
  const chips = [...root.querySelectorAll('[data-map-neighbourhood]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = L.map(canvas, {
    zoomControl: false, scrollWheelZoom: false, minZoom: 10, maxZoom: 18,
    zoomAnimation: !reducedMotion, fadeAnimation: !reducedMotion,
    markerZoomAnimation: !reducedMotion,
  });
  L.control.zoom({ position: 'topright' }).addTo(map);
  map.attributionControl.setPrefix(false);
  map.attributionControl.setPosition('bottomleft');
  let tileErrors = 0;
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  });
  tiles.on('loading', () => { tileErrors = 0; });
  tiles.on('tileerror', () => { tileErrors += 1; });
  tiles.on('load', () => {
    status.hidden = tileErrors === 0;
    status.textContent = 'Street map unavailable. You can still explore the home markers or browse the list.';
    canvas.dataset.mapReady = 'true';
  });
  tiles.addTo(map);

  const price = value => value >= 1000000
    ? `$${(value / 1000000).toFixed(2).replace(/0$/, '')}m` : `$${Math.round(value / 1000)}k`;
  const compact = matchMedia('(max-width: 600px)');
  const clusters = L.markerClusterGroup({
    maxClusterRadius: 90, showCoverageOnHover: false, animate: !reducedMotion,
    spiderfyOnMaxZoom: true, spiderfyDistanceMultiplier: 1.6,
    iconCreateFunction: cluster => L.divIcon({
      className: 'home-cluster', iconSize: [compact.matches ? 44 : 86, 44], iconAnchor: [compact.matches ? 22 : 43, 22],
      html: `<span class="cluster-count">${cluster.getChildCount()}</span><span class="cluster-label"> homes</span>`,
    }),
  }).addTo(map);
  compact.addEventListener('change', () => clusters.refreshClusters());
  const markers = new Map();
  let filtered = homes;
  let neighbourhood = null;

  for (const home of homes) {
    const marker = L.marker(home.coordinates, {
      title: `${home.addr}, ${price(home.price)}`,
      icon: L.divIcon({ className: 'home-marker', iconSize: [82, 42], iconAnchor: [41, 21], html: price(home.price) }),
      keyboard: true, riseOnHover: true,
    });
    const popup = document.createElement('article');
    popup.className = 'map-home';
    const photo = document.createElement('img');
    photo.src = `/work/realty/${home.photo}-480.webp`;
    photo.alt = ''; photo.width = 240; photo.height = 128; photo.loading = 'lazy';
    const content = document.createElement('div');
    const amount = document.createElement('strong');
    amount.textContent = home.price.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
    const address = document.createElement('p'); address.textContent = home.addr;
    const specs = document.createElement('p'); specs.className = 'map-home-specs';
    specs.textContent = `${home.beds} beds · ${home.baths} baths · ${home.sqft.toLocaleString('en-CA')} sq ft`;
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = 'View home'; button.setAttribute('aria-label', `View home at ${home.addr}`);
    button.addEventListener('click', () => onOpenHome(home.id));
    content.append(amount, address, specs, button); popup.append(photo, content);
    marker.bindPopup(popup, { className: 'home-popup', maxWidth: 240, minWidth: 220, autoPanPadding: [18, 18], offset: [0, -12] });
    marker.on('add', () => {
      const icon = marker.getElement();
      icon.dataset.home = home.id;
      icon.setAttribute('aria-label', marker.options.title);
    });
    marker.on('popupopen', () => {
      onCloseSnapshot();
      marker.getElement()?.classList.add('is-selected');
    });
    marker.on('popupclose', () => marker.getElement()?.classList.remove('is-selected'));
    markers.set(home.id, marker);
  }

  function fit(items, maxZoom = 14) {
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    map.invalidateSize({ pan: false });
    const bounds = L.latLngBounds((items.length ? items : homes).map(home => home.coordinates));
    map.fitBounds(bounds, { paddingTopLeft: [52, 45], paddingBottomRight: [55, 45], maxZoom, animate: false });
  }

  function selectNeighbourhood(key) {
    neighbourhood = key;
    chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.mapNeighbourhood === key)));
    guide.hidden = !key;
    if (key) guide.textContent = `${neighbourhoods[key].name} guide`;
  }

  function reset() {
    map.closePopup(); onCloseSnapshot(); selectNeighbourhood(null); fit(filtered);
  }
  function focusNeighbourhood(key) {
    selectNeighbourhood(key); map.closePopup(); onCloseSnapshot();
    fit(filtered.filter(home => home.hood === key).length
      ? filtered.filter(home => home.hood === key) : homes.filter(home => home.hood === key), 15);
  }
  chips.forEach(chip => chip.addEventListener('click', () => focusNeighbourhood(chip.dataset.mapNeighbourhood)));
  root.querySelector('[data-map-reset]').addEventListener('click', reset);
  guide.addEventListener('click', () => onSnapshot(neighbourhood));

  const resize = new ResizeObserver(() => {
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    if (!map.getZoom()) fit(filtered);
    else map.invalidateSize({ pan: true, animate: false });
  });
  resize.observe(canvas);
  // Establish bounds even when the mobile list initially hides the map.
  map.setView([49.294, -123.091], 11, { animate: false });
  fit(homes);

  return {
    filter(ids) {
      map.closePopup(); onCloseSnapshot(); selectNeighbourhood(null);
      filtered = homes.filter(home => ids.includes(home.id));
      clusters.clearLayers(); clusters.addLayers(filtered.map(home => markers.get(home.id)));
      count.textContent = `${filtered.length} ${filtered.length === 1 ? 'home' : 'homes'} to explore`;
      chips.forEach(chip => { chip.disabled = !filtered.some(home => home.hood === chip.dataset.mapNeighbourhood); });
      root.classList.toggle('map-empty', filtered.length === 0);
      fit(filtered);
    },
    highlight(id) {
      root.querySelectorAll('.is-hot').forEach(icon => icon.classList.remove('is-hot'));
      const marker = markers.get(Number(id));
      if (marker && clusters.hasLayer(marker)) clusters.getVisibleParent(marker)?.getElement()?.classList.add('is-hot');
    },
    setOffer(id, offered) {
      const marker = markers.get(id);
      marker.options.icon.options.className = `home-marker${offered ? ' is-offer' : ''}`;
      marker.getElement()?.classList.toggle('is-offer', offered);
    },
    show() { requestAnimationFrame(() => fit(neighbourhood ? filtered.filter(home => home.hood === neighbourhood) : filtered)); },
    focusNeighbourhood,
  };
}
