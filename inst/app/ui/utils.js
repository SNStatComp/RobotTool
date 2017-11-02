/*jslint browser: true*/
/* global $, define, require*/
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
define([], function() {
  var dialogProgress,
    config;

  function setConfig(conf) {
    config = conf;
  }

  function getConfig() {
    return config;
  }

  function getTimestamp(date) {
    return ($.datepicker.formatDate('yy-mm-dd', date) + ":" + date.getHours() + "." + date.getMinutes() + "." + date.getSeconds());
  }

  function getServerError(response) {
    var data = JSON.parse(response.responseText);
    return (data.message);
  };

  function getCurrencyInfo(country) {
    var res;
    if (country == '') {
      res = $.grep(CountryCurrency, function(obj) {
        if (obj.CountryLocale == config.Locale)
          return (obj);
        }
      );
    } else {
      country = country.substr(0, 2);
      res = $.grep(CountryCurrency, function(obj) {
        if (obj.CountryCode == country.toUpperCase())
          return (obj);
        }
      );
    }
    return (res[0]);
  }

  function formatCurrency(n, country) {
    var fnum,
      locale;
    if (country == '') {
      fnum = Globalize.format(n, 'c');
    } else {
      locale = getCurrencyInfo(country)
      fnum = Globalize.format(n, 'c', locale.CountryLocale);
    }
    return (fnum);
  }

  function unformatCurrency(n, country) {
    var fnum,
      locale;
    if (country == '') {
      fnum = Globalize.parseFloat(n);
    } else {
      locale = getCurrencyInfo(country)
      fnum = Globalize.parseFloat(n, 10, locale.CountryLocale);
    }
    return (fnum);
  };

  function createCurrencyPattern(country) {
    var obj = getCurrencyInfo(country),
      currSym = Globalize.culture(obj.CountryLocale).numberFormat.currency.symbol,
      commaSym = Globalize.culture(obj.CountryLocale).numberFormat.currency[","],
      pointSym = Globalize.culture(obj.CountryLocale).numberFormat.currency["."],
      currSymPos = Globalize.culture(obj.CountryLocale).numberFormat.currency.pattern[1],
      pattern;

    if ((currSymPos == "$n") || (currSymPos == "$ n")) {

      pattern = new RegExp("((\\" + currSym + "|\\beuro?\\b|\\bE\\b)" + "[\\s]*\\d+((\\" + commaSym + "|\\s)\\d{3})*(\\" + pointSym + "(\\d{1,2}|-))?)", "gmi");

    } else {

      pattern = new RegExp("(\\d+((\\" + commaSym + "|\\s)\\d{3})*(\\" + pointSym + "\\d{1,2})?" + "[\\s]*(\\" + currSym + "|\\beuro?\\b|\\bE\\b)" + ")", "gmi");

    }
    return (pattern);
  }

  function highlightPrice(s, country) {
    var pattern,
      t;
    pattern = createCurrencyPattern(country);
    t = s.replace(pattern, '<strong>$1</strong>');
    return (t);
  }
  return {
    dialogProgress: dialogProgress,
    getConfig: getConfig,
    setConfig: setConfig,
    getTimestamp: getTimestamp,
    getServerError: getServerError,
    getCurrencyInfo: getCurrencyInfo,
    formatCurrency: formatCurrency,
    unformatCurrency: unformatCurrency,
    highlightPrice: highlightPrice
  }
});
