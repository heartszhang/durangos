// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var nav = WinJS.Navigation;
    var ui = WinJS.UI;
    var utils = MyApp.Utilities;

    WinJS.UI.Pages.define("/pages/queue/queue.html", {
        _isFirstPageLoad: true,
        _handleListViewLoadedBind: null,
        _handleItemInvokedBind: null,
        _queue: {},
        _queueListView: null,
        _layoutRoot: null,

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

            this._queueListView = element.querySelector("#queue-listview").winControl;
            this._handleItemInvokedBind = this._handleItemInvoked.bind(this);
            this._handleListViewLoadedBind = this._handleListViewLoaded.bind(this);

            // Hook up button handlers
            this._queueListView.addEventListener("iteminvoked", this._handleItemInvokedBind, false);
            this._queueListView.addEventListener("loadingstatechanged", this._handleListViewLoadedBind, false);
            element.querySelector(".queue-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);

            // Get the queue data
            this._getQueueData();

            // If the primary user changed get the new users queue data, and update the page
            MyApp.Utilities.User.addEventListener("primaryuserchanged", function () {
                this._getQueueData();
            }.bind(this));

            MyApp.Utilities.Animation.useCustomlistViewAnimation(this._queueListView);

            // Set view state
            this._initializeLayout(this._queueListView, appView.value);

            MyApp.Utilities.hideSpinner();

            WinJS.Resources.processAll(element);
        },

        _handleListViewLoaded: function (ev) {

            if (this._queueListView.loadingState === "complete" &&
                this._isFirstPageLoad) {
                this._isFirstPageLoad = false;

                // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
                var initialFocusElement = this._queueListView.elementFromIndex(0);
                setImmediate(function afterPageRenderingHasFinished() {
                    if (initialFocusElement) {
                        initialFocusElement.focus();
                    } else {
                        document.querySelector(".emptyqueuelabel").style.display = "block";
                    }
                });
            }
        },

        _handleItemInvoked: function (evt) {
            var mediaTile = this._queueListView.elementFromIndex(evt.detail.itemIndex);
            this._queueListView.itemDataSource.itemFromIndex(evt.detail.itemIndex)
            .done(
                function success(result) {
                    if (result.data.contentType === XboxJS.Data.ContentType.movie) {
                        WinJS.Navigation.navigate('/pages/details/details.html', result.data.item);
                    }
                    else if (result.data.contentType === XboxJS.Data.ContentType.tvSeries) {
                        WinJS.Navigation.navigate('/pages/tvdetails/tvdetails.html', result.data.item);
                    }
                },
                function error() {
                    MyApp.Utilities.showErrorMessage(
                            WinJS.Resources.getString("networkErrorDescription").value,
                            WinJS.Resources.getString("networkErrorTitle").value
                        );
                });
        },
        _getQueueData: function () {
            var queuePromise = MyApp.Services.Queue.getQueueData();
            this._pagePromises.push(queuePromise.then(function (result) {
                if (result.length === 0) {
                    document.querySelector(".emptyqueuelabel").style.display = "block";
                }

                this._queue = new WinJS.Binding.List(result);
                this._queueListView.itemTemplate = this._queueItemTemplateFunction;
                this._queueListView.itemDataSource = this._queue.dataSource;
            }.bind(this)));
        },
        // This function updates the ListView with new layouts
        _initializeLayout: function (listView, viewState) {
            if (viewState === appViewState.snapped) {
                listView.layout = new ui.ListLayout();
            } else {
                listView.layout = new ui.GridLayout({ groupHeaderPosition: "top" });
            }
        },

        // A function to render the items in the ListView
        _queueItemTemplateFunction: function (itemPromise) {

            return itemPromise.then(function (item) {

                var mediaTile = new XboxJS.UI.MediaTile(document.createElement("div"), { metadata: item.data });
                if (item.data.contentType === XboxJS.Data.ContentType.movie) {
                    WinJS.Utilities.addClass(mediaTile.element, "win-mediatile-layout-horizontalmovie layout-gallerymediatile");
                } else {
                    WinJS.Utilities.addClass(mediaTile.element, "win-mediatile-layout-horizontaltv layout-gallerymediatile");
                }

                // Override the default MediaTile to use an enumeration
                mediaTile.dataWinVoiceOverride = {
                    enumerate: "numbersEnumeration",
                    targetElement: "select('win-voice-activetext')"
                };

                return mediaTile.element;

            });

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

            var listView = element.querySelector("#queue-listview").winControl;
            if (lastViewState !== viewState) {
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    var handler = function (e) {
                        listView.removeEventListener("contentanimating", handler);
                        e.preventDefault();
                    }
                    listView.addEventListener("contentanimating", handler, false);
                    this._initializeLayout(listView, viewState);
                }
            }
        }
    });
})();


