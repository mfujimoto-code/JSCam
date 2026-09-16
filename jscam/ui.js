'use strict';

const slide = {
	IN: (ele, time)=>{
		const begin = performance.now();
		const _slide = () => {
			const now = performance.now();
			const t = now - begin;
			if (t > time) {
				ele.style.opacity = 1;
				return;
			}

			ele.style.opacity = t / time;
			setTimeout(_slide, 1);
		}

		ele.style.opacity = 0;
		ele.style.display = 'block';
		_slide();
	}
	, OUT: (ele, time)=>{
		const begin = performance.now();
		const _slide = () => {
			const now = performance.now();
			const t = now - begin;
			if (t > time) {
				ele.style.display = 'none';
				ele.style.opacity = 1;
				return;
			}

			ele.style.opacity = 1 - t / time;
			setTimeout(_slide, 1);
		}

		_slide();
	}
}

e('panel-open-button').onclick = function() {
	e('panel-close-button').style.display = 'block';
	e('panel-open-button').style.display = 'none';
	slide.IN(e('side-panel'), 250);
};

e('panel-close-button').onclick = function() {
	e('panel-close-button').style.display = 'none';
	e('panel-open-button').style.display = 'block';
	slide.OUT(e('side-panel'), 250);
};

const appRoot = document.querySelector('.app');
const chromeClickIgnore = 'button, select, input, textarea, a, label, .panel, .topbar, .io-hud, .panel-fab';
e('layers').addEventListener('click', (ev)=>{
	if (!appRoot) return;
	if (ev.target.closest(chromeClickIgnore)) return;
	appRoot.classList.toggle('chrome-hidden');
});

function print(msg) {
	print.messages.push(msg);
	print.messages.shift();

	let html = '<span>';
	for (let i = 0; i < print.messages.length; ++i) {
		html += '<br />' + print.messages[i];
	}
	html += '</span>';

	e('message').innerHTML = html;
}
print.messages = ['','','','','','',''];

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
	print('image mode:' + mode);
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
		print(label + ':' + range.value);
		//print(label + ':' + range.value + '/' + typeof range.value);
	}
	mbutton.onclick = () => {
		const v = Math.max(min, Number(range.value) - step);
		range.value = v;
		output.value = v;
		cb(v);
		print(label + ':' + range.value);
		//print(label + ':' + range.value + '/' + typeof range.value);
	}
	pbutton.onclick = () => {
		const v = Math.min(max, Number(range.value) + step);
		range.value = v;
		output.value = v;
		cb(v);
		print(label + ':' + range.value);
		//print(label + ':' + range.value + '/' + typeof range.value);
	}
} 

setupRange('afactor', 'accumulation factor', (v)=>(delta.factor = Number(v)));
setupRange('pause', 'pause@frame', (v)=>(dispatch.duration = Number(v)));
