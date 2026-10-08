// Tkanka serca: gęsta siatka przemieszczana z mapy SDF.
// Dno jam (wsierdzie z beleczkami mięśniowymi), ściany, przecięty mięsień sercowy,
// nasierdzie z tkanką tłuszczową. Normalne liczone w shaderze z pola wysokości.
(function () {
  const C = DD.CONFIG, H = DD.Heart, GL = DD.GLSL;

  function halfFloat(val) { // float32 -> float16 (bity)
    const f = new Float32Array(1), i = new Int32Array(f.buffer);
    f[0] = val; const x = i[0];
    let bits = (x >> 16) & 0x8000, m = (x >> 12) & 0x07ff; const e = (x >> 23) & 0xff;
    if (e < 103) return bits;
    if (e > 142) { bits |= 0x7c00; return bits; }
    if (e < 113) { m |= 0x0800; bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1); return bits; }
    bits |= ((e - 112) << 10) | (m >> 1); bits += m & 1; return bits;
  }

  DD.makeSdfTexture = function (renderer) {
    const N = H.N;
    const data = new Uint16Array(N * N);
    for (let k = 0; k < N * N; k++) data[k] = halfFloat(Math.max(-30, Math.min(30, H.sdf[k])));
    const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.HalfFloatType);
    if (!renderer.capabilities.isWebGL2) {
      // WebGL1: zapasowo RGBA float
      const f = new Float32Array(N * N * 4);
      for (let k = 0; k < N * N; k++) f[k * 4] = H.sdf[k];
      const t1 = new THREE.DataTexture(f, N, N, THREE.RGBAFormat, THREE.FloatType);
      t1.magFilter = t1.minFilter = THREE.LinearFilter; t1.needsUpdate = true; return t1;
    }
    tex.internalFormat = 'R16F';
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  };

  const COMMON = /* glsl */`
    uniform sampler2D uSdf;
    uniform vec2 uWorldMin;
    uniform vec2 uWorldSize;
    uniform float uTime;
    uniform float uBeat;
    float sdfAt(vec2 p){ return texture2D(uSdf, (p - uWorldMin) / uWorldSize).r; }
    float baseH(float d){
      float wall = smoothstep(-0.25, 1.5, d);
      float h = mix(-5.0, 3.0, wall);
      h = mix(h, -16.0, smoothstep(7.5, 11.0, d));
      return h;
    }
  `;

  const VERT = COMMON + /* glsl */`
    varying vec3 vPos;
    varying float vSdf;
    void main(){
      vec3 p = position;
      float d = sdfAt(p.xy);
      float h = baseH(d);
      // skurcz: ściany lekko "puchną" ku środkowi, dno unosi się
      h += uBeat * 0.35 * (1.0 - smoothstep(-6.0, 0.0, d));
      p.z = h;
      vec4 wp = modelMatrix * vec4(p, 1.0);
      vPos = wp.xyz; vSdf = d;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const FRAG = COMMON + GL.NOISE + GL.LIGHT + GL.CAUSTIC + /* glsl */`
    varying vec3 vPos;
    varying float vSdf;

    float detailH(vec2 p, float d){
      float floorM = 1.0 - smoothstep(-1.2, 0.2, d);
      float topM = smoothstep(1.3, 1.9, d) * (1.0 - smoothstep(6.8, 8.0, d));
      // beleczki mięśniowe: grzbietowy szum, rozciągnięty i zawinięty
      vec2 w = vec2(fbm3(p * 0.12), fbm3(p * 0.12 + 7.3)) * 3.0;
      vec2 q = p * vec2(0.55, 0.32) + w;
      float r = 1.0 - abs(vnoise(q) * 2.0 - 1.0); r = r * r * r;
      float r2 = 1.0 - abs(vnoise(q * 2.3 + 3.1) * 2.0 - 1.0); r2 = r2 * r2;
      float trab = r * 1.0 + r2 * 0.35;
      // włókna przeciętego mięśnia
      float fib = sin(p.x * 2.6 + p.y * 0.8 + fbm3(p * 0.5) * 7.0) * 0.5 + 0.5;
      float wallM = max(0.0, 1.0 - floorM - topM);
      return floorM * trab * 0.9 + topM * (fib * 0.14 + vnoise(p * 2.3) * 0.12) + wallM * vnoise(p * 1.7) * 0.22;
    }
    float fullH(vec2 p){ float d = sdfAt(p); return baseH(d) + detailH(p, d); }

    void main(){
      vec2 p = vPos.xy;
      float d = vSdf;
      float e = 0.09;
      float hx = fullH(p + vec2(e, 0.)) - fullH(p - vec2(e, 0.));
      float hy = fullH(p + vec2(0., e)) - fullH(p - vec2(0., e));
      vec3 N = normalize(vec3(-hx / (2. * e), -hy / (2. * e), 1.0));

      float floorM = 1.0 - smoothstep(-1.2, 0.3, d);
      float topM = smoothstep(1.3, 1.9, d);
      float outerM = smoothstep(7.0, 9.5, d);
      float det = detailH(p, d);

      // barwy (liniowe)
      vec3 cLumen = vec3(0.36, 0.045, 0.040);
      vec3 cRidge = vec3(0.70, 0.20, 0.17);
      vec3 cMyo   = vec3(0.30, 0.055, 0.05);
      vec3 cEndo  = vec3(0.88, 0.66, 0.62);
      vec3 cFat   = vec3(0.34, 0.19, 0.045);
      vec3 cOut   = vec3(0.025, 0.006, 0.008);

      float n1 = fbm(p * 0.35);
      vec3 alb = mix(cLumen, cRidge, clamp(det * 0.9 + n1 * 0.25, 0., 1.) * floorM + (1. - floorM) * 0.35);
      // przecięty mięsień: smugi włókien i plamy
      vec3 myo = cMyo * (0.75 + 0.5 * n1) * (0.85 + 0.3 * sin(p.x * 2.6 + p.y * 0.8 + fbm3(p * 0.5) * 7.0));
      alb = mix(alb, myo, topM);
      // wsierdzie — jasna, cienka linia na krawędzi przekroju
      float rim = smoothstep(1.0, 1.4, d) * (1.0 - smoothstep(1.5, 2.0, d));
      alb = mix(alb, cEndo * 0.7, rim * 0.7);
      // nasierdzie z tłuszczem
      float fat = smoothstep(0.48, 0.62, fbm(p * 0.22 + 4.0)) * smoothstep(5.5, 7.0, d) * (1.0 - outerM);
      alb = mix(alb, cFat, fat);
      alb = mix(alb, cOut, outerM);

      float rough = mix(0.22, 0.6, topM);
      float wet = mix(1.0, 0.0, topM) * (1.0 - outerM) * (1.0 - fat);
      rough = mix(rough, 0.45, fat);
            vec3 col = shade(vPos, N, alb, rough, wet, 0.9 * (1.0 - outerM), vec3(0.9, 0.12, 0.08));

      // kaustyki na wilgotnym dnie i ścianach
      float lumenM = 1.0 - smoothstep(0.5, 1.6, d);
      vec2 cuv = p * 0.06 + vec2(uTime * 0.012, -uTime * 0.02);
      if (lumenM > 0.001) {
        float ca = caustic(cuv, uTime * 0.55) + 0.6 * caustic(cuv * 1.7 + 0.3, uTime * 0.7);
        ca = clamp(ca, 0.0, 3.0);
        float lightNear = 1.0 / (1.0 + 0.004 * dot(uLight - vPos, uLight - vPos));
        col += vec3(1.0, 0.55, 0.42) * ca * lumenM * 0.22 * uLightPow * lightNear;
      }

      // okluzja w zagłębieniach przy ścianach
      float ao = 1.0 - 0.6 * floorM * (1.0 - smoothstep(0.0, 2.6, -d));
      ao *= 0.75 + 0.25 * smoothstep(0.0, 0.8, det);
      col *= mix(1.0, ao, 1.0 - topM);

      col *= 1.0 + uBeat * 0.08;
      col = bloodFog(col, vPos);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  DD.createTissue = function (sdfTex) {
    const W = C.world;
    const w = W.maxX - W.minX, h = W.maxY - W.minY;
    const geo = new THREE.PlaneGeometry(w, h, 480, 464);
    geo.translate((W.minX + W.maxX) / 2, (W.minY + W.maxY) / 2, 0);
    const uniforms = Object.assign({
      uSdf: { value: sdfTex },
      uWorldMin: { value: new THREE.Vector2(W.minX, W.minY) },
      uWorldSize: { value: new THREE.Vector2(w, h) }
    }, DD.SHARED);
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return mesh;
  };
})();
