
const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const DEBUG = false;


const objectRemovalProperties = {
  architecture: 'MobileNetV1',
  outputStride: 16,
  multiplier: 0.75,
  quantBytes: 4
};


const segmentationProperties = {
  flipHorizontal: false,
  internalResolution: 'high',
  segmentationThreshold: 0.9,
  scoreThreshold: 0.2
};



function processSegmentation(canvas, segmentation) {
  var ctx = canvas.getContext('2d');
  console.log(segmentation)

  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var data = imageData.data;
  

  var liveData = videoRenderCanvasCtx.getImageData(0, 0, canvas.width, canvas.height);
  var dataL = liveData.data;
   
  var minX = 100000;
  var minY = 100000;
  var maxX = 0;
  var maxY = 0;
  
  var foundBody = false;
  
 
  for (let x = 0; x < canvas.width; x++) {
    for (let y = 0; y < canvas.height; y++) {
      let n = y * canvas.width + x;
     
      if (segmentation.data[n] !== 0) {
        if(x < minX) {
          minX = x;
        }
        
        if(y < minY) {
          minY = y;
        }
        
        if(x > maxX) {
          maxX = x;
        }
        
        if(y > maxY) {
          maxY = y;
        }
        foundBody = true;
      }
    } 
  }
  
 
  var width = maxX - minX;
  var height = maxY - minY;
  
  
  var scale = 1.3;

 
  var newWidth = width * scale;
  var newHeight = height * scale;

  
  var offsetX = (newWidth - width) / 2;
  var offsetY = (newHeight - height) / 2;

  var newXMin = minX - offsetX;
  var newYMin = minY - offsetY;
  

  for (let x = 0; x < canvas.width; x++) {
    for (let y = 0; y < canvas.height; y++) {
      
      if (foundBody && (x < newXMin || x > newXMin + newWidth) || ( y < newYMin || y > newYMin + newHeight)) {
        
        let n = y * canvas.width + x;

        data[n * 4] = dataL[n * 4];
        data[n * 4 + 1] = dataL[n * 4 + 1];
        data[n * 4 + 2] = dataL[n * 4 + 2];
        data[n * 4 + 3] = 255;            

      } else if (!foundBody) {
       
        let n = y * canvas.width + x;
        data[n * 4] = dataL[n * 4];
        data[n * 4 + 1] = dataL[n * 4 + 1];
        data[n * 4 + 2] = dataL[n * 4 + 2];
        data[n * 4 + 3] = 255;    
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  
  if (DEBUG) {
    ctx.strokeStyle = "#00FF00"
    ctx.beginPath();
    ctx.rect(newXMin, newYMin, newWidth, newHeight);
    ctx.stroke();
  }
}




var modelHasLoaded = false;
var model = undefined;

model = bodyPix.load (objectRemovalProperties).then(function (loadedModel) {
  model = loadedModel;
  modelHasLoaded = true;

  demosSection.classList.remove('invisible');
});


// Continuously grab image from webcam stream and classify it.

var previousSegmentationComplete = true;

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia);
}


// This function will repeatidly call itself when the browser is ready to process
// the next frame from webcam.
function predictWebcam() {
  if (previousSegmentationComplete) {
    // Copy the video frame from webcam to a tempory canvas in memory only (not in the DOM).
    videoRenderCanvasCtx.drawImage(video, 0, 0);
    previousSegmentationComplete = false;
    // Now classify the canvas image we have available.
    model.segmentPerson(videoRenderCanvas, segmentationProperties).then(function(segmentation) {
      processSegmentation(webcamCanvas, segmentation);
      previousSegmentationComplete = true;
    });
  }

  // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(predictWebcam);
}


// Enable the live webcam view and start classification.
function enableCam(event) {
  if (!modelHasLoaded) {
    return;
  }
  
  // Hide the button.
  event.target.classList.add('removed');  
  
  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    video.addEventListener('loadedmetadata', function() {
      // Update widths and heights once video is successfully played otherwise
      // it will have width and height of zero initially causing classification
      // to fail.
      webcamCanvas.width = video.videoWidth;
      webcamCanvas.height = video.videoHeight;
      videoRenderCanvas.width = video.videoWidth;
      videoRenderCanvas.height = video.videoHeight;
     objectRemovalCanvas.width = video.videoWidth;
     objectRemovalCanvas.height = video.videoHeight;
      let webcamCanvasCtx = webcamCanvas.getContext('2d');
      webcamCanvasCtx.drawImage(video, 0, 0);
    });
    
    video.srcObject = stream;
    
    video.addEventListener('loadeddata', predictWebcam);
  });
}


// create a tempory canvas to render to store frames from 
// the web cam stream for classification.
var videoRenderCanvas = document.createElement('canvas');
var videoRenderCanvasCtx = videoRenderCanvas.getContext('2d');

//create a canvas to render our findings to the DOM.
var webcamCanvas = document.createElement('canvas');
webcamCanvas.setAttribute('class', 'overlay');
liveView.appendChild(webcamCanvas);

// Create a canvas to render ML findings from to manipulate.
var objectRemovalCanvas = document.createElement('canvas'); objectRemovalCanvas.setAttribute('class', 'overlay');
var objectRemovalCanvasCtx = objectRemovalCanvas.getContext('2d'); objectRemovalCanvasCtx.fillStyle = '#FF0000';

liveView.appendChild (objectRemovalCanvas);

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  const enableWebcamButton = document.getElementById('webcamButton');
  enableWebcamButton.addEventListener('click', enableCam);
} else {
  console.warn('getUserMedia() is not supported by your browser');
}
