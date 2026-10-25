'use strict';

jsCam.initFn.push((kparam)=>{
	const _j = jsCam;

	const _logUI = (...msg) => {
		msg.forEach((m)=>{
			_logUI.lines.push(m);
			_logUI.lines.shift();
		});

		let html = '<span>';
		_logUI.lines.forEach((m)=>{
			html += m + '<br />';
		});
		html += '</span>';

		_j.e('message').innerHTML = html;
	};
	_logUI.lines = ['','','','','','',''];
	// Since UI parts for logging are ready now, replace default jsCam.log to _logUI.
	_j.log = _logUI;

	// fade-in/out the panel
	const fade = {
		FADE_DURATION: 300
	,	IN: (ele)=>{
			const begin = _j.now();
			const _fade = () => {
				const now = _j.now();
				const t = now - begin;
				if (t < fade.FADE_DURATION) {
					ele.style.opacity = t / fade.FADE_DURATION;
					setTimeout(_fade, 1);
					return
				}
				ele.style.opacity = 1;
			}

			ele.style.opacity = 0;
			ele.style.display = 'block';
			_fade();
		}
	,	OUT: (ele)=>{
			const begin = _j.now();
			const _fade = () => {
				const now = _j.now();
				const t = now - begin;
				if (t < fade.FADE_DURATION) {
					ele.style.opacity = 1 - t / fade.FADE_DURATION;
					setTimeout(_fade, 1);
					return
				}

				ele.style.display = 'none';
				ele.style.opacity = 1;
			}
			_fade();
		}
	};

	_j.e('panel-open-button').onclick = function() {
		_j.e('panel-close-button').style.display = 'block';
		_j.e('panel-open-button').style.display = 'none';
		fade.IN(_j.e('side-panel'))
	};

	_j.e('panel-close-button').onclick = function() {
		_j.e('panel-close-button').style.display = 'none';
		_j.e('panel-open-button').style.display = 'block';
		fade.OUT(_j.e('side-panel'))
	};

	// disable double tap on the panel
	let lastTouch = 0;
	_j.e('side-panel').addEventListener('touchend', (ev)=>{
			const now = _j.now();
			if (now - lastTouch < 350) ev.preventDefault();
			lastTouch = now;
		}
		, {passive: false}
	);
});

// operation on the image surface
jsCam.initFn.push((kparam)=>{
	const _j = jsCam;

	// toggle UI parts display.
	const appRoot = document.querySelector('.app');
	const chromeClickIgnore = 'button, select, input, textarea, a, label, .panel, .topbar, .io-hud, .panel-fab';
	const fireDC = (ev)=>{
		if (!appRoot) return;
		if (ev.target.closest(chromeClickIgnore)) return;
		appRoot.classList.toggle('chrome-hidden');
	}

	const imageView = _j.e('d-canvas');

	// zoom using wheel
	imageView.addEventListener('wheel', (ev) => {
			if (ev.target.closest('.io-hud, button, a')) return;
			ev.preventDefault();
			_j.dispatch.zoom(ev.deltaY);
		}
		, { passive: false }
	);

	// drag(pan), double-tap/click(UI on/off), pinch(zoom)
	const	pointers = _j.hash()
	,	DC_DURATION = 300
	,	P_DURATION = 50
	,	dclick = function (ev) {
			const k = Object.keys(pointers);
			if (k.length > 0) return

			const now = _j.now();
			if (now - plastup < DC_DURATION) fireDC(ev);
			plastup = now;
		}
	,	pdist = function (p, k) {
			const	dx = p[k[0]].clientX - p[k[1]].clientX 
			,	dy = p[k[0]].clientY - p[k[1]].clientY 
			;
			// true dist is Math.sqrt(dx*dx + dy*dy)
			// it's enough to identify larger or smaller
			return dx*dx + dy*dy
		}
	,	pstart = function (ev) {
			const k = Object.keys(pointers);

			if (k.length == 2) {
				// start pinch detection
				pcdist = pdist(pointers, k);
				plastmove = _j.now();
				return
			}

			if (k.length == 1) {
				// start drag detection
				plastmove = _j.now();
				return
			}
		}
	,	pdetect = function (ev) {
			const k = Object.keys(pointers);
			const now = _j.now();

			if (k.length == 2 && ev.pointerId in pointers) {
				// pinch detection
				if (now - plastmove < P_DURATION) return
				plastmove = now;

				pointers[ev.pointerId] = ev;

				const d = pcdist;
				pcdist = pdist(pointers, k);
				_j.dispatch.zoom(d - pcdist);
				return
			}

			if (k.length == 1) {
				// drag detection
				if (now - plastmove < P_DURATION) return

				// don't update plastmove.
				// all move events should be captured after P_DURATION
				_j.dispatch.move(ev.movementX, ev.movementY);
				return
			}
		}
	,	pdown = function (ev) {
			pointers[ev.pointerId] = ev;
			this.setPointerCapture(ev.pointerId);
			pstart(ev);
		}
	,	pup = function (ev) {
			delete pointers[ev.pointerId];
			dclick(ev);
		}
	,	pmove = function (ev) {
			pdetect(ev);
		}
	;

	let	pcdist = 0
	,	plastup = 0
	,	plastmove = 0
	;

	imageView.addEventListener('pointerdown',   pdown);
	imageView.addEventListener('pointerup',     pup);
	imageView.addEventListener('pointermove',   pmove);
	imageView.addEventListener('pointercancel', pup);
});

jsCam.initFn.push((kparam)=>{
	const _j = jsCam;

	_j.e('flip-horizontal').onchange = function () {
		_j.dispatch.move.flip(this.checked);
		_j.dispatch.kick(true);
	}

	_j.e('show-overlay').onchange = function () {
		_j.e('h-canvas').style.display = this.checked ? 'block' : 'none';
	}

	_j.e('show-histogram').onchange = function () {
		_j.dispatch.set('showHistogram', this.checked);
		_j.dispatch.kick(true);
	}

	_j.e('show-preview').onchange = function () {
		if (!this.checked) {
			_j.e('video').style.display = 'none';
			return
		}
		_j.e('video').style.display = 'block';
	}

	const currentImageMode = ()=>{
		const sel = _j.e('image-mode');
		if (!sel || sel.selectedIndex < 0) return '';
		return sel.options[sel.selectedIndex].value;
	}

	const syncModeSettings = ()=>{
		const mode = currentImageMode();
		const fields = document.querySelectorAll('[data-modes]');
		for (let i = 0; i < fields.length; ++i) {
			const raw = fields[i].getAttribute('data-modes') || '';
			const modes = raw.split(',');
			let show = false;
			for (let j = 0; j < modes.length; ++j) {
				if (modes[j] === mode) { show = true; break; }
			}
			fields[i].hidden = !show;
		}
	}

	_j.render.onchange(()=>{
		const	sel = _j.e('image-mode')
		,	mode = currentImageMode()
		;

		let	i = -1;
		sel.options.length = 0;
		_j.render.mode().forEach((key, index)=>{
			sel.add(new Option(key, key));
			if (key == mode) 
				i = index;
		});

		if (i >= 0) {
			sel.selectedIndex = i;
			return
		}

		if (sel.options.length === 0)
			return

		_j.render.mode(sel.options[0].value);
		sel.selectedIndex = 0;
		syncModeSettings();
	});

	_j.e('image-mode').onchange = function () {
		const mode = this.options[this.selectedIndex].value;
		_j.log('image mode:' + mode);
		_j.render.mode(mode);
		syncModeSettings();
		_j.dispatch.kick(true);
	}

	const setupRange = (name, label, cb) => {
		const	range = _j.e(name)
		,	pbutton = _j.e(name + '-increase')
		,	mbutton = _j.e(name + '-decrease')
		,	output = _j.e(name + '-output')
		,	max = Number(range.max)
		,	min = Number(range.min)
		,	step = Number(range.step)
		;

		range.onchange =  () => {
			output.value = range.value;
			const v = Number(range.value);
			cb(v);
			_j.log(label + ':' + range.value);
		}
		mbutton.onclick = () => {
			const v = Math.max(min, Number(range.value) - step);
			range.value = v;
			output.value = v;
			cb(v);
			_j.log(label + ':' + range.value);
		}
		pbutton.onclick = () => {
			const v = Math.min(max, Number(range.value) + step);
			range.value = v;
			output.value = v;
			cb(v);
			_j.log(label + ':' + range.value);
		}
	} 

	setupRange('afactor', 'accumulation factor', (v)=>{
		const	f = Number(v);
		_j.render.set('afactor', f);
		_j.delta.accum.set('factor', f);
	});

	const appVersion = _j.e('app-version');
	if (appVersion) appVersion.textContent = _j.version;
});
