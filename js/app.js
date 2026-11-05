import { Viewer } from './viewer.js';
import { PreviewRenderer } from './previews.js';
import { composeSkin, pieceCanvas, SKIN_SIZE } from './skin-model.js';

const $ = (sel, root = document) => root.querySelector(sel);

const state = {
  config: null,
  selection: {}, // catId -> canvas 64x64 de la pièce choisie
  chosen: {}, // catId -> index de la pièce choisie
  viewer: null,
  previews: null,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image introuvable : ${src}`));
    img.src = src;
  });
}

/* ---------- Lignes de catégories ---------- */

function buildCategory(cat) {
  const section = document.createElement('section');
  section.className = 'category';
  section.dataset.cat = cat.id;
  section.innerHTML = `
    <div class="cat-head">
      <h2>${cat.label}</h2>
      <span class="cat-status" aria-live="polite">À choisir</span>
    </div>
    <div class="row">
      <div class="track" tabindex="0"></div>
      <button class="arrow" type="button" aria-label="Voir les suivants">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;

  const track = $('.track', section);
  const arrow = $('.arrow', section);

  cat.pieces.forEach((piece, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card loading';
    card.title = piece.name;
    card.innerHTML = `<canvas width="240" height="240"></canvas><span class="card-name">${piece.name}</span>`;
    track.append(card);
    setupCard(card, cat, piece, index, section);
  });

  // Flèche : défile d'une "page". Revient au début quand on est au bout.
  arrow.addEventListener('click', () => {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    if (atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
    else track.scrollBy({ left: track.clientWidth * 0.8, behavior: 'smooth' });
  });
  const updateArrow = () => {
    const overflow = track.scrollWidth > track.clientWidth + 4;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    arrow.hidden = !overflow;
    arrow.classList.toggle('back', atEnd);
    section.classList.toggle('fade-right', overflow && !atEnd);
  };
  track.addEventListener('scroll', updateArrow, { passive: true });
  new ResizeObserver(updateArrow).observe(track);
  // un défilement à la molette verticale sur la ligne fait défiler horizontalement
  track.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || track.scrollWidth <= track.clientWidth) return;
      const atStart = track.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    },
    { passive: false },
  );

  return section;
}

async function setupCard(card, cat, piece, index, section) {
  const canvas = $('canvas', card);
  const ctx = canvas.getContext('2d');
  let piece64;
  try {
    piece64 = pieceCanvas(await loadImage(piece.file), cat.id);
  } catch (err) {
    card.classList.remove('loading');
    card.classList.add('broken');
    card.disabled = true;
    console.warn(err.message);
    return;
  }
  const REST_ANGLE = -0.55; // vue 3/4 au repos
  const draw = (angle) => state.previews.render(piece64, cat.id, angle, ctx);
  draw(REST_ANGLE);
  card.classList.remove('loading');

  // Survol : rotation horizontale continue depuis la position de repos
  let raf = 0;
  let t0 = 0;
  const spin = (t) => {
    t0 ||= t;
    draw(REST_ANGLE + ((t - t0) / 1000) * 1.6);
    raf = requestAnimationFrame(spin);
  };
  const start = () => {
    if (raf) return;
    t0 = 0;
    raf = requestAnimationFrame(spin);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    draw(REST_ANGLE);
  };
  card.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && start());
  card.addEventListener('pointerleave', stop);
  card.addEventListener('focus', start);
  card.addEventListener('blur', stop);

  card.addEventListener('click', () => select(cat, index, piece64, section, card));
}

function select(cat, index, piece64, section, card) {
  state.selection[cat.id] = piece64;
  state.chosen[cat.id] = index;
  section.querySelectorAll('.card.selected').forEach((c) => c.classList.remove('selected'));
  card.classList.add('selected');
  card.setAttribute('aria-pressed', 'true');
  const status = $('.cat-status', section);
  status.textContent = cat.pieces[index].name;
  status.classList.add('done');
  refresh();
}

/* ---------- Aperçu et validation ---------- */

function refresh() {
  composeSkin(state.viewer.skinCtx, state.selection, { placeholder: true });
  state.viewer.texture.needsUpdate = true;

  const total = state.config.categories.length;
  const done = Object.keys(state.selection).length;
  const btn = $('#validate');
  const ready = done === total;
  btn.disabled = !ready;
  $('#validate-label').textContent = ready ? 'VALIDER ET TÉLÉCHARGER' : 'VALIDER';
  $('#progress').textContent = ready
    ? 'Ton skin est prêt !'
    : `${done} / ${total} parties choisies`;
  $('#progress-bar').style.width = `${(done / total) * 100}%`;
}

function download() {
  const out = document.createElement('canvas');
  out.width = out.height = SKIN_SIZE;
  composeSkin(out.getContext('2d'), state.selection, { placeholder: false });
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = state.config.filename || 'skin.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}

/* ---------- Démarrage ---------- */

async function init() {
  try {
    const res = await fetch('skins.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`skins.json : HTTP ${res.status}`);
    state.config = await res.json();
  } catch (err) {
    $('#categories').innerHTML = `<p class="error">Impossible de charger skins.json (${err.message}).<br>
      Ouvre le site via un serveur (GitHub Pages ou <code>python3 -m http.server</code>), pas en double-cliquant sur index.html.</p>`;
    return;
  }

  const modelType = state.config.modelType === 'slim' ? 'slim' : 'classic';
  state.viewer = new Viewer($('#viewer'), modelType);
  state.previews = new PreviewRenderer(modelType);

  const root = $('#categories');
  state.config.categories.forEach((cat) => root.append(buildCategory(cat)));

  $('#validate').addEventListener('click', download);
  refresh();
}

init();
