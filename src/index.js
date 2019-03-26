import * as faceapi from 'face-api.js';

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

async function onPlay() {
  const videoEl = $('#inputVideo').get(0);

  if (videoEl.paused || videoEl.ended) {
    return setTimeout(() => onPlay());
  }

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 });
  const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks(true);
  console.log(result);

  if (result) {
    drawLandmarks(videoEl, $('#overlay').get(0), [result], false);
  }

  requestAnimationFrame(onPlay);
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
