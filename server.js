const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const connectDB = require("./config/db");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");
const flashMessages = require("./middlewares/flashMessages");

connectDB();

// ✅ Then JSON / URL-encoded parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    },
  })
);

app.use(flash());
app.use(flashMessages);

app.use((req, res, next) => {
  res.set("cache-control", "no-store");
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(expressLayouts);

app.use("/", userRouter);
app.use("/admin", adminRouter);

app.listen(process.env.PORT, () => console.log("Server running"));
