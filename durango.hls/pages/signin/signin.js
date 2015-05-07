(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/signin/signin.html", {
        _layoutRoot: null,
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.

        enterPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.enterPage(this._layoutRoot, isBackNavigation);
        },

        exitPage: function (isBackNavigation) {
            return MyApp.Utilities.Animation.exitPage(this._layoutRoot, isBackNavigation);
        },

        ready: function (element, options) {
            this._layoutRoot = element;
            WinJS.Resources.processAll(this._layoutRoot);
            this.enterPage = this.enterPage.bind(this);
            this.exitPage = this.exitPage.bind(this);

            // Hide the user gamer pic in the appbar
            WinJS.Utilities.addClass(document.querySelector("#userPicture"), "win-hidden");

            MyApp.Utilities.SplashScreen.remove();

            var button = this._layoutRoot.querySelector(".signin-signin");

            button.winControl.addEventListener("invoked", function () {
                this.signIn();
            }.bind(this));

            var intervalHandle = setInterval(function () {
                if (document.hasFocus()) {
                    button.focus();
                    clearInterval(intervalHandle);
                }
            }, 100);
        },

        unload: function () {
            // TODO: Respond to page unload
            // Show the userPic in the appbar
            WinJS.Utilities.removeClass(document.querySelector("#userPicture"), "win-hidden");
        },

        updateLayout: function (element, viewState, lastViewState) {
            // TODO: Respond to changes in viewState.
        },
        signIn: function () {
            // This is the only line needed to do the user switching.
            // The rest of the page can be customized however.
            MyApp.Utilities.User.invokeSwitchUser();
        }
    });
})();
