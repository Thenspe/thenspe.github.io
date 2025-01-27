let towns = {
    "type": "FeatureCollection",
    "features": [
        {"type": "Feature","properties": {"name": "Yarth",
                "displayIcon": "iconsVillage",
                "population": "2600",
                "info": "Yarth is a small town at the edge of the Ruggengrat Mountains. Part of the kingdom of Danuthan, it boasts a few farms and some mining activity in the foothills.\nRecently the True Blood of Earth has sent a representative, Mehael, to try and proselytise their human-first messsage in the area.\nNeil has a contact here, and the local smith is a quiet but friendly fellow.",
                "friends": "Neil's contact, village smith",
                "foes": "Mehael, of the True Blood of Earth."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [633.364588,725.193434]
            }
        },
        {"type": "Feature","properties": {"name": "South Ablein",
                "displayIcon": "iconsVillage",
                "population": "9500",
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
                "displayIcon": "iconsVillage",
                "population": "5300",
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
                "displayIcon": "iconsFort",
                "population": "3200",
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
                "displayIcon": "iconsFort",
                "population": "3600",
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
                "displayIcon": "iconsVillage",
                "population": "2600",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [730.259913,690.502327]
            }
        },
        {"type": "Feature","properties": {"name": "Neimul",
                "displayIcon": "iconsVillage",
                "population": "2800",
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
                "displayIcon": "iconsVillage",
                "population": "3500",
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
                "displayIcon": "iconsFort",
                "population": "3200",
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
                "displayIcon": "iconsFort",
                "population": "2750",
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
                "displayIcon": "iconsVillage",
                "population": "2800",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [764.018342,759.356429]
            }
        },
        {"type": "Feature","properties": {"name": "Ulpblae",
                "displayIcon": "iconsVillage", // iconsVillage, iconsFort
                "population": "4100",
                "info": "unexplored",
                "friends":"Haven't made any yet.",
                "foes":"Haven't made any yet."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [680.570243,696.761771]
            }
        },
        {"type": "Feature","properties": {"name": "blank",
                "displayIcon": "iconsVillage", // iconsVillage, iconsFort
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
let cities = {
    "type": "FeatureCollection",
    "features": [
        {"type": "Feature","properties": {"name": "Atchison",
        "displayIcon": "iconsAtchison",
        "population": "21, 000",
        "info": "Sometimes called the City of the Thousand Arches, Atchison is the capital city of the Kingdom of Danuthan.",
        "friends":"Haven't made any yet.",
        "foes":"A gang known as the 'Crunchers', which Kerrick was once a part of."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [718.882071,749.859311]
            }
        }
    ]
};
let interest = {
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
        {"type": "Feature","properties": {"name": "Feylan's Keep",
            "displayIcon": "iconsRuins", //iconsMine, iconsOutsiderBase, iconsRuins
            "info": "One-time home of the healer Zuthoeng, and a frontier defence for the kingdom of Danuthan before the keep was destroyed in the early 1100's.",
            "discoveries":"Haven't made any yet.",
            "dangers":"Who knows..."
            },
            "geometry": {
                "type":"Point",
                "coordinates": [593.504516,701.626099]
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