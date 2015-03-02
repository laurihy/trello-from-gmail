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