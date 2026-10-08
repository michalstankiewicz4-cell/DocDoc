// Krwinki czerwone (instancing, kształt dwuwklęsły z równania Evansa–Funga) i drobiny osocza.
// Komórki żyją tylko w "oknie" wokół kamery i są niesione tym samym polem przepływu co bakteria.
(function () {
  const C = DD.CONFIG, H = DD.Heart, F = DD.Flow, GL = DD.GLSL;

  function rbcGeometry(R) {
    // z(r) = sqrt(1-(r/R)^2) * (C0 + C2 (r/R)^2 + C4 (r/R)^4), wartości w µm przeskalowane
    const C0 = 0.81, C2 = 7.83, C4 = -4.39, Rum = 3.91, k = R / Rum;
    const pts = [], n = 18;
    const half = (t) => 0.5 * Math.sqrt(Math.max(0, 1 - t * t)) * (C0 + C2 * t * t + C4 * t * t * t * t) * k;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2(Math.max(0.0001, t * R), -half(t))); }
    for (let i = n - 1; i >= 0; i--) { const t = i / n; pts.push(new THREE.Vector2(Math.max(0.0001, t * R), half(t))); }
    const g = new THREE.LatheGeometry(pts, 22);
    g.computeVertexNormals();
    return g;
  }

  const VERT = /* glsl */`
    varying vec3 vN; varying vec3 vP; varying vec3 vLocal; varying vec3 vCol;
    void main(){
      mat4 m = modelMatrix * instanceMatrix;
      vec4 wp = m * vec4(position, 1.0);
      vP = wp.xyz; vN = normalize(mat3(m) * normal); vLocal = position;
      #ifdef USE_INSTANCING_COLOR
        vCol = instanceColor;
      #else
        vCol = vec3(1.0);
      #endif
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const FRAG = GL.NOISE + GL.LIGHT + /* glsl */`
    uniform float uThick;
    varying vec3 vN; varying vec3 vP; varying vec3 vLocal; varying vec3 vCol;
    void main(){
      vec3 N = normalize(vN);
      if (!gl_FrontFacing) N = -N;
      float rr = length(vLocal.xz) / 0.46;
      // środek krwinki jest cieńszy — prześwituje jaśniej
      float thin = 1.0 - smoothstep(0.0, 0.62, rr);
      vec3 alb = mix(vec3(0.50, 0.035, 0.03), vec3(0.85, 0.16, 0.10), thin * 0.65) * vCol;
      vec3 col = shade(vP, N, alb, 0.3, 0.45, 0.9, vec3(0.9, 0.12, 0.06));
      vec3 L = normalize(uLight - vP);
      float back = max(0.0, dot(-N, L));
      col += vec3(0.9, 0.12, 0.05) * back * (0.15 + thin * 0.4) * uLightPow * 0.12;
      col = bloodFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const SPECK_VERT = /* glsl */`
    uniform float uPx;
    attribute float aSize;
    varying float vA;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPx / -mv.z;
      vA = clamp(1.0 - (-mv.z) / 60.0, 0.0, 1.0);
      gl_Position = projectionMatrix * mv;
    }
  `;
  const SPECK_FRAG = /* glsl */`
    varying float vA;
    void main(){
      vec2 c = gl_PointCoord - 0.5; float r = dot(c, c) * 4.0;
      float a = exp(-r * 3.0) * vA;
      gl_FragColor = vec4(vec3(1.0, 0.55, 0.42) * a * 0.3, 1.0);
    }
  `;

  DD.createCells = function () {
    const max = C.cells.maxRBC;
    const geo = rbcGeometry(0.46);
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: Object.assign({ uThick: { value: 1 } }, DD.SHARED), side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const color = new THREE.Color();
    for (let i = 0; i < max; i++) {
      const v = 0.82 + Math.random() * 0.3;
      color.setRGB(v, v * (0.9 + Math.random() * 0.2), v);
      mesh.setColorAt(i, color);
    }
    mesh.instanceColor.needsUpdate = true;

    // stan cząstek (tylko wizualny)
    const P = new Float32Array(max * 3), Q = new Float32Array(max * 4), W = new Float32Array(max * 3), S = new Float32Array(max);
    const nSpeck = C.cells.plasmaSpecks;
    const speckPos = new Float32Array(nSpeck * 3), speckSize = new Float32Array(nSpeck);
    for (let i = 0; i < nSpeck; i++) speckSize[i] = 0.05 + Math.random() * 0.12;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(speckPos, 3).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('aSize', new THREE.BufferAttribute(speckSize, 1));
    const smat = new THREE.ShaderMaterial({
      vertexShader: SPECK_VERT, fragmentShader: SPECK_FRAG, uniforms: { uPx: { value: 600 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const specks = new THREE.Points(sg, smat);
    specks.frustumCulled = false;

    const win = { cx: 0, cy: 0, hx: 10, hy: 10 };
    const Z0 = -4.4, Z1 = 2.6;
    let active = 0;

    function place(i, cx, cy, hx, hy, arr, stride) {
      for (let t = 0; t < 12; t++) {
        const x = cx + (Math.random() * 2 - 1) * hx, y = cy + (Math.random() * 2 - 1) * hy;
        if (H.sample(x, y) < -0.6) {
          arr[i * stride] = x; arr[i * stride + 1] = y; arr[i * stride + 2] = Z0 + Math.random() * (Z1 - Z0);
          return true;
        }
      }
      arr[i * stride] = 1e4; arr[i * stride + 1] = 1e4; arr[i * stride + 2] = 0; return false;
    }
    function initRot(i) {
      const a = Math.random() * 6.283, b = Math.acos(Math.random() * 2 - 1), c = Math.random() * 6.283;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(a, b, c));
      Q[i * 4] = q.x; Q[i * 4 + 1] = q.y; Q[i * 4 + 2] = q.z; Q[i * 4 + 3] = q.w;
      W[i * 3] = (Math.random() - 0.5) * 2; W[i * 3 + 1] = (Math.random() - 0.5) * 2; W[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    const fv = [0, 0], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), dq = new THREE.Quaternion(),
      pos = new THREE.Vector3(), scl = new THREE.Vector3(), axis = new THREE.Vector3();
    let first = true;

    function update(dt, state, cx, cy, viewH, aspect) {
      const hy = viewH * 0.6 + 2.5, hx = viewH * aspect * 0.6 + 2.5;
      const zoomK = Math.min(1, Math.pow(17 / Math.max(17, viewH / 0.728), 1.3));
      const want = Math.min(max, Math.floor(C.cells.density * zoomK * (2 * hx) * (2 * hy) * (Z1 - Z0)));
      if (first || want > active) {
        for (let i = first ? 0 : active; i < want; i++) { place(i, cx, cy, hx, hy, P, 3); initRot(i); S[i] = 1; }
        for (let i = 0; i < nSpeck; i++) place(i, cx, cy, hx, hy, speckPos, 3);
        first = false;
      }
      active = want;
      const t = state.time, ph = state.phase;
      for (let i = 0; i < active; i++) {
        let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
        F.velocity(x, y, t, ph, fv);
        const sp = Math.hypot(fv[0], fv[1]);
        x += fv[0] * dt; y += fv[1] * dt;
        z += Math.sin(t * 0.7 + i) * 0.15 * dt;
        let bad = false;
        if (x < cx - hx) x += 2 * hx; else if (x > cx + hx) x -= 2 * hx; else if (y < cy - hy) y += 2 * hy; else if (y > cy + hy) y -= 2 * hy;
        const d = H.sample(x, y);
        if (d > -0.35) {
          if (d < 1.5 && Math.abs(x - P[i * 3]) < 3) { const g = H.grad(x, y); x -= g[0] * (d + 0.4); y -= g[1] * (d + 0.4); }
          else bad = true;
        }
        if (y > 53) bad = true;
        if (bad) { place(i, cx, cy, hx, hy, P, 3); S[i] = 0; initRot(i); x = P[i * 3]; y = P[i * 3 + 1]; z = P[i * 3 + 2]; }
        P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
        S[i] = Math.min(1, S[i] + dt * 2.5);
        // obrót — szybszy w silnym prądzie
        q.set(Q[i * 4], Q[i * 4 + 1], Q[i * 4 + 2], Q[i * 4 + 3]);
        axis.set(W[i * 3], W[i * 3 + 1], W[i * 3 + 2]).normalize();
        dq.setFromAxisAngle(axis, dt * (0.4 + sp * 0.12));
        q.multiply(dq);
        Q[i * 4] = q.x; Q[i * 4 + 1] = q.y; Q[i * 4 + 2] = q.z; Q[i * 4 + 3] = q.w;
        pos.set(x, y, z); scl.setScalar(S[i]);
        m4.compose(pos, q, scl);
        mesh.setMatrixAt(i, m4);
      }
      mesh.count = active;
      mesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < nSpeck; i++) {
        let x = speckPos[i * 3], y = speckPos[i * 3 + 1];
        F.velocity(x, y, t, ph, fv);
        x += fv[0] * dt * 1.05; y += fv[1] * dt * 1.05;
        if (x < cx - hx) x += 2 * hx; else if (x > cx + hx) x -= 2 * hx;
        if (y < cy - hy) y += 2 * hy; else if (y > cy + hy) y -= 2 * hy;
        if (H.sample(x, y) > -0.2 || y > 53) { place(i, cx, cy, hx, hy, speckPos, 3); continue; }
        speckPos[i * 3] = x; speckPos[i * 3 + 1] = y;
      }
      sg.attributes.position.needsUpdate = true;
    }

    return { mesh, specks, update, speckMat: smat };
  };
})();
