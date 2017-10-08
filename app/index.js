// dependencies
const webshot = require('./../lib/webshot');
const sanitize = require('sanitize-filename');
const fs = require('fs');
const path = require('path');
const util = require('util')
const querystring = require('querystring');
const url = require('url');
const validUrl = require('valid-url');
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
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
	    let event = req.body.entry[0].messaging[i]
	    let sender = event.sender.id
	    if (event.message && event.message.text) {
		    let text = event.message.text
		    validateAndSendScreenshot(text, sender);
	    }
    }
    res.sendStatus(200)
})

function validateAndSendScreenshot(text, sender) {
  getScreenshot(text, function(filepath) {
    if (filepath) {
      sendImageMessageAndDestroy(sender, filepath);
    } else {
      var luckySearch = generateInstantSearch(text);
      var r = request(luckySearch, function(error, response, body) {
        var urlLocationStart = body.indexOf('uddg=') + 5;
        var urlLocationEnd = body.indexOf("'", urlLocationStart);
        var rawUrl = body.substring(urlLocationStart, urlLocationEnd);

        var redirectUrl = querystring.unescape(rawUrl);
        getScreenshot(redirectUrl, function(luckyFilepath) {
          if (luckyFilepath) {
            sendImageMessageAndDestroy(sender, luckyFilepath);
          }
        });
      });
    }
  });
}

function generateInstantSearch(rawQuery) {
  var queryWords = rawQuery.split(' ');
  var safeQuery = querystring.escape(queryWords[0]);
  for (var i = 1;i < queryWords.length;i++) {
    safeQuery += '+' + querystring.escape(queryWords[i]);
  }

  var search = 'https://duckduckgo.com/?q=!ducky+' + safeQuery;

  return search;
}

function sendImageMessageAndDestroy(sender, imagePath) {
  let messageData = { attachment: {
    type: 'image',
    payload: {}
  }};

  var req = request.post({
    url: 'https://graph.facebook.com/v2.6/me/messages',
	  qs: {access_token:token}
  }, function(error, response, body) {
    if (!error) {
      if (response.body.error) {
        console.log(util.inspect(response.body.error, false, null));
      } else {
      console.log('Image message successfully sent! Destroying..');
      fs.unlink(imagePath);
      }
		}
    else {
      console.log(error);
    }
  });
  var form = req.form();
  form.append('recipient', JSON.stringify({id:sender}));
  form.append('message', JSON.stringify(messageData));
  form.append('filedata', fs.createReadStream(imagePath));
}

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

function getScreenshot(url, callback, additionalOptions) {
  if(!isUrl(url)) {
    callback(null);
    return;
  }
  var filename = sanitize(url);
  if (!filename) {
    filename = 'killme';
  }
  var filepath = './temp/' + filename + '.png';

  var options = WEBSHOT_OPTIONS;
  if (additionalOptions) {
    var extend = require('util')._extend;
    options = extend(options, additionalOptions);
  }

  webshot(url, filepath, options, function(err) {
    if (err) {
      console.log(err);
      callback(null);
    } else {
      console.log(filepath + " generated.");
      callback(filepath);
    }
  });
}

function isUrl(text) {
  if(validUrl.isUri(text)) {
    return true;
  } else {
    return validUrl.isUri('http://' + text);
  }
}

const token = "EAAbtGdEdXhABAJCJZAemnwept6ZCeKsDo11oRTySQDR0pybi10isbUyy1HsXOHZAv9JfozZBmqPkH2FSVIlODjUGedPw3pPbDoln1snmJYjcVAgckCGZBZCU0PvXD8rsliZChuibZB4xjeTqWZBiKqRuB4b95A1yAbjkr9hNIXl8CuAZDZD";

module.exports = app;
