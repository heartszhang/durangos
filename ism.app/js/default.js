(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;
    var utils = MyApp.Utilities;
    var appBarInitialized = false;
    var splash = null;
    var performOneTimeSetup = true;

    MyApp.Utilities.User.appHomePage = "/pages/home/home.html";

    // A enumeration of numbers that can be used by voice to number the voice labels of your items 1-50. If you have a page with more than 50 items, add more entries to the array.
    var numbersEnumeration = [
        { phrase: '1' }, { phrase: '2' }, { phrase: '3' }, { phrase: '4' }, { phrase: '5' }, { phrase: '6' }, { phrase: '7' }, { phrase: '8' }, { phrase: '9' }, { phrase: '10' },
        { phrase: '11' }, { phrase: '12' }, { phrase: '13' }, { phrase: '14' }, { phrase: '15' }, { phrase: '16' }, { phrase: '17' }, { phrase: '18' }, { phrase: '19' }, { phrase: '20' },
        { phrase: '21' }, { phrase: '22' }, { phrase: '23' }, { phrase: '24' }, { phrase: '25' }, { phrase: '26' }, { phrase: '27' }, { phrase: '28' }, { phrase: '29' }, { phrase: '30' },
        { phrase: '31' }, { phrase: '32' }, { phrase: '33' }, { phrase: '34' }, { phrase: '35' }, { phrase: '36' }, { phrase: '37' }, { phrase: '38' }, { phrase: '39' }, { phrase: '40' },
        { phrase: '41' }, { phrase: '42' }, { phrase: '43' }, { phrase: '44' }, { phrase: '45' }, { phrase: '46' }, { phrase: '47' }, { phrase: '48' }, { phrase: '49' }, { phrase: '50' }
    ];

    function handleResize() {
        // Safely update the extended splash screen image coordinates. This function will be fired in response to snapping, unsnapping, rotation, etc...
        if (splash) {
            var isSnapped = appView.value === appViewState.snapped;
            MyApp.Utilities.SplashScreen.updateImageLocation(splash, isSnapped);
        }
    };

    function nonCriticalSetupTasks() {
        // Hook up the AppBar commands
        // The activate can fire multiple times (such as a deep link navigation when the application is already running). We only
        // want to initialize the AppBar commands once.
        if (!appBarInitialized) {
            appBarInitialized = true;

            // Set the AppBar title
            document.querySelector(".win-appbar-title").textContent = WinJS.Resources.getString("applicationName").value;

            WinJS.Resources.processAll(document.querySelector("#appbar"));

            document.querySelector("#addToQueueAppBarCommand").addEventListener("click", utils.AppBar.handleAddToQueueInvoked, false);
            document.querySelector("#pinAppBarCommand").addEventListener("click", utils.AppBar.handlePinToHomeInvoked, false);
            document.querySelector("#homeAppBarCommand").addEventListener("click", utils.AppBar.handleGoHomeButtonInvoked, false);
            document.querySelector("#searchAppBarCommand").addEventListener("click", utils.Search.handleSearchButtonInvoked, false);
            document.querySelector("#switchUserAppBarCommand").addEventListener("click", utils.User.invokeSwitchUser, false);
            document.querySelector("#settingsAppBarCommand").addEventListener("click", utils.AppBar.handleSettingsAppBarCommandInvoked, false);
            document.querySelector("#helpAppBarCommand").addEventListener("click", utils.AppBar.handleHelpAppBarCommandInvoked, false);

            // Set the gamerpic to the AppBar "switch user" icon
            if (Windows.Xbox) {
            MyApp.Utilities.User.getGamerPicUrlAsync(Windows.Xbox.System.UserPictureSize.small).then(function (url) {
                document.querySelector("#userPicture").src = url;
                WinJS.Utilities.removeClass(document.querySelector("#userPicture"), "win-hidden");
            }, function error() {
                // No-op
            });
            }

            document.querySelector("#appbar").winControl.addEventListener("beforeshow", function () {
                MyApp.Utilities.AppBar.updateContextualAppBarCommands();
            }, false);
        }
    };

    function handlePrimaryUserChanged() {
        // TODO: perform any app level tasks necessary to change the user context of the app to the new user. Keep in mind that you should not perform any action
        // that may be considered destructive. For example, do not: 
        // * Exit video playback
        // * Navigate to a sign-up page if the new user is not a subscriber of your service/app, but there is still a subscriber signed in
        // * Navigate to your home page

        // Set the gamerpic to the AppBar "switch user" icon
        MyApp.Utilities.User.getGamerPicUrlAsync(Windows.Xbox.System.UserPictureSize.small).then(function (url) {
            document.querySelector("#userPicture").src = url;
            WinJS.Utilities.removeClass(document.querySelector("#userPicture"), "win-hidden");
        }, function error() {
            // No-op
        });
    };

    app.addEventListener("activated", function (args) {
        // Register a voice enumeration for numbering items 1, 2, 3, etc. Voice enumerations are useful
        // if the titles of your MediaTiles are difficult to say. For instance, very long titles, or titles
        // whose language is not the native language of the app. For instance, a "Korean Drama" section in 
        // an app that is published in the United States.
        XboxJS.UI.Voice.registerEnumeration('numbersEnumeration', numbersEnumeration);
	
        // Call parseProtoclActivation to determine if we are being requested to navigate to a deep link.
        // If so we should navigate to the page in our application that handles the link.
        var protocolActivation = XboxJS.Navigation.parseProtocolActivation(args);

        //Handle resume from pin
        if (protocolActivation &&
            //args.detail.previousExecutionState !== Windows.ApplicationModel.Activation.ApplicationExecutionState.terminated &&
            protocolActivation.options.authority === "default" &&
            WinJS.Navigation.location !== "") {
            return;
        }



        // Show an extended splash screen
        MyApp.Utilities.SplashScreen.show(args.detail.splashScreen);

        performOneTimeSetup && window.addEventListener("resize", handleResize, false);
        performOneTimeSetup && MyApp.Utilities.User.addEventListener("primaryuserchanged", handlePrimaryUserChanged);

        var processAllPromise = WinJS.UI.processAll()
            .then(function () {
                // Delay the background and non-critical tasks so that UI loads quickly
                var delay = 5000;
                WinJS.Promise.timeout(delay).then(nonCriticalSetupTasks);

                var contentLoadPromise = WinJS.Promise.as(null);

                // Parse the activation arguments and init
                var navigationUri = nav.location,
                    navigationOptions = nav.state;

                if (args.detail.kind === activation.ActivationKind.protocol) {

                    // Call parseProtocolActivation to determine if we are being requested to navigate to a deep link.
                    // If so we should navigate to the page in our application that handles the link.
                    var protocolActivation = XboxJS.Navigation.parseProtocolActivation(args);

                    // If we started due to a protocol navigation, navigate to the correct page.
                    if (protocolActivation) {
                        switch (protocolActivation.locationName) {
                            // Navigate to the appropriate page based on the request
                            case XboxJS.Navigation.LocationName.mediaDetailsUri:
                            case XboxJS.Navigation.LocationName.mediaWebVideoDetailsUri:
                                if (protocolActivation.options.contentType === "Movie") {
                                    navigationUri = "/pages/details/details.html";
                                } else { //TVSeason or TVSeries
                                    navigationUri = "/pages/tvdetails/tvdetails.html";
                                }
                                break;
                            case XboxJS.Navigation.LocationName.mediaWebVideoCollectionDetailsUri:
                                navigationUri = "/pages/playlists/playlists.html";
                                break;
                            case XboxJS.Navigation.LocationName.mediaPlaybackUri:
                                navigationUri = "/pages/playback/playback.html";
                                break;
                            case XboxJS.Navigation.LocationName.mediaSettingsUri:
                                navigationUri = "/pages/settings/settings.html";
                            case XboxJS.Navigation.LocationName.mediaSearchUri:
                                navigationUri = "pages/search/search.html";
                            default: navigationUri = MyApp.Utilities.User.appHomePage; break;
                        }

                        if (protocolActivation.options.contentId) {
                            if (protocolActivation.options.contentType === "Movie") {
                                contentLoadPromise = MyApp.Services.getMetadata(protocolActivation.options.contentId).then(function success(result) {
                                    navigationOptions = result;
                                });
                            }
                            if (protocolActivation.options.contentType === "TVSeries") {
                                contentLoadPromise = MyApp.Services.Series.getSeries(protocolActivation.options.contentId).then(function success(result) {
                                    navigationOptions = result[0];
                                    //Always send to TVDetails page for this simple example.  
                                    navigationUri = "/pages/tvdetails/tvdetails.html"; 
                                    // Ideally go to playback for next episode to watch for the user
                                });
                            } else
                                if (protocolActivation.options.contentType === "TVSeason") {
                                    contentLoadPromise = MyApp.Services.Season.getData(protocolActivation.options.contentId).then(function success(result) {
                                        // Get the fake season.  
                                        // Since there are only three fake seasons just get the first TVSeries and return that one.
                                        contentLoadPromise = MyApp.Services.Series.getSeries("abcd1251").then(function success(result) {
                                            navigationOptions = result[0];
                                            // Always send to TVDetails page for this simple example.
                                            navigationUri = "/pages/tvdetails/tvdetails.html";   
                                            // Ideally go to playback for next episode to watch for the user
                                        });
                                    });
                                }
                        } else {
                            navigationUri = MyApp.Utilities.User.appHomePage;
                        }


                        // We push the app homepage on the back stack if we're deep-linked into so that when the user presses
                        // back they will end up on the app's homepage rather than going back to the app that launched them.
                        if (nav.history.backStack.length == 0 && navigationUri !== MyApp.Utilities.User.appHomePage) {
                            nav.history.backStack.push({ location: MyApp.Utilities.User.appHomePage });
                        }
                    }

                    MyApp.Utilities.SplashScreen.remove();
                }

                //If we were terminated, our state was likely saved in the checkpoint event upon suspension.
                //If so, restore our session and go back to where we were before the termination.
                if (app.sessionState &&
                    app.sessionState.history &&
                    args.detail.previousExecutionState === Windows.ApplicationModel.Activation.ApplicationExecutionState.terminated) {
                    nav.history = app.sessionState.history;
                    navigationUri = nav.history.current.location;
                    navigationOptions = nav.history.current.state;
                }

                // Sign in 
                if (Windows.Xbox) {
                    // Also set rich presence for the signed in user.
                    if (!MyApp.Utilities.User.tryGetPrimaryUser()) {
                        navigationUri = "/pages/signin/signin.html";
                    } else {
                        // TODO: Load any data associated with the user that you need for your app.
                    }
                }

                // Start a new app session for common events for App launch
                // Verify a user is signed-in.  Otherwise, if not user is signed-in will start the app session
                // in sign-in.html
                MyApp.Utilities.Events.startAppSession();

                // Fire rich presence "Browsing Media App" if a user is signed-in
                // Otherwise will fire rich presence on sign-in in signin.html
                MyApp.Utilities.RichPresence.setBrowsingStatus();

                // Create a new instance of your data provider. Typically there will be one instance
                // in the whole application.
                if (!MyApp.Services) {
                    MyApp.Services = new MyApp.Data.DataProvider();
                }

                if (navigationUri) {
                    if (navigationUri !== MyApp.Utilities.User.appHomePage || nav.location !== MyApp.Utilities.User.appHomePage) {
                        nav.history.current.initialPlaceholder = true;
                        return contentLoadPromise.then(function videoLoaded() {
                            nav.navigate(navigationUri, navigationOptions);
                        });
                    }
                    else {
                        MyApp.Utilities.SplashScreen.remove();
                    }
                } else if (nav.location !== MyApp.Utilities.User.appHomePage) {
                    return contentLoadPromise.then(function videoLoaded() {
                        nav.navigate(MyApp.Utilities.User.appHomePage);
                    });
                }

                // Set to false once we have finished the one-time initialization
                performOneTimeSetup = false;
            });

        args.setPromise(processAllPromise);
    });

    app.addEventListener("checkpoint", function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. If you need to 
        // complete an asynchronous operation before your application is 
        // suspended, call args.setPromise().

        // Fire the App session end event on suspend since there isn't a "terminate" or "app exit" event
        MyApp.Utilities.Events.endAppSession();

        // Save off the history.
        //Make sure that when you resume that you nav to the place indicated in the history.location
        app.sessionState.history = nav.history;
    });

    Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", function (args) {
        // TODO: The application is about to be resumed from suspension.  If you need to load
        // any state, check who's logged in to see if primary user changed, etc. this is the
        // event.

        // Start a new app session for common events for App launch
        MyApp.Utilities.Events.startAppSession();

        // Fire rich presence "Browsing Media App"
        MyApp.Utilities.RichPresence.setBrowsingStatus();
    });
    
    // A global error handler that will catch any errors that are not caught and handled by your application's code.
    // Ideally the user should never hit this function because you have gracefully handled the error before it has 
    // had a chance to bubble up to this point. In case the error gets this far, the function below will display an
    // error dialog informing the user that an error has occurred.
    app.onerror = function (evt) {
        // TODO: It is a good practice to capture the following information so you can analyze the crash and fix it:
        // 1. args.detail.errorCode
        // 2. args.detail.errorMessage
        // 3. args.detail.stack
        MyApp.Utilities.showErrorMessage(
                WinJS.Resources.getString("unexpectedErrorDescription").value,
                WinJS.Resources.getString("unexpectedErrorTitle").value
            );
    };

    app.start();
})();