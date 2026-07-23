/**
 * Build a point-cloud Earth from an equirectangular satellite map.
 * Land is detected by sampling the texture; ocean is blue-dominant water.
 */

export type EarthPointCloud = {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load earth map: ${src}`));
    img.src = src;
  });
}

/**
 * True when a pixel is continental land (or ice).
 * Tuned on glorya-earth-equirect.jpg where open ocean is ~ (0, 95, 153).
 */
export function pixelIsLand(r: number, g: number, b: number) {
  // Deep / mid ocean on this map: red channel near zero, blue leads.
  if (r < 40 && b > 100 && b > g) return false;
  if (r < 55 && b > 90 && b >= g + 15) return false;

  // Classic blue water
  if (b > g + 12 && b > r + 25 && b > 70) return false;

  // Cyan / shallow tropical water
  if (b > 95 && g > 85 && r < 100 && b >= g - 5 && b > r) return false;

  // Near-black
  if (r + g + b < 40) return false;

  // Ice / snow / bright cloud over land or ice sheet
  if (r > 165 && g > 165 && b > 165) return true;

  // Deserts, vegetation, rock — any non-water remaining
  // Require some red or green mass so pure blue-gray water stays out
  if (r < 30 && g < 110 && b > 100) return false;

  return r > 25 || g > 70;
}

function latLonToUv(lat: number, lon: number) {
  let L = lon;
  while (L < -180) L += 360;
  while (L > 180) L -= 360;
  // Match three.js / geo convention used by latLonToVector3
  const u = (L + 180) / 360;
  const v = (90 - lat) / 180;
  return { u, v };
}

/** Y-up geographic mapping: lon 0 at +X, east toward +Z. */
export function latLonToDirection(lat: number, lon: number) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return {
    x: cosLat * Math.cos(lonRad),
    y: Math.sin(latRad),
    z: cosLat * Math.sin(lonRad),
  };
}

export function directionToLatLon(x: number, y: number, z: number) {
  const lat = (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI;
  const lon = (Math.atan2(z, x) * 180) / Math.PI;
  return { lat, lon };
}

/**
 * Build a binary land mask and erode once to kill single-pixel ocean speckles
 * that otherwise become floating dots.
 */
function buildLandMask(data: Uint8ClampedArray, width: number, height: number) {
  const raw = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < raw.length; i++, p += 4) {
    raw[i] = pixelIsLand(data[p], data[p + 1], data[p + 2]) ? 1 : 0;
  }

  // 3×3 majority erode: keep land only if ≥ 6 of 9 neighbors are land.
  const mask = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += raw[(y + dy) * width + (x + dx)];
        }
      }
      mask[y * width + x] = sum >= 6 ? 1 : 0;
    }
  }

  // Preserve polar ice rows (majority filter eats poles)
  for (let y = 0; y < height; y++) {
    if (y > 4 && y < height - 5) continue;
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (pixelIsLand(data[p], data[p + 1], data[p + 2])) {
        mask[y * width + x] = 1;
      }
    }
  }

  return mask;
}

function maskAt(mask: Uint8Array, width: number, height: number, lat: number, lon: number) {
  const { u, v } = latLonToUv(lat, lon);
  const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
  const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
  return mask[y * width + x] === 1;
}

function sampleColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  lat: number,
  lon: number,
) {
  const { u, v } = latLonToUv(lat, lon);
  const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
  const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

/** Fibonacci lattice on the unit sphere. */
function fibonacciDirection(index: number, count: number) {
  const t = index + 0.5;
  const y = 1 - (t / count) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (1 + Math.sqrt(5)) * t;
  return {
    x: Math.cos(theta) * r,
    y,
    z: Math.sin(theta) * r,
  };
}

export async function buildEarthPointCloud(options: {
  targetCount?: number;
  radius?: number;
  mapUrl?: string;
  landDensity?: number;
}): Promise<EarthPointCloud> {
  const targetCount = options.targetCount ?? 48000;
  const radius = options.radius ?? 1;
  const mapUrl = options.mapUrl ?? '/assets/glorya-earth-equirect.jpg';
  const landDensity = options.landDensity ?? 0.88;

  const img = await loadImage(mapUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas unavailable for earth mask.');
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const landMask = buildLandMask(data, width, height);

  // Oversample sphere; keep only land-mask hits.
  const sampleCount = Math.ceil(targetCount * 4.5);
  const positions: number[] = [];
  const colors: number[] = [];

  const baseR = 0.52;
  const baseG = 0.62;
  const baseB = 0.86;

  for (let i = 0; i < sampleCount; i++) {
    const dir = fibonacciDirection(i, sampleCount);
    const { lat, lon } = directionToLatLon(dir.x, dir.y, dir.z);
    if (!maskAt(landMask, width, height, lat, lon)) continue;

    // Neighborhood vote: reject single-pixel / thin water speckles.
    const { u, v } = latLonToUv(lat, lon);
    let landVotes = 0;
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = Math.min(width - 1, Math.max(0, Math.floor(u * width) + dx));
      const y = Math.min(height - 1, Math.max(0, Math.floor(v * height) + dy));
      landVotes += landMask[y * width + x];
    }
    if (landVotes < 4) continue;

    const keep = ((i * 1103515245 + 12345) >>> 0) / 4294967295;
    if (keep > landDensity) continue;

    const hash = ((i * 1664525 + 1013904223) >>> 0) / 4294967295;
    const rr = radius * (0.996 + hash * 0.006);
    positions.push(dir.x * rr, dir.y * rr, dir.z * rr);

    const sample = sampleColor(data, width, height, lat, lon);
    const lum = (0.35 * sample.r + 0.45 * sample.g + 0.2 * sample.b) / 255;
    const lift = 0.58 + lum * 0.5;
    const greenBias = (sample.g - sample.r) / 255;
    colors.push(
      Math.min(1, baseR * lift + greenBias * -0.03),
      Math.min(1, baseG * lift + greenBias * 0.04),
      Math.min(1, baseB * lift),
    );

    if (positions.length / 3 >= targetCount) break;
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    count: positions.length / 3,
  };
}
