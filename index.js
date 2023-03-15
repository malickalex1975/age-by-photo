let constraints = {
  video: {
    facingMode: { exact: "user" },
  },
};
let streamStarted = false;
let errors=0;

class AgeRecognition {
  constructor() {}

  handleStream = (stream) => {
    video.srcObject = stream;
    console.log(video.srcObject)
    streamStarted = true;
    video.play()
  };

  startStream = async (constraints) => {
    try {
        this.showWarning(false);
    startScan();

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.handleStream(stream);
    } catch {
        stopScan()
        if(errors===0){
      console.log("use front camera instead rear camera");
      this.startStream({ video: { facingMode: "user" } });
      setTimeout(() => (buttonCameraMode.textContent = "front"), 1000);
      errors++;
        }else{
            console.log('allow to use camera for your browser!');
            video.srcObject=null;
            ageRecognition.showWarning('Ваше устройство не имеет камеру или вы запретили её использовать!',true);
            setTimeout(()=>ageRecognition.showWarning(false),10000)
        }
    }
  };
showWarning(message='no message',isVisible){
    let visibility=isVisible?'visible':'hidden';
    warning.style.visibility=visibility;
    warning.textContent=message


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
    if (this.streamStarted) {
      canvas.width = video?.videoWidth / 2;
      canvas.height = video?.videoHeight / 2;

      ctx.drawImage(video, 0, 0);
    }
  };
}
const warning=document.querySelector(".warning")
const frame=document.querySelector(".frame")
const scanLine=document.querySelector(".scan-line")
const video = document.querySelector("video");
const buttonCameraMode = document.querySelector(".button-camera-mode");
buttonCameraMode.textContent = "front";
buttonCameraMode.addEventListener("click", changeCameraMode);
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
document.addEventListener("DOMContentLoaded", () => init());
const ageRecognition = new AgeRecognition();

function init() {
  blockScreen();
  alert("hello");
  ageRecognition.showWarning('Разрешите испольовать камеру в браузере!',true)
  ageRecognition.play();
}
function changeCameraMode() {
  navigator.vibrate(50);
  

  constraints =
    buttonCameraMode.textContent === "front"
      ? {
          video: {
            facingMode: { exact: "environment" },
          },
        }
      : {
          video: {
            facingMode: { exact: "user" },
          },
        };
  buttonCameraMode.textContent =
    buttonCameraMode.textContent === "front" ? "back" : "front";
  video.pause();
  streamStarted = false;
  ageRecognition.play();
}
function blockScreen() {
  screen.orientation.lock("portrait").then(console.log).catch(console.log);
}

function startScan(){scanLine.style.visibility='visible'}
function stopScan(){
    scanLine.style.visibility='hidden'
}
