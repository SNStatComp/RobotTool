/*jslint node: true */
/*
 * Copyright 2013 Statistics Netherlands
 *
 * Licensed under the EUPL, Version 1.1 or – as soon they
 * will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * http://ec.europa.eu/idabc/eupl
 *
 * Unless required by applicable law or agreed to in
 * writing, software distributed under the Licence is
 * distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied.
 * See the Licence for the specific language governing
 * permissions and limitations under the Licence.
 */

'use strict';

var moment = require('moment');

var dateString = [
    'M', 'Mo', 'MM', 'MMM', 'MMMM',
    'Q', 'Qo', 'D', 'Do', 'DD', 'DDD', 'DDDo', 'DDDD',
    'd', 'do', 'dd', 'ddd', 'dddd',
    'e', 'E',
    'w', 'wo', 'ww', 'W', 'Wo', 'WW',
    'YY', 'YYYY', 'Y',
    'gg', 'gggg', 'GG', 'GGGG',
    'A', 'a',
    'H', 'HH',
    'h', 'hh',
    'k', 'kk',
    'm', 'mm',
    's', 'ss', 'S', 'SS', 'SSS',
    'z', 'Z', 'ZZ',
    'X', 'x'];
var dateFormats = {}

dateString.map(function (s) {dateFormats[s] = s})

var toDateObject = function(d) {
    var res = {};
    Object.keys(dateFormats).map(function(key) {
        res[key] = d.format(dateFormats[key])
        var dateObject = d.toObject();
        Object.keys(dateObject).map(function(key) {
            res[key]= dateObject[key]})
    })
    return res;
}
module.exports.toDateObject = toDateObject;
