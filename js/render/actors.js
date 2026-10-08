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

    // --- przeciwciała ---
    const abMax = 120;
    const abMesh = new THREE.InstancedMesh(antibodyGeometry(), surfMat({
      albedo: 0xf2deb0, sssCol: 0xffe6a0, sss: 0.6, rough: 0.35, wet: 0.5, rim: 1.2, rimCol: 0xfff0c0, emit: 0x3a2a08
    }), abMax);
    abMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); abMesh.frustumCulled = false; abMesh.count = 0;
    scene.add(abMesh);

    // --- kolonie: biofilm bakterii (zielony) albo zakażone komórki wirusa (fioletowe) ---
    const colMax = 600;
    const COL_LOOK = {
      bacteria: { albedo: 0x7fbf3a, sssCol: 0xc8ff60, rimCol: 0xd8ff80, emit: 0x0c1a02 },
      virus: { albedo: 0x9a5fd0, sssCol: 0xe0a0ff, rimCol: 0xeccbff, emit: 0x1a0830 }
    };
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
    const copyPool = [];
    for (let i = 0; i < C.copies.max; i++) {
      const cb = bact.clone(), cv = virus.clone();
      cb.visible = cv.visible = false;
      scene.add(cb); scene.add(cv);
      copyPool.push({ b: cb, v: cv });
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

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), e = new THREE.Euler();
    let animT = 0;

    A.update = function (s, dt) {
      animT += dt;
      const b = s.bact;
      // patogen: bakteria albo wirus
      const isVirus = s.kind === 'virus';
      virus.visible = isVirus && !b.transit && !b.dead;
      if (isVirus) {
        virus.position.set(b.x, b.y, b.z || 0);
        virus.rotation.set(animT * 0.7, animT * 0.45, animT * 0.3);
        capsidMat.uniforms.uTimeL.value = animT;
        capsidMat.uniforms.uFlash.value = b.hitFlash;
        capsidMat.uniforms.uSlow.value = b.slowT > 0 ? Math.min(1, b.slowT) : 0;
        virus.scale.setScalar(1.6 * (0.85 + 0.15 * b.hp / C.virus.hp));
      }
      if (colKind !== s.kind) {
        colKind = s.kind || 'bacteria';
        const L = COL_LOOK[colKind] || COL_LOOK.bacteria, u = colMesh.material.uniforms;
        u.uAlbedo.value.set(L.albedo); u.uSssCol.value.set(L.sssCol); u.uRimCol.value.set(L.rimCol); u.uEmit.value.set(L.emit);
      }
      bact.visible = !isVirus && !b.transit && !b.dead;
      bact.position.set(b.x, b.y, b.z || 0);
      bact.rotation.set(0, 0, b.dir - Math.PI / 2);
      bact.rotateY(Math.sin(animT * 3) * 0.25);
      const sp = Math.hypot(b.vx, b.vy);
      flagMat.uniforms.uTimeL.value = animT * (0.6 + sp * 0.25);
      A.bodyMat.uniforms.uTimeL.value = animT;
      A.bodyMat.uniforms.uFlash.value = b.hitFlash;
      A.bodyMat.uniforms.uSlow.value = b.slowT > 0 ? Math.min(1, b.slowT) : 0;
      flagMat.uniforms.uSlow.value = A.bodyMat.uniforms.uSlow.value;
      const hpK = b.hp / C.bacteria.hp;
      bact.scale.setScalar(0.85 + 0.15 * hpK);

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
      copyPool.forEach((P, i) => {
        const c = s.copies[i];
        P.b.visible = !!c && !isVirus; P.v.visible = !!c && isVirus;
        if (!c) return;
        // w ostatnich sekundach życia kopia maleje
        const left = C.copies.life - (s.time - (c.born ?? s.time)), sc = Math.max(0.15, Math.min(1, left / C.copies.fade));
        if (isVirus) { P.v.position.set(c.x, c.y, 0); P.v.rotation.set(animT * 0.7 + c.id, animT * 0.45, animT * 0.3); P.v.scale.setScalar(1.6 * sc); }
        else {
          P.b.position.set(c.x, c.y, 0);
          P.b.rotation.set(0, 0, c.dir - Math.PI / 2);
          P.b.rotateY(Math.sin(animT * 3 + c.id) * 0.25);
          P.b.scale.setScalar(sc);
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
      for (const c of s.colonies) {
        const grow = Math.min(1, (s.time - c.born) * 0.5) * (0.45 + 0.9 * (c.size ?? 1));
        for (let k = 0; k < 9 && n < colMax; k++) {
          const h1 = Math.sin(c.seed * 91.7 + k * 12.9898) * 43758.5453, r1 = h1 - Math.floor(h1);
          const h2 = Math.sin(c.seed * 37.1 + k * 78.233) * 12345.678, r2 = h2 - Math.floor(h2);
          const ang = r1 * 6.283, rad = r2 * 0.55;
          const tx = -c.ny, ty = c.nx;
          if (c.inTissue) v.set(c.x + Math.cos(ang) * rad * 1.3, c.y + Math.sin(ang) * rad * 1.3, C.tissue.z + 0.05 + r2 * 0.12);
          else v.set(c.x + tx * Math.cos(ang) * rad - c.nx * 0.05, c.y + ty * Math.cos(ang) * rad - c.ny * 0.05, Math.sin(ang) * rad * 1.6);
          s3.setScalar(grow * (0.6 + r2 * 0.9) * (1 + 0.06 * Math.sin(animT * 2 + k)));
          m4.compose(v, q.identity(), s3); colMesh.setMatrixAt(n++, m4);
        }
      }
      colMesh.count = n; colMesh.instanceMatrix.needsUpdate = true;

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
