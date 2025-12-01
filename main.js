const carCanvas = document.getElementById("carCanvas");
carCanvas.width = window.innerWidth - 330;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = 300;

carCanvas.height = window.innerHeight;
networkCanvas.height = window.innerHeight;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

/*
const worldString = localStorage.getItem("world");
const worldInfo = worldString ? JSON.parse(worldString) : null;
const world = worldInfo ? World.load(worldInfo) : new World(new Graph());
*/

const viewport = new Viewport(carCanvas, world.zoom, world.offset);

const N = 30;
let cars = generateCars(N);
let bestCar = cars[0];

const storedBrain = localStorage.getItem("bestBrain");
if (storedBrain) {
  const baseBrain = JSON.parse(storedBrain);
  cars[0].brain = baseBrain;
  for (let i = 1; i < cars.length; i++) {
    cars[i].brain = JSON.parse(storedBrain);
    NeuralNetwork.mutate(cars[i].brain, 0.1);
  }
}

const traffic = [];
let roadBorders = [];
const target = world.markings.find((m) => m instanceof Target);
if (target) {
  world.generateCorridor(bestCar, target.center);
  roadBorders = world.corridor.map((s) => [s.p1, s.p2]);
} else {
  roadBorders = world.roadBorders.map((s) => [s.p1, s.p2]);
}

animate();

function save() {
  localStorage.setItem("bestBrain", JSON.stringify(bestCar.brain));
}

function discard() {
  localStorage.removeItem("bestBrain");
}

function generateCars(N) {
  const startPoints = world.markings.filter((m) => m instanceof Start);
  const startPoint =
    startPoints.length > 0 ? startPoints[0].center : new Point(100, 100);

  const dir =
    startPoints.length > 0 ? startPoints[0].directionVector : new Point(0, -1);
  const startAngle = -angle(dir) + Math.PI / 2;

  const cars = [];
  for (let i = 0; i < N; i++) {
    const car = new Car(startPoint.x, startPoint.y, 30, 50, "AI", startAngle);
    car.load(carInfo);
    cars.push(car);
  }

  return cars;
}

function animate(time) {
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].update(roadBorders, []);
  }

  let currentBest = bestCar;
  for (let i = 0; i < cars.length; i++) {
    cars[i].update(roadBorders, traffic);
    if (!currentBest || cars[i].fittness > currentBest.fittness) {
      currentBest = cars[i];
    }
  }

  bestCar = currentBest;

  world.cars = cars;
  world.bestCar = bestCar;

  viewport.offset.x = -bestCar.x;
  viewport.offset.y = -bestCar.y;

  viewport.reset();
  const viewPoint = scale(viewport.getOffset(), -1);
  world.draw(carCtx, viewPoint, false);

  for (let i = 0; i < traffic.length; i++) {
    traffic[i].draw(carCtx, "red");
  }

  networkCtx.lineDashOffset = -time / 50;
  networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
  Visualizer.drawNetwork(networkCtx, bestCar.brain);
  requestAnimationFrame(animate);
}
