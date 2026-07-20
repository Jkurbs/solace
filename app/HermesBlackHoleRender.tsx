'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { getRenderPixelRatio } from '@/lib/webgl-dpr';

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform sampler2D uPlate;
  uniform vec2 uPlateResolution;
  uniform float uPlateReady;

  // --- Utilities ---
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float hash13(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  mat2 rotate2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(13.7, 7.9);
      a *= 0.48;
    }
    return v;
  }

  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 q = p;
    for (int i = 0; i < 5; i++) {
      v += a * (noise(q.xy) * 0.6 + noise(q.yz) * 0.4);
      q = q * 2.02 + vec3(17.1, 9.3, 4.7);
      a *= 0.5;
    }
    return v;
  }

  // --- Gravitational lensing (strong, cinematic approximation) ---
  // rs = Schwarzschild radius in our normalized units
  const float RS = 0.28;
  const float PHOTON_RING_R = 1.48 * RS; // ~ photon sphere

  float luma709(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  float insideUnitUv(vec2 uv) {
    vec2 low = step(vec2(0.0), uv);
    vec2 high = step(uv, vec2(1.0));
    return low.x * low.y * high.x * high.y;
  }

  vec2 coverUv(vec2 uv, vec2 imageSize, vec2 screenSize, vec2 objectPosition) {
    float screenAspect = screenSize.x / max(screenSize.y, 1.0);
    float imageAspect = imageSize.x / max(imageSize.y, 1.0);
    vec2 visible = vec2(1.0);

    if (imageAspect > screenAspect) {
      visible.x = screenAspect / imageAspect;
    } else {
      visible.y = imageAspect / screenAspect;
    }

    return (1.0 - visible) * objectPosition + uv * visible;
  }

  vec3 samplePlateSharp(vec2 uv) {
    vec2 texel = 1.0 / max(uPlateResolution, vec2(1.0));
    vec3 c = texture2D(uPlate, uv).rgb;
    vec3 n = texture2D(uPlate, uv + vec2(0.0, texel.y)).rgb;
    vec3 s = texture2D(uPlate, uv - vec2(0.0, texel.y)).rgb;
    vec3 e = texture2D(uPlate, uv + vec2(texel.x, 0.0)).rgb;
    vec3 w = texture2D(uPlate, uv - vec2(texel.x, 0.0)).rgb;
    vec3 blur = (n + s + e + w) * 0.25;
    return max(vec3(0.0), c + (c - blur) * 0.72);
  }

  vec3 cinematicPlate(vec2 uv, vec2 p, float time, float mobile) {
    if (uPlateReady < 0.5) {
      return vec3(0.0);
    }

    // Keep the event right-weighted on desktop while cropping into it on narrow screens.
    vec2 objectPosition = mix(vec2(0.54, 0.5), vec2(0.82, 0.48), mobile);
    vec2 plateUv = coverUv(uv, uPlateResolution, uResolution, objectPosition);

    float r = length(p);
    float a = atan(p.y, p.x);
    vec2 dir = p / max(r, 0.0001);
    vec2 tangent = vec2(-dir.y, dir.x);
    float ringInfluence = smoothstep(PHOTON_RING_R * 2.75, PHOTON_RING_R * 0.82, r);

    plateUv += tangent * sin(a * 5.0 + time * 0.72) * 0.0026 * ringInfluence;
    plateUv += dir * 0.0032 * ringInfluence * ringInfluence;
    plateUv += vec2(
      fbm(plateUv * 11.0 + time * 0.035),
      fbm(plateUv * 9.0 - time * 0.028)
    ) * 0.0017 * ringInfluence;

    float mask = insideUnitUv(plateUv);
    vec3 plate = samplePlateSharp(plateUv) * mask;
    float luma = luma709(plate);

    float microSheen = 0.94 + 0.1 * fbm(plateUv * 42.0 + vec2(time * 0.08, -time * 0.045));
    plate *= microSheen;
    plate += vec3(0.9, 0.96, 1.0) * pow(max(luma - 0.52, 0.0), 2.0) * 0.16;
    plate = mix(plate, plate * vec3(0.98, 1.01, 1.045), 0.14);
    plate = pow(max(plate, 0.0), vec3(0.93));

    return plate;
  }

  vec2 gravitationalLens(vec2 p, float strength) {
    float r = length(p);
    if (r < 0.0001) return p;

    // Impact parameter style deflection. Strong near the photon sphere.
    float impact = r;
    float deflection = strength * RS * RS / max(impact * impact - RS * RS * 0.6, 0.0008);

    // Add critical curve "caustic" brightening / folding near photon ring
    float crit = smoothstep(PHOTON_RING_R * 1.6, PHOTON_RING_R * 0.72, r);
    float caustic = crit * crit * 0.9;

    vec2 dir = p / r;
    float bend = deflection * (1.0 + caustic * 1.6);

    // Secondary image / higher order winding (subtle, elegant)
    float higher = smoothstep(PHOTON_RING_R * 2.1, PHOTON_RING_R * 0.95, r);
    bend += higher * higher * 0.035;

    return p - dir * bend;
  }

  // --- Relativistic thin accretion disk + Doppler + redshift ---
  vec3 diskEmission(float r, float phi, float doppler, float time) {
    // Inner cutoff (ISCO-ish)
    float rIn = RS * 2.8;
    if (r < rIn) return vec3(0.0);

    // Temperature profile (steeper near inner edge)
    float t = pow(rIn / r, 0.78);
    t = t * (0.6 + 0.4 * smoothstep(rIn * 1.6, rIn * 4.2, r));

    // Turbulence in the rotating frame
    float rot = phi * 7.2 - time * 1.35;
    float turb = fbm(vec2(r * 18.0 + rot * 0.6, phi * 4.4 - time * 0.9)) * 0.65;
    turb += fbm(vec2(r * 41.0 - rot * 1.1, phi * 9.0 + time * 1.4)) * 0.35;

    float heat = clamp(t * (0.75 + turb * 0.55), 0.0, 1.0);

    // Base disk color — cinematic, Foundation-inspired (warm core with energetic shifts)
    vec3 coolCore = vec3(0.82, 0.91, 1.0);     // slightly blue-white on hottest
    vec3 warmMid  = vec3(1.0, 0.72, 0.38);
    vec3 ember    = vec3(0.72, 0.29, 0.11);

    vec3 col = mix(ember, warmMid, smoothstep(0.22, 0.58, heat));
    col = mix(col, coolCore, smoothstep(0.61, 0.94, heat));

    // Doppler + beaming already applied outside — here we just modulate brightness by local turbulence
    float density = 0.7 + 0.3 * smoothstep(0.1, 0.9, 1.0 - abs(turb - 0.5) * 1.6);
    col *= density;

    // Subtle self-obscuring / vertical structure
    float heightVar = 0.6 + 0.4 * fbm(vec2(r * 9.0 + phi * 2.3, time * 0.4));
    col *= heightVar;

    return col;
  }

  // Compute contribution from the thin disk given a lensed view position
  vec3 sampleDisk(vec2 p, float time, float aspect) {
    // Rotate the disk slightly for visual interest (Foundation has elegant, slow motion)
    float diskAngle = -0.07;
    vec2 dp = rotate2d(diskAngle) * p;

    float r = length(dp);
    float phi = atan(dp.y, dp.x);

    // Orbital velocity direction for Doppler (Keplerian-ish)
    vec2 tangent = vec2(-dp.y, dp.x) / max(r, 0.0001);
    // Simple line-of-sight approximation (camera "above" the plane a bit)
    float los = dot(normalize(vec2(0.0, 0.6)), tangent);
    // Relativistic beaming exponent (strong on the approaching side)
    float beta = 0.38; // effective orbital speed factor
    float doppler = pow(1.0 - beta * los, -3.2);

    // Gravitational redshift + dimming near horizon
    float redshift = smoothstep(RS * 1.6, RS * 5.5, r);
    doppler *= redshift * redshift * 0.9 + 0.1;

    vec3 emission = diskEmission(r, phi, doppler, time);

    // Doppler color temperature shift (approaching side gets whiter/bluer)
    float blueShift = smoothstep(-0.15, 0.85, los) * 0.7;
    emission = mix(emission, emission * vec3(0.92, 0.97, 1.12), blueShift);

    // Final disk brightness, modulated by strong beaming
    float brightness = 1.15 + (doppler - 1.0) * 1.8;

    // Mask the very inner shadow + add a touch of vertical thickness fade
    float innerFade = smoothstep(RS * 1.35, RS * 2.65, r);
    brightness *= innerFade;

    return emission * brightness * 0.82;
  }

  // Very faint, geometrically precise "orbital infrastructure" (Starlink / instrument precision)
  // These get dramatically lensed — the signature "watching something engineered near a singularity"
  vec3 orbitalTracks(vec2 p, float time) {
    float r = length(p);
    float a = atan(p.y, p.x);

    vec3 col = vec3(0.0);

    // Several clean, thin orbital shells at larger radii (get lensed hard)
    float shells[4];
    shells[0] = 1.65;
    shells[1] = 2.12;
    shells[2] = 2.71;
    shells[3] = 3.38;

    for (int i = 0; i < 4; i++) {
      float sr = shells[i];
      float dist = abs(r - sr);
      float line = 1.0 - smoothstep(0.004, 0.019, dist);

      // Slow differential rotation
      float phase = a * (5.0 + float(i) * 1.6) - time * (0.22 + float(i) * 0.07);
      float density = 0.35 + 0.65 * smoothstep(0.0, 0.6, sin(phase) * 0.5 + 0.5);

      // Very subtle points (satellites / nodes) along the track
      float nodes = smoothstep(0.97, 1.0, sin(phase * (7.0 + float(i))) * 0.5 + 0.5);
      nodes *= (i == 0 || i == 2) ? 1.3 : 0.6;

      float intensity = line * density * (0.7 + nodes * 2.8);

      // Color: cool precision instrument feel with slight gold from the main event
      vec3 trackCol = mix(vec3(0.78, 0.86, 0.98), vec3(0.95, 0.84, 0.58), 0.15);
      col += trackCol * intensity * 0.035;
    }

    // Extremely faint larger constellation "swarm" that gets beautifully distorted
    float swarmR = 4.1 + sin(a * 3.0 + time * 0.03) * 0.08;
    float swarmDist = abs(r - swarmR);
    float swarmLine = 1.0 - smoothstep(0.006, 0.028, swarmDist);
    float swarmPhase = a * 11.0 - time * 0.11;
    float swarmPoints = pow(max(0.0, sin(swarmPhase) * 0.5 + 0.5), 3.0);
    col += vec3(0.72, 0.81, 0.95) * swarmLine * swarmPoints * 0.018;

    return col;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float mobile = 1.0 - smoothstep(0.94, 1.22, aspect);

    // Slightly off-center composition (dramatic, Foundation scale)
    vec2 center = mix(vec2(0.71, 0.505), vec2(0.665, 0.435), mobile);
    vec2 p = uv - center;
    p.x *= aspect;

    float time = uTime * 0.165;

    // === STRONG GRAVITATIONAL LENSING ===
    vec2 lensedP = gravitationalLens(p, 1.0);

    // === BACKGROUND (lensed starfield + faint cosmic web) ===
    vec3 color = vec3(0.0018, 0.0021, 0.0026);
    vec3 plate = cinematicPlate(uv, p, time, mobile);
    float plateLuma = luma709(plate);
    float platePresence = uPlateReady * smoothstep(0.001, 0.018, plateLuma + 0.003);
    float proceduralWeight = mix(1.0, 0.18, uPlateReady);

    color = mix(color, max(color, plate * 1.04), platePresence * 0.92);

    // High quality lensed star field
    vec2 starUv = lensedP * 1.7;
    vec2 starGrid = floor(starUv * vec2(1.6, 1.6));
    float starSeed = hash(starGrid);
    float star = smoothstep(0.996, 1.0, starSeed);

    // Twinkle + slow proper motion
    float twinkle = 0.7 + 0.3 * sin(uTime * (0.6 + starSeed * 1.8) + starSeed * 19.0);
    star *= twinkle;

    // Strong lensing makes stars near the ring dramatically brighter / duplicated
    float ringBoost = 1.0 + 2.8 * smoothstep(PHOTON_RING_R * 1.55, PHOTON_RING_R * 0.78, length(p));
    star *= ringBoost;

    // Color variation in stars
    vec3 starCol = vec3(0.92, 0.95, 1.0);
    starCol = mix(starCol, vec3(1.0, 0.92, 0.78), smoothstep(0.3, 0.85, hash(starGrid + 7.3)));

    color += starCol * star * mix(0.85, 0.26, uPlateReady);

    // Very faint lensed background "nebula" / dust lanes (gives depth like prestige sci-fi)
    float neb = fbm(lensedP * 1.1 + vec2(time * 0.015, -time * 0.009));
    neb += fbm(lensedP * 2.3 - vec2(time * 0.022, time * 0.014)) * 0.5;
    color += vec3(0.011, 0.014, 0.022) * neb * 0.55 * smoothstep(0.9, 2.8, length(p)) * proceduralWeight;

    // === ACCRETION DISK (the star of the show) ===
    vec3 disk = sampleDisk(lensedP, time, aspect);

    // Extra inner glow near photon ring for that cinematic punch
    float photonProx = 1.0 - smoothstep(0.0, PHOTON_RING_R * 0.9, abs(length(p) - PHOTON_RING_R));
    disk += vec3(1.0, 0.88, 0.65) * photonProx * photonProx * 0.9;

    color += disk * proceduralWeight;

    // === PRECISE ORBITAL TRACKS (Starlink / instrument layer) ===
    // These live outside the main disk and get violently lensed — very Foundation "ancient advanced tech observing the cosmos"
    vec3 tracks = orbitalTracks(p, time * 0.6);
    color += tracks * mix(1.0, 0.42, uPlateReady);

    // === CLEAN PHOTON RING (the bright unstable orbit) ===
    float photonRing = exp(-pow((length(p) - PHOTON_RING_R) / 0.0042, 2.0));
    // Add a bit of turbulence to the ring so it doesn't feel too perfect
    float ringTurb = 0.88 + 0.12 * fbm(vec2(atan(p.y, p.x) * 11.0 + time * 1.8, length(p) * 19.0));
    color += vec3(1.0, 0.95, 0.82) * photonRing * ringTurb * 1.35 * proceduralWeight;

    // Subtle higher-order ring (the "inner" image)
    float photon2 = exp(-pow((length(p) - PHOTON_RING_R * 0.48) / 0.003, 2.0)) * 0.6;
    color += vec3(0.95, 0.82, 0.6) * photon2 * 0.7 * proceduralWeight;

    // === VIGNETTE + FILMIC GRADING (Foundation prestige look) ===
    float r = length(p);
    float leftFade = smoothstep(0.01, 0.38, uv.x);
    float radVign = smoothstep(1.05, 0.52, r);
    float vertVign = smoothstep(0.0, 0.22, uv.y) * smoothstep(1.0, 0.71, uv.y);

    color *= mix(0.06, 1.0, leftFade);
    color *= 0.65 + 0.35 * radVign;
    color *= 0.78 + 0.22 * vertVign;

    // Very light filmic crush + slight teal/orange cinematic bias in the shadows
    color = pow(max(color, 0.0), vec3(0.86));
    color = mix(color, color * vec3(0.96, 1.01, 1.03), 0.18); // subtle cool in midtones
    color = color * 1.05 - 0.004;

    // Fine cinematic grain (not too busy)
    float grain = hash13(vec3(gl_FragCoord.xy, uTime * 18.0)) - 0.5;
    color += grain * 0.0095;

    // Gentle highlight rolloff
    color = min(color, vec3(1.0));

    // Slight exposure lift so the structure (disk + photon ring + lensed tracks)
    // reads clearly against the site's dark overlays. Still very dark & cinematic.
    color = color * 1.12 + 0.004;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function HermesBlackHoleRender() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    // HMR / React StrictMode / fast refresh resilience.
    // Direct DOM canvas appending + WebGL is extremely sensitive to stale
    // instances. Always nuke previous children before creating a new renderer.
    // This is the most common cause of "changes not showing" or "old shader stuck".
    while (mount.firstChild) {
      mount.removeChild(mount.firstChild);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[HermesBlackHoleRender] mounting renderer (HMR-friendly)');
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: new URLSearchParams(window.location.search).has('verify-webgl'),
      });
    } catch {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const emptyPlate = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    emptyPlate.needsUpdate = true;
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uPlate: { value: emptyPlate as THREE.Texture },
      uPlateResolution: { value: new THREE.Vector2(1672, 941) },
      uPlateReady: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId: number | null = null;
    let startedAt = performance.now();
    let plateTexture: THREE.Texture | null = null;

    scene.add(mesh);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x020202, 0);
    renderer.domElement.className = 'hermes-render-canvas';
    renderer.domElement.dataset.hermesRender = 'black-hole';
    mount.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/assets/hermes-black-hole-render.png', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.generateMipmaps = true;
      texture.needsUpdate = true;

      plateTexture = texture;
      uniforms.uPlate.value = texture;
      uniforms.uPlateResolution.value.set(texture.image.width || 1672, texture.image.height || 941);
      uniforms.uPlateReady.value = 1;
      render();
    });

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);

      const dpr = getRenderPixelRatio(3);
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      // Drawing-buffer pixels (matches gl_FragCoord / retina).
      uniforms.uResolution.value.set(w * dpr, h * dpr);
    };

    const render = () => {
      uniforms.uTime.value = (performance.now() - startedAt) / 1000;
      renderer.render(scene, camera);
    };

    const animate = () => {
      render();
      frameId = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render();
    });

    resize();
    resizeObserver.observe(mount);

    if (reducedMotion) {
      startedAt -= 8400;
      render();
    } else {
      animate();
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();

      // Extra defensive cleanup (HMR can sometimes leave orphans)
      try {
        geometry.dispose();
        material.dispose();
        emptyPlate.dispose();
        plateTexture?.dispose();
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        if (mount) {
          while (mount.firstChild) {
            mount.removeChild(mount.firstChild);
          }
        }
      } catch (e) {
        // swallow disposal errors during rapid HMR
      }
    };
  }, []);

  return <div ref={mountRef} className="hermes-render-host" />;
}
