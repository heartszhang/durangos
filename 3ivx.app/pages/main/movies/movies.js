// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

/*global WinJS: true*/

(function () {
    "use strict";

    var utils = MyApp.Utilities;

    WinJS.UI.Pages.define("/pages/main/movies/movies.html", {
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: null,
        _handleLoadingStateChangedBind: null,
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
            this._handleLoadingStateChangedBind = this._handleLoadingStateChanged.bind(this);
            this._hub = this._layoutRoot.querySelector(".hub-movies").winControl;
            this._hub.addEventListener("loadingstatechanged", this._handleLoadingStateChangedBind, false);

            this._newReleaseData = [];
            this._pagePromises.push(MyApp.Services.Movies.getNewReleaseData().then(function success(results) {
                this._newReleaseData = results;
            }.bind(this)));

            this._getPopularData = [];
            this._pagePromises.push(MyApp.Services.Movies.getPopularData().then(function success(results) {
                this._getPopularData = results;
            }.bind(this)));

            // Prevent the default Hub entrance animation, because (1) we don't want it
            // and (2) it is causing performance issues because it is plays when the user switches tabs
            this._hub.addEventListener("contentanimating", function (ev) {
                ev.preventDefault();
            });
            MyApp.Utilities.Animation.useCustomHubEntranceAnimation(this._layoutRoot.querySelector(".hub-movies"));

            loadPromises.push(new WinJS.Promise(function (complete, error) {
                var loadingState = function (ev) {
                    if (ev.detail &&
                        ev.detail.loadingState === XboxJS.UI.Hub.LoadingState.complete) {
                        this._hub.removeEventListener("loadingstatechanged", loadingState);
                        complete();
                    }
                }.bind(this);
                this._hub.addEventListener("loadingstatechanged", loadingState, false);
            }.bind(this)));

            loadPromises = loadPromises.concat(this._pagePromises);

            WinJS.Promise.join(loadPromises).then(function () {
                return this._handleLoadingStateChangedBind();
            }.bind(this));
        },

        enterPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.enterPage(this._layoutRoot, isBackNavigation);
        },

        exitPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.exitPage(this._layoutRoot, isBackNavigation);
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.
            document.querySelector(".hub-movies").winControl.removeEventListener("loadingstatechanged", this._handleLoadingStateChangedBind);

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
        },

        // This method is where you want to perform initialization logic. It's better to put your initialization
        // code here rather than the ready function, because not all of your UI has loaded when the ready function is called.
        // This is because both the TabView, Hub and ListView load asynchronously.
        _handleLoadingStateChanged: function (ev) {
            // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
            // When in doubt, pick the top, left element.
            setImmediate(function afterPageRenderingHasFinished() {
                var initialFocusElement = this._layoutRoot.querySelector(".layout-movies-section1-slot1");
                if (initialFocusElement) {
                    initialFocusElement.focus();
                }
            }.bind(this));

            // Get all the new releases, assign their MediaTile's metadata properties
            // and create click handlers that navigate to the details page.
            var moviesNewReleaseItems = document.querySelectorAll(".hub-movies .newmovie");
            for (var i = 0; i < moviesNewReleaseItems.length; i++) {
                MyApp.Utilities.loadTile(moviesNewReleaseItems[i].winControl, this._newReleaseData[i], "/pages/details/details.html");
            }

            document.querySelector(".layout-movies-section1-more").winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: "New Releases", items: this._newReleaseData });
            }.bind(this));

            // Get all the popular movies, assign their MediaTile's metadata properties
            // and create click handlers that navigate to the details page.
            var moviesPopularItems = document.querySelectorAll(".hub-movies .popularmovie");
            for (var i = 0; i < moviesPopularItems.length; i++) {
                MyApp.Utilities.loadTile(moviesPopularItems[i].winControl, this._getPopularData[i], "/pages/details/details.html");
            }

            document.querySelector(".layout-movies-section2-more").winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: "Popular", items: this._getPopularData });
            }.bind(this));
                
            // Add Search
            this._layoutRoot.querySelector("#movies-search").winControl.addEventListener("invoked", function (evt) {
                utils.Search.handleSearchButtonInvoked(evt, "movie");
            }, false);

            //Add Browse Movies
            this._layoutRoot.querySelector("#movies-browse").addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', {
                pageTitle: "All Movies",
                virtualizedDataFunction: MyApp.Services.Movies.getRange,
                getMaxResultsCountFunction: MyApp.Services.getMaxMoviesDataCount
                });
            });

            WinJS.Resources.processAll(this._layoutRoot);

            // We need to remove the event listener after our initialization code has run otherwise it will fire again & run this code a
            // second time when hub sections are scrolled into view.
            document.querySelector(".hub-movies").winControl.removeEventListener("loadingstatechanged", this._handleLoadingStateChangedBind);
        },
    });
})();