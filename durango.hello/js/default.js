// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

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
      var player = document.getElementById("player");
      var me = document.getElementById("video");
      player.mediaElementAdapter = new HlsMedia.HlsMediaElementAdapter(player, me, false);
      player.mediaElementAdapter.setHlsMedia(url, 0);
    };

    function buttonClearClicked(eventInfo) {
      document.getElementById("key").innerHTML = "";
    }

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
              var hlsAdapter = new HlsBy3ivx.HlsAdapter('3300A81D', '1ef70100-41f9-49ca-9867-77c23300a81d', "0ab7-f5ed-db24-fa4f-2f74-ed8d-3789-df8d-7532-9d8e");
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
