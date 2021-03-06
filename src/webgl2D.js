"use strict";

class WebGL2DContext {
  constructor(canvas, obj = {}) {
    let { size = 200000, antialias = false, smoothing = false, blending = true } = obj;
    this.canvas = canvas;
    this.gl = null;
    this.shaderProgram = null;
    this.vertexPosition = [];
    this.vertexTextureCoord = [];
    this.vertexColor = [];
    this.vertexIndex = [];
    this.textureList = [];
    this.vertexPositionBuffer = null;
    this.vertexTextureCoordBuffer = null;
    this.vertexColorBuffer = null;
    this.vertexIndexBuffer = null;
    this.IndexOffset = 0;
    this.bufferOffset = 0;
    this.bufferCreatet = false;
    this.lastTexture = null;
    this.textureContinuous = [];
    this.textureOffset = 0;
    this.curOffset = 0;
    this.textureCounter = 0;
    this.white = [255, 255, 255, 255];
    this.isWebGl2 = true;
    this.antialias = antialias;
    this.filter = 0;

    this.matrix = new Matrix();

    if (canvas === void 0)
      return;

    this.gl = canvas.getContext("webgl2", { antialias, depth: false });
    if (this.gl === void 0 || this.gl === null) {
      this.gl = canvas.getContext("webgl", { antialias, depth: false });
      console.warn("Can not initialize WebGL2, try switching to WebGL")
      this.isWebGl2 = false;
    }
    if (this.gl === void 0 || this.gl === null) {
      console.error("Can not initialize WebGL!");
      return;
    }

    if (smoothing === true)
      this.filter = this.gl.LINEAR;
    else
      this.filter = this.gl.NEAREST;

    this.vertexPositionBuffer = this.gl.createBuffer();
    this.vertexColorBuffer = this.gl.createBuffer();
    this.vertexTextureCoordBuffer = this.gl.createBuffer();
    this.vertexIndexBuffer = this.gl.createBuffer();

    this.vertexPosition = new Float32Array(size * 2 * 2);
    this.vertexTextureCoord = new Float32Array(size * 2 * 2);
    this.vertexColor = new Float32Array(size * 4 * 2);
    this.vertexIndex = new Uint16Array(size * 3);
    this.textureList = [];
    this.textureContinuous = [];

    let vert = `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;
    attribute vec4 aVertexColor;

    varying vec2 vTextureCoord;
    varying vec4 vColor;

    void main(void) {
        gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, 0.0, 1.0);
        vTextureCoord = aTextureCoord;
        vColor = aVertexColor / vec4(255,255,255,255);
    }
    `
    let frag = `
    precision mediump float;

    varying vec2 vTextureCoord;
    varying vec4 vColor;

    uniform sampler2D uSampler;

    void main(void) {
      vec4 color = vec4(texture2D(uSampler, vTextureCoord) * vColor);
      ${blending === true ? '' : 'if (color.a < 0.5) discard;\n'}
      gl_FragColor = color;
    }
    `

    this.useShader(this.compileShader(vert,frag));

    this.endScene();

    this.gl.disable(this.gl.DEPTH_TEST);
    if (blending === true) {
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.enable(this.gl.BLEND);
    }
    else {
      this.gl.disable(this.gl.BLEND);
    }

    this.emptyTexture = this.textureFromPixelArray(new Uint8Array([255, 255, 255]), 1, 1);
  }
}

WebGL2DContext.prototype.destroy = function () {
  this.gl.getExtension('WEBGL_lose_context').loseContext();
}
WebGL2DContext.prototype.pow = function (input) {
  let i = 1;
  while (true) {
    if (input <= 2 << i) return 2 << i; i++;
  }
}
WebGL2DContext.prototype.compileShader = function (vertexShaderCode, fragmentShaderCode) {
  let gl = this.gl;
  let fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
  let vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);

  this.gl.shaderSource(vertexShader, vertexShaderCode);

  this.gl.compileShader(vertexShader);

  this.gl.shaderSource(fragmentShader, fragmentShaderCode);

  this.gl.compileShader(fragmentShader);

  let shaderProgram = this.gl.createProgram();
  this.gl.attachShader(shaderProgram, vertexShader);
  this.gl.attachShader(shaderProgram, fragmentShader);
  this.gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
  }

  shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(shaderProgram, "aVertexPosition");
  this.gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.textureCoordAttribute = this.gl.getAttribLocation(shaderProgram, "aTextureCoord");
  this.gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

  shaderProgram.vertexColorAttribute = this.gl.getAttribLocation(shaderProgram, "aVertexColor");
  this.gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.samplerUniform = this.gl.getUniformLocation(shaderProgram, "uSampler");

  return shaderProgram;
}
WebGL2DContext.prototype.useShader = function (shaderProgram) {
  this.gl.useProgram(shaderProgram);
  this.shaderProgram = shaderProgram;
}
WebGL2DContext.prototype.textureFromImage = function (image) {
  let gl = this.gl;
  let texture
  texture = this.gl.createTexture();

  let canvas = document.createElement("canvas");
  let context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;//Chrome
  context.mozImageSmoothingEnabled = false;//Firefox
  canvas.width = this.pow(image.width);
  canvas.height = this.pow(image.height);
  context.drawImage(image, 0, 0, image.width, image.height);

  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.filter);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.filter);
  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  texture.powwidth = canvas.width;
  texture.powheight = canvas.height;
  texture.width = image.width;
  texture.height = image.height;
  texture.index = this.textureCounter;
  this.textureCounter++

  return texture;
}
WebGL2DContext.prototype.textureFromFile = function (path) {
  let gl = this.gl;
  let texture
  texture = this.gl.createTexture();
  texture.image = new Image();

  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1,1,0,this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));

  texture.onload = () => { }
  texture.image.onload = () => {
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;//Chrome
    context.mozImageSmoothingEnabled = false;//Firefox
    canvas.width = this.pow(texture.image.width);
    canvas.height = this.pow(texture.image.height);
    context.drawImage(texture.image, 0, 0, texture.image.width, texture.image.height);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.filter);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.filter);
    texture.powwidth = canvas.width;
    texture.powheight = canvas.height;
    texture.width = texture.image.width;
    texture.height = texture.image.height;
    texture.index = this.textureCounter;
    this.textureCounter++
    texture.onload();

    if (texture.width == 0)
      console.error("can not load texture from " + location.pathname + " , " + path)
  }
  texture.image.src = path;
  return texture;
}
WebGL2DContext.prototype.textureFromPixelArray = function (data, width, height) {
  let src;
  if (data.length / 4 < width * height) {
    let size = width * height;
    src = new Uint8Array(size * 4)
    for (let i = 0; i < size; i++) {
      let offsetSrc = i * 4;
      let offsetDst = i * 3;
      src[offsetSrc + 0] = data[offsetDst + 0];
      src[offsetSrc + 1] = data[offsetDst + 1];
      src[offsetSrc + 2] = data[offsetDst + 2];
      src[offsetSrc + 3] = 255;
    }
  }
  else {
    src = new Uint8Array(data);
  }
  let gl = this.gl;
  let texture = this.gl.createTexture();
  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, src);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.filter);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.filter);
  texture.width = width;
  texture.height = height;
  texture.powwidth = width;
  texture.powheight = height;
  texture.index = this.textureCounter;
  this.textureCounter++

  if (texture.width == 0)
    console.error("can not create texture from source")
  return texture;
}
WebGL2DContext.prototype.deleteTexture = function(texture){
  this.gl.deleteTexture(texture)
}

WebGL2DContext.prototype.startScene = function () {
  this.gl.viewportWidth = this.canvas.width;
  this.gl.viewportHeight = this.canvas.height;
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  this.IndexOffset = 0;
  this.bufferOffset = 0;
  this.lastTexture = null;
  this.textureOffset = -1;
}
WebGL2DContext.prototype.drawTriangle = function (texture, src, dst, color) {
  let gl = this.gl;
  let IndexOffset = this.IndexOffset;
  let bufferOffset = this.bufferOffset;
  let dstPos = this.matrix.apply(dst, this.gl.viewportWidth, this.gl.viewportHeight);

  let imageWidth = texture.powwidth, imageHeight = texture.powheight;

  let offset = this.curOffset;

  offset = bufferOffset * 2;
  this.vertexPosition[offset + 0] = dstPos[0];
  this.vertexPosition[offset + 1] = dstPos[1];
  this.vertexPosition[offset + 2] = dstPos[2];
  this.vertexPosition[offset + 3] = dstPos[3];
  this.vertexPosition[offset + 4] = dstPos[4];
  this.vertexPosition[offset + 5] = dstPos[5];
  dstPos = null;

  offset = bufferOffset * 2;
  this.vertexTextureCoord[offset + 0] = src[0] / imageWidth;
  this.vertexTextureCoord[offset + 1] = src[1] / imageHeight;
  this.vertexTextureCoord[offset + 2] = src[2] / imageWidth;
  this.vertexTextureCoord[offset + 3] = src[3] / imageHeight;
  this.vertexTextureCoord[offset + 4] = src[4] / imageWidth;
  this.vertexTextureCoord[offset + 5] = src[5] / imageHeight;

  offset = bufferOffset * 4;
  this.vertexColor[offset + 0] = color[0];//r
  this.vertexColor[offset + 1] = color[1];//g
  this.vertexColor[offset + 2] = color[2];//b
  this.vertexColor[offset + 3] = color[3];//a
  this.vertexColor[offset + 4] = color[4];//r
  this.vertexColor[offset + 5] = color[5];//g
  this.vertexColor[offset + 6] = color[6];//b
  this.vertexColor[offset + 7] = color[7];//a
  this.vertexColor[offset + 8] = color[8];//r
  this.vertexColor[offset + 9] = color[9];//g
  this.vertexColor[offset + 10] = color[10];//b
  this.vertexColor[offset + 11] = color[11];//a

  this.vertexIndex[IndexOffset * 3 + 0] = bufferOffset + 0;
  this.vertexIndex[IndexOffset * 3 + 1] = bufferOffset + 1;
  this.vertexIndex[IndexOffset * 3 + 2] = bufferOffset + 2;

  if (texture != this.lastTexture) {
    this.textureOffset++;
    this.lastTexture = texture;
    this.textureList[this.textureOffset] = texture;
    this.textureContinuous[this.textureOffset] = 0;
  }
  this.textureContinuous[this.textureOffset] += 1;

  this.IndexOffset += 1;
  this.bufferOffset += 3;

}
WebGL2DContext.prototype.drawTriangleFan = function (texture, src, dst, color) {
  let gl = this.gl;
  let IndexOffset = this.IndexOffset;
  let bufferOffset = this.bufferOffset;
  let size = dst.length / 2;
  let dstPos = this.matrix.apply(dst, this.gl.viewportWidth, this.gl.viewportHeight);

  let imageWidth = texture.powwidth, imageHeight = texture.powheight;

  let vertexOffset = bufferOffset * 2;
  let textureOffset = bufferOffset * 2;
  let colorOffset = bufferOffset * 4;
  for (let i = 0; i < size; i++) {
    this.vertexPosition[vertexOffset + 0 + 2 * i] = dstPos[0 + 2 * i];//ul
    this.vertexPosition[vertexOffset + 1 + 2 * i] = dstPos[1 + 2 * i];

    this.vertexTextureCoord[textureOffset + 0 + 2 * i] = src[0 + 2 * i] / imageWidth;
    this.vertexTextureCoord[textureOffset + 1 + 2 * i] = src[1 + 2 * i] / imageHeight;


    this.vertexColor[colorOffset + 0 + 4 * i] = color[0 + 4 * i];//r
    this.vertexColor[colorOffset + 1 + 4 * i] = color[1 + 4 * i];//g
    this.vertexColor[colorOffset + 2 + 4 * i] = color[2 + 4 * i];//b
    this.vertexColor[colorOffset + 3 + 4 * i] = color[3 + 4 * i];//a
  }
  for (let i = 0; i < size - 2; i++) {
    this.vertexIndex[IndexOffset * 3 + 0 + 3 * i] = bufferOffset + 0;
    this.vertexIndex[IndexOffset * 3 + 1 + 3 * i] = bufferOffset + 1 + i;
    this.vertexIndex[IndexOffset * 3 + 2 + 3 * i] = bufferOffset + 2 + i;
  }

  if (texture != this.lastTexture) {
    this.textureOffset++;
    this.lastTexture = texture;
    this.textureList[this.textureOffset] = texture;
    this.textureContinuous[this.textureOffset] = 0;
  }
  this.textureContinuous[this.textureOffset] += size - 2;

  this.IndexOffset += size - 2;
  this.bufferOffset += size;
}
WebGL2DContext.prototype.drawSquare = function (texture, src, dst, color) {
  let gl = this.gl;
  let IndexOffset = this.IndexOffset;
  let bufferOffset = this.bufferOffset;
  let dstPos = this.matrix.apply(dst, this.gl.viewportWidth, this.gl.viewportHeight);

  let imageWidth = texture.powwidth, imageHeight = texture.powheight;

  let offset = this.curOffset;

  offset = bufferOffset * 2;
  this.vertexPosition[offset + 0] = dstPos[0];
  this.vertexPosition[offset + 1] = dstPos[1];
  this.vertexPosition[offset + 2] = dstPos[2];
  this.vertexPosition[offset + 3] = dstPos[3];
  this.vertexPosition[offset + 4] = dstPos[4];
  this.vertexPosition[offset + 5] = dstPos[5];
  this.vertexPosition[offset + 6] = dstPos[6];
  this.vertexPosition[offset + 7] = dstPos[7];
  this.vertexPosition[offset + 8] = (dstPos[0] + dstPos[2] + dstPos[4] + dstPos[6]) * 0.25;
  this.vertexPosition[offset + 9] = (dstPos[1] + dstPos[3] + dstPos[5] + dstPos[7]) * 0.25;
  dstPos = null;

  offset = bufferOffset * 2;
  this.vertexTextureCoord[offset + 0] = src[0] / imageWidth;
  this.vertexTextureCoord[offset + 1] = src[1] / imageHeight;
  this.vertexTextureCoord[offset + 2] = src[2] / imageWidth;
  this.vertexTextureCoord[offset + 3] = src[3] / imageHeight;
  this.vertexTextureCoord[offset + 4] = src[4] / imageWidth;
  this.vertexTextureCoord[offset + 5] = src[5] / imageHeight;
  this.vertexTextureCoord[offset + 6] = src[6] / imageWidth;
  this.vertexTextureCoord[offset + 7] = src[7] / imageHeight;
  this.vertexTextureCoord[offset + 8] = (this.vertexTextureCoord[offset + 0] + this.vertexTextureCoord[offset + 2] + this.vertexTextureCoord[offset + 4] + this.vertexTextureCoord[offset + 6]) * 0.25;
  this.vertexTextureCoord[offset + 9] = (this.vertexTextureCoord[offset + 1] + this.vertexTextureCoord[offset + 3] + this.vertexTextureCoord[offset + 5] + this.vertexTextureCoord[offset + 7]) * 0.25;

  offset = bufferOffset * 4;
  this.vertexColor[offset + 0] = color[0];//r
  this.vertexColor[offset + 1] = color[1];//g
  this.vertexColor[offset + 2] = color[2];//b
  this.vertexColor[offset + 3] = color[3];//a
  this.vertexColor[offset + 4] = color[4];//r
  this.vertexColor[offset + 5] = color[5];//g
  this.vertexColor[offset + 6] = color[6];//b
  this.vertexColor[offset + 7] = color[7];//a
  this.vertexColor[offset + 8] = color[8];//r
  this.vertexColor[offset + 9] = color[9];//g
  this.vertexColor[offset + 10] = color[10];//b
  this.vertexColor[offset + 11] = color[11];//a
  this.vertexColor[offset + 12] = color[12];//r
  this.vertexColor[offset + 13] = color[13];//g
  this.vertexColor[offset + 14] = color[14];//b
  this.vertexColor[offset + 15] = color[15];//a
  this.vertexColor[offset + 16] = (color[0] + color[4] + color[8] + color[12]) * 0.25;//r
  this.vertexColor[offset + 17] = (color[1] + color[5] + color[9] + color[13]) * 0.25;;//g
  this.vertexColor[offset + 18] = (color[2] + color[6] + color[10] + color[14]) * 0.25;;//b
  this.vertexColor[offset + 19] = (color[3] + color[7] + color[11] + color[15]) * 0.25;;//a

  offset = IndexOffset * 3;
  this.vertexIndex[offset + 0] = bufferOffset + 0;
  this.vertexIndex[offset + 1] = bufferOffset + 1;
  this.vertexIndex[offset + 2] = bufferOffset + 4;

  this.vertexIndex[offset + 3] = bufferOffset + 1;
  this.vertexIndex[offset + 4] = bufferOffset + 2;
  this.vertexIndex[offset + 5] = bufferOffset + 4;

  this.vertexIndex[offset + 6] = bufferOffset + 2;
  this.vertexIndex[offset + 7] = bufferOffset + 3;
  this.vertexIndex[offset + 8] = bufferOffset + 4;

  this.vertexIndex[offset + 9] = bufferOffset + 3;
  this.vertexIndex[offset + 10] = bufferOffset + 0;
  this.vertexIndex[offset + 11] = bufferOffset + 4;

  if (texture != this.lastTexture) {
    this.textureOffset++;
    this.lastTexture = texture;
    this.textureList[this.textureOffset] = texture;
    this.textureContinuous[this.textureOffset] = 0;
  }
  this.textureContinuous[this.textureOffset] += 4;

  this.IndexOffset += 4;
  this.bufferOffset += 5;


}
WebGL2DContext.prototype.drawImage = function (texture, src, dst, color = this.white) {
  let gl = this.gl;
  let IndexOffset = this.IndexOffset;
  let bufferOffset = this.bufferOffset;

  let
    startdstX = dst[0],
    enddstX = dst[2] + dst[0],
    startdstY = dst[1],
    enddstY = dst[3] + dst[1];

  let dstPos = this.matrix.apply([startdstX, enddstY, enddstX, enddstY, enddstX, startdstY, startdstX, startdstY], this.gl.viewportWidth, this.gl.viewportHeight);

  let imageWidth = texture.powwidth, imageHeight = texture.powheight;
  let
    startsrcX = src[0] / imageWidth,
    endsrcX = (src[0] + src[2]) / imageWidth,
    startsrcY = src[1] / imageHeight,
    endsrcY = (src[1] + src[3]) / imageHeight;

  let offset = this.curOffset;

  offset = bufferOffset * 2;
  this.vertexPosition[offset + 0] = dstPos[0];//ul
  this.vertexPosition[offset + 1] = dstPos[1];
  this.vertexPosition[offset + 2] = dstPos[2];//ur
  this.vertexPosition[offset + 3] = dstPos[3];
  this.vertexPosition[offset + 4] = dstPos[4];//or
  this.vertexPosition[offset + 5] = dstPos[5];
  this.vertexPosition[offset + 6] = dstPos[6];//ol
  this.vertexPosition[offset + 7] = dstPos[7];
  dstPos = null;

  offset = bufferOffset * 2;
  this.vertexTextureCoord[offset + 0] = startsrcX;
  this.vertexTextureCoord[offset + 1] = endsrcY;
  this.vertexTextureCoord[offset + 2] = endsrcX;
  this.vertexTextureCoord[offset + 3] = endsrcY;
  this.vertexTextureCoord[offset + 4] = endsrcX;
  this.vertexTextureCoord[offset + 5] = startsrcY;
  this.vertexTextureCoord[offset + 6] = startsrcX;
  this.vertexTextureCoord[offset + 7] = startsrcY;

  offset = bufferOffset * 4;
  this.vertexColor[offset + 0] = this.vertexColor[offset + 4] = this.vertexColor[offset + 8] = this.vertexColor[offset + 12] = color[0];//r
  this.vertexColor[offset + 1] = this.vertexColor[offset + 5] = this.vertexColor[offset + 9] = this.vertexColor[offset + 13] = color[1];//g
  this.vertexColor[offset + 2] = this.vertexColor[offset + 6] = this.vertexColor[offset + 10] = this.vertexColor[offset + 14] = color[2];//b
  this.vertexColor[offset + 3] = this.vertexColor[offset + 7] = this.vertexColor[offset + 11] = this.vertexColor[offset + 15] = color[3];//a

  color = null;

  offset = IndexOffset * 3;
  this.vertexIndex[offset + 0] = bufferOffset + 0;
  this.vertexIndex[offset + 1] = bufferOffset + 1;
  this.vertexIndex[offset + 2] = bufferOffset + 2;
  this.vertexIndex[offset + 3] = bufferOffset + 0;
  this.vertexIndex[offset + 4] = bufferOffset + 2;
  this.vertexIndex[offset + 5] = bufferOffset + 3;

  if (texture != this.lastTexture) {
    this.textureOffset++;
    this.lastTexture = texture;
    this.textureList[this.textureOffset] = texture;
    this.textureContinuous[this.textureOffset] = 0;
  }
  this.textureContinuous[this.textureOffset] += 2;

  this.IndexOffset += 2;
  this.bufferOffset += 4;
}
WebGL2DContext.prototype.endScene = function () {
  let gl = this.gl;

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer);
  if (this.bufferCreatet === false) this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexPosition, this.gl.DYNAMIC_DRAW);
  else this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.vertexPosition, 0, this.bufferOffset * 2);
  this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, 2, this.gl.FLOAT, false, 0, 0);

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
  if (this.bufferCreatet === false) this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexColor, this.gl.DYNAMIC_DRAW);
  else this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.vertexColor, 0, this.bufferOffset * 4);
  this.gl.vertexAttribPointer(this.shaderProgram.vertexColorAttribute, 4, this.gl.FLOAT, false, 0, 0);

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
  if (this.bufferCreatet === false) this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexTextureCoord, this.gl.DYNAMIC_DRAW);
  else this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.vertexTextureCoord, 0, this.bufferOffset * 2);
  this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, 2, this.gl.FLOAT, false, 0, 0);

  this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
  if (this.bufferCreatet === false) this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndex, this.gl.DYNAMIC_DRAW);
  else this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, 0, this.vertexIndex, 0, this.IndexOffset*3);

  this.bufferCreatet = true;
}
WebGL2DContext.prototype.createBuffer = function (size) {

}
WebGL2DContext.prototype.renderScene = function () {
  let gl = this.gl;

  let it = 0;
  let offset = 0;
  let amount = 0;
  while (it <= this.textureOffset) {
    amount = this.textureContinuous[it]
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureList[it]);
    this.gl.drawElements(this.gl.TRIANGLES, 3 * amount, this.gl.UNSIGNED_SHORT, offset * 6 * 1);
    offset += amount;
    it++;
  };
}


class TransformBuffer {
  constructor() {
    this.commands = [];
  }
}
TransformBuffer.prototype.translate = function (x, y) {
  this.commands[this.commands.length] = { t: 0, tx: x, ty: y };
}
TransformBuffer.prototype.scale = function (x, y) {
  this.commands[this.commands.length] = { t: 1, sx: x, sy: y };
}
TransformBuffer.prototype.rotate = function (angle) {
  let sin = Math.sin(angle * 3.14159265 / 180), cos = Math.cos(angle * 3.14159265 / 180);
  this.commands[this.commands.length] = { t: 2, rs: sin, rc: cos };
}
TransformBuffer.prototype.reset = function () {
  this.commands = [];
}
TransformBuffer.prototype.clone = function(){
  let clone = new TransformBuffer()
  for (let i = 0;i<this.commands.length;i++)
    clone.commands[i] = {
      t:this.commands[i].t,tx:this.commands[i].tx,ty:this.commands[i].ty,sx:this.commands[i].sx,
      sy:this.commands[i].sy,rs:this.commands[i].rs,rc:this.commands[i].rc
    }
  return clone;
}
TransformBuffer.prototype.apply = function (dst, width, height) {
  let sceneWidth = width * 0.5, sceneHeight = height * 0.5;
  let max = dst.length;

  let result = new Float32Array(dst.length);
  let commands = this.commands;
  for (let i = 0; i < max; i += 2) {
    result[i] = dst[i]; result[i + 1] = dst[i + 1];
    for (let im = 0; im < commands.length; im++) {
      switch (commands[im].t) {
        case 0:
          result[i] += commands[im].tx;
          result[i + 1] += commands[im].ty;
          break;
        case 1:
          result[i] *= commands[im].sx;
          result[i + 1] *= commands[im].sy;
          break;
        case 2:
          let sin = commands[im].rs, cos = commands[im].rc, x = result[i], y = result[i + 1]
          result[i] = x * cos - y * sin;
          result[i + 1] = x * sin + y * cos;
          break;
      }
    }
    result[i] = -1 + result[i] * 1 / sceneWidth;
    result[i + 1] = +1 - result[i + 1] * 1 / sceneHeight;
  }
  return result;
}

class Matrix {
  constructor() {
    this.xsc=1;
    this.xsk=0;
    this.ysk=0;
    this.ysc=1;
    this.xmo=0;
    this.ymo=0;
  }
}

Matrix.prototype.translate = function (x, y) {
  this.xmo+=x;
  this.ymo+=y;
}
Matrix.prototype.scale = function (x, y) {
  this.xsc*=x;
  this.ysc*=y;
}
Matrix.prototype.shear = function (x, y) {
  this.xsk+=x;
  this.ysk+=y;
}
Matrix.prototype.rotate = function (angle) {
  let cos=Math.cos(angle*Math.PI / 180);
  let sin=Math.sin(angle*Math.PI / 180);
  this.transform(cos, sin, -sin, cos, 0, 0);
}
Matrix.prototype.reset = function () {
  this.xsc=1;this.xsk=0;this.ysk=0;this.ysc=1;this.xmo=0;this.ymo=0;
}
Matrix.prototype.transform = function (xsc,xsk,ysk,ysc,xmo,ymo) {
  this.xsc*=xsc;this.xsk+=xsk;this.ysk+=ysk;this.ysc*=ysc;this.xmo+=xmo;this.ymo+=ymo;
}
Matrix.prototype.setTransform = function (xsc,xsk,ysk,ysc,xmo,ymo) {
  this.xsc=xsc;this.xsk=xsk;this.ysk=ysk;this.ysc=ysc;this.xmo=xmo;this.ymo=ymo;
}
Matrix.prototype.clone = function(){
  let clone = new Matrix()
  clone.xsc=this.xsc; clone.xsk=this.xsk; clone.ysk=this.ysk; clone.ysc=this.ysc; clone.xmo=this.xmo; clone.ymo=this.ymo;
  return clone;
}
Matrix.prototype.apply = function (dst, width, height) {
  let sceneWidth = width * 0.5, sceneHeight = height * 0.5;
  let max = dst.length;

  let result = new Float32Array(dst.length);
  for (let i = 0; i < max; i += 2) {
    result[i] = dst[i]; result[i + 1] = dst[i + 1];

    let x = result[i],y = result[i+1];
    
    result[i+1] *=this.ysc;
    result[i] *=this.xsc;

    result[i] +=y*this.ysk;
    result[i+1] +=x*this.xsk;
    
    result[i] +=this.xmo;
    result[i+1] +=this.ymo;

    result[i] = -1 + result[i] * 1 / sceneWidth;
    result[i + 1] = +1 - result[i + 1] * 1 / sceneHeight;
  }
  return result;
}

//closure exports
window['WebGL2DContext'] = WebGL2DContext;
WebGL2DContext.prototype['textureFromImage'] = WebGL2DContext.prototype.textureFromImage;
WebGL2DContext.prototype['textureFromFile'] = WebGL2DContext.prototype.textureFromFile;
WebGL2DContext.prototype['textureFromPixelArray'] = WebGL2DContext.prototype.textureFromPixelArray;

WebGL2DContext.prototype['startScene'] = WebGL2DContext.prototype.startScene;
WebGL2DContext.prototype['endScene'] = WebGL2DContext.prototype.endScene;
WebGL2DContext.prototype['renderScene'] = WebGL2DContext.prototype.renderScene;

WebGL2DContext.prototype['drawTriangle'] = WebGL2DContext.prototype.drawTriangle;
WebGL2DContext.prototype['drawTriangleFan'] = WebGL2DContext.prototype.drawTriangleFan;
WebGL2DContext.prototype['drawSquare'] = WebGL2DContext.prototype.drawSquare;
WebGL2DContext.prototype['drawImage'] = WebGL2DContext.prototype.drawImage;

WebGL2DContext.prototype['compileShader'] = WebGL2DContext.prototype.compileShader;
WebGL2DContext.prototype['useShader'] = WebGL2DContext.prototype.useShader;

window['Matrix'] = Matrix;
Matrix.prototype['translate'] = Matrix.prototype.translate;
Matrix.prototype['scale'] = Matrix.prototype.scale;
Matrix.prototype['rotate'] = Matrix.prototype.rotate;
Matrix.prototype['reset'] = Matrix.prototype.reset;
