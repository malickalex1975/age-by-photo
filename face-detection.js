export class FaceDetection {
    constructor() {}
  
    checkFD() {
      if ("FaceDetector" in self) {
       
        return true;
      } else {
        alert("FaceDetector is not supported");
        return false;
      }
    }
    detect(theImage) {
      try {
        let faceDetector = new FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
  
        let detectedFaces = faceDetector.detect(theImage);
        return detectedFaces;
      } catch (err) {
        console.error("Face Detection failed, boo.", err);
      }
    }
}