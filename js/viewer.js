import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createSkinModel, addLights, makeSkinTexture, SKIN_SIZE } from './skin-model.js';

function makeShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(10,25,50,0.55)');
  grad.addColorStop(1, 'rgba(10,25,50,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

export class Viewer {
  constructor(canvas, modelType = 'classic') {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
    this.camera.position.set(24, 32, 74);

    this.skinCanvas = document.createElement('canvas');
    this.skinCanvas.width = this.skinCanvas.height = SKIN_SIZE;
    this.skinCtx = this.skinCanvas.getContext('2d');
    this.texture = makeSkinTexture(this.skinCanvas);

    this.model = createSkinModel(this.texture, modelType);
    this.scene.add(this.model);

    // petit socle enneigé
    const snow = new THREE.Mesh(
      new THREE.CylinderGeometry(15, 15, 1.2, 56),
      new THREE.MeshLambertMaterial({ color: 0xe9f1ff }),
    );
    snow.position.y = -0.6;
    this.scene.add(snow, makeShadow());
    addLights(this.scene);

    const c = (this.controls = new OrbitControls(this.camera, canvas));
    c.target.set(0, 15, 0);
    c.enablePan = false;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 30;
    c.maxDistance = 130;
    c.maxPolarAngle = Math.PI * 0.52;
    c.autoRotate = true;
    c.autoRotateSpeed = 2.2;
    c.addEventListener('start', () => {
      c.autoRotate = false;
      clearTimeout(this._resume);
    });
    c.addEventListener('end', () => {
      this._resume = setTimeout(() => (c.autoRotate = true), 4000);
    });

    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();

    const loop = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    loop();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // sur écran étroit on élargit le champ pour que le perso reste entier
    const baseHalf = THREE.MathUtils.degToRad(16);
    const half = aspect < 0.75 ? Math.atan(Math.tan(baseHalf) * (0.75 / aspect)) : baseHalf;
    this.camera.fov = THREE.MathUtils.radToDeg(half * 2);
    this.camera.updateProjectionMatrix();
  }

  setSkin(source) {
    this.skinCtx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
    this.skinCtx.drawImage(source, 0, 0);
    this.texture.needsUpdate = true;
  }
}
