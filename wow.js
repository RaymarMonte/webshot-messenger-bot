var page = require('webpage').create();
page.open('https://www.azlyrics.com/lyrics/smashmouth/allstar.html', function(status) {
  console.log("Status: " + status);
  if(status === "success") {
    page.render('example.png');
  }
  phantom.exit();
});