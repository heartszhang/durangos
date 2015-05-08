// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

/*global WinJS: true*/

(function () {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var utils = MyApp.Utilities;

    var moreActionsButton = null;

    // Functions for each button

    WinJS.UI.Pages.define("/pages/details/details.html", {
        _detailsHub: null,
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: null,
        _item: {},
        related: {},
        _handleLoadingStateChangedBind: null,
        _handlePlayButtonClickedBind: null,
        _handlePinMovieToHomeBind: null,
        _handleUnpinMovieFromHomeBind: null,
        _handleRatingChangedBind: null,
        _handleRemoveFromQueueBind: null,
        _handleAddToQueueBind: null,
        _pinButton: null,
        _queueButton: null,
        _queueButtonSnapped: null,
        _showMoreActionsMenuBind: null,

        enterPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.enterPage(this._layoutRoot, isBackNavigation);
        },

        exitPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.exitPage(this._layoutRoot, isBackNavigation);
        },
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {

            this._layoutRoot = element;
            this.enterPage = this.enterPage.bind(this);
            this.exitPage = this.exitPage.bind(this);
            // Whenever we make a service call it is a good idea to push that service call's promise into the promises array.
            // That way, we have an easy way to cancel all of the outstanding promises. For instance, we cancel all outstanding
            // promises on page navigation.
            this._pagePromises = [];
            var loadPromises = [];
            this._item = options;
            this._detailsHub = this._layoutRoot.querySelector("#details-hub").winControl;
            this._handleLoadingStateChangedBind = this._handleLoadingStateChanged.bind(this);

            MyApp.Utilities.showSpinner();

            // Wire up events for pinning
            this._handlePinMovieToHomeBind = this._handlePinMovieToHome.bind(this);
            this._handleUnpinMovieFromHomeBind = this._handleUnpinMovieToHome.bind(this);

            // Make sure we were given a valid item
            if (!options) {
                MyApp.Utilities.showErrorMessage(
                            WinJS.Resources.getString("contentNotFoundErrorDescription").value,
                            WinJS.Resources.getString("contentNotFoundErrorTitle").value
                        );
                return;
            }

            // Set the title of the page
            if (options.pageTitle) {
                this._layoutRoot.querySelector("#details-pagetitle").innerText = options.pageTitle;
            }

            loadPromises.push(new WinJS.Promise(function (complete) {
                var loadState = function (ev) {
                    if (ev.detail &&
                        ev.detail.loadingState === XboxJS.UI.Hub.LoadingState.complete) {
                        this._detailsHub.removeEventListener("loadingstatechanged", loadState);
                        complete();
                    }
                }.bind(this);
                this._detailsHub.addEventListener("loadingstatechanged", loadState, false);
            }.bind(this)));

            // Start loading the data we need in the ready event so the web requests can be made in parallel to
            // loading the UI needed for the page.
            this._relatedData = [];
            this._pagePromises.push(MyApp.Services.Movies.getRelatedData(this._item).then(function success(result) {
                this._relatedData = result;
            }.bind(this)));

            this._itemIsInQueue = false;
            this._pagePromises.push(MyApp.Services.isInQueue(this._item).then(function (result) {
                this._itemIsInQueue = result;
            }.bind(this)));

            loadPromises = WinJS.Promise.join(loadPromises);

            // Use a custom Hub entrance animation
            MyApp.Utilities.Animation.useCustomHubEntranceAnimation(this._detailsHub, loadPromises);

            // Remove the splash screen once the data is loaded
            loadPromises.then(function success() {
                this._handleLoadingStateChangedBind();
                MyApp.Utilities.SplashScreen.remove();
            }.bind(this))
            .then(function () {
                MyApp.Utilities.hideSpinner();
            });
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.

            // Cancel any outstanding promises so that they don't get called and cause an exception after the page goes away.
            var promises = this._pagePromises;
            for (var i = 0; i < promises.length; i++) {
                if (promises[i]) {
                    promises[i].cancel();
                }
            }
        },

        updateLayout: function (element, viewState, lastViewState) {
            // TODO: Respond to changes in viewState.

            if (lastViewState !== viewState) {
                var initialFocusElementSelector = "";
                var detailsDescription = this._layoutRoot.querySelector("#details-description");
                var detailsDescriptionSnapped = this._layoutRoot.querySelector("#details-description-snapped");
                if (viewState === appViewState.snapped) {
                    initialFocusElementSelector = "#details-playbutton-snapped";
                    if (detailsDescriptionSnapped) {
                        detailsDescriptionSnapped.winControl.refresh();
                    }
                } else {
                    initialFocusElementSelector = "#details-playbutton";
                    if (detailsDescription) {
                        detailsDescription.winControl.refresh();
                    }
                }

                setImmediate(function afterPageRenderingHasFinished() {
                    var initialFocusElement = this._layoutRoot.querySelector(initialFocusElementSelector);
                    if (initialFocusElement) {
                        initialFocusElement.focus();
                    }
                }.bind(this));
            }
        },

        // This method is where you want to perform initialization logic. It's better to put your initialization
        // code here rather than the ready function, because not all of your UI has loaded when the ready function is called.
        // This is because both the TabView, Hub and ListView load asynchronously.
        _handleLoadingStateChanged: function () {
            var detailsImage = this._layoutRoot.querySelector(".details-layout-overview-image");
            var detailsImageSnapped = this._layoutRoot.querySelector(".details-snapped-overlay .details-layout-overview-image");
            var detailsMovieTitle = this._layoutRoot.querySelector("#details-title");
            var detailsDescription = this._layoutRoot.querySelector("#details-description");
            var detailsDescriptionSnapped = this._layoutRoot.querySelector("#details-description-snapped");
            var detailsRating = this._layoutRoot.querySelector("#details-rating");
            var detailsUserRating = this._layoutRoot.querySelector("#details-userrating");
            var detailsDate = this._layoutRoot.querySelector("#details-date");
            var playButton = this._layoutRoot.querySelector("#details-playbutton");
            var playButtonSnapped = this._layoutRoot.querySelector("#details-playbutton-snapped");
            this._pinButton = this._layoutRoot.querySelector("#details-pinbutton");
            this._queueButton = this._layoutRoot.querySelector("#details-queuebutton");
            this._queueButtonSnapped = this._layoutRoot.querySelector("#details-queuebutton-snapped");
            var relatedRepeater = this._layoutRoot.querySelector(".details-related").winControl;
            this._handleRatingChangedBind = this._handleRatingChanged.bind(this);

            this._handleAddToQueueBind = this._handleAddToQueue.bind(this);
            this._handlePlayButtonClickedBind = this._handlePlayButtonClicked.bind(this);
            this._handleRemoveFromQueueBind = this._handleRemoveFromQueue.bind(this);
            this._showMoreActionsMenuBind = this._showMoreActionsMenu.bind(this);

            this._layoutRoot.querySelector(".details-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);

            // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
            setImmediate(function afterPageRenderingHasFinished() {
                if (appView.value === appViewState.snapped) {
                    if (playButtonSnapped) {
                        playButtonSnapped.focus();
                    }
                } else {
                    if (playButton) {
                        playButton.focus();
                    }
                }
            });

            // Hook up button handlers
            playButton.winControl.addEventListener("invoked", this._handlePlayButtonClickedBind, false);
            this._layoutRoot.querySelector("#details-moreactionsbutton").winControl.addEventListener("invoked", this._showMoreActionsMenuBind, false);
            this._layoutRoot.querySelector("#details-ratingpicker").addEventListener("change", this._handleRatingChangedBind, false);

            // Snap mode button
            playButtonSnapped.winControl.addEventListener("invoked", this._handlePlayButtonClickedBind, false);

            relatedRepeater.template = this._relatedTemplateFunction;

            setImmediate(function updateMetadata() {
                if (!this._layoutRoot.querySelector("#details-pagetitle")) {
                    return;
                }

                // Update the title and overview sections
                this._layoutRoot.querySelector("#details-pagetitle").innerText = this._item.title;

                if (this._item.image) {
                    detailsImage.style.backgroundImage = "url(" + this._item.image + ")";
                    detailsImageSnapped.style.backgroundImage = "url(" + this._item.image + ")";
                }
                if (this._item.title) {
                    detailsMovieTitle.innerText = this._item.title;
                }
                if (this._item.description) {
                    detailsDescription.innerText = this._item.description;
                    detailsDescriptionSnapped.innerText = this._item.description;
                    // Create a new ScrollViewers to host the snapped description
                    var snappedDescriptionScrollViewer = new XboxJS.UI.ScrollViewer(detailsDescription);
                    var snappedDescriptionScrollViewer = new XboxJS.UI.ScrollViewer(detailsDescriptionSnapped);
                }
                if (this._item.contentRating) {
                    detailsRating.innerText = this._item.contentRating;
                }
                if (this._item.releaseDate) {
                    detailsDate.textContent = this._item.releaseDate;
                }
                WinJS.Utilities.removeClass(detailsUserRating, "win-invisible");

            }.bind(this));

            // Update the the state of the queue button depending on whether the item is already in the
            // the user's queue.
            var removeQueueText = WinJS.Resources.getString('actionsButtonRemoveQueue');
            var addQueueText = WinJS.Resources.getString('actionsButtonAddQueue');
            if (this._itemIsInQueue) {
                this._queueButton.querySelector(".win-text-tiletitle").textContent = removeQueueText.value;
                this._queueButtonSnapped.querySelector(".win-text-tiletitle").textContent = removeQueueText.value;

                this._queueButton.winControl.addEventListener("invoked", this._handleRemoveFromQueueBind, false);
                this._queueButtonSnapped.winControl.addEventListener("invoked", this._handleRemoveFromQueueBind, false);
            } else {
                this._queueButton.querySelector(".win-text-tiletitle").textContent = addQueueText.value;
                this._queueButtonSnapped.querySelector(".win-text-tiletitle").textContent = addQueueText.value;

                this._queueButton.winControl.addEventListener("invoked", this._handleAddToQueueBind, false);
                this._queueButtonSnapped.winControl.addEventListener("invoked", this._handleAddToQueueBind, false);
            }

            this.related = new WinJS.Binding.List(this._relatedData);
            setImmediate(function afterOtherDOMOperationsCompleted() {
                if (relatedRepeater) {
                    relatedRepeater.data = this.related;
                }
            }.bind(this));

            // Set up Xbox Pins button under the More Actions menu
            var pinPromise = MyApp.XboxPins.isContentPinnedToHome(this._item);
            this._pagePromises.push(pinPromise.then(function success(isPinned) {
                var pinToHomeText = WinJS.Resources.getString('appBarPinAppLabel');
                var unpinFromHomeText = WinJS.Resources.getString('appBarUnpinAppLabel');
                if (isPinned) {
                    this._pinButton.querySelector(".win-text-tiletitle").textContent = unpinFromHomeText.value;
                    this._pinButton.winControl.addEventListener("invoked", this._handleUnpinMovieFromHomeBind, false);
                } else {
                    this._pinButton.querySelector(".win-text-tiletitle").textContent = pinToHomeText.value;
                    this._pinButton.winControl.addEventListener("invoked", this._handlePinMovieToHomeBind, false);
                }
            }.bind(this)));

            WinJS.Resources.processAll(this._layoutRoot);
        },
        _handlePlayButtonClicked: function () {
            WinJS.Navigation.navigate('/pages/playback/playback.html', this._item);
        },
        _handlePinMovieToHome: function () {
            var unpinFromHomeText = WinJS.Resources.getString('appBarUnpinAppLabel');
            var pinPromise = MyApp.XboxPins.pinContentToHome(this._item);
            this._pagePromises.push(pinPromise.then(function success() {
                this._pinButton.querySelector(".win-text-tiletitle").textContent = unpinFromHomeText.value;

                this._pinButton.winControl.removeEventListener("invoked", this._handlePinMovieToHomeBind);
                this._pinButton.winControl.addEventListener("invoked", this._handleUnpinMovieFromHomeBind);
            }.bind(this)));
            //The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
        },
        _handleUnpinMovieToHome: function () {
            //Pass in the metadata for the Movies shown in the details page
            var pinToHomeText = WinJS.Resources.getString('appBarPinAppLabel');
            var pinPromise = MyApp.XboxPins.unpinContentFromHome(this._item);
            this._pagePromises.push(pinPromise.then(function success() {
                this._pinButton.querySelector(".win-text-tiletitle").textContent = pinToHomeText.value;

                this._pinButton.winControl.removeEventListener("invoked", this._handleUnpinMovieFromHomeBind);
                this._pinButton.winControl.addEventListener("invoked", this._handlePinMovieToHomeBind);
            }.bind(this)));
            //The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
        },
        _handleRatingChanged: function () {
            // TODO: Post the ratings to your rating service
        },
        _handleRemoveFromQueue: function () {
            var addQueueText = WinJS.Resources.getString('actionsButtonAddQueue');
            var queuePromise = MyApp.Services.removeFromQueue(this._item);
            this._pagePromises.push(queuePromise.then(function success() {
                this._queueButton.querySelector(".win-text-tiletitle").textContent = addQueueText.value;
                this._queueButtonSnapped.querySelector(".win-text-tiletitle").textContent = addQueueText.value;

                this._queueButton.winControl.removeEventListener("invoked", this._handleRemoveFromQueueBind);
                this._queueButton.winControl.addEventListener("invoked", this._handleAddToQueueBind);

                this._queueButtonSnapped.winControl.removeEventListener("invoked", this._handleRemoveFromQueueBind);
                this._queueButtonSnapped.winControl.addEventListener("invoked", this._handleAddToQueueBind);
            }.bind(this)));
            // The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
        },
        _handleAddToQueue: function () {
            var removeQueueText = WinJS.Resources.getString('actionsButtonRemoveQueue');
            var queuePromise = MyApp.Services.addToQueue(this._item);
            this._pagePromises.push(queuePromise.then(function success() {
                this._queueButton.querySelector(".win-text-tiletitle").textContent = removeQueueText.value;
                this._queueButtonSnapped.querySelector(".win-text-tiletitle").textContent = removeQueueText.value;

                this._queueButton.winControl.removeEventListener("invoked", this._handleAddToQueueBind);
                this._queueButton.winControl.addEventListener("invoked", this._handleRemoveFromQueueBind);

                this._queueButtonSnapped.winControl.removeEventListener("invoked", this._handleAddToQueueBind);
                this._queueButtonSnapped.winControl.addEventListener("invoked", this._handleRemoveFromQueueBind);
            }.bind(this)));
            //The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
        },

        // A function to render the items in the related items list
        _relatedTemplateFunction: function (item) {
            var mediaTileElement = MyApp.Utilities.loadTile(new XboxJS.UI.MediaTile(), item, "/pages/details/details.html");

            //add the movie tile layout class
            WinJS.Utilities.addClass(mediaTileElement, "win-mediatile-layout-horizontalmovie details-related-button layout-gallerymediatile");

            return mediaTileElement;
        },

        _showMoreActionsMenu: function () {
            var moreActionsButton = this._layoutRoot.querySelector("#details-moreactionsbutton");
            var moreActionsMenu = this._layoutRoot.querySelector("#details-moreactionsmenu");
            moreActionsMenu.winControl.show(moreActionsButton, "right");
        }
    });
})();
