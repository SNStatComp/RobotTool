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

"use strict";

var
  sqlite3 = require('sqlite3').verbose(),
  db = new sqlite3.Database('./inst/server/db/observationDB.sqlite'),
  csv = require('fast-csv'),
  moment = require('moment'),
  _ = require('lodash'),
  url = require('url'),
  fs = require('fs'),
  async = require('async'),
  userConfig = require('./../app/config/config.json');

var serverMessages = require('./../app/locales/translation-' + userConfig.Language + '.json').Server;

var init = function () {
  var sql = "PRAGMA foreign_keys=1";
  db.run(sql);
};

var getSourceInfoFromDB = function (source_id, productgroup_id, lastStep, callback) {
  var sourceInfo = {},
    sql;
  sourceInfo.source_id = source_id;
  db.get(
    'SELECT * FROM Source ' +
    ' WHERE source_id = "' + source_id + '"',
    function (err, source) {
      sourceInfo.url = source.url;
      sourceInfo.name = source.name;
      sourceInfo.source = source.source;
      if (lastStep == 0) {
        sql =
          'SELECT * FROM SourcePath ' +
          'WHERE source_id = "' + source_id + '" ' +
          'ORDER BY step_no';
      } else {
        sql =
          'SELECT * FROM SourcePath ' + 'WHERE source_id = "' + source_id + '" ' +
          'AND step_no <= ' + lastStep +
          ' ORDER BY step_no';
      }
      db.all(
        sql,
        function (err, paths) {
          sourceInfo.path = paths;
          return callback(sourceInfo);
        });
    });
};

var getSourceIdsFromDB = function (productgroups, callback) {
  var sql = 'SELECT source_id FROM Source WHERE is_active = 1 AND productgroup_id IN (' + productgroups.join(',') + ') ORDER BY productgroup_id';
  db.all(
    sql,
    function (err, sources) {
      return callback(sources);
    });
};

var getProductgroup = function (qry, callback) {
  switch (qry.element) {
    case 'sidebar':
      var sql =
        'SELECT ' +
        '	a.productgroup_id, ' +
        ' a.productgroup, ' +
        '	a.description, ' +
        ' ifnull(a.comment, "") as comment, ' +
        '	ifnull(b.numberOfValues, 0) as numberOfValues, ' +
        '	ifnull(b.numberOfSources,0) as numberOfSources ' +
        'FROM ' +
        '	Productgroup As a ' +
        'LEFT JOIN  ' +
        '	(SELECT Productgroup.productgroup_id, ' +
        '		SUM(CASE WHEN (SourceAdmin.last_observation < 0) THEN 0 ELSE 1 END) AS numberOfValues, ' +
        '		COUNT(Source.source_id) AS numberOfSources ' +
        '	FROM Productgroup LEFT JOIN Source ' +
        '		ON Productgroup.productgroup_id = Source.productgroup_id LEFT JOIN SourceAdmin ' +
        '		ON Source.source_id = SourceAdmin.source_id ' +
        '	WHERE Source.is_active = 1 ' +
        '	GROUP BY Productgroup.productgroup_id ' +
        '	ORDER BY Productgroup.productgroup_id) AS b ' +
        'ON a.productgroup_id = b.productgroup_id ' +
        'ORDER BY a.description';
      db.all(
        sql,
        function (err, productgroups) {
          return callback(productgroups);
        });
      break;
    case 'grid':
      db.all(
        'SELECT productgroup_id, productgroup, description, comment,  1 ' +
        'FROM Productgroup ' +
        'ORDER BY ' + qry.sidx + ' ' + qry.sord,
        function (err, rows) {
          var r = createResultForJQGrid(qry, rows);
          return callback(r);
        });
      break;
    case 'select':
      db.all(
        'SELECT productgroup_id, description ' +
        'FROM Productgroup ' +
        'ORDER BY description',
        function (err, rows) {
          var r = '<select>';
          rows.forEach(function (row) {
            r += '<option value = "' + row.productgroup_id + '">' + row.description + '</option>';
          });
          r += '</select';
          return callback(r);
        });
      break;
    default:
      return callback({});
  }
};

var updateProductgroup = function (qry, callback) {
  var sql = '';
  switch (qry.oper) {
    case 'edit':
      sql =
        'UPDATE Productgroup ' +
        'SET productgroup = "' + qry.productgroup + '",' +
        'description = "' + qry.description + '", ' +
        'comment = "' + qry.comment + '" ' +
        'WHERE productgroup_id = "' + qry.id + '"';
      break;
    case 'add':
      sql =
        'INSERT INTO Productgroup (productgroup, description, comment) ' +
        'VALUES ("' +
        qry.productgroup + '","' +
        qry.description + '","' +
        qry.comment + '")';
      break;
    case 'del':
      sql =
        'DELETE FROM ProductGroup ' +
        'WHERE productgroup_id = "' +
        qry.id + '"';
      break;
  }
  db.run(
    sql,
    function (err) {
      if (!err) {
        if (qry.copyFromProductgroupId != null) {
          // a copy Productgroup action is requested, so the Sources belonging to copyFromProductgroupId
          // has to be copied to the new productgroup.
          var sqlProductgroup = 'SELECT productgroup_id FROM ProductGroup WHERE productgroup = "' + qry.productgroup + '"';
          db.get(
            sqlProductgroup,
            function (err, row) {
              if (!err) {
                var sqlSources = 'SELECT * FROM Source WHERE productgroup_id = "' + qry.copyFromProductgroupId + '"';
                db.all(
                  sqlSources,
                  function (err, rows) {
                    if (!err) {
                      async.eachSeries(
                        rows,
                        function (source, cb) {
                          if (source.currency === null) {
                            source.currency = '';
                          }
                          source.productgroupId = row.productgroup_id;
                          source.copyFromSourceId = source.source_id;
                          source.oper = 'add';
                          qry.id =
                            updateSource(source, function (result) {
                              if (result.statusCode == 200) {
                                cb();
                              } else {
                                cb(result);
                              }
                            });
                        },
                        function (error) {
                          if (error) {
                            return callback({
                              statusCode: 500,
                              message: String(error),
                              action: 'copyProductgroup copy source'
                            });
                          } else {
                            return callback({
                              statusCode: 200,
                              message: '<div>' + serverMessages.SuccessMessage + '</div>'
                            });
                          }
                        });
                    } else {
                      return callback({
                        statusCode: 500,
                        message: String(err),
                        action: 'copyProductgroup get pg-id'
                      });
                    }
                  });
              } else {
                return callback({
                  statusCode: 500,
                  message: String(err),
                  action: 'copyProductgroup get sources'
                });
              }
            });
        } else {
          return callback({
            statusCode: 200,
            message: '<div>' + serverMessages.SuccessMessage + '</div>'
          });
        }
      } else {
        return callback({
          statusCode: 500,
          message: String(err),
          action: 'updateProductgroup'
        });
      }
    });
};

var getSource = function (qry, callback) {
  var filter = '',
    filterObservation = '',
    filteractive = '';

  if (qry._search) {
    if (qry.lastValue == null) {
      filterObservation = '1 = 1';
    } else {
      if (qry.lastValue == -1) {
        filterObservation = 'SourceAdmin.last_observation = ' + qry.lastValue;
      } else {
        filterObservation = '1 = 1';
      }
    }

    if (qry.is_active == null) {
      filteractive = '1 = 1';
    } else {
      filteractive = 'Source.is_active = "' + qry.is_active + '"';
    }

    filter = ' AND ' + filterObservation + ' AND ' + filteractive;
  }

  var sql =
    'SELECT Source.source_id, ' +
    'Source.source, ' +
    'Source.name, ' +
    'Source.address, ' +
    'Source.url, ' +
    'Source.is_active, ' +
    'Source.comment, ' +
    'Source.currency, ' +
    'COALESCE(SourceAdmin.last_observation,-1) as lastValue, ' +
    'Source.productgroup_id as productgroupId, ' +
    '1 ' +
    'FROM Source LEFT JOIN SourceAdmin ' +
    'ON Source.source_id = SourceAdmin.source_id ' +
    'WHERE Source.productgroup_id = "' + qry.productgroup_id + '"' +
    filter +
    ' ORDER BY Source.' + qry.sidx + ' ' + qry.sord;

  db.all(
    sql,
    function (err, rows) {
      var r = createResultForJQGrid(qry, rows);
      return callback(r);
    });
};

var updateSource = function (qry, callback) {
  var sql;
  switch (qry.oper) {
    case 'edit':
      sql =
        'UPDATE Source ' +
        'SET name = "' + qry.name + '", ' +
        'source = "' + qry.source + '", ' +
        'productgroup_id = "' + qry.productgroupId + '", ' +
        'address = "' + qry.address + '", ' +
        'url = "' + qry.url + '", ' +
        'is_active = "' + qry.is_active + '", ' +
        'comment = "' + qry.comment + '", ' +
        'currency = "' + qry.currency + '" ' +
        'WHERE source_id = "' + qry.id + '"';
      db.run(
        sql,
        function (err) {
          if (!err) {
            return callback({
              statusCode: 200,
              message: '<div>' + serverMessages.SuccessMessage + '</div>'
            });
          } else {
            return callback({
              statusCode: 500,
              message: String(err),
              action: 'updateSource'
            });
          }
        });
      break;

    case 'add':
      sql =
        'INSERT INTO Source (source, name, address, url, is_active, comment, currency, productgroup_id) ' +
        'VALUES ("' +
        qry.source + '","' +
        qry.name + '","' +
        qry.address + '","' +
        qry.url + '","' +
        qry.is_active + '","' +
        qry.comment + '","' +
        qry.currency + '","' +
        qry.productgroupId + '")';
      db.run(
        sql,
        function (err) {
          if (!err) {
            if (qry.copyFromSourceId != null) {
              //                    	a copy Source action is requested, so the SourcePath of copyFromSourceId
              //                    	has to be copied to the new source.
              var sqlSource = 'SELECT source_id FROM Source WHERE ' +
                'source = "' + qry.source + '" ' +
                'AND productgroup_id ="' + qry.productgroupId + '"';
              db.get(
                sqlSource,
                function (err, row) {
                  var sqlPath =
                    'INSERT INTO SourcePath (source_id, path, parameter, step_no, step_type) ' +
                    'SELECT ' +
                    row.source_id + ',' +
                    'path, parameter, step_no, step_type ' +
                    'FROM SourcePath ' +
                    'WHERE source_id = "' + qry.copyFromSourceId + '"';
                  db.run(
                    sqlPath,
                    function (err) {
                      if (!err) {
                        return callback({
                          statusCode: 200,
                          message: '<div>' + serverMessages.SuccessMessage + '</div>'
                        });
                      } else {
                        return callback({
                          statusCode: 500,
                          message: String(err),
                          action: 'updateSource'
                        });
                      }
                    });
                });
            } else {
              return callback({
                statusCode: 200,
                message: '<div>' + serverMessages.SuccessMessage + '</div>'
              });
            }
          } else {
            return callback({
              statusCode: 500,
              message: String(err),
              action: 'updateSource'
            });
          }
        });
      break;

    case 'del':
      sql =
        'DELETE FROM Source ' +
        'WHERE source_id = "' +
        qry.id + '"';
      db.run(
        sql,
        function (err) {
          if (!err) {
            return callback({
              statusCode: 200,
              message: '<div>' + serverMessages.SuccessMessage + '</div>'
            });
          } else {
            return callback({
              statusCode: 500,
              message: String(err),
              action: 'updateSource'
            });
          }
        });
      break;
  }
};

var getSourcePath = function (qry, callback) {
  var sql =
    'SELECT sourcepath_id, source_id, step_no, step_type, path, parameter, 1 ' +
    'FROM SourcePath ' +
    'WHERE source_id = "' + qry.id + '" ' +
    'ORDER BY step_no';
  db.all(
    sql,
    function (err, rows) {
      var r = createResultForJQGrid(qry, rows);
      return callback(r);
    });
};

var updateSourcePath = function (qry, callback) {
  var sql;
  if (qry.path) {
    qry.path = qry.path.replace(/"/g,"'");
  };
  switch (qry.oper) {
    case 'edit':
      sql =
        'UPDATE SourcePath ' +
        'SET path = "' + qry.path + '",' +
        'parameter = "' + qry.parameter + '", ' +
        'step_type = "' + qry.step_type + '", ' +
        'step_no = "' + qry.step_no + '" ' +
        'WHERE sourcepath_id = "' + qry.id + '"';
      break;

    case 'add':
      sql =
        'INSERT INTO SourcePath (source_id, path, parameter, step_type, step_no) ' +
        'VALUES ("' +
        qry.source_id + '","' +
        qry.path + '","' +
        qry.parameter + '","' +
        qry.step_type + '","' +
        qry.step_no + '")';
      break;

    case 'del':
      console.log("nu hier");
      sql =
        'DELETE FROM SourcePath ' +
        'WHERE sourcepath_id="' + qry.id + '"';
      break;
  }

  db.run(
    sql,
    function (err) {
      if (!err) {
        return callback({
          statusCode: 200,
          message: '<div>' + serverMessages.SuccessMessage + '</div>'
        });
      } else {
        return callback({
          statusCode: 500,
          message: String(err),
          action: 'updateSourcePath'
        });
      }
    });
};

var getObservation = function (qry, callback) {
  var sql;
  if (qry.id != null) {
    sql =
      'SELECT observation_id ' +
      'FROM Observation ' +
      'WHERE source_id = "' + qry.id + '" ' +
      'AND observation_date IN ' +
      '	(SELECT MAX(observation_date) ' +
      '  FROM Observation ' +
      '  WHERE source_id = "' + qry.id + '")';

    db.get(
      sql,
      function (err, row) {
        var sql =
          'SELECT strftime("%Y%m%d",observation_date) as observation_date, ' +
          'CAST(value AS TEXT) as value, ' +
          'ifnull(CAST(quantity AS TEXT), "") as quantity, ' +
          'comment, ' +
          'context ' +
          'FROM Observation ' +
          'WHERE source_id =  "' + qry.id + '" ' +
          'ORDER BY Observation.observation_date DESC ' +
          'LIMIT ' + qry.rows;
        db.all(
          sql,
          function (err, rows) {
            var result = [],
              i, r, obs_id, hasRows,
              varNames = [qry.lblDate, qry.lblValue, qry.lblQuantity, qry.lblComment, qry.lblContext];
            for (i = 0; i < 5; i++) {
              result.push({
                variable: varNames[i],
                Lobservation: 'No data',
                Tmin1: 'No data',
                Tmin2: 'No data',
                Tmin3: 'No data',
                Tmin4: 'No data',
                act: 1
              });
            }

            for (i = 0; i < rows.length; i++) {
              for (var j = 0; j < 5; j++) {
                result[j][Object.getOwnPropertyNames(result[0])[i + 1]] = rows[i][Object.getOwnPropertyNames(rows[0])[j]];
              }
            }
            r = createResultForJQGrid(qry, result);
            if (row == undefined) {
              obs_id = '';
              hasRows = 0;

            } else {
              obs_id = row.observation_id;
              hasRows = 1;
            }
            r.userdata = {
              observation_id: obs_id,
              source_id: qry.id,
              hasRows: hasRows
            };
            return callback(r);
          });
      });
  } else {
    var r = createResultForJQGrid(qry, {});
    r.userdata = {
      observation_id: '',
      source_id: '',
      hasRows: 0
    };
    return callback(r);
  }
};

var updateObservation = function (qry, callback) {
  var sql;
  if (qry.oper == 'edit') {

    if (qry.id == qry.lblValue) {
      db.serialize(
        function () {
          sql =
            'UPDATE Observation ' +
            'SET value = "' + qry.Lobservation + '" ' +
            'WHERE observation_id = "' + qry.observation_id + '"';
          db.run(sql);

          sql =
            'UPDATE SourceAdmin SET ' +
            'last_observation= "' + qry.Lobservation + '" ' +
            'WHERE source_id = "' + qry.source_id + '" ';
          db.run(
            sql,
            function (err) {
              if (!err) {
                return callback({
                  statusCode: 200,
                  message: '<div>' + serverMessages.SuccessMessage + '</div>'
                });
              } else {
                return callback({
                  statusCode: 500,
                  message: String(err),
                  action: 'updateObservation'
                });
              }
            });
        });
    }

    if (qry.id == qry.lblQuantity) {
      sql =
        'UPDATE Observation ' +
        'SET quantity = "' + qry.Lobservation + '" ' +
        'WHERE observation_id = "' + qry.observation_id + '"';
      db.run(
        sql,
        function (err) {
          if (!err) {
            return callback({
              statusCode: 200,
              message: '<div>' + serverMessages.SuccessMessage + '</div>'
            });
          } else {
            return callback({
              statusCode: 500,
              message: String(err),
              action: 'updateObservation'
            });
          }
        });
    }

    if (qry.id == qry.lblComment) {
      sql =
        'UPDATE Observation ' +
        'SET comment = "' + qry.Lobservation + '" ' +
        'WHERE observation_id = "' + qry.observation_id + '"';
      db.run(
        sql,
        function (err) {
          if (!err) {
            return callback({
              statusCode: 200,
              message: '<div>' + serverMessages.SuccessMessage + '</div>'
            });
          } else {
            return callback({
              statusCode: 500,
              message: String(err),
              action: 'updateObservation'
            });
          }
        });
    }
    if (qry.id == 'ValueAndQuantity') {
      db.serialize(
        function () {
          var sql =
            'UPDATE Observation ' +
            'SET value = "' + qry.Lobservation.value + '", ' +
            'quantity ="' + qry.Lobservation.quantity + '" ' +
            'WHERE observation_id = "' + qry.observation_id + '"';
          db.run(sql);

          sql =
            'UPDATE SourceAdmin SET ' +
            'last_observation= "' + qry.Lobservation.value + '" ' +
            'WHERE source_id = "' + qry.source_id + '" ';
          db.run(
            sql,
            function (err) {
              if (!err) {
                return callback({
                  statusCode: 200,
                  message: '<div>' + serverMessages.SuccessMessage + '</div>'
                });
              } else {
                return callback({
                  statusCode: 500,
                  message: String(err),
                  action: 'updateObservation'
                });
              }
            });
        });
    }
  }
};

var getWebInfo = function (qry, callback) {
  var start = require('./webData.js').start,
    processSourceById = require('./webData.js').processSourceById,
    r = {
      source_id: qry.source_id,
      context: '',
      url: '',
      last_obs_date: ''
    },
    sql;
  switch (qry.oper) {
    case 'getContext':
      sql =
        'SELECT MAX(observation_date) as last_obs_date FROM Observation ' +
        'WHERE source_id = "' + qry.source_id + '"';
      db.get(
        sql,
        function (err, row) {
          r.last_obs_date = row.last_obs_date;
          start(
            processSourceById, [{
                source_id: qry.source_id
                    },
                    qry.step_no,
                    0,
                    function (result) {
                r.error = result.error;
                r.context = '<pre style="white-space: pre-wrap">' + result.context + '</pre>';
                return callback(r);
                    }]);
        });
      break;

    case 'getUrl':
      start(
        processSourceById, [{
            source_id: qry.source_id
            },
            qry.step_no,
            0,
            function (result) {
            var h = url.parse(result.url);
            if (h.pathname != null) {
              h.pathname = h.pathname.replace(/\&/g, "%26");
            }
            r.url = url.format(h);
            return callback(r);
            }]);
      break;

    case 'updateObservation':
      updateObservationSource({
        source_id: qry.source_id,
        context: qry.context,
        error: qry.error,
        user_id: qry.user_id
      }, callback);
      break;
  }
};

var exportObservations = function (qry, callback) {

  if (!(fs.existsSync(qry.exportFolder))) {
    fs.mkdirSync(qry.exportFolder);
  }

  var pgs = qry.productgroups,
    filter = ' AND BG1.productgroup_id IN (' + pgs.join(',') + ')';

  var sql =
    'SELECT ' +
    'Productgroup.productgroup, ' +
    'BG1.source, ' +
    'Observation.observation_date, ' +
    'Observation.value, ' +
    'Observation.quantity, ' +
    'Observation.comment, ' +
    'Observation.context, ' +
    'Observation.user_id ' +
    'FROM Productgroup JOIN Source AS BG1 ' +
    'ON Productgroup.productgroup_id = BG1.productgroup_id JOIN Observation ' +
    'ON BG1.source_id = Observation.source_id ' +
    'WHERE BG1.is_active = 1 AND ' +
    'Observation.observation_date = ' +
    '(SELECT ' +
    'MAX(last_observation_date) ' +
    'FROM Source AS BG2 JOIN SourceAdmin ' +
    'ON BG2.source_id = SourceAdmin.source_id ' +
    'WHERE BG1.productgroup_id = BG2.productgroup_id) ' +
    filter;
  db.all(
    sql,
    function (err, rows) {
      rows.map(
        function (row, index) {
          rows[index].context = cleanupContent(row.context, true);
        });
      var filename = qry.exportFolder + moment().format('YYYYMMDD_HHmmss') + 'RobotData.csv';
      var r = '';
      csv
        .writeToPath(
          filename,
          rows, {
            headers: true,
            rowDelimiter: "\r\n",
            quoteColumns: true,
            delimiter: ";"
          })
        .on("finish",
          function () {
            r = rows.length + ' ' + serverMessages.SaveSuccess + ' ' + filename;
            var sql =
              'UPDATE SourceAdmin ' +
              'SET is_exported = 1 ' +
              'WHERE source_id IN ' +
              '(SELECT source_id FROM Source AS BG1 ' +
              'WHERE 1=1 ' +
              filter +
              ')';
            db.run(sql, function () {
              return callback(r);
            });
          })
        .on("error",
          function (err) {
            r = serverMessages.ExportError + filename + ": " + String(err);
            return callback(r);
          });
    });
};

var setObservation = function (qry, callback) {
  var
    start = require('./webData.js').start,
    processProductgroup = require('./webData.js').processProductgroup,
    now = moment().format('YYYY-MM-DD HH:mm:ss');
  switch (qry.oper) {
    case 'insert':
      start(
        processProductgroup, [
            qry.productgroups,
            function (result) {
                result.date = now;
                result.user_id = qry.user_id;
                insertObservationSource(
                    result,
                    function (r) {
                        return r;
                    });
            },
            function (err) {
                if (err) {
                    return callback(String(err));
                } else {
                    return callback(serverMessages.SourcesProcessed);
                }
            }]
      );
      break;
    case 'update':
      start(
        processProductgroup, [
            qry.productgroups,
            function (result) {
                result.user_id = qry.user_id;
                updateObservationSource(
                    result,
                    function (r) {
                        return r;
                    });
            },
            function (err) {
                if (err) {
                    return callback(String(err));
                } else {
                    return callback(serverMessages.SourcesProcessed);
                }
            }
        ]);
      break;
  }
};

var insertObservationSource = function (result, callback) {

  // get last observation
  var sql =
    'SELECT value, quantity, context ' +
    'FROM Observation ' +
    'WHERE source_id ="' + result.source_id + '" ' +
    'ORDER BY observation_date DESC LIMIT 0,1';
  db.get(
    sql,
    function (err, row) {
      var newValue = -1,
        newQuantity = -1,
        newContext = 'NA',
        oldValue = -1,
        oldQuantity = '',
        oldContext = 'NA';
      if (row != undefined) {
        //a prevous observation exists
        oldValue = row.value;
        oldContext = row.context;
        if (row.quantity != undefined) {
          oldQuantity = row.quantity;
        } else {
          newQuantity = 1;
        }
      } else {
        newQuantity = 1;
      }
      newContext = result.context;
      if (_.isObject(newContext)) {
        newContext = String(newContext);
        newContext = newContext.replace(/\"/g, '');
      } else {
        newContext = newContext.replace(/\"/g, '');
      }
      var isEqual = (cleanupContent(newContext) === oldContext);
      if (isEqual && !result.error) {
        newValue = oldValue;
        newQuantity = oldQuantity;
      }
      if (row != undefined) {
        //There must be a SourceAdmin record for this sourceId
        sql =
          'UPDATE SourceAdmin SET ' +
          'last_observation="' + newValue + '", ' +
          'last_observation_date= "' + result.date + '", ' +
          'is_exported = 0 ' +
          'WHERE source_id = "' + result.source_id + '"';
        db.run(sql);
      } else {
        //This is the first observation for sourceId
        sql =
          'INSERT INTO SourceAdmin ' +
          '(source_id, last_observation, last_observation_date, is_exported) ' +
          'VALUES ("' +
          result.source_id + '","' +
          newValue + '","' +
          result.date + '","' +
          0 + '")';
        db.run(sql);
      }
      //finally insert the new observation into the database
      sql =
        'INSERT INTO Observation (source_id, observation_date, value, quantity, context,user_id) VALUES ("' +
        result.source_id + '","' +
        result.date + '","' +
        newValue + '","' +
        newQuantity + '","' +
        cleanupContent(newContext) + '","' +
        result.user_id + '")';
      db.run(sql, function (err) {
        if (err) {
          return callback(err);
        } else {
          return callback('success');
        }
      });
    });
};

var updateObservationSource = function (result, callback) {

  //this updates the last observation that is already saved in the database,
  //therefore get the penultimate observation (if exists) for comparison with the last obs. and edit the last observation
  var sql =
    'SELECT value, quantity, context ' +
    'FROM Observation ' +
    'WHERE source_id ="' + result.source_id + '" ' +
    'ORDER BY observation_date DESC LIMIT 1,1';
  db.get(
    sql,
    function (err, row) {
      var newContext = result.context,
        newValue = -1,
        newQuantity = -1;

      if (newContext == '') {
        newContext = 'NA';
      }

      newContext = newContext.replace(/\"/g, '');

      if (row != undefined) {
        var oldContext = row.context,
          oldValue = row.value,
          oldQuantity = row.quantity;
        var isEqual = (cleanupContent(newContext) === oldContext);
        //result.error is assigned as a boolean in procedure processSource,
        //during transport from server to client and back it is converted to a string
        if (isEqual && (result.error == 'false')) {
          newValue = oldValue;
          newQuantity = oldQuantity;
        }
      }
      sql =
        'UPDATE SourceAdmin SET ' +
        'last_observation = "' + newValue + '" ' +
        'WHERE source_id = "' + result.source_id + '"';
      db.run(
        sql,
        function () {
          sql =
            'UPDATE Observation SET ' +
            'value = "' + newValue + '",' +
            'quantity = "' + newQuantity + '",' +
            'context = "' + cleanupContent(newContext) + '", ' +
            'user_id = "' + result.user_id + '" ' +
            'WHERE observation_id IN ' +
            ' (SELECT observation_id ' +
            ' FROM Observation ' +
            ' WHERE source_id = "' + result.source_id + '" ' +
            ' ORDER BY observation_date DESC LIMIT 0,1)';

          db.run(
            sql,
            function (err) {
              if (err) {
                return callback(err);
              } else {
                return callback(serverMessages.SaveObsSuccess);
              }
            });
        });
    });
};

var exportConfiguration = function (qry, callback) {

  if (!(fs.existsSync(qry.exportFolder))) {
    fs.mkdirSync(qry.exportFolder);
  }
  var sql =
    'SELECT Productgroup.productgroup, ' +
    'Productgroup.description, ' +
    'ProductGroup.comment as productgroupComment, ' +
    'Source.source, ' +
    'Source.name, ' +
    'Source.address, ' +
    'Source.url, ' +
    'Source.is_active, ' +
    'Source.comment, ' +
    'Source.currency, ' +
    'SourcePath.path, ' +
    'SourcePath.step_no, ' +
    'SourcePath.step_type, ' +
    'SourcePath.parameter ' +
    'FROM Productgroup JOIN Source ' +
    'ON Productgroup.productgroup_id = Source.productgroup_id LEFT JOIN SourcePath ' +
    'ON Source.source_id = SourcePath.source_id ' +
    'WHERE Productgroup.productgroup_id = "' + qry.productgroup_id + '"';

  db.all(
    sql,
    function (err, rows) {
      var filename = qry.exportFolder + moment().format('YYYYMMDD_HHmmss') + 'Config-' + qry.productgroup + '.csv',
        r = '';
      csv
        .writeToPath(
          filename,
          rows, {
            headers: true
          })
        .on("finish",
          function () {
            r = rows.length + ' ' + serverMessages.SaveSuccess + ' ' + filename;
            return callback(r);
          })
        .on("error",
          function (err) {
            r = serverMessages.SaveConfigError + filename + ": " + String(err);
            return callback(r);
          });
    });
};

var importConfiguration = function (qry, callback) {
  var filename = qry.exportFolder + qry.fileName,
    stream = fs.createReadStream(filename, {
      encoding: 'utf8'
    }),
    result = [],
    r = '';
  stream.on('error', function (err) {
    r = serverMessages.SaveConfigError + filename + ": " + String(err);
    return callback(r);
  });
  csv
    .fromStream(
      stream, {
        headers: true
      })
    .on('record',
      function (data) {
        result.push(data);
      })
    .on('error', function (err) {
      r = serverMessages.SaveConfigError + filename + ": " + String(err);
      return callback(r);
    })
    .on('finish',
      function () {
        var productgroup = [];
        _.forEach(
          result,
          function (row) {
            productgroup.push(_.pick(row, ['productgroup', 'description', 'productgroupComment']));
          });
        productgroup = _.uniq(productgroup, 'productgroup');
        // check if productgroup already exists
        var sql =
          'SELECT * FROM Productgroup WHERE productgroup ="' + productgroup[0].productgroup + '"';
        db.get(
          sql,
          function (err, row) {
            if (row == undefined) {
              db.serialize(function () {
                var insertProductgroup = 'INSERT INTO ProductGroup (productgroup, description, comment) VALUES ("';
                dbWriteTable(insertProductgroup, productgroup);
                var sql = 'SELECT productgroup_id FROM ProductGroup WHERE productgroup = "' + productgroup[0].productgroup + '"';
                db.get(
                  sql,
                  function (err, pg) {
                    var sources = [];
                    _.forEach(
                      result,
                      function (row) {
                        row.productgroup_id = pg.productgroup_id;
                        sources.push(_.pick(row, ['source', 'productgroup_id', 'name', 'address', 'url', 'is_active', 'comment', 'currency']));
                      });
                    sources = _.uniq(sources, 'source');
                    var insertSources = 'INSERT INTO Source (source, productgroup_id, name, address, url, is_active, comment, currency) VALUES ("';
                    _.forEach(
                      sources,
                      function (source) {
                        dbWriteTable(insertSources, source, function () {
                          var sql =
                            'SELECT source_id FROM Source WHERE ' +
                            'source ="' + source.source + '" ' +
                            'AND productgroup_id ="' + pg.productgroup_id + '"';
                          db.get(
                            sql,
                            function (err, s) {
                              var resultSource = _.filter(result, {
                                'source': source.source
                              });
                              var paths = [];
                              _.forEach(
                                resultSource,
                                function (row) {
                                  row.source_id = s.source_id;
                                  paths.push(_.pick(row, ['source_id', 'path', 'parameter', 'step_no', 'step_type']));
                                });
                              var insertSourcePath = 'INSERT INTO SourcePath (source_id, path, parameter, step_no, step_type) VALUES ("';
                              dbWriteTable(insertSourcePath, paths);
                            });
                        });
                      });

                  });
                r = serverMessages.ImportSuccess;
                return callback(r);
              });
            } else {
              r = serverMessages.ImportError.replace('#', productgroup[0].productgroup);
              return callback(r);
            }
          });
      });
};

var createResultForJQGrid = function (qry, rows) {
  var r = {};
  r.page = qry.page;
  if (qry.rows > 0) {
    if (rows.length > 0) {
      r.total = Math.ceil(rows.length / qry.rows);
    } else {
      r.total = 0;
    }
    r.data = rows.slice(qry.rows * (qry.page - 1), qry.rows * qry.page);
  } else {
    r.total = 1;
    r.data = rows;
  }
  r.records = rows.length;
  return r;
};

var cleanupContent = function (s, removeAllCRLF) {

  // replace non-breaking spaces with regular ones (0xc2 0xa0 = UTF-8 sequence of code point 0xa0 = nbsp)
  var t = s
    .replace(/\uC2A0/g, ' ')
    .replace(/\xC2/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\u0080/g, "\u20AC");

  // replace CR/LF/TAB with space
  t = t.replace(/[\t]/g, ' ');
  removeAllCRLF = typeof removeAllCRLF !== 'undefined' ? removeAllCRLF : false;

  if (removeAllCRLF) {
    t = t.replace(/[\r\n]/g, ' ');
  } else {
    t = t.replace(/[\r\n]/g, '\r\n').replace(/([ ]*\r\n)+/g, '\r\n');
  }

  // replace multiple spaces with single space
  t = t.replace(/ +/g, ' ');

  // trim whitespace from start and end of string
  t = t.trim();

  return t;
};

var dbWriteTable = function (sql, data, callback) {

  if (_.isArray(data)) {
    data.forEach(function (row) {

      var r = _.reduce(row,
        function (result, el) {
          return result + '","' + el;
        });
      r = sql + r + '")';
      db.run(r);
    });
  } else {
    var r = _.reduce(data,
      function (result, el) {
        return result + '","' + el;
      });
    r = sql + r + '")';
    db.run(r, callback);
  }
};

var chartData = function (qry, callback) {
  var res = {};
  var sql =
    'SELECT Observation.source_id, Source.name, Observation.observation_date, Observation.value ' +
    'FROM Source JOIN Observation ' +
    'ON Source.source_id = Observation.source_id ' +
    'WHERE Source.productgroup_id = "' + qry.productgroup_id + '" ' +
    'AND Observation.value > 0 ' +
    'AND Observation.value != "NA" ' +
    'ORDER BY Observation.observation_date, Observation.source_id';
  db.all(
    sql,
    function (err, rows) {
      var sql =
        'SELECT max(value) as value ' +
        'FROM Observation ' +
        'WHERE source_id IN ' +
        '(SELECT source_id ' +
        'FROM Source ' +
        'WHERE productgroup_id = "' + qry.productgroup_id + '")' +
        'AND value != "NA"';
      db.get(
        sql,
        function (err, row) {
          res.maxValue = row.value;
          res.rows = rows;
          callback(res);
        });
    });
};

module.exports.init = init;
module.exports.getSourceInfo = getSourceInfoFromDB;
module.exports.getSourceIds = getSourceIdsFromDB;
module.exports.getProductgroup = getProductgroup;
module.exports.updateProductgroup = updateProductgroup;
module.exports.getSource = getSource;
module.exports.updateSource = updateSource;
module.exports.getSourcePath = getSourcePath;
module.exports.updateSourcePath = updateSourcePath;
module.exports.getObservation = getObservation;
module.exports.updateObservation = updateObservation;
module.exports.getWebInfo = getWebInfo;
module.exports.exportObservations = exportObservations;
module.exports.setObservation = setObservation;
module.exports.exportConfiguration = exportConfiguration;
module.exports.importConfiguration = importConfiguration;
module.exports.chartData = chartData;
