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

    // Filter and sort values would come from a service in a real app
    var filterOptionsArray = [
    { id: "All", label: WinJS.Resources.getString("galleryFilterOptionAll").value },
    { id: "TV", label: WinJS.Resources.getString("galleryFilterOptionTV").value },
    { id: "Movies", label: WinJS.Resources.getString("galleryFilterOptionMovies").value }];

    var sortOptionsArray = [{ id: "A-Z", label: WinJS.Resources.getString("gallerySortOptionAscending").value },
               { id: "Z-A", label: WinJS.Resources.getString("gallerySortOptionDescending").value }];

    WinJS.UI.Pages.define("/pages/search/search.html", {
        // The default amount of time to wait after the user has finished typing before issuing a search query. You may want to tweak this
        // number to something that makes sense for your app. The benefit of a lower number is that searching will feel more responsive.
        // The downside is that the results will be updated more frequently, this may be costly for your services, distracting for users and
        // have a potential performance impact on how fast the user can move input through the letters in the SearchBox.
        _defaultUserIdleTimeout: 500,
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: null,
        _searchResultsListView: null,
        _searchPromise: null,
        _currentQuery: "",
        _lastQuery: "",
        _currentSearchScope: "",
        _lastSearchScope: "",
        _snappedSearchBind: null,
        _updateListBasedOnFilterandSortBind: null,
        _pageTitle: "Search",

        enterPage: function (isBackNavigation) {
            // We restore the previous search query if the user is navigating back to the search page.
            this._isBackNavigation = isBackNavigation;
            return MyApp.Utilities.Animation.enterPage(this._layoutRoot, isBackNavigation).then(function afterEnterPage() {
                var state = MyApp.Utilities.SessionState[this._pageTitle];
                if (state &&
                    state.search &&
                    state.search.query &&
                    this._isBackNavigation) {
                    this._searchBox.queryText = state.search.query;

                    // Update data to match sort and filter selections if navigating back from details page
                    var filter = this._layoutRoot.querySelector(".searchbox-filter").winControl;
                    // Clear selection for sort and filter data arrays to prevent multi-selected values
                    for (var i = 0; i < filterOptionsArray.length; i++) {
                        filterOptionsArray[i].selected = false;
                    }
                    for (var i = 0; i < sortOptionsArray.length; i++) {
                        sortOptionsArray[i].selected = false;
                    }

                    // Update selection on filter data array and ListPicker control based on session state
                    var filter = this._layoutRoot.querySelector(".searchbox-filter").winControl;
                    // Update selected item on filter data array based on session state
                    if (state.filterSelection === "Movies") {
                        filterOptionsArray[2].selected = true;
                    } else if (state.filterSelection === "TV") {
                        filterOptionsArray[1].selected = true;
                    } else {
                        filterOptionsArray[0].selected = true;
                    }
                    // Set updated filter data array on ListPicker control
                    var filterOptions = new WinJS.Binding.List(filterOptionsArray);
                    filter.items = filterOptions;
                    // Update selection on sort data array and ListPicker control based on session state
                    var sort = this._layoutRoot.querySelector(".searchbox-sort").winControl;
                    // Update selected item on filter data array based on session state
                    if (state.sortSelection === "A-Z") {
                        sortOptionsArray[0].selected = true;
                    } else {
                        sortOptionsArray[1].selected = true;
                    }
                    // Set updated sort data array on ListPicker control
                    var sortOptions = new WinJS.Binding.List(sortOptionsArray);
                    sort.items = sortOptions;

                    // Call search after back navigation to load search results
                    this._search(this._searchBox.queryText, this._layoutRoot.querySelector(".searchbox-sort").winControl.selectedItems.getAt(0)['id'], true);
                }
            }.bind(this));
        },

        exitPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.exitPage(this._layoutRoot, isBackNavigation);
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
            this.enterPage = this.enterPage.bind(this);
            this.exitPage = this.exitPage.bind(this);

            this._unloaded = false;

            var searchResults = new WinJS.Binding.List(options.items);

            this._getSearchResultsBind = this._getSearchResults.bind(this);
            this._handleFilterChangeBind = this._handleFilterChange.bind(this);
            this._handleSortChangeBind = this._handleSortChange.bind(this);
            this._handleItemInvokedBind = this._handleItemInvoked.bind(this);
            this._resetSearchQueryTimerBind = this._resetSearchQueryTimer.bind(this);
            this._setSearchQueryTimerBind = this._setSearchQueryTimer.bind(this);
            this._searchResultsListView = element.querySelector("#searchbox-listView").winControl;

            this._handleQueryChangedBind = this._handleQueryChanged.bind(this);

            this._updateListBasedOnFilterandSortBind = this._updateListBasedOnFilterandSort.bind(this);

            // Hook up button handlers
            this._searchResultsListView.addEventListener("iteminvoked", this._handleItemInvokedBind, false);
            element.querySelector(".searchbox-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);

            this._snappedSearchBind = this._snappedSearch.bind(this);
            element.querySelector(".search-snapped-searchbutton").winControl.addEventListener("invoked", function () {
                var search = null;
                if (Windows.Xbox) {
                    search = Windows.Xbox.ApplicationModel.Search.SearchPane.getForCurrentView();
                } else {
                    search = Windows.ApplicationModel.Search.SearchPane.getForCurrentView();
                }
                search.addEventListener("querysubmitted", this._snappedSearchBind);
                search.show(this._currentQuery || "");
            }.bind(this));

            // Hook up the SearchBox control
            this._searchBox = element.querySelector(".searchbox-searchbox").winControl;
            this._searchBox.addEventListener("querychanged", this._handleQueryChangedBind, false);

            this._searchResultsListView.itemTemplate = this._itemTemplateFunction;
            // Only set itemDataSource here when not navigating back from a details page.
            // If navigating back from a media item details page, itemDataSource is set in the enterPage function
            if (!XboxJS.Utilities._isBackwardNavigation) {
                this._searchResultsListView.itemDataSource = searchResults.dataSource;
            }

            // Hook up the sort and filter controls
            var filter = element.querySelector(".searchbox-filter").winControl;
            filter.addEventListener("change", this._handleFilterChangeBind, false);

            // Clear selection for sort and filter to ensure just one value is selected
            for (var i = 0; i < filterOptionsArray.length; i++) {
                filterOptionsArray[i].selected = false;
            }
            for (var i = 0; i < sortOptionsArray.length; i++) {
                sortOptionsArray[i].selected = false;
            }

            //set filter to passed in scope
            if ("TV" === options.scope) {
                filterOptionsArray[1].selected = true;
            } else if ("Movies" === options.scope) {
                filterOptionsArray[2].selected = true;
            } else {
                filterOptionsArray[0].selected = true;
            }

            // Set selected item on the filter ListPicker
            var filterOptions = new WinJS.Binding.List(filterOptionsArray);
            filter.items = filterOptions;

            var sort = element.querySelector(".searchbox-sort").winControl;
            sort.addEventListener("change", this._handleSortChangeBind, false);
            // Set the default sort item on the filter ListPicker
            sortOptionsArray[0].selected = true;
            var sortOptions = new WinJS.Binding.List(sortOptionsArray);
            sort.items = sortOptions;

            // Set view state
            this._initializeLayout(this._searchResultsListView, appView.value);

            // The following code remembers the previous scroll position of the list. If we did not have this code, 
            // does not run, the user's scroll position would always be set to the beginning of the list.
            var state = MyApp.Utilities.SessionState[this._pageTitle];
            var handler = function (ev) {
                if (ev.detail &&
                    ev.detail.type === WinJS.UI.ListViewAnimationType.entrance) {
                    if (this._isBackNavigation) {
                        ev.preventDefault();
                    }
                    this._searchResultsListView.removeEventListener("contentanimating", handler);
                    setImmediate(function afterPageRenderingHasFinished() {
                        if (state &&
                            this._isBackNavigation) {
                            this._searchResultsListView.currentItem = { hasFocus: true, index: (state.focusedItem ? state.focusedItem.index : 0) };
                            this._searchResultsListView.scrollPosition = state.scrollPosition;
                        }
                    }.bind(this));
                }
            }.bind(this)
            this._searchResultsListView.addEventListener("contentanimating", handler, false);

            // Listen for keydown & cancel a pending search query if the user is actively using the controller
            this._layoutRoot.addEventListener("keydown", this._resetSearchQueryTimerBind, false);

            // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
            setImmediate(function afterPageRenderingHasFinished() {
                var initialFocusElement = null;
                // We don't want to set initial focus here if the user is returning back to this page. In that case there
                // is code in the ready function that will set initial focus back to the item the user was previously looking at.
                if (!this._isBackNavigation) {
                    if (appView.value === appViewState.snapped) {
                        initialFocusElement = this._layoutRoot.querySelector(".searchbox-snapped-gofullscreenbutton");
                    } else {
                        initialFocusElement = this._layoutRoot.querySelector(".searchbox-searchbox .win-focusable");
                    }
                    if (initialFocusElement) {
                        initialFocusElement.focus();
                    }
                }
            }.bind(this));

            MyApp.Utilities.Animation.useCustomlistViewAnimation(this._layoutRoot.querySelector(".searchbox-listview"));

            setImmediate(function afterYield() {
                if (this._unloaded) {
                    return;
                }
                MyApp.Utilities.hideSpinner();

                this._searchBox.placeholderText = WinJS.Resources.getString("searchPlaceHolderText").value;
            }.bind(this));
            WinJS.Resources.processAll(this._layoutRoot);
        },

        unload: function () {
            // TODO: Respond to navigations away from this page.
            this._unloaded = true;

            // Cancel any outstanding promises so that they don't get called after the page goes away
            var promises = this._pagePromises;
            for (var i = 0; i < promises.length; i++) {
                if (promises[i]) {
                    promises[i].cancel();
                }
            }

            var search = null;
            if (Windows.Xbox) {
                search = Windows.Xbox.ApplicationModel.Search.SearchPane.getForCurrentView();
            } else {
                search = Windows.ApplicationModel.Search.SearchPane.getForCurrentView();
            }

            clearTimeout(this._searchQueryTimeout);
            search.removeEventListener("querysubmitted", this._snappedSearchBind);
            this._layoutRoot.removeEventListener("keydown", this._resetSearchQueryTimerBind);

            // Save current query, searchScope, filter, sort, focus, and scroll position to the sessionState           
            var sessionState = { focusedItem: null, scrollPosition: 0 };
            sessionState.search = {
                query: this._currentQuery,
                searchScope: this._currentSearchScope
            };
            // Save listview selected item and scroll position
            var currentItem = null;
            var scrollPosition = 0;
            try {
                // Querying the currentItem can throw if listView is loading items from a new dataSource
                currentItem = this._searchResultsListView.currentItem;
                scrollPosition = this._searchResultsListView.scrollPosition;
            } catch (e) {
                // Do nothing
                // Just save the default values
            }
            sessionState.focusedItem = currentItem;
            sessionState.scrollPosition = scrollPosition;
            // Save filter and sort selections
            sessionState.filterSelection = this._layoutRoot.querySelector(".searchbox-filter").winControl.selectedItems.getAt(0)['id'];
            sessionState.sortSelection = this._layoutRoot.querySelector(".searchbox-sort").winControl.selectedItems.getAt(0)['id'];
            // Update session state
            MyApp.Utilities.SessionState[this._pageTitle] = sessionState;

            // Free memory from class variables
            this._currentQuery = null;
            this._handleFilterChangeBind = null;
            this._handleSortChangeBind = null;
            this._handleItemInvokedBind = null;
            this._resetSearchQueryTimerBind = null;
            this._setSearchQueryTimerBind = null;
            this._snappedSearchBind = null;
            this._updateListBasedOnFilterandSortBind = null;
        },

        updateLayout: function (element, viewState, lastViewState) {

            var searchResultsListView = element.querySelector("#searchbox-listView").winControl;
            if (lastViewState !== viewState) {
                var initialFocusElementSelector = "";
                if (viewState === appViewState.snapped) {
                    initialFocusElementSelector = ".searchbox-snapped-gofullscreenbutton";
                } else {
                    initialFocusElementSelector = ".searchbox-searchbox .win-focusable";
                }
                this._initializeLayout(searchResultsListView, viewState);

                setImmediate(function afterPageRenderingHasFinished() {
                    var initialFocusElement = this._layoutRoot.querySelector(initialFocusElementSelector);
                    if (initialFocusElement) {
                        initialFocusElement.focus();
                    }
                }.bind(this));
            }
        },

        _getSearchResults: function () {
            if (this._currentQuery === this._lastQuery &&
                this._currentSearchScope === this._lastSearchScope) {
                return;
            }

            if (this._searchPromise) {
                this._searchPromise.cancel();
            }

            MyApp.Utilities.showSpinner();

            this._searchPromise = MyApp.Services.search(this._currentQuery)
                .then(
                    function success(result) {
                        if (!this._unloaded && result !== undefined) {

                            MyApp.Utilities.hideSpinner();
                            // The search method in the data provider always returns the same values
                            // You will want to apply the current sort and filter settings to the search results
                            // In the template, don't use the raw search results
                            // this._searchResultsListView.itemDataSource = new WinJS.Binding.List(result).dataSource;
                            // The template applies sort and filter settings to the fake results but simply calling search again
                            // Update search to call your server-side search API
                            this._updateListBasedOnFilterandSortBind();

                            var emptyLabel = document.querySelector(".emptysearchlabel");
                            if (result.length === 0) {
                                WinJS.Utilities.removeClass(emptyLabel, "win-hidden");
                            } else {
                                WinJS.Utilities.addClass(emptyLabel, "win-hidden");
                            }

                            this._lastQuery = this._currentQuery;
                            this._lastSearchScope = this._currentSearchScope;
                        }
                    }.bind(this));
            this._pagePromises.push(this._searchPromise);
        },

        _handleFilterChange: function (ev) {
            // TODO: Update to call your search APIs with updated filter and sort info
            this._updateListBasedOnFilterandSortBind();
        },

        _handleSortChange: function (ev) {
            // TODO: Update to call your search APIs with updated filter and sort info
            this._updateListBasedOnFilterandSortBind();
        },

        _handleItemInvoked: function () {
            var mediaTile = this._searchResultsListView.elementFromIndex(this._searchResultsListView.currentItem.index);
            this._searchResultsListView.itemDataSource.itemFromIndex(this._searchResultsListView.currentItem.index)
                .done(
                    function (result) {

                        // Depending on the type of item that was invoked we'll go to either a TV details page or a movie details page.
                        if (result.data.contentType === XboxJS.Data.ContentType.tvSeries) {
                            WinJS.Navigation.navigate('/pages/tvdetails/tvdetails.html', result.data);
                        }
                        else {
                            WinJS.Navigation.navigate('/pages/details/details.html', result.data);
                        }
                    },
                    function error() {
                        MyApp.Utilities.showErrorMessage(
                                WinJS.Resources.getString("networkErrorDescription").value,
                                WinJS.Resources.getString("networkErrorTitle").value
                            );
                    });
        },

        // This function updates the ListView with new layouts
        _initializeLayout: function (searchResultsListView, viewState) {
            if (viewState === appViewState.snapped) {
                searchResultsListView.layout = new ui.ListLayout();
            } else {
                searchResultsListView.layout = new ui.GridLayout({ groupHeaderPosition: "top" });
            }
        },

        // A function to render the items in the ListView
        _itemTemplateFunction: function (itemPromise, recycledElement) {
            var mediaTile = null;
            if (!recycledElement) {
                var mediaTile = new XboxJS.UI.MediaTile();
                WinJS.Utilities.addClass(mediaTile.element, "layout-verticaltile");
                recycledElement = mediaTile.element;
            } else {
                var mediaTileElement = recycledElement.querySelector("win-mediatile");
                if (mediaTileElement) {
                    mediaTile = mediaTileElement.winControl;
                }
            }
            var renderPromise = itemPromise.then(function (item) {
                if (mediaTile) {
                    var metadata = item.data;
                    metadata.information = item.data.description;
                    mediaTile.metadata = metadata;
                    if (item.data.contentType === XboxJS.Data.ContentType.movie) {
                        WinJS.Utilities.removeClass(mediaTile.element, "win-mediatile-layout-horizontaltv");
                        WinJS.Utilities.addClass(mediaTile.element, "win-mediatile-layout-verticaltile layout-verticaltile");
                    } else {
                        WinJS.Utilities.removeClass(mediaTile.element, "win-mediatile-layout-horizontalmovie");
                        WinJS.Utilities.addClass(mediaTile.element, "win-mediatile-layout-verticaltile layout-verticaltile");
                    }

                    // Override the default MediaTile to use an enumeration
                    mediaTile.dataWinVoiceOverride = {
                        enumerate: "numbersEnumeration",
                        targetElement: "select('win-voice-activetext')"
                    };
                }
            });

            return { element: recycledElement, renderComplete: renderPromise };
        },

        _handleQueryChanged: function (ev) {
            this._search(ev.detail.queryText, this._layoutRoot.querySelector(".searchbox-sort").winControl.selectedItems.getAt(0)['id']);
        },

        _snappedSearch: function (evt) {
            this._currentQuery = evt.queryText;
            var searchBoxControl = this._layoutRoot.querySelector(".searchbox-searchbox").winControl;
            searchBoxControl.queryText = this._currentQuery;
            this._search(this._currentQuery, this._layoutRoot.querySelector(".searchbox-sort").winControl.selectedItems.getAt(0)['id']);
        },

        _search: function (query, sort, skipTimer) {
            if (this._searchPromise) {
                this._searchPromise.cancel();
            }

            this._currentQuery = query;
            this._currentSort = sort;
            // We want to delay the search so that a user typing doesn't kick off a lot of
            // search requests and lag up the UI.
            var timeoutValue = skipTimer ? 0 : this._defaultUserIdleTimeout;
            this._setSearchQueryTimerBind(timeoutValue);
        },

        _setSearchQueryTimer: function (timeoutValue) {
            if (!this._searchQueryTimeout) {
                this._searchQueryTimeout = setTimeout(function () {
                    this._getSearchResultsBind();
                    this._searchQueryTimeout = null;
                }.bind(this), timeoutValue);
            }
        },

        _resetSearchQueryTimer: function () {
            if (this._searchQueryTimeout) {
                clearTimeout(this._searchQueryTimeout);

                this._searchQueryTimeout = setTimeout(function () {
                    this._getSearchResultsBind();
                }.bind(this), this._defaultUserIdleTimeout);
            }
        },

        _updateListBasedOnFilterandSort: function (options) {
            // This code works with a WinJS binding list object for smaller datasets
            // The template code has a very small dataset that a WinJS bindind list can handle
            // TODO: For a large list call your service to retrieve a filtered /sorted search results list from the server
            // using a virtualized data source and refresh the UI
            // This code calls the data provider search method directly 
            // because the data provider search method always returns the same results regardless of query
            // You will want to update the code to integrate calling a real search API that applies filter and sort settings 
            // to the result

            // Do not call search API if no search query is present
            if ("" !== this._currentQuery) {
                //Update list based on type of content and the configured sort on the page
                if ("Movies" === this._layoutRoot.querySelector(".searchbox-filter").winControl.selectedItems.getAt(0)['id']) {
                    MyApp.Services.search(this._currentQuery).then(
                       function success(results) {
                           if ("A-Z" === this._layoutRoot.querySelector(".searchbox-sort").winControl.selectedItems.getAt(0)['id']) {
                               this._searchResultsListView.itemDataSource =
                                   new WinJS.Binding.List(results).createFiltered(MyApp.Services.filterMoviesOnly).createSorted(MyApp.Services.sortBindingListAtoZ).dataSource;
                           } else { //else Z-A
                               this._searchResultsListView.itemDataSource =
                                   new WinJS.Binding.List(results).createFiltered(MyApp.Services.filterMoviesOnly).createSorted(MyApp.Services.sortBindingListZtoA).dataSource;
                           }
                       }.bind(this),
                       function error() {
                           return MyApp.Utilities.showErrorMessage(
                               WinJS.Resources.getString("networkErrorDescription").value,
                               WinJS.Resources.getString("networkErrorTitle").value);
                       });
                } else if ("TV" === this._layoutRoot.querySelector(".searchbox-filter").winControl.selectedItems.getAt(0)['id']) {
                    MyApp.Services.search(this._currentQuery).then(
                       function success(results) {
                           if ("A-Z" === this._layoutRoot.querySelector(".searchbox-sort").winControl.selectedItems.getAt(0)['id']) {
                               this._searchResultsListView.itemDataSource =
                                   new WinJS.Binding.List(results).createFiltered(MyApp.Services.filterTVOnly).createSorted(MyApp.Services.sortBindingListAtoZ).dataSource;
                           } else { //else Z-A
                               this._searchResultsListView.itemDataSource =
                                   new WinJS.Binding.List(results).createFiltered(MyApp.Services.filterTVOnly).createSorted(MyApp.Services.sortBindingListZtoA).dataSource;
                           }
                       }.bind(this),
                       function error() {
                           return MyApp.Utilities.showErrorMessage(
                               WinJS.Resources.getString("networkErrorDescription").value,
                               WinJS.Resources.getString("networkErrorTitle").value);
                       });
                } else if ("All" === this._layoutRoot.querySelector(".searchbox-filter").winControl.selectedItems.getAt(0)['id']) {
                    MyApp.Services.search(this._currentQuery).then(
                       function success(results) {
                           if ("A-Z" === this._layoutRoot.querySelector(".searchbox-sort").winControl.selectedItems.getAt(0)['id']) {
                               this._searchResultsListView.itemDataSource =
                                   new WinJS.Binding.List(results).createSorted(MyApp.Services.sortBindingListAtoZ).dataSource;
                           } else { //else Z-A
                               this._searchResultsListView.itemDataSource =
                                   new WinJS.Binding.List(results).createSorted(MyApp.Services.sortBindingListZtoA).dataSource;
                           }
                       }.bind(this),
                       function error() {

                           return MyApp.Utilities.showErrorMessage(
                               WinJS.Resources.getString("networkErrorDescription").value,
                               WinJS.Resources.getString("networkErrorTitle").value);
                       });
                }
            }
        }
    });
})();
