// dependencies
const webshot = require('./../lib/webshot');
const sanitize = require('sanitize-filename');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

// get environment dependent phantomjs path
const WEBSHOT_OPTIONS = {
  phantomPath: process.env.PHANTOM_PATH
}
const APP_DIR = path.dirname(require.main.filename);

// parsing configuration
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// index route
app.get('/', function (req, res) {
  if (req.query['page']) {
    getScreenshot(req.query['page'], function(screenshot) {
      var screenshotPath = path.join(APP_DIR, screenshot);
      if (screenshotPath) {
        res.download(screenshotPath, function(err) {
          if (!err) {
            fs.unlink(screenshotPath);
          }
        });
      }
      else {
        res.send('Invalid url given.');
      }
    });
  }
  else {
    res.send("Give me a url through my 'page' parameter and I'll give you its"
      + " screenshot ;)");
  }
});

function getScreenshot(url, callback) {
  var filename = sanitize(url);
  if (!filename) {
    filename = 'killme';
  }
  var filepath = './temp/' + filename + '.png';
  webshot(url, filepath, WEBSHOT_OPTIONS, function(err) {
    if (err) {
      callback(null);
    } else {
      callback(filepath);
    }
  });
}

module.exports = app;
