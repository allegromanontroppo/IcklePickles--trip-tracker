/* Author: 

*/

(function ($, map_id, photos_id, undefined) {

    var map = (function () {

        var pub = {},
            map,
            points = [];

        pub.load = function (callback) {

            window.mapLoaded = function () {

                var britain = new google.maps.LatLng(55, -3),
                    mapOpts = {
                        center: britain,
                        zoom: 5,
                        mapTypeId: google.maps.MapTypeId.ROADMAP,
                        streetViewControl: false
                    };

                map = new google.maps.Map(document.getElementById(map_id), mapOpts);

                callback();
            };

            $.getScript("//maps.google.com/maps/api/js?sensor=false&region=GB&callback=mapLoaded");
        };

        pub.plotStart = function() {
        	new google.maps.Marker({
        		map: map,
        		position: new google.maps.LatLng(50.0666, -5.733),
        		icon: 'images/cyclingsport.png',
        		shadow: 'images/shadow.png'
        	});        	
        };

        pub.plotEnd = function() {
        	new google.maps.Marker({
        		map: map,
        		position: new google.maps.LatLng(58.64401, -3.06999),
        		icon: 'images/cyclingsport.png',
        		shadow: 'images/shadow.png'
        	});        	        	
        };

        pub.plotPhoto = function(photo){

        	var marker, infoWindow, 
                date = new Date(photo.date_taken),
        		contentTemplate = '<a href="{{LINK}}" target="_blank"><img src="{{SRC}}"></a><p>{{TITLE}}<p>Taken on {{DATE}}</p><p><a href="{{LINK}}" target="_blank">View full size</a></p>',
        		content = contentTemplate.replace(/{{LINK}}/g, photo.link).replace(/{{SRC}}/, photo.fullsize).replace(/{{TITLE}}/g, photo.title).replace(/{{DATE}}/, date.toDateString()),
                p = {};

        	marker = new google.maps.Marker({
        		map: map,
        		position: new google.maps.LatLng(photo.latitude, photo.longitude),
        		icon: photo.thumbnail,
        		shadow: 'images/shadow.png',
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

            google.maps.event.addListener(marker, 'click', function() {
                showInfoWindow(p);
            });

        	points.push(p);
        };

        pub.showInfoWindow = function(index) {
            showInfoWindow(points[index]);
        };

        function showInfoWindow(p) {

            closeAnyInfoWindows();
            if(p){
                var image = new Image();
                image.onload = function() {
                    p.infoWindow.open(map, p.marker);   
                }   
                image.src = p.photo; 
            }
        }

        function closeAnyInfoWindows() {
            
            $.each(points, function(i,v){
                v.infoWindow.close();
            });
        }

        pub.fitPhotos = function() { 
        
            if(points.length === 0)
                return;       
        	
           var north = points[0].marker.getPosition().lat(),
               south = points[0].marker.getPosition().lat(),
               east = points[0].marker.getPosition().lng(),
               west = points[0].marker.getPosition().lng(),
               southWest,
               northEast,
               latLngBounds;

            $.each(points, function(i,v){

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
           // flickrFeedUrl = 'http://api.flickr.com/services/feeds/geo/?id=42111033@N06&lang=en-us&format=json&jsoncallback=?',
            flickrFeedUrl = 'http://api.flickr.com/services/feeds/geo/?id=23666168@N04&lang=en-us&format=json&jsoncallback=?',
            data = {};

        pub.load = function (callback) {

	            $.getJSON(flickrFeedUrl, function (d) {
	                data = d;
	                callback();
	            });
        };

        pub.log = function(){
        	console.log(data);
        };

        pub.renderImageMatrix = function() {

        	var itemTemplate = '<li data-index="{{INDEX}}"><img src="{{SRC}}"></li>',
        	render = $.map(data.items, function(element, i){
        		return itemTemplate.replace(/{{SRC}}/, element.media.m.replace(/_m.jpg/, '_s.jpg') ).replace(/{{INDEX}}/, i);
        	}).join('');

        	$('#' + photos_id).append(render);
        };

        pub.photoIterator = function(callback) {

        	var latLongOfLast;
        	
        	$.each(data.items, function(i, v){        		
        		callback({
        			thumbnail: v.media.m.replace(/_m.jpg/, '_s.jpg'),
        			fullsize: v.media.m,
        			link: v.link,
                    title: v.title,
                    date_taken: v.date_taken,
        			latitude: v.latitude,
        			longitude: v.longitude,
        			index: i
        		});

        		latLongOfLast = {
        			latitude: v.latitude,
        			longitude: v.longitude
        		};
        	});   

        	return latLongOfLast;     	
        };

        return pub;
    }());

    flickr.load(function () {

flickr.log();

		flickr.renderImageMatrix();
    		map.load(function () {
    			map.plotStart();
    			map.plotEnd();
    			flickr.photoIterator(map.plotPhoto);
                map.fitPhotos();

                $('#photos li').click(function(e){

                    e.preventDefault();
                    map.showInfoWindow($(this).data('index'));
                    
                }).css('cursor', 'pointer');
        });
    });

}(jQuery, 'map', 'photos')); 
