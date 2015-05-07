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

    WinJS.UI.Pages.define("/pages/browseTV/browseTV.html", {
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: null,
        _isFirstPageLoad: true,
        _tvItemsListView: null,
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
            var tvItemsListView = element.querySelector(".browsetv-listview").winControl;
            var sort = element.querySelector(".browsetv-sort").winControl;
            var filter = element.querySelector(".browsetv-filter").winControl;
            this._handleFilterChangeBind = this._handleFilterChange.bind(this);
            this._handleSortChangeBind = this._handleSortChange.bind(this);
            this._handleItemInvokedBind = this._handleItemInvoked.bind(this);
            this._handleListViewLoadedBind = this._handleListViewLoaded.bind(this);
            this._tvItemsListView = element.querySelector(".browsetv-listview").winControl;

            // Hook up button handlers
            tvItemsListView.addEventListener("iteminvoked", this._handleItemInvokedBind, false);
            element.querySelector(".browsetv-search").winControl.addEventListener("invoked", utils.Search.handleSearchButtonInvoked, false);
            element.querySelector(".browsetv-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);
            this._tvItemsListView.addEventListener("loadingstatechanged", this._handleListViewLoadedBind, false);

            tvItemsListView.itemTemplate = this._itemTemplateFunction;

            // Hook up the sort and filter controls
            var filter = element.querySelector(".browsetv-filter").winControl;
            filter.addEventListener("change", this._handleFilterChangeBind, false);

            var filterOptions = new WinJS.Binding.List([
                { id: "TV", label: WinJS.Resources.getString("galleryFilterOptionTV").value },
                { id: "Movies", label: WinJS.Resources.getString("galleryFilterOptionMovies").value }]);

            filter.items = filterOptions;

            var sort = element.querySelector(".browsetv-sort").winControl;
            sort.addEventListener("change", this._handleSortChangeBind, false);

            var sortOptions = new WinJS.Binding.List([
                { id: "A-Z", label: WinJS.Resources.getString("gallerySortOptionAscending").value },
                { id: "Z-A", label: WinJS.Resources.getString("gallerySortOptionDescending").value }]);

            sort.items = sortOptions;

            //Set data on ListView
            if (options.items) {  // Data already available so passed in directly
              this._tvItemsListView.itemDataSource = (new WinJS.Binding.List(options.items)).dataSource;
            } else if (options.dataFunction) {  // Make a non-virtualized service call, may need to show loading animation
                var that = this;
                this._pagePromises.push(options.dataFunction
                  .then(
                    function (results) {
                        that._tvItemsListView.itemDataSource = (new WinJS.Binding.List(results)).dataSource;
                    },
                    function error() {
                        // TODO - handle the error case. You may want to retry the service call,
                        // log an error fail silently or if it is a catastrophic error then you want to let
                        // the user know.
                    }));
            } else if (options.virtualizedDataFunction) {  // Largest dataset possible, a service call that can be paged is passed in
                this._tvItemsListView.itemDataSource = new MyApp.Utilities.Services.VirtualizedDataSource(options.virtualizedDataFunction, options.getMaxResultsCountFunction);
            }

            // Set view state
            this._initializeLayout(tvItemsListView, appView.value);

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
            var tvItemsListView = element.querySelector(".browsetv-listview").winControl;
            if (lastViewState !== viewState) {
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    var handler = function (e) {
                        tvItemsListView.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    }
                    tvItemsListView.addEventListener("contentanimating", handler, false);
                    this._initializeLayout(tvItemsListView, viewState);
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
                        that._tvItemsListView.itemDataSource = new WinJS.Binding.List(results).dataSource;
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
                        that._tvItemsListView.itemDataSource = new WinJS.Binding.List(results).dataSource;
                    },
                    function error() {
                        // TODO - handle the error case either. You may want to retry the service call,
                        // log an error fail silently or if it is a catastrophic error then you want to let
                        // the user know.
                    }));
        },

        _handleListViewLoaded: function (ev) {
            if (this._tvItemsListView.loadingState === "complete" &&
                this._isFirstPageLoad) {
                this._isFirstPageLoad = false;

                // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
                var initialFocusElement = this._tvItemsListView.elementFromIndex(0);
                setImmediate(function afterPageRenderingHasFinished() {
                    if (initialFocusElement) {
                        initialFocusElement.focus();
                    }
                });
            }
        },

        _handleItemInvoked: function (evt) {
            var mediaTile = this._tvItemsListView.elementFromIndex(evt.detail.itemIndex);
            if (!mediaTile.isLocked) {
                this._tvItemsListView.itemDataSource.itemFromIndex(evt.detail.itemIndex)
                    .done(
                        function success(result) {
                            WinJS.Navigation.navigate('/pages/tvdetails/tvdetails.html', result.data);
                        },
                        function error() {
                            // TODO - handle the error case either. You may want to retry the service call,
                            // log an error fail silently or if it is a catastrophic error then you want to let
                            // the user know.
                        });
            }
        },

        // This function updates the ListView with new layouts
        _initializeLayout: function (tvItemsListView, viewState) {
            if (viewState === appViewState.snapped) {
                tvItemsListView.layout = new ui.ListLayout();
            } else {
                tvItemsListView.layout = new ui.GridLayout({ groupHeaderPosition: "top" });
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
                    WinJS.Utilities.addClass(mediaTile.element, "win-mediatile-layout-horizontaltv");
                }
            });

            return { element: recycledElement, renderComplete: renderPromise };
        }
    });
})();
