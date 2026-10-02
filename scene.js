// Persistent scroll-driven 3D stage (inspired by the screen recording):
// one fixed canvas, camera orbits + paint colour changes as you scroll,
// tri-colour ground stripe runs diagonally under the vehicle.
// All code original; model = local CC0 Kenney SUV (assets/suv-standin.glb).
//
// Integration patterns applied (web3d-integration-patterns skill):
//  - layered separation: this file owns the 3D layer only, UI lives in script.js/styles.css
//  - renderer.setAnimationLoop() as sole loop driver, paused while the tab is hidden
//  - on-demand rendering: frames render only while scroll easing is in flight or state is dirty
//  - graceful degradation: WebGL/model failure falls back instead of leaving an empty stage
//  - context-loss handling + prefers-reduced-motion support (snap, no easing lag)

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('scene');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function announceReady() {
  window.dispatchEvent(new CustomEvent('scene:ready'));
}

if (!canvas) {
  announceReady();
} else {
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    // No WebGL: CSS keeps every section readable on the flat stage colour.
    document.documentElement.classList.add('no-webgl');
    announceReady();
  }

  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd6d1cc);
    scene.fog = new THREE.Fog(0xd6d1cc, 26, 70);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 160);

    // lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a938c, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 1.45);
    sun.position.set(6, 10, 7);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-7, 4, -6);
    scene.add(fill);

    // floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(80, 64),
      new THREE.MeshStandardMaterial({ color: 0xcdc7c1, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // tri-colour ground stripe — Nepal crimson / blue / bone (original geometry)
    const stripeGroup = new THREE.Group();
    const stripeColors = [0xdc143c, 0x003893, 0xf2efe9]; // crimson, blue, bone
    stripeColors.forEach((c, i) => {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(130, 0.02, 0.8),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })
      );
      bar.position.z = -i * 0.82;
      stripeGroup.add(bar);
    });
    stripeGroup.position.set(0, 0.03, -7.5);
    stripeGroup.rotation.y = 0.62;
    scene.add(stripeGroup);

    // soft contact shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.17 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    scene.add(shadow);

    // vehicle (CC0 Kenney SUV stand-in, local file)
    const carGroup = new THREE.Group();
    scene.add(carGroup);
    let bodyMat = null;

    function stageReady() {
      invalidate();
      announceReady();
    }

    function buildFallbackCar() {
      // Procedural stand-in so the stage is never empty if the GLB fails.
      const paint = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5, metalness: 0.05 });
      const glass = new THREE.MeshStandardMaterial({ color: 0x272c30, roughness: 0.35 });
      const rubber = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 });
      const g = new THREE.Group();

      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.72, 3.1), paint);
      hull.position.y = 0.82;
      g.add(hull);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.6, 1.6), paint);
      cab.position.set(0, 1.48, -0.3);
      g.add(cab);

      const screen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.44, 0.06), glass);
      screen.position.set(0, 1.44, 0.52);
      g.add(screen);

      const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 20);
      [[-0.82, 1.02], [0.82, 1.02], [-0.82, -1.05], [0.82, -1.05]].forEach(([x, z]) => {
        const w = new THREE.Mesh(wheelGeo, rubber);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.38, z);
        g.add(w);
      });

      bodyMat = paint;
      carGroup.add(g);
      stageReady();
    }

    new GLTFLoader().load('./assets/suv-standin.glb', (gltf) => {
      const root = gltf.scene;
      root.traverse((o) => {
        if (o.isMesh) {
          const n = (o.name || '').toLowerCase();
          if (n === 'body' || n.startsWith('door') || n === 'body-mesh') {
            if (!bodyMat) bodyMat = o.material.clone();
            o.material = bodyMat;
          }
        }
      });
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      root.position.x -= center.x;
      root.position.z -= center.z;
      root.position.y -= box.min.y;
      carGroup.add(root);
      stageReady();
    }, undefined, buildFallbackCar);

    // scroll keyframes — az/rad/h = camera orbit, off = screen-right shift,
    // col = body paint. Values mirror the recorded sequence:
    // hero red front-3/4 → cream side → black rear-3/4 → red front-3/4.
    const KF = [
      { p: 0.00, az: 0.62, rad: 8.2, h: 1.75, ty: 0.85, off: 2.1, col: 0xc8102e },
      { p: 0.14, az: 1.05, rad: 7.6, h: 1.60, ty: 0.85, off: 0.7, col: 0xc8102e },
      { p: 0.30, az: 1.55, rad: 7.2, h: 1.45, ty: 0.80, off: 0.0, col: 0xece2d2 },
      { p: 0.46, az: 1.62, rad: 6.9, h: 1.30, ty: 0.80, off: 0.0, col: 0xece2d2 },
      { p: 0.58, az: 2.55, rad: 6.5, h: 1.50, ty: 0.90, off: -0.5, col: 0x141414 },
      { p: 0.72, az: 3.40, rad: 7.6, h: 1.95, ty: 0.90, off: 0.0, col: 0xc8102e },
      { p: 0.88, az: 5.78, rad: 7.8, h: 1.65, ty: 0.85, off: 0.55, col: 0xc8102e },
      { p: 1.00, az: 6.15, rad: 8.2, h: 1.80, ty: 0.85, off: 0.55, col: 0xc8102e },
    ];

    function sampleKF(p) {
      p = Math.max(0, Math.min(1, p));
      let a = KF[0], b = KF[KF.length - 1];
      for (let i = 0; i < KF.length - 1; i++) {
        if (p >= KF[i].p && p <= KF[i + 1].p) { a = KF[i]; b = KF[i + 1]; break; }
      }
      const span = b.p - a.p || 1;
      const t = (p - a.p) / span;
      const s = t * t * (3 - 2 * t); // smoothstep
      const mix = (x, y) => x + (y - x) * s;
      return {
        az: mix(a.az, b.az), rad: mix(a.rad, b.rad), h: mix(a.h, b.h),
        ty: mix(a.ty, b.ty), off: mix(a.off, b.off),
        col: new THREE.Color(a.col).lerp(new THREE.Color(b.col), s),
      };
    }

    function scrollProgress() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? window.scrollY / max : 0;
    }

    let target = scrollProgress();
    let current = target;
    let dirty = true; // render on demand: frames happen while easing or after a change
    function invalidate() { dirty = true; }

    window.addEventListener('scroll', () => { target = scrollProgress(); invalidate(); }, { passive: true });

    const onMotionPrefChange = () => { current = target; invalidate(); };
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionPrefChange);

    const small = () => window.innerWidth < 760;

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      invalidate();
    }
    window.addEventListener('resize', resize);
    resize();

    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3();
    const tgt = new THREE.Vector3();

    function frame() {
      const moving = Math.abs(target - current) > 0.0001;
      if (!moving && !dirty) return; // nothing changed since last frame — skip GPU work

      if (reducedMotion.matches) {
        current = target; // present the final state directly, no easing lag
      } else {
        current += (target - current) * 0.075; // eased scroll follow
      }
      const k = sampleKF(current);

      // camera orbit around origin, then shift both cam+target along the
      // camera's right vector so the vehicle slides to screen-right in hero
      pos.set(Math.sin(k.az) * k.rad, k.h, Math.cos(k.az) * k.rad);
      tgt.set(0, k.ty, 0);
      fwd.copy(tgt).sub(pos).normalize();
      right.copy(fwd).cross(up).normalize();
      const off = small() ? k.off * 0.3 : k.off;
      pos.addScaledVector(right, -off);
      tgt.addScaledVector(right, -off);
      camera.position.copy(pos);
      camera.lookAt(tgt);

      if (bodyMat) bodyMat.color.copy(k.col);

      renderer.render(scene, camera);
      dirty = false;
    }

    // Sole loop driver; paused while the tab is hidden (battery/CPU).
    renderer.setAnimationLoop(frame);
    document.addEventListener('visibilitychange', () => {
      renderer.setAnimationLoop(document.hidden ? null : frame);
      if (!document.hidden) invalidate();
    });

    // WebGL context loss (driver switch, GPU reset): survive it instead of freezing.
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      renderer.setAnimationLoop(null);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      renderer.setAnimationLoop(frame);
      invalidate();
    });
  }
}
