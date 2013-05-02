var Datastore = require('../lib/datastore')
  , benchDb = 'workspace/find.bench.db'
  , fs = require('fs')
  , path = require('path')
  , async = require('async')
  , customUtils = require('../lib/customUtils')
  , d
  , n = 10000
  , order
  ;

if (process.argv[2]) { n = parseInt(process.argv[2], 10); }
order = customUtils.getRandomArray(n)

console.log("Benchmarking find");

async.waterfall([
  function (cb) {
    console.log("Preparing database");

    customUtils.ensureDirectoryExists(path.dirname(benchDb), function () {
      fs.exists(benchDb, function (exists) {
        if (exists) {
          fs.unlink(benchDb, cb);
        } else { return cb(); }
      });
    });
  }
, function (cb) {
    d = new Datastore(benchDb);
    d.loadDatabase(cb);
  }
, function (cb) {
    var beg = new Date()
      , i = 0;

    console.log("Inserting " + n + " documents");

    async.whilst( function () { return i < n; }
    , function (_cb) {
      d.insert({ docNumber: i }, function (err) {
        i += 1;
        return _cb(err);
      });
    }, function (err) {
      var timeTaken = (new Date()).getTime() - beg.getTime();   // In ms
      if (err) { return cb(err); }
      console.log("Time taken: " + (timeTaken / 1000) + "s");
      return cb();
    });
  }
, function (cb) {
    var beg = new Date()
      , i = 0;

    console.log("Finding " + n + " documents");

    async.whilst( function () { return i < n; }
    , function (_cb) {
      d.find({ docNumber: order[i] }, function (err, docs) {
        i += 1;
        if (docs.length !== 1) { return _cb(docs); }
        return _cb(err);
      });
    }, function (err) {
      var timeTaken = (new Date()).getTime() - beg.getTime();   // In ms
      if (err) { return cb(err); }
      console.log("Time taken: " + (timeTaken / 1000) + "s");
      return cb();
    });
  }
], function (err) {
  console.log("Benchmark finished");

  if (err) { return console.log("An error was encountered: ", err); }
});
