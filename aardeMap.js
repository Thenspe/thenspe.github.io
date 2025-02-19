var updateNum = 190
console.log("Update ",updateNum);
var left = document.getElementById("left");

var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -.75,
    maxZoom: 3.5,
    zoomSnap: 0.25
});
var bounds = [[0,0],[1000,1000]];
var image = L.imageOverlay('images/LayerMap.png',bounds).addTo(map);
map.setView([718.882071,749.859311], 1.5);

//Measurement tool
var options = {
    position: 'topleft',
    lengthUnit: {
        display: 'km',
        factor: 0.0002, //set to 0.0002 for km, 
        decimal: 1,
        label: 'Distance:'
    },
    angleUnit: {
        display: '&deg;',           // This is the display value will be shown on the screen. Example: 'Gradian'
        decimal: 2,                 // Bearing result will be fixed to this value.
        factor: null,                // This option is required to customize angle unit. Specify solid angle value for angle unit. Example: 400 (for gradian).
        label: 'Bearing:'
    },
};
L.control.ruler(options).addTo(map);

console.log("Zoom = ",map.getZoom());

// add the geojson

// Add the towns and villages
const townsLayer = L.geoJSON(towns, {
    pointToLayer: function (feature, latlng) {
        // set up the icons, referencing the geojson data for marker specifics
        var sizeOfIcon,anchorOfIcon;
        if (feature.properties.displayIcon == "iconsVillage" || feature.properties.displayIcon == "iconsFort") {
            sizeOfIcon = [20,20];
            anchorOfIcon = [10,10];
        } else if (feature.properties.displayIcon == "iconsCity") {
            sizeOfIcon = [50,50];
            anchorOfIcon = [25,25];
        }
        var smallIcon = L.icon({
            iconUrl: 'images/' + feature.properties.displayIcon + '.png',
            iconSize: sizeOfIcon,
            iconAnchor: anchorOfIcon
        });
        // attaches the correct icon and display data to each marker
        return L.marker(latlng, {icon: smallIcon, opacity: 0}, feature).on('click', function(e){
            document.getElementById("title").innerHTML = feature.properties.name;
            document.getElementById("population").innerHTML = 'Population: '+feature.properties.population;
            document.getElementById("information").innerHTML = feature.properties.info;
            document.getElementById("good").innerHTML = 'Friends: '+feature.properties.friends;
            document.getElementById("bad").innerHTML = 'Foes: '+feature.properties.foes;
        });
    },
    // onEachFeature: onEachFeature,
    maxZoom: 1
});

// Add the points of interest
const interestLayer = L.geoJSON(interest, {
    pointToLayer: function (feature, latlng) {
        // set up the icons, referencing the geojson data for marker specifics
        var smallIcon = L.icon({
            iconUrl: 'images/' + feature.properties.displayIcon + '.png',
            iconSize: [40,40],
            iconAnchor: [20,20]
        });
        // attaches the correct icon and display data to each marker
        return L.marker(latlng, {icon: smallIcon, opacity: 0}, feature).on('click', function(e){
            document.getElementById("title").innerHTML = feature.properties.name;
            document.getElementById("population").innerHTML = ''; //remove anything placed here by townsLayer
            document.getElementById("information").innerHTML = feature.properties.info;
            document.getElementById("good").innerHTML = 'Discoveries: '+feature.properties.discoveries;
            document.getElementById("bad").innerHTML = 'Dangers: '+feature.properties.dangers;
        });
    },
    // onEachFeature: onEachFeature,
    maxZoom: 3.5
});

//map layers and controls
var roads = L.imageOverlay('images/layerRoads.png',bounds);
var peopleThings = L.layerGroup([roads,townsLayer]);
var interestVisual = L.imageOverlay('images/layerInterest.png',bounds);
var interestingThings = L.layerGroup([interestVisual,interestLayer]);
// var overlayMaps = {
//     "Roads and Cities": peopleThings,
//     "Points of Interest": interestLayer
// };
// layer control
// var layerControl = L.control.layers(null,overlayMaps,{collapsed:false}).addTo(map);

// Determine what happens when you click on the map
//Display coordinates, zoom, and current update version
function onMapClick(e) {
    console.log("You clicked the map at " + e.latlng.toString(),'\n',"The current zoom is ", map.getZoom(),'\n',"Update ",updateNum);
};
map.on('click', onMapClick);

// show and hide items based on zoom level
map.on('zoomend',function() {
    var currentZoom = map.getZoom();
    if (currentZoom >= 1) {
        peopleThings.addTo(map);
        interestingThings.addTo(map);
    }
    else {
        peopleThings.remove();
        // citiesLayer.remove();
        interestingThings.remove();
    }
});