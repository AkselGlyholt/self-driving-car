//
// Chunk loading config
//
const CHUNK_SIZE = 2000; // meters
const FETCH_DISTANCE = 200; // meters before triggering reload
const INSET = 1; // avoid bbox overlap
const MAX_PARALLEL = 3;

let lastFetchX = null;
let lastFetchY = null;

const chunkQueue = [];
let isFetchingChunk = false;

const loadedChunks = new Map(); // key -> parsed OSM chunk
const loadingChunks = new Set(); // keys currently in-flight

//
// Helpers
//
function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

function getChunkCoords(x, y) {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cy: Math.floor(y / CHUNK_SIZE),
  };
}

function buildBBox(cx, cy) {
  const x1 = cx * CHUNK_SIZE + INSET;
  const y1 = cy * CHUNK_SIZE + INSET;
  const x2 = x1 + CHUNK_SIZE - INSET * 2;
  const y2 = y1 + CHUNK_SIZE - INSET * 2;

  const topLeft = xyToLatLon(x1, y2, ORIGIN_LAT, ORIGIN_LON);
  const bottomRight = xyToLatLon(x2, y1, ORIGIN_LAT, ORIGIN_LON);

  return {
    south: bottomRight.lat,
    west: topLeft.lon,
    north: topLeft.lat,
    east: bottomRight.lon,
  };
}

function buildQuery({ south, west, north, east }) {
  const bbox = `${south}, ${west}, ${north}, ${east}`;

  return `
    [out:json][timeout:25];
    (
      way["highway"]
      ["highway" !~ "track"]
      ["highway" !~ "cycleway"]
      ["highway" !~ "footway"]
      ["highway" !~ "path"]
      ["highway" !~ "steps"]
      ["highway" !~ "pedestrian"]
      (${bbox});

      nwr["building"](${bbox});

      nwr["amenity"="parking"](${bbox});
    );
    out body;
    >;
    out skel;
  `;
}

//
// Fetch & parse one chunk
//
async function loadChunk(cx, cy) {
  cy = -cy;
  const key = chunkKey(cx, cy);
  if (loadedChunks.has(key) || loadingChunks.has(key)) return;

  loadingChunks.add(key);

  try {
    const bbox = buildBBox(cx, cy);
    const query = buildQuery(bbox);

    const res = await fetch(
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
      }
    );

    const text = await res.text();

    if (!text.trim().startsWith("{")) {
      throw new Error("Overpass rate limit / invalid JSON response");
    }

    const json = JSON.parse(text);
    const parsed = await Osm.parseRoads(json);

    loadedChunks.set(key, parsed);
    world.addChunk(parsed);
  } finally {
    loadingChunks.delete(key);
  }
}

//
// Chunk queue processor (rate-limited)
//
async function processChunkQueue() {
  if (loadingChunks.size >= MAX_PARALLEL) return;
  if (chunkQueue.length === 0) return;

  const { cx, cy } = chunkQueue.shift();
  loadChunk(cx, cy).finally(() => {
    setTimeout(processChunkQueue, 100);
  });

  // Try to start more in parallel
  processChunkQueue();
}

//
// Called every frame from animate()
// Adds needed chunks to queue if car moved far enough
//
function updateChunkLoading(carX, carY) {
  if (
    lastFetchX !== null &&
    Math.hypot(carX - lastFetchX, carY - lastFetchY) < FETCH_DISTANCE
  ) {
    return;
  }

  lastFetchX = carX;
  lastFetchY = carY;

  const { cx, cy } = getChunkCoords(carX, carY);

  // Load a 3x3 region around the car
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = chunkKey(cx + dx, cy + dy);
      if (!loadedChunks.has(key) && !loadingChunks.has(key)) {
        chunkQueue.push({ cx: cx + dx, cy: cy + dy });
      }
    }
  }

  processChunkQueue();
}
