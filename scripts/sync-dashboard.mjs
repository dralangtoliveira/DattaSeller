import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("poc/dattaseller-local/app/dashboard.html");
const target = resolve("public/dashboard.html");
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Dashboard sincronizado: ${target}`);
