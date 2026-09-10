(function() {
  const sectionsContainer = document.getElementById('sectionsContainer');
  const sectionNav = document.getElementById('sectionNav');
  const filtersBar = document.getElementById('filtersBar');
  const vaultStats = document.getElementById('vaultStats');
  const statusContainer = document.getElementById('statusContainer');
  const loaderContainer = document.getElementById('loaderContainer');
  const loadingNote = document.getElementById('loadingNote');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const modalCard = document.getElementById('modalCard');

  const TYPE_ORDER = ['fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy','normal'];
  const RARITY_LABEL = { comun:'Común', pocoComun:'Poco común', raro:'Raro', muyRaro:'Muy raro', legendario:'Legendario', mitico:'Mítico' };
  const RARITY_COLOR = { comun:'#9aa0b8', pocoComun:'#4ea1ff', raro:'#b07bff', muyRaro:'#ffb020', legendario:'#ffd23c', mitico:'#ff5fae' };
  const RARITY_COLOR2 = { legendario:'#ff9d1f', mitico:'#a24bff' };

  const TYPE_COLORS = { grass:'#7ac74c', fire:'#ee8130', water:'#6390f0', bug:'#a6b91a', normal:'#a8a77a', electric:'#f7d02c', ice:'#96d9d6', fighting:'#c22e28', poison:'#a33ea1', ground:'#e2bf65', flying:'#a98ff3', psychic:'#f95587', rock:'#b6a136', ghost:'#735797', dragon:'#6f35fc', dark:'#9c8b7c', steel:'#b7b7ce', fairy:'#d685ad' };
  const TYPE_ES = { grass:'Planta', fire:'Fuego', water:'Agua', bug:'Bicho', normal:'Normal', electric:'Eléctrico', ice:'Hielo', fighting:'Lucha', poison:'Veneno', ground:'Tierra', flying:'Volador', psychic:'Psíquico', rock:'Roca', ghost:'Fantasma', dragon:'Dragón', dark:'Siniestro', steel:'Acero', fairy:'Hada' };
  const ALL_TYPES = Object.keys(TYPE_COLORS);

  // Tabla de eficacia de tipos: TYPE_CHART[atacante][defensor] = multiplicador (default 1)
  const TYPE_CHART = {
    normal:   { rock:0.5, ghost:0, steel:0.5 },
    fire:     { fire:0.5, water:0.5, grass:2, ice:2, bug:2, rock:0.5, dragon:0.5, steel:2 },
    water:    { fire:2, water:0.5, grass:0.5, ground:2, rock:2, dragon:0.5 },
    electric: { water:2, electric:0.5, grass:0.5, ground:0, flying:2, dragon:0.5 },
    grass:    { fire:0.5, water:2, grass:0.5, poison:0.5, ground:2, flying:0.5, bug:0.5, rock:2, dragon:0.5, steel:0.5 },
    ice:      { fire:0.5, water:0.5, grass:2, ice:0.5, ground:2, flying:2, dragon:2, steel:0.5 },
    fighting: { normal:2, ice:2, poison:0.5, flying:0.5, psychic:0.5, bug:0.5, rock:2, ghost:0, dark:2, steel:2, fairy:0.5 },
    poison:   { grass:2, poison:0.5, ground:0.5, rock:0.5, ghost:0.5, steel:0, fairy:2 },
    ground:   { fire:2, electric:2, grass:0.5, poison:2, flying:0, bug:0.5, rock:2, steel:2 },
    flying:   { electric:0.5, grass:2, fighting:2, bug:2, rock:0.5, steel:0.5 },
    psychic:  { fighting:2, poison:2, psychic:0.5, dark:0, steel:0.5 },
    bug:      { fire:0.5, grass:2, fighting:0.5, poison:0.5, flying:0.5, psychic:2, ghost:0.5, dark:2, steel:0.5, fairy:0.5 },
    rock:     { fire:2, ice:2, fighting:0.5, ground:0.5, flying:2, bug:2, steel:0.5 },
    ghost:    { normal:0, psychic:2, ghost:2, dark:0.5 },
    dragon:   { dragon:2, steel:0.5, fairy:0 },
    dark:     { fighting:0.5, psychic:2, ghost:2, dark:0.5, fairy:0.5 },
    steel:    { fire:0.5, water:0.5, electric:0.5, ice:2, rock:2, steel:0.5, fairy:2 },
    fairy:    { fire:0.5, fighting:2, poison:0.5, dragon:2, dark:2, steel:0.5 }
  };

  let allPokemon = [];
  let currentRarity = 'all';

  function showStatus(message, isError = false) {
    statusContainer.textContent = message;
    statusContainer.style.display = 'block';
    statusContainer.style.background = isError ? 'rgba(255,95,174,0.12)' : 'var(--panel)';
    statusContainer.style.borderColor = isError ? 'rgba(255,95,174,0.4)' : 'var(--panel-border)';
    loaderContainer.style.display = 'none';
    loadingNote.style.display = 'none';
  }
  function hideStatus() { statusContainer.style.display = 'none'; }
  function showLoader() {
    loaderContainer.style.display = 'block';
    loadingNote.style.display = 'block';
    statusContainer.style.display = 'none';
    sectionsContainer.innerHTML = '';
    sectionNav.style.display = 'none';
    filtersBar.style.display = 'none';
    vaultStats.style.display = 'none';
  }
  function hideLoader() { loaderContainer.style.display = 'none'; loadingNote.style.display = 'none'; }

  function computeRarity(p) {
    if (p.isMythical) return 'mitico';
    if (p.isLegendary) return 'legendario';
    if (p.statTotal >= 500) return 'muyRaro';
    if (p.statTotal >= 400) return 'raro';
    if (p.statTotal >= 320) return 'pocoComun';
    return 'comun';
  }

  function computeMatchups(types) {
    const result = {};
    ALL_TYPES.forEach(atk => {
      let mult = 1;
      types.forEach(def => {
        const row = TYPE_CHART[atk];
        if (row && row[def] !== undefined) mult *= row[def];
      });
      result[atk] = mult;
    });
    const weak4 = [], weak2 = [], resistHalf = [], resistQuarter = [], immune = [];
    Object.entries(result).forEach(([t, m]) => {
      if (m === 0) immune.push(t);
      else if (m >= 4) weak4.push(t);
      else if (m === 2) weak2.push(t);
      else if (m === 0.25) resistQuarter.push(t);
      else if (m === 0.5) resistHalf.push(t);
    });
    return { weak4, weak2, resistHalf, resistQuarter, immune };
  }

  function getStat(stats, key) {
    const s = stats.find(s => s.stat.name === key);
    return s ? s.base_stat : 0;
  }

  // Chip de tipo: usado en listas (pokemon-types / modal-types), devuelve un <li>
  function typeChip(type, extra) {
    return `<li><data class="type-badge" value="${type}" style="--tc:${TYPE_COLORS[type] || '#999'}">${TYPE_ES[type] || type}${extra ? ' ' + extra : ''}</data></li>`;
  }
  // Chip de debilidad: usado tanto suelto en un párrafo como dentro de listas
  function weakChip(type, extra) {
    return `<data class="weak-chip" value="${type}" style="--tc:${TYPE_COLORS[type] || '#999'}">${TYPE_ES[type] || type} ${extra}</data>`;
  }

  // ---------- construir tarjeta ----------
  function buildCard(p) {
    const card = document.createElement('article');
    card.className = 'pokemon-card';
    card.dataset.id = p.id;
    card.style.setProperty('--tc', TYPE_COLORS[p.types[0]] || '#49e8ff');
    card.style.setProperty('--rc', RARITY_COLOR[p.rarity]);
    card.style.setProperty('--rc2', RARITY_COLOR2[p.rarity] || RARITY_COLOR[p.rarity]);

    const id = p.id.toString().padStart(3, '0');
    const typeBadges = p.types.map(t => typeChip(t)).join('');
    const shine = (p.rarity === 'legendario' || p.rarity === 'mitico') ? ' shine' : '';

    const weakList = [...p.matchups.weak4.map(t => [t, '×4']), ...p.matchups.weak2.map(t => [t, '×2'])].slice(0, 3);
    const weakRow = weakList.length
      ? `<p class="pokemon-weak"><b class="weak-label">Débil a</b>${weakList.map(([t, m]) => weakChip(t, m)).join('')}</p>`
      : '';

    card.innerHTML = `
      <mark class="rarity-badge${shine}">${RARITY_LABEL[p.rarity]}</mark>
      <figure class="pokemon-sprite">
        <img src="${p.sprite}" alt="${p.name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%23232a46%22/%3E%3Ctext x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2230%22 fill=%22%2349e8ff%22%3E?%3C/text%3E%3C/svg%3E'">
      </figure>
      <data class="pokemon-id" value="${p.id}">#${id}</data>
      <h3 class="pokemon-name">${p.name}</h3>
      <ul class="pokemon-types">${typeBadges}</ul>
      <p class="pokemon-attack">⚔ Ataque ${p.attack}</p>
      ${weakRow}
    `;
    card.addEventListener('click', () => openModal(p));
    return card;
  }

  // ---------- modal ----------
  function statBar(label, value) {
    const capped = Math.min(value, 200);
    return `
      <li class="stat-row">
        <b class="stat-label">${label}</b>
        <progress class="stat-track" value="${capped}" max="200"></progress>
        <data class="stat-value" value="${value}">${value}</data>
      </li>`;
  }

  function matchupGroup(label, list, extra) {
    if (!list.length) return '';
    return `<fieldset class="matchup-group"><legend class="mg-label">${label}</legend><ul class="matchup-chips">${list.map(t => `<li>${weakChip(t, extra)}</li>`).join('')}</ul></fieldset>`;
  }

  function openModal(p) {
    const typeBadges = p.types.map(t => typeChip(t)).join('');
    const abilityBadges = p.abilities.map(a => `<li><data class="ability-badge" value="${a}">${a}</data></li>`).join('');
    const m = p.matchups;
    const id = p.id.toString().padStart(3, '0');

    modalCard.style.setProperty('--tc', TYPE_COLORS[p.types[0]] || '#49e8ff');

    modalCard.innerHTML = `
      <button class="modal-close" id="modalCloseBtn" aria-label="Cerrar">✕</button>
      <header class="modal-top">
        <figure class="modal-sprite"><img src="${p.sprite}" alt="${p.name}"></figure>
        <section class="modal-title-block">
          <hgroup class="modal-title-row">
            <h2 class="modal-name">${p.name}</h2>
            <p class="modal-id">#${id}</p>
          </hgroup>
          <ul class="modal-types">${typeBadges}</ul>
          <button class="cry-btn" id="cryBtn" ${p.cry ? '' : 'disabled'}>▶ Escuchar grito</button>
        </section>
      </header>
      ${p.description ? `<p class="modal-desc">${p.description}</p>` : ''}
      <ul class="modal-meta">
        <li><small>Altura</small>${(p.height / 10).toFixed(1)} m</li>
        <li><small>Peso</small>${(p.weight / 10).toFixed(1)} kg</li>
        <li><small>Rareza</small>${RARITY_LABEL[p.rarity]}</li>
        <li><small>Ataque</small>${p.attack}</li>
        <li><small>Captura</small>${p.captureRate}/255</li>
        <li><small>Hábitat</small>${p.habitat}</li>
      </ul>
      <h3 class="modal-section-title">Estadísticas base</h3>
      <ul class="stat-list">
        ${statBar('PS', p.hp)}
        ${statBar('Ataque', p.attack)}
        ${statBar('Defensa', p.defense)}
        ${statBar('At. Esp.', p.spAttack)}
        ${statBar('Def. Esp.', p.spDefense)}
        ${statBar('Velocidad', p.speed)}
      </ul>
      <h3 class="modal-section-title">Debilidades y resistencias</h3>
      ${matchupGroup('Débil ×4', m.weak4, '×4')}
      ${matchupGroup('Débil ×2', m.weak2, '×2')}
      ${matchupGroup('Resiste ×1/2', m.resistHalf, '×1/2')}
      ${matchupGroup('Resiste ×1/4', m.resistQuarter, '×1/4')}
      ${matchupGroup('Inmune', m.immune, '×0')}
      <h3 class="modal-section-title">Habilidades</h3>
      <ul class="modal-abilities">${abilityBadges}</ul>
    `;
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    const cryBtn = document.getElementById('cryBtn');
    if (p.cry) {
      const audio = new Audio(p.cry);
      cryBtn.addEventListener('click', () => audio.play());
    }
    modalCard.showModal();
  }
  function closeModal() { if (modalCard.open) modalCard.close(); }
  // Clic en el área del <dialog> fuera de su caja (el ::backdrop) cierra el modal
  modalCard.addEventListener('click', (e) => { if (e.target === modalCard) closeModal(); });

  // ---------- render por secciones ----------
  function render(pokemonArray) {
    sectionsContainer.innerHTML = '';

    const filtered = currentRarity === 'all' ? pokemonArray : pokemonArray.filter(p => p.rarity === currentRarity);

    if (!filtered.length) {
      showStatus('No se encontraron Pokémon con esos filtros 🧐', true);
      sectionNav.innerHTML = '';
      return;
    }
    hideStatus();

    const groups = {};
    filtered.forEach(p => {
      const key = p.types[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    const orderedTypes = TYPE_ORDER.filter(t => groups[t]);
    Object.keys(groups).forEach(t => { if (!orderedTypes.includes(t)) orderedTypes.push(t); });

    sectionNav.innerHTML = orderedTypes.map(t => `<a href="#sec-${t}">${TYPE_ES[t] || t}</a>`).join('');
    sectionNav.style.display = 'flex';

    orderedTypes.forEach(type => {
      const section = document.createElement('section');
      section.className = 'type-section';
      section.id = `sec-${type}`;

      const header = document.createElement('header');
      header.className = 'type-section-header';
      header.style.setProperty('--tc', TYPE_COLORS[type] || '#49e8ff');
      header.innerHTML = `
        <i class="type-dot" aria-hidden="true" style="background:${TYPE_COLORS[type] || '#49e8ff'}"></i>
        <h2>${TYPE_ES[type] || type}</h2>
        <data class="count" value="${groups[type].length}">${groups[type].length} registros</data>
      `;

      const grid = document.createElement('ul');
      grid.className = 'pokedex-grid';
      groups[type].forEach(p => {
        const item = document.createElement('li');
        item.appendChild(buildCard(p));
        grid.appendChild(item);
      });

      section.appendChild(header);
      section.appendChild(grid);
      sectionsContainer.appendChild(section);
    });
  }

  function renderVaultStats(list) {
    const legendary = list.filter(p => p.rarity === 'legendario').length;
    const mythical = list.filter(p => p.rarity === 'mitico').length;
    vaultStats.innerHTML = `
      <li class="vault-stat"><i class="dot" aria-hidden="true" style="background:#49e8ff"></i>Registros archivados <b>${list.length}</b></li>
      <li class="vault-stat"><i class="dot" aria-hidden="true" style="background:${RARITY_COLOR.legendario}"></i>Legendarios <b>${legendary}</b></li>
      <li class="vault-stat"><i class="dot" aria-hidden="true" style="background:${RARITY_COLOR.mitico}"></i>Míticos <b>${mythical}</b></li>
    `;
    vaultStats.style.display = 'flex';
  }

  function applySearchAndRender() {
    const term = searchInput.value.trim().toLowerCase();
    let list = allPokemon;
    if (term !== '') {
      list = allPokemon.filter(p => p.name.toLowerCase().includes(term) || p.id.toString() === term);
    }
    render(list);
  }

  // ---------- carga inicial ----------
  async function loadAllPokemon() {
    showLoader();
    try {
      const listRes = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
      if (!listRes.ok) throw new Error('Error al cargar la lista');
      const listData = await listRes.json();

      const fetchPromises = listData.results.map(async (item) => {
        try {
          const [pRes, sRes] = await Promise.all([
            fetch(item.url),
            fetch(item.url.replace('/pokemon/', '/pokemon-species/'))
          ]);
          const pokemon = await pRes.json();
          const species = sRes.ok ? await sRes.json() : null;

          const statTotal = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
          const flavor = species?.flavor_text_entries?.find(f => f.language.name === 'es') ||
                          species?.flavor_text_entries?.find(f => f.language.name === 'en');

          const p = {
            id: pokemon.id,
            name: pokemon.name,
            sprite: pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || '',
            cry: pokemon.cries?.latest || pokemon.cries?.legacy || '',
            types: pokemon.types.map(t => t.type.name),
            height: pokemon.height,
            weight: pokemon.weight,
            abilities: pokemon.abilities.map(a => a.ability.name.replace(/-/g,' ')),
            hp: getStat(pokemon.stats, 'hp'),
            attack: getStat(pokemon.stats, 'attack'),
            defense: getStat(pokemon.stats, 'defense'),
            spAttack: getStat(pokemon.stats, 'special-attack'),
            spDefense: getStat(pokemon.stats, 'special-defense'),
            speed: getStat(pokemon.stats, 'speed'),
            statTotal,
            isLegendary: species?.is_legendary || false,
            isMythical: species?.is_mythical || false,
            captureRate: species?.capture_rate ?? '—',
            habitat: species?.habitat?.name ? species.habitat.name.replace(/-/g,' ') : 'Desconocido',
            description: flavor ? flavor.flavor_text.replace(/[\n\f\r]/g, ' ') : ''
          };
          p.rarity = computeRarity(p);
          p.matchups = computeMatchups(p.types);
          return p;
        } catch (err) {
          console.warn('Fallo al cargar', item.name, err);
          return null;
        }
      });

      const results = (await Promise.all(fetchPromises)).filter(Boolean);
      results.sort((a, b) => a.id - b.id);
      allPokemon = results;

      hideLoader();
      filtersBar.style.display = 'flex';
      renderVaultStats(allPokemon);
      render(allPokemon);
    } catch (error) {
      console.error('Error cargando PokéVault:', error);
      hideLoader();
      showStatus('Error al acceder a la bóveda. Intenta de nuevo.', true);
    }
  }

  function init() {
    loadAllPokemon();

    searchBtn.addEventListener('click', applySearchAndRender);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applySearchAndRender(); }
    });

    filtersBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      filtersBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentRarity = chip.dataset.rarity;
      applySearchAndRender();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
