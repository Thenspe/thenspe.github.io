This website, for the moment, is being set up as a place to host a Leaflet map of the fictional world of Aarde, used in a game of Worlds Without Number (a tabletop RPG by Kevin Crawford).

Lets set up an application plan. I want an application consisting of two web pages. The first is for the players, and they can see a world map, possibly with fog of war, and select tokens. It reads in the database and displays it.
The second page is for the GM, and holds the actual application. It allows the GM to create, move, modify, and save tokens. Tokens include informational data. It should also allow the GM to upload a map, or map images.

Since the player page is basically just a fancy display rack, we're going to focus on the GM page.

It needs to display a map with basic controls, existing tokens, and a button to add a token.

Adding a token should include a type, a token display option/logo, and data fields.
Selecting an existing token should display its data, with an edit button to make changes.
All changes should get saved server-side and provided to the client on page load.

