import * as THREE from 'three';
import { createSkinModel, addLights, makeSkinTexture, SKIN_SIZE } from './skin-model.js';

// Cadrage de la caméra selon la catégorie : hauteur visée et distance
const FOCUS = {
  tete: { y: 28, dist: 27 },
  haut: { y: 18, dist: 35 },
  bras: { y: 18, dist: 41 },
  bas: { y: 6, dist: 35 },
};
const DEFAULT_FOCUS = { y: 16, dist: 72 };

/**
 * Un seul moteur WebGL partagé pour toutes les vignettes (les navigateurs limitent le
 * nombre de contextes WebGL). Chaque vignette est un petit canvas 2D qui recopie le rendu.
 */
export class PreviewRenderer {
  constructor(modelType, size = 240) {
    this.size = size;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(size, size, false);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.1, 500);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = SKIN_SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.texture = makeSkinTexture(this.canvas);

    this.model = createSkinModel(this.texture, modelType);
    this.scene.add(this.model);
    addLights(this.scene);
    this.current = null;
  }

  /** Dessine la pièce (canvas 64x64) vue sous l'angle donné dans le contexte 2D cible. */
  render(pieceCanvas, catId, angle, targetCtx) {
    if (this.current !== pieceCanvas) {
      this.ctx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
      this.ctx.drawImage(pieceCanvas, 0, 0);
      this.texture.needsUpdate = true;
      this.current = pieceCanvas;
    }
    const f = FOCUS[catId] ?? DEFAULT_FOCUS;
    this.model.rotation.y = angle;
    this.camera.position.set(0, f.y + f.dist * 0.12, f.dist);
    this.camera.lookAt(0, f.y, 0);
    this.renderer.render(this.scene, this.camera);

    const { width, height } = targetCtx.canvas;
    targetCtx.clearRect(0, 0, width, height);
    targetCtx.drawImage(this.renderer.domElement, 0, 0, width, height);
  }
}
