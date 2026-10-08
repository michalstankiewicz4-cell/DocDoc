// Biom mięśnia sercowego: kardiomiocyty (prążkowanie, jądra, wstawki) i włókna kolagenu na powierzchni przekroju ściany.
// Komórki pochodzą z DD.TissueCells — tych samych, które są przeszkodami dla patogenu.
(function () {
  const C = DD.CONFIG, GL = DD.GLSL;
  const T = C.tissue;

  const CELL_VERT = /* glsl */`
    varying vec3 vN; varying vec3 vP; varying vec3 vLocal; varying vec3 vCol;
    void main(){
      mat4 m = modelMatrix * instanceMatrix;
      vec4 wp = m * vec4(position, 1.0);
      vP = wp.xyz;
      // normalna dla skalowania niejednorodnego
      vN = normalize(mat3(m) * (normal / vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz))));
      vLocal = position;
      #ifdef USE_INSTANCING_COLOR
        vCol = instanceColor;
      #else
        vCol = vec3(1.0);
      #endif
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const CELL_FRAG = GL.NOISE + GL.LIGHT + /* glsl */`
    varying vec3 vN; varying vec3 vP; varying vec3 vLocal; varying vec3 vCol;
    void main(){
      vec3 N = normalize(vN);
      float y = vLocal.y;
      // prążkowanie poprzeczne (sarkomery)
      float band = smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(y * 95.0 + vCol.g * 20.0));
      vec3 alb = mix(vec3(0.46, 0.085, 0.075), vec3(0.62, 0.15, 0.13), band);
      alb *= 0.85 + 0.3 * vCol.r;
      // jądro komórkowe w środku
      float nuc = 1.0 - smoothstep(0.30, 0.40, length(vec2(vLocal.x * 1.0, y * 5.5)));
      alb = mix(alb, vec3(0.30, 0.09, 0.26), nuc * 0.85);
      // wstawki (połączenia między komórkami) na końcach
      float disc = smoothstep(0.86, 0.93, abs(y)) * (1.0 - smoothstep(0.96, 1.0, abs(y)));
      alb = mix(alb, vec3(0.92, 0.66, 0.58), disc * 0.8);
      float fine = fbm3(vLocal.xy * 9.0 + vCol.b * 7.0);
      alb *= 0.9 + 0.2 * fine;
      vec3 col = shade(vP, N, alb, 0.32, 0.55, 1.3, vec3(1.0, 0.25, 0.15));
      col = bloodFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function hash(i, j, k) {
    let h = (i * 73856093 ^ j * 19349663 ^ k * 83492791) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    return ((h ^ (h >>> 13)) >>> 0) / 4294967295;
  }

  DD.createBiome = function (scene) {
    const MAX = 900;
    const cellGeo = new THREE.SphereGeometry(1, 22, 14);
    const cellMat = new THREE.ShaderMaterial({ vertexShader: CELL_VERT, fragmentShader: CELL_FRAG, uniforms: Object.assign({}, DD.SHARED) });
    const cells = new THREE.InstancedMesh(cellGeo, cellMat, MAX);
    cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cells.frustumCulled = false; cells.count = 0;
    const col = new THREE.Color();
    for (let i = 0; i < MAX; i++) { col.setRGB(Math.random(), Math.random(), Math.random()); cells.setColorAt(i, col); }
    cells.instanceColor.needsUpdate = true;
    scene.add(cells);

    // kolagen: cienkie, jasne włókna leżące między komórkami
    const FMAX = 500;
    const fibGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true); fibGeo.rotateZ(Math.PI / 2);
    const fibMat = DD.surfMat({ albedo: 0xa88f78, sssCol: 0xe8c8a8, sss: 0.4, rough: 0.5, wet: 0.3, rim: 0.2, rimCol: 0xf0dcc8 });
    const fibers = new THREE.InstancedMesh(fibGeo, fibMat, FMAX);
    fibers.instanceMatrix.setUsage(THREE.DynamicDrawUsage); fibers.frustumCulled = false; fibers.count = 0;
    scene.add(fibers);

    const near = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), zAxis = new THREE.Vector3(0, 0, 1);
    let lastKey = '';

    function update(s, cx, cy, viewH, aspect) {
      // komórki widać przy zbliżeniu; przy dużym oddaleniu wystarcza tekstura tkanki
      const r = Math.min(viewH * Math.max(1, aspect) * 0.75 + 2, 26);
      const visible = viewH < 40;
      cells.visible = fibers.visible = visible;
      if (!visible) return;
      const key = Math.round(cx * 2) + ',' + Math.round(cy * 2) + ',' + Math.round(r);
      if (key === lastKey) return;      // układ zmienia się tylko przy ruchu kamery
      lastKey = key;
      DD.TissueCells.near(cx, cy, r, near);
      let n = 0;
      for (const c of near) {
        if (n >= MAX) break;
        v.set(c.cx, c.cy, T.z - 0.24);
        q.setFromAxisAngle(zAxis, c.ang - Math.PI / 2);
        s3.set(c.b, c.a, c.b * 0.85);
        m4.compose(v, q, s3); cells.setMatrixAt(n++, m4);
      }
      cells.count = n; cells.instanceMatrix.needsUpdate = true;

      // włókna kolagenu: osobna siatka z hashowanym przesunięciem
      const G = 2.6; let f = 0;
      const i0 = Math.floor((cx - r) / G), i1 = Math.floor((cx + r) / G), j0 = Math.floor((cy - r) / G), j1 = Math.floor((cy + r) / G);
      for (let i = i0; i <= i1 && f < FMAX; i++) for (let j = j0; j <= j1 && f < FMAX; j++) {
        const x = (i + hash(i, j, 1)) * G, y = (j + hash(i, j, 2)) * G;
        if (!DD.TissueCells.inMuscle(x, y)) continue;
        const g = DD.Heart.grad(x, y);
        const ang = Math.atan2(g[1], g[0]) + Math.PI / 2 + (hash(i, j, 3) - 0.5) * 1.1;
        const len = 0.8 + hash(i, j, 4) * 1.6;
        v.set(x, y, T.z - 0.02);
        q.setFromAxisAngle(zAxis, ang);
        s3.set(len, 0.014 + hash(i, j, 5) * 0.01, 0.014);
        m4.compose(v, q, s3); fibers.setMatrixAt(f++, m4);
      }
      fibers.count = f; fibers.instanceMatrix.needsUpdate = true;
    }
    return { update };
  };
})();
