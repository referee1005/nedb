/**
 * Manage access to data, be it to find, update or remove it
 */
var model = require('./model');

 

/**
 * Create a new cursor for this collection
 * @param {Datastore} db - The datastore this cursor is bound to
 * @param {Query} query - The query this cursor will operate on
 */
function Cursor (db, query) {
  this.db = db;
  this.query = query || {};
}


/**
 * Set a limit to the number of results
 */
Cursor.prototype.limit = function(limit) {
  this._limit = limit;
  return this;
};


/**
 * Skip a the number of results
 */
Cursor.prototype.skip = function(skip) {
  this._skip = skip;
  return this;
};


/**
 * Sort results of the query
 * @Param {SortQuery} sortQuery - SortQuery is { field: order }, field can use the dot-notation, order is 1 for ascending and -1 for descending
 */
Cursor.prototype.sort = function(sortQuery) {
  this._sort = sortQuery;
  return this;
};


/**
 * Get all matching elements
 * @param {Function} callback - Signature: err, results
 */
 Cursor.prototype.exec = function(callback) {
  var candidates = this.db.getCandidates(this.query)
    , res = [], added = 0, skipped = 0, self = this
    , i
    ;
  
  try {
    for (i = 0; i < candidates.length; i += 1) {
      if (model.match(candidates[i], this.query)) {
        // If a sort is defined, wait for the results to be sorted before applying limit and skip
        if (!this._sort) {
          if (this._skip && this._skip > skipped) {
            skipped += 1;
          } else {
            res.push(model.deepCopy(candidates[i]));
            added += 1;
            if (this._limit && this._limit <= added) { break; }                  
          }
        } else {
          res.push(model.deepCopy(candidates[i]));
        }
      }
    }
  } catch (err) {
    return callback(err);
  }

  // Apply all sorts
  if (this._sort) {
    Object.keys(this._sort).forEach(function(key) {
      res.sort(function(a, b) {
        return self._sort[key] * model.compareThings(model.getDotValue(a, key), model.getDotValue(b, key));
      });
    });
    
    // Applying limit and skip
    var limit = this._limit || res.length
      , skip = this._skip || 0;
      
    res = res.slice(skip, skip + limit);
  }

  return callback(null, res);
};


// Interface
module.exports = Cursor;