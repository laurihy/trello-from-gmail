var Gmail = require('./gmail.js');
var GmailUI = require('./gmailui.js');
var jQ = require('./lib/jquery.min.js');
var Trello = require('./trello.js');
var Bacon = require('./lib/bacon.min.js');
var Q = require('./lib/q.js');
var cache = require('./keyvalue.js');

var KEY = '9aa30fed15affd27f7f29a279524b2e7';
Trello.setKey(KEY);

var getBoardsAndLists = function(){
    var fetchedBoards;
    return Trello.get('/members/me/boards')
    .then(function(boards){
        fetchedBoards = boards;
        return Q.all(_.map(boards, function(board){
            return Trello.get('/boards/'+board.id+'/lists');
        }));
    }).then(function(lists){
        listsByBoardId = _.groupBy(_.flatten(lists), 'idBoard');
        return _.map(fetchedBoards, function(board){
            board.lists = listsByBoardId[board.id];
            return board;
        })
    });
}

var getNewCardObj = function(data, list){
    var ret = {}
    var threadId = Gmail.getThreadId(data);
    ret.name = '[' + data.sender + ']' + data.subject;
    ret.desc = data.body + '\n\n--\n\nGmailToTrelloID: ' + threadId;
    ret.idList = list.id;
    return ret;
}

Gmail.currentEmail.onValue(function(data){
    GmailUI.setCard(false);
    var threadId = Gmail.getThreadId(data);
    if(cache.get(threadId)){
        cardId = cache.get(threadId);
        Trello.get('/cards/'+cardId)
        .then(function(data){
            GmailUI.setCard(data);
        });
    }
    else {
        Trello.get('/search', {query: threadId, modelTypes: 'cards', partial: true, elasticsearch: true})
        .then(function(data){
            if(data.cards.length){
                GmailUI.setCard(data.cards[0]);
            }
        });
    }
})

GmailUI.listClicks.onValue(function(list){
    var curEmail = GmailUI.parseEmailData();
    var threadId = Gmail.getThreadId(curEmail);
    var obj = getNewCardObj(curEmail, list);
    Trello.post('/cards', obj)
    .then(function(data){
        cache.set(threadId, data.id);
        GmailUI.setCard(data);
    })
})

boards = Bacon.fromPromise(getBoardsAndLists());
boards.onValue(GmailUI.setBoards)