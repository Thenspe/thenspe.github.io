var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: 0
});
var bounds = [[0,0],[1000,750]];
var image = L.imageOverlay('images/Region1.jpg',bounds).addTo(map);
map.fitBounds(bounds);