// Bundle the card into the single file that the integration serves.
import { build } from "esbuild";

await build({
  entryPoints: ["src/siipet-visits-card.ts"],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  legalComments: "none",
  outfile: "../custom_components/siipet/frontend/siipet-visits-card.js",
});
