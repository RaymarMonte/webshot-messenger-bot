// dependencies
const webshot = require('./../lib/webshot');
const sanitize = require('sanitize-filename');
const fs = require('fs');
const path = require('path');
const util = require('util')
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

// get environment dependent phantomjs path
const WEBSHOT_OPTIONS = {
  phantomPath: require ('phantomjs2').path,
  shotSize: {
    width: 'window',
    height: 'all'
  }
}
const APP_DIR = process.cwd();

// parsing configuration
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// index route
app.get('/', function (req, res) {
  if (req.query['page']) {
    getScreenshot(req.query['page'], function(screenshot) {
      if (screenshot) {
        res.download(screenshot, function(err) {
          if (!err) {
            fs.unlink(screenshot);
          }
        });
      }
      else {
        res.send('Invalid url given.');
      }
    });
  }
  else {
    res.send("Give me a url through my 'page' parameter and I'll give you a"
      + " screenshot ;)");
  }
});

// facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
		res.send(req.query['hub.challenge']);
	} else {
	   res.send('Error, wrong token');
  }
})

// message parser
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
	    let event = req.body.entry[0].messaging[i];
	    let sender = event.sender.id;
	    if (event.message && event.message.text) {
		    let text = event.message.text;
		    getScreenshot(text, function(screenshot) {
          if (screenshot) {
            // var screenshotPath = path.join(APP_DIR, screenshot);
            console.log(screenshot);
            sendImageMessage(sender, screenshot);
          }
          // else {
          //   sendTextMessage(sender, 'Hi! Please give me a valid URL so I can'
          //     + ' give you its screenshot. Thank you :)');
          // }
        })
	    }
    }
    console.log("Sending status 200...");
    res.sendStatus(200)
});

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token:token},
	    method: 'POST',
		json: {
      recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
		    console.log('Error sending messages: ', error)
		} else if (response.body.error) {
		    console.log('Error: ', response.body.error)
	    }
    })
}

function sendImageMessage(sender, imagePath) {
  console.log('Sending image: ' + imagePath);
  let messageData = { attachment: {
    type: 'image',
    payload: {}
  }};
  let fileData = '@' + imagePath + ';type=image/png';
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
	  qs: {access_token:token},
	  method: 'POST',
		json: {
      recipient: {id:sender},
			message: messageData,
      filedata: fileData
		}
  }, function(error, response, body) {
    if (!error) {
      if (response.body.error) {
        console.log(util.inspect(response.body.error, false, null));
      }
      console.log('success!');
      fs.unlink(imagePath);
		}
    else {
      console.log(error);
    }
  });
}

function getScreenshot(url, callback) {
  var filename = sanitize(url);
  if (!filename) {
    filename = 'killme';
  }
  var filepath = './temp/' + filename + '.png';
  var filepath = path.join(APP_DIR, '/temp', 'filename' + '.png');
  webshot(url, filepath, WEBSHOT_OPTIONS, function(err) {
    if (err) {
      callback(null);
    } else {
      console.log(filepath + " generated.");
      callback(filepath);
    }
  });
}

const token = "EAAbtGdEdXhABAJCJZAemnwept6ZCeKsDo11oRTySQDR0pybi10isbUyy1HsXOHZAv9JfozZBmqPkH2FSVIlODjUGedPw3pPbDoln1snmJYjcVAgckCGZBZCU0PvXD8rsliZChuibZB4xjeTqWZBiKqRuB4b95A1yAbjkr9hNIXl8CuAZDZD";

module.exports = app;
