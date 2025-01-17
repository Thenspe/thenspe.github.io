var updateNum = 116
console.log("Update ",updateNum);
var left = document.getElementById("left");

var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -.5,
    maxZoom: 3.5,
    zoomSnap: 0.25
});
var bounds = [[0,0],[1000,1000]];
var image = L.imageOverlay('images/Aarde_map.png',bounds).addTo(map);
map.setView([735,600], 1.5);

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

var geojsonMarkerOptions = {
    radius: 6,
    fillColor: "#000",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 1,
};
//setup icons for use by the geojson layers
var fortIcon = L.icon({
    iconURL: '/images/iconsFort.png',
    iconSize: [115, 115],
    iconAnchor: [50, 50],
});

// Add the towns and villages
// const townsLayer = L.geoJSON(towns, {
//     pointToLayer: function (feature, latlng) {
//         return L.circleMarker(latlng, geojsonMarkerOptions,feature).on('click', function(e){
//         document.getElementById("title").innerHTML = feature.properties.name;
//         document.getElementById("population").innerHTML = 'Population: ',feature.properties.population;
//         document.getElementById("information").innerHTML = feature.properties.info;
//         document.getElementById("friends").innerHTML = 'Friends: ',feature.properties.friends;
//         document.getElementById("foes").innerHTML = 'Foes: ',feature.properties.foes;
//         });
//     },
//     // onEachFeature: onEachFeature,
//     maxZoom: 1
// });
const townsLayer = L.geoJSON(towns, {
    pointToLayer: function (feature, latlng) {
        switch (feature.properties.size) {
            case 'Fort':
                return L.marker(latlng,{icon: fortIcon});
            case 'Village':
                return L.circleMarker(latlng, geojsonMarkerOptions,feature);
        }
    },
    // onEachFeature: onEachFeature,
    maxZoom: 1
});

// show and hide items based on zoom level
map.on('zoomend',function() {
    var currentZoom = map.getZoom();
    if(currentZoom >= 1) {
        townsLayer.addTo(map);
    }
    else {
        townsLayer.remove();
    }
});

// Determine what happens when you click on the map

//Display coordinates, zoom, and current update version
function onMapClick(e) {
    console.log("You clicked the map at " + e.latlng.toString(),'\n',"The current zoom is ", map.getZoom(),'\n',"Update ",updateNum);
};
map.on('click', onMapClick);