var jQ = require('./lib/jquery.min.js');
var Bacon = require('./lib/bacon.min.js');
var _ = require('./lib/lodash.min.js');
var selectors = require('./gmailselectors.js');
var utils = require('./utils.js');

var BOARDS;
var CARD;

var getBtn = function(text, list){
    if(!list){
        return jQ('<div data-type="root" class="trello-from-gmail trello-from-gmail-btn T-I-ax7 T-I J-J5-Ji">' + text + '</div>');
    }
    return jQ('<div data-type="root" class="trello-from-gmail trello-from-gmail-btn T-I-ax7 T-I J-J5-Ji">' + text + '<ul></ul></div>');
}

var createButton = getBtn('Make Trello Card', true);
var viewButton = getBtn('View in Trello', false);

var _setBoards = function(boards){
    BOARDS = boards;
    renderBoards('board');
};

var renderBoards = function(type, id){
    var els = [];
    if(type === 'board'){
        els = _.map(BOARDS, function(board){ return $('<li data-type="board" data-id="' + board.id + '">'+board.name+'</li>'); })
    }
    else if(type === 'list'){
        var lists = _.find(BOARDS, {id: id}).lists;
        els = _.map(lists, function(list){ return $('<li data-type="list" data-board-id="' + list.idBoard + '" data-id="' + list.id + '">'+list.name+'</li>'); })
    }
    $(createButton).find('ul').html(els);
}

var _filterByType = function(type){
    return function(e){
        return $(e.target).attr('data-type') === type;
    }
}

var _setCard = function(card){
    console.log('setting card', card);
    CARD = card;
    viewButton.toggle(CARD);
}

viewButtonClicks = $(viewButton).asEventStream('click');
viewButtonClicks.onValue(function(){
    window.open(CARD.shortUrl);
})
viewButtonClicks.log();


var getId = function(e){
    return $(e.target).attr('data-id');
}

var _createBtnClicks = $(createButton).asEventStream('click');

var boardClicks = _createBtnClicks.filter(_filterByType('board')).map(getId);
boardClicks.onValue(function(val){ renderBoards('list', val); });

var createBtnClicks = _createBtnClicks.filter(_filterByType('root'));
createBtnClicks.onValue(function(){ renderBoards('board'); });

var listClicks = _createBtnClicks.filter(_filterByType('list')).map(function(e){
    var boardId = $(e.target).attr('data-board-id');
    var listId = $(e.target).attr('data-id');
    var board = _.find(BOARDS,{id: boardId});
    return _.find(board.lists, {id: listId});
});

/*
 * Email parsing stuff
 */

var _getSubject = function(){
    emailSubject = jQ(selectors.emailSubject);
    if(emailSubject.length){
        return emailSubject.text().trim();
    }
    return '';
}

var _getTime = function(elem){
    // timestamp
    var time = jQ(selectors.timestamp, elem);
    var timeValue = (time) ? time.attr('title') : '';
    timeValue = timeValue ? timeValue.replace('at', '') : '';
    if (timeValue !== '') {
        console.log('t1', timeValue);
        timeValue = new Date(Date.parse(timeValue)) || utils.parseFinnishTimeLocale(timeValue);
        if (timeValue)
            console.log('t2', timeValue)
            timeValue = timeValue.toString('MMM d, yyyy HH:mm');
    }

    return timeValue;
}

var _getBody = function(elem){
    var emailBody = jQ(selectors.emailBody);
    var bodyText = emailBody[0].innerText;

    var bodyText = bodyText.replace(/\s{2,}/g, function(str) {
        if (str.indexOf("\n\n\n") !== false)
            return "\n\n";
        else if (str.indexOf("\n") !== false)
            return "\n";
        else
            return ' ';
    });

    return bodyText.trim();
}

var _getSender = function(elem){
    var sender = jQ(selectors.sender);
    return sender.attr('email');
}

var _parseEmailData = function(){
    return {
        subject: _getSubject(),
        body: _getBody(),
        time: _getTime(),
        sender: _getSender()
    }
}

/*
 * Misc
 */

 var _handleButtonExistense = function(toggle){
  var bar = jQ('.iH .G-Ni').last();
  var isInBar = bar.find(selectors.ownButton);
  if(toggle && isInBar.length != 2){
    bar.append(createButton);
    bar.append(viewButton);
  }
}


module.exports = {
    parseEmailData: _parseEmailData,
    setBoards: _setBoards,
    handleButtonExistense: _handleButtonExistense,
    listClicks: listClicks,
    setCard: _setCard,
}