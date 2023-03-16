let screenWidth, screenHeight, constraints, canvas, ctx, canvas2, ctx2;
let streamStarted = false;
const MY_PERSONAL_ACCESS_TOKEN = "d5c7c4eebbba4c19a6e475d9d98d497e";
const AGE_DETECTION_URL = `https://api.clarifai.com/v2/models/age-demographics-recognition/versions/fb9f10339ac14e23b8e960e74984401b/outputs`;

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
      this.imageURL = canvas2.toDataURL().slice(22);
      this.detectFace(this.imageURL);
    }
  };
  detectFace =  (imageURL) => {
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
      `https://api.clarifai.com/v2/models/face-detection/versions/6dc7e46bc9124c5c8824be4822abe105/outputs`,
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        result = result?.outputs?.[0]?.data?.regions?.[0].value;
        this.processFDResult(result,imageURL);
      })
      .catch((error) => {
        console.log("error", error);
        information.textContent = "ОШИБКА DETECT FACE";
      });
  };

  processFDResult(result,imageURL) {
    if (result === undefined || result < 0.6) {
      information.textContent = "ЛИЦО НЕ ОБНАРУЖЕНО";
      stopScan();
      showButtonAge();
    } else {
      information.textContent = "ОБРАБОТКА...";
      this.defineAge(imageURL)
    }
  }
  defineAge=(imageURL)=>{
    
const raw = JSON.stringify({
    "user_app_id": {
      "user_id": "clarifai",
      "app_id": "main"
    },
    "inputs": [
        {
            "data": {
                "image": {
                    base64: imageURL,
                }
            }
        }
    ]
  });
  
  const requestOptions = {
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          'Authorization': 'Key ' + 'd5c7c4eebbba4c19a6e475d9d98d497e'
      },
      body: raw
  };
  
  
  fetch(`https://api.clarifai.com/v2/models/age-demographics-recognition/versions/fb9f10339ac14e23b8e960e74984401b/outputs`, requestOptions)
      .then(response => response.json())
      .then(result => {console.log(result);this.processAge(result)})
      .catch(error => {console.log('error', error); information.textContent = "ОШИБКА AGE RECOGNITION";});
    
  }
  processAge(result) {
    const itemObject = result.outputs[0].data.concepts[0];
    const agesArray = result.outputs[0].data.concepts;
   let realAge=0
    let ageObject = this.getAgeObject(agesArray);
    realAge=Math.round(this.calculateRealAge(ageObject))
    if(itemObject.value<0.4){realAge='x'}
    information.textContent = `ВАШ ВОЗРАСТ ${realAge}`;
    stopScan();
    showButtonAge();
  }
  calculateRealAge(ageObject){
    let age=0
    for(let entry of Object.entries(ageObject)){
      let key= entry[0];
      let value= entry[1] 
      let ageValue= key.split('-').map(i=>Number(i)).reduce((a,b)=>a+b,0)/2
      age+=ageValue*value
    }
    return age
  }
  getAgeObject(arr) {
    let outAgesObject = {};
    if (arr.length === 0) {
      console.log('no ages array');
    }
    for (let item of arr) {
      let name = item.name;
      if (name === 'more than 70') {
        name = '70-79';
      }
      outAgesObject[name] = item.value;
    }
    return outAgesObject;
  }
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
  x = x0 + x;
  y = y0 + y;
  console.log({ x, y, width, height });
  return { x, y, width, height };
}
