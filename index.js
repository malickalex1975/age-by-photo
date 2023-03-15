let constraints = {
  video: {
    width: { min: 1024, ideal: 1280, max: 1920 },
    height: { min: 720, ideal: 720, max: 1080 },
    facingMode: { exact: "user" },
  },
};
let streamStarted = false;
let errors = 0;

class AgeRecognition {
  constructor() {}

  handleStream = (stream) => {
    video.srcObject = stream;
    console.log(video.srcObject);
    streamStarted = true;
    video.play();
  };

  startStream = async (constraints) => {
    try {
      this.showWarning(false);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.handleStream(stream);
    } catch {
      stopScan();
      video.srcObject = null;
      ageRecognition.showWarning(
        "Ваше устройство не имеет камеру или вы запретили её использовать!",
        true
      );
      setTimeout(() => ageRecognition.showWarning(false), 10000);
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
    startScan();
    buttonAge.style.visibility='hidden'
    if (this.streamStarted) {
      canvas.width = video?.videoWidth / 2;
      canvas.height = video?.videoHeight / 2;

      ctx.drawImage(video, 0, 0);
    }
  };
}
const ageRecognition = new AgeRecognition();
const warning = document.querySelector(".warning");
const frame = document.querySelector(".frame");
const scanLine = document.querySelector(".scan-line");
const video = document.querySelector("video");
const buttonAge = document.querySelector(".button-age");
buttonAge.textContent = "УЗНАЙ СВОЙ ВОЗРАСТ";
buttonAge.addEventListener("click", ageRecognition.doScreenshot);
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
document.addEventListener("DOMContentLoaded", () => init());

function init() {
  blockScreen();
  stopScan();
  ageRecognition.showWarning("Разрешите использовать камеру в браузере!", true);
  ageRecognition.play();
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
