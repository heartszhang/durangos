// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

/*global WinJS: true*/

(function () {
    "use strict";
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;

    // Configure SSME media source
    var plugins = new Windows.Media.MediaExtensionManager();

    plugins.registerByteStreamHandler("Microsoft.Media.AdaptiveStreaming.SmoothByteStreamHandler", ".ism", "text/xml");
    plugins.registerByteStreamHandler("Microsoft.Media.AdaptiveStreaming.SmoothByteStreamHandler", ".ism", "application/vnd.ms-sstr+xml");
    plugins.registerByteStreamHandler("Windows.Xbox.Media.SmoothStreamingByteStreamHandler", null, ".m3u8", null);
    plugins.registerSchemeHandler("hls.wrap.HttpLiveProxySchemeHandler", "http-xive:");
    WinJS.UI.Pages.define("/pages/playback/playback.html", {
        // Whether the page is currently in an error state.
        _error: false,
        // We turn off transition animations when navigating to the playback page.
        enterPage: function () {
            // Start a new media playback session for common events
            MyApp.Utilities.Events.startPlaybackSession();

            //Fire rich presence "Watching Media App"
            MyApp.Utilities.RichPresence.setWatchingStatus();

            return WinJS.Promise.wrap(null);
        },
        exitPage: function () {
            //Fire rich presence "Browsing Media App" now that no longer playing media
            MyApp.Utilities.RichPresence.setBrowsingStatus();

            return WinJS.Promise.wrap(null);
        },
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            this._layoutRoot = element;
            this._pagePromises = [];
            this._mediaPlayer = element.querySelector("#mediaPlayer").winControl;
            var video = this._mediaPlayer.mediaElementAdapter.mediaElement;

            // TODO: If your app does not support thumbnails, then you should set the thumbnail mode
            // to false. The MediaPlayer will use a visual representation of the timeline that is
            // better suited for apps without thumbnail images.
            // this._mediaPlayer.isThumbnailEnabled = false;

            // Pre-fetch the related videos that are used by the post roll overlay
            MyApp.Utilities.Playback.getRelatedData(options);

            // TODO: Uncomment this line ONLY if your organization has agreed to share Media Usage with Microsoft
            // this._mediaPlayer.isMediaUsageCollectionAllowed = Windows.Media.MediaLoggingLevel.complete;

            // You want to call setContentMetadata before setting the src on the
            // video tag. There will be more information on this API in a future release.
            this._mediaPlayer.setContentMetadata(options.contentType, options)
                .done(
                    function success() {
                        this._mediaPlayer.mediaElementAdapter.mediaElement = element.querySelector("#video");
                        this._mediaPlayer.mediaElementAdapter.mediaElement.src = options.url;

                        //Enable captions
                        var muxPrefix = "mux://" + encodeURIComponent(options.url) + "|ms-appx%3A%2F%2F%2F";

                        // Video sources for various languages, note that with captions off we do not use mux
                        var captionSources = [
                            { lang: "none", url: options.url },
                            { lang: "en", url: muxPrefix + encodeURIComponent("captionsSampleData/SuperSpeedway.eng.capt.ttm") },
                            { lang: "es", url: muxPrefix + encodeURIComponent("captionsSampleData/SuperSpeedway.es.capt.ttm") }
                        ];

                        //
                        this._mediaPlayer.initializeCaptions(captionSources);
                    }.bind(this),
                    function error() {
                        // The expected behavior is to navigate back, or if there is no back stack, navigate home.
                        if (WinJS.Navigation.canGoBack) {
                            WinJS.Navigation.back();

                            // If we're in the middle of a page transition, then it's possible the request to navigate back
                            // did not succeed. It that is the case, we wait until after the page transition event to navigate back.
                            if (WinJS.Navigation.location === "/pages/playback/playback.html") {
                                var fnOnPageTransitioned = function () {
                                    XboxJS.UI.Pages.removeEventListener("pagetransitioned", fnOnPageTransitioned);
                                    WinJS.Navigation.back();
                                };
                                XboxJS.UI.Pages.addEventListener("pagetransitioned", fnOnPageTransitioned, false);
                            }
                        } else {
                            WinJS.Navigation.navigate(MyApp.Utilities.User.appHomePage);
                        }
                    }.bind(this)
                );

            setImmediate(function afterPageRenderingHasFinished() {
                if (this &&
                    this._mediaPlayer &&
                    this._mediaPlayer.element) {
                    this._mediaPlayer.element.focus();
                }
            });

            //Set focus on play / pause button for snap mode
            this._mediaPlayer.element.querySelector(".win-mediaplayer-playpausebutton").focus();

            MyApp.Utilities.Playback.attachVideoTagEvents(video, this._layoutRoot);

            this._layoutRoot.querySelector("#postroll-replaybutton").addEventListener("invoked", function () {
                clearInterval(this._nextVideoCounter);
                this._mediaPlayer.mediaElementAdapter.isSeekAllowed = true;
                this._mediaPlayer.hideControls();
                this._mediaPlayer.seek(0);
                this._mediaPlayer.play();
                this._mediaPlayer.mediaElementAdapter.mediaElement.focus();
                WinJS.Utilities.addClass(this._layoutRoot.querySelector("#postRollOverlay"), "win-hidden");
            }.bind(this));

            WinJS.Resources.processAll(element);
        },
        unload: function () {
            // TODO: Respond to navigations away from this page.

            // Remove the playback page from the back stack so that there will never be the case of a user going back to a playback page.
            // Let's say the user clicks on an item in the post roll. They don't expect back to start playing the previous video.
            if (WinJS.Navigation.history &&
                WinJS.Navigation.history.backStack &&
                WinJS.Navigation.history.backStack.length > 0
                && WinJS.Navigation.history.backStack[WinJS.Navigation.history.backStack.length - 1].location === "/pages/playback/playback.html") {
                WinJS.Navigation.history.backStack.splice(WinJS.Navigation.history.backStack.length - 1, 1);
            }

            // End the media playback session for common events
            MyApp.Utilities.Events.endPlaybackSession();
        },

        updateLayout: function (element, viewState, lastViewState) {
            // TODO: Respond to changes in viewState.
        }
    });
})();
