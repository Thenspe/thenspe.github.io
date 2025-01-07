console.log("update 43");

var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -.5,
    maxZoom: 3,
    zoomSnap: 0.25
});
var bounds = [[0,0],[1000,1000]];
var image = L.imageOverlay('images/Aarde_map.png',bounds).addTo(map);
map.setView([735,600], 1);

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
    console.log("You clicked the map at " + e.latlng.toString(),'\n',"The current zoom is ", map.getZoom());
};
map.on('click', onMapClick);

// add the geojson

var geojsonMarkerOptions = {
    radius: 4,
    fillColor: "#FFF",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};
function onEachFeature(feature, layer) {
    //checks each feature for the name of the town, and puts it in a popup?
    if (feature.properties && feature.properties.name) {
        layer.bindPopup(feature.properties.name);
    }
}

const townsLayer = L.geoJSON(towns, {
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, geojsonMarkerOptions);
    },
    onEachFeature: onEachFeature,
    minZoom: 1
}).addTo(map);