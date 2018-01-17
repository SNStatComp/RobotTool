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
  initWebData = require('./webData.js').init,
  open = require('opn'),
  fs = require('fs'),
  mkdirp = require('mkdirp'),
  envPaths = require('env-paths'),
  path = require('path'),
  paths = envPaths('Robottool'),
  config,
  userconfig = require('./../app/config/config.json');

  if (userconfig.mode === 'server') {
    // Robottool is installed globally
    if (!fs.existsSync(paths.config + '/config.json')) {
      // user starts Robottool for the first time
      mkdirp.sync(paths.config);
      mkdirp.sync(paths.data);
      mkdirp.sync(paths.data + '/downloadedFiles');
      mkdirp.sync(paths.data + '/screenshot');
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
      switch (qry.action) {
        case 'getProductgroup':
          robotDB.getProductgroup(
            qry,
            function (result) {
              if (qry.element == 'select') {
                res.end(result);
              } else {
                res.end(JSON.stringify(result));
              }
            });
          break;
        case 'updateProductgroup':
          robotDB.updateProductgroup(
            qry,
            function (result) {
              res.statusCode = result.statusCode;
              res.end(JSON.stringify(result));
            });
          break;
        case 'getSource':
          robotDB.getSource(
            qry,
            function (result) {
              res.end(JSON.stringify(result));
            });
          break;
        case 'updateSource':
          robotDB.updateSource(
            qry,
            function (result) {
              res.statusCode = result.statusCode;
              res.end(JSON.stringify(result));
            });
          break;
        case 'getSourcePath':
          robotDB.getSourcePath(
            qry,
            function (result) {
              res.end(JSON.stringify(result));
            });
          break;
        case 'updateSourcePath':
          robotDB.updateSourcePath(
            qry,
            function (result) {
              res.statusCode = result.statusCode;
              res.end(JSON.stringify(result));
            });
          break;
        case 'getObservation':
          robotDB.getObservation(
            qry,
            function (result) {
              res.end(JSON.stringify(result));
            });
          break;
        case 'updateObservation':
          robotDB.updateObservation(
            qry,
            function (result) {
              res.statusCode = result.statusCode;
              res.end(JSON.stringify(result));
            });
          break;
        case 'getWebInfo':
          robotDB.getWebInfo(
            qry,
            function (result) {
              res.end(JSON.stringify(result));
            });
          break;
        case 'exportObservations':
          robotDB.exportObservations(
            qry,
            function (result) {
              res.end(result);
            });
          break;
        case 'setObservation':
          robotDB.setObservation(
            qry,
            function (result) {
              res.end(result);
            });
          break;
        case 'exportConfiguration':
          robotDB.exportConfiguration(
            qry,
            function (result) {
              res.end(result);
            });
          break;
        case 'importConfiguration':
          robotDB.importConfiguration(
            qry,
            function (result) {
              res.end(result);
            });
          break;
        case 'chart':
          robotDB.chartData(
            qry,
            function (result) {
              res.end(JSON.stringify(result));
            });
          break;
        case 'getConfig':
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

if (config.port) {
  server.listen(
    config.port,
    function () {
      open('http://localhost:' + config.port, {app: config.Browser});
    }
  );
} else {
  server.listen(
    0,
    function () {
      open('http://localhost:' + config.port, {app: config.Browser});
    }
  );
}

robotDB.init(paths, config);
initWebData(server, config);
