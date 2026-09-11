const API_BASE = "https://dragonball-api.com/api";
const RACES = ["Todos","Saiyan","Human","Namekian","Majin","Frieza Race","Android","God","Angel","Jiren Race","Nucleico","Evil","Unknown"];

let state = {
  page: 1,
  limit: 12,
  race: "Todos",
  name: "",
  totalPages: 1,
  loading: false
};

const grid = document.getElementById('grid');
const statusLine = document.getElementById('statusLine');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const raceRow = document.getElementById('raceRow');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');

function renderRaceChips(){
  raceRow.innerHTML = "";
  RACES.forEach(race => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (state.race === race ? ' active' : '');
    chip.textContent = race;
    chip.addEventListener('click', () => {
      state.race = race;
      resetAndFetch();
    });
    raceRow.appendChild(chip);
  });
}

function buildUrl(page){
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', state.limit);
  if (state.race && state.race !== 'Todos') params.set('race', state.race);
  if (state.name) params.set('name', state.name);
  return `${API_BASE}/characters?${params.toString()}`;
}

function parseKi(kiStr){
  if (!kiStr) return 0;
  const cleaned = String(kiStr).replace(/,/g,'').match(/[\d.]+/);
  if (!cleaned) return 0;
  let val = parseFloat(cleaned[0]);
  if (/billion/i.test(kiStr)) val *= 1e9;
  else if (/trillion/i.test(kiStr)) val *= 1e12;
  else if (/million/i.test(kiStr)) val *= 1e6;
  return val;
}

function cardTemplate(c){
  const kiVal = parseKi(c.ki);
  const maxKiVal = parseKi(c.maxKi) || kiVal || 1;
  const pct = Math.min(100, Math.max(3, (kiVal / maxKiVal) * 100));
  const img = c.image || '';
  return `
    <div class="card" data-id="${c.id}">
      <div class="card-img">${img ? `<img src="${img}" alt="${c.name}" loading="lazy">` : ''}</div>
      <div class="card-body">
        <p class="card-name">${c.name}</p>
        <div class="card-meta">
          <span class="tag-pill">${c.race || 'Desconocida'}</span>
          <span class="tag-pill">${c.gender || '—'}</span>
        </div>
        <div class="ki-label"><span>Ki</span><span>${c.ki || 'Desconocido'}</span></div>
        <div class="ki-bar"><div class="ki-bar-fill" style="width:${pct}%"></div></div>
      </div>
    </div>
  `;
}

async function fetchCharacters(){
  if (state.loading) return;
  state.loading = true;
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Cargando...';
  try{
    const res = await fetch(buildUrl(state.page));
    if (!res.ok) throw new Error('Respuesta no válida de la API');
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items || []);
    const meta = Array.isArray(data) ? null : data.meta;

    if (state.page === 1) grid.innerHTML = '';

    if (items.length === 0 && state.page === 1){
      grid.innerHTML = '<p class="empty">No se encontraron personajes con esos filtros.</p>';
      loadMoreBtn.style.display = 'none';
    } else {
      grid.insertAdjacentHTML('beforeend', items.map(cardTemplate).join(''));
    }

    state.totalPages = meta ? meta.totalPages : 1;
    statusLine.textContent = meta
      ? `Mostrando ${grid.querySelectorAll('.card').length} de ${meta.totalItems} personajes`
      : `Mostrando ${items.length} personajes`;

    loadMoreBtn.style.display = (state.page < state.totalPages) ? 'block' : 'none';
  } catch(err){
    if (state.page === 1){
      grid.innerHTML = '<p class="empty">No se pudo cargar la información. Intenta de nuevo en unos segundos.</p>';
    }
    statusLine.textContent = 'Ocurrió un error al conectar con la API.';
  } finally {
    state.loading = false;
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Cargar más';
  }
}

function resetAndFetch(){
  state.page = 1;
  renderRaceChips();
  fetchCharacters();
}

loadMoreBtn.addEventListener('click', () => {
  state.page += 1;
  fetchCharacters();
});

searchBtn.addEventListener('click', () => {
  state.name = searchInput.value.trim();
  resetAndFetch();
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter'){
    state.name = searchInput.value.trim();
    resetAndFetch();
  }
});

grid.addEventListener('click', async (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const id = card.dataset.id;
  openModal(id);
});

async function openModal(id){
  modal.innerHTML = `<div class="empty" style="padding:60px 0;">Cargando personaje...</div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  try{
    const res = await fetch(`${API_BASE}/characters/${id}`);
    if (!res.ok) throw new Error('no encontrado');
    const c = await res.json();
    modal.innerHTML = modalTemplate(c);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
  } catch(err){
    modal.innerHTML = `
      <div class="modal-info">
        <button class="modal-close" aria-label="Cerrar">✕</button>
        <p class="empty">No se pudo cargar el detalle de este personaje.</p>
      </div>`;
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
  }
}

function modalTemplate(c){
  const planet = c.originPlanet && c.originPlanet.name ? c.originPlanet.name : 'Desconocido';
  const transformations = (c.transformations || []);
  return `
    <div class="modal-top">
      <div class="modal-img">${c.image ? `<img src="${c.image}" alt="${c.name}">` : ''}</div>
      <div class="modal-info">
        <button class="modal-close" aria-label="Cerrar">✕</button>
        <h2 class="modal-name">${c.name}</h2>
        <div class="modal-meta">
          <span class="tag-pill">${c.race || 'Desconocida'}</span>
          <span class="tag-pill">${c.gender || '—'}</span>
          ${c.affiliation ? `<span class="tag-pill">${c.affiliation}</span>` : ''}
        </div>
        <div class="modal-stats">
          <div class="stat-box"><div class="stat-label">Ki actual</div><div class="stat-value">${c.ki || 'Desconocido'}</div></div>
          <div class="stat-box"><div class="stat-label">Ki máximo</div><div class="stat-value">${c.maxKi || 'Desconocido'}</div></div>
          <div class="stat-box"><div class="stat-label">Planeta de origen</div><div class="stat-value">${planet}</div></div>
          <div class="stat-box"><div class="stat-label">Afiliación</div><div class="stat-value">${c.affiliation || 'Desconocida'}</div></div>
        </div>
        <p class="modal-desc">${c.description || 'Sin descripción disponible.'}</p>
      </div>
    </div>
    ${transformations.length ? `
    <div class="modal-bottom">
      <p class="section-label">Transformaciones</p>
      <div class="transform-row">
        ${transformations.map(t => `
          <div class="transform-item">
            <img src="${t.image || ''}" alt="${t.name}">
            <span>${t.name}</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
  `;
}

function closeModal(){
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

renderRaceChips();
fetchCharacters();
