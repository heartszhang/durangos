(function movieDataModelInit() {

    "use strict";

    // The class below represents a movie. Each of the fields below exist for a reason to help you pass certification.
    // Please keep the names the same to make it easier to integrate with the rest of the template which assumes the names below. 
    // Please only only remove elements if you truly don't need them. For instance, if you are creating a data model for a series, 
    // then the URL field may not make sense. When it doubt leave the field and have it return the empty string ("").
    WinJS.Namespace.define("MyApp.Models", {
        MovieDataModel: WinJS.Class.derive(XboxJS.Data.DataModel, null,
            // Instance members
            {
                // The id that your app uses to identify the movie.
                contentId: function (item) {
                    return item.contentId;
                },
                // The rating for the movie. The format will correspond to a value in an enumeration defined in a future release.
                // For now, you can use a string. For instance, "PG-13" or "R".
                contentRating: function (item) {
                    return item.contentRating;
                },
                // The type of content. This must correspond to a value in the XboxJS.Data.ContentType enumeration.
                contentType: function (item) {
                    return XboxJS.Data.ContentType.movie;
                },
                // The description for the movie.
                description: function (item) {
                    return item.description;
                },
                // The url to the image associated with the movie.
                image: function (item) {
                    return item.image;
                },
                // The width of the image in the image field.
                imageWidth: function(item) {
                    return item.imageWidth;
                },
                // The height of the image in the image field.
                imageHeight: function(item) {
                    return item.imageHeight;
                },
                // The duration of the movie.
                length: function (item) {
                    return item.length;
                },
                // The title of the movie.
                title: function (item) {
                    return item.title;
                },
                // The release date of the movie
                releaseDate: function (item) {
                    return item.releaseDate;
                },
                // The url to the video stream.
                url: function (item) {
                    return item.url;
                },
                // A Boolean that tells the system whether a user needs the premium video
                // privilege to access the content. By default this value is set to true.
                requiresPremiumVideoPrivilege: function () {
                    return true;
                },
                mediaType: function () {
                    return "movie";
                },
                acquisitionType: function () {
                    return "subscription";
                },
                acquisitionContext: function () {
                    return "browsing video";
                },
                acquisitionContextType: function () {
                    return "playlist";
                },
                acquisitionContextId: function () {
                    return "123314324";
                },
                mediaSubscriptionType: function () {
                    return "mediaSubscriptionType";
                },
                subscriptionTier: function () {
                    return "gold";
                }
            })
    });
})();
