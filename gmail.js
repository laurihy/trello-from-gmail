var jQ = require('./lib/jquery.min.js');
var Bacon = require('./lib/bacon.min.js');
var selectors = require('./gmailselectors.js');
var GmailUI = require('./gmailui.js');
var md5 = require('./lib/md5.js').md5;


var _id = function(val){
    return val;
}

var extractEmail = function(){
    return GmailUI.parseEmailData();
}

var getThreadId = function(email){
    return md5(email.sender + email.time + email.subject);
}

var isEmailView = Bacon.fromPoll(500, function(){
  return jQ(selectors.emailInThreads).length > 0;
}).toProperty().skipDuplicates();

var currentEmail = isEmailView.filter(_id).map(extractEmail);

isEmailView.onValue(GmailUI.handleButtonExistense);

module.exports.currentEmail = currentEmail;
module.exports.getThreadId = getThreadId;