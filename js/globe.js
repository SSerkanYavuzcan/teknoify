// ===========================================================
// GLOBE - Transparent rotating globe for hero background
// Requires: three.min.js (loaded in index.html before this file)
// ===========================================================

(function () {
    // Respect reduced motion
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    const container = document.getElementById('globe');
    if (!container) return;
  
    // Scene
    const scene = new THREE.Scene();
  
    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 6);
  
    // Renderer (transparent)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);
  
    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);
  
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(2, 1, 3);
    scene.add(dir);
  
    // Globe core (soft transparent)
    const globeRadius = 2;
    const segments = 64;
  
    const globeGeo = new THREE.SphereGeometry(globeRadius, segments, segments);
    const globeMat = new THREE.MeshPhysicalMaterial({
      color: 0x9aa8ff,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.14,
      transmission: 0.0,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);
  
    // Wireframe (meridian hissi)
    const wireGeo = new THREE.WireframeGeometry(
      new THREE.SphereGeometry(globeRadius * 1.005, segments, segments)
    );
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xb9c0ff,
      transparent: true,
      opacity: 0.12,
    });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    scene.add(wire);
  
    // Subtle atmosphere glow (sprite style)
    const glowGeo = new THREE.SphereGeometry(globeRadius * 1.05, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x90a0ff,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);
  
    // Rotation speed
    const baseSpeed = reduceMotion ? 0.0005 : 0.0012;
    let speed = baseSpeed;
  
    // Interactive speed on mouse move (very subtle)
    let targetRotY = 0;
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0-1
      targetRotY = (x - 0.5) * 0.2; // -0.1 .. 0.1
    });
  
    // Resize
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);
  
    // Expose a destroy for future navigation/page changes if needed
    let rafId;
    function animate() {
      rafId = requestAnimationFrame(animate);
      // ease rotation
      wire.rotation.y += (targetRotY - wire.rotation.y) * 0.02;
      globe.rotation.y += speed;
      wire.rotation.y += speed * 1.05;
      glow.rotation.y += speed * 0.6;
  
      renderer.render(scene, camera);
    }
  
    // Public API (optional)
    window.initHeroGlobe = function () {
      onResize();
      animate();
    };
  
    window.destroyHeroGlobe = function () {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      globeGeo.dispose(); globeMat.dispose();
      wireGeo.dispose(); wireMat.dispose();
      glowGeo.dispose(); glowMat.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  })();
  