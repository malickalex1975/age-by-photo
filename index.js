let screenWidth, screenHeight, constraints, canvas, ctx, canvas2, ctx2;
let streamStarted = false;

class AgeRecognition {
  constructor() {}

  handleStream = (stream) => {
    video.srcObject = stream;
    console.log(video.srcObject);
    streamStarted = true;
    video.play();
    setTimeout(() => showInformation(), 1000);
    setTimeout(() => showButtonAge(), 1500);
  };

  startStream = async (constraints) => {
    try {
      this.showWarning(false);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.handleStream(stream);
    } catch {
      stopScan();
      hideButtonAge();
      information.textContent = "ОШИБКА";
      video.srcObject = null;
      ageRecognition.showWarning(
        "Ошибка камеры или вы запретили её использовать!",
        true
      );
      setTimeout(() => ageRecognition.showWarning("", false), 10000);
    }
  };
  showWarning(message = "no message", isVisible) {
    let visibility = isVisible ? "visible" : "hidden";
    warning.style.visibility = visibility;
    warning.textContent = message;
  }
  async play() {
    if (streamStarted) {
      video.play();
      return;
    }
    if ("mediaDevices" in navigator) {
      this.startStream(constraints);
    } else {
      console.log("no mediadevices");
    }
  }

  doScreenshot = () => {
    navigator.vibrate(150);
    setInformation("СКАНИРУЮ...");
    startScan();
    //hideButtonAge();
    let framePosition = getFramePosition();
    if (streamStarted) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log(video.videoHeight, video.videoWidth)
      ctx.drawImage(video, 0, 0);
      let img = ctx.getImageData(
        framePosition.x,
        framePosition.y,
        framePosition.width,
        framePosition.height
      );
      canvas2.width = framePosition.width;
      canvas2.height = framePosition.height;
      ctx2.putImageData(img, 0, 0);
    }
  };
}
const ageRecognition = new AgeRecognition();
const warning = document.querySelector(".warning");
const information = document.querySelector(".information");
const frame = document.querySelector(".frame");
const scanLine = document.querySelector(".scan-line");
const video = document.querySelector("video");
const buttonAge = document.querySelector(".button-age");
buttonAge.textContent = "УЗНАЙ СВОЙ ВОЗРАСТ";
buttonAge.addEventListener("click", ageRecognition.doScreenshot);
document.addEventListener("DOMContentLoaded", () => init());

function init() {
  //blockScreen();
  getScreenSizes();
  setConstraints();
  window.addEventListener("resize", () => {
    getScreenSizes();
    setConstraints();
  });
  setInformation("ПОМЕСТИТЕ ЛИЦО В РАМКУ");
  ageRecognition.showWarning("Разрешите использовать камеру в браузере!", true);
  ageRecognition.play();
  canvas = document.querySelector(".canvas1");
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas2 = document.querySelector(".canvas2");
  ctx2 = canvas2.getContext("2d", { willReadFrequently: true });
}

function blockScreen() {
  screen.orientation.lock("portrait").then(alert).catch(alert);
}

function startScan() {
  scanLine.style.visibility = "visible";
}
function stopScan() {
  scanLine.style.visibility = "hidden";
}
function setInformation(message) {
  information.textContent = message;
}
function showInformation() {
  information.style.visibility = "visible";
}
function hideInformation() {
  information.style.visibility = "hidden";
}
function showButtonAge() {
  buttonAge.style.visibility = "visible";
}
function hideButtonAge() {
  buttonAge.style.visibility = "hidden";
}
function getScreenSizes() {
  screenHeight = document.documentElement.clientHeight;
  screenWidth = document.documentElement.clientWidth;
}
function setConstraints() {
  constraints = {
    video: {
      width: { min: 1024, ideal: screenWidth, max: 1920 },
      height: { min: 720, ideal: screenHeight, max: 1080 },
      facingMode: { exact: "user" },
    },
  };
}
function getFramePosition() {
  let x0 = canvas.getBoundingClientRect().x;
  let y0 = canvas.getBoundingClientRect().y;
  let x = frame.getBoundingClientRect().x;
  let y = frame.getBoundingClientRect().y;
  let width = frame.getBoundingClientRect().width;
  let height = frame.getBoundingClientRect().height;
  x=x0+x;
  y=y0+y;
  console.log({ x, y, width, height });
  return { x, y, width, height };
}
