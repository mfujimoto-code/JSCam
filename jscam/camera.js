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

const gumConstraints = (deviceId)=>{
	if (deviceId) return {audio: false, video: {deviceId: {exact: deviceId}}};
	return {audio: false, video: true};
}

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

const listVideoInputs = (devices)=>{
	const cams = [];
	if (!devices || !devices.length) return cams;
	for (let i = 0; i < devices.length; ++i) {
		if (devices[i].kind === 'videoinput') cams.push(devices[i]);
	}
	return cams;
}

const hideCameraSelect = ()=>{
	const field = e('field-camera-select');
	const sel = e('camera-select');
	if (sel) {
		sel.innerHTML = '';
		sel.disabled = false;
	}
	if (field) field.hidden = true;
}

const syncCameraSelect = (cams, selectedId)=>{
	const field = e('field-camera-select');
	const sel = e('camera-select');
	if (!sel || !field) return;
	sel.innerHTML = '';
	for (let i = 0; i < cams.length; ++i) {
		const id = cams[i].deviceId || '';
		const label = cams[i].label || ('Camera ' + (i + 1));
		sel.add(new Option(label, id));
	}
	if (selectedId) sel.value = selectedId;
	field.hidden = cams.length < 2;
	sel.disabled = false;
}

const syncPreviewSize = ()=>{
	const video = e('video');
	const out = e('preview-size');
	if (!out) return;
	const w = video ? video.videoWidth : 0;
	const h = video ? video.videoHeight : 0;
	out.value = (w > 0 && h > 0) ? (w + '\u00d7' + h) : '';
}

const playAttachedVideo = (video)=>{
	const playing = video.play();
	if (playing && playing.catch) {
		playing.catch((err)=>setCameraStatus('playback failed: ' + err));
	}
}

const attachLiveStream = (video, stream, paused)=>{
	stopStreamTracks(video.srcObject);
	video.srcObject = stream;
	playAttachedVideo(video);
	syncPreviewSize();
	const overlay = e('camera-overlay');
	if (overlay) overlay.classList.add('is-live');
	const help = e('camera-help');
	if (help) help.hidden = true;
	setStartCameraEnabled(true);
	const sel = e('camera-select');
	if (sel) sel.disabled = false;
	setIoPaused(!!paused);
}

const gumFail = (error)=>{
	setStartCameraEnabled(true);
	const sel = e('camera-select');
	if (sel) sel.disabled = false;
	const name = (error && error.name) ? error.name : 'Error';
	const msg = (error && error.message) ? error.message : String(error);
	setCameraStatus('camera disabled: ' + name + ' — ' + msg);
}

const openCameraStream = (media, deviceId, generation, paused, statusMsg)=>{
	const video = e('video');
	const sel = e('camera-select');
	if (sel) sel.disabled = true;
	setStartCameraEnabled(false);
	return media.getUserMedia(gumConstraints(deviceId))
		.then((stream)=>{
			if (generation !== startCamera.generation) {
				stopStreamTracks(stream);
				return;
			}
			if (!video) {
				stopStreamTracks(stream);
				return;
			}
			attachLiveStream(video, stream, paused);
			setCameraStatus(statusMsg);
		});
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

	media.getUserMedia(gumConstraints())
		.then((probe)=>{
			if (generation !== startCamera.generation) {
				stopStreamTracks(probe);
				return;
			}
			stopStreamTracks(probe);
			if (!media.enumerateDevices) return [];
			return media.enumerateDevices();
		})
		.then((devices)=>{
			if (generation !== startCamera.generation) return;
			if (devices == null) return;
			const cams = listVideoInputs(devices);
			const firstId = (cams[0] && cams[0].deviceId) ? cams[0].deviceId : '';
			syncCameraSelect(cams, firstId);
			const label = (cams[0] && cams[0].label) ? cams[0].label : 'camera enabled';
			return openCameraStream(media, firstId, generation, false,
				cams.length ? ('camera enabled: ' + label) : 'camera enabled');
		})
		.catch((error)=>{
			if (generation !== startCamera.generation) return;
			gumFail(error);
		});
}
startCamera.generation = 0;

const switchCamera = (deviceId)=>{
	if (!deviceId) return;
	const media = navigator.mediaDevices;
	if (!media || !media.getUserMedia) return;
	const current = supportLiveTrack();
	if (current && current.getSettings) {
		try {
			if (current.getSettings().deviceId === deviceId) return;
		} catch (err) {}
	}
	const video = e('video');
	if (!video || !video.srcObject) return;
	const paused = dispatch.paused;
	const generation = ++startCamera.generation;
	const sel = e('camera-select');
	const label = (sel && sel.options[sel.selectedIndex])
		? sel.options[sel.selectedIndex].text
		: deviceId;
	openCameraStream(media, deviceId, generation, paused, 'camera: ' + label)
		.catch((error)=>{
			if (generation !== startCamera.generation) return;
			gumFail(error);
		});
}

const stopCamera = ()=>{
	startCamera.generation += 1;
	setStartCameraEnabled(true);
	hideCameraSelect();

	const video = e('video');
	const overlay = e('camera-overlay');
	const stream = video && video.srcObject;
	const wasLive = !!(overlay && overlay.classList.contains('is-live'));

	stopStreamTracks(stream);
	if (video) video.srcObject = null;
	syncPreviewSize();

	if (!stream && !wasLive) return;

	if (overlay) overlay.classList.remove('is-live');
	const help = e('camera-help');
	if (help) help.hidden = true;

	setIoPaused(false);
	setCameraStatus('camera stopped');
}

const fmtSupportRange = (value)=>{
	if (value == null) return 'n/a';
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.length ? value.join(', ') : '(empty)';
	if (typeof value === 'object') {
		const parts = [];
		if ('min' in value) parts.push('min ' + value.min);
		if ('max' in value) parts.push('max ' + value.max);
		if ('step' in value) parts.push('step ' + value.step);
		if (parts.length) return parts.join(', ');
		try { return JSON.stringify(value); } catch (err) { return String(value); }
	}
	return String(value);
}

const supportHasKey = (obj, key)=>{
	return !!(obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key]);
}

const supportLiveTrack = ()=>{
	const video = e('video');
	const stream = video && video.srcObject;
	if (!stream || !stream.getVideoTracks) return null;
	const tracks = stream.getVideoTracks();
	return tracks.length ? tracks[0] : null;
}

const scanCameraSelection = (supported, devices)=>{
	const lines = [];
	const canEnum = !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
	const uaDeviceId = supportHasKey(supported, 'deviceId');
	lines.push('enumerateDevices: ' + (canEnum ? 'yes' : 'no'));
	lines.push('UA deviceId constraint: ' + (uaDeviceId ? 'yes' : 'no'));
	if (!canEnum) {
		return { verdict: 'NO', lines: lines };
	}
	const cams = [];
	for (let i = 0; i < devices.length; ++i) {
		if (devices[i].kind === 'videoinput') cams.push(devices[i]);
	}
	lines.push('video inputs: ' + cams.length);
	const labels = [];
	let withId = 0;
	for (let i = 0; i < cams.length; ++i) {
		const id = cams[i].deviceId || '';
		const label = cams[i].label || '(no label)';
		if (id) withId += 1;
		labels.push(label);
		if (cams[i].getCapabilities) {
			try {
				const cap = cams[i].getCapabilities();
				if (cap && (cap.width || cap.height)) {
					lines.push('  InputDeviceInfo[' + i + '] '
						+ fmtSupportRange(cap.width) + ' x ' + fmtSupportRange(cap.height));
				}
			} catch (err) {}
		}
	}
	lines.push('labels: ' + (labels.length ? labels.join('; ') : 'n/a'));
	lines.push('deviceId present: ' + withId + '/' + cams.length);
	if (cams.length >= 2 && withId >= 2) return { verdict: 'YES', lines: lines };
	if (cams.length >= 1 && withId >= 1) {
		lines.push('note: API works; only one camera, so picking is a no-op');
		return { verdict: 'PARTIAL', lines: lines };
	}
	if (cams.length >= 1 && withId === 0) {
		lines.push('note: permission not granted yet; ids/labels hidden');
		return { verdict: 'PARTIAL', lines: lines };
	}
	return { verdict: 'NO', lines: lines };
}

const scanResolution = (supported, track, video)=>{
	const lines = [];
	const ua = supportHasKey(supported, 'width') || supportHasKey(supported, 'height');
	lines.push('UA width/height constraint: ' + (ua ? 'yes' : 'no'));
	let caps = null;
	let settings = null;
	if (track && track.getCapabilities) {
		try { caps = track.getCapabilities(); } catch (err) { lines.push('getCapabilities: ' + err); }
	}
	if (track && track.getSettings) {
		try { settings = track.getSettings(); } catch (err) { lines.push('getSettings: ' + err); }
	}
	if (caps) {
		lines.push('track width: ' + fmtSupportRange(caps.width));
		lines.push('track height: ' + fmtSupportRange(caps.height));
		lines.push('note: spec exposes a range, not a discrete mode list');
	} else {
		lines.push('track width/height: n/a (start the camera)');
	}
	if (settings) {
		lines.push('settings: ' + (settings.width || '?') + ' x ' + (settings.height || '?'));
	}
	if (video) {
		lines.push('video element: ' + video.videoWidth + ' x ' + video.videoHeight);
	}
	if (caps && (caps.width || caps.height)) return { verdict: 'YES', lines: lines };
	if (ua) return { verdict: 'PARTIAL', lines: lines };
	return { verdict: 'NO', lines: lines };
}

const scanZoomFocus = (supported, track)=>{
	const lines = [];
	const uaZoom = supportHasKey(supported, 'zoom');
	const uaFocus = supportHasKey(supported, 'focusMode') || supportHasKey(supported, 'focusDistance');
	lines.push('UA zoom: ' + (uaZoom ? 'yes' : 'no'));
	lines.push('UA focusMode: ' + (supportHasKey(supported, 'focusMode') ? 'yes' : 'no'));
	lines.push('UA focusDistance: ' + (supportHasKey(supported, 'focusDistance') ? 'yes' : 'no'));
	let caps = null;
	let settings = null;
	if (track && track.getCapabilities) {
		try { caps = track.getCapabilities(); } catch (err) { lines.push('getCapabilities: ' + err); }
	}
	if (track && track.getSettings) {
		try { settings = track.getSettings(); } catch (err) {}
	}
	const liveZoom = !!(caps && caps.zoom);
	const liveFocus = !!(caps && (caps.focusMode || caps.focusDistance));
	lines.push('track zoom: ' + (caps ? fmtSupportRange(caps.zoom) : 'n/a (start the camera)'));
	lines.push('track focusMode: ' + (caps ? fmtSupportRange(caps.focusMode) : 'n/a'));
	lines.push('track focusDistance: ' + (caps ? fmtSupportRange(caps.focusDistance) : 'n/a'));
	if (settings) {
		if ('zoom' in settings) lines.push('settings zoom: ' + settings.zoom);
		if ('focusMode' in settings) lines.push('settings focusMode: ' + settings.focusMode);
		if ('focusDistance' in settings) lines.push('settings focusDistance: ' + settings.focusDistance);
	}
	if (liveZoom || liveFocus) return { verdict: 'YES', lines: lines };
	if (uaZoom || uaFocus) {
		lines.push('note: browser knows the constraint; this camera did not expose it');
		return { verdict: 'PARTIAL', lines: lines };
	}
	return { verdict: 'NO', lines: lines };
}

const scanFrameRate = (supported, track)=>{
	const lines = [];
	const ua = supportHasKey(supported, 'frameRate');
	lines.push('UA frameRate constraint: ' + (ua ? 'yes' : 'no'));
	let caps = null;
	let settings = null;
	if (track && track.getCapabilities) {
		try { caps = track.getCapabilities(); } catch (err) { lines.push('getCapabilities: ' + err); }
	}
	if (track && track.getSettings) {
		try { settings = track.getSettings(); } catch (err) {}
	}
	lines.push('track frameRate: ' + (caps ? fmtSupportRange(caps.frameRate) : 'n/a (start the camera)'));
	if (settings && 'frameRate' in settings) lines.push('settings frameRate: ' + settings.frameRate);
	if (caps && caps.frameRate) return { verdict: 'YES', lines: lines };
	if (ua) return { verdict: 'PARTIAL', lines: lines };
	return { verdict: 'NO', lines: lines };
}

const scanImageCapture = (track)=>{
	const lines = [];
	const Ctor = window.ImageCapture;
	const hasCtor = typeof Ctor === 'function';
	lines.push('ImageCapture constructor: ' + (hasCtor ? 'yes' : 'no'));
	if (!hasCtor) return { verdict: 'NO', lines: lines };
	if (!track) {
		lines.push('takePhoto: n/a (start the camera)');
		return { verdict: 'PARTIAL', lines: lines };
	}
	try {
		const capture = new Ctor(track);
		lines.push('takePhoto method: ' + (typeof capture.takePhoto === 'function' ? 'yes' : 'no'));
		lines.push('grabFrame method: ' + (typeof capture.grabFrame === 'function' ? 'yes' : 'no'));
		if (capture.getPhotoCapabilities) {
			return capture.getPhotoCapabilities().then((photoCaps)=>{
				if (photoCaps && photoCaps.imageWidth) {
					lines.push('photo width: ' + fmtSupportRange(photoCaps.imageWidth));
				}
				if (photoCaps && photoCaps.imageHeight) {
					lines.push('photo height: ' + fmtSupportRange(photoCaps.imageHeight));
				}
				if (photoCaps && photoCaps.fillLightMode) {
					lines.push('fillLightMode: ' + fmtSupportRange(photoCaps.fillLightMode));
				}
				const ok = typeof capture.takePhoto === 'function';
				return { verdict: ok ? 'YES' : 'PARTIAL', lines: lines };
			}).catch((err)=>{
				lines.push('getPhotoCapabilities: ' + ((err && err.name) ? err.name : err));
				const ok = typeof capture.takePhoto === 'function';
				return { verdict: ok ? 'YES' : 'PARTIAL', lines: lines };
			});
		}
		const ok = typeof capture.takePhoto === 'function';
		return Promise.resolve({ verdict: ok ? 'YES' : 'PARTIAL', lines: lines });
	} catch (err) {
		lines.push('new ImageCapture: ' + ((err && err.message) ? err.message : err));
		return Promise.resolve({ verdict: 'PARTIAL', lines: lines });
	}
}

const renderSupportReport = (sections)=>{
	const out = [];
	out.push('JSCam camera support scan');
	out.push('secure context: ' + (window.isSecureContext ? 'yes' : 'no'));
	const media = navigator.mediaDevices;
	out.push('getUserMedia: ' + ((media && media.getUserMedia) ? 'yes' : 'no'));
	const track = supportLiveTrack();
	out.push('live track: ' + (track ? (track.label || 'yes') : 'no'));
	out.push('');
	const names = [
		'1. Camera selection',
		'2. Resolution',
		'3. Zoom / focus',
		'4. Frame rate',
		'5. ImageCapture.takePhoto'
	];
	for (let i = 0; i < sections.length; ++i) {
		out.push(names[i] + '  ' + sections[i].verdict);
		const lines = sections[i].lines;
		for (let j = 0; j < lines.length; ++j) out.push('   ' + lines[j]);
		if (i < sections.length - 1) out.push('');
	}
	return out.join('\n');
}

const scanCameraSupport = ()=>{
	const report = e('support-report');
	const btn = e('support-scan');
	if (btn) btn.disabled = true;

	const finish = (text)=>{
		if (report) {
			report.hidden = false;
			report.textContent = text;
		}
		if (btn) btn.disabled = false;
		print('support scan done');
	};

	if (!window.isSecureContext) {
		finish(renderSupportReport([
			{ verdict: 'NO', lines: ['blocked: insecure context'] },
			{ verdict: 'NO', lines: ['blocked: insecure context'] },
			{ verdict: 'NO', lines: ['blocked: insecure context'] },
			{ verdict: 'NO', lines: ['blocked: insecure context'] },
			{ verdict: 'NO', lines: ['blocked: insecure context'] }
		]));
		return;
	}

	const media = navigator.mediaDevices;
	let supported = {};
	if (media && media.getSupportedConstraints) {
		try { supported = media.getSupportedConstraints() || {}; } catch (err) { supported = {}; }
	}
	const track = supportLiveTrack();
	const video = e('video');

	const enumPromise = (media && media.enumerateDevices)
		? media.enumerateDevices().catch((err)=>err)
		: Promise.resolve([]);

	enumPromise.then((devices)=>{
		const deviceList = (devices && devices.length) ? devices : [];
		const enumError = (devices && devices.name) ? devices : null;
		const selection = scanCameraSelection(supported, enumError ? [] : deviceList);
		if (enumError) {
			selection.lines.push('enumerateDevices error: ' + (enumError.name || enumError));
			if (selection.verdict === 'YES') selection.verdict = 'PARTIAL';
		}
		const resolution = scanResolution(supported, track, video);
		const zoomFocus = scanZoomFocus(supported, track);
		const frameRate = scanFrameRate(supported, track);
		return Promise.resolve(scanImageCapture(track)).then((imageCapture)=>{
			finish(renderSupportReport([selection, resolution, zoomFocus, frameRate, imageCapture]));
		});
	}).catch((err)=>{
		finish('support scan failed: ' + ((err && err.message) ? err.message : err));
	});
}

const previewVideo = e('video');
if (previewVideo) {
	previewVideo.addEventListener('loadedmetadata', syncPreviewSize);
	previewVideo.addEventListener('resize', syncPreviewSize);
}

const startButton = e('camera-start');
if (startButton) startButton.onclick = startCamera;

const stopButton = e('camera-stop');
if (stopButton) stopButton.onclick = stopCamera;

const supportScanButton = e('support-scan');
if (supportScanButton) supportScanButton.onclick = scanCameraSupport;

const cameraSelect = e('camera-select');
if (cameraSelect) {
	cameraSelect.onchange = function () {
		switchCamera(this.value);
	};
}

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
