// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var utils = MyApp.Utilities;

    WinJS.UI.Pages.define("/pages/settings/settings.html", {
        _layoutRoot: null,
        _pinButton: null,
        _pagePromises: null,
        _handleAppPinButtonInvokedBind: null,
        _handleAppUnpinButtonInvokedBind: null,
        _checkIfAppIsPinnedOrNotBind: null,
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            // TODO: Initialize the page here.
            this._layoutRoot = element;
            //Retrieve reference to pin to home button
            this._pinButton = this._layoutRoot.querySelector("#settings-pinapp");
            // Whenever we make a service call it is a good idea to push that service call's promise into the promises array.
            // That way, we have an easy way to cancel all of the outstanding promises. For instance, we cancel all outstanding
            // promises on page navigation.
            this._pagePromises = [];

            this.enterPage = this.enterPage.bind(this);
            this.exitPage = this.exitPage.bind(this);
            element.querySelector(".settings-snapped-gofullscreenbutton").winControl.addEventListener("invoked", utils.handleGoFullScreenButtonInvoked, false);

            // It is always good practice to set initial focus on the UI element the user is most likely to interact with.
            setImmediate(function afterPageRenderingHasFinished() {
                var initialFocusElement = element.querySelector("#settings-help");
                if (initialFocusElement) {
                    initialFocusElement.focus();
                }
            });

            // If the primary user changed get the new users setting data, and update the page
            MyApp.Utilities.User.addEventListener("primaryuserchanged", function () {
                //TODO: update page UI to reflect setting data for new user
            });

            this._handleAppPinButtonInvokedBind = this._handleAppPinButtonInvoked.bind(this);
            this._handleAppUnpinButtonInvokedBind = this._handleAppUnpinButtonInvoked.bind(this);
            this._checkIfAppIsPinnedOrNotBind = this._checkIfAppIsPinnedOrNot.bind(this);

            //Check if app is pinned or not
            this._checkIfAppIsPinnedOrNotBind();


            WinJS.Resources.processAll(element);
        },


        enterPage: function (isBackNavigation) {
            var secondaryAnimations = null;
            var options = {};
            // Pages that aren't primarily a hub or listview have longer page transitions (because hubs and listview controls animate their content in after the page transition)
            options.transitionDuration = MyApp.Utilities.Animation.longEnterPageAnimationDuration;
            if (!isBackNavigation) {
                secondaryAnimations = [
                     { elementToAnimate: this._layoutRoot.querySelector(".layout-settingbuttonlist"), initialTransform: "translate(3000px, 0px)" },
                     { elementToAnimate: this._layoutRoot.querySelector(".layout-settinginfo1"), initialTransform: "translate(4000px, 0px)" },
                     { elementToAnimate: this._layoutRoot.querySelector(".layout-settinginfo2"), initialTransform: "translate(5000px, 0px)" }
                ]
            }

            return MyApp.Utilities.Animation.enterPage(this._layoutRoot, isBackNavigation, secondaryAnimations, options);
        },

        exitPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.exitPage(this._layoutRoot, isBackNavigation);
        },

        unload: function () {
            // Cancel any outstanding promises so that they don't get called and cause an exception after the page goes away.
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
        _checkIfAppIsPinnedOrNot: function () {
            var that = this;
            //Get text resources
            var pinToHomeText = WinJS.Resources.getString('pinAppToHomeButtonLabel');
            var unpinFromHomeText = WinJS.Resources.getString('unpinAppToHomeButtonLabel');
            MyApp.XboxPins.isAppPinnedToHome().then(function success(results) {
                if (results && results.isContained) {
                    that._pinButton.querySelector(".win-text-tiletitle").textContent = unpinFromHomeText.value;
                    that._pinButton.winControl.addEventListener("invoked", that._handleAppUnpinButtonInvokedBind, false);
                    that._pinButton.winControl.removeEventListener("invoked", that._handleAppPinButtonInvokedBind);
                }
                else {
                    that._pinButton.querySelector(".win-text-tiletitle").textContent = pinToHomeText.value;
                    that._pinButton.winControl.addEventListener("invoked", that._handleAppPinButtonInvokedBind, false);
                    that._pinButton.winControl.removeEventListener("invoked", that._handleAppUnpinButtonInvokedBind, false);
                }
            });
        },
        //Pin App to home button command
        _handleAppPinButtonInvoked: function () {
            var that = this;
            MyApp.XboxPins.pinAppToHome()
                  .then(
                      function success(result) {//if pinned, setup the menu to unpin
                          that._pinButton.querySelector(".win-text-tiletitle").textContent = WinJS.Resources.getString('unpinAppToHomeButtonLabel').value;
                          that._pinButton.winControl.addEventListener("invoked", that._handleAppUnpinButtonInvokedBind, false);
                          that._pinButton.winControl.removeEventListener("invoked", that._handleAppPinButtonInvokedBind);
                      },
                      function error(err) {
                          // TODO - handle the error case either. You may want to retry the service call,
                          // log an error fail silently or if it is a catastrophic error then you want to let
                          // the user know.
                      });
        },
        //Unpin app from home AppBar Command
        _handleAppUnpinButtonInvoked: function () {
            var that = this;
            MyApp.XboxPins.unpinAppFromHome()
              .then(
                  function success(result) {//if unpinned, setup the menu to pin
                      that._pinButton.querySelector(".win-text-tiletitle").textContent = WinJS.Resources.getString('pinAppToHomeButtonLabel').value;
                      that._pinButton.winControl.addEventListener("invoked", that._handleAppPinButtonInvokedBind, false);
                      that._pinButton.winControl.removeEventListener("invoked", that._handleAppUnpinButtonInvokedBind);
                  },
                  function error(err) {
                      // TODO - handle the error case either. You may want to retry the service call,
                      // log an error fail silently or if it is a catastrophic error then you want to let
                      // the user know.
                  });
        }
    });
})();
