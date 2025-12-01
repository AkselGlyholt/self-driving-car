class Car {
  constructor(
    x,
    y,
    width,
    height,
    controlType,
    angle = 0,
    maxSpeed = 8,
    color = "blue"
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.speed = 0;
    this.acceleration = 0.08;
    this.maxSpeed = maxSpeed;
    this.friction = 0.04;
    this.angle = angle;
    this.damaged = false;

    this.fittness = 0;

    this.useBrain = controlType == "AI";

    if (controlType != "DUMMY") {
      this.sensor = new Sensor(this, {
        rayCount: 2,
        rayOffset: -0.4,
        raySpread: 0.8,
        rayLength: 350,
      });
      this.stopSensor = new Sensor(this, { rayCount: 1, rayLength: 350 });
      this.lightSensor = new Sensor(this, { rayCount: 1, rayLength: 350 });
      this.brain = new NeuralNetwork([
        this.sensor.rayCount +
          this.stopSensor.rayCount +
          this.lightSensor.rayCount,
        10,
        10,
        4,
      ]);
    }
    this.controls = new Controls(controlType);

    this.img = new Image();
    this.img.src = "car.png";

    this.mask = document.createElement("canvas");
    this.mask.width = width;
    this.mask.height = height;

    const maskCtx = this.mask.getContext("2d");
    this.img.onload = () => {
      maskCtx.fillStyle = color;
      maskCtx.rect(0, 0, this.width, this.height);
      maskCtx.fill();

      maskCtx.globalCompositeOperation = "destination-atop";
      maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
    };
  }

  load(info) {
    this.brain = info.brain;
    this.maxSpeed = info.maxSpeed;
    this.friction = info.friction;
    this.acceleration = info.acceleration;
    this.sensor.rayCount = info.sensor.rayCount;
    this.sensor.raySpread = info.sensor.raySpread;
    this.sensor.rayLength = info.sensor.rayLength;
    this.sensor.rayOffset = info.sensor.rayOffset;
    this.stopSensor.rayCount = info.stopSensor.rayCount;
    this.stopSensor.raySpread = info.stopSensor.raySpread;
    this.stopSensor.rayLength = info.stopSensor.rayLength;
    this.stopSensor.rayOffset = info.stopSensor.rayOffset;
    this.lightSensor.rayCount = info.lightSensor.rayCount;
    this.lightSensor.raySpread = info.lightSensor.raySpread;
    this.lightSensor.rayLength = info.lightSensor.rayLength;
    this.lightSensor.rayOffset = info.lightSensor.rayOffset;
  }

  update(roadBorders, traffic, stopBorders, lightBorders) {
    if (!this.damaged) {
      this.#move();
      this.fittness += this.speed;

      this.polygon = this.#createPolygon();
      this.damaged = this.#assessDamage(roadBorders, traffic);
    }
    if (this.sensor) {
      this.sensor.update(roadBorders, traffic);
      const offsets = this.sensor.readings
        .map((s) => (s == null ? 0 : 1 - s.offset))
        .concat([this.speed / this.maxSpeed]);

      this.stopSensor.update(stopBorders);
      const stopOffsets = this.stopSensor.readings.map((s) =>
        s == null ? 0 : 1 - s.offset
      );
      offsets.push(Math.max(...stopOffsets));

      this.lightSensor.update(lightBorders);
      const lightOffsets = this.lightSensor.readings.map((s) =>
        s == null ? 0 : 1 - s.offset
      );
      offsets.push(Math.max(...lightOffsets));

      const outputs = NeuralNetwork.feedForward(offsets, this.brain);

      if (this.useBrain) {
        this.controls.forward = outputs[0];
        this.controls.left = outputs[1];
        this.controls.right = outputs[2];
        this.controls.reverse = outputs[3];
      }
    }
  }

  #assessDamage(roadBorders, traffic) {
    for (let i = 0; i < roadBorders.length; i++) {
      if (polysIntersect(this.polygon, roadBorders[i])) {
        return true;
      }
    }
    for (let i = 0; i < traffic.length; i++) {
      if (polysIntersect(this.polygon, traffic[i].polygon)) {
        return true;
      }
    }
    return false;
  }

  #createPolygon() {
    const points = [];
    const rad = Math.hypot(this.width, this.height) / 2;
    const alpha = Math.atan2(this.width, this.height);
    points.push({
      x: this.x - Math.sin(this.angle - alpha) * rad,
      y: this.y - Math.cos(this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(this.angle + alpha) * rad,
      y: this.y - Math.cos(this.angle + alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
    });
    return points;
  }

  #move() {
    if (this.controls.forward) {
      this.speed += this.acceleration;
    }
    if (this.controls.reverse) {
      this.speed -= this.acceleration;
    }

    if (this.speed > this.maxSpeed) {
      this.speed = this.maxSpeed;
    }
    if (this.speed < -this.maxSpeed / 2) {
      this.speed = -this.maxSpeed / 2;
    }

    if (this.speed > 0) {
      this.speed -= this.friction;
    }
    if (this.speed < 0) {
      this.speed += this.friction;
    }
    if (Math.abs(this.speed) < this.friction) {
      this.speed = 0;
    }

    if (this.speed != 0) {
      const flip = this.speed > 0 ? 1 : -1;
      if (this.controls.left) {
        this.angle += 0.03 * flip;
      }
      if (this.controls.right) {
        this.angle -= 0.03 * flip;
      }
    }

    this.x -= Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  draw(ctx, drawSensor = false) {
    if (drawSensor) {
      this.sensor.draw(ctx);
      this.stopSensor.draw(ctx, { color: "red" });
      this.lightSensor.draw(ctx, { color: "green" });
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);
    if (!this.damaged) {
      ctx.drawImage(
        this.mask,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
      ctx.globalCompositeOperation = "multiply";
    }
    ctx.drawImage(
      this.img,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );
    ctx.restore();
  }
}
