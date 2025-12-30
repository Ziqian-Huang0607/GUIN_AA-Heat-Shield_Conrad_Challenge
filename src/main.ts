import './style.css'
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==========================================
// 1. TEXT DECRYPTION EFFECT
// ==========================================
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const decryptText = (element: HTMLElement) => {
  let iteration = 0;
  const originalText = element.dataset.value || element.innerText;
  let interval: any = null;
  clearInterval(interval);
  interval = setInterval(() => {
    element.innerText = originalText.split("").map((_l, i) => {
      if (i < iteration) return originalText[i];
      return letters[Math.floor(Math.random() * 36)];
    }).join("");
    if (iteration >= originalText.length) clearInterval(interval);
    iteration += 1 / 2;
  }, 30);
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && entry.target instanceof HTMLElement) {
      if (entry.target.classList.contains('decrypt') || entry.target.classList.contains('glitch-header')) {
        decryptText(entry.target);
        observer.unobserve(entry.target);
      }
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.decrypt, .glitch-header').forEach(el => observer.observe(el));

// ==========================================
// 2. BACKGROUND PARTICLES
// ==========================================
const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
if (bgCanvas) {
  const bgScene = new THREE.Scene();
  const bgCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true });
  bgRenderer.setSize(window.innerWidth, window.innerHeight);
  bgRenderer.setPixelRatio(window.devicePixelRatio);
  bgCamera.position.z = 50;

  const bgGeo = new THREE.BufferGeometry();
  const bgCount = 1500;
  const bgPos = new Float32Array(bgCount * 3);
  const bgSpeed = new Float32Array(bgCount);
  for(let i=0; i<bgCount; i++) {
    bgPos[i*3] = (Math.random()-0.5)*100;
    bgPos[i*3+1] = (Math.random()-0.5)*100;
    bgPos[i*3+2] = (Math.random()-0.5)*100;
    bgSpeed[i] = Math.random() * 0.5 + 0.1;
  }
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
  const bgMat = new THREE.PointsMaterial({ size: 0.2, color: 0xff5500, transparent: true, opacity: 0.8 });
  const bgMesh = new THREE.Points(bgGeo, bgMat);
  bgScene.add(bgMesh);

  const animateBg = () => {
    requestAnimationFrame(animateBg);
    const p = bgMesh.geometry.attributes.position.array as Float32Array;
    for(let i=0; i<bgCount; i++) {
      p[i*3+2] += bgSpeed[i] * 3; 
      if(p[i*3+2] > 50) {
        p[i*3+2] = -100;
        p[i*3] = (Math.random()-0.5)*100;
        p[i*3+1] = (Math.random()-0.5)*100;
      }
    }
    bgMesh.geometry.attributes.position.needsUpdate = true;
    bgRenderer.render(bgScene, bgCamera);
  };
  animateBg();
  window.addEventListener('resize', () => {
    bgCamera.aspect = window.innerWidth / window.innerHeight;
    bgCamera.updateProjectionMatrix();
    bgRenderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ==========================================
// 3. PRODUCT VIEWER (UPDATED FOR GLTF)
// ==========================================
const modelCanvas = document.getElementById('model-canvas') as HTMLCanvasElement;
const container = document.getElementById('model-viewer-container');

if (modelCanvas && container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.05);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 5); 

  const renderer = new THREE.WebGLRenderer({ canvas: modelCanvas, alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0x00f3ff, 3);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;
  controls.enableZoom = false; 
  controls.enablePan = true; 

  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  loader.setDRACOLoader(dracoLoader);

  const loadingText = document.querySelector('.loading-overlay');
  
  // URL pointing to the .gltf file in the public folder
  const modelUrl = '/shield.gltf'; 

  loader.load(modelUrl, (gltf) => {
    const model = gltf.scene;
    
    // Scale reduced to 50%
    model.scale.set(14.0, 14.0, 14.0); 
    
    // Auto-Center logic (fixes offset models)
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center); 

    scene.add(model);
    if(loadingText) loadingText.textContent = "";
  }, undefined, (error) => {
    console.error("Error loading GLTF:", error);
    if(loadingText) loadingText.textContent = "MODEL LOAD FAILED";
  });

  const animateModel = () => {
    requestAnimationFrame(animateModel);
    controls.update();
    renderer.render(scene, camera);
  };
  animateModel();

  const resizeObserver = new ResizeObserver(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(container);
}