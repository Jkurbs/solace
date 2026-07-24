'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { buildEarthPointCloud } from '@/features/glorya/earth-points';
import { gloryaPlaceLabel, type GloryaEvaluatedNeed } from '@/features/glorya/types';
import { getRenderPixelRatio } from '@/lib/webgl-dpr';
import { isWebglPaused, observeWebglMountVisibility, subscribeWebglPause } from '@/lib/webgl-lifecycle';

type GloryaNeedFieldProps = {
  needs: GloryaEvaluatedNeed[];
  compact?: boolean;
  className?: string;
};

function latLonToVector3(lat: number, lon: number, radius: number) {
  // Same Y-up geo convention as features/glorya/earth-points.ts
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lonRad),
    radius * Math.sin(latRad),
    radius * cosLat * Math.sin(lonRad),
  );
}

function greatCirclePoints(a: THREE.Vector3, b: THREE.Vector3, segments: number, lift: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().copy(a).lerp(b, t).normalize();
    const arc = Math.sin(t * Math.PI) * lift;
    p.multiplyScalar(1 + arc);
    points.push(p);
  }
  return points;
}

function makeCircleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function GloryaNeedField({ needs, compact = false, className = '' }: GloryaNeedFieldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const needsRef = useRef(needs);
  needsRef.current = needs;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanupScene: (() => void) | null = null;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    (async () => {
      let cloud;
      try {
        cloud = await buildEarthPointCloud({
          targetCount: compact ? 14000 : 42000,
          radius: 1,
          landDensity: compact ? 0.78 : 0.9,
        });
      } catch (error) {
        if (!disposed) {
          setLoadError(error instanceof Error ? error.message : 'Earth map unavailable');
        }
        return;
      }

      if (disposed || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(compact ? 36 : 40, 1, 0.1, 50);
      camera.position.set(0, 0, 3);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = 'glorya-globe-canvas';
      mount.appendChild(renderer.domElement);
      renderer.setPixelRatio(getRenderPixelRatio(compact ? 2 : 3));

      const root = new THREE.Group();
      scene.add(root);

      const radius = 1;
      const contentRadius = radius * 1.22;
      const fitPadding = compact ? 1.08 : 1.12;

      const fitCamera = (aspect: number) => {
        camera.aspect = aspect;
        const vFov = (camera.fov * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
        const distV = (contentRadius * fitPadding) / Math.sin(vFov / 2);
        const distH = (contentRadius * fitPadding) / Math.sin(hFov / 2);
        camera.position.set(0, 0, Math.max(distV, distH));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      };

      const circleTex = makeCircleTexture();
      const landGeo = new THREE.BufferGeometry();
      landGeo.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3));
      landGeo.setAttribute('color', new THREE.BufferAttribute(cloud.colors, 3));
      const landMat = new THREE.PointsMaterial({
        vertexColors: true,
        map: circleTex ?? undefined,
        size: compact ? 0.011 : 0.0095,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      root.add(new THREE.Points(landGeo, landMat));

      // Soft limb glow — neutral, barely cool.
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.025, 48, 32),
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.BackSide,
          uniforms: {
            uColor: { value: new THREE.Color(0x9aa8c8) },
          },
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 uColor;
            varying vec3 vNormal;
            void main() {
              float fres = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
              gl_FragColor = vec4(uColor, clamp(fres, 0.0, 1.0) * 0.2);
            }
          `,
        }),
      );
      root.add(atmosphere);

      type Marker = {
        need: GloryaEvaluatedNeed;
        core: THREE.Mesh;
        halo: THREE.Mesh;
      };
      const markers: Marker[] = [];
      const markerRoots: THREE.Object3D[] = [];
      const pinColors = [0xc4a6e8, 0xe8a0b8, 0xa8d4e8, 0xd4b8f0, 0xf0b090];

      needsRef.current.forEach((need, index) => {
        const pos = latLonToVector3(need.lat, need.lon, radius * 1.012);
        const standDown = need.status === 'standing_down';
        const color = standDown ? 0xa898bc : pinColors[index % pinColors.length];

        const core = new THREE.Mesh(
          new THREE.SphereGeometry(compact ? 0.014 : 0.015, 12, 12),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }),
        );
        core.position.copy(pos);

        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(compact ? 0.03 : 0.036, 16, 16),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.15,
            depthWrite: false,
          }),
        );
        halo.position.copy(pos);

        root.add(halo);
        root.add(core);
        markers.push({ need, core, halo });
        markerRoots.push(core, halo);
      });

      const arcMats: THREE.LineBasicMaterial[] = [];
      const arcGeos: THREE.BufferGeometry[] = [];
      if (!compact && needsRef.current.length >= 2) {
        const pairs: Array<[number, number, number]> = [
          [0, 1, 0xb090d0],
          [1, 3, 0x90c4e0],
          [2, 4, 0xe0a0b0],
        ];
        for (const [i, j, hex] of pairs) {
          const a = needsRef.current[i];
          const b = needsRef.current[j];
          if (!a || !b) continue;
          const pa = latLonToVector3(a.lat, a.lon, radius);
          const pb = latLonToVector3(b.lat, b.lon, radius);
          const curvePts = greatCirclePoints(pa, pb, 64, 0.12 + Math.abs(a.lat - b.lat) * 0.0015);
          const geo = new THREE.BufferGeometry().setFromPoints(curvePts);
          const mat = new THREE.LineBasicMaterial({
            color: hex,
            transparent: true,
            opacity: 0.26,
            depthWrite: false,
          });
          arcMats.push(mat);
          arcGeos.push(geo);
          root.add(new THREE.Line(geo, mat));
        }
      }

      const raycaster = new THREE.Raycaster();
      raycaster.params.Points = { threshold: 0.04 };

      let frameId: number | null = null;
      let inView = true;
      let pageVisible = !document.hidden;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let downX = 0;
      let downY = 0;
      let velX = 0;
      let velY = 0;
      let autoSpin = reducedMotion ? 0 : 0.085;
      const targetRot = { x: 0.12, y: -0.55 };
      root.rotation.x = targetRot.x;
      root.rotation.y = targetRot.y;
      let hoverId: string | null = null;
      // Touch: free page scroll by default; long-press arms rotate (desktop still drag-to-rotate).
      let longPressTimer: number | null = null;
      let activePointerId: number | null = null;
      const LONG_PRESS_MS = 420;
      const MOVE_CANCEL_PX = 12;
      const fieldEl = mount.closest('.glorya-field');

      const canRun = () => inView && pageVisible && !isWebglPaused() && !reducedMotion;

      const isTouchLike = (event: PointerEvent) =>
        event.pointerType === 'touch' ||
        (event.pointerType !== 'mouse' && window.matchMedia('(pointer: coarse)').matches);

      const clearLongPress = () => {
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      const setRotateMode = (on: boolean) => {
        fieldEl?.classList.toggle('is-rotate-armed', on);
        renderer.domElement.classList.toggle('is-rotate-armed', on);
        // Keep CSS and inline in sync so mid-gesture arming stops page pan.
        renderer.domElement.style.touchAction = on ? 'none' : 'pan-y';
      };

      const endDrag = (pointerId?: number) => {
        clearLongPress();
        dragging = false;
        setRotateMode(false);
        const id = pointerId ?? activePointerId;
        activePointerId = null;
        if (id === null) return;
        try {
          if (renderer.domElement.hasPointerCapture(id)) {
            renderer.domElement.releasePointerCapture(id);
          }
        } catch {
          // ignore
        }
      };

      const beginRotate = (pointerId: number) => {
        dragging = true;
        autoSpin = 0;
        velX = 0;
        velY = 0;
        setRotateMode(true);
        try {
          renderer.domElement.setPointerCapture(pointerId);
        } catch {
          // ignore
        }
      };

      const resize = () => {
        const w = Math.max(1, mount.clientWidth);
        const h = Math.max(1, mount.clientHeight);
        renderer.setPixelRatio(getRenderPixelRatio(compact ? 2 : 3));
        renderer.setSize(w, h, false);
        fitCamera(w / h);
      };

      const setHover = (id: string | null) => {
        if (hoverId === id) return;
        hoverId = id;
        if (!compact) setActiveId(id);
        for (const marker of markers) {
          const on = marker.need.id === id;
          (marker.core.material as THREE.MeshBasicMaterial).opacity = on ? 1 : 0.95;
          (marker.halo.material as THREE.MeshBasicMaterial).opacity = on ? 0.32 : 0.15;
          const s = on ? 1.55 : 1;
          marker.core.scale.setScalar(s);
          marker.halo.scale.setScalar(on ? 1.7 : 1);
        }
      };

      const pick = (clientX: number, clientY: number) => {
        if (compact) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const hits = raycaster.intersectObjects(markerRoots, false);
        if (!hits.length) {
          setHover(null);
          return;
        }
        const obj = hits[0].object;
        const found = markers.find((m) => m.core === obj || m.halo === obj);
        setHover(found?.need.id ?? null);
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        activePointerId = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        downX = event.clientX;
        downY = event.clientY;
        velX = 0;
        velY = 0;

        // Mouse / pen: immediate drag-to-rotate.
        if (!isTouchLike(event)) {
          beginRotate(event.pointerId);
          return;
        }

        // Touch: do not capture — page scroll stays free until long-press arms rotate.
        clearLongPress();
        dragging = false;
        setRotateMode(false);
        longPressTimer = window.setTimeout(() => {
          longPressTimer = null;
          if (activePointerId !== event.pointerId) return;
          beginRotate(event.pointerId);
        }, LONG_PRESS_MS);
      };

      const onPointerMove = (event: PointerEvent) => {
        // Finger moved before long-press → user is scrolling; cancel arming.
        if (longPressTimer !== null && !dragging) {
          const dist = Math.hypot(event.clientX - downX, event.clientY - downY);
          if (dist > MOVE_CANCEL_PX) {
            clearLongPress();
          }
          return;
        }

        if (dragging) {
          const dx = event.clientX - lastX;
          const dy = event.clientY - lastY;
          lastX = event.clientX;
          lastY = event.clientY;
          velX = dx * 0.0045;
          velY = dy * 0.0035;
          targetRot.y += velX;
          targetRot.x = Math.max(-0.55, Math.min(0.55, targetRot.x + velY));
          return;
        }
        if (event.pointerType === 'mouse') {
          pick(event.clientX, event.clientY);
        }
      };

      const onPointerUp = (event: PointerEvent) => {
        // Quick tap (no rotate) can still select a city on touch.
        if (!dragging && event.pointerType === 'touch') {
          pick(event.clientX, event.clientY);
        }
        endDrag(event.pointerId);
      };

      const onPointerLeave = () => {
        // Only end mouse hover leave; touch leave often fires mid-gesture.
        if (activePointerId === null || !dragging) {
          setHover(null);
        }
      };

      const onPointerCancel = (event: PointerEvent) => {
        endDrag(event.pointerId);
      };

      const stopLoop = () => {
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
      };

      const tryStartLoop = () => {
        if (!canRun() || frameId !== null) return;
        frameId = requestAnimationFrame(animate);
      };

      const animate = () => {
        if (!canRun()) {
          frameId = null;
          return;
        }

        if (!dragging) {
          targetRot.y += autoSpin * 0.016;
          targetRot.y += velX;
          targetRot.x = Math.max(-0.55, Math.min(0.55, targetRot.x + velY));
          velX *= 0.935;
          velY *= 0.935;
          if (Math.abs(velX) + Math.abs(velY) < 0.00012 && autoSpin === 0 && !reducedMotion) {
            autoSpin = 0.07;
          }
        }

        root.rotation.x += (targetRot.x - root.rotation.x) * 0.1;
        root.rotation.y += (targetRot.y - root.rotation.y) * 0.1;

        const t = performance.now() / 1000;
        for (const marker of markers) {
          if (marker.need.id === hoverId) continue;
          const pulse = 1 + Math.sin(t * 1.8 + marker.need.needScore * 5) * 0.06;
          marker.halo.scale.setScalar(pulse);
        }
        landMat.opacity = 0.84 + Math.sin(t * 0.3) * 0.03;

        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      };

      const resizeObserver = new ResizeObserver(() => {
        resize();
        renderer.render(scene, camera);
      });

      const visibilityWatch = observeWebglMountVisibility(mount, (visible) => {
        inView = visible;
        if (visible) tryStartLoop();
        else stopLoop();
      });

      const onDocVisibility = () => {
        pageVisible = !document.hidden;
        if (pageVisible) tryStartLoop();
        else stopLoop();
      };

      const unsubPause = subscribeWebglPause((paused) => {
        if (paused) stopLoop();
        else tryStartLoop();
      });

      if (!compact) {
        // pan-y so vertical page scroll works over the globe until rotate is armed.
        renderer.domElement.style.touchAction = 'pan-y';
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointercancel', onPointerCancel);
        renderer.domElement.addEventListener('pointerleave', onPointerLeave);
      }

      document.addEventListener('visibilitychange', onDocVisibility);
      resizeObserver.observe(mount);
      resize();

      if (reducedMotion) {
        renderer.render(scene, camera);
      } else {
        tryStartLoop();
      }

      requestAnimationFrame(() => {
        renderer.domElement.classList.add('is-ready');
      });

      cleanupScene = () => {
        stopLoop();
        clearLongPress();
        setRotateMode(false);
        unsubPause();
        visibilityWatch.disconnect();
        resizeObserver.disconnect();
        document.removeEventListener('visibilitychange', onDocVisibility);
        if (!compact) {
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          renderer.domElement.removeEventListener('pointermove', onPointerMove);
          renderer.domElement.removeEventListener('pointerup', onPointerUp);
          renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
          renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
        }
        landGeo.dispose();
        landMat.dispose();
        circleTex?.dispose();
        atmosphere.geometry.dispose();
        (atmosphere.material as THREE.Material).dispose();
        for (const marker of markers) {
          marker.core.geometry.dispose();
          (marker.core.material as THREE.Material).dispose();
          marker.halo.geometry.dispose();
          (marker.halo.material as THREE.Material).dispose();
        }
        for (const geo of arcGeos) geo.dispose();
        for (const mat of arcMats) mat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      disposed = true;
      cleanupScene?.();
    };
  }, [compact]);

  const active = needs.find((n) => n.id === activeId) ?? null;

  return (
    <div className={`glorya-field ${compact ? 'is-compact' : 'is-full'} ${className}`.trim()}>
      <div ref={mountRef} className="glorya-field-mount" />
      {loadError ? <p className="glorya-field-error">{loadError}</p> : null}
      {!compact ? (
        <div className={`glorya-field-readout ${active ? 'is-active' : ''}`} aria-live="polite">
          {active ? (
            <>
              <strong>{gloryaPlaceLabel(active)}</strong>
              <span>
                {active.focus} · need {active.needScore.toFixed(2)} ·{' '}
                {active.status === 'standing_down' ? 'Standing down' : 'Evaluated'}
              </span>
              <em>{active.note}</em>
            </>
          ) : (
            <>
              <strong>City markers</strong>
              <span>Hover for place · need · status</span>
              <em>Real coordinates · evaluation only</em>
            </>
          )}
        </div>
      ) : null}
      <span className="sr-only">
        Interactive dotted globe built from an Earth land mask. Soft marks show evaluated needs. No capital is live.
      </span>
    </div>
  );
}
