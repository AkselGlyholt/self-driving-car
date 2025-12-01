class Sensor {
  constructor(
    car,
    {
      rayCount = 5,
      rayLength = 150,
      raySpread = Math.PI / 2,
      rayOffset = 0,
    } = {}
  ) {
    this.car = car;
    this.rayCount = rayCount;
    this.rayLength = rayLength;
    this.raySpread = raySpread;
    this.rayOffset = rayOffset;

    this.rays = [];
    this.readings = [];
  }

  update(roadBorders, traffic) {
    this.#castRays();
    this.readings = [];

    for (let i = 0; i < this.rays.length; i++) {
      this.readings.push(this.#getReading(this.rays[i], roadBorders, traffic));
    }
  }

  #getReading(ray, roadBorders, traffic) {
    let closestTouch = null;
    const [start, end] = ray;

    const registerTouch = (touch) => {
      if (touch && (!closestTouch || touch.offset < closestTouch.offset)) {
        closestTouch = touch;
      }
    };

    for (let i = 0; i < roadBorders.length; i++) {
      registerTouch(
        getIntersection(start, end, roadBorders[i][0], roadBorders[i][1])
      );
    }

    /*
    for (let i = 0; i < traffic.length; i++) {
      const poly = traffic[i].polygon;
      if (!poly) {
        continue;
      }
      
      for (let j = 0; j < poly.length; j++) {
        registerTouch(
          getIntersection(start, end, poly[j], poly[(j + 1) % poly.length])
        );
      }
    }
    */

    return closestTouch;
  }

  #castRays() {
    this.rays = [];

    for (let i = 0; i < this.rayCount; i++) {
      const rayAngle =
        lerp(
          this.raySpread / 2,
          -this.raySpread / 2,
          this.rayCount == 1 ? 0.5 : i / (this.rayCount - 1)
        ) +
        this.car.angle +
        this.rayOffset;

      const start = { x: this.car.x, y: this.car.y };
      const end = {
        x: this.car.x - Math.sin(rayAngle) * this.rayLength,
        y: this.car.y - Math.cos(rayAngle) * this.rayLength,
      };

      this.rays.push([start, end]);
    }
  }

  draw(ctx, { color = "yellow" } = {}) {
    for (let i = 0; i < this.rayCount; i++) {
      let end = this.rays[i][1];
      if (this.readings[i]) {
        end = this.readings[i];
      }

      if (this.readings[i] || true) {
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.strokeStyle = color;
        ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        /*
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.moveTo(this.rays[i][1].x, this.rays[i][1].y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        */

        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.strokeStyle = color;
        ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
