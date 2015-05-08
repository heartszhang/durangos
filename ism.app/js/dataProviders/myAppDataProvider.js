(function myAppDataProviderInit() {

    "use strict";

    // The data provider class makes calls to your application's services to retrieve to populate the UI.
    // 
    WinJS.Namespace.define("MyApp.Data", {
        DataProvider: WinJS.Class.derive(XboxJS.Data.DataProvider,
            function dataprovider_ctor() {
                // You must call the base class constructor to instantiate a DataProvider.
                this._baseDataProviderConstructor();

                // We disable caching for all data provider methods that retrieve a slice of data
                // at a time for ListViews.
                this.Series.getRange.items = null;
                this.Movies.getRange.items = null;
                this.getSearchResultsRange.items = null;
                this.getAllContentRange.items - null;
            },
        {
            // The methods to retrieve data for a collection of television series.
            // TODO: Replace the methods below with real calls to your service. For each service call
            // be sure to implement the error handler in addition to the success handler.
            // a good way to handle errors is to show the user an error message with information that
            // will let the user know what has happened and offer solutions to fix it.
            Series: {
                DataModel: MyApp.Models.SeriesDataModel,
                getFeaturedData: function () {
                    return WinJS.Promise.wrap(MyApp.SeriesData);
                },
                getPopularData: function () {
                    return WinJS.Promise.wrap(MyApp.SeriesData);
                },
                getNewReleaseData: function () {
                    return WinJS.Promise.wrap(MyApp.SeriesData);
                },
                getData: function () {
                    return WinJS.Promise.wrap(MyApp.SeriesData);
                },
                getRange: function (requestIndex, countBefore, countAfter) {
                    // TODO: When making the request for data from your service you want to take the function parameters into
                    // account so that you retrieve the right subset of the full data that: subset that your service can return to render the UI:
                    //     requestIndex - The index of the item to retrieve.
                    //     countBefore  - The number of items to retrieve from before the selected item.
                    //     countAfter   - The number of items to retrieve from after the selected item.
                    //
                    // For best results, you want to retrieve a subset of data that your service can return quickly & is enough to populate 
                    // the requested range specified by the function parameters: requestIndex, countBefore and countAfter.

                    // Create a sub-array of the total results to minmick only part of the total results being returned from the service.
                    var subsetOfSeriesResults = MyApp.SeriesData.slice(requestIndex - countBefore, requestIndex + countAfter + 1);
                    return WinJS.Promise.wrap(subsetOfSeriesResults);
                },
                getSeries: function (id) {
                    MyApp.Services.Series.getSeries.items = null;

                    var series;
                    for (var i = 0; i < MyApp.SeriesData.length; i++) {
                        if (MyApp.SeriesData[i].contentId === id) {
                            series = MyApp.SeriesData[i];
                            break;
                        }
                    }
                    return WinJS.Promise.wrap([series]);
                },
                search: function (query) {
                    return WinJS.Promise.wrap(MyApp.SeriesSearchResults);
                },
                filter: function (filterOptions) {
                    // TODO: Call your service's API to return filtered results
                    return WinJS.Promise.wrap(MyApp.SeriesSearchResults);
                },
                sort: function (sortOptions) {
                    // TODO: Call your service's API to return filtered results
                    return WinJS.Promise.wrap(MyApp.SeriesSearchResults);
                }
            },
            getMaxSeriesDataCount: function () {
                // TODO: Replace this with your own constant for what the mamimum number of results you want to ever display to 
                // the user (even if your service can return more). You can choose any number you want so long as your service
                // can return that many.
                return new WinJS.Promise.as(MyApp.SeriesData.length);
            },
            // The methods to retrieve data for a collection of television seasons.
            // TODO: Replace the methods below with real calls to your service.
            Season: {
                DataModel: MyApp.Models.SeasonDataModel,
                getData: function (season) {
                    MyApp.Services.Season.getData.items = null;

                    if (season !== undefined) {
                        return WinJS.Promise.wrap(MyApp.SeasonData[season]);
                    }
                    else {
                        return WinJS.Promise.wrap([]);
                    }
                }
            },
            // The methods to retrieve data for a collection of television episodes.
            // TODO: Replace the methods below with real calls to your service.
            Episodes: {
                DataModel: MyApp.Models.EpisodeDataModel,
                getData: function (season) {
                    MyApp.Services.Episodes.getData.items = null;
                    if (season !== undefined) {
                        return WinJS.Promise.wrap(MyApp.EpisodeData[season]);
                    }
                    else {
                        return WinJS.Promise.wrap([]);
                    }
                }
            },
            // The methods to retrieve data for a collection of movies.
            // TODO: Replace the methods below with real calls to your service.
            Movies: {
                DataModel: MyApp.Models.MovieDataModel,
                getNewReleaseData: function () {
                    return WinJS.Promise.wrap(MyApp.MovieData);
                },
                getPopularData: function () {
                    return WinJS.Promise.wrap(MyApp.MovieData);
                },
                getFeaturedData: function () {
                    return WinJS.Promise.wrap(MyApp.MovieData);
                },
                getData: function () {
                    return WinJS.Promise.wrap(MyApp.MovieData);
                },
                getRange: function (requestIndex, countBefore, countAfter) {
                    // TODO: When making the request for data from your service you want to take the function parameters into
                    // account so that you retrieve the right subset of the full data that: subset that your service can return to render the UI:
                    //     requestIndex - The index of the item to retrieve.
                    //     countBefore  - The number of items to retrieve from before the selected item.
                    //     countAfter   - The number of items to retrieve from after the selected item.
                    //
                    // For best results, you want to retrieve a subset of data that your service can return quickly & is enough to populate 
                    // the requested range specified by the function parameters: requestIndex, countBefore and countAfter.

                    // Create a sub-array of the total results to minmick only part of the total results being returned from the service.
                    var subsetOfMoviesResults = MyApp.MovieData.slice(requestIndex - countBefore, requestIndex + countAfter + 1);
                    return WinJS.Promise.wrap(subsetOfMoviesResults);
                },
                getRelatedData: function (item) {
                    MyApp.Services.Movies.getRelatedData.items = null;
                    if (item !== undefined && item.contentId !== undefined) {
                        if (MyApp.RelatedData[item.contentId] !== undefined) {
                            return WinJS.Promise.wrap(MyApp.RelatedData[item.contentId]);
                        }
                        else {
                            return WinJS.Promise.wrap([]);
                        }
                    }
                    else {
                        return WinJS.Promise.wrap([]);
                    }
                },
                getMovie: function (id) {
                    MyApp.Services.Movies.getMovie.items = null;

                    var movie;
                    for (var i = 0; i < MyApp.MovieData.length; i++) {
                        if (MyApp.MovieData[i].contentId === id) {
                            movie = MyApp.MovieData[i];
                            break;
                        }
                    }
                    // We wrap the item in an array, because the base DataProvider class
                    // expects results returned as a collection
                    return WinJS.Promise.wrap([movie]);
                },
                search: function (query, requestIndex, countBefore, countAfter) {
                    return WinJS.Promise.wrap(MyApp.MovieSearchResults);
                },
                filter: function (filterOptions) {
                    // TODO: Call your service's API to return filtered results
                    return WinJS.Promise.wrap(MyApp.MovieSearchResults);
                },
                sort: function (sortOptions) {
                    // TODO: Call your service's API to return filtered results
                    return WinJS.Promise.wrap(MyApp.MovieSearchResults);
                }
            },
            getMaxMoviesDataCount: function () {
                // TODO: Replace this with your own constant for what the mamimum number of results you want to ever display to 
                // the user (even if your service can return more). You can choose any number you want so long as your service
                // can return that many.
                return new WinJS.Promise.as(MyApp.MovieData.length);
            },
            Queue: {
                DataModel: MyApp.Models.QueueDataModel,
                getQueueData: function () {
                    return WinJS.Promise.wrap(MyApp.QueueData);
                }
            },
            // The methods below are helper methods related to the data above.
            // They are part of the DataProvider class for easy access because they are
            // often used in conjunction with DataProvider calls to retrieve data.
            // TODO: Add your own helper methods to the ones below.
            addToQueue: function (item) {
                // Add to queue cache
                var queueItem = new MyApp.Models.QueueDataModel();

                return new WinJS.Promise(function (complete) {
                    queueItem.initialize(item)
                        .then(
                            function success() {
                                MyApp.Services.Queue.getQueueData.items.push(queueItem);
                                complete(queueItem);
                            },
                            function error() {
                                return MyApp.Utilities.showErrorMessage(
                                    WinJS.Resources.getString("networkErrorDescription").value,
                                    WinJS.Resources.getString("networkErrorTitle").value);
                            });
                });
            },
            removeFromQueue: function (item) {
                var index = -1;
                for (var i = 0; i < MyApp.QueueData.length; i++) {
                    if (MyApp.QueueData[i].contentId === item.contentId) {
                        index = i;
                    }
                }

                var queueLength = MyApp.QueueData.length;
                MyApp.QueueData = MyApp.QueueData.slice(0, index).concat(MyApp.QueueData.slice(index + 1, queueLength));

                // Remove from cache
                if (MyApp.Services.Queue.getQueueData.items) {
                    var items = MyApp.Services.Queue.getQueueData.items;
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].contentId === item.contentId) {
                            items.splice(i, 1);
                        }
                    }
                }

                return WinJS.Promise.wrap(true);
            },
            isInQueue: function (item) {
                return MyApp.Services.Queue.getQueueData()
                    .then(
                        function success(results) {
                            for (var i = 0; i < results.length; i++) {
                                if (results[i].contentId === item.contentId) {
                                    return WinJS.Promise.wrap(true);
                                }
                            }

                            return WinJS.Promise.wrap(false);
                        },
                        function error() {
                            return MyApp.Utilities.showErrorMessage(
                                WinJS.Resources.getString("networkErrorDescription").value,
                                WinJS.Resources.getString("networkErrorTitle").value);
                        });
            },
            getAllContent: function (item) {
                var allContent = MyApp.MovieData.concat(MyApp.SeriesData);
                return WinJS.Promise.wrap(allContent);
            },
            getMetadata: function (contentId) {
                // For this sample we always return the same Movie
                return WinJS.Promise.wrap(MyApp.MovieData[0]);
            },
            search: function (query) {
                var mergedResults = [];
                var promises = [];

                promises.push(MyApp.Services.Movies.search(query)
                    .then(
                        function success(results) {
                            mergedResults = mergedResults.concat(results);
                        }),
                        function error() {
                            return MyApp.Utilities.showErrorMessage(
                                WinJS.Resources.getString("networkErrorDescription").value,
                                WinJS.Resources.getString("networkErrorTitle").value);
                        });

                promises.push(MyApp.Services.Series.search(query)
                    .then(
                        function success(results) {
                            mergedResults = mergedResults.concat(results);
                        }),
                        function error() {
                            return MyApp.Utilities.showErrorMessage(
                                WinJS.Resources.getString("networkErrorDescription").value,
                                WinJS.Resources.getString("networkErrorTitle").value);
                        });

                return WinJS.Promise.join(promises)
                    .then(
                        function success() {
                            return new WinJS.Promise(function (complete, error) {
                                complete(mergedResults);
                            },
                            function error() {
                                return MyApp.Utilities.showErrorMessage(
                                    WinJS.Resources.getString("networkErrorDescription").value,
                                    WinJS.Resources.getString("networkErrorTitle").value);
                            });
                });
            },
            getMaxBrowseAllResultsCount: function () {
                // TODO: Replace this with your own constant for what the mamimum number of results you want to ever display to 
                // the user (even if your service can return more). You can choose any number you want so long as your service
                // can return that many.
                return new WinJS.Promise.as(MyApp.MovieData.length + MyApp.SeriesData.length);
            }, 
            getAllContentRange: function (requestIndex, countBefore, countAfter, options) {
                var allMergedResults = [];
                var promises = [];

                promises.push(MyApp.Services.Movies.getData()
                    .then(
                        function success(results) {
                            allMergedResults = allMergedResults.concat(results);
                        }),
                        function error() {
                            return MyApp.Utilities.showErrorMessage(
                                WinJS.Resources.getString("networkErrorDescription").value,
                                WinJS.Resources.getString("networkErrorTitle").value);
                        });

                promises.push(MyApp.Services.Series.getData()
                    .then(
                        function sucess(results) {
                            allMergedResults = allMergedResults.concat(results);
                        }),
                        function error() {
                            return MyApp.Utilities.showErrorMessage(
                                WinJS.Resources.getString("networkErrorDescription").value,
                                WinJS.Resources.getString("networkErrorTitle").value);
                        });

                return WinJS.Promise.join(promises)
                    .then(
                        function success() {
                            return new WinJS.Promise(function (complete, error) {
                                // Create a sub-array of the total results to minmick only part of the total results being returned from the service.
                                var subsetOfMergedResults = allMergedResults.slice(requestIndex - countBefore, requestIndex + countAfter + 1);
                                complete(subsetOfMergedResults);
                            },
                            function error() {
                                return MyApp.Utilities.showErrorMessage(
                                    WinJS.Resources.getString("networkErrorDescription").value,
                                    WinJS.Resources.getString("networkErrorTitle").value);
                            });
                });
            },
            getMaxSearchResultsCount: function () {
                // TODO: Replace this with your own constant for what the mamimum number of results you want to ever display to 
                // the user (even if your service can return more). You can choose any number you want so long as your service
                // can return that many.
                return new WinJS.Promise.as(MyApp.MovieSearchResults.length + MyApp.SeriesSearchResults.length);
            }, 
            getSearchResultsRange: function (requestIndex, countBefore, countAfter, options) {
                var query = options.query;
                var searchScope = options.searchScope;
                var allMergedResults = [];
                var promises = [];

                if (searchScope === "tv") {
                    return WinJS.Promise.wrap(MyApp.SeriesSearchResults);
                } else if (searchScope === "movies") {
                    return WinJS.Promise.wrap(MyApp.MovieSearchResults);
                } else {
                    promises.push(MyApp.Services.Movies.search(query)
                        .then(
                            function success(results) {
                                allMergedResults = allMergedResults.concat(results);
                            }),
                            function error() {
                                return MyApp.Utilities.showErrorMessage(
                                    WinJS.Resources.getString("networkErrorDescription").value,
                                    WinJS.Resources.getString("networkErrorTitle").value);
                            });

                    promises.push(MyApp.Services.Series.search(query)
                        .then(
                            function success(results) {
                                allMergedResults = allMergedResults.concat(results);
                            }),
                            function error() {
                                return MyApp.Utilities.showErrorMessage(
                                    WinJS.Resources.getString("networkErrorDescription").value,
                                    WinJS.Resources.getString("networkErrorTitle").value);
                            });

                    return WinJS.Promise.join(promises)
                        .then(
                            function success() {
                                return new WinJS.Promise(function (complete, error) {
                                    // Create a sub-array of the total results to minmick only part of the total results being returned from the service.
                                    var subsetOfMergedResults = allMergedResults.slice(requestIndex - countBefore, requestIndex + countAfter + 1);
                                    complete(subsetOfMergedResults);
                            },
                            function error() {
                                return MyApp.Utilities.showErrorMessage(
                                    WinJS.Resources.getString("networkErrorDescription").value,
                                    WinJS.Resources.getString("networkErrorTitle").value);
                            });
                    });
                }
            },
            // Sort functions for WinJS bindind list.createSorted method
            // For the sample data, Movie 1, Movie 10, Movie 11, etc. are grouped together in the sort since they start with "1"
            sortBindingListAtoZ: function (first, second) {
                if (first.title.toLowerCase() === second.title.toLowerCase()) {
                    return 0;
                } else if (first.title.toLowerCase() > second.title.toLowerCase()) {
                    return 1;
                } else {
                    return -1;
                };
            },
            sortBindingListZtoA: function (first, second) {
                if (first.title.toLowerCase() === second.title.toLowerCase()) {
                    return 0;
                } else if (first.title.toLowerCase() < second.title.toLowerCase()) {
                    return 1;
                } else {
                    return -1;
                };
            },
            // Filter functions for WinJS.binding list.createFiltered method
            filterMoviesOnly: function (item) {
                if (item.contentType === "movie") {
                    return 1;
                } else {
                    return 0;
                };
            },
            filterTVOnly: function (item) {
                if (item.contentType === "tvSeries") {
                    return 1;
                } else {
                    return 0;
                };
            },
            filterToAll: function (item) {
                return 1;
            }
        })
    });
})();