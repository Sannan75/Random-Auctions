import AdmZip from "adm-zip";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const source = path.join(root, "dist-renderer");
const outputDirectory = path.join(root, "release");
const output = path.join(outputDirectory, `Random-Auction-Explorer-${packageJson.version}-PWA.zip`);

await stat(path.join(source, "index.html"));
await mkdir(outputDirectory, { recursive: true });

const zip = new AdmZip();
zip.addLocalFolder(source);
zip.writeZip(output);

await writeFile(
  path.join(outputDirectory, `Random-Auction-Explorer-${packageJson.version}-release-notes.txt`),
  [
    `Random Auction Explorer ${packageJson.version}`,
    "",
    "Highlights",
    "- Fixed the blank window in installed Windows builds by using relative renderer assets.",
    "- Installable manual-mode PWA for iPad Safari and modern browsers.",
    "- Shared exploration, reroll, favourite, URL and import/export logic across web and Electron.",
    "- Browser local storage and touch-friendly iPad landscape layout.",
    "- New glass-dome app icon.",
    "- Existing Electron API and manual flows remain available on desktop.",
    ""
  ].join("\n"),
  "utf8"
);

console.log(`Created ${path.relative(root, output)}`);
