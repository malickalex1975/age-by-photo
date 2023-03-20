let screenWidth,
  screenHeight,
  constraints,
  canvas,
  ctx,
  canvas2,
  ctx2,
  sex,
  realAge;
let streamStarted = false;
let errors = 0;

class AgeRecognition {
  constructor() {}

  handleStream = (stream) => {
    video.srcObject = stream;
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
    navigator.vibrate(150);
    setFullscreen().then(blockScreen);;
    startScan();
    hideButtonAge();
    let framePosition = getFramePosition();
    if (streamStarted) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log(video.videoHeight, video.videoWidth);
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
        this.reset();
      });
  };

  processFDResult(result, imageURL) {
    console.log(result);
    if (result === undefined || result < 0.999) {
      information.textContent = "ЛИЦО НЕ ОБНАРУЖЕНО";
      stopScan();
      showButtonAge();
    } else {
      information.textContent = "ОБРАБОТКА...";
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
        information.textContent = "ОШИБКА SEX RECOGNITION";
        this.reset();
      });
  };

  processSex(result) {
    result = result.outputs?.[0]?.data?.concepts;
    if (result) {
      for (let item of result) {
        console.log(item.name, item.value);
        if (item.value > 0.9) {
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
        information.textContent = "ОШИБКА AGE RECOGNITION";
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
    stopScan();
    showButtonAge();
  }
}

const container = document.querySelector(".container");
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
ctx2 = canvas2.getContext("2d", { willReadFrequently: true });
const buttonAge = document.querySelector(".button-age");
buttonAge.textContent = "УЗНАЙ СВОЙ ВОЗРАСТ";
buttonAge.addEventListener("click", ageRecognition.doScreenshot);
document.addEventListener("DOMContentLoaded", () => {
  init();
});

function init() {
  wakeLock();
  getScreenSizes();
  setConstraints();
  window.addEventListener("resize", () => {
    getScreenSizes();
    setConstraints();
  });
  setInformation("ПОМЕСТИТЕ ЛИЦО В РАМКУ");
  ageRecognition.showWarning("Разрешите использовать камеру в браузере!", true);
  ageRecognition.play();
}

function blockScreen() {
  console.log(screen.orientation.type);
  screen.orientation
    .lock("portrait-primary")
    .then((inf) => console.log("resolve:", inf))
    .catch(console);
}

function wakeLock() {
  navigator.wakeLock
    .request("screen")
    .then(() => {
      alert("wakeLock");
    })
    .catch(alert);
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
  x = x0 + x;
  y = y0 + y;
  console.log({ x, y, width, height });
  return { x, y, width, height };
}
function setFullscreen() {
 return container.requestFullscreen().catch((err) => console.log(err))
}
