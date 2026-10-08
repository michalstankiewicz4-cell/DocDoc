// Wspólne fragmenty GLSL: szum, oświetlenie mokrej tkanki, pochłanianie światła we krwi.
// Wszystkie materiały liczą światło w przestrzeni liniowej (HDR); mapowanie tonów robi post-process.
(function () {
  const NOISE = /* glsl */`
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
      return mix(mix(hash12(i), hash12(i+vec2(1.,0.)), u.x), mix(hash12(i+vec2(0.,1.)), hash12(i+vec2(1.,1.)), u.x), u.y);
    }
    float fbm(vec2 p){
      float a = .5, s = 0.;
      for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; }
      return s;
    }
    float fbm3(vec2 p){
      float a = .5, s = 0.;
      for (int i = 0; i < 3; i++){ s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; }
      return s;
    }
  `;

  const LIGHT = /* glsl */`
    uniform vec3 uCam;
    uniform vec3 uLight;
    uniform float uLightPow;
    uniform float uFever;

    // Światło "endoskopu" przy kamerze + półsferyczne światło otoczenia.
    // wrap diffuse + rozpraszanie podpowierzchniowe na terminatorze + dwa płaty odblasku (mokra tkanka)
    vec3 shade(vec3 P, vec3 N, vec3 albedo, float rough, float wet, float sss, vec3 sssCol){
      vec3 Ld = uLight - P; float dist = length(Ld); vec3 L = Ld / dist;
      vec3 V = normalize(uCam - P); vec3 Hh = normalize(L + V);
      float att = uLightPow / (1.0 + 0.0016 * dist * dist);
      // stożek reflektora
      vec3 spotDir = normalize(vec3(0.0, 0.18, -1.0));
      float cone = smoothstep(0.55, 0.92, dot(-L, spotDir)) * 0.85 + 0.15;
      att *= cone;
      float ndl = dot(N, L);
      float wrap = max(0., (ndl + 0.45) / 1.45);
      float term = smoothstep(-0.5, 0.2, ndl) * (1. - smoothstep(0.05, 0.7, ndl));
      vec3 diff = albedo * wrap + sssCol * term * sss;
      float ndh = max(dot(N, Hh), 0.);
      float fres = 0.04 + 0.96 * pow(1. - max(dot(N, V), 0.), 5.);
      float e = 2.0 / max(rough * rough, 0.002);
      float spec = pow(ndh, e) * (e + 8.) / 25.13 * (0.05 + fres * 0.6);
      float wetSpec = pow(ndh, 900.) * wet * 9.0;
      vec3 col = (diff + vec3(1.0, 0.92, 0.86) * (spec * 0.45 + wetSpec)) * att;
      float hemi = N.z * 0.5 + 0.5;
      col += albedo * mix(vec3(0.030, 0.006, 0.006), vec3(0.085, 0.032, 0.03), hemi);
      col += sssCol * sss * 0.03;
      col *= mix(vec3(1.0), vec3(1.12, 0.94, 0.84), uFever);
      return col;
    }

    // krew pochłania niebieski i zielony szybciej niż czerwony
    vec3 bloodFog(vec3 col, vec3 P){
      float dist = length(uCam - P);
      float below = max(0., 4.2 - P.z);
      vec3 absorb = exp(-vec3(0.030, 0.060, 0.070) * (dist * 0.35 + below * 3.2));
      vec3 inscatter = vec3(0.085, 0.010, 0.009) * (1. - exp(-dist * 0.022));
      return col * absorb + inscatter;
    }
  `;

  // kaustyki — falujące światło przechodzące przez płynącą krew
  const CAUSTIC = /* glsl */`
    float caustic(vec2 uv, float t){
      vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
      vec2 i = p; float c = 1.0; float inten = .005;
      for (int n = 0; n < 4; n++){
        float tt = t * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
        c += 1.0 / max(length(vec2(p.x / (sin(i.x + tt) / inten + 1e-4), p.y / (cos(i.y + tt) / inten + 1e-4))), 1e-3);
      }
      c /= 4.0; c = 1.17 - pow(max(c, 0.0), 1.4);
      return pow(abs(c), 8.0);
    }
  `;

  DD.GLSL = { NOISE, LIGHT, CAUSTIC };

  // Wspólne uniformy — te same obiekty we wszystkich materiałach, aktualizowane raz na klatkę.
  DD.SHARED = {
    uTime: { value: 0 }, uBeat: { value: 0 },
    uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Vector3() },
    uLightPow: { value: 2.2 }, uFever: { value: 0 }
  };
})();
