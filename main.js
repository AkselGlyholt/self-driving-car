const carCanvas = document.getElementById("carCanvas");
carCanvas.width = 200;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = 700;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9);

const N = 2000;
let cars = generateCars(N);
let bestCar = cars[0];

let traffic = generateTraffic(20);

let cycleCount = 1;

document.querySelector(".mutatePercentage").innerHTML = `${
  (0.1 - cycleCount / 1000) * 100
}%`;
document.querySelector(".cycleCountAmount").innerHTML = `${cycleCount}`;

function newCycle() {
  const previousBest = getBestCar(cars).brain;

  cars = generateCars(N);
  traffic = generateTraffic(20);

  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(JSON.stringify(previousBest));

    if (i != 0) {
      NeuralNetwork.mutate(cars[i].brain, 0.1 - cycleCount / 1000);
    }
  }

  document.querySelector(".mutatePercentage").innerHTML = `${
    (0.1 - cycleCount / 1000) * 100
  }%`;
  document.querySelector(".cycleCountAmount").innerHTML = `${cycleCount}`;

  bestCar = cars[0];
}

if (localStorage.getItem("bestBrain")) {
  const saved = JSON.parse(localStorage.getItem("bestBrain"));

  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(JSON.stringify(saved));

    if (i != 0) {
      NeuralNetwork.mutate(cars[i].brain, 0.1 - cycleCount / 1000);
    }
  }

  document.querySelector(".mutatePercentage").innerHTML = `${
    (0.1 - cycleCount / 1000) * 100
  }%`;
}

function generateTraffic(count) {
  const traffic = [];

  traffic.push(new Car(road.getLaneCenter(1), -100, 30, 50, "DUMMY", 2));

  for (let i = 0; i < count; i++) {
    const lane = Math.floor(Math.random() * road.laneCount);
    const y = -200 - i * 200 - Math.random() * 200; // random spacing
    const randomSpeed = Math.random() + 1;

    traffic.push(
      new Car(road.getLaneCenter(lane), y, 30, 50, "DUMMY", randomSpeed)
    );
  }

  //return traffic;

  return [
    new Car(road.getLaneCenter(1), -300, 30, 50, "DUMMY", 2),
    new Car(road.getLaneCenter(0), -500, 30, 50, "DUMMY", 2),
    new Car(road.getLaneCenter(2), -600, 30, 50, "DUMMY", 2),
    new Car(road.getLaneCenter(0), -800, 30, 50, "DUMMY", 2),
    new Car(road.getLaneCenter(1), -800, 30, 50, "DUMMY", 2),
  ];
}

animate();

function save() {
  localStorage.setItem("bestBrain", JSON.stringify(bestCar.brain));
}

function discard() {
  localStorage.removeItem("bestBrain");
}

function generateCars(N) {
  const cars = [];

  for (let i = 1; i <= N; i++) {
    cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI"));
  }

  return cars;
}

function getBestCar() {
  bestCar = cars.reduce((b, c) => (c.score > b.score ? c : b));
  return bestCar;
}

function animate(time) {
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].update(road.borders, []);
  }

  for (let i = 0; i < cars.length; i++) {
    cars[i].update(road.borders, traffic);
  }

  getBestCar();

  carCanvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight;

  carCtx.save();
  carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);

  road.draw(carCtx);
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].draw(carCtx, "red");
  }

  carCtx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    cars[i].draw(carCtx, "blue");
  }

  carCtx.globalAlpha = 1;
  bestCar.draw(carCtx, "blue", true);
  carCtx.restore();

  networkCtx.lineDashOffset = -time / 50;

  Visualizer.drawNetwork(networkCtx, bestCar.brain);
  requestAnimationFrame(animate);
}

setInterval(() => {
  cycleCount += 1;
  newCycle();
}, 15000);
