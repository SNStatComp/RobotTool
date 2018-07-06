/* jslint node: true */

/*
 * Copyright 2014 Statistics Netherlands
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

"use strict";

var webdriver = require('selenium-webdriver'),
    until = webdriver.until,
    Key = webdriver.Key,
    db = require('./robotDB.js'),
    toDateObject = require('./utils.js').toDateObject,
    async = require('async'),
    driver,
    cheerio = require('cheerio'),
    context = '',
    io,
    config,
    appdata,
    fs = require('fs'),
    moment = require('moment'),
    mustache = require('mustache'),
    capabilities = webdriver.Capabilities.chrome(),
    Downloader = require('downloader'),
    hasha = require('hasha'),
    envPaths = require('env-paths'),
    paths = envPaths('Robottool'),
    downloader = new Downloader();

moment.locale('nl');

var init = function(server, cfg) {
    config = cfg;
    if (config.mode == 'server') {
      appdata = paths.data;
    } else {
      appdata = '.';
    }
    if (config.Headless == 'chrome') {
      require('chromedriver');
      var chrome = require('selenium-webdriver/chrome'),
        options = new chrome.Options;
      //var pdf = __dirname + '/../lib/oemmndcbldboiebfnladdacbdfmadadm/2.0.466_0'
      options.addArguments(['headless','disable-gpu','silent','log-level=3']);

      // driver = new webdriver
      //     .Builder()
      //     .withCapabilities(capabilities)
      //     .setChromeOptions(options)
      //     .build();
      let service = new chrome.ServiceBuilder()
        .loggingTo('./debug.txt')
        .enableVerboseLogging()
        .build();

      driver = chrome.Driver.createSession(options, service)
    } else {
      require('geckodriver');
      var firefox = require('selenium-webdriver/firefox'),
        options = new firefox.Options;
      options.headless();
//      options.addArguments("-headless")
      driver = new webdriver
          .Builder()
          .forBrowser('firefox')
          .setFirefoxOptions(options)
          .build();
    }
    if ((config.proxy) && (config.proxy != '')) {
       capabilities.setProxy({
         proxyType: "manual",
         httpProxy: config.proxy,
         sslProxy: config.proxy
       })
    }
    io = require('socket.io')(server);
};

var emitProgress = function(message, value) {
    io.emit(message, value)
}

var addContext = function(text) {
  if (context == '') {
    context = text;
  } else {
    context += '<hr>' + text;
  }
  return '';
}

var processLink = function* (el) {
  const text = yield el.getText()
  addContext(text);
  const tag = yield el.getTagName()
  if (tag == 'iframe') {
    yield driver.switchTo().frame(el);
  } else {
    const val = yield el.getAttribute('href')
    if (val !== null && val.indexOf('javascript:__doPostBack') > -1) {
      yield driver.executeScript(val);
    } else {
      const displayed = yield el.isDisplayed()
      if (displayed) {
        yield el.click();
      } else {
        yield driver.get(val);
      }
    };
  };
}

var processClick = function* (el) {
  const text = yield el.getText()
  addContext(text);
  const val = yield el.getAttribute('type')
  if (val == 'submit') {
    yield el.submit();
  } else {
    yield el.click();
  }
}

var processInput = function* (el, parameter) {
  addContext('[' + parameter + ']');
  yield driver.wait(until.elementIsVisible(el), 1000)
  if (parameter != '') {
    yield el.click();
    yield el.clear();
    yield el.sendKeys(parameter, Key.ENTER);
  } else {
    yield el.sendKeys(Key.ENTER);
  }
}

var processWait = function* (el, path, parameter) {
  parameter = parameter ? parameter : 10000;
  if (path == 'html') {
    yield driver.sleep(Number(parameter));
  } else {
    yield driver.wait(until.elementIsVisible(el), Number(parameter));
  }
}

var processContext = function* (el) {
  const html = yield el.getAttribute('outerHTML')
  const $ = cheerio.load(html, {normalizeWhitespace: true});
  const text = $.root().text();
  addContext(text);
}

var processSubmit = function* (el, path, parameter) {
  addContext('[' + parameter + ']')
  yield el.sendKeys(parameter);
  yield driver.wait(until.elementLocated({'xpath': "id('__EVENTTARGET')"}), 1000).then(function*(res) {
    const el = yield driver.findElement({
      'xpath': path + "/ancestor::form//*[starts-with(@href,'javascript:__doPostBack')]"
    })
    const val = yield el.getAttribute('href')
    yield driver.executeScript(val);
  }).catch(function*(err) {
    yield el.sendKeys(webdriver.Key.RETURN);
  });
}

var processMouseMove = function* (el) {
  yield driver.actions().mouseMove({x: 0, y: 0}).mouseMove(el).perform();
  yield driver.wait(until.elementIsVisible(el), 10000);
}

var processScreenshot = function* () {
  const timeScreenshot = moment().format('YYYYMMDD-HHmmss')
  if (!(fs.existsSync('./screenshot'))) {
    fs.mkdirSync('./screenshot');
  }
  const source = yield driver.getPageSource()
  fs.writeFileSync('./screenshot/' + timeScreenshot + 'screenshot.html', source)
  // const url = yield driver.getCurrentUrl()
  // const chromePath = findChrome()
  // RenderPDF.generateSinglePdf(
  //   url,
  //   './screenshot/' + timeScreenshot + 'screenshot.pdf',
  //   {'chromeBinary': chromePath}
  // )
  const base64png = yield driver.takeScreenshot()
  fs.writeFileSync('./screenshot/' + timeScreenshot + 'screenshot.png', new Buffer(base64png, 'base64'))
}

var downloadFile = function* (observationDate, source_id, url) {
  if (!(fs.existsSync('./downloadedFiles'))) {
    fs.mkdirSync('./downloadedFiles');
  }
  var file = yield downloader.fromURL(url, './downloadedFiles/' + observationDate + '-' + source_id)
  return hasha.fromFileSync(file, {algorithm: 'sha256'})
}

var getUrl = function* (el, source_id, parameter) {
  let val;
  if (parameter == '') {
    const tagName = yield el.getTagName()
    switch (tagName) {
      case 'a':
        val = yield el.getAttribute('href');
        break;
      case 'img':
        val = yield el.getAttribute('src');
        break;
    }
  } else {
    switch (parameter) {
      case 'url':
        val = yield driver.getCurrentUrl();
        break;
      case 'text':
        val = yield el.getText();
        break;
      default:
        val = yield el.getAttribute(parameter);
        break;
    };
  };
  return val;
}

var processDownload = function* (el, source_id, parameter) {
  const url = yield* getUrl(el, source_id, parameter)
  addContext('<a href="' + url + '" target="_blank">' + url + '</a>')
  const observationDate = moment().format('YYYYMMDD');
  const hash = yield* downloadFile(observationDate, source_id, url)
  addContext(hash);
}

// var uploadFile = function() {
//   var page = this;
//   var path = arguments[0];
//   var file = arguments[1];
//
//   page.uploadFile(path, file);
// }

var processUpload = function(path, parameter) {
  //  return driver.executePhantomJS(uploadFile, path, parameter)
}

var createDate = function(exp) {
  try {
    var m = moment(),
      dateComputed;
    if (exp) {
      if (exp.indexOf('format') > -1) {
        dateComputed = eval('m.' + exp)
      } else {
        exp = 'toDateObject(m.' + exp + ')';
        dateComputed = eval(exp);
      }
    } else {
      dateComputed = toDateObject(moment());
    }
  } catch (err) {
    throw('Date: cannot compute date')
  };
  return dateComputed
}

var render = function(template, param) {
  const view = {
    d: param
  }
  return mustache.render(template, view);
}

var nextUrl = function* (sourcePath, source_id, index) {
  var parameter = sourcePath.parameter;
  if (parameter === null) {
    parameter = '';
  }
  if (parameter.indexOf('$d.') > -1) {
    parameter = createDate(parameter.replace('$d.', ''));
  }

  var path;
  if (sourcePath.path == '') {
    path = 'html';
  } else {
    path = sourcePath.path.replace(/x:/g, '');
  }

  if (path.indexOf('{{d') > -1) {
    path = render(path, parameter);
  }

  emitProgress('step', {'index': index});
  try {
    driver.manage().deleteAllCookies()
  }
  catch (err) {
    addContext('webdriver crashed')
    throw context
  }
  yield driver.wait(until.elementLocated({'xpath': path}), 10000).then(function* (el) {
    switch (sourcePath.step_type) {
      case 'CL':
        yield* processClick(el);
        break;
      case 'L':
        yield* processLink(el);
        break;
      case 'I':
        yield* processInput(el, parameter);
        break;
      case 'C':
        yield* processContext(el);
        break;
      case 'M':
        yield* processMouseMove(el);
        break;
      case 'S':
        yield* processSubmit(el, path, parameter);
        break;
      case 'A':
        yield* processScreenshot();
        break;
      case 'W':
        yield* processWait(el, path, parameter);
        break;
      case 'D':
        yield* processDownload(el, source_id, parameter);
        break;
        // upload not working yet (bug in PhantomJS?)
        // reminder: Add 'U:Upload' to translation files when working
        //            case 'U':
        //                processUpload(path, parameter);
        //                break;
    }
  })
  .catch(function(err) {
//    console.log(err)
    addContext('timeout - steptype: ' + sourcePath.step_type + ' xpath: ' + path)
    throw(err)
  });
};

var processSource = function* (sourceInfo) {
  const pageLoadTimeout = config.pageLoadTimeout || 100000;
  try {
    driver.manage().timeouts().pageLoadTimeout(pageLoadTimeout);
  }
  catch (err) {

  }
  context = '';
  var r = yield driver.get(sourceInfo.url)
    .then(function* () {
      try {
        for (var [index, path] of sourceInfo.path.entries()) {
          yield* nextUrl(path, sourceInfo.source_id, index + 1)
        }
        var r = {
          source_id: sourceInfo.source_id,
          context: context,
          url: '',
          error: false
        };
        r.url = yield driver.getCurrentUrl()
          .then(function(url) { return url; })
          .catch(function(err) { return ''; });
        return r
      } catch (err) {
          context = String(err);
          var r = {
            source_id: sourceInfo.source_id,
            context: context,
            error: true
          };
        r = yield driver.getCurrentUrl()
          .then(function(url) {
            r.url = url;
            return r;
          })
          .catch(function(err) {
            r.url = '';
            return r;
          });
        return r;
      }
    })
    .catch(function (err) {
        context = String(err)
        var r = {
          source_id: sourceInfo.source_id,
          context: context,
          error: true,
          url: sourceInfo.url
        };
        return r;
    });
  return r;
};

module.exports.init = init;
module.exports.processSource = processSource;
module.exports.emitProgress = emitProgress;
//module.exports.isWebserviceRunning = isWebserviceRunning;
//module.exports.startWebdriver = startWebdriver;
