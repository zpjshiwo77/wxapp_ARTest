let discernFlag = true;
let GyroscopeFlag = true;
let successFlag = false;
let gifFlag = false;
let timer = null;
let GyrData = null;

Page({
  data: {
    width: 0,
    height: 0,
    show: false,
    word: "",
    word2: "",
    base64: "",
    gifId:1
  },
  onReady: function () {
    var info = wx.getSystemInfoSync();
    var h = 750 / info.windowWidth * info.windowHeight;
    this.setData({
      height:h
    });
    this.startGyr();
  },

  gifAnime(){
    if (gifFlag){
      var id = this.data.gifId;
      id = id < 8 ? id + 1 : 1;
      this.setData({ gifId:id});
      setTimeout(()=>{
        this.gifAnime();
      },66)
    }
  },
  
  /**
   * 开启陀螺仪
   */
  startGyr(){
    var that = this;
    wx.startGyroscope();
    wx.onGyroscopeChange(function(e){
      if(GyroscopeFlag){
        GyroscopeFlag = false;
        setTimeout(function(){
          GyroscopeFlag = true;
        },1000);
        if(GyrData){
          console.log(Math.abs(GyrData.x - e.x) ,Math.abs(GyrData.y - e.y) ,Math.abs(GyrData.z - e.z) )
          if(Math.abs(GyrData.x - e.x) < 0.1 && Math.abs(GyrData.y - e.y) < 0.1 && Math.abs(GyrData.z - e.z) < 0.1){
            that.takePhoto();
          }
          GyrData = e;
        }
        else GyrData = e;
      }
    });
  },

  takePhoto() {
    if (discernFlag && !successFlag) {
      discernFlag = false;
      const camera = wx.createCameraContext()
      camera.takePhoto({
        success: (res) => {
          this.uploadImg(res);
        }
      })
    }
  },

  againTry() {
    this.setData({
      show: false
    });
    gifFlag = false;
    successFlag = false;
  },

  uploadImg(res) {
    var that = this;
    wx.uploadFile({
      url: "https://wxapptest.beats-digital.com/ar/api.php?action=BaiduAI-recognize",
      filePath: res.tempImagePath,
      name: "img",
      success: (res) => {
        discernFlag = true;
        var data = JSON.parse(res.data);
        console.log(data.data);
        that.juaged(data.data);
      },
      fail: (res) => {
        discernFlag = true;
        console.log(res)
      }
    });
  },

  /**
   * 判断返回的结果是否有logo 信赖值>80%及有
   * @param {*} res 
   */
  juaged(res) {
    for (let i = 0; i < res.length; i++) {
      const ele = res[i];
      if (ele.score > 0.8) {
        successFlag = true;
        this.setData({
          show: true
        });
        gifFlag = true;
        this.gifAnime();
        return;
      }
    }
  },

  /********* 下面是像素点转base64的方法，暂时是错误的 **************/
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
      url: "https://wxapp_test.beats-digital.com/ar/api.php?action=BaiduAI-recognize",
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