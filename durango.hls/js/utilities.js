// TODO: Put your JavaScript code that is shared by multiple pages in your application in this file.
// You can split your helper functions into multiple files, but we recommend fewer, longer files over
// multiple short files to decrease the number of file operations at startup.

(function appBarUtilitiesInit() {
    "use strict";

    var nav = WinJS.Navigation;

    var metadata = null;
    var removeFavoritesText = WinJS.Resources.getString('REMOVE_FROM_FAVORITES_VUI_GUI');
    var addFavoritesText = WinJS.Resources.getString('ADD_TO_FAVORITES_VUI_GUI');
    WinJS.Namespace.define("MyApp.Utilities.AppBar", {
        handleAddToQueueInvoked: function () {
            if (!metadata) {
                return;
            }
            var addToQueueAppBarCommand = document.querySelector("#addToQueueAppBarCommand");
            if (addToQueueAppBarCommand.winControl.label === WinJS.Resources.getString("actionsButtonAddQueue").value) {
                MyApp.Services.addToQueue(metadata).then(function success() {
                    addToQueueAppBarCommand.winControl.label = WinJS.Resources.getString("actionsButtonRemoveQueue").value;
                    addToQueueAppBarCommand.winControl.icon = "remove";
                });
            } else {
                MyApp.Services.removeFromQueue(metadata).then(function success() {
                    addToQueueAppBarCommand.winControl.label = WinJS.Resources.getString("actionsButtonAddQueue").value;
                    addToQueueAppBarCommand.winControl.icon = "add";
                });
            }

            // If we are on the queue page, then the list need to be refreshed
            if (WinJS.Navigation.location === "/pages/queue/queue.html") {
                var queueElement = document.querySelector("#queue-listview");
                var queue = null;
                if (queueElement) {
                    queue = document.querySelector("#queue-listview").winControl;
                }
                if (queue) {
                    // Get the page control
                    var queuePageControl = WinJS.UI.Pages.navigator.pageControl;
                    queuePageControl._pagePromises.push(MyApp.Services.Queue.getQueueData().then(function success(result) {
                        if (result.length === 0) {
                            document.querySelector(".emptyqueuelabel").style.display = "block";
                        }
                        queuePageControl._queueListView.itemDataSource = new WinJS.Binding.List(result).dataSource;
                    }));
                }
            }

            // The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
            // Close the appbar
            if (!document.querySelector("#appbar").winControl.hidden)
                document.querySelector("#appbar").winControl.hide();
        },
        handlePinToHomeInvoked: function () {
            if (!metadata) {
                return;
            }

            var pinAppBarCommand = document.querySelector("#pinAppBarCommand");
            if (pinAppBarCommand.winControl.label === WinJS.Resources.getString("appBarPinAppLabel").value) {
                MyApp.XboxPins.pinContentToHome(metadata).then(function success() {
                    pinAppBarCommand.winControl.label = WinJS.Resources.getString("appBarUnpinAppLabel").value;
                    pinAppBarCommand.winControl.icon = "unpin";
                });
            } else {
                MyApp.XboxPins.unpinContentFromHome(metadata).then(function success() {
                    pinAppBarCommand.winControl.label = WinJS.Resources.getString("appBarPinAppLabel").value;
                    pinAppBarCommand.winControl.icon = "pin";
                });
            }
            // The text on the queue button changes, refresh voice elements in case we are in active listening
            XboxJS.UI.Voice.refreshVoiceElements();
            // Close the appbar
            if (!document.querySelector("#appbar").winControl.hidden)
                document.querySelector("#appbar").winControl.hide();
        },
        handleGoHomeButtonInvoked: function appbar_handleGoHomeButtonInvoked() {
            if (WinJS.Navigation.location !== MyApp.Utilities.User.appHomePage && 
                WinJS.Navigation.location !== "/pages/signin/signin.html") {
                nav.navigate(MyApp.Utilities.User.appHomePage);
            }

            // Close the appbar
            if (document.querySelector("#appbar").winControl.visible)
            document.getElementById("appbar").winControl.hide();
        },
        handleSettingsAppBarCommandInvoked: function () {
            if (WinJS.Navigation.location !== "/pages/settings/settings.html" &&
                WinJS.Navigation.location !== "/pages/signin/signin.html") {
                nav.navigate("/pages/settings/settings.html");
            }

            // Close the appbar
            if (document.querySelector("#appbar").winControl.visible)
                document.getElementById("appbar").winControl.hide();
        },
        handleHelpAppBarCommandInvoked: function () {
            if (Windows.Xbox) {
                var primaryUser = MyApp.Utilities.User.tryGetPrimaryUser();
                Windows.Xbox.ApplicationModel.Help.show(primaryUser);

                // Close the appbar
                if (document.querySelector("#appbar").winControl.visible)
                    document.getElementById("appbar").winControl.hide();
            }
        },
        updateContextualAppBarCommands: function () {
            // Find all the contextual AppBar commands and show / hide them based on whether the current selection is a Media Tile
            var addToQueueAppBarCommand = document.querySelector("#addToQueueAppBarCommand");
            var pinAppBarCommand = document.querySelector("#pinAppBarCommand");
            var currentFocusedElement = document.activeElement;
            metadata = currentFocusedElement && currentFocusedElement.winControl && currentFocusedElement.winControl.metadata;
            // TODO: Support pinning from a details page & playback - Look at the location property & allow for pinning
            if (currentFocusedElement &&
                WinJS.Utilities.hasClass(currentFocusedElement, "win-mediatile")) {
                MyApp.Services.isInQueue(metadata).then(function success(isInQueue) {
                    if (isInQueue) {
                        addToQueueAppBarCommand.winControl.label = WinJS.Resources.getString("actionsButtonRemoveQueue").value;
                        addToQueueAppBarCommand.winControl.icon = "remove";
                    } else {
                        addToQueueAppBarCommand.winControl.label = WinJS.Resources.getString("actionsButtonAddQueue").value;
                        addToQueueAppBarCommand.winControl.icon = "add";
                    }
                });

                MyApp.XboxPins.isContentPinnedToHome(metadata).then(function success(isPinned) {
                    if (isPinned) {
                        pinAppBarCommand.winControl.label = WinJS.Resources.getString("appBarUnpinAppLabel").value;
                        pinAppBarCommand.winControl.icon = "unpin";
                    } else {
                        pinAppBarCommand.winControl.label = WinJS.Resources.getString("appBarPinAppLabel").value;
                        pinAppBarCommand.winControl.icon = "pin";
                    }
                });

                // Note: We're not using the AppBarCommand's hidden property, because that will cause layout issues.
                // Instead we add and remove a CSS class.
                WinJS.Utilities.removeClass(addToQueueAppBarCommand, "win-hidden");
                WinJS.Utilities.removeClass(pinAppBarCommand, "win-hidden");

                // Set the AppBar subtitle
                document.querySelector(".win-appbar-subtitle").textContent = "" || metadata.title;

                XboxJS.UI.Voice.refreshVoiceElements();
            } else {
                // Note: We're not using the AppBarCommand's hidden property, because that will cause layout issues
                // Instead we add and remove a CSS class.
                WinJS.Utilities.addClass(addToQueueAppBarCommand, "win-hidden");
                WinJS.Utilities.addClass(pinAppBarCommand, "win-hidden");

                // Clear the AppBar subtitle
                document.querySelector(".win-appbar-subtitle").textContent = "";
            }
        }
    });
})();

(function filtersInit() {
    "use strict";

    // Common filter functions used by the search and browse pages
    WinJS.Namespace.define("MyApp.Utilities.Filters", {

        contentType: function filters_genre(filterOption, item) {
            /// <summary locid="MyApp.Utilities.Filters.contentType">
            /// Filters by content type.
            /// </summary>
            /// <param name="filterOption" type="String" locid="MyApp.Utilities.Filters.contentType:filterOption">
            /// The name of the content type to filter by.
            /// </param>
            /// </signature>

            if (filterOption.id === WinJS.Resources.getString("galleryFilterOptionTV").value) {
                if (item.contentType === XboxJS.Data.ContentType.tvShow ||
                    item.contentType === XboxJS.Data.ContentType.tvEpisode ||
                    item.contentType === XboxJS.Data.ContentType.tvSeries ||
                    item.contentType === XboxJS.Data.ContentType.tvSeason) {
                    return true;
                } else {
                    return false;
                }
            } else if (filterOption.id === WinJS.Resources.getString("galleryFilterOptionMovies").value) {
                if (item.contentType === XboxJS.Data.ContentType.movie) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    });

})();

(function sortsInit() {
    "use strict";

    WinJS.Namespace.define("MyApp.Utilities.Sorts", {

        // Common sort functions used by the search and browse pages
        alphabetical: function sorts_alphabetical(sortOption, first, next) {
            /// <summary locid="MyApp.Utilities.Sorts.alphabetical">
            /// Filters by genre.
            /// </summary>
            /// <param name="filterOption" type="String" locid="MyApp.Utilities.Sorts.alphabetical:filterOption">
            /// The name of the parameter to sort by.
            /// </param>
            /// </signature>

            if (sortOption.id === WinJS.Resources.getString("gallerySortOptionAscending").value) {
                if (first.title > next.title) {
                    return 1;
                } else if (first.title < next.title) {
                    return -1;
                } else {
                    return 0;
                }
            } else if (sortOption.id === WinJS.Resources.getString("gallerySortOptionDescending").value) {
                if (first.title < next.title) {
                    return 1;
                } else if (first.title > next.title) {
                    return -1;
                } else {
                    return 0;
                }
            }
        }
    });

})();

(function searchUtilitiesInit() {
    "use strict";

    // Initialize our search pane
    var previousSearchQuery;
    var searchScope = "";

    // Helper functions to implement the search contract
    WinJS.Namespace.define("MyApp.Utilities.Search", {
        previousSearchQuery: {
            get: function () {
                return previousSearchQuery;
            }
        },
        handleSearchButtonInvoked: function utilities_handleSearchButtonInvoked(evt, scope) {
            /// <summary locid="MyApp.Utilities.handleSearchButtonInvoked">
            /// Brings up the search pane.
            /// </summary>
            if (scope) {
                searchScope = scope;
            }
            else {
                searchScope = "";
            }

            if (WinJS.Navigation.location !== "/pages/search/search.html" &&
                WinJS.Navigation.location !== "/pages/signin/signin.html") {
                WinJS.Navigation.navigate("/pages/search/search.html", { scope: searchScope });
            }

            // Close the AppBar
            document.getElementById("appbar").winControl.hide();
        }
    });
})();

(function sessionStateUtilitiesInit() {
    "use strict";
    var app = WinJS.Application;
    app.sessionState = app.sessionState || {};

    var clearSessionState = true;
    var sessionState = app.sessionState;
    sessionState.search = sessionState.search || { searchScope: "", query: null };

    WinJS.Namespace.define("MyApp.Utilities.SessionState", {
        clearSessionState: {
            get: function () {
                return clearSessionState;
            },
            set: function (value) {
                clearSessionState = !!value;
            }
        },
        search: {
            get: function () {
                return sessionState.search;
            },
            set: function (value) {
                sessionState.search = value;
            }
        },
        browseAll: {
            get: function () {
                return sessionState.browseAll;
            },
            set: function (value) {
                sessionState.browseAll = value;
            }
        }
    });
})();

(function baseUtilitiesInit() {
    "use strict";

    var startScreen = null;
    if (Windows.Xbox) {
        startScreen = Windows.Xbox.UI.StartScreen;
    }

    var _isDialogOpen = false;
    var _timeBeforeShowingASpinner = 1000;
    var _pendingShowSpinner = false;
    var _pendingHideSpinner = false;

    WinJS.Namespace.define("MyApp.Utilities", {
        sandboxId: (Windows.Xbox) ? Windows.Xbox.Services.XboxLiveConfiguration.sandboxId : null, //Sandbox ID, if needed
        titleId: (Windows.Xbox) ? (parseInt(Windows.Xbox.Services.XboxLiveConfiguration.titleId)).toString(16).toUpperCase() : null, // Title ID is required for the pins API.
        SCID: (Windows.Xbox) ? Windows.Xbox.Services.XboxLiveConfiguration.primaryServiceConfigId : null, // SCID is required for the Rich Presence API.
        pageLoadTimeout: {
            get: function () {
                // Time to wait for a page to load in seconds
                return 25000;
            }
        },
        showSpinner: function () {
            /// <summary locid="MyApp.Utilities.showSpinner">
            /// Shows the full screen <progress> spinner. Call this method when waiting for the
            /// entire page to load. For loading individual hub sections, prefer to show a spinner
            /// within the hub section, rather than the full screen one.
            /// </summary>
            MyApp.Utilities.SplashScreen.remove();

            var spinner = document.querySelector(".win-progress-fullscreen");
            var pageContent = document.querySelector("#contenthost");
            _pendingShowSpinner = true;

            // Delay before showing the spinner, because if the page will load fast enough
            // showing a spinner will make it look like the network is slow when it isn't.
            WinJS.Promise.timeout(_timeBeforeShowingASpinner).then(function () {
                if (_pendingShowSpinner) {
                    _pendingShowSpinner = false;
                    if (WinJS.Utilities.hasClass(spinner, "win-hidden")) {
                        WinJS.Utilities.removeClass(spinner, "win-hidden");
                    }

                    if (!WinJS.Utilities.hasClass(pageContent, "win-hidden")) {
                        WinJS.Utilities.addClass(pageContent, "win-hidden");
                    }
                }
            });
        },
        hideSpinner: function () {
            /// <summary locid="MyApp.Utilities.hideSpinner">
            /// Hides the full screen <progress> spinner.
            /// </summary>
            var spinner = document.querySelector(".win-progress-fullscreen");
            var pageContent = document.querySelector("#contenthost");

            if (!WinJS.Utilities.hasClass(spinner, "win-hidden")) {
                WinJS.Utilities.addClass(spinner, "win-hidden");
            }

            if (WinJS.Utilities.hasClass(pageContent, "win-hidden")) {
                WinJS.Utilities.removeClass(pageContent, "win-hidden");
            }

            // Cancel any outstanding requests to show the spinner
            _pendingShowSpinner = false;
        },
        handleGoFullScreenButtonInvoked: function () {
            /// <summary locid="MyApp.Utilities.handleGoFullScreenButtonInvoked">
            /// If the application is visible and in snap mode, this function transitions
            /// the application to full screen.
            /// </summary>
            if (Windows.Xbox) {
                Windows.UI.ViewManagement.ApplicationView.tryUnsnapToFullscreen();
            } else {
                Windows.UI.ViewManagement.ApplicationView.tryUnsnap();
            }
        },
        loadTile: function utilities_loadTile(mediaTile, metadata, pageUri) {
            /// <summary locid="MyApp.Utilities.loadTile">
            /// Assigns metadata to the MediaTile and sets up a click handler.
            /// </summary>
            mediaTile.metadata = metadata;

            // Override the default MediaTile to use an enumeration
            mediaTile.dataWinVoiceOverride = {
                enumerate: "numbersEnumeration",
                targetElement: "select('win-voice-activetext')"
            };

            mediaTile.addEventListener("invoked", (function generateHandleItemInvoked(metadata) {
                return function handleItemInvoked() {
                    WinJS.Navigation.navigate(pageUri, metadata);
                };
            })(metadata, mediaTile));

            // We return the MediaTile's DOM element so the loadTile helper function
            // can be used with a render function.
            return mediaTile.element;
        },
        tryShowDialog: function (dialog) {
            /// <summary locid="MyApp.Utilities.tryShowDialog">
            /// One Xbox One if there is already a dialog, home, or other overlay visible, then trying
            /// to show a dialog will throw an exception.
            /// </summary>
            if (Windows.Xbox) {
                if (!_isDialogOpen &&
                    startScreen.StartScreenView.visibilityState !== startScreen.StartScreenVisibilityState.visible &&
                    document.hasFocus()) {
                    _isDialogOpen = true;
                    var showDialogPromise = dialog.showAsync();
                    showDialogPromise
                        .then(
                            function afterShowDialog(command) {
                                _isDialogOpen = false;
                            },
                            function error() {
                                // No-op
                            });
                    return showDialogPromise;
                } else {
                    return WinJS.Promise.wrapError(false);
                }
            } else {
                return dialog.showAsync();
            }
        },
        showErrorMessage: function (message, title) {
            // TODO: Log relevant error data to your service to analyze

            var errorDialog = new Windows.UI.Popups.MessageDialog(message, title);
            errorDialog.commands.append(new Windows.UI.Popups.UICommand(WinJS.Resources.getString("close").value));
            errorDialog.cancelCommandIndex = 0;
            errorDialog.defaultCommandIndex = 0;

            return MyApp.Utilities.tryShowDialog(errorDialog);
        }
    });

})();

(function virtualizedDataSourceInit() {
    // For more information on using a ListView with custom data sources: http://msdn.microsoft.com/en-us/library/windows/apps/hh770849.aspx

    "use strict";

    // We provide a default function that returns an arbitrary, hardcoded number of max results in case one isn't provided.
    function _defaultGetMaxCountCallback() {
        return new WinJS.Promise.wrap(1000);
    };

    var _listDataAdapter = WinJS.Class.define(
        function ctor(getMoreDataCallback, getMaxCountCallback, options) {

            // This value is the function...
            this._getMoreDataCallback = getMoreDataCallback;

            // Return a number that makes sense for your application. It can be any number since the value can
            // be updated later. However, you will want to choose a number that is greater than the number of items that
            // fit onscreen. If you choose a number that is less than the number of items that fit onscreen then the ListView
            // will not scroll.
            if (getMaxCountCallback) {
                this._getMaxCountCallback = getMaxCountCallback;
            } else {
                this._getMaxCountCallback = _defaultGetMaxCountCallback;
            }

            this._options = options;
        },

        // Data Adapter interface methods
        // These define the contract between the virtualized datasource and the data adapter.
        // These methods will be called by virtualized datasource to fetch items, count etc.
        {
            // This example only implements the itemsFromIndex and count methods

            // Called to get the total count of the items
            // The value of the count can be updated later in the response to itemsFromIndex
            getCount: function () {
                return this._getMaxCountCallback(this._options);
            },

            // Called by the virtualized datasource to fetch items
            // It will request a specific item and hints for a number of items either side of it
            // The implementation should return the specific item, and can choose how many either side
            // to also send back. It can be more or less than those requested.
            //
            // Must return back an object containing fields:
            //   items: The array of items of the form items=[{ key: key1, data : { field1: value, field2: value, ... }}, { key: key2, data : {...}}, ...];
            //   offset: The offset into the array for the requested item
            //   totalCount: (optional) update the value of the count
            itemsFromIndex: function (requestIndex, countBefore, countAfter) {
                return new WinJS.Promise(function (complete, error, progress) {
                    this._getMoreDataCallback(requestIndex, countBefore, countAfter, this._options)
                        .then(
                            function success(items) {
                                var results = [];
                                var numberOfItemsReturned = items.length;
                                for (var i = 0; i < numberOfItemsReturned; i++) {
                                    var currentItem = items[i];
                                    results.push({
                                        key: (requestIndex + i).toString(),
                                        data: currentItem
                                    });
                                }

                                // Note: The logic for whether atStart or atEnd are true will vary from service to service. In this code
                                // we have some simple logic that may or may not work for you.

                                // Determine if we're at the end. If we haven't returned a full page, then we're at the end & need
                                // to tell the ListView to stop creating placeholder elements.
                                var atStart = false;
                                if (requestIndex - countBefore <= 0) {
                                    atStart = true;
                                }

                                // We are at the end of the list if the number of items returned was less than what the ListView asked
                                // for. If the service returned fewer items than the ListView asked, then that must mean we are at
                                // the end of the list, otherwise the service would have returned the right amount.
                                // We are also at the end if the amount of items the ListView has requested is equal to or greater 
                                // than the maximum number of items in the underlying data source, then we are at the end and need 
                                // to tell the ListView to stop creating placeholder elements.
                                var atEnd = false;
                                if ((numberOfItemsReturned < countAfter + countBefore)) {
                                    atEnd = true;
                                }

                                complete({
                                    // The array of items. This array must be in the format: [{ key: key1, data : { field1: value, field2: value, ... }}, { key: key2, data : {...}}, ...];
                                    items: results,
                                    // The positive or negative offset from the requestIndex. Because of the way your service is architected, it may not make sense to return the data
                                    // exactly at the requestIndex the ListView asks for. Therefore, you may. For simplicity we use zero and assume that the requestIndex and the index
                                    // you query your service for are the same so there is no offset.
                                    offset: 0,
                                    // Indicates whether the start of the List has been reached. This will tell the ListView to stop creating placeholder DOM elements
                                    // in that direction.
                                    atStart: atStart,
                                    // Indicates whether the end of the List has been reached or not. This will tell the ListView to stop creating placeholder DOM
                                    // elements in that direction.
                                    atEnd: atEnd
                                });
                            },
                            function error() {
                                return WinJS.Promise.wrapError(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist));
                            });
                }.bind(this));
            }

            // setNotificationHandler: not implemented
            // itemsFromStart: not implemented
            // itemsFromEnd: not implemented
            // itemsFromKey: not implemented
            // itemsFromDescription: not implemented
        });

    var _derivedVirtualizedDataSource = WinJS.Class.derive(WinJS.UI.VirtualizedDataSource, function (getMoreDataCallback, getMaxCountCallback, options) {
        this._baseDataSourceConstructor(new _listDataAdapter(getMoreDataCallback, getMaxCountCallback, options));
    });

    WinJS.Namespace.define("MyApp.Utilities.Services", {
        /// <field type="Element" locid="MyApp.Utilities.Services.VirtualizedDataSource">
        /// Gets the The class that acts as an IListDataApadter to the ListView. The constructor takes one
        /// parameter which is a callback function that returns data.
        /// </field>
        VirtualizedDataSource: {
            get: function () {
                return _derivedVirtualizedDataSource;
            }
        }
    });
})();

(function userManagerInit() {
    "use strict";

    var _lastCurrentUser = null;
    var _primaryUserChangedEventName = "primaryuserchanged";

    // Registers for the set of user-related events when users are added or removed
    function handleUsersAddedRemoved(e) {
        // If there are no signed in users, then navigate to the sign in page.
        if (!MyApp.Utilities.User.tryGetPrimaryUser() && _lastCurrentUser) {
            WinJS.Navigation.navigate(MyApp.Utilities.User.appSignInPage);
        } else if (WinJS.Navigation.history.current.location === MyApp.Utilities.User.appSignInPage) {
            WinJS.Navigation.navigate(MyApp.Utilities.User.appHomePage).done(function () {
                WinJS.Navigation.history.backStack = [];
            });
        }

        //Fire rich presence "Browsing Media App" if a user is signed-in
        // and we are not in playback, otherwise fire rich presence "Watching Media App"
        if (!MyApp.Utilities.Events.mediaPlaybackSessionStarted) {
            MyApp.Utilities.RichPresence.setBrowsingStatus();
        }
        else {
            MyApp.Utilities.RichPresence.setWatchingStatus();
        }
    };

    // Called when the primary user is being changed due to an event
    function handleUserChanged() {
        // 1 - Try the launching user
        var current = Windows.Xbox.ApplicationModel.Core.CoreApplicationContext.currentUser;

        // 2 - Try the cached user
        if (!current || !current.isSignedIn) {
            current = _lastCurrentUser;
        }

        // 3 - Try for any signed in user if we used to have a user. If first launch, we are required to prompt, so let the sign-in code kick in
        if (!current || !current.isSignedIn) {
            // We had a user at one point, but they are gone. Just choose an alternate user to avoid interrupting the current experience
            if (current !== null) {
                for (var x = 0; x < Windows.Xbox.System.User.users.size; x++) {
                    var user = Windows.Xbox.System.User.users[x];

                    if (user.isSignedIn) {
                        current = user;
                        break;
                    }
                }
            }
        }

        // No users, go to sign-in page
        if (!current || !current.isSignedIn) {
            _lastCurrentUser = null;
            //Don't redirect if we are already there...
            if (WinJS.Navigation.history.current.location !== MyApp.Utilities.User.appSignInPage) {
                WinJS.Navigation.navigate(MyApp.Utilities.User.appSignInPage).done(function () {
                    WinJS.Navigation.history.backStack = [];
                });
            }
        } else if (current && current.isSignedIn && !_lastCurrentUser || (_lastCurrentUser && _lastCurrentUser.xboxUserId !== current.xboxUserId)) {
            // User found,
            // check to see if the primary user is still the same, if not, switch our primary user
            MyApp.Utilities.User.switchUser(current);
        }

        return current;
    };

    if (Windows.Xbox) {
        Windows.Xbox.System.User.addEventListener("signoutcompleted", handleUsersAddedRemoved, false);
        Windows.Xbox.System.User.addEventListener("signincompleted", handleUsersAddedRemoved, false);

        Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", handleUserChanged, false);
        Windows.Xbox.ApplicationModel.Core.CoreApplicationContext.addEventListener("currentuserchanged", handleUserChanged, false);
    }


    WinJS.Namespace.define("MyApp.Utilities.User", {
        // This is set in default.js to whatever your app home page is
        appHomePage: null,
        appSignInPage: "/pages/signin/signin.html",

        tryGetPrimaryUser: function userManager_tryGetPrimaryUser() {
            /// <summary locid="MyApp.Utilities.User.tryGetPrimaryUser">
            /// Attempts to determine there is a primary user present. If not, the method returns null.
            /// </summary>

            // Try the cached user
            var current = _lastCurrentUser;

            // No cached user? Find the right user.
            if (!current || !current.isSignedIn) {
                current = handleUserChanged();
            }

            if (current && !current.isSignedIn) {
                current = null;
            }

            return current;
        },
        getGamerPicUrlAsync: function userManager_getGamerPicUrlAsync(size) {
            /// <summary locid="MyApp.Utilities.User.getGamerPicUrlAsync">
            /// Gets the user's gamer profile picture in the specified size.
            /// The size is one of the sizes in the Windows.Xbox.System.UserPictureSize
            /// enumeration.
            /// </summary>

            if (!size) {
                throw new Error("Null parameter: you must specify a size.");
            }

            var currentUser = MyApp.Utilities.User.tryGetPrimaryUser();
            if (currentUser) {
                var imageBuffer = new Windows.Storage.Streams.Buffer(100 * 1024);

                return currentUser.displayInfo.getGamerPictureAsync(size, imageBuffer)
                    .then(
                        // This Deep Magic converts the raw buffer of image data
                        // into an image blob that trident can use and returns a
                        // blob: url for an image tag/object
                        function completed(value) {
                            var extractBlobUrl = function _extractBlobUrl(buffer) {
                                var dataReader = Windows.Storage.Streams.DataReader.fromBuffer(buffer);
                                var byteArray = new Uint8Array(buffer.length);

                                dataReader.readBytes(byteArray);
                                dataReader.close();

                                var blob = new Blob([byteArray], { type: "image/png" });

                                return URL.createObjectURL(blob, { oneTimeOnly: true });
                            };

                            if (value.result === -2147483637) { // E_BOUNDS
                                // Buffer wasn't big enough so make the call again with the required size
                                imageBuffer = new Windows.Storage.Streams.Buffer(value.requiredBufferSize);

                                return currentUser.displayInfo.getGamerPictureAsync(size, imageBuffer).then(
                                    function completed(value) {
                                        return extractBlobUrl(imageBuffer);
                                    }
                                );
                            } else {
                                return extractBlobUrl(imageBuffer);
                            }
                        }.bind(this),
                        function error() {
                            // No-op
                        });
            } else {
                return WinJS.Promise.wrapError("No user found");
            }
        },
        switchUser: function (user) {
            if (_lastCurrentUser && user.xboxUserId === _lastCurrentUser.xboxUserId) {
                // Same user selected, do nothing.
            } else {
                // New user selected
                _lastCurrentUser = user;

                MyApp.Utilities.User.dispatchEvent(_primaryUserChangedEventName);

                //Fire rich presence "Browsing Media App" if a user is signed-in
                // and we are not in playback, otherwise fire rich presence "Watching Media App"
                if (!MyApp.Utilities.Events.mediaPlaybackSessionStarted) {
                    MyApp.Utilities.RichPresence.setBrowsingStatus();
                }
                else {
                    MyApp.Utilities.RichPresence.setWatchingStatus();
                }
            }
        },
        invokeSwitchUser: function userManager_invokeSwitchUser() {
            /// <summary locid="MyApp.Utilities.User.tryGetPrimaryUser">
            /// Shows the user UI that prompts them to choose a user.
            /// </summary>
            if (Windows.Xbox) {
                var controller = Windows.Xbox.Input.Gamepad.gamepads[0];
                var user = MyApp.Utilities.User.tryGetPrimaryUser();
                if (user) {
                    controller = user.controllers[0];
                }

                //Call the account picker
                Windows.Xbox.UI.SystemUI.showAccountPickerAsync(controller, Windows.Xbox.UI.AccountPickerOptions.none)
                    .then(
                        function success(ev) {
                            //Catch any backout actions
                            //Don't do anything
                            if (!ev.user || (_lastCurrentUser && ev.user.xboxUserId === _lastCurrentUser.xboxUserId)) {
                                return;
                            }

                            if (ev.user) {
                                MyApp.Utilities.User.switchUser(ev.user);
                            }
                        },
                        function error() {
                            // No-op
                        });
            }
        }
    });

    MyApp.Utilities.prototype = MyApp.Utilities.User;
    WinJS.Class.mix(MyApp.Utilities, WinJS.Utilities.eventMixin);
})();

(function richPresenceHelperInit() {
    "use strict";

    WinJS.Namespace.define("MyApp.Utilities.RichPresence", {
        setWatchingStatus: function (user) {
            if (Windows.Xbox) {
                for (var x = 0; x < Windows.Xbox.System.User.users.size; x++) {
                    var user = Windows.Xbox.System.User.users[x];

                    if (user.isSignedIn && !user.isGuest) {
                        var liveContext, presenceData;
                        liveContext = new Microsoft.Xbox.Services.XboxLiveContext(user);
                        presenceData = new Microsoft.Xbox.Services.Presence.PresenceData(MyApp.Utilities.SCID, "WatchingMediaApp");
                        liveContext.presenceService.setPresenceAsync(true, presenceData);
                    }
                }
            }
        },
        setBrowsingStatus: function (user) {
            if (Windows.Xbox) {
                for (var x = 0; x < Windows.Xbox.System.User.users.size; x++) {
                    var user = Windows.Xbox.System.User.users[x];

                    if (user.isSignedIn && !user.isGuest) {
                        var liveContext, presenceData;
                        liveContext = new Microsoft.Xbox.Services.XboxLiveContext(user);
                        presenceData = new Microsoft.Xbox.Services.Presence.PresenceData(MyApp.Utilities.SCID, "BrowsingMediaApp");
                        liveContext.presenceService.setPresenceAsync(true, presenceData);
                    }
                }
            }
        }
    });
})();

(function xboxPinsInit() {
    "use strict";

    WinJS.Namespace.define("MyApp.XboxPins", {
        _locale: Windows.Globalization.ApplicationLanguages.languages[0],

        // Must pass in the full enumeration value to the API or it throws an error
        _getContentType: function (type) {
            if (!Windows.Xbox || !Microsoft || !Microsoft.Xbox) {
                return WinJS.Promise.wrap(false);
            }

            if (type === "movie") return Microsoft.Xbox.Services.Marketplace.MediaItemType.movie;
            if (type === "tvSeries") return Microsoft.Xbox.Services.Marketplace.MediaItemType.televisionSeries;
            if (type === "tvSeason") return Microsoft.Xbox.Services.Marketplace.MediaItemType.televisionSeason;
            if (type === "application") return Microsoft.Xbox.Services.Marketplace.MediaItemType.application;
        },
        // Check if App is Pinned
        isAppPinnedToHome: function () {
            if (!Windows.Xbox || !Microsoft || !Microsoft.Xbox) {
                return WinJS.Promise.wrap(false);
            }

            var user = MyApp.Utilities.User.tryGetPrimaryUser();

            if (user) {
                var liveContext = new Microsoft.Xbox.Services.XboxLiveContext(user);
                var pinner = liveContext.entertainmentProfileListService.xboxOnePins;
                // Empty string is passed in for providerId when checking if App is pinned
                // A value of null does not work.  Must be an empty string
                return pinner.containsItemAsync("", "0x" + MyApp.Utilities.titleId).then(function (result) {
                    return WinJS.Promise.wrap(result);
                }, function (err) {
                    // CServer 400 error indicates problem in the API call                             
                });
                // Clean up any references
                pinner = null;
                liveContext = null;
            }
        },
        // Unpin App from Home
        unpinAppFromHome: function () {
            if (!Windows.Xbox || !Microsoft || !Microsoft.Xbox) {
                return WinJS.Promise.wrap(false);
            }

            var user = MyApp.Utilities.User.tryGetPrimaryUser();

            if (user) {
                var liveContext = new Microsoft.Xbox.Services.XboxLiveContext(user);
                var pinner = liveContext.entertainmentProfileListService.xboxOnePins;
                // Empty string is passed in for providerId when checking if App is pinned
                // A value of null does not work.  Must be an empty string
                return pinner.removeItemAsync("", "0x" + MyApp.Utilities.titleId).then(function (result) {
                    return WinJS.Promise.wrap(result);
                    // Pin removed!
                }, function (err) {
                    // CServer 400 error indicates problem in the API call 
                    // or that the Pin does not exist, can't be removed
                });
                // Clean up any references
                pinner = null;
                liveContext = null;
            }
        },
        // Pin app to home
        pinAppToHome: function () {
            if (!Windows.Xbox || !Microsoft || !Microsoft.Xbox) {
                return WinJS.Promise.wrap(false);
            }

            var user = MyApp.Utilities.User.tryGetPrimaryUser();

            if (user) {
                var liveContext = new Microsoft.Xbox.Services.XboxLiveContext(user);
                var pinner = liveContext.entertainmentProfileListService.xboxOnePins;
                // Empty string is passed in for providerId when checking if App is pinned
                // A value of null does not work.  Must be an empty string
                return pinner.addItemAsync(
                    // Must pass in the full type, not enumeration value
                    this._getContentType("application"),
                    "", // ProviderID is empty string when pinning app.  a value of null will not work.
                    "0x" + MyApp.Utilities.titleId, // Provider="0x"+ titleId
                    Windows.Foundation.Uri("https://catalog-ssl.zune.net/v3.5/en-US/image/87046bab-162f-4f47-ae6e-0c1a34e122d5?width=200&amp;height=300&amp;resize=true"),
                    Windows.Foundation.Uri("http://static.neuerdings.com/1369162042/xbox-one-logo-100x100.jpg"),
                    "Contoso",
                    "All your Contoso movies and TV",
                    this._locale
                ).then(function (result) {
                    return WinJS.Promise.wrap(result);
                    // Pin added!
                }, function (err) {
                    // CServer 400 error indicates problem in the API call 
                    // or that the Pin was already created
                });
                // Clean up any references
                pinner = null;
                liveContext = null;
            }
        },
        // Check if content is pinned
        isContentPinnedToHome: function (metadata) {
            if (!Windows.Xbox || !Microsoft || !Microsoft.Xbox) {
                return WinJS.Promise.wrap(false);
            }

            var user = MyApp.Utilities.User.tryGetPrimaryUser();

            if (user) {
                var liveContext = new Microsoft.Xbox.Services.XboxLiveContext(user);
                var pinner = liveContext.entertainmentProfileListService.xboxOnePins;
                return pinner.containsItemAsync(metadata.contentId, "0x" + MyApp.Utilities.titleId)
                       .then(function (result) {
                           return WinJS.Promise.wrap(result.isContained);
                       }, function (err) {
                           return WinJS.Promise.wrap(err);
                           // CServer 400 error indicates problem in the API call                             
                       });
                // Clean up any references
                pinner = null;
                liveContext = null;
            }
        },
        // Unpin Content from Home
        unpinContentFromHome: function (metadata) {
            if (!Windows.Xbox || !Microsoft || !Microsoft.Xbox) {
                return WinJS.Promise.wrap(false);
            }

            var user = MyApp.Utilities.User.tryGetPrimaryUser();

            if (user) {
                var liveContext = new Microsoft.Xbox.Services.XboxLiveContext(user);
                var pinner = liveContext.entertainmentProfileListService.xboxOnePins;

                return pinner.removeItemAsync(metadata.contentId, "0x" + MyApp.Utilities.titleId).then(function (result) {
                    var success = result;
                    return WinJS.Promise.wrap(true);
                    // Pin removed!
                }, function (err) {
                    var error = err
                    // CServer 400 error indicates problem in the API call 
                    // or that the Pin does not exist, can't be removed
                    return WinJS.Promise.wrap(false);
                });
                // Clean up any references
                pinner = null;
                liveContext = null;
            }
        },
        // Pin Content (Movies, TVSeries, TVSeason) to Home
        pinContentToHome: function (metadata) {
            if (!Windows.Xbox || !Microsoft || !Microsoft.Xbox) {
                return WinJS.Promise.wrap(false);
            }

            var user = MyApp.Utilities.User.tryGetPrimaryUser();

            if (user) {

                var liveContext = new Microsoft.Xbox.Services.XboxLiveContext(user);
                var pinner = liveContext.entertainmentProfileListService.xboxOnePins;
                var pkg = Windows.ApplicationModel.Package.current;

                //Ensure contentId, i.e. ProviderID in the API is not an empty string.  
                //Otherwise, the API wil pin the app instead of the content if metadata.contentId = "" and is passed in as ProviderID to the API
                if (metadata.contentId !== "") {
                    return pinner.addItemAsync(
                            // Must pass in the full type, not enumeration value
                            this._getContentType(metadata.contentType),
                            metadata.contentId, // ProviderID must match 0.6 catalog feed ProviderMediaID value for the media item
                            "0x" + MyApp.Utilities.titleId, // Provider="0x"+ titleId
                            Windows.Foundation.Uri("https://catalog-ssl.zune.net/v3.5/en-US/image/87046bab-162f-4f47-ae6e-0c1a34e122d5?width=200&amp;height=300&amp;resize=true"),
                            Windows.Foundation.Uri("http://static.neuerdings.com/1369162042/xbox-one-logo-100x100.jpg"),
                            metadata.title,
                            metadata.subTitle,
                            this._locale
                        ).then(function (result) {
                            var success = result;
                            return WinJS.Promise.wrap(true);
                            // Pin added!
                        }, function (err) {
                            var error = err
                            // CServer 400 error indicates problem in the API call 
                            // or that the Pin was already created
                            return WinJS.Promise.wrap(false);
                        });
                    // Clean up any references
                    pinner = null;
                    liveContext = null;
                }
            }
        }
    });
})();


(function eventsManagerInit() {
    "use strict";
    // Use two sessions, an App session and Media playback session
    // App session is primarily used for stats and acheivement related events
    // Media playback session is primarily for tracking the "minutes played" statistic
    // Keep track of when session start / pause events are called to balance out session end / resume events and pass the related XR

    // When starting / resuming an app session or media playback session, (treat resume the same as starting a new app session)
    // check the state here to determine whether to start a new session or continue to use the existing session
    // If start has not been called, obtain a GUID and set it for the session, then set the related session start member to true

    // When ending a media playback session by either navigating back or suspending the app, call media session end, 
    // set media playback session started to false, set the media playback session Guid to null, and fire the media playback session end event

    // When suspended the app, check to see if app session start is true.
    // If it is, set ap session started to false, set the app Guid value to null, and fire the app session end event

    // When resuming from media pause, check whether mediaPlaybackSessionPause is true.  
    // If it is, set to false and fire the resume event
    WinJS.Namespace.define("MyApp.Utilities.Events", {
        _logger: null,
        logger: function eventsManager_Logger() {
            if (!MyApp.Utilities.Events._logger) {
                MyApp.Utilities.Events._logger = new winrtprovider.XDKS_2B6D540E();
            }
            return MyApp.Utilities.Events._logger;
        },
        _genGuid: null,
        // Use the below call to generate session GUIDs
        newGuid: function eventsManager_GenerateGuid() {
            if (!MyApp.Utilities.Events._genGuid) {
                MyApp.Utilities.Events._genGuid = new MediaAppUtilities.WinRTComponent();
            }
            return MyApp.Utilities.Events._genGuid.generateGuid();
        },
        appSessionStarted: false,
        appSessionGuid: null,
        mediaPlaybackSessionStarted: false,
        mediaPlaybackSessionGuid: null,
        mediaPlaybackSessionPause: false,
        startAppSession: function () {
            if (Windows.Xbox && MyApp.Utilities.User.tryGetPrimaryUser() && !this.appSessionStarted) {
                this.appSessionStarted = true;
                this.appSessionGuid = this.newGuid();

                if (!this._logger) {
                    this.logger();
                }
                this._logger.traceAppSessionStart(MyApp.Utilities.User.tryGetPrimaryUser().xboxUserId, this.appSessionGuid, null, 0, 0);
            }
        },
        endAppSession: function () {
            if (Windows.Xbox && MyApp.Utilities.User.tryGetPrimaryUser() && this.appSessionStarted) {
                var user = MyApp.Utilities.User.tryGetPrimaryUser();
                if (!this._logger) {
                    this.logger();
                }
                this._logger.traceAppSessionEnd(MyApp.Utilities.User.tryGetPrimaryUser().xboxUserId, this.appSessionGuid, null, 0, 0, 0);

                this.appSessionStarted = false;
                this.appSessionGuid = null;
            }
        },
        startPlaybackSession: function () {
            if (Windows.Xbox && MyApp.Utilities.User.tryGetPrimaryUser() && !this.mediaPlaybackSessionStarted) {
                this.mediaPlaybackSessionStarted = true;
                this.mediaPlaybackSessionGuid = MyApp.Utilities.Events.newGuid();

                if (!this._logger) {
                    this.logger();
                }
                this._logger.traceMediaPlaybackStart(MyApp.Utilities.User.tryGetPrimaryUser().xboxUserId, this.mediaPlaybackSessionGuid, null, 0, 0);
            }
        },
        endPlaybackSession: function () {
            if (Windows.Xbox && MyApp.Utilities.User.tryGetPrimaryUser() && this.mediaPlaybackSessionStarted) {
                if (!this._logger) {
                    this.logger();
                }
                this._logger.traceMediaPlaybackEnd(MyApp.Utilities.User.tryGetPrimaryUser().xboxUserId, this.mediaPlaybackSessionGuid, null, 0, 0, 0);
                this.mediaPlaybackSessionStarted = false;
                this.mediaPlaybackSessionGuid = null;
            }
        },
        pausePlaybackSession: function () {
            if (Windows.Xbox && MyApp.Utilities.User.tryGetPrimaryUser() && this.mediaPlaybackSessionStarted && !this.mediaPlaybackSessionPause) {
                if (!this._logger) {
                    this.logger();
                }
                this._logger.traceMediaPlaybackPause(MyApp.Utilities.User.tryGetPrimaryUser().xboxUserId, this.mediaPlaybackSessionGuid, null);
            }
        },
        resumePlaybackSession: function () {
            if (Windows.Xbox && MyApp.Utilities.User.tryGetPrimaryUser() && this.mediaPlaybackSessionPause) {
                if (!this._logger) {
                    this.logger();
                }
                this._logger.traceMediaPlaybackResume(MyApp.Utilities.User.tryGetPrimaryUser().xboxUserId, this.mediaPlaybackSessionGuid, null, 0, 0);
            }
        }
    });
})();

(function playbackInit() {
    "use strict";

    // Common filter functions used by the search and browse pages
    WinJS.Namespace.define("MyApp.Utilities.Playback", {
        _relatedData: [],
        getRelatedData: function (video) {
            this._relatedData = [];
            return MyApp.Services.Movies.getRelatedData(video).then(function (result) {
                this._relatedData = result;                
            }.bind(this));
        },
        attachVideoTagEvents: function (video, layoutRoot) {

            if (!video || !layoutRoot) {
                return;
            }

            video.addEventListener("pause", function handlePause() {
                //Fire the media session pause common event
                MyApp.Utilities.Events.pausePlaybackSession();
            }.bind(this));

            video.addEventListener("play", function handlePause() {
                //Check if resume needs to be called when clicknig play
                MyApp.Utilities.Events.resumePlaybackSession();
            }.bind(this));

            video.addEventListener("error", function handleError() {
                if (video && video.error && video.error.code) {
                    MyApp.Utilities.showErrorMessage(
                            WinJS.Resources.getString("networkErrorDescription").value,
                            WinJS.Resources.getString("networkErrorTitle").value
                        );
                }
            }.bind(this));

            video.addEventListener("stalled", function handleError() {
                this._stalledPromise = WinJS.Promise.timeout(MyApp.Utilities.pageLoadTimeout).done(function () {
                    MyApp.Utilities.showErrorMessage(
                            WinJS.Resources.getString("networkErrorDescription").value,
                            WinJS.Resources.getString("networkErrorTitle").value
                        );
                });
            }.bind(this));

            video.addEventListener("ended", function handleEnded() {
                var mediaPlayer = layoutRoot.querySelector("#mediaPlayer");

                if (!mediaPlayer) {
                    return;
                }

                mediaPlayer = mediaPlayer.winControl;
                mediaPlayer.showControls();

                var appView = Windows.UI.ViewManagement.ApplicationView;
                var appViewState = Windows.UI.ViewManagement.ApplicationViewState;

                if (appView.value !== appViewState.snapped) {
                    WinJS.Utilities.removeClass(layoutRoot.querySelector("#postRollOverlay"), "win-hidden");
                }

                var relatedItem = layoutRoot.querySelector(".post-roll-related-item").focus();

                // If you are using PlayReady, once the end of the video is reached, any seek operation
                // will result in a PlayReady error (which surfaces in the error handler on the video tag).
                // To prevent these errors, we prevent the user from seeking through the MediaPlayer UI.
                mediaPlayer.mediaElementAdapter.isSeekAllowed = false;

                // Set the related videos
                var relatedMediaTiles = layoutRoot.querySelectorAll(".post-roll-related-item");
                for (var i = 0; i < relatedMediaTiles.length; i++) {
                    var itemData = this._relatedData[i];
                    relatedMediaTiles[i].winControl.metadata = itemData;

                    // Override the default MediaTile to use an enumeration
                    relatedMediaTiles[i].winControl.dataWinVoiceOverride = {
                        enumerate: "numbersEnumeration",
                        targetElement: "select('win-voice-activetext')"
                    };

                    (function (data) {
                        var handleItemInvoked = function () {
                            WinJS.Utilities.addClass(layoutRoot.querySelector("#postRollOverlay"), "win-hidden");
                            WinJS.Navigation.navigate("/pages/playback/playback.html", data);
                        }.bind(this);
                        relatedMediaTiles[i].addEventListener("invoked", handleItemInvoked, false);
                    }.bind(this))(itemData);
                };
            }.bind(this));
        }
    });
})();

(function captionsInit() {
    "use strict";

    /*
    * Caption sources are expected as an array of lang and url pairs.
    * Notice that we don't use mux for the default. Example:
    *
    * var muxPrefix = "mux://" + encodeURIComponent(options.url) + "|ms-appx%3A%2F%2F%2F";
    *
    * // Video sources for various languages, note that with captions off we do not use mux
    * var captionSources = [
    *     { lang: "none", url: options.url },
    *     { lang: "en", url: muxPrefix + encodeURIComponent("captionsSampleData/SuperSpeedway.eng.capt.ttm") },
    *     { lang: "es", url: muxPrefix + encodeURIComponent("captionsSampleData/SuperSpeedway.es.capt.ttm") }
    * ];
    * 
    * You can implement easily in one of two ways:
    * 
    * 1. mediaPlayer.initializeCaptions(captionSources);
    * 2. XboxJS.UI.MediaPlayer.ClosedCaptions.initializeCaptions(mediaPlayer, captionSources);
    */

    /*
    * Enable the ability to init closed captions on a MediaPlayer object
    *
    * mediaPlayer.initializeCaptions(captionSources);
    */
    XboxJS.UI.MediaPlayer.prototype.initializeCaptions = function (captionSources) {
        XboxJS.UI.MediaPlayer.ClosedCaptions.initializeCaptions(this, captionSources);
    }

    /*
    * Define the ClosedCaptions namespace built off of the MediaPlayer.
    *
    * XboxJS.UI.MediaPlayer.ClosedCaptions.initializeCaptions(mediaPlayer, captionSources);
    */
    WinJS.Namespace.define("XboxJS.UI.MediaPlayer.ClosedCaptions", {
        // we need to cache the user options data
        mediaPlayer: null,
        captionsEnabled: true,
        backgroundColor: null,
        fontColor: null,
        fontSize: null,
        fontStyle: null,
        fontEdge: null,
        windowColor: null,
        useDefaultOptions: true,
        captionSources: [],
        singleCaptionLanguagePerFile: true,
        captionsConfigured: false,
        selectedLanguage: "none",
        menuOpen: false,
        layoutRoot: null,
        // Just re-maps the enum, the settigns API uses a different enum that GMediaEngineConfig
        fontEffectsEnumToDifferentFontEffectsEnum: function (enumValue) {
            switch (enumValue) {
                // Default
                case 0:
                    return null;
                    // None
                case 1:
                    return 0;
                    // Raised
                case 2:
                    return 3;
                    // Depressed
                case 3:
                    return 2;
                    // Uniform
                case 4:
                    return 1;
                    // Drop shadow
                case 5:
                    return 4;
            }
        },
        // Just re-maps the enum, the settings API uses a different enum that GMediaEngineConfig
        fontSizeEnumToPercent: function (enumValue) {
            switch (enumValue) {
                // 100%
                case 0:
                    return 100;
                    // 50%
                case 1:
                    return 50;
                    // 75%
                case 2:
                    return 75;
                    // 150%
                case 3:
                    return 150;
                    // 200%
                case 4:
                    return 200;

            }
        },
        // Maps from the settings "Font Style" enum, to the actual font value GMediaEngineConfig needs
        fontStyleEnumToFont: function (enumValue) {
            switch (enumValue) {
                // Default
                case 0:
                    return "default";
                    // Monospace Serif
                case 1:
                    return "monospaceSerif";
                    // Proportional Serif
                case 2:
                    return "proportionalSerif";
                    // Monospace Sans Serif
                case 3:
                    return "monospaceSansSerif";
                    // Proportional Sans Serif
                case 4:
                    return "proportionalSansSerif";
                    // Casual
                case 5:
                    return "casual";
                    // Cursive
                case 6:
                    return "cursive";
                    // SmallCaps
                case 7:
                    return "smallCaps";
            }
        },
        // Helper function to convert between r, g, b, a, and an unsigned in that represents RGBA data
        rgbToHex: function (r, g, b, a) {
            return ((r << 24) + (g << 16) + (b << 8) + a);
        },

        // Force system settings enabled/disabled state
        enableSystemCaptions: function (enable) {
            var captionsOptions = Windows.Xbox.System.ClosedCaptions.ClosedCaptionProperties;
            captionsOptions.isEnabled = enable;
        },

        //Doesn't actually do any disabling.
        //It just sets a flag indicating that we aren't using captions right now
        disableCaptions: function () {
            this.captionsConfigured = false;
        },

        // Query the settings API for user specified caption options, convert to value that GMediaEngineConfig understands, and cache them
        queryCaptionSettings: function () {
            var captionsOptions = Windows.Xbox.System.ClosedCaptions.ClosedCaptionProperties;

            this.captionsEnabled = captionsOptions.isEnabled;
            this.backgroundColor = this.rgbToHex(captionsOptions.backgroundColor.r, captionsOptions.backgroundColor.g, captionsOptions.backgroundColor.b, captionsOptions.backgroundColor.a);
            this.fontColor = this.rgbToHex(captionsOptions.fontColor.r, captionsOptions.fontColor.g, captionsOptions.fontColor.b, captionsOptions.fontColor.a);
            this.fontSize = this.fontSizeEnumToPercent(captionsOptions.fontSize);
            this.fontStyle = this.fontStyleEnumToFont(captionsOptions.fontStyle);
            this.fontEdge = this.fontEffectsEnumToDifferentFontEffectsEnum(captionsOptions.fontEdgeAttribute);
            this.windowColor = this.rgbToHex(captionsOptions.windowColor.r, captionsOptions.windowColor.g, captionsOptions.windowColor.b, captionsOptions.windowColor.a);
            this.useDefaultOptions = captionsOptions.useDefaultOptions;
        },

        // Ensure that we are in optimal rendering mode for video playback.  
        //
        // When the Closed Captions menu is displayed playback drops out of optimal video rendering mode.
        //
        // When the that menu is dismissed this function is called to force a re-layout to push rendering back into 
        // optimal rendering mode.
        //
        // In this sample we change and restore the layout of the video element but any change that forces a re-layout would 
        // be sufficient to restore playback to optimal rendering mode.
        //
        // You can track whether you are in optimal rendering mode by polling msIsLayoutOptimalForPlayback  
        //
        // See http://msdn.microsoft.com/en-us/library/windows/apps/hh848311.aspx#the_msislayoutoptimalforplayback_property for more info
        forceOptimalRendering: function () {

            var video = this.mediaPlayer.mediaElementAdapter.mediaElement;
            var originalPos = video.style.position;

            // workaround for optimal rendering by forcing a layout
            // wait for 200ms to make sure that MTC has been dismissed
            setTimeout(function () {
                if (video.style.position === "relative") {
                    video.style.position = "fixed"
                }
                else {
                    video.style.position = "relative"
                }
            }, 200);

            // And after 100ms restore it
            setTimeout(function () {
                if (originalPos === "") {
                    video.style.removeAttribute("position");
                } else {
                    video.style.position = originalPos;
                }
            }, 300);
        },

        // Actually enables and configures the captions in GMediaEngineConfig, can only be done while the video is playing,
        configureCaptions: function () {
            // Query settings again in case the user changed options
            this.queryCaptionSettings();

            var videoTag = this.mediaPlayer.mediaElementAdapter.mediaElement;

            // Connect to the media engine for this particular video tag
            var mfconfig = Windows.Media.MediaEngine.GMediaEngineConfig();
            mfconfig.connectToMediaEngineByID(videoTag.msMediaObjectIndex);

            // Disable captions if the selected option is "none", or settings says captions are off
            if (!this.captionsEnabled || this.selectedLanguage === "none") {
                mfconfig.defaultLanguageId = -1;
                return;
            }

            // You can either supply different files for each language (as this sample does) or supply a single caption file 
            // with captions for each supported language in that single file. Our recommendation is to use multiple captions files.
            // If you do that you can simply set the default language to the first (and only) one in the file
            // This is also the right coding practice if you are using 608 captions
            if (this.singleCaptionLanguagePerFile) {
                this.captionsConfigured = true;
                mfconfig.defaultLanguageId = 0;
            } else {
                // If you have multiple languages per file, then loop through the languages GMediaEngineConfig knows about 
                // (based on what languages are in the captions file) and choose the one the user selected based on the language code
                for (var i = 0; i < mfconfig.numberOfSubtitleLanguages; i++) {
                    var captionData = mfconfig.getSubtitleLanguage(i);
                    if (captionData === selectedLanguage) {
                        this.captionsConfigured = true;
                        mfconfig.defaultLanguageId = i;
                    }
                }
            }

            // If we have selected a caption track and the user has customized caption display
            if (this.captionsConfigured && !this.useDefaultOptions) {
                mfconfig.defaultBackgroundColor = this.backgroundColor;
                mfconfig.defaultTextColor = this.fontColor;
                mfconfig.defaultTextEdge = this.fontEdge;
                mfconfig.defaultTextSize = this.fontSize;
                mfconfig.defaultTextFont = this.fontStyle;
                mfconfig.defaultWindowColor = this.windowColor;
            }
        },

        //Make sure that the captions are configured when the media plays
        captionsHandlePlaying: function () {
            if (!this.captionsConfigured) {
                this.configureCaptions();
            }
        },

        //Perform the captions startup stuff
        initializeCaptions: function (mediaPlayer, captionSources) {
            this.mediaPlayer = mediaPlayer;
            this.captionSources = captionSources;
            this.layoutRoot = mediaPlayer.element.parentNode;
            this.captionsConfigured = false;

            // We query the user settings once at the start of playback, if you want to update during playback, you will have to query
            // settings and update the media engine more frequently
            this.queryCaptionSettings();
            this.loadCaptionsMenu();

            // if we already have a chosen language, start with captions enabled
            if (this.selectedLanguage !== "none") {
                var videoSource = null;

                // Find the right video source for the chosen language
                for (var k = 0; k < this.captionSources.length; k++) {
                    if (this.selectedLanguage === this.captionSources[k].lang) {
                        videoSource = this.captionSources[k].url;
                        // Update the checkmark
                        var optionElements = this.layoutRoot.querySelector("#captionsMenuScrollViewer").querySelectorAll(".win-tile-listbutton");
                        for (var j = 0; j < this.captionSources.length; j++) {
                            WinJS.Utilities.removeClass(optionElements[j], "win-listpicker-item-selected");
                        }
                        WinJS.Utilities.addClass(optionElements[k], "win-listpicker-item-selected");
                        this.captionsEnabled = true;
                        this.enableSystemCaptions(this.captionsEnabled);
                        break;
                    }
                }

                // Switch out the video source to the one for this language
                this.changeVideoSource(videoSource);
            }

            var captionsButton = this.layoutRoot.querySelector(".win-mediaplayer-closedcaptionsbutton");
            captionsButton.addEventListener("click", function () {
                this.layoutRoot.querySelector("#closedcaptionsmenu").winControl.show(captionsButton, "top");
                this.menuOpen = true;
            }.bind(this));

            // Do not allow the MTC to dismiss its controls while the closed caption
            // menu is open
            this.mediaPlayer.addEventListener("beforehidecontrols", function (e) {
                if (this.menuOpen) {
                    e.preventDefault();
                }
            });

            this.mediaPlayer.mediaElementAdapter.mediaElement.addEventListener("playing", this.captionsHandlePlaying.bind(this), false);
            this.mediaPlayer.mediaElementAdapter.mediaElement.addEventListener("ended", this.disableCaptions.bind(this), false);

            // After the popup captions menu has been shown make sure that we return to optimal video rendering
            this.layoutRoot.querySelector("#closedcaptionsmenu").addEventListener("afterhide", function () {
                // Allow the MediaPlayer to dismiss
                this.menuOpen = false;
                // Hide the MediaPlayer if its visible
                this.mediaPlayer.hideControls();
                this.forceOptimalRendering();
            }.bind(this));
        },

        // Populate the captions flyout with the languages this video supports
        loadCaptionsMenu: function () {
            //Create the captions menu
            //Create a scrollViewer
            var ccScrollViewerDiv = document.createElement("div");
            ccScrollViewerDiv.id = "captionsMenuScrollViewer";

            //Build the flyout
            var flyoutDiv = document.createElement("div");
            flyoutDiv.id = "closedcaptionsmenu";
            flyoutDiv.className = "captions-flyout";

            //Add the ScrollViewer to the Flyout
            flyoutDiv.appendChild(ccScrollViewerDiv);

            //Add the flyout to the page
            this.mediaPlayer.element.parentNode.insertBefore(flyoutDiv, this.mediaPlayer.element.nextSibling);

            //Convert our new divs into WinJS.UI objects
            var ccScrollViewer = new XboxJS.UI.ScrollViewer(ccScrollViewerDiv);
            ccScrollViewer.scrollMode = XboxJS.UI.ScrollMode.list;

            var flyout = new WinJS.UI.Flyout(flyoutDiv);

            flyout.addEventListener("aftershow", function () {
                if (this.selectedLanguage != 'undefined') {
                    var optionElements = flyoutDiv.querySelectorAll(".win-tile-listbutton");
                    for (var j = 0; j < this.captionSources.length; j++) {
                        if (optionElements[j].classList.contains("win-listpicker-item-selected")) {
                            optionElements[j].focus();
                        }
                    }
                }
            }.bind(this));

            this.mediaPlayer.addEventListener("beforehidecontrols", function () {
                //check if closed caption flyout is open, if it is, close it
                if (flyout.hidden !== true) {
                    flyout.hide();
                }
            });

            //Populate the new menu
            for (var i = 0; i < this.captionSources.length ; i++) {
                // Create the button for the language
                var outerDiv = document.createElement("div");
                WinJS.Utilities.addClass(outerDiv, "win-tile-listbutton");
                var innerDiv = document.createElement("div");
                WinJS.Utilities.addClass(innerDiv, "win-text-tiletitle");
                WinJS.Utilities.addClass(innerDiv, "win-voice-inactiveext win-listpicker-glyph");

                // Translate the language code to the localized name of the language
                if (this.captionSources[i].lang !== "none") {
                    var language = new Windows.Globalization.Language(this.captionSources[i].lang);
                    innerDiv.textContent = language.nativeName;
                }
                    // Just use "none"
                else {
                    innerDiv.textContent = this.captionSources[i].lang;
                    WinJS.Utilities.addClass(outerDiv, "win-listpicker-item-selected");
                }
                outerDiv.appendChild(innerDiv);

                var itemContainer = new XboxJS.UI.ItemContainer(outerDiv);

                // Click handler for the language
                itemContainer.addEventListener("invoked", (function (lang) {
                    return function () {
                        var oldLang = this.selectedLanguage;

                        setImmediate(function () {
                            // If the language is "none", disable captions, otherwise, enable them
                            if (lang === "none") {
                                this.captionsEnabled = false;
                                this.enableSystemCaptions(this.captionsEnabled);
                                this.selectedLanguage = lang;
                            } else {
                                this.captionsEnabled = true;
                                this.enableSystemCaptions(this.captionsEnabled);
                                this.selectedLanguage = lang;
                            }

                            // Clear the "check mark"
                            var optionElements = flyoutDiv.querySelectorAll(".win-tile-listbutton");
                            for (var j = 0; j < this.captionSources.length; j++) {
                                WinJS.Utilities.removeClass(optionElements[j], "win-listpicker-item-selected");
                            }

                            // Change video source
                            if (this.selectedLanguage !== oldLang) {
                                var videoSource = null;
                                // Find the right video source for the chosen language
                                for (var k = 0; k < this.captionSources.length; k++) {
                                    if (this.selectedLanguage === this.captionSources[k].lang) {
                                        videoSource = this.captionSources[k].url;
                                        WinJS.Utilities.addClass(optionElements[k], "win-listpicker-item-selected");
                                        break;
                                    }
                                }

                                // Switch out the video source to the one for this language
                                this.changeVideoSource(videoSource);
                            }
                            flyout.hide();
                        }.bind(this));
                    }.bind(this);
                }.bind(this))(this.captionSources[i].lang));

                // load the language options in a scroll viewer in case there are more than fit in the flyout
                var scrollViewer = this.layoutRoot.querySelector("#captionsMenuScrollViewer");
                scrollViewer.querySelector(".win-scrollviewer-contentelement").appendChild(outerDiv);
                scrollViewer.winControl.refresh();
            }
        },

        // This function changes the video source by swapping out the video tag, which causes a temporary memory bump, but results in a faster transition,
        // you can achieve the same thing by just changing the source then seeking
        changeVideoSource: function (src) {
            this.video = document.createElement("video");
            this.captionsConfigured = false;

            this.video.addEventListener("playing", this.captionsHandlePlaying.bind(this), false);
            this.video.addEventListener("ended", this.disableCaptions.bind(this), false);

            var changeVideo = function () {
                this.video.removeEventListener("canplay", changeVideo);
                MyApp.Utilities.Playback.attachVideoTagEvents(this.video, this.layoutRoot);

                var oldVideo = this.mediaPlayer.mediaElementAdapter.mediaElement;
                this.video.currentTime = oldVideo.currentTime;

                if (oldVideo.playbackRate === 1) {
                    this.video.play();
                }
                else {
                    this.mediaPlayer._exitFastForwardOrRewind();
                    this.mediaPlayer.pause();
                }

                this.mediaPlayer.mediaElementAdapter.mediaElement = this.video;

                oldVideo.style.display = "none";
                oldVideo.parentNode.removeChild(oldVideo);

                oldVideo.removeAttribute("src");
                oldVideo = null;

            }.bind(this);

            this.video.addEventListener("canplay", changeVideo, false);

            this.video.src = src;
        }
    });
})();