import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import router from "./Routes/router.js";
import { loadData } from "./shared.js";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// FIX: public folder is at project root level, not inside src/
app.use(express.static(path.join(__dirname, "../public")));
app.use("/api", router);

loadData().then(() => {
  app.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
  });
});
