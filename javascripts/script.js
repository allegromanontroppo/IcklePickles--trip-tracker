/* Author: Mark Holland for IcklePickles.org

*/
(function ($, map_id, flickrApiKey, flickrPhotosetId, undefined) {

    String.prototype.flickrDate = function () {
        var year = this.substr(0, 4),
            month = this.substr(5, 2),
            day = this.substr(7, 2);
        return new Date(year, month, day).toDateString();
    };

    function showLoader($target) {
        $target.empty().append(
        $('<img>', {
            src: 'images/ajax-loader.gif',
            height: '48px',
            width: '48px'
        }));
    }

    var map = (function () {
        var pub = {},
            map = undefined,
            points = [];

        pub.load = function (callback) {

            if (map) {
                clearMarkers();
                callback();
            }

            window.mapLoaded = function () {
                var britain = new google.maps.LatLng(55, -3),
                    mapOpts = {
                        center: britain,
                        zoom: 5,
                        mapTypeId: google.maps.MapTypeId.ROADMAP,
                        streetViewControl: false,
                        scrollwheel: false
                    };
                map = new google.maps.Map(document.getElementById(map_id), mapOpts);
                callback();
            };
            $.getScript("//maps.google.com/maps/api/js?sensor=false&region=GB&callback=mapLoaded");
        };

        function clearMarkers() {
            if (points) {
                $.each(points, function (i, v) {
                    v.marker.setMap(null);
                });
            }
            points = [];
        }

        pub.plotStart = function () {
            new google.maps.Marker({
                map: map,
                position: new google.maps.LatLng(50.0666, -5.733),
                icon: 'images/cyclingsport.png',
                shadow: 'images/shadow.png'
            });
        };

        pub.plotEnd = function () {
            new google.maps.Marker({
                map: map,
                position: new google.maps.LatLng(58.64401, -3.06999),
                icon: 'images/cyclingsport.png',
                shadow: 'images/shadow.png'
            });
        };

        pub.plotPhoto = function (photo) {
            var marker, infoWindow, contentTemplate = '<a href="{{LINK}}" target="_blank" style="display:block"><img src="{{SRC}}" style="height:{{HEIGHT}}px;max-height:190px"></a><p>{{TITLE}}<p>Taken on {{DATE}}</p><p><a href="{{LINK}}" target="_blank">View full size</a></p><p><input type="button" class="map_traverse" value="&lt;&lt; Previous" data-index="{{INDEX_PREVIOUS}}"><input type="button" class="map_traverse" value="Next &gt;&gt;" data-index="{{INDEX_NEXT}}"></p>',
                content = contentTemplate.replace(/{{LINK}}/g, photo.link).replace(/{{SRC}}/, photo.fullsize).replace(/{{HEIGHT}}/g, photo.height).replace(/{{TITLE}}/g, photo.title).replace(/{{DATE}}/, photo.dateTaken.flickrDate()).replace(/{{INDEX_PREVIOUS}}/, photo.index - 1).replace(/{{INDEX_NEXT}}/, photo.index + 1),
                p = {};

            marker = new google.maps.Marker({
                map: map,
                position: new google.maps.LatLng(photo.latitude, photo.longitude),
                icon: photo.thumbnail,
                shadow: 'images/shadow.png'
            });

            infoWindow = new google.maps.InfoWindow({
                content: content,
                position: new google.maps.LatLng(photo.latitude, photo.longitude)
            });

            p = {
                marker: marker,
                infoWindow: infoWindow,
                photo: photo.fullsize
            };

            google.maps.event.addListener(marker, 'click', function () {
                showInfoWindow(p);
            });

            points.push(p);
        };

        pub.showInfoWindow = function (index) {
            showInfoWindow(points[index]);
        };

        function showInfoWindow(p) {
            closeAnyOpenInfoWindows();
            if (p) {
                var image = new Image();
                image.onload = function () {
                    p.infoWindow.open(map, p.marker);
                };
                image.src = p.photo;
            }
        }

        function closeAnyOpenInfoWindows() {
            $.each(points, function (i, v) {
                v.infoWindow.close();
            });
        }

        pub.fitPhotos = function () {

            if (points.length === 0) return;

            var north = points[0].marker.getPosition().lat(),
                south = points[0].marker.getPosition().lat(),
                east = points[0].marker.getPosition().lng(),
                west = points[0].marker.getPosition().lng(),
                southWest, northEast, latLngBounds;

            $.each(points, function (i, v) {
                if (v.marker.getPosition().lat() > north) north = v.marker.getPosition().lat();
                else if (v.marker.getPosition().lat() < south) south = v.marker.getPosition().lat();
                if (v.marker.getPosition().lng() > east) east = v.marker.getPosition().lng();
                else if (v.marker.getPosition().lng() < west) west = v.marker.getPosition().lng();
            });

            southWest = new google.maps.LatLng(south, west);
            northEast = new google.maps.LatLng(north, east);
            latLngBounds = new google.maps.LatLngBounds(southWest, northEast);
            map.fitBounds(latLngBounds);
        };

        return pub;
    }());

    var flickr = (function () {

        var pub = {},
            data = {};

        pub.load = function (page, callback) {
            var urlTemplate = 'http://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key={{API_KEY}}&photoset_id={{PHOTOSET_ID}}&extras=date_taken,geo,url_sq,url_t,url_s&per_page=18&page={{PAGE}}&format=json&jsoncallback=?',
                url = urlTemplate.replace(/{{API_KEY}}/, flickrApiKey).replace(/{{PHOTOSET_ID}}/, flickrPhotosetId).replace(/{{PAGE}}/, page);
            $.getJSON(url, function (d) {
                data = d;
                callback();
            });
        };

        pub.isOk = function () {
            return data && data.stat === 'ok';
        };

        pub.log = function () {
            console.log(data);
        };

        pub.render = function ($target) {
            var itemTemplate = '<li data-index="{{INDEX}}"><img src="{{SRC}}"></li>',
                render = $.map(data.photoset.photo, function (element, i) {
                    return itemTemplate.replace(/{{SRC}}/, element.url_sq).replace(/{{INDEX}}/, i);
                }).join('');
            $target.empty().append(render);
        };

        pub.photoIterator = function (callback) {
            var linkTemplate = 'http://www.flickr.com/photos/{{USER_ID}}/{{PHOTO_ID}}';
            $.each(data.photoset.photo, function (i, v) {
                callback({
                    thumbnail: v.url_t,
                    fullsize: v.url_s,
                    height: v.height_s,
                    link: linkTemplate.replace(/{{USER_ID}}/, data.photoset.owner).replace(/{{PHOTO_ID}}/, v.id),
                    title: v.title,
                    dateTaken: v.datetaken,
                    latitude: v.latitude,
                    longitude: v.longitude,
                    index: i
                });
            });
        };

        pub.setPageXofY = function ($target) {
            var pagingTemplate = "Page {{X}} of {{Y}}",
                paging = pagingTemplate.replace(/{{X}}/, data.photoset.page).replace(/{{Y}}/, data.photoset.pages);
            $target.html(paging);
        };

        pub.getPreviousPageIndex = function () {
            var p = Number(data.photoset.page);
            if (!isNaN(p)) {
                p = p - 1;
                if (p >= 0) {
                    return p;
                }
            }
            return undefined;
        };

        pub.getNextPageIndex = function () {
            var p = Number(data.photoset.page);
            if (!isNaN(p)) {
                p = p + 1;
                if (p <= data.photoset.pages) {
                    return p;
                }
            }
            return undefined;
        };

        return pub;

    }());

    var loadPhotos = function (page) {

            var $photos = $('#photos');
            showLoader($photos);

            flickr.load(page || 1, function () {
                if (flickr.isOk()) {
                    flickr.render($photos);
                    flickr.setPageXofY($('#pages'));
                    map.load(function () {
                        map.plotStart();
                        map.plotEnd();
                        flickr.photoIterator(map.plotPhoto);
                        map.fitPhotos();
                    });
                }
            });
        };

    $('#paging .previous').click(function (e) {
        e.preventDefault();
        var previousPage = flickr.getPreviousPageIndex();
        if (previousPage) {
            loadPhotos(previousPage);
        }
    });

    $('#paging .next').click(function (e) {
        e.preventDefault();
        var nextPage = flickr.getNextPageIndex();
        if (nextPage) {
            loadPhotos(nextPage);
        }
    });

    $('#photos li, input.map_traverse').live('click', function (e) {
        map.showInfoWindow($(this).data('index'));
        return false;
    });

    loadPhotos();

    var twitter = (function () {

        var pub = {},
            data = [],
            tweets_to_pull = 5,
            timeline = 'http://twitter.com/statuses/user_timeline/icklepickles.json';

        pub.load = function (callback) {
            $.get(timeline, {
                count: tweets_to_pull
            }, function (d) {
                data = d;
                callback();
            }, 'jsonp');
        };

        pub.render = function ($target) {
            var tweetTemplate = '<li>{{BODY}}<span><a href="{{LINK}}" target="_blank">{{POSTED}}</a></span></li>',
                render = $.map(data, function (tweet) {
                    return tweetTemplate.replace(/{{BODY}}/, extractStatus(tweet)).replace(/{{LINK}}/, extractStatusUrl(tweet)).replace(/{{POSTED}}/, extractTime(tweet));
                }).join('');
            $target.empty().append(render);
        };

        pub.log = function () {
            console.log(data);
        };

        function extractUserName(tweet) {
            return tweet.user.screen_name;
        }

        function extractStatus(tweet) {
            return tweet.text.replace(/((https?|s?ftp|ssh)\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!])/g, function (url) {
                return '<a href="' + url + '">' + url + '</a>';
            }).replace(/\B@([_a-z0-9]+)/ig, function (reply) {
                return reply.charAt(0) + '<a href="http://twitter.com/' + reply.substring(1) + '">' + reply.substring(1) + '</a>';
            });
        }

        function extractUserUrl(tweet) {
            return 'http://twitter.com/' + extractUserName(tweet);
        }

        function extractStatusUrl(tweet) {
            return extractUserUrl(tweet) + '/status/' + tweet.id_str;
        }

        function extractTime(tweet) {
            return toRelativeTime(tweet.created_at);
        }

        function toRelativeTime(time_value) {
            var values = time_value.split(" ");
            time_value = values[1] + " " + values[2] + ", " + values[5] + " " + values[3];
            var parsed_date = Date.parse(time_value);
            var relative_to = (arguments.length > 1) ? arguments[1] : new Date();
            var delta = parseInt((relative_to.getTime() - parsed_date) / 1000);
            delta = delta + (relative_to.getTimezoneOffset() * 60);
            if (delta < 60) {
                return 'less than a minute ago';
            } else if (delta < 120) {
                return 'about a minute ago';
            } else if (delta < (60 * 60)) {
                return (parseInt(delta / 60)).toString() + ' minutes ago';
            } else if (delta < (120 * 60)) {
                return 'about an hour ago';
            } else if (delta < (24 * 60 * 60)) {
                return 'about ' + (parseInt(delta / 3600)).toString() + ' hours ago';
            } else if (delta < (48 * 60 * 60)) {
                return '1 day ago';
            } else {
                return (parseInt(delta / 86400)).toString() + ' days ago';
            }
        }

        return pub;

    }());

    (function () {
        var $twitter = $('#twitter');
        showLoader($twitter);
        twitter.load(function () {
            twitter.render($twitter);
        });
    }());

}(jQuery, 'map', 'e224418b91b4af4e8cdb0564716fa9bd', '72157626648389900'));

(function ($) {

    var $tellMeMore = $('#tell_me_more');

    $('#tell_me_more_trigger').click(function(e) {
        e.preventDefault();
        $tellMeMore.slideToggle();
    });

    $tellMeMore.find('input').click(function(e) {
        e.preventDefault();
        $tellMeMore.slideUp();
    });

}(jQuery));