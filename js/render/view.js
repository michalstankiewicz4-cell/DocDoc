// Widok bakterii (lewa połowa): kamera "mikroskopu" śledząca bakterię, oświetlenie, łańcuch renderu.
(function () {
  const C = DD.CONFIG;

  // opts: { maxCells, maxPixelRatio } — mniejsze wartości dla podglądu lekarza
  DD.createView = function (container, state, opts) {
    opts = opts || {};
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x050101, 1);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(C.camera.fov, 1, 0.1, 300);

    const sdfTex = DD.makeSdfTexture(renderer);
    const tissue = DD.createTissue(sdfTex, DD.makeOrganTexture());
    scene.add(tissue);
    const cells = DD.createCells(opts.maxCells);
    scene.add(cells.mesh); scene.add(cells.specks);
    for (const m of cells.extras || []) scene.add(m);
    const actors = DD.createActors(scene, state);
    const biome = DD.createBiome(scene);
    const post = DD.createPost(renderer);

    const V = { renderer, camera, zoom: C.camera.zoom, tx: state.bact.x, ty: state.bact.y, shake: 0, pr: 1 };

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      V.pr = Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio || 1.5);
      renderer.setPixelRatio(V.pr);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
      post.resize(Math.floor(w * V.pr), Math.floor(h * V.pr));
      cells.speckMat.uniforms.uPx.value = h * V.pr * 0.9;
    }
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(container);
    resize();

    // delikatna regulacja zoomu kółkiem myszy (wąski zakres wokół C.camera.zoom)
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      V.zoom = Math.max(C.camera.zoomMin, Math.min(C.camera.zoomMax, V.zoom * Math.exp(e.deltaY * 0.0006)));
    }, { passive: false });

    let lastBeat = 0;
    // o.snap: kamera od razu nad bakterią (bez płynnego dojazdu), np. do zdjęcia
    V.frame = function (s, dt, o) {
      const b = s.bact;
      // kamera podąża miękko za bakterią
      const k = 1 - Math.exp(-dt * 4.5);
      V.tx += (b.x - V.tx) * k; V.ty += (b.y - V.ty) * k;
      if (b.transit || (o && o.snap)) { V.tx = b.x; V.ty = b.y; }
      // drgnięcie przy skurczu komór
      if (s.contraction > 0.85 && lastBeat < 0.85) V.shake = 1;
      lastBeat = s.contraction;
      V.shake *= Math.exp(-dt * 6);
      const sh = V.shake * 0.05 * V.zoom / 17;
      // w mięśniu kamera zbliża się do powierzchni przekroju ściany
      const tz = b.z || 0;
      V.zMul = V.zMul ?? 1;
      V.zMul += ((b.inTissue ? 0.6 : 1) - V.zMul) * (o && o.snap ? 1 : 1 - Math.exp(-dt * 3));
      const z = V.zoom * V.zMul;
      camera.position.set(V.tx + Math.sin(s.time * 40) * sh, V.ty - z * 0.3 + Math.cos(s.time * 37) * sh, z + tz);
      camera.lookAt(V.tx, V.ty + 0.4, tz);

      const SH = DD.SHARED;
      SH.uTime.value = s.time;
      SH.uBeat.value = s.contraction;
      SH.uCam.value.copy(camera.position);
      SH.uLight.value.set(camera.position.x + 1.2, camera.position.y + 1.8, camera.position.z * 0.85);
      SH.uLightPow.value = 1.5 * (1 + 0.12 * s.contraction) * Math.max(1, z / 17) ** 0.9;
      const feverK = Math.max(0, Math.min(1, (s.doctor.temp - 37.2) / (C.doctor.fever.temp - 37.2)));
      SH.uFever.value = feverK;

      const viewH = 2 * z * Math.tan(C.camera.fov * Math.PI / 360);
      cells.update(Math.min(dt, 0.05), s, V.tx, V.ty, viewH, camera.aspect);
      actors.update(s, dt);
      biome.update(s, V.tx, V.ty, viewH, camera.aspect);

      const fade = b.transit ? Math.min(1, Math.sin(Math.PI * (1 - b.transit.t / b.transit.total)) * 1.4) : 0;
      post.render(scene, camera, {
        time: s.time, focus: camera.position.distanceTo(new THREE.Vector3(V.tx, V.ty, tz)),
        fever: feverK, hit: b.hitFlash, fade, slow: b.slowT > 0 ? Math.min(1, b.slowT) : 0
      });
    };
    V.resize = resize;
    return V;
  };
})();
