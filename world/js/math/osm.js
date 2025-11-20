const ORIGIN_LAT = 54.769;
const ORIGIN_LON = 11.8743;

const Osm = {
  parseRoads: async (data) => {
    const points = [];
    const segments = [];
    const nodeMap = new Map();
    const buildings = [];
    const roads = [];

    const parkingElements = []; // raw OSM elements with amenity=parking

    // Collect buildings + roads + parking
    data.elements.forEach((e) => {
      if (e.tags?.building) {
        buildings.push(e);
      }
      if (e.tags?.highway) {
        roads.push(e);
      }
      if (e.tags?.amenity === "parking") {
        parkingElements.push(e);
      }
    });

    // Convert all nodes to global x/y points
    for (const node of data.elements.filter((n) => n.type === "node")) {
      const { x, y } = latLonToXY(node.lat, node.lon, ORIGIN_LAT, ORIGIN_LON);

      const point = new Point(x, -y); // negative y for canvas
      point.id = node.id;

      points.push(point);
      nodeMap.set(node.id, point);
    }

    // Build road segments
    for (const way of roads.filter((w) => w.type === "way")) {
      for (let i = 1; i < way.nodes.length; i++) {
        const prev = nodeMap.get(way.nodes[i - 1]);
        const cur = nodeMap.get(way.nodes[i]);
        if (!prev || !cur) continue;

        const oneWay = way.tags.oneway || way.tags.lanes == 1;
        segments.push(new Segment(prev, cur, oneWay));
      }
    }

    // Build building polygons
    const buildingPolys = [];

    for (const house of buildings.filter((b) => b.type === "way")) {
      if (!house.nodes || house.nodes.length < 3) continue;

      const pts = [];
      for (const nodeId of house.nodes) {
        const p = nodeMap.get(nodeId);
        if (p) pts.push(new Point(p.x, p.y));
      }

      // drop duplicate closing node
      if (
        pts.length > 1 &&
        pts[0].x === pts[pts.length - 1].x &&
        pts[0].y === pts[pts.length - 1].y
      ) {
        pts.pop();
      }

      if (pts.length >= 3) {
        buildingPolys.push({
          house,
          poly: new Polygon(pts),
        });
      }
    }

    // Build parking polygons
    const parkingPolys = [];

    for (const park of parkingElements.filter((p) => p.type === "way")) {
      if (!park.nodes || park.nodes.length < 3) continue;

      const pts = [];
      for (const nodeId of park.nodes) {
        const p = nodeMap.get(nodeId);
        if (p) pts.push(new Point(p.x, p.y));
      }

      // drop duplicate closing node
      if (
        pts.length > 1 &&
        pts[0].x === pts[pts.length - 1].x &&
        pts[0].y === pts[pts.length - 1].y
      ) {
        pts.pop();
      }

      if (pts.length >= 3) {
        parkingPolys.push({
          info: park,
          poly: new Polygon(pts),
        });
      }
    }

    return {
      points,
      segments,
      buildings: buildingPolys,
      parking: parkingPolys,
    };
  },
};
