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

var connect = require('connect'),
  serveStatic = require('serve-static'),
  bodyParser = require('body-parser'),
  url = require('url'),
  qs = require('qs'),
  http = require('http'),
  robotDB = require('./robotDB.js'),
  webData = require('./webData.js'),
  open = require('opn'),
  fs = require('fs'),
  mkdirp = require('mkdirp'),
  envPaths = require('env-paths'),
  path = require('path'),
  paths = envPaths('Robottool'),
  config,
  userconfig = require('./../app/config/config.json'),
  serverMessages = require('./../app/locales/translation-' + userconfig.Language + '.json').Server;

  if (userconfig.mode === 'server') {
    // Robottool is installed globally
    if (!fs.existsSync(paths.config + '/config.json')) {
      // user starts Robottool for the first time
      mkdirp.sync(paths.config);
      mkdirp.sync(paths.data);
      fs.copyFileSync('./inst/app/config/config.json', paths.config + '/config.json');
      fs.copyFileSync('./inst/server/db/observationDB.sqlite', paths.data + '/observationDB.sqlite');
    }
    config = require(paths.config + '/config.json');
  } else {
    // Robottool is installed locally
    config = require('./../app/config/config.json');
  }

var app = connect()
  .use(serveStatic(__dirname + '/../app'))
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .use(bodyParser.json())
  .use(function (req, res) {
    var qry;
    try {
      if (req.method == 'POST') {
        qry = req.body;
      } else {
        qry = qs.parse(url.parse(req.url).query);
      }
      //console.log(qry)
      switch (qry.action) {
        case 'getProductgroup':
          robotDB.getProductgroup(
            qry).then(
              function (result) {
                res.writeHead(200, {'Content-Type': 'application/json'})
                if (qry.element == 'select') {
                  res.end(result);
                } else {
                  res.end(JSON.stringify(result));
                }
              });
          break;
        case 'updateProductgroup':
          robotDB.updateProductgroup(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.statusCode = result.statusCode;
              res.end(JSON.stringify(result));
            });
          break;
        case 'getSource':
          robotDB.getSource(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.end(JSON.stringify(result));
            });
          break;
        case 'updateSource':
          robotDB.updateSource(
            qry).then(
            function (result) {
              res.writeHead(result.statusCode, {'Content-Type': 'application/json'})
              res.statusCode = result.statusCode;
              res.end(JSON.stringify(result));
            });

          break;
        case 'getSourcePath':
          robotDB.getSourcePath(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.end(JSON.stringify(result));
            });
          break;
        case 'updateSourcePath':
          robotDB.updateSourcePath(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.statusCode = result.statusCode;
              res.end(JSON.stringify(result));
            });
          break;
        case 'getObservation':
          robotDB.getObservation(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.end(JSON.stringify(result));
            });
          break;
        case 'updateObservation':
          robotDB.updateObservation(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.statusCode = result.statusCode;
              res.end(JSON.stringify(result));
            });
          break;
        case 'getWebInfo':
          robotDB.getWebInfo(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.end(JSON.stringify(result));
            });
          break;
        case 'exportObservations':
          robotDB.exportObservations(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'text/plain'})
              res.end(result);
            });
          break;
        case 'setObservation':
          robotDB.setObservation(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'text/plain'})
              res.end(result);
            });
          break;
        case 'exportConfiguration':
          robotDB.exportConfiguration(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'text/plain'})
              res.end(result);
            });
          break;
        case 'importConfiguration':
          robotDB.importConfiguration(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'text/plain'})
              res.end(result);
            });
          break;
        case 'chart':
          robotDB.chartData(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.end(JSON.stringify(result));
            });
          break;
        case 'getMetrics':
          robotDB.getMetrics(
            qry).then(
            function (result) {
              res.writeHead(200, {'Content-Type': 'application/json'})
              res.end(JSON.stringify(result));
            });
          break;
          case 'getTaxrate':
            robotDB.getTaxrate(
              qry).then(
              function (result) {
                res.writeHead(200, {'Content-Type': 'application/json'})
                res.end(JSON.stringify(result));
              });
            break;
          case 'updateTaxrate':
            //console.log(qry)
            robotDB.updateTaxrate(
              qry).then(
              function (result) {
                res.writeHead(200, {'Content-Type': 'application/json'})
                res.end(JSON.stringify(result));
              });
            break;
        case 'getConfig':
          res.writeHead(200, {'Content-Type': 'application/json'})
          res.end(JSON.stringify(config));
          break;
        default:
          res.end('');
      }
    } //end try
    catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify(err));
    }
  });

var server = http.createServer(app);
server.timeout = 0;

server.listen(
  config.port || 0,
  function () {
    if (config.Browser) {
      open('http://localhost:' + server.address().port, {app: config.Browser})
      .catch(function (err) {
        //console.log(serverMessages.NoBrowser + config.Browser)
        server.close()
      });
    } else {
      open('http://localhost:' + server.address().port)
    }
  }
);

robotDB.init(paths, config);
webData.init(server, config);
