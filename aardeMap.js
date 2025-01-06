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
        display: 'km',
        factor: 0.03,
        decimal: 1,
        label: 'Days of Travel'
    },
    angleUnit: {
        display: '&deg;',           // This is the display value will be shown on the screen. Example: 'Gradian'
        decimal: 2,                 // Bearing result will be fixed to this value.
        factor: null,                // This option is required to customize angle unit. Specify solid angle value for angle unit. Example: 400 (for gradian).
        label: 'Bearing:'
    },
};
L.control.ruler(options).addTo(map);