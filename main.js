import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.querySelector("#scene");
const speedEl = document.querySelector("#speed");
const lapEl = document.querySelector("#lap");

function createRenderer(targetCanvas) {
  const contextAttributes = { antialias: true, alpha: false, powerPreference: "high-performance" };
  const webgl2 = targetCanvas.getContext("webgl2", contextAttributes);
  const webgl = webgl2 ?? targetCanvas.getContext("webgl", contextAttributes);

  if (!webgl) {
    const warning = document.createElement("div");
    warning.textContent = "WebGL is unavailable on this browser/device. Enable hardware acceleration to play.";
    warning.style.cssText = "position:fixed;inset:auto 1rem 1rem 1rem;z-index:20;padding:.75rem 1rem;border:1px solid #ff7bb6;border-radius:10px;background:#120813d9;color:#ffd7ea;font:600 0.9rem/1.3 system-ui";
    document.body.append(warning);
    throw new Error("WebGL is unavailable in this environment.");
  }

  const nextRenderer = new THREE.WebGLRenderer({ canvas: targetCanvas, context: webgl, antialias: true });
  nextRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  nextRenderer.setSize(window.innerWidth, window.innerHeight);
  nextRenderer.shadowMap.enabled = true;
  nextRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  nextRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  nextRenderer.toneMappingExposure = 1.15;
  nextRenderer.outputColorSpace = THREE.SRGBColorSpace;
  return nextRenderer;
}

const renderer = createRenderer(canvas);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030711, 0.015);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 16);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.65, 0.7, 0.75);
composer.addPass(bloomPass);

const hemi = new THREE.HemisphereLight(0x79b5ff, 0x181421, 1.2);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2cc, 1.8);
sun.position.set(35, 60, -28);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
scene.add(sun);

const moonGlow = new THREE.PointLight(0x32beff, 50, 120, 2);
moonGlow.position.set(-18, 10, 12);
scene.add(moonGlow);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(240, 120),
  new THREE.MeshStandardMaterial({ color: 0x0a1222, roughness: 0.95, metalness: 0.02 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const trackRadiusX = 36;
const trackRadiusZ = 26;

const trackShape = new THREE.Shape();
trackShape.absellipse(0, 0, trackRadiusX + 4.8, trackRadiusZ + 4.8, 0, Math.PI * 2, false);
const hole = new THREE.Path();
hole.absellipse(0, 0, trackRadiusX - 4.8, trackRadiusZ - 4.8, 0, Math.PI * 2, true);
trackShape.holes.push(hole);

const track = new THREE.Mesh(
  new THREE.ExtrudeGeometry(trackShape, { depth: 0.45, bevelEnabled: false, curveSegments: 128 }),
  new THREE.MeshStandardMaterial({
    color: 0x1f242b,
    roughness: 0.9,
    metalness: 0.15,
    emissive: 0x0a0f18,
    emissiveIntensity: 0.45
  })
);
track.rotation.x = -Math.PI / 2;
track.position.y = 0.03;
track.receiveShadow = true;
scene.add(track);

function makeStrip(radiusX, radiusZ, width, color) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, radiusX + width / 2, radiusZ + width / 2, 0, Math.PI * 2, false);
  const voidPath = new THREE.Path();
  voidPath.absellipse(0, 0, radiusX - width / 2, radiusZ - width / 2, 0, Math.PI * 2, true);
  shape.holes.push(voidPath);
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false, curveSegments: 128 }),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2, emissive: color, emissiveIntensity: 0.22 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.08;
  scene.add(mesh);
}

makeStrip(trackRadiusX + 4.45, trackRadiusZ + 4.45, 0.3, 0x37a8ff);
makeStrip(trackRadiusX - 4.45, trackRadiusZ - 4.45, 0.3, 0xff4dc8);

const laneMarks = new THREE.Group();
const dashGeom = new THREE.BoxGeometry(0.2, 0.03, 1.6);
const dashMat = new THREE.MeshStandardMaterial({ color: 0xf6f6f6, roughness: 0.35, metalness: 0.35, emissive: 0xdde6ff, emissiveIntensity: 0.28 });
for (let i = 0; i < 110; i += 1) {
  const t = (i / 110) * Math.PI * 2;
  const dash = new THREE.Mesh(dashGeom, dashMat);
  dash.position.set(Math.cos(t) * trackRadiusX, 0.1, Math.sin(t) * trackRadiusZ);
  dash.rotation.y = -t;
  laneMarks.add(dash);
}
scene.add(laneMarks);

function makePalm(x, z, scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.3 * scale, 2.8 * scale, 8),
    new THREE.MeshStandardMaterial({ color: 0x6f4934, roughness: 0.9 })
  );
  trunk.castShadow = true;
  trunk.position.y = 1.4 * scale;
  tree.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1dcf8a, roughness: 0.5, emissive: 0x0b5228, emissiveIntensity: 0.24 });
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.15 * scale, 2.6 * scale, 7), leafMat);
    leaf.position.y = 2.9 * scale;
    leaf.rotation.z = Math.PI / 2.6;
    leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.castShadow = true;
    tree.add(leaf);
  }
  tree.position.set(x, 0, z);
  scene.add(tree);
}

for (let i = 0; i < 30; i += 1) {
  const t = (i / 30) * Math.PI * 2;
  makePalm(Math.cos(t) * (trackRadiusX + 11 + Math.sin(i) * 2), Math.sin(t) * (trackRadiusZ + 11 + Math.cos(i) * 1.5), 0.95 + (i % 3) * 0.2);
}

function makeCar(color = 0xff5c8a) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.2,
    metalness: 0.75,
    emissive: color,
    emissiveIntensity: 0.18
  });

  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 3.8), bodyMat);
  shell.position.y = 0.55;
  shell.castShadow = true;
  car.add(shell);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.7), new THREE.MeshStandardMaterial({ color: 0xbdeaff, roughness: 0.06, metalness: 0.95 }));
  cabin.position.set(0, 0.95, -0.2);
  cabin.castShadow = true;
  car.add(cabin);

  const bumperGlow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.25), new THREE.MeshStandardMaterial({ color: 0x88f6ff, emissive: 0x88f6ff, emissiveIntensity: 1.6, roughness: 0.3 }));
  bumperGlow.position.set(0, 0.5, -1.98);
  car.add(bumperGlow);

  const rearGlow = bumperGlow.clone();
  rearGlow.material = new THREE.MeshStandardMaterial({ color: 0xff4a7a, emissive: 0xff2a60, emissiveIntensity: 1.4, roughness: 0.4 });
  rearGlow.position.z = 1.98;
  car.add(rearGlow);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.55, metalness: 0.18 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd6ecff, roughness: 0.25, metalness: 0.92, emissive: 0x88cfff, emissiveIntensity: 0.2 });

  const wheelPositions = [
    [-0.88, 0.3, -1.35],
    [0.88, 0.3, -1.35],
    [-0.88, 0.3, 1.35],
    [0.88, 0.3, 1.35]
  ];

  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.4, 16), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    car.add(wheel);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.41, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    car.add(rim);
  }

  return car;
}

const playerCar = makeCar(0x39d0ff);
playerCar.position.set(trackRadiusX, 0.1, 0);
scene.add(playerCar);

const botCars = [
  { mesh: makeCar(0xff5fbb), angle: Math.PI / 2, speed: 0.55 },
  { mesh: makeCar(0x86ff67), angle: Math.PI, speed: 0.52 }
];
for (const bot of botCars) scene.add(bot.mesh);

const stars = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({ color: 0x8fb4ff, size: 0.55, transparent: true, opacity: 0.65 })
);
const starPositions = new Float32Array(400 * 3);
for (let i = 0; i < 400; i += 1) {
  starPositions[i * 3] = (Math.random() - 0.5) * 350;
  starPositions[i * 3 + 1] = 30 + Math.random() * 100;
  starPositions[i * 3 + 2] = (Math.random() - 0.5) * 350;
}
stars.geometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
scene.add(stars);

const keys = new Set();
window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "KeyR") {
    carState.angle = 0;
    carState.progress = 0;
    carState.laneOffset = 0;
    carState.velocity = 0;
    laps = 1;
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));

const carState = {
  angle: 0,
  progress: 0,
  laneOffset: 0,
  velocity: 0,
  steering: 0
};

let laps = 1;
let prevAngle = 0;
const clock = new THREE.Clock();

function updatePlayer(dt) {
  const accelerating = keys.has("KeyW") || keys.has("ArrowUp");
  const braking = keys.has("KeyS") || keys.has("ArrowDown");
  const turnLeft = keys.has("KeyA") || keys.has("ArrowLeft");
  const turnRight = keys.has("KeyD") || keys.has("ArrowRight");
  const handbrake = keys.has("Space");

  if (accelerating) carState.velocity += 11 * dt;
  if (braking) carState.velocity -= 14 * dt;

  const drag = handbrake ? 1.9 : 0.85;
  carState.velocity -= carState.velocity * drag * dt;
  carState.velocity = THREE.MathUtils.clamp(carState.velocity, -2.4, 13.5);

  const steerInput = (turnRight ? 1 : 0) - (turnLeft ? 1 : 0);
  carState.steering = THREE.MathUtils.damp(carState.steering, steerInput, 7, dt);

  const steerStrength = (0.8 + Math.min(Math.abs(carState.velocity) / 8, 1.2)) * (handbrake ? 1.45 : 1);
  carState.progress += carState.velocity * dt * 0.28;
  carState.laneOffset = THREE.MathUtils.clamp(
    carState.laneOffset + carState.steering * Math.abs(carState.velocity) * steerStrength * dt,
    -3.4,
    3.4
  );

  carState.angle = carState.progress;
  const x = Math.cos(carState.angle) * (trackRadiusX + carState.laneOffset);
  const z = Math.sin(carState.angle) * (trackRadiusZ + carState.laneOffset * 0.75);
  playerCar.position.set(x, 0.1, z);

  const ahead = carState.angle + 0.11;
  const lookX = Math.cos(ahead) * (trackRadiusX + carState.laneOffset);
  const lookZ = Math.sin(ahead) * (trackRadiusZ + carState.laneOffset * 0.75);
  playerCar.lookAt(lookX, 0.1, lookZ);

  const speedKmh = Math.max(0, Math.round(Math.abs(carState.velocity) * 18));
  speedEl.textContent = `${speedKmh} km/h`;

  const normalizedAngle = ((carState.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (normalizedAngle < prevAngle - Math.PI) {
    laps += 1;
  }
  prevAngle = normalizedAngle;
  lapEl.textContent = `Lap ${laps}`;
}

function updateBots(dt) {
  for (const bot of botCars) {
    bot.angle += bot.speed * dt;
    const x = Math.cos(bot.angle) * (trackRadiusX + 0.9 * Math.sin(bot.angle * 2));
    const z = Math.sin(bot.angle) * (trackRadiusZ + 0.9 * Math.cos(bot.angle * 2));
    bot.mesh.position.set(x, 0.1, z);
    bot.mesh.lookAt(
      Math.cos(bot.angle + 0.15) * trackRadiusX,
      0.1,
      Math.sin(bot.angle + 0.15) * trackRadiusZ
    );
  }
}

function updateCamera(dt) {
  const offset = new THREE.Vector3(0, 6.3, 12.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerCar.rotation.y + Math.PI);
  const targetPos = playerCar.position.clone().add(offset);
  camera.position.lerp(targetPos, 1 - Math.exp(-4.5 * dt));
  const lookTarget = playerCar.position.clone().add(new THREE.Vector3(0, 1.3, 0));
  camera.lookAt(lookTarget);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);

  const t = clock.elapsedTime;
  moonGlow.position.x = -18 + Math.sin(t * 0.2) * 10;
  moonGlow.position.z = 12 + Math.cos(t * 0.2) * 6;
  laneMarks.rotation.y = t * 0.03;

  updatePlayer(dt);
  updateBots(dt);
  updateCamera(dt);

  composer.render();
  requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
