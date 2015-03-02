(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./gmailselectors.js":2,"./gmailui.js":3,"./lib/bacon.min.js":5,"./lib/jquery.min.js":6,"./lib/md5.js":8}],2:[function(require,module,exports){
module.exports = {
  buttonBar: '.iH',
  emailSubject: '.hP',
  emailBody: '.adO:first',
  expandedEmails: '.h7',
  hiddenEmails: '.kv',
  emailInThreads: '.kv,.h7',
  timestamp: '.gH .g3:first',
  sender: '.gD:first',
  ownButton: '.trello-from-gmail'
};
},{}],3:[function(require,module,exports){
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
},{"./gmailselectors.js":2,"./lib/bacon.min.js":5,"./lib/jquery.min.js":6,"./lib/lodash.min.js":7,"./utils.js":13}],4:[function(require,module,exports){
var KEY = 'TRELLO_GMAIL_CACHE';
var MAX_LENGTH = 10;

var loadData = function(){
    if(!localStorage[KEY]){
        return [];
    }
    return JSON.parse(localStorage[KEY]) || [];
}

var storeData = function(data){
    localStorage[KEY] = JSON.stringify(data || []);
}

var get = function(key){
    var data = loadData();
    var ret = '';
    _.each(data, function(tuple){
        if(tuple[0] === key){
            ret = tuple[1];
        }
    });
    return ret;
}

var set = function(key, value){
    console.log('setting', key, value)
    var data = loadData();
    if(data.length >= MAX_LENGTH){
        data.shift();
    }
    data.push([key, value]);
    storeData(data);
}

module.exports.get = get;
module.exports.set = set;
},{}],5:[function(require,module,exports){
(function (global){
(function(){var a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,$,_,ab,bb,cb,db,eb,fb,gb,hb,ib,jb={}.hasOwnProperty,kb=function(a,b){function c(){this.constructor=a}for(var d in b)jb.call(b,d)&&(a[d]=b[d]);return c.prototype=b.prototype,a.prototype=new c,a.__super__=b.prototype,a},lb=[].slice,mb=function(a,b){return function(){return a.apply(b,arguments)}};a={toString:function(){return"Bacon"}},a.version="0.7.49",l=("undefined"!=typeof global&&null!==global?global:this).Error,V=function(){},N=function(a,b){return b},H=function(a){return a},w=function(a){return a.slice(0)},K=function(a){return a instanceof Array},M=function(a){return a instanceof p},hb={indexOf:Array.prototype.indexOf?function(a,b){return a.indexOf(b)}:function(a,b){var c,d,e,f;for(c=e=0,f=a.length;f>e;c=++e)if(d=a[c],b===d)return c;return-1},indexWhere:function(a,b){var c,d,e,f;for(c=e=0,f=a.length;f>e;c=++e)if(d=a[c],b(d))return c;return-1},head:function(a){return a[0]},always:function(a){return function(){return a}},negate:function(a){return function(b){return!a(b)}},empty:function(a){return 0===a.length},tail:function(a){return a.slice(1,a.length)},filter:function(a,b){var c,d,e,f;for(c=[],e=0,f=b.length;f>e;e++)d=b[e],a(d)&&c.push(d);return c},map:function(a,b){var c,d,e,f;for(f=[],d=0,e=b.length;e>d;d++)c=b[d],f.push(a(c));return f},each:function(a,b){var c,d;for(c in a)d=a[c],b(c,d);return void 0},toArray:function(a){return K(a)?a:[a]},contains:function(a,b){return-1!==hb.indexOf(a,b)},id:function(a){return a},last:function(a){return a[a.length-1]},all:function(a,b){var c,d,e;for(null==b&&(b=hb.id),d=0,e=a.length;e>d;d++)if(c=a[d],!b(c))return!1;return!0},any:function(a,b){var c,d,e;for(null==b&&(b=hb.id),d=0,e=a.length;e>d;d++)if(c=a[d],b(c))return!0;return!1},without:function(a,b){return hb.filter(function(b){return b!==a},b)},remove:function(a,b){var c;return c=hb.indexOf(b,a),c>=0?b.splice(c,1):void 0},fold:function(a,b,c){var d,e,f;for(e=0,f=a.length;f>e;e++)d=a[e],b=c(b,d);return b},flatMap:function(a,b){return hb.fold(b,[],function(b,c){return b.concat(a(c))})},cached:function(a){var b;return b=o,function(){return b===o&&(b=a(),a=void 0),b}},isFunction:function(a){return"function"==typeof a},toString:function(a){var b,c,d,e;try{return X++,null==a?"undefined":hb.isFunction(a)?"function":K(a)?X>5?"[..]":"["+hb.map(hb.toString,a).toString()+"]":null!=(null!=a?a.toString:void 0)&&a.toString!==Object.prototype.toString?a.toString():"object"==typeof a?X>5?"{..}":(c=function(){var c;c=[];for(d in a)jb.call(a,d)&&(e=function(){try{return a[d]}catch(c){return b=c}}(),c.push(hb.toString(d)+":"+hb.toString(e)));return c}(),"{"+c+"}"):a}finally{X--}}},X=0,a._=hb,u=a.UpdateBarrier=function(){var b,c,d,e,f,g,h,i,j,k,l,m,n,o;return k=void 0,l=[],m={},c=[],d=0,b=function(a){return k?c.push(a):a()},n=function(a,b){var c;return k?(c=m[a.id],null==c?(c=m[a.id]=[b],l.push(a)):c.push(b)):b()},f=function(){for(;l.length>0;)h(0);return void 0},h=function(a){var b,c,d,e,f,h;for(c=l[a],d=c.id,e=m[d],l.splice(a,1),delete m[d],g(c),f=0,h=e.length;h>f;f++)(b=e[f])();return void 0},g=function(a){var b,c,d,e,f;for(c=a.internalDeps(),e=0,f=c.length;f>e;e++)b=c[e],g(b),m[b.id]&&(d=hb.indexOf(l,b),h(d));return void 0},j=function(a,b,e,g){var h,i;if(k)return e.apply(b,g);k=a;try{i=e.apply(b,g),f()}finally{for(k=void 0;d<c.length;)h=c[d],d++,h();d=0,c=[]}return i},e=function(){return k?k.id:void 0},o=function(c,d){var e,f,g,h;return h=!1,f=!1,e=function(){return f=!0},g=function(){return h=!0,e()},e=c.dispatcher.subscribe(function(c){return b(function(){var b;return h||(b=d(c),b!==a.noMore)?void 0:g()})}),f&&e(),g},i=function(){return l.length>0},{whenDoneWith:n,hasWaiters:i,inTransaction:j,currentEventId:e,wrappedSubscribe:o,afterTransaction:b}}(),t=function(){function a(a,b,c){this.obs=a,this.sync=b,this.lazy=null!=c?c:!1,this.queue=[]}return a.prototype.subscribe=function(a){return this.obs.dispatcher.subscribe(a)},a.prototype.toString=function(){return this.obs.toString()},a.prototype.markEnded=function(){return this.ended=!0},a.prototype.consume=function(){return this.lazy?{value:hb.always(this.queue[0])}:this.queue[0]},a.prototype.push=function(a){return this.queue=[a]},a.prototype.mayHave=function(){return!0},a.prototype.hasAtLeast=function(){return this.queue.length},a.prototype.flatten=!0,a}(),e=function(a){function b(){return b.__super__.constructor.apply(this,arguments)}return kb(b,a),b.prototype.consume=function(){return this.queue.shift()},b.prototype.push=function(a){return this.queue.push(a)},b.prototype.mayHave=function(a){return!this.ended||this.queue.length>=a},b.prototype.hasAtLeast=function(a){return this.queue.length>=a},b.prototype.flatten=!1,b}(t),b=function(a){function b(a){b.__super__.constructor.call(this,a,!0)}return kb(b,a),b.prototype.consume=function(){var a;return a=this.queue,this.queue=[],{value:function(){return a}}},b.prototype.push=function(a){return this.queue.push(a.value())},b.prototype.hasAtLeast=function(){return!0},b}(t),t.isTrigger=function(a){return a instanceof t?a.sync:a instanceof k},t.fromObservable=function(a){return a instanceof t?a:a instanceof q?new t(a,!1):new e(a,!0)},f=function(){function a(a,b,c){this.context=a,this.method=b,this.args=c,this.cached=void 0}return a.prototype.deps=function(){return this.cached||(this.cached=E([this.context].concat(this.args)))},a.prototype.apply=function(a){return a.desc=this,a},a.prototype.toString=function(){return hb.toString(this.context)+"."+hb.toString(this.method)+"("+hb.map(hb.toString,this.args)+")"},a}(),A=function(){var a,b,c;return b=arguments[0],c=arguments[1],a=3<=arguments.length?lb.call(arguments,2):[],(b||c)instanceof f?b||c:new f(b,c,a)},fb=function(){var a,b,c;return a=2<=arguments.length?lb.call(arguments,0,c=arguments.length-1):(c=0,[]),b=arguments[c++],A.apply(null,a).apply(b)},E=function(a){return K(a)?hb.flatMap(E,a):M(a)?[a]:a instanceof t?[a.obs]:[]},gb=function(a){return function(){var b,c,d,e;return d=arguments[0],b=2<=arguments.length?lb.call(arguments,1):[],"object"==typeof d&&b.length&&(c=d,e=b[0],d=function(){return c[e].apply(c,arguments)},b=b.slice(1)),a.apply(null,[d].concat(lb.call(b)))}},Q=function(a){return a=Array.prototype.slice.call(a),R.apply(null,a)},W=function(a,b){return function(){var c;return c=1<=arguments.length?lb.call(arguments,0):[],a.apply(null,b.concat(c))}},db=function(a){return function(b){return function(c){var d;return null==c?void 0:(d=c[b],hb.isFunction(d)?d.apply(c,a):d)}}},ab=function(a,b){var c,d;return d=a.slice(1).split("."),c=hb.map(db(b),d),function(b){var d,e;for(d=0,e=c.length;e>d;d++)a=c[d],b=a(b);return b}},L=function(a){return"string"==typeof a&&a.length>1&&"."===a.charAt(0)},R=gb(function(){var a,b;return b=arguments[0],a=2<=arguments.length?lb.call(arguments,1):[],hb.isFunction(b)?a.length?W(b,a):b:L(b)?ab(b,a):hb.always(b)}),P=function(a,b){return R.apply(null,[a].concat(lb.call(b)))},z=function(a,b,c,d){var e;return b instanceof q?(e=b.sampledBy(a,function(a,b){return[a,b]}),d.call(e,function(a){var b,c;return b=a[0],c=a[1],b}).map(function(a){var b,c;return b=a[0],c=a[1]})):(b=P(b,c),d.call(a,b))},$=function(a){var b;return hb.isFunction(a)?a:L(a)?(b=bb(a),function(a,c){return a[b](c)}):void 0},bb=function(a){return a.slice(1)},s=function(){function a(a){this.value=a}return a.prototype.getOrElse=function(){return this.value},a.prototype.get=function(){return this.value},a.prototype.filter=function(b){return b(this.value)?new a(this.value):o},a.prototype.map=function(b){return new a(b(this.value))},a.prototype.forEach=function(a){return a(this.value)},a.prototype.isDefined=!0,a.prototype.toArray=function(){return[this.value]},a.prototype.inspect=function(){return"Some("+this.value+")"},a.prototype.toString=function(){return this.inspect()},a}(),o={getOrElse:function(a){return a},filter:function(){return o},map:function(){return o},forEach:function(){},isDefined:!1,toArray:function(){return[]},inspect:function(){return"None"},toString:function(){return this.inspect()}},cb=function(a){return a instanceof s||a===o?a:new s(a)},a.noMore=["<no-more>"],a.more=["<more>"],C=0,j=function(){function a(){this.id=++C}return a.prototype.isEvent=function(){return!0},a.prototype.isEnd=function(){return!1},a.prototype.isInitial=function(){return!1},a.prototype.isNext=function(){return!1},a.prototype.isError=function(){return!1},a.prototype.hasValue=function(){return!1},a.prototype.filter=function(){return!0},a.prototype.inspect=function(){return this.toString()},a.prototype.log=function(){return this.toString()},a}(),n=function(a){function b(a,c){b.__super__.constructor.call(this),!c&&hb.isFunction(a)||a instanceof b?(this.valueF=a,this.valueInternal=void 0):(this.valueF=void 0,this.valueInternal=a)}return kb(b,a),b.prototype.isNext=function(){return!0},b.prototype.hasValue=function(){return!0},b.prototype.value=function(){return this.valueF instanceof b?(this.valueInternal=this.valueF.value(),this.valueF=void 0):this.valueF&&(this.valueInternal=this.valueF(),this.valueF=void 0),this.valueInternal},b.prototype.fmap=function(a){var b,c;return this.valueInternal?(c=this.valueInternal,this.apply(function(){return a(c)})):(b=this,this.apply(function(){return a(b.value())}))},b.prototype.apply=function(a){return new b(a)},b.prototype.filter=function(a){return a(this.value())},b.prototype.toString=function(){return hb.toString(this.value())},b.prototype.log=function(){return this.value()},b}(j),m=function(a){function b(){return b.__super__.constructor.apply(this,arguments)}return kb(b,a),b.prototype.isInitial=function(){return!0},b.prototype.isNext=function(){return!1},b.prototype.apply=function(a){return new b(a)},b.prototype.toNext=function(){return new n(this)},b}(n),h=function(a){function b(){return b.__super__.constructor.apply(this,arguments)}return kb(b,a),b.prototype.isEnd=function(){return!0},b.prototype.fmap=function(){return this},b.prototype.apply=function(){return this},b.prototype.toString=function(){return"<end>"},b}(j),i=function(a){function b(a){this.error=a}return kb(b,a),b.prototype.isError=function(){return!0},b.prototype.fmap=function(){return this},b.prototype.apply=function(){return this},b.prototype.toString=function(){return"<error> "+hb.toString(this.error)},b}(j),a.Event=j,a.Initial=m,a.Next=n,a.End=h,a.Error=i,J=function(a){return new m(a,!0)},U=function(a){return new n(a,!0)},B=function(){return new h},_=function(a){return a instanceof j?a:U(a)},I=0,Y=function(){},p=function(){function a(a){this.id=++I,fb(a,this),this.initialDesc=this.desc}return a.prototype.subscribe=function(a){return u.wrappedSubscribe(this,a)},a.prototype.subscribeInternal=function(a){return this.dispatcher.subscribe(a)},a.prototype.onValue=function(){var a;return a=Q(arguments),this.subscribe(function(b){return b.hasValue()?a(b.value()):void 0})},a.prototype.onValues=function(a){return this.onValue(function(b){return a.apply(null,b)})},a.prototype.onError=function(){var a;return a=Q(arguments),this.subscribe(function(b){return b.isError()?a(b.error):void 0})},a.prototype.onEnd=function(){var a;return a=Q(arguments),this.subscribe(function(b){return b.isEnd()?a():void 0})},a.prototype.name=function(a){return this._name=a,this},a.prototype.withDescription=function(){return A.apply(null,arguments).apply(this)},a.prototype.toString=function(){return this._name?this._name:this.desc.toString()},a.prototype.internalDeps=function(){return this.initialDesc.deps()},a}(),p.prototype.assign=p.prototype.onValue,p.prototype.forEach=p.prototype.onValue,p.prototype.inspect=p.prototype.toString,a.Observable=p,d=function(){function a(a){var b,c,d;for(null==a&&(a=[]),this.unsubscribe=mb(this.unsubscribe,this),this.unsubscribed=!1,this.subscriptions=[],this.starting=[],c=0,d=a.length;d>c;c++)b=a[c],this.add(b)}return a.prototype.add=function(a){var b,c,d;if(!this.unsubscribed)return b=!1,c=V,this.starting.push(a),d=function(d){return function(){return d.unsubscribed?void 0:(b=!0,d.remove(c),hb.remove(a,d.starting))}}(this),c=a(this.unsubscribe,d),this.unsubscribed||b?c():this.subscriptions.push(c),hb.remove(a,this.starting),c},a.prototype.remove=function(a){return this.unsubscribed?void 0:void 0!==hb.remove(a,this.subscriptions)?a():void 0},a.prototype.unsubscribe=function(){var a,b,c,d;if(!this.unsubscribed){for(this.unsubscribed=!0,d=this.subscriptions,b=0,c=d.length;c>b;b++)(a=d[b])();return this.subscriptions=[],this.starting=[]}},a.prototype.count=function(){return this.unsubscribed?0:this.subscriptions.length+this.starting.length},a.prototype.empty=function(){return 0===this.count()},a}(),a.CompositeUnsubscribe=d,g=function(){function b(a,b){this._subscribe=a,this._handleEvent=b,this.subscribe=mb(this.subscribe,this),this.handleEvent=mb(this.handleEvent,this),this.subscriptions=[],this.queue=[],this.pushing=!1,this.ended=!1,this.prevError=void 0,this.unsubSrc=void 0}return b.prototype.hasSubscribers=function(){return this.subscriptions.length>0},b.prototype.removeSub=function(a){return this.subscriptions=hb.without(a,this.subscriptions)},b.prototype.push=function(a){return a.isEnd()&&(this.ended=!0),u.inTransaction(a,this,this.pushIt,[a])},b.prototype.pushToSubscriptions=function(b){var c,d,e,f,g,h;try{for(f=this.subscriptions,g=0,h=f.length;h>g;g++)e=f[g],d=e.sink(b),(d===a.noMore||b.isEnd())&&this.removeSub(e);return!0}catch(i){throw c=i,this.pushing=!1,this.queue=[],c}},b.prototype.pushIt=function(b){if(this.pushing)return this.queue.push(b),a.more;if(b!==this.prevError){for(b.isError()&&(this.prevError=b),this.pushing=!0,this.pushToSubscriptions(b),this.pushing=!1;this.queue.length;)b=this.queue.shift(),this.push(b);return this.hasSubscribers()?a.more:(this.unsubscribeFromSource(),a.noMore)}},b.prototype.handleEvent=function(a){return this._handleEvent?this._handleEvent(a):this.push(a)},b.prototype.unsubscribeFromSource=function(){return this.unsubSrc&&this.unsubSrc(),this.unsubSrc=void 0},b.prototype.subscribe=function(a){var b;return this.ended?(a(B()),V):(b={sink:a},this.subscriptions.push(b),1===this.subscriptions.length&&(this.unsubSrc=this._subscribe(this.handleEvent)),function(a){return function(){return a.removeSub(b),a.hasSubscribers()?void 0:a.unsubscribeFromSource()}}(this))},b}(),k=function(b){function c(a,b,d){hb.isFunction(a)&&(d=b,b=a,a=[]),c.__super__.constructor.call(this,a),this.dispatcher=new g(b,d),Y(this)}return kb(c,b),c.prototype.toProperty=function(b){var c,d;return d=0===arguments.length?o:cb(function(){return b}),c=this.dispatcher,new q(A(this,"toProperty",b),function(b){var e,f,g,h;return e=!1,h=V,f=a.more,g=function(){return e?void 0:d.forEach(function(c){return e=!0,f=b(new m(c)),f===a.noMore?(h(),h=V):void 0})},h=c.subscribe(function(c){return c.hasValue()?e&&c.isInitial()?a.more:(c.isInitial()||g(),e=!0,d=new s(c),b(c)):(c.isEnd()&&(f=g()),f!==a.noMore?b(c):void 0)}),g(),h})},c.prototype.toEventStream=function(){return this},c.prototype.withHandler=function(a){return new c(A(this,"withHandler",a),this.dispatcher.subscribe,a)},c}(p),a.EventStream=k,a.never=function(){return new k(A(a,"never"),function(a){return a(B()),V})},a.when=function(){var b,c,d,e,f,g,h,i,j,l,m,n,o,p,q,r,s,v,w,z;if(0===arguments.length)return a.never();for(f=arguments.length,q="when: expecting arguments in the form (Observable+,function)+",o=[],j=[],c=0,l=[];f>c;){for(l[c]=arguments[c],l[c+1]=arguments[c+1],i=hb.toArray(arguments[c]),b=x(arguments[c+1]),h={f:b,ixs:[]},p=!1,r=0,v=i.length;v>r;r++){for(n=i[r],d=hb.indexOf(o,n),p||(p=t.isTrigger(n)),0>d&&(o.push(n),d=o.length-1),z=h.ixs,s=0,w=z.length;w>s;s++)e=z[s],e.index===d&&e.count++;h.ixs.push({index:d,count:1})}i.length>0&&j.push(h),c+=2}return o.length?(o=hb.map(t.fromObservable,o),g=hb.any(o,function(a){return a.flatten})&&y(hb.map(function(a){return a.obs},o)),m=new k(A.apply(null,[a,"when"].concat(lb.call(l))),function(b){var d,e,f,h,i,k,l;return l=[],f=!1,h=function(a){var b,d,e;for(e=a.ixs,b=0,d=e.length;d>b;b++)if(c=e[b],!o[c.index].hasAtLeast(c.count))return!1;return!0},e=function(a){return!a.sync||a.ended},d=function(a){var b,d,e;for(e=a.ixs,b=0,d=e.length;d>b;b++)if(c=e[b],!o[c.index].mayHave(c.count))return!0},i=function(a){return!a.source.flatten},k=function(k){return function(n){var p,q,r;return q=function(){return u.whenDoneWith(m,p)},r=function(){var d,e,f,g,k,m;if(!(l.length>0))return a.more;for(f=a.more,g=l.pop(),k=0,m=j.length;m>k;k++)if(e=j[k],h(e))return d=function(){var a,b,d,f;for(d=e.ixs,f=[],a=0,b=d.length;b>a;a++)c=d[a],f.push(o[c.index].consume());return f}(),f=b(g.e.apply(function(){var a,b;return b=function(){var b,c,e;for(e=[],b=0,c=d.length;c>b;b++)a=d[b],e.push(a.value());return e}(),e.f.apply(e,b)})),l.length&&(l=hb.filter(i,l)),f===a.noMore?f:r()},p=function(){var c;return c=r(),f&&(f=!1,(hb.all(o,e)||hb.all(j,d))&&(c=a.noMore,b(B()))),c===a.noMore&&n(),c},k.subscribe(function(c){var d;return c.isEnd()?(f=!0,k.markEnded(),q()):c.isError()?d=b(c):(k.push(c),k.sync&&(l.push({source:k,e:c}),g||u.hasWaiters()?q():p())),d===a.noMore&&n(),d||a.more})}},new a.CompositeUnsubscribe(function(){var a,b,c;for(c=[],a=0,b=o.length;b>a;a++)n=o[a],c.push(k(n));return c}()).unsubscribe})):a.never()},y=function(a,b){var c;return null==b&&(b=[]),c=function(a){var d;return hb.contains(b,a)?!0:(d=a.internalDeps(),d.length?(b.push(a),hb.any(d,c)):(b.push(a),!1))},hb.any(a,c)},x=function(a){return hb.isFunction(a)?a:hb.always(a)},a.groupSimultaneous=function(){var c,d,e;return e=1<=arguments.length?lb.call(arguments,0):[],1===e.length&&K(e[0])&&(e=e[0]),d=function(){var a,d,f;for(f=[],a=0,d=e.length;d>a;a++)c=e[a],f.push(new b(c));return f}(),fb.apply(null,[a,"groupSimultaneous"].concat(lb.call(e),[a.when(d,function(){var a;return a=1<=arguments.length?lb.call(arguments,0):[]})]))},r=function(b){function c(a,b,d){this.property=a,this.subscribe=mb(this.subscribe,this),c.__super__.constructor.call(this,b,d),this.current=o,this.currentValueRootId=void 0,this.propertyEnded=!1}return kb(c,b),c.prototype.push=function(a){return a.isEnd()&&(this.propertyEnded=!0),a.hasValue()&&(this.current=new s(a),this.currentValueRootId=u.currentEventId()),c.__super__.push.call(this,a)},c.prototype.maybeSubSource=function(b,c){return c===a.noMore?V:this.propertyEnded?(b(B()),V):g.prototype.subscribe.call(this,b)},c.prototype.subscribe=function(b){var c,d,e,f;return d=!1,e=a.more,this.current.isDefined&&(this.hasSubscribers()||this.propertyEnded)?(c=u.currentEventId(),f=this.currentValueRootId,!this.propertyEnded&&f&&c&&c!==f?(u.whenDoneWith(this.property,function(a){return function(){return a.currentValueRootId===f?b(J(a.current.get().value())):void 0}}(this)),this.maybeSubSource(b,e)):(u.inTransaction(void 0,this,function(){return e=b(J(this.current.get().value()))},[]),this.maybeSubSource(b,e))):this.maybeSubSource(b,e)},c}(g),q=function(a){function b(a,c,d){hb.isFunction(a)&&(d=c,c=a,a=[]),b.__super__.constructor.call(this,a),this.dispatcher=new r(this,c,d),Y(this)}return kb(b,a),b.prototype.changes=function(){return new k(A(this,"changes"),function(a){return function(b){return a.dispatcher.subscribe(function(a){return a.isInitial()?void 0:b(a)})}}(this))},b.prototype.withHandler=function(a){return new b(A(this,"withHandler",a),this.dispatcher.subscribe,a)},b.prototype.toProperty=function(){return this},b.prototype.toEventStream=function(){return new k(A(this,"toEventStream"),function(a){return function(b){return a.dispatcher.subscribe(function(a){return a.isInitial()&&(a=a.toNext()),b(a)})}}(this))},b}(p),a.Property=q,a.constant=function(b){return new q(A(a,"constant",b),function(a){return a(J(b)),a(B()),V})},a.fromBinder=function(b,c){return null==c&&(c=hb.id),new k(A(a,"fromBinder",b,c),function(d){var e,f,g,h;return h=!1,e=!1,f=function(){return h?void 0:"undefined"!=typeof g&&null!==g?(g(),h=!0):e=!0},g=b(function(){var b,e,g,h,i,k;for(b=1<=arguments.length?lb.call(arguments,0):[],h=c.apply(this,b),K(h)&&hb.last(h)instanceof j||(h=[h]),g=a.more,i=0,k=h.length;k>i;i++)if(e=h[i],g=d(e=_(e)),g===a.noMore||e.isEnd())return f(),g;return g}),e&&f(),f})},D=[["addEventListener","removeEventListener"],["addListener","removeListener"],["on","off"],["bind","unbind"]],F=function(a){var b,c,d,e;for(d=0,e=D.length;e>d;d++)if(c=D[d],b=[a[c[0]],a[c[1]]],b[0]&&b[1])return b;throw new i("No suitable event methods in "+a)},a.fromEventTarget=function(b,c,d){var e,f,g;return g=F(b),e=g[0],f=g[1],fb(a,"fromEvent",b,c,a.fromBinder(function(a){return e.call(b,c,a),function(){return f.call(b,c,a)}},d))},a.fromEvent=a.fromEventTarget,a.once=function(b){return new k(A(a,"once",b),function(a){return a(_(b)),a(B()),V})},a.fromArray=function(b){var c;return b.length?(c=0,new k(A(a,"fromArray",b),function(d){var e,f,g;return g=!1,f=a.more,e=function(){var h;return f===a.noMore||g||(h=b[c++],f=d(_(h)),f===a.noMore)?void 0:c===b.length?d(B()):u.afterTransaction(e)},e(),function(){return g=!0}})):fb(a,"fromArray",b,a.never())},a.Observable.prototype.map=function(){var a,b;return b=arguments[0],a=2<=arguments.length?lb.call(arguments,1):[],z(this,b,a,function(a){return fb(this,"map",a,this.withHandler(function(b){return this.push(b.fmap(a))}))})},a.combineAsArray=function(){var b,c,d,e,f,g,h;for(f=1<=arguments.length?lb.call(arguments,0):[],1===f.length&&K(f[0])&&(f=f[0]),b=g=0,h=f.length;h>g;b=++g)e=f[b],M(e)||(f[b]=a.constant(e));return f.length?(d=function(){var a,b,d;for(d=[],a=0,b=f.length;b>a;a++)c=f[a],d.push(new t(c,!0));return d}(),fb.apply(null,[a,"combineAsArray"].concat(lb.call(f),[a.when(d,function(){var a;return a=1<=arguments.length?lb.call(arguments,0):[]}).toProperty()]))):a.constant([])},a.onValues=function(){var b,c,d;return c=2<=arguments.length?lb.call(arguments,0,d=arguments.length-1):(d=0,[]),b=arguments[d++],a.combineAsArray(c).onValues(b)},a.combineWith=function(){var b,c;return b=arguments[0],c=2<=arguments.length?lb.call(arguments,1):[],fb.apply(null,[a,"combineWith",b].concat(lb.call(c),[a.combineAsArray(c).map(function(a){return b.apply(null,a)})]))},a.combineTemplate=function(b){var c,d,e,f,g,h,i,j,k,l;return i=[],l=[],h=function(a){return a[a.length-1]},k=function(a,b,c){return h(a)[b]=c},c=function(a,b){return function(c,d){return k(c,a,d[b])}},g=function(a,b){return function(c){return k(c,a,b)}},j=function(a){return K(a)?[]:{}},e=function(a,b){var d,e;return M(b)?(l.push(b),i.push(c(a,l.length-1))):b!==Object(b)||"function"==typeof b||b instanceof RegExp||b instanceof Date?i.push(g(a,b)):(e=function(a){return function(c){var d;return d=j(b),k(c,a,d),c.push(d)}},d=function(a){return a.pop()},i.push(e(a)),f(b),i.push(d))},f=function(a){return hb.each(a,e)},f(b),d=function(a){var c,d,e,f,g;for(e=j(b),c=[e],f=0,g=i.length;g>f;f++)(d=i[f])(c,a);return e},fb(a,"combineTemplate",b,a.combineAsArray(l).map(d))},a.Observable.prototype.combine=function(b,c){var d;return d=$(c),fb(this,"combine",b,c,a.combineAsArray(this,b).map(function(a){return d(a[0],a[1])}))},a.Observable.prototype.decode=function(b){return fb(this,"decode",b,this.combine(a.combineTemplate(b),function(a,b){return b[a]}))},a.Observable.prototype.withStateMachine=function(b,c){var d;return d=b,fb(this,"withStateMachine",b,c,this.withHandler(function(b){var e,f,g,h,i,j,k;for(e=c(d,b),f=e[0],h=e[1],d=f,i=a.more,j=0,k=h.length;k>j;j++)if(g=h[j],i=this.push(g),i===a.noMore)return i;return i}))},a.Observable.prototype.skipDuplicates=function(a){return null==a&&(a=function(a,b){return a===b}),fb(this,"skipDuplicates",this.withStateMachine(o,function(b,c){return c.hasValue()?c.isInitial()||b===o||!a(b.get(),c.value())?[new s(c.value()),[c]]:[b,[]]:[b,[c]]}))},a.Observable.prototype.awaiting=function(b){return fb(this,"awaiting",b,a.groupSimultaneous(this,b).map(function(a){var b,c;return b=a[0],c=a[1],0===c.length}).toProperty(!1).skipDuplicates())},a.Observable.prototype.not=function(){return fb(this,"not",this.map(function(a){return!a}))},a.Property.prototype.and=function(a){return fb(this,"and",a,this.combine(a,function(a,b){return a&&b}))},a.Property.prototype.or=function(a){return fb(this,"or",a,this.combine(a,function(a,b){return a||b}))},a.scheduler={setTimeout:function(a,b){return setTimeout(a,b)},setInterval:function(a,b){return setInterval(a,b)},clearInterval:function(a){return clearInterval(a)},clearTimeout:function(a){return clearTimeout(a)},now:function(){return(new Date).getTime()}},a.EventStream.prototype.bufferWithTime=function(a){return fb(this,"bufferWithTime",a,this.bufferWithTimeOrCount(a,Number.MAX_VALUE))},a.EventStream.prototype.bufferWithCount=function(a){return fb(this,"bufferWithCount",a,this.bufferWithTimeOrCount(void 0,a))},a.EventStream.prototype.bufferWithTimeOrCount=function(a,b){var c;return c=function(c){return c.values.length===b?c.flush():void 0!==a?c.schedule():void 0},fb(this,"bufferWithTimeOrCount",a,b,this.buffer(a,c,c))},a.EventStream.prototype.buffer=function(b,c,d){var e,f,g;return null==c&&(c=V),null==d&&(d=V),e={scheduled:null,end:void 0,values:[],flush:function(){var b;if(this.scheduled&&(a.scheduler.clearTimeout(this.scheduled),this.scheduled=null),this.values.length>0){if(b=this.push(U(this.values)),this.values=[],null!=this.end)return this.push(this.end);if(b!==a.noMore)return d(this)}else if(null!=this.end)return this.push(this.end)},schedule:function(){return this.scheduled?void 0:this.scheduled=b(function(a){return function(){return a.flush()}}(this))}},g=a.more,hb.isFunction(b)||(f=b,b=function(b){return a.scheduler.setTimeout(b,f)}),fb(this,"buffer",this.withHandler(function(a){return e.push=function(a){return function(b){return a.push(b)}}(this),a.isError()?g=this.push(a):a.isEnd()?(e.end=a,e.scheduled||e.flush()):(e.values.push(a.value()),c(e)),g}))},a.Observable.prototype.filter=function(){var b,c;return c=arguments[0],b=2<=arguments.length?lb.call(arguments,1):[],z(this,c,b,function(b){return fb(this,"filter",b,this.withHandler(function(c){return c.filter(b)?this.push(c):a.more}))})},a.EventStream.prototype.concat=function(a){var b;return b=this,new k(A(b,"concat",a),function(c){var d,e;return e=V,d=b.dispatcher.subscribe(function(b){return b.isEnd()?e=a.dispatcher.subscribe(c):c(b)}),function(){return d(),e()}})},a.Observable.prototype.flatMap=function(){return G(this,T(arguments))},a.Observable.prototype.flatMapFirst=function(){return G(this,T(arguments),!0)},G=function(b,c,e,f){var g,h,i;return i=[b],g=[],h=new k(A(b,"flatMap"+(e?"First":""),c),function(h){var i,j,k,l,n;return k=new d,l=[],n=function(b){var d;return d=S(c(b.value())),g.push(d),k.add(function(b,c){return d.dispatcher.subscribe(function(e){var f;return e.isEnd()?(hb.remove(d,g),j(),i(c),a.noMore):(e instanceof m&&(e=e.toNext()),f=h(e),f===a.noMore&&b(),f)})})},j=function(){var a;return a=l.shift(),a?n(a):void 0},i=function(a){return a(),k.empty()?h(B()):void 0},k.add(function(c,d){return b.dispatcher.subscribe(function(b){return b.isEnd()?i(d):b.isError()?h(b):e&&k.count()>1?a.more:k.unsubscribed?a.noMore:f&&k.count()>f?l.push(b):n(b)})}),k.unsubscribe}),h.internalDeps=function(){return g.length?i.concat(g):i},h},T=function(a){return 1===a.length&&M(a[0])?hb.always(a[0]):Q(a)},S=function(b){return M(b)?b:a.once(b)},a.Observable.prototype.flatMapWithConcurrencyLimit=function(){var a,b;return b=arguments[0],a=2<=arguments.length?lb.call(arguments,1):[],fb.apply(null,[this,"flatMapWithConcurrencyLimit",b].concat(lb.call(a),[G(this,T(a),!1,b)]))},a.Observable.prototype.flatMapConcat=function(){return fb.apply(null,[this,"flatMapConcat"].concat(lb.call(arguments),[this.flatMapWithConcurrencyLimit.apply(this,[1].concat(lb.call(arguments)))]))},v=function(b,c){var d;return d=new k(A(b,"justInitValue"),function(c){var e,f;return f=void 0,e=b.dispatcher.subscribe(function(b){return b.isEnd()||(f=b),a.noMore}),u.whenDoneWith(d,function(){return null!=f&&c(f),c(B())}),e}),d.concat(c).toProperty()},a.Observable.prototype.mapEnd=function(){var b;return b=Q(arguments),fb(this,"mapEnd",b,this.withHandler(function(c){return c.isEnd()?(this.push(U(b(c))),this.push(B()),a.noMore):this.push(c)}))},a.Observable.prototype.skipErrors=function(){return fb(this,"skipErrors",this.withHandler(function(b){return b.isError()?a.more:this.push(b)}))},a.EventStream.prototype.takeUntil=function(b){var c;return c={},fb(this,"takeUntil",b,a.groupSimultaneous(this.mapEnd(c),b.skipErrors()).withHandler(function(d){var e,f,g,h,i,j;if(d.hasValue()){if(j=d.value(),e=j[0],b=j[1],b.length)return this.push(B());for(f=a.more,h=0,i=e.length;i>h;h++)g=e[h],f=this.push(g===c?B():U(g));return f}return this.push(d)}))},a.Property.prototype.takeUntil=function(a){var b;return b=this.changes().takeUntil(a),fb(this,"takeUntil",a,v(this,b))},a.Observable.prototype.flatMapLatest=function(){var a,b;return a=T(arguments),b=this.toEventStream(),fb(this,"flatMapLatest",a,b.flatMap(function(c){return S(a(c)).takeUntil(b)}))},a.fromPoll=function(b,c){return fb(a,"fromPoll",b,c,a.fromBinder(function(c){var d;return d=a.scheduler.setInterval(c,b),function(){return a.scheduler.clearInterval(d)}},c))},a.later=function(b,c){return fb(a,"later",b,c,a.fromPoll(b,function(){return[c,B()]}))},a.sequentially=function(b,c){var d;return d=0,fb(a,"sequentially",b,c,a.fromPoll(b,function(){var a;return a=c[d++],d<c.length?a:d===c.length?[a,B()]:B()}))},a.repeatedly=function(b,c){var d;return d=0,fb(a,"repeatedly",b,c,a.fromPoll(b,function(){return c[d++%c.length]}))},a.interval=function(b,c){return null==c&&(c={}),fb(a,"interval",b,c,a.fromPoll(b,function(){return U(c)}))},a.EventStream.prototype.delay=function(b){return fb(this,"delay",b,this.flatMap(function(c){return a.later(b,c)}))},a.Property.prototype.delay=function(a){return this.delayChanges("delay",a,function(b){return b.delay(a)})},a.Property.prototype.delayChanges=function(){var a,b,c;return a=2<=arguments.length?lb.call(arguments,0,c=arguments.length-1):(c=0,[]),b=arguments[c++],fb.apply(null,[this].concat(lb.call(a),[v(this,b(this.changes()))]))},a.Observable.prototype.bufferingThrottle=function(b){return fb(this,"bufferingThrottle",b,this.flatMapConcat(function(c){return a.once(c).concat(a.later(b).filter(!1))}))},a.Property.prototype.bufferingThrottle=function(){return a.Observable.prototype.bufferingThrottle.apply(this,arguments).toProperty()},c=function(b){function c(){this.guardedSink=mb(this.guardedSink,this),this.subscribeAll=mb(this.subscribeAll,this),this.unsubAll=mb(this.unsubAll,this),this.sink=void 0,this.subscriptions=[],this.ended=!1,c.__super__.constructor.call(this,A(a,"Bus"),this.subscribeAll)}return kb(c,b),c.prototype.unsubAll=function(){var a,b,c,d;for(d=this.subscriptions,b=0,c=d.length;c>b;b++)a=d[b],"function"==typeof a.unsub&&a.unsub();return void 0},c.prototype.subscribeAll=function(a){var b,c,d,e;for(this.sink=a,e=w(this.subscriptions),c=0,d=e.length;d>c;c++)b=e[c],this.subscribeInput(b);return this.unsubAll},c.prototype.guardedSink=function(b){return function(c){return function(d){return d.isEnd()?(c.unsubscribeInput(b),a.noMore):c.sink(d)}}(this)},c.prototype.subscribeInput=function(a){return a.unsub=a.input.dispatcher.subscribe(this.guardedSink(a.input))},c.prototype.unsubscribeInput=function(a){var b,c,d,e,f;for(f=this.subscriptions,b=d=0,e=f.length;e>d;b=++d)if(c=f[b],c.input===a)return"function"==typeof c.unsub&&c.unsub(),void this.subscriptions.splice(b,1)},c.prototype.plug=function(a){var b;if(!this.ended)return b={input:a},this.subscriptions.push(b),null!=this.sink&&this.subscribeInput(b),function(b){return function(){return b.unsubscribeInput(a)}}(this)},c.prototype.end=function(){return this.ended=!0,this.unsubAll(),"function"==typeof this.sink?this.sink(B()):void 0},c.prototype.push=function(a){return"function"==typeof this.sink?this.sink(U(a)):void 0},c.prototype.error=function(a){return"function"==typeof this.sink?this.sink(new i(a)):void 0},c}(k),a.Bus=c,O=function(b,c){return gb(function(){var d,e,f;return e=arguments[0],d=2<=arguments.length?lb.call(arguments,1):[],f=W(c,[function(a,b){return e.apply(null,lb.call(a).concat([b]))
}]),fb.apply(null,[a,b,e].concat(lb.call(d),[a.combineAsArray(d).flatMap(f)]))})},a.fromCallback=O("fromCallback",function(){var b,c;return c=arguments[0],b=2<=arguments.length?lb.call(arguments,1):[],a.fromBinder(function(a){return P(c,b)(a),V},function(a){return[a,B()]})}),a.fromNodeCallback=O("fromNodeCallback",function(){var b,c;return c=arguments[0],b=2<=arguments.length?lb.call(arguments,1):[],a.fromBinder(function(a){return P(c,b)(a),V},function(a,b){return a?[new i(a),B()]:[b,B()]})}),a.EventStream.prototype.debounce=function(b){return fb(this,"debounce",b,this.flatMapLatest(function(c){return a.later(b,c)}))},a.Property.prototype.debounce=function(a){return this.delayChanges("debounce",a,function(b){return b.debounce(a)})},a.EventStream.prototype.debounceImmediate=function(b){return fb(this,"debounceImmediate",b,this.flatMapFirst(function(c){return a.once(c).concat(a.later(b).filter(!1))}))},a.Observable.prototype.scan=function(b,c){var d,e,f;return c=$(c),d=cb(b),f=function(b){return function(f){var g,h,i,j;return g=!1,j=V,h=a.more,i=function(){return g?void 0:d.forEach(function(b){return g=!0,h=f(new m(function(){return b})),h===a.noMore?(j(),j=V):void 0})},j=b.dispatcher.subscribe(function(b){var e,j;return b.hasValue()?g&&b.isInitial()?a.more:(b.isInitial()||i(),g=!0,j=d.getOrElse(void 0),e=c(j,b.value()),d=new s(e),f(b.apply(function(){return e}))):(b.isEnd()&&(h=i()),h!==a.noMore?f(b):void 0)}),u.whenDoneWith(e,i),j}}(this),e=new q(A(this,"scan",b,c),f)},a.Observable.prototype.diff=function(a,b){return b=$(b),fb(this,"diff",a,b,this.scan([a],function(a,c){return[c,b(a[0],c)]}).filter(function(a){return 2===a.length}).map(function(a){return a[1]}))},a.Observable.prototype.doAction=function(){var a;return a=Q(arguments),fb(this,"doAction",a,this.withHandler(function(b){return b.hasValue()&&a(b.value()),this.push(b)}))},a.Observable.prototype.endOnError=function(){var a,b;return b=arguments[0],a=2<=arguments.length?lb.call(arguments,1):[],null==b&&(b=!0),z(this,b,a,function(a){return fb(this,"endOnError",this.withHandler(function(b){return b.isError()&&a(b.error)?(this.push(b),this.push(B())):this.push(b)}))})},p.prototype.errors=function(){return fb(this,"errors",this.filter(function(){return!1}))},eb=function(a){return[a,B()]},a.fromPromise=function(b,c){return fb(a,"fromPromise",b,a.fromBinder(function(a){return b.then(a,function(b){return a(new i(b))}),function(){return c&&"function"==typeof b.abort?b.abort():void 0}},eb))},a.Observable.prototype.mapError=function(){var a;return a=Q(arguments),fb(this,"mapError",a,this.withHandler(function(b){return this.push(b.isError()?U(a(b.error)):b)}))},a.Observable.prototype.flatMapError=function(b){return fb(this,"flatMapError",b,this.mapError(function(a){return new i(a)}).flatMap(function(c){return c instanceof i?b(c.error):a.once(c)}))},a.EventStream.prototype.sampledBy=function(a,b){return fb(this,"sampledBy",a,b,this.toProperty().sampledBy(a,b))},a.Property.prototype.sampledBy=function(b,c){var d,e,f,g,h;return null!=c?c=$(c):(d=!0,c=function(a){return a.value()}),h=new t(this,!1,d),f=new t(b,!0,d),g=a.when([h,f],c),e=b instanceof q?g.toProperty():g,fb(this,"sampledBy",b,c,e)},a.Property.prototype.sample=function(b){return fb(this,"sample",b,this.sampledBy(a.interval(b,{})))},a.Observable.prototype.map=function(){var a,b;return b=arguments[0],a=2<=arguments.length?lb.call(arguments,1):[],b instanceof q?b.sampledBy(this,H):z(this,b,a,function(a){return fb(this,"map",a,this.withHandler(function(b){return this.push(b.fmap(a))}))})},a.Observable.prototype.fold=function(a,b){return fb(this,"fold",a,b,this.scan(a,b).sampledBy(this.filter(!1).mapEnd().toProperty()))},p.prototype.reduce=p.prototype.fold,a.EventStream.prototype.merge=function(b){var c;return c=this,fb(c,"merge",b,a.mergeAll(this,b))},a.mergeAll=function(){var b;return b=1<=arguments.length?lb.call(arguments,0):[],K(b[0])&&(b=b[0]),b.length?new k(A.apply(null,[a,"mergeAll"].concat(lb.call(b))),function(c){var d,e,f;return d=0,f=function(e){return function(f){return e.dispatcher.subscribe(function(e){var g;return e.isEnd()?(d++,d===b.length?c(B()):a.more):(g=c(e),g===a.noMore&&f(),g)})}},e=hb.map(f,b),new a.CompositeUnsubscribe(e).unsubscribe}):a.never()},a.Observable.prototype.take=function(b){return 0>=b?a.never():fb(this,"take",b,this.withHandler(function(c){return c.hasValue()?(b--,b>0?this.push(c):(0===b&&this.push(c),this.push(B()),a.noMore)):this.push(c)}))},a.EventStream.prototype.holdWhen=function(b){var c,d,e;return e=b.startWith(!1),d=e.filter(function(a){return!a}),c=e.filter(hb.id),fb(this,"holdWhen",b,this.filter(!1).merge(e.flatMapConcat(function(b){return function(e){return e?b.scan([],function(a,b){return a.concat([b])}).sampledBy(d).take(1).flatMap(a.fromArray):b.takeUntil(c)}}(this))))},a.$={},a.$.asEventStream=function(b,c,d){var e;return hb.isFunction(c)&&(e=[c,void 0],d=e[0],c=e[1]),fb(this.selector||this,"asEventStream",b,a.fromBinder(function(a){return function(d){return a.on(b,c,d),function(){return a.off(b,c,d)}}}(this),d))},null!=(ib="undefined"!=typeof jQuery&&null!==jQuery?jQuery:"undefined"!=typeof Zepto&&null!==Zepto?Zepto:void 0)&&(ib.fn.asEventStream=a.$.asEventStream),a.Observable.prototype.log=function(){var a;return a=1<=arguments.length?lb.call(arguments,0):[],this.subscribe(function(b){return"undefined"!=typeof console&&null!==console&&"function"==typeof console.log?console.log.apply(console,lb.call(a).concat([b.log()])):void 0}),this},a.repeat=function(b){var c;return c=0,a.fromBinder(function(d){var e,f,g,h,i;return e=!1,g=a.more,i=function(){},f=function(a){return a.isEnd()?e?h():e=!0:g=d(a)},h=function(){var h;for(e=!0;e&&g!==a.noMore;)h=b(c++),e=!1,h?i=h.subscribeInternal(f):d(B());return e=!0},h(),function(){return i()}})},a.retry=function(b){var c,d,e,f,g,h,i;if(!hb.isFunction(b.source))throw new l("'source' option has to be a function");return i=b.source,h=b.retries||0,g=b.maxRetries||h,c=b.delay||function(){return 0},f=b.isRetryable||function(){return!0},e=!1,d=null,fb(a,"retry",b,a.repeat(function(){var b,j,k;return e?null:(k=function(){return i().endOnError().withHandler(function(a){return a.isError()?(d=a,f(d.error)&&h>0?void 0:(e=!0,this.push(a))):(a.hasValue()&&(d=null,e=!0),this.push(a))})},d?(b={error:d.error,retriesDone:g-h},j=a.later(c(b)).filter(!1),h-=1,j.concat(a.once().flatMap(k))):k())}))},a.Observable.prototype.skip=function(b){return fb(this,"skip",b,this.withHandler(function(c){return c.hasValue()&&b>0?(b--,a.more):this.push(c)}))},a.EventStream.prototype.skipUntil=function(a){var b;return b=a.take(1).map(!0).toProperty(!1),fb(this,"skipUntil",a,this.filter(b))},a.EventStream.prototype.skipWhile=function(){var b,c,d;return c=arguments[0],b=2<=arguments.length?lb.call(arguments,1):[],d=!1,z(this,c,b,function(b){return fb(this,"skipWhile",b,this.withHandler(function(c){return!d&&c.hasValue()&&b(c.value())?a.more:(c.hasValue()&&(d=!0),this.push(c))}))})},a.Observable.prototype.slidingWindow=function(a,b){return null==b&&(b=0),fb(this,"slidingWindow",a,b,this.scan([],function(b,c){return b.concat([c]).slice(-a)}).filter(function(a){return a.length>=b}))},a.spy=function(a){return Z.push(a)},Z=[],Y=function(a){var b,c,d;if(Z.length&&!Y.running)try{for(Y.running=!0,c=0,d=Z.length;d>c;c++)(b=Z[c])(a)}finally{delete Y.running}return void 0},a.Property.prototype.startWith=function(a){return fb(this,"startWith",a,this.scan(a,function(a,b){return b}))},a.EventStream.prototype.startWith=function(b){return fb(this,"startWith",b,a.once(b).concat(this))},a.Observable.prototype.takeWhile=function(){var b,c;return c=arguments[0],b=2<=arguments.length?lb.call(arguments,1):[],z(this,c,b,function(b){return fb(this,"takeWhile",b,this.withHandler(function(c){return c.filter(b)?this.push(c):(this.push(B()),a.noMore)}))})},a.EventStream.prototype.throttle=function(a){return fb(this,"throttle",a,this.bufferWithTime(a).map(function(a){return a[a.length-1]}))},a.Property.prototype.throttle=function(a){return this.delayChanges("throttle",a,function(b){return b.throttle(a)})},a.update=function(){var b,c,d,e;for(c=arguments[0],e=2<=arguments.length?lb.call(arguments,1):[],d=function(a){return function(){var b;return b=1<=arguments.length?lb.call(arguments,0):[],function(c){return a.apply(null,[c].concat(b))}}},b=e.length-1;b>0;)e[b]instanceof Function||(e[b]=function(a){return function(){return a}}(e[b])),e[b]=d(e[b]),b-=2;return fb.apply(null,[a,"update",c].concat(lb.call(e),[a.when.apply(a,e).scan(c,function(a,b){return b(a)})]))},a.zipAsArray=function(){var b;return b=1<=arguments.length?lb.call(arguments,0):[],K(b[0])&&(b=b[0]),fb.apply(null,[a,"zipAsArray"].concat(lb.call(b),[a.zipWith(b,function(){var a;return a=1<=arguments.length?lb.call(arguments,0):[]})]))},a.zipWith=function(){var b,c,d;return b=arguments[0],c=2<=arguments.length?lb.call(arguments,1):[],hb.isFunction(b)||(d=[b,c[0]],c=d[0],b=d[1]),c=hb.map(function(a){return a.toEventStream()},c),fb.apply(null,[a,"zipWith",b].concat(lb.call(c),[a.when(c,b)]))},a.Observable.prototype.zip=function(b,c){return null==c&&(c=Array),fb(this,"zip",b,a.zipWith([this,b],c))},"undefined"!=typeof define&&null!==define&&null!=define.amd?(define([],function(){return a}),this.Bacon=a):"undefined"!=typeof module&&null!==module&&null!=module.exports?(module.exports=a,a.Bacon=a):this.Bacon=a}).call(this);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
/*! jQuery v2.0.0 | (c) 2005, 2013 jQuery Foundation, Inc. | jquery.org/license
//@ sourceMappingURL=jquery.min.map
*/
(function(e,undefined){var t,n,r=typeof undefined,i=e.location,o=e.document,s=o.documentElement,a=e.jQuery,u=e.$,l={},c=[],f="2.0.0",p=c.concat,h=c.push,d=c.slice,g=c.indexOf,m=l.toString,y=l.hasOwnProperty,v=f.trim,x=function(e,n){return new x.fn.init(e,n,t)},b=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,w=/\S+/g,T=/^(?:(<[\w\W]+>)[^>]*|#([\w-]*))$/,C=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,k=/^-ms-/,N=/-([\da-z])/gi,E=function(e,t){return t.toUpperCase()},S=function(){o.removeEventListener("DOMContentLoaded",S,!1),e.removeEventListener("load",S,!1),x.ready()};x.fn=x.prototype={jquery:f,constructor:x,init:function(e,t,n){var r,i;if(!e)return this;if("string"==typeof e){if(r="<"===e.charAt(0)&&">"===e.charAt(e.length-1)&&e.length>=3?[null,e,null]:T.exec(e),!r||!r[1]&&t)return!t||t.jquery?(t||n).find(e):this.constructor(t).find(e);if(r[1]){if(t=t instanceof x?t[0]:t,x.merge(this,x.parseHTML(r[1],t&&t.nodeType?t.ownerDocument||t:o,!0)),C.test(r[1])&&x.isPlainObject(t))for(r in t)x.isFunction(this[r])?this[r](t[r]):this.attr(r,t[r]);return this}return i=o.getElementById(r[2]),i&&i.parentNode&&(this.length=1,this[0]=i),this.context=o,this.selector=e,this}return e.nodeType?(this.context=this[0]=e,this.length=1,this):x.isFunction(e)?n.ready(e):(e.selector!==undefined&&(this.selector=e.selector,this.context=e.context),x.makeArray(e,this))},selector:"",length:0,toArray:function(){return d.call(this)},get:function(e){return null==e?this.toArray():0>e?this[this.length+e]:this[e]},pushStack:function(e){var t=x.merge(this.constructor(),e);return t.prevObject=this,t.context=this.context,t},each:function(e,t){return x.each(this,e,t)},ready:function(e){return x.ready.promise().done(e),this},slice:function(){return this.pushStack(d.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(0>e?t:0);return this.pushStack(n>=0&&t>n?[this[n]]:[])},map:function(e){return this.pushStack(x.map(this,function(t,n){return e.call(t,n,t)}))},end:function(){return this.prevObject||this.constructor(null)},push:h,sort:[].sort,splice:[].splice},x.fn.init.prototype=x.fn,x.extend=x.fn.extend=function(){var e,t,n,r,i,o,s=arguments[0]||{},a=1,u=arguments.length,l=!1;for("boolean"==typeof s&&(l=s,s=arguments[1]||{},a=2),"object"==typeof s||x.isFunction(s)||(s={}),u===a&&(s=this,--a);u>a;a++)if(null!=(e=arguments[a]))for(t in e)n=s[t],r=e[t],s!==r&&(l&&r&&(x.isPlainObject(r)||(i=x.isArray(r)))?(i?(i=!1,o=n&&x.isArray(n)?n:[]):o=n&&x.isPlainObject(n)?n:{},s[t]=x.extend(l,o,r)):r!==undefined&&(s[t]=r));return s},x.extend({expando:"jQuery"+(f+Math.random()).replace(/\D/g,""),noConflict:function(t){return e.$===x&&(e.$=u),t&&e.jQuery===x&&(e.jQuery=a),x},isReady:!1,readyWait:1,holdReady:function(e){e?x.readyWait++:x.ready(!0)},ready:function(e){(e===!0?--x.readyWait:x.isReady)||(x.isReady=!0,e!==!0&&--x.readyWait>0||(n.resolveWith(o,[x]),x.fn.trigger&&x(o).trigger("ready").off("ready")))},isFunction:function(e){return"function"===x.type(e)},isArray:Array.isArray,isWindow:function(e){return null!=e&&e===e.window},isNumeric:function(e){return!isNaN(parseFloat(e))&&isFinite(e)},type:function(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?l[m.call(e)]||"object":typeof e},isPlainObject:function(e){if("object"!==x.type(e)||e.nodeType||x.isWindow(e))return!1;try{if(e.constructor&&!y.call(e.constructor.prototype,"isPrototypeOf"))return!1}catch(t){return!1}return!0},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},error:function(e){throw Error(e)},parseHTML:function(e,t,n){if(!e||"string"!=typeof e)return null;"boolean"==typeof t&&(n=t,t=!1),t=t||o;var r=C.exec(e),i=!n&&[];return r?[t.createElement(r[1])]:(r=x.buildFragment([e],t,i),i&&x(i).remove(),x.merge([],r.childNodes))},parseJSON:JSON.parse,parseXML:function(e){var t,n;if(!e||"string"!=typeof e)return null;try{n=new DOMParser,t=n.parseFromString(e,"text/xml")}catch(r){t=undefined}return(!t||t.getElementsByTagName("parsererror").length)&&x.error("Invalid XML: "+e),t},noop:function(){},globalEval:function(e){var t,n=eval;e=x.trim(e),e&&(1===e.indexOf("use strict")?(t=o.createElement("script"),t.text=e,o.head.appendChild(t).parentNode.removeChild(t)):n(e))},camelCase:function(e){return e.replace(k,"ms-").replace(N,E)},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()},each:function(e,t,n){var r,i=0,o=e.length,s=j(e);if(n){if(s){for(;o>i;i++)if(r=t.apply(e[i],n),r===!1)break}else for(i in e)if(r=t.apply(e[i],n),r===!1)break}else if(s){for(;o>i;i++)if(r=t.call(e[i],i,e[i]),r===!1)break}else for(i in e)if(r=t.call(e[i],i,e[i]),r===!1)break;return e},trim:function(e){return null==e?"":v.call(e)},makeArray:function(e,t){var n=t||[];return null!=e&&(j(Object(e))?x.merge(n,"string"==typeof e?[e]:e):h.call(n,e)),n},inArray:function(e,t,n){return null==t?-1:g.call(t,e,n)},merge:function(e,t){var n=t.length,r=e.length,i=0;if("number"==typeof n)for(;n>i;i++)e[r++]=t[i];else while(t[i]!==undefined)e[r++]=t[i++];return e.length=r,e},grep:function(e,t,n){var r,i=[],o=0,s=e.length;for(n=!!n;s>o;o++)r=!!t(e[o],o),n!==r&&i.push(e[o]);return i},map:function(e,t,n){var r,i=0,o=e.length,s=j(e),a=[];if(s)for(;o>i;i++)r=t(e[i],i,n),null!=r&&(a[a.length]=r);else for(i in e)r=t(e[i],i,n),null!=r&&(a[a.length]=r);return p.apply([],a)},guid:1,proxy:function(e,t){var n,r,i;return"string"==typeof t&&(n=e[t],t=e,e=n),x.isFunction(e)?(r=d.call(arguments,2),i=function(){return e.apply(t||this,r.concat(d.call(arguments)))},i.guid=e.guid=e.guid||x.guid++,i):undefined},access:function(e,t,n,r,i,o,s){var a=0,u=e.length,l=null==n;if("object"===x.type(n)){i=!0;for(a in n)x.access(e,t,a,n[a],!0,o,s)}else if(r!==undefined&&(i=!0,x.isFunction(r)||(s=!0),l&&(s?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(x(e),n)})),t))for(;u>a;a++)t(e[a],n,s?r:r.call(e[a],a,t(e[a],n)));return i?e:l?t.call(e):u?t(e[0],n):o},now:Date.now,swap:function(e,t,n,r){var i,o,s={};for(o in t)s[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=s[o];return i}}),x.ready.promise=function(t){return n||(n=x.Deferred(),"complete"===o.readyState?setTimeout(x.ready):(o.addEventListener("DOMContentLoaded",S,!1),e.addEventListener("load",S,!1))),n.promise(t)},x.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(e,t){l["[object "+t+"]"]=t.toLowerCase()});function j(e){var t=e.length,n=x.type(e);return x.isWindow(e)?!1:1===e.nodeType&&t?!0:"array"===n||"function"!==n&&(0===t||"number"==typeof t&&t>0&&t-1 in e)}t=x(o),function(e,undefined){var t,n,r,i,o,s,a,u,l,c,f,p,h,d,g,m,y="sizzle"+-new Date,v=e.document,b={},w=0,T=0,C=ot(),k=ot(),N=ot(),E=!1,S=function(){return 0},j=typeof undefined,D=1<<31,A=[],L=A.pop,q=A.push,H=A.push,O=A.slice,F=A.indexOf||function(e){var t=0,n=this.length;for(;n>t;t++)if(this[t]===e)return t;return-1},P="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",R="[\\x20\\t\\r\\n\\f]",M="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",W=M.replace("w","w#"),$="\\["+R+"*("+M+")"+R+"*(?:([*^$|!~]?=)"+R+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+W+")|)|)"+R+"*\\]",B=":("+M+")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|"+$.replace(3,8)+")*)|.*)\\)|)",I=RegExp("^"+R+"+|((?:^|[^\\\\])(?:\\\\.)*)"+R+"+$","g"),z=RegExp("^"+R+"*,"+R+"*"),_=RegExp("^"+R+"*([>+~]|"+R+")"+R+"*"),X=RegExp(R+"*[+~]"),U=RegExp("="+R+"*([^\\]'\"]*)"+R+"*\\]","g"),Y=RegExp(B),V=RegExp("^"+W+"$"),G={ID:RegExp("^#("+M+")"),CLASS:RegExp("^\\.("+M+")"),TAG:RegExp("^("+M.replace("w","w*")+")"),ATTR:RegExp("^"+$),PSEUDO:RegExp("^"+B),CHILD:RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+R+"*(even|odd|(([+-]|)(\\d*)n|)"+R+"*(?:([+-]|)"+R+"*(\\d+)|))"+R+"*\\)|)","i"),"boolean":RegExp("^(?:"+P+")$","i"),needsContext:RegExp("^"+R+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+R+"*((?:-\\d)?\\d*)"+R+"*\\)|)(?=[^-]|$)","i")},J=/^[^{]+\{\s*\[native \w/,Q=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,K=/^(?:input|select|textarea|button)$/i,Z=/^h\d$/i,et=/'|\\/g,tt=/\\([\da-fA-F]{1,6}[\x20\t\r\n\f]?|.)/g,nt=function(e,t){var n="0x"+t-65536;return n!==n?t:0>n?String.fromCharCode(n+65536):String.fromCharCode(55296|n>>10,56320|1023&n)};try{H.apply(A=O.call(v.childNodes),v.childNodes),A[v.childNodes.length].nodeType}catch(rt){H={apply:A.length?function(e,t){q.apply(e,O.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function it(e){return J.test(e+"")}function ot(){var e,t=[];return e=function(n,i){return t.push(n+=" ")>r.cacheLength&&delete e[t.shift()],e[n]=i}}function st(e){return e[y]=!0,e}function at(e){var t=c.createElement("div");try{return!!e(t)}catch(n){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function ut(e,t,n,r){var i,o,s,a,u,f,d,g,x,w;if((t?t.ownerDocument||t:v)!==c&&l(t),t=t||c,n=n||[],!e||"string"!=typeof e)return n;if(1!==(a=t.nodeType)&&9!==a)return[];if(p&&!r){if(i=Q.exec(e))if(s=i[1]){if(9===a){if(o=t.getElementById(s),!o||!o.parentNode)return n;if(o.id===s)return n.push(o),n}else if(t.ownerDocument&&(o=t.ownerDocument.getElementById(s))&&m(t,o)&&o.id===s)return n.push(o),n}else{if(i[2])return H.apply(n,t.getElementsByTagName(e)),n;if((s=i[3])&&b.getElementsByClassName&&t.getElementsByClassName)return H.apply(n,t.getElementsByClassName(s)),n}if(b.qsa&&(!h||!h.test(e))){if(g=d=y,x=t,w=9===a&&e,1===a&&"object"!==t.nodeName.toLowerCase()){f=gt(e),(d=t.getAttribute("id"))?g=d.replace(et,"\\$&"):t.setAttribute("id",g),g="[id='"+g+"'] ",u=f.length;while(u--)f[u]=g+mt(f[u]);x=X.test(e)&&t.parentNode||t,w=f.join(",")}if(w)try{return H.apply(n,x.querySelectorAll(w)),n}catch(T){}finally{d||t.removeAttribute("id")}}}return kt(e.replace(I,"$1"),t,n,r)}o=ut.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return t?"HTML"!==t.nodeName:!1},l=ut.setDocument=function(e){var t=e?e.ownerDocument||e:v;return t!==c&&9===t.nodeType&&t.documentElement?(c=t,f=t.documentElement,p=!o(t),b.getElementsByTagName=at(function(e){return e.appendChild(t.createComment("")),!e.getElementsByTagName("*").length}),b.attributes=at(function(e){return e.className="i",!e.getAttribute("className")}),b.getElementsByClassName=at(function(e){return e.innerHTML="<div class='a'></div><div class='a i'></div>",e.firstChild.className="i",2===e.getElementsByClassName("i").length}),b.sortDetached=at(function(e){return 1&e.compareDocumentPosition(c.createElement("div"))}),b.getById=at(function(e){return f.appendChild(e).id=y,!t.getElementsByName||!t.getElementsByName(y).length}),b.getById?(r.find.ID=function(e,t){if(typeof t.getElementById!==j&&p){var n=t.getElementById(e);return n&&n.parentNode?[n]:[]}},r.filter.ID=function(e){var t=e.replace(tt,nt);return function(e){return e.getAttribute("id")===t}}):(r.find.ID=function(e,t){if(typeof t.getElementById!==j&&p){var n=t.getElementById(e);return n?n.id===e||typeof n.getAttributeNode!==j&&n.getAttributeNode("id").value===e?[n]:undefined:[]}},r.filter.ID=function(e){var t=e.replace(tt,nt);return function(e){var n=typeof e.getAttributeNode!==j&&e.getAttributeNode("id");return n&&n.value===t}}),r.find.TAG=b.getElementsByTagName?function(e,t){return typeof t.getElementsByTagName!==j?t.getElementsByTagName(e):undefined}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++])1===n.nodeType&&r.push(n);return r}return o},r.find.CLASS=b.getElementsByClassName&&function(e,t){return typeof t.getElementsByClassName!==j&&p?t.getElementsByClassName(e):undefined},d=[],h=[],(b.qsa=it(t.querySelectorAll))&&(at(function(e){e.innerHTML="<select><option selected=''></option></select>",e.querySelectorAll("[selected]").length||h.push("\\["+R+"*(?:value|"+P+")"),e.querySelectorAll(":checked").length||h.push(":checked")}),at(function(e){var t=c.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("t",""),e.querySelectorAll("[t^='']").length&&h.push("[*^$]="+R+"*(?:''|\"\")"),e.querySelectorAll(":enabled").length||h.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),h.push(",.*:")})),(b.matchesSelector=it(g=f.webkitMatchesSelector||f.mozMatchesSelector||f.oMatchesSelector||f.msMatchesSelector))&&at(function(e){b.disconnectedMatch=g.call(e,"div"),g.call(e,"[s!='']:x"),d.push("!=",B)}),h=h.length&&RegExp(h.join("|")),d=d.length&&RegExp(d.join("|")),m=it(f.contains)||f.compareDocumentPosition?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},S=f.compareDocumentPosition?function(e,n){if(e===n)return E=!0,0;var r=n.compareDocumentPosition&&e.compareDocumentPosition&&e.compareDocumentPosition(n);return r?1&r||!b.sortDetached&&n.compareDocumentPosition(e)===r?e===t||m(v,e)?-1:n===t||m(v,n)?1:u?F.call(u,e)-F.call(u,n):0:4&r?-1:1:e.compareDocumentPosition?-1:1}:function(e,n){var r,i=0,o=e.parentNode,s=n.parentNode,a=[e],l=[n];if(e===n)return E=!0,0;if(!o||!s)return e===t?-1:n===t?1:o?-1:s?1:u?F.call(u,e)-F.call(u,n):0;if(o===s)return lt(e,n);r=e;while(r=r.parentNode)a.unshift(r);r=n;while(r=r.parentNode)l.unshift(r);while(a[i]===l[i])i++;return i?lt(a[i],l[i]):a[i]===v?-1:l[i]===v?1:0},c):c},ut.matches=function(e,t){return ut(e,null,null,t)},ut.matchesSelector=function(e,t){if((e.ownerDocument||e)!==c&&l(e),t=t.replace(U,"='$1']"),!(!b.matchesSelector||!p||d&&d.test(t)||h&&h.test(t)))try{var n=g.call(e,t);if(n||b.disconnectedMatch||e.document&&11!==e.document.nodeType)return n}catch(r){}return ut(t,c,null,[e]).length>0},ut.contains=function(e,t){return(e.ownerDocument||e)!==c&&l(e),m(e,t)},ut.attr=function(e,t){(e.ownerDocument||e)!==c&&l(e);var n=r.attrHandle[t.toLowerCase()],i=n&&n(e,t,!p);return i===undefined?b.attributes||!p?e.getAttribute(t):(i=e.getAttributeNode(t))&&i.specified?i.value:null:i},ut.error=function(e){throw Error("Syntax error, unrecognized expression: "+e)},ut.uniqueSort=function(e){var t,n=[],r=0,i=0;if(E=!b.detectDuplicates,u=!b.sortStable&&e.slice(0),e.sort(S),E){while(t=e[i++])t===e[i]&&(r=n.push(i));while(r--)e.splice(n[r],1)}return e};function lt(e,t){var n=t&&e,r=n&&(~t.sourceIndex||D)-(~e.sourceIndex||D);if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function ct(e,t,n){var r;return n?undefined:(r=e.getAttributeNode(t))&&r.specified?r.value:e[t]===!0?t.toLowerCase():null}function ft(e,t,n){var r;return n?undefined:r=e.getAttribute(t,"type"===t.toLowerCase()?1:2)}function pt(e){return function(t){var n=t.nodeName.toLowerCase();return"input"===n&&t.type===e}}function ht(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}function dt(e){return st(function(t){return t=+t,st(function(n,r){var i,o=e([],n.length,t),s=o.length;while(s--)n[i=o[s]]&&(n[i]=!(r[i]=n[i]))})})}i=ut.getText=function(e){var t,n="",r=0,o=e.nodeType;if(o){if(1===o||9===o||11===o){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=i(e)}else if(3===o||4===o)return e.nodeValue}else for(;t=e[r];r++)n+=i(t);return n},r=ut.selectors={cacheLength:50,createPseudo:st,match:G,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(tt,nt),e[3]=(e[4]||e[5]||"").replace(tt,nt),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||ut.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&ut.error(e[0]),e},PSEUDO:function(e){var t,n=!e[5]&&e[2];return G.CHILD.test(e[0])?null:(e[4]?e[2]=e[4]:n&&Y.test(n)&&(t=gt(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(tt,nt).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=C[e+" "];return t||(t=RegExp("(^|"+R+")"+e+"("+R+"|$)"))&&C(e,function(e){return t.test("string"==typeof e.className&&e.className||typeof e.getAttribute!==j&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r){var i=ut.attr(r,e);return null==i?"!="===t:t?(i+="","="===t?i===n:"!="===t?i!==n:"^="===t?n&&0===i.indexOf(n):"*="===t?n&&i.indexOf(n)>-1:"$="===t?n&&i.slice(-n.length)===n:"~="===t?(" "+i+" ").indexOf(n)>-1:"|="===t?i===n||i.slice(0,n.length+1)===n+"-":!1):!0}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),s="last"!==e.slice(-4),a="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,u){var l,c,f,p,h,d,g=o!==s?"nextSibling":"previousSibling",m=t.parentNode,v=a&&t.nodeName.toLowerCase(),x=!u&&!a;if(m){if(o){while(g){f=t;while(f=f[g])if(a?f.nodeName.toLowerCase()===v:1===f.nodeType)return!1;d=g="only"===e&&!d&&"nextSibling"}return!0}if(d=[s?m.firstChild:m.lastChild],s&&x){c=m[y]||(m[y]={}),l=c[e]||[],h=l[0]===w&&l[1],p=l[0]===w&&l[2],f=h&&m.childNodes[h];while(f=++h&&f&&f[g]||(p=h=0)||d.pop())if(1===f.nodeType&&++p&&f===t){c[e]=[w,h,p];break}}else if(x&&(l=(t[y]||(t[y]={}))[e])&&l[0]===w)p=l[1];else while(f=++h&&f&&f[g]||(p=h=0)||d.pop())if((a?f.nodeName.toLowerCase()===v:1===f.nodeType)&&++p&&(x&&((f[y]||(f[y]={}))[e]=[w,p]),f===t))break;return p-=i,p===r||0===p%r&&p/r>=0}}},PSEUDO:function(e,t){var n,i=r.pseudos[e]||r.setFilters[e.toLowerCase()]||ut.error("unsupported pseudo: "+e);return i[y]?i(t):i.length>1?(n=[e,e,"",t],r.setFilters.hasOwnProperty(e.toLowerCase())?st(function(e,n){var r,o=i(e,t),s=o.length;while(s--)r=F.call(e,o[s]),e[r]=!(n[r]=o[s])}):function(e){return i(e,0,n)}):i}},pseudos:{not:st(function(e){var t=[],n=[],r=s(e.replace(I,"$1"));return r[y]?st(function(e,t,n,i){var o,s=r(e,null,i,[]),a=e.length;while(a--)(o=s[a])&&(e[a]=!(t[a]=o))}):function(e,i,o){return t[0]=e,r(t,null,o,n),!n.pop()}}),has:st(function(e){return function(t){return ut(e,t).length>0}}),contains:st(function(e){return function(t){return(t.textContent||t.innerText||i(t)).indexOf(e)>-1}}),lang:st(function(e){return V.test(e||"")||ut.error("unsupported lang: "+e),e=e.replace(tt,nt).toLowerCase(),function(t){var n;do if(n=p?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return n=n.toLowerCase(),n===e||0===n.indexOf(e+"-");while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===f},focus:function(e){return e===c.activeElement&&(!c.hasFocus||c.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:function(e){return e.disabled===!1},disabled:function(e){return e.disabled===!0},checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,e.selected===!0},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeName>"@"||3===e.nodeType||4===e.nodeType)return!1;return!0},parent:function(e){return!r.pseudos.empty(e)},header:function(e){return Z.test(e.nodeName)},input:function(e){return K.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||t.toLowerCase()===e.type)},first:dt(function(){return[0]}),last:dt(function(e,t){return[t-1]}),eq:dt(function(e,t,n){return[0>n?n+t:n]}),even:dt(function(e,t){var n=0;for(;t>n;n+=2)e.push(n);return e}),odd:dt(function(e,t){var n=1;for(;t>n;n+=2)e.push(n);return e}),lt:dt(function(e,t,n){var r=0>n?n+t:n;for(;--r>=0;)e.push(r);return e}),gt:dt(function(e,t,n){var r=0>n?n+t:n;for(;t>++r;)e.push(r);return e})}};for(t in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})r.pseudos[t]=pt(t);for(t in{submit:!0,reset:!0})r.pseudos[t]=ht(t);function gt(e,t){var n,i,o,s,a,u,l,c=k[e+" "];if(c)return t?0:c.slice(0);a=e,u=[],l=r.preFilter;while(a){(!n||(i=z.exec(a)))&&(i&&(a=a.slice(i[0].length)||a),u.push(o=[])),n=!1,(i=_.exec(a))&&(n=i.shift(),o.push({value:n,type:i[0].replace(I," ")}),a=a.slice(n.length));for(s in r.filter)!(i=G[s].exec(a))||l[s]&&!(i=l[s](i))||(n=i.shift(),o.push({value:n,type:s,matches:i}),a=a.slice(n.length));if(!n)break}return t?a.length:a?ut.error(e):k(e,u).slice(0)}function mt(e){var t=0,n=e.length,r="";for(;n>t;t++)r+=e[t].value;return r}function yt(e,t,r){var i=t.dir,o=r&&"parentNode"===i,s=T++;return t.first?function(t,n,r){while(t=t[i])if(1===t.nodeType||o)return e(t,n,r)}:function(t,r,a){var u,l,c,f=w+" "+s;if(a){while(t=t[i])if((1===t.nodeType||o)&&e(t,r,a))return!0}else while(t=t[i])if(1===t.nodeType||o)if(c=t[y]||(t[y]={}),(l=c[i])&&l[0]===f){if((u=l[1])===!0||u===n)return u===!0}else if(l=c[i]=[f],l[1]=e(t,r,a)||n,l[1]===!0)return!0}}function vt(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function xt(e,t,n,r,i){var o,s=[],a=0,u=e.length,l=null!=t;for(;u>a;a++)(o=e[a])&&(!n||n(o,r,i))&&(s.push(o),l&&t.push(a));return s}function bt(e,t,n,r,i,o){return r&&!r[y]&&(r=bt(r)),i&&!i[y]&&(i=bt(i,o)),st(function(o,s,a,u){var l,c,f,p=[],h=[],d=s.length,g=o||Ct(t||"*",a.nodeType?[a]:a,[]),m=!e||!o&&t?g:xt(g,p,e,a,u),y=n?i||(o?e:d||r)?[]:s:m;if(n&&n(m,y,a,u),r){l=xt(y,h),r(l,[],a,u),c=l.length;while(c--)(f=l[c])&&(y[h[c]]=!(m[h[c]]=f))}if(o){if(i||e){if(i){l=[],c=y.length;while(c--)(f=y[c])&&l.push(m[c]=f);i(null,y=[],l,u)}c=y.length;while(c--)(f=y[c])&&(l=i?F.call(o,f):p[c])>-1&&(o[l]=!(s[l]=f))}}else y=xt(y===s?y.splice(d,y.length):y),i?i(null,s,y,u):H.apply(s,y)})}function wt(e){var t,n,i,o=e.length,s=r.relative[e[0].type],u=s||r.relative[" "],l=s?1:0,c=yt(function(e){return e===t},u,!0),f=yt(function(e){return F.call(t,e)>-1},u,!0),p=[function(e,n,r){return!s&&(r||n!==a)||((t=n).nodeType?c(e,n,r):f(e,n,r))}];for(;o>l;l++)if(n=r.relative[e[l].type])p=[yt(vt(p),n)];else{if(n=r.filter[e[l].type].apply(null,e[l].matches),n[y]){for(i=++l;o>i;i++)if(r.relative[e[i].type])break;return bt(l>1&&vt(p),l>1&&mt(e.slice(0,l-1)).replace(I,"$1"),n,i>l&&wt(e.slice(l,i)),o>i&&wt(e=e.slice(i)),o>i&&mt(e))}p.push(n)}return vt(p)}function Tt(e,t){var i=0,o=t.length>0,s=e.length>0,u=function(u,l,f,p,h){var d,g,m,y=[],v=0,x="0",b=u&&[],T=null!=h,C=a,k=u||s&&r.find.TAG("*",h&&l.parentNode||l),N=w+=null==C?1:Math.random()||.1;for(T&&(a=l!==c&&l,n=i);null!=(d=k[x]);x++){if(s&&d){g=0;while(m=e[g++])if(m(d,l,f)){p.push(d);break}T&&(w=N,n=++i)}o&&((d=!m&&d)&&v--,u&&b.push(d))}if(v+=x,o&&x!==v){g=0;while(m=t[g++])m(b,y,l,f);if(u){if(v>0)while(x--)b[x]||y[x]||(y[x]=L.call(p));y=xt(y)}H.apply(p,y),T&&!u&&y.length>0&&v+t.length>1&&ut.uniqueSort(p)}return T&&(w=N,a=C),b};return o?st(u):u}s=ut.compile=function(e,t){var n,r=[],i=[],o=N[e+" "];if(!o){t||(t=gt(e)),n=t.length;while(n--)o=wt(t[n]),o[y]?r.push(o):i.push(o);o=N(e,Tt(i,r))}return o};function Ct(e,t,n){var r=0,i=t.length;for(;i>r;r++)ut(e,t[r],n);return n}function kt(e,t,n,i){var o,a,u,l,c,f=gt(e);if(!i&&1===f.length){if(a=f[0]=f[0].slice(0),a.length>2&&"ID"===(u=a[0]).type&&9===t.nodeType&&p&&r.relative[a[1].type]){if(t=(r.find.ID(u.matches[0].replace(tt,nt),t)||[])[0],!t)return n;e=e.slice(a.shift().value.length)}o=G.needsContext.test(e)?0:a.length;while(o--){if(u=a[o],r.relative[l=u.type])break;if((c=r.find[l])&&(i=c(u.matches[0].replace(tt,nt),X.test(a[0].type)&&t.parentNode||t))){if(a.splice(o,1),e=i.length&&mt(a),!e)return H.apply(n,i),n;break}}}return s(e,f)(i,t,!p,n,X.test(e)),n}r.pseudos.nth=r.pseudos.eq;function Nt(){}Nt.prototype=r.filters=r.pseudos,r.setFilters=new Nt,b.sortStable=y.split("").sort(S).join("")===y,l(),[0,0].sort(S),b.detectDuplicates=E,at(function(e){if(e.innerHTML="<a href='#'></a>","#"!==e.firstChild.getAttribute("href")){var t="type|href|height|width".split("|"),n=t.length;while(n--)r.attrHandle[t[n]]=ft}}),at(function(e){if(null!=e.getAttribute("disabled")){var t=P.split("|"),n=t.length;while(n--)r.attrHandle[t[n]]=ct}}),x.find=ut,x.expr=ut.selectors,x.expr[":"]=x.expr.pseudos,x.unique=ut.uniqueSort,x.text=ut.getText,x.isXMLDoc=ut.isXML,x.contains=ut.contains}(e);var D={};function A(e){var t=D[e]={};return x.each(e.match(w)||[],function(e,n){t[n]=!0}),t}x.Callbacks=function(e){e="string"==typeof e?D[e]||A(e):x.extend({},e);var t,n,r,i,o,s,a=[],u=!e.once&&[],l=function(f){for(t=e.memory&&f,n=!0,s=i||0,i=0,o=a.length,r=!0;a&&o>s;s++)if(a[s].apply(f[0],f[1])===!1&&e.stopOnFalse){t=!1;break}r=!1,a&&(u?u.length&&l(u.shift()):t?a=[]:c.disable())},c={add:function(){if(a){var n=a.length;(function s(t){x.each(t,function(t,n){var r=x.type(n);"function"===r?e.unique&&c.has(n)||a.push(n):n&&n.length&&"string"!==r&&s(n)})})(arguments),r?o=a.length:t&&(i=n,l(t))}return this},remove:function(){return a&&x.each(arguments,function(e,t){var n;while((n=x.inArray(t,a,n))>-1)a.splice(n,1),r&&(o>=n&&o--,s>=n&&s--)}),this},has:function(e){return e?x.inArray(e,a)>-1:!(!a||!a.length)},empty:function(){return a=[],o=0,this},disable:function(){return a=u=t=undefined,this},disabled:function(){return!a},lock:function(){return u=undefined,t||c.disable(),this},locked:function(){return!u},fireWith:function(e,t){return t=t||[],t=[e,t.slice?t.slice():t],!a||n&&!u||(r?u.push(t):l(t)),this},fire:function(){return c.fireWith(this,arguments),this},fired:function(){return!!n}};return c},x.extend({Deferred:function(e){var t=[["resolve","done",x.Callbacks("once memory"),"resolved"],["reject","fail",x.Callbacks("once memory"),"rejected"],["notify","progress",x.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return x.Deferred(function(n){x.each(t,function(t,o){var s=o[0],a=x.isFunction(e[t])&&e[t];i[o[1]](function(){var e=a&&a.apply(this,arguments);e&&x.isFunction(e.promise)?e.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[s+"With"](this===r?n.promise():this,a?[e]:arguments)})}),e=null}).promise()},promise:function(e){return null!=e?x.extend(e,r):r}},i={};return r.pipe=r.then,x.each(t,function(e,o){var s=o[2],a=o[3];r[o[1]]=s.add,a&&s.add(function(){n=a},t[1^e][2].disable,t[2][2].lock),i[o[0]]=function(){return i[o[0]+"With"](this===i?r:this,arguments),this},i[o[0]+"With"]=s.fireWith}),r.promise(i),e&&e.call(i,i),i},when:function(e){var t=0,n=d.call(arguments),r=n.length,i=1!==r||e&&x.isFunction(e.promise)?r:0,o=1===i?e:x.Deferred(),s=function(e,t,n){return function(r){t[e]=this,n[e]=arguments.length>1?d.call(arguments):r,n===a?o.notifyWith(t,n):--i||o.resolveWith(t,n)}},a,u,l;if(r>1)for(a=Array(r),u=Array(r),l=Array(r);r>t;t++)n[t]&&x.isFunction(n[t].promise)?n[t].promise().done(s(t,l,n)).fail(o.reject).progress(s(t,u,a)):--i;return i||o.resolveWith(l,n),o.promise()}}),x.support=function(t){var n=o.createElement("input"),r=o.createDocumentFragment(),i=o.createElement("div"),s=o.createElement("select"),a=s.appendChild(o.createElement("option"));return n.type?(n.type="checkbox",t.checkOn=""!==n.value,t.optSelected=a.selected,t.reliableMarginRight=!0,t.boxSizingReliable=!0,t.pixelPosition=!1,n.checked=!0,t.noCloneChecked=n.cloneNode(!0).checked,s.disabled=!0,t.optDisabled=!a.disabled,n=o.createElement("input"),n.value="t",n.type="radio",t.radioValue="t"===n.value,n.setAttribute("checked","t"),n.setAttribute("name","t"),r.appendChild(n),t.checkClone=r.cloneNode(!0).cloneNode(!0).lastChild.checked,t.focusinBubbles="onfocusin"in e,i.style.backgroundClip="content-box",i.cloneNode(!0).style.backgroundClip="",t.clearCloneStyle="content-box"===i.style.backgroundClip,x(function(){var n,r,s="padding:0;margin:0;border:0;display:block;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box",a=o.getElementsByTagName("body")[0];a&&(n=o.createElement("div"),n.style.cssText="border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px",a.appendChild(n).appendChild(i),i.innerHTML="",i.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%",x.swap(a,null!=a.style.zoom?{zoom:1}:{},function(){t.boxSizing=4===i.offsetWidth}),e.getComputedStyle&&(t.pixelPosition="1%"!==(e.getComputedStyle(i,null)||{}).top,t.boxSizingReliable="4px"===(e.getComputedStyle(i,null)||{width:"4px"}).width,r=i.appendChild(o.createElement("div")),r.style.cssText=i.style.cssText=s,r.style.marginRight=r.style.width="0",i.style.width="1px",t.reliableMarginRight=!parseFloat((e.getComputedStyle(r,null)||{}).marginRight)),a.removeChild(n))}),t):t}({});var L,q,H=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,O=/([A-Z])/g;function F(){Object.defineProperty(this.cache={},0,{get:function(){return{}}}),this.expando=x.expando+Math.random()}F.uid=1,F.accepts=function(e){return e.nodeType?1===e.nodeType||9===e.nodeType:!0},F.prototype={key:function(e){if(!F.accepts(e))return 0;var t={},n=e[this.expando];if(!n){n=F.uid++;try{t[this.expando]={value:n},Object.defineProperties(e,t)}catch(r){t[this.expando]=n,x.extend(e,t)}}return this.cache[n]||(this.cache[n]={}),n},set:function(e,t,n){var r,i=this.key(e),o=this.cache[i];if("string"==typeof t)o[t]=n;else if(x.isEmptyObject(o))this.cache[i]=t;else for(r in t)o[r]=t[r]},get:function(e,t){var n=this.cache[this.key(e)];return t===undefined?n:n[t]},access:function(e,t,n){return t===undefined||t&&"string"==typeof t&&n===undefined?this.get(e,t):(this.set(e,t,n),n!==undefined?n:t)},remove:function(e,t){var n,r,i=this.key(e),o=this.cache[i];if(t===undefined)this.cache[i]={};else{x.isArray(t)?r=t.concat(t.map(x.camelCase)):t in o?r=[t]:(r=x.camelCase(t),r=r in o?[r]:r.match(w)||[]),n=r.length;while(n--)delete o[r[n]]}},hasData:function(e){return!x.isEmptyObject(this.cache[e[this.expando]]||{})},discard:function(e){delete this.cache[this.key(e)]}},L=new F,q=new F,x.extend({acceptData:F.accepts,hasData:function(e){return L.hasData(e)||q.hasData(e)},data:function(e,t,n){return L.access(e,t,n)},removeData:function(e,t){L.remove(e,t)},_data:function(e,t,n){return q.access(e,t,n)},_removeData:function(e,t){q.remove(e,t)}}),x.fn.extend({data:function(e,t){var n,r,i=this[0],o=0,s=null;if(e===undefined){if(this.length&&(s=L.get(i),1===i.nodeType&&!q.get(i,"hasDataAttrs"))){for(n=i.attributes;n.length>o;o++)r=n[o].name,0===r.indexOf("data-")&&(r=x.camelCase(r.substring(5)),P(i,r,s[r]));q.set(i,"hasDataAttrs",!0)}return s}return"object"==typeof e?this.each(function(){L.set(this,e)}):x.access(this,function(t){var n,r=x.camelCase(e);if(i&&t===undefined){if(n=L.get(i,e),n!==undefined)return n;if(n=L.get(i,r),n!==undefined)return n;if(n=P(i,r,undefined),n!==undefined)return n}else this.each(function(){var n=L.get(this,r);L.set(this,r,t),-1!==e.indexOf("-")&&n!==undefined&&L.set(this,e,t)})},null,t,arguments.length>1,null,!0)},removeData:function(e){return this.each(function(){L.remove(this,e)})}});function P(e,t,n){var r;if(n===undefined&&1===e.nodeType)if(r="data-"+t.replace(O,"-$1").toLowerCase(),n=e.getAttribute(r),"string"==typeof n){try{n="true"===n?!0:"false"===n?!1:"null"===n?null:+n+""===n?+n:H.test(n)?JSON.parse(n):n}catch(i){}L.set(e,t,n)}else n=undefined;return n}x.extend({queue:function(e,t,n){var r;return e?(t=(t||"fx")+"queue",r=q.get(e,t),n&&(!r||x.isArray(n)?r=q.access(e,t,x.makeArray(n)):r.push(n)),r||[]):undefined},dequeue:function(e,t){t=t||"fx";var n=x.queue(e,t),r=n.length,i=n.shift(),o=x._queueHooks(e,t),s=function(){x.dequeue(e,t)};"inprogress"===i&&(i=n.shift(),r--),o.cur=i,i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,s,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return q.get(e,n)||q.access(e,n,{empty:x.Callbacks("once memory").add(function(){q.remove(e,[t+"queue",n])})})}}),x.fn.extend({queue:function(e,t){var n=2;return"string"!=typeof e&&(t=e,e="fx",n--),n>arguments.length?x.queue(this[0],e):t===undefined?this:this.each(function(){var n=x.queue(this,e,t);
x._queueHooks(this,e),"fx"===e&&"inprogress"!==n[0]&&x.dequeue(this,e)})},dequeue:function(e){return this.each(function(){x.dequeue(this,e)})},delay:function(e,t){return e=x.fx?x.fx.speeds[e]||e:e,t=t||"fx",this.queue(t,function(t,n){var r=setTimeout(t,e);n.stop=function(){clearTimeout(r)}})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){var n,r=1,i=x.Deferred(),o=this,s=this.length,a=function(){--r||i.resolveWith(o,[o])};"string"!=typeof e&&(t=e,e=undefined),e=e||"fx";while(s--)n=q.get(o[s],e+"queueHooks"),n&&n.empty&&(r++,n.empty.add(a));return a(),i.promise(t)}});var R,M,W=/[\t\r\n]/g,$=/\r/g,B=/^(?:input|select|textarea|button)$/i;x.fn.extend({attr:function(e,t){return x.access(this,x.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){x.removeAttr(this,e)})},prop:function(e,t){return x.access(this,x.prop,e,t,arguments.length>1)},removeProp:function(e){return this.each(function(){delete this[x.propFix[e]||e]})},addClass:function(e){var t,n,r,i,o,s=0,a=this.length,u="string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).addClass(e.call(this,t,this.className))});if(u)for(t=(e||"").match(w)||[];a>s;s++)if(n=this[s],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(W," "):" ")){o=0;while(i=t[o++])0>r.indexOf(" "+i+" ")&&(r+=i+" ");n.className=x.trim(r)}return this},removeClass:function(e){var t,n,r,i,o,s=0,a=this.length,u=0===arguments.length||"string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).removeClass(e.call(this,t,this.className))});if(u)for(t=(e||"").match(w)||[];a>s;s++)if(n=this[s],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(W," "):"")){o=0;while(i=t[o++])while(r.indexOf(" "+i+" ")>=0)r=r.replace(" "+i+" "," ");n.className=e?x.trim(r):""}return this},toggleClass:function(e,t){var n=typeof e,i="boolean"==typeof t;return x.isFunction(e)?this.each(function(n){x(this).toggleClass(e.call(this,n,this.className,t),t)}):this.each(function(){if("string"===n){var o,s=0,a=x(this),u=t,l=e.match(w)||[];while(o=l[s++])u=i?u:!a.hasClass(o),a[u?"addClass":"removeClass"](o)}else(n===r||"boolean"===n)&&(this.className&&q.set(this,"__className__",this.className),this.className=this.className||e===!1?"":q.get(this,"__className__")||"")})},hasClass:function(e){var t=" "+e+" ",n=0,r=this.length;for(;r>n;n++)if(1===this[n].nodeType&&(" "+this[n].className+" ").replace(W," ").indexOf(t)>=0)return!0;return!1},val:function(e){var t,n,r,i=this[0];{if(arguments.length)return r=x.isFunction(e),this.each(function(n){var i,o=x(this);1===this.nodeType&&(i=r?e.call(this,n,o.val()):e,null==i?i="":"number"==typeof i?i+="":x.isArray(i)&&(i=x.map(i,function(e){return null==e?"":e+""})),t=x.valHooks[this.type]||x.valHooks[this.nodeName.toLowerCase()],t&&"set"in t&&t.set(this,i,"value")!==undefined||(this.value=i))});if(i)return t=x.valHooks[i.type]||x.valHooks[i.nodeName.toLowerCase()],t&&"get"in t&&(n=t.get(i,"value"))!==undefined?n:(n=i.value,"string"==typeof n?n.replace($,""):null==n?"":n)}}}),x.extend({valHooks:{option:{get:function(e){var t=e.attributes.value;return!t||t.specified?e.value:e.text}},select:{get:function(e){var t,n,r=e.options,i=e.selectedIndex,o="select-one"===e.type||0>i,s=o?null:[],a=o?i+1:r.length,u=0>i?a:o?i:0;for(;a>u;u++)if(n=r[u],!(!n.selected&&u!==i||(x.support.optDisabled?n.disabled:null!==n.getAttribute("disabled"))||n.parentNode.disabled&&x.nodeName(n.parentNode,"optgroup"))){if(t=x(n).val(),o)return t;s.push(t)}return s},set:function(e,t){var n,r,i=e.options,o=x.makeArray(t),s=i.length;while(s--)r=i[s],(r.selected=x.inArray(x(r).val(),o)>=0)&&(n=!0);return n||(e.selectedIndex=-1),o}}},attr:function(e,t,n){var i,o,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return typeof e.getAttribute===r?x.prop(e,t,n):(1===s&&x.isXMLDoc(e)||(t=t.toLowerCase(),i=x.attrHooks[t]||(x.expr.match.boolean.test(t)?M:R)),n===undefined?i&&"get"in i&&null!==(o=i.get(e,t))?o:(o=x.find.attr(e,t),null==o?undefined:o):null!==n?i&&"set"in i&&(o=i.set(e,n,t))!==undefined?o:(e.setAttribute(t,n+""),n):(x.removeAttr(e,t),undefined))},removeAttr:function(e,t){var n,r,i=0,o=t&&t.match(w);if(o&&1===e.nodeType)while(n=o[i++])r=x.propFix[n]||n,x.expr.match.boolean.test(n)&&(e[r]=!1),e.removeAttribute(n)},attrHooks:{type:{set:function(e,t){if(!x.support.radioValue&&"radio"===t&&x.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},propFix:{"for":"htmlFor","class":"className"},prop:function(e,t,n){var r,i,o,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return o=1!==s||!x.isXMLDoc(e),o&&(t=x.propFix[t]||t,i=x.propHooks[t]),n!==undefined?i&&"set"in i&&(r=i.set(e,n,t))!==undefined?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){return e.hasAttribute("tabindex")||B.test(e.nodeName)||e.href?e.tabIndex:-1}}}}),M={set:function(e,t,n){return t===!1?x.removeAttr(e,n):e.setAttribute(n,n),n}},x.each(x.expr.match.boolean.source.match(/\w+/g),function(e,t){var n=x.expr.attrHandle[t]||x.find.attr;x.expr.attrHandle[t]=function(e,t,r){var i=x.expr.attrHandle[t],o=r?undefined:(x.expr.attrHandle[t]=undefined)!=n(e,t,r)?t.toLowerCase():null;return x.expr.attrHandle[t]=i,o}}),x.support.optSelected||(x.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null}}),x.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){x.propFix[this.toLowerCase()]=this}),x.each(["radio","checkbox"],function(){x.valHooks[this]={set:function(e,t){return x.isArray(t)?e.checked=x.inArray(x(e).val(),t)>=0:undefined}},x.support.checkOn||(x.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})});var I=/^key/,z=/^(?:mouse|contextmenu)|click/,_=/^(?:focusinfocus|focusoutblur)$/,X=/^([^.]*)(?:\.(.+)|)$/;function U(){return!0}function Y(){return!1}function V(){try{return o.activeElement}catch(e){}}x.event={global:{},add:function(e,t,n,i,o){var s,a,u,l,c,f,p,h,d,g,m,y=q.get(e);if(y){n.handler&&(s=n,n=s.handler,o=s.selector),n.guid||(n.guid=x.guid++),(l=y.events)||(l=y.events={}),(a=y.handle)||(a=y.handle=function(e){return typeof x===r||e&&x.event.triggered===e.type?undefined:x.event.dispatch.apply(a.elem,arguments)},a.elem=e),t=(t||"").match(w)||[""],c=t.length;while(c--)u=X.exec(t[c])||[],d=m=u[1],g=(u[2]||"").split(".").sort(),d&&(p=x.event.special[d]||{},d=(o?p.delegateType:p.bindType)||d,p=x.event.special[d]||{},f=x.extend({type:d,origType:m,data:i,handler:n,guid:n.guid,selector:o,needsContext:o&&x.expr.match.needsContext.test(o),namespace:g.join(".")},s),(h=l[d])||(h=l[d]=[],h.delegateCount=0,p.setup&&p.setup.call(e,i,g,a)!==!1||e.addEventListener&&e.addEventListener(d,a,!1)),p.add&&(p.add.call(e,f),f.handler.guid||(f.handler.guid=n.guid)),o?h.splice(h.delegateCount++,0,f):h.push(f),x.event.global[d]=!0);e=null}},remove:function(e,t,n,r,i){var o,s,a,u,l,c,f,p,h,d,g,m=q.hasData(e)&&q.get(e);if(m&&(u=m.events)){t=(t||"").match(w)||[""],l=t.length;while(l--)if(a=X.exec(t[l])||[],h=g=a[1],d=(a[2]||"").split(".").sort(),h){f=x.event.special[h]||{},h=(r?f.delegateType:f.bindType)||h,p=u[h]||[],a=a[2]&&RegExp("(^|\\.)"+d.join("\\.(?:.*\\.|)")+"(\\.|$)"),s=o=p.length;while(o--)c=p[o],!i&&g!==c.origType||n&&n.guid!==c.guid||a&&!a.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(p.splice(o,1),c.selector&&p.delegateCount--,f.remove&&f.remove.call(e,c));s&&!p.length&&(f.teardown&&f.teardown.call(e,d,m.handle)!==!1||x.removeEvent(e,h,m.handle),delete u[h])}else for(h in u)x.event.remove(e,h+t[l],n,r,!0);x.isEmptyObject(u)&&(delete m.handle,q.remove(e,"events"))}},trigger:function(t,n,r,i){var s,a,u,l,c,f,p,h=[r||o],d=y.call(t,"type")?t.type:t,g=y.call(t,"namespace")?t.namespace.split("."):[];if(a=u=r=r||o,3!==r.nodeType&&8!==r.nodeType&&!_.test(d+x.event.triggered)&&(d.indexOf(".")>=0&&(g=d.split("."),d=g.shift(),g.sort()),c=0>d.indexOf(":")&&"on"+d,t=t[x.expando]?t:new x.Event(d,"object"==typeof t&&t),t.isTrigger=i?2:3,t.namespace=g.join("."),t.namespace_re=t.namespace?RegExp("(^|\\.)"+g.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,t.result=undefined,t.target||(t.target=r),n=null==n?[t]:x.makeArray(n,[t]),p=x.event.special[d]||{},i||!p.trigger||p.trigger.apply(r,n)!==!1)){if(!i&&!p.noBubble&&!x.isWindow(r)){for(l=p.delegateType||d,_.test(l+d)||(a=a.parentNode);a;a=a.parentNode)h.push(a),u=a;u===(r.ownerDocument||o)&&h.push(u.defaultView||u.parentWindow||e)}s=0;while((a=h[s++])&&!t.isPropagationStopped())t.type=s>1?l:p.bindType||d,f=(q.get(a,"events")||{})[t.type]&&q.get(a,"handle"),f&&f.apply(a,n),f=c&&a[c],f&&x.acceptData(a)&&f.apply&&f.apply(a,n)===!1&&t.preventDefault();return t.type=d,i||t.isDefaultPrevented()||p._default&&p._default.apply(h.pop(),n)!==!1||!x.acceptData(r)||c&&x.isFunction(r[d])&&!x.isWindow(r)&&(u=r[c],u&&(r[c]=null),x.event.triggered=d,r[d](),x.event.triggered=undefined,u&&(r[c]=u)),t.result}},dispatch:function(e){e=x.event.fix(e);var t,n,r,i,o,s=[],a=d.call(arguments),u=(q.get(this,"events")||{})[e.type]||[],l=x.event.special[e.type]||{};if(a[0]=e,e.delegateTarget=this,!l.preDispatch||l.preDispatch.call(this,e)!==!1){s=x.event.handlers.call(this,e,u),t=0;while((i=s[t++])&&!e.isPropagationStopped()){e.currentTarget=i.elem,n=0;while((o=i.handlers[n++])&&!e.isImmediatePropagationStopped())(!e.namespace_re||e.namespace_re.test(o.namespace))&&(e.handleObj=o,e.data=o.data,r=((x.event.special[o.origType]||{}).handle||o.handler).apply(i.elem,a),r!==undefined&&(e.result=r)===!1&&(e.preventDefault(),e.stopPropagation()))}return l.postDispatch&&l.postDispatch.call(this,e),e.result}},handlers:function(e,t){var n,r,i,o,s=[],a=t.delegateCount,u=e.target;if(a&&u.nodeType&&(!e.button||"click"!==e.type))for(;u!==this;u=u.parentNode||this)if(u.disabled!==!0||"click"!==e.type){for(r=[],n=0;a>n;n++)o=t[n],i=o.selector+" ",r[i]===undefined&&(r[i]=o.needsContext?x(i,this).index(u)>=0:x.find(i,this,null,[u]).length),r[i]&&r.push(o);r.length&&s.push({elem:u,handlers:r})}return t.length>a&&s.push({elem:this,handlers:t.slice(a)}),s},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return null==e.which&&(e.which=null!=t.charCode?t.charCode:t.keyCode),e}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,t){var n,r,i,s=t.button;return null==e.pageX&&null!=t.clientX&&(n=e.target.ownerDocument||o,r=n.documentElement,i=n.body,e.pageX=t.clientX+(r&&r.scrollLeft||i&&i.scrollLeft||0)-(r&&r.clientLeft||i&&i.clientLeft||0),e.pageY=t.clientY+(r&&r.scrollTop||i&&i.scrollTop||0)-(r&&r.clientTop||i&&i.clientTop||0)),e.which||s===undefined||(e.which=1&s?1:2&s?3:4&s?2:0),e}},fix:function(e){if(e[x.expando])return e;var t,n,r,i=e.type,o=e,s=this.fixHooks[i];s||(this.fixHooks[i]=s=z.test(i)?this.mouseHooks:I.test(i)?this.keyHooks:{}),r=s.props?this.props.concat(s.props):this.props,e=new x.Event(o),t=r.length;while(t--)n=r[t],e[n]=o[n];return 3===e.target.nodeType&&(e.target=e.target.parentNode),s.filter?s.filter(e,o):e},special:{load:{noBubble:!0},focus:{trigger:function(){return this!==V()&&this.focus?(this.focus(),!1):undefined},delegateType:"focusin"},blur:{trigger:function(){return this===V()&&this.blur?(this.blur(),!1):undefined},delegateType:"focusout"},click:{trigger:function(){return"checkbox"===this.type&&this.click&&x.nodeName(this,"input")?(this.click(),!1):undefined},_default:function(e){return x.nodeName(e.target,"a")}},beforeunload:{postDispatch:function(e){e.result!==undefined&&(e.originalEvent.returnValue=e.result)}}},simulate:function(e,t,n,r){var i=x.extend(new x.Event,n,{type:e,isSimulated:!0,originalEvent:{}});r?x.event.trigger(i,null,t):x.event.dispatch.call(t,i),i.isDefaultPrevented()&&n.preventDefault()}},x.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n,!1)},x.Event=function(e,t){return this instanceof x.Event?(e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||e.getPreventDefault&&e.getPreventDefault()?U:Y):this.type=e,t&&x.extend(this,t),this.timeStamp=e&&e.timeStamp||x.now(),this[x.expando]=!0,undefined):new x.Event(e,t)},x.Event.prototype={isDefaultPrevented:Y,isPropagationStopped:Y,isImmediatePropagationStopped:Y,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=U,e&&e.preventDefault&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=U,e&&e.stopPropagation&&e.stopPropagation()},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=U,this.stopPropagation()}},x.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(e,t){x.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return(!i||i!==r&&!x.contains(r,i))&&(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),x.support.focusinBubbles||x.each({focus:"focusin",blur:"focusout"},function(e,t){var n=0,r=function(e){x.event.simulate(t,e.target,x.event.fix(e),!0)};x.event.special[t]={setup:function(){0===n++&&o.addEventListener(e,r,!0)},teardown:function(){0===--n&&o.removeEventListener(e,r,!0)}}}),x.fn.extend({on:function(e,t,n,r,i){var o,s;if("object"==typeof e){"string"!=typeof t&&(n=n||t,t=undefined);for(s in e)this.on(s,t,n,e[s],i);return this}if(null==n&&null==r?(r=t,n=t=undefined):null==r&&("string"==typeof t?(r=n,n=undefined):(r=n,n=t,t=undefined)),r===!1)r=Y;else if(!r)return this;return 1===i&&(o=r,r=function(e){return x().off(e),o.apply(this,arguments)},r.guid=o.guid||(o.guid=x.guid++)),this.each(function(){x.event.add(this,e,r,n,t)})},one:function(e,t,n,r){return this.on(e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)return r=e.handleObj,x(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;if("object"==typeof e){for(i in e)this.off(i,t,e[i]);return this}return(t===!1||"function"==typeof t)&&(n=t,t=undefined),n===!1&&(n=Y),this.each(function(){x.event.remove(this,e,n,t)})},trigger:function(e,t){return this.each(function(){x.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];return n?x.event.trigger(e,t,n,!0):undefined}});var G=/^.[^:#\[\.,]*$/,J=x.expr.match.needsContext,Q={children:!0,contents:!0,next:!0,prev:!0};x.fn.extend({find:function(e){var t,n,r,i=this.length;if("string"!=typeof e)return t=this,this.pushStack(x(e).filter(function(){for(r=0;i>r;r++)if(x.contains(t[r],this))return!0}));for(n=[],r=0;i>r;r++)x.find(e,this[r],n);return n=this.pushStack(i>1?x.unique(n):n),n.selector=(this.selector?this.selector+" ":"")+e,n},has:function(e){var t=x(e,this),n=t.length;return this.filter(function(){var e=0;for(;n>e;e++)if(x.contains(this,t[e]))return!0})},not:function(e){return this.pushStack(Z(this,e||[],!0))},filter:function(e){return this.pushStack(Z(this,e||[],!1))},is:function(e){return!!e&&("string"==typeof e?J.test(e)?x(e,this.context).index(this[0])>=0:x.filter(e,this).length>0:this.filter(e).length>0)},closest:function(e,t){var n,r=0,i=this.length,o=[],s=J.test(e)||"string"!=typeof e?x(e,t||this.context):0;for(;i>r;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(11>n.nodeType&&(s?s.index(n)>-1:1===n.nodeType&&x.find.matchesSelector(n,e))){n=o.push(n);break}return this.pushStack(o.length>1?x.unique(o):o)},index:function(e){return e?"string"==typeof e?g.call(x(e),this[0]):g.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){var n="string"==typeof e?x(e,t):x.makeArray(e&&e.nodeType?[e]:e),r=x.merge(this.get(),n);return this.pushStack(x.unique(r))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}});function K(e,t){while((e=e[t])&&1!==e.nodeType);return e}x.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return x.dir(e,"parentNode")},parentsUntil:function(e,t,n){return x.dir(e,"parentNode",n)},next:function(e){return K(e,"nextSibling")},prev:function(e){return K(e,"previousSibling")},nextAll:function(e){return x.dir(e,"nextSibling")},prevAll:function(e){return x.dir(e,"previousSibling")},nextUntil:function(e,t,n){return x.dir(e,"nextSibling",n)},prevUntil:function(e,t,n){return x.dir(e,"previousSibling",n)},siblings:function(e){return x.sibling((e.parentNode||{}).firstChild,e)},children:function(e){return x.sibling(e.firstChild)},contents:function(e){return x.nodeName(e,"iframe")?e.contentDocument||e.contentWindow.document:x.merge([],e.childNodes)}},function(e,t){x.fn[e]=function(n,r){var i=x.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=x.filter(r,i)),this.length>1&&(Q[e]||x.unique(i),"p"===e[0]&&i.reverse()),this.pushStack(i)}}),x.extend({filter:function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?x.find.matchesSelector(r,e)?[r]:[]:x.find.matches(e,x.grep(t,function(e){return 1===e.nodeType}))},dir:function(e,t,n){var r=[],i=n!==undefined;while((e=e[t])&&9!==e.nodeType)if(1===e.nodeType){if(i&&x(e).is(n))break;r.push(e)}return r},sibling:function(e,t){var n=[];for(;e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n}});function Z(e,t,n){if(x.isFunction(t))return x.grep(e,function(e,r){return!!t.call(e,r,e)!==n});if(t.nodeType)return x.grep(e,function(e){return e===t!==n});if("string"==typeof t){if(G.test(t))return x.filter(t,e,n);t=x.filter(t,e)}return x.grep(e,function(e){return g.call(t,e)>=0!==n})}var et=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,tt=/<([\w:]+)/,nt=/<|&#?\w+;/,rt=/<(?:script|style|link)/i,it=/^(?:checkbox|radio)$/i,ot=/checked\s*(?:[^=]|=\s*.checked.)/i,st=/^$|\/(?:java|ecma)script/i,at=/^true\/(.*)/,ut=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,lt={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};lt.optgroup=lt.option,lt.tbody=lt.tfoot=lt.colgroup=lt.caption=lt.col=lt.thead,lt.th=lt.td,x.fn.extend({text:function(e){return x.access(this,function(e){return e===undefined?x.text(this):this.empty().append((this[0]&&this[0].ownerDocument||o).createTextNode(e))},null,e,arguments.length)},append:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=ct(this,e);t.appendChild(e)}})},prepend:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=ct(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},remove:function(e,t){var n,r=e?x.filter(e,this):this,i=0;for(;null!=(n=r[i]);i++)t||1!==n.nodeType||x.cleanData(gt(n)),n.parentNode&&(t&&x.contains(n.ownerDocument,n)&&ht(gt(n,"script")),n.parentNode.removeChild(n));return this},empty:function(){var e,t=0;for(;null!=(e=this[t]);t++)1===e.nodeType&&(x.cleanData(gt(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null==e?!1:e,t=null==t?e:t,this.map(function(){return x.clone(this,e,t)})},html:function(e){return x.access(this,function(e){var t=this[0]||{},n=0,r=this.length;if(e===undefined&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!rt.test(e)&&!lt[(tt.exec(e)||["",""])[1].toLowerCase()]){e=e.replace(et,"<$1></$2>");try{for(;r>n;n++)t=this[n]||{},1===t.nodeType&&(x.cleanData(gt(t,!1)),t.innerHTML=e);t=0}catch(i){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=x.map(this,function(e){return[e.nextSibling,e.parentNode]}),t=0;return this.domManip(arguments,function(n){var r=e[t++],i=e[t++];i&&(x(this).remove(),i.insertBefore(n,r))},!0),t?this:this.remove()},detach:function(e){return this.remove(e,!0)},domManip:function(e,t,n){e=p.apply([],e);var r,i,o,s,a,u,l=0,c=this.length,f=this,h=c-1,d=e[0],g=x.isFunction(d);if(g||!(1>=c||"string"!=typeof d||x.support.checkClone)&&ot.test(d))return this.each(function(r){var i=f.eq(r);g&&(e[0]=d.call(this,r,i.html())),i.domManip(e,t,n)});if(c&&(r=x.buildFragment(e,this[0].ownerDocument,!1,!n&&this),i=r.firstChild,1===r.childNodes.length&&(r=i),i)){for(o=x.map(gt(r,"script"),ft),s=o.length;c>l;l++)a=r,l!==h&&(a=x.clone(a,!0,!0),s&&x.merge(o,gt(a,"script"))),t.call(this[l],a,l);if(s)for(u=o[o.length-1].ownerDocument,x.map(o,pt),l=0;s>l;l++)a=o[l],st.test(a.type||"")&&!q.access(a,"globalEval")&&x.contains(u,a)&&(a.src?x._evalUrl(a.src):x.globalEval(a.textContent.replace(ut,"")))}return this}}),x.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){x.fn[e]=function(e){var n,r=[],i=x(e),o=i.length-1,s=0;for(;o>=s;s++)n=s===o?this:this.clone(!0),x(i[s])[t](n),h.apply(r,n.get());return this.pushStack(r)}}),x.extend({clone:function(e,t,n){var r,i,o,s,a=e.cloneNode(!0),u=x.contains(e.ownerDocument,e);if(!(x.support.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||x.isXMLDoc(e)))for(s=gt(a),o=gt(e),r=0,i=o.length;i>r;r++)mt(o[r],s[r]);if(t)if(n)for(o=o||gt(e),s=s||gt(a),r=0,i=o.length;i>r;r++)dt(o[r],s[r]);else dt(e,a);return s=gt(a,"script"),s.length>0&&ht(s,!u&&gt(e,"script")),a},buildFragment:function(e,t,n,r){var i,o,s,a,u,l,c=0,f=e.length,p=t.createDocumentFragment(),h=[];for(;f>c;c++)if(i=e[c],i||0===i)if("object"===x.type(i))x.merge(h,i.nodeType?[i]:i);else if(nt.test(i)){o=o||p.appendChild(t.createElement("div")),s=(tt.exec(i)||["",""])[1].toLowerCase(),a=lt[s]||lt._default,o.innerHTML=a[1]+i.replace(et,"<$1></$2>")+a[2],l=a[0];while(l--)o=o.firstChild;x.merge(h,o.childNodes),o=p.firstChild,o.textContent=""}else h.push(t.createTextNode(i));p.textContent="",c=0;while(i=h[c++])if((!r||-1===x.inArray(i,r))&&(u=x.contains(i.ownerDocument,i),o=gt(p.appendChild(i),"script"),u&&ht(o),n)){l=0;while(i=o[l++])st.test(i.type||"")&&n.push(i)}return p},cleanData:function(e){var t,n,r,i=e.length,o=0,s=x.event.special;for(;i>o;o++){if(n=e[o],x.acceptData(n)&&(t=q.access(n)))for(r in t.events)s[r]?x.event.remove(n,r):x.removeEvent(n,r,t.handle);L.discard(n),q.discard(n)}},_evalUrl:function(e){return x.ajax({url:e,type:"GET",dataType:"text",async:!1,global:!1,success:x.globalEval})}});function ct(e,t){return x.nodeName(e,"table")&&x.nodeName(1===t.nodeType?t:t.firstChild,"tr")?e.getElementsByTagName("tbody")[0]||e.appendChild(e.ownerDocument.createElement("tbody")):e}function ft(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function pt(e){var t=at.exec(e.type);return t?e.type=t[1]:e.removeAttribute("type"),e}function ht(e,t){var n=e.length,r=0;for(;n>r;r++)q.set(e[r],"globalEval",!t||q.get(t[r],"globalEval"))}function dt(e,t){var n,r,i,o,s,a,u,l;if(1===t.nodeType){if(q.hasData(e)&&(o=q.access(e),s=x.extend({},o),l=o.events,q.set(t,s),l)){delete s.handle,s.events={};for(i in l)for(n=0,r=l[i].length;r>n;n++)x.event.add(t,i,l[i][n])}L.hasData(e)&&(a=L.access(e),u=x.extend({},a),L.set(t,u))}}function gt(e,t){var n=e.getElementsByTagName?e.getElementsByTagName(t||"*"):e.querySelectorAll?e.querySelectorAll(t||"*"):[];return t===undefined||t&&x.nodeName(e,t)?x.merge([e],n):n}function mt(e,t){var n=t.nodeName.toLowerCase();"input"===n&&it.test(e.type)?t.checked=e.checked:("input"===n||"textarea"===n)&&(t.defaultValue=e.defaultValue)}x.fn.extend({wrapAll:function(e){var t;return x.isFunction(e)?this.each(function(t){x(this).wrapAll(e.call(this,t))}):(this[0]&&(t=x(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstElementChild)e=e.firstElementChild;return e}).append(this)),this)},wrapInner:function(e){return x.isFunction(e)?this.each(function(t){x(this).wrapInner(e.call(this,t))}):this.each(function(){var t=x(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=x.isFunction(e);return this.each(function(n){x(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(){return this.parent().each(function(){x.nodeName(this,"body")||x(this).replaceWith(this.childNodes)}).end()}});var yt,vt,xt=/^(none|table(?!-c[ea]).+)/,bt=/^margin/,wt=RegExp("^("+b+")(.*)$","i"),Tt=RegExp("^("+b+")(?!px)[a-z%]+$","i"),Ct=RegExp("^([+-])=("+b+")","i"),kt={BODY:"block"},Nt={position:"absolute",visibility:"hidden",display:"block"},Et={letterSpacing:0,fontWeight:400},St=["Top","Right","Bottom","Left"],jt=["Webkit","O","Moz","ms"];function Dt(e,t){if(t in e)return t;var n=t.charAt(0).toUpperCase()+t.slice(1),r=t,i=jt.length;while(i--)if(t=jt[i]+n,t in e)return t;return r}function At(e,t){return e=t||e,"none"===x.css(e,"display")||!x.contains(e.ownerDocument,e)}function Lt(t){return e.getComputedStyle(t,null)}function qt(e,t){var n,r,i,o=[],s=0,a=e.length;for(;a>s;s++)r=e[s],r.style&&(o[s]=q.get(r,"olddisplay"),n=r.style.display,t?(o[s]||"none"!==n||(r.style.display=""),""===r.style.display&&At(r)&&(o[s]=q.access(r,"olddisplay",Pt(r.nodeName)))):o[s]||(i=At(r),(n&&"none"!==n||!i)&&q.set(r,"olddisplay",i?n:x.css(r,"display"))));for(s=0;a>s;s++)r=e[s],r.style&&(t&&"none"!==r.style.display&&""!==r.style.display||(r.style.display=t?o[s]||"":"none"));return e}x.fn.extend({css:function(e,t){return x.access(this,function(e,t,n){var r,i,o={},s=0;if(x.isArray(t)){for(r=Lt(e),i=t.length;i>s;s++)o[t[s]]=x.css(e,t[s],!1,r);return o}return n!==undefined?x.style(e,t,n):x.css(e,t)},e,t,arguments.length>1)},show:function(){return qt(this,!0)},hide:function(){return qt(this)},toggle:function(e){var t="boolean"==typeof e;return this.each(function(){(t?e:At(this))?x(this).show():x(this).hide()})}}),x.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=yt(e,"opacity");return""===n?"1":n}}}},cssNumber:{columnCount:!0,fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,s,a=x.camelCase(t),u=e.style;return t=x.cssProps[a]||(x.cssProps[a]=Dt(u,a)),s=x.cssHooks[t]||x.cssHooks[a],n===undefined?s&&"get"in s&&(i=s.get(e,!1,r))!==undefined?i:u[t]:(o=typeof n,"string"===o&&(i=Ct.exec(n))&&(n=(i[1]+1)*i[2]+parseFloat(x.css(e,t)),o="number"),null==n||"number"===o&&isNaN(n)||("number"!==o||x.cssNumber[a]||(n+="px"),x.support.clearCloneStyle||""!==n||0!==t.indexOf("background")||(u[t]="inherit"),s&&"set"in s&&(n=s.set(e,n,r))===undefined||(u[t]=n)),undefined)}},css:function(e,t,n,r){var i,o,s,a=x.camelCase(t);return t=x.cssProps[a]||(x.cssProps[a]=Dt(e.style,a)),s=x.cssHooks[t]||x.cssHooks[a],s&&"get"in s&&(i=s.get(e,!0,n)),i===undefined&&(i=yt(e,t,r)),"normal"===i&&t in Et&&(i=Et[t]),""===n||n?(o=parseFloat(i),n===!0||x.isNumeric(o)?o||0:i):i}}),yt=function(e,t,n){var r,i,o,s=n||Lt(e),a=s?s.getPropertyValue(t)||s[t]:undefined,u=e.style;return s&&(""!==a||x.contains(e.ownerDocument,e)||(a=x.style(e,t)),Tt.test(a)&&bt.test(t)&&(r=u.width,i=u.minWidth,o=u.maxWidth,u.minWidth=u.maxWidth=u.width=a,a=s.width,u.width=r,u.minWidth=i,u.maxWidth=o)),a};function Ht(e,t,n){var r=wt.exec(t);return r?Math.max(0,r[1]-(n||0))+(r[2]||"px"):t}function Ot(e,t,n,r,i){var o=n===(r?"border":"content")?4:"width"===t?1:0,s=0;for(;4>o;o+=2)"margin"===n&&(s+=x.css(e,n+St[o],!0,i)),r?("content"===n&&(s-=x.css(e,"padding"+St[o],!0,i)),"margin"!==n&&(s-=x.css(e,"border"+St[o]+"Width",!0,i))):(s+=x.css(e,"padding"+St[o],!0,i),"padding"!==n&&(s+=x.css(e,"border"+St[o]+"Width",!0,i)));return s}function Ft(e,t,n){var r=!0,i="width"===t?e.offsetWidth:e.offsetHeight,o=Lt(e),s=x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,o);if(0>=i||null==i){if(i=yt(e,t,o),(0>i||null==i)&&(i=e.style[t]),Tt.test(i))return i;r=s&&(x.support.boxSizingReliable||i===e.style[t]),i=parseFloat(i)||0}return i+Ot(e,t,n||(s?"border":"content"),r,o)+"px"}function Pt(e){var t=o,n=kt[e];return n||(n=Rt(e,t),"none"!==n&&n||(vt=(vt||x("<iframe frameborder='0' width='0' height='0'/>").css("cssText","display:block !important")).appendTo(t.documentElement),t=(vt[0].contentWindow||vt[0].contentDocument).document,t.write("<!doctype html><html><body>"),t.close(),n=Rt(e,t),vt.detach()),kt[e]=n),n}function Rt(e,t){var n=x(t.createElement(e)).appendTo(t.body),r=x.css(n[0],"display");return n.remove(),r}x.each(["height","width"],function(e,t){x.cssHooks[t]={get:function(e,n,r){return n?0===e.offsetWidth&&xt.test(x.css(e,"display"))?x.swap(e,Nt,function(){return Ft(e,t,r)}):Ft(e,t,r):undefined},set:function(e,n,r){var i=r&&Lt(e);return Ht(e,n,r?Ot(e,t,r,x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,i),i):0)}}}),x(function(){x.support.reliableMarginRight||(x.cssHooks.marginRight={get:function(e,t){return t?x.swap(e,{display:"inline-block"},yt,[e,"marginRight"]):undefined}}),!x.support.pixelPosition&&x.fn.position&&x.each(["top","left"],function(e,t){x.cssHooks[t]={get:function(e,n){return n?(n=yt(e,t),Tt.test(n)?x(e).position()[t]+"px":n):undefined}}})}),x.expr&&x.expr.filters&&(x.expr.filters.hidden=function(e){return 0>=e.offsetWidth&&0>=e.offsetHeight},x.expr.filters.visible=function(e){return!x.expr.filters.hidden(e)}),x.each({margin:"",padding:"",border:"Width"},function(e,t){x.cssHooks[e+t]={expand:function(n){var r=0,i={},o="string"==typeof n?n.split(" "):[n];for(;4>r;r++)i[e+St[r]+t]=o[r]||o[r-2]||o[0];return i}},bt.test(e)||(x.cssHooks[e+t].set=Ht)});var Mt=/%20/g,Wt=/\[\]$/,$t=/\r?\n/g,Bt=/^(?:submit|button|image|reset|file)$/i,It=/^(?:input|select|textarea|keygen)/i;x.fn.extend({serialize:function(){return x.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=x.prop(this,"elements");return e?x.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!x(this).is(":disabled")&&It.test(this.nodeName)&&!Bt.test(e)&&(this.checked||!it.test(e))}).map(function(e,t){var n=x(this).val();return null==n?null:x.isArray(n)?x.map(n,function(e){return{name:t.name,value:e.replace($t,"\r\n")}}):{name:t.name,value:n.replace($t,"\r\n")}}).get()}}),x.param=function(e,t){var n,r=[],i=function(e,t){t=x.isFunction(t)?t():null==t?"":t,r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(t)};if(t===undefined&&(t=x.ajaxSettings&&x.ajaxSettings.traditional),x.isArray(e)||e.jquery&&!x.isPlainObject(e))x.each(e,function(){i(this.name,this.value)});else for(n in e)zt(n,e[n],t,i);return r.join("&").replace(Mt,"+")};function zt(e,t,n,r){var i;if(x.isArray(t))x.each(t,function(t,i){n||Wt.test(e)?r(e,i):zt(e+"["+("object"==typeof i?t:"")+"]",i,n,r)});else if(n||"object"!==x.type(t))r(e,t);else for(i in t)zt(e+"["+i+"]",t[i],n,r)}x.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){x.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),x.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)},bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)}});var _t,Xt,Ut=x.now(),Yt=/\?/,Vt=/#.*$/,Gt=/([?&])_=[^&]*/,Jt=/^(.*?):[ \t]*([^\r\n]*)$/gm,Qt=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Kt=/^(?:GET|HEAD)$/,Zt=/^\/\//,en=/^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,tn=x.fn.load,nn={},rn={},on="*/".concat("*");try{Xt=i.href}catch(sn){Xt=o.createElement("a"),Xt.href="",Xt=Xt.href}_t=en.exec(Xt.toLowerCase())||[];function an(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(w)||[];
if(x.isFunction(n))while(r=o[i++])"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function un(e,t,n,r){var i={},o=e===rn;function s(a){var u;return i[a]=!0,x.each(e[a]||[],function(e,a){var l=a(t,n,r);return"string"!=typeof l||o||i[l]?o?!(u=l):undefined:(t.dataTypes.unshift(l),s(l),!1)}),u}return s(t.dataTypes[0])||!i["*"]&&s("*")}function ln(e,t){var n,r,i=x.ajaxSettings.flatOptions||{};for(n in t)t[n]!==undefined&&((i[n]?e:r||(r={}))[n]=t[n]);return r&&x.extend(!0,e,r),e}x.fn.load=function(e,t,n){if("string"!=typeof e&&tn)return tn.apply(this,arguments);var r,i,o,s=this,a=e.indexOf(" ");return a>=0&&(r=e.slice(a),e=e.slice(0,a)),x.isFunction(t)?(n=t,t=undefined):t&&"object"==typeof t&&(i="POST"),s.length>0&&x.ajax({url:e,type:i,dataType:"html",data:t}).done(function(e){o=arguments,s.html(r?x("<div>").append(x.parseHTML(e)).find(r):e)}).complete(n&&function(e,t){s.each(n,o||[e.responseText,t,e])}),this},x.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){x.fn[t]=function(e){return this.on(t,e)}}),x.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:Xt,type:"GET",isLocal:Qt.test(_t[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":on,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":x.parseJSON,"text xml":x.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?ln(ln(e,x.ajaxSettings),t):ln(x.ajaxSettings,e)},ajaxPrefilter:an(nn),ajaxTransport:an(rn),ajax:function(e,t){"object"==typeof e&&(t=e,e=undefined),t=t||{};var n,r,i,o,s,a,u,l,c=x.ajaxSetup({},t),f=c.context||c,p=c.context&&(f.nodeType||f.jquery)?x(f):x.event,h=x.Deferred(),d=x.Callbacks("once memory"),g=c.statusCode||{},m={},y={},v=0,b="canceled",T={readyState:0,getResponseHeader:function(e){var t;if(2===v){if(!o){o={};while(t=Jt.exec(i))o[t[1].toLowerCase()]=t[2]}t=o[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return 2===v?i:null},setRequestHeader:function(e,t){var n=e.toLowerCase();return v||(e=y[n]=y[n]||e,m[e]=t),this},overrideMimeType:function(e){return v||(c.mimeType=e),this},statusCode:function(e){var t;if(e)if(2>v)for(t in e)g[t]=[g[t],e[t]];else T.always(e[T.status]);return this},abort:function(e){var t=e||b;return n&&n.abort(t),k(0,t),this}};if(h.promise(T).complete=d.add,T.success=T.done,T.error=T.fail,c.url=((e||c.url||Xt)+"").replace(Vt,"").replace(Zt,_t[1]+"//"),c.type=t.method||t.type||c.method||c.type,c.dataTypes=x.trim(c.dataType||"*").toLowerCase().match(w)||[""],null==c.crossDomain&&(a=en.exec(c.url.toLowerCase()),c.crossDomain=!(!a||a[1]===_t[1]&&a[2]===_t[2]&&(a[3]||("http:"===a[1]?"80":"443"))===(_t[3]||("http:"===_t[1]?"80":"443")))),c.data&&c.processData&&"string"!=typeof c.data&&(c.data=x.param(c.data,c.traditional)),un(nn,c,t,T),2===v)return T;u=c.global,u&&0===x.active++&&x.event.trigger("ajaxStart"),c.type=c.type.toUpperCase(),c.hasContent=!Kt.test(c.type),r=c.url,c.hasContent||(c.data&&(r=c.url+=(Yt.test(r)?"&":"?")+c.data,delete c.data),c.cache===!1&&(c.url=Gt.test(r)?r.replace(Gt,"$1_="+Ut++):r+(Yt.test(r)?"&":"?")+"_="+Ut++)),c.ifModified&&(x.lastModified[r]&&T.setRequestHeader("If-Modified-Since",x.lastModified[r]),x.etag[r]&&T.setRequestHeader("If-None-Match",x.etag[r])),(c.data&&c.hasContent&&c.contentType!==!1||t.contentType)&&T.setRequestHeader("Content-Type",c.contentType),T.setRequestHeader("Accept",c.dataTypes[0]&&c.accepts[c.dataTypes[0]]?c.accepts[c.dataTypes[0]]+("*"!==c.dataTypes[0]?", "+on+"; q=0.01":""):c.accepts["*"]);for(l in c.headers)T.setRequestHeader(l,c.headers[l]);if(c.beforeSend&&(c.beforeSend.call(f,T,c)===!1||2===v))return T.abort();b="abort";for(l in{success:1,error:1,complete:1})T[l](c[l]);if(n=un(rn,c,t,T)){T.readyState=1,u&&p.trigger("ajaxSend",[T,c]),c.async&&c.timeout>0&&(s=setTimeout(function(){T.abort("timeout")},c.timeout));try{v=1,n.send(m,k)}catch(C){if(!(2>v))throw C;k(-1,C)}}else k(-1,"No Transport");function k(e,t,o,a){var l,m,y,b,w,C=t;2!==v&&(v=2,s&&clearTimeout(s),n=undefined,i=a||"",T.readyState=e>0?4:0,l=e>=200&&300>e||304===e,o&&(b=cn(c,T,o)),b=fn(c,b,T,l),l?(c.ifModified&&(w=T.getResponseHeader("Last-Modified"),w&&(x.lastModified[r]=w),w=T.getResponseHeader("etag"),w&&(x.etag[r]=w)),204===e?C="nocontent":304===e?C="notmodified":(C=b.state,m=b.data,y=b.error,l=!y)):(y=C,(e||!C)&&(C="error",0>e&&(e=0))),T.status=e,T.statusText=(t||C)+"",l?h.resolveWith(f,[m,C,T]):h.rejectWith(f,[T,C,y]),T.statusCode(g),g=undefined,u&&p.trigger(l?"ajaxSuccess":"ajaxError",[T,c,l?m:y]),d.fireWith(f,[T,C]),u&&(p.trigger("ajaxComplete",[T,c]),--x.active||x.event.trigger("ajaxStop")))}return T},getJSON:function(e,t,n){return x.get(e,t,n,"json")},getScript:function(e,t){return x.get(e,undefined,t,"script")}}),x.each(["get","post"],function(e,t){x[t]=function(e,n,r,i){return x.isFunction(n)&&(i=i||r,r=n,n=undefined),x.ajax({url:e,type:t,dataType:i,data:n,success:r})}});function cn(e,t,n){var r,i,o,s,a=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),r===undefined&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in a)if(a[i]&&a[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}s||(s=i)}o=o||s}return o?(o!==u[0]&&u.unshift(o),n[o]):undefined}function fn(e,t,n,r){var i,o,s,a,u,l={},c=e.dataTypes.slice();if(c[1])for(s in e.converters)l[s.toLowerCase()]=e.converters[s];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(s=l[u+" "+o]||l["* "+o],!s)for(i in l)if(a=i.split(" "),a[1]===o&&(s=l[u+" "+a[0]]||l["* "+a[0]])){s===!0?s=l[i]:l[i]!==!0&&(o=a[0],c.unshift(a[1]));break}if(s!==!0)if(s&&e["throws"])t=s(t);else try{t=s(t)}catch(f){return{state:"parsererror",error:s?f:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}x.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(e){return x.globalEval(e),e}}}),x.ajaxPrefilter("script",function(e){e.cache===undefined&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),x.ajaxTransport("script",function(e){if(e.crossDomain){var t,n;return{send:function(r,i){t=x("<script>").prop({async:!0,charset:e.scriptCharset,src:e.url}).on("load error",n=function(e){t.remove(),n=null,e&&i("error"===e.type?404:200,e.type)}),o.head.appendChild(t[0])},abort:function(){n&&n()}}}});var pn=[],hn=/(=)\?(?=&|$)|\?\?/;x.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=pn.pop()||x.expando+"_"+Ut++;return this[e]=!0,e}}),x.ajaxPrefilter("json jsonp",function(t,n,r){var i,o,s,a=t.jsonp!==!1&&(hn.test(t.url)?"url":"string"==typeof t.data&&!(t.contentType||"").indexOf("application/x-www-form-urlencoded")&&hn.test(t.data)&&"data");return a||"jsonp"===t.dataTypes[0]?(i=t.jsonpCallback=x.isFunction(t.jsonpCallback)?t.jsonpCallback():t.jsonpCallback,a?t[a]=t[a].replace(hn,"$1"+i):t.jsonp!==!1&&(t.url+=(Yt.test(t.url)?"&":"?")+t.jsonp+"="+i),t.converters["script json"]=function(){return s||x.error(i+" was not called"),s[0]},t.dataTypes[0]="json",o=e[i],e[i]=function(){s=arguments},r.always(function(){e[i]=o,t[i]&&(t.jsonpCallback=n.jsonpCallback,pn.push(i)),s&&x.isFunction(o)&&o(s[0]),s=o=undefined}),"script"):undefined}),x.ajaxSettings.xhr=function(){try{return new XMLHttpRequest}catch(e){}};var dn=x.ajaxSettings.xhr(),gn={0:200,1223:204},mn=0,yn={};e.ActiveXObject&&x(e).on("unload",function(){for(var e in yn)yn[e]();yn=undefined}),x.support.cors=!!dn&&"withCredentials"in dn,x.support.ajax=dn=!!dn,x.ajaxTransport(function(e){var t;return x.support.cors||dn&&!e.crossDomain?{send:function(n,r){var i,o,s=e.xhr();if(s.open(e.type,e.url,e.async,e.username,e.password),e.xhrFields)for(i in e.xhrFields)s[i]=e.xhrFields[i];e.mimeType&&s.overrideMimeType&&s.overrideMimeType(e.mimeType),e.crossDomain||n["X-Requested-With"]||(n["X-Requested-With"]="XMLHttpRequest");for(i in n)s.setRequestHeader(i,n[i]);t=function(e){return function(){t&&(delete yn[o],t=s.onload=s.onerror=null,"abort"===e?s.abort():"error"===e?r(s.status||404,s.statusText):r(gn[s.status]||s.status,s.statusText,"string"==typeof s.responseText?{text:s.responseText}:undefined,s.getAllResponseHeaders()))}},s.onload=t(),s.onerror=t("error"),t=yn[o=mn++]=t("abort"),s.send(e.hasContent&&e.data||null)},abort:function(){t&&t()}}:undefined});var vn,xn,bn=/^(?:toggle|show|hide)$/,wn=RegExp("^(?:([+-])=|)("+b+")([a-z%]*)$","i"),Tn=/queueHooks$/,Cn=[Dn],kn={"*":[function(e,t){var n,r,i=this.createTween(e,t),o=wn.exec(t),s=i.cur(),a=+s||0,u=1,l=20;if(o){if(n=+o[2],r=o[3]||(x.cssNumber[e]?"":"px"),"px"!==r&&a){a=x.css(i.elem,e,!0)||n||1;do u=u||".5",a/=u,x.style(i.elem,e,a+r);while(u!==(u=i.cur()/s)&&1!==u&&--l)}i.unit=r,i.start=a,i.end=o[1]?a+(o[1]+1)*n:n}return i}]};function Nn(){return setTimeout(function(){vn=undefined}),vn=x.now()}function En(e,t){x.each(t,function(t,n){var r=(kn[t]||[]).concat(kn["*"]),i=0,o=r.length;for(;o>i;i++)if(r[i].call(e,t,n))return})}function Sn(e,t,n){var r,i,o=0,s=Cn.length,a=x.Deferred().always(function(){delete u.elem}),u=function(){if(i)return!1;var t=vn||Nn(),n=Math.max(0,l.startTime+l.duration-t),r=n/l.duration||0,o=1-r,s=0,u=l.tweens.length;for(;u>s;s++)l.tweens[s].run(o);return a.notifyWith(e,[l,o,n]),1>o&&u?n:(a.resolveWith(e,[l]),!1)},l=a.promise({elem:e,props:x.extend({},t),opts:x.extend(!0,{specialEasing:{}},n),originalProperties:t,originalOptions:n,startTime:vn||Nn(),duration:n.duration,tweens:[],createTween:function(t,n){var r=x.Tween(e,l.opts,t,n,l.opts.specialEasing[t]||l.opts.easing);return l.tweens.push(r),r},stop:function(t){var n=0,r=t?l.tweens.length:0;if(i)return this;for(i=!0;r>n;n++)l.tweens[n].run(1);return t?a.resolveWith(e,[l,t]):a.rejectWith(e,[l,t]),this}}),c=l.props;for(jn(c,l.opts.specialEasing);s>o;o++)if(r=Cn[o].call(l,e,c,l.opts))return r;return En(l,c),x.isFunction(l.opts.start)&&l.opts.start.call(e,l),x.fx.timer(x.extend(u,{elem:e,anim:l,queue:l.opts.queue})),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always)}function jn(e,t){var n,r,i,o,s;for(n in e)if(r=x.camelCase(n),i=t[r],o=e[n],x.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),s=x.cssHooks[r],s&&"expand"in s){o=s.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}x.Animation=x.extend(Sn,{tweener:function(e,t){x.isFunction(e)?(t=e,e=["*"]):e=e.split(" ");var n,r=0,i=e.length;for(;i>r;r++)n=e[r],kn[n]=kn[n]||[],kn[n].unshift(t)},prefilter:function(e,t){t?Cn.unshift(e):Cn.push(e)}});function Dn(e,t,n){var r,i,o,s,a,u,l,c,f,p=this,h=e.style,d={},g=[],m=e.nodeType&&At(e);n.queue||(c=x._queueHooks(e,"fx"),null==c.unqueued&&(c.unqueued=0,f=c.empty.fire,c.empty.fire=function(){c.unqueued||f()}),c.unqueued++,p.always(function(){p.always(function(){c.unqueued--,x.queue(e,"fx").length||c.empty.fire()})})),1===e.nodeType&&("height"in t||"width"in t)&&(n.overflow=[h.overflow,h.overflowX,h.overflowY],"inline"===x.css(e,"display")&&"none"===x.css(e,"float")&&(h.display="inline-block")),n.overflow&&(h.overflow="hidden",p.always(function(){h.overflow=n.overflow[0],h.overflowX=n.overflow[1],h.overflowY=n.overflow[2]})),a=q.get(e,"fxshow");for(r in t)if(o=t[r],bn.exec(o)){if(delete t[r],u=u||"toggle"===o,o===(m?"hide":"show")){if("show"!==o||a===undefined||a[r]===undefined)continue;m=!0}g.push(r)}if(s=g.length){a=q.get(e,"fxshow")||q.access(e,"fxshow",{}),"hidden"in a&&(m=a.hidden),u&&(a.hidden=!m),m?x(e).show():p.done(function(){x(e).hide()}),p.done(function(){var t;q.remove(e,"fxshow");for(t in d)x.style(e,t,d[t])});for(r=0;s>r;r++)i=g[r],l=p.createTween(i,m?a[i]:0),d[i]=a[i]||x.style(e,i),i in a||(a[i]=l.start,m&&(l.end=l.start,l.start="width"===i||"height"===i?1:0))}}function An(e,t,n,r,i){return new An.prototype.init(e,t,n,r,i)}x.Tween=An,An.prototype={constructor:An,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||"swing",this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(x.cssNumber[n]?"":"px")},cur:function(){var e=An.propHooks[this.prop];return e&&e.get?e.get(this):An.propHooks._default.get(this)},run:function(e){var t,n=An.propHooks[this.prop];return this.pos=t=this.options.duration?x.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):An.propHooks._default.set(this),this}},An.prototype.init.prototype=An.prototype,An.propHooks={_default:{get:function(e){var t;return null==e.elem[e.prop]||e.elem.style&&null!=e.elem.style[e.prop]?(t=x.css(e.elem,e.prop,""),t&&"auto"!==t?t:0):e.elem[e.prop]},set:function(e){x.fx.step[e.prop]?x.fx.step[e.prop](e):e.elem.style&&(null!=e.elem.style[x.cssProps[e.prop]]||x.cssHooks[e.prop])?x.style(e.elem,e.prop,e.now+e.unit):e.elem[e.prop]=e.now}}},An.propHooks.scrollTop=An.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},x.each(["toggle","show","hide"],function(e,t){var n=x.fn[t];x.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(Ln(t,!0),e,r,i)}}),x.fn.extend({fadeTo:function(e,t,n,r){return this.filter(At).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=x.isEmptyObject(e),o=x.speed(t,n,r),s=function(){var t=Sn(this,x.extend({},e),o);s.finish=function(){t.stop(!0)},(i||q.get(this,"finish"))&&t.stop(!0)};return s.finish=s,i||o.queue===!1?this.each(s):this.queue(o.queue,s)},stop:function(e,t,n){var r=function(e){var t=e.stop;delete e.stop,t(n)};return"string"!=typeof e&&(n=t,t=e,e=undefined),t&&e!==!1&&this.queue(e||"fx",[]),this.each(function(){var t=!0,i=null!=e&&e+"queueHooks",o=x.timers,s=q.get(this);if(i)s[i]&&s[i].stop&&r(s[i]);else for(i in s)s[i]&&s[i].stop&&Tn.test(i)&&r(s[i]);for(i=o.length;i--;)o[i].elem!==this||null!=e&&o[i].queue!==e||(o[i].anim.stop(n),t=!1,o.splice(i,1));(t||!n)&&x.dequeue(this,e)})},finish:function(e){return e!==!1&&(e=e||"fx"),this.each(function(){var t,n=q.get(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=x.timers,s=r?r.length:0;for(n.finish=!0,x.queue(this,e,[]),i&&i.cur&&i.cur.finish&&i.cur.finish.call(this),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;s>t;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}});function Ln(e,t){var n,r={height:e},i=0;for(t=t?1:0;4>i;i+=2-t)n=St[i],r["margin"+n]=r["padding"+n]=e;return t&&(r.opacity=r.width=e),r}x.each({slideDown:Ln("show"),slideUp:Ln("hide"),slideToggle:Ln("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){x.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),x.speed=function(e,t,n){var r=e&&"object"==typeof e?x.extend({},e):{complete:n||!n&&t||x.isFunction(e)&&e,duration:e,easing:n&&t||t&&!x.isFunction(t)&&t};return r.duration=x.fx.off?0:"number"==typeof r.duration?r.duration:r.duration in x.fx.speeds?x.fx.speeds[r.duration]:x.fx.speeds._default,(null==r.queue||r.queue===!0)&&(r.queue="fx"),r.old=r.complete,r.complete=function(){x.isFunction(r.old)&&r.old.call(this),r.queue&&x.dequeue(this,r.queue)},r},x.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2}},x.timers=[],x.fx=An.prototype.init,x.fx.tick=function(){var e,t=x.timers,n=0;for(vn=x.now();t.length>n;n++)e=t[n],e()||t[n]!==e||t.splice(n--,1);t.length||x.fx.stop(),vn=undefined},x.fx.timer=function(e){e()&&x.timers.push(e)&&x.fx.start()},x.fx.interval=13,x.fx.start=function(){xn||(xn=setInterval(x.fx.tick,x.fx.interval))},x.fx.stop=function(){clearInterval(xn),xn=null},x.fx.speeds={slow:600,fast:200,_default:400},x.fx.step={},x.expr&&x.expr.filters&&(x.expr.filters.animated=function(e){return x.grep(x.timers,function(t){return e===t.elem}).length}),x.fn.offset=function(e){if(arguments.length)return e===undefined?this:this.each(function(t){x.offset.setOffset(this,e,t)});var t,n,i=this[0],o={top:0,left:0},s=i&&i.ownerDocument;if(s)return t=s.documentElement,x.contains(t,i)?(typeof i.getBoundingClientRect!==r&&(o=i.getBoundingClientRect()),n=qn(s),{top:o.top+n.pageYOffset-t.clientTop,left:o.left+n.pageXOffset-t.clientLeft}):o},x.offset={setOffset:function(e,t,n){var r,i,o,s,a,u,l,c=x.css(e,"position"),f=x(e),p={};"static"===c&&(e.style.position="relative"),a=f.offset(),o=x.css(e,"top"),u=x.css(e,"left"),l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1,l?(r=f.position(),s=r.top,i=r.left):(s=parseFloat(o)||0,i=parseFloat(u)||0),x.isFunction(t)&&(t=t.call(e,n,a)),null!=t.top&&(p.top=t.top-a.top+s),null!=t.left&&(p.left=t.left-a.left+i),"using"in t?t.using.call(e,p):f.css(p)}},x.fn.extend({position:function(){if(this[0]){var e,t,n=this[0],r={top:0,left:0};return"fixed"===x.css(n,"position")?t=n.getBoundingClientRect():(e=this.offsetParent(),t=this.offset(),x.nodeName(e[0],"html")||(r=e.offset()),r.top+=x.css(e[0],"borderTopWidth",!0),r.left+=x.css(e[0],"borderLeftWidth",!0)),{top:t.top-r.top-x.css(n,"marginTop",!0),left:t.left-r.left-x.css(n,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent||s;while(e&&!x.nodeName(e,"html")&&"static"===x.css(e,"position"))e=e.offsetParent;return e||s})}}),x.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(t,n){var r="pageYOffset"===n;x.fn[t]=function(i){return x.access(this,function(t,i,o){var s=qn(t);return o===undefined?s?s[n]:t[i]:(s?s.scrollTo(r?e.pageXOffset:o,r?o:e.pageYOffset):t[i]=o,undefined)},t,i,arguments.length,null)}});function qn(e){return x.isWindow(e)?e:9===e.nodeType&&e.defaultView}x.each({Height:"height",Width:"width"},function(e,t){x.each({padding:"inner"+e,content:t,"":"outer"+e},function(n,r){x.fn[r]=function(r,i){var o=arguments.length&&(n||"boolean"!=typeof r),s=n||(r===!0||i===!0?"margin":"border");return x.access(this,function(t,n,r){var i;return x.isWindow(t)?t.document.documentElement["client"+e]:9===t.nodeType?(i=t.documentElement,Math.max(t.body["scroll"+e],i["scroll"+e],t.body["offset"+e],i["offset"+e],i["client"+e])):r===undefined?x.css(t,n,s):x.style(t,n,r,s)},t,o?r:undefined,o,null)}})}),x.fn.size=function(){return this.length},x.fn.andSelf=x.fn.addBack,"object"==typeof module&&"object"==typeof module.exports?module.exports=x:"function"==typeof define&&define.amd&&define("jquery",[],function(){return x}),"object"==typeof e&&"object"==typeof e.document&&(e.jQuery=e.$=x)})(window);
},{}],7:[function(require,module,exports){
(function (global){
/**
 * @license
 * lodash 3.3.1 (Custom Build) lodash.com/license | Underscore.js 1.8.2 underscorejs.org/LICENSE
 * Build: `lodash modern -o ./lodash.js`
 */
;(function(){function n(n,t){if(n!==t){var r=n===n,e=t===t;if(n>t||!r||typeof n=="undefined"&&e)return 1;if(n<t||!e||typeof t=="undefined"&&r)return-1}return 0}function t(n,t,r){if(t!==t)return h(n,r);r=(r||0)-1;for(var e=n.length;++r<e;)if(n[r]===t)return r;return-1}function r(n){return typeof n=="function"||false}function e(n,t){var r=n.length;for(n.sort(t);r--;)n[r]=n[r].c;return n}function u(n){return typeof n=="string"?n:null==n?"":n+""}function o(n){return n.charCodeAt(0)}function i(n,t){for(var r=-1,e=n.length;++r<e&&-1<t.indexOf(n.charAt(r)););return r
}function f(n,t){for(var r=n.length;r--&&-1<t.indexOf(n.charAt(r)););return r}function a(t,r){return n(t.a,r.a)||t.b-r.b}function c(t,r){for(var e=-1,u=t.a,o=r.a,i=u.length;++e<i;){var f=n(u[e],o[e]);if(f)return f}return t.b-r.b}function l(n){return Nt[n]}function s(n){return Ut[n]}function p(n){return"\\"+$t[n]}function h(n,t,r){var e=n.length;for(t=r?t||e:(t||0)-1;r?t--:++t<e;){var u=n[t];if(u!==u)return t}return-1}function _(n){return n&&typeof n=="object"||false}function g(n){return 160>=n&&9<=n&&13>=n||32==n||160==n||5760==n||6158==n||8192<=n&&(8202>=n||8232==n||8233==n||8239==n||8287==n||12288==n||65279==n)
}function v(n,t){for(var r=-1,e=n.length,u=-1,o=[];++r<e;)n[r]===t&&(n[r]=z,o[++u]=r);return o}function y(n){for(var t=-1,r=n.length;++t<r&&g(n.charCodeAt(t)););return t}function d(n){for(var t=n.length;t--&&g(n.charCodeAt(t)););return t}function m(n){return Ft[n]}function w(g){function Nt(n){if(_(n)&&!(Wo(n)||n instanceof Lt)){if(n instanceof Ft)return n;if(Fu.call(n,"__chain__")&&Fu.call(n,"__wrapped__"))return ge(n)}return new Ft(n)}function Ut(){}function Ft(n,t,r){this.__wrapped__=n,this.__actions__=r||[],this.__chain__=!!t
}function Lt(n){this.__wrapped__=n,this.__actions__=null,this.__dir__=1,this.__dropCount__=0,this.__filtered__=false,this.__iteratees__=null,this.__takeCount__=po,this.__views__=null}function $t(){this.__data__={}}function zt(n){var t=n?n.length:0;for(this.data={hash:ro(null),set:new Gu};t--;)this.push(n[t])}function Dt(n,t){var r=n.data;return(typeof t=="string"||He(t)?r.set.has(t):r.hash[t])?0:-1}function qt(n,t){var r=-1,e=n.length;for(t||(t=bu(e));++r<e;)t[r]=n[r];return t}function Pt(n,t){for(var r=-1,e=n.length;++r<e&&false!==t(n[r],r,n););return n
}function Kt(n,t){for(var r=-1,e=n.length;++r<e;)if(!t(n[r],r,n))return false;return true}function Vt(n,t){for(var r=-1,e=n.length,u=-1,o=[];++r<e;){var i=n[r];t(i,r,n)&&(o[++u]=i)}return o}function Yt(n,t){for(var r=-1,e=n.length,u=bu(e);++r<e;)u[r]=t(n[r],r,n);return u}function Zt(n){for(var t=-1,r=n.length,e=so;++t<r;){var u=n[t];u>e&&(e=u)}return e}function Gt(n,t,r,e){var u=-1,o=n.length;for(e&&o&&(r=n[++u]);++u<o;)r=t(r,n[u],u,n);return r}function Jt(n,t,r,e){var u=n.length;for(e&&u&&(r=n[--u]);u--;)r=t(r,n[u],u,n);
return r}function Xt(n,t){for(var r=-1,e=n.length;++r<e;)if(t(n[r],r,n))return true;return false}function Ht(n,t){return typeof n=="undefined"?t:n}function Qt(n,t,r,e){return typeof n!="undefined"&&Fu.call(e,r)?n:t}function nr(n,t,r){var e=$o(t);if(!r)return rr(t,n,e);for(var u=-1,o=e.length;++u<o;){var i=e[u],f=n[i],a=r(f,t[i],i,n,t);(a===a?a===f:f!==f)&&(typeof f!="undefined"||i in n)||(n[i]=a)}return n}function tr(n,t){for(var r=-1,e=n.length,u=fe(e),o=t.length,i=bu(o);++r<o;){var f=t[r];u?(f=parseFloat(f),i[r]=oe(f,e)?n[f]:b):i[r]=n[f]
}return i}function rr(n,t,r){r||(r=t,t={});for(var e=-1,u=r.length;++e<u;){var o=r[e];t[o]=n[o]}return t}function er(n,t,r){var e=typeof n;if("function"==e){if(e=typeof t!="undefined"){var e=Nt.support,u=!(e.funcNames?n.name:e.funcDecomp);if(!u){var o=Nu.call(n);e.funcNames||(u=!mt.test(o)),u||(u=Et.test(o)||Qe(n),xo(n,u))}e=u}n=e?Fr(n,t,r):n}else n=null==n?yu:"object"==e?Ar(n):typeof t=="undefined"?Er(n+""):jr(n+"",t);return n}function ur(n,t,r,e,u,o,i){var f;if(r&&(f=u?r(n,e,u):r(n)),typeof f!="undefined")return f;
if(!He(n))return n;if(e=Wo(n)){if(f=re(n),!t)return qt(n,f)}else{var a=$u.call(n),c=a==V;if(a!=Z&&a!=D&&(!c||u))return St[a]?ue(n,a,t):u?n:{};if(f=ee(c?{}:n),!t)return rr(n,f,$o(n))}for(o||(o=[]),i||(i=[]),u=o.length;u--;)if(o[u]==n)return i[u];return o.push(n),i.push(f),(e?Pt:vr)(n,function(e,u){f[u]=ur(e,t,r,u,n,o,i)}),f}function or(n,t,r,e){if(typeof n!="function")throw new Cu(B);return Ju(function(){n.apply(b,Or(r,e))},t)}function ir(n,r){var e=n?n.length:0,u=[];if(!e)return u;var o=-1,i=te(),f=i==t,a=f&&200<=r.length?Ao(r):null,c=r.length;
a&&(i=Dt,f=false,r=a);n:for(;++o<e;)if(a=n[o],f&&a===a){for(var l=c;l--;)if(r[l]===a)continue n;u.push(a)}else 0>i(r,a)&&u.push(a);return u}function fr(n,t){var r=n?n.length:0;if(!fe(r))return vr(n,t);for(var e=-1,u=_e(n);++e<r&&false!==t(u[e],e,u););return n}function ar(n,t){var r=n?n.length:0;if(!fe(r))return yr(n,t);for(var e=_e(n);r--&&false!==t(e[r],r,e););return n}function cr(n,t){var r=true;return fr(n,function(n,e,u){return r=!!t(n,e,u)}),r}function lr(n,t){var r=[];return fr(n,function(n,e,u){t(n,e,u)&&r.push(n)
}),r}function sr(n,t,r,e){var u;return r(n,function(n,r,o){return t(n,r,o)?(u=e?r:n,false):void 0}),u}function pr(n,t,r,e){e=(e||0)-1;for(var u=n.length,o=-1,i=[];++e<u;){var f=n[e];if(_(f)&&fe(f.length)&&(Wo(f)||Ge(f))){t&&(f=pr(f,t,r));var a=-1,c=f.length;for(i.length+=c;++a<c;)i[++o]=f[a]}else r||(i[++o]=f)}return i}function hr(n,t,r){var e=-1,u=_e(n);r=r(n);for(var o=r.length;++e<o;){var i=r[e];if(false===t(u[i],i,u))break}return n}function _r(n,t,r){var e=_e(n);r=r(n);for(var u=r.length;u--;){var o=r[u];
if(false===t(e[o],o,e))break}return n}function gr(n,t){hr(n,t,iu)}function vr(n,t){return hr(n,t,$o)}function yr(n,t){return _r(n,t,$o)}function dr(n,t){for(var r=-1,e=t.length,u=-1,o=[];++r<e;){var i=t[r];Uo(n[i])&&(o[++u]=i)}return o}function mr(n,t,r){var e=-1,u=typeof t=="function",o=n?n.length:0,i=fe(o)?bu(o):[];return fr(n,function(n){var o=u?t:null!=n&&n[t];i[++e]=o?o.apply(n,r):b}),i}function wr(n,t,r,e,u,o){if(n===t)return 0!==n||1/n==1/t;var i=typeof n,f=typeof t;if("function"!=i&&"object"!=i&&"function"!=f&&"object"!=f||null==n||null==t)n=n!==n&&t!==t;
else n:{var i=wr,f=Wo(n),a=Wo(t),c=M,l=M;f||(c=$u.call(n),c==D?c=Z:c!=Z&&(f=eu(n))),a||(l=$u.call(t),l==D?l=Z:l!=Z&&eu(t));var s=c==Z,a=l==Z,l=c==l;if(!l||f||s)if(c=s&&Fu.call(n,"__wrapped__"),a=a&&Fu.call(t,"__wrapped__"),c||a)n=i(c?n.value():n,a?t.value():t,r,e,u,o);else if(l){for(u||(u=[]),o||(o=[]),c=u.length;c--;)if(u[c]==n){n=o[c]==t;break n}u.push(n),o.push(t),n=(f?Jr:Hr)(n,t,i,r,e,u,o),u.pop(),o.pop()}else n=false;else n=Xr(n,t,c)}return n}function br(n,t,r,e,u){var o=t.length;if(null==n)return!o;
for(var i=-1,f=!u;++i<o;)if(f&&e[i]?r[i]!==n[t[i]]:!Fu.call(n,t[i]))return false;for(i=-1;++i<o;){var a=t[i];if(f&&e[i])a=Fu.call(n,a);else{var c=n[a],l=r[i],a=u?u(c,l,a):b;typeof a=="undefined"&&(a=wr(l,c,u,true))}if(!a)return false}return true}function xr(n,t){var r=[];return fr(n,function(n,e,u){r.push(t(n,e,u))}),r}function Ar(n){var t=$o(n),r=t.length;if(1==r){var e=t[0],u=n[e];if(ae(u))return function(n){return null!=n&&n[e]===u&&Fu.call(n,e)}}for(var o=bu(r),i=bu(r);r--;)u=n[t[r]],o[r]=u,i[r]=ae(u);return function(n){return br(n,t,o,i)
}}function jr(n,t){return ae(t)?function(r){return null!=r&&r[n]===t}:function(r){return null!=r&&wr(t,r[n],null,true)}}function kr(n,t,r,e,u){if(!He(n))return n;var o=fe(t.length)&&(Wo(t)||eu(t));return(o?Pt:vr)(t,function(t,i,f){if(_(t)){e||(e=[]),u||(u=[]);n:{t=e;for(var a=u,c=t.length,l=f[i];c--;)if(t[c]==l){n[i]=a[c],i=void 0;break n}c=n[i],f=r?r(c,l,i,n,f):b;var s=typeof f=="undefined";s&&(f=l,fe(l.length)&&(Wo(l)||eu(l))?f=Wo(c)?c:c?qt(c):[]:Fo(l)||Ge(l)?f=Ge(c)?uu(c):Fo(c)?c:{}:s=false),t.push(l),a.push(f),s?n[i]=kr(f,l,r,t,a):(f===f?f!==c:c===c)&&(n[i]=f),i=void 0
}return i}a=n[i],f=r?r(a,t,i,n,f):b,(l=typeof f=="undefined")&&(f=t),!o&&typeof f=="undefined"||!l&&(f===f?f===a:a!==a)||(n[i]=f)}),n}function Er(n){return function(t){return null==t?b:t[n]}}function Rr(n,t){return n+Ku(lo()*(t-n+1))}function Ir(n,t,r,e,u){return u(n,function(n,u,o){r=e?(e=false,n):t(r,n,u,o)}),r}function Or(n,t,r){var e=-1,u=n.length;for(t=null==t?0:+t||0,0>t&&(t=-t>u?0:u+t),r=typeof r=="undefined"||r>u?u:+r||0,0>r&&(r+=u),u=t>r?0:r-t>>>0,t>>>=0,r=bu(u);++e<u;)r[e]=n[e+t];return r}function Cr(n,t){var r;
return fr(n,function(n,e,u){return r=t(n,e,u),!r}),!!r}function Tr(n,r){var e=-1,u=te(),o=n.length,i=u==t,f=i&&200<=o,a=f?Ao():null,c=[];a?(u=Dt,i=false):(f=false,a=r?[]:c);n:for(;++e<o;){var l=n[e],s=r?r(l,e,n):l;if(i&&l===l){for(var p=a.length;p--;)if(a[p]===s)continue n;r&&a.push(s),c.push(l)}else 0>u(a,s)&&((r||f)&&a.push(s),c.push(l))}return c}function Sr(n,t){for(var r=-1,e=t.length,u=bu(e);++r<e;)u[r]=n[t[r]];return u}function Wr(n,t){var r=n;r instanceof Lt&&(r=r.value());for(var e=-1,u=t.length;++e<u;){var r=[r],o=t[e];
Yu.apply(r,o.args),r=o.func.apply(o.thisArg,r)}return r}function Nr(n,t,r){var e=0,u=n?n.length:e;if(typeof t=="number"&&t===t&&u<=go){for(;e<u;){var o=e+u>>>1,i=n[o];(r?i<=t:i<t)?e=o+1:u=o}return u}return Ur(n,t,yu,r)}function Ur(n,t,r,e){t=r(t);for(var u=0,o=n?n.length:0,i=t!==t,f=typeof t=="undefined";u<o;){var a=Ku((u+o)/2),c=r(n[a]),l=c===c;(i?l||e:f?l&&(e||typeof c!="undefined"):e?c<=t:c<t)?u=a+1:o=a}return io(o,_o)}function Fr(n,t,r){if(typeof n!="function")return yu;if(typeof t=="undefined")return n;
switch(r){case 1:return function(r){return n.call(t,r)};case 3:return function(r,e,u){return n.call(t,r,e,u)};case 4:return function(r,e,u,o){return n.call(t,r,e,u,o)};case 5:return function(r,e,u,o,i){return n.call(t,r,e,u,o,i)}}return function(){return n.apply(t,arguments)}}function Lr(n){return Mu.call(n,0)}function $r(n,t,r){for(var e=r.length,u=-1,o=oo(n.length-e,0),i=-1,f=t.length,a=bu(o+f);++i<f;)a[i]=t[i];for(;++u<e;)a[r[u]]=n[u];for(;o--;)a[i++]=n[u++];return a}function Br(n,t,r){for(var e=-1,u=r.length,o=-1,i=oo(n.length-u,0),f=-1,a=t.length,c=bu(i+a);++o<i;)c[o]=n[o];
for(i=o;++f<a;)c[i+f]=t[f];for(;++e<u;)c[i+r[e]]=n[o++];return c}function zr(n,t){return function(r,e,u){var o=t?t():{};if(e=ne(e,u,3),Wo(r)){u=-1;for(var i=r.length;++u<i;){var f=r[u];n(o,f,e(f,u,r),r)}}else fr(r,function(t,r,u){n(o,t,e(t,r,u),u)});return o}}function Dr(n){return function(){var t=arguments.length,r=arguments[0];if(2>t||null==r)return r;if(3<t&&ie(arguments[1],arguments[2],arguments[3])&&(t=2),3<t&&"function"==typeof arguments[t-2])var e=Fr(arguments[--t-1],arguments[t--],5);else 2<t&&"function"==typeof arguments[t-1]&&(e=arguments[--t]);
for(var u=0;++u<t;){var o=arguments[u];o&&n(r,o,e)}return r}}function Mr(n,t){function r(){return(this instanceof r?e:n).apply(t,arguments)}var e=Pr(n);return r}function qr(n){return function(t){var r=-1;t=hu(au(t));for(var e=t.length,u="";++r<e;)u=n(u,t[r],r);return u}}function Pr(n){return function(){var t=bo(n.prototype),r=n.apply(t,arguments);return He(r)?r:t}}function Kr(n,t){return function(r,e,u){u&&ie(r,e,u)&&(e=null);var i=ne(),f=null==e;if(i===er&&f||(f=false,e=i(e,u,3)),f){if(e=Wo(r),e||!ru(r))return n(e?r:he(r));
e=o}return Qr(r,e,t)}}function Vr(n,t,r,e,u,o,i,f,a,c){function l(){for(var w=arguments.length,x=w,k=bu(w);x--;)k[x]=arguments[x];if(e&&(k=$r(k,e,u)),o&&(k=Br(k,o,i)),_||y){var x=l.placeholder,E=v(k,x),w=w-E.length;if(w<c){var R=f?qt(f):null,w=oo(c-w,0),C=_?E:null,E=_?null:E,T=_?k:null,k=_?null:k;return t|=_?I:O,t&=~(_?O:I),g||(t&=~(A|j)),k=Vr(n,t,r,T,C,k,E,R,a,w),k.placeholder=x,k}}if(x=p?r:this,h&&(n=x[m]),f)for(R=k.length,w=io(f.length,R),C=qt(k);w--;)E=f[w],k[w]=oe(E,R)?C[E]:b;return s&&a<k.length&&(k.length=a),(this instanceof l?d||Pr(n):n).apply(x,k)
}var s=t&T,p=t&A,h=t&j,_=t&E,g=t&k,y=t&R,d=!h&&Pr(n),m=n;return l}function Yr(n,t,r){return n=n.length,t=+t,n<t&&eo(t)?(t-=n,r=null==r?" ":r+"",su(r,qu(t/r.length)).slice(0,t)):""}function Zr(n,t,r,e){function u(){for(var t=-1,f=arguments.length,a=-1,c=e.length,l=bu(f+c);++a<c;)l[a]=e[a];for(;f--;)l[a++]=arguments[++t];return(this instanceof u?i:n).apply(o?r:this,l)}var o=t&A,i=Pr(n);return u}function Gr(n,t,r,e,u,o,i,f){var a=t&j;if(!a&&typeof n!="function")throw new Cu(B);var c=e?e.length:0;if(c||(t&=~(I|O),e=u=null),c-=u?u.length:0,t&O){var l=e,s=u;
e=u=null}var p=!a&&jo(n);if(r=[n,t,r,e,u,l,s,o,i,f],p&&true!==p){e=r[1],t=p[1],f=e|t,o=T|C,u=A|j,i=o|u|k|R;var l=e&T&&!(t&T),s=e&C&&!(t&C),h=(s?r:p)[7],_=(l?r:p)[8];o=f>=o&&f<=i&&(e<C||(s||l)&&h.length<=_),(!(e>=C&&t>u||e>u&&t>=C)||o)&&(t&A&&(r[2]=p[2],f|=e&A?0:k),(e=p[3])&&(u=r[3],r[3]=u?$r(u,e,p[4]):qt(e),r[4]=u?v(r[3],z):qt(p[4])),(e=p[5])&&(u=r[5],r[5]=u?Br(u,e,p[6]):qt(e),r[6]=u?v(r[5],z):qt(p[6])),(e=p[7])&&(r[7]=qt(e)),t&T&&(r[8]=null==r[8]?p[8]:io(r[8],p[8])),null==r[9]&&(r[9]=p[9]),r[0]=p[0],r[1]=f),t=r[1],f=r[9]
}return r[9]=null==f?a?0:n.length:oo(f-c,0)||0,(p?xo:ko)(t==A?Mr(r[0],r[2]):t!=I&&t!=(A|I)||r[4].length?Vr.apply(b,r):Zr.apply(b,r),r)}function Jr(n,t,r,e,u,o,i){var f=-1,a=n.length,c=t.length,l=true;if(a!=c&&(!u||c<=a))return false;for(;l&&++f<a;){var s=n[f],p=t[f],l=b;if(e&&(l=u?e(p,s,f):e(s,p,f)),typeof l=="undefined")if(u)for(var h=c;h--&&(p=t[h],!(l=s&&s===p||r(s,p,e,u,o,i))););else l=s&&s===p||r(s,p,e,u,o,i)}return!!l}function Xr(n,t,r){switch(r){case q:case P:return+n==+t;case K:return n.name==t.name&&n.message==t.message;
case Y:return n!=+n?t!=+t:0==n?1/n==1/t:n==+t;case G:case J:return n==t+""}return false}function Hr(n,t,r,e,u,o,i){var f=$o(n),a=f.length,c=$o(t).length;if(a!=c&&!u)return false;for(var l,c=-1;++c<a;){var s=f[c],p=Fu.call(t,s);if(p){var h=n[s],_=t[s],p=b;e&&(p=u?e(_,h,s):e(h,_,s)),typeof p=="undefined"&&(p=h&&h===_||r(h,_,e,u,o,i))}if(!p)return false;l||(l="constructor"==s)}return l||(r=n.constructor,e=t.constructor,!(r!=e&&"constructor"in n&&"constructor"in t)||typeof r=="function"&&r instanceof r&&typeof e=="function"&&e instanceof e)?true:false
}function Qr(n,t,r){var e=r?po:so,u=e,o=u;return fr(n,function(n,i,f){i=t(n,i,f),((r?i<u:i>u)||i===e&&i===o)&&(u=i,o=n)}),o}function ne(n,t,r){var e=Nt.callback||gu,e=e===gu?er:e;return r?e(n,t,r):e}function te(n,r,e){var u=Nt.indexOf||we,u=u===we?t:u;return n?u(n,r,e):u}function re(n){var t=n.length,r=new n.constructor(t);return t&&"string"==typeof n[0]&&Fu.call(n,"index")&&(r.index=n.index,r.input=n.input),r}function ee(n){return n=n.constructor,typeof n=="function"&&n instanceof n||(n=Ru),new n
}function ue(n,t,r){var e=n.constructor;switch(t){case X:return Lr(n);case q:case P:return new e(+n);case H:case Q:case nt:case tt:case rt:case et:case ut:case ot:case it:return t=n.buffer,new e(r?Lr(t):t,n.byteOffset,n.length);case Y:case J:return new e(n);case G:var u=new e(n.source,dt.exec(n));u.lastIndex=n.lastIndex}return u}function oe(n,t){return n=+n,t=null==t?yo:t,-1<n&&0==n%1&&n<t}function ie(n,t,r){if(!He(r))return false;var e=typeof t;return"number"==e?(e=r.length,e=fe(e)&&oe(t,e)):e="string"==e&&t in r,e?(t=r[t],n===n?n===t:t!==t):false
}function fe(n){return typeof n=="number"&&-1<n&&0==n%1&&n<=yo}function ae(n){return n===n&&(0===n?0<1/n:!He(n))}function ce(n,t){n=_e(n);for(var r=-1,e=t.length,u={};++r<e;){var o=t[r];o in n&&(u[o]=n[o])}return u}function le(n,t){var r={};return gr(n,function(n,e,u){t(n,e,u)&&(r[e]=n)}),r}function se(n){var t;if(!_(n)||$u.call(n)!=Z||!(Fu.call(n,"constructor")||(t=n.constructor,typeof t!="function"||t instanceof t)))return false;var r;return gr(n,function(n,t){r=t}),typeof r=="undefined"||Fu.call(n,r)
}function pe(n){for(var t=iu(n),r=t.length,e=r&&n.length,u=Nt.support,u=e&&fe(e)&&(Wo(n)||u.nonEnumArgs&&Ge(n)),o=-1,i=[];++o<r;){var f=t[o];(u&&oe(f,e)||Fu.call(n,f))&&i.push(f)}return i}function he(n){return null==n?[]:fe(n.length)?He(n)?n:Ru(n):fu(n)}function _e(n){return He(n)?n:Ru(n)}function ge(n){return n instanceof Lt?n.clone():new Ft(n.__wrapped__,n.__chain__,qt(n.__actions__))}function ve(n,t,r){return n&&n.length?((r?ie(n,t,r):null==t)&&(t=1),Or(n,0>t?0:t)):[]}function ye(n,t,r){var e=n?n.length:0;
return e?((r?ie(n,t,r):null==t)&&(t=1),t=e-(+t||0),Or(n,0,0>t?0:t)):[]}function de(n,t,r){var e=-1,u=n?n.length:0;for(t=ne(t,r,3);++e<u;)if(t(n[e],e,n))return e;return-1}function me(n){return n?n[0]:b}function we(n,r,e){var u=n?n.length:0;if(!u)return-1;if(typeof e=="number")e=0>e?oo(u+e,0):e||0;else if(e)return e=Nr(n,r),n=n[e],(r===r?r===n:n!==n)?e:-1;return t(n,r,e)}function be(n){return ve(n,1)}function xe(n,r,e,u){if(!n||!n.length)return[];null!=r&&typeof r!="boolean"&&(u=e,e=ie(n,r,u)?null:r,r=false);
var o=ne();if((o!==er||null!=e)&&(e=o(e,u,3)),r&&te()==t){r=e;var i;e=-1,u=n.length;for(var o=-1,f=[];++e<u;){var a=n[e],c=r?r(a,e,n):a;e&&i===c||(i=c,f[++o]=a)}n=f}else n=Tr(n,e);return n}function Ae(n){for(var t=-1,r=(n&&n.length&&Zt(Yt(n,Uu)))>>>0,e=bu(r);++t<r;)e[t]=Yt(n,Er(t));return e}function je(n,t){var r=-1,e=n?n.length:0,u={};for(!e||t||Wo(n[0])||(t=[]);++r<e;){var o=n[r];t?u[o]=t[r]:o&&(u[o[0]]=o[1])}return u}function ke(n){return n=Nt(n),n.__chain__=true,n}function Ee(n,t,r){return t.call(r,n)
}function Re(n,t,r){var e=Wo(n)?Kt:cr;return(typeof t!="function"||typeof r!="undefined")&&(t=ne(t,r,3)),e(n,t)}function Ie(n,t,r){var e=Wo(n)?Vt:lr;return t=ne(t,r,3),e(n,t)}function Oe(n,t,r){return Wo(n)?(t=de(n,t,r),-1<t?n[t]:b):(t=ne(t,r,3),sr(n,t,fr))}function Ce(n,t,r){return typeof t=="function"&&typeof r=="undefined"&&Wo(n)?Pt(n,t):fr(n,Fr(t,r,3))}function Te(n,t,r){if(typeof t=="function"&&typeof r=="undefined"&&Wo(n))for(r=n.length;r--&&false!==t(n[r],r,n););else n=ar(n,Fr(t,r,3));return n
}function Se(n,t,r){var e=n?n.length:0;return fe(e)||(n=fu(n),e=n.length),e?(r=typeof r=="number"?0>r?oo(e+r,0):r||0:0,typeof n=="string"||!Wo(n)&&ru(n)?r<e&&-1<n.indexOf(t,r):-1<te(n,t,r)):false}function We(n,t,r){var e=Wo(n)?Yt:xr;return t=ne(t,r,3),e(n,t)}function Ne(n,t,r,e){return(Wo(n)?Gt:Ir)(n,ne(t,e,4),r,3>arguments.length,fr)}function Ue(n,t,r,e){return(Wo(n)?Jt:Ir)(n,ne(t,e,4),r,3>arguments.length,ar)}function Fe(n,t,r){return(r?ie(n,t,r):null==t)?(n=he(n),t=n.length,0<t?n[Rr(0,t-1)]:b):(n=Le(n),n.length=io(0>t?0:+t||0,n.length),n)
}function Le(n){n=he(n);for(var t=-1,r=n.length,e=bu(r);++t<r;){var u=Rr(0,t);t!=u&&(e[t]=e[u]),e[u]=n[t]}return e}function $e(n,t,r){var e=Wo(n)?Xt:Cr;return(typeof t!="function"||typeof r!="undefined")&&(t=ne(t,r,3)),e(n,t)}function Be(n,t){var r;if(typeof t!="function"){if(typeof n!="function")throw new Cu(B);var e=n;n=t,t=e}return function(){return 0<--n?r=t.apply(this,arguments):t=null,r}}function ze(n,t){var r=A;if(2<arguments.length)var e=Or(arguments,2),u=v(e,ze.placeholder),r=r|I;return Gr(n,r,t,e,u)
}function De(n,t){var r=A|j;if(2<arguments.length)var e=Or(arguments,2),u=v(e,De.placeholder),r=r|I;return Gr(t,r,n,e,u)}function Me(n,t,r){return r&&ie(n,t,r)&&(t=null),n=Gr(n,E,null,null,null,null,null,t),n.placeholder=Me.placeholder,n}function qe(n,t,r){return r&&ie(n,t,r)&&(t=null),n=Gr(n,R,null,null,null,null,null,t),n.placeholder=qe.placeholder,n}function Pe(n,t,r){function e(){var r=t-(So()-c);0>=r||r>t?(f&&Pu(f),r=p,f=s=p=b,r&&(h=So(),a=n.apply(l,i),s||f||(i=l=null))):s=Ju(e,r)}function u(){s&&Pu(s),f=s=p=b,(g||_!==t)&&(h=So(),a=n.apply(l,i),s||f||(i=l=null))
}function o(){if(i=arguments,c=So(),l=this,p=g&&(s||!v),false===_)var r=v&&!s;else{f||v||(h=c);var o=_-(c-h),y=0>=o||o>_;y?(f&&(f=Pu(f)),h=c,a=n.apply(l,i)):f||(f=Ju(u,o))}return y&&s?s=Pu(s):s||t===_||(s=Ju(e,t)),r&&(y=true,a=n.apply(l,i)),!y||s||f||(i=l=null),a}var i,f,a,c,l,s,p,h=0,_=false,g=true;if(typeof n!="function")throw new Cu(B);if(t=0>t?0:+t||0,true===r)var v=true,g=false;else He(r)&&(v=r.leading,_="maxWait"in r&&oo(+r.maxWait||0,t),g="trailing"in r?r.trailing:g);return o.cancel=function(){s&&Pu(s),f&&Pu(f),f=s=p=b
},o}function Ke(){var n=arguments,t=n.length-1;if(0>t)return function(n){return n};if(!Kt(n,r))throw new Cu(B);return function(){for(var r=t,e=n[r].apply(this,arguments);r--;)e=n[r].call(this,e);return e}}function Ve(n,t){function r(){var e=r.cache,u=t?t.apply(this,arguments):arguments[0];if(e.has(u))return e.get(u);var o=n.apply(this,arguments);return e.set(u,o),o}if(typeof n!="function"||t&&typeof t!="function")throw new Cu(B);return r.cache=new Ve.Cache,r}function Ye(n){var t=Or(arguments,1),r=v(t,Ye.placeholder);
return Gr(n,I,null,t,r)}function Ze(n){var t=Or(arguments,1),r=v(t,Ze.placeholder);return Gr(n,O,null,t,r)}function Ge(n){return fe(_(n)?n.length:b)&&$u.call(n)==D||false}function Je(n){return n&&1===n.nodeType&&_(n)&&-1<$u.call(n).indexOf("Element")||false}function Xe(n){return _(n)&&typeof n.message=="string"&&$u.call(n)==K||false}function He(n){var t=typeof n;return"function"==t||n&&"object"==t||false}function Qe(n){return null==n?false:$u.call(n)==V?zu.test(Nu.call(n)):_(n)&&bt.test(n)||false}function nu(n){return typeof n=="number"||_(n)&&$u.call(n)==Y||false
}function tu(n){return _(n)&&$u.call(n)==G||false}function ru(n){return typeof n=="string"||_(n)&&$u.call(n)==J||false}function eu(n){return _(n)&&fe(n.length)&&Tt[$u.call(n)]||false}function uu(n){return rr(n,iu(n))}function ou(n){return dr(n,iu(n))}function iu(n){if(null==n)return[];He(n)||(n=Ru(n));for(var t=n.length,t=t&&fe(t)&&(Wo(n)||wo.nonEnumArgs&&Ge(n))&&t||0,r=n.constructor,e=-1,r=typeof r=="function"&&r.prototype===n,u=bu(t),o=0<t;++e<t;)u[e]=e+"";for(var i in n)o&&oe(i,t)||"constructor"==i&&(r||!Fu.call(n,i))||u.push(i);
return u}function fu(n){return Sr(n,$o(n))}function au(n){return(n=u(n))&&n.replace(xt,l)}function cu(n){return(n=u(n))&&kt.test(n)?n.replace(jt,"\\$&"):n}function lu(n,t,r){return r&&ie(n,t,r)&&(t=0),co(n,t)}function su(n,t){var r="";if(n=u(n),t=+t,1>t||!n||!eo(t))return r;do t%2&&(r+=n),t=Ku(t/2),n+=n;while(t);return r}function pu(n,t,r){var e=n;return(n=u(n))?(r?ie(e,t,r):null==t)?n.slice(y(n),d(n)+1):(t+="",n.slice(i(n,t),f(n,t)+1)):n}function hu(n,t,r){return r&&ie(n,t,r)&&(t=null),n=u(n),n.match(t||It)||[]
}function _u(){var n=arguments.length,t=arguments[0];try{for(var r=bu(n?n-1:0);0<--n;)r[n-1]=arguments[n];return t.apply(b,r)}catch(e){return Xe(e)?e:new Au(e)}}function gu(n,t,r){return r&&ie(n,t,r)&&(t=null),_(n)?du(n):er(n,t)}function vu(n){return function(){return n}}function yu(n){return n}function du(n){return Ar(ur(n,true))}function mu(n,t,r){if(null==r){var e=He(t),u=e&&$o(t);((u=u&&u.length&&dr(t,u))?u.length:e)||(u=false,r=t,t=n,n=this)}u||(u=dr(t,$o(t)));var o=true,e=-1,i=Uo(n),f=u.length;false===r?o=false:He(r)&&"chain"in r&&(o=r.chain);
for(;++e<f;){r=u[e];var a=t[r];n[r]=a,i&&(n.prototype[r]=function(t){return function(){var r=this.__chain__;if(o||r){var e=n(this.__wrapped__);return(e.__actions__=qt(this.__actions__)).push({func:t,args:arguments,thisArg:n}),e.__chain__=r,e}return r=[this.value()],Yu.apply(r,arguments),t.apply(n,r)}}(a))}return n}function wu(){}g=g?Mt.defaults(Bt.Object(),g,Mt.pick(Bt,Ct)):Bt;var bu=g.Array,xu=g.Date,Au=g.Error,ju=g.Function,ku=g.Math,Eu=g.Number,Ru=g.Object,Iu=g.RegExp,Ou=g.String,Cu=g.TypeError,Tu=bu.prototype,Su=Ru.prototype,Wu=(Wu=g.window)&&Wu.document,Nu=ju.prototype.toString,Uu=Er("length"),Fu=Su.hasOwnProperty,Lu=0,$u=Su.toString,Bu=g._,zu=Iu("^"+cu($u).replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),Du=Qe(Du=g.ArrayBuffer)&&Du,Mu=Qe(Mu=Du&&new Du(0).slice)&&Mu,qu=ku.ceil,Pu=g.clearTimeout,Ku=ku.floor,Vu=Qe(Vu=Ru.getPrototypeOf)&&Vu,Yu=Tu.push,Zu=Su.propertyIsEnumerable,Gu=Qe(Gu=g.Set)&&Gu,Ju=g.setTimeout,Xu=Tu.splice,Hu=Qe(Hu=g.Uint8Array)&&Hu,Qu=Qe(Qu=g.WeakMap)&&Qu,no=function(){try{var n=Qe(n=g.Float64Array)&&n,t=new n(new Du(10),0,1)&&n
}catch(r){}return t}(),to=Qe(to=bu.isArray)&&to,ro=Qe(ro=Ru.create)&&ro,eo=g.isFinite,uo=Qe(uo=Ru.keys)&&uo,oo=ku.max,io=ku.min,fo=Qe(fo=xu.now)&&fo,ao=Qe(ao=Eu.isFinite)&&ao,co=g.parseInt,lo=ku.random,so=Eu.NEGATIVE_INFINITY,po=Eu.POSITIVE_INFINITY,ho=ku.pow(2,32)-1,_o=ho-1,go=ho>>>1,vo=no?no.BYTES_PER_ELEMENT:0,yo=ku.pow(2,53)-1,mo=Qu&&new Qu,wo=Nt.support={};!function(n){wo.funcDecomp=!Qe(g.WinRTError)&&Et.test(w),wo.funcNames=typeof ju.name=="string";try{wo.dom=11===Wu.createDocumentFragment().nodeType
}catch(t){wo.dom=false}try{wo.nonEnumArgs=!Zu.call(arguments,1)}catch(r){wo.nonEnumArgs=true}}(0,0),Nt.templateSettings={escape:_t,evaluate:gt,interpolate:vt,variable:"",imports:{_:Nt}};var bo=function(){function n(){}return function(t){if(He(t)){n.prototype=t;var r=new n;n.prototype=null}return r||g.Object()}}(),xo=mo?function(n,t){return mo.set(n,t),n}:yu;Mu||(Lr=Du&&Hu?function(n){var t=n.byteLength,r=no?Ku(t/vo):0,e=r*vo,u=new Du(t);if(r){var o=new no(u,0,r);o.set(new no(n,0,r))}return t!=e&&(o=new Hu(u,e),o.set(new Hu(n,e))),u
}:vu(null));var Ao=ro&&Gu?function(n){return new zt(n)}:vu(null),jo=mo?function(n){return mo.get(n)}:wu,ko=function(){var n=0,t=0;return function(r,e){var u=So(),o=U-(u-t);if(t=u,0<o){if(++n>=N)return r}else n=0;return xo(r,e)}}(),Eo=zr(function(n,t,r){Fu.call(n,r)?++n[r]:n[r]=1}),Ro=zr(function(n,t,r){Fu.call(n,r)?n[r].push(t):n[r]=[t]}),Io=zr(function(n,t,r){n[r]=t}),Oo=Kr(Zt),Co=Kr(function(n){for(var t=-1,r=n.length,e=po;++t<r;){var u=n[t];u<e&&(e=u)}return e},true),To=zr(function(n,t,r){n[r?0:1].push(t)
},function(){return[[],[]]}),So=fo||function(){return(new xu).getTime()},Wo=to||function(n){return _(n)&&fe(n.length)&&$u.call(n)==M||false};wo.dom||(Je=function(n){return n&&1===n.nodeType&&_(n)&&!Fo(n)||false});var No=ao||function(n){return typeof n=="number"&&eo(n)},Uo=r(/x/)||Hu&&!r(Hu)?function(n){return $u.call(n)==V}:r,Fo=Vu?function(n){if(!n||$u.call(n)!=Z)return false;var t=n.valueOf,r=Qe(t)&&(r=Vu(t))&&Vu(r);return r?n==r||Vu(n)==r:se(n)}:se,Lo=Dr(nr),$o=uo?function(n){if(n)var t=n.constructor,r=n.length;
return typeof t=="function"&&t.prototype===n||typeof n!="function"&&r&&fe(r)?pe(n):He(n)?uo(n):[]}:pe,Bo=Dr(kr),zo=qr(function(n,t,r){return t=t.toLowerCase(),n+(r?t.charAt(0).toUpperCase()+t.slice(1):t)}),Do=qr(function(n,t,r){return n+(r?"-":"")+t.toLowerCase()});8!=co(Ot+"08")&&(lu=function(n,t,r){return(r?ie(n,t,r):null==t)?t=0:t&&(t=+t),n=pu(n),co(n,t||(wt.test(n)?16:10))});var Mo=qr(function(n,t,r){return n+(r?"_":"")+t.toLowerCase()}),qo=qr(function(n,t,r){return n+(r?" ":"")+(t.charAt(0).toUpperCase()+t.slice(1))
});return Nt.prototype=Ut.prototype,Ft.prototype=bo(Ut.prototype),Ft.prototype.constructor=Ft,Lt.prototype=bo(Ut.prototype),Lt.prototype.constructor=Lt,$t.prototype["delete"]=function(n){return this.has(n)&&delete this.__data__[n]},$t.prototype.get=function(n){return"__proto__"==n?b:this.__data__[n]},$t.prototype.has=function(n){return"__proto__"!=n&&Fu.call(this.__data__,n)},$t.prototype.set=function(n,t){return"__proto__"!=n&&(this.__data__[n]=t),this},zt.prototype.push=function(n){var t=this.data;
typeof n=="string"||He(n)?t.set.add(n):t.hash[n]=true},Ve.Cache=$t,Nt.after=function(n,t){if(typeof t!="function"){if(typeof n!="function")throw new Cu(B);var r=n;n=t,t=r}return n=eo(n=+n)?n:0,function(){return 1>--n?t.apply(this,arguments):void 0}},Nt.ary=function(n,t,r){return r&&ie(n,t,r)&&(t=null),t=n&&null==t?n.length:oo(+t||0,0),Gr(n,T,null,null,null,null,t)},Nt.assign=Lo,Nt.at=function(n){return fe(n?n.length:0)&&(n=he(n)),tr(n,pr(arguments,false,false,1))},Nt.before=Be,Nt.bind=ze,Nt.bindAll=function(n){for(var t=n,r=1<arguments.length?pr(arguments,false,false,1):ou(n),e=-1,u=r.length;++e<u;){var o=r[e];
t[o]=Gr(t[o],A,t)}return t},Nt.bindKey=De,Nt.callback=gu,Nt.chain=ke,Nt.chunk=function(n,t,r){t=(r?ie(n,t,r):null==t)?1:oo(+t||1,1),r=0;for(var e=n?n.length:0,u=-1,o=bu(qu(e/t));r<e;)o[++u]=Or(n,r,r+=t);return o},Nt.compact=function(n){for(var t=-1,r=n?n.length:0,e=-1,u=[];++t<r;){var o=n[t];o&&(u[++e]=o)}return u},Nt.constant=vu,Nt.countBy=Eo,Nt.create=function(n,t,r){var e=bo(n);return r&&ie(n,t,r)&&(t=null),t?rr(t,e,$o(t)):e},Nt.curry=Me,Nt.curryRight=qe,Nt.debounce=Pe,Nt.defaults=function(n){if(null==n)return n;
var t=qt(arguments);return t.push(Ht),Lo.apply(b,t)},Nt.defer=function(n){return or(n,1,arguments,1)},Nt.delay=function(n,t){return or(n,t,arguments,2)},Nt.difference=function(){for(var n=-1,t=arguments.length;++n<t;){var r=arguments[n];if(Wo(r)||Ge(r))break}return ir(r,pr(arguments,false,true,++n))},Nt.drop=ve,Nt.dropRight=ye,Nt.dropRightWhile=function(n,t,r){var e=n?n.length:0;if(!e)return[];for(t=ne(t,r,3);e--&&t(n[e],e,n););return Or(n,0,e+1)},Nt.dropWhile=function(n,t,r){var e=n?n.length:0;if(!e)return[];
var u=-1;for(t=ne(t,r,3);++u<e&&t(n[u],u,n););return Or(n,u)},Nt.fill=function(n,t,r,e){var u=n?n.length:0;if(!u)return[];for(r&&typeof r!="number"&&ie(n,t,r)&&(r=0,e=u),u=n.length,r=null==r?0:+r||0,0>r&&(r=-r>u?0:u+r),e=typeof e=="undefined"||e>u?u:+e||0,0>e&&(e+=u),u=r>e?0:e>>>0,r>>>=0;r<u;)n[r++]=t;return n},Nt.filter=Ie,Nt.flatten=function(n,t,r){var e=n?n.length:0;return r&&ie(n,t,r)&&(t=false),e?pr(n,t):[]},Nt.flattenDeep=function(n){return n&&n.length?pr(n,true):[]},Nt.flow=function(){var n=arguments,t=n.length;
if(!t)return function(n){return n};if(!Kt(n,r))throw new Cu(B);return function(){for(var r=0,e=n[r].apply(this,arguments);++r<t;)e=n[r].call(this,e);return e}},Nt.flowRight=Ke,Nt.forEach=Ce,Nt.forEachRight=Te,Nt.forIn=function(n,t,r){return(typeof t!="function"||typeof r!="undefined")&&(t=Fr(t,r,3)),hr(n,t,iu)},Nt.forInRight=function(n,t,r){return t=Fr(t,r,3),_r(n,t,iu)},Nt.forOwn=function(n,t,r){return(typeof t!="function"||typeof r!="undefined")&&(t=Fr(t,r,3)),vr(n,t)},Nt.forOwnRight=function(n,t,r){return t=Fr(t,r,3),_r(n,t,$o)
},Nt.functions=ou,Nt.groupBy=Ro,Nt.indexBy=Io,Nt.initial=function(n){return ye(n,1)},Nt.intersection=function(){for(var n=[],r=-1,e=arguments.length,u=[],o=te(),i=o==t;++r<e;){var f=arguments[r];(Wo(f)||Ge(f))&&(n.push(f),u.push(i&&120<=f.length?Ao(r&&f):null))}var e=n.length,i=n[0],a=-1,c=i?i.length:0,l=[],s=u[0];n:for(;++a<c;)if(f=i[a],0>(s?Dt(s,f):o(l,f))){for(r=e;--r;){var p=u[r];if(0>(p?Dt(p,f):o(n[r],f)))continue n}s&&s.push(f),l.push(f)}return l},Nt.invert=function(n,t,r){r&&ie(n,t,r)&&(t=null),r=-1;
for(var e=$o(n),u=e.length,o={};++r<u;){var i=e[r],f=n[i];t?Fu.call(o,f)?o[f].push(i):o[f]=[i]:o[f]=i}return o},Nt.invoke=function(n,t){return mr(n,t,Or(arguments,2))},Nt.keys=$o,Nt.keysIn=iu,Nt.map=We,Nt.mapValues=function(n,t,r){var e={};return t=ne(t,r,3),vr(n,function(n,r,u){e[r]=t(n,r,u)}),e},Nt.matches=du,Nt.matchesProperty=function(n,t){return jr(n+"",ur(t,true))},Nt.memoize=Ve,Nt.merge=Bo,Nt.mixin=mu,Nt.negate=function(n){if(typeof n!="function")throw new Cu(B);return function(){return!n.apply(this,arguments)
}},Nt.omit=function(n,t,r){if(null==n)return{};if(typeof t!="function"){var e=Yt(pr(arguments,false,false,1),Ou);return ce(n,ir(iu(n),e))}return t=Fr(t,r,3),le(n,function(n,r,e){return!t(n,r,e)})},Nt.once=function(n){return Be(n,2)},Nt.pairs=function(n){for(var t=-1,r=$o(n),e=r.length,u=bu(e);++t<e;){var o=r[t];u[t]=[o,n[o]]}return u},Nt.partial=Ye,Nt.partialRight=Ze,Nt.partition=To,Nt.pick=function(n,t,r){return null==n?{}:typeof t=="function"?le(n,Fr(t,r,3)):ce(n,pr(arguments,false,false,1))},Nt.pluck=function(n,t){return We(n,Er(t))
},Nt.property=function(n){return Er(n+"")},Nt.propertyOf=function(n){return function(t){return null==n?b:n[t]}},Nt.pull=function(){var n=arguments[0];if(!n||!n.length)return n;for(var t=0,r=te(),e=arguments.length;++t<e;)for(var u=0,o=arguments[t];-1<(u=r(n,o,u));)Xu.call(n,u,1);return n},Nt.pullAt=function(t){var r=t||[],e=pr(arguments,false,false,1),u=e.length,o=tr(r,e);for(e.sort(n);u--;){var i=parseFloat(e[u]);if(i!=f&&oe(i)){var f=i;Xu.call(r,i,1)}}return o},Nt.range=function(n,t,r){r&&ie(n,t,r)&&(t=r=null),n=+n||0,r=null==r?1:+r||0,null==t?(t=n,n=0):t=+t||0;
var e=-1;t=oo(qu((t-n)/(r||1)),0);for(var u=bu(t);++e<t;)u[e]=n,n+=r;return u},Nt.rearg=function(n){var t=pr(arguments,false,false,1);return Gr(n,C,null,null,null,t)},Nt.reject=function(n,t,r){var e=Wo(n)?Vt:lr;return t=ne(t,r,3),e(n,function(n,r,e){return!t(n,r,e)})},Nt.remove=function(n,t,r){var e=-1,u=n?n.length:0,o=[];for(t=ne(t,r,3);++e<u;)r=n[e],t(r,e,n)&&(o.push(r),Xu.call(n,e--,1),u--);return o},Nt.rest=be,Nt.shuffle=Le,Nt.slice=function(n,t,r){var e=n?n.length:0;return e?(r&&typeof r!="number"&&ie(n,t,r)&&(t=0,r=e),Or(n,t,r)):[]
},Nt.sortBy=function(n,t,r){var u=-1,o=n?n.length:0,i=fe(o)?bu(o):[];return r&&ie(n,t,r)&&(t=null),t=ne(t,r,3),fr(n,function(n,r,e){i[++u]={a:t(n,r,e),b:u,c:n}}),e(i,a)},Nt.sortByAll=function(n){var t=arguments;3<t.length&&ie(t[1],t[2],t[3])&&(t=[n,t[1]]);var r=-1,u=n?n.length:0,o=pr(t,false,false,1),i=fe(u)?bu(u):[];return fr(n,function(n){for(var t=o.length,e=bu(t);t--;)e[t]=null==n?b:n[o[t]];i[++r]={a:e,b:r,c:n}}),e(i,c)},Nt.spread=function(n){if(typeof n!="function")throw new Cu(B);return function(t){return n.apply(this,t)
}},Nt.take=function(n,t,r){return n&&n.length?((r?ie(n,t,r):null==t)&&(t=1),Or(n,0,0>t?0:t)):[]},Nt.takeRight=function(n,t,r){var e=n?n.length:0;return e?((r?ie(n,t,r):null==t)&&(t=1),t=e-(+t||0),Or(n,0>t?0:t)):[]},Nt.takeRightWhile=function(n,t,r){var e=n?n.length:0;if(!e)return[];for(t=ne(t,r,3);e--&&t(n[e],e,n););return Or(n,e+1)},Nt.takeWhile=function(n,t,r){var e=n?n.length:0;if(!e)return[];var u=-1;for(t=ne(t,r,3);++u<e&&t(n[u],u,n););return Or(n,0,u)},Nt.tap=function(n,t,r){return t.call(r,n),n
},Nt.throttle=function(n,t,r){var e=true,u=true;if(typeof n!="function")throw new Cu(B);return false===r?e=false:He(r)&&(e="leading"in r?!!r.leading:e,u="trailing"in r?!!r.trailing:u),Wt.leading=e,Wt.maxWait=+t,Wt.trailing=u,Pe(n,t,Wt)},Nt.thru=Ee,Nt.times=function(n,t,r){if(n=+n,1>n||!eo(n))return[];var e=-1,u=bu(io(n,ho));for(t=Fr(t,r,1);++e<n;)e<ho?u[e]=t(e):t(e);return u},Nt.toArray=function(n){var t=n?n.length:0;return fe(t)?t?qt(n):[]:fu(n)},Nt.toPlainObject=uu,Nt.transform=function(n,t,r,e){var u=Wo(n)||eu(n);
return t=ne(t,e,4),null==r&&(u||He(n)?(e=n.constructor,r=u?Wo(n)?new e:[]:bo(Uo(e)&&e.prototype)):r={}),(u?Pt:vr)(n,function(n,e,u){return t(r,n,e,u)}),r},Nt.union=function(){return Tr(pr(arguments,false,true))},Nt.uniq=xe,Nt.unzip=Ae,Nt.values=fu,Nt.valuesIn=function(n){return Sr(n,iu(n))},Nt.where=function(n,t){return Ie(n,Ar(t))},Nt.without=function(n){return ir(n,Or(arguments,1))},Nt.wrap=function(n,t){return t=null==t?yu:t,Gr(t,I,null,[n],[])},Nt.xor=function(){for(var n=-1,t=arguments.length;++n<t;){var r=arguments[n];
if(Wo(r)||Ge(r))var e=e?ir(e,r).concat(ir(r,e)):r}return e?Tr(e):[]},Nt.zip=function(){for(var n=arguments.length,t=bu(n);n--;)t[n]=arguments[n];return Ae(t)},Nt.zipObject=je,Nt.backflow=Ke,Nt.collect=We,Nt.compose=Ke,Nt.each=Ce,Nt.eachRight=Te,Nt.extend=Lo,Nt.iteratee=gu,Nt.methods=ou,Nt.object=je,Nt.select=Ie,Nt.tail=be,Nt.unique=xe,mu(Nt,Nt),Nt.attempt=_u,Nt.camelCase=zo,Nt.capitalize=function(n){return(n=u(n))&&n.charAt(0).toUpperCase()+n.slice(1)},Nt.clone=function(n,t,r,e){return t&&typeof t!="boolean"&&ie(n,t,r)?t=false:typeof t=="function"&&(e=r,r=t,t=false),r=typeof r=="function"&&Fr(r,e,1),ur(n,t,r)
},Nt.cloneDeep=function(n,t,r){return t=typeof t=="function"&&Fr(t,r,1),ur(n,true,t)},Nt.deburr=au,Nt.endsWith=function(n,t,r){n=u(n),t+="";var e=n.length;return r=(typeof r=="undefined"?e:io(0>r?0:+r||0,e))-t.length,0<=r&&n.indexOf(t,r)==r},Nt.escape=function(n){return(n=u(n))&&ht.test(n)?n.replace(st,s):n},Nt.escapeRegExp=cu,Nt.every=Re,Nt.find=Oe,Nt.findIndex=de,Nt.findKey=function(n,t,r){return t=ne(t,r,3),sr(n,t,vr,true)},Nt.findLast=function(n,t,r){return t=ne(t,r,3),sr(n,t,ar)},Nt.findLastIndex=function(n,t,r){var e=n?n.length:0;
for(t=ne(t,r,3);e--;)if(t(n[e],e,n))return e;return-1},Nt.findLastKey=function(n,t,r){return t=ne(t,r,3),sr(n,t,yr,true)},Nt.findWhere=function(n,t){return Oe(n,Ar(t))},Nt.first=me,Nt.has=function(n,t){return n?Fu.call(n,t):false},Nt.identity=yu,Nt.includes=Se,Nt.indexOf=we,Nt.inRange=function(n,t,r){return t=+t||0,"undefined"===typeof r?(r=t,t=0):r=+r||0,n>=t&&n<r},Nt.isArguments=Ge,Nt.isArray=Wo,Nt.isBoolean=function(n){return true===n||false===n||_(n)&&$u.call(n)==q||false},Nt.isDate=function(n){return _(n)&&$u.call(n)==P||false
},Nt.isElement=Je,Nt.isEmpty=function(n){if(null==n)return true;var t=n.length;return fe(t)&&(Wo(n)||ru(n)||Ge(n)||_(n)&&Uo(n.splice))?!t:!$o(n).length},Nt.isEqual=function(n,t,r,e){return r=typeof r=="function"&&Fr(r,e,3),!r&&ae(n)&&ae(t)?n===t:(e=r?r(n,t):b,typeof e=="undefined"?wr(n,t,r):!!e)},Nt.isError=Xe,Nt.isFinite=No,Nt.isFunction=Uo,Nt.isMatch=function(n,t,r,e){var u=$o(t),o=u.length;if(r=typeof r=="function"&&Fr(r,e,3),!r&&1==o){var i=u[0];if(e=t[i],ae(e))return null!=n&&e===n[i]&&Fu.call(n,i)
}for(var i=bu(o),f=bu(o);o--;)e=i[o]=t[u[o]],f[o]=ae(e);return br(n,u,i,f,r)},Nt.isNaN=function(n){return nu(n)&&n!=+n},Nt.isNative=Qe,Nt.isNull=function(n){return null===n},Nt.isNumber=nu,Nt.isObject=He,Nt.isPlainObject=Fo,Nt.isRegExp=tu,Nt.isString=ru,Nt.isTypedArray=eu,Nt.isUndefined=function(n){return typeof n=="undefined"},Nt.kebabCase=Do,Nt.last=function(n){var t=n?n.length:0;return t?n[t-1]:b},Nt.lastIndexOf=function(n,t,r){var e=n?n.length:0;if(!e)return-1;var u=e;if(typeof r=="number")u=(0>r?oo(e+r,0):io(r||0,e-1))+1;
else if(r)return u=Nr(n,t,true)-1,n=n[u],(t===t?t===n:n!==n)?u:-1;if(t!==t)return h(n,u,true);for(;u--;)if(n[u]===t)return u;return-1},Nt.max=Oo,Nt.min=Co,Nt.noConflict=function(){return g._=Bu,this},Nt.noop=wu,Nt.now=So,Nt.pad=function(n,t,r){n=u(n),t=+t;var e=n.length;return e<t&&eo(t)?(e=(t-e)/2,t=Ku(e),e=qu(e),r=Yr("",e,r),r.slice(0,t)+n+r):n},Nt.padLeft=function(n,t,r){return(n=u(n))&&Yr(n,t,r)+n},Nt.padRight=function(n,t,r){return(n=u(n))&&n+Yr(n,t,r)},Nt.parseInt=lu,Nt.random=function(n,t,r){r&&ie(n,t,r)&&(t=r=null);
var e=null==n,u=null==t;return null==r&&(u&&typeof n=="boolean"?(r=n,n=1):typeof t=="boolean"&&(r=t,u=true)),e&&u&&(t=1,u=false),n=+n||0,u?(t=n,n=0):t=+t||0,r||n%1||t%1?(r=lo(),io(n+r*(t-n+parseFloat("1e-"+((r+"").length-1))),t)):Rr(n,t)},Nt.reduce=Ne,Nt.reduceRight=Ue,Nt.repeat=su,Nt.result=function(n,t,r){return t=null==n?b:n[t],typeof t=="undefined"&&(t=r),Uo(t)?t.call(n):t},Nt.runInContext=w,Nt.size=function(n){var t=n?n.length:0;return fe(t)?t:$o(n).length},Nt.snakeCase=Mo,Nt.some=$e,Nt.sortedIndex=function(n,t,r,e){var u=ne(r);
return u===er&&null==r?Nr(n,t):Ur(n,t,u(r,e,1))},Nt.sortedLastIndex=function(n,t,r,e){var u=ne(r);return u===er&&null==r?Nr(n,t,true):Ur(n,t,u(r,e,1),true)},Nt.startCase=qo,Nt.startsWith=function(n,t,r){return n=u(n),r=null==r?0:io(0>r?0:+r||0,n.length),n.lastIndexOf(t,r)==r},Nt.template=function(n,t,r){var e=Nt.templateSettings;r&&ie(n,t,r)&&(t=r=null),n=u(n),t=nr(nr({},r||t),e,Qt),r=nr(nr({},t.imports),e.imports,Qt);var o,i,f=$o(r),a=Sr(r,f),c=0;r=t.interpolate||At;var l="__p+='";r=Iu((t.escape||At).source+"|"+r.source+"|"+(r===vt?yt:At).source+"|"+(t.evaluate||At).source+"|$","g");
var s="sourceURL"in t?"//# sourceURL="+t.sourceURL+"\n":"";if(n.replace(r,function(t,r,e,u,f,a){return e||(e=u),l+=n.slice(c,a).replace(Rt,p),r&&(o=true,l+="'+__e("+r+")+'"),f&&(i=true,l+="';"+f+";\n__p+='"),e&&(l+="'+((__t=("+e+"))==null?'':__t)+'"),c=a+t.length,t}),l+="';",(t=t.variable)||(l="with(obj){"+l+"}"),l=(i?l.replace(ft,""):l).replace(at,"$1").replace(ct,"$1;"),l="function("+(t||"obj")+"){"+(t?"":"obj||(obj={});")+"var __t,__p=''"+(o?",__e=_.escape":"")+(i?",__j=Array.prototype.join;function print(){__p+=__j.call(arguments,'')}":";")+l+"return __p}",t=_u(function(){return ju(f,s+"return "+l).apply(b,a)
}),t.source=l,Xe(t))throw t;return t},Nt.trim=pu,Nt.trimLeft=function(n,t,r){var e=n;return(n=u(n))?n.slice((r?ie(e,t,r):null==t)?y(n):i(n,t+"")):n},Nt.trimRight=function(n,t,r){var e=n;return(n=u(n))?(r?ie(e,t,r):null==t)?n.slice(0,d(n)+1):n.slice(0,f(n,t+"")+1):n},Nt.trunc=function(n,t,r){r&&ie(n,t,r)&&(t=null);var e=S;if(r=W,null!=t)if(He(t)){var o="separator"in t?t.separator:o,e="length"in t?+t.length||0:e;r="omission"in t?u(t.omission):r}else e=+t||0;if(n=u(n),e>=n.length)return n;if(e-=r.length,1>e)return r;
if(t=n.slice(0,e),null==o)return t+r;if(tu(o)){if(n.slice(e).search(o)){var i,f=n.slice(0,e);for(o.global||(o=Iu(o.source,(dt.exec(o)||"")+"g")),o.lastIndex=0;n=o.exec(f);)i=n.index;t=t.slice(0,null==i?e:i)}}else n.indexOf(o,e)!=e&&(o=t.lastIndexOf(o),-1<o&&(t=t.slice(0,o)));return t+r},Nt.unescape=function(n){return(n=u(n))&&pt.test(n)?n.replace(lt,m):n},Nt.uniqueId=function(n){var t=++Lu;return u(n)+t},Nt.words=hu,Nt.all=Re,Nt.any=$e,Nt.contains=Se,Nt.detect=Oe,Nt.foldl=Ne,Nt.foldr=Ue,Nt.head=me,Nt.include=Se,Nt.inject=Ne,mu(Nt,function(){var n={};
return vr(Nt,function(t,r){Nt.prototype[r]||(n[r]=t)}),n}(),false),Nt.sample=Fe,Nt.prototype.sample=function(n){return this.__chain__||null!=n?this.thru(function(t){return Fe(t,n)}):Fe(this.value())},Nt.VERSION=x,Pt("bind bindKey curry curryRight partial partialRight".split(" "),function(n){Nt[n].placeholder=Nt}),Pt(["filter","map","takeWhile"],function(n,t){var r=t==F||t==$;Lt.prototype[n]=function(n,e){var u=this.clone(),o=u.__iteratees__||(u.__iteratees__=[]);return u.__filtered__=u.__filtered__||r,o.push({iteratee:ne(n,e,3),type:t}),u
}}),Pt(["drop","take"],function(n,t){var r="__"+n+"Count__",e=n+"While";Lt.prototype[n]=function(e){e=null==e?1:oo(Ku(e)||0,0);var u=this.clone();if(u.__filtered__){var o=u[r];u[r]=t?io(o,e):o+e}else(u.__views__||(u.__views__=[])).push({size:e,type:n+(0>u.__dir__?"Right":"")});return u},Lt.prototype[n+"Right"]=function(t){return this.reverse()[n](t).reverse()},Lt.prototype[n+"RightWhile"]=function(n,t){return this.reverse()[e](n,t).reverse()}}),Pt(["first","last"],function(n,t){var r="take"+(t?"Right":"");
Lt.prototype[n]=function(){return this[r](1).value()[0]}}),Pt(["initial","rest"],function(n,t){var r="drop"+(t?"":"Right");Lt.prototype[n]=function(){return this[r](1)}}),Pt(["pluck","where"],function(n,t){var r=t?"filter":"map",e=t?Ar:Er;Lt.prototype[n]=function(n){return this[r](e(n))}}),Lt.prototype.compact=function(){return this.filter(yu)},Lt.prototype.dropWhile=function(n,t){var r,e,u=0>this.__dir__;return n=ne(n,t,3),this.filter(function(t,o,i){return r=r&&(u?o<e:o>e),e=o,r||(r=!n(t,o,i))})
},Lt.prototype.reject=function(n,t){return n=ne(n,t,3),this.filter(function(t,r,e){return!n(t,r,e)})},Lt.prototype.slice=function(n,t){n=null==n?0:+n||0;var r=0>n?this.takeRight(-n):this.drop(n);return typeof t!="undefined"&&(t=+t||0,r=0>t?r.dropRight(-t):r.take(t-n)),r},Lt.prototype.toArray=function(){return this.drop(0)},vr(Lt.prototype,function(n,t){var r=Nt[t],e=/^(?:first|last)$/.test(t);Nt.prototype[t]=function(){function t(n){return n=[n],Yu.apply(n,o),r.apply(Nt,n)}var u=this.__wrapped__,o=arguments,i=this.__chain__,f=!!this.__actions__.length,a=u instanceof Lt,c=a&&!f;
return e&&!i?c?n.call(u):r.call(Nt,this.value()):a||Wo(u)?(u=n.apply(c?u:new Lt(this),o),e||!f&&!u.__actions__||(u.__actions__||(u.__actions__=[])).push({func:Ee,args:[t],thisArg:Nt}),new Ft(u,i)):this.thru(t)}}),Pt("concat join pop push shift sort splice unshift".split(" "),function(n){var t=Tu[n],r=/^(?:push|sort|unshift)$/.test(n)?"tap":"thru",e=/^(?:join|pop|shift)$/.test(n);Nt.prototype[n]=function(){var n=arguments;return e&&!this.__chain__?t.apply(this.value(),n):this[r](function(r){return t.apply(r,n)
})}}),Lt.prototype.clone=function(){var n=this.__actions__,t=this.__iteratees__,r=this.__views__,e=new Lt(this.__wrapped__);return e.__actions__=n?qt(n):null,e.__dir__=this.__dir__,e.__dropCount__=this.__dropCount__,e.__filtered__=this.__filtered__,e.__iteratees__=t?qt(t):null,e.__takeCount__=this.__takeCount__,e.__views__=r?qt(r):null,e},Lt.prototype.reverse=function(){if(this.__filtered__){var n=new Lt(this);n.__dir__=-1,n.__filtered__=true}else n=this.clone(),n.__dir__*=-1;return n},Lt.prototype.value=function(){var n=this.__wrapped__.value();
if(!Wo(n))return Wr(n,this.__actions__);var t,r=this.__dir__,e=0>r;t=n.length;for(var u=this.__views__,o=0,i=-1,f=u?u.length:0;++i<f;){var a=u[i],c=a.size;switch(a.type){case"drop":o+=c;break;case"dropRight":t-=c;break;case"take":t=io(t,o+c);break;case"takeRight":o=oo(o,t-c)}}t={start:o,end:t},i=t.start,f=t.end,t=f-i,u=this.__dropCount__,o=io(t,this.__takeCount__),e=e?f:i-1,f=(i=this.__iteratees__)?i.length:0,a=0,c=[];n:for(;t--&&a<o;){for(var e=e+r,l=-1,s=n[e];++l<f;){var p=i[l],h=p.iteratee(s,e,n),p=p.type;
if(p==L)s=h;else if(!h){if(p==F)continue n;break n}}u?u--:c[a++]=s}return c},Nt.prototype.chain=function(){return ke(this)},Nt.prototype.commit=function(){return new Ft(this.value(),this.__chain__)},Nt.prototype.plant=function(n){for(var t,r=this;r instanceof Ut;){var e=ge(r);t?u.__wrapped__=e:t=e;var u=e,r=r.__wrapped__}return u.__wrapped__=n,t},Nt.prototype.reverse=function(){var n=this.__wrapped__;return n instanceof Lt?(this.__actions__.length&&(n=new Lt(this)),new Ft(n.reverse(),this.__chain__)):this.thru(function(n){return n.reverse()
})},Nt.prototype.toString=function(){return this.value()+""},Nt.prototype.run=Nt.prototype.toJSON=Nt.prototype.valueOf=Nt.prototype.value=function(){return Wr(this.__wrapped__,this.__actions__)},Nt.prototype.collect=Nt.prototype.map,Nt.prototype.head=Nt.prototype.first,Nt.prototype.select=Nt.prototype.filter,Nt.prototype.tail=Nt.prototype.rest,Nt}var b,x="3.3.1",A=1,j=2,k=4,E=8,R=16,I=32,O=64,C=128,T=256,S=30,W="...",N=150,U=16,F=0,L=1,$=2,B="Expected a function",z="__lodash_placeholder__",D="[object Arguments]",M="[object Array]",q="[object Boolean]",P="[object Date]",K="[object Error]",V="[object Function]",Y="[object Number]",Z="[object Object]",G="[object RegExp]",J="[object String]",X="[object ArrayBuffer]",H="[object Float32Array]",Q="[object Float64Array]",nt="[object Int8Array]",tt="[object Int16Array]",rt="[object Int32Array]",et="[object Uint8Array]",ut="[object Uint8ClampedArray]",ot="[object Uint16Array]",it="[object Uint32Array]",ft=/\b__p\+='';/g,at=/\b(__p\+=)''\+/g,ct=/(__e\(.*?\)|\b__t\))\+'';/g,lt=/&(?:amp|lt|gt|quot|#39|#96);/g,st=/[&<>"'`]/g,pt=RegExp(lt.source),ht=RegExp(st.source),_t=/<%-([\s\S]+?)%>/g,gt=/<%([\s\S]+?)%>/g,vt=/<%=([\s\S]+?)%>/g,yt=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,dt=/\w*$/,mt=/^\s*function[ \n\r\t]+\w/,wt=/^0[xX]/,bt=/^\[object .+?Constructor\]$/,xt=/[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g,At=/($^)/,jt=/[.*+?^${}()|[\]\/\\]/g,kt=RegExp(jt.source),Et=/\bthis\b/,Rt=/['\n\r\u2028\u2029\\]/g,It=RegExp("[A-Z\\xc0-\\xd6\\xd8-\\xde]{2,}(?=[A-Z\\xc0-\\xd6\\xd8-\\xde][a-z\\xdf-\\xf6\\xf8-\\xff]+)|[A-Z\\xc0-\\xd6\\xd8-\\xde]?[a-z\\xdf-\\xf6\\xf8-\\xff]+|[A-Z\\xc0-\\xd6\\xd8-\\xde]+|[0-9]+","g"),Ot=" \t\x0b\f\xa0\ufeff\n\r\u2028\u2029\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000",Ct="Array ArrayBuffer Date Error Float32Array Float64Array Function Int8Array Int16Array Int32Array Math Number Object RegExp Set String _ clearTimeout document isFinite parseInt setTimeout TypeError Uint8Array Uint8ClampedArray Uint16Array Uint32Array WeakMap window WinRTError".split(" "),Tt={};
Tt[H]=Tt[Q]=Tt[nt]=Tt[tt]=Tt[rt]=Tt[et]=Tt[ut]=Tt[ot]=Tt[it]=true,Tt[D]=Tt[M]=Tt[X]=Tt[q]=Tt[P]=Tt[K]=Tt[V]=Tt["[object Map]"]=Tt[Y]=Tt[Z]=Tt[G]=Tt["[object Set]"]=Tt[J]=Tt["[object WeakMap]"]=false;var St={};St[D]=St[M]=St[X]=St[q]=St[P]=St[H]=St[Q]=St[nt]=St[tt]=St[rt]=St[Y]=St[Z]=St[G]=St[J]=St[et]=St[ut]=St[ot]=St[it]=true,St[K]=St[V]=St["[object Map]"]=St["[object Set]"]=St["[object WeakMap]"]=false;var Wt={leading:false,maxWait:0,trailing:false},Nt={"\xc0":"A","\xc1":"A","\xc2":"A","\xc3":"A","\xc4":"A","\xc5":"A","\xe0":"a","\xe1":"a","\xe2":"a","\xe3":"a","\xe4":"a","\xe5":"a","\xc7":"C","\xe7":"c","\xd0":"D","\xf0":"d","\xc8":"E","\xc9":"E","\xca":"E","\xcb":"E","\xe8":"e","\xe9":"e","\xea":"e","\xeb":"e","\xcc":"I","\xcd":"I","\xce":"I","\xcf":"I","\xec":"i","\xed":"i","\xee":"i","\xef":"i","\xd1":"N","\xf1":"n","\xd2":"O","\xd3":"O","\xd4":"O","\xd5":"O","\xd6":"O","\xd8":"O","\xf2":"o","\xf3":"o","\xf4":"o","\xf5":"o","\xf6":"o","\xf8":"o","\xd9":"U","\xda":"U","\xdb":"U","\xdc":"U","\xf9":"u","\xfa":"u","\xfb":"u","\xfc":"u","\xdd":"Y","\xfd":"y","\xff":"y","\xc6":"Ae","\xe6":"ae","\xde":"Th","\xfe":"th","\xdf":"ss"},Ut={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"},Ft={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'","&#96;":"`"},Lt={"function":true,object:true},$t={"\\":"\\","'":"'","\n":"n","\r":"r","\u2028":"u2028","\u2029":"u2029"},Bt=Lt[typeof window]&&window!==(this&&this.window)?window:this,zt=Lt[typeof exports]&&exports&&!exports.nodeType&&exports,Lt=Lt[typeof module]&&module&&!module.nodeType&&module,Dt=zt&&Lt&&typeof global=="object"&&global;
!Dt||Dt.global!==Dt&&Dt.window!==Dt&&Dt.self!==Dt||(Bt=Dt);var Dt=Lt&&Lt.exports===zt&&zt,Mt=w();typeof define=="function"&&typeof define.amd=="object"&&define.amd?(Bt._=Mt, define(function(){return Mt})):zt&&Lt?Dt?(Lt.exports=Mt)._=Mt:zt._=Mt:Bt._=Mt}).call(this);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
/*
 * JavaScript MD5 1.0.1
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 *
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*jslint bitwise: true */
/*global unescape, define */

(function ($) {
    'use strict';

    /*
    * Add integers, wrapping at 2^32. This uses 16-bit operations internally
    * to work around bugs in some JS interpreters.
    */
    function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    /*
    * Bitwise rotate a 32-bit number to the left.
    */
    function bit_rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    /*
    * These functions implement the four basic operations the algorithm uses.
    */
    function md5_cmn(q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
    }
    function md5_ff(a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }
    function md5_gg(a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }
    function md5_hh(a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5_ii(a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    /*
    * Calculate the MD5 of an array of little-endian words, and a bit length.
    */
    function binl_md5(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var i, olda, oldb, oldc, oldd,
            a =  1732584193,
            b = -271733879,
            c = -1732584194,
            d =  271733878;

        for (i = 0; i < x.length; i += 16) {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;

            a = md5_ff(a, b, c, d, x[i],       7, -680876936);
            d = md5_ff(d, a, b, c, x[i +  1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i +  2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i +  3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i +  4],  7, -176418897);
            d = md5_ff(d, a, b, c, x[i +  5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i +  6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i +  7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i +  8],  7,  1770035416);
            d = md5_ff(d, a, b, c, x[i +  9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i + 12],  7,  1804603682);
            d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i + 15], 22,  1236535329);

            a = md5_gg(a, b, c, d, x[i +  1],  5, -165796510);
            d = md5_gg(d, a, b, c, x[i +  6],  9, -1069501632);
            c = md5_gg(c, d, a, b, x[i + 11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i],      20, -373897302);
            a = md5_gg(a, b, c, d, x[i +  5],  5, -701558691);
            d = md5_gg(d, a, b, c, x[i + 10],  9,  38016083);
            c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i +  4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i +  9],  5,  568446438);
            d = md5_gg(d, a, b, c, x[i + 14],  9, -1019803690);
            c = md5_gg(c, d, a, b, x[i +  3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i +  8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i + 13],  5, -1444681467);
            d = md5_gg(d, a, b, c, x[i +  2],  9, -51403784);
            c = md5_gg(c, d, a, b, x[i +  7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

            a = md5_hh(a, b, c, d, x[i +  5],  4, -378558);
            d = md5_hh(d, a, b, c, x[i +  8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i + 11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i +  1],  4, -1530992060);
            d = md5_hh(d, a, b, c, x[i +  4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i +  7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i + 13],  4,  681279174);
            d = md5_hh(d, a, b, c, x[i],      11, -358537222);
            c = md5_hh(c, d, a, b, x[i +  3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i +  6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i +  9],  4, -640364487);
            d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i + 15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i +  2], 23, -995338651);

            a = md5_ii(a, b, c, d, x[i],       6, -198630844);
            d = md5_ii(d, a, b, c, x[i +  7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i +  5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i + 12],  6,  1700485571);
            d = md5_ii(d, a, b, c, x[i +  3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i +  1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i +  8],  6,  1873313359);
            d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i +  6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i + 13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i +  4],  6, -145523070);
            d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i +  2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i +  9], 21, -343485551);

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    }

    /*
    * Convert an array of little-endian words to a string
    */
    function binl2rstr(input) {
        var i,
            output = '';
        for (i = 0; i < input.length * 32; i += 8) {
            output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
        }
        return output;
    }

    /*
    * Convert a raw string to an array of little-endian words
    * Characters >255 have their high-byte silently ignored.
    */
    function rstr2binl(input) {
        var i,
            output = [];
        output[(input.length >> 2) - 1] = undefined;
        for (i = 0; i < output.length; i += 1) {
            output[i] = 0;
        }
        for (i = 0; i < input.length * 8; i += 8) {
            output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
        }
        return output;
    }

    /*
    * Calculate the MD5 of a raw string
    */
    function rstr_md5(s) {
        return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
    }

    /*
    * Calculate the HMAC-MD5, of a key and some data (raw strings)
    */
    function rstr_hmac_md5(key, data) {
        var i,
            bkey = rstr2binl(key),
            ipad = [],
            opad = [],
            hash;
        ipad[15] = opad[15] = undefined;
        if (bkey.length > 16) {
            bkey = binl_md5(bkey, key.length * 8);
        }
        for (i = 0; i < 16; i += 1) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
    }

    /*
    * Convert a raw string to a hex string
    */
    function rstr2hex(input) {
        var hex_tab = '0123456789abcdef',
            output = '',
            x,
            i;
        for (i = 0; i < input.length; i += 1) {
            x = input.charCodeAt(i);
            output += hex_tab.charAt((x >>> 4) & 0x0F) +
                hex_tab.charAt(x & 0x0F);
        }
        return output;
    }

    /*
    * Encode a string as utf-8
    */
    function str2rstr_utf8(input) {
        return unescape(encodeURIComponent(input));
    }

    /*
    * Take string arguments and return either raw or hex encoded strings
    */
    function raw_md5(s) {
        return rstr_md5(str2rstr_utf8(s));
    }
    function hex_md5(s) {
        return rstr2hex(raw_md5(s));
    }
    function raw_hmac_md5(k, d) {
        return rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d));
    }
    function hex_hmac_md5(k, d) {
        return rstr2hex(raw_hmac_md5(k, d));
    }

    function md5(string, key, raw) {
        if (!key) {
            if (!raw) {
                return hex_md5(string);
            }
            return raw_md5(string);
        }
        if (!raw) {
            return hex_hmac_md5(key, string);
        }
        return raw_hmac_md5(key, string);
    }

    if (typeof define === 'function' && define.amd) {
        define(function () {
            return md5;
        });
    } else {
        $.md5 = md5;
    }
}(this));
},{}],9:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof self !== "undefined") {
        self.Q = definition();

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function(prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected() {
            pendingCount--;
            if (pendingCount === 0) {
                deferred.reject(new Error(
                    "Can't get fulfillment value from any promise, all " +
                    "promises were rejected."
                ));
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function() {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});
}).call(this,require('_process'))
},{"_process":11}],10:[function(require,module,exports){
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
},{"./gmail.js":1,"./gmailui.js":3,"./keyvalue.js":4,"./lib/bacon.min.js":5,"./lib/jquery.min.js":6,"./lib/q.js":9,"./trello.js":12}],11:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],12:[function(require,module,exports){
$ = require('./lib/jquery.min.js');
Q = require('./lib/q.js');
_ = require('./lib/lodash.min.js');

function serialize(obj) {
  var str = [];
  for(var p in obj)
     str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
  return str.join("&");
}

function openPopup(path){
    var width = 420;
    var height = 470;
    var left = window.screenX + (window.innerWidth - width) / 2;
    var top = window.screenY + (window.innerHeight - height) / 2;

    window.open(path, 'Trello', 'width=' + width + ',height='+ height +', left=' + left + ',top=' + top);
}

function Trello(opts){
    opts = opts || {};
    this.key = opts.key;
    if(window.localStorage.GMAIL_TO_TRELLO_TOKEN){
        this.token = window.localStorage.GMAIL_TO_TRELLO_TOKEN;
    }

    this.VERSION = 1;
    this.BASE_URL = 'https://trello.com/' + this.VERSION;
}

Trello.prototype.setKey = function(key){
    this.key = key;
}

Trello.prototype.setToken = function(token){
    this.token = token;
    window.localStorage.GMAIL_TO_TRELLO_TOKEN = this.token;
}

Trello.prototype._request = function(method, path, args){
    path = this.BASE_URL + path;
    var deferred = Q.defer();
    var req = $.ajax({
        type: method,
        url: path,
        dataType: 'json',
        data: args,
        success: function(data){
            deferred.resolve(data);
        },
        error: function(req, e1, e2){
            deferred.reject(req);
        }
    });
    return deferred.promise;
}

Trello.prototype._authed_request = function(method, path, args){
    if(!this.isAuthorized()){
        throw 'Must be authorized!'
    }
    args = args || {};
    args.key = this.key;
    args.token = this.token;
    return this._request(method, path, args);
}

Trello.prototype.get = function(path, args){
    return this._authed_request('GET', path, args);
}

Trello.prototype.post = function(path, args){
    return this._authed_request('POST', path, args);
}

Trello.prototype.put = function(path, args){
    return this._authed_request('PUT', path, args);
}

Trello.prototype.delete = function(path, args){
    return this._authed_request('DELETE', path, args);
}

Trello.prototype.isAuthorized = function(){
    return !!this.token;
}

Trello.prototype.authorize = function(opts){

    var self = this;
    var deferred = Q.defer();

    opts = opts || {};
    opts.key = opts.key || this.key;
    opts.callback_method = 'postMessage'
    opts.return_url = window.location;

    authPath = BASE_URL + 'authorize?' + serialize(opts);

    openPopup(authPath);

    window.addEventListener('message', function(e){
        if(e.origin === 'https://trello.com' && e.data.length){
            self.setToken(e.data);
            event.source.close();
            deferred.resolve(self);
        };
    });

    return deferred.promise;
}

module.exports = new Trello();
},{"./lib/jquery.min.js":6,"./lib/lodash.min.js":7,"./lib/q.js":9}],13:[function(require,module,exports){
var parseFinnishTimeLocale = function(str){

    // 16. helmikuuta 2015 19.48

    var getMonth = function(month){
        var _months = ['tammi','helmi','maalis','huhti','touko','kesa','heina','elo','syys','loka','marras','joulu']
        for (var i = 0; i < _months.length; i++) {
            if(month.indexOf(_months[i]) === 0){
                return i
            }
        };
        return 0;
    }

    var parts = str.split(' ')

    var day = parts[0].replace('.', '')
    var month = getMonth(parts[1])
    var year = parts[2]
    var hour = parts[3].split('.')[0]
    var minute = parts[3].split('.')[1]

    return new Date(year, month, day, hour, minute);
}

module.exports = {
    parseFinnishTimeLocale: parseFinnishTimeLocale
}
},{}]},{},[10]);
