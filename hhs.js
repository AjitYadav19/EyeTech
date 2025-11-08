const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

let glassesImg = new Image();
glassesImg.src = "glasses3.png"; // Default
let currentGlassesSrc = "glasses3.png"; // Track original src

function selectGlasses(src) {
  currentGlassesSrc = src;
  glassesImg.src = src;
  glassesImg.onload = function() {
    // Process the image to remove white background
    removeWhiteBackground(glassesImg);
  };
}

function removeWhiteBackground(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Check if pixel is white or very light (adjust threshold as needed)
    if (r > 240 && g > 240 && b > 240) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  ctx.putImageData(imageData, 0, 0);
  glassesImg.src = canvas.toDataURL();
}

// Initialize MediaPipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  },
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

faceMesh.onResults(onResults);

// Use webcam feed
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 480,
  height: 360,
});
camera.start();

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Draw the video frame
  canvasCtx.drawImage(
    results.image, 0, 0, canvasElement.width, canvasElement.height
  );

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    // Get eye landmarks
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    const x1 = leftEye.x * canvasElement.width;
    const y1 = leftEye.y * canvasElement.height;
    const x2 = rightEye.x * canvasElement.width;
    const y2 = rightEye.y * canvasElement.height;

    const glassesWidth = Math.abs(x2 - x1) * 2;
    const glassesHeight = glassesWidth * (glassesImg.height / glassesImg.width);
    const centerX = (x1 + x2) / 2 - glassesWidth / 2;
    let centerY = (y1 + y2) / 2 - glassesHeight / 2;

    // Adjust vertical position for round aviator to place on eyes instead of nose
    if (currentGlassesSrc.includes('round aviator.webp')) {
      centerY -= glassesHeight * 0.2; // Move up by 20% of height
    }

    canvasCtx.drawImage(glassesImg, centerX, centerY, glassesWidth, glassesHeight);
  }

  canvasCtx.restore();
}
