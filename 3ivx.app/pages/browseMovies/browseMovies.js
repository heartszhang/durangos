// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511

/*global WinJS: true*/

(function () {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var nav = WinJS.Navigation;
    var ui = WinJS.UI;
    var utils = MyApp.Utilities;

    WinJS.UI.Pages.define("/pages/browseMovies/browseMovies.html", {
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: null,
        _isFirstPageLoad: true,
        _movieItemsListView: null,
        _handleListViewLoadedBind: null,
        _handleItemInvokedBind: null,
        // Whenever we make a service call it is a good idea to push that service call's promise into the promises array.
        // That way, we have an easy way to cancel all of the outstanding promises. For instance, we cancel all outstanding
        // promises on page navigation.
        _pagePromises: [],

        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // TODO: Initialize the page here.
            this._layoutRoot = element;
            var sort = element.querySelector(".browsemovies-sort").winControl;
            var filter = element.querySelector(".browsemovies-filter").winControl;
            this._movieItemsListView = element.querySelector(".browsemovies-listview").winControl;
            this._handleFilterChangeBind = this._handleFilterChange.bind(this);
            this._handleSortChangeBind = this._handleSortChange.bind(this);
            this._handleItemInvokedBind = this._handleItemInvoked.bind(this);
            this._handleListViewLoadedBind = this._handleListViewLoaded.bind(this);

            // Hook up button handlers
            element.querySelector(".browsemovies-search").winControl.addEventListener("invoked", utils.Search.handleSearchButtonInvoked, false);
            element.querySelector(".browsemovies-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);
            this._movieItemsListView.addEventListener("iteminvoked", this._handleItemInvokedBind, false);
            this._movieItemsListView.addEventListener("loadingstatechanged", this._handleListViewLoadedBind, false);

            this._movieItemsListView.itemTemplate = this._itemTemplateFunction;

            // Hook up the sort and filter controls
            var filter = element.querySelector(".browsemovies-filter").winControl;
            filter.addEventListener("change", this._handleFilterChangeBind, false);

            var filterOptions = new WinJS.Binding.List([
                { id: "TV", label: WinJS.Resources.getString("galleryFilterOptionTV").value },
                { id: "Movies", label: WinJS.Resources.getString("galleryFilterOptionMovies").value }]);

            filter.items = filterOptions;

            var sort = element.querySelector(".browsemovies-sort").winControl;
            sort.addEventListener("change", this._handleSortChangeBind, false);

            var sortOptions = new WinJS.Binding.List([
                { id: "A-Z", label: WinJS.Resources.getString("gallerySortOptionAscending").value },
                { id: "Z-A", label: WinJS.Resources.getString("gallerySortOptionDescending").value }]);

            sort.items = sortOptions;

            // Set data on ListView
            if (options.items) {  // Data already avaialble so passed in directly
                this._movieItemsListView.itemDataSource = (new WinJS.Binding.List(options.items)).dataSource;
            } else if (options.dataFunction) {  // Make a non-virtualized service call, may need to show loading animation
                var that = this;
                this._pagePromises.push(options.dataFunction
                  .then(
                    function (results) {
                        that._movieItemsListView.itemDataSource = (new WinJS.Binding.List(results)).dataSource;
                    },
                    function error() {
                        // TODO - handle the error case. You may want to retry the service call,
                        // log an error fail silently or if it is a catastrophic error then you want to let
                        // the user know.
                    }));
            } else if (options.virtualizedDataFunction) {  // Largest dataset possible, a service call that can be paged is passed in
                // Note: It is okay if the 2nd parameter is null
                this._movieItemsListView.itemDataSource = new MyApp.Utilities.Services.VirtualizedDataSource(options.virtualizedDataFunction, options.getMaxResultsCountFunction);
            }

            // Set view state
            this._initializeLayout(this._movieItemsListView, appView.value);

            WinJS.Resources.processAll(this._layoutRoot);
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
            var movieItemsListView = element.querySelector(".browsemovies-listview").winControl;
            if (lastViewState !== viewState) {
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    var handler = function (e) {
                        movieItemsListView.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    }
                    movieItemsListView.addEventListener("contentanimating", handler, false);
                    this._initializeLayout(movieItemsListView, viewState);
                }
            }
        },

        _handleFilterChange: function (ev) {
            // TODO - call your service to retrieve a filtered list and update the list's
            // dataSource to refresh the UI.
            var that = this;
            this._pagePromises.push(MyApp.Services.filter()
                .then(
                    function success(results) {
                        that._movieItemsListView.itemDataSource = new WinJS.Binding.List(results).dataSource;
                    },
                    function error() {
                        // TODO - handle the error case either. You may want to retry the service call,
                        // log an error fail silently or if it is a catastrophic error then you want to let
                        // the user know.
                    }));
        },

        _handleSortChange: function (ev) {
            // TODO - call your service to retrieve a sorted list and update the list's
            // dataSource to refresh the UI.
            var that = this;
            this._pagePromises.push(MyApp.Services.sort()
                .then(
                    function success(results) {
                        that._movieItemsListView.itemDataSource = new WinJS.Binding.List(results).dataSource;
                    },
                    function error() {
                        // TODO - handle the error case either. You may want to retry the service call,
                        // log an error fail silently or if it is a catastrophic error then you want to let
                        // the user know.
                    }));
        },

        _handleListViewLoaded: function (ev) {
            if (this._movieItemsListView.loadingState === "complete" &&
                this._isFirstPageLoad) {
                this._isFirstPageLoad = false;

                // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
                var initialFocusElement = this._movieItemsListView.elementFromIndex(0);
                setImmediate(function afterPageRenderingHasFinished() {
                    if (initialFocusElement) {
                        initialFocusElement.focus();
                    }
                });
            }
        },

        _handleItemInvoked: function (evt) {
            var mediaTile = this._movieItemsListView.elementFromIndex(evt.detail.itemIndex);
            if (!mediaTile.isLocked) {
                this._movieItemsListView.itemDataSource.itemFromIndex(evt.detail.itemIndex)
                    .done(
                        function success(result) {
                            WinJS.Navigation.navigate('/pages/details/details.html', result.data);
                        },
                        function error() {
                            // TODO - handle the error case either. You may want to retry the service call,
                            // log an error fail silently or if it is a catastrophic error then you want to let
                            // the user know.
                        });
            }
        },

        // This function updates the allMovies with new layouts
        _initializeLayout: function (allMovies, viewState) {
            if (viewState === appViewState.snapped) {
                allMovies.layout = new ui.ListLayout();
            } else {
                allMovies.layout = new ui.GridLayout({ groupHeaderPosition: "top" });
            }
        },

        // A function to render the items in the ListView
        _itemTemplateFunction: function (itemPromise, recycledElement) {
            var mediaTile = null;
            if (!recycledElement) {
                var mediaTile = new XboxJS.UI.MediaTile();
                WinJS.Utilities.addClass(mediaTile.element, "layout-gallerymediatile");
                recycledElement = mediaTile.element;
            } else {
                var mediaTileElement = recycledElement.querySelector("win-mediatile");
                if (mediaTileElement) {
                    mediaTile = mediaTileElement.winControl;
                }
            }
            var renderPromise = itemPromise.then(function (item) {
                if (mediaTile) {
                    mediaTile.metadata = item.data;
                    WinJS.Utilities.addClass(mediaTile.element, "win-mediatile-layout-horizontalmovie");
                }
            });

            return { element: recycledElement, renderComplete: renderPromise };
        }
    });
})();
