import {
  Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, NgZone, HostListener
} from '@angular/core';

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Points, Clock,
  Vector2, BoxGeometry, SphereGeometry, CylinderGeometry, CircleGeometry,
  PlaneGeometry, LatheGeometry, TorusGeometry, RingGeometry, ConeGeometry,
  Shape, Path, ExtrudeGeometry,
  BufferGeometry, BufferAttribute, MeshStandardMaterial, MeshPhysicalMaterial,
  MeshBasicMaterial, PointsMaterial, ShaderMaterial,
  AmbientLight, DirectionalLight, HemisphereLight, PointLight, SpotLight,
  PCFSoftShadowMap, ACESFilmicToneMapping, DoubleSide, FrontSide,
  AdditiveBlending, FogExp2, Color
} from 'three';
import * as THREE from 'three';

@Component({
  selector: 'app-temple-scene',
  standalone: true,
  template: `<canvas #templeCanvas class="temple-canvas"></canvas>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; min-height: 500px; position: relative; }
    .temple-canvas { display: block; width: 100%; height: 100%; min-height: 500px; cursor: grab; }
    .temple-canvas:active { cursor: grabbing; }
  `]
})
export class TempleScene implements AfterViewInit, OnDestroy {
  @ViewChild('templeCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer: any;
  private scene: any;
  private camera: any;
  private frameId = 0;
  private clock: any;
  private resizeObserver!: ResizeObserver;
  private templeGroup: any;
  private diyas: any[] = [];
  private flames: any[] = [];
  private particles: any;
  private particlesInner: any;
  private flagMesh: any;
  private flagOrigPositions: any;
  private mouseX = 0;
  private mouseY = 0;
  private targetRotY = -0.15;
  private targetRotX = 0;
  private currentRotY = -0.15;
  private currentRotX = 0;
  private boundMouseMove: any;
  private boundMouseLeave: any;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.clock = new Clock();
      this.initScene();
      this.buildTemple();
      this.addLighting();
      this.addParticles();
      this.animate();
      this.setupResize();
      this.setupMouse();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('mousemove', this.boundMouseMove);
      canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    }
    this.renderer?.dispose();
  }

  // â”€â”€â”€ MOUSE INTERACTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private setupMouse(): void {
    const canvas = this.canvasRef.nativeElement;
    this.boundMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      this.mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    this.boundMouseLeave = () => { this.mouseX = 0; this.mouseY = 0; };
    canvas.addEventListener('mousemove', this.boundMouseMove);
    canvas.addEventListener('mouseleave', this.boundMouseLeave);
  }

  // â”€â”€â”€ SCENE INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement || canvas.ownerDocument.body;
    const w = canvas.clientWidth || parent.clientWidth || 650;
    const h = canvas.clientHeight || parent.clientHeight || 550;

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, true);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new Scene();
    this.scene.background = new Color(0x0c0500);
    this.scene.fog = new FogExp2(0x0c0500, 0.008);

    const aspect = (w && h) ? (w / h) : 1.2;
    this.camera = new PerspectiveCamera(38, aspect, 0.1, 100);
    this.camera.position.set(9.6, 5.0, 13.8);
    this.camera.lookAt(0, 3.4, 0);
  }

  // â”€â”€â”€ MATERIALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private mat(color: string, opts?: any): any {
    return new MeshStandardMaterial({
      color, roughness: opts?.roughness ?? 0.5, metalness: opts?.metalness ?? 0.15,
      emissive: opts?.emissive ?? '#000000', emissiveIntensity: opts?.emissiveIntensity ?? 0,
      flatShading: opts?.flatShading ?? false,
    });
  }
  private phys(color: string, opts?: any): any {
    return new MeshStandardMaterial({
      color, roughness: opts?.roughness ?? 0.35, metalness: opts?.metalness ?? 0.25,
      emissive: opts?.emissive ?? '#000000', emissiveIntensity: opts?.emissiveIntensity ?? 0,
    });
  }

  // â”€â”€â”€ BUILD TEMPLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private buildTemple(): void {
    this.templeGroup = new Group();

    // Exact materials matching Google Maps photos of Bajrangbali Hanuman Mandir (Kalikapur)
    const polishedGold  = this.mat('#f5c242', { roughness: 0.3, metalness: 0.3 });
    const brushedGold   = this.mat('#d4a017', { roughness: 0.4, metalness: 0.25 });
    const darkGold      = this.mat('#b8860b', { roughness: 0.45, metalness: 0.2 });
    const wallWhite     = this.mat('#f8f9fa', { roughness: 0.5, metalness: 0.05 });
    const plinthBlue    = this.mat('#1565c0', { roughness: 0.6, metalness: 0.1 });
    const plinthPink    = this.mat('#e91e63', { roughness: 0.5, metalness: 0.1 });
    const roofGreen     = this.mat('#2e7d32', { roughness: 0.5, metalness: 0.1 });
    const archRed       = this.mat('#c62828', { roughness: 0.4, metalness: 0.1 });
    const archYellow    = this.mat('#fbc02d', { roughness: 0.3, metalness: 0.2 });
    const spireYellow   = this.mat('#fbc02d', { roughness: 0.4, metalness: 0.1 });
    const spireGreen    = this.mat('#388e3c', { roughness: 0.4, metalness: 0.1 });
    const amalakaBlue   = this.mat('#1976d2', { roughness: 0.4, metalness: 0.1 });
    const amalakaRed    = this.mat('#d32f2f', { roughness: 0.4, metalness: 0.1 });
    const archDark      = this.mat('#1a0500', { roughness: 0.8 });
    const glowGold      = this.mat('#ffd700', { roughness: 0.2, metalness: 0.3, emissive: '#ffaa00', emissiveIntensity: 0.8 });
    const flagOrange    = this.mat('#ff5500', { roughness: 0.7, emissive: '#ff3300', emissiveIntensity: 0.3 });
    const sacredRed     = this.mat('#cc2200', { roughness: 0.5, metalness: 0.1 });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // JAGATI â€” Ornate Stepped Platform
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pSteps = [
      { w: 7.0, h: 0.15, d: 5.0, m: plinthBlue },
      { w: 6.6, h: 0.12, d: 4.7, m: wallWhite },
      { w: 6.2, h: 0.15, d: 4.4, m: plinthPink },
      { w: 5.8, h: 0.12, d: 4.1, m: wallWhite },
      { w: 5.4, h: 0.18, d: 3.8, m: roofGreen },
    ];
    let py = 0;
    pSteps.forEach(s => {
      const m = new Mesh(new BoxGeometry(s.w, s.h, s.d), s.m);
      m.position.set(0, py + s.h / 2, 0);
      m.castShadow = true; m.receiveShadow = true;
      this.templeGroup.add(m);
      py += s.h;
    });
    const baseTop = py;

    // Platform edge trim â€” decorative torus rings on top step
    [-2.3, -1.1, 0, 1.1, 2.3].forEach(x => {
      const ring = new Mesh(new TorusGeometry(0.06, 0.02, 8, 16), archYellow);
      ring.position.set(x, baseTop + 0.01, pSteps[4].d / 2 + 0.01);
      ring.rotation.x = Math.PI / 2;
      this.templeGroup.add(ring);
    });

    // â”€â”€ MANDAPA â€” Grand Pillared Hall â”€â”€
    const mW = 4.8, mH = 2.6, mD = 2.8;
    // Left Mandapa Wall
    const mandapaLeft = new Mesh(new BoxGeometry(1.75, mH, mD), wallWhite);
    mandapaLeft.position.set(-1.525, baseTop + mH / 2, 0);
    mandapaLeft.castShadow = true; mandapaLeft.receiveShadow = true;
    this.templeGroup.add(mandapaLeft);

    // Right Mandapa Wall
    const mandapaRight = new Mesh(new BoxGeometry(1.75, mH, mD), wallWhite);
    mandapaRight.position.set(1.525, baseTop + mH / 2, 0);
    mandapaRight.castShadow = true; mandapaRight.receiveShadow = true;
    this.templeGroup.add(mandapaRight);

    // Double cornice with relief band
    const cornice1 = new Mesh(new BoxGeometry(mW + 0.4, 0.08, mD + 0.4), roofGreen);
    cornice1.position.set(0, baseTop + mH + 0.04, 0);
    this.templeGroup.add(cornice1);
    const cornice2 = new Mesh(new BoxGeometry(mW + 0.5, 0.1, mD + 0.5), archYellow);
    cornice2.position.set(0, baseTop + mH + 0.13, 0);
    this.templeGroup.add(cornice2);

    // // ── BAJRANGBALI HANUMAN STATUE ON ROOFTOP ──
    // this.addHanumanStatue(baseTop, mH, mD, polishedGold, flagOrange, archRed);

    // Relief band (thin ornamental strip midway)
    const reliefBand = new Mesh(new BoxGeometry(mW + 0.06, 0.06, mD + 0.06), archRed);
    reliefBand.position.set(0, baseTop + mH * 0.55, 0);
    this.templeGroup.add(reliefBand);

    // Front columns (6 columns)
    const colZ = mD / 2 + 0.01;
    [-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].forEach(cx => {
      this.addColumn(cx, baseTop, colZ, mH, archYellow, archRed);
    });

    // Side columns (2 each side)
    [-0.6, 0.6].forEach(cz => {
      this.addColumn(-mW / 2 - 0.01, baseTop, cz, mH, archYellow, archRed);
      this.addColumn(mW / 2 + 0.01, baseTop, cz, mH, archYellow, archRed);
    });

    // â”€â”€ GARBHAGRIHA â€” Sanctum Sanctorum â”€â”€
    const sW = 3.0, sH = 3.4, sD = 2.6;
    // Left Sanctum Wall
    const sLeft = new Mesh(new BoxGeometry(0.85, sH, sD), wallWhite);
    sLeft.position.set(-1.075, baseTop + sH / 2, 0);
    sLeft.castShadow = true; sLeft.receiveShadow = true;
    this.templeGroup.add(sLeft);

    // Right Sanctum Wall
    const sRight = new Mesh(new BoxGeometry(0.85, sH, sD), wallWhite);
    sRight.position.set(1.075, baseTop + sH / 2, 0);
    sRight.castShadow = true; sRight.receiveShadow = true;
    this.templeGroup.add(sRight);

    // Back Sanctum Wall
    const sBack = new Mesh(new BoxGeometry(1.3, sH, 0.4), wallWhite);
    sBack.position.set(0, baseTop + sH / 2, -sD / 2 + 0.2);
    sBack.castShadow = true; sBack.receiveShadow = true;
    this.templeGroup.add(sBack);

    // Sanctum wall panels (slightly protruding for 3D depth)
    [[-sW / 2 - 0.02, sD * 0.25], [-sW / 2 - 0.02, -sD * 0.25],
     [sW / 2 + 0.02, sD * 0.25], [sW / 2 + 0.02, -sD * 0.25]].forEach(([x, z]) => {
      const panel = new Mesh(new BoxGeometry(0.06, sH * 0.7, 0.5), wallWhite);
      panel.position.set(x, baseTop + sH * 0.45, z);
      this.templeGroup.add(panel);
    });

    // Sanctum cornices
    const sCor1 = new Mesh(new BoxGeometry(sW + 0.3, 0.1, sD + 0.3), roofGreen);
    sCor1.position.set(0, baseTop + sH + 0.05, 0);
    this.templeGroup.add(sCor1);
    const sCor2 = new Mesh(new BoxGeometry(sW + 0.4, 0.12, sD + 0.4), archYellow);
    sCor2.position.set(0, baseTop + sH + 0.16, 0);
    this.templeGroup.add(sCor2);

    // â”€â”€ Grand Arch Doorway â”€â”€
    this.buildArch(baseTop, sD, polishedGold, glowGold, archDark, sacredRed);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // SHIKHARA â€” Ornate Multi-Tier Tower
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const shBase = baseTop + sH + 0.22;
    this.buildShikhara(shBase, polishedGold, brushedGold, darkGold, archRed, archYellow, glowGold, sacredRed, flagOrange);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // STAIRS â€” Wide Ceremonial Stairway
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (let i = 0; i < 7; i++) {
      const sw = 1.8 - i * 0.05;
      const stair = new Mesh(new BoxGeometry(sw, 0.1, 0.22), i % 2 === 0 ? archYellow : wallWhite);
      stair.position.set(0, baseTop - (i + 1) * 0.1 + 0.05, sD / 2 + 0.15 + i * 0.22);
      stair.castShadow = true; stair.receiveShadow = true;
      this.templeGroup.add(stair);
    }

    // Stair railings
    [-0.85, 0.85].forEach(x => {
      for (let i = 0; i < 4; i++) {
        const post = new Mesh(new CylinderGeometry(0.03, 0.03, 0.5, 8), brushedGold);
        post.position.set(x, baseTop - 0.05 + 0.25, sD / 2 + 0.3 + i * 0.4);
        this.templeGroup.add(post);
      }
      const rail = new Mesh(new BoxGeometry(0.04, 0.04, 1.6), polishedGold);
      rail.position.set(x, baseTop - 0.05 + 0.52, sD / 2 + 0.8);
      this.templeGroup.add(rail);
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PATH â€” Stone walkway from stairs to courtyard boundary
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Stairs end at z â‰ˆ 2.77, boundary ring at r=3.3 â†’ path runs z=2.8 to z=5.0
    const pathMat = this.mat('#d4c4a0', { roughness: 0.8, metalness: 0.0 });
    const pathBorderMat = this.mat('#b8860b', { roughness: 0.4, metalness: 0.3 });
    const pathLen = 2.4;
    const pathZ = sD / 2 + 0.15 + 6 * 0.22 + pathLen / 2; // start right at stair bottom
    const path = new Mesh(new BoxGeometry(1.4, 0.02, pathLen), pathMat);
    path.position.set(0, 0.01, pathZ);
    path.receiveShadow = true;
    this.templeGroup.add(path);
    // Path border left
    const pathBorderL = new Mesh(new BoxGeometry(0.06, 0.04, pathLen), pathBorderMat);
    pathBorderL.position.set(-0.73, 0.02, pathZ);
    this.templeGroup.add(pathBorderL);
    // Path border right
    const pathBorderR = new Mesh(new BoxGeometry(0.06, 0.04, pathLen), pathBorderMat);
    pathBorderR.position.set(0.73, 0.02, pathZ);
    this.templeGroup.add(pathBorderR);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // DEEPJYOTI LAMP PEDESTALS â€” halfway along the path, flanking it
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const djZ = pathZ - 0.2; // slightly before path midpoint
    [-1.1, 1.1].forEach(lx => {
      this.addDeepjyoti(lx, 0, djZ);
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // GROUND â€” Reflective Temple Courtyard
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Main ground
    const ground = new Mesh(
      new CircleGeometry(12, 64),
      new MeshStandardMaterial({ color: '#100600', roughness: 0.85, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.01, 0);
    ground.receiveShadow = true;
    this.templeGroup.add(ground);

    // Inner courtyard (lighter ring around temple)
    const courtyard = new Mesh(
      new RingGeometry(3.2, 5.5, 48),
      new MeshStandardMaterial({ color: '#1a0a02', roughness: 0.7, metalness: 0.15 })
    );
    courtyard.rotation.x = -Math.PI / 2;
    courtyard.position.set(0, 0.005, 0);
    courtyard.receiveShadow = true;
    this.templeGroup.add(courtyard);

    // Decorative boundary circles
    [3.3, 5.4].forEach(r => {
      const ring = new Mesh(new TorusGeometry(r, 0.02, 6, 64), polishedGold);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.02, 0);
      this.templeGroup.add(ring);
    });

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // LION STATUES â€” Simha Dwarapalas flanking entrance steps
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    this.addLionStatues(baseTop, 2.4, polishedGold, brushedGold, darkGold, archYellow, archRed);

    this.scene.add(this.templeGroup);
  }

  // ─── GRAND ARCH & REAL CARVED WOODEN TEMPLE DOORS ─────────────────────────
  // Real solid wooden doors — carved design, brass studs,
  // ─── GRAND ARCH & REAL CARVED WOODEN TEMPLE DOORS ─────────────────────────
  // Real solid wooden doors — carved design, brass studs,
  // ─── GRAND ARCH & BEAUTIFUL DOORS ───────────────────────
  private buildArch(baseTop: number, sD: number, polishedGold: any, glowGold: any, archDark: any, sacredRed: any): void {
    const archW = 1.1, archH = 2.2;

    // Deep dark recess
    const recess = new Mesh(new BoxGeometry(archW, archH, 0.25), archDark);
    recess.position.set(0, baseTop + archH / 2, sD / 2 + 0.06);
    this.templeGroup.add(recess);

    // Inner Sanctum Sanctified Glow & Deity Gada (Mace)
    const sanctumLight = new PointLight('#ffaa00', 4.0, 4.0, 1.2);
    sanctumLight.position.set(0, baseTop + archH * 0.55, sD / 2 - 0.2);
    this.scene.add(sanctumLight);

    // Golden Gada (Lord Hanuman's Mace) inside the sanctum
    const gadaGroup = new Group();
    const handle = new Mesh(new CylinderGeometry(0.02, 0.025, 0.8, 8), polishedGold);
    handle.position.set(0, 0.4, 0);
    gadaGroup.add(handle);
    const maceHead = new Mesh(new SphereGeometry(0.12, 12, 12), glowGold);
    maceHead.position.set(0, 0.8, 0);
    gadaGroup.add(maceHead);
    const maceCrown = new Mesh(new ConeGeometry(0.04, 0.1, 8), polishedGold);
    maceCrown.position.set(0, 0.94, 0);
    gadaGroup.add(maceCrown);
    gadaGroup.position.set(0, baseTop + 0.1, sD / 2 - 0.1);
    gadaGroup.rotation.z = Math.PI / 8;
    this.templeGroup.add(gadaGroup);

    // ── ORNATE GOLDEN METAL GRILL GATES (Jali Doors - slightly open) ──
    const doorW = (archW - 0.16) / 2;
    const doorH = archH - 0.35;
    const grillGold = polishedGold;

    // Helper to build a single detailed grill door leaf
    const createGrillLeaf = (isLeft: boolean) => {
      const leaf = new Group();
      const pivot = isLeft ? doorW / 2 : -doorW / 2;

      // 1. Outer Frame (slim golden borders)
      const frameT = 0.02; // Thickness
      const frameW = 0.035; // Width
      
      // Vertical left frame
      const fLeft = new Mesh(new BoxGeometry(frameW, doorH, frameT), grillGold);
      fLeft.position.set(pivot - (isLeft ? doorW / 2 - frameW / 2 : -doorW / 2 + frameW / 2), doorH / 2, 0);
      leaf.add(fLeft);

      // Vertical right frame
      const fRight = new Mesh(new BoxGeometry(frameW, doorH, frameT), grillGold);
      fRight.position.set(pivot - (isLeft ? -doorW / 2 + frameW / 2 : doorW / 2 - frameW / 2), doorH / 2, 0);
      leaf.add(fRight);

      // Horizontal top frame
      const fTop = new Mesh(new BoxGeometry(doorW, frameW, frameT), grillGold);
      fTop.position.set(pivot, doorH - frameW / 2, 0);
      leaf.add(fTop);

      // Horizontal bottom frame
      const fBottom = new Mesh(new BoxGeometry(doorW, frameW, frameT), grillGold);
      fBottom.position.set(pivot, frameW / 2, 0);
      leaf.add(fBottom);

      // 2. Vertical Grill Rods (Brass bars)
      const numRods = 4;
      for (let i = 0; i < numRods; i++) {
        // Space them inside the frame
        const rx = pivot - (isLeft ? doorW / 2 : -doorW / 2) + frameW + (i + 0.5) * (doorW - 2 * frameW) / numRods;
        const rod = new Mesh(new CylinderGeometry(0.007, 0.007, doorH - 2 * frameW, 6), glowGold);
        rod.position.set(rx, doorH / 2, 0);
        leaf.add(rod);
      }

      // 3. Decorative Horizontal Bars (Red & Gold)
      [0.25, 0.5, 0.75].forEach(hPct => {
        const hBar = new Mesh(new BoxGeometry(doorW - 2 * frameW, 0.02, frameT * 1.2), sacredRed);
        hBar.position.set(pivot, doorH * hPct, 0);
        leaf.add(hBar);

        // Center brass studs on intersection of horizontal bars
        for (let i = 0; i < numRods; i++) {
          const rx = pivot - (isLeft ? doorW / 2 : -doorW / 2) + frameW + (i + 0.5) * (doorW - 2 * frameW) / numRods;
          const stud = new Mesh(new SphereGeometry(0.015, 6, 6), grillGold);
          stud.position.set(rx, doorH * hPct, frameT * 0.7);
          leaf.add(stud);
        }
      });

      // 4. Central Ornamental Circle / Emblem
      const circle = new Mesh(new TorusGeometry(0.07, 0.012, 6, 16), grillGold);
      circle.position.set(pivot, doorH / 2, frameT * 0.8);
      leaf.add(circle);
      const centerNode = new Mesh(new SphereGeometry(0.025, 8, 8), glowGold);
      centerNode.position.set(pivot, doorH / 2, frameT * 0.8);
      leaf.add(centerNode);

      // 5. Door handle ring
      const hPlate = new Mesh(new BoxGeometry(0.02, 0.1, 0.01), grillGold);
      hPlate.position.set(pivot + (isLeft ? doorW / 2 - 0.04 : -doorW / 2 + 0.04), doorH / 2, frameT * 0.9);
      leaf.add(hPlate);
      const hRing = new Mesh(new TorusGeometry(0.025, 0.006, 6, 12), grillGold);
      hRing.position.set(pivot + (isLeft ? doorW / 2 - 0.04 : -doorW / 2 + 0.04), doorH / 2, frameT * 1.2);
      leaf.add(hRing);

      return leaf;
    };

    // Instantiate Left Gate Leaf
    const leftDoor = createGrillLeaf(true);
    leftDoor.position.set(-archW / 2 + 0.08, baseTop + 0.05, sD / 2 + 0.09);
    leftDoor.rotation.y = -Math.PI / 4; // Open inward by 45 degrees
    this.templeGroup.add(leftDoor);

    // Instantiate Right Gate Leaf
    const rightDoor = createGrillLeaf(false);
    rightDoor.position.set(archW / 2 - 0.08, baseTop + 0.05, sD / 2 + 0.09);
    rightDoor.rotation.y = Math.PI / 4; // Open inward by 45 degrees
    this.templeGroup.add(rightDoor);

    // ── TORAN GARLAND (Marigold Flowers & Mango Leaves above door) ──
    const toranGroup = new Group();
    const toranString = new Mesh(new CylinderGeometry(0.008, 0.008, archW + 0.1, 8), polishedGold);
    toranString.rotation.z = Math.PI / 2;
    toranString.position.set(0, archH - 0.08, 0);
    toranGroup.add(toranString);

    const marigoldMat = this.mat('#ff9900', { roughness: 0.4, emissive: '#ff6600', emissiveIntensity: 0.2 });
    const leafMat = this.mat('#2e8b57', { roughness: 0.6 });

    for (let i = 0; i < 9; i++) {
      const tx = -archW / 2 + 0.08 + i * (archW - 0.16) / 8;
      // Marigold flower
      const flower = new Mesh(new SphereGeometry(0.03, 8, 8), marigoldMat);
      flower.position.set(tx, archH - 0.11, 0.02);
      toranGroup.add(flower);
      // Mango leaf hanging down
      const leaf = new Mesh(new ConeGeometry(0.02, 0.08, 4), leafMat);
      leaf.rotation.z = Math.PI;
      leaf.position.set(tx, archH - 0.16, 0.02);
      toranGroup.add(leaf);
    }
    toranGroup.position.set(0, baseTop, sD / 2 + 0.16);
    this.templeGroup.add(toranGroup);

    // Extruded outer arch frame
    const shape = new Shape();
    shape.moveTo(-archW / 2, 0);
    shape.lineTo(-archW / 2, archH - archW / 2);
    shape.absarc(0, archH - archW / 2, archW / 2, Math.PI, 0, false);
    shape.lineTo(archW / 2, 0);
    shape.lineTo(-archW / 2, 0);
    const inner = new Path();
    const iw = archW - 0.14, ih = archH - 0.07;
    inner.moveTo(-iw / 2, 0.07);
    inner.lineTo(-iw / 2, ih - iw / 2);
    inner.absarc(0, ih - iw / 2, iw / 2, Math.PI, 0, false);
    inner.lineTo(iw / 2, 0.07);
    inner.lineTo(-iw / 2, 0.07);
    shape.holes.push(inner);

    const frame = new Mesh(
      new ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }),
      glowGold
    );
    frame.position.set(0, baseTop, sD / 2 + 0.08);
    this.templeGroup.add(frame);

    // Decorative half-circle crown above arch
    const archCrown = new Mesh(
      new TorusGeometry(archW / 2 + 0.1, 0.04, 8, 16, Math.PI),
      polishedGold
    );
    archCrown.position.set(0, baseTop + archH - archW / 2, sD / 2 + 0.16);
    this.templeGroup.add(archCrown);

    // Side decorative columns on the arch
    [-archW / 2 - 0.1, archW / 2 + 0.1].forEach(x => {
      const miniCol = new Mesh(new CylinderGeometry(0.04, 0.04, archH * 0.8, 8), polishedGold);
      miniCol.position.set(x, baseTop + archH * 0.4, sD / 2 + 0.14);
      this.templeGroup.add(miniCol);
    });
  }

  private addLionStatues(
    baseTop: number, sD: number,
    gold: any, brushed: any, darkGold: any, archYellow: any, archRed: any
  ): void {
    // Exactly 2 Simha Dwarapala lions â€” perfectly aligned & facing straight forward
    const pathFrontZ = sD / 2 + 1.8;
    const lionConfigs = [
      // Left Guardian Lion â€” aligned on left of entrance steps, facing straight forward
      { x: -1.8, y: 0.01, z: pathFrontZ, ry: 0, scale: 1.2 },
      // Right Guardian Lion â€” aligned on right of entrance steps, facing straight forward
      { x:  1.8, y: 0.01, z: pathFrontZ, ry: 0, scale: 1.2 },
    ];

    lionConfigs.forEach(cfg => {
      const lionGroup = new Group();

      // Stepped Pedestal base
      const pedBase = new Mesh(new BoxGeometry(0.62, 0.12, 0.78), archRed);
      pedBase.position.set(0, 0.06, 0);
      pedBase.castShadow = true;
      lionGroup.add(pedBase);

      const ped = new Mesh(new BoxGeometry(0.5, 0.3, 0.65), archYellow);
      ped.position.set(0, 0.27, 0);
      ped.castShadow = true;
      lionGroup.add(ped);

      const pedTrim = new Mesh(new BoxGeometry(0.56, 0.06, 0.71), gold);
      pedTrim.position.set(0, 0.42, 0);
      lionGroup.add(pedTrim);

      // Lion Body (Proud seated posture)
      const body = new Mesh(new BoxGeometry(0.32, 0.4, 0.45), gold);
      body.position.set(0, 0.65, -0.02);
      body.castShadow = true;
      lionGroup.add(body);

      // Muscular Chest / Front
      const chest = new Mesh(new SphereGeometry(0.2, 10, 10), gold);
      chest.position.set(0, 0.75, 0.15);
      lionGroup.add(chest);

      // Lion Mane (Heavy golden ring of spheres around neck)
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2;
        const maneTuft = new Mesh(new SphereGeometry(0.09, 8, 8), brushed);
        maneTuft.position.set(Math.cos(angle) * 0.18, 0.9 + Math.sin(angle) * 0.14, 0.12);
        lionGroup.add(maneTuft);
      }

      // Lion Head
      const head = new Mesh(new SphereGeometry(0.155, 10, 10), gold);
      head.position.set(0, 0.97, 0.18);
      lionGroup.add(head);

      // Snout / Muzzle
      const snout = new Mesh(new BoxGeometry(0.12, 0.1, 0.12), brushed);
      snout.position.set(0, 0.93, 0.31);
      lionGroup.add(snout);

      // Eyes (two small spheres)
      [-0.06, 0.06].forEach(ex => {
        const eye = new Mesh(new SphereGeometry(0.025, 6, 6), darkGold);
        eye.position.set(ex, 1.0, 0.29);
        lionGroup.add(eye);
        // Eye shine
        const eyeShine = new Mesh(new SphereGeometry(0.01, 4, 4),
          this.mat('#ffffff', { roughness: 0.1, metalness: 0.5 }));
        eyeShine.position.set(ex + 0.01, 1.01, 0.31);
        lionGroup.add(eyeShine);
      });

      // Ears (Two small cones)
      [-0.1, 0.1].forEach(ex => {
        const ear = new Mesh(new ConeGeometry(0.04, 0.08, 6), gold);
        ear.position.set(ex, 1.1, 0.16);
        ear.rotation.z = ex > 0 ? -0.3 : 0.3;
        lionGroup.add(ear);
      });

      // Front Paws (Two sturdy legs)
      [-0.11, 0.11].forEach(px => {
        const leg = new Mesh(new CylinderGeometry(0.05, 0.06, 0.38, 8), gold);
        leg.position.set(px, 0.63, 0.22);
        lionGroup.add(leg);

        const paw = new Mesh(new SphereGeometry(0.075, 8, 8), brushed);
        paw.position.set(px, 0.46, 0.26);
        lionGroup.add(paw);

        // Claw details
        for (let c = 0; c < 3; c++) {
          const claw = new Mesh(new ConeGeometry(0.01, 0.03, 4), darkGold);
          claw.position.set(px + (c - 1) * 0.025, 0.43, 0.32);
          claw.rotation.x = 0.4;
          lionGroup.add(claw);
        }
      });

      // Tail curling up behind
      const tailCurve = new Mesh(new TorusGeometry(0.14, 0.02, 6, 12, Math.PI * 1.2), brushed);
      tailCurve.position.set(0, 0.68, -0.24);
      tailCurve.rotation.x = -Math.PI / 6;
      lionGroup.add(tailCurve);

      // Tail tuft
      const tailTuft = new Mesh(new SphereGeometry(0.05, 6, 6), brushed);
      tailTuft.position.set(0, 0.82, -0.3);
      lionGroup.add(tailTuft);

      // Glow point light from pedestal
      const lionLight = new PointLight('#ffcc44', 0.8, 2.0, 2);
      lionLight.position.set(0, 0.5, 0);
      lionGroup.add(lionLight);

      // Place the lion group
      lionGroup.position.set(cfg.x, cfg.y || 0.01, cfg.z);
      lionGroup.rotation.y = cfg.ry;
      const sc = cfg.scale || 1.2;
      lionGroup.scale.set(sc, sc, sc);
      this.templeGroup.add(lionGroup);
    });
  }

  // â”€â”€â”€ SHIKHARA (TOWER) & TRISHUL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private buildShikhara(
    shBase: number, polishedGold: any, brushedGold: any, darkGold: any,
    saffronStone: any, deepMaroon: any, glowGold: any, sacredRed: any, flagOrange: any
  ): void {
    const wallWhite   = this.mat('#f8f9fa', { roughness: 0.5, metalness: 0.05 });
    const archRed     = this.mat('#c62828', { roughness: 0.4, metalness: 0.1 });
    const archYellow  = this.mat('#fbc02d', { roughness: 0.3, metalness: 0.2 });
    const spireYellow = this.mat('#fbc02d', { roughness: 0.4, metalness: 0.1 });
    const spireGreen  = this.mat('#388e3c', { roughness: 0.4, metalness: 0.1 });
    const amalakaBlue = this.mat('#1976d2', { roughness: 0.4, metalness: 0.1 });
    const amalakaRed  = this.mat('#d32f2f', { roughness: 0.4, metalness: 0.1 });

    const tiers = [
      { w: 2.8, h: 0.18, d: 2.5 },
      { w: 2.5, h: 0.24, d: 2.2 },
      { w: 2.2, h: 0.28, d: 1.9 },
      { w: 1.9, h: 0.32, d: 1.6 },
      { w: 1.6, h: 0.32, d: 1.3 },
      { w: 1.3, h: 0.28, d: 1.0 },
      { w: 1.0, h: 0.24, d: 0.8 },
      { w: 0.7, h: 0.20, d: 0.6 },
      { w: 0.45, h: 0.16, d: 0.4 },
    ];

    // Colors matching real temple photos (yellow, green, white, red)
    const colors = [archYellow, spireGreen, wallWhite, spireGreen, archYellow,
                    wallWhite, spireGreen, archYellow, archRed];

    let ty = shBase;
    tiers.forEach((t, i) => {
      // Main tier block
      const mesh = new Mesh(new BoxGeometry(t.w, t.h, t.d), colors[i]);
      mesh.position.set(0, ty + t.h / 2, 0);
      mesh.castShadow = true;
      this.templeGroup.add(mesh);

      // Gold/Red trim between tiers
      if (i < tiers.length - 1) {
        const trim = new Mesh(new BoxGeometry(t.w + 0.08, 0.035, t.d + 0.08), i % 2 === 0 ? archRed : archYellow);
        trim.position.set(0, ty + t.h + 0.017, 0);
        this.templeGroup.add(trim);
      }

      // Front decorative niche panel (Hanumanji framing on tier 3)
      if (i === 3) {
        const nicheFrame = new Mesh(new BoxGeometry(0.6, 0.5, 0.05), archRed);
        nicheFrame.position.set(0, ty + t.h / 2, t.d / 2 + 0.03);
        this.templeGroup.add(nicheFrame);
        const nicheContent = new Mesh(new BoxGeometry(0.48, 0.38, 0.06), archYellow);
        nicheContent.position.set(0, ty + t.h / 2, t.d / 2 + 0.04);
        this.templeGroup.add(nicheContent);
      }

      ty += t.h;
    });

    // Ribbed Amalaka disc (Blue body & Red ribs matching photo!)
    const amalakaGroup = new Group();
    const amalaka = new Mesh(new TorusGeometry(0.35, 0.12, 12, 24), amalakaBlue);
    amalaka.rotation.x = Math.PI / 2;
    amalakaGroup.add(amalaka);
    // Red Ribs
    for (let i = 0; i < 12; i++) {
      const rib = new Mesh(new SphereGeometry(0.06, 6, 6), amalakaRed);
      const angle = (i / 12) * Math.PI * 2;
      rib.position.set(Math.cos(angle) * 0.35, 0, Math.sin(angle) * 0.35);
      amalakaGroup.add(rib);
    }
    amalakaGroup.position.set(0, ty + 0.05, 0);
    this.templeGroup.add(amalakaGroup);
    ty += 0.2;

    // Ornate Kalash (Red body with Yellow/Gold bands)
    const kalashProfile = [
      new Vector2(0, 0),       new Vector2(0.15, 0.04),
      new Vector2(0.2, 0.12),  new Vector2(0.22, 0.2),
      new Vector2(0.2, 0.3),   new Vector2(0.15, 0.38),
      new Vector2(0.08, 0.42), new Vector2(0.06, 0.46),
      new Vector2(0.09, 0.5),  new Vector2(0.12, 0.54),
      new Vector2(0.08, 0.58), new Vector2(0.04, 0.64),
      new Vector2(0, 0.7),
    ];
    const kalash = new Mesh(new LatheGeometry(kalashProfile, 24), archRed);
    kalash.position.set(0, ty, 0);
    kalash.castShadow = true;
    this.templeGroup.add(kalash);

    // Kalash bands
    [0.12, 0.25, 0.5].forEach(yy => {
      const band = new Mesh(new TorusGeometry(0.18 - yy * 0.15, 0.015, 6, 16), archYellow);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, ty + yy, 0);
      this.templeGroup.add(band);
    });

    ty += 0.65;

    // â”€â”€ MAJESTIC GOLDEN TRISHUL (TRIDENT) AT APEX â”€â”€
    const trishulGroup = new Group();

    // 1. Central Trishul Pole (Solid, sturdy shaft)
    const trishulPole = new Mesh(new CylinderGeometry(0.025, 0.028, 1.1, 12), polishedGold);
    trishulPole.position.set(0, 0.55, 0);
    trishulGroup.add(trishulPole);

    // 2. Damru (Hour-glass drum at Trishul base)
    const damruTop = new Mesh(new ConeGeometry(0.08, 0.08, 12), polishedGold);
    damruTop.rotation.x = Math.PI;
    damruTop.position.set(0, 0.52, 0);
    trishulGroup.add(damruTop);

    const damruBottom = new Mesh(new ConeGeometry(0.08, 0.08, 12), polishedGold);
    damruBottom.position.set(0, 0.44, 0);
    trishulGroup.add(damruBottom);

    const damruRing = new Mesh(new TorusGeometry(0.04, 0.01, 8, 16), glowGold);
    damruRing.rotation.x = Math.PI / 2;
    damruRing.position.set(0, 0.48, 0);
    trishulGroup.add(damruRing);

    // 3. Curved Crossbar (U-shaped base bar connecting all 3 prongs)
    const crossbar = new Mesh(new TorusGeometry(0.2, 0.025, 8, 24, Math.PI), polishedGold);
    crossbar.position.set(0, 0.82, 0);
    trishulGroup.add(crossbar);

    // Crossbar center decorative collar
    const centerCollar = new Mesh(new TorusGeometry(0.038, 0.012, 8, 16), glowGold);
    centerCollar.rotation.x = Math.PI / 2;
    centerCollar.position.set(0, 0.82, 0);
    trishulGroup.add(centerCollar);

    // 4. Center Spearhead (Main vertical blade)
    const centerBlade = new Mesh(new ConeGeometry(0.05, 0.45, 12), glowGold);
    centerBlade.position.set(0, 1.05, 0);
    trishulGroup.add(centerBlade);

    // 5. Left Prong (Blade & Base Joint)
    const leftJoint = new Mesh(new SphereGeometry(0.03, 8, 8), glowGold);
    leftJoint.position.set(-0.2, 0.82, 0);
    trishulGroup.add(leftJoint);

    const leftBlade = new Mesh(new ConeGeometry(0.04, 0.38, 12), glowGold);
    leftBlade.position.set(-0.2, 1.01, 0);
    leftBlade.rotation.z = 0.08;
    trishulGroup.add(leftBlade);

    // 6. Right Prong (Blade & Base Joint)
    const rightJoint = new Mesh(new SphereGeometry(0.03, 8, 8), glowGold);
    rightJoint.position.set(0.2, 0.82, 0);
    trishulGroup.add(rightJoint);

    const rightBlade = new Mesh(new ConeGeometry(0.04, 0.38, 12), glowGold);
    rightBlade.position.set(0.2, 1.01, 0);
    rightBlade.rotation.z = -0.08;
    trishulGroup.add(rightBlade);

    trishulGroup.position.set(0, ty, 0);
    this.templeGroup.add(trishulGroup);

    // Flag with custom dynamic text (mounted directly on the Trishul pole)
    const flagGeo = new PlaneGeometry(0.85, 0.45, 10, 5);
    const flagTex = this.createFlagTexture();
    const flagMat = new MeshStandardMaterial({
      map: flagTex,
      roughness: 0.6,
      metalness: 0.15,
      side: DoubleSide
    });
    this.flagMesh = new Mesh(flagGeo, flagMat);
    this.flagMesh.position.set(0.425, ty + 0.45, 0);
    this.templeGroup.add(this.flagMesh);

    const flagPosAttr = this.flagMesh.geometry.getAttribute('position');
    this.flagOrigPositions = new Float32Array(flagPosAttr.array.length);
    this.flagOrigPositions.set(flagPosAttr.array);
  }

  // â”€â”€â”€ ORNATE COLUMN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private addColumn(x: number, baseY: number, z: number, h: number, gold: any, brushed: any): void {
    const r = 0.065;

    // Fluted shaft (octagonal for visual interest)
    const shaft = new Mesh(new CylinderGeometry(r, r * 1.15, h - 0.5, 8), gold);
    shaft.position.set(x, baseY + (h - 0.5) / 2 + 0.25, z);
    shaft.castShadow = true;
    this.templeGroup.add(shaft);

    // Mid-shaft ring
    const midRing = new Mesh(new TorusGeometry(r + 0.015, 0.01, 6, 12), gold);
    midRing.rotation.x = Math.PI / 2;
    midRing.position.set(x, baseY + h / 2, z);
    this.templeGroup.add(midRing);

    // Capital (wide top with decorative bracket)
    const capital = new Mesh(new CylinderGeometry(r * 2.5, r * 1.5, 0.12, 8), brushed);
    capital.position.set(x, baseY + h - 0.15, z);
    this.templeGroup.add(capital);

    // Capital top pad
    const capTop = new Mesh(new BoxGeometry(r * 4.5, 0.06, r * 4.5), gold);
    capTop.position.set(x, baseY + h - 0.06, z);
    this.templeGroup.add(capTop);

    // Lotus-style base
    const base = new Mesh(new CylinderGeometry(r * 1.8, r * 2.2, 0.12, 8), brushed);
    base.position.set(x, baseY + 0.06, z);
    this.templeGroup.add(base);

    // Base pad
    const basePad = new Mesh(new BoxGeometry(r * 4, 0.05, r * 4), gold);
    basePad.position.set(x, baseY + 0.13, z);
    this.templeGroup.add(basePad);
  }

  // â”€â”€â”€ DETAILED DIYA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private addDiya(x: number, y: number, z: number): void {
    const diyaGroup = new Group();

    // Ornate pedestal
    const pedBase = new Mesh(new CylinderGeometry(0.18, 0.22, 0.08, 8), this.phys('#8b6914', { roughness: 0.3, metalness: 0.7, clearcoat: 0.4 }));
    pedBase.position.set(0, 0, 0);
    diyaGroup.add(pedBase);

    const pedShaft = new Mesh(new CylinderGeometry(0.06, 0.1, 0.4, 8), this.phys('#a07818', { roughness: 0.35, metalness: 0.6 }));
    pedShaft.position.set(0, 0.24, 0);
    diyaGroup.add(pedShaft);

    // Mid ring
    const midRing = new Mesh(new TorusGeometry(0.08, 0.015, 6, 12), this.phys('#d4a017', { roughness: 0.2, metalness: 0.8 }));
    midRing.rotation.x = Math.PI / 2;
    midRing.position.set(0, 0.3, 0);
    diyaGroup.add(midRing);

    // Bowl (lathe-turned)
    const bowl = new Mesh(
      new LatheGeometry([
        new Vector2(0, 0),       new Vector2(0.14, 0.015),
        new Vector2(0.18, 0.05), new Vector2(0.16, 0.09),
        new Vector2(0.1, 0.11),
      ], 16),
      this.phys('#d4a017', { roughness: 0.2, metalness: 0.8, clearcoat: 0.5 })
    );
    bowl.position.set(0, 0.44, 0);
    diyaGroup.add(bowl);

    diyaGroup.position.set(x, y - 0.1, z);
    diyaGroup.castShadow = true;
    this.templeGroup.add(diyaGroup);

    // Warm point light
    const light = new PointLight('#ff8800', 3, 6, 1.5);
    light.position.set(x, y + 0.5, z);
    this.scene.add(light);
    this.diyas.push(light);

    // Flame emissive sphere (multi-layer for glow)
    const flameCore = new Mesh(
      new SphereGeometry(0.035, 8, 8),
      this.mat('#ffffff', { emissive: '#ffaa00', emissiveIntensity: 5, roughness: 0.0 })
    );
    flameCore.position.set(x, y + 0.45, z);
    this.templeGroup.add(flameCore);
    this.flames.push(flameCore);

    // Outer flame glow
    const flameOuter = new Mesh(
      new SphereGeometry(0.08, 8, 8),
      new MeshBasicMaterial({ color: '#ff6600', transparent: true, opacity: 0.2 })
    );
    flameOuter.position.set(x, y + 0.45, z);
    this.templeGroup.add(flameOuter);
    this.flames.push(flameOuter);
  }

  // â”€â”€â”€ DEEPJYOTI LAMP PEDESTAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private addDeepjyoti(x: number, y: number, z: number): void {
    const djGroup = new Group();
    const goldMat   = this.mat('#d4a017', { roughness: 0.3, metalness: 0.6 });
    const goldBright= this.mat('#f5c242', { roughness: 0.25, metalness: 0.7 });
    const redMat    = this.mat('#c62828', { roughness: 0.5, metalness: 0.1 });
    const whiteMat  = this.mat('#f8f9fa', { roughness: 0.6, metalness: 0.05 });

    // Square base slab
    const base1 = new Mesh(new BoxGeometry(0.38, 0.06, 0.38), redMat);
    base1.position.set(0, 0.03, 0);
    djGroup.add(base1);

    const base2 = new Mesh(new BoxGeometry(0.3, 0.06, 0.3), goldMat);
    base2.position.set(0, 0.09, 0);
    djGroup.add(base2);

    // Tall decorative pillar shaft
    const shaft = new Mesh(new CylinderGeometry(0.055, 0.075, 1.2, 8), whiteMat);
    shaft.position.set(0, 0.72, 0);
    djGroup.add(shaft);

    // Mid bulge decorative ring
    const midBulge = new Mesh(new CylinderGeometry(0.1, 0.08, 0.12, 8), goldMat);
    midBulge.position.set(0, 0.4, 0);
    djGroup.add(midBulge);

    const midRing = new Mesh(new TorusGeometry(0.09, 0.018, 6, 16), goldBright);
    midRing.rotation.x = Math.PI / 2;
    midRing.position.set(0, 0.5, 0);
    djGroup.add(midRing);

    // Upper capital (flared top piece)
    const capital = new Mesh(new CylinderGeometry(0.14, 0.06, 0.14, 8), goldMat);
    capital.position.set(0, 1.37, 0);
    djGroup.add(capital);

    const capitalRim = new Mesh(new TorusGeometry(0.13, 0.02, 6, 16), goldBright);
    capitalRim.rotation.x = Math.PI / 2;
    capitalRim.position.set(0, 1.44, 0);
    djGroup.add(capitalRim);

    // Lamp bowl (Deepam bowl on top of pedestal)
    const bowl = new Mesh(
      new LatheGeometry([
        new Vector2(0, 0),        new Vector2(0.09, 0.01),
        new Vector2(0.15, 0.04),  new Vector2(0.18, 0.08),
        new Vector2(0.16, 0.13),  new Vector2(0.1,  0.16),
        new Vector2(0.04, 0.18),
      ], 16),
      this.phys('#d4a017', { roughness: 0.2, metalness: 0.8, clearcoat: 0.5 })
    );
    bowl.position.set(0, 1.44, 0);
    djGroup.add(bowl);

    // Oil (inner fill)
    const oil = new Mesh(new CircleGeometry(0.09, 12), this.mat('#1a0800', { roughness: 0.1 }));
    oil.rotation.x = -Math.PI / 2;
    oil.position.set(0, 1.63, 0);
    djGroup.add(oil);

    // Decorative side lamps on capital (mini petals)
    [0, 1, 2, 3].forEach(i => {
      const angle = (i / 4) * Math.PI * 2;
      const petal = new Mesh(new SphereGeometry(0.03, 6, 6),
        this.mat('#ffd700', { roughness: 0.2, metalness: 0.5, emissive: '#ff8800', emissiveIntensity: 0.6 }));
      petal.position.set(Math.cos(angle) * 0.16, 1.46, Math.sin(angle) * 0.16);
      djGroup.add(petal);
    });

    djGroup.position.set(x, y, z);
    djGroup.castShadow = true;
    this.templeGroup.add(djGroup);

    // Glowing flame on top
    const flameCore = new Mesh(
      new SphereGeometry(0.04, 8, 8),
      this.mat('#ffffff', { emissive: '#ffaa00', emissiveIntensity: 6, roughness: 0.0 })
    );
    flameCore.position.set(x, y + 1.72, z);
    this.templeGroup.add(flameCore);
    this.flames.push(flameCore);

    const flameOuter = new Mesh(
      new SphereGeometry(0.1, 8, 8),
      new MeshBasicMaterial({ color: '#ff6600', transparent: true, opacity: 0.25 })
    );
    flameOuter.position.set(x, y + 1.72, z);
    this.templeGroup.add(flameOuter);
    this.flames.push(flameOuter);

    // Warm glow light from the lamp top
    const djLight = new PointLight('#ff8800', 4.0, 6.0, 1.5);
    djLight.position.set(x, y + 1.72, z);
    this.scene.add(djLight);
    this.diyas.push(djLight);
  }

  // â”€â”€â”€ DYNAMIC CANVAS TEXTURE FOR JHANDA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private createFlagTexture(): any {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. Saffron orange background
      ctx.fillStyle = '#ff5500';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Yellow/Gold border frame
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

      // 3. Thin red inner border
      ctx.strokeStyle = '#d32f2f';
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

      // 4. Accent corner squares
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(22, 22, 14, 14);
      ctx.fillRect(canvas.width - 36, 22, 14, 14);
      ctx.fillRect(22, canvas.height - 36, 14, 14);
      ctx.fillRect(canvas.width - 36, canvas.height - 36, 14, 14);

      // 5. Draw Devanagari text
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      ctx.fillStyle = '#ffffff';
      // Fallback list to ensure Devanagari fonts render correctly on all devices (Windows/Mac/Linux/Android)
      ctx.font = "bold 52px 'Noto Sans Devanagari', 'Martel', 'Poppins', 'Segoe UI', 'Arial Unicode MS', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('à¤œà¤¯ à¤¶à¥à¤°à¥€ à¤°à¤¾à¤®', canvas.width / 2, canvas.height / 2);
    }

    const texture = new (THREE as any).Texture(canvas);
    texture.needsUpdate = true;
    texture.colorSpace = 'srgb';
    return texture;
  }

  // â”€â”€â”€ DIVINE LORD HANUMAN STATUE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Iconic Veer Hanuman â€” modeled after classical temple murals & stone sculptures.
  // Vermilion sinduri form, heroic muscular build, Gada held aloft, S-curved
  // blazing tail, massive Prabhavali halo, ornate 5-tier Kirit-Mukut crown.
  private addHanumanStatue(
    baseTop: number, mH: number, mD: number,
    gold: any, orange: any, red: any
  ): void {
    const hanumanGroup = new Group();

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // DIVINE MATERIALS â€” Matching classical Indian temple idol palette
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Vermilion sinduri skin â€” signature of Hanuman idol tradition
    const skin     = this.mat('#cc3300', { roughness: 0.48, metalness: 0.0 });
    const skinMid  = this.mat('#b52a00', { roughness: 0.52, metalness: 0.0 });
    const skinShadow = this.mat('#8b1800', { roughness: 0.6, metalness: 0.0 });
    // Blazing gold for ornaments
    const gB = this.mat('#f7c948', { roughness: 0.18, metalness: 0.55,
                emissive: '#ffbb00', emissiveIntensity: 0.4 });
    const gD = this.mat('#c9920a', { roughness: 0.32, metalness: 0.45 });
    const gE = this.mat('#ffd700', { roughness: 0.12, metalness: 0.65,
                emissive: '#ffcc00', emissiveIntensity: 0.7 }); // emissive gold
    // Saffron dhoti
    const saffron  = this.mat('#ff8c00', { roughness: 0.6, metalness: 0.0 });
    const saffDark = this.mat('#e07000', { roughness: 0.65, metalness: 0.0 });
    const dhotiGold = this.mat('#daa520', { roughness: 0.35, metalness: 0.35 });
    // Divine halo
    const haloGlow = this.mat('#fff176', { roughness: 0.08, metalness: 0.4,
                     emissive: '#ffee00', emissiveIntensity: 0.9 });
    const haloRing = this.mat('#f5c242', { roughness: 0.2, metalness: 0.55,
                     emissive: '#ffaa00', emissiveIntensity: 0.5 });
    // Eye materials
    const eyeW  = this.mat('#fdf5e4', { roughness: 0.15, metalness: 0.0 });
    const eyeI  = this.mat('#1a0a00', { roughness: 0.4 });
    const eyeR  = this.mat('#8b0000', { roughness: 0.3, emissive: '#440000', emissiveIntensity: 0.4 });
    // Tail fire
    const tailSkin = this.mat('#c03000', { roughness: 0.5 });
    const flameOr  = this.mat('#ff6600', { roughness: 0.2, emissive: '#ff4400', emissiveIntensity: 1.0 });
    const flameY   = this.mat('#ffdd00', { roughness: 0.1, emissive: '#ffcc00', emissiveIntensity: 1.2 });
    // Sacred red for pedestal
    const scarletRed = this.mat('#b71c1c', { roughness: 0.5, metalness: 0.1 });
    const royalBlue  = this.mat('#1a237e', { roughness: 0.5, metalness: 0.1 });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  1. MAJESTIC 5-TIER LOTUS PEDESTAL
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const pedTiers = [
      { w: 1.3, d: 0.85, h: 0.14, mat: scarletRed },
      { w: 1.14, d: 0.74, h: 0.05, mat: gB },
      { w: 1.0, d: 0.65, h: 0.12, mat: royalBlue },
      { w: 0.86, d: 0.56, h: 0.05, mat: gB },
      { w: 0.72, d: 0.48, h: 0.11, mat: scarletRed },
    ];
    let pedY = 0;
    pedTiers.forEach(pt => {
      const tier = new Mesh(new BoxGeometry(pt.w, pt.h, pt.d), pt.mat);
      tier.position.set(0, pedY + pt.h / 2, 0);
      tier.castShadow = true;
      hanumanGroup.add(tier);
      pedY += pt.h;
    });
    // Top gold cap
    const pedCap = new Mesh(new BoxGeometry(0.74, 0.04, 0.50), gE);
    pedCap.position.set(0, pedY + 0.02, 0);
    hanumanGroup.add(pedCap);
    pedY += 0.04;
    // Lotus petals â€” 2 rows (outer & inner)
    [{ r: 0.46, n: 12, s: [1, 0.35, 0.85] }, { r: 0.32, n: 10, s: [0.85, 0.38, 0.7] }].forEach(row => {
      for (let i = 0; i < row.n; i++) {
        const a = (i / row.n) * Math.PI * 2;
        const petal = new Mesh(new SphereGeometry(0.07, 7, 7), gB);
        petal.position.set(Math.cos(a) * row.r, pedY + 0.02, Math.sin(a) * row.r * 0.6);
        petal.scale.set(...(row.s as [number, number, number]));
        hanumanGroup.add(petal);
      }
    });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  2. FEET â€” Broad, Grounded, Rooted (Veer Hanuman warrior stance)
    //     Right foot slightly forward (heroic step)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const feetY = pedY + 0.02;
    // Left foot (back foot â€” planted firmly)
    const footL = new Mesh(new BoxGeometry(0.125, 0.1, 0.24), skin);
    footL.position.set(-0.145, feetY + 0.05, -0.02);
    hanumanGroup.add(footL);
    // Toe detail left
    for (let t = 0; t < 4; t++) {
      const toe = new Mesh(new SphereGeometry(0.022, 6, 6), skinShadow);
      toe.position.set(-0.175 + t * 0.028, feetY + 0.04, 0.1);
      hanumanGroup.add(toe);
    }
    // Right foot (front foot â€” stepped slightly forward)
    const footR = new Mesh(new BoxGeometry(0.125, 0.1, 0.24), skin);
    footR.position.set(0.145, feetY + 0.05, 0.06);
    hanumanGroup.add(footR);
    for (let t = 0; t < 4; t++) {
      const toe = new Mesh(new SphereGeometry(0.022, 6, 6), skinShadow);
      toe.position.set(0.115 + t * 0.028, feetY + 0.04, 0.22);
      hanumanGroup.add(toe);
    }
    // Anklets â€” double band
    [[-0.145, -0.02], [0.145, 0.06]].forEach(([fx, fz]) => {
      [0, 0.035].forEach(dy => {
        const anklet = new Mesh(new TorusGeometry(0.072, 0.013, 7, 18), gE);
        anklet.rotation.x = Math.PI / 2;
        anklet.position.set(fx, feetY + 0.08 + dy, fz);
        hanumanGroup.add(anklet);
        // Gem studs on anklet
        for (let s = 0; s < 6; s++) {
          const sa = (s / 6) * Math.PI * 2;
          const st = new Mesh(new SphereGeometry(0.012, 5, 5),
            this.mat('#ff1111', { roughness: 0.1, emissive: '#cc0000', emissiveIntensity: 0.6 }));
          st.position.set(fx + Math.cos(sa) * 0.072, feetY + 0.08 + dy, fz + Math.sin(sa) * 0.072);
          hanumanGroup.add(st);
        }
      });
    });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  3. POWERFUL LEGS â€” Muscular calves, knees, thick thighs
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const calfH = 0.46;
    const calfY = feetY + 0.1 + calfH / 2;
    // Left calf
    const calfL = new Mesh(new CylinderGeometry(0.075, 0.09, calfH, 10), skin);
    calfL.position.set(-0.145, calfY, -0.02);
    calfL.castShadow = true;
    hanumanGroup.add(calfL);
    // Right calf (slightly forward)
    const calfR = new Mesh(new CylinderGeometry(0.075, 0.09, calfH, 10), skin);
    calfR.position.set(0.145, calfY, 0.06);
    calfR.rotation.x = -0.08; // slight forward lean
    calfR.castShadow = true;
    hanumanGroup.add(calfR);
    // Calf muscle bulge
    [-0.145, 0.145].forEach((cx, ci) => {
      const cz = ci === 0 ? -0.02 : 0.06;
      const bulge = new Mesh(new SphereGeometry(0.07, 8, 8), skinMid);
      bulge.position.set(cx, feetY + 0.1 + calfH * 0.6, cz - 0.04);
      bulge.scale.set(0.9, 0.65, 0.7);
      hanumanGroup.add(bulge);
    });
    // Knee joints
    const kneeY = feetY + 0.1 + calfH;
    [-0.145, 0.145].forEach((kx, ki) => {
      const kz = ki === 0 ? -0.02 : 0.06;
      const kneeCap = new Mesh(new SphereGeometry(0.088, 9, 9), skinShadow);
      kneeCap.position.set(kx, kneeY, kz + 0.02);
      hanumanGroup.add(kneeCap);
      // Knee accent ridge
      const kRidge = new Mesh(new BoxGeometry(0.08, 0.018, 0.03), skinMid);
      kRidge.position.set(kx, kneeY + 0.06, kz + 0.08);
      hanumanGroup.add(kRidge);
    });
    // Thick thighs
    const thighH = 0.42;
    const thighY = kneeY + thighH / 2;
    [-0.145, 0.145].forEach((tx, ti) => {
      const tz = ti === 0 ? -0.02 : 0.06;
      const thigh = new Mesh(new CylinderGeometry(0.1, 0.088, thighH, 10), skin);
      thigh.position.set(tx, thighY, tz);
      thigh.rotation.x = ti === 0 ? 0.04 : -0.06;
      thigh.castShadow = true;
      hanumanGroup.add(thigh);
      // Thigh muscle outer bulge
      const tBulge = new Mesh(new SphereGeometry(0.088, 8, 8), skinMid);
      tBulge.position.set(tx + (ti === 0 ? -0.03 : 0.03), thighY + 0.06, tz + 0.02);
      tBulge.scale.set(0.7, 0.8, 0.75);
      hanumanGroup.add(tBulge);
    });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  4. SAFFRON DHOTI â€” Pleated, knotted, with gold border
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const dHipY = kneeY + thighH;
    // Main dhoti cloth panel
    const dhotiMain = new Mesh(new BoxGeometry(0.42, 0.5, 0.22), saffron);
    dhotiMain.position.set(0, dHipY + 0.25, 0.02);
    dhotiMain.castShadow = true;
    hanumanGroup.add(dhotiMain);
    // Side panels â€” wider drape
    [-0.17, 0.17].forEach(dx => {
      const panel = new Mesh(new BoxGeometry(0.12, 0.46, 0.16), saffDark);
      panel.position.set(dx, dHipY + 0.23, 0.0);
      panel.rotation.z = dx > 0 ? -0.12 : 0.12;
      hanumanGroup.add(panel);
    });
    // Center draped knot (U-fold)
    const knot = new Mesh(new CylinderGeometry(0.045, 0.065, 0.25, 8), saffDark);
    knot.position.set(0, dHipY + 0.08, 0.14);
    knot.rotation.x = 0.4;
    hanumanGroup.add(knot);
    // Pleated vertical folds
    for (let p = -2; p <= 2; p++) {
      const fold = new Mesh(new BoxGeometry(0.02, 0.44, 0.04), p % 2 === 0 ? saffron : saffDark);
      fold.position.set(p * 0.07, dHipY + 0.24, 0.12);
      hanumanGroup.add(fold);
    }
    // Gold bottom border
    const dhotiBot = new Mesh(new BoxGeometry(0.44, 0.045, 0.24), dhotiGold);
    dhotiBot.position.set(0, dHipY + 0.022, 0.02);
    hanumanGroup.add(dhotiBot);
    // Gold top border
    const dhotiTopB = new Mesh(new BoxGeometry(0.44, 0.045, 0.24), dhotiGold);
    dhotiTopB.position.set(0, dHipY + 0.476, 0.02);
    hanumanGroup.add(dhotiTopB);
    // Decorative corner medallions
    [[-0.2, dHipY + 0.02], [0.2, dHipY + 0.02]].forEach(([mdx, mdy]) => {
      const medal = new Mesh(new CylinderGeometry(0.025, 0.025, 0.025, 8), gE);
      medal.position.set(mdx, mdy, 0.12);
      medal.rotation.x = Math.PI / 2;
      hanumanGroup.add(medal);
    });
    // Waist belt (Pattika)
    const waist = new Mesh(new CylinderGeometry(0.205, 0.195, 0.07, 14), gD);
    waist.position.set(0, dHipY + 0.5, 0);
    hanumanGroup.add(waist);
    const waistRimT = new Mesh(new TorusGeometry(0.205, 0.018, 7, 22), gE);
    waistRimT.rotation.x = Math.PI / 2;
    waistRimT.position.set(0, dHipY + 0.535, 0);
    hanumanGroup.add(waistRimT);
    const waistRimB = new Mesh(new TorusGeometry(0.205, 0.018, 7, 22), gE);
    waistRimB.rotation.x = Math.PI / 2;
    waistRimB.position.set(0, dHipY + 0.465, 0);
    hanumanGroup.add(waistRimB);
    // Belt gem studs
    for (let bs = 0; bs < 8; bs++) {
      const ba = (bs / 8) * Math.PI * 2;
      const bst = new Mesh(new SphereGeometry(0.018, 6, 6), bs % 2 === 0 ? gE :
        this.mat('#e53935', { roughness: 0.1, emissive: '#ff0000', emissiveIntensity: 0.5 }));
      bst.position.set(Math.cos(ba) * 0.21, dHipY + 0.5, Math.sin(ba) * 0.21);
      hanumanGroup.add(bst);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  5. MASSIVELY MUSCULAR TORSO â€” Heroic divine build
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const torsoBase = dHipY + 0.57;
    // Lower abdomen (defined abs)
    const abs = new Mesh(new CylinderGeometry(0.175, 0.2, 0.28, 12), skin);
    abs.position.set(0, torsoBase + 0.14, 0);
    abs.castShadow = true;
    hanumanGroup.add(abs);
    // Abs definition blocks
    [[-0.06, 0.05], [0.06, 0.05], [-0.06, -0.04], [0.06, -0.04]].forEach(([ax, ay]) => {
      const ab = new Mesh(new SphereGeometry(0.055, 8, 8), skinMid);
      ab.position.set(ax, torsoBase + 0.14 + ay, 0.15);
      ab.scale.set(0.9, 0.7, 0.6);
      hanumanGroup.add(ab);
    });
    // Broad chest â€” Heroic barrel chest
    const chest = new Mesh(new CylinderGeometry(0.23, 0.175, 0.36, 12), skin);
    chest.position.set(0, torsoBase + 0.46, 0);
    chest.castShadow = true;
    hanumanGroup.add(chest);
    // Massive pectoral muscles
    [-0.13, 0.13].forEach(px => {
      const pec = new Mesh(new SphereGeometry(0.13, 10, 10), skinMid);
      pec.position.set(px, torsoBase + 0.52, 0.15);
      pec.scale.set(1.05, 0.68, 0.72);
      hanumanGroup.add(pec);
      // Pec shadow groove (center line)
      const pcLine = new Mesh(new BoxGeometry(0.015, 0.28, 0.02), skinShadow);
      pcLine.position.set(0, torsoBase + 0.5, 0.18);
      hanumanGroup.add(pcLine);
    });
    // Clavicle definition
    [-0.12, 0.12].forEach(cx => {
      const clav = new Mesh(new CylinderGeometry(0.015, 0.015, 0.2, 6), skinShadow);
      clav.position.set(cx * 0.9, torsoBase + 0.68, 0.14);
      clav.rotation.z = cx > 0 ? Math.PI / 5 : -Math.PI / 5;
      hanumanGroup.add(clav);
    });
    // Shoulder boulders
    [-0.28, 0.28].forEach(sx => {
      const shoulder = new Mesh(new SphereGeometry(0.12, 10, 10), skin);
      shoulder.position.set(sx, torsoBase + 0.65, 0.02);
      hanumanGroup.add(shoulder);
      // Deltoid definition
      const delt = new Mesh(new SphereGeometry(0.085, 8, 8), skinMid);
      delt.position.set(sx + (sx > 0 ? 0.04 : -0.04), torsoBase + 0.62, 0.06);
      delt.scale.set(0.7, 0.65, 0.75);
      hanumanGroup.add(delt);
    });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  6. DIVINE ARMOR & SACRED ORNAMENTS
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Yagnopavit â€” Sacred thread (diagonal across chest)
    const janeu = new Mesh(new TorusGeometry(0.22, 0.009, 6, 28), gE);
    janeu.position.set(-0.04, torsoBase + 0.48, 0.17);
    janeu.rotation.z = Math.PI / 4;
    janeu.rotation.x = Math.PI / 8;
    hanumanGroup.add(janeu);
    // Triple-layered Kavach (divine breastplate)
    const kavachBase = new Mesh(new BoxGeometry(0.24, 0.3, 0.07), gD);
    kavachBase.position.set(0, torsoBase + 0.5, 0.18);
    hanumanGroup.add(kavachBase);
    const kavachMid = new Mesh(new BoxGeometry(0.26, 0.32, 0.04), gB);
    kavachMid.position.set(0, torsoBase + 0.5, 0.22);
    hanumanGroup.add(kavachMid);
    // Kavach decorative arch top
    const kavachArch = new Mesh(new TorusGeometry(0.13, 0.018, 6, 16, Math.PI), gE);
    kavachArch.position.set(0, torsoBase + 0.67, 0.22);
    hanumanGroup.add(kavachArch);
    // RAM NAAM on heart â€” Ram Hriday glowing disc
    const ramDisc = new Mesh(new CircleGeometry(0.055, 12),
      this.mat('#ffd700', { roughness: 0.1, emissive: '#ff8800', emissiveIntensity: 1.5 }));
    ramDisc.position.set(0, torsoBase + 0.5, 0.26);
    hanumanGroup.add(ramDisc);
    const ramRing = new Mesh(new TorusGeometry(0.055, 0.01, 6, 16), gE);
    ramRing.position.set(0, torsoBase + 0.5, 0.255);
    hanumanGroup.add(ramRing);
    // Ram glow aura
    const ramAura = new Mesh(new CircleGeometry(0.09, 12),
      new MeshBasicMaterial({ color: '#ffcc44', transparent: true, opacity: 0.3 }));
    ramAura.position.set(0, torsoBase + 0.5, 0.254);
    hanumanGroup.add(ramAura);
    // Triple Haar necklace
    [0.16, 0.21, 0.26].forEach((hr, hi) => {
      const haar = new Mesh(new TorusGeometry(hr, 0.009, 6, 22), hi === 1 ? gE : gB);
      haar.position.set(0, torsoBase + 0.7 - hi * 0.04, 0.12);
      haar.rotation.x = Math.PI / 6;
      hanumanGroup.add(haar);
    });
    // Central chest pendant
    const pendant = new Mesh(new SphereGeometry(0.028, 8, 8),
      this.mat('#e53935', { roughness: 0.08, emissive: '#ff0000', emissiveIntensity: 0.8 }));
    pendant.position.set(0, torsoBase + 0.6, 0.2);
    hanumanGroup.add(pendant);
    // Armlets â€” double Keyur
    [-0.28, 0.28].forEach(ax => {
      [0, 0.035].forEach(dy => {
        const armlet = new Mesh(new TorusGeometry(0.08, 0.015, 7, 18), gE);
        armlet.rotation.x = Math.PI / 2;
        armlet.position.set(ax, torsoBase + 0.63 + dy, 0.02);
        hanumanGroup.add(armlet);
      });
    });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  7. RIGHT ARM â€” Raised high, gripping Gada aloft
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const rShY = torsoBase + 0.65;
    // Upper arm (strong bicep)
    const rUArm = new Mesh(new CylinderGeometry(0.082, 0.092, 0.34, 10), skin);
    rUArm.position.set(0.3, rShY + 0.04, 0.06);
    rUArm.rotation.z = -Math.PI / 4.5;
    rUArm.rotation.x = -0.1;
    rUArm.castShadow = true;
    hanumanGroup.add(rUArm);
    // Bicep peak
    const rBicep = new Mesh(new SphereGeometry(0.076, 8, 8), skinMid);
    rBicep.position.set(0.31, rShY + 0.12, 0.1);
    rBicep.scale.set(0.7, 0.65, 0.8);
    hanumanGroup.add(rBicep);
    // Elbow
    const rElbow = new Mesh(new SphereGeometry(0.07, 8, 8), skinShadow);
    rElbow.position.set(0.36, rShY + 0.25, 0.1);
    hanumanGroup.add(rElbow);
    // Forearm (angled high â€” holding gada overhead)
    const rFArm = new Mesh(new CylinderGeometry(0.065, 0.075, 0.38, 10), skin);
    rFArm.position.set(0.4, rShY + 0.44, 0.12);
    rFArm.rotation.z = -Math.PI / 7;
    rFArm.rotation.x = -0.12;
    rFArm.castShadow = true;
    hanumanGroup.add(rFArm);
    // Wristlet pair
    const rWristY = rShY + 0.62; const rWristX = 0.44;
    [0, 0.032].forEach(dy => {
      const wl = new Mesh(new TorusGeometry(0.062, 0.014, 6, 16), gE);
      wl.rotation.x = Math.PI / 2;
      wl.position.set(rWristX, rWristY + dy, 0.14);
      hanumanGroup.add(wl);
    });
    // Closed fist (gripping gada)
    const rFist = new Mesh(new SphereGeometry(0.065, 9, 9), skinShadow);
    rFist.position.set(rWristX, rWristY + 0.09, 0.14);
    hanumanGroup.add(rFist);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  8. ICONIC GADA â€” 16-spike divine mace, raised overhead
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const gadaRoot = new Group();
    // Long ornate shaft
    const gShaft = new Mesh(new CylinderGeometry(0.022, 0.028, 1.2, 10), gD);
    gShaft.position.set(0, 0.6, 0);
    gadaRoot.add(gShaft);
    // Shaft grip wrapping (alternating gold/red rings)
    for (let gr = 0; gr < 5; gr++) {
      const gRing = new Mesh(new TorusGeometry(0.032, 0.011, 6, 14),
        gr % 2 === 0 ? gE : this.mat('#8b0000', { roughness: 0.4 }));
      gRing.rotation.x = Math.PI / 2;
      gRing.position.set(0, 0.12 + gr * 0.12, 0);
      gadaRoot.add(gRing);
    }
    // Decorative mid-section (Damaru element)
    const damTop = new Mesh(new ConeGeometry(0.065, 0.08, 10), gB);
    damTop.rotation.x = Math.PI;
    damTop.position.set(0, 0.74, 0);
    gadaRoot.add(damTop);
    const damBot = new Mesh(new ConeGeometry(0.065, 0.08, 10), gB);
    damBot.position.set(0, 0.66, 0);
    gadaRoot.add(damBot);
    const damRing = new Mesh(new TorusGeometry(0.03, 0.01, 6, 14), gE);
    damRing.rotation.x = Math.PI / 2;
    damRing.position.set(0, 0.70, 0);
    gadaRoot.add(damRing);
    // Upper collar
    for (let ur = 0; ur < 2; ur++) {
      const uRing = new Mesh(new TorusGeometry(0.03, 0.01, 6, 14), gE);
      uRing.rotation.x = Math.PI / 2;
      uRing.position.set(0, 0.88 + ur * 0.1, 0);
      gadaRoot.add(uRing);
    }
    // Massive spiked club head
    const gHead = new Mesh(new SphereGeometry(0.2, 16, 16), gB);
    gHead.position.set(0, 1.22, 0);
    gadaRoot.add(gHead);
    // 16 spikes arranged in 2 rows around the head
    for (let row = 0; row < 2; row++) {
      const rowAngle = (row === 0) ? 0.6 : -0.6;
      const spikes = row === 0 ? 10 : 6;
      for (let s = 0; s < spikes; s++) {
        const sa = (s / spikes) * Math.PI * 2;
        const spike = new Mesh(new ConeGeometry(0.025, 0.15, 7), gD);
        spike.position.set(
          Math.cos(sa) * 0.19,
          1.22 + Math.sin(rowAngle) * 0.07,
          Math.sin(sa) * 0.19
        );
        // Orient spike outward from center
        spike.lookAt(
          Math.cos(sa) * 2, 1.22 + Math.sin(rowAngle) * 0.5, Math.sin(sa) * 2
        );
        gadaRoot.add(spike);
      }
    }
    // Top apex spike
    const apexSpike = new Mesh(new ConeGeometry(0.03, 0.22, 8), gE);
    apexSpike.position.set(0, 1.44, 0);
    gadaRoot.add(apexSpike);
    // Divine glow aura on head
    const gadaGlw = new Mesh(new SphereGeometry(0.28, 12, 12),
      new MeshBasicMaterial({ color: '#ffdd44', transparent: true, opacity: 0.1 }));
    gadaGlw.position.set(0, 1.22, 0);
    gadaRoot.add(gadaGlw);

    // Position Gada â€” tilted upright in right fist
    gadaRoot.position.set(rWristX, rWristY + 0.09, 0.14);
    gadaRoot.rotation.z = -0.18;
    gadaRoot.rotation.x = 0.08;
    hanumanGroup.add(gadaRoot);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  9. LEFT ARM â€” Abhaya Mudra (raised blessing palm, open hand)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const lShY = torsoBase + 0.65;
    // Upper arm
    const lUArm = new Mesh(new CylinderGeometry(0.082, 0.092, 0.34, 10), skin);
    lUArm.position.set(-0.3, lShY + 0.04, 0.06);
    lUArm.rotation.z = Math.PI / 4.5;
    lUArm.rotation.x = -0.15;
    lUArm.castShadow = true;
    hanumanGroup.add(lUArm);
    // Bicep
    const lBicep = new Mesh(new SphereGeometry(0.076, 8, 8), skinMid);
    lBicep.position.set(-0.31, lShY + 0.12, 0.1);
    lBicep.scale.set(0.7, 0.65, 0.8);
    hanumanGroup.add(lBicep);
    // Elbow
    const lElbow = new Mesh(new SphereGeometry(0.07, 8, 8), skinShadow);
    lElbow.position.set(-0.36, lShY + 0.25, 0.12);
    hanumanGroup.add(lElbow);
    // Forearm â€” raised for Abhaya Mudra
    const lFArm = new Mesh(new CylinderGeometry(0.065, 0.075, 0.38, 10), skin);
    lFArm.position.set(-0.4, lShY + 0.45, 0.15);
    lFArm.rotation.z = Math.PI / 6;
    lFArm.rotation.x = -Math.PI / 7;
    lFArm.castShadow = true;
    hanumanGroup.add(lFArm);
    // Wristlets
    const lWristY = lShY + 0.65; const lWristX = -0.42;
    [0, 0.032].forEach(dy => {
      const wl = new Mesh(new TorusGeometry(0.062, 0.014, 6, 16), gE);
      wl.rotation.x = Math.PI / 2;
      wl.position.set(lWristX, lWristY + dy, 0.2);
      hanumanGroup.add(wl);
    });
    // Open palm (Abhaya Mudra â€” "fear not" blessing)
    const lPalm = new Mesh(new BoxGeometry(0.11, 0.15, 0.04), skin);
    lPalm.position.set(lWristX, lWristY + 0.12, 0.24);
    lPalm.rotation.x = -Math.PI / 8;
    hanumanGroup.add(lPalm);
    // Detailed fingers
    for (let f = 0; f < 4; f++) {
      const fLen = 0.075 - f * 0.006;
      const finger = new Mesh(new CylinderGeometry(0.014, 0.014, fLen, 5), skinShadow);
      finger.position.set(lWristX - 0.04 + f * 0.026, lWristY + 0.21 + f * 0.004, 0.24);
      finger.rotation.x = -0.2;
      hanumanGroup.add(finger);
      // Fingertip
      const tip = new Mesh(new SphereGeometry(0.016, 5, 5), skinShadow);
      tip.position.set(lWristX - 0.04 + f * 0.026, lWristY + 0.26 + f * 0.004, 0.248);
      hanumanGroup.add(tip);
    }
    // Thumb
    const thumb = new Mesh(new CylinderGeometry(0.016, 0.016, 0.062, 5), skinShadow);
    thumb.position.set(lWristX + 0.08, lWristY + 0.14, 0.26);
    thumb.rotation.z = Math.PI / 3;
    hanumanGroup.add(thumb);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  10. THICK NECK â€” Powerful divine neck
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const neckBase = torsoBase + 0.82;
    const neck = new Mesh(new CylinderGeometry(0.1, 0.13, 0.2, 12), skin);
    neck.position.set(0, neckBase + 0.1, 0.02);
    neck.castShadow = true;
    hanumanGroup.add(neck);
    // Neck ornament â€” Kanthi mala
    const kanthi = new Mesh(new TorusGeometry(0.12, 0.015, 7, 22), gE);
    kanthi.position.set(0, neckBase + 0.15, 0.04);
    kanthi.rotation.x = Math.PI / 8;
    hanumanGroup.add(kanthi);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  11. DIVINE MONKEY FACE â€” Expressive, powerful, wise
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const headCY = neckBase + 0.2 + 0.17;
    // Main skull (slightly elongated for monkey profile)
    const skull = new Mesh(new SphereGeometry(0.185, 14, 14), skin);
    skull.position.set(0, headCY, 0.02);
    skull.scale.set(1.0, 1.08, 0.95);
    skull.castShadow = true;
    hanumanGroup.add(skull);
    // Cranium top dome (more pronounced)
    const cranium = new Mesh(new SphereGeometry(0.155, 12, 12), skin);
    cranium.position.set(0, headCY + 0.1, 0.0);
    cranium.scale.set(0.95, 0.6, 0.85);
    hanumanGroup.add(cranium);
    // Pronounced supraorbital brow ridge
    const browRidge = new Mesh(new SphereGeometry(0.14, 10, 10), skinShadow);
    browRidge.position.set(0, headCY + 0.06, 0.14);
    browRidge.scale.set(1.2, 0.5, 0.7);
    hanumanGroup.add(browRidge);
    // Prognathic muzzle (full monkey snout â€” wider & more prominent)
    const muzzleBase = new Mesh(new SphereGeometry(0.115, 12, 12), skinMid);
    muzzleBase.position.set(0, headCY - 0.04, 0.18);
    muzzleBase.scale.set(1.3, 0.9, 1.2);
    hanumanGroup.add(muzzleBase);
    // Upper muzzle
    const muzzleU = new Mesh(new SphereGeometry(0.09, 10, 10), skin);
    muzzleU.position.set(0, headCY + 0.02, 0.22);
    muzzleU.scale.set(1.1, 0.7, 0.9);
    hanumanGroup.add(muzzleU);
    // Nose (flat broad monkey nose)
    const noseBridge = new Mesh(new BoxGeometry(0.065, 0.03, 0.04), skinShadow);
    noseBridge.position.set(0, headCY + 0.04, 0.27);
    hanumanGroup.add(noseBridge);
    const nostL = new Mesh(new SphereGeometry(0.022, 6, 6), skinShadow);
    nostL.position.set(-0.022, headCY + 0.025, 0.296);
    hanumanGroup.add(nostL);
    const nostR = new Mesh(new SphereGeometry(0.022, 6, 6), skinShadow);
    nostR.position.set(0.022, headCY + 0.025, 0.296);
    hanumanGroup.add(nostR);
    // Mouth â€” slight upward curve (divine smile)
    const mouth = new Mesh(new TorusGeometry(0.042, 0.009, 6, 14, Math.PI), skinShadow);
    mouth.position.set(0, headCY - 0.055, 0.27);
    mouth.rotation.z = Math.PI;
    hanumanGroup.add(mouth);
    // Chin
    const chin = new Mesh(new SphereGeometry(0.05, 8, 8), skinMid);
    chin.position.set(0, headCY - 0.13, 0.16);
    hanumanGroup.add(chin);
    // Eyes â€” large, expressive, divine
    [-0.08, 0.08].forEach((ex, ei) => {
      // Eye socket
      const socket = new Mesh(new SphereGeometry(0.042, 8, 8), skinShadow);
      socket.position.set(ex, headCY + 0.06, 0.165);
      socket.scale.set(1.0, 0.85, 0.7);
      hanumanGroup.add(socket);
      // Eyeball white
      const eyeWhiteMesh = new Mesh(new SphereGeometry(0.034, 8, 8), eyeW);
      eyeWhiteMesh.position.set(ex, headCY + 0.063, 0.182);
      hanumanGroup.add(eyeWhiteMesh);
      // Iris (red â€” classic Hanuman divine eye color)
      const iris = new Mesh(new SphereGeometry(0.022, 7, 7), eyeR);
      iris.position.set(ex, headCY + 0.063, 0.198);
      hanumanGroup.add(iris);
      // Pupil
      const pupil = new Mesh(new SphereGeometry(0.012, 6, 6), eyeI);
      pupil.position.set(ex, headCY + 0.063, 0.208);
      hanumanGroup.add(pupil);
      // Eye shine highlight
      const shine = new Mesh(new SphereGeometry(0.006, 4, 4),
        this.mat('#ffffff', { roughness: 0.0, metalness: 0.0 }));
      shine.position.set(ex + 0.01, headCY + 0.076, 0.213);
      hanumanGroup.add(shine);
      // Eyebrow â€” expressive arch
      const browMesh = new Mesh(new BoxGeometry(0.065, 0.016, 0.012), skinShadow);
      browMesh.position.set(ex, headCY + 0.1, 0.17);
      browMesh.rotation.z = ei === 0 ? 0.28 : -0.28;
      hanumanGroup.add(browMesh);
    });
    // Ears (primate style â€” rounded, large)
    [-0.178, 0.178].forEach((ex, ei) => {
      const ear = new Mesh(new SphereGeometry(0.055, 8, 8), skinMid);
      ear.position.set(ex, headCY + 0.03, 0.0);
      ear.scale.set(0.6, 0.95, 0.5);
      hanumanGroup.add(ear);
      // Inner ear
      const earIn = new Mesh(new SphereGeometry(0.03, 7, 7), skinShadow);
      earIn.position.set(ex, headCY + 0.03, 0.02 * (ei === 0 ? 1 : -1));
      earIn.scale.set(0.5, 0.75, 0.4);
      hanumanGroup.add(earIn);
      // Kundal earring
      const kundal = new Mesh(new TorusGeometry(0.034, 0.011, 6, 14), gE);
      kundal.position.set(ex, headCY - 0.02, 0.01);
      kundal.rotation.y = ex > 0 ? -Math.PI / 2.2 : Math.PI / 2.2;
      hanumanGroup.add(kundal);
      // Earring gem
      const kGem = new Mesh(new SphereGeometry(0.014, 5, 5),
        this.mat('#e91e63', { roughness: 0.08, emissive: '#ff006e', emissiveIntensity: 0.6 }));
      kGem.position.set(ex, headCY - 0.054, 0.01);
      hanumanGroup.add(kGem);
    });
    // Cheek tuft (primate facial fur)
    [-0.13, 0.13].forEach(cx => {
      const tuft = new Mesh(new SphereGeometry(0.04, 7, 7), skinMid);
      tuft.position.set(cx, headCY - 0.02, 0.17);
      tuft.scale.set(0.7, 0.55, 0.5);
      hanumanGroup.add(tuft);
    });

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  12. MAGNIFICENT 5-TIER KIRIT-MUKUT CROWN
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const crY = headCY + 0.17;
    // Crown base band (wide, gem-studded)
    const crBase = new Mesh(new CylinderGeometry(0.178, 0.194, 0.12, 16), gD);
    crBase.position.set(0, crY + 0.06, 0.02);
    hanumanGroup.add(crBase);
    const crRimB = new Mesh(new TorusGeometry(0.19, 0.02, 7, 24), gE);
    crRimB.rotation.x = Math.PI / 2;
    crRimB.position.set(0, crY + 0.0, 0.02);
    hanumanGroup.add(crRimB);
    const crRimT = new Mesh(new TorusGeometry(0.182, 0.018, 7, 24), gE);
    crRimT.rotation.x = Math.PI / 2;
    crRimT.position.set(0, crY + 0.12, 0.02);
    hanumanGroup.add(crRimT);
    // Crown gems â€” 12 alternating ruby/sapphire/emerald
    for (let g = 0; g < 12; g++) {
      const ga = (g / 12) * Math.PI * 2;
      const gemColors = ['#e53935', '#1565c0', '#2e7d32'];
      const gemEmissive = ['#ff0000', '#0044ff', '#00bb00'];
      const ci = g % 3;
      const cgem = new Mesh(new SphereGeometry(0.022, 7, 7),
        this.mat(gemColors[ci], { roughness: 0.08, emissive: gemEmissive[ci], emissiveIntensity: 0.7 }));
      cgem.position.set(Math.cos(ga) * 0.192, crY + 0.06, 0.02 + Math.sin(ga) * 0.192);
      hanumanGroup.add(cgem);
    }
    // 5-tier tapering crown tower
    const crTiers = [
      { rt: 0.122, rb: 0.162, h: 0.26, mat: gD, y: crY + 0.25 },
      { rt: 0.085, rb: 0.122, h: 0.2,  mat: gB, y: crY + 0.48 },
      { rt: 0.056, rb: 0.085, h: 0.16, mat: gD, y: crY + 0.66 },
      { rt: 0.033, rb: 0.056, h: 0.12, mat: gB, y: crY + 0.80 },
      { rt: 0.018, rb: 0.033, h: 0.08, mat: gD, y: crY + 0.90 },
    ];
    crTiers.forEach(ct => {
      const cyl = new Mesh(new CylinderGeometry(ct.rt, ct.rb, ct.h, 12), ct.mat);
      cyl.position.set(0, ct.y, 0.02);
      hanumanGroup.add(cyl);
      // Gold rim band between tiers
      const rim = new Mesh(new TorusGeometry(ct.rt, 0.013, 6, 18), gE);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, ct.y + ct.h / 2, 0.02);
      hanumanGroup.add(rim);
    });
    // Apex finial â€” rounded jewel
    const crFinial = new Mesh(new SphereGeometry(0.04, 10, 10), gE);
    crFinial.position.set(0, crY + 0.975, 0.02);
    hanumanGroup.add(crFinial);
    // Front face ornament on crown (large central jewel)
    const crCentral = new Mesh(new SphereGeometry(0.032, 8, 8),
      this.mat('#ffd700', { roughness: 0.05, emissive: '#ffaa00', emissiveIntensity: 1.0 }));
    crCentral.position.set(0, crY + 0.06, 0.222);
    hanumanGroup.add(crCentral);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  13. GIANT PRABHAVALI â€” Full-body divine aura (triple ring + 16 flame rays)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Center the prabhavali on chest height
    const prabhaCY = torsoBase + 0.55;
    const praR = 0.9; // large radius encompassing the full body
    // Outer ring (thickest, deepest gold)
    const praOuter = new Mesh(new TorusGeometry(praR, 0.038, 10, 52), gD);
    praOuter.position.set(0, prabhaCY, -0.15);
    hanumanGroup.add(praOuter);
    // Middle ring
    const praMid = new Mesh(new TorusGeometry(praR - 0.1, 0.022, 8, 48), gB);
    praMid.position.set(0, prabhaCY, -0.12);
    hanumanGroup.add(praMid);
    // Inner ring
    const praInner = new Mesh(new TorusGeometry(praR - 0.2, 0.016, 7, 44), gE);
    praInner.position.set(0, prabhaCY, -0.1);
    hanumanGroup.add(praInner);
    // Glowing inner background disc
    const praDisc = new Mesh(new CircleGeometry(praR - 0.22, 52), haloGlow);
    praDisc.position.set(0, prabhaCY, -0.11);
    hanumanGroup.add(praDisc);
    // 16 alternating flame-ray petals around the ring
    for (let r = 0; r < 16; r++) {
      const ra = (r / 16) * Math.PI * 2;
      const isLong = r % 2 === 0;
      const rLen = isLong ? 0.26 : 0.16;
      const ray = new Mesh(
        new ConeGeometry(isLong ? 0.038 : 0.026, rLen, 6),
        isLong ? flameOr : flameY
      );
      ray.position.set(
        Math.cos(ra) * (praR + 0.06),
        prabhaCY + Math.sin(ra) * (praR + 0.06),
        -0.13
      );
      ray.rotation.z = ra - Math.PI / 2;
      hanumanGroup.add(ray);
      // Gem at base of each long ray
      if (isLong) {
        const rayGem = new Mesh(new SphereGeometry(0.022, 6, 6),
          this.mat('#ff6600', { roughness: 0.1, emissive: '#ff4400', emissiveIntensity: 0.8 }));
        rayGem.position.set(Math.cos(ra) * (praR + 0.01),
          prabhaCY + Math.sin(ra) * (praR + 0.01), -0.12);
        hanumanGroup.add(rayGem);
      }
    }
    // Decorative gem studs on outer ring (8 evenly spaced)
    for (let gs = 0; gs < 8; gs++) {
      const gsa = (gs / 8) * Math.PI * 2;
      const prGem = new Mesh(new SphereGeometry(0.026, 7, 7),
        this.mat('#ffd700', { roughness: 0.05, emissive: '#ffaa00', emissiveIntensity: 0.8 }));
      prGem.position.set(Math.cos(gsa) * praR, prabhaCY + Math.sin(gsa) * praR, -0.14);
      hanumanGroup.add(prGem);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  14. MAJESTIC BLAZING TAIL â€” S-curve arch, fire at tip
    //      5-segment smooth arc rising high above the head
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // Tail root at lower back
    const tRootY = torsoBase + 0.18;
    const tRootMesh = new Mesh(new SphereGeometry(0.06, 8, 8), tailSkin);
    tRootMesh.position.set(0.06, tRootY, -0.18);
    hanumanGroup.add(tRootMesh);

    // Segment 1 â€” sweeps right and down from back
    const tSeg1 = new Mesh(new TorusGeometry(0.42, 0.046, 9, 22, 1.1), tailSkin);
    tSeg1.position.set(0.08, tRootY + 0.05, -0.24);
    tSeg1.rotation.y = 0.35;
    tSeg1.rotation.z = -0.8;
    hanumanGroup.add(tSeg1);
    // Seg 1 rings
    for (let rs = 0; rs < 3; rs++) {
      const r1 = new Mesh(new TorusGeometry(0.046 + rs * 0.002, 0.012, 6, 12), gE);
      r1.rotation.z = Math.PI / 2;
      r1.position.set(0.08 + rs * 0.12, tRootY + 0.12 - rs * 0.06, -0.24 - rs * 0.04);
      hanumanGroup.add(r1);
    }

    // Segment 2 â€” curves upward behind body
    const tSeg2 = new Mesh(new TorusGeometry(0.65, 0.04, 9, 26, 1.3), tailSkin);
    tSeg2.position.set(0.12, torsoBase + 0.3, -0.3);
    tSeg2.rotation.y = 0.4;
    tSeg2.rotation.z = -Math.PI / 3.5;
    hanumanGroup.add(tSeg2);

    // Segment 3 â€” rises above shoulders
    const tSeg3 = new Mesh(new TorusGeometry(0.5, 0.035, 8, 24, 1.2), tailSkin);
    tSeg3.position.set(0.08, torsoBase + 0.88, -0.22);
    tSeg3.rotation.y = 0.2;
    tSeg3.rotation.z = -Math.PI / 5;
    hanumanGroup.add(tSeg3);

    // Segment 4 â€” arches over the head
    const tSeg4 = new Mesh(new TorusGeometry(0.4, 0.03, 8, 22, 1.15), tailSkin);
    tSeg4.position.set(0.02, headCY + 0.42, -0.1);
    tSeg4.rotation.y = 0.1;
    tSeg4.rotation.z = -Math.PI / 6;
    hanumanGroup.add(tSeg4);

    // Segment 5 â€” tip curls forward above crown
    const tSeg5 = new Mesh(new TorusGeometry(0.22, 0.024, 7, 18, 1.0), tailSkin);
    tSeg5.position.set(-0.05, headCY + 0.82, 0.06);
    tSeg5.rotation.z = Math.PI / 4;
    hanumanGroup.add(tSeg5);

    // Decorative gold tail bands (6 bands along the arc)
    const tailBandPositions = [
      [0.22, tRootY + 0.28, -0.28],
      [0.18, torsoBase + 0.5, -0.28],
      [0.14, torsoBase + 0.75, -0.2],
      [0.08, headCY + 0.15, -0.12],
      [0.0,  headCY + 0.55, -0.04],
      [-0.06, headCY + 0.78, 0.08],
    ] as [number, number, number][];
    tailBandPositions.forEach(([tx, ty, tz], bi) => {
      const r = 0.046 - bi * 0.004;
      const tBand = new Mesh(new TorusGeometry(r, 0.012, 6, 14), gE);
      tBand.position.set(tx, ty, tz);
      hanumanGroup.add(tBand);
    });

    // Blazing tail TIP â€” Multi-layer fire effect
    const tipPos = { x: -0.1, y: headCY + 0.96, z: 0.12 };
    // Large fire sphere core
    const tFireCore = new Mesh(new SphereGeometry(0.07, 10, 10),
      this.mat('#ffffff', { roughness: 0.0, emissive: '#ffdd00', emissiveIntensity: 3.0 }));
    tFireCore.position.set(tipPos.x, tipPos.y, tipPos.z);
    hanumanGroup.add(tFireCore);
    // Orange outer flame
    const tFireOr = new Mesh(new SphereGeometry(0.12, 10, 10), flameOr);
    tFireOr.position.set(tipPos.x, tipPos.y + 0.04, tipPos.z);
    tFireOr.scale.set(0.9, 1.2, 0.8);
    hanumanGroup.add(tFireOr);
    // Larger transparent glow
    const tFireGlw = new Mesh(new SphereGeometry(0.2, 10, 10),
      new MeshBasicMaterial({ color: '#ff6600', transparent: true, opacity: 0.25 }));
    tFireGlw.position.set(tipPos.x, tipPos.y, tipPos.z);
    hanumanGroup.add(tFireGlw);
    // 5 upward flame tongues
    for (let tf = 0; tf < 5; tf++) {
      const fA = (tf / 5) * Math.PI * 2;
      const fLen = 0.14 + Math.random() * 0.06;
      const flame = new Mesh(new ConeGeometry(0.025, fLen, 6), tf % 2 === 0 ? flameOr : flameY);
      flame.position.set(
        tipPos.x + Math.cos(fA) * 0.05,
        tipPos.y + 0.1 + fLen / 2,
        tipPos.z + Math.sin(fA) * 0.04
      );
      flame.rotation.z = (Math.cos(fA) * 0.3);
      hanumanGroup.add(flame);
    }
    // Outermost glow blob
    const tFireBig = new Mesh(new SphereGeometry(0.3, 10, 10),
      new MeshBasicMaterial({ color: '#ff9900', transparent: true, opacity: 0.1 }));
    tFireBig.position.set(tipPos.x, tipPos.y, tipPos.z);
    hanumanGroup.add(tFireBig);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  15. POSITION, SCALE & PLACE THE STATUE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const statueY = baseTop + mH + 0.14;
    hanumanGroup.position.set(0, statueY, 0.6);
    // Heroic scale â€” imposing rooftop presence
    hanumanGroup.scale.set(1.5, 1.5, 1.5);
    this.templeGroup.add(hanumanGroup);

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    //  16. DRAMATIC 6-LIGHT DIVINE ILLUMINATION
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const sY = statueY;
    const sc = 1.5;

    // Key light â€” warm golden spotlight from above-front (primary illumination)
    const keySpot = new SpotLight('#ffd060', 10.0, 18.0, Math.PI / 7, 0.35, 0.9);
    keySpot.position.set(0, sY + 5.5, 4.5);
    keySpot.target.position.set(0, sY + 1.5 * sc, 0.6);
    this.scene.add(keySpot); this.scene.add(keySpot.target);

    // Fill light â€” soft saffron from right side
    const fillSpot = new SpotLight('#ffaa44', 4.5, 12.0, Math.PI / 6, 0.55, 1.1);
    fillSpot.position.set(3.0, sY + 3.0, 2.0);
    fillSpot.target.position.set(0, sY + 1.2 * sc, 0.6);
    this.scene.add(fillSpot); this.scene.add(fillSpot.target);

    // Rim light â€” cool from behind (silhouette definition)
    const rimLight = new SpotLight('#ff8833', 3.0, 10.0, Math.PI / 5, 0.7, 1.2);
    rimLight.position.set(-2.5, sY + 2.5, -2.0);
    rimLight.target.position.set(0, sY + 1.2 * sc, 0.6);
    this.scene.add(rimLight); this.scene.add(rimLight.target);

    // Halo radiance â€” makes the Prabhavali disc glow outward
    const haloLight = new PointLight('#ffee66', 4.5, 5.5, 1.4);
    haloLight.position.set(0, sY + (torsoBase + 0.55) * sc, 0.6 - 0.2);
    this.scene.add(haloLight);

    // Tail fire light â€” flickering warm orange at tail tip
    const tailTipLY = sY + (headCY + 0.96) * sc;
    const tailFireLight = new PointLight('#ff6600', 6.0, 5.0, 1.6);
    tailFireLight.position.set(tipPos.x * sc, tailTipLY, 0.6 + tipPos.z * sc);
    this.scene.add(tailFireLight);

    // Gada tip glow â€” divine weapon radiance
    const gadaTipLY = sY + (rWristY + 1.44 + 0.09) * sc;
    const gadaLight = new PointLight('#ffd700', 3.5, 4.0, 1.5);
    gadaLight.position.set(rWristX * sc, gadaTipLY, 0.6 + 0.14 * sc);
    this.scene.add(gadaLight);

    // Ram-naam heart glow â€” subtle sacred light from chest
    const ramLight = new PointLight('#ff8800', 2.0, 3.0, 2.0);
    ramLight.position.set(0, sY + torsoBase * sc + 0.5 * sc, 0.6 + 0.3);
    this.scene.add(ramLight);
  }

  // â”€â”€â”€ LIGHTING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private addLighting(): void {
    // Hemisphere for natural sky-ground color blending
    const hemi = new (HemisphereLight as any)('#ffe6c8', '#2a1505', 1.4);
    this.scene.add(hemi);

    // Warm ambient light
    this.scene.add(new AmbientLight('#553315', 1.2));

    // Key light â€” warm golden from above-right
    const key = new DirectionalLight('#fff0d0', 3.5);
    key.position.set(6, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.001;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    // Front fill light â€” soft warm light directly illuminating the doors & lions
    const frontFill = new DirectionalLight('#ffcc88', 1.8);
    frontFill.position.set(0, 4, 8);
    this.scene.add(frontFill);

    // Fill â€” cool blue/warm balance from opposite
    const fill = new DirectionalLight('#80a0d0', 0.8);
    fill.position.set(-5, 6, -4);
    this.scene.add(fill);

    // Rim â€” warm back-light for edge glow
    const rim = new DirectionalLight('#ffa040', 1.2);
    rim.position.set(-4, 5, -6);
    this.scene.add(rim);

    // Spot on arch entrance â€” dramatic
    const archSpot = new SpotLight('#ffdd66', 6, 12, Math.PI / 8, 0.5, 1.2);
    archSpot.position.set(0, 4, 5);
    archSpot.target.position.set(0, 1.5, 1.3);
    this.scene.add(archSpot);
    this.scene.add(archSpot.target);

    // Up-light from ground (subtle warm wash)
    const upLight = new SpotLight('#ff6600', 1.5, 8, Math.PI / 4, 0.8, 2);
    upLight.position.set(0, -0.5, 3);
    upLight.target.position.set(0, 5, 0);
    this.scene.add(upLight);
    this.scene.add(upLight.target);

    // Kalash spot from above
    const kalashSpot = new SpotLight('#ffd700', 2, 6, Math.PI / 12, 0.7, 2);
    kalashSpot.position.set(0, 12, 0);
    kalashSpot.target.position.set(0, 8, 0);
    this.scene.add(kalashSpot);
    this.scene.add(kalashSpot.target);
  }

  // â”€â”€â”€ PARTICLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private addParticles(): void {
    // Disabled to remove background particle noise
  }

  // â”€â”€â”€ ANIMATION LOOP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private animate(): void {
    this.frameId = requestAnimationFrame(() => this.animate());

    try {
      const t = this.clock ? this.clock.getElapsedTime() : 0;

      // Smooth mouse-driven rotation
      this.targetRotY = -0.15 + this.mouseX * 0.4;
      this.targetRotX = this.mouseY * 0.1;
      this.currentRotY += (this.targetRotY - this.currentRotY) * 0.03;
      this.currentRotX += (this.targetRotX - this.currentRotX) * 0.03;

      if (this.templeGroup) {
        this.templeGroup.rotation.y = this.currentRotY + Math.sin(t * 0.12) * 0.08;
        this.templeGroup.rotation.x = this.currentRotX * 0.3;
      }

      // Diya flicker
      if (this.diyas && this.diyas.length > 0) {
        this.diyas.forEach((d: any, i: number) => {
          if (d) {
            const flicker = Math.sin(t * 5 + i * 2.1) * 0.6
                          + Math.sin(t * 8.3 + i * 3.7) * 0.3
                          + Math.sin(t * 13 + i) * 0.15;
            d.intensity = 3 + flicker;
          }
        });
      }

      // Flame scale pulsing
      if (this.flames && this.flames.length > 0) {
        this.flames.forEach((f: any, i: number) => {
          if (f && f.scale) {
            const s = 1 + Math.sin(t * 6 + i * 1.3) * 0.15;
            f.scale.set(s, s * 1.2, s);
          }
        });
      }

      // Flag wave (Direct Float32Array access)
      if (this.flagMesh && this.flagOrigPositions) {
        const posAttr = this.flagMesh.geometry.getAttribute('position');
        if (posAttr && posAttr.array) {
          const arr = posAttr.array;
          const count = posAttr.count;
          for (let i = 0; i < count; i++) {
            const ox = this.flagOrigPositions[i * 3];
            const oy = this.flagOrigPositions[i * 3 + 1];
            const wave = Math.sin(ox * 6 + t * 4) * 0.08 * (ox + 0.425);
            const wave2 = Math.cos(oy * 4 + t * 3) * 0.03 * (ox + 0.425);
            arr[i * 3 + 2] = wave + wave2;
          }
          posAttr.needsUpdate = true;
        }
      }

      // Outer particle drift (Direct Float32Array access)
      if (this.particles) {
        const posAttr = this.particles.geometry.getAttribute('position');
        if (posAttr && posAttr.array) {
          const arr = posAttr.array;
          const count = posAttr.count;
          for (let i = 0; i < count; i++) {
            let y = arr[i * 3 + 1] + 0.004;
            if (y > 14) y = 0;
            arr[i * 3 + 1] = y;
            arr[i * 3] += Math.sin(t * 0.5 + i * 0.3) * 0.002;
            arr[i * 3 + 2] += Math.cos(t * 0.3 + i * 0.2) * 0.001;
          }
          posAttr.needsUpdate = true;
        }
      }

      // Inner particles (Direct Float32Array access)
      if (this.particlesInner) {
        const posAttr = this.particlesInner.geometry.getAttribute('position');
        if (posAttr && posAttr.array) {
          const arr = posAttr.array;
          const count = posAttr.count;
          for (let i = 0; i < count; i++) {
            let y = arr[i * 3 + 1] + 0.008;
            if (y > 10) y = 1;
            arr[i * 3 + 1] = y;
            const angle = t * 0.5 + i * 0.5;
            arr[i * 3] += Math.sin(angle) * 0.003;
            arr[i * 3 + 2] += Math.cos(angle) * 0.003;
          }
          posAttr.needsUpdate = true;
        }
      }
    } catch (e) {
      console.error('Animation error:', e);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ─── RESIZE HANDLING ──────────────────────────────────
  private setupResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      const canvas = this.canvasRef.nativeElement;
      const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 0;
      const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 0;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
      }
    });
    this.resizeObserver.observe(this.canvasRef.nativeElement);
  }
}

