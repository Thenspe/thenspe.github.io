var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -10
});
var bounds = [[0,0],[1000000,1000000]];
var image = L.imageOverlay('images/Aarde_map.png',bounds).addTo(map);
map.fitBounds(bounds);

//scale bar
L.control.scale({
    metric: true,
    imperial: false,
    maxWidth: 200,
    position: 'bottomleft'
}).addTo(map);

//ruler
var options = {
    position: 'topleft',
    lengthUnit: {
        factor: 0.0,
        display: 'km',
        decimal: 2,
    },
};
L.control.ruler(options).addTo(map);