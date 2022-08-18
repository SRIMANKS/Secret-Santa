const express = require("express");
const app = express();
const mongoose = require("mongoose");
const UserModel = require("./models/user.js");
const ExchangeModel = require("./models/exchange.js");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const methodOverride = require("method-override");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

mongoose
  .connect(
    "mongodb://127.0.0.1:27017/secretsanta",
    { useNewUrlParser: true },
    { useUnifiedTopology: true }
  )
  .then(() => {
    console.log("connected to mongodb");
  })
  .catch((err) => console.log(err));

app.set("view engine", "ejs");
app.use("/views", express.static(__dirname + "/views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({ secret: "goodsecret" }));
app.use(methodOverride("_method"));
app.use(flash());

function verification(req, res, next) {
  try {
    const token = req.session.token;
    console.log(`Verifying ${token}`);
    if (typeof token == "undefined" || token == null) {
      throw new Error("Invalid token");
    }
    const user = jwt.verify(req.session.token, process.env.SECRET);
    if (typeof user == "undefined" || user == null) {
      throw new Error("Invalid token");
    } else {
      console.log(user);
      next();
    }
  } catch (e) {
    req.flash("info", "you must be logged in to view this page");
    res.redirect("/login");
  }
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

app.get("/register", (req, res) => {
  res.render("register", { message: req.flash("error") });
});

app.post("/register", async (req, res, next) => {
  try {
    // cheaking if user name aldready exist
    const user = await UserModel.findOne({ username: req.body.username });

    if (!user) {
      const hashpass = await bcrypt.hash(req.body.password, 12);
      const newuser = new UserModel({
        username: req.body.username,
        password: hashpass,
        name: req.body.name,
        mobilenumber: req.body.mobilenumber,
        email: req.body.email,
      });
      await newuser.save();
      console.log(newuser);
      const token = jwt.sign(
        { username: req.body.username },
        process.env.SECRET,
        { expiresIn: "5h" }
      );
      req.session.token = token;
      res.redirect("/login");
    } else {
      req.flash("-", "user name already exist");
      res.redirect("/register");
    }
  } catch (e) {
    next(e);
  }
});

app.get("/login", (req, res) => {
  res.render("login", { message: req.flash("info") });
});

app.post("/login", async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ username: req.body.username });
    if (user) {
      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (isMatch) {
        const token = jwt.sign(
          { username: req.body.username, userid: String(user._id) },
          process.env.SECRET,
          { expiresIn: "5h" }
        );
        req.session.token = token;
        console.log(`token is ${req.session.token}`);
        req.flash("success", "You are logged in");
        res.redirect("/");
      } else {
        req.flash("info", "Invalid username or password");
        res.redirect("/login");
      }
    } else {
      req.flash("info", "Invalid username or password");
      res.redirect("/login");
    }
  } catch (e) {
    next(e);
  }
});

app.get("/exchanges", verification, async (req, res) => {
  const userinfo = jwt.verify(req.session.token, process.env.SECRET);
  const user = await UserModel.findById(userinfo.userid);
  console.log(user);
  res.render("exchanges", {
    user: user,
    message: req.flash("info"),
  });
});

app.get("/exchanges/:id", verification, async (req, res) => {
  const visitor = jwt.verify(req.session.token, process.env.SECRET);
  const exchange = await ExchangeModel.findById(req.params.id);
  const admin = await UserModel.findById(exchange.adminId);
  var ismember = false;
  exchange.participantsId.forEach((e) => {
    if (e === visitor.userid) {
      ismember = true;
    }
  });
  console.log(ismember);
  res.render("exchange", {
    exchange: exchange,
    admin: admin,
    visitor: visitor,
    ismember: ismember,
  });
});

app.post("/exchanges/:id", verification, async (req, res) => {
  const userinfo = jwt.verify(req.session.token, process.env.SECRET);
  await ExchangeModel.findByIdAndUpdate(
    { id: `${req.params.id}` },
    { $push: { participants: userinfo.username } }
  );
  await ExchangeModel.findByIdAndUpdate(
    { id: `${req.params.id}` },
    { $push: { participantsId: userinfo.userid } }
  );

  res.redirect(`/exchanges/${req.params.id}`);
});

app.post("/exchanges", verification, async (req, res) => {
  const userinfo = jwt.verify(req.session.token, process.env.SECRET);
  const user = await UserModel.findById(userinfo.userid);
  const exchange = new ExchangeModel({
    name: req.body.name,
    budget: req.body.budget,
    dateofexchange: req.body.date,
    location: req.body.location,
    participants: userinfo.username,
    participantsId: userinfo.userid,
    adminId: userinfo.userid,
  });
  await exchange.save();
  const newexchange = await ExchangeModel.findOne({ name: req.body.name });
  await UserModel.findOneAndUpdate(
    { id: userinfo.userid },
    { $push: { exchanges: newexchange.name } }
  );
  await UserModel.findOneAndUpdate(
    { id: userinfo.userid },
    { $push: { exchangesId: newexchange._id } }
  );
  res.redirect("/exchanges");
});

app.get("/", verification, (req, res) => {
  res.render("home");
});

app.use((err, req, res, next) => {
  res.render("error", { err: err.message });
  next(err);
});
