console.log("update 9");
var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: 0,
    zoomSnap: 0.5
}).setView([725,580]);
var bounds = [[0,0],[1000,1000],8];
var image = L.imageOverlay('images/Aarde_map.png',bounds).addTo(map);
map.fitBounds(bounds);

//ruler
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

//click for coordinates
var popup = L.popup();

function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
};
map.on('click', onMapClick);

//add the geojson
// var mapthings = {
//     "type": "Feature",
//     "properties": {
//         "name": "Yarth",
//         "size": "Village"
//     },
//     "geometry": {
//         "type":"Point",
//         "coordinates": [518.057152,716.756712]
//     }
// };

var mapThings = $.getJSON("mapitems.json");
// $.getJSON("mapitems.json").addTo(map);

var geojsonMarkerOptions = {
    radius: 4,
    fillColor: "#000",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};
function onEachFeature(feature, layer) {
    //does this feature have a property named Size?
    if (feature.properties && feature.properties.size) {
        layer.bindPopup(feature.properties.size);
    }
}

L.geoJSON(mapthings, {
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, geojsonMarkerOptions);
    },
    onEachFeature: onEachFeature
}).addTo(map);