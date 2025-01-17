let towns = {
    "type": "FeatureCollection",
    "features": [
        {"type": "Feature","properties": {"name": "Yarth",
                "size": "Village",
                "population": "1500",
                "info": "Yarth is a small village at the edge of the Ruggengrat Mountains. Part of the kingdom of Danuthan, it boasts a few farms and some mining activity in the foothills.\nRecently the True Blood of Earth has sent a representative, Mehael, to try and proselytise their human-first messsage in the area.\nNeil has a contact here, and the local smith is a quiet but friendly fellow."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [633.364588,725.193434]
            }
        },
        {"type": "Feature","properties": {"name": "South Ablein",
                "size": "Village",
            },
            "geometry": {
                "type":"Point",
                "coordinates": [673.249547,723.192214]
            }
        },
        {"type": "Feature","properties": {"name": "North Ablein",
                "size": "Village",
            },
            "geometry": {
                "type":"Point",
                "coordinates": [676.125265,725.193434]
            }
        },
        {"type": "Feature","properties": {"name": "Fort Kairth",
                "size": "Fort",
            },
            "geometry": {
                "type":"Point",
                "coordinates": [649.243553,692.048222]
            }
        }
    ]
};
// var ruins = {};
var factionAssets = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "TBoE",
                "colour": "red", //b5141c
                "icon":"BoI"
            },
            "geometry": {
                "type":"Point",
                "coordinates": [518.057152,716.756712]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "VidarLeague",
                "colour": "blue", //1437b5
                "icon":"BoI"
            },
            "geometry": {
                "type":"Point",
                "coordinates": [585.963797,646.51301]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Mercenaries",
                "colour": "yellow",
                "icon":"BoI"
            },
            "geometry": {
                "type":"Kloshtaggen",
                "coordinates": [585.963797,646.51301]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Kloshtaggen",
                "colour": "purple",
                "icon":"BoI"
            },
            "geometry": {
                "type":"Point",
                "coordinates": [585.963797,646.51301]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Artefactors",
                "colour": "pink",
                "icon":"BoI"
            },
            "geometry": {
                "type":"Point",
                "coordinates": [585.963797,646.51301]
            }
        }
    ]
};