// Aktorzy sceny: bakteria (z wiciami), przeciwciała, kolonie, płatki zastawek, struny ścięgniste, mięśnie brodawkowate.
(function () {
  const C = DD.CONFIG, H = DD.Heart, GL = DD.GLSL;

  // ---------- wspólny materiał "oświetlonej powierzchni" ----------
  const SURF_VERT = /* glsl */`
    varying vec3 vN; varying vec3 vP; varying vec3 vLocal;
    uniform float uWave; uniform float uTimeL;
    void main(){
      vec3 p = position;
      #ifdef FLAGELLUM
        // wić: fala biegnąca wzdłuż osi, amplituda rośnie ku końcowi
        float s = -p.y;
        p.x += sin(s * 7.0 - uTimeL * 18.0) * 0.12 * s;
        p.z += cos(s * 6.0 - uTimeL * 15.0) * 0.06 * s;
      #endif
      #ifdef USE_INSTANCING
        mat4 m = modelMatrix * instanceMatrix;
      #else
        mat4 m = modelMatrix;
      #endif
      vec4 wp = m * vec4(p, 1.0);
      vP = wp.xyz; vN = normalize(mat3(m) * normal); vLocal = position;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const SURF_FRAG = GL.NOISE + GL.LIGHT + /* glsl */`
    uniform vec3 uAlbedo; uniform vec3 uSssCol; uniform float uSss; uniform float uRough; uniform float uWet;
    uniform vec3 uEmit; uniform float uRim; uniform vec3 uRimCol; uniform float uAlpha; uniform float uGrain;
    uniform float uFlash; uniform float uSlow; uniform float uTimeL;
    varying vec3 vN; varying vec3 vP; varying vec3 vLocal;
    void main(){
      vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
      vec3 alb = uAlbedo;
      if (uGrain > 0.0) {
        float g = fbm(vLocal.xy * 9.0 + vLocal.z * 5.0 + uTimeL * 0.3);
        alb *= 0.7 + g * uGrain;
      }
      alb = mix(alb, vec3(0.55, 0.75, 0.95), uSlow * 0.55);
      vec3 col = shade(vP, N, alb, uRough, uWet, uSss, uSssCol);
      vec3 V = normalize(uCam - vP);
      float fr = pow(1.0 - max(dot(N, V), 0.0), 2.5);
      col += uRimCol * fr * uRim + uEmit;
      col += vec3(1.0, 0.95, 0.9) * uFlash * 2.5;
      col = bloodFog(col, vP);
      gl_FragColor = vec4(col, uAlpha);
    }
  `;
  function surfMat(o) {
    const u = Object.assign({
      uAlbedo: { value: new THREE.Color(o.albedo || 0xffffff) },
      uSssCol: { value: new THREE.Color(o.sssCol || 0xff3020) },
      uSss: { value: o.sss ?? 0.5 }, uRough: { value: o.rough ?? 0.3 }, uWet: { value: o.wet ?? 0.6 },
      uEmit: { value: new THREE.Color(o.emit || 0x000000) },
      uRim: { value: o.rim ?? 0 }, uRimCol: { value: new THREE.Color(o.rimCol || 0xffffff) },
      uAlpha: { value: o.alpha ?? 1 }, uGrain: { value: o.grain ?? 0 },
      uFlash: { value: 0 }, uSlow: { value: 0 }, uTimeL: { value: 0 }, uWave: { value: 0 }
    }, DD.SHARED);
    return new THREE.ShaderMaterial({
      vertexShader: SURF_VERT, fragmentShader: SURF_FRAG, uniforms: u,
      transparent: (o.alpha ?? 1) < 1, side: o.side || THREE.FrontSide, defines: o.defines || {},
      depthWrite: o.depthWrite ?? true
    });
  }
  DD.surfMat = surfMat;

  // ---------- geometrie ----------
  function capsule(r, len, seg) {
    const pts = [], n = 10;
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r + 1e-4, -len / 2 + Math.sin(a) * r)); }
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r + 1e-4, len / 2 + Math.sin(a) * r)); }
    return new THREE.LatheGeometry(pts, seg || 20);
  }
  function mergeGeos(list) {
    const pos = [], nor = [], idx = []; let off = 0;
    for (const g0 of list) {
      const g = g0.index ? g0 : g0;
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      if (g.index) for (const k of g.index.array) idx.push(k + off);
      else for (let k = 0; k < p.length / 3; k++) idx.push(k + off);
      off += p.length / 3;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setIndex(idx);
    return out;
  }
  function antibodyGeometry() {
    // przeciwciało IgG: kształt litery Y
    const r = 0.055;
    const stem = new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.34, 8); stem.translate(0, -0.17, 0);
    const arm1 = new THREE.CylinderGeometry(r, r, 0.34, 8); arm1.translate(0, 0.17, 0); arm1.rotateZ(0.62);
    const arm2 = new THREE.CylinderGeometry(r, r, 0.34, 8); arm2.translate(0, 0.17, 0); arm2.rotateZ(-0.62);
    const tip1 = new THREE.SphereGeometry(r * 1.6, 8, 6); tip1.translate(-Math.sin(0.62) * 0.34, Math.cos(0.62) * 0.34, 0);
    const tip2 = new THREE.SphereGeometry(r * 1.6, 8, 6); tip2.translate(Math.sin(0.62) * 0.34, Math.cos(0.62) * 0.34, 0);
    const hinge = new THREE.SphereGeometry(r * 1.5, 8, 6);
    return mergeGeos([stem, arm1, arm2, tip1, tip2, hinge]);
  }

  DD.createActors = function (scene, state0) {
    const A = {};

    // --- bakteria (pałeczka) ---
    const bact = new THREE.Group();
    const body = new THREE.Mesh(capsule(0.22, 0.5, 24), surfMat({
      albedo: 0x3fae86, sssCol: 0x7dffcb, sss: 1.2, rough: 0.25, wet: 0.8,
      rim: 2.6, rimCol: 0x8affd8, emit: 0x0b5a3a, grain: 0.7
    }));
    bact.add(body);
    const flagMat = surfMat({ albedo: 0x4a9a80, rough: 0.5, wet: 0.2, rim: 0.6, rimCol: 0x6fe3b4, emit: 0x06261a, defines: { FLAGELLUM: 1 } });
    const flagGeo = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1.6, 0)), 40, 0.018, 5, false);
    const flags = [];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(flagGeo, flagMat);
      f.position.set((i - 1) * 0.07, -0.3, (i - 1) * 0.04);
      f.rotation.z = (i - 1) * 0.25;
      bact.add(f); flags.push(f);
    }
    scene.add(bact);
    A.bact = bact; A.bodyMat = body.material; A.flagMat = flagMat;

    // --- wirus: kapsyd (dwudziestościan) z wypustkami białkowymi ---
    const virus = new THREE.Group();
    const capsidGeo = new THREE.IcosahedronGeometry(0.2, 1);
    const spikeParts = [];
    const ico = new THREE.IcosahedronGeometry(1, 0), ip = ico.attributes.position, seenV = new Set();
    for (let i = 0; i < ip.count; i++) {
      const v = new THREE.Vector3(ip.getX(i), ip.getY(i), ip.getZ(i)).normalize();
      const key = v.toArray().map((x) => x.toFixed(3)).join(',');
      if (seenV.has(key)) continue; seenV.add(key);
      const stalk = new THREE.CylinderGeometry(0.018, 0.022, 0.13, 6); stalk.translate(0, 0.065, 0);
      const knob = new THREE.SphereGeometry(0.04, 8, 6); knob.translate(0, 0.14, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
      const rm = new THREE.Matrix4().makeRotationFromQuaternion(q);
      for (const g of [stalk, knob]) { g.applyMatrix4(rm); g.translate(v.x * 0.19, v.y * 0.19, v.z * 0.19); spikeParts.push(g); }
    }
    const capsidMat = surfMat({ albedo: 0x7a5bc4, sssCol: 0xc9a2ff, sss: 1.2, rough: 0.3, wet: 0.7, rim: 2.4, rimCol: 0xd9b8ff, emit: 0x1d0b3a, grain: 0.5 });
    const spikeMat = surfMat({ albedo: 0xe0c8ff, sssCol: 0xffd0f0, sss: 0.8, rough: 0.35, wet: 0.5, rim: 1.4, rimCol: 0xf3e2ff, emit: 0x2a1240 });
    virus.add(new THREE.Mesh(capsidGeo, capsidMat));
    virus.add(new THREE.Mesh(mergeGeos(spikeParts.map((g) => g.index ? g.toNonIndexed() : g)), spikeMat));
    virus.scale.setScalar(1.6);
    scene.add(virus);

    // --- pozostałe gatunki (C.species): każdy ma własną grupę i listę materiałów ---
    const sphereAt = (r, x, y, z, seg) => { const g = new THREE.SphereGeometry(r, seg || 14, 10); g.translate(x, y, z); return g.toNonIndexed(); };
    // gronkowiec: grono ziarenkowców
    const staph = new THREE.Group();
    const staphMat = surfMat({ albedo: 0xc9ac3e, sssCol: 0xffe27a, sss: 1.1, rough: 0.25, wet: 0.8, rim: 2.4, rimCol: 0xfff0a0, emit: 0x2a2205, grain: 0.6 });
    { const parts = [], P = [[0, 0, 0], [0.24, 0.05, 0.04], [-0.22, 0.1, -0.03], [0.05, 0.25, 0.08], [0.1, -0.23, -0.05], [-0.12, -0.18, 0.12], [-0.05, 0.08, 0.24], [0.2, 0.22, -0.12], [-0.25, -0.08, -0.15]];
      for (const q of P) parts.push(sphereAt(0.13, q[0], q[1], q[2]));
      staph.add(new THREE.Mesh(mergeGeos(parts), staphMat)); }
    scene.add(staph);
    // paciorkowiec: łańcuszek ziarenkowców (ogniwa falują)
    const strep = new THREE.Group();
    const strepMat = surfMat({ albedo: 0x37ab9c, sssCol: 0x7dffe8, sss: 1.1, rough: 0.25, wet: 0.8, rim: 2.4, rimCol: 0x9affee, emit: 0x063a32, grain: 0.6 });
    const strepLinks = [];
    { const g = new THREE.SphereGeometry(0.12, 14, 10); g.scale(1, 0.85, 1);
      for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(g, strepMat); strep.add(m); strepLinks.push(m); } }
    scene.add(strep);
    // wirus grypy: kulista otoczka z gęstymi kolcami
    const flu = new THREE.Group();
    const fluMat = surfMat({ albedo: 0xb24f8c, sssCol: 0xff9ad0, sss: 1.2, rough: 0.3, wet: 0.7, rim: 2.4, rimCol: 0xffc4e6, emit: 0x2e0a20, grain: 0.5 });
    const fluSpikeMat = surfMat({ albedo: 0xffd0ea, sssCol: 0xffe0f0, sss: 0.8, rough: 0.35, wet: 0.5, rim: 1.4, rimCol: 0xfff0f8, emit: 0x30101f });
    { flu.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), fluMat));
      const parts = [], n = 70, ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), a = i * ga, v = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
        const st = new THREE.CylinderGeometry(0.012, 0.016, 0.07, 5); st.translate(0, 0.035, 0);
        const kn = new THREE.SphereGeometry(0.022, 6, 4); kn.translate(0, 0.075, 0);
        const rm = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v));
        for (const g of [st, kn]) { g.applyMatrix4(rm); g.translate(v.x * 0.19, v.y * 0.19, v.z * 0.19); parts.push(g.toNonIndexed()); }
      }
      flu.add(new THREE.Mesh(mergeGeos(parts), fluSpikeMat)); }
    flu.scale.setScalar(1.6); scene.add(flu);
    // wirus Coxsackie: mały, gładki dwudziestościan bez otoczki
    const cox = new THREE.Group();
    const coxMat = surfMat({ albedo: 0x5b46c8, sssCol: 0xa894ff, sss: 1.0, rough: 0.2, wet: 0.8, rim: 2.8, rimCol: 0xc8bcff, emit: 0x140a3a, grain: 0.3 });
    { const g = new THREE.IcosahedronGeometry(0.17, 0).toNonIndexed(); g.computeVertexNormals(); cox.add(new THREE.Mesh(g, coxMat)); }
    cox.scale.setScalar(1.6); scene.add(cox);

    // drożdżak Candida: owalna komórka z pączkiem i krótką strzępką rzekomą
    const cand = new THREE.Group();
    const candMat = surfMat({ albedo: 0xe9dfc2, sssCol: 0xfff3cf, sss: 1.1, rough: 0.35, wet: 0.7, rim: 2.2, rimCol: 0xfff6dc, emit: 0x2a2416, grain: 0.8 });
    { const parts = [];
      const cell = new THREE.SphereGeometry(0.24, 18, 12); cell.scale(1, 1.35, 1); parts.push(cell.toNonIndexed());
      const bud = new THREE.SphereGeometry(0.13, 14, 10); bud.scale(1, 1.2, 1); bud.translate(0.12, 0.36, 0.04); parts.push(bud.toNonIndexed());
      // strzępka rzekoma: wydłużone ogniwa z przewężeniami
      for (let k = 0; k < 3; k++) { const g = new THREE.SphereGeometry(0.1, 10, 8); g.scale(1, 2.0, 1); g.translate(-0.05 - k * 0.03, -0.42 - k * 0.36, -0.02 * k); parts.push(g.toNonIndexed()); }
      cand.add(new THREE.Mesh(mergeGeos(parts), candMat)); }
    scene.add(cand);

    // komórka nowotworowa: duża, nieregularna (pęcherzyki na błonie), z ciemnym jądrem prześwitującym przez cytoplazmę
    const canc = new THREE.Group();
    const cancMat = surfMat({ albedo: 0x9a4a6e, sssCol: 0xe07aa0, sss: 0.7, rough: 0.4, wet: 0.6, rim: 0.9, rimCol: 0xf0a0c0, emit: 0x1a0610, grain: 1.0, alpha: 0.7, depthWrite: false });
    const cancNucMat = surfMat({ albedo: 0x3a1050, sssCol: 0x8040b0, sss: 0.6, rough: 0.3, wet: 0.5, rim: 0.6, rimCol: 0x9060c0, emit: 0x10031a, grain: 0.8 });
    { const g = new THREE.IcosahedronGeometry(0.34, 3).toNonIndexed(), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {   // nieregularny kształt: deterministyczne wybrzuszenia
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.16 * Math.sin(x * 11 + y * 7) + 0.1 * Math.sin(y * 13 - z * 9);
        p.setXYZ(i, x * k, y * k * 1.1, z * k);
      }
      g.computeVertexNormals();
      const parts = [g];
      for (let k = 0; k < 7; k++) { const a = k * 2.4, b = new THREE.SphereGeometry(0.07 + (k % 3) * 0.02, 8, 6); b.translate(Math.cos(a) * 0.36, Math.sin(a * 1.3) * 0.33, Math.sin(a) * 0.3); parts.push(b.toNonIndexed()); }
      canc.add(new THREE.Mesh(mergeGeos(parts), cancMat));
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), cancNucMat); nuc.scale.set(1, 0.85, 1); canc.add(nuc); }
    scene.add(canc);

    // wygląd -> grupa, materiały do efektów (błysk trafienia, spowolnienie), czy to wirus
    const LOOKS = {
      ecoli: { g: bact, mats: [body.material, flagMat] },
      staph: { g: staph, mats: [staphMat] },
      strep: { g: strep, mats: [strepMat] },
      adeno: { g: virus, mats: [capsidMat, spikeMat], virus: true },
      flu: { g: flu, mats: [fluMat, fluSpikeMat], virus: true },
      coxsackie: { g: cox, mats: [coxMat], virus: true },
      candida: { g: cand, mats: [candMat] },
      cancer: { g: canc, mats: [cancMat, cancNucMat] }
    };
    const lookOf = (s) => LOOKS[s.species] || (s.kind === 'virus' ? LOOKS.adeno : LOOKS.ecoli);

    // --- przeciwciała ---
    const abMax = 120;
    const abMesh = new THREE.InstancedMesh(antibodyGeometry(), surfMat({
      albedo: 0xf2deb0, sssCol: 0xffe6a0, sss: 0.6, rough: 0.35, wet: 0.5, rim: 1.2, rimCol: 0xfff0c0, emit: 0x3a2a08
    }), abMax);
    abMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); abMesh.frustumCulled = false; abMesh.count = 0;
    scene.add(abMesh);

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), e = new THREE.Euler();
    const g2 = [0, 0];

    // --- kolonie: biofilm bakterii (zielony), zakażone komórki wirusa (fioletowe), grzybnia (kremowa) ---
    const colMax = 600;
    const COL_LOOK = {
      bacteria: { albedo: 0x7fbf3a, sssCol: 0xc8ff60, rimCol: 0xd8ff80, emit: 0x0c1a02 },
      virus: { albedo: 0x9a5fd0, sssCol: 0xe0a0ff, rimCol: 0xeccbff, emit: 0x1a0830 },
      fungus: { albedo: 0xe6dcc0, sssCol: 0xfff2cc, rimCol: 0xfff8e4, emit: 0x1e1a10 },
      cancer: { albedo: 0x7a2a48, sssCol: 0xd06088, rimCol: 0xe090b0, emit: 0x180410 }
    };
    // naczynia guza (angiogeneza): ciemnoczerwone, kręte odgałęzienia wokół dużych guzów
    const vesMax = 900;
    const vesMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 1, 6, 1).translate(0, 0.5, 0), surfMat({ albedo: 0x8a1420, sssCol: 0xff3040, sss: 1.0, rough: 0.3, wet: 0.9, rim: 0.8, rimCol: 0xff8090, emit: 0x200206 }), vesMax);
    vesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); vesMesh.frustumCulled = false; vesMesh.count = 0;
    scene.add(vesMesh);
    // grzybnia: strzępki wzdłuż ścian (odcinki walców) i zarodniki w magazynach (złotobrązowe kulki)
    const hyMax = 1600, spMax = 400;
    const hyGeo = new THREE.CylinderGeometry(0.045, 0.055, 1, 6, 1); hyGeo.translate(0, 0.5, 0);
    const hyMesh = new THREE.InstancedMesh(hyGeo, surfMat({ albedo: 0xeee6cc, sssCol: 0xfff4d6, sss: 1.0, rough: 0.4, wet: 0.6, rim: 1.6, rimCol: 0xfffaea, emit: 0x1c1810 }), hyMax);
    hyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); hyMesh.frustumCulled = false; hyMesh.count = 0;
    scene.add(hyMesh);
    const spMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 1), surfMat({ albedo: 0xb88a3a, sssCol: 0xffc860, sss: 0.9, rough: 0.3, wet: 0.6, rim: 1.4, rimCol: 0xffe0a0, emit: 0x2a1a04, grain: 0.6 }), spMax);
    spMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); spMesh.frustumCulled = false; spMesh.count = 0;
    scene.add(spMesh);
    const walk = [], a3 = new THREE.Vector3(), b3 = new THREE.Vector3();
    // odcinek walca od a3 do b3
    function seg(mesh, idx, ax, ay, az, bx, by, bz, th) {
      a3.set(ax, ay, az); b3.set(bx, by, bz); dir.subVectors(b3, a3);
      const len = dir.length(); if (len < 1e-4) return false; dir.divideScalar(len);
      q.setFromUnitVectors(up, dir); s3.set(th, len, th); m4.compose(a3, q, s3); mesh.setMatrixAt(idx, m4);
      return true;
    }
    let colKind = 'bacteria';
    const colMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 2), surfMat({
      albedo: 0x7fbf3a, sssCol: 0xc8ff60, sss: 1.0, rough: 0.2, wet: 1.0, rim: 1.0, rimCol: 0xd8ff80, emit: 0x0c1a02, grain: 0.5
    }), colMax);
    colMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); colMesh.frustumCulled = false; colMesh.count = 0;
    scene.add(colMesh);

    // --- pożywienie we krwi: glukoza (kryształki), aminokwasy (bursztynowe kuleczki), lipidy (żółte kropelki) ---
    const foodMax = 200;
    const FOOD_LOOK = {
      glucose: { geo: new THREE.OctahedronGeometry(0.11, 0), mat: { albedo: 0xf4f7ff, sssCol: 0xd8e8ff, sss: 0.5, rough: 0.12, wet: 1.0, rim: 1.6, rimCol: 0xffffff, emit: 0x202630 } },
      amino:   { geo: new THREE.IcosahedronGeometry(0.09, 1), mat: { albedo: 0xd98a2b, sssCol: 0xffb040, sss: 0.9, rough: 0.3, wet: 0.7, rim: 1.2, rimCol: 0xffd28a, emit: 0x2a1404 } },
      lipid:   { geo: new THREE.SphereGeometry(0.13, 12, 8), mat: { albedo: 0xf2d25a, sssCol: 0xfff080, sss: 1.2, rough: 0.08, wet: 1.0, rim: 1.8, rimCol: 0xfff4b0, emit: 0x2a2204, alpha: 0.85 } }
    };
    const foodMesh = {};
    for (const k in FOOD_LOOK) {
      const m = new THREE.InstancedMesh(FOOD_LOOK[k].geo, surfMat(FOOD_LOOK[k].mat), foodMax);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
      scene.add(m); foodMesh[k] = m;
    }

    // --- kopie patogenu: te same siatki co oryginał (wabiki mają wyglądać identycznie) ---
    // pula kopii budowana dla bieżącego gatunku (klony dzielą materiały z oryginałem)
    let copyPool = [], copyLook = null;
    function ensureCopies(L) {
      if (copyLook === L) return;
      for (const g of copyPool) scene.remove(g);
      copyPool = []; copyLook = L;
      for (let i = 0; i < C.copies.max; i++) { const g = L.g.clone(); g.visible = false; scene.add(g); copyPool.push(g); }
    }

    // --- płatki zastawek ---
    // płatek: zakrzywiona błona od dna do brzegu przekroju, brzeg wolny falisty i niższy przy końcu
    const leafGeo = (function () {
      const nu = 16, nv = 18, pos = [], idx = [];
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
        const u = i / nu, v = j / nv;
        const top = 2.0 - 2.4 * u * u + 0.25 * Math.sin(u * 11.0);
        const z = -5.2 + v * (top + 5.2);
        const bulge = Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.32 * (0.4 + 0.6 * v);
        pos.push(u, bulge, z);
      }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
        idx.push(a, b, d, a, d, c);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      return g;
    })();
    const leafMat = surfMat({ albedo: 0xd8a89e, sssCol: 0xff7a68, sss: 1.4, rough: 0.25, wet: 1.0, rim: 0.5, rimCol: 0xffd0c4, alpha: 0.82, side: THREE.DoubleSide, depthWrite: false });
    const leaves = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(leafGeo, leafMat); m.frustumCulled = false; scene.add(m); leaves.push(m); }

    // --- struny ścięgniste ---
    const chordGeo = new THREE.CylinderGeometry(0.05, 0.07, 1, 6, 1); chordGeo.translate(0, 0.5, 0);
    const chordMesh = new THREE.InstancedMesh(chordGeo, surfMat({ albedo: 0xf0e2dc, sssCol: 0xff8070, sss: 0.6, rough: 0.3, wet: 0.8, rim: 0.4, rimCol: 0xcfe0ff }), 40);
    chordMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); chordMesh.frustumCulled = false;
    scene.add(chordMesh);

    // --- mięśnie brodawkowate (stałe) ---
    const papPts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; papPts.push(new THREE.Vector2(Math.max(0.05, 1.7 * Math.pow(1 - t, 1.4) + 0.12), t * 3.3)); }
    const papGeo = new THREE.LatheGeometry(papPts, 18); papGeo.rotateX(Math.PI / 2);
    const papMat = surfMat({ albedo: 0x8c2a24, sssCol: 0xff3020, sss: 1.0, rough: 0.3, wet: 0.9 });
    const seen = new Set();
    for (const ch of state0.chords) {
      const key = ch.pap[0].toFixed(2) + ',' + ch.pap[1].toFixed(2);
      if (seen.has(key)) continue; seen.add(key);
      const m = new THREE.Mesh(papGeo, papMat); m.position.set(ch.pap[0], ch.pap[1], -5.2); scene.add(m);
    }

    let animT = 0;

    A.update = function (s, dt) {
      animT += dt;
      const b = s.bact;
      // patogen: grupa wybranego gatunku
      const L = lookOf(s), isVirus = !!L.virus;
      const showP = !b.transit && !b.dead;
      for (const k in LOOKS) if (LOOKS[k] !== L) LOOKS[k].g.visible = false;
      L.g.visible = showP;
      const slowV = b.slowT > 0 ? Math.min(1, b.slowT) : 0;
      for (const m of L.mats) { m.uniforms.uTimeL.value = animT; m.uniforms.uFlash.value = b.hitFlash; m.uniforms.uSlow.value = slowV; }
      if (isVirus) {
        L.g.position.set(b.x, b.y, b.z || 0);
        L.g.rotation.set(animT * 0.7, animT * 0.45, animT * 0.3);
        L.g.scale.setScalar(1.6 * (0.85 + 0.15 * b.hp / C.virus.hp));
      }
      // łańcuszek paciorkowca falujący w nurcie
      const chainPose = (links, ph) => {
        let x = 0, y = 0;
        links.forEach((m, i) => { m.position.set(x, y, Math.sin(ph + i) * 0.04); const a = Math.sin(ph * 0.8 + i * 0.9) * 0.35; x += Math.sin(a) * 0.22; y -= Math.cos(a) * 0.22; });
        const cx = x / 2, cy = y / 2; links.forEach((m) => { m.position.x -= cx; m.position.y -= cy; });
      };
      if (L.g === strep) chainPose(strepLinks, animT * 2.2);
      if (colKind !== s.kind) {
        colKind = s.kind || 'bacteria';
        const L = COL_LOOK[colKind] || COL_LOOK.bacteria, u = colMesh.material.uniforms;
        u.uAlbedo.value.set(L.albedo); u.uSssCol.value.set(L.sssCol); u.uRimCol.value.set(L.rimCol); u.uEmit.value.set(L.emit);
      }
      if (!isVirus) {
        const g = L.g;
        g.position.set(b.x, b.y, b.z || 0);
        g.rotation.set(0, 0, b.dir - Math.PI / 2);
        g.rotateY(Math.sin(animT * 3) * 0.25);
        if (g === staph) g.rotateX(animT * 0.6);
        const sp = Math.hypot(b.vx, b.vy);
        flagMat.uniforms.uTimeL.value = animT * (0.6 + sp * 0.25);
        g.scale.setScalar(0.85 + 0.15 * b.hp / C.bacteria.hp);
      }

      // pożywienie
      const fc = { glucose: 0, amino: 0, lipid: 0 };
      for (const f of s.food) {
        const m = foodMesh[f.kind]; if (!m || fc[f.kind] >= foodMax) continue;
        v.set(f.x, f.y, f.z || 0);
        e.set(animT * 0.6 + f.id, animT * 0.4 + f.id * 1.7, 0); q.setFromEuler(e);
        s3.setScalar(1 + 0.08 * Math.sin(animT * 3 + f.id));
        m4.compose(v, q, s3); m.setMatrixAt(fc[f.kind]++, m4);
      }
      for (const k in foodMesh) { foodMesh[k].count = fc[k]; foodMesh[k].instanceMatrix.needsUpdate = true; }

      // kopie patogenu
      ensureCopies(L);
      copyPool.forEach((P, i) => {
        const c = s.copies[i];
        P.visible = !!c;
        if (!c) return;
        // w ostatnich sekundach życia kopia maleje
        const left = C.copies.life - (s.time - (c.born ?? s.time)), sc = Math.max(0.15, Math.min(1, left / C.copies.fade));
        P.position.set(c.x, c.y, 0);
        if (isVirus) { P.rotation.set(animT * 0.7 + c.id, animT * 0.45, animT * 0.3); P.scale.setScalar(1.6 * sc); }
        else {
          P.rotation.set(0, 0, c.dir - Math.PI / 2);
          P.rotateY(Math.sin(animT * 3 + c.id) * 0.25);
          P.scale.setScalar(sc);
        }
      });

      // przeciwciała
      let n = 0;
      for (const a of s.antibodies) {
        if (n >= abMax) break;
        const z = a.stuck ? 0.15 * Math.sin(a.rot) : a.z;
        v.set(a.x, a.y, z);
        e.set(a.rot * 0.7, a.rot, a.rot * 0.3);
        if (a.stuck) { e.set(0, 0, Math.atan2(a.oy, a.ox) + Math.PI / 2); }
        q.setFromEuler(e);
        const fade = Math.min(1, a.life * 0.5);
        s3.setScalar(1.4 * fade);
        m4.compose(v, q, s3); abMesh.setMatrixAt(n++, m4);
      }
      abMesh.count = n; abMesh.instanceMatrix.needsUpdate = true;

      // kolonie: każda kolonia = skupisko kulek na ścianie
      n = 0;
      const isCancer = s.kind === 'cancer';
      for (const c of s.colonies) {
        const grow = Math.min(1, (s.time - c.born) * 0.5) * (0.45 + 0.9 * Math.min(1, c.size ?? 1)) * (isCancer ? 1.15 : 1);
        const nk = isCancer ? 9 + Math.round(Math.max(0, c.size - 0.5) * 10) : 9;   // guz: tym więcej guzków, im większy
        const spread = isCancer ? 1 + Math.max(0, c.size - 0.6) * 0.9 : 1;
        for (let k = 0; k < nk && n < colMax; k++) {
          const h1 = Math.sin(c.seed * 91.7 + k * 12.9898) * 43758.5453, r1 = h1 - Math.floor(h1);
          const h2 = Math.sin(c.seed * 37.1 + k * 78.233) * 12345.678, r2 = h2 - Math.floor(h2);
          const ang = r1 * 6.283, rad = r2 * 0.55 * spread;
          const tx = -c.ny, ty = c.nx;
          if (c.inTissue) v.set(c.x + Math.cos(ang) * rad * 1.3, c.y + Math.sin(ang) * rad * 1.3, C.tissue.z + 0.05 + r2 * 0.12);
          else v.set(c.x + tx * Math.cos(ang) * rad - c.nx * 0.05, c.y + ty * Math.cos(ang) * rad - c.ny * 0.05, Math.sin(ang) * rad * 1.6);
          s3.setScalar(grow * (0.6 + r2 * 0.9) * (1 + 0.06 * Math.sin(animT * 2 + k)));
          m4.compose(v, q.identity(), s3); colMesh.setMatrixAt(n++, m4);
        }
      }
      colMesh.count = n; colMesh.instanceMatrix.needsUpdate = true;

      // grzybnia: strzępka każdej kolonii wzdłuż ściany (z bocznymi odgałęzieniami) i zarodniki magazynów
      let nh = 0, ns = 0;
      if (s.kind === 'fungus') {
        const FU = C.fungus;
        for (const c of s.colonies) {
          if (c.store) {
            for (let k = 0; k < 14 && ns < spMax; k++) {
              const h1 = Math.sin(c.seed * 51.3 + k * 9.17) * 43758.5453, r1 = h1 - Math.floor(h1);
              const h2 = Math.sin(c.seed * 17.9 + k * 41.7) * 24634.634, r2 = h2 - Math.floor(h2);
              const ang = r1 * 6.283, rad = 0.25 + r2 * 0.55;
              v.set(c.x + Math.cos(ang) * rad - (c.inTissue ? 0 : c.nx * 0.25), c.y + Math.sin(ang) * rad - (c.inTissue ? 0 : c.ny * 0.25),
                (c.inTissue ? C.tissue.z + 0.2 : 0) + Math.sin(ang * 2) * rad * 1.2 + 0.05 * Math.sin(animT * 2 + k));
              s3.setScalar((0.7 + r2 * 0.6) * Math.min(1, 0.5 + c.size)); m4.compose(v, q.identity(), s3); spMesh.setMatrixAt(ns++, m4);
            }
          }
          if (c.inTissue || !c.hy) continue;
          const len = Math.min(c.hy, FU.branchLen);
          const P = H.wallWalk(c.x, c.y, c.hs || 1, len, c.seed, walk);
          const zOf = (i) => 0.35 * Math.sin(i * 0.45 + c.seed * 20) + 0.15 * Math.sin(i * 1.3);
          for (let i = 0; i + 3 < P.length && nh < hyMax; i += 2) {
            const k = i / 2;
            if (seg(hyMesh, nh, P[i], P[i + 1], zOf(k), P[i + 2], P[i + 3], zOf(k + 1), 1)) nh++;
            // boczne odgałęzienie co trzeci odcinek: krótka strzępka odchodząca od ściany w głąb naczynia i w bok
            if (k % 3 === 1 && nh < hyMax) {
              const h = Math.sin(c.seed * 77 + k * 3.1) * 9999, r = h - Math.floor(h);
              const L = 0.5 + r * 0.7, side = r < 0.5 ? -1 : 1;
              H.grad(P[i], P[i + 1], g2);
              if (seg(hyMesh, nh, P[i], P[i + 1], zOf(k), P[i] - g2[0] * L * 0.6 + g2[1] * L * 0.5 * side, P[i + 1] - g2[1] * L * 0.6 - g2[0] * L * 0.5 * side, zOf(k) + (r - 0.5) * L, 0.7)) nh++;
            }
          }
        }
      }
      hyMesh.count = nh; hyMesh.instanceMatrix.needsUpdate = true;
      // naczynia guzów (rak z mutacją angiogenezy): promieniste, rozgałęzione rurki od guza
      let nv = 0;
      if (s.kind === 'cancer' && s.bact.mut && s.bact.mut.angio) {
        for (const c of s.colonies) {
          if (c.size < C.cancer.smallCap * 0.8) continue;
          const nb = 4 + Math.round(c.size * 3), zc = c.inTissue ? C.tissue.z + 0.1 : 0;
          for (let k = 0; k < nb && nv < vesMax - 3; k++) {
            const h = Math.sin(c.seed * 63.1 + k * 17.3) * 43758.5453, r = h - Math.floor(h);
            const a = k / nb * 6.283 + r * 0.6, L = 0.8 + c.size * 0.9 + r * 0.6;
            let x0 = c.x, y0 = c.y, z0 = zc;
            for (let j = 0; j < 3 && nv < vesMax; j++) {   // trzy kręte odcinki z małym rozwidleniem
              const aj = a + Math.sin(k * 3.1 + j * 1.7 + c.seed * 9) * 0.5, l = L / 3;
              const x1 = x0 + Math.cos(aj) * l, y1 = y0 + Math.sin(aj) * l, z1 = zc + Math.sin(k + j * 2.3) * 0.4;
              if (seg(vesMesh, nv, x0, y0, z0, x1, y1, z1, 1 - j * 0.25)) nv++;
              if (j === 1 && nv < vesMax && seg(vesMesh, nv, x1, y1, z1, x1 + Math.cos(aj + 0.9) * l * 0.6, y1 + Math.sin(aj + 0.9) * l * 0.6, z1, 0.5)) nv++;
              x0 = x1; y0 = y1; z0 = z1;
            }
          }
        }
      }
      vesMesh.count = nv; vesMesh.instanceMatrix.needsUpdate = true;
      spMesh.count = ns; spMesh.instanceMatrix.needsUpdate = true;

      // zastawki
      s.leaflets.forEach((L, i) => {
        const m = leaves[i]; if (!m) return;
        m.position.set(L.hinge[0], L.hinge[1], 0);
        m.rotation.set(0, 0, L.ang);
        m.scale.set(L.len, 1, 1);
      });
      // struny
      let k = 0;
      for (const ch of s.chords) {
        v.set(ch.a[0], ch.a[1], ch.a[2]);
        dir.set(ch.b[0] - ch.a[0], ch.b[1] - ch.a[1], ch.b[2] - ch.a[2]);
        const len = dir.length(); dir.divideScalar(len);
        q.setFromUnitVectors(up, dir); s3.set(1, len, 1);
        m4.compose(v, q, s3); chordMesh.setMatrixAt(k++, m4);
      }
      chordMesh.count = k; chordMesh.instanceMatrix.needsUpdate = true;
    };
    return A;
  };
})();
