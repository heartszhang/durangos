(function movieDataModelInit() {

    "use strict";

    // The class below represents a queue item. Each of the fields below exist for a reason to help you pass certification.
    // Please keep the names the same to make it easier to integrate with the rest of the template which assumes the names below. 
    // Please only only remove elements if you truly don't need them. For instance, if you are creating a data model for a series, 
    // then the URL field may not make sense. When it doubt leave the field and have it return the empty string ("").
    WinJS.Namespace.define("MyApp.Models", {
        QueueDataModel: WinJS.Class.derive(XboxJS.Data.DataModel, null,
            // Instance members
            {
                // The id that your app uses to identify the queue item.
                contentId: function (item) {
                    return item.contentId;
                },
                // The rating for the queue item. The format will correspond to a value in an enumeration defined in a future release.
                // For now, you can use a string. For instance, "PG-13" or "R".
                contentRating: function (item) {
                    return item.contentRating;
                },
                // The type of content. This must correspond to a value in the XboxJS.Data.ContentType enumeration.
                contentType: function (item) {
                    return item.contentType;
                },
                // The description for the queue item.
                description: function (item) {
                    return item.description;
                },
                // The url to the image associated with the queue item.
                image: function (item) {
                    return item.image;
                },
                // The width of the image in the image field.
                imageWidth: function (item) {
                    return item.imageWidth;
                },
                // The width of the image in the image field.
                imageHeight: function (item) {
                    return item.imageHeight;
                },
                // The height of the image in the image field.
                length: function (item) {
                    return item.length;
                },
                // The duration of the queue item.
                title: function (item) {
                    return item.title;
                },
                // A Boolean that tells the system whether a user needs the premium video
                // privilege to access the content. By default this value is set to true.
                requiresPremiumVideoPrivilege: function () {
                    return item.requiresPremiumVideoPrivilege;
                },
                // The data model for the actual queue item. For instance, if the queue item is a movie
                // then this field would hold a MovieDataModel. This value needs to always be calculated 
                // when the queue list is created since the underlying item may change (i.e. get a new Url) 
                // between application sessions.
                item: function (item) {
                    if (item.contentType === XboxJS.Data.ContentType.movie) {
                        return MyApp.Services.Movies.getMovie(item.contentId).then(function (result) {
                            return WinJS.Promise.wrap(result[0]);
                        });
                    }
                    else if (item.contentType === XboxJS.Data.ContentType.tvSeries) {
                        return MyApp.Services.Series.getSeries(item.contentId).then(function (result) {
                            return WinJS.Promise.wrap(result[0]);
                        });
                    }
                }
            })
    });
})();
