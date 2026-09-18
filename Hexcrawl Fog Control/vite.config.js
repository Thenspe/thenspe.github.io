import { defineConfig } from "vite";

let currentSvg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="100"
  height="100"
  viewBox="0 0 100 100"
>
  <rect
    width="100"
    height="100"
    fill="#000000"
    fill-opacity="0.9"
  />
</svg>
`;

function hexcrawlFogServer() {
  return {
    name: "hexcrawl-fog-server",

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        /*
         * Serve the current fog image.
         */
        if (req.method === "GET" && req.url?.startsWith("/hexcrawl-fog.svg")) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "image/svg+xml");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", "no-store");

          res.end(currentSvg);
          return;
        }

        /*
         * Accept a new SVG from the extension.
         */
        if (
          req.method === "POST" &&
          req.url === "/hexcrawl-fog/update"
        ) {
          const chunks = [];

          req.on("data", (chunk) => {
            chunks.push(chunk);
          });

          req.on("end", () => {
            const svg = Buffer.concat(chunks).toString("utf8");

            if (!svg.trim().startsWith("<svg")) {
              res.statusCode = 400;
              res.end("Invalid SVG");
              return;
            }

            currentSvg = svg;

            res.statusCode = 204;
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end();
          });

          return;
        }

        /*
         * Handle CORS preflight requests.
         */
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
          );
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type"
          );
          res.end();
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [hexcrawlFogServer()],

  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
});