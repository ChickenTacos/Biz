/* Hero renderer: real-time ray-marched 3D endpoints, drawn as ASCII.
   Pass 1 ray-marches signed distance fields (laptop, phone, ID badge, desktop)
   into a tiny texture, one texel per character cell. Pass 2 turns each cell's
   brightness into a glyph from a font atlas. The pointer works as an "inspect"
   lens that swaps the glyphs for hex. Plain WebGL 1, no libraries. */
(function () {
  'use strict';
  const LY = window.LY = window.LY || {};

  const RAMP = ' .:-=+*#%@';
  const ALT = '0123456789ABCDEF';
  const OBJECTS = [
    { name: 'laptop · windows 11', state: 'enrolled ✓  encrypted ✓  patched ✓', pose: [-0.55, -0.42, 0.96] },
    { name: 'phone · iOS', state: 'enrolled ✓  passcode ✓  apps managed ✓', pose: [0.38, -0.1, 1.06] },
    { name: 'id badge · smart card', state: 'identity ✓  mfa ✓  access by role ✓', pose: [-0.3, -0.06, 0.94] },
    { name: 'desktop · windows 11', state: 'enrolled ✓  encrypted ✓  update ring 2 ✓', pose: [0.48, -0.2, 0.92] },
  ];

  const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';

  const SCENE = PREC + `
uniform vec2 uGrid;
uniform float uAspect, uTime, uA, uB, uT, uYaw, uPitch, uScale, uZoom, uFade;
uniform vec2 uCenter;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float sdBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float extrude(float d2, float z, float h) { vec2 w = vec2(d2, abs(z) - h); return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }

vec3 scrLocal(vec3 p) { vec3 q = p - vec3(0.0, -0.39, -0.60); q.yz = rot(0.30) * q.yz; return q - vec3(0.0, 0.74, 0.0); }

float laptop(vec3 p) {
  float base = sdBox(p - vec3(0.0, -0.42, 0.12), vec3(1.12, 0.045, 0.74), 0.035);
  float scr = sdBox(scrLocal(p), vec3(1.12, 0.72, 0.028), 0.03);
  return min(base, scr);
}
float phone(vec3 p) { return extrude(sdRect(p.xy, vec2(0.52, 1.06), 0.17), p.z, 0.035) - 0.02; }
float badge(vec3 p) {
  vec3 q = p - vec3(0.0, -0.22, 0.0);
  float card = extrude(sdRect(q.xy, vec2(0.60, 0.86), 0.08), q.z, 0.012) - 0.008;
  card = max(card, -sdRect(q.xy - vec2(0.0, 0.70), vec2(0.15, 0.035), 0.03));
  float clip = sdBox(p - vec3(0.0, 0.66, 0.0), vec3(0.07, 0.16, 0.03), 0.02);
  float s1 = sdCapsule(p, vec3(-0.04, 0.80, 0.0), vec3(-1.10, 3.0, -0.35), 0.06);
  float s2 = sdCapsule(p, vec3(0.04, 0.80, 0.0), vec3(1.10, 3.0, -0.35), 0.06);
  return min(min(card, clip), min(s1, s2));
}
float monitor(vec3 p) {
  float scr = extrude(sdRect(p.xy - vec2(0.0, 0.26), vec2(1.18, 0.70), 0.04), p.z, 0.03) - 0.01;
  float neck = sdBox(p - vec3(0.0, -0.58, -0.10), vec3(0.08, 0.27, 0.03), 0.02);
  float foot = sdBox(p - vec3(0.0, -0.86, -0.06), vec3(0.40, 0.02, 0.24), 0.02);
  return min(scr, min(neck, foot));
}
float obj(float i, vec3 p) {
  if (i < 0.5) return laptop(p);
  if (i < 1.5) return phone(p);
  if (i < 2.5) return badge(p);
  return monitor(p);
}
vec3 toLocal(vec3 p) {
  p /= uScale;
  p.xz = rot(uYaw) * p.xz;
  p.yz = rot(uPitch) * p.yz;
  return p;
}
float map(vec3 p) {
  vec3 q = toLocal(p);
  return mix(obj(uA, q), obj(uB, q), uT) * uScale;
}
vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

/* Surface detail per object: vec3(mix, value, glow).
   mix blends lit brightness toward value; glow tints the glyph phosphor-cyan. */
vec3 patLaptop(vec3 p, vec3 n) {
  vec3 q = scrLocal(p);
  vec3 nq = n; nq.yz = rot(0.30) * nq.yz;
  if (nq.z > 0.5 && q.z > 0.0) {
    if (abs(q.x) < 1.04 && abs(q.y) < 0.64) {
      float v = 0.30;
      if (q.y < -0.55) v = 0.55;
      if (length(q.xy - vec2(0.0, 0.22)) < 0.13) v = 0.95;
      if (abs(q.y - 0.02) < 0.022 && abs(q.x) < 0.20) v = 0.85;
      float fld = sdRect(q.xy - vec2(0.0, -0.17), vec2(0.40, 0.06), 0.02);
      if (fld < 0.0) v = 0.72;
      if (fld < 0.0 && abs(q.x + 0.12) < 0.02 && fract(uTime * 1.1) > 0.5) v = 0.06;
      return vec3(1.0, v, 1.0);
    }
    return vec3(0.85, 0.06, 0.0);
  }
  if (n.y > 0.75 && p.y > -0.39) {
    if (abs(p.x) < 0.98 && p.z > -0.52 && p.z < 0.22) {
      vec2 f = fract(vec2(p.x / 0.13, (p.z + 0.52) / 0.125));
      float gap = max(step(f.x, 0.16), step(f.y, 0.18));
      return vec3(gap * 0.75, 0.10, 0.0);
    }
    if (abs(p.x) < 0.34 && p.z > 0.36 && p.z < 0.76) return vec3(0.4, 0.62, 0.0);
  }
  return vec3(0.0);
}
vec3 patPhone(vec3 p, vec3 n) {
  if (n.z > 0.5 && p.z > 0.0) {
    vec2 s = p.xy;
    if (sdRect(s, vec2(0.46, 0.99), 0.13) < 0.0) {
      if (sdRect(s - vec2(0.0, 0.89), vec2(0.12, 0.035), 0.035) < 0.0) return vec3(1.0, 0.02, 0.0);
      float v = 0.24;
      vec2 g = floor((s - vec2(-0.345, 0.66)) / vec2(0.23, -0.25) + 0.5);
      if (g.x > -0.5 && g.x < 3.5 && g.y > -0.5 && g.y < 4.5) {
        if (sdRect(s - (vec2(-0.345, 0.66) + g * vec2(0.23, -0.25)), vec2(0.075, 0.075), 0.03) < 0.0) v = 0.92;
      }
      if (sdRect(s - vec2(0.0, -0.86), vec2(0.42, 0.09), 0.06) < 0.0) {
        v = 0.5;
        float k = floor((s.x + 0.46) / 0.23);
        if (sdRect(s - vec2(-0.345 + k * 0.23, -0.86), vec2(0.07, 0.065), 0.03) < 0.0) v = 0.95;
      }
      return vec3(1.0, v, 1.0);
    }
    return vec3(0.85, 0.05, 0.0);
  }
  return vec3(0.0);
}
vec3 patBadge(vec3 p, vec3 n) {
  vec3 q = p - vec3(0.0, -0.22, 0.0);
  if (n.z > 0.5 && q.z > 0.0 && abs(q.x) < 0.6 && abs(q.y) < 0.86) {
    float v = 0.80;
    float g = 0.0;
    if (q.y > 0.44 && q.y < 0.58) v = 0.30;
    vec2 ph = q.xy - vec2(-0.27, 0.10);
    if (sdRect(ph, vec2(0.21, 0.25), 0.02) < 0.0) {
      v = 0.28;
      if (length(ph - vec2(0.0, 0.08)) < 0.085) v = 0.95;
      if (length((ph - vec2(0.0, -0.15)) * vec2(1.0, 1.7)) < 0.17) v = 0.95;
    }
    if (abs(q.y - 0.27) < 0.03 && q.x > 0.04 && q.x < 0.50) v = 0.10;
    if (abs(q.y - 0.16) < 0.022 && q.x > 0.04 && q.x < 0.40) v = 0.25;
    if (sdRect(q.xy - vec2(0.30, -0.10), vec2(0.10, 0.075), 0.02) < 0.0) { v = 1.0; g = 1.0; }
    if (q.y < -0.46 && q.y > -0.72 && abs(q.x) < 0.48) {
      float k = floor(q.x * 26.0);
      v = step(0.45, fract(sin(k * 12.9898) * 43758.5453)) * 0.9;
    }
    return vec3(1.0, v, g);
  }
  return vec3(0.0);
}
vec3 patMonitor(vec3 p, vec3 n) {
  vec2 s = p.xy - vec2(0.0, 0.26);
  if (n.z > 0.5 && p.z > 0.0) {
    if (sdRect(s, vec2(1.10, 0.62), 0.02) < 0.0) {
      float v = 0.26;
      if (s.y > 0.52) v = 0.6;
      if (s.y < -0.52) v = 0.5;
      vec2 c = s - vec2(-0.52, 0.0);
      if (sdRect(c, vec2(0.44, 0.40), 0.02) < 0.0) {
        v = 0.12;
        float k = floor((c.x + 0.40) / 0.1);
        float h = 0.15 + 0.6 * fract(sin(k * 7.13 + 1.7) * 43758.5453);
        if (k >= 0.0 && k <= 7.0 && fract((c.x + 0.40) / 0.1) > 0.3 && c.y + 0.34 < h * 0.68) v = 0.95;
      }
      if (sdRect(s - vec2(0.56, 0.22), vec2(0.42, 0.16), 0.02) < 0.0) v = 0.82;
      if (sdRect(s - vec2(0.56, -0.18), vec2(0.42, 0.16), 0.02) < 0.0) v = 0.55;
      return vec3(1.0, v, 1.0);
    }
    return vec3(0.85, 0.06, 0.0);
  }
  return vec3(0.0);
}
vec3 pat(float i, vec3 p, vec3 n) {
  if (i < 0.5) return patLaptop(p, n);
  if (i < 1.5) return patPhone(p, n);
  if (i < 2.5) return patBadge(p, n);
  return patMonitor(p, n);
}

void main() {
  vec2 cell = gl_FragCoord.xy;
  vec2 uv = cell / uGrid * 2.0 - 1.0;
  uv.x *= uAspect;
  vec2 sp = (uv - uCenter) / uZoom;
  vec3 ro = vec3(0.0, 0.0, 4.4);
  vec3 rd = normalize(vec3(sp, -2.4));
  float t = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 90; i++) {
    float d = map(ro + rd * t);
    if (d < 0.0015) { hit = 1.0; break; }
    t += d * 0.92;
    if (t > 9.0) break;
  }
  float scan = smoothstep(0.05, 0.0, abs(cell.y / uGrid.y - (1.0 - fract(uTime * 0.06))));
  if (hit < 0.5) {
    float dots = (1.0 - step(0.5, mod(cell.x - 0.5, 4.0))) * (1.0 - step(0.5, mod(cell.y - 0.5, 3.0)));
    float fade = mix(1.0, smoothstep(-0.25, 0.55, uv.x / uAspect), uFade);
    gl_FragColor = vec4((dots * 0.14 + scan * 0.05) * fade, 0.0, 0.0, 1.0);
    return;
  }
  vec3 pos = ro + rd * t;
  vec3 n = calcNormal(pos);
  vec3 L = normalize(vec3(-0.4, 0.65, 0.68));
  float dif = clamp(dot(n, L), 0.0, 1.0);
  float fre = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.5);
  float spe = pow(clamp(dot(reflect(rd, n), L), 0.0, 1.0), 18.0);
  float lum = 0.16 + 0.66 * dif + 0.10 * (0.5 + 0.5 * n.y) + 0.30 * spe + 0.22 * fre;
  vec3 lp = toLocal(pos);
  vec3 ln = n;
  ln.xz = rot(uYaw) * ln.xz;
  ln.yz = rot(uPitch) * ln.yz;
  vec3 pc = mix(pat(uA, lp, ln), pat(uB, lp, ln), uT);
  lum = mix(lum, pc.y, pc.x) + scan * 0.18;
  gl_FragColor = vec4(clamp(lum, 0.0, 1.0), pc.z, 1.0, 1.0);
}`;

  const GLYPH = PREC + `
uniform sampler2D uScene, uAtlas;
uniform vec2 uGrid, uCellPx;
uniform float uRamp, uTotal, uTime;
uniform vec3 uInk, uGlow, uHot, uMouse;
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 cell = floor(fc / uCellPx);
  vec2 lc = fract(fc / uCellPx);
  vec4 s = texture2D(uScene, (cell + 0.5) / uGrid);
  float lum = s.r;
  float hit = s.b;
  float gi = floor(clamp(lum, 0.0, 0.999) * uRamp);
  vec3 col = mix(uInk, uGlow, s.g);
  vec2 dm = (cell - uMouse.xy) * vec2(uCellPx.x / uCellPx.y, 1.0);
  float lens = uMouse.z * (1.0 - smoothstep(6.0, 8.0, length(dm)));
  if (hit > 0.5 && lens > 0.35) {
    float h = fract(sin(dot(cell + floor(uTime * 8.0), vec2(12.9898, 78.233))) * 43758.5453);
    gi = uRamp + floor(h * 16.0);
    col = uHot;
  }
  float a = texture2D(uAtlas, vec2((gi + lc.x) / uTotal, lc.y)).a;
  float alpha = hit > 0.5 ? a * (0.5 + 0.5 * clamp(lum * 1.3, 0.0, 1.0)) : a * clamp(lum * 2.4 + lens * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

  function shader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[lanyard] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function program(gl, vs, fs) {
    const v = shader(gl, gl.VERTEX_SHADER, vs);
    const f = shader(gl, gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('[lanyard] link:', gl.getProgramInfoLog(p));
      return null;
    }
    p.loc = gl.getAttribLocation(p, 'a');
    return p;
  }
  function rgb(hex, fallback) {
    const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function texParams(gl) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  LY.ascii = function (canvas, hooks) {
    hooks = hooks || {};
    const stage = canvas.parentElement;
    const hero = canvas.closest('.hero') || stage;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    } catch (e) { gl = null; }
    if (!gl) return null;

    const pScene = program(gl, VERT, SCENE);
    const pGlyph = program(gl, VERT, GLYPH);
    if (!pScene || !pGlyph) return null;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const uniforms = (p, names) => names.reduce((o, n) => { o[n] = gl.getUniformLocation(p, n); return o; }, {});
    const us = uniforms(pScene, ['uGrid', 'uAspect', 'uTime', 'uA', 'uB', 'uT', 'uYaw', 'uPitch', 'uScale', 'uCenter', 'uZoom', 'uFade']);
    const ug = uniforms(pGlyph, ['uScene', 'uAtlas', 'uGrid', 'uCellPx', 'uRamp', 'uTotal', 'uTime', 'uInk', 'uGlow', 'uHot', 'uMouse']);
    const sceneTex = gl.createTexture();
    const atlasTex = gl.createTexture();
    const fbo = gl.createFramebuffer();

    const css = getComputedStyle(document.documentElement);
    const cGlow = rgb(css.getPropertyValue('--cyan'), [0.37, 0.95, 1]);
    const cHot = rgb(css.getPropertyValue('--yellow'), [1, 0.88, 0.29]);

    const reduced = LY.reduced();
    let cols = 0, rows = 0, cw = 8, ch = 14, aspect = 1, wide = true;
    let A = 0, phase = 0, time = 0, last = 0, raf = 0;
    let running = false, inView = true, ready = false, shown = -1, lost = false;
    const HOLD = 4.4, TRANS = 1.2;
    const look = { x: 0, y: 0, tx: 0, ty: 0 };
    const mouse = { x: -99, y: -99, s: 0, ts: 0 };

    function bindQuad(p) {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(p.loc);
      gl.vertexAttribPointer(p.loc, 2, gl.FLOAT, false, 0, 0);
    }

    function buildAtlas() {
      const chars = RAMP + ALT;
      const c = document.createElement('canvas');
      c.width = chars.length * cw;
      c.height = ch;
      const x = c.getContext('2d');
      const px = Math.max(6, Math.round(Math.min(ch * 0.8, cw * 1.5)));
      x.font = '600 ' + px + 'px "Martian Mono", ui-monospace, Menlo, Consolas, monospace';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = '#fff';
      for (let i = 0; i < chars.length; i++) x.fillText(chars[i], i * cw + cw / 2, ch / 2 + px * 0.05);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      texParams(gl);
    }

    function layout() {
      const r = stage.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      wide = window.matchMedia('(min-width: 900px)').matches;
      const cssW = LY.clamp(Math.round(r.width / 165), 6, 10);
      cw = Math.max(4, Math.round(cssW * dpr));
      ch = Math.max(7, Math.round(cssW * 1.75 * dpr));
      cols = Math.max(8, Math.floor((r.width * dpr) / cw));
      rows = Math.max(8, Math.floor((r.height * dpr) / ch));
      canvas.width = cols * cw;
      canvas.height = rows * ch;
      canvas.style.width = canvas.width / dpr + 'px';
      canvas.style.height = canvas.height / dpr + 'px';
      aspect = (cols * cw) / (rows * ch);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      texParams(gl);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      buildAtlas();
      return true;
    }

    function draw(a, b, t, yaw, pitch, scale) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, cols, rows);
      gl.useProgram(pScene);
      bindQuad(pScene);
      gl.uniform2f(us.uGrid, cols, rows);
      gl.uniform1f(us.uAspect, aspect);
      gl.uniform1f(us.uTime, time);
      gl.uniform1f(us.uA, a);
      gl.uniform1f(us.uB, b);
      gl.uniform1f(us.uT, t);
      gl.uniform1f(us.uYaw, yaw);
      gl.uniform1f(us.uPitch, pitch);
      gl.uniform1f(us.uScale, scale);
      gl.uniform2f(us.uCenter, wide ? Math.max(0.6, aspect - 0.92) : 0, wide ? -0.14 : 0.0);
      gl.uniform1f(us.uZoom, wide ? 0.98 : 1.18);
      gl.uniform1f(us.uFade, wide ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(pGlyph);
      bindQuad(pGlyph);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.uniform1i(ug.uScene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.uniform1i(ug.uAtlas, 1);
      gl.uniform2f(ug.uGrid, cols, rows);
      gl.uniform2f(ug.uCellPx, cw, ch);
      gl.uniform1f(ug.uRamp, RAMP.length);
      gl.uniform1f(ug.uTotal, RAMP.length + ALT.length);
      gl.uniform1f(ug.uTime, time);
      gl.uniform3f(ug.uInk, 1, 1, 1);
      gl.uniform3fv(ug.uGlow, cGlow);
      gl.uniform3fv(ug.uHot, cHot);
      gl.uniform3f(ug.uMouse, mouse.x, mouse.y, mouse.s);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function announce(i) {
      if (i === shown) return;
      shown = i;
      if (hooks.onObject) hooks.onObject(i, OBJECTS[i], OBJECTS.length);
    }

    function render(dt) {
      const n = OBJECTS.length;
      phase += dt;
      if (phase >= HOLD + TRANS) { phase -= HOLD + TRANS; A = (A + 1) % n; }
      const raw = phase < HOLD ? 0 : (phase - HOLD) / TRANS;
      const T = raw * raw * (3 - 2 * raw);
      const B = (A + 1) % n;
      announce(T > 0.5 ? B : A);
      const k = Math.min(1, dt * 4);
      look.x += (look.tx - look.x) * k;
      look.y += (look.ty - look.y) * k;
      mouse.s += (mouse.ts - mouse.s) * Math.min(1, dt * 9);
      const pa = OBJECTS[A].pose;
      const pb = OBJECTS[B].pose;
      const sway = reduced ? 0 : 1;
      draw(
        A, B, T,
        LY.lerp(pa[0], pb[0], T) + Math.sin(time * 0.45) * 0.22 * sway + look.x * 0.5,
        LY.lerp(pa[1], pb[1], T) + Math.sin(time * 0.33) * 0.05 * sway - look.y * 0.22,
        LY.lerp(pa[2], pb[2], T)
      );
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      time += dt;
      render(dt);
    }

    function start() {
      if (!ready || lost) return;
      if (reduced) { render(0); return; }
      if (running || !inView || document.hidden) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
    function next() {
      if (phase < HOLD) phase = HOLD;
      if (reduced || !running) {
        phase = 0;
        A = (A + 1) % OBJECTS.length;
        render(0);
      }
    }

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      look.tx = LY.clamp((x / r.width) * 2 - 1, -1, 1);
      look.ty = LY.clamp((y / r.height) * 2 - 1, -1, 1);
      mouse.x = (x / r.width) * cols;
      mouse.y = (1 - y / r.height) * rows;
      mouse.ts = x >= 0 && y >= 0 && x <= r.width && y <= r.height ? 1 : 0;
    }
    if (!reduced) {
      hero.addEventListener('pointermove', onMove, { passive: true });
      hero.addEventListener('pointerleave', () => { mouse.ts = 0; look.tx = 0; look.ty = 0; });
      hero.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        onMove(e);
        setTimeout(() => { mouse.ts = 0; }, 1400);
      }, { passive: true });
    }
    hero.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, select, textarea, label')) return;
      next();
    });

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      lost = true;
      stop();
      hero.classList.add('no-webgl');
    });

    let resizeTimer = 0;
    const relayout = () => {
      if (!layout()) return;
      ready = true;
      if (reduced || !running) render(0);
    };
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 120); }).observe(stage);
    } else {
      window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 120); });
    }
    LY.watchVisible(hero, (v) => { inView = v; if (v) start(); else stop(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

    const fonts = document.fonts && document.fonts.load
      ? Promise.race([document.fonts.load('600 12px "Martian Mono"'), LY.sleep(1500)]).catch(() => {})
      : Promise.resolve();
    const whenReady = fonts.then(() => {
      if (layout()) { ready = true; render(0); }
    });

    // Render one frozen frame of object i at a given pose (used for tuning and tests)
    function still(i, yaw, pitch, scale) {
      stop();
      A = i % OBJECTS.length;
      phase = 0;
      announce(A);
      const p = OBJECTS[A].pose;
      draw(A, (A + 1) % OBJECTS.length, 0, yaw == null ? p[0] : yaw, pitch == null ? p[1] : pitch, scale == null ? p[2] : scale);
    }

    return { start, stop, next, still, ready: whenReady, objects: OBJECTS };
  };
})();
