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