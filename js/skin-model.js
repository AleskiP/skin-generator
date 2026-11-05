import * as THREE from 'three';

export const SKIN_SIZE = 64;

/*
 * Zones de la texture 64x64 occupées par chaque catégorie : [x, y, largeur, hauteur].
 * "base" = couche de base du skin, "overlay" = deuxième couche (chapeau, veste, manches, pantalon).
 */
export const ZONES = {
  tete: { base: [[0, 0, 32, 16]], overlay: [[32, 0, 32, 16]] },
  haut: { base: [[16, 16, 24, 16]], overlay: [[16, 32, 24, 16]] },
  bras: {
    base: [[40, 16, 16, 16], [32, 48, 16, 16]],
    overlay: [[40, 32, 16, 16], [48, 48, 16, 16]],
  },
  bas: {
    base: [[0, 16, 16, 16], [16, 48, 16, 16]],
    overlay: [[0, 32, 16, 16], [0, 48, 16, 16]],
  },
};

const PLACEHOLDER_COLOR = '#8e99ad';

export function allRects(catId) {
  const z = ZONES[catId];
  return [...z.base, ...z.overlay];
}

/** Copie une pièce dans un canvas 64x64 en ne gardant que les zones de sa catégorie. */
export function pieceCanvas(img, catId) {
  const c = document.createElement('canvas');
  c.width = c.height = SKIN_SIZE;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.beginPath();
  for (const r of allRects(catId)) g.rect(...r);
  g.clip();
  g.drawImage(img, 0, 0, SKIN_SIZE, SKIN_SIZE);
  return c;
}

/**
 * Assemble le skin à partir des pièces choisies.
 * placeholder=true : les zones de base des catégories non choisies sont grisées (aperçu).
 * placeholder=false : rien que les pièces (export).
 */
export function composeSkin(ctx, selection, { placeholder = true } = {}) {
  ctx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
  if (placeholder) {
    ctx.fillStyle = PLACEHOLDER_COLOR;
    for (const [id, z] of Object.entries(ZONES)) {
      if (selection[id]) continue;
      for (const [x, y, w, h] of z.base) ctx.fillRect(x, y, w, h);
    }
  }
  for (const id of Object.keys(ZONES)) {
    if (selection[id]) ctx.drawImage(selection[id], 0, 0);
  }
}

export function makeSkinTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function partsFor(modelType) {
  const aw = modelType === 'slim' ? 3 : 4;
  const ax = 4 + aw / 2;
  return [
    { w: 8, h: 8, d: 8, pos: [0, 28, 0], base: [0, 0], over: [32, 0], grow: 0.5 }, // tête
    { w: 8, h: 12, d: 4, pos: [0, 18, 0], base: [16, 16], over: [16, 32], grow: 0.25 }, // torse
    { w: aw, h: 12, d: 4, pos: [-ax, 18, 0], base: [40, 16], over: [40, 32], grow: 0.25 }, // bras droit
    { w: aw, h: 12, d: 4, pos: [ax, 18, 0], base: [32, 48], over: [48, 48], grow: 0.25 }, // bras gauche
    { w: 4, h: 12, d: 4, pos: [-2, 6, 0], base: [0, 16], over: [0, 32], grow: 0.25 }, // jambe droite
    { w: 4, h: 12, d: 4, pos: [2, 6, 0], base: [16, 48], over: [0, 48], grow: 0.25 }, // jambe gauche
  ];
}

/** Boîte dont les UV pointent vers la bonne zone de la texture Minecraft. */
function boxGeometry(w, h, d, u, v, grow) {
  const g = new THREE.BoxGeometry(w + grow * 2, h + grow * 2, d + grow * 2);
  const uv = g.attributes.uv;
  // Ordre des faces de BoxGeometry : +x, -x, +y, -y, +z, -z
  // Le côté "droit" du personnage est à -x, son côté "gauche" à +x, il regarde vers +z.
  const rects = [
    [u + d + w, v + d, d, h], // +x : côté gauche
    [u, v + d, d, h], // -x : côté droit
    [u + d, v, w, d], // +y : dessus
    [u + d + w, v, w, d], // -y : dessous
    [u + d, v + d, w, h], // +z : face
    [u + d + w + d, v + d, w, h], // -z : dos
  ];
  rects.forEach(([x, y, rw, rh], f) => {
    const u0 = x / SKIN_SIZE;
    const u1 = (x + rw) / SKIN_SIZE;
    const vt = 1 - y / SKIN_SIZE;
    const vb = 1 - (y + rh) / SKIN_SIZE;
    uv.setXY(f * 4 + 0, u0, vt);
    uv.setXY(f * 4 + 1, u1, vt);
    uv.setXY(f * 4 + 2, u0, vb);
    uv.setXY(f * 4 + 3, u1, vb);
  });
  uv.needsUpdate = true;
  return g;
}

export function createSkinModel(texture, modelType = 'classic') {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.5 });
  for (const p of partsFor(modelType)) {
    const base = new THREE.Mesh(boxGeometry(p.w, p.h, p.d, p.base[0], p.base[1], 0), material);
    const over = new THREE.Mesh(boxGeometry(p.w, p.h, p.d, p.over[0], p.over[1], p.grow), material);
    base.position.set(...p.pos);
    over.position.set(...p.pos);
    group.add(base, over);
  }
  return group;
}

export function addLights(scene) {
  // Depuis three r155 les intensités ne sont plus multipliées par PI
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * 0.78));
  const key = new THREE.DirectionalLight(0xffffff, Math.PI * 0.42);
  key.position.set(25, 45, 40);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe0ff, Math.PI * 0.18);
  fill.position.set(-30, 15, -35);
  scene.add(fill);
}
