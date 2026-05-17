// Shared singleton: sys instance + saveData helper used by all controllers
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import EnrollmentSystem from "../class/EnrollmentSystem.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_PATH = path.join(__dirname, "../data.json");

export const sys = new EnrollmentSystem();

export async function loadData() {
  const raw = await readFile(DATA_PATH, "utf-8");
  sys.loadFromJSON(JSON.parse(raw));
  console.log("✅  Data loaded");
}

export async function saveData() {
  await writeFile(DATA_PATH, JSON.stringify(sys.toJSON(), null, 2), "utf-8");
}
