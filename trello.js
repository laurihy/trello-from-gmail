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