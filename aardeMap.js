var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: 0
});
var bounds = [[0,0],[1000,1000]];
var image = L.imageOverlay('images/Aarde_map.png',bounds).addTo(map);
map.fitBounds(bounds);

//ruler
var options = {
    position: 'topleft',
    lengthUnit: {
        display: 'km',
        factor: 0.006,
        decimal: 1,
        label: 'Distance'
    },
    angleUnit: {
        display: '&deg;',           // This is the display value will be shown on the screen. Example: 'Gradian'
        decimal: 2,                 // Bearing result will be fixed to this value.
        factor: null,                // This option is required to customize angle unit. Specify solid angle value for angle unit. Example: 400 (for gradian).
        label: 'Bearing:'
    },
};
L.control.ruler(options).addTo(map);

//click for coordinates
var popup = L.popup();

function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}

map.on('click', onMapClick);

var geojsonFeature = {
    "type": "Feature",
    "properties": {
        "name": "Yarth",
        "size": "Village"
    },
    "geometry": {
        "type":"Point",
        "coordinates", [716.855,518.735]
    }
};
L.geoJSON(geojsonFeature).addTo(map);