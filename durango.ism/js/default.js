// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    var plugins = new Windows.Media.MediaExtensionManager();
    plugins.registerByteStreamHandler("Microsoft.Media.AdaptiveStreaming.SmoothByteStreamHandler", ".ism", "text/xml");
    plugins.registerByteStreamHandler("Microsoft.Media.AdaptiveStreaming.SmoothByteStreamHandler", ".ism", "application/vnd.ms-sstr+xml");
    plugins.registerByteStreamHandler("Windows.Xbox.Media.SmoothStreamingByteStreamHandler", null, ".m3u8", null);
    function keyDownHandler(e) {
      var s = "";
      for (var key in WinJS.Utilities.Key) {
        if (WinJS.Utilities.Key[key] == e.keyCode) {
          document.getElementById("key").innerHTML += " " + key;
        }
      }
    };

    function buttonTestClicked(eventInfo) {
      var url = "http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8";
      //var url = "http://gslb.bestvcdn.com.cloudcdn.net/218.77.90.58/gslb/program/Dbackct_bestvcdn_comD/_wogP000iG6_/FDN/FDNB1664649/prime.m3u8?_mdCode=9674414&_cdnCode=BTV&_type=0&_rCode=TerOut_21562&_userId=023513000031081&_categoryCode=SMG_OTT_TV_JT&_categoryPath=SMG_OTT_TV,SMG_OTT_TV_JT,&_adPositionId=01001000&_adCategorySource=0&_flag=.m3u8&_enCode=m3u8&_cms=ctv&_service=b2c&_cp=1&_back=FASTWEB&_BitRate=700,1300,2300,4000&taskID=pb02.idc.xbox.bestv.com.cn_14301850139636298&_client=104";
      var control = document.querySelector("#player").winControl;
      var video = control.mediaElementAdapter.mediaElement;
      var me = document.querySelector("#video");
      control.mediaElementAdapter.mediaElement.src = "http://lm.funshion.com:5050/livestream/0b49884b3b85f7ccddbe4e96e4ae2eae7a6dec56.m3u8?codec=ts";
      //document.getElementById("video").src = "http-live://lm.funshion.com:5050/livestream/0b49884b3b85f7ccddbe4e96e4ae2eae7a6dec56.m3u8?codec=ts";

    };

    function buttonClearClicked(eventInfo) {
      document.getElementById("key").innerHTML = "";
    }

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
//              var hlsAdapter = new HlsBy3ivx.HlsAdapter('3300A81D', '1ef70100-41f9-49ca-9867-77c23300a81d', "0ab7-f5ed-db24-fa4f-2f74-ed8d-3789-df8d-7532-9d8e");
              // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
          // Set up event handlers.
            document.getElementById("buttonTest").addEventListener("click", buttonTestClicked, false);
            document.getElementById("buttonClear").addEventListener("click", buttonClearClicked, false);
          // Set initial focus.
            document.getElementById("buttonTest").focus();
            args.setPromise(WinJS.UI.processAll());
        }
    };

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

    app.start();
})();
