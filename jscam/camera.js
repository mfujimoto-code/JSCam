'use strict';

const syncIoPauseButtons = ()=>{
 const paused = dispatch.paused;
 const video = e('video');
 const hasStream = !!(video && video.srcObject);
 const nodes = document.querySelectorAll('[data-io-pause]');
 for (let i = 0; i < nodes.length; ++i) {
  const btn = nodes[i];
  btn.disabled = !hasStream;
  btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
  btn.textContent = paused ? 'Resume' : 'Pause';
 }
 const badge = e('io-paused-badge');
 if (badge) badge.hidden = !paused;
 const stopBtn = e('camera-stop');
 if (stopBtn) stopBtn.disabled = !hasStream;
}

const setIoPaused = (paused)=>{
 dispatch.paused = !!paused;
 const video = e('video');
 if (video && video.srcObject) {
  if (dispatch.paused) {
   video.pause();
  } else {
   const playing = video.play();
   if (playing && playing.catch) {
    playing.catch((err)=>print('playback failed: ' + err));
   }
  }
 }
 syncIoPauseButtons();
}

const toggleIoPause = ()=>{
 const video = e('video');
 if (!video || !video.srcObject) {
  print('camera not started');
  return;
 }
 setIoPaused(!dispatch.paused);
 print(dispatch.paused ? 'io paused' : 'io resumed');
}

const constraints = {audio: false, video: true};

const stopStreamTracks = (stream)=>{
 if (!stream || !stream.getTracks) return;
 const tracks = stream.getTracks();
 for (let i = 0; i < tracks.length; ++i) {
  tracks[i].stop();
 }
}

const setStartCameraEnabled = (enabled)=>{
 const startBtn = e('camera-start');
 if (startBtn) startBtn.disabled = !enabled;
}

const setCameraStatus = (msg)=>{
 print(msg);
 const status = e('camera-status');
 if (status) status.textContent = msg;
}

const originWithScheme = (scheme, hostname)=>{
 const port = location.port ? (':' + location.port) : '';
 return scheme + '://' + hostname + port + '/';
}

const showInsecureHelp = ()=>{
 const help = e('camera-help');
 const httpsLink = e('link-https');
 const localLink = e('link-localhost');
 const httpsUrl = originWithScheme('https', location.hostname);
 const localUrl = originWithScheme('http', '127.0.0.1');
 if (localLink) {
  localLink.href = localUrl;
  localLink.textContent = localUrl;
 }
 if (httpsLink) {
  httpsLink.href = httpsUrl;
  httpsLink.textContent = httpsUrl;
 }
 if (help) help.hidden = false;
 setCameraStatus(
  'Camera is blocked at ' + location.origin + '.'
  + ' On this machine use ' + localUrl + '.'
  + ' On this host use ' + httpsUrl
  + ' (if a certificate warning appears, choose Advanced, then Proceed).'
 );
}

const startCamera = ()=>{
 const video = e('video');
 if (!video) {
  setCameraStatus('video element not found');
  return;
 }

 video.muted = true;
 video.autoplay = true;
 video.setAttribute('playsinline', '');
 video.setAttribute('muted', '');

 if (!window.isSecureContext) {
  showInsecureHelp();
  return;
 }

 const media = navigator.mediaDevices;
 if (!media || !media.getUserMedia) {
  setCameraStatus('This browser does not support the camera API.');
  return;
 }

 const generation = ++startCamera.generation;
 setStartCameraEnabled(false);

 media.getUserMedia(constraints)
  .then((stream)=>{
   if (generation !== startCamera.generation) {
    stopStreamTracks(stream);
    return;
   }
   stopStreamTracks(video.srcObject);
   video.srcObject = stream;
   const playing = video.play();
   if (playing && playing.catch) {
    playing.catch((err)=>setCameraStatus('playback failed: ' + err));
   }
   const overlay = e('camera-overlay');
   if (overlay) overlay.classList.add('is-live');
   const help = e('camera-help');
   if (help) help.hidden = true;
   setStartCameraEnabled(true);
   setIoPaused(false);
   setCameraStatus('camera enabled');
  })
  .catch((error)=>{
   if (generation !== startCamera.generation) return;
   setStartCameraEnabled(true);
   const name = (error && error.name) ? error.name : 'Error';
   const msg = (error && error.message) ? error.message : String(error);
   setCameraStatus('camera disabled: ' + name + ' — ' + msg);
  });
}
startCamera.generation = 0;

const stopCamera = ()=>{
 startCamera.generation += 1;
 setStartCameraEnabled(true);

 const video = e('video');
 const overlay = e('camera-overlay');
 const stream = video && video.srcObject;
 const wasLive = !!(overlay && overlay.classList.contains('is-live'));

 stopStreamTracks(stream);
 if (video) video.srcObject = null;

 if (!stream && !wasLive) return;

 if (overlay) overlay.classList.remove('is-live');
 const help = e('camera-help');
 if (help) help.hidden = true;

 setIoPaused(false);
 setCameraStatus('camera stopped');
}

const startButton = e('camera-start');
if (startButton) startButton.onclick = startCamera;

const stopButton = e('camera-stop');
if (stopButton) stopButton.onclick = stopCamera;

window.addEventListener('pagehide', stopCamera);
window.addEventListener('beforeunload', stopCamera);

const ioPauseNodes = document.querySelectorAll('[data-io-pause]');
for (let i = 0; i < ioPauseNodes.length; ++i) {
 ioPauseNodes[i].onclick = toggleIoPause;
}
syncIoPauseButtons();

if (!window.isSecureContext) {
 showInsecureHelp();
}
