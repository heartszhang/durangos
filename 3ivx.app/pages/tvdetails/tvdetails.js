// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

(function () {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var utils = MyApp.Utilities;

    WinJS.UI.Pages.define("/pages/tvdetails/tvdetails.html", {
        _episodesList: null,
        _episodesData: {},
        _episodesButtonSnapped: null,
        _episodesSnappedItems: null,
        _episodesSnappedMenu: null,
        _handleRatingChangedBind: null,
        _handlePinTVSeriesToHomeBind: null,
        _handleUnpinTVSeriesFromHomeBind: null,
        _hubElement: null,
        _isFirstPageLoad: true,
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: null,
        _moreActionsButton: null,
        _moreActionsMenu: null,
        _queueButton: null,
        _pinButton: null,
        _seasonsList: null,
        _seasonsButtonSnapped: null,
        _seasonsSnappedItems: null,
        _seasonsSnappedMenu: null,
        _seriesData: {},

        _currentSeasonIndex: 0,
        currentSeasonIndex: {
            get: function () {
                return this._currentSeasonIndex;
            }
        },
        _currentEpisodeIndex: 0,
        currentEpisodeIndex: {
            get: function () {
                return this._currentEpisodeIndex;
            }
        },

        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // TODO: Initialize the page here.

            this._layoutRoot = element;
            // Whenever we make a service call it is a good idea to push that service call's promise into the promises array.
            // That way, we have an easy way to cancel all of the outstanding promises. For instance, we cancel all outstanding
            // promises on page navigation.
            this._pagePromises = [];
            var loadPromises = [];

            this.enterPage = this.enterPage.bind(this);
            this.exitPage = this.exitPage.bind(this);
            this._seriesData = options;
            this._handleLoadingStateChangedBind = this._handleLoadingStateChanged.bind(this);

            MyApp.Utilities.showSpinner();

            this._hubElement = this._layoutRoot.querySelector(".tvdetailsHub");

            // Wire up events for pinning
            this._handlePinTVSeriesToHomeBind = this._handlePinTVSeriesToHome.bind(this);
            this._handleUnpinTVSeriesFromHomeBind = this._handleUnpinTVSeriesToHome.bind(this);

            // Make sure we were given a valid item
            if (!options) {
                MyApp.Utilities.showErrorMessage(
                            WinJS.Resources.getString("contentNotFoundErrorDescription").value,
                            WinJS.Resources.getString("contentNotFoundErrorTitle").value
                        );
                return;
            }

            this._itemIsInQueue = false;
            this._pagePromises.push(MyApp.Services.isInQueue(options).then(function (result) {
                this._itemIsInQueue = result;
            }.bind(this)));

            // Preload data for default season
            this._preloadedSeasonData = null;
            this._pagePromises.push(MyApp.Services.Season.getData(0).then(function (result) {
                this._preloadedSeasonData = result;
            }.bind(this)));

            // Preload data for the default selected episode of default season
            this._preloadedEpisodeData = null;
            this._pagePromises.push(MyApp.Services.Episodes.getData(0).then(function (result) {
                this._preloadedEpisodeData = result;
            }.bind(this)));

            loadPromises.push(new WinJS.Promise(function (complete) {
                var loadState = function (ev) {
                    if (ev.detail &&
                        ev.detail.loadingState === XboxJS.UI.Hub.LoadingState.complete) {
                        this._hubElement.winControl.removeEventListener("loadingstatechanged", loadState);
                        complete();
                    }
                }.bind(this);
                this._hubElement.winControl.addEventListener("loadingstatechanged", loadState, false);
            }.bind(this)));

            // The 'loadPromises' promise is all the data you want to wait for until loading the Hub control.
            // You may only want to wait for the section that are in view if some of the sections that are not in
            // view take longer to load than the sections in view.
            loadPromises = WinJS.Promise.join(loadPromises.concat(this._pagePromises));

            // Remove the splash screen once the data is loaded
            loadPromises.then(function success() {
                this._handleLoadingStateChangedBind();
                MyApp.Utilities.SplashScreen.remove();
            }.bind(this),
            function error() {
                // TODO: Show error UI
            }).then(function () {
                MyApp.Utilities.hideSpinner();
            });

            MyApp.Utilities.Animation.useCustomHubEntranceAnimation(this._layoutRoot.querySelector(".tvdetailsHub"), loadPromises);
        },

        enterPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.enterPage(this._layoutRoot, isBackNavigation);
        },

        exitPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.exitPage(this._layoutRoot, isBackNavigation);
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.
            this._hubElement.winControl.removeEventListener("loadingstatechanged", this._handleLoadingStateChangedBind);

            // Cancel any outstanding promises so that they don't get called after the page goes away
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
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    this._updateSnappedSeasonInformation();
                }
                var initialFocusElementSelector = "";
                var seriesDescription = this._layoutRoot.querySelector(".tvdetails-layout-description");
                var seriesDescriptionSnapped = this._layoutRoot.querySelector("#tvdetails-description-snapped");
                if (viewState === appViewState.snapped) {
                    initialFocusElementSelector = "#tvdetails-playbutton-snapped";
                    if (seriesDescriptionSnapped) {
                        seriesDescriptionSnapped.winControl.refresh();
                    }
                } else {
                    initialFocusElementSelector = "#tvdetails-playbutton";
                    if (seriesDescription) {
                    seriesDescription.winControl.refresh();
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
        _handleLoadingStateChanged: function (ev) {
            // If options is null, then there is no series data, then we have hit
            // an error case. The better solution would be to show error UI that explains
            // To the user what happened and gives them an option to navigate back.
            if (!this._seriesData) {
                return;
            }

            this._episodesList = this._layoutRoot.querySelector(".episodeslist").winControl;
            this._moreActionsButton = this._layoutRoot.querySelector("#tvdetails-moreactionsbutton");
            this._moreActionsMenu = this._layoutRoot.querySelector("#tvdetails-moreactionsmenu").winControl;
            this._pinButton = this._layoutRoot.querySelector("#tvdetails-pinbutton");
            this._queueButton = document.querySelector("#tvdetails-queuebutton");
            this._seasonsList = this._layoutRoot.querySelector(".seasonslist").winControl;
            this._handleRatingChangedBind = this._handleRatingChanged.bind(this);
            this._handleSeasonMenuChangedBind = this._handleSeasonMenuChanged.bind(this);
            this._handleEpisodeMenuChangedBind = this._handleEpisodeMenuChanged.bind(this);

            // Hook up button handlers
            this._seasonsSnappedMenu = this._layoutRoot.querySelector("#tvdetails-seasonsmenu-snapped").winControl;
            this._episodesSnappedMenu = this._layoutRoot.querySelector("#tvdetails-episodesmenu-snapped").winControl;

            this._layoutRoot.querySelector("#tvdetails-pagetitle").textContent = this._seriesData.title;
            this._moreActionsButton.winControl.addEventListener("invoked", this._showMoreActionsMenu.bind(this), false);
            this._layoutRoot.querySelector("#tvdetails-ratingpicker").addEventListener("change", this._handleRatingChangedBind, false);
            this._hubElement.querySelector("#tvdetails-playbutton").winControl.addEventListener("invoked", this._playSeries.bind(this), false);
            this._hubElement.querySelector("#tvdetails-episode-playbutton").winControl.addEventListener("invoked", this._playEpisode.bind(this), false);

            this._layoutRoot.querySelector("#tvdetails-playbutton-snapped").winControl.addEventListener("invoked", this._playEpisode.bind(this), false);
            this._seasonsSnappedMenu.addEventListener("change", this._handleSeasonMenuChangedBind, false);
            this._episodesSnappedMenu.addEventListener("change", this._handleEpisodeMenuChangedBind, false);

            this._layoutRoot.querySelector(".tvdetails-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);

            // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
            setImmediate(function afterPageRenderingHasFinished() {
                var initialFocusElement = null;
                if (appView.value === appViewState.snapped) {
                    initialFocusElement = this._layoutRoot.querySelector("#tvdetails-playbutton-snapped");
                } else {
                    initialFocusElement = this._hubElement.querySelector("#tvdetails-playbutton");
                }
                if (initialFocusElement) {
                    initialFocusElement.focus();
                }
            }.bind(this));
            
            // Create a binding list for the seasons and use it to populate the UI
            var seasons = [];
            var numberOfSeasons = this._seriesData.seasons;
            var localizedSeasonString = WinJS.Resources.getString("tvdetailsSeasonLabel").value;
            for (var currentSeason = 0; currentSeason < numberOfSeasons; currentSeason++) {
                seasons.push(localizedSeasonString + (currentSeason + 1));
            }
            this._seasonsList.template = this._renderSeasonsListItem;
            this._seasonsList.data = new WinJS.Binding.List(seasons);

            // Convert the list of seasons into the format expected by the ListPicker UI when Snapped
            // { id: <string>, label: <string> }
            this._seasonsSnappedItems = [];
            this._seasonsSnappedMenu.label = WinJS.Resources.getString("tvDetailsChooseSeasonLabel").value;
            var localizedSeasonString = WinJS.Resources.getString("tvdetailsSeasonLabel").value;
            for (var i = 0; i < seasons.length; i++) {
                this._seasonsSnappedItems.push({ id: i, label: localizedSeasonString + (i + 1) });
            }
            this._seasonsSnappedItems[0].selected = true;
            this._seasonsSnappedMenu.items = new WinJS.Binding.List(this._seasonsSnappedItems);

            // Convert the list of seasons into the format expected by the ListPicker UI when Snapped
            // { id: <string>, label: <string> }
            this._episodesSnappedItems = [];
            this._episodesSnappedMenu.label = WinJS.Resources.getString("tvDetailsChooseEpisodeLabel").value;
            var localizedEpisodeString = WinJS.Resources.getString("tvdetailsEpisodeLabel").value;
            for (var i = 0; i < seasons.length; i++) {
                this._episodesSnappedItems.push({ id: i, label: localizedEpisodeString + (i + 1) });
            }

            this._episodesSnappedItems[0].selected = true;
            this._episodesSnappedMenu.items = new WinJS.Binding.List(this._episodesSnappedItems);

            this._episodesList.template = this._renderEpisodesListItem;

            // We have special logic for the last episode so that pressing down stays on the episodes list.
            // We accomplish this by setting a manual override of the automatic focus algorithm on the last
            // element in the list to go back to itself when down is pressed. We also set the "left" override
            // because that was previously set in HTML and we don't want to get rid of it.
            var lastSeasonButton = this._seasonsList.elementFromIndex(numberOfSeasons - 1);
            WinJS.Utilities.addClass(lastSeasonButton, "last-seasonlistitem");
            lastSeasonButton.setAttribute("data-win-focus", "{ right: '.tvdetails-episode:first-child', down: '.last-seasonlistitem' }");

            // Setup Series Metadata
            var seriesTitle = this._layoutRoot.querySelector("#tvdetails-seasontitle");
            var seariesImage = this._layoutRoot.querySelector("#tvdetails-seriesimage");
            var contentRating = this._layoutRoot.querySelector("#tvdetails-metadata-rating");
            var seasonCount = this._layoutRoot.querySelector("#tvdetails-metadata-numberofseasons");
            var seriesDescription = this._layoutRoot.querySelector("#tvdetails-metadata-description");
            var seriesDescriptionSnapped = this._layoutRoot.querySelector("#tvdetails-description-snapped");
            var seasonsListLabel = WinJS.Resources.getString('tvdetailsHubSectionSeasonsLabel');
            var seriesDate = this._layoutRoot.querySelector("#tvdetails-date");

            setImmediate(function afterDOMOperationCompeted() {
                if (!this._layoutRoot.querySelector("#tvdetails-pagetitle")) {
                    return;
                }

                this._layoutRoot.querySelector("#tvdetails-pagetitle").textContent = this._seriesData.title;
                seriesTitle.textContent = this._seriesData.title;
                seariesImage.style.backgroundImage = "url('" + this._seriesData.image + "')";
                contentRating.textContent = this._seriesData.contentRating;
                seasonCount.textContent = this._seriesData.seasons + " " + seasonsListLabel.value;
                seriesDescription.innerText = this._seriesData.description;
                seriesDescriptionSnapped.innerText = this._seriesData.description;
                // Create a new ScrollViewers to host the snapped description
                var snappedDescriptionScrollViewer = new XboxJS.UI.ScrollViewer(seriesDescription);
                var snappedDescriptionScrollViewer = new XboxJS.UI.ScrollViewer(seriesDescriptionSnapped);

                seriesDate.textContent = this._seriesData.releaseDate;
            }.bind(this));

            // Populate the initial season and episode
            this.updateSeason(0, true).done(function () {
                if (this._episodesData.length > 0) {
                    this.updateEpisode(0);
                }
            }.bind(this));


            var removeQueueText = WinJS.Resources.getString('actionsButtonRemoveQueue');
            var addQueueText = WinJS.Resources.getString('actionsButtonAddQueue');
            if (this._itemIsInQueue) {
                var queueButtonText = this._queueButton.querySelector(".win-text-tiletitle");
                queueButtonText.textContent = removeQueueText.value;
                this._queueButton.winControl.addEventListener("invoked", this._handleRemoveFromQueue.bind(this), false);
            }
            else {
                var queueButtonText = this._queueButton.querySelector(".win-text-tiletitle");
                queueButtonText.textContent = addQueueText.value;
                this._queueButton.winControl.addEventListener("invoked", this._handleAddToQueue.bind(this), false);
            }

            // Create an "onfocus" handler for the season items so that when a user selects a season we update
            // the metadata for that season.
            for (var currentSeason = 0, len = this._seriesData.seasons; currentSeason < len; currentSeason++) {
                var seasonButton = this._seasonsList.elementFromIndex(currentSeason);
                seasonButton.addEventListener("focus", (function generateSeasonFocusHandler(currentSeason) {
                    return function handleItemFocused() {
                        this.updateSeason(currentSeason);
                    }.bind(this);
                }.bind(this))(currentSeason, seasonButton));

                seasonButton.winControl.addEventListener("invoked", (function generateSeasonInvokedHandler(currentSeason) {
                    return function handleItemInvoked() {
                        this.updateSeason(currentSeason);
                    }.bind(this);
                }.bind(this))(currentSeason, seasonButton));
            }

            // The following code scrolls the season hub section into view
            var episodeMetadataHubSection = this._hubElement.winControl.sections.getAt(2).contentElement;
            episodeMetadataHubSection.addEventListener("focusin", function slideToTheRight(ev) {
                setImmediate(function afterWaitForOtherDOMOperationToCompete() {
                    if (ev.relatedTarget &&
                        ev.relatedTarget.parentNode &&
                        WinJS.Utilities.hasClass(ev.relatedTarget.parentNode, "tvdetails-layout-overview-buttons")) {
                        this._hubElement.winControl.sectionOnScreen = 4;
                    }
                }.bind(this));

                if (this._isFirstPageLoad) {
                    var firstSeason = this._seasonsList.elementFromIndex(0);
                    if (firstSeason) {
                        setImmediate(
                            function afterFocusChanged() {
                                this._currentSeason = 0;
                                setImmediate(function afterPageRenderingHasFinished() {
                                    if (firstSeason) {
                                        firstSeason.focus();
                                    }
                                });
                            }.bind(this));
                    }
                    this._isFirstPageLoad = false;
                }
            }.bind(this));

            // Update the season count
            this._hubElement.winControl.sections.getAt(2).header = seasonsListLabel.value + " (" + this._seasonsList.data.length + ")";

            // We need to remove the event listener otherwise, the initialization code will execute again
            this._hubElement.winControl.removeEventListener("loadingstatechanged", this._handleLoadingStateChangedBind);

            // Set up Xbox Pins button under the More Actions menu
            var isPinnedPromise = MyApp.XboxPins.isContentPinnedToHome(this._seriesData);
            this._pagePromises.push(isPinnedPromise
                .then(
                    function success(isPinned) {
                        var pinToHomeText = WinJS.Resources.getString('appBarPinAppLabel');
                        var unpinFromHomeText = WinJS.Resources.getString('appBarUnpinAppLabel');
                        if (isPinned) {
                            this._pinButton.querySelector(".win-text-tiletitle").textContent = unpinFromHomeText.value;
                            this._pinButton.winControl.addEventListener("invoked", this._handleUnpinTVSeriesFromHomeBind, false);
                        } else {
                            this._pinButton.querySelector(".win-text-tiletitle").textContent = pinToHomeText.value;
                            this._pinButton.winControl.addEventListener("invoked", this._handlePinTVSeriesToHomeBind, false);
                        }
                    }.bind(this),
                    function error() {
                        // TODO: Log the error and fail silently.
                    }));

            // Process resources
            WinJS.Resources.processAll(this._layoutRoot);

            // Attach an event listener that refreshes the ScrollViewer visuals any time the episodes list changes. The reason this is because
            // it is possible for the ScrollViewer to get into a state where it cannot be scrolled with gesture. For instance, if when it is
            // instantiated, all of its content is visible then the ScrollViewer will not be scrollable with gesture. But if the list of episodes is
            // updated such that scrolling is required, the ScrollViewer's internal state needs to be refreshed to enable scrolling.
            var episodesScrollViewer = this._layoutRoot.querySelector(".episodeshubsection");
            this._episodesList.addEventListener("itemsloaded", function () {
                episodesScrollViewer.winControl.refresh();
            }.bind(this), false);

        },
        _handlePinTVSeriesToHome: function () {
            var unpinFromHomeText = WinJS.Resources.getString('appBarUnpinAppLabel');
            var pinPromise = MyApp.XboxPins.pinContentToHome(this._seriesData);
            this._pagePromises.push(pinPromise.then(function success() {
                this._pinButton.querySelector(".win-text-tiletitle").textContent = unpinFromHomeText.value;
                this._pinButton.winControl.removeEventListener("invoked", this._handlePinTVSeriesToHomeBind);
                this._pinButton.winControl.addEventListener("invoked", this._handleUnpinTVSeriesFromHomeBind);
            }.bind(this)));
            // The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
        },
        _handleUnpinTVSeriesToHome: function () {
            // Pass in the metadata for the Movies shown in the details page
            var pinToHomeText = WinJS.Resources.getString('appBarPinAppLabel');
            var pinPromise = MyApp.XboxPins.unpinContentFromHome(this._seriesData);
            this._pagePromises.push(pinPromise.then(function success() {
                this._pinButton.querySelector(".win-text-tiletitle").textContent = pinToHomeText.value;
                this._pinButton.winControl.removeEventListener("invoked", this._handleUnpinTVSeriesFromHomeBind);
                this._pinButton.winControl.addEventListener("invoked", this._handlePinTVSeriesToHomeBind);
            }.bind(this)));
            // The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
        },
        updateSeason: function (value, useCachedData) {
            return new WinJS.Promise(function (complete) {
                var oldSeasonIndex = this._currentSeasonIndex;
                this._currentSeasonIndex = value;

                // Remove the selection background color from the previously selected season.
                // Add the selection background color to the current selected season.
                var oldSeasonElement = this._seasonsList.elementFromIndex(oldSeasonIndex);
                var currentSeasonElement = this._seasonsList.elementFromIndex(value);
                WinJS.Utilities.removeClass(oldSeasonElement, "tvdetails-selectedseason");
                WinJS.Utilities.addClass(currentSeasonElement, "tvdetails-selectedseason");

                var getEpisodesCallback = null;
                if (useCachedData) {
                    getEpisodesCallback = function getFromPreloadedData(value) {
                        return WinJS.Promise.wrap(this._preloadedEpisodeData);
                    }.bind(this);
                } else {
                    getEpisodesCallback = MyApp.Services.Episodes.getData;
                }

                // Get the list of episodes for the new season
                var episodesPromise = getEpisodesCallback(value);
                this._pagePromises.push(episodesPromise.then(function success(results) {
                    var episodes = [];
                    var numberOfEpisodes = results.length;
                    var localizedEpisodeString = WinJS.Resources.getString("tvdetailsEpisodeLabel").value;

                    // Wait for repeater to update it's element list
                    document.querySelector(".episodeslist").winControl.addEventListener("itemsloaded", function () {
                        this._updateSeasonInformation(useCachedData);
                        complete();
                    }.bind(this));

                    // Create a binding list with the episodes to populate the UI
                    for (var currentEpisode = 0; currentEpisode < numberOfEpisodes; currentEpisode++) {
                        episodes.push(localizedEpisodeString + (currentEpisode + 1));
                    }
                    this._episodesList.data = new WinJS.Binding.List(episodes);
                    this._episodesData = results;

                    // Add click handlers to each episode button
                    var numberOfEpisodes = this._episodesList.data.length;
                    for (var currentEpisode = 0; currentEpisode < numberOfEpisodes; currentEpisode++) {
                        var episodeButton = this._episodesList.elementFromIndex(currentEpisode);

                        episodeButton.addEventListener("focus", (function generateEpisodeFocusChangedHandler(currentEpisode) {
                            return function handleItemFocused() {
                                this.updateEpisode(currentEpisode);
                                this._updateEpisodeMetadata();
                            }.bind(this);
                        }.bind(this))(currentEpisode));

                        episodeButton.winControl.addEventListener("invoked", (function generateEpisodeInvokedHandler(currentEpisode) {
                            return function handleItemInvoked() {
                                this.updateEpisode(currentEpisode);
                                this._updateEpisodeMetadata();
                            }.bind(this);
                        }.bind(this))(currentEpisode));
                    }

                    if (numberOfEpisodes > 0) {
                        // We have special logic for the last episode so that pressing down stays on the episodes list.
                        // We accomplish this by setting a manual override of the automatic focus algorithm on the last
                        // element in the list to go back to itself when down is pressed. We also set the "left" override
                        // because that was previously set in HTML and we don't want to get rid of it.
                        var lastEpisodeButton = this._episodesList.elementFromIndex(numberOfEpisodes - 1);
                        WinJS.Utilities.addClass(lastEpisodeButton, "last-episodelistitem");
                        lastEpisodeButton.setAttribute("data-win-focus", "{ left: '.tvdetails-selectedseason', down: '.last-episodelistitem' }");
                    }

                    if (numberOfEpisodes === 0) {
                        // If the current season has no episodes, don't allow focus to move to the play button
                        currentSeasonElement.setAttribute("data-win-focus", "{ right: '.tvdetails-selectedseason' }");
                    }

                    // Update the episode count
                    var episodeListLabel = WinJS.Resources.getString('tvdetailsHubSectionEpisodesLabel');
                    this._hubElement.winControl.sections.getAt(3).header = episodeListLabel.value + " (" + numberOfEpisodes + ")";
                }.bind(this)));
            }.bind(this));

        },
        updateEpisode: function (value) {
            return new WinJS.Promise(function (complete) {
                var oldEpisodeIndex = this._currentEpisodeIndex;
                this._currentEpisodeIndex = value;

                // Remove the selection background color from the previously selected episode.
                // Add the selection background color to the current selected episode.
                var oldEpisodeElement = this._episodesList.elementFromIndex(oldEpisodeIndex);
                var currentEpisodeElement = this._episodesList.elementFromIndex(this._currentEpisodeIndex);

                // When the page initially loads there won't be an old episode so we need to check
                // that the old episode element exists first before changing its class.
                if (oldEpisodeElement) {
                    WinJS.Utilities.removeClass(oldEpisodeElement, "tvdetails-selectedepisode");
                }
                WinJS.Utilities.addClass(currentEpisodeElement, "tvdetails-selectedepisode");
                complete();
            }.bind(this));
        },
        _handleRatingChanged: function () {
            // TODO: Post the ratings to your rating service
        },
        _handleRemoveFromQueue: function () {
            var addQueueText = WinJS.Resources.getString('actionsButtonAddQueue');
            var queuePromise = MyApp.Services.removeFromQueue(this._seriesData);
            this._pagePromises.push(queuePromise.then(function success() {
                this._queueButton.querySelector(".win-text-tiletitle").textContent = addQueueText.value;
                this._queueButton.winControl.removeEventListener("invoked", this._handleRemoveFromQueue.bind(this));
                this._queueButton.winControl.addEventListener("invoked", this._handleAddToQueue.bind(this));
            }.bind(this)));
            //The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
        },
        _handleAddToQueue: function () {
            var removeQueueText = WinJS.Resources.getString('actionsButtonRemoveQueue');
            var queuePromise = MyApp.Services.addToQueue(this._seriesData);
            this._pagePromises.push(queuePromise.then(function success() {
                this._queueButton.querySelector(".win-text-tiletitle").textContent = removeQueueText.value;
                this._queueButton.winControl.removeEventListener("invoked", this._handleAddToQueue.bind(this));
                this._queueButton.winControl.addEventListener("invoked", this._handleRemoveFromQueue.bind(this));
            }.bind(this)));
            // The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
        },

        _playSeries: function () {
            var dataPromise = MyApp.Services.Episodes.getData(0);
            this._pagePromises.push(dataPromise.then(function (results) {
                WinJS.Navigation.navigate('/pages/playback/playback.html', results[0]);
            }));
        },
        _playEpisode: function () {
            if (this._episodesData[this.currentEpisodeIndex]) {
                WinJS.Navigation.navigate('/pages/playback/playback.html', this._episodesData[this.currentEpisodeIndex]);
            }
        },
        _handleSeasonMenuChanged: function (ev) {
            var newSeason = ev.detail.selectedItems.getAt(0).id;
            this.updateSeason(newSeason);
        },
        _handleEpisodeMenuChanged: function (ev) {
            var newEpisodeIndex = ev.detail.selectedItems.getAt(0).id;
            this.updateEpisode(newEpisodeIndex);
        },
        _showMoreActionsMenu: function () {
            this._moreActionsMenu.show(this._moreActionsButton, "right");
        },
        // A helper function to update the metadata on the right when a new episode is selected.
        _updateEpisodeMetadata: function () {
            var episodeImage = this._layoutRoot.querySelector("#tvdetails-episodeimage");
            var episodeTitle = this._layoutRoot.querySelector(".text-episode-title");
            var episodeDuration = this._layoutRoot.querySelector(".text-episode-metadata");
            var episodeDescription = this._layoutRoot.querySelector("#tvdetails-episode-description");

            var currentEpisode = this._episodesData[this.currentEpisodeIndex];

            if (currentEpisode.image) {
                episodeImage.style.backgroundImage = "url(" + currentEpisode.image + ")";
            }

            episodeTitle.textContent = currentEpisode.title;
            episodeDuration.textContent = currentEpisode.length;
            episodeDescription.textContent = currentEpisode.description;
        },
        // A helper function to update the metadata on the right when a new season is selected.
        _updateSeasonInformation: function (useCachedData) {
            var seasonsListLabel = WinJS.Resources.getString('tvdetailsHubSectionSeasonsLabel');
            var numberOfEpisodesLabel = WinJS.Resources.getString('tvdetailsNumberOfEpisodeLabel');

            var getSeasonMetadataCallback = null;
            if (useCachedData) {
                getSeasonMetadataCallback = function getFromPreloadedData() {
                    return WinJS.Promise.wrap(this._preloadedSeasonData);
                }.bind(this);
            } else {
                getSeasonMetadataCallback = MyApp.Services.Season.getData;
            }

            // Get the metadata for the season and use that data to populate the UI
            var seasonMetadataPromise = getSeasonMetadataCallback(this.currentSeasonIndex);
            this._pagePromises.push(seasonMetadataPromise.then(function success(seasonData) {
                if (seasonData[0]) {
                    var seasonImage = this._layoutRoot.querySelector("#tvdetails-episodeimage");
                    var seasonTitle = this._layoutRoot.querySelector(".text-episode-title");
                    var seasonMetadata = this._layoutRoot.querySelector(".text-episode-metadata");
                    var seasonDescription = this._layoutRoot.querySelector(".text-metadata-description");
                    var userRating = this._layoutRoot.querySelector("#tvdetails-userrating");

                    if (seasonData[0].image) {
                        seasonImage.style.backgroundImage = "url(" + seasonData[0].image + ")";
                    }

                    seasonTitle.textContent = seasonsListLabel.value + " " + (this.currentSeasonIndex + 1);
                    seasonMetadata.textContent = seasonData[0].episodes + " " + numberOfEpisodesLabel.value;
                    seasonDescription.textContent = seasonData[0].description;

                    WinJS.Utilities.removeClass(userRating, "win-invisible");
                }
            }.bind(this)));
        },
        _updateSnappedSeasonInformation: function () {
            // Update snapped UI to be in sync with full / fill UI
            //Re-bind data to ListPicker controls after setting default item to match what was selected in Full / fill mode.

            //Reset selected season on the underlying data
            for (var i = 0; i < this._seasonsSnappedItems.length - 1; i++) {
                this._seasonsSnappedItems[i].selected = false;
            };
            //Update selected season to match full / fill
            this._seasonsSnappedMenu.items = null;
            this._seasonsSnappedItems[this._currentSeasonIndex].selected = true;
            this._seasonsSnappedMenu.items = new WinJS.Binding.List(this._seasonsSnappedItems);
          
            //Reset selected episode on the underlying data
            for (var i = 0; i < this._episodesSnappedItems.length - 1; i++) {
                this._episodesSnappedItems[i].selected = false;
            };
            //Update selected episode to match full / fill
            this._episodesSnappedMenu.items = null;
            this._episodesSnappedItems[this._currentEpisodeIndex].selected = true;
            this._episodesSnappedMenu.items = new WinJS.Binding.List(this._episodesSnappedItems);

        },

        // A function to render a season in the seasons list
        _renderSeasonsListItem: function (seasonItem) {
            var containerElement = document.createElement("div");
            var textElement = document.createElement("div");

            textElement.textContent = seasonItem;
            WinJS.Utilities.addClass(textElement, "win-text-tiletitle win-voice-inactivetext");

            containerElement.setAttribute("data-win-voice", "{ srcElement: select('.win-text-tiletitle'), targetElement: select('.win-voice-textdisplay') }");
            containerElement.appendChild(textElement);

            WinJS.Utilities.addClass(containerElement, "win-tile-centeredtext");
            containerElement.setAttribute("data-win-focus", "{ right: '.tvdetails-episode:first-child' }");

            var seasonItemContainer = new XboxJS.UI.ItemContainer(containerElement);

            return containerElement;
        },

        // A function to render an episode in the episodes list
        _renderEpisodesListItem: function (episodeItem) {
            var containerElement = document.createElement("div");
            var textElement = document.createElement("div");

            textElement.textContent = episodeItem;
            WinJS.Utilities.addClass(textElement, "win-text-tiletitle win-voice-inactivetext");

            containerElement.setAttribute("data-win-voice", "{ srcElement: select('.win-text-tiletitle'), targetElement: select('.win-voice-textdisplay') }");
            containerElement.appendChild(textElement);

            WinJS.Utilities.addClass(containerElement, "tvdetails-episode win-tile-centeredtext");
            containerElement.setAttribute("data-win-focus", "{ left: '.tvdetails-selectedseason' }");

            var episodeItemContainer = new XboxJS.UI.ItemContainer(containerElement);

            return containerElement;
        }
    });
})();
