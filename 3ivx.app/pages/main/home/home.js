// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

/*global WinJS: true*/

(function () {
    "use strict";

    var utils = MyApp.Utilities;

    WinJS.UI.Pages.define("/pages/main/home/home.html", {
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
            this._hub = this._layoutRoot.querySelector(".hub-home").winControl;


            this._moviesFeaturedData = [];
            this._pagePromises.push(MyApp.Services.Movies.getFeaturedData().then(function success(results) {
                this._moviesFeaturedData = results;
            }.bind(this)));

            this._seriesFeaturedData;
            this._pagePromises.push(MyApp.Services.Series.getFeaturedData().then(function (results) {
                this._seriesFeaturedData = results;
            }.bind(this)));

            // Prevent the default Hub entrance animation, because (1) we don't want it
            // and (2) it is causing performance issues because it is plays when the user switches tabs
            this._hub.addEventListener("contentanimating", function (ev) {
                ev.preventDefault();
            });
            MyApp.Utilities.Animation.useCustomHubEntranceAnimation(this._layoutRoot.querySelector(".hub-home"));

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
            document.querySelector(".hub-home").winControl.removeEventListener("loadingstatechanged", this._handleLoadingStateChangedBind);

            // Cancel any outstanding promises so that they don't get called after the page goes away
            var promises = this._pagePromises;
            for (var i = 0; i < promises.length; i++ ) {
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
                var initialFocusElement = this._layoutRoot.querySelector(".layout-home-section1-slot1");
                if (initialFocusElement) {
                    initialFocusElement.focus();
                }
            }.bind(this));

            // Get all the featured movies, assign their MediaTile's metadata properties
            // and create click handlers that navigate to the details page.
            var moviefeaturedItems = document.querySelectorAll(".hub-home .featuredmovie");
            for (var i = 0; i < moviefeaturedItems.length; i++) {
                MyApp.Utilities.loadTile(moviefeaturedItems[i].winControl, this._moviesFeaturedData[i], "/pages/details/details.html");
            }

            document.querySelector(".layout-home-section1-more").winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: WinJS.Resources.getString("featuredMoviesPageTitle").value, items: this._moviesFeaturedData });
            }.bind(this));

            // Get all the featured TV shows, assign their MediaTile's metadata properties
            // and create click handlers that navigate to the details page.
            var tvfeaturedItems = document.querySelectorAll(".hub-home .tvfeatureditem");
            for (var i = 0; i < tvfeaturedItems.length; i++) {
                MyApp.Utilities.loadTile(tvfeaturedItems[i].winControl, this._seriesFeaturedData[i], "/pages/tvdetails/tvdetails.html");
            }

            document.querySelector(".layout-home-section2-more").winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: WinJS.Resources.getString("featuredTVPageTitle").value, items: this._seriesFeaturedData });
            }.bind(this));

            var queueButton = document.querySelector("#home-queue");
            queueButton.winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/queue/queue.html');
            });

            // Hook up the search handler
            this._layoutRoot.querySelector("#home-search").winControl.addEventListener("invoked", utils.Search.handleSearchButtonInvoked, false);

            // Add Browse All
            this._layoutRoot.querySelector("#home-browse").addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', {
                pageTitle: "Browse All",
                virtualizedDataFunction: MyApp.Services.getAllContentRange,
                getMaxResultsCountFunction: MyApp.Services.getMaxBrowseAllResultsCount
                });
            });

            // We need to remove the event listener after our initialization code has run otherwise it will fire again & run this code a
            // second time when hub sections are scrolled into view.
            document.querySelector(".hub-home").winControl.removeEventListener("loadingstatechanged", this._handleLoadingStateChangedBind);

            WinJS.Resources.processAll(this._layoutRoot);
        }
    });
})();
