'use strict';

const e = function(tag) {return document.getElementById(tag);}

const Graph = function * (data, label, canvasName, captionName, color) {
 const AFACTOR = 0.2
 , STEP = 2
 , canvas = e(canvasName)
 , caption = e(captionName)
 , low = Math.round(canvas.width / STEP)
 , high = Math.round(low * 1.5)
 , c = canvas.getContext('2d')
 , values = []
 ;

 let last = performance.now();

 (color == undefined) && (color = 'black');
 c.fillStyle = color;

 let min = Infinity, max = -Infinity, sum = 0;
 while (true) {
  yield;
  const now = performance.now();

  if (now == last) continue;

  const duration = now - last;
  last = now;

  const fpc = data.value * 1000 / duration;
  data.value = 0;

  const smoothed = (values.length == 0)
   ? fpc
   : (1 - AFACTOR) * values[values.length - 1] + AFACTOR * fpc;
  values.push(smoothed);
  sum += smoothed;
  (max < smoothed) && (max = smoothed);
  (min > smoothed) && (min = smoothed);
  if (values.length > high) {
   while (values.length > low) {
    values.shift();
   }
   max = values.reduce((a,b)=>(Math.max(a,b)));
   min = values.reduce((a,b)=>(Math.min(a,b)));
   sum = values.reduce((a,b)=>(a+b));
  }

  const scale = (max == 0) ? 0 : canvas.height / Math.abs(max);

  caption.innerText =
     label + ' ' + Math.round(sum / values.length)
   + '  (' + Math.round(min) + '–' + Math.round(max) + ')';

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillRect(0, canvas.height - 1, canvas.width, 1);
  for (let x = canvas.width - STEP
         , i = values.length - 1;
       x >= 0 && i >= 0;
       --i, x -= STEP) {
   const h = Math.floor(Math.abs(values[i]) * scale);
   c.fillRect(x, canvas.height - h, STEP, h);
  }
 }
}

const Frame = function (image) {
 this.getSize = 
 this.getGray = 
 this.getEdge = 
 this.getRGBA = function () {return []}
 this.getImage = function () {}

 if (image instanceof ImageData)
  this.feed(image);

 const id = ++Frame.serial;
 this.getId = function () {return id}
 Frame.array.push(id);
 Frame.map[id] = this;

 if (Frame.array.length > Frame.HIGH) {
  while (Frame.array.length > Frame.LOW) {
   const oldest = Frame.array.shift();
   delete Frame.map[oldest];
  }
 }
}
Frame.HIGH = 20;
Frame.LOW = 10;
Frame.array = [];
Frame.map = {};
Frame.serial = 0;
Frame._Laplacian = (dst, src, O)=>{ // 3x3 8direction
 const K = [ // Laplacian kernel
   1, 1, 1
  , 1, -8, 1
  , 1, 1, 1
  ]
 , start = O[8]
 , end = src.length + O[0]
 ;

 dst.fill(0);
 for (let i = start; i < end; ++i) {
  let I = 0;
  for (let k = 0; k < 9; ++k) {
   I += K[k] * src[i + O[k]];
  }
  dst[i] = I;
 }
}
Frame._Sobel = (dst, src, O)=>{ // 3x3 
 const Ky = [ // Sobel vertical kernel
   -1, -2, -1
  , 0, 0, 0
  , 1, 2, 1
  ]
 , Kx = [ // Sobel horizontal kernel
   -1, 0, 1
  , -2, 0, 2
  , -1, 0, 1
  ]
 , start = O[8]
 , end = src.length + O[0]
 ;

 dst.fill(0);
 for (let i = start; i < end; ++i) {
  let Iy = 0, Ix = 0;
  for (let k = 0; k < 9; ++k) {
   const S = src[i + O[k]];
   Iy += Ky[k] * S; 
   Ix += Kx[k] * S; 
  }
  dst[i] = Math.sqrt(Ix * Ix + Iy * Iy);
 }
}
Frame.calcThreshold = (histogram)=>{
 let H = 0
 ;
 const w = new Array(histogram.length)
 , s = new Array(histogram.length)
 ;
 for (let k = 0; k < histogram.length; ++k) H += histogram[k];
 w[0] = histogram[0];
 s[0] = 0;
 for (let k = 1; k < histogram.length; ++k) {
  w[k] = w[k-1] + histogram[k];
  s[k] = s[k-1] + k*histogram[k];
 }

 const S = s[s.length - 1]
 ;
 let maxK = 0
 , max = 0
 ;
 for (let k = 1; k < histogram.length; ++k) {
  const w1 = w[k]
  , w2 = H - w[k]
  ;
  if (w1 == 0 || w2 == 0) continue
  const s1 = s[k]
  , s2 = S - s[k]
  , m1 = s1 / w1
  , m2 = s2 / w2
  , r = w1*w2*(m1-m2)*(m1-m2)
  ;
  if (max > r) continue
  maxK = k;
  max = r;
 }
 return maxK
}
Frame.prototype = {
  feed: function (imageData) {
   const width  = imageData.width;
 const height = imageData.height;
 const num    = width * height;

 this.getSize = ()=>([width, height]);
 this.getNum  = ()=>(num);
 this.getRGBA = ()=>(imageData.data);
 this.getImage = ()=>(imageData);
 this.getYUV = this._getYUV;
 //this.getGray = ()=>(this.getYUV().Y);
 this.getGray = this._getGray;
 this.getEdge = this._getEdge;
 this.getEqualized = this._getEqualized;
 this.get3Planars = this._get3Planars;
 this.edgeFuncs = Object.create(null);
 this.histogram = Object.create(null);
  }
, _get3Planars: function () {
 const num  = this.getNum()
 , data = this.getRGBA()
 , R = new Uint8ClampedArray(num)
 , G = new Uint8ClampedArray(num)
 , B = new Uint8ClampedArray(num)
 , hR = new Array(256)
 , hG = new Array(256)
 , hB = new Array(256)
 ;

 hR.fill(0);
 hG.fill(0);
 hB.fill(0);
   for (let i = 0, o = 0; i < num; ++i, o += 4) {
  R[i] = data[o+0]; hR[R[i]] += 1;
  G[i] = data[o+1]; hG[G[i]] += 1;
  B[i] = data[o+2]; hB[B[i]] += 1;
 }

 this.histogram['R'] = hR;
 this.histogram['G'] = hG;
 this.histogram['B'] = hB;
 this.get3Planars = ()=>[R,G,B];

 return this.get3Planars()
  }
, _getEqualized: function () {
 const g = this.getGray()
 , num  = this.getNum()
 , inv = 1 / num
 , size = this.getSize()
 , gh = this.histogram['gray']
 ;
 const accum = new Array(gh.length);
 accum[0] = gh[0];
 for (let i = 1; i < accum.length; ++i)
  accum[i] = gh[i] + accum[i-1];

 const V = accum.map((v)=>(v*inv))
 , Vmin = V.reduce((a,b)=>(Math.min(a,b)), Infinity)
 , factor = ((1 - Vmin) == 0) ? 0 : (255 / (1 - Vmin))
 , histogram = new Array(256)
 , E = new Uint8ClampedArray(num)
 ;
 histogram.fill(0);
 for (let i = 0; i < num; ++i) {
  E[i] = (V[g[i]] - Vmin) * factor;
  histogram[E[i]] += 1;
 }
 this.histogram['equalization'] = histogram;
 this.getEqualized = ()=>(E);
 return this.getEqualized()
  }
, _getYUV: function () {
 const data = this.getRGBA()
 , num = this.getNum()
// , Y = new Array(num)
 , Y = new Uint8ClampedArray(num)
 , UV = new Array(num * 2)
 , histogram = new Array(256)
 ;

 histogram.fill(0);
   for (let i = 0, o = 0; i < num; ++i, o += 4) {
  const r = data[o+0]; 
  const g = data[o+1]; 
  const b = data[o+2];
  
  // Y =  0.299R + 0.587G + 0.114B
  // U = -0.169R - 0.331G + 0.500B
  // V =  0.500R - 0.419G - 0.081B 

  const y = r*0.299 + g*0.587 + b*0.114
  , u =-r*0.169 - g*0.331 + b*0.500
  , v = r*0.500 - g*0.419 - b*0.081;

  Y[i] = y;
  UV[i*2] = u;
  UV[i*2+1] = v;
  histogram[Y[i]] += 1;
 }
 this.getYUV = ()=>({'Y':Y, 'UV':UV});
 this.histogram['gray'] = histogram;
 return this.getYUV();
  }
, _getGray: function () {
 const data = this.getRGBA();
 const num = this.getNum();
   const gray = new Uint8ClampedArray(num);
 const histogram = new Array(256);
 histogram.fill(0);
   for (let i = 0, o = 0; i < num; ++i, o += 4) {
  gray[i] = Math.round(
     data[o+0] * 0.299
   + data[o+1] * 0.587
   + data[o+2] * 0.114
  );
  histogram[gray[i]] += 1;
 }
 this.getGray = ()=>(gray);
 this.histogram['gray'] = histogram;
 return this.getGray();
  }
, _getEdge: function (method) {
 if (method in this.edgeFuncs) return this.edgeFuncs[method]()

 const e = new Uint8ClampedArray(this.getNum())
 , w = this.getSize()[0]
 , O = [
   -w-1, -w, -w+1,
   -1, 0, 1,
   w-1, w, w+1
  ]
 ;

 if (method == 'sobel.rgb') {
  const plane = this.get3Planars()
  , R = plane[0]
  , G = plane[1]
  , B = plane[2]
  , num = this.getNum()
  , eR = new Uint8ClampedArray(num)
  , eG = new Uint8ClampedArray(num)
  , eB = new Uint8ClampedArray(num)
  ;
  Frame._Sobel(eR, R, O);
  Frame._Sobel(eG, G, O);
  Frame._Sobel(eB, B, O);
  for (let i = 0; i < num; ++i) 
   e[i] = Math.max(eR[i], eG[i], eB[i]);
 }
 else if (method == 'laplacian') {
  const raw = new Int16Array(e.length);
  Frame._Laplacian(raw, this.getGray(), O);
  for (let i = 0; i < e.length; ++i) e[i] = Math.abs(raw[i]);
 }
 else if (method == 'sobel') {
  Frame._Sobel(e, this.getGray(), O);
 }
 else throw `not supported ${method}`

/*
 let g = this.getGray();
 if (g.length < e.length) { // dummy
  g = new Array(e.length);
  g.fill(0);
 }
*/

 this.edgeFuncs[method] = ()=>(e);

 const histogram = new Array(256);
  histogram.fill(0);
 for (let i = 0; i < e.length; ++i)
  histogram[e[i]] += 1; 
 this.histogram[method] = histogram;

 return this.edgeFuncs[method]();
  }
}

const buildImageFuncs = {
  'GRAY-frame': function (ic, frame) {
 const yuv = frame.getYUV();
 const num  = frame.getNum();
 const size = frame.getSize();
 const imageData = new ImageData(size[0], size[1]);
 const data = imageData.data;
 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  data[o  ] =
  data[o+1] =
  data[o+2] = yuv.Y[i];
  data[o+3] = 255;
 }
 return imageData;
  }
, 'GRAY-Histogram equalization': function (ic, frame) {
 const e = frame.getEqualized()
 , num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data
 ;
 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  data[o  ] =
  data[o+1] =
  data[o+2] = e[i];
  data[o+3] = 255;
 }
 return imageData;
  }
, 'G-edge(Laplacian)': function (ic, frame) {
 const e = frame.getEdge('laplacian')
 , num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data
 ;
 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  const C = e[i];
  data[o  ] = C;
  data[o+1] = C;
  data[o+2] = C;
  data[o+3] = 255;
 }

 return imageData
  }
, 'G-edge(Sobel)': function (ic, frame) {
 const e = frame.getEdge('sobel')
 , num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data
 ;
 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  const C = e[i];
  data[o  ] = C;
  data[o+1] = C;
  data[o+2] = C;
  data[o+3] = 255;
 }

 return imageData
  }
, 'C-edge(Sobel)': function (ic, frame) {
 const e = frame.getEdge('sobel')
 , num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data
 ;
 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  const C = render.COLOR8[Math.floor(e[i] / 32)];
  data[o  ] = C[0];
  data[o+1] = C[1];
  data[o+2] = C[2];
  data[o+3] = 255;
 }

 return imageData
  }
// R = 1.000Y          + 1.402V
// G = 1.000Y - 0.344U - 0.714V
// B = 1.000Y + 1.772U
, 'YUV-frame': function (ic, frame) {
 const yuv = frame.getYUV()
 , num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data
 ;
 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  const Y = yuv.Y[i]
  , U = yuv.UV[i * 2]
  , V = yuv.UV[i * 2 + 1]
  ;
  data[o  ] = Y + 1.402*V;
  data[o+1] = Y - 0.344*U - 0.714*V;
  data[o+2] = Y + 1.772*U;
  data[o+3] = 255;
 }
 return imageData;
  }
, 'UV:RG-frame': function (ic, frame) {
 const yuv = frame.getYUV()
 , num  = frame.getNum() * 2
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data
 ;
 for (let i = 0, o = 0; i < num; i += 2, o += 4) {
  const U = yuv.UV[i]
  , V = yuv.UV[i+1]
  ;
  data[o  ] = U+128;
  data[o+1] = V+128;
  data[o+2] = 0;
  data[o+3] = 255;
 }
 return imageData;
  }
, 'RGB-frame': function (ic, frame) {
 return frame.getImage();
  }
, 'GRAY-accum': function (ic, frame) {
 delta.accum(frame);
 const gray = delta.aBuffer
 , num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data;

 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  data[o  ] =
  data[o+1] =
  data[o+2] = gray[i];
  data[o+3] = 255;
 }

 return imageData
  }
, 'BW-delta': function (ic, frame) {
 const d = delta.get(frame)
 , num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data;

 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  const bw = (d[i] == 0) ? 0 : 255;
  data[o  ] =
  data[o+1] =
  data[o+2] = bw;
  data[o+3] = 255;
 }

 return imageData
  }
, 'Gray-delta': function (ic, frame) {
 const d = delta.get(frame)
 , num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data;

 for (let i = 0, o = 0; i < num; ++i, o += 4) {
  data[o  ] =
  data[o+1] =
  data[o+2] = Math.abs(d[i]);
  data[o+3] = 255;
 }

 return imageData
  }
, '8colors': function (ic, frame) {
 const num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data
 , RGB = frame.get3Planars()
 , R = RGB[0]
 , G = RGB[1]
 , B = RGB[2]
 , tR = Frame.calcThreshold(frame.histogram['R'])
 , tG = Frame.calcThreshold(frame.histogram['G'])
 , tB = Frame.calcThreshold(frame.histogram['B'])
 ;
   for (let i = 0, o = 0; i < num; ++i, o += 4) {
  data[o+0] = R[i] > tR ? 255 : 0;
  data[o+1] = G[i] > tG ? 255 : 0;
  data[o+2] = B[i] > tB ? 255 : 0;
  data[o+3] = 255;
 }

 return imageData
  }
, 'Bin-edge': function (ic, frame) {
 const num  = frame.getNum()
 , size = frame.getSize()
 , imageData = new ImageData(size[0], size[1])
 , data = imageData.data
 , e = frame.getEdge('sobel.rgb')
 , t = Frame.calcThreshold(frame.histogram['sobel.rgb'])
 ;
   for (let i = 0, o = 0; i < num; ++i, o += 4) {
  data[o+0] = 
  data[o+1] = 
  data[o+2] = e[i] > t ? 255 : 0;
  data[o+3] = 255;
 }

 return imageData
  }

};


const delta = {
  //aBuffer: new Uint8ClampedArray(10)
  aBuffer: [0,0,0,0,0,0,0,0,0,0]
, threshold: 20
, id:  0
, factor: 0.5
, time:  100
, _delta:  [0,0,0,0,0,0,0,0,0,0]
, _last: performance.now()
, _next: []
, accum: (frame) => {
 const current = frame.getGray();
 if (current.length > delta.aBuffer.length) {
  delta.aBuffer = new Array(current.length);
  delta.aBuffer.fill(0);
 }

 const now = performance.now();
 if (now - delta._last < delta.time) return

 const g = delta._next;
 if (g.length > delta.aBuffer.length) {
//  delta.aBuffer = new Uint8ClampedArray(g.length)
  delta.aBuffer = new Array(g.length)
  delta.aBuffer.fill(0);
 }

 const a = delta.aBuffer;
 //while (g.length > a.length)
  //a.push(0);
 delta._calc(a, a, g);

 delta._last = now;
 delta._next = frame.getGray();
  }
, _calc: (dst, src1, src2) => {
 const f = delta.factor
 , o = 1 - delta.factor
 , num = Math.min(src1.length, src2.length)
 ;
 for (let i = 0; i < num; ++i) {
  dst[i] = o * src1[i] + f * src2[i];
 }
  }
, get: (frame) => {
 delta.accum(frame);

 const a = delta.aBuffer
 //, l = new Uint8ClampedArray(a.length)
 , l = new Array(a.length)
 ;

 delta._calc(l, a, frame.getGray());

 if (a.length > delta._delta.length)
  delta._delta = new Uint8ClampedArray(a.length);
 const out = delta._delta;
 for (let i = 0; i < l.length; ++i) {
  //const d = l[i] - a[i];
  out[i] = Math.abs(l[i] - a[i]);
  //out[i] = (Math.abs(d) < delta.threshold) ? 0 : d;
 }

 return out
  }
}

const render = {
  buildImage: buildImageFuncs['RGB-frame']
, COLOR8:[
  [0, 0, 0]
 , [255, 0, 0]
 , [0, 255, 0]
 , [255, 255, 0]
 , [0, 0, 255]
 , [255, 0, 255]
 , [0, 255, 255]
 , [255, 255, 255]
  ]
, histogram: function (frame, histogram) {
 const ic = render.ic
 , gc = ic.getContext('2d')
 , num = frame.getNum()
 , max = histogram.reduce((a,b)=>(Math.max(a,b)), 0)
 , barScale = (ic.height / 3) / max
 , lineScale = (ic.height / 3) / num
 ;

 const rgba = ()=>{
  !('color' in render.histogram) && (render.histogram.color = 0);
  render.histogram.color = (render.histogram.color + 1) % render.COLOR8.length;
  const C = render.COLOR8[render.histogram.color];
  return 'rgba(' + C[0] + ',' + C[1] + ',' + C[2] + ',0.5)'
 }

 gc.fillStyle = rgba();
 for (let x = 10, i = 0; i < histogram.length; ++i, ++x) {
  const h = histogram[i] * barScale;
  gc.fillRect(x, ic.height - 1 - h, 1, h);
 }
 let y = histogram[0];
 const yStart = ic.height - 1;
 gc.strokeStyle = rgba();
 gc.beginPath();
 gc.moveTo(10, yStart - y * lineScale);
 for (let x = 11, i = 1; i < histogram.length; ++i, ++x) {
  y += histogram[i];
  gc.lineTo(x, yStart - y * lineScale);
 }
 gc.stroke();
}
, frame: function (frame) {
 const ic = render.ic
 , imageData = render.buildImage(ic, frame)
 ;
 ic.getContext('2d').putImageData(imageData, 0, 0);
  }
, getImage: function (src) {
 const ic = render.ic;
 const ictx = ic.getContext('2d');
 ictx.drawImage(src, 0, 0, ic.width, ic.height);
 return ictx.getImageData(0, 0, ic.width, ic.height);
  }
, show: function () {
 const dc = render.dc;
 const dctx = dc.getContext('2d');
 dctx.drawImage(render.ic, 0, 0, dc.width, dc.height);
  }
, resize: function (disp, internal) {
 if (disp instanceof Array) {
  if (render.dc.width != disp[0] || render.dc.height != disp[1]) {
   print ('size = ' + disp[0] + 'x' + disp[1]);
   render.dc.width  = disp[0];
   render.dc.height = disp[1];
  }
 }
 if (internal instanceof Array) {
  if (render.ic.width != internal[0] || render.ic.height != internal[1]) {
   render.ic.width  = internal[0];
   render.ic.height = internal[1];
  }
 }
  }
}
render.ic = e('i-canvas'); // for internal use
render.dc = e('d-canvas'); // for display

const fitDisplaySize = (videoW, videoH)=>{
 const stage = e('layers');
 const cs = getComputedStyle(stage);
 const maxW = Math.max(1,
  stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
 const maxH = Math.max(1,
  stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
 const scale = Math.min(maxW / videoW, maxH / videoH);
 return [
  Math.max(1, Math.floor(videoW * scale)),
  Math.max(1, Math.floor(videoH * scale))
 ];
}

const layoutDisplay = (video, resizeBitmap)=>{
 if (!video || video.videoWidth == 0 || video.videoHeight == 0) return null;
 const disp = fitDisplaySize(video.videoWidth, video.videoHeight);
 const layer = e('dcanvas-layer');
 layer.style.width = disp[0] + 'px';
 layer.style.height = disp[1] + 'px';
 layer.style.aspectRatio = 'auto';
 if (resizeBitmap) render.resize(disp, [video.videoWidth, video.videoHeight]);
 return disp;
}

function dispatch () {
 if (!dispatch.run) return;

 if (dispatch.paused) {
  layoutDisplay(e('video'), false);
  setTimeout(dispatch, 100);
  return;
 }

 const r = dispatch.iDISP.next();

 setTimeout(dispatch, dispatch.duration + r.value);

 dispatch.count.value++;
}
dispatch.iDISP = (function * () {
 const video = e('video');
 const ic = e('i-canvas');
 const dc = e('d-canvas');
 new Frame; new Frame; new Frame; new Frame;

 let  suggestion = 0;
 while (true) {
  yield suggestion;
  suggestion = 0;

  if (video.videoWidth == 0 || video.videoHeight == 0) {
   suggestion = 100;
   continue;
  }

  const dispSize = layoutDisplay(video, true);
  if (!dispSize) {
   suggestion = 100;
   continue;
  }

  const imageData = render.getImage(video);

  const newFrame = new Frame(imageData);

  if (dispatch.showImage) {
   render.frame(newFrame);
   render.histogram.color = 0;
   for (let k in newFrame.histogram) {
    render.histogram(newFrame, newFrame.histogram[k]);
   }
   render.show();
  }

  //delta.accum(newFrame);
 }
})();
dispatch.duration = 0;
dispatch.run = false;
dispatch.paused = false;
dispatch.count = {'value':0};
dispatch.showImage = true;


const watch = ()=>{
 watch.iFPS.next();
 setTimeout(watch, 500);
}
watch.iFPS = Graph(
 dispatch.count
, 'FPS'
, 'fps-chart'
, 'fps-caption'
, 'rgba(255,0,255,0.5)'
);
watch.last = 0;
watch();

dispatch.run = true;
dispatch();

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

function print(msg) {
 print.messages.push(msg);
 print.messages.shift();

 let html = '<span>';
 for (let i = 0; i < print.messages.length; ++i) {
  html += '<br />' + print.messages[i];
 } html += '</span>';

 e('message').innerHTML = html;
}
print.messages = ['','','','','','',''];

e('show-image').onchange = function () {
 dispatch.showImage = this.checked;
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

//setupRange('dthreshold', 'delta threshold', (v)=>(delta.threshold = v));
setupRange('afactor', 'accumulation factor', (v)=>(delta.factor = Number(v)));
setupRange('pause', 'pause@frame', (v)=>(dispatch.duration = Number(v)));

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

 media.getUserMedia(constraints)
  .then((stream)=>{
   video.srcObject = stream;
   const playing = video.play();
   if (playing && playing.catch) {
    playing.catch((err)=>setCameraStatus('playback failed: ' + err));
   }
   const overlay = e('camera-overlay');
   if (overlay) overlay.classList.add('is-live');
   const help = e('camera-help');
   if (help) help.hidden = true;
   setIoPaused(false);
   setCameraStatus('camera enabled');
  })
  .catch((error)=>{
   const name = (error && error.name) ? error.name : 'Error';
   const msg = (error && error.message) ? error.message : String(error);
   setCameraStatus('camera disabled: ' + name + ' — ' + msg);
  });
}

const stopCamera = ()=>{
 const video = e('video');
 const stream = video && video.srcObject;
 if (stream && stream.getTracks) {
  const tracks = stream.getTracks();
  for (let i = 0; i < tracks.length; ++i) {
   tracks[i].stop();
  }
 }
 if (video) video.srcObject = null;

 const overlay = e('camera-overlay');
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


