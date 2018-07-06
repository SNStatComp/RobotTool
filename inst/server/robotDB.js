/* jslint node: true */

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

var sqlite3 = require('sqlite3').verbose(),
  csv = require('fast-csv'),
  moment = require('moment'),
  _ = require('lodash'),
  url = require('url'),
  fs = require('fs'),
  co = require('co'),
  webData = require('./webData.js'),
  db,
  serverMessages;


var init = function(paths, config) {
  serverMessages = require('./../app/locales/translation-' + config.Language + '.json').Server;
  if (config.mode === 'server') {
    db = new sqlite3.Database(paths.data + '/observationDB.sqlite');
  } else {
    db = new sqlite3.Database('./inst/server/db/observationDB.sqlite');
  }
  var sql = "PRAGMA foreign_keys=1";
  db.run(sql);
};

var getSourceInfoFromDB = function(source_id, lastStep) {
  var sourceInfo = {},
    sql;
  sourceInfo.source_id = source_id;
  return new Promise(function(resolve, reject) {
    db.get('SELECT * FROM Source ' + ' WHERE source_id = "' + source_id + '"', function(err, source) {
      sourceInfo.url = source.url;
      sourceInfo.name = source.name;
      sourceInfo.source = source.source;
      if (lastStep == 0) {
        sql = 'SELECT * FROM SourcePath ' + 'WHERE source_id = "' + source_id + '" ' + 'ORDER BY step_no';
      } else {
        sql = 'SELECT * FROM SourcePath ' + 'WHERE source_id = "' + source_id + '" ' + 'AND step_no <= ' + lastStep + ' ORDER BY step_no';
      }
      db.all(sql, function(err, paths) {
        sourceInfo.path = paths;
        resolve(sourceInfo)
      });
    });
  });
};

var getSourceIdsFromDB = function(productgroups) {
  var sql =
    'SELECT source_id FROM Source WHERE is_active = 1 AND productgroup_id IN (' + productgroups.join(',') + ') ORDER BY productgroup_id';
  return new Promise(function(resolve, reject) {
    db.all(sql, function(err, sources) {
      resolve(sources)
    });
  });
};

var getProductgroup = function(qry) {
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
      return new Promise(function(resolve, reject) {
        db.all(sql, function(err, productgroups) {resolve(productgroups)})
        });
      break;
    case 'grid':
    return new Promise(function(resolve, reject) {
      db.all(
        'SELECT productgroup_id, productgroup, description, comment,  1 ' +
        'FROM Productgroup ' +
        'ORDER BY ' + qry.sidx + ' ' + qry.sord,
          function(err, rows) {
            var r = createResultForJQGrid(qry, rows);
            resolve(r)
          });
      });
      break;
    case 'select':
    return new Promise(function(resolve, reject) {
      db.all('SELECT productgroup_id, description ' + 'FROM Productgroup ' + 'ORDER BY description',
        function(err, rows) {
          var r = '<select>';
          for (const row of rows) {
            r += '<option value = "' + row.productgroup_id + '">' + row.description + '</option>';
          };
          r += '</select';
          resolve(r)
        })
      });
      break;
    default:
      return new Promise(function(resolve, reject) {
        resolve({})
      });
  }
};

var updateProductgroup = function(qry) {
  var sql = '';
  switch (qry.oper) {
    case 'edit':
      sql = 'UPDATE Productgroup ' +
        'SET productgroup = "' + qry.productgroup + '",' +
          'description = "' + qry.description + '", ' +
          'comment = "' + qry.comment + '" ' +
        'WHERE productgroup_id = "' + qry.id + '"';
      break;
    case 'add':
      sql = 'INSERT INTO Productgroup (productgroup, description, comment) ' +
        'VALUES ("' + qry.productgroup + '","' + qry.description + '","' + qry.comment + '")';
      break;
    case 'del':
      sql = 'DELETE FROM ProductGroup ' + 'WHERE productgroup_id = "' + qry.id + '"';
      break;
  }
  return new Promise(function(resolve, reject) {
    db.run(sql, function(err) {
      if (!err) {
        if (qry.copyFromProductgroupId != null) {
          // a copy Productgroup action is requested, so the Sources belonging to copyFromProductgroupId
          // has to be copied to the new productgroup.
          var sqlProductgroup = 'SELECT productgroup_id FROM ProductGroup WHERE productgroup = "' + qry.productgroup + '"';
          db.get(sqlProductgroup, function(err, row) {
            if (!err) {
              var sqlSources = 'SELECT * FROM Source WHERE productgroup_id = "' + qry.copyFromProductgroupId + '"';
              db.all(sqlSources, function(err, rows) {
                if (!err) {
                  try {
                    for (var source of rows) {
                      if (source.currency === null) {
                        source.currency = '';
                      }
                      source.productgroupId = row.productgroup_id;
                      source.copyFromSourceId = source.source_id;
                      source.oper = 'add';
                      qry.id = updateSource(source, function(result) {
                        if (result.statusCode !== 200) {
                          throw result;
                        }
                      });
                    }
                    resolve({
                      statusCode: 200,
                      message: '<div>' + serverMessages.SuccessMessage + '</div>'
                    });
                  } catch (err) {
                      resolve({
                        statusCode: 500,
                        message: String(error),
                        action: 'copyProductgroup copy source'
                      });
                  }
                } else {
                  resolve({
                    statusCode: 500,
                    message: String(err),
                    action: 'copyProductgroup get pg-id'
                  });
                }
              });
            } else {
              resolve({
                statusCode: 500,
                message: String(err),
                action: 'copyProductgroup get sources'
              });
            }
          });
        } else {
            resolve({
              statusCode: 200,
              message: '<div>' + serverMessages.SuccessMessage + '</div>'
            });
        }
      } else {
        resolve({
          statusCode: 500,
          message: String(err),
          action: 'updateProductgroup'
        });
      }
    });
  })
};

var getSource = function(qry) {
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
      'SourceAdmin.last_observation_date as lastDate, ' +
      'COALESCE(SourceAdmin.last_observation,-1) as lastValue, ' +
      'Source.productgroup_id as productgroupId, ' + '1 ' +
    'FROM Source LEFT JOIN SourceAdmin ' +
    'ON Source.source_id = SourceAdmin.source_id ' +
    'WHERE Source.productgroup_id = "' + qry.productgroup_id + '"' + filter +
    ' ORDER BY Source.' + qry.sidx + ' ' + qry.sord;

  return new Promise(function(resolve,reject) {
    db.all(sql, function(err, rows) {
      var r = createResultForJQGrid(qry, rows);
      resolve(r)
    });
  });
};

var updateSource = function(qry) {
  var sql;
  return new Promise(function(resolve,reject) {
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
        db.run(sql, function(err) {
          if (!err) {
            resolve({
              statusCode: 200,
              message: '<div>' + serverMessages.SuccessMessage + '</div>'
            });
          } else {
            resolve({
              statusCode: 500,
              message: String(err),
              action: 'updateSource'
            });
          }
        });
        break;

      case 'add':
        sql = 'INSERT INTO Source (source, name, address, url, is_active, comment, currency, productgroup_id) ' +
        'VALUES ("' +
          qry.source + '","' +
          qry.name + '","' +
          (qry.address || '') + '","' +
          qry.url + '","' +
          qry.is_active + '","' +
          (qry.comment || '') + '","' +
          (qry.currency || '') + '","' +
          qry.productgroupId + '")';
        db.run(sql, function(err) {
          if (!err) {
            if (qry.copyFromSourceId != null) {
              //                    	a copy Source action is requested, so the SourcePath of copyFromSourceId
              //                    	has to be copied to the new source.
              var sqlSource = 'SELECT source_id FROM Source WHERE ' + 'source = "' +
                qry.source + '" ' + 'AND productgroup_id ="' + qry.productgroupId + '"';
              db.get(sqlSource, function(err, row) {
                var sqlPath =
                  'INSERT INTO SourcePath (source_id, path, parameter, step_no, step_type) ' +
                  'SELECT ' + row.source_id + ',' + 'path, parameter, step_no, step_type ' +
                  'FROM SourcePath ' +
                  'WHERE source_id = "' + qry.copyFromSourceId + '"';
                db.run(sqlPath, function(err) {
                  if (!err) {
                      resolve({
                        statusCode: 200,
                        message: '<div>' + serverMessages.SuccessMessage + '</div>'
                      });
                  } else {
                      resolve({
                        statusCode: 500,
                        message: String(err),
                        action: 'updateSource'
                      });
                  }
                });
              });
            } else {
                resolve({
                  statusCode: 200,
                  message: '<div>' + serverMessages.SuccessMessage + '</div>'
                })
            }
          } else {
              resolve({
                statusCode: 500,
                message: String(err),
                action: 'updateSource'
              });
          }
        });
        break;

      case 'del':
        sql = 'DELETE FROM Source ' + 'WHERE source_id = "' + qry.id + '"';
        db.run(sql, function(err) {
          if (!err) {
              resolve({
                statusCode: 200,
                message: '<div>' + serverMessages.SuccessMessage + '</div>'
              });
          } else {
              resolve({
                statusCode: 500,
                message: String(err),
                action: 'updateSource'
              });
          }
        });
        break;
    }
  })
};

var getSourcePath = function(qry) {
  var sql =
    'SELECT sourcepath_id, source_id, step_no, step_type, path, parameter, 1 ' +
    'FROM SourcePath ' +
    'WHERE source_id = "' + qry.id + '" ' +
    'ORDER BY step_no';
  return new Promise(function(resolve,reject) {
    db.all(sql, function(err, rows) {
      var r = createResultForJQGrid(qry, rows);
      resolve(r)
    });
  });
};

var updateSourcePath = function(qry) {
  var sql;
  if (qry.path) {
    qry.path = qry.path.replace(/"/g, "'");
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
      sql = 'INSERT INTO SourcePath (source_id, path, parameter, step_type, step_no) ' +
      'VALUES ("' +
        qry.source_id + '","' +
        qry.path + '","' +
        qry.parameter + '","' +
        qry.step_type + '","' +
        qry.step_no + '")';
      break;

    case 'del':
      sql =
       'DELETE FROM SourcePath ' +
       'WHERE sourcepath_id="' + qry.id + '"';
      break;
  }

  return new Promise(function(resolve,reject) {
    db.run(sql, function(err) {
      if (!err) {
        resolve({
          statusCode: 200,
          message: '<div>' + serverMessages.SuccessMessage + '</div>'
        });
      } else {
        resolve({
          statusCode: 500,
          message: String(err),
          action: 'updateSourcePath'
        });
      }
    });
  })
};

var getObservation = function(qry) {
  var sql;
  return new Promise(function(resolve,reject) {
    if (qry.id != null) {
      sql =
        'SELECT observation_id ' +
        'FROM Observation ' +
        'WHERE source_id = "' + qry.id + '" ' +
        'AND observation_date IN ' +
        '	(SELECT MAX(observation_date) ' +
        '  FROM Observation ' +
        '  WHERE source_id = "' + qry.id +
        '")';

      db.get(sql, function(err, row) {
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
        db.all(sql, function(err, rows) {
          var result = [], i, r, obs_id, hasRows,
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
          resolve(r);
        });
      });
    } else {
      var r = createResultForJQGrid(qry, {});
      r.userdata = {
        observation_id: '',
        source_id: '',
        hasRows: 0
      };
      resolve(r);
    }
  })
};

var updateObservation = function(qry) {
  var sql;
  return new Promise(function(resolve,reject) {
    if (qry.oper == 'edit') {

      if (qry.id == qry.lblValue) {
        db.serialize(function() {
          sql =
            'UPDATE Observation ' +
            'SET value = "' + qry.Lobservation + '" ' +
            'WHERE observation_id = "' + qry.observation_id + '"';
          db.run(sql);

          sql =
            'UPDATE SourceAdmin SET ' +
              'last_observation= "' + qry.Lobservation + '" ' +
              'WHERE source_id = "' + qry.source_id + '" ';
          db.run(sql, function(err) {
            if (!err) {
              resolve({
                statusCode: 200,
                message: '<div>' + serverMessages.SuccessMessage + '</div>'
              })
            } else {
              resolve({
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
        db.run(sql, function(err) {
          if (!err) {
            resolve({
              statusCode: 200,
              message: '<div>' + serverMessages.SuccessMessage + '</div>'
            });
          } else {
            resolve({
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
        db.run(sql, function(err) {
          if (!err) {
            resolve({
              statusCode: 200,
              message: '<div>' + serverMessages.SuccessMessage + '</div>'
            });
          } else {
              resolve({
                statusCode: 500,
                message: String(err),
                action: 'updateObservation'
              });
          }
        })
      }
      if (qry.id == 'ValueAndQuantity') {
        db.serialize(function() {
          var sql =
            'UPDATE Observation ' +
            'SET value = "' + qry.Lobservation.value + '", ' +
              'quantity ="' + qry.Lobservation.quantity + '" ' +
            'WHERE observation_id = "' + qry.observation_id + '"';
          db.run(sql);

          sql =
            'UPDATE SourceAdmin ' +
            'SET last_observation= "' + qry.Lobservation.value + '" ' +
            'WHERE source_id = "' + qry.source_id + '" ';
          db.run(sql, function(err) {
            if (!err) {
              resolve({
                statusCode: 200,
                message: '<div>' + serverMessages.SuccessMessage + '</div>'
              });
            } else {
              resolve({
                statusCode: 500,
                message: String(err),
                action: 'updateObservation'
              });
            }
          });
        });
      }
    }
  })
};

var getWebInfo = function(qry) {
  return new Promise(function(resolve,reject) {
    switch (qry.oper) {
      case 'getContext':
        var sql =
          'SELECT MAX(observation_date) as last_obs_date ' +
          'FROM Observation ' +
          'WHERE source_id = "' + qry.source_id + '"';
        db.get(sql, function(err, row) {
          var r = {
            source_id: qry.source_id,
            context: '',
            url: '',
            last_obs_date: ''
          }
          r.last_obs_date = row.last_obs_date;
          co(function* () {
            var result = yield* processSourceById(qry.source_id, qry.step_no, 0)
            r.error = result.error;
            r.context = '<pre style="white-space: pre-wrap">' + result.context + '</pre>';
            return r;
          }).then(function(r) {resolve(r)})
        });
        break;

      case 'getUrl':
        co(function* () {
          var result = yield* processSourceById(qry.source_id, qry.step_no, 0)
          var h = url.parse(result.url);
          if (h.pathname != null) {
            h.pathname = h.pathname.replace(/\&/g, "%26");
          }
          var r = {
            source_id: qry.source_id,
            context: '',
            url: url.format(h),
            last_obs_date: ''
          }
          return r;
        }).then(function(r) {resolve(r)})
        break;

      case 'updateObservation':
        co(function* () {
          var r = yield* updateObservationSource({
            source_id: qry.source_id,
            context: qry.context,
            error: qry.error,
            user_id: qry.user_id
          })
          return r;
        })
          .then(function(r) {resolve(r)})
          .catch(function(err) {reject(err)})
        break;
    }
  })
};

var setObservation = function(qry) {
  return new Promise(function(resolve, reject) {
    co(function* () {
      var res = yield* processProductgroup(qry);
      return res
    }).then(function(res) {resolve(res)})
  })
};

var processSourceById = function* (source_id, step_no, index) {
  var sourceInfo = yield getSourceInfoFromDB(source_id, step_no)
  sourceInfo.index = index;
  webData.emitProgress('source', {
    'message': sourceInfo.name,
    'source': sourceInfo.source,
    'index': sourceInfo.index
  });
  webData.emitProgress('processPath', {
    'totalSteps': sourceInfo.path.length,
    'index': 0
  });
  var res = yield* webData.processSource(sourceInfo);
  return res;
};

var processProductgroup = function* (qry) {
  var
    now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    var sources = yield getSourceIdsFromDB(qry.productgroups)
    webData.emitProgress('processPG', {totalSources: sources.length});
    for (const [index, source] of sources.entries()) {
//      if (!webData.isWebserviceRunning()) {
//        webData.startWebdriver()
//      }
      var result = yield* processSourceById(source.source_id, 0, index)
      result.user_id = qry.user_id;
      result.date = now;
      var res = yield insertObservationSource(result)
    }
    return serverMessages.SourcesProcessed;
  } catch (err) {
    return err
  }
};

var insertObservationSource = function(result) {

  // get last observation
  var sql =
    'SELECT value, quantity, context ' +
    'FROM Observation ' +
    'WHERE source_id ="' + result.source_id + '" ' +
    'ORDER BY observation_date DESC LIMIT 0,1';
  return new Promise(function(resolve,reject) {
    db.get(sql, function(err, row) {
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
            'VALUES ("' + result.source_id + '","' + newValue + '","' + result.date + '","' + 0 + '")';
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
      db.run(sql, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve('success');
        }
      });
    });
  })
};

var updateObservationSource = function* (result) {

  //this updates the last observation that is already saved in the database,
  //therefore get the penultimate observation (if exists) for comparison with the last obs. and edit the last observation
  var sql =
    'SELECT value, quantity, context ' +
    'FROM Observation ' +
    'WHERE source_id ="' + result.source_id + '" ' +
    'ORDER BY observation_date DESC LIMIT 1,1';
  return new Promise(function(resolve,reject) {
    db.get(sql, function(err, row) {
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
      db.run(sql, function() {
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

        db.run(sql, function(err) {
          if (err) {
            resolve(err);
          } else {
            resolve(serverMessages.SaveObsSuccess);
          }
        });
      });
    });
  })
};

var exportObservations = function(qry) {

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

  return new Promise(function(resolve,reject) {
    db.all(sql, function(err, rows) {
      rows.map(function(row, index) {
        rows[index].context = cleanupContent(row.context, true);
      });
      var filename = qry.exportFolder + moment().format('YYYYMMDD_HHmmss') + 'RobotData.csv';
      var r = '';
      csv.writeToPath(filename, rows, {
        headers: true,
        rowDelimiter: "\r\n",
        quoteColumns: true,
        delimiter: ";"
      }).on("finish", function() {
        r = rows.length + ' ' + serverMessages.SaveSuccess + ' ' + filename;
        var sql = 'UPDATE SourceAdmin ' + 'SET is_exported = 1 ' + 'WHERE source_id IN ' + '(SELECT source_id FROM Source AS BG1 ' + 'WHERE 1=1 ' + filter + ')';
        db.run(sql, function() {
          resolve(r);
        });
      }).on("error", function(err) {
        r = serverMessages.ExportError + filename + ": " + String(err);
        resolve(r);
      });
    });
  })
};

var exportConfiguration = function(qry) {

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

  return new Promise(function(resolve,reject) {
    db.all(sql, function(err, rows) {
      var filename = qry.exportFolder + moment().format('YYYYMMDD_HHmmss') + 'Config-' + qry.productgroup + '.csv',
        r = '';
      csv.writeToPath(filename, rows, {headers: true}).on("finish", function() {
        r = rows.length + ' ' + serverMessages.SaveSuccess + ' ' + filename;
        resolve(r);
      }).on("error", function(err) {
        r = serverMessages.SaveConfigError + filename + ": " + String(err);
        resolve(r);
      });
    });
  })
};

var importConfiguration = function(qry) {
  return new Promise(function(resolve,reject) {
    var filename = qry.exportFolder + qry.fileName,
      stream = fs.createReadStream(filename, {encoding: 'utf8'}),
      result = [],
      r = '';
    stream.on('error', function(err) {
      r = serverMessages.SaveConfigError + filename + ": " + String(err);
      return new Promise(function(resolve,reject) {resolve(r)});
    });
    csv.fromStream(stream, {headers: true}).on('record', function(data) {
      result.push(data);
    }).on('error', function(err) {
      r = serverMessages.SaveConfigError + filename + ": " + String(err);
      resolve(r);
    }).on('finish', function() {
      var productgroup = [];
      for (var row of result) {
        productgroup.push(_.pick(row, ['productgroup', 'description', 'productgroupComment']));
      };
      productgroup = _.uniq(productgroup, 'productgroup');
      // check if productgroup already exists
      var sql = 'SELECT * FROM Productgroup WHERE productgroup ="' + productgroup[0].productgroup + '"';
      db.get(sql, function(err, row) {
        if (row == undefined) {
          db.serialize(function() {
            var insertProductgroup = 'INSERT INTO ProductGroup (productgroup, description, comment) VALUES ("';
            dbWriteTable(insertProductgroup, productgroup);
            var sql = 'SELECT productgroup_id FROM ProductGroup WHERE productgroup = "' + productgroup[0].productgroup + '"';
            db.get(sql, function(err, pg) {
              var sources = [];
              for (var row of result) {
                row.productgroup_id = pg.productgroup_id;
                sources.push(_.pick(row, [
                  'source',
                  'productgroup_id',
                  'name',
                  'address',
                  'url',
                  'is_active',
                  'comment',
                  'currency'
                ]));
              };
              sources = _.uniq(sources, 'source');
              var insertSources = 'INSERT INTO Source (source, productgroup_id, name, address, url, is_active, comment, currency) VALUES ("';
              for (const source of sources) {
                dbWriteTable(insertSources, source, function() {
                  var sql = 'SELECT source_id FROM Source WHERE ' + 'source ="' + source.source + '" ' + 'AND productgroup_id ="' + pg.productgroup_id + '"';
                  db.get(sql, function(err, s) {
                    var resultSource = _.filter(result, {'source': source.source});
                    var paths = [];
                    for (var row of resultSource) {
                      row.source_id = s.source_id;
                      paths.push(_.pick(row, ['source_id', 'path', 'parameter', 'step_no', 'step_type']));
                    };
                    var insertSourcePath = 'INSERT INTO SourcePath (source_id, path, parameter, step_no, step_type) VALUES ("';
                    dbWriteTable(insertSourcePath, paths);
                  });
                });
              };

            });
            r = serverMessages.ImportSuccess;
            resolve(r);
          });
        } else {
          r = serverMessages.ImportError.replace('#', productgroup[0].productgroup);
          resolve(r);
        }
      });
    });
  })
};

var createResultForJQGrid = function(qry, rows) {
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

var cleanupContent = function(s, removeAllCRLF) {

  // replace non-breaking spaces with regular ones (0xc2 0xa0 = UTF-8 sequence of code point 0xa0 = nbsp)
  var t = s.replace(/\uC2A0/g, ' ').replace(/\xC2/g, ' ').replace(/\u00A0/g, ' ').replace(/\u0080/g, "\u20AC");

  // replace CR/LF/TAB with space
  t = t.replace(/[\t]/g, ' ');
  removeAllCRLF = typeof removeAllCRLF !== 'undefined'
    ? removeAllCRLF
    : false;

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

var dbWriteTable = function(sql, data, callback) {

  if (_.isArray(data)) {
    for (const row of data) {
      var r = _.reduce(row, function(result, el) {
        return result + '","' + el;
      });
      r = sql + r + '")';
      db.run(r);
    };
  } else {
    var r = _.reduce(data, function(result, el) {
      return result + '","' + el;
    });
    r = sql + r + '")';
    db.run(r, callback);
  }
};

var chartData = function(qry) {
  var res = {};
  var sql =
    'SELECT Observation.source_id, Source.name, Observation.observation_date, Observation.value ' +
    'FROM Source JOIN Observation ' +
    'ON Source.source_id = Observation.source_id ' +
    'WHERE Source.productgroup_id = "' + qry.productgroup_id + '" ' +
      'AND Observation.value > 0 ' +
      'AND Observation.value != "NA" ' +
    'ORDER BY Observation.observation_date, Observation.source_id';
  return new Promise(function(resolve,reject) {
    db.all(sql, function(err, rows) {
      var sql =
        'SELECT max(value) as value ' +
        'FROM Observation ' +
        'WHERE source_id IN ' +
          '(SELECT source_id ' +
          'FROM Source ' +
          'WHERE productgroup_id = "' + qry.productgroup_id + '")' +
        'AND value != "NA"';
      db.get(sql, function(err, row) {
        res.maxValue = row.value;
        res.rows = rows;
        resolve(res);
      });
    });
  })
};

var getMetrics = function(qry) {
  var sql =
    'SELECT ' +
      'p.description AS productgroup, s.name AS name, ' +
      'CASE WHEN o.value == -1 THEN 1 ELSE 0 END AS noprice, ' +
      'CASE WHEN o.value > -1 THEN 1 ELSE 0 END AS hasprice, ' +
      'CASE WHEN o.value is null THEN 1 ELSE 0 END AS noobs ' +
    'FROM ProductGroup AS p JOIN Source AS s ON p.productgroup_id = s.productgroup_id ' +
      'JOIN (SELECT max(sa1.last_observation_date) AS maxdate, s1.productgroup_id AS pid ' +
        'FROM SourceAdmin AS sa1 JOIN Source AS s1 ON sa1.source_id = s1.source_id ' +
        'GROUP BY s1.productgroup_id) ON pid = p.productgroup_id ' +
        'LEFT JOIN Observation AS o ON (maxdate = o.observation_date and o.source_id = s.source_id) ' +
    'WHERE s.is_active = 1 ' +
    'ORDER BY p.description'

    return new Promise(function(resolve,reject) {
      db.all(sql,function(err,rows) {
        var r = createResultForJQGrid(qry, rows);
        resolve(r);
      })
    })
}

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
module.exports.getMetrics = getMetrics;
