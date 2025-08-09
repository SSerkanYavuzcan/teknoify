// ===========================================================
// GLOBE - Transparent rotating globe for hero background
// Requires: three.min.js
// ===========================================================
(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const container = document.getElementById('globe');
    if (!container || typeof THREE === 'undefined') return;
  
    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 6);
  
    // Renderer (transparent)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
  
    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.45);
    dir.position.set(2, 1, 3); scene.add(dir);
  
    // Globe core
    const R = 2, SEG = 64;
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(R, SEG, SEG),
      new THREE.MeshPhysicalMaterial({
        color: 0xaeb8ff,
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: 0.22,           // daha görünür
      })
    );
    scene.add(globe);
  
    // Wireframe çizgiler
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(R*1.005, SEG, SEG)),
      new THREE.LineBasicMaterial({ color: 0xcad1ff, transparent: true, opacity: 0.22 })
    );
    scene.add(wire);
  
    // Atmosfer
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(R*1.05, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x90a0ff, transparent: true, opacity: 0.08, side: THREE.BackSide })
    );
    scene.add(glow);
  
    // Boyutlandırma
    function resize() {
      const w = container.clientWidth || container.parentElement.clientWidth || window.innerWidth;
      const h = container.clientHeight || container.parentElement.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();
  
    // Etkileşim & animasyon
    const baseSpeed = reduceMotion ? 0.0006 : 0.0016;
    let targetRotY = 0;
    container.addEventListener('mousemove', e => {
      const r = container.getBoundingClientRect();
      targetRotY = ((e.clientX - r.left) / r.width - 0.5) * 0.25;
    });
  
    let rafId;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const ease = 0.03;
      wire.rotation.y += (targetRotY - wire.rotation.y) * ease;
      globe.rotation.y += baseSpeed;
      wire.rotation.y  += baseSpeed * 1.05;
      glow.rotation.y  += baseSpeed * 0.6;
      renderer.render(scene, camera);
    }
  
    window.initHeroGlobe = () => { resize(); animate(); };
    window.destroyHeroGlobe = () => { cancelAnimationFrame(rafId); renderer.dispose(); };
  })();
  