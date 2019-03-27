import * as faceapi from 'face-api.js';
import * as THREE from 'three';

function resizeCanvasAndResults(dimensions, canvas, results) {
  const { width, height } = dimensions instanceof HTMLVideoElement
    ? faceapi.getMediaDimensions(dimensions)
    : dimensions;
  canvas.width = width;
  canvas.height = height;

  // resize detections (and landmarks) in case displayed image is smaller than
  // original size
  return faceapi.resizeResults(results, { width, height });
}

function drawLandmarks(dimensions, canvas, results, withBoxes = true) {
  const resizedResults = resizeCanvasAndResults(dimensions, canvas, results);

  if (withBoxes) {
    faceapi.drawDetection(canvas, resizedResults.map(det => det.detection));
  }

  const faceLandmarks = resizedResults.map(det => det.landmarks);
  const drawLandmarksOptions = {
    lineWidth: 2,
    drawLines: true,
    color: 'green'
  };

  faceapi.drawLandmarks(canvas, faceLandmarks, drawLandmarksOptions);
}

const drawLandmarksThreshold = 2.5;
let oldLandmarksVectors = [];
function landmarksMeanDeta(newLandmarksVectors) {
  if (!oldLandmarksVectors.length) {
    oldLandmarksVectors = newLandmarksVectors;
    return;
  }

  let d = [];
  for (let i in newLandmarksVectors) {
    d.push(newLandmarksVectors[i].distanceTo(oldLandmarksVectors[i]));
  }

  oldLandmarksVectors = newLandmarksVectors;

  let mean = (array) => array.reduce((a, b) => a + b) / array.length;
  return mean(d);
}

async function onPlay() {
  const videoEl = $('#inputVideo').get(0);
  const overlayEl = $('#overlay').get(0);

  if (videoEl.paused || videoEl.ended) {
    return setTimeout(() => onPlay());
  }

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks(true);

  if (result && result.landmarks) {
    const landmarks = result.landmarks
    const landmarkPositions = landmarks.positions;
    const jawOutline = landmarks.getJawOutline();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const leftEyeBbrow = landmarks.getLeftEyeBrow();
    const rightEyeBrow = landmarks.getRightEyeBrow();

    let landmark2DVectors = [];
    let landmark3DVectors = [];

    for (let i in landmarkPositions) {
      landmark2DVectors.push(new THREE.Vector2(landmarkPositions[i]._x, landmarkPositions[i]._y));
    }

    if (landmarksMeanDeta(landmark2DVectors) >= drawLandmarksThreshold) {
      drawLandmarks(videoEl, overlayEl, [result], false);
    }

    const aspect = overlayEl.width / overlayEl.height;
    const camera = new THREE.PerspectiveCamera(50, 0.5 * aspect, 1, 10000);
    for (let i in landmark2DVectors) {
      const landmark2DVector = landmark2DVectors[i];
      const landmark3DVector = new THREE.Vector3(landmark2DVector.x, landmark2DVector.y, -1).unproject(camera);
      landmark3DVectors.push(landmark3DVector);
    }

    console.log(landmark3DVectors);
  }

  setTimeout(onPlay);
  // requestAnimationFrame(onPlay);
}

async function run() {
  await faceapi.loadTinyFaceDetectorModel('dist/models');
  await faceapi.loadFaceLandmarkTinyModel('dist/models');
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  const videoEl = $('#inputVideo').get(0);
  videoEl.srcObject = stream;
  videoEl.onplay = function () {
    onPlay();
  };
}

run();
