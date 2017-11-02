var sqlite3 = require('sqlite3').verbose(),
  fs = require('fs'),
  db = new sqlite3.Database('./inst/server/db/observationDB.sqlite'),
  sql = fs.readFileSync('./inst/server/db/upgradeDB.sql', 'UTF8');

console.log(sql)

db.run(sql, function(err) {
  if (err) {
    console.log(err)
  } else {
    console.log('Database upgraded.')
  }
})
