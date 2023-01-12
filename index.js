const express = require("express");
var mysql = require("mysql");
const nodemailer = require("nodemailer");
var cors = require("cors");

require("dotenv").config({
  path:
    process.env.NODE_ENV === "production"
      ? "./env/.env.production"
      : "./env/.env.development",
});

const app = express();
const PORT = 7002;

app.use(express.json());
// app.use(cors());

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "development"
      ? "http://localhost:7001"
      : "https://vdrive.co.in"
  );

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

var db = mysql.createConnection({
  host: "localhost",
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: "vdrive-db",
});

var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
var phoneformat = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

// Send mail
function sendEmail(data, isSubscribe = false) {
  return new Promise((resolve, reject) => {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "guru.haiertv@gmail.com",
        pass: "hwkuvtohtzczphwy",
      },
      from: process.env.EMAIL_ID,
    });

    let message;
    let subject;
    let toAddress;

    if (!isSubscribe) {
      toAddress = process.env.EMAIL_ID;
      subject = "New submission from V-Drive";
      message =
        '<table style="border: 1px solid #ddd;border-collapse:collapse;width:100%">' +
        "<thead>" +
        "<th style='border: 1px solid #ddd; padding:12px 8px;text-align:left;background-color:#354d91;color:white'> Name </th>" +
        "<th style='border: 1px solid #ddd; padding:12px 8px;text-align:left;background-color:#354d91;color:white'> Mobile </th>" +
        "<th style='border: 1px solid #ddd; padding:12px 8px;text-align:left;background-color:#354d91;color:white'> Email </th>" +
        "<th style='border: 1px solid #ddd; padding:12px 8px;text-align:left;background-color:#354d91;color:white'> Preferred Time </th>" +
        "<th style='border: 1px solid #ddd; padding:12px 8px;text-align:left;background-color:#354d91;color:white'> Message </th>" +
        "</thead>";

      var emailData = data["email"] === undefined ? "-" : data["email"];

      message +=
        "<tr>" +
        "<td style='border: 1px solid #ddd; padding:12px 8px;text-align:left;'>" +
        data["name"] +
        "</td>" +
        "<td style='border: 1px solid #ddd; padding:12px 8px;text-align:left;'>+91 " +
        data["phone"] +
        "</td>" +
        "<td style='border: 1px solid #ddd; padding:12px 8px;text-align:left;'>" +
        emailData +
        "</td>" +
        "<td style='border: 1px solid #ddd; padding:12px 8px;text-align:left;'>" +
        data["time"] +
        "</td>" +
        "<td style='border: 1px solid #ddd; padding:12px 8px;text-align:left;'>" +
        data["message"] +
        "</td>" +
        "</tr>";
    } else {
      toAddress = data.email;
      subject = "Successfully subscribed to V-Drive";
      message =
        "<div><h2>Welcome to V-Drive Car Wash</h2><h3>Thank you for subscribing V-Drive</h3><br/><p>This e-mail comes to you in accordance with vdrive.co.in's Privacy Policy. <a href='http://localhost:7002/contact/unsubscribe'>Click here</a> to unsubscribe.</p></div><br/><div>Thanks,</div><div>V-Drive Support Team</div>";
    }

    var mailOptions = {
      from: '"V-Drive" <guru.haiertv@gmail.com>', // sender address
      to: toAddress, // list of receivers
      subject: subject, // Subject line
      html: message, // html body
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        return reject({ message: "An error has occured" });
      }
      console.log("Message sent: " + info.response);
      return resolve({ message: "Email sent successfully" });
    });
  });
}

app.get("/", (req, res) => {
  res.json({ status: "success", message: `Server started at ${PORT}` });
});

// Subscribe
app.get("/subscribe", (req, res) => {
  const q = "SELECT * FROM subscribes";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json({ status: "success", data: data });
  });
});

app.post("/subscribe", (req, res) => {
  if (req.body != null && !req.body.email.match(mailformat)) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  const q = "INSERT INTO subscribes SET ?";
  const values = req.body;

  db.query(q, values, async (err, results) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "You already subscribed" });
      }
      return res.json(err);
    }
    await sendEmail(req.body, true);
    return res.json({
      status: "success",
      message: "Thank you for subscribing",
    });
  });
});

// Contact
app.get("/contact", (req, res) => {
  const q = "SELECT * FROM contacts";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    return res.json({ status: "success", data: data });
  });
});

app.post("/contact", (req, res) => {
  if ((req.body != null && req.body.name == null) || req.body.name == "") {
    return res.status(400).json({ message: "Name is required" });
  }

  if (
    req.body != null &&
    req.body.phone != null &&
    !req.body.phone.match(phoneformat)
  ) {
    return res.status(400).json({ message: "Invalid mobile number" });
  }

  if (
    req.body != null &&
    req.body.email != null &&
    !req.body.email.match(mailformat)
  ) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  const q = "INSERT INTO contacts SET ?";
  const values = req.body;

  db.query(q, values, async (err, results) => {
    if (err) return res.json(err);
    await sendEmail(req.body);
    return res.json({
      status: "success",
      message: "Thank you for contacting us",
    });
  });
});

app.listen(PORT, () => console.log(`Server started at ${PORT}`));
