/*jslint node: true */

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

require('chromedriver');

var webdriver = require('selenium-webdriver'),
    until = webdriver.until,
    Key = webdriver.Key,
    chrome = require('selenium-webdriver/chrome'),
    db = require('./robotDB.js'),
    toDateObject = require('./utils.js').toDateObject,
    async = require('async'),
    config = require('../app/config/config.json'),
    driver,
    cheerio = require('cheerio'),
    context = '',
    io,
    fs = require('fs'),
    moment = require('moment'),
    mustache = require('mustache'),
    capabilities = webdriver.Capabilities.chrome(),
    Downloader = require('downloader'),
    hasha = require('hasha'),
    downloader = new Downloader();

moment.locale('nl');

var options = new chrome.Options;

options.addArguments(['headless','disable-gpu','silent','log-level=3']);

driver = new webdriver
    .Builder()
    .withCapabilities(capabilities)
    .setChromeOptions(options)
    .build();

var init = function(server) {
    io = require('socket.io')(server);
};

var addContext = function(text) {
    if (context == '') {
        context = text;
    } else {
        context += '<hr>' + text;
    }
    return '';
}

var processLink = function(el) {
    return el.getText().then(function(text) {
        addContext(text);
        el.getTagName().then(function(tag) {
            if (tag == 'iframe') {
                driver.switchTo().frame(el);
            } else {
              el.getAttribute('href').then(
                function (val) {
                  if (val !== null && val.indexOf('javascript:__doPostBack') > -1) {
                    driver.executeScript(val);
                  } else {
                    el.isDisplayed().then(
                      function (displayed) {
                        if (displayed) {
                          el.click();
                        } else {
                          driver.get(val);
                        }
                      });
                    };
                });
            };
        });
    });
}

var processLink_oud = function(el) {
    return el.getText().then(function(text) {
        addContext(text);
        el.getAttribute('href').then(function(val) {
            if (val) {
                if (val.indexOf('javascript:__doPostBack') > -1) {
                    driver.executeScript(val);
                } else {
                    el.isDisplayed().then(function(displayed) {
                        if (displayed) {
                            el.click();
                        } else {
                            el.getAttribute('href').then(function(href) {
                                driver.get(href);
                            });
                        }
                    });
                }
            } else {
                el.getTagName().then(function(tag) {
                    if (tag == 'iframe') {
                        driver.switchTo().frame(el);
                    }
                });
            }
        });
    });
}

var processClick = function(el) {
    el.getText().then(function(text) {
        addContext(text);
        el.getAttribute('type').then(function(val) {
            if (val == 'submit') {
                return el.submit();
            } else {
                return el.click();
            }
        })
    })
}

var processInput = function(el, parameter) {
    addContext('[' + parameter + ']');
    return driver.wait(until.elementIsVisible(el), 1000).then(function(elt) {
        if (parameter != '') {
            elt.click();
            elt.clear();
            elt.sendKeys(parameter, Key.ENTER);
        } else {
            elt.sendKeys(Key.ENTER);
        }
    });
}

var processWait = function(el, path, parameter) {
    parameter = parameter
        ? parameter
        : 10000;
    if (path == 'html') {
        return driver.sleep(Number(parameter));
    } else {
        return driver.wait(until.elementIsVisible(el), Number(parameter));
    }
}

var processContext = function(el) {
    return el.getAttribute('outerHTML').then(function(html) {
        var $ = cheerio.load(html, {normalizeWhitespace: true});
        var text = $.root().text();
        addContext(text);
    });
}

var processSubmit = function(el, path, parameter) {
    addContext('[' + parameter + ']')
    el.sendKeys(parameter);
    return driver.wait(until.elementLocated({'xpath': "id('__EVENTTARGET')"}), 1000).then(function(res) {
        driver.findElement({
            'xpath': path + "/ancestor::form//*[starts-with(@href,'javascript:__doPostBack')]"
        }).then(function(el) {
            el.getAttribute('href').then(function(val) {
                driver.executeScript(val);
            });
        });
    }, function(err) {
        el.sendKeys(webdriver.Key.RETURN);
    });
}

var processMouseMove = function(el) {
    driver.actions().mouseMove({x: 0, y: 0}).mouseMove(el).perform();
    return driver.wait(until.elementIsVisible(el), 10000);
}

var rasterize = function() {
    var page = this;
    var output = arguments[0];
    page.viewportSize = {
        width: 1920,
        height: 1024
    };
    page.render(output);
};

var processScreenshot = function(url) {
    var timeScreenshot = moment().format('YYYYMMDD-HHmmss');
    driver.getPageSource().then(function(source) {
        fs.writeFileSync('screenshot/' + timeScreenshot + 'screenshot.html', source)
    });
    driver.takeScreenshot().then(function(base64png) {
      fs.writeFileSync('./screenshot/' + timeScreenshot + 'screenshot.png', new Buffer(base64png, 'base64'));
    });
}

var downloadFile = function(observationDate, source_id, url) {
    return downloader.fromURL(url, './downloadedFiles/' + observationDate + '-' + source_id).then(function(file) {
        return hasha.fromFileSync(file, {algorithm: 'sha256'})
    });
}

var getUrl = function(el, source_id, parameter) {
    if (parameter == '') {
        return el.getTagName().then(function(tagName) {
            switch (tagName) {
                case 'a':
                    return el.getAttribute('href');
                    break;
                case 'img':
                    return el.getAttribute('src');
                    break;
            }
        });
    } else {
        switch (parameter) {
            case 'url':
                return driver.getCurrentUrl();
                break;
            case 'text':
                return el.getText();
                break;
            default:
                return el.getAttribute(parameter);
                break;
        };
    };
}

var processDownload = function(el, source_id, parameter) {
    getUrl(el, source_id, parameter).then(function(url) {
        addContext('<a href="' + url + '" target="_blank">' + url + '</a>');
        var observationDate = moment().format('YYYYMMDD');
        driver.call(downloadFile, start, observationDate, source_id, url).then(function(hash) {
            driver.call(addContext, start, '<hr>' + hash);
        })
    });
}

var uploadFile = function() {
  var page = this;
  var path = arguments[0];
  var file = arguments[1];

  page.uploadFile(path, file);
}

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
        console.log(err);
        throw('Date: cannot compute date')
    };
    return dateComputed
}

var render = function(template, param) {
    var view = {
        d: param
    }
    return mustache.render(template, view);
}

var nextUrl = function(sourcePath, source_id, index, callback) {
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

    io.emit('step', {'index': index});
    driver.wait(until.elementLocated({'xpath': path}), 10000).then(function(el) {
        switch (sourcePath.step_type) {
            case 'CL':
                processClick(el);
                break;
            case 'L':
                processLink(el);
                break;
            case 'I':
                processInput(el, parameter);
                break;
            case 'C':
                processContext(el);
                break;
            case 'M':
                processMouseMove(el);
                break;
            case 'S':
                processSubmit(el, path, parameter);
                break;
            case 'A':
                processScreenshot();
                break;
            case 'W':
                processWait(el, path, parameter);
                break;
            case 'D':
                processDownload(el, source_id, parameter);
                break;
// upload not working yet (bug in PhantomJS?)
// reminder: Add 'U:Upload' to translation files when working
//            case 'U':
//                processUpload(path, parameter);
//                break;
        }
    }, function(err) {
        addContext('timeout - steptype: ' + sourcePath.step_type + ' xpath: ' + path)
        throw context;
    });
};

var processSource = function(sourceInfo, callback) {
    context = '';
    driver.manage().deleteAllCookies();
    driver.manage().window().setSize(1600,900);
    driver.manage().window().maximize();
    var pageLoadTimeout = config.pageLoadTimeout || 100000;
    driver.manage().timeouts().pageLoadTimeout(pageLoadTimeout);
    io.emit('source', {
        'message': sourceInfo.name,
        'source': sourceInfo.source,
        'index': sourceInfo.index
    });
    io.emit('processPath', {
        'totalSteps': sourceInfo.path.length,
        'index': 0
    });
    driver.get(sourceInfo.url).then(function() {
        driver.call(function() {
            for (var i=0; i < sourceInfo.path.length; i++) {
                driver.call(nextUrl, start, sourceInfo.path[i], sourceInfo.source_id, i + 1, callback);
              }
        }, start).then(function() {
            var r = {
                source_id: sourceInfo.source_id,
                context: context,
                url: '',
                error: false
            };
            driver.getCurrentUrl().then(function(url) {
                r.url = url;
                callback(r);
            }, function(err) {
                r.url = '';
                callback(r);
            });
        }, function(err) {
            if (err) {
                var context = String(err),
                    r = {
                        source_id: sourceInfo.source_id,
                        context: context,
                        error: true
                    };
                driver
                  .getCurrentUrl()
                  .then(
                    function(url) {
                      r.url = url;
                      callback(r);
                    },
                    function(err) {
                    r.url = '';
                    callback(r);
                  });
            }
        });
    }, function(err) {
        var context = String(err),
            r = {
                source_id: sourceInfo.source_id,
                context: context,
                error: true,
                url: sourceInfo.url
            };
        callback(r);
    });
};

var processSourceById = function(args) {
    var source = args[0],
        step_no = args[1],
        index = args[2],
        callback = args[3];
    driver.call(db.getSourceInfo, start, source.source_id, source.productgroup_id, step_no, function(sourceInfo) {
        sourceInfo.index = index;
        return driver.call(processSource, start, sourceInfo, callback);
    });
};

var processProductgroup = function(args) {
    var productgroups = args[0],
        callback = args[1],
        finalFunc = args[2],
        index = -1;
    driver.call(db.getSourceIds, start, productgroups, function(sources) {
        io.emit('processPG', {totalSources: sources.length});
        async.eachSeries(sources, function(source, cb) {
            index += 1;
            processSourceById([
                source,
                0,
                index,
                function(result) {
                    setImmediate(callback, result);
                    setImmediate(cb);
                }
            ]);
        }, finalFunc);
    });
};

var start = function(fun, args) {

    driver.call(fun, start, args);
};

module.exports.init = init;
module.exports.start = start;
module.exports.processSourceById = processSourceById;
module.exports.processProductgroup = processProductgroup;
