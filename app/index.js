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
  phantomPath: require ('phantomjs2').path,
  shotSize: {
    width: 'window',
    height: 'all'
  }
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
            var screenshotPath = path.join(APP_DIR, screenshot);
            sendImageMessage(sender, screenshotPath);
          }
          else {
            sendTextMessage(sender, 'Hi! Please give me a valid URL so I can'
              + ' give you its screenshot. Thank you :)');
          }
        })
	    }
    }
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
    let messageData = { attachment: {
      type: 'image',
      payload: {}
    }};
    let fileData = imagePath + ';type=image/png';
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
		    fs.unlink(imagePath);
		}
    })
}

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
