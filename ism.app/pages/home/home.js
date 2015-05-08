// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

/*global WinJS: true*/

(function () {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var wuiv = Windows.UI.ViewManagement;

    var moreActionsButton = null;
    var searchButton = null;
    var utils = MyApp.Utilities;

    WinJS.UI.Pages.define("/pages/home/home.html", {
        _afterShowMoreActionsMenuBind: null,
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: {},
        _handleLoadingStateChangedBind: null,
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
            // Whenever we make a service call it is a good idea to push that service call's promise into the promises array.
            // That way, we have an easy way to cancel all of the outstanding promises. For instance, we cancel all outstanding
            // promises on page navigation.
            this._pagePromises = [];
            this.enterPage = this.enterPage.bind(this);
            this.exitPage = this.exitPage.bind(this);

            if (!MyApp.Utilities.SplashScreen.isVisible()) {
                MyApp.Utilities.showSpinner()
            }

            this._hubElement = this._layoutRoot.querySelector("#landing-hub").winControl;
            this._afterShowMoreActionsMenuBind = this._afterShowMoreActionsMenu.bind(this);
            this._handleLoadingStateChangedBind = this._handleLoadingStateChanged.bind(this);
            this._showMoreActionsMenu = this._showMoreActionsMenu.bind(this);

            var loadPromises = [];
            loadPromises.push(new WinJS.Promise(function (complete, error) {
                var loadingState = function (ev) {
                    if (ev.detail &&
                        ev.detail.loadingState === XboxJS.UI.Hub.LoadingState.complete) {
                        this._hubElement.removeEventListener("loadingstatechanged", loadingState);
                        complete();
                    }
                }.bind(this);
                this._hubElement.addEventListener("loadingstatechanged", loadingState, false);
            }.bind(this)));

            // Start loading the data we need in the ready event so the web requests can be made in parallel to
            // loading the UI needed for the page.
            this._featuredData = [];
            this._pagePromises.push(MyApp.Services.Movies.getFeaturedData().then(function (results) {
                this._featuredData = results;
            }.bind(this)));

            this._newReleasesMoviesData = [];
            this._pagePromises.push(MyApp.Services.Movies.getNewReleaseData().then(function (results) {
                this._newReleasesMoviesData = results;
            }.bind(this)));

            this._newReleaseTVData = [];
            this._pagePromises.push(MyApp.Services.Series.getNewReleaseData().then(function (results) {
                this._newReleaseTVData = results;
            }.bind(this)));

            // The 'loadPromises' promise is all the data you want to wait for until loading the Hub control.
            // You may only want to wait for the section that are in view if some of the sections that are not in
            // view take longer to load than the sections in view.
            loadPromises = WinJS.Promise.join(loadPromises.concat(this._pagePromises));

            // Remove the splash screen once the data is loaded
            loadPromises
                .then(
                    function success() {
                        this._handleLoadingStateChangedBind();
                        MyApp.Utilities.SplashScreen.remove();
                    }.bind(this),
                    function error() {
                        MyApp.Utilities.showErrorMessage(
                                WinJS.Resources.getString("networkErrorDescription").value,
                                WinJS.Resources.getString("networkErrorTitle").value
                            );
                    }).then(function () {
                        MyApp.Utilities.hideSpinner();
                    });

            // Use a custom Hub entrance animation
            MyApp.Utilities.Animation.useCustomHubEntranceAnimation(this._hubElement, loadPromises);
            this._hubElement.addEventListener("loadingstatechanged", this._handleLoadingStateChangedBind, false);
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.

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

            // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
            if (lastViewState !== viewState) {
                var initialFocusElement = null;
                if (wuiv.ApplicationView.value !== wuiv.ApplicationViewState.snapped) {
                    initialFocusElement = this._layoutRoot.querySelector(".win-focusable");
                } else {
                    initialFocusElement = this._layoutRoot.querySelector(".landing-snapped-overlay").querySelector(".win-focusable");
                }

                if (initialFocusElement) {
                    initialFocusElement.focus();
                }
            }
        },

        _handleGoFullScreenButtonInvoked: function () {
            Windows.UI.ViewManagement.ApplicationView.tryUnsnap();
        },

        // This method is where you want to perform initialization logic. It's better to put your initialization
        // code here rather than the ready function, because not all of your UI has loaded when the ready function is called.
        // This is because both the TabView, Hub and ListView load asynchronously.
        _handleLoadingStateChanged: function () {
            // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
            // When in doubt, pick the top, left element.
            setImmediate(function afterPageRenderingHasFinished() {
                var initialFocusElement = null;
                if (wuiv.ApplicationView.value !== wuiv.ApplicationViewState.snapped) {
                    initialFocusElement = this._layoutRoot.querySelector(".win-focusable");
                } else {
                    initialFocusElement = this._layoutRoot.querySelector(".landing-snapped-overlay").querySelector(".win-focusable");
                }

                if (initialFocusElement) {
                    initialFocusElement.focus();
                }
            }.bind(this));

            // Get all the new items, assign their MediaTile's metadata properties
            // and create click handlers that navigate to the details page.
            var featuredItems = document.querySelectorAll(".featureditem");
            for (var i = 0; i < featuredItems.length; i++) {
                MyApp.Utilities.loadTile(featuredItems[i].winControl, this._featuredData[i], "/pages/details/details.html");
            }

            // The following code scrolls the entire section of the hub into view when the user moves focus to
            // the buttons list on the left of the page. Without this code, the buttons would only scroll
            // barely into view.
            var landingHub = this._layoutRoot.querySelector("#landing-hub").winControl;
            var actionButtonsHubSection = landingHub.sections.getAt(0).contentElement;
            actionButtonsHubSection.addEventListener("focusin", function slideToTheLeft() {
                landingHub.sectionOnScreen = 0;
            });

            var browseMoviesButton = this._layoutRoot.querySelector("#snapped-movies-browse");
            browseMoviesButton.winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: WinJS.Resources.getString("browsemoviesPageTitle").value, items: this._newReleasesMoviesData });
            }.bind(this));

            document.querySelector("#landing-morefeaturedmovies").winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: WinJS.Resources.getString("featuredMoviesPageTitle").value, items: this._newReleasesMoviesData });
            }.bind(this));

            // Get all the new items, assign their MediaTile's metadata properties
            // and create click handlers that navigate to the details page.
            var newMovies = document.querySelectorAll(".newmovie");
            for (var i = 0; i < newMovies.length; i++) {
                MyApp.Utilities.loadTile(newMovies[i].winControl, this._newReleasesMoviesData[i], "/pages/details/details.html");
            }

            // Get all the new releases items, assign their MediaTile's metadata properties
            // and create click handlers that navigate to the details page.
            var browseTVButton = document.querySelector("#snapped-tv-browse");
            browseTVButton.winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: WinJS.Resources.getString("browsetvPageTitle").value, items: this._newReleaseTVData });
            }.bind(this));

            document.querySelector("#landing-morefeaturedtv").winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: WinJS.Resources.getString("browseNewMoviesPageTitle").value, items: this._newReleasesMoviesData });
            }.bind(this));

            // The New TV section is an example of a hub section, that features a dynamic number of content tiles
            var newTVRepeater = this._layoutRoot.querySelector("#landing-newtv").winControl;
            newTVRepeater.template = this._newTVTemplateFunction;
            newTVRepeater.data = new WinJS.Binding.List(this._newReleaseTVData);

            // Add Search
            this._layoutRoot.querySelector("#landing-searchbutton").winControl.addEventListener("invoked", MyApp.Utilities.Search.handleSearchButtonInvoked, false);

            // Add Browse All
            this._layoutRoot.querySelector("#landing-browseall").addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', {
                    pageTitle: WinJS.Resources.getString("browseallPageTitle").value,
                    virtualizedDataFunction: MyApp.Services.getAllContentRange,
                    getMaxResultsCountFunction: MyApp.Services.getMaxBrowseAllResultsCount
                });
            });

            // Hook up the queue button
            var queueButton = this._layoutRoot.querySelector("#landing-queuebutton");
            queueButton.winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/queue/queue.html');
            });

            // Hook up the "More actions" menu
            moreActionsButton = this._layoutRoot.querySelector("#landing-moreactionsbutton");
            this._layoutRoot.querySelector("#landing-moreactionsmenu").winControl.addEventListener("aftershow", this._afterShowMoreActionsMenuBind, false);
            moreActionsButton.winControl.addEventListener("invoked", this._showMoreActionsMenu, false);

            this._layoutRoot.querySelector(".landing-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);

            this._layoutRoot.querySelector("#landing-hub").removeEventListener("loadingstatechanged", this._handleLoadingStateChangedBind);

            // Process resources
            WinJS.Resources.processAll(this._layoutRoot);
        },

        _afterShowMoreActionsMenu: function () {
            // Set focus to an element in the flyout.
            // TODO - Change this to the element the user is most likely to interact with.
            setImmediate(function afterDomOperationsCompleted() {
                var initialfocusElement = this._layoutRoot.querySelector("#landing-moreactionsmenu .win-focusable");
                if (initialfocusElement) {
                    initialfocusElement.focus();
                }
            }.bind(this));
        },

        _showMoreActionsMenu: function () {
            var moreActionsMenu = this._layoutRoot.querySelector("#landing-moreactionsmenu").winControl;
            moreActionsMenu.show(moreActionsButton, "right");
        },

        // A function to render the items in the favorites list
        _newTVTemplateFunction: function (item) {
            var mediaTileItemContainer = document.createElement("div");
            WinJS.Utilities.addClass(mediaTileItemContainer, "win-mediatile-layout-horizontalmovie");

            var mediaTile = new XboxJS.UI.MediaTile(mediaTileItemContainer);
            MyApp.Utilities.loadTile(mediaTile, item, "/pages/tvdetails/tvdetails.html");

            return mediaTileItemContainer;
        }
    });

})();
