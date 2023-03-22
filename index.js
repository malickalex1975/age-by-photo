import { FaceDetection } from "./face-detection.js";
let screenWidth,
  screenHeight,
  koeff,
  constraints,
  canvas,
  ctx,
  canvas2,
  ctx2,
  sex,
  realAge;
let isScreenShotProcessing = false;
let streamStarted = false;
let errors = 0;
const fd = new FaceDetection();
const isFDSupported = fd.checkFD();

class AgeRecognition {
  constructor() {}

  checkFaceInFrame(faceX, faceY, faceWidth, faceHeight) {
    let faceX1 = faceX + faceWidth;
    let faceY1 = faceY + faceHeight;
    let framePosition = getFramePosition();
    let frameX = framePosition.x;
    let frameY = framePosition.y;
    let frameWidth = framePosition.width;
    let frameHeight = framePosition.height;
    let frameX1 = frameX + frameWidth;
    let frameY1 = frameY + frameHeight;
    if (
      faceX >= frameX &&
      faceY >= frameY &&
      faceX1 <= frameX1 &&
      faceY1 <= frameY1
    ) {
      return true;
    }
    return false;
  }
  checkFaces(detectedFaces) {
    if (detectedFaces === undefined || detectedFaces.length === 0) {
      whiteFrame();
    } else {
      let faceX = detectedFaces[0].boundingBox.x;
      let faceY = detectedFaces[0].boundingBox.y;
      let faceWidth = detectedFaces[0].boundingBox.width;
      let faceHeight = detectedFaces[0].boundingBox.height;

      if (this.checkFaceInFrame(faceX, faceY, faceWidth, faceHeight)) {
        greenFrame();
        if (!isScreenShotProcessing) {
          showButtonAge();
        }
      } else {
        whiteFrame();
        hideButtonAge();
      }
    }
  }

  processFaceDetection() {
    if (video.videoWidth > 0) {
      if (fd.checkFD()) {
        fd.detect(video).then((detectedFaces) =>
          ageRecognition.checkFaces(detectedFaces)
        );
      }
    } else {
      console.log("no image to detect");
    }
  }

  handleStream = (stream) => {
    video.srcObject = stream;
    streamStarted = true;
    video.play().then(setVideoStyle);
    setTimeout(() => showInformation(), 1000);
    if (!isFDSupported) {
      setTimeout(() => showButtonAge(), 1500);
    }
  };

  startStream = async (constraints) => {
    try {
      this.showWarning(false);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.handleStream(stream);
    } catch {
      stopScan();
      hideButtonAge();
      setInformation("ОШИБКА");
      video.srcObject = null;
      ageRecognition.showWarning(
        "Ошибка камеры или вы запретили её использовать!",
        true
      );
      setTimeout(() => ageRecognition.showWarning("", false), 10000);
    }
  };
  showWarning(message = "no message", isVisible) {
    setTimeout(() => {
      let visibility = isVisible ? "visible" : "hidden";
      warning.style.visibility = visibility;
      warning.textContent = message;
    }, 1000);
  }
  play() {
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
    isScreenShotProcessing = true;
    navigator.vibrate(50);
    startScan();
    hideButtonAge();
    setInformation("СКАНИРУЮ...");
    let framePosition = getFramePosition();
    if (streamStarted) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log(video.videoHeight, video.videoWidth);
      ctx.drawImage(video, 0, 0);
      console.log("koeff:", koeff);
      let img = ctx.getImageData(
        framePosition.x * koeff,
        framePosition.y * koeff,
        framePosition.width * koeff,
        framePosition.height * koeff
      );
      canvas2=document.createElement('canvas');
      canvas2.className='canvas2'
      canvas2.width = framePosition.width * koeff;
      canvas2.height = framePosition.height * koeff;
      ctx2 = canvas2.getContext("2d", { willReadFrequently: true });
      ctx2.putImageData(img, 0, 0);
      showCanvas();
      let imageURL = canvas2.toDataURL().slice(22);
      this.detectFace(imageURL);
    }
  };
  detectFace = (imageURL) => {
    const raw = JSON.stringify({
      user_app_id: {
        user_id: "openvino",
        app_id: "face-detection",
      },
      inputs: [
        {
          data: {
            image: {
              base64: imageURL,
            },
          },
        },
      ],
    });

    const requestOptions = {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Key " + "d5c7c4eebbba4c19a6e475d9d98d497e",
      },
      body: raw,
    };

    fetch(
      `https://api.clarifai.com/v2/models/face-detection-0200/versions/174702155a6043c9932b045e8e00e6e2/outputs`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        result = result?.outputs?.[0]?.data?.regions?.[0].value;
        this.processFDResult(result, imageURL);
      })
      .catch((error) => {
        console.log("error", error);
        information.textContent = "ОШИБКА DETECT FACE";
        realAge = "-";
        this.reset();
      });
  };

  processFDResult(result, imageURL) {
    console.log(result);
    if (result === undefined || result < 0.999) {
      information.textContent = "ЛИЦО НЕ ОБНАРУЖЕНО";
      realAge = "-";
      this.reset();
    } else {
      setInformation("ОБРАБОТКА...");
      this.defineAge(imageURL);
    }
  }
  defineSex = (imageURL) => {
    const raw = JSON.stringify({
      user_app_id: {
        user_id: "clarifai",
        app_id: "main",
      },
      inputs: [
        {
          data: {
            image: {
              base64: imageURL,
            },
          },
        },
      ],
    });

    const requestOptions = {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Key " + "d5c7c4eebbba4c19a6e475d9d98d497e",
      },
      body: raw,
    };

    fetch(
      `https://api.clarifai.com/v2/models/gender-demographics-recognition/outputs`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        this.processSex(result);
        this.viewResult();
      })
      .catch((error) => {
        console.log("error", error);
        setInformation("ОШИБКА SEX RECOGNITION");
        this.reset();
      });
  };

  processSex(result) {
    result = result.outputs?.[0]?.data?.concepts;
    if (result) {
      for (let item of result) {
        console.log(item.name, item.value);
        if (item.value > 0.8) {
          sex = item.name;
          break;
        } else {
          sex = "ПОЛ НЕ ОПРЕДЕЛЕН";
          this.showBadQuality();
        }
      }
    }
  }

  defineAge = (imageURL) => {
    const raw = JSON.stringify({
      user_app_id: {
        user_id: "clarifai",
        app_id: "main",
      },
      inputs: [
        {
          data: {
            image: {
              base64: imageURL,
            },
          },
        },
      ],
    });

    const requestOptions = {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Key " + "d5c7c4eebbba4c19a6e475d9d98d497e",
      },
      body: raw,
    };

    fetch(
      `https://api.clarifai.com/v2/models/age-demographics-recognition/versions/fb9f10339ac14e23b8e960e74984401b/outputs`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        console.log(result);
        this.processAge(result);
        this.defineSex(imageURL);
      })
      .catch((error) => {
        console.log("error", error);
        setInformation("ОШИБКА AGE RECOGNITION");
        realAge = "-";
        this.reset();
      });
  };
  processAge(result) {
    const itemObject = result?.outputs?.[0]?.data?.concepts?.[0];
    const agesArray = result?.outputs?.[0]?.data?.concepts;
    let ageObject = this.getAgeObject(agesArray);
    realAge = Math.round(this.calculateRealAge(ageObject));
    if (itemObject) {
      if (itemObject.value < 0.35) {
        realAge = "ВОЗРАСТ НЕ ОПРЕДЕЛЕН";
        this.showBadQuality();
      }
    }
  }
  showBadQuality() {
    errors++;
    if (errors >= 2) {
      this.showWarning(
        "ВОЗМОЖНО ПЛОХОЕ ОСВЕЩЕНИЕ ИЛИ НИЗКОЕ КАЧЕСТВО СНИМКА",
        true
      );
      setTimeout(
        () =>
          this.showWarning(
            "ВОЗМОЖНО ПЛОХОЕ ОСВЕЩЕНИЕ ИЛИ НИЗКОЕ КАЧЕСТВО СНИМКА",
            false
          ),
        3000
      );
      errors = 0;
    }
  }
  calculateRealAge(ageObject) {
    let age = 0;
    if (ageObject) {
      for (let entry of Object.entries(ageObject)) {
        let key = entry[0];
        let value = entry[1];
        let ageValue =
          key
            .split("-")
            .map((i) => Number(i))
            .reduce((a, b) => a + b, 0) / 2;
        age += ageValue * value;
      }
      return age;
    }
  }
  getAgeObject(arr) {
    let outAgesObject = {};
    if (arr?.length === 0 || arr === undefined) {
      console.log("no ages array");
    } else {
      for (let item of arr) {
        let name = item.name;
        if (name === "more than 70") {
          name = "70-79";
        }
        outAgesObject[name] = item.value;
      }
      return outAgesObject;
    }
  }
  viewResult() {
    information.innerHTML = `<p>${this.getRightSexName(
      sex,
      realAge
    )}</p><p> ${realAge} ${this.getRightWord(realAge)}</p>`;
    this.reset();
  }
  getRightWord(age) {
    if (age === "ВОЗРАСТ НЕ ОПРЕДЕЛЕН") {
      return "";
    }
    let god = [1, 21, 31, 41, 51, 61, 71, 81];
    let goda = [
      2,
      3,
      4,
      22,
      23,
      24,
      ,
      32,
      33,
      34,
      42,
      43,
      44,
      52,
      53,
      54,
      62,
      63,
      64,
      72,
      73,
      74,
      82,
      83,
      84,
    ];
    if (god.filter((i) => i === age).length > 0) {
      return "год";
    }

    if (goda.filter((i) => i === age).length > 0) {
      return "годa";
    }
    return "лет";
  }
  getRightSexName(sex, realAge) {
    let rightWord = "";
    if (sex === undefined) {
      sex = "ПОЛ НЕ ОПРЕДЕЛЕН";
    }
    if (sex === "ПОЛ НЕ ОПРЕДЕЛЕН") {
      return sex;
    }
    if (sex === "Masculine") {
      rightWord = realAge < 15 ? "МАЛЬЧИК" : realAge < 21 ? "ЮНОША" : "МУЖЧИНА";
    }
    if (sex === "Feminine") {
      rightWord =
        realAge < 13 ? "ДЕВОЧКА" : realAge < 21 ? "ДЕВУШКА" : "ЖЕНЩИНА";
    }
    return rightWord;
  }
  reset() {
    isScreenShotProcessing = false;
    stopScan();
    hideCanvas();
    if (!isFDSupported) {
      showButtonAge();
    }
    setTimeout(() => setInformation("ПОМЕСТИТЕ ЛИЦО В РАМКУ"), 3000);
  }
}

const container = document.querySelector(".container");
const canvasContainer = document.querySelector(".canvas-container");
const ageRecognition = new AgeRecognition();
const warning = document.querySelector(".warning");
const information = document.querySelector(".information");
const frame = document.querySelector(".frame");
const scanLine1 = document.querySelector(".scan-line1");
const scanLine2 = document.querySelector(".scan-line2");
const video = document.querySelector("video");
canvas = document.querySelector(".canvas1");
ctx = canvas.getContext("2d", { willReadFrequently: true });
canvas2 = document.querySelector(".canvas2");

const buttonAge = document.querySelector(".button-age");
const firstTitle = document.querySelector(".first-title");
const buttonBegin = document.querySelector(".button-begin");
buttonBegin.addEventListener("click", () => {
  init();
  setTimeout(() => hideStartView(), 1000);
});
const startView = document.querySelector(".start-view");
buttonAge.textContent = "УЗНАЙ СВОЙ ВОЗРАСТ";
buttonAge.addEventListener("click", ageRecognition.doScreenshot);
document.addEventListener("DOMContentLoaded", () => {
  showStartView();
});

function init() {
  wakeLock();
  getScreenSizes();
  setConstraints();
  window.addEventListener("resize", () => {
    getScreenSizes();
    setConstraints();
    setVideoStyle();
  });
  setInformation("ПОМЕСТИТЕ ЛИЦО В РАМКУ");
  ageRecognition.showWarning("Разрешите использовать камеру в браузере!", true);
  ageRecognition.play();
  if (isFDSupported) {
    setInterval(ageRecognition.processFaceDetection, 500);
  }
}

function blockScreen() {
  console.log(screen.orientation.type);
  screen.orientation
    .lock("portrait-primary")
    .then((inf) => console.log("resolve:", inf))
    .catch(console);
}

function wakeLock() {
  navigator.wakeLock.request("screen").catch(console.log);
}

function startScan() {
  scanLine1.style.visibility = "visible";
  scanLine2.style.visibility = "visible";
}
function stopScan() {
  scanLine1.style.visibility = "hidden";
  scanLine2.style.visibility = "hidden";
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
function showCanvas() {
  canvas2.style.visibility = "visible";
  canvas2.style.zIndex='10'
  canvas2.style.top = "50%";
  canvas2.style.left = "50%";
  canvas2.style.width = "30vmax";
  canvas2.style.height = "30vmax";
  ctx2.fillText("", 10, 50);
  container.appendChild(canvas2)

}
function hideCanvas() {
  canvas2.style.top = "80%";
  canvas2.style.left = "80%";
  canvas2.style.width = "8vmax";
  canvas2.style.height = "8vmax";
  ctx2.font = "100px serif";
  ctx2.fillStyle='red'
  ctx2.fillText(realAge.toString(), 100, 120);
  canvas2.remove();
  canvasContainer.appendChild(canvas2)

}
function showButtonAge() {
  buttonAge.style.visibility = "visible";
}
function hideButtonAge() {
  buttonAge.style.visibility = "hidden";
}
function showStartView() {
  startView.style.top = "0px";
  buttonBegin.style.visibility = "visible";
  firstTitle.style.visibility = "visible";
  firstTitle.textContent = getFirstTitleContent();
}
function hideStartView() {
  startView.style.top = "-100vh";
  buttonBegin.style.visibility = "hidden";
  firstTitle.style.visibility = "hidden";
  setTimeout(() => setFullscreen().then(blockScreen), 500);
  navigator.vibrate(50);
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
  x = x - x0;
  y = y - y0;
  return { x, y, width, height };
}
function setFullscreen() {
  return container.requestFullscreen().catch((err) => console.log(err));
}
function getFirstTitleContent() {
  if (localStorage.getItem("isNotFirstTime")) {
    return "ДАННОЕ ПРИЛОЖЕНИЕ ПОЗВОЛЯЕТ ОЦЕНИТЬ ВАШ ВОЗРАСТ ПО ВАШЕЙ ВНЕШНОСТИ. ТОЧНОСТЬ РЕЗУЛЬТАТА ЗАВИСИТ ОТ КАЧЕСТВА ИЗОБРАЖЕНИЯ.";
  } else {
    localStorage.setItem("isNotFirstTime", true);
    return 'ДЛЯ РАБОТЫ ПРИЛОЖЕНИЯ РАЗРЕШИТЕ БРАУЗЕРУ ИСПОЛЬЗОВАТЬ КАМЕРУ. ПОСЛЕ НАЖАТИЯ КНОПКИ "НАЧАТЬ" ВАМ БУДЕТ ПРЕДЛОЖЕНО ЭТО СДЕЛАТЬ. ДАННОЕ ПРИЛОЖЕНИЕ ПОЗВОЛЯЕТ ОЦЕНИТЬ ВАШ ВОЗРАСТ ПО ВАШЕЙ ВНЕШНОСТИ. ТОЧНОСТЬ РЕЗУЛЬТАТА ЗАВИСИТ ОТ КАЧЕСТВА ИЗОБРАЖЕНИЯ.';
  }
}
function setVideoStyle() {
  koeff = video.videoWidth / screenWidth;
  let realHeight = video.videoHeight / koeff;
  let top = (screenHeight - realHeight) / 2;
  video.style.top = `${top}px`;
  canvas.style.top = `${top}px`;
  canvas.style.width = `${screenWidth}px`;
}
function whiteFrame() {
  frame.style.border = "4px dashed white";
  frame.style.backgroundColor = "rgba(200, 200, 255, 0.3)";
}
function greenFrame() {
  frame.style.border = "4px dashed green";
  frame.style.backgroundColor = "rgba(200, 255, 200, 0.3)";
}
