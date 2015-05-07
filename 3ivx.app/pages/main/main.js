// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var sessionState = WinJS.Application.sessionState;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var utils = MyApp.Utilities;

    WinJS.UI.Pages.define("/pages/main/main.html", {
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: null,
        _handleLoadingStateChangedBind: null,
        _mainpageTabControl: null,
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {

            this._layoutRoot = element;
            // Whenever we make a service call it is a good idea to push that service call's promise into the promises array.
            // That way, we have an easy way to cancel all of the outstanding promises. For instance, we cancel all outstanding
            // promises on page navigation.
            this._pagePromises = [];
            var loadPromises = [];
            this.enterPage = this.enterPage.bind(this);
            this.exitPage = this.exitPage.bind(this);

            if (!MyApp.Utilities.SplashScreen.isVisible()) {
                MyApp.Utilities.showSpinner()
            }

            this._mainpageTabControl = this._layoutRoot.querySelector("#mainpageTabControl").winControl;
            this._handleLoadingStateChangedBind = this._handleLoadingStateChanged.bind(this);

            this._mainpageTabControl.addEventListener("currenttabchanged", this._handleCurrentTabChanged.bind(this), false);
            this._layoutRoot.querySelector(".main-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);

            this._moviesData = [];
            this._pagePromises.push(MyApp.Services.Movies.getData().then(function success(results) {
                this._moviesData = results;
            }.bind(this)));

            this._seriesData = [];
            this._pagePromises.push(MyApp.Services.Series.getData().then(function success(results) {
                this._seriesData = results;
            }.bind(this)));

            loadPromises.push(new WinJS.Promise(function (complete, error) {
                var loadingState = function (ev) {
                    if (ev.detail &&
                        ev.detail.loadingState === XboxJS.UI.TabView.LoadingState.complete) {
                        this._mainpageTabControl.removeEventListener("loadingstatechanged", loadingState);
                        complete();
                    }
                }.bind(this);
                this._mainpageTabControl.addEventListener("loadingstatechanged", loadingState, false);
            }.bind(this)));

            loadPromises = loadPromises.concat(this._pagePromises);

            // Remove the splash screen once the data is loaded
            var hideSplashScreenPromise = WinJS.Promise.join(loadPromises).then(function () {
                return this._handleLoadingStateChangedBind();
            }.bind(this)).then(function () {
                MyApp.Utilities.SplashScreen.remove();
            }).then(function () {
                MyApp.Utilities.hideSpinner();
            });

            // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
            setImmediate(function afterPageRenderingHasFinished() {
                if (appView.value === appViewState.snapped) {
                    var initialFocusElement = this._layoutRoot.querySelector(".win-focusable");
                    if (initialFocusElement) {
                        initialFocusElement.focus();
                    }
                }
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
                var initialFocusElementSelector = "";
                if (viewState === appViewState.snapped) {
                    initialFocusElementSelector = "#snapped-movies-browse";
                } else {
                    if (this._mainpageTabControl.currentTab === 0) {
                        initialFocusElementSelector = ".layout-home-section1-slot1";
                    } else if (this._mainpageTabControl.currentTab === 1) {
                        initialFocusElementSelector = ".layout-movies-section1-slot1";
                    } else if (this._mainpageTabControl.currentTab === 2) {
                        initialFocusElementSelector = ".layout-tv-section1-slot1";
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

        _handleCurrentTabChanged: function (ev) {
            // We save the viewstate so when the user navigates back, they will return to the correct tab
            sessionState.landingPageTab = ev.detail.newTabIndex;
        },

        // This method is where you want to perform initialization logic. It's better to put your initialization
        // code here rather than the ready function, because not all of your UI has loaded when the ready function is called.
        // This is because both the TabView, Hub and ListView load asynchronously.
        _handleLoadingStateChanged: function () {
            // Choose the initially selected tab. If sessionState has the last focused tab
            // then we restore to that tab, otherwise choose the first tab. SessionState will
            // have a tab in it if we are navigating back from a previous page.
            if (sessionState.landingPageTab) {
                this._mainpageTabControl.currentTab = sessionState.landingPageTab;
            } else {
                this._mainpageTabControl.currentTab = 0;
            }

            WinJS.Resources.processAll(this._layoutRoot);

            document.querySelector("#snapped-movies-browse").winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: WinJS.Resources.getString("browsemoviesPageTitle").value, items: this._moviesData });
            }.bind(this));

            document.querySelector("#snapped-tv-browse").winControl.addEventListener("invoked", function handleClick() {
                WinJS.Navigation.navigate('/pages/browseAll/browseAll.html', { pageTitle: WinJS.Resources.getString("browsetvPageTitle").value, items: this._seriesData });
            }.bind(this));

            this._mainpageTabControl.removeEventListener("loadingstatechanged", this._handleLoadingStateChangedBind);
        }
    });
})();
