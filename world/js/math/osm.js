const ORIGIN_LAT = 54.769;
const ORIGIN_LON = 11.8743;

const Osm = {
  parseRoads: async (data) => {
    const points = [];
    const segments = [];
    const nodeMap = new Map();

    // Convert all nodes to global x/y points
    for (const node of data.elements.filter((n) => n.type === "node")) {
      const { x, y } = latLonToXY(node.lat, node.lon, ORIGIN_LAT, ORIGIN_LON);

      const point = new Point(x, -y); // negative y for canvas
      point.id = node.id;

      points.push(point);
      nodeMap.set(node.id, point); // store POINT, not raw node
    }

    // Build segments using those SAME points
    for (const way of data.elements.filter((w) => w.type === "way")) {
      for (let i = 1; i < way.nodes.length; i++) {
        const prev = nodeMap.get(way.nodes[i - 1]);
        const cur = nodeMap.get(way.nodes[i]);

        if (!prev || !cur) continue;

        const oneWay = way.tags.oneway || way.tags.lanes == 1;
        segments.push(new Segment(prev, cur, oneWay));
      }
    }

    return { points, segments };
  },
};
