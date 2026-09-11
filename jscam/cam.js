'use strict';

const e = function(tag) {return document.getElementById(tag);}

const Graph = function * (data, label, canvasName, captionName, color) {
 const AFACTOR = 0.2
 , STEP = 2
 , INV_STEP = 1 / STEP
 , canvas = e(canvasName)
 , caption = e(captionName)
 , low = Math.round(canvas.width / STEP)
 , high = Math.round(low * 1.5)
 , c = canvas.getContext('2d')
 , values = [0]
 ;

 let last = performance.now();

 (color == undefined) && (color = 'black');
 c.fillStyle = color;

 let min = 0, max = 0, sum = 0;
 while (true) {
  yield;
  const now = performance.now();

  if (now == last) continue;

  const duration = now - last;
  last = now;

  const fpc = data.value * 1000 / duration;
  data.value = 0;

  values.push(
   (1 - AFACTOR) * values[values.length - 1]
  + AFACTOR * fpc);
  sum += fpc;
  (max < fpc) && (max = fpc);
  (min > fpc) && (min = fpc);
  if (values.length > high) {
   while (values.length > low) {
    values.shift();
   }
   max = values.reduce((a,b)=>(Math.max(a,b)));
   min = values.reduce((a,b)=>(Math.min(a,b)));
   sum = values.reduce((a,b)=>(a+b));
  }

  const scale = canvas.height / Math.abs(max);

  caption.innerText =
     label
   + ' range ' + Math.round(min) + ':' + Math.round(max) 
   + ', ave ' + Math.round(sum / values.length);

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

 const now = performance.now();

 const id = Math.round(now * 10);
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
Frame._Laplacian = (dst, src, O)=>{ // 3x3 8dirction
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
Frame.calcThreshold = (histgram)=>{
 let H = 0
 ;
 const p = new Array(histgram.length)
 , sB2 = new Array(histgram.length)
 , w = new Array(histgram.length)
 , s = new Array(histgram.length)
 ;
 for (let k = 0; k < histgram.length; ++k) H += histgram[k];
 w[0] = histgram[0];
 s[0] = 0;
 for (let k = 1; k < histgram.length; ++k) {
  w[k] = w[k-1] + histgram[k];
  s[k] = s[k-1] + k*histgram[k];
 }

 const S = s[s.length - 1]
 ;
 let maxK = 0
 , max = 0
 ;
 for (let k = 1; k < histgram.length; ++k) {
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
 this.range = Object.create(null);
 this.histgram = Object.create(null);
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

 this.histgram['R'] = hR;
 this.histgram['G'] = hG;
 this.histgram['B'] = hB;
 this.get3Planars = ()=>[R,G,B];

 return this.get3Planars()
  }
, _getEqualized: function () {
 const g = this.getGray()
 , num  = this.getNum()
 , inv = 1 / num
 , size = this.getSize()
 , gh = this.histgram['gray']
 ;
 const accum = new Array(gh.length);
 accum[0] = gh[0];
 for (let i = 1; i < accum.length; ++i)
  accum[i] = gh[i] + accum[i-1];

 const V = accum.map((v)=>(v*inv))
 , Vmin = V.reduce((a,b)=>(Math.min(a,b)), 0)
 , factor = (255 / (1 - Vmin))
 , histgram = new Array(256)
 , E = new Uint8ClampedArray(num)
 ;
 histgram.fill(0);
 for (let i = 0; i < num; ++i) {
  E[i] = (V[g[i]] - Vmin) * factor;
  histgram[E[i]] += 1;
 }
 this.histgram['equalization'] = histgram;
 this.getEqualized = ()=>(E);
 return this.getEqualized()
  }
, _getYUV: function () {
 const data = this.getRGBA()
 , num = this.getNum()
// , Y = new Array(num)
 , Y = new Uint8ClampedArray(num)
 , UV = new Array(num * 2)
 , histgram = new Array(256)
 ;

 histgram.fill(0);
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
  histgram[Y[i]] += 1;
 }
 this.getYUV = ()=>({'Y':Y, 'UV':UV});
 this.histgram['gray'] = histgram;
 return this.getYUV();
  }
, _getGray: function () {
 const data = this.getRGBA();
 const num = this.getNum();
   const gray = new Uint8ClampedArray(num);
 const histgram = new Array(256);
 histgram.fill(0);
   for (let i = 0, o = 0; i < num; ++i, o += 4) {
  gray[i] = Math.round(
     data[o+0] * 0.299
   + data[o+1] * 0.587
   + data[o+2] * 0.114
  );
  histgram[gray[i]] += 1;
 }
 this.getGray = ()=>(gray);
 this.histgram['gray'] = histgram;
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
  , G = plane[0]
  , B = plane[0]
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
  Frame._Laplacian(e, this.getGray(), O);
 }
 else if (method == 'sobel') {
  Frame._Sobel(e, this.getGray(), O);
 }
 else throw `not support ${methdo}`

/*
 let g = this.getGray();
 if (g.length < e.length) { // dummy
  g = new Array(e.length);
  g.fill(0);
 }
*/

 this.edgeFuncs[method] = ()=>(e);

 const histgram = new Array(256);
  histgram.fill(0);
 for (let i = 0; i < e.length; ++i)
  histgram[e[i]] += 1; 
 this.histgram[method] = histgram;

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
, 'GRAY-Histgram equalization': function (ic, frame) {
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
 , tR = Frame.calcThreshold(frame.histgram['R'])
 , tG = Frame.calcThreshold(frame.histgram['G'])
 , tB = Frame.calcThreshold(frame.histgram['B'])
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
 , t = Frame.calcThreshold(frame.histgram['sobel.rgb'])
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
, histgram: function (frame, histgram) {
 const ic = render.ic
 , gc = ic.getContext('2d')
 , num = frame.getNum()
 , max = histgram.reduce((a,b)=>(Math.max(a,b)), 0)
 , barScale = (ic.height / 3) / max
 , lineScale = (ic.height / 3) / num
 ;

 const rgba = ()=>{
  !('color' in render.histgram) && (render.histgram.color = 0);
  render.histgram.color = (render.histgram.color + 1) % render.COLOR8.length;
  const C = render.COLOR8[render.histgram.color];
  return 'rgba(' + C[0] + ',' + C[1] + ',' + C[2] + ',0.5)'
 }

 gc.fillStyle = rgba();
 for (let x = 10, i = 0; i < histgram.length; ++i, ++x) {
  const h = histgram[i] * barScale;
  gc.fillRect(x, ic.height - 1 - h, 1, h);
 }
 let y = histgram[0];
 const yStart = ic.height - 1;
 gc.strokeStyle = rgba();
 gc.beginPath();
 gc.moveTo(10, yStart - y * lineScale);
 for (let x = 11, i = 1; i < histgram.length; ++i, ++x) {
  y += histgram[i];
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
render.ic = e('s18-i-canvas'); // for internal use
render.dc = e('s18-d-canvas'); // for display


function dispatch () {
 if (!dispatch.run) return;

 const r = dispatch.iDISP.next();

 setTimeout(dispatch, dispatch.duration + r.value);

 dispatch.count.value++;
}
dispatch.iDISP = (function * () {
 const video = e('s18-video');
 const ic = e('s18-i-canvas');
 const dc = e('s18-d-canvas');
 new Frame; new Frame; new Frame; new Frame;

 let  suggestion = 0;
 while (true) {
  yield suggestion;
  suggestion = 0;

  if (video.videoWidth == 0 || video.videoHeigh == 0) {
   suggestion = 100;
   continue;
  }

  const internalSize = [video.videoWidth, video.videoHeight];

  const w = e('s18-dcanvas-layer').clientWidth;
  const h = Math.floor(video.videoHeight * w / video.videoWidth);

  e('s18-layers').style.height = h + 'px';

  const dispSize = [w, h];

  render.resize(dispSize, internalSize);

  const imageData = render.getImage(video);

  const newFrame = new Frame(imageData);

  if (dispatch.showImage) {
   render.frame(newFrame);
   render.histgram.color = 0;
   for (let k in newFrame.histgram) {
    render.histgram(newFrame, newFrame.histgram[k]);
   }
   render.show();
  }

  //delta.accum(newFrame);
 }
})();
dispatch.duration = 0;
dispatch.frames = [new Frame, new Frame, new Frame, new Frame, new Frame];
dispatch.run = false;
dispatch.count = {'value':0};
dispatch.showImage = true;


const watch = ()=>{
 watch.iFPS.next();
 setTimeout(watch, 500);
}
watch.iFPS = Graph(
 dispatch.count
, 'FPS'
, 's18-fps-chart'
, 's18-fps-caption'
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

e('s18-panel-open-button').onclick = function() {
 e('s18-panel-close-button').style.display = 'block';
 e('s18-panel-open-button').style.display = 'none';
 slide.IN(e('s18-side-panel'), 250);
};

e('s18-panel-close-button').onclick = function() {
 e('s18-panel-close-button').style.display = 'none';
 e('s18-panel-open-button').style.display = 'block';
 slide.OUT(e('s18-side-panel'), 250);
};

function print(msg) {
 print.messages.push(msg);
 print.messages.shift();

 let html = '<span>';
 for (let i = 0; i < print.messages.length; ++i) {
  html += '<br />' + print.messages[i];
 } html += '</span>';

 e('s18-message').innerHTML = html;
}
print.messages = ['','','','','','',''];

e('s18-show-image').onchange = function () {
 dispatch.showImage = this.checked;
}

for (let k in buildImageFuncs) {
 e('s18-image-mode').add(new Option(k, k));
}
render.buildImage = buildImageFuncs[e('s18-image-mode').options[0].value];
e('s18-image-mode').onchange = function () {
 const mode = this.options[this.selectedIndex].value;
 print('image mode:' + mode);
 render.buildImage = buildImageFuncs[mode];
}

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

//setupRange('s18-dthreshold', 'delta threshold', (v)=>(delta.threshold = v));
setupRange('s18-afactor', 'accumlateion factor', (v)=>(delta.factor = Number(v)));
setupRange('s18-pause', 'pause@frame', (v)=>(dispatch.duration = Number(v)));

const constraints = {audio: false, video: true};

navigator.mediaDevices
 .getUserMedia(constraints)
 .then((stream)=>{
  print('camera enabled');
  e('s18-video').srcObject = stream;
 })
 .catch((error)=>{print('camera disabled');});


