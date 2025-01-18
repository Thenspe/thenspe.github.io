let towns = {
    "type": "FeatureCollection",
    "features": [
        {"type": "Feature","properties": {"name": "Yarth",
                // "displayIcon": "iconsVillage",
                "population": "1500",
                "info": "Yarth is a small village at the edge of the Ruggengrat Mountains. Part of the kingdom of Danuthan, it boasts a few farms and some mining activity in the foothills.\nRecently the True Blood of Earth has sent a representative, Mehael, to try and proselytise their human-first messsage in the area.\nNeil has a contact here, and the local smith is a quiet but friendly fellow.",
                "friends": "Neil's contact, village smith",
                "foes": "Mehael, of the True Blood of Earth."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [633.364588,725.193434]
            }
        },
        {"type": "Feature","properties": {"name": "South Ablein",
                // "displayIcon": "iconsVillage",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [673.249547,723.192214]
            }
        },
        {"type": "Feature","properties": {"name": "North Ablein",
                // "displayIcon": "iconsVillage",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [676.125265,725.193434]
            }
        },
        {"type": "Feature","properties": {"name": "Fort Kairth",
                // "displayIcon": "iconsFort",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [649.243553,692.048222]
            }
        },
        {"type": "Feature","properties": {"name": "Fort Grystol",
                // "displayIcon": "iconsFort",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [696.876577,673.632447]
            }
        },
        {"type": "Feature","properties": {"name": "Uruttal",
                // "displayIcon": "iconsVillage",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "displayIcon":"Point",
                "coordinates": [730.259913,690.502327]
            }
        },
        {"type": "Feature","properties": {"name": "Atchison",
                // "displayIcon": "iconsAtchison",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [718.882071,749.859311]
            }
        },
        {"type": "Feature","properties": {"name": "Neimul",
                // "displayIcon": "iconsVillage",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [741.137629,726.366442]
            }
        },
        {"type": "Feature","properties": {"name": "Erskill",
                // "displayIcon": "iconsVillage",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [671.370208,776.101347]
            }
        },
        {"type": "Feature","properties": {"name": "Ruestig's Keep",
                // "displayIcon": "iconsFort",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [705.628762,797.96971]
            }
        },
        {"type": "Feature","properties": {"name": "Swiftbend Fort",
                // "displayIcon": "iconsFort",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [771.645247,809.091334]
            }
        },
        {"type": "Feature","properties": {"name": "Lerstwial",
                // "displayIcon": "iconsVillage",
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [764.018342,759.356429]
            }
        },
        {"type": "Feature","properties": {"name": "blank",
                // "displayIcon": "iconsVillage", // iconsVillage, iconsFort
                "population": "unknown",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [1,1]
            }
        }
    ]
};
var interest = {
    "type": "FeatureCollection",
    "features": [
        {"type": "Feature","properties": {"name": "Ancient Mine",
            "displayIcon": "iconsMine",
            "info": "A landslide uncovered an ancient mine a half day from Yarth. Our adventurers were the first to enter it, based off a tip from one of Neil's informants. ",
            "discoveries":"Valuable ores, ancient salvage, ancient equipment, medical texts.",
            "dangers":"Deep Moles, cave-ins."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [623.664273,744.19767]
            }
        },
        {"type": "Feature","properties": {"name": "blank",
            "displayIcon": "iconsMine", //iconsMine, iconsOutsiderBase, iconsRuins
            "info": "unexplored",
            "discoveries":"Haven't made any yet.",
            "dangers":"Scarycave."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [1,1]
            }
        }
    ]
};
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
                "colour": "yellow", //dbd00e
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
                "colour": "purple", //b813c9
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
                "colour": "pink", //e62d99
                "icon":"BoI"
            },
            "geometry": {
                "type":"Point",
                "coordinates": [585.963797,646.51301]
            }
        }
        //green 199305
        //orange f59b14
    ]
};