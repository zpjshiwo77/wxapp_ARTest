const vs = `
  attribute vec3 aPos;
  attribute vec2 aVertexTextureCoord;
  varying highp vec2 vTextureCoord;

  void main(void){
    gl_Position = vec4(aPos, 1);
    vTextureCoord = aVertexTextureCoord;
  }
`

const fs = `
  varying highp vec2 vTextureCoord;
  uniform sampler2D uSampler;

  void main(void) {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
  }
`

const vertex = [
  -1, -1, 0.0,
  1, -1, 0.0,
  1, 1, 0.0,
  -1, 1, 0.0
]

const vertexIndice = [
  0, 1, 2,
  0, 2, 3
]

const texCoords = [
  0.0, 0.0,
  1.0, 0.0,
  1.0, 1.0,
  0.0, 1.0
]

function createShader(gl, src, type) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Error compiling shader: ' + gl.getShaderInfoLog(shader))
  }
  return shader
}

const buffers = {}

function createRenderer(canvas, width, height) {
  const gl = canvas.getContext("webgl")
  if (!gl) {
    console.error('Unable to get webgl context.')
    return
  }

  const info = wx.getSystemInfoSync()
  gl.canvas.width = info.pixelRatio * width
  gl.canvas.height = info.pixelRatio * height
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

  const vertexShader = createShader(gl, vs, gl.VERTEX_SHADER)
  const fragmentShader = createShader(gl, fs, gl.FRAGMENT_SHADER)

  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program.')
    return
  }

  gl.useProgram(program)

  const texture = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindTexture(gl.TEXTURE_2D, null)

  buffers.vertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl.STATIC_DRAW)

  buffers.vertexIndiceBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.vertexIndiceBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndice), gl.STATIC_DRAW)

  const aVertexPosition = gl.getAttribLocation(program, 'aPos')
  gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(aVertexPosition)

  buffers.trianglesTexCoordBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.trianglesTexCoordBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW)

  const vertexTexCoordAttribute = gl.getAttribLocation(program, "aVertexTextureCoord")
  gl.enableVertexAttribArray(vertexTexCoordAttribute)
  gl.vertexAttribPointer(vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0)

  const samplerUniform = gl.getUniformLocation(program, 'uSampler')
  gl.uniform1i(samplerUniform, 0)

  return (arrayBuffer, width, height) => {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, arrayBuffer)
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }
}


// const upng = require('../../utils/upng.js');
// console.log(upng.encode)

let discernFlag = true;
let successFlag = false;

Page({
  data: {
    width: 750,
    height: 963,
    show: false,
    word: "",
    word2: "",
    base64: ""
  },
  onReady: function () {
    const selector = wx.createSelectorQuery()
    selector.select('#webgl')
      .node(this.init.bind(this))
      .exec()
  },

  init(res) {
    const canvas = res.node
    const context = wx.createCameraContext()
    const render = createRenderer(canvas, this.data.width, this.data.height)

    if (!render || typeof render !== 'function') return

    const listener = context.onCameraFrame((frame) => {
      var img = new Uint8Array(frame.data);
      render(img, frame.width, frame.height)
      // this.discernImg(img);
      this.takePhoto(context);
    })
    listener.start()
  },

  takePhoto(camera) {
    if (discernFlag && !successFlag) {
      discernFlag = false;
      setTimeout(function () {
        discernFlag = true;
      }, 5000);

      camera.takePhoto({
        success: (res) => {
          this.uploadImg(res);
        }
      })
    }
  },

  uploadImg(res) {
    wx.uploadFile({
      url: "https://wxapp_test.beats-digital.com/ar/api.php?action=BaiduAI-recognizeDinnerFromFile",
      filePath: res.tempImagePath,
      name: "img",
      success: (res) => {
        var data = JSON.parse(res.data);
        if(data.data[0].name != "非菜"){
          this.setData({
            show:true
          })
        }
        console.log(data)
      },
      fail: (res) => {
        console.log(res)
      }
    });
  },

  discernImg(data) {
    if (discernFlag && !successFlag) {
      discernFlag = false;
      setTimeout(function () {
        discernFlag = true;
      }, 5000);
      var base64 = wx.arrayBufferToBase64(data);
      // console.log(base64)
      this.sendImg(base64);
    }
  },

  sendImg(img) {
    wx.request({
      url: "https://wxapp_test.beats-digital.com/ar/api.php?action=BaiduAI-recognizeDinner",
      data: { img: "data:image/jpeg;base64," + img },
      method: "POST",
      header: {
        'content-type': "application/x-www-form-urlencoded"
      },
      dataType: 'json',
      success: (res) => {
        if (res.data.errcode == 0) {
          if (res.data.data == null) {
            this.setData({
              word: res.data.data
            })
          }
          else if (res.data.data.length > 0) {
            successFlag = true;
            this.setData({
              word: res.data.data.length,
              show: true
            })
          }
        }
      },
      fail: (err) => {
        this.setData({
          word: "fail",
          word2: err.data
        })
      }
    });
  }
})