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

    WinJS.UI.Pages.define("/pages/browseAll/browseAll.html", {
        _allItemsListView: null,
        // The root element of the page fragment. Rather than using document.getElementById or document.querySelector, you
        // can use this._layoutRoot.querySelector to scope your search to just the page fragment which lowers the risk of
        // getting the wrong element.
        _layoutRoot: null,
        _isFirstPageLoad: true,
        _handleItemInvokedBind: null,
        _createBindingListofRequestedDataBind: null,
        _updateListBasedOnFilterandSortBind: null, 
        _pageTitle: "Browse All",

        enterPage: function (isBackNavigation) {
            this._isBackNavigation = isBackNavigation;
            return MyApp.Utilities.Animation.enterPage(this._layoutRoot, isBackNavigation).then(function afterEnterPage() {
                // The following code remembers the previous scroll position of the list. If we did not have this code, 
                // does not run, the user's scroll position would always be set to the beginning of the list.
                var state = MyApp.Utilities.SessionState[this._pageTitle];
                if (state &&
                    this._isBackNavigation) {
                    // Clear selection for sort and filter data arrays to prevent multi-selected values
                    for (var i = 0; i < filterOptionsArray.length; i++) {
                        filterOptionsArray[i].selected = false;
                    }
                    for (var i = 0; i < sortOptionsArray.length; i++) {
                        sortOptionsArray[i].selected = false;
                    }
                    // Update selection on filter data array and ListPicker control based on session state
                    var filter = this._layoutRoot.querySelector(".browseall-filter").winControl;
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
                    var sort = this._layoutRoot.querySelector(".browseall-sort").winControl;
                    // Update selected item on filter data array based on session state
                    if (state.sortSelection === "A-Z") {
                        sortOptionsArray[0].selected = true;
                    } else {
                        sortOptionsArray[1].selected = true;
                    }
                    // Set updated sort data array on ListPicker control
                    var sortOptions = new WinJS.Binding.List(sortOptionsArray);
                    sort.items = sortOptions;
                    //Update ListView's datasource to correct content type and sort
                    this._updateListBasedOnFilterandSortBind({
                        contentType: state.filterSelection,
                        sort: state.sortSelection
                    });
                    this._allItemsListView.currentItem = { hasFocus: true, index: (state.focusedItem ? state.focusedItem.index : 0) };
                    this._allItemsListView.scrollPosition = state.scrollPosition;
                }
            }.bind(this));
        },

        exitPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.exitPage(this._layoutRoot, isBackNavigation);
        },

        ready: function (element, options) {
            // TODO: Initialize the page here.
            this._layoutRoot = element;
            // Whenever we make a service call it is a good idea to push that service call's promise into the promises array.
            // That way, we have an easy way to cancel all of the outstanding promises. For instance, we cancel all outstanding
            // promises on page navigation.
            this._pagePromises = [];
            this.enterPage = this.enterPage.bind(this);
            this.exitPage = this.exitPage.bind(this);
            this._handleContentAnimatingBind = this._handleContentAnimating.bind(this);
            this._handleFilterChangeBind = this._handleFilterChange.bind(this);
            this._handleSortChangeBind = this._handleSortChange.bind(this);
            this._handleItemInvokedBind = this._handleItemInvoked.bind(this);
            this._createBindingListofRequestedDataBind = this._createBindingListofRequestedData.bind(this);
            this._updateListBasedOnFilterandSortBind = this._updateListBasedOnFilterandSort.bind(this);
            this._allItemsListView = element.querySelector(".browseall-listview").winControl;

            // Hook up button handlers
            element.querySelector(".browseall-search").winControl.addEventListener("invoked", utils.Search.handleSearchButtonInvoked, false);
            this._allItemsListView.addEventListener("iteminvoked", this._handleItemInvokedBind, false);
            element.querySelector(".browseall-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);

            // Set the page title
            if (options.pageTitle) {
                this._pageTitle = options.pageTitle;
                element.querySelector("#browse-title").innerText = this._pageTitle;
            }

            this._allItemsListView.itemTemplate = this._renderMediaItemTemplateFunction;
             
            // Hook up the sort and filter controls
            var filter = element.querySelector(".browseall-filter").winControl;
            filter.addEventListener("change", this._handleFilterChangeBind, false);

            // Clear selection for sort and filter to ensure just one value is selected
            for (var i = 0; i < filterOptionsArray.length; i++) {
                filterOptionsArray[i].selected = false;
            }
            for (var i = 0; i < sortOptionsArray.length; i++) {
                sortOptionsArray[i].selected = false;
            }
            // Set content filter based on the inbound content.  Your app should dynamically do this based on the data passed in from a real service.
            // You can also retreive the saved state values by accessing sessionState = MyApp.Utilities.SessionState[this._pageTitle] and these values
            // sessionState.filterSelection and sessionState.filterSelection
            if (options.pageTitle.indexOf("Movie") > -1) {
                filterOptionsArray[2].selected = true;
            } else if (options.pageTitle.indexOf("TV") > -1) {
                filterOptionsArray[1].selected = true;
            } else {
                filterOptionsArray[0].selected = true;
            }
            // Set selected item on the filter ListPicker
            var filterOptions = new WinJS.Binding.List(filterOptionsArray);
            filter.items = filterOptions;

            var sort = element.querySelector(".browseall-sort").winControl;
            sort.addEventListener("change", this._handleSortChangeBind, false);
            // Set the default sort item on the filter ListPicker
            sortOptionsArray[0].selected = true;
            var sortOptions = new WinJS.Binding.List(sortOptionsArray);
            sort.items = sortOptions;

            // Check to see if the app is returning to the browseall page after viewing details on a media item
            // Note that _isBackwardNavigation is a private property in XboxJS that may not be available in a future version of the platform
            // The alternative would be to use session state to track or to implement the navigating / navigated methods
            // and determine navigation state
            if (!XboxJS.Utilities._isBackwardNavigation) {
                if (options.items) {  // Data already available so passed in directly
                    this._allItemsListView.itemDataSource = (new WinJS.Binding.List(options.items)).dataSource;
                } else if (options.dataFunction) {  // Make a non-virtualized service call, may need to show loading animation
                    this._pagePromises.push(options.dataFunction.then(function (results) {
                        this._allItemsListView.itemDataSource = (new WinJS.Binding.List(results)).dataSource;
                    }.bind(this)));
                } else if (options.virtualizedDataFunction) {
                    // Use a virtualized dataset for large lists
                    // Note that the virtualized data source does not support the WinJS.Binding.List createFiltered and createSorted methods
                    // The virtualized data source implements IListDatasource, which is stateless
                    // Sorting and filtering on a virtualized data source should be done on the server by 
                    // passing in sort / filter options to the virtualized datasource 

                    // Uncomment the below line to start implementing a virtualized data source 
                    // but you will need to update sorting and filtering in browseall.js
                    // if you try to use the current sort and filter code with the virtualized datasource, it will cause the app to crash
                    // You can update your code to perform sort and filter on the server with a virtualized datasource
                    // Virtualized datasource code:
                    // this._allItemsListView.itemDataSource = new MyApp.Utilities.Services.VirtualizedDataSource(options.virtualizedDataFunction, options.getMaxResultsCountFunction);

                    // The template does not have an actual remote service to filter and sort on the server so it uses a binding list instead
                    // This method creates a WinJS.Binding.List to enable sort and filtering to work on the browseall page with a simple binding list
                    // Comment out below code if you uncomment the above line of code to use MyApp.Utilities.Services.VirtualizedDataSource
                    this._createBindingListofRequestedDataBind(options).then(function (results) {
                        this._allItemsListView.itemDataSource = results.dataSource;
                    }.bind(this));
                }
            }

            this._allItemsListView.addEventListener("contentanimating", this._handleContentAnimatingBind, false);

            MyApp.Utilities.Animation.useCustomlistViewAnimation(this._layoutRoot.querySelector(".browseall-listview"));

            // Set view state
            this._initializeLayout(this._allItemsListView, appView.value);

            MyApp.Utilities.hideSpinner();

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

            // Save the session state
            var sessionState = MyApp.Utilities.SessionState[this._pageTitle];
            if (!sessionState) {
                sessionState = { focusedItem: null, scrollPosition: 0 };
                MyApp.Utilities.SessionState[this._pageTitle] = sessionState;

            }
            var currentItem = null;
            var scrollPosition = 0;
            try {
                // Querying the currentItem can throw if listView is loading items from a new dataSource
                currentItem = this._allItemsListView.currentItem;
                scrollPosition = this._allItemsListView.scrollPosition;
            } catch (e) {
                // Do nothing
                // Just save the default values
            }

            sessionState.focusedItem = currentItem;
            sessionState.scrollPosition = scrollPosition;
            // Save filter and sort selections
            sessionState.filterSelection = this._layoutRoot.querySelector(".browseall-filter").winControl.selectedItems.getAt(0)['id'];
            sessionState.sortSelection = this._layoutRoot.querySelector(".browseall-sort").winControl.selectedItems.getAt(0)['id'];
        },

        updateLayout: function (element, viewState, lastViewState) {
            if (lastViewState !== viewState) {
                var allItemsListView = element.querySelector(".browseall-listview").winControl;
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    var handler = function (e) {
                        allItemsListView.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    }
                    allItemsListView.addEventListener("contentanimating", handler, false);
                    this._initializeLayout(allItemsListView, viewState);
                }
            }
        },

        _handleContentAnimating: function (ev) {
            if (ev.detail &&
                ev.detail.type === WinJS.UI.ListViewAnimationType.entrance) {
                if (this._isBackNavigation) {
                    ev.preventDefault();
                }
                this._allItemsListView.removeEventListener("contentanimating", this._handleContentAnimatingBind);
                var initialFocusElement = this._allItemsListView.elementFromIndex(0);
                setImmediate(function afterPageRenderingHasFinished() {
                    if (initialFocusElement &&
                        !this._isBackNavigation) {
                        initialFocusElement.focus();
                    }
                }.bind(this));
            }
        },

        _handleFilterChange: function (ev) {
            this._updateListBasedOnFilterandSortBind({
                contentType: ev.detail.selectedItems.getAt(0)['id'],
                sort: this._layoutRoot.querySelector(".browseall-sort").winControl.selectedItems.getAt(0)['id']
            });
        },

        _handleSortChange: function (ev) {
            this._updateListBasedOnFilterandSortBind({
                contentType: this._layoutRoot.querySelector(".browseall-filter").winControl.selectedItems.getAt(0)['id'],
                sort: ev.detail.selectedItems.getAt(0)['id']
            });
        },

        _handleItemInvoked: function (evt) {
            var mediaTile = this._allItemsListView.elementFromIndex(evt.detail.itemIndex);
            this._allItemsListView.itemDataSource.itemFromIndex(evt.detail.itemIndex)
                    .done(
                        function success(result) {
                            // Check to ensure restricted content is not accessed while data is loading in the Listview
                            if (!mediaTile.winControl.isLocked) {
                                if (result.data.contentType === XboxJS.Data.ContentType.movie) {
                                    WinJS.Navigation.navigate('/pages/details/details.html', result.data);
                                } else if (result.data.contentType === XboxJS.Data.ContentType.tvSeries) {
                                    WinJS.Navigation.navigate('/pages/tvdetails/tvdetails.html', result.data);
                                }
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
        _initializeLayout: function (allItemsListView, viewState) {
            if (viewState === appViewState.snapped) {
                allItemsListView.layout = new ui.ListLayout();
            } else {
                allItemsListView.layout = new ui.GridLayout({ groupHeaderPosition: "top" });
            }
        },
        // A function to render the items in the ListView
        _renderMediaItemTemplateFunction: function (itemPromise, recycledElement) {
            var mediaTile = null;
            if (!recycledElement) {
                mediaTile = new XboxJS.UI.MediaTile();
                WinJS.Utilities.addClass(mediaTile.element, "layout-gallerymediatile");
                recycledElement = mediaTile.element;
            } else {
                var mediaTile = recycledElement.winControl;
                if (mediaTile) {
                    mediaTile.metadata = null;
                }
            }
            var renderPromise = itemPromise.then(function (item) {
                if (mediaTile) {
                    mediaTile.metadata = item.data;
                    if (item.data.contentType === XboxJS.Data.ContentType.movie) {
                        WinJS.Utilities.removeClass(mediaTile.element, "win-mediatile-layout-horizontaltv");
                        WinJS.Utilities.addClass(mediaTile.element, "win-mediatile-layout-horizontalmovie layout-gallerymediatile");
                    } else {
                        WinJS.Utilities.removeClass(mediaTile.element, "win-mediatile-layout-horizontalmovie");
                        WinJS.Utilities.addClass(mediaTile.element, "win-mediatile-layout-horizontaltv layout-gallerymediatile");
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
        // This method is called to create a binding list instead of a virtualized data source.  
        // See comments above in the ready method for changes needed to implement a virtualized data source
        _createBindingListofRequestedData: function (options) {
            if (options.pageTitle.indexOf("Movies") > -1) {
               return MyApp.Services.Movies.getData()
                .then(
                    function success(results) {
                        return WinJS.Promise.wrap(new WinJS.Binding.List(results));
                    }.bind(this),
                    function error() {
                        return MyApp.Utilities.showErrorMessage(
                            WinJS.Resources.getString("networkErrorDescription").value,
                            WinJS.Resources.getString("networkErrorTitle").value);
                    });
            } else if (options.pageTitle.indexOf("TV") > -1) {
               return MyApp.Services.Series.getData()
               .then(
                   function success(results) {
                       return WinJS.Promise.wrap(new WinJS.Binding.List(results));
                   }.bind(this),
                   function error() {
                       return MyApp.Utilities.showErrorMessage(
                           WinJS.Resources.getString("networkErrorDescription").value,
                           WinJS.Resources.getString("networkErrorTitle").value);
                   });
            } else {
               return MyApp.Services.getAllContent()
                .then(
                   function success(results) {
                       return WinJS.Promise.wrap(new WinJS.Binding.List(results));
                   }.bind(this),
                   function error() {
                       return MyApp.Utilities.showErrorMessage(
                           WinJS.Resources.getString("networkErrorDescription").value,
                           WinJS.Resources.getString("networkErrorTitle").value);
                   });
            };
        },

        _updateListBasedOnFilterandSort: function (options) {
            // This code works with a WinJS binding list object for smaller datasets
            // The template code has a very small dataset that a WinJS bindind list can handle
            // TODO: For a large list call your service to retrieve a filtered /sorted list from the server
            // using a virtualized data source and refresh the UI
            //Update list based on type of content and the configured sort on the page
            if ("Movies" === options.contentType) {
                MyApp.Services.Movies.getData().then(
                   function success(results) {
                       if ("A-Z" === options.sort) {
                           this._allItemsListView.itemDataSource =
                               new WinJS.Binding.List(results).createSorted(MyApp.Services.sortBindingListAtoZ).dataSource;
                       } else { //else Z-A
                           this._allItemsListView.itemDataSource =
                               new WinJS.Binding.List(results).createSorted(MyApp.Services.sortBindingListZtoA).dataSource;
                       }
                   }.bind(this),
                   function error() {
                       return MyApp.Utilities.showErrorMessage(
                           WinJS.Resources.getString("networkErrorDescription").value,
                           WinJS.Resources.getString("networkErrorTitle").value);
                   });
            } else if ("TV" === options.contentType) {
                MyApp.Services.Series.getData().then(
                   function success(results) {
                       if ("A-Z" === options.sort) {
                           this._allItemsListView.itemDataSource =
                               new WinJS.Binding.List(results).createSorted(MyApp.Services.sortBindingListAtoZ).dataSource;
                       } else { //else Z-A
                           this._allItemsListView.itemDataSource =
                               new WinJS.Binding.List(results).createSorted(MyApp.Services.sortBindingListZtoA).dataSource;
                       }
                   }.bind(this),
                   function error() {
                       return MyApp.Utilities.showErrorMessage(
                           WinJS.Resources.getString("networkErrorDescription").value,
                           WinJS.Resources.getString("networkErrorTitle").value);
                   });
            } else if ("All" === options.contentType) {
                MyApp.Services.getAllContent().then(
                   function success(results) {
                       if ("A-Z" === options.sort) {
                           this._allItemsListView.itemDataSource =
                               new WinJS.Binding.List(results).createSorted(MyApp.Services.sortBindingListAtoZ).dataSource;
                       } else { //else Z-A
                           this._allItemsListView.itemDataSource =
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
    });
})();
