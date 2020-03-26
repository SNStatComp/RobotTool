var sqlite3 = require('sqlite3').verbose(),
  fs = require('fs'),
  envPaths = require('env-paths'),
  paths = envPaths('Robottool'),
  config,
  userconfig = require(__dirname + '/../app/config/config.json'),

  sql = fs.readFileSync(__dirname + '/db/upgradeDB.sql', 'UTF8');

if (userconfig.mode === 'server') {
// Robottool is installed globally
	config = require(paths.config + '/config.json');
} else {
// Robottool is installed locally
	config = userconfig;
}

if (config.mode === 'server') {
	console.log(paths.data + '/' + config.database)
	db = new sqlite3.Database(paths.data + '/' + config.database);
} else {
	db = new sqlite3.Database(__dirname + '/db/observationDB.sqlite');
}

console.log(sql)

db.exec(sql, function(err) {
  if (err) {
    console.log(err)
  } else {
    console.log('Database upgraded.')
  }
})
