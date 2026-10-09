// Post-processing (własny łańcuch, bez zależności):
// HDR -> bloom (3 poziomy) + głębia ostrości z bufora głębi -> aberracja chromatyczna,
// falowanie gorąca przy gorączce, ACES, winieta, ziarno.
// Filtr pixel art (Tab, ustawienie lokalne każdego gracza), DD.pixelArt:
//   0 — zwykły obraz, 1 — duże piksele, mniej odcieni, dithering Bayera,
//   2 — styl z dokumentacji pixel art: stała paleta, kontury z bufora głębi, bez ziarna / głębi ostrości / aberracji, słabsza poświata.
(function () {
  try { DD.pixelArt = Math.min(2, Math.max(0, parseInt(localStorage.getItem('patientzero-pixel'), 10) || 0)); } catch (e) { DD.pixelArt = 0; }
  DD.setPixelArt = function (mode) {
    DD.pixelArt = ((mode % 3) + 3) % 3;
    try { localStorage.setItem('patientzero-pixel', String(DD.pixelArt)); } catch (e) { /* bez zapisu */ }
  };

  const QUAD_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const BRIGHT = /* glsl */`
    uniform sampler2D tIn; uniform float uThresh; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tIn, vUv).rgb;
      float l = max(c.r, max(c.g, c.b));
      float k = max(0.0, l - uThresh); k = k * k / (k + 0.6);
      gl_FragColor = vec4(c * (k / max(l, 1e-4)), 1.0);
    }`;
  const BLUR = /* glsl */`
    uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
    void main(){
      vec3 s = texture2D(tIn, vUv).rgb * 0.2270270;
      s += texture2D(tIn, vUv + uDir * 1.3846153).rgb * 0.3162162;
      s += texture2D(tIn, vUv - uDir * 1.3846153).rgb * 0.3162162;
      s += texture2D(tIn, vUv + uDir * 3.2307692).rgb * 0.0702702;
      s += texture2D(tIn, vUv - uDir * 3.2307692).rgb * 0.0702702;
      gl_FragColor = vec4(s, 1.0);
    }`;
  const COPY = /* glsl */`uniform sampler2D tIn; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tIn, vUv).rgb, 1.0); }`;

  const COMPOSITE = /* glsl */`
    uniform sampler2D tScene; uniform sampler2D tDepth; uniform sampler2D tDof;
    uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3;
    uniform vec2 uRes; uniform float uTime; uniform float uNear; uniform float uFar; uniform float uFocus;
    uniform float uFever; uniform float uHit; uniform float uFade; uniform float uSlow; uniform float uExposure; uniform float uClean;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float linDepth(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    void main(){
      vec2 uv = vUv;
      // falowanie gorąca
      if (uFever > 0.001){
        float n = sin(uv.y * 38.0 + uTime * 3.1) * sin(uv.x * 27.0 - uTime * 2.3);
        uv += vec2(n, n * 0.6) * 0.0028 * uFever;
      }
      vec2 dc = uv - 0.5; float r2 = dot(dc, dc);
      float ab = (0.006 + uHit * 0.03) * r2 * 4.0 * (1.0 - uClean);
      vec3 col;
      col.r = texture2D(tScene, uv - dc * ab).r;
      col.g = texture2D(tScene, uv).g;
      col.b = texture2D(tScene, uv + dc * ab).b;
      // głębia ostrości: ostro w płaszczyźnie bakterii
      float ld = linDepth(texture2D(tDepth, uv).r);
      float coc = smoothstep(0.07, 0.42, abs(ld - uFocus) / uFocus) * (1.0 - uClean);
      col = mix(col, texture2D(tDof, uv).rgb, coc);
      vec3 bloom = texture2D(tB1, uv).rgb * 0.5 + texture2D(tB2, uv).rgb * 0.8 + texture2D(tB3, uv).rgb * 1.1;
      col += bloom * mix(0.4, 0.15, uClean);
      col *= uExposure;
      col = mix(col, col * vec3(1.15, 0.95, 0.8), uFever * 0.5);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(lum) * vec3(0.8, 0.95, 1.15), uSlow * 0.35);
      col = aces(col);
      col = pow(col, vec3(1.0 / 2.2));
      float vig = smoothstep(0.95, 0.28, length(dc * vec2(1.0, 1.08)));
      col *= mix(0.28, 1.0, vig);
      col = mix(col, vec3(0.95, 0.15, 0.12), uHit * 0.35 * (1.0 - vig));
      col += (hash(uv * uRes + fract(uTime) * 61.0) - 0.5) * 0.04 * (1.0 - uClean);
      col *= 1.0 - uFade;
      gl_FragColor = vec4(col, 1.0);
    }`;

  // pixel art: średnia z 4 próbek w bloku uPs × uPs, potem uLevels poziomów na kanał z ditheringiem 4×4
  const PIXEL = /* glsl */`
    uniform sampler2D tIn; uniform vec2 uRes; uniform float uPs; uniform float uLevels; uniform float uDither; varying vec2 vUv;
    float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
    float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    void main(){
      vec2 cell = floor(vUv * uRes / uPs);
      vec2 c = (cell + 0.5) * uPs / uRes, o = 0.25 * uPs / uRes;
      vec3 col = (texture2D(tIn, c + vec2(-o.x, -o.y)).rgb + texture2D(tIn, c + vec2(o.x, -o.y)).rgb
                + texture2D(tIn, c + vec2(-o.x, o.y)).rgb + texture2D(tIn, c + vec2(o.x, o.y)).rgb) * 0.25;
      float n = uLevels - 1.0;
      col = floor(clamp(col, 0.0, 1.0) * n + 0.5 + (bayer4(cell) - 0.5) * uDither) / n;
      gl_FragColor = vec4(col, 1.0);
    }`;

  // styl z dokumentacji: blok uPs × uPs, kolor najbliższy z palety (dithering tylko na przejściach),
  // kontur w kolorze uOutline tam, gdzie obiekt leży wyraźnie bliżej niż sąsiedni blok (bufor głębi)
  const PALETTE = (n) => /* glsl */`
    #define PAL_N ${n}
    uniform sampler2D tIn; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uPs; uniform float uSpread;
    uniform float uEdge; uniform float uNear; uniform float uFar; uniform vec3 uPal[PAL_N]; uniform vec3 uOutline; varying vec2 vUv;
    float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
    float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    float linDepth(vec2 uv){ float z = texture2D(tDepth, uv).r * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
    void main(){
      vec2 cell = floor(vUv * uRes / uPs);
      vec2 c = (cell + 0.5) * uPs / uRes, o = 0.25 * uPs / uRes, s = uPs / uRes;
      vec3 col = (texture2D(tIn, c + vec2(-o.x, -o.y)).rgb + texture2D(tIn, c + vec2(o.x, -o.y)).rgb
                + texture2D(tIn, c + vec2(-o.x, o.y)).rgb + texture2D(tIn, c + vec2(o.x, o.y)).rgb) * 0.25;
      col = clamp(col + (bayer4(cell) - 0.5) * uSpread, 0.0, 1.0);
      vec3 best = uPal[0]; float bd = 1e9;
      for (int i = 0; i < PAL_N; i++) {
        vec3 d = col - uPal[i]; float e = dot(d * d, vec3(2.0, 4.0, 3.0));
        if (e < bd) { bd = e; best = uPal[i]; }
      }
      float d0 = linDepth(c);
      float dn = max(max(linDepth(c + vec2(s.x, 0.0)), linDepth(c - vec2(s.x, 0.0))), max(linDepth(c + vec2(0.0, s.y)), linDepth(c - vec2(0.0, s.y))));
      if (dn - d0 > uEdge * d0) best = uOutline;
      gl_FragColor = vec4(best, 1.0);
    }`;

  DD.createPost = function (renderer) {
    const PA = DD.CONFIG.ui.pixelArt.doc;
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    const sc = new THREE.Scene(); sc.add(quad);
    const isGL2 = renderer.capabilities.isWebGL2;
    const type = isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const mk = (w, h, depth) => {
      const o = { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth };
      if (depth) { o.depthTexture = new THREE.DepthTexture(w, h); o.depthTexture.type = THREE.UnsignedIntType; }
      return new THREE.WebGLRenderTarget(w, h, o);
    };
    const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });

    const mBright = mat(BRIGHT, { tIn: { value: null }, uThresh: { value: 1.5 } });
    const mBlur = mat(BLUR, { tIn: { value: null }, uDir: { value: new THREE.Vector2() } });
    const mCopy = mat(COPY, { tIn: { value: null } });
    const mComp = mat(COMPOSITE, {
      tScene: { value: null }, tDepth: { value: null }, tDof: { value: null },
      tB1: { value: null }, tB2: { value: null }, tB3: { value: null },
      uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uNear: { value: 0.1 }, uFar: { value: 300 },
      uFocus: { value: 17 }, uFever: { value: 0 }, uHit: { value: 0 }, uFade: { value: 0 }, uSlow: { value: 0 }, uExposure: { value: 0.95 }, uClean: { value: 0 }
    });
    const pal = PA.palette.map(h => new THREE.Color(h));   // kolory w sRGB, tak jak obraz po złożeniu
    const mPal = mat(PALETTE(pal.length), {
      tIn: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() }, uPs: { value: 4 }, uSpread: { value: PA.spread },
      uEdge: { value: PA.edge }, uNear: { value: 0.1 }, uFar: { value: 300 }, uPal: { value: pal }, uOutline: { value: new THREE.Color(PA.outline) }
    });
    const mPix = mat(PIXEL, { tIn: { value: null }, uRes: { value: new THREE.Vector2() }, uPs: { value: 4 }, uLevels: { value: 5 }, uDither: { value: 0.5 } });

    let T = null;
    function resize(w, h) {
      if (T) Object.values(T).forEach(t => t.dispose());
      const h2 = [Math.max(1, w >> 1), Math.max(1, h >> 1)], h4 = [Math.max(1, w >> 2), Math.max(1, h >> 2)], h8 = [Math.max(1, w >> 3), Math.max(1, h >> 3)];
      T = {
        scene: mk(w, h, true),
        b1a: mk(...h2), b1b: mk(...h2), b2a: mk(...h4), b2b: mk(...h4), b3a: mk(...h8), b3b: mk(...h8),
        da: mk(...h2), db: mk(...h2),
        full: mk(w, h)   // złożony obraz przed filtrem pixel art
      };
      mComp.uniforms.uRes.value.set(w, h);
      mPix.uniforms.uRes.value.set(w, h);
      mPal.uniforms.uRes.value.set(w, h);
    }
    function pass(m, target) { quad.material = m; renderer.setRenderTarget(target); renderer.render(sc, cam); }
    function blur(a, b, w, h, scale) {
      mBlur.uniforms.tIn.value = a.texture; mBlur.uniforms.uDir.value.set(scale / w, 0); pass(mBlur, b);
      mBlur.uniforms.tIn.value = b.texture; mBlur.uniforms.uDir.value.set(0, scale / h); pass(mBlur, a);
    }

    function render(scene, camera, p) {
      renderer.setRenderTarget(T.scene);
      renderer.clear();
      renderer.render(scene, camera);
      // bloom
      mBright.uniforms.tIn.value = T.scene.texture; pass(mBright, T.b1a);
      blur(T.b1a, T.b1b, T.b1a.width, T.b1a.height, 1.0);
      mCopy.uniforms.tIn.value = T.b1a.texture; pass(mCopy, T.b2a);
      blur(T.b2a, T.b2b, T.b2a.width, T.b2a.height, 1.0);
      mCopy.uniforms.tIn.value = T.b2a.texture; pass(mCopy, T.b3a);
      blur(T.b3a, T.b3b, T.b3a.width, T.b3a.height, 1.0);
      blur(T.b3a, T.b3b, T.b3a.width, T.b3a.height, 2.0);
      // rozmyty obraz dla głębi ostrości
      mCopy.uniforms.tIn.value = T.scene.texture; pass(mCopy, T.da);
      blur(T.da, T.db, T.da.width, T.da.height, 1.2);
      blur(T.da, T.db, T.da.width, T.da.height, 2.4);
      // złożenie na ekran
      const u = mComp.uniforms;
      u.tScene.value = T.scene.texture; u.tDepth.value = T.scene.depthTexture; u.tDof.value = T.da.texture;
      u.tB1.value = T.b1a.texture; u.tB2.value = T.b2a.texture; u.tB3.value = T.b3a.texture;
      u.uNear.value = camera.near; u.uFar.value = camera.far;
      Object.assign(u.uTime, { value: p.time }); u.uFocus.value = p.focus;
      u.uFever.value = p.fever; u.uHit.value = p.hit; u.uFade.value = p.fade; u.uSlow.value = p.slow;
      u.uClean.value = p.mode === 2 ? 1 : 0;
      if (p.mode === 2 && p.pixel > 1) {
        pass(mComp, T.full);
        const q = mPal.uniforms;
        q.tIn.value = T.full.texture; q.tDepth.value = T.scene.depthTexture; q.uPs.value = p.pixel;
        q.uNear.value = camera.near; q.uFar.value = camera.far;
        pass(mPal, null);
      } else if (p.pixel > 1) {
        pass(mComp, T.full);
        mPix.uniforms.tIn.value = T.full.texture; mPix.uniforms.uPs.value = p.pixel; mPix.uniforms.uLevels.value = p.levels; mPix.uniforms.uDither.value = p.dither;
        pass(mPix, null);
      } else pass(mComp, null);
    }
    return { resize, render };
  };
})();
