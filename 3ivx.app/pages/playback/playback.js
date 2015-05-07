// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

/*global WinJS: true*/

(function () {
    "use strict";
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var _hlsKeyRequestHandler = null;

    // functionality switches
    var useAesCustomKeyRequest = false;
    var useCea608Captions = true;
    var useInfiniteRetry = false;



    WinJS.UI.Pages.define("/pages/playback/playback.html", {
        // Whether the page is currently in an error state.
        _error: false,
        // We turn off transition animations when navigating to the playback page.
        enterPage: function () {
            // Start a new media playback session for common events
            MyApp.Utilities.Events.startPlaybackSession();

            //Fire rich presence "Watching Media App"
            MyApp.Utilities.RichPresence.setWatchingStatus();

            // configure some possible additional functionality directly on the HlsAdapter (not HlsMediaElementAdapter)
            wireHlsAdapter();

            return WinJS.Promise.wrap(null);
        },
        exitPage: function () {
            //Fire rich presence "Browsing Media App" now that no longer playing media
            MyApp.Utilities.RichPresence.setBrowsingStatus();

            unwireHlsAdapter();

            return WinJS.Promise.wrap(null);
        },
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            this._layoutRoot = element;
            this._pagePromises = [];
            this._mediaPlayer = element.querySelector("#mediaPlayer").winControl;
            var video = this._mediaPlayer.mediaElementAdapter.mediaElement;

            console.log("ready");
            // TODO: If your app does not support thumbnails, then you should set the thumbnail mode
            // to false. The MediaPlayer will use a visual representation of the timeline that is
            // better suited for apps without thumbnail images.
            this._mediaPlayer.isThumbnailEnabled = false;

            // Pre-fetch the related videos that are used by the post roll overlay
            MyApp.Utilities.Playback.getRelatedData(options);

            addMoreButton(this._mediaPlayer, element, cycleAudioTracks);

            // load the mediaElementAdaper before setContentMetadata so that it can patch mediaPlayer early
            this._mediaPlayer.mediaElementAdapter = new HlsMedia.HlsMediaElementAdapter(this._mediaPlayer, element.querySelector("#video"), false);

            if (useInfiniteRetry) {
                registerInfiniteRetry(this._mediaPlayer, options);
            }

            // You want to call setContentMetadata before setting the src on the
            // video tag. There will be more information on this API in a future release.
            this._mediaPlayer.setContentMetadata(options.contentType, options)
                .done(
                    function success() {
                  		// this._mediaPlayer.mediaElementAdapter = new HlsMedia.HlsMediaElementAdapter(this._mediaPlayer, element.querySelector("#video"), false);

                        // configure maxbitrate. Should be done before setHlsMedia to avoid race condition
                        setHlsMaxBitrateBasedOnViewState(mediaPlayer);

                        // setHlsMedia will begin media aquisition and playback (at position 0)
                        this._mediaPlayer.mediaElementAdapter.setHlsMedia(options.url, 0);


                        /*
                        // Set up closed captions
                        MyApp.Utilities.Captions.initializeCaptions(element, []);

                        // you can dynamically enable disable captions with the following code
                        var displayCaptions = true; 

                        if (displayCaptions) {
                            MyApp.Utilities.Captions.selectedLanguage = "fr";
                            MyApp.Utilities.Captions.enableSystemCaptions(true); // use "false" to turn off captions
                        } else {
                            MyApp.Utilities.Captions.selectedLanguage = "none";
                            MyApp.Utilities.Captions.enableSystemCaptions(false); // use "false" to turn off captions
                        }
                        */




                        // When using CEA 608/708 captions, set the displayCea608Captions property at any time before or during playback to show/hide captions,
                        // but do not set (even to false) if you are using TTML captions, as the non-existant cea608 captions will override the TTML captions
                        if (useCea608Captions) {
                            if (Windows.Xbox) {
                                if (Windows.Xbox.System.ClosedCaptions.ClosedCaptionProperties.isEnabled)   // system caption setting
                                    this._mediaPlayer.mediaElementAdapter.displayCea608Captions = true;           // you should update the displayCea608Captions property whenever the user toggles the CC button
                            }
                        }
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
            var mediaPlayer = element.querySelector("#mediaPlayer").winControl;

            // when we switch to/from snapped we need to update the maxBitrate
            setHlsMaxBitrateBasedOnViewState(mediaPlayer);

            // possibly flush the stream to force an immediate bitrate switch when going to/from snapped

            // we only have to flush if there is more than one bitrate,
            // zero means there was only one bitrate, and its unknown
            if (mediaPlayer.mediaElementAdapter.chosenBitrate != 0) {
                var viewStates = Windows.UI.ViewManagement.ApplicationViewState;

                // flush when unsnapping to get rid of stale low-bitrate content
                // and only flush when snapping if currently bitrate is greater than the lowestBitrate
                if (lastViewState === viewStates.snapped || (viewState === viewStates.snapped &&
                        mediaPlayer.mediaElementAdapter.chosenBitrate > mediaPlayer.mediaElementAdapter.lowestBitrate)) {

                    flushHlsStream(mediaPlayer);
                }
            }
        }
    });

    function registerInfiniteRetry( mediaPlayer, options )
    {
        mediaPlayer.mediaElementAdapter.mediaElement.addEventListener("error", function handleError(evt) {
            console.log("playback: mediaElement.onerror :" + evt.target.error.code);
            mediaPlayer.mediaElementAdapter.setHlsMedia(null, 0);

            mediaPlayer.mediaElementAdapter.setHlsMedia(options.url, 0);

            mediaPlayer._isBusy = true;

            // There's a race to show/hide the busy indicator, so we set it again after a delay
            WinJS.Promise.timeout(mediaPlayer._timeBeforeShowingBusyVisual).done(function afterEnoughTimeHasPassedToShowALoadingSpinner() {
                mediaPlayer._isBusy = true;
            });
        });
    }

    function cycleAudioTracks() {
        // Put code here that you want to execute when the button is pressed.
        var mediaPlayer = this;

        var audioTrackId = mediaPlayer.mediaElementAdapter.audioTrackId;

        audioTrackId++;
        if (audioTrackId >= mediaPlayer.mediaElementAdapter.audioTrackCount)
            audioTrackId = 0;

        if (mediaPlayer.mediaElementAdapter.audioTrackId != audioTrackId) {
            mediaPlayer.mediaElementAdapter.audioTrackId = audioTrackId;

            console.log("audioTrackId: " + mediaPlayer.mediaElementAdapter.audioTrackId);

            // force a flush
            //seekHls(mediaPlayer, mediaPlayer.mediaElementAdapter.liveTime, false); // flushHlsStream doesn't work well on live streams
            flushHlsStream(mediaPlayer);
        }
    }

    function addMoreButton(mediaPlayer, element, moreHandler) {
        var moreHandlerBind = moreHandler.bind(mediaPlayer);

        var myMoreButton = document.createElement("button");
        var iconAttribute = document.createElement("span");
        WinJS.Utilities.addClass(iconAttribute, "win-mediaplayer-icon win-mediaplayer-moreicon");
        myMoreButton.appendChild(iconAttribute);
        var rewindButton = /*mediaPlayer.*/element.querySelector(".win-mediaplayer-rewindbutton");
        rewindButton.parentNode.insertBefore(myMoreButton, rewindButton);
        // This code makes sure we call the handler method when the button is clicked.
        // This does not handle VUI input.
        myMoreButton.addEventListener("click", moreHandlerBind, false);
    }

    function seekHls(mediaPlayer, seekPosition, frameAccurate) {
        // do not want to seek past liveTime on a live stream
        if (mediaPlayer.mediaElementAdapter.isLive && seekPosition > mediaPlayer.mediaElementAdapter.liveTime)
            seekPosition = mediaPlayer.mediaElementAdapter.liveTime;

        // use frameaccurate seeking for this next seek?
        var oldFrameAccurateSeeking = mediaPlayer.mediaElementAdapter.frameAccurateSeeking;

        mediaPlayer.mediaElementAdapter.frameAccurateSeeking = frameAccurate;
        mediaPlayer.mediaElementAdapter.seek(seekPosition, true); //force seek, need to bypass mediaPlayer.seek to forceSeek

        mediaPlayer.mediaElementAdapter.frameAccurateSeeking = oldFrameAccurateSeeking;
    }

    function flushHlsStream(mediaPlayer) {
        var curPos = mediaPlayer.mediaElementAdapter._mainMediaElement.currentTime;

        // the 2nd slow-seek will be dropped by mediaElement if we're seeking past livetime
        seekHls(mediaPlayer, curPos + 0.5, false);  // force a fast seek forwards a bit
        seekHls(mediaPlayer, curPos, true);         // then do an accurate seek back to where we were
    }

    function setHlsMaxBitrateBasedOnViewState(mediaPlayer) {
        var viewStates = Windows.UI.ViewManagement.ApplicationViewState;
        var newViewState = Windows.UI.ViewManagement.ApplicationView.value;

        var maxBitrate = 0; //unlimited

        if (newViewState === viewStates.snapped)
            maxBitrate = 1;             // use lowest bitrate, could be 1500000 for 1.5mbps

        if (mediaPlayer != null && mediaPlayer.mediaElementAdapter != null) {
            mediaPlayer.mediaElementAdapter.maximumBitrate = maxBitrate;
        }

    }

    function keyRequestHandler(evt) {

        function handleKeyRequest(keyRequest) {

            console.log("Key Request uri " + keyRequest.uri);

            WinJS.xhr({
                url: keyRequest.uri,
                responseType: "arraybuffer"
            }).done(

            function completed(request) {
                var keyRequestSucceeded = false;
                var key = null;

                if (request.status === 200) {
                    var bytes = new Uint8Array(request.response);
                    if (bytes.length == 16) {
                        key = Array.apply([], bytes); // valid key must be a typeless []
                        keyRequestSucceeded = true;
                    }
                }
                keyRequest.returnKey(keyRequestSucceeded, key);
            },

           function error(request) {
               keyRequest.returnKey(false, null);    //must always call returnKey, even in error scenarios
           });
        }


        var keyrequest = evt.target;

        if (keyrequest) {
            handleKeyRequest(keyrequest);
        }
    }

    function wireHlsAdapter() {
        if (HlsBy3ivx.HlsAdapter.current) {
            var adapter = HlsBy3ivx.HlsAdapter.current;

            if (useAesCustomKeyRequest) {
                _hlsKeyRequestHandler = keyRequestHandler;
                adapter.addEventListener("hlskeyrequest", _hlsKeyRequestHandler);
            }
        }
    }

    function unwireHlsAdapter() {
        if (HlsBy3ivx.HlsAdapter.current) {
            var adapter = HlsBy3ivx.HlsAdapter.current;

            if (_hlsKeyRequestHandler) {
                adapter.removeEventListener("hlskeyrequest", _hlsKeyRequestHandler);
                _hlsKeyRequestHandler = null;
            }
        }
    };
})();
