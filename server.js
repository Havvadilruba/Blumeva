
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import expressLayouts from "express-ejs-layouts";
import passport from "./config/passport.js";
import connectDB from "./config/db.js";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import assets from "./helpers/assets.js";
import { sessionConfig } from "./middlewares/session.js";
import { headerCountsMiddleware } from "./middlewares/headerCount.js";
import { setUser } from "./middlewares/setUser.js";
import { multerErrorHandler } from "./middlewares/multer.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();


connectDB();


app.use((req, res, next) => {
  res.set("cache-control", "no-store");
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


sessionConfig(app);

app.use(setUser);

app.use(headerCountsMiddleware);


app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);


app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use("/", userRouter);
app.use("/admin", adminRouter);

// Multer error handling middleware
app.use(multerErrorHandler);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));