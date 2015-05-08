(function tvEpisodeDataModelInit() {

    "use strict";

    // The class below models a television season. Each of the fields below exist to help you pass certification.
    // Please do not to remove any fields, but feel free to add as many as you like.
    WinJS.Namespace.define("MyApp.Models", {
        SeasonDataModel: WinJS.Class.derive(XboxJS.Data.DataModel, null,
            // Instance members
            {
                // The id that your app uses to identify the season.
                contentId: function (item) {
                    return item.contentId;
                },
                // The rating for the season. The format will correspond to a value in an enumeration defined in a future release.
                // For now, you can use a string. For instance, "PG-13" or "R".
                contentRating: function (item) {
                    return item.contentRating;
                },
                // The type of content. This must correspond to a value in the XboxJS.Data.ContentType enumeration.
                contentType: function (item) {
                    return XboxJS.Data.ContentType.tvSeason;
                },
                // The description for the season.
                description: function (item) {
                    return item.description;
                },
                // The url to the image associated with the season.
                episodes: function (item) {
                    return item.episodes;
                },
                // The url to the image associated with the season.
                image: function (item) {
                    return item.image;
                },
                // The width of the image in the image field.
                imageWidth: function (item) {
                    return item.imageWidth;
                },
                // The height of the image in the image field.
                imageHeight: function (item) {
                    return item.imageHeight;
                },
                // A Boolean that tells the system whether a user needs the premium video
                // privilege to access the content. By default this value is set to true.
                requiresPremiumVideoPrivilege: function () {
                    return true;
                }
            }
        )
    });
})();
