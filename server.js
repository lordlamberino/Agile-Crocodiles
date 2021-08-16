require('dotenv').config(); // to use environment variable, instead of hard-coded password.
const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("cookie-session");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const port = process.env.PORT; 
const hostname = process.env.NODE_HOST;

var connection = mysql.createConnection({ // to use environment variable, instead of hard-coded password.
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
  multipleStatements: true
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser('secret'));
app.use(session({
  name: 'session',
  keys: ['agile', 'crocodile'],
  cookie : {maxAge: null}}));
app.use((req, res, next) =>{
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
})

// const port = 5000;
// const hostname = "0.0.0.0";

// var connection = mysql.createConnection({  
//   host     : 'localhost',
//   user     : 'root',
//   password : '',
//   database : 'bibliophile', 
//   multipleStatements: true 
// });

connection.connect((err) => {
    if (err) { 
      console.error("error connecting: " + err.stack);
      return;
    }
    console.log("successfully connected to the database");
});

global.connection = connection;
global.request = request;

require("./routes/main")(app);
app.set("views",__dirname + "/views");
app.use("/style",express.static(__dirname +"/style")); // allowing css style to be applied,
app.use("/script",express.static(__dirname +"/script"));
app.use("/assets",express.static(__dirname +"/assets"));
app.set("view engine", "ejs"); // if EJS is used.
app.engine("html", require("ejs").renderFile); // if EJS is used.
app.listen(port, hostname, () => console.log(`Server running at http://${hostname}:${port}/`));
