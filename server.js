import express from "express";
import path from "path";
import dotenv from "dotenv";
import expressLayouts from "express-ejs-layouts";
import passport from "./config/passport.js";
import connectDB from "./config/db.js";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import { sessionConfig } from "./middlewares/session.js";
import { headerCountsMiddleware } from "./middlewares/headerCount.js";
import { setUser } from "./middlewares/setUser.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

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



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server  ${PORT}`));