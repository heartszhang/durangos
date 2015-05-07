(function hlsMediaInit() {
    "use strict";

    var HlsMediaElementAdapter = WinJS.Class.derive(XboxJS.UI.MediaElementAdapter,
        function constructor(mediaPlayer, mediaElement, allowLiveStreamSeeking) {

            this._mainMediaElement = mediaElement;

            this.baseMediaElementAdapterConstructor(mediaPlayer, mediaElement);

            // methods we override and call the base versions
            this._baseDispose = null;

            // event handlers
            this._mediaElement_onPropertyChange = null;
            this._mediaElement_onCanPlay = null;
            this._mediaElement_onSeeked = null;
            this._mediaElement_onEnded = null;
            this._mediaPlayer_onMarkerReached = null;
            this._mediaElement_onError = null;
            this._mediaElement_onPlaying = null;
            this._mediaElement_onStalled = null;
            this._mediaElement_onEmptied = null;
            this._mediaElement_onWaiting = null;
            this._mediaElement_onLoadStart = null;
            this._mediaElement_onProgress = null;
            this._mediaElement_onRateChange = null;
            this._mediaElement_onTimeUpdate = null;

            this._onHlsStreamCreated = null;

            // private member variables
            this._adapter = HlsBy3ivx.HlsAdapter.current;
            this._stream = null;
            this._isLive = false;
            this._isSlidingWindow = false;
            this._livePoint = 0;
            this._duration = 0;
            this._forceStartTimeReached = false; // forceStartTimeReached was needed before mediaPlayer added the support internally (QFE2?)

            // cea608 closed caption support
            this._mediaEngineConfig = null;
            this._captionsStyled = false;
            this._displayCea608Captions = -1;
            this._playbackStarted = false;

            this._chosenBitrate = 0;
            this._perceivedBitrate = 0;
            this._bufferedChunkCount = 0;
            this._maximumBitrate = 0;
            this._minimumBitrate = 0;
            this._lowestBitrate = 0;
            this._highestBitrate = 0;
            this._frameAccurateSeeking = false;

            //use the default audio rendition as specified in the manifest
            this._audioTrackId = -1;
            //the total number of audio renditions
            this._audioTrackCount = 0;

            this._liveDvrEnabled = false;
            if (allowLiveStreamSeeking)
                this._liveDvrEnabled = true;

            if (!this._adapter)
                throw new WinJS.ErrorFromName("HlsMedia.adapterNotRegistered", "HLS Adapter not registered");

            // live streams will start at livepoint... instantly
            this._adapter.liveStreamsStartAtLivePoint = true;
            //this._adapter.desiredLiveBuffer = 0;       // minimal buffer

            //Register metadata pids and tags
            //this._adapter.metadataPids.append(1191);
            //this._adapter.metadataTags.append("PRIV");
            //this._adapter.metadataTags.append("TXXX");

            this._patchMediaPlayer(this._mediaPlayer);

            //this._adapter.forceMainProfile = true;

            /*
            CodecBlacklist - disable streams with a certain profile (only avc is currently supported)

            May be one of the following two forms:

            NOTE: The first form is the recommended and the second form will be removed in future releases.

            1)  The first element is the sample description code, the second element
                is the hexadecimal representation of the following three bytes in the (subset) sequence
                parameter set Network Abstraction Layer (NAL) unit:

                (1)  profile_idc.

                (2)  constraint flags.

                (3)  level_idc.

                Example: avc1.42001e

            2)  The first element is the sample description code, the second element is the profile_idc and
                the third element is the level_idc

                Example: avc1.66.30

            Multiple codecs can be specified separated by a comma.

            Example: avc1.42001e,avc1.66.30,avc1.42001f
            */
            //this._adapter.codecBlacklist = "avc1.42001e,avc1.66.30,avc1.42001f";

            //uncomment to disable adaptive bitrate switching
            //     this._adapter.adaptiveBitrateSwitching = false;

            /*
                _adapter.audio_track_id allows the adapter to start on the specified audio rendition
                -1 will use the default audio rendition as specified in the manifest
                If an audio rendition is specified which is out of range then the default audio rendition will be used
                
                uncomment to set the audio track id that will be used at start up
            */
            //this._adapter.audioTrackId = -1;

            // on Windows, mediaPlayer's timeSeparator is not correctly initialised (still an issue on Oct9)
            if (!Windows.Xbox) {
                // the below line is what xbox.js tries to do... but fails
                //  var string = WinJS.Resources._getWinJSString("tv/timeSeparator").value;
                this._mediaPlayer._timeSeparator = ":";
            }

            // it takes a loooong time to ffwd through 6 hrs...
            //      this._mediaPlayer._PLAYBACKRATE_FAST_FORWARD_MAX_RATE = 1024;
            //      this._mediaPlayer._PLAYBACKRATE_REWIND_MAX_RATE = -1024;
            //      this._mediaPlayer._CONTROLS_AUTO_HIDE_DURATION = 10 * 60 * 60 * 1000; //10 hours. press B to hide

            var that = this;

            // need to reset stream when src changes
            this._mediaElement_onPropertyChange = function (evt) {
                var propertyName = evt.propertyName;
                if (propertyName === "src") {
                    // src has changed, so clear (and unwire) the stream until a new one is created
                    that.stream = null;
                };

                //   console.log("hlsmedia: onpropertychange: " + propertyName);
            };
            this._mainMediaElement.attachEvent("onpropertychange", this._mediaElement_onPropertyChange); // addEventListener doesn't work here.

            // need to force mediaPlayer to play live streams which don't start at zero time
            this._mediaElement_onCanPlay = function (evt) {
                if (that._forceStartTimeReached && that._stream) {
                    //    that._mediaPlayer._handleStartTimeReached();  // QFE4: seems to fix this issue, but is generating an unnecessary seek
                    //that._mediaPlayer.pause();  // AugADK: handleStartTimeReached() no longer has an implicit pause
                    //that._mediaPlayer.play();
                    that._forceStartTimeReached = false;
                }

                //   console.log("hlsmedia: mediaElement.oncanplay");

            };
            this._mainMediaElement.addEventListener("canplay", this._mediaElement_onCanPlay, true);

            // need to force mediaplayer to play after seek [no longer need to do this]
            this._mediaElement_onSeeked = function (evt) {
                // var time = that._mainMediaElement.currentTime;
                //       that._mediaPlayer._updateTimelineVisuals();
                //       that._mediaPlayer.play();

                /* 
                    mediaPlayer sets endTimeReached *after* asking us to do a seek to the end when the user fastforwards to the end
                    but, if endtime is reached then we can never seek to the end again. The problem is that in a live stream the end
                    time might be increasing, which means you can seek to it again even once youre at it.

                    by resetting this it will reset mediaPlayer to its before-seek state
                */
                if (that.stream && that.isLive) {
                    that._mediaPlayer._endTimeReached = false;
                }
            };
            this._mainMediaElement.addEventListener("seeked", this._mediaElement_onSeeked);


            // need to updateCaptions when playing state changes
            this._mediaElement_onPlaying = function (evt) {
                that._playbackStarted = true;

                that._updateCaptions();
            };
            this._mainMediaElement.addEventListener("playing", this._mediaElement_onPlaying);

            this._mediaElement_onError = function (evt) {
                console.log("hlsmedia: mediaElement.onerror :" + evt.target.error.code + " (" + that.formatHResult(evt.target.error.msExtendedCode) + ")");
            };
            this._mainMediaElement.addEventListener("error", this._mediaElement_onError);

            //this._mediaElement_onStalled = function (evt) {
            //    console.log("hlsmedia: mediaElement.onstalled");
            //};
            //this._mainMediaElement.addEventListener("stalled", this._mediaElement_onStalled, true);

            //this._mediaElement_onEmptied = function (evt) {
            //    console.log("hlsmedia: mediaElement.onemptied");
            //};
            //this._mainMediaElement.addEventListener("emptied", this._mediaElement_onEmptied, true);

            //this._mediaElement_onWaiting = function (evt) {
            //    console.log("hlsmedia: mediaElement.onwaiting");
            //};
            //this._mainMediaElement.addEventListener("waiting", this._mediaElement_onWaiting, true);

            //this._mediaElement_onLoadStart = function (evt) {
            //    console.log("hlsmedia: mediaElement.onloadstart");
            //};
            //this._mainMediaElement.addEventListener("loadstart", this._mediaElement_onLoadStart, true);

            //this._mediaElement_onProgress = function (evt) {
            //    console.log("hlsmedia: mediaElement.onProgress");
            //};
            //this._mainMediaElement.addEventListener("progress", this._mediaElement_onProgress, true);

            //this._mediaElement_onRateChange = function (evt) {
            //    console.log("hlsmedia: mediaElement.onRateChange : " + evt.target.playbackRate);
            //};
            //this._mainMediaElement.addEventListener("ratechange", this._mediaElement_onRateChange, true);


            this._lastTime = 0;
            this._buffering = false;
            this._mediaElement_onTimeUpdate = function (evt) {

                /* implement buffering detection */

                if (evt.target.playbackRate != 0 && that._lastTime == evt.target.currentTime) {
                    if (!that._buffering) {
                        that._buffering = true;
                        //    console.log("buffering");

                        WinJS.Promise.timeout(that._mediaPlayer._timeBeforeShowingBusyVisual).done(function afterEnoughTimeHasPassedToShowALoadingSpinner() {
                            if (that._buffering && that._mediaPlayer) {
                                that._mediaPlayer._isBusy = true;
                            }
                        });
                    }
                } else {
                    if (that._buffering) {
                        //   console.log("finished buffering")
                        if (that._mediaPlayer)
                            that._mediaPlayer._isBusy = false;
                        that._buffering = false;
                    }
                }
                that._lastTime = evt.target.currentTime;

                // console.log("hlsmedia: mediaElement.onTimeUpdate" + evt.target.currentTime);

            };
            this._mainMediaElement.addEventListener("timeupdate", this._mediaElement_onTimeUpdate, true);




            /* 
                MediaPlayer stops playback when EndTime is reached (approximately), which prevents the MediaElement
                "ended" event from firing.

                QFE2 Update: MediaPlayer now attempts to handle this issue by forcing a seek to the end,
                    Unfortunately, its impossible to seek to the end of an HLS stream, so the HLS Adapter seeks
                    to the first point it can closest to the end, which triggers MediaPlayer to do another seek to
                    the end. In order to resolve this, we now drop the seek to the end, which lets everything work
                    correctly, without extra seeks and allows the video element to send its ended event, as designed

                Oct21: MediaPlayer now attempts to prevent the extra seeks, but still does a reseek to fake the ended
                        we still resolve this situation by dropping the seek.

                Also, when the media actually does end, mediaPlayer doesn't enters a "playing but paused state"
                so we force it to paused. The user can then restart playback by clicking play once, not twice.
            */

            // need to catch mediaElement.ended event so we can change the play state
            this._mediaElement_onEnded = function (evt) {
                // if we're in media.loop mode mediaPlayer will still issue a play() command
                //     that._mediaPlayer.pause(); // mediaPlayer gets confused when the mediaElement ends. This de-confuses it.  (still an issue with Oct21)      

                that._captionsStyled = false;
                that._playbackStarted = false;
                that._mediaEngineConfig = null;

                // good to know if the ended event is being sent when debugging
                console.log("hlsmedia: mediaElement.onended: " + evt.target.src);

            };
            this._mainMediaElement.addEventListener("ended", this._mediaElement_onEnded);

            /*
                aquire hls stream
                    src changes, then <video> opens the http-live url, then the hlsStreamCreated event fires
                    to provide the hlsStream. Its possible that the stream that was created did not belong 
                    to our mediaelement, so we check the src == uri
            */
            this._onHlsStreamCreated = function (evt) {
                var stream = evt.detail[0];
                var uri;
                try {
                    /* 
                        stream.uri can cause a runtime exception if the mediaSource has been shutdown. Which
                        indicates nicely that this is a stale hlsStream and should not be adopted
                    */
                    uri = stream.uri;
                } catch (e) {
                    // uri is probably unavailable, most likely because this is a stale stream
                }
                // only keep the stream, if it belongs to our mediaElement
                if (uri && uri === that._mainMediaElement.src) {
                    that.stream = stream;
                }
            };
            this._adapter.addEventListener("hlsstreamcreated", this._onHlsStreamCreated);

            // override seek
            //     this._baseSeek = this.seek;
            this.seek = function (seekTime, forceSeek) {

                var dropSeek = false; // if true, we'll drop the seek

                // QFE4: MediaPlayer._onTimeUpdate() has a race condition where it reads currentTime from the mediaElement 
                //       before it is ready thus returning -1e-7, and then once it is ready, uses a stale value, which 
                //       then causes an erroneous seek to _startTime+_SEEK_OFFSET to be issued.  
                //
                //       We can partially work-around this issue by checking for the negative currentTime, but because 
                //       the currentTime might be valid by the time we check, we also check for the _starttime+_SEEK_OFFSET 
                //       seek and then drop that.
                //       Its unlikely that someone will really want to seek to _starttime+0.1
                //       
                //       We need to do both checks because _startTime might be invalid if currentTime is invalid.
                //
                // Oct9: I think this issue might have been fixed
                // Oct13: MediaPlayer now checks for NaN and mediaElement being in a good state before issuing the seek (which is good)
                //
                // 
                if (this._mediaPlayer._targetPlaybackRate == 1 || this._mediaPlayer._targetPlaybackRate == 0) {// if we're not ffwding, QFE4: _targetPlaybackRate is not set to 1 until after a seek is completed
                    if (this._mainMediaElement && this._mainMediaElement.currentTime < 0)
                        dropSeek = true;
                    else if (seekTime == (this._mediaPlayer._startTime + this._mediaPlayer._SEEK_OFFSET))
                        dropSeek = true;
                }

                //dropSeek = false;

                // QFE2: MediaPlayer does a pointless seek to the endTime to attempt to work-around the "ended" not 
                //       being sent bug so we drop the seek, which means the "ended" message will be sent!
                // QFE4: On sliding-window live streams, which have not yet been detected as sliding-window, _endTime 
                //       is the length of the window, which means currentTime, can be > endTime, causing mediaPlayer 
                //       try to erroneously seek to the endTime, until the stream is detected as sliding-window
                // QFE4: Its also possible for _endTime to not be set yet, which means the seekTime will be zero
                // Oct9: Issue has changed, mediaPlayer is now avoiding extra seeks, but still issues one seek
                if (this._mediaPlayer._targetPlaybackRate == 1 || this._mediaPlayer._targetPlaybackRate == 0) {// if we're not ffwding, QFE4: _targetPlaybackRate is not set to 1 until after a seek is completed
                    if (seekTime == (this._mediaPlayer._endTime - this._mediaPlayer._SEEK_OFFSET)) {
                        //dropSeek = true;
                    } else if (seekTime == 0 && this._mediaPlayer._endTime == 0) {
                        dropSeek = true;
                    }
                }

                // Oct09: we reached the end, and MediaPlayer issued a false seek which would cause "ended" to be dropped
                // Oct21: MediaPlayer(on console) now uses _wasTimeClampedToEndTime to prevent "ended" being lost, but we still drop the seek.
                if (!this._mediaPlayer._isInFastForwardOrRewindMode && this._mediaPlayer._endTimeReached) {
                    if (this.isLive) {
                        // if( seekTime > 0 )
                        //    seekTime = this.liveTime; // if the user fast-fwded to the end, then jump to live
                        this._mediaPlayer._endTimeReached = false;
                    } else
                        dropSeek = true;
                }

                // uncomment this to disable seek dropping
                //  dropSeek = false;


                // call the original seek function
                if (!dropSeek && this._mainMediaElement) {

                    // we set frameAccurateSeeking just-in-time for the next seek
                    if (this.stream) {
                        this.stream.frameAccurateSeeking = this._frameAccurateSeeking;

                        if (this.isLive && seekTime > this.liveTime)
                            seekTime = liveTime; // clamp to livepoint
                    }

                    if (this._isSeekAllowed || forceSeek) {
                        this._mainMediaElement.currentTime = seekTime;
                    }

                } else {
                    // fake the seek so that MediaPlayer stays in-sync
                    // no longer a good idea to fake seeks. MediaPlayer seems to be able to handle dropped seeks.
                    //   this._mediaPlayer._onSeeked();
                }
            }


            // cache the original dispose implementation so we can call it from our override
            this._baseDispose = this.dispose;
            // then replace orginal dispose
            this.dispose = function () {
                if (this._disposed) // set by baseDispose
                    return;

                this.stream = null;

                this._mediaEngineConfig = null;


                // remove events
                if (this._mediaElement_onPropertyChange) {
                    this._mainMediaElement.detachEvent("onpropertychange", this._mediaElement_onPropertyChange); //event listener doesn't work
                    this._mediaElement_onPropertyChange = null;
                }

                if (this._mediaElement_onCanPlay) {
                    this._mainMediaElement.removeEventListener("canplay", this._mediaElement_onCanPlay);
                    this._mediaElement_onCanPlay = null;
                }

                if (this._mediaElement_onSeeked) {
                    this._mainMediaElement.removeEventListener("seeked", this._mediaElement_onSeeked);
                    this._mediaElement_onSeeked = null;
                }

                if (this._mediaElement_onPlaying) {
                    this._mainMediaElement.removeEventListener("playing", this._mediaElement_onPlaying);
                    this._mediaElement_onPlaying = null;
                }

                if (this._mediaElement_onError) {
                    this._mainMediaElement.removeEventListener("error", this._mediaElement_onError);
                    this._mediaElement_onError = null;
                }

                if (this._mediaElement_onStalled) {
                    this._mainMediaElement.removeEventListener("stalled", this._mediaElement_onStalled);
                    this._mediaElement_onStalled = null;
                }

                if (this._mediaElement_onEmptied) {
                    this._mainMediaElement.removeEventListener("emptied", this._mediaElement_onEmptied);
                    this._mediaElement_onEmptied = null;
                }

                if (this._mediaElement_onWaiting) {
                    this._mainMediaElement.removeEventListener("waiting", this._mediaElement_onWaiting);
                    this._mediaElement_onWaiting = null;
                }

                if (this._mediaElement_onLoadStart) {
                    this._mainMediaElement.removeEventListener("loadstart", this._mediaElement_onLoadStart);
                    this._mediaElement_onLoadStart = null;
                }

                if (this._mediaElement_onProgress) {
                    this._mainMediaElement.removeEventListener("progress", this._mediaElement_onProgress);
                    this._mediaElement_onProgress = null;
                }

                if (this._mediaElement_onRateChange) {
                    this._mainMediaElement.removeEventListener("ratechange", this._mediaElement_onRateChange);
                    this._mediaElement_onRateChange = null;
                }

                if (this._mediaElement_onTimeUpdate) {
                    this._mainMediaElement.removeEventListener("timeupdate", this._mediaElement_onTimeUpdate);
                    this._mediaElement_onTimeUpdate = null;
                }

                if (this._mediaElement_onEnded) {
                    this._mainMediaElement.removeEventListener("ended", this._mediaElement_onEnded);
                    this._mediaElement_onEnded = null;
                }

                if (this._mediaPlayer_onMarkerReached) {
                    this._mediaPlayer.removeEventListener("markerreached", this._mediaPlayer_onMarkerReached);
                    this._mediaPlayer_onMarkerReached = null;
                }

                if (this._onHlsStreamCreated) {
                    this._adapter.removeEventListener("hlsstreamcreated", this._onHlsStreamCreated);
                    this._onHlsStreamCreated = null;
                }

                this._adapter = null

                this._bufferedChunkCount = null;
                this._chosenBitrate = null;
                this._displayCea608Captions = null;
                this._duration = null;
                this._livePoint = null;
                this._maximumBitrate = null;
                this._minimumBitrate = null;
                this._perceivedBitrate = null;

                // resolve a null reference bug in mediaPlayer.addEventListener()
                // QFE4: partially resolved, still an issue on live streams with NUI up. Ie "Xbox Go Back" while playing a live stream
                // Oct21: still present
                if (!this._mediaPlayer._mediaEventSubscriptions)
                    this._mediaPlayer._mediaEventSubscriptions = [];

                this._mainMediaElement = null;

                // call the original dispose
                this._baseDispose();
            }

            // end constructor
        },
        {
            //PUBLIC PROPERTIES
            stream: {
                get: function () {
                    return this._stream;
                },
                set: function (stream) {
                    if (this._stream)
                        this._unwireStream();

                    this._stream = stream;

                    if (this._stream) {
                        this._wireStream();
                        console.log("hlsmedia: stream = " + this._stream.uri);

                    }
                }
            },
            isLive: {
                get: function () {
                    if (this.stream) {
                        if (this._liveDvrEnabled)
                            return this._isSlidingWindow; // isLive means unseekable "live stream" to mediaPlayer
                        else
                            return this._isLive;

                    } else {
                        /*
                            no valid stream (yet), calculate based on mediaElement state
                            which will prevent an infinity issue in mediaPlayer which
                            assumes it can configure IsLive on this adapter.

                            The mediaElement will return infinity before the stream finishes
                            loading.
                        */
                        return !isFinite(this._mainMediaElement.duration);
                    }
                },
                set: function () {
                }
            },
            isLiveEvent: {
                get: function () {
                    return this._isLive && !this._isSlidingWindow;
                },
                set: function () {
                }
            },
            isSeekable: {
                get: function () {
                    if (!this._isLive)
                        return true;
                    else {
                        if (this._liveDvrEnabled)
                            return this._livePoint > 0;
                        else
                            return false;
                    }

                },
                set: function () {
                }
            },
            isSlidingWindow: {
                get: function () {
                    return this._isSlidingWindow;
                },
                set: function () {
                }
            },
            duration: {
                get: function () {
                    if (this._isSlidingWindow)
                        return Number.POSITIVE_INFINITY;    //infinite when sliding window, note, there was a bug in MediaPlayer which seems to be fixed in Oct21 on console (not Win8)
                    else
                        return this._duration / 1000; // duration constantly updates for non-slidingwindow, or doesn't for vod.
                },
                set: function () {
                }
            },
            liveTime: {
                get: function () {
                    if (this._isLive)
                        return this._livePoint / 1000; // ms -> seconds
                    else
                        return 0;
                },
                set: function () {
                }
            },
            chosenBitrate: {
                get: function () {
                    return this._chosenBitrate;
                },
                set: function () {
                }
            },
            perceivedBitrate: {
                get: function () {
                    return this._perceivedBitrate;
                },
                set: function () {
                }
            },
            lowestBitrate: {
                get: function () {
                    return this._lowestBitrate;
                },
                set: function () {
                }
            },
            highestBitrate: {
                get: function () {
                    return this._highestBitrate;
                },
                set: function () {
                }
            },
            bufferedChunkCount: {
                get: function () {
                    return this._bufferedChunkCount;
                },
                set: function () {
                }
            },
            maximumBitrate: {
                get: function () {
                    return this._maximumBitrate;
                },
                set: function (value) {
                    this._maximumBitrate = value;
                    if (this._stream) {
                        this._stream.maximumBitrate = this._maximumBitrate;
                    }
              }
            },
            minimumBitrate: {
              get: function () {
                return this._minimumBitrate;
              },
              set: function (value) {
                this._minimumBitrate = value;
                if (this._stream) {
                  this._stream.minimumBitrate = this._minimumBitrate;
                }
              }
            },
            frameAccurateSeeking: {
                get: function () {
                    return this._frameAccurateSeeking;
                },
                set: function (value) {
                    this._frameAccurateSeeking = value;
                }
            },
            audioTrackId: {
                get: function () {
                    return this.stream.audioTrackId;
                },
                set: function (value) {
                    this._audioTrackId = value;
                    if (this.stream) {
                        this.stream.audioTrackId = this._audioTrackId;
                    }
                }
            },
            audioTrackCount: {
                get: function () {
                    if (this.stream) {
                        return this.stream.audioTrackCount;
                    } else {
                        return this._audioTrackCount;
                    }
                },
                set: function (value) {
                }
            },
            displayCea608Captions: {
                get: function () {
                    return this._displayCea608Captions == 1;    // -1 default, 0 false, 1 true
                },
                set: function (value) {
                    if (value) {
                        this._displayCea608Captions = 1;
                    } else {
                        this._displayCea608Captions = 0;
                    }

                    this._updateCaptions();
                }
            },
            mediaEngineConfig: {
                get: function () {
                    if (!this._mediaEngineConfig) {
                        if (this._mainMediaElement) {
                            if (Windows.Xbox) {
                                this._mediaEngineConfig = Windows.Media.MediaEngine.GMediaEngineConfig();
                                this._mediaEngineConfig.connectToMediaEngineByID(this._mainMediaElement.msMediaObjectIndex);
                            }
                        }
                    }
                    return this._mediaEngineConfig;
                },
                set: function () {
                }
            },


            // PUBLIC METHODS
            // startupPosition in seconds
            setHlsMedia: function (uri, startupPosition) {

                if (!startupPosition)
                    startupPosition = 0;

                this._adapter.startupPosition = startupPosition * 1000; // millis
                this._adapter.maximumBitrate = this._maximumBitrate;
                this._adapter.frameAccurateSeeking = this._frameAccurateSeeking;

                this._mainMediaElement.src = uri;
            },

            // reformats a signed js hresult ie -2147483648 to unsigned hex, ie "0x800A01AD", which is the more usual display form.
            formatHResult: function (hResult) {
                var u = 0xFFFFFFFF + hResult + 1;
                var hex = "0x" + u.toString(16).toUpperCase();
                return hex;
            },

            // PRIVATE METHODS
            _handleMetadata: function (metadata) {
                function parsePrivateMetadata(media_timestamp, data) {
                    var separator;
                    var owner_identifier = "";

                    for (separator = 0; separator < data.size ; separator++) {
                        if (data[separator] == 0)
                            break;

                        owner_identifier += String.fromCharCode(data[separator]);
                    }

                    var binary_data = data.slice(separator + 1);

                    //   console.log("owner_identifier:  " + owner_identifier + " binary_data: " + binary_data.toString() + " @ " + media_timestamp);

                    switch (owner_identifier) {
                        case "com.cisco.streaming.Timecode.0":
                            console.log("cisco timecode found! @ " + media_timestamp);   // media_timestamp (ms) is relative to the mediaplayer timeline, so can be used to schedule markers etc
                            break;

                        default:
                            break;
                    }
                }

                function parseUserDefinedText(media_timestamp, data) {
                    var description = "";
                    var value = "";
                    var i = 0;


                    while (i < metadata.data.size) {
                        description += String.fromCharCode(metadata.data[i]);

                        if (data[i] == 0)
                            break;

                        i++;
                    }

                    i++;

                    while (i < metadata.data.size) {
                        value += String.fromCharCode(metadata.data[i]);

                        if (data[i] == 0)
                            break;

                        i++;
                    }

                    console.log("User Defined Text Description = " + description);
                    console.log("User Defined Text value = " + value);
                }

                console.log("hlsmedia: timedMetadataReceived : format " + metadata.format + ", tag - " + metadata.tag + ", tag type - " + metadata.type + ", pid - " + metadata.pid + ", time - " + metadata.time);

                if (metadata.format == "id3 ") {
                    switch (metadata.tag) {
                        case "PRIV":
                            parsePrivateMetadata(metadata.time, metadata.data);    // Time tells you when this PRIV data is relative to the media timeline
                            break;
                        case "TXXX":
                            parseUserDefinedText(metadata.time, metadata.data);
                            break;
                            /* handle other ID3 frames here */

                        default:
                            break;
                    }
                }
            },

            _wireStream: function () {
                var that = this;

                //TimedMetadata
                this._timedMetadataReceivedHandler = function (evt) {

                    var metadata = evt.detail[0];

                    if (metadata) {
                        that._handleMetadata(metadata);
                    }
                }
                //this._stream.addEventListener("timedmetadatareceived", this._timedMetadataReceivedHandler);

                //IsLive
                this._isLiveChangedHandler = function (evt) {
                  if (that._stream) {
                    that._isLive = that._stream.isLive;
                  }
                }
                this._stream.addEventListener("islivechanged", this._isLiveChangedHandler);
                this._isLiveChangedHandler(this._stream);

                // for live streams, when we will start at livePoint, we need to force mediaPlayer to
                // start playback because it is looking for currentTime === 0
                // [hasn't actually been needed for a while, _forceStartTimeReached now has no effect]
                if (this._isLive && this._adapter.liveStreamsStartAtLivePoint)
                    this._forceStartTimeReached = true;

                //ChosenBitrate
                this._chosenBitrateChangedHandler = function (evt) {
                  if (that._stream) {
                    that._chosenBitrate = that._stream.chosenBitrate;
                  }
                }
                this._stream.addEventListener("chosenbitratechanged", this._chosenBitrateChangedHandler);
                this._chosenBitrateChangedHandler(this._stream);

                //perceivedBitrate
                this._perceivedBitrateChangedHandler = function (evt) {
                  if (that._stream) {
                    that._perceivedBitrate = that._stream.perceivedBitrate;
                  }
                }
                this._stream.addEventListener("perceivedbitratechanged", this._perceivedBitrateChangedHandler);
                this._perceivedBitrateChangedHandler(this._stream);

                //audioTrackCountChanged
                //Until this event fires the number of audio renditions is unknown and is set to 0.
                this._audioTrackCountChangedHandler = function (evt) {
                  if (that._stream) {
                    that.audioTrackCount = that._stream.audioTrackCount;
                  }
                    //change to the second (audioTrackId starts from 0) audio rendition once the track count is known (for testing only)
                    //if (that.audioTrackCount > 0) {
                    //    that.audioTrackId = 1;
                    //}
                }
                this._stream.addEventListener("audiotrackcountchanged", this._audioTrackCountChangedHandler);
                this._audioTrackCountChangedHandler(this._stream);

                //audioTrackIdChanged
                //This event will fire when the stream decides to change to the audio track id from what was specified
                //this will occur if you specify an invalid audio track id or if the adpapter decides to change bitrate
                //and the audio track id does not exist for that bitrate.
                this._audioTrackIdChangedHandler = function (evt) {
                  if (that._stream) {
                    that.audioTrackId = that._stream.audioTrackId;
                  }
                }
                this._stream.addEventListener("audiotrackidchanged", this._audioTrackIdChangedHandler);
                this._audioTrackIdChangedHandler(this._stream);

                //bufferedChunkCount
                this._bufferedChunkCountChangedHandler = function (evt) {
                  if (that._stream) {
                    that._bufferedChunkCount = that._stream.bufferedChunkCount;
                  }
                }
                this._stream.addEventListener("bufferedchunkcountchanged", this._bufferedChunkCountChangedHandler);
                this._bufferedChunkCountChangedHandler(this._stream);

                //Duration
                this._durationChangedHandler = function (evt) {
                  if (that._stream) {
                    that._duration = that._stream.duration;
                  }
                  if (that._mediaPlayer) {

                        // Oct9: fixes infinity bug in MediaPlayer, but changes endTime behaviour [update: bug is still present but rare]
                        // Oct21: adds more finity checks to prevent this issue, and changes endTime behaviour again
                        //if (that.duration == Number.POSITIVE_INFINITY)
                        //    that._mediaPlayer.endTime = 60 * 60 * 24; // QFE4: 24 hrs because MediaPlayer can't handle infinite endTime
                        //else
                        //    that._mediaPlayer.endTime = that.duration;

                        // Oct9: we still need to update mediaPlayer's endTime, but if we go through the front-door, then lots of things
                        //       will break because of MediaPlayer's programatic EndTime support, but most importantly, mediaPlayer will
                        //       start using mediaElement.duration as true endTime, which is not necessarily the right value. We can avoid 
                        //       all these problems by changing endTime/totalTime underneath mediaPlayer, and thus it will use those values.
                        //       as a side-effect, this improves the seeking end/start behaviour
                        if (!that._mediaPlayer._wasEndTimeSetProgrammatically) {
                            // this is the relevant parts of mediaPlayer.endTime:set
                            that._mediaPlayer._endTime = that.duration;
                            that._mediaPlayer._totalTime = that._mediaPlayer._endTime - that._mediaPlayer._startTime;

                          //  that._mediaPlayer._updateTimelineVisuals();
                          //  that._mediaPlayer._updateMediaState(false);
                        }
                    }
                }
                this._stream.addEventListener("durationchanged", this._durationChangedHandler);
                this._durationChangedHandler(this._stream);

                //IsSlidingWindow
                this._isSlidingWindowChangedHandler = function (evt) {
                  if (that._stream) {
                    that._isSlidingWindow = that._stream.isSlidingWindow;
                  }
                  that._durationChangedHandler(evt); // update duration in case slidingWindow went true

                  if (that._isSlidingWindow) {
                    that._mediaPlayer._totalTimeIndicator.textContent = ""; //need to clear the time, because mediaPlayer won't once we go live.
                  }
                }
                this._stream.addEventListener("isslidingwindowchanged", this._isSlidingWindowChangedHandler);
                this._isSlidingWindowChangedHandler(this._stream);

                //LivePoint
                this._livePointChangedHandler = function (evt) {
                  if (that._stream) {
                    that._livePoint = that._stream.livePoint;
                  }
                  that._mediaPlayer._liveTime = that.liveTime; //  mediaPlayer._seekInternal doesn't use MEA.liveTime, when it should
                }
                this._stream.addEventListener("livepointchanged", this._livePointChangedHandler);
                this._livePointChangedHandler(this._stream);

                this._lowestBitrate = this._stream.lowestBitrate;
                this._highestBitrate = this._stream.highestBitrate;
                // set maximumBitrate to user value
                this._stream.maximumBitrate = this._maximumBitrate;
                this._stream.minimumBitrate = this._minimumBitrate;

            },
            _unwireStream: function () {

                if (this._timedMetadataReceivedHandler) {
                    this._stream.removeEventListener("timedmetadatareceived", this._timedMetadataReceivedHandler);
                    this._timedMetadataReceivedHandler = null;
                }

                if (this._isLiveChangedHandler) {
                    this._stream.removeEventListener("islivechanged", this._isLiveChangedHandler);
                    this._isLiveChangedHandler = null;
                }
                this._isLive = false;

                if (this._chosenBitrateChangedHandler) {
                    this._stream.removeEventListener("chosenbitratechanged", this._chosenBitrateChangedHandler);
                    this._chosenBitrateChangedHandler = null;
                }
                this._chosenBitrate = 0;

                if (this._perceivedBitrateChangedHandler) {
                    this._stream.removeEventListener("perceivedbitratechanged", this._perceivedBitrateChangedHandler);
                    this._perceivedBitrateChangedHandler = null;
                }
                this._perceivedBitrate = 0;

                if (this._audioTrackCountChangedHandler) {
                    this._stream.removeEventListener("audiotrackcountchanged", this._audioTrackCountChangedHandler);
                    this._audioTrackCountChangedHandler = null;
                }
                this._audioTrackCount = 0;

                if (this._audioTrackIdChangedHandler) {
                    this._stream.removeEventListener("audiotrackidchanged", this._audioTrackIdChangedHandler);
                    this._audioTrackIdChangedHandler = null;
                }
                this._audioTrackId = 0;

                if (this._bufferedChunkCountChangedHandler) {
                    this._stream.removeEventListener("bufferedchunkcountchanged", this._bufferedChunkCountChangedHandler);
                    this._bufferedChunkCountChangedHandler = null;
                }
                this._bufferedChunkCount = 0;

                if (this._isSlidingWindowChangedHandler) {
                    this._stream.removeEventListener("isslidingwindowchanged", this._isSlidingWindowChangedHandler);
                    this._isSlidingWindowChangedHandler = null;
                }
                this._isSlidingWindow = false;

                if (this._durationChangedHandler) {
                    this._stream.removeEventListener("durationchanged", this._durationChangedHandler);
                    this._durationChangedHandler = null;
                }
                this._duration = 0;

                if (this._livePointChangedHandler) {
                    this._stream.removeEventListener("livepointchanged", this._livePointChangedHandler);
                    this._livePointChangedHandler = null;
                }
                this._livePoint = 0;

                this._lowestBitrate = 0;
                this._highestBitrate = 0;
            },
            _styleCaptions: function (mfconfig) {
                // styles the mediaEngineConfig based on Xbox prefs. CONSOLE ONLY.

                // Helper function to convert between r, g, b, a, and an unsigned in that represents RGBA data
                function rgbToHex(r, g, b, a) {
                    return ((r << 24) + (g << 16) + (b << 8) + a);
                }

                // Just re-maps the enum, the settigns API uses a different enum that GMediaEngineConfig
                function fontEffectsEnumToDifferentFontEffectsEnum(enumValue) {
                    switch (enumValue) {
                        // Default
                        case 0:
                            return null;
                            // None
                        case 1:
                            return 0;
                            // Raised
                        case 2:
                            return 3;
                            // Depressed
                        case 3:
                            return 2;
                            // Uniform
                        case 4:
                            return 1;
                            // Drop shadow
                        case 5:
                            return 4;
                    }
                }

                // Just re-maps the enum, the settings API uses a different enum that GMediaEngineConfig
                function fontSizeEnumToPercent(enumValue) {
                    switch (enumValue) {
                        // 100%
                        case 0:
                            return 100;
                            // 50%
                        case 1:
                            return 50;
                            // 75%
                        case 2:
                            return 75;
                            // 150%
                        case 3:
                            return 150;
                            // 200%
                        case 4:
                            return 200;

                    }
                }

                // Maps from the settings "Font Style" enum, to the actual font value GMediaEngineConfig needs
                function fontStyleEnumToFont(enumValue) {
                    switch (enumValue) {
                        // Default
                        case 0:
                            return "default";
                            // Monospace Serif
                        case 1:
                            return "monospaceSerif";
                            // Proportional Serif
                        case 2:
                            return "proportionalSerif";
                            // Monospace Sans Serif
                        case 3:
                            return "monospaceSansSerif";
                            // Proportional Sans Serif
                        case 4:
                            return "proportionalSansSerif";
                            // Casual
                        case 5:
                            return "casual";
                            // Cursive
                        case 6:
                            return "cursive";
                            // SmallCaps
                        case 7:
                            return "smallCaps";
                    }
                }

                if (mfconfig && this._playbackStarted && !this._captionsStyled) {
                    // this function will style the captionConfig based on the system caption settings                
                    var captionsOptions = Windows.Xbox.System.ClosedCaptions.ClosedCaptionProperties;

                    if (!captionsOptions.useDefaultOptions) {
                        mfconfig.defaultBackgroundColor = rgbToHex(captionsOptions.backgroundColor.r, captionsOptions.backgroundColor.g, captionsOptions.backgroundColor.b, captionsOptions.backgroundColor.a);
                        mfconfig.defaultTextColor = rgbToHex(captionsOptions.fontColor.r, captionsOptions.fontColor.g, captionsOptions.fontColor.b, captionsOptions.fontColor.a);
                        mfconfig.defaultTextEdge = fontEffectsEnumToDifferentFontEffectsEnum(captionsOptions.fontEdgeAttribute);
                        mfconfig.defaultTextSize = fontSizeEnumToPercent(captionsOptions.fontSize);
                        mfconfig.defaultTextFont = fontStyleEnumToFont(captionsOptions.fontStyle);
                        mfconfig.defaultWindowColor = rgbToHex(captionsOptions.windowColor.r, captionsOptions.windowColor.g, captionsOptions.windowColor.b, captionsOptions.windowColor.a);
                    }

                    this._captionsStyled = true;
                }
            },
            _updateCaptions: function () {
                if (Windows.Xbox) {
                    if (this._displayCea608Captions == 1) {// captions forced on
                        this.mediaEngineConfig.defaultLanguageId = 0;
                        this._styleCaptions(this.mediaEngineConfig);
                    } else if (this._displayCea608Captions == 0) {// captions forced off
                        this.mediaEngineConfig.defaultLanguageId = -1;
                    }
                }
            },
            _onDurationChange_replacement: function () {
                //HLS Patch:
                if (this._mediaElementAdapter &&
                    this._mediaElementAdapter.mediaElement) {

                    if (!isFinite(this._mediaElementAdapter.mediaElement.duration)) {
                        this._mediaElementAdapter.isLive = true;
                    }

                    if (!this._wasEndTimeSetProgrammatically) {
                        if (!this._mediaElementAdapter.stream)
                            this._totalTime = this._mediaElementAdapter.mediaElement.duration - this._startTime;
                        else {
                            // with HLS case
                            this._totalTime = this._endTime - this._startTime;
                        }


                        this._updateTimelineVisuals();

                        this._updateMediaState(false);
                    }
                }
            },
            _updateMediaState_Replacement: function (isStopped) {

                var utilities = WinJS.Utilities;
                var nav = WinJS.Navigation;

                // Return if we are running in an iframe or not on an Xbox
                if (!utilities.hasWinRT ||
                    !Windows.Xbox ||
                    !this._smtControls) {
                    return;
                }

                var numberOfMilisecondsInASecond = 1000;
                var playbackStatus = Windows.Media.MediaPlaybackStatus;
                var updater = this._smtControls.displayUpdater;

                // We need to set the contentId on every update because there could be cases where there are multiple
                // concurrent videos. Because there is only one smtc, the two videos will override each other's state.
                // For SmartGlass to be able to differentiate between the two video streams, we need to send the contentId
                // along with each update.
                if (updater &&
                    this._mediaMetadata) {
                    updater.appMediaId = this._mediaMetadata.contentId;
                }

                // Assign MediaTransportState
                if (!this._mediaElementAdapter ||
                    !this._mediaElementAdapter.mediaElement ||
                    !this._mediaElementAdapter.mediaElement.src) {
                    this._smtControls.playbackStatus = playbackStatus.closed;
                } else if (isStopped ||
                    this._mediaElementAdapter.mediaElement.ended) {
                    this._smtControls.playbackStatus = playbackStatus.stopped;
                } else if (this._isBusy) {
                    if (this._mediaElementAdapter.mediaElement.readyState <= this._MEDIA_READY_STATE_HAVE_FUTURE_DATA) {
                        this._smtControls.playbackStatus = playbackStatus.changing;
                    }
                } else if (!this._isInFastForwardOrRewindMode) {
                    if (this._mediaElementAdapter.mediaElement.paused) {
                        this._smtControls.playbackStatus = playbackStatus.paused;
                    } else {
                        this._smtControls.playbackStatus = playbackStatus.playing;
                    }
                } else if (this._isInFastForwardOrRewindMode) {
                    this._smtControls.playbackStatus = playbackStatus.playing;
                } else {
                    this._smtControls.playbackStatus = playbackStatus.closed;
                }

                this._smtControls.isFastForwardEnabled = this._isButtonEnabledAndVisible(this._fastForwardButton);
                this._smtControls.isNextEnabled = this._isButtonEnabledAndVisible(this._chapterSkipForwardButton) || this._isButtonEnabledAndVisible(this._nextTrackButton);

                if (this._isButtonEnabledAndVisible(this._playPauseButton)) {
                    if (this._mediaElementAdapter &&
                        this._mediaElementAdapter.mediaElement) {

                        if (this._mediaElementAdapter.mediaElement.paused) {
                            this._smtControls.isPlayEnabled = true;
                            this._smtControls.isPauseEnabled = false;
                        } else {
                            this._smtControls.isPlayEnabled = false;
                            this._smtControls.isPauseEnabled = true;
                        }
                    }
                }

                this._smtControls.isPreviousEnabled = this._isButtonEnabledAndVisible(this._chapterSkipBackButton) || this._isButtonEnabledAndVisible(this._previousTrackButton);
                this._smtControls.isRewindEnabled = this._isButtonEnabledAndVisible(this._rewindButton);
                this._smtControls.isStopEnabled = nav.canGoBack;
                this._smtControls.isChannelUpEnabled = this._isButtonEnabledAndVisible(this._channelUpButton);
                this._smtControls.isChannelDownEnabled = this._isButtonEnabledAndVisible(this._channelDownButton);

                // Note: The duration is NaN before the video stream has loaded it's metadata, which will cause
                // the MediaPlayer to fall into "live" mode. We need to check the state of the mediaElement to
                // make sure that metadata is loaded before setting isLive to true.
                if (this._mediaElementAdapter &&
                    this._mediaElementAdapter.mediaElement &&
                    !isFinite(this._mediaElementAdapter.mediaElement.duration) &&
                    this._mediaElementAdapter.mediaElement.readyState > this._MEDIA_READY_STATE_HAVE_METADATA) {
                    this._mediaElementAdapter.isLive = true;
                }

                if (updater.type === Windows.Media.MediaPlaybackType.video) {
                    updater.videoProperties.mediaStart = 0;
                    updater.videoProperties.minSeek = this._startTime * numberOfMilisecondsInASecond;
                    // We use -1 to indicate to the SystemMediaTransportControl that the
                    // media represents a live event
                    if (this._mediaElementAdapter.isLive || !isFinite(this._endTime)) { //3ivx: finity check
                        if (isFinite(this.targetCurrentTime)) {
                            updater.videoProperties.maxSeek = (this.targetCurrentTime - this._startTime) * numberOfMilisecondsInASecond;
                        }
                        else {
                            updater.videoProperties.maxSeek = 0;
                        }
                    } else {
                        updater.videoProperties.maxSeek = this._endTime * numberOfMilisecondsInASecond;
                    }
                    if (isFinite(this.targetCurrentTime)) {
                        updater.videoProperties.playbackPosition = this.targetCurrentTime * numberOfMilisecondsInASecond;
                    }
                    else {
                        updater.videoProperties.playbackPosition = 0;
                    }
                    updater.videoProperties.playbackRate = this.targetPlaybackRate;

                    if (this._mediaElementAdapter &&
                        this._mediaElementAdapter.mediaElement &&
                        updater.type) {
                        // We use -1 to indicate to the SystemMediaTransportControl that the
                        // media represents a live event
                        if (this._mediaElementAdapter.isLive || !isFinite(this._mediaElementAdapter.mediaElement.duration)) { //3ivx: finity check
                            updater.videoProperties.mediaStart = 0;
                            updater.videoProperties.mediaEnd = 0//-1; // 3ivx: -1 causes overflow on smartglass, 0 seems to be the correct value
                        } else {
                            if (this._mediaElementAdapter.mediaElement.duration) {
                                updater.videoProperties.mediaStart = 0;
                                updater.videoProperties.mediaEnd = this._mediaElementAdapter.mediaElement.duration * numberOfMilisecondsInASecond;
                            }
                        }
                    }
                }

                updater.update();
            },
			_isBusySet_replacement: function (value) {
                var utilities = WinJS.Utilities;

                if (this._disposed) {
                    return;
                }

                this._isBusyInternal = value;

                var that = this;
                if (value) {
                    utilities.removeClass(this._busyIndicator, "win-mediaplayer-hidden");
                    WinJS.UI.executeTransition(this._busyIndicator,
                        [{
                            property: "opacity",
                            delay: 0,
                            duration: 200,
                            timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                            from: 0,
                            to: 1
                        }]);
                } else {
                    // The duration of the fade out is set to one second to avoid flicker.
                    WinJS.Promise.timeout(1000).then(function afterShortDelay() {
                        if (!that._busyIndicator) { 
                            return;
                        }

                        // PATCH: don't hide the indicator if we're actually busy now!
                        if (that._isBusyInternal) {
                            return;
                        }

                        var fadeOutSpinnerAnimationPromise = WinJS.UI.executeTransition(that._busyIndicator,
                            [{
                                property: "opacity",
                                delay: 0,
                                duration: 200,
                                timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                                from: 1,
                                to: 0
                            }]);
                        fadeOutSpinnerAnimationPromise.done(function afterSpinnerFadeOut() {
                            if (that._busyIndicator) {
                                utilities.addClass(that._busyIndicator, "win-mediaplayer-hidden");
                            }
                        });
                    });
                }

                this._updateMediaState(false);
            },
            _patchMediaPlayer: function (mediaPlayer) {
                /* 
                    patch mediaPlayer._updateMediaState
                    
                    _updateMediaState has a few bugs, so we replace it with a patched version
                */

                /*
                    The mediaPlayer shows the isBusy indicator immediately with a 200ms animation, and hides the indicator after a 1000ms time delay. Thus at initialisation the 
                    mediaplayer is hiding the isBusy indicator, then showing the indicator after 1000 ms of loading, but the indicator hide actually occurins after the show 
                    because of the 1000ms delay, and thus the indicator is never shown. By setting the default indicator show delay to 1300ms, you can work-around the race 
                    condition by having the indicator show occur slightly after the indicator hide. Not an ideal solution, but probably the simplest.

                    a more complicated, and possibly ideal solution, is to patch the mediaPlayer._isBusy:set property to fix the bug. Which we do. In order for this to
                    work, the hlsMediaElementAdapter needs to be installed into mediaPlayer relatively early, ie, before setContentMetadata is called.
                */
           		// mediaPlayer._timeBeforeShowingBusyVisual = 1300;
                Object.defineProperty(mediaPlayer, "_isBusy", { set: this._isBusySet_replacement.bind(mediaPlayer) });


                clearInterval(mediaPlayer._updateMediaStateTimerCookie);
                mediaPlayer._updateMediaState = this._updateMediaState_Replacement;
                mediaPlayer._updateMediaStateBind = mediaPlayer._updateMediaState.bind(mediaPlayer);
                mediaPlayer._updateMediaStateTimerCookie = setInterval(mediaPlayer._updateMediaStateBind, mediaPlayer._REPORT_MEDIA_STATE_INTERVAL);

                mediaPlayer._onDurationChange = this._onDurationChange_replacement;
            }
        },
        {
            // static members
        }
   );


    // HlsMedia.HlsMediaElementAdapter
    WinJS.Namespace.define("HlsMedia", {
        HlsMediaElementAdapter: HlsMediaElementAdapter
    });
})();