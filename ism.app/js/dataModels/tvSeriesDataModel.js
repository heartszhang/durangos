(function tvEpisodeDataModelInit() {

    "use strict";

    // The class below represents a television series. Each of the fields below exist for a reason to help you pass certification.
    // Please keep the names the same to make it easier to integrate with the rest of the template which assumes the names below. 
    // Please only only remove elements if you truly don't need them. For instance, if you are creating a data model for a series, 
    // then the URL field may not make sense. When it doubt leave the field and have it return the empty string ("").
    WinJS.Namespace.define("MyApp.Models", {
        SeriesDataModel: WinJS.Class.derive(XboxJS.Data.DataModel, null,
            // Instance members
            {
                // The id that your app uses to identify the piece of content.
                contentId: function (item) {
                    return item.contentId;
                },
                // The rating for the series. The format will correspond to a value in an enumeration defined in a future release.
                // For now, you can use a string. For instance, "PG-13" or "R".
                contentRating: function (item) {
                    return item.contentRating;
                },
                // The type of content. This must correspond to a value in the XboxJS.Data.ContentType enumeration.
                contentType: function (item) {
                    return XboxJS.Data.ContentType.tvSeries;
                },
                // The description for the series.
                description: function (item) {
                    return item.description;
                },
                // The url to the image associated with the series.
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
                // The number of seasons in the series.
                seasons: function (item) {
                    return item.seasons;
                },
                // The title of the series.
                title: function (item) {
                    return item.title;
                },
                // The date when the series was released.
                releaseDate: function(item) {
                    return item.releaseDate;
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
