// Try not to modify this file unless absolutely necessary. 
// The reason being if this file is updated, merging your changes will be difficult.

(function utilities_animationsInit() {
    "use strict";

    var wuiv = Windows.UI.ViewManagement;
    var _isBusy = false;
    // Time is in seconds
    var _delayBeforeShowingProgressSpinner = 500;
    // Sometimes we need to add a short delay between animations in order
    // to let a previous animation complete.
    var shortDelay = 200;

    var _entranceAnimationTimeout = 4000;

    var thisWinUI = WinJS.UI;
    var mstransform = "transform";

    // Default to 11 pixel from the left (or right if RTL)
    var defaultOffset = [{ top: "0px", left: "11px", rtlflip: true }];

    var OffsetArray = WinJS.Class.define(function OffsetArray_ctor(offset, keyframe, defOffset) {
        // Constructor
        defOffset = defOffset || defaultOffset;
        if (Array.isArray(offset) && offset.length > 0) {
            this.offsetArray = offset;
            if (offset.length === 1) {
                this.keyframe = checkKeyframe(offset[0], defOffset[0], keyframe);
            }
        } else if (offset && offset.hasOwnProperty("top") && offset.hasOwnProperty("left")) {
            this.offsetArray = [offset];
            this.keyframe = checkKeyframe(offset, defOffset[0], keyframe);
        } else {
            this.offsetArray = defOffset;
            this.keyframe = chooseKeyframe(defOffset[0], keyframe);
        }
    }, { // Public Members
        getOffset: function (i) {
            if (i >= this.offsetArray.length) {
                i = this.offsetArray.length - 1;
            }
            return this.offsetArray[i];
        }
    }, { // Static Members
        supportedForProcessing: false,
    });

    function makeArray(elements) {
        if (Array.isArray(elements) || elements instanceof NodeList || elements instanceof HTMLCollection) {
            return elements;
        } else if (elements) {
            return [elements];
        } else {
            return [];
        }
    }

    var isSnapped = function () {
        if (WinJS.Utilities.hasWinRT) {
            var appView = Windows.UI.ViewManagement.ApplicationView;
            var snapped = Windows.UI.ViewManagement.ApplicationViewState.snapped;
            isSnapped = function () {
                return appView.value === snapped;
            };
        } else {
            isSnapped = function () { return false; }
        }
        return isSnapped();
    };

    function translateCallback(offsetArray, prefix) {
        prefix = prefix || "";
        return function (i, elem) {
            var offset = offsetArray.getOffset(i);
            var left = offset.left;
            if (offset.rtlflip && window.getComputedStyle(elem).direction === "rtl") {
                left = left.toString();
                if (left.charAt(0) === "-") {
                    left = left.substring(1);
                } else {
                    left = "-" + left;
                }
            }
            return prefix + "translate(" + left + ", " + offset.top + ")";
        };
    };

    function playCustomTabChangedAnimation(elements, direction) {
        if (!direction) {
            direction = "left";
        }

        var elementsItemLeftDelta = 0;
        var initialElementsItemLeftPosition = 0;
        if (direction === "left") {
            initialElementsItemLeftPosition = document.body.offsetWidth;
            elementsItemLeftDelta = 200;
        } else {
            initialElementsItemLeftPosition = -1 * document.body.offsetWidth;
            elementsItemLeftDelta = -200;
        }

        var primaryElementsOffsetArray;
        var primaryElementsAnimationOffsets = [];

        if (direction === "left") {
            var elementsItemLeftPosition = initialElementsItemLeftPosition;
            for (var i = 0, len = elements.length; i < len; i++) {
                var currentElement = elements[i];
                primaryElementsAnimationOffsets.push({ left: elementsItemLeftPosition + "px", top: "0px" });
                elementsItemLeftPosition += elementsItemLeftDelta;
            }
        } else {
            var elementsItemLeftPosition = initialElementsItemLeftPosition + (elementsItemLeftDelta * elements.length);
            for (var i = elements.length - 1, len = 0; i >= len; i--) {
                var currentElement = elements[i];
                var currentElementBoundingRect = currentElement.getBoundingClientRect();
                var elemBottom = currentElementBoundingRect.bottom;
                primaryElementsAnimationOffsets.push({ left: elementsItemLeftPosition + ((document.body.offsetHeight - elemBottom) / 24) + "px", top: "0px" });
                elementsItemLeftPosition -= elementsItemLeftDelta;
            }
        }

        primaryElementsOffsetArray = new OffsetArray(primaryElementsAnimationOffsets, "WinJS-enterPage", [{ top: "0px", left: "100px", rtlflip: true }]);
        return thisWinUI.executeAnimation(
            elements,
            {
                property: mstransform,
                delay: 0,
                duration: 700,
                timing: "cubic-bezier(0.16, 1, 0.29, 0.99)",
                from: translateCallback(primaryElementsOffsetArray),
                to: "none"
            });
    };

    // Determine if the promise was a single promise or an array of promises
    function parseAnimationPromise(promise) {
        if (promise.length) {
            return WinJS.Promise.join(promise);
        } else {
            return promise;
        }
    };

    function defaultEntranceAnimation(domElement, primaryAnimatableElementsQuerySelectorString, secondaryAnimatableElementsQuerySelectorString, direction) {
        // We need to set the opacity to 1 right before the animation, otherwise the animation will not run
        // because it relies on opacity being 1 before it starts.
        domElement.style.opacity = "1";
        var primaryAnimationElements = domElement.querySelectorAll(primaryAnimatableElementsQuerySelectorString);
        var secondaryAnimationElements = null;
        if (secondaryAnimatableElementsQuerySelectorString) {
            secondaryAnimationElements = domElement.querySelectorAll(secondaryAnimatableElementsQuerySelectorString);
        }
        return XboxJS.UI.Animation.showCollection(primaryAnimationElements, { direction: direction, secondaryAnimationElements: secondaryAnimationElements });
    };

    function overrideDefaultControlAnimation(element, options) {
        var promise = null;
        var primaryAnimatableElementsQuerySelectorString = null;
        var entranceEventName = null;
        var secondaryAnimatableElementsQuerySelectorString = null;
        var entranceAnimation = defaultEntranceAnimation;
        var hasAnimationCompleted = false;
        var direction = null;
        if (options) {
            promise = options.promise;
            entranceEventName = options.entranceEventName
            primaryAnimatableElementsQuerySelectorString = options.primaryAnimatableElementsQuerySelectorString;
            secondaryAnimatableElementsQuerySelectorString = options.secondaryAnimatableElementsQuerySelectorString;
            if (options.customAnimationFunction) {
                entranceAnimation = options.customAnimationFunction;
            }
            direction = options.direction;
        }

        var domElement = null;
        // If the element is a winControl, then assign element to the .element property
        if (element.element) {
            domElement = element.element;
        } else {
            domElement = element;
        }

        // We need to wait on 3 things:
        // 1. The "content entrance" animation
        // 2. The developer supplied promise
        // 3. A page transition

        // Wait on the developer supplied promise (if there is one)
        var developerPromise = null;
        if (promise &&
            promise.length !== 0) {
            // If there is a delay promise
            developerPromise = parseAnimationPromise(promise);
        } else {
            developerPromise = WinJS.Promise.wrap(null);
        }

        // 1st hide the element that's going to be animated in
        domElement.style.opacity = "0";

        // Wait on a content entrance animation
        var contentEntrancePromise = null;
        if (entranceEventName) {
            contentEntrancePromise = new WinJS.Promise(function (c, e, p) {
                var fnOnEntranceEvent = function (ev) {
                    element.removeEventListener(entranceEventName, fnOnEntranceEvent, false);

                    // Prevent the default animation
                    ev.preventDefault();
                    c();
                };

                element.addEventListener(entranceEventName, fnOnEntranceEvent, false);
            });
        } else {
            contentEntrancePromise = WinJS.Promise.wrap(null);
        }

        // Wait on the page transition
        var pageTransitionPromise = null;
        if (XboxJS.Utilities._isTransitioning) {
            pageTransitionPromise = new WinJS.Promise(function (c, e, p) {
                var fnOnPageTransitioned = function () {
                    XboxJS.UI.Pages.removeEventListener("pagetransitioned", fnOnPageTransitioned, false);
                    c();
                };

                XboxJS.UI.Pages.addEventListener("pagetransitioned", fnOnPageTransitioned, false);
            });
        } else {
            pageTransitionPromise = WinJS.Promise.wrap(null);
        }

        // Now aggregate all the promises together and play the animation after all the events we need to wait for have completed
        // We have a timeout in case the event the developer is waiting on never fires. If the developer has high confidence the event
        // will always fire they can set the timeout to a very high value. However, if there is ever a case where the event or promise
        // the developer is waiting on never returns, then the user will be stuck on a blank page.
        return WinJS.Promise.timeout(_entranceAnimationTimeout,
            WinJS.Promise.join([developerPromise, contentEntrancePromise, pageTransitionPromise]))
            .then(
                function afterAnimationIsReadyToPlay() {
                    return defaultEntranceAnimation(domElement, primaryAnimatableElementsQuerySelectorString, secondaryAnimatableElementsQuerySelectorString, direction)
                        .then(function () {
                        XboxJS.UI.Voice.refreshVoiceElements();
                    });
                },
                function errorAnimationTimedOut() {
                    var currentStyle = domElement.currentStyle;
                    if (WinJS.Utilities.convertToPixels(domElement, "opacity") === 0) {
                        WinJS.UI.Animation.fadeIn(domElement)
                            .then(function () {
                                XboxJS.UI.Voice.refreshVoiceElements();
                            });
                    }
                });
    };

    WinJS.Namespace.define("MyApp.Utilities.Animation", {
        /// <field type="Element" locid="MyApp.Utilities.Animation.entranceAnimationTimeout">
        /// The maximum amount of time to wait before determining that an animation has timed out.
        /// </field>
        entranceAnimationTimeout: {
            get: function () {
                return _entranceAnimationTimeout;
            }
        },
        /// <field type="Element" locid="MyApp.Utilities.Animation.enterPageAnimationDuration">
        /// Returns the duration of the enter page animation.
        /// </field>
        enterPageAnimationDuration: {
            get: function () {
                return 280;
            }
        },
        /// <field type="Element" locid="MyApp.Utilities.Animation.enterPageAnimationDuration">
        /// Returns the duration of the longer enter page animation for use with pages that aren't hubs or lisviews.
        /// </field>
        longEnterPageAnimationDuration: {
            get: function () {
                return 1000;
            }
        },
        /// <field type="Element" locid="MyApp.Utilities.Animation.enterPageAnimationDuration">
        /// Returns the duration of the exit page animation.
        /// </field>
        exitPageAnimationDuration: {
            get: function () {
                return 280;
            }
        },
        /// <field type="Element" locid="MyApp.Utilities.Animation.tcuiEnterPageAnimationDuration">
        /// Returns the duration of the tcui enter page animation.
        /// </field>
        tcuiEnterPageAnimationDuration: {
            get: function () {
                return 280;
            }
        },
        /// <field type="Element" locid="MyApp.Utilities.Animation.tcuiExitPageAnimationDuration">
        /// Returns the duration of the tcui exit page animation.
        /// </field>
        tcuiExitPageAnimationDuration: {
            get: function () {
                return 280
            }
        },
        turnOffAnimations: function () {
            /// <summary locid="MyApp.Utilities.turnOffAnimations">
            /// A helper function to turn off animations.
            /// </summary>
            while (WinJS.UI.isAnimationEnabled()) {
                WinJS.UI.disableAnimations();
            }
        },
        /// <field type="Element" locid="MyApp.Utilities.Animation.turnOnAnimations">
        /// A helper function to turn on animations.
        /// </field>
        turnOnAnimations: function () {
            /// <summary locid="MyApp.Utilities.turnOnAnimations">
            /// A helper function to turn on animations.
            /// </summary>
            while (!WinJS.UI.isAnimationEnabled()) {
                WinJS.UI.enableAnimations();
            }
        },
        enterPage: function (pageElement, isBackNavigation, options) {
            /// <summary locid="MyApp.Utilities.Animation.enterPage">
            /// Plays an animation when the new page enters during a page transition.
            /// </summary>
            var transitionDuration = MyApp.Utilities.Animation.enterPageAnimationDuration;
            var transitionTiming = "cubic-bezier(0.13, 1, 0.15, 1)";

            var pageTransitionFader = document.querySelector("#pageTransitionFader");
            if (pageTransitionFader && !(options && options.bypassFader)) {
                WinJS.Utilities.removeClass(pageTransitionFader, "win-hidden");
                WinJS.UI.executeTransition(pageTransitionFader,
                      [{
                          property: "opacity",
                          delay: 0,
                          duration: transitionDuration,
                          timing: "linear",
                          from: 1,
                          to: 0
                      }]).then(function afterFadeOut() {
                          WinJS.Utilities.addClass(pageTransitionFader, "win-hidden");
                      });
            }

            // We set the opacity of the page to "1" in case it wasn't already 1, because it's
            // possible for a page using the default page transition animation to set it to 0
            // and not set it back.
            pageElement.style.opacity = "1";
            return WinJS.UI.executeTransition(pageElement,
            [{
                property: "transform",
                delay: 0,
                duration: transitionDuration,
                timing: transitionTiming,
                from: "scale(1, 1)",
                to: "scale(1, 1)"
            }]);
        },

        exitPage: function (pageElement, isBackNavigation, options) {
            /// <summary locid="MyApp.Utilities.Animation.exitPage">
            /// Plays an animation to remove the old page during a page transition.
            /// </summary>
            var transitionDuration = MyApp.Utilities.Animation.exitPageAnimationDuration;
            var transitionTiming = "cubic-bezier(0.71, 0.01, 0.84, 0)";

            var pageTransitionFader = document.querySelector("#pageTransitionFader");
            if (pageTransitionFader && !(options && options.bypassFader)) {
                WinJS.Utilities.removeClass(pageTransitionFader, "win-hidden");
                WinJS.UI.executeTransition(pageTransitionFader,
                        [{
                            property: "opacity",
                            delay: 0,
                            duration: transitionDuration,
                            timing: "linear",
                            from: 0,
                            to: 1
                        }]);
            }

            if (isBackNavigation && wuiv.ApplicationView.value !== wuiv.ApplicationViewState.snapped) {
                return WinJS.UI.executeTransition(pageElement,
                [{
                    property: "opacity",
                    delay: transitionDuration,
                    duration: 0,
                    timing: "linear",
                    from: 1,
                    to: 0
                },
                {
                    property: "transform",
                    delay: 0,
                    duration: transitionDuration,
                    timing: transitionTiming,
                    from: "scale(1, 1)",
                    to: "scale(0.8, 0.8)"
                }]);
            }
            else {
                return WinJS.UI.executeTransition(pageElement,
                [{
                    property: "opacity",
                    delay: transitionDuration,
                    duration: 0,
                    timing: "linear",
                    from: 1,
                    to: 0
                }]);
            }
        },

        tcuiEnterPage: function (pageElement, isBackNavigation, options) {
            /// <summary locid="MyApp.Utilities.Animation.enterPage">
            /// Plays an animation when the new page enters during a page transition.
            /// </summary>
            var transitionDelay = MyApp.Utilities.Animation.tcuiExitPageAnimationDuration;
            var transitionDuration = MyApp.Utilities.Animation.tcuiEnterPageAnimationDuration;
            var transitionTiming = "cubic-bezier(0.13, 1, 0.15, 1)";

            var pageTransitionFader = document.querySelector("#pageTransitionFader");
            if (pageTransitionFader && !(options && options.bypassFader)) {
                WinJS.Utilities.removeClass(pageTransitionFader, "win-hidden");
                WinJS.UI.executeTransition(pageTransitionFader,
                      [{
                          property: "opacity",
                          delay: 0,
                          duration: transitionDuration,
                          timing: "linear",
                          from: 1,
                          to: 0
                      }]).then(function afterFadeOut() {
                          WinJS.Utilities.addClass(pageTransitionFader, "win-hidden");
                      });
            }

            pageElement.style.opacity = "1";
            return WinJS.UI.executeTransition(pageElement,
             [{
                 property: "opacity",
                 delay: transitionDuration,
                 duration: 0,
                 timing: transitionTiming,
                 from: 1,
                 to: 1
             }]);
        },

        tcuiExitPage: function (pageElement, isBackNavigation, options) {
            /// <summary locid="MyApp.Utilities.Animation.exitPage">
            /// Plays an animation to remove the old page during a page transition.
            /// </summary>
            var transitionDuration = MyApp.Utilities.Animation.tcuiExitPageAnimationDuration;
            var transitionTiming = "cubic-bezier(0.16, 1, 0.29, 0.99)";

            var pageTransitionFader = document.querySelector("#pageTransitionFader");
            if (pageTransitionFader && !(options && options.bypassFader)) {
                WinJS.Utilities.removeClass(pageTransitionFader, "win-hidden");
                WinJS.UI.executeTransition(pageTransitionFader,
                        [{
                            property: "opacity",
                            delay: 0,
                            duration: transitionDuration,
                            timing: "linear",
                            from: 0,
                            to: 1
                        }]);
            }

            return WinJS.UI.executeTransition(pageElement,
            [{
                property: "opacity",
                delay: transitionDuration,
                duration: 0,
                timing: "linear",
                from: 1,
                to: 0
            }]);
        },

        useCustomHubEntranceAnimation: function (hubControl, promise) {
            /// <summary locid="MyApp.Utilities.Animation.useCustomHubEntranceAnimation">
            /// Use this animation to override the default hub entrance animation.
            /// </summary>
            return overrideDefaultControlAnimation(hubControl, {
                promise: promise,
                entranceEventName: "contentanimating",
                primaryAnimatableElementsQuerySelectorString: ".win-hub-section-header, .win-hub-section-content",
            }).then(function () {
                var winControl = null;
                if (hubControl.winControl) {
                    winControl = hubControl.winControl
                } else {
                    winControl = hubControl;
                }
                winControl._updatePreviousNextVoiceLabels();
            });
        },

        useCustomFadeInHubEntranceAnimation: function (hubControl) {
            /// <summary locid="MyApp.Utilities.Animation.useCustomHubEntranceAnimation">
            /// Use this animation to override the default hub entrance animation.  This version simply fades in hub content as a whole. 
            /// </summary>

            var domElement = null;
            if (hubControl.element) {
                domElement = hubControl.element;
            } else {
                domElement = hubControl;
            }

            // We need to wait on 2 things:
            // 1. The "content entrance" animation
            // 2. A page transition

            // 1st hide the element that's going to be animated in
            domElement.style.opacity = "0";

            // Wait on a content entrance animation
            var contentEntrancePromise = null;

            contentEntrancePromise = new WinJS.Promise(function (c, e, p) {
                var fnOnEntranceEvent = function (ev) {
                    hubControl.removeEventListener("contentanimating", fnOnEntranceEvent, false);

                    // Prevent the default animation
                    ev.preventDefault();
                    c();
                };

                hubControl.addEventListener("contentanimating", fnOnEntranceEvent, false);
            });


            // Wait on the page transition
            var pageTransitionPromise = null;
            if (XboxJS.Utilities._isTransitioning) {
                pageTransitionPromise = new WinJS.Promise(function (c, e, p) {
                    var fnOnPageTransitioned = function () {
                        XboxJS.UI.Pages.removeEventListener("pagetransitioned", fnOnPageTransitioned, false);
                        c();
                    };

                    XboxJS.UI.Pages.addEventListener("pagetransitioned", fnOnPageTransitioned, false);
                });
            } else {
                pageTransitionPromise = WinJS.Promise.wrap(null);
            }

            // Now aggregate all the promises together and play the animation after all the events we need to wait for have completed
            // We have a timeout in case the event the developer is waiting on never fires. If the developer has high confidence the event
            // will always fire they can set the timeout to a very high value. However, if there is ever a case where the event or promise
            // the developer is waiting on never returns, then the user will be stuck on a blank page.
            return WinJS.Promise.timeout(_entranceAnimationTimeout,
                WinJS.Promise.join([contentEntrancePromise, pageTransitionPromise]))
                .then(
                    function afterAnimationIsReadyToPlay() {
                        if (WinJS.Utilities.convertToPixels(domElement, "opacity") === 0) {
                            WinJS.UI.Animation.fadeIn(domElement)
                                .then(function () {
                                    XboxJS.UI.Voice.refreshVoiceElements();
                                });
                        }
                    },
                    function errorAnimationTimedOut() {
                        if (WinJS.Utilities.convertToPixels(domElement, "opacity") === 0) {
                            WinJS.UI.Animation.fadeIn(domElement)
                                .then(function () {
                                    XboxJS.UI.Voice.refreshVoiceElements();
                                });
                        }
                    }).then(function updateVoiceLabels() {
                        var winControl = null;
                        if (hubControl.winControl) {
                            winControl = hubControl.winControl
                        } else {
                            winControl = hubControl;
                        }
                        winControl._updatePreviousNextVoiceLabels();
                    });
        },

        enterRepeater: function (repeaterControl, promise, direction) {
            /// <summary locid="MyApp.Utilities.Animation.enterRepeater">
            /// Use this animation when the repeater updates its data property.
            /// </summary>
            /// <signature>
            /// Animate the repeater's data after the previous page exit animation is completed
            /// </signature>
            return overrideDefaultControlAnimation(repeaterControl, {
                promise: promise,
                entranceEventName: null, /* We don't wait on any repeater events because they're not dependable */
                primaryAnimatableElementsQuerySelectorString: ".win-itemcontainer",
                secondaryAnimatableElementsQuerySelectorString: ".win-itemcontainer .win-mediatile-title",
                direction: direction
            });
        },

        useCustomlistViewAnimation: function (listViewControl, promise) {
            /// <summary locid="MyApp.Utilities.Animation.useCustomlistViewAnimation">
            /// Use this animation when the ListView updates it's itemDataSource.
            /// </summary>
            return overrideDefaultControlAnimation(listViewControl, {
                promise: promise,
                entranceEventName: "contentanimating",
                primaryAnimatableElementsQuerySelectorString: ".win-container",
                secondaryAnimatableElementsQuerySelectorString: ".win-container .win-mediatile-title"
            });
        },

        useCustomTabChangedAnimation: function (tabViewControl) {
            /// <summary locid="MyApp.Utilities.Animation.useCustomTabChangedAnimation">
            /// Use this animation to override the default animation when the user switches tabs.
            /// </summary>
            function _animateLeftOldTab(oldTabIndex) {
                var oldTab = tabViewControl.tabs.getAt(oldTabIndex).element;
                WinJS.Utilities.addClass(oldTab, "win-tabview-tab-visible");
                oldTab.style.left = "-100vw";
            };
            function _animateLeftCurrentTab(currentTabIndex) {
                var currentTab = tabViewControl.tabs.getAt(currentTabIndex).element;
                WinJS.Utilities.addClass(currentTab, "win-tabview-tab-visible");
                currentTab.style.left = "0px";
                var primaryAnimatableElements = currentTab.querySelectorAll(".win-hub-section-header, .win-hub-section-content");
                return playCustomTabChangedAnimation(primaryAnimatableElements, "left");
            };
            function _animateRightOldTab(oldTabIndex) {
                var oldTab = tabViewControl.tabs.getAt(oldTabIndex).element;
                WinJS.Utilities.addClass(oldTab, "win-tabview-tab-visible");
                oldTab.style.left = "100vw";
            };
            function _animateRightCurrentTab(currIndex) {
                var currentTab = tabViewControl.tabs.getAt(currIndex).element;
                currentTab.style.left = "0px";
                WinJS.Utilities.addClass(currentTab, "win-tabview-tab-visible");
                var primaryAnimatableElements = currentTab.querySelectorAll(".win-hub-section-header, .win-hub-section-content");
                return playCustomTabChangedAnimation(primaryAnimatableElements, "right");
            };

            function playCustomTabChangedEntranceAnimation(ev) {
                if (!ev.detail ||
                    (ev.detail.type !== XboxJS.UI.TabView.AnimationType.contentTransition)) {
                    return;
                }

                ev.preventDefault();

                var newTabIndex = ev.detail.newTabIndex;
                var oldTabIndex = ev.detail.oldTabIndex;

                if (oldTabIndex !== -1) {

                    var animationPromise = null;
                    if (tabViewControl._currentTab > oldTabIndex) {
                        _animateLeftOldTab(oldTabIndex);
                        animationPromise = _animateLeftCurrentTab(tabViewControl.currentTab);
                    } else {
                        animationPromise = _animateRightCurrentTab(tabViewControl.currentTab);
                        _animateRightOldTab(oldTabIndex);
                    }

                    animationPromise.done(function afterTabAnimationCompleted() {
                        // We need to refresh voice elements since they may have changed
                        if (XboxJS.UI.Voice) {
                            XboxJS.UI.Voice.refreshVoiceElements();
                        }
                    });
                }
            };

            tabViewControl.addEventListener("contentanimating", playCustomTabChangedEntranceAnimation, false);
        },
        useCustomImageEntranceAnimation: function (imageDivElement, imageUrl) {
            /// <summary locid="MyApp.Utilities.Animation.useCustomImageEntranceAnimation">
            /// Use this animation for when displaying an image that may take a while to load.
            /// </summary>

            var imageEntranceAnimationDuration = 1000;
            var preloadImage = new Image();
            preloadImage.loaded = false;
            preloadImage.pendingAnimation = false;

            preloadImage.addEventListener("load", function afterImageLoaded() {
                preloadImage.loaded = true;
                playEntranceAnimationPromise.cancel();
                imageDivElement.style.backgroundImage = "url(" + imageUrl + ")";
            });

            preloadImage.src = imageUrl;
            var playEntranceAnimationPromise = WinJS.Promise.timeout(MyApp.Utilities.Animation.longEnterPageAnimationDuration).then(function () {
                playImageEntranceAnimation();
            });

            function playImageEntranceAnimation() {
                imageDivElement.style.backgroundImage = "url(" + imageUrl + ")";
                var animationPromises = [];

                // Create a white mask div
                var maskDiv = document.createElement("div");
                var imageDivElementRect = imageDivElement.getBoundingClientRect();
                maskDiv.style.position = "absolute";
                maskDiv.style.top = imageDivElementRect.top + "px";
                maskDiv.style.left = imageDivElementRect.left + "px";
                maskDiv.style.width = imageDivElementRect.width + "px";
                maskDiv.style.height = imageDivElementRect.height + "px";
                maskDiv.style.backgroundColor = "rgb(235, 235, 235)";
                document.body.appendChild(maskDiv);

                // Animate the image element
                animationPromises.push(WinJS.UI.executeTransition(imageDivElement,
                    [{
                        property: "opacity",
                        delay: 0,
                        duration: imageEntranceAnimationDuration / 3,
                        timing: "linear",
                        from: 0,
                        to: 1
                    }]));

                animationPromises.push(WinJS.UI.executeTransition(maskDiv,
                    [{
                        property: "opacity",
                        delay: 0,
                        duration: imageEntranceAnimationDuration / 3,
                        timing: "linear",
                        from: 0.7,
                        to: 0
                    }]));

                return WinJS.Promise.join(animationPromises).then(function () {
                    document.body.removeChild(maskDiv);
                });
            };
        }
    });
})();

(function extendedSplashScreenInit() {
    "use strict";

    WinJS.Namespace.define("MyApp.Utilities.SplashScreen", {
        show: function splashscreen_show(splash) {
            /// <summary locid="MyApp.Utilities.SplashScreen.show">
            /// Displays the extended splash screen. Pass the splash screen object retrieved during activation.
            /// </summary>
            var extendedSplashImage = document.getElementById("extendedsplashscreenimage");

            // Position the extended splash screen image in the same location as the system splash screen image.
            if (splash.imageLocation.x === 650) {
                extendedSplashImage.style.top = splash.imageLocation.y + "px";
                extendedSplashImage.style.left = splash.imageLocation.x + "px";
                extendedSplashImage.style.width = splash.imageLocation.width + "px";
                extendedSplashImage.style.height = splash.imageLocation.height + "px";
            } else if (splash.imageLocation.x === 410) {
                extendedSplashImage.style.top = splash.imageLocation.y + "px";
                extendedSplashImage.style.left = splash.imageLocation.x + "px";
                extendedSplashImage.style.width = splash.imageLocation.width + "px";
                extendedSplashImage.style.height = splash.imageLocation.height + "px";
            } else {
                extendedSplashImage.style.top = "424px";
                extendedSplashImage.style.left = "1px";
                extendedSplashImage.style.width = "480px";
                extendedSplashImage.style.height = "232px";
            }

            // Position the extended splash screen's progress ring. Note: In this sample, the progress ring is not used.
            var extendedSplashProgress = document.getElementById("extendedsplashscreenprogress");
            extendedSplashProgress.style.marginTop = splash.imageLocation.y + splash.imageLocation.height + 32 + "px";
            var extendedSplashProgressRect = extendedSplashProgress.getBoundingClientRect();
            extendedSplashProgress.style.left = "calc(50% - " + WinJS.Utilities.convertToPixels(extendedSplashProgress, extendedSplashProgress.currentStyle.width) / 2 + "px)";

            // Once the extended splash screen is setup, apply the CSS style that will make the extended splash screen visible.
            var extendedSplashScreen = document.getElementById("extendedsplashscreen");
            WinJS.Utilities.removeClass(extendedSplashScreen, "hidden");
        },

        // Updates the location of the extended splash screen image. Should be used to respond to window size changes.
        updateImageLocation: function splashscreen_updateImageLocation(splash, isSnapped) {
            /// <summary locid="MyApp.Utilities.SplashScreen.updateImageLocation">
            /// Updates the location of the extended splash screen image. Should be used to respond to window size changes.
            /// </summary>
            if (MyApp.Utilities.SplashScreen.isVisible()) {
                var extendedSplashImage = document.getElementById("extendedsplashscreenimage");

                // Position the extended splash screen image in the same location as the system splash screen image.
                if (splash.imageLocation.x === 650) {
                    extendedSplashImage.style.top = splash.imageLocation.y + "px";
                    extendedSplashImage.style.left = splash.imageLocation.x + "px";
                    extendedSplashImage.style.width = splash.imageLocation.width + "px";
                    extendedSplashImage.style.height = splash.imageLocation.height + "px";
                }
                else if (splash.imageLocation.x === 410) {
                    extendedSplashImage.style.top = splash.imageLocation.y + "px";
                    extendedSplashImage.style.left = splash.imageLocation.x + "px";
                    extendedSplashImage.style.width = splash.imageLocation.width + "px";
                    extendedSplashImage.style.height = splash.imageLocation.height + "px";
                }
                else {
                    extendedSplashImage.style.top = "424px";
                    extendedSplashImage.style.left = "1px";
                    extendedSplashImage.style.width = "480px";
                    extendedSplashImage.style.height = "232px";
                }

                // Position the extended splash screen's progress ring. Note: In this sample, the progress ring is not used.
                var extendedSplashProgress = document.getElementById("extendedsplashscreenprogress");
                extendedSplashProgress.style.marginTop = splash.imageLocation.y + splash.imageLocation.height + 32 + "px";
                var extendedSplashProgressRect = extendedSplashProgress.getBoundingClientRect();
                extendedSplashProgress.style.left = "calc(50% - " + WinJS.Utilities.convertToPixels(extendedSplashProgress, extendedSplashProgress.currentStyle.width) / 2 + "px)";
            }
        },

        isVisible: function splashscreen_isVisible() {
            /// <summary locid="MyApp.Utilities.SplashScreen.isVisible">
            /// Checks whether the extended splash screen is visible and returns a boolean.
            /// </summary>
            var extendedSplashScreen = document.getElementById("extendedsplashscreen");
            return !(WinJS.Utilities.hasClass(extendedSplashScreen, "hidden"));
        },

        remove: function splashscreen_remove() {
            /// <summary locid="MyApp.Utilities.SplashScreen.remove">
            /// Removes the extended splash screen if it is currently visible.
            /// </summary>
            if (MyApp.Utilities.SplashScreen.isVisible()) {
                var extendedSplashScreen = document.getElementById("extendedsplashscreen");
                WinJS.Utilities.addClass(extendedSplashScreen, "hidden");
            }
        }
    });
})();