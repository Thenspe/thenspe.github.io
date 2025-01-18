var updateNum = 134
console.log("Update ",updateNum);
var left = document.getElementById("left");

var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -.5,
    maxZoom: 3.5,
    zoomSnap: 0.25
});
var bounds = [[0,0],[1000,1000]];
var image = L.imageOverlay('images/layerTerrain.png',bounds).addTo(map);
map.setView([735,600], 1.5);

//map layers
var terrain = L.imageOverlay('images/layerTerrain.png',bounds);
var water = L.imageOverlay('images/layerWater.png',bounds);
var biomes = L.imageOverlay('images/layerBiomes.png',bounds);
var roads = L.imageOverlay('images/layerRoads.png',bounds);

var overlayMaps = {
    "Rivers and Lakes": water,
    "Biomes": biomes,
    "Roads and Cities": roads
};
// layer control
var layerControl = L.control.layers(overlayMaps).addTo(map);
//Measurement tool
var options = {
    position: 'topleft',
    lengthUnit: {
        display: 'days',
        factor: 0.00025, //set to 0.007 for km
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
        var smallIcon = L.icon({
            iconUrl: 'images/' + feature.properties.displayIcon + '.png',
            iconSize: [20,20],
            iconAnchor: [10,10]
        });
        // attaches the correct icon and display data to each marker
        return L.marker(latlng, {icon: smallIcon}, feature).on('click', function(e){
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
            iconSize: [20,20],
            iconAnchor: [10,10]
        });
        // attaches the correct icon and display data to each marker
        return L.marker(latlng, {icon: smallIcon}, feature).on('click', function(e){
            document.getElementById("title").innerHTML = feature.properties.name;
            document.getElementById("population").innerHTML = ''; //remove anything placed here by townsLayer
            document.getElementById("information").innerHTML = feature.properties.info;
            document.getElementById("good").innerHTML = 'Discoveries: '+feature.properties.discoveries;
            document.getElementById("bad").innerHTML = 'Dangers: '+feature.properties.dangers;
        });
    },
    // onEachFeature: onEachFeature,
    maxZoom: 1
});

// show and hide items based on zoom level
map.on('zoomend',function() {
    var currentZoom = map.getZoom();
    if(currentZoom >= 1) {
        townsLayer.addTo(map);
        interestLayer.addTo(map);
    }
    else {
        townsLayer.remove();
        interestLayer.addTo(map);
    }
});

// Determine what happens when you click on the map

//Display coordinates, zoom, and current update version
function onMapClick(e) {
    console.log("You clicked the map at " + e.latlng.toString(),'\n',"The current zoom is ", map.getZoom(),'\n',"Update ",updateNum);
};
map.on('click', onMapClick);