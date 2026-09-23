'use strict';

const cUI = Object.assign(Object.create(null), {
	print_messages: ['','','','','','','']
,	print: function (msg) {
		cUI.print_messages.push(msg);
		cUI.print_messages.shift();

		let html = '<span>';
		for (let i = 0; i < cUI.print_messages.length; ++i) {
			html += '<br />' + cUI.print_messages[i];
		}
		html += '</span>';

		e('message').innerHTML = html;
	}
});

(() => {
	const fade = {
		FADE_DURATION: 300
	,	IN: (ele)=>{
			const begin = performance.now();
			const _fade = () => {
				const now = performance.now();
				const t = now - begin;
				if (t < side.FADE_DURATION) {
					ele.style.opacity = t / side.FADE_DURATION;
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
			const begin = performance.now();
			const _fade = () => {
				const now = performance.now();
				const t = now - begin;
				if (t < side.FADE_DURATION) {
					ele.style.opacity = 1 - t / side.FADE_DURATION;
					setTimeout(_fade, 1);
					return
				}

				ele.style.display = 'none';
				ele.style.opacity = 1;
			}
			_fade();
		}
	};

	e('panel-open-button').onclick = function() {
		e('panel-close-button').style.display = 'block';
		e('panel-open-button').style.display = 'none';
		fade.IN(e('side-panel'))
	};

	e('panel-close-button').onclick = function() {
		e('panel-close-button').style.display = 'none';
		e('panel-open-button').style.display = 'block';
		fade.OUT(e('side-panel'))
	};

	// disable double tap on the panel
	(()=>{
		let lastTouch = 0;
		e('side-panel').addEventListener('touchend', (ev)=>{
				const now = performance.now();
				if (now - lastTouch < 350) ev.preventDefault();
				lastTouch = now;
			}
			, {passive: false}
		);
	})()

	const layers = e('layers');

	const appRoot = document.querySelector('.app');
	const chromeClickIgnore = 'button, select, input, textarea, a, label, .panel, .topbar, .io-hud, .panel-fab';
	const fireDC = (ev)=>{	// fire the double click/tap event
		if (!appRoot) return;
		if (ev.target.closest(chromeClickIgnore)) return;
		appRoot.classList.toggle('chrome-hidden');
	}

	layers.addEventListener('wheel', (ev) => {
			if (ev.target.closest('.io-hud, button, a')) return;
			ev.preventDefault();
			dispatch.zoom(ev.deltaY);
		}
		, { passive: false }
	);

	const	pointers = Object.create(null)
	,	DC_DURATION = 300
	,	P_DURATION = 50
	,	dclick = (ev)=>{	// double click/tap detection
			const k = Object.keys(pointers);
			if (k.length > 0) return

			const now = performance.now();
			if (now - plastup < DC_DURATION) fireDC(ev);
			plastup = now;
		}
	,	pdist = (p, k)=>{
			const	dx = p[k[0]].clientX - p[k[1]].clientX 
			,	dy = p[k[0]].clientY - p[k[1]].clientY 
			;
			// true dist is Math.sqrt(dx*dx + dy*dy)
			// it's enough to identify larger or smaller
			return dx*dx + dy*dy
		}
	,	pstart = (ev)=>{	// pinch start
			const k = Object.keys(pointers);
			if (k.length != 2) return;

			pcdist = pdist(pointers, k);
			plastmove = performance.now();
		}
	,	pdetect = (ev)=>{	// pinch detection
			const k = Object.keys(pointers);
			if (k.length != 2) return

			const now = performance.now();
			if (now - plastmove < P_DURATION) return
			plastmove = now;

			const d = pcdist;
			// even if num of pointers >2, calc only top 2
			pcdist = pdist(pointers, k);
			dispatch.zoom(d - pcdist);
		}
	,	pdown = (ev)=>{
			pointers[ev.pointerId] = ev;
			pstart(ev);
		}
	,	pup = (ev)=>{
			delete pointers[ev.pointerId];
			dclick(ev);
		}
	,	pmove = (ev)=>{
			pointers[ev.pointerId] = ev;
			pdetect(ev);
		}
	;

	let	pcdist = 0
	,	plastup = 0
	,	plastmove = 0
	;

	layers.addEventListener('pointerdown',   pdown);
	layers.addEventListener('pointerup',     pup);
	layers.addEventListener('pointermove',   pmove);
	layers.addEventListener('pointercancel', pup);

	e('show-image').onchange = function () {
		dispatch.showImage = this.checked;
	}

	e('show-histogram').onchange = function () {
		dispatch.showHistogram = this.checked;
		if (!this.checked) render.clearHistogram();
	}

	for (let k in buildImageFuncs) {
		e('image-mode').add(new Option(k, k));
	}
	render.buildImage = buildImageFuncs[e('image-mode').options[0].value];

	const currentImageMode = ()=>{
		const sel = e('image-mode');
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

	e('image-mode').onchange = function () {
		const mode = this.options[this.selectedIndex].value;
		cUI.print('image mode:' + mode);
		render.buildImage = buildImageFuncs[mode];
		syncModeSettings();
	}
	syncModeSettings();

	const setupRange = (name, label, cb) => {
		const range = e(name)
		, pbutton = e(name + '-increase')
		, mbutton = e(name + '-decrease')
		, output = e(name + '-output')
		, max = Number(range.max)
		, min = Number(range.min)
		, step = Number(range.step);

		range.onchange =  () => {
			output.value = range.value;
			const v = Number(range.value);
			cb(v);
			cUI.print(label + ':' + range.value);
		}
		mbutton.onclick = () => {
			const v = Math.max(min, Number(range.value) - step);
			range.value = v;
			output.value = v;
			cb(v);
			cUI.print(label + ':' + range.value);
		}
		pbutton.onclick = () => {
			const v = Math.min(max, Number(range.value) + step);
			range.value = v;
			output.value = v;
			cb(v);
			cUI.print(label + ':' + range.value);
		}
	} 

	setupRange('afactor', 'accumulation factor', (v)=>(accum.factor = Number(v)));
	setupRange('pause', 'pause@frame', (v)=>(dispatch.duration = Number(v)));

	const appVersion = e('app-version');
	if (appVersion) appVersion.textContent = JSCAM_VERSION;
})();
